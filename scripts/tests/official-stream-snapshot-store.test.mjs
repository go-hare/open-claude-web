/**
 * Va must read every Oke length via getSnapshot (useSyncExternalStore), not startTransition-coalesced state.
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
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
  officialStreamGetSnapshot,
  officialStreamSubscribeStore,
  officialStreamClear,
  officialStreamDrop,
} = await vite.ssrLoadModule("/src/features/epitaxy/session/officialStreamSessionStore.ts");

after(async () => {
  await vite.close();
});

function feed(sessionId, event) {
  officialStreamFeed(sessionId, {
    type: "stream_event",
    parent_tool_use_id: null,
    event,
  });
}

test("getSnapshot tracks gradual Oke lengths (no skipped intermediate paints)", async () => {
  const sessionId = "snap-store-1";
  const lengths = [];
  const unsub = officialStreamSubscribeStore(sessionId, () => {
    const snap = officialStreamGetSnapshot(sessionId);
    if (!snap) return;
    const text = snap.blocks.filter((b) => b.kind === "text").map((b) => b.text).join("");
    lengths.push(text.length);
  });

  assert.equal(officialStreamGetSnapshot(sessionId), null);

  feed(sessionId, {
    type: "message_start",
    message: { id: "msg_snap_1", model: "claude" },
  });
  feed(sessionId, {
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  });

  const full = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".repeat(8); // 208
  // Feed in one burst like a large arrival — smoother still reveals gradually.
  feed(sessionId, {
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: full },
  });

  await new Promise((r) => setTimeout(r, 400));
  feed(sessionId, { type: "message_stop" });
  await new Promise((r) => setTimeout(r, 800));

  const uniq = [...new Set(lengths)];
  assert.ok(lengths.length >= 8, `expected many store notifications, got ${lengths.length}`);
  assert.ok(uniq.length >= 6, `expected multiple lengths, got ${JSON.stringify(uniq.slice(0, 20))}`);
  assert.ok((lengths[0] ?? 0) < full.length * 0.5, `first paint too large: ${lengths[0]}`);
  assert.equal(officialStreamGetSnapshot(sessionId)?.messageId, "msg_snap_1");

  officialStreamClear(sessionId);
  assert.equal(officialStreamGetSnapshot(sessionId), null);

  unsub();
  officialStreamDrop(sessionId);
});
