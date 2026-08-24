/**
 * Official zE/Pke typewriter path — must reveal gradually, not dump full text on each delta.
 * Source: index-BELzQL5P Pke/zE + officialStreamSmoother.ts
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

// Official zE.task reads document.hidden — provide a minimal browser stub for node tests.
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
  createOfficialSessionStreamSmoother,
} = await vite.ssrLoadModule("/src/features/epitaxy/officialStreamSmoother.ts");

after(async () => {
  await vite.close();
});

function feedEnvelope(smoother, event, uuid = "sdk-uuid") {
  smoother.feed({
    type: "stream_event",
    uuid,
    parent_tool_use_id: null,
    event,
  });
}

test("zE smoother reveals text gradually across ticks (not whole delta dump)", async () => {
  const smoother = createOfficialSessionStreamSmoother();
  const paints = [];
  smoother.subscribe((snapshot) => {
    if (!snapshot) return;
    const text = snapshot.blocks
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("");
    paints.push(text);
  });

  feedEnvelope(smoother, {
    type: "message_start",
    message: { id: "msg_api_1", model: "claude-opus", usage: {} },
  });
  feedEnvelope(smoother, {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  });

  // Large arrival in one delta — smoother must not paint full length on first tick.
  const full = "A".repeat(400);
  feedEnvelope(smoother, {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: full },
  });

  // Wait a few 60fps frames for task loop to paint.
  await new Promise((r) => setTimeout(r, 80));

  assert.ok(paints.length >= 1, "expected at least one smoother paint");
  const firstPaint = paints[0];
  assert.ok(
    firstPaint.length < full.length,
    `first paint should be partial typewriter, got ${firstPaint.length} of ${full.length}`,
  );

  // Let smoother catch up further.
  await new Promise((r) => setTimeout(r, 200));
  const mid = paints[paints.length - 1] ?? "";
  assert.ok(mid.length >= firstPaint.length, "reveal should be non-decreasing");

  feedEnvelope(smoother, { type: "message_stop" });
  await new Promise((r) => setTimeout(r, 400));
  const last = paints[paints.length - 1] ?? "";
  // After model_done, reveal should reach full (or near-full within settle window).
  assert.ok(
    last.length === full.length || last.length > firstPaint.length,
    `after message_stop expected more reveal, first=${firstPaint.length} last=${last.length}`,
  );

  smoother.dispose();
});

test("parent_tool_use_id non-null is skipped (official Pke.feed)", () => {
  const smoother = createOfficialSessionStreamSmoother();
  let paints = 0;
  smoother.subscribe((s) => {
    if (s) paints += 1;
  });
  smoother.feed({
    type: "stream_event",
    parent_tool_use_id: "tool_parent",
    event: {
      type: "message_start",
      message: { id: "msg_x" },
    },
  });
  assert.equal(paints, 0);
  smoother.dispose();
});

test("zE.task residual is setTimeout(PE) — no rAF invent", async () => {
  // Official index-BELzQL5P: PE=1e3/60; task awaits setTimeout(PE|100|200). No rAF.
  // Do NOT invent rAF to fight Electron timer clamping — that was product invent.
  const src = await vite.transformRequest("/src/features/epitaxy/officialStreamSmoother.ts");
  const code = src?.code ?? "";
  assert.ok(!/requestAnimationFrame/.test(code), "smoother must not invent requestAnimationFrame");
  assert.ok(/1000\s*\/\s*60|1e3\s*\/\s*60/.test(code) || code.includes("1000 / 60"), "PE=1000/60 residual");

  const smoother = createOfficialSessionStreamSmoother();
  const paints = [];
  smoother.subscribe((snapshot) => {
    if (!snapshot) return;
    const text = snapshot.blocks.filter((b) => b.kind === "text").map((b) => b.text).join("");
    paints.push(text.length);
  });
  feedEnvelope(smoother, {
    type: "message_start",
    message: { id: "msg_pe_only", model: "claude" },
  });
  feedEnvelope(smoother, {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  });
  const full = "B".repeat(240);
  feedEnvelope(smoother, {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: full },
  });
  await new Promise((r) => setTimeout(r, 90));
  assert.ok(paints.length >= 1, "expected PE tick paint");
  assert.ok((paints[0] ?? 0) < full.length, `first paint partial, got ${paints[0]}`);
  feedEnvelope(smoother, { type: "message_stop" });
  await new Promise((r) => setTimeout(r, 500));
  assert.ok(
    (paints[paints.length - 1] ?? 0) > (paints[0] ?? 0),
    `reveal should grow under setTimeout PE, first=${paints[0]} last=${paints[paints.length - 1]}`,
  );
  smoother.dispose();
});

test("thinking (Lke size 0) then text still advances typewriter", async () => {
  // Official code Lke: thinking blockSize = 0 (no typewriter progress on thinking-only).
  // Text arrivals must still reveal gradually; do not invent settleAfterReveal dump.
  const smoother = createOfficialSessionStreamSmoother();
  const paints = [];
  smoother.subscribe((snapshot) => {
    if (!snapshot) return;
    const text = snapshot.blocks
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("");
    if (text.length > 0) paints.push(text.length);
  });

  feedEnvelope(smoother, {
    type: "message_start",
    message: { id: "msg_think_text", model: "claude" },
  });
  feedEnvelope(smoother, {
    type: "content_block_start",
    index: 0,
    content_block: { type: "thinking", thinking: "" },
  });
  for (let i = 0; i < 20; i += 1) {
    feedEnvelope(smoother, {
      type: "content_block_delta",
      index: 0,
      delta: { type: "thinking_delta", thinking: "x" },
    });
  }
  await new Promise((r) => setTimeout(r, 80));
  feedEnvelope(smoother, { type: "content_block_stop", index: 0 });
  feedEnvelope(smoother, {
    type: "content_block_start",
    index: 1,
    content_block: { type: "text", text: "" },
  });
  // Feed text in spaced bursts so PE ticks can paint mid lengths before message_stop.
  const chunks = [
    "alpha beta gamma ",
    "delta epsilon zeta ",
    "eta theta iota kappa ",
    "lambda mu nu xi omicron ",
  ];
  for (const chunk of chunks) {
    feedEnvelope(smoother, {
      type: "content_block_delta",
      index: 1,
      delta: { type: "text_delta", text: chunk },
    });
    await new Promise((r) => setTimeout(r, 50));
  }
  await new Promise((r) => setTimeout(r, 120));
  feedEnvelope(smoother, { type: "content_block_stop", index: 1 });
  feedEnvelope(smoother, { type: "message_stop" });
  await new Promise((r) => setTimeout(r, 400));

  const full = chunks.join("").length;
  const uniq = [...new Set(paints)];
  assert.ok(paints.length >= 2, `expected mid-turn text paints, got ${paints.length}`);
  assert.ok(
    (paints[0] ?? 0) < full,
    `first text paint must be partial, got ${paints[0]} of ${full}`,
  );
  assert.ok(uniq.length >= 2, `expected growing lengths, got ${JSON.stringify(uniq)}`);
  assert.ok(
    paints[paints.length - 1] === full || paints[paints.length - 1] > paints[0],
    `reveal should grow, first=${paints[0]} last=${paints[paints.length - 1]} full=${full}`,
  );
  smoother.dispose();
});
