/**
 * Full ownership path: Pke.feed → zE paints → eke suppress key → Kwe replace vs durable race.
 * Asserts typewriter: non-decreasing partials, first paint << full, all paint ids = Anthropic id.
 */
import assert from "node:assert/strict";
import { createServer } from "vite";

if (typeof globalThis.document === "undefined") {
  globalThis.document = { hidden: false };
}

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const {
  officialStreamFeed,
  officialStreamActiveMessageId,
  officialStreamSubscribe,
  officialStreamClear,
  officialStreamDrop,
} = await vite.ssrLoadModule("/src/features/epitaxy/session/officialStreamSessionStore.ts");
const { mergeOfficialStreamOntoTranscript } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamTranscriptMerge.ts",
);

const sessionId = "live-path-sess";
const API_ID = "msg_live_api_001";
const FULL = "Hello world from stream FULL DUMP that should never paint early";

function envelope(event, uuid) {
  return {
    type: "stream_event",
    uuid,
    parent_tool_use_id: null,
    event,
  };
}

const paints = [];
const unsub = officialStreamSubscribe(sessionId, (snapshot) => {
  if (!snapshot) return;
  const text = snapshot.blocks
    .filter((b) => b.kind === "text")
    .map((b) => b.text)
    .join("");
  paints.push({ messageId: snapshot.messageId, len: text.length, text });
});

// Durable race: full assistant already in Xa with Anthropic id (eke leak scenario).
const durable = [
  {
    author: "assistant",
    id: API_ID,
    items: [{ id: `${API_ID}-t0`, kind: "text", text: FULL }],
  },
];

officialStreamFeed(sessionId, envelope({
  type: "message_start",
  message: { id: API_ID, model: "claude", role: "assistant", content: [] },
}, "outer-uuid-1"));

assert.equal(officialStreamActiveMessageId(sessionId), API_ID);

officialStreamFeed(sessionId, envelope({
  type: "content_block_start",
  index: 0,
  content_block: { type: "text", text: "" },
}, "outer-uuid-2"));

// Feed text in small deltas like real stream-json partials
const chunks = ["Hel", "lo ", "wor", "ld ", "from", " str", "eam ", "FULL", " DUMP", " that", " should", " never", " paint", " early"];
for (let i = 0; i < chunks.length; i++) {
  officialStreamFeed(sessionId, envelope({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: chunks[i] },
  }, `outer-uuid-d${i}`));
  await new Promise((r) => setTimeout(r, 16));
}

// Wait for smoother to reveal
await new Promise((r) => setTimeout(r, 1200));

assert.ok(paints.length >= 5, `need gradual paints, got ${paints.length}`);
assert.ok(paints.every((p) => p.messageId === API_ID), "all paints must use Anthropic id");

// Non-decreasing lengths
for (let i = 1; i < paints.length; i++) {
  assert.ok(paints[i].len >= paints[i - 1].len, `len decreased at ${i}`);
}

const first = paints[0];
assert.ok(first.len < FULL.length, `first paint must be partial: ${first.len} vs ${FULL.length}`);
assert.ok(!paints.slice(0, 3).some((p) => p.text === FULL), "early paints must not be full dump");

// At several intermediate paint points, Kwe must replace durable FULL with partial
const mid = paints[Math.min(3, paints.length - 1)];
const midItems = [{ id: `${API_ID}-t0`, kind: "text", text: mid.text }];
const mergedMid = mergeOfficialStreamOntoTranscript(
  durable,
  { messageId: API_ID, blocks: [{ kind: "text", text: mid.text }] },
  midItems,
);
assert.equal(mergedMid.length, 1);
assert.equal(mergedMid[0].items[0].text, mid.text, "Kwe must replace durable same-id");
assert.notEqual(mergedMid[0].items[0].text, FULL);

// Wrong outer uuid still fails typewriter (regression)
const wrong = mergeOfficialStreamOntoTranscript(
  durable,
  { messageId: "outer-uuid-1", blocks: [{ kind: "text", text: mid.text }] },
  [{ id: "outer-uuid-1-t0", kind: "text", text: mid.text }],
);
const wrongText = wrong.flatMap((e) => e.items).map((i) => i.text).join("");
assert.ok(wrongText.includes("FULL") || wrongText !== mid.text, "wrong id must not pure typewriter");

console.log(JSON.stringify({
  ok: true,
  paints: paints.length,
  firstLen: first.len,
  lastLen: paints[paints.length - 1].len,
  fullLen: FULL.length,
  sampleLens: paints.slice(0, 12).map((p) => p.len),
  activeId: officialStreamActiveMessageId(sessionId),
}, null, 2));

unsub();
officialStreamClear(sessionId);
officialStreamDrop(sessionId);
await vite.close();
console.log("INTEGRATION_LIVE_PATH_PASS");
