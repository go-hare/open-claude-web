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

test("throttled setTimeout still typewriters via rAF (no paragraph jumps)", async () => {
  // Electron clamps short setTimeouts to ~1s → 3 paints like 37/83/100.
  // Visible path must use rAF so reveal stays ~60fps.
  const realSetTimeout = globalThis.setTimeout.bind(globalThis);
  const realClearTimeout = globalThis.clearTimeout.bind(globalThis);
  globalThis.setTimeout = (fn, ms, ...args) => {
    const wait = typeof ms === "number" && ms > 0 && ms < 300 ? 1000 : ms;
    return realSetTimeout(fn, wait, ...args);
  };
  globalThis.clearTimeout = realClearTimeout;
  // Node has no rAF; polyfill at paint cadence so the visible path is not clamped.
  globalThis.requestAnimationFrame = (cb) => realSetTimeout(() => cb(Date.now()), 16);

  try {
    const smoother = createOfficialSessionStreamSmoother();
    const paints = [];
    smoother.subscribe((snapshot) => {
      if (!snapshot) return;
      const text = snapshot.blocks
        .filter((b) => b.kind === "text")
        .map((b) => b.text)
        .join("");
      paints.push(text.length);
    });

    feedEnvelope(smoother, {
      type: "message_start",
      message: { id: "msg_throttle", model: "claude" },
    });
    feedEnvelope(smoother, {
      type: "content_block_start",
      index: 0,
      content_block: { type: "text", text: "" },
    });
    const full = "丙".repeat(100);
    for (const ch of full) {
      feedEnvelope(smoother, {
        type: "content_block_delta",
        index: 0,
        delta: { type: "text_delta", text: ch },
      });
      await new Promise((r) => realSetTimeout(r, 12));
    }
    feedEnvelope(smoother, { type: "message_stop" });
    await new Promise((r) => realSetTimeout(r, 1200));

    const uniq = [...new Set(paints)];
    assert.ok(paints.length >= 8, `expected many paints under throttle, got ${paints.length}`);
    assert.ok(uniq.length >= 6, `expected gradual lengths, got ${JSON.stringify(uniq)}`);
    assert.ok(
      (paints[0] ?? 0) < full.length * 0.5,
      `first paint should be partial, got ${paints[0]} of ${full.length}`,
    );
    smoother.dispose();
  } finally {
    globalThis.setTimeout = realSetTimeout;
    globalThis.clearTimeout = realClearTimeout;
    delete globalThis.requestAnimationFrame;
  }
});

test("thinking (Lke size 0) then text+stop still typewriters — no full dump", async () => {
  // Regression: size-0 thinking used to stamp start without advancing t; after a wait,
  // first text burst + message_stop bisected past full length in one paint.
  const smoother = createOfficialSessionStreamSmoother();
  const paints = [];
  smoother.subscribe((snapshot) => {
    if (!snapshot) return;
    const text = snapshot.blocks
      .filter((b) => b.kind === "text")
      .map((b) => b.text)
      .join("");
    paints.push(text.length);
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
  await new Promise((r) => setTimeout(r, 300));
  feedEnvelope(smoother, { type: "content_block_stop", index: 0 });
  feedEnvelope(smoother, {
    type: "content_block_start",
    index: 1,
    content_block: { type: "text", text: "" },
  });
  const words = "alpha beta gamma delta epsilon zeta eta theta iota kappa".split(" ");
  for (const w of words) {
    feedEnvelope(smoother, {
      type: "content_block_delta",
      index: 1,
      delta: { type: "text_delta", text: w === "alpha" ? w : ` ${w}` },
    });
  }
  feedEnvelope(smoother, { type: "content_block_stop", index: 1 });
  feedEnvelope(smoother, { type: "message_stop" });
  await new Promise((r) => setTimeout(r, 500));

  const full = words.join(" ").length;
  const uniq = [...new Set(paints)];
  assert.ok(paints.length >= 3, `expected gradual paints, got ${paints.length}`);
  assert.ok(
    (paints[0] ?? 0) < full,
    `first paint must be partial, got ${paints[0]} of ${full}`,
  );
  assert.ok(uniq.length >= 3, `expected multiple lengths, got ${JSON.stringify(uniq)}`);
  assert.ok(
    paints[paints.length - 1] === full || paints[paints.length - 1] > paints[0],
    `reveal should grow, first=${paints[0]} last=${paints[paints.length - 1]} full=${full}`,
  );
  smoother.dispose();
});
