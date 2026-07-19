/**
 * Replay real code-sessions.json stream_events through officialStreamFeed and measure Va paint cadence.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import { createServer } from "vite";

if (typeof globalThis.document === "undefined") {
  globalThis.document = { hidden: false };
}
if (typeof globalThis.requestAnimationFrame !== "function") {
  globalThis.requestAnimationFrame = (cb) => setTimeout(() => cb(Date.now()), 16);
}

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const {
  officialStreamFeed,
  officialStreamSubscribe,
  officialStreamClear,
  officialStreamDrop,
} = await vite.ssrLoadModule("/src/features/epitaxy/session/officialStreamSessionStore.ts");
const { mergeOfficialStreamOntoTranscript } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamTranscriptMerge.ts",
);

const sessionsPath =
  "/Users/apple/work-py/hare-code/.codex-runtime/open-claude-desktop-user-data/code-sessions.json";
const data = JSON.parse(fs.readFileSync(sessionsPath, "utf8"));
const list = Array.isArray(data) ? data : Object.values(data.sessions || data);
const session = [...list].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || "")))[0];
const tr = session.transcript || [];

// Take first turn: first user .. first result
let start = tr.findIndex((e) => e?.type === "user");
let end = tr.findIndex((e, i) => i > start && e?.type === "result");
if (end < 0) end = tr.length - 1;
const turn = tr.slice(start, end + 1);
const streamEvents = turn.filter((e) => e?.type === "stream_event");
const assistants = turn.filter((e) => e?.type === "assistant");

const sessionId = "real-transcript-probe";
const paints = [];
const unsub = officialStreamSubscribe(sessionId, (snapshot) => {
  if (!snapshot) return;
  const text = snapshot.blocks.filter((b) => b.kind === "text").map((b) => b.text).join("");
  const thinking = snapshot.blocks.filter((b) => b.kind === "thinking").map((b) => b.text).join("").length;
  paints.push({ t: performance.now(), messageId: snapshot.messageId, textLen: text.length, thinking, blocks: snapshot.blocks.map((b) => b.kind) });
});

// Feed stream events with small delay to allow rAF ticks between bursts
for (const e of streamEvents) {
  officialStreamFeed(sessionId, e, e.parent_tool_use_id ?? null);
  // yield occasionally so task loop can paint
  if (e.event?.type === "content_block_delta" && e.event?.delta?.type === "text_delta") {
    await new Promise((r) => setTimeout(r, 4));
  }
}

// Allow smoother to catch up after stop
await new Promise((r) => setTimeout(r, 1500));

const textPaints = paints.filter((p) => p.textLen > 0);
const lens = textPaints.map((p) => p.textLen);
const first = lens[0] ?? 0;
const last = lens[lens.length - 1] ?? 0;
const uniq = [...new Set(lens)];
const maxStep = lens.slice(1).reduce((m, v, i) => Math.max(m, v - lens[i]), 0);

// Simulate durable full assistant arriving mid-stream (from real assistant emits)
const durableFull = assistants
  .filter((a) => Array.isArray(a.message?.content) && a.message.content.some((c) => c.type === "text"))
  .map((a) => {
    const text = a.message.content.filter((c) => c.type === "text").map((c) => c.text).join("");
    const mid = a.message.id;
    return {
      author: "assistant",
      id: mid,
      items: [{ id: `${mid}-t0`, kind: "text", text }],
    };
  });

const midPaint = textPaints[Math.min(5, textPaints.length - 1)];
let mergeOk = true;
if (midPaint && durableFull[0]) {
  const durable = [durableFull[0]];
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: midPaint.messageId, blocks: [{ kind: "text", text: "X".repeat(midPaint.textLen) }] },
    [{ id: `${midPaint.messageId}-t0`, kind: "text", text: "X".repeat(midPaint.textLen) }],
  );
  const shown = merged[0]?.items?.[0]?.text?.length ?? 0;
  mergeOk = shown === midPaint.textLen && shown < (durableFull[0].items[0].text.length || Infinity);
}

const report = {
  sessionId: session.id,
  streamEvents: streamEvents.length,
  assistants: assistants.length,
  paints: paints.length,
  textPaints: textPaints.length,
  first,
  last,
  uniqSteps: uniq.length,
  maxStep,
  sampleLens: lens.slice(0, 20),
  lateLens: lens.slice(-10),
  mergeOk,
  firstMessageId: paints[0]?.messageId,
};

console.log(JSON.stringify(report, null, 2));

assert.ok(streamEvents.length > 10, "fixture must have stream events");
assert.ok(textPaints.length >= 5, `need gradual text paints, got ${textPaints.length}`);
assert.ok(first < last, `first ${first} should be < last ${last}`);
assert.ok(first < last * 0.5 || first < 40, `first paint too large: ${first} of ${last}`);
assert.ok(uniq.length >= 4, `need multiple distinct lengths, got ${uniq.length}: ${uniq.slice(0, 20)}`);
assert.ok(mergeOk, "Kwe same-id replace must keep partial over durable full");

unsub();
officialStreamClear(sessionId);
officialStreamDrop(sessionId);
await vite.close();
console.log("REAL_TRANSCRIPT_STREAM_PASS");
