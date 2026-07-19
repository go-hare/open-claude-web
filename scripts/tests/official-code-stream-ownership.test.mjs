/**
 * Full code-path ownership: Pke feed → zE reveal → Kwe same-id replace.
 * Outer stream_event.uuid must never become streamingMessageId (eke/Kwe key is Anthropic message.id).
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
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

const { createOfficialSessionStreamSmoother } = await vite.ssrLoadModule(
  "/src/features/epitaxy/officialStreamSmoother.ts",
);
const {
  officialStreamFeed,
  officialStreamActiveMessageId,
  officialStreamSubscribe,
  officialStreamClear,
  officialStreamDrop,
} = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamSessionStore.ts",
);
const { mergeOfficialStreamOntoTranscript } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamTranscriptMerge.ts",
);

after(async () => {
  await vite.close();
});

function envelope(event, uuid = "outer-uuid-per-event") {
  return {
    type: "stream_event",
    uuid,
    parent_tool_use_id: null,
    event,
  };
}

test("Pke messageId is Anthropic message.id, never outer stream_event.uuid", async () => {
  const sessionId = "sess-ownership-1";
  const paints = [];
  const unsub = officialStreamSubscribe(sessionId, (snapshot) => {
    if (snapshot) paints.push(snapshot.messageId);
  });

  officialStreamFeed(sessionId, envelope({
    type: "message_start",
    message: { id: "msg_api_real", model: "claude" },
  }, "uuid-A"));

  assert.equal(officialStreamActiveMessageId(sessionId), "msg_api_real");

  officialStreamFeed(sessionId, envelope({
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  }, "uuid-B"));
  officialStreamFeed(sessionId, envelope({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "Hello world from stream" },
  }, "uuid-C"));

  await new Promise((r) => setTimeout(r, 50));

  assert.ok(paints.every((id) => id === "msg_api_real"), `paints used api id, got ${JSON.stringify(paints)}`);
  assert.equal(officialStreamActiveMessageId(sessionId), "msg_api_real");

  unsub();
  officialStreamClear(sessionId);
  officialStreamDrop(sessionId);
});

test("message_start without Anthropic message.id does not mint uuid as stream id", () => {
  const smoother = createOfficialSessionStreamSmoother();
  let paints = 0;
  smoother.subscribe((s) => {
    if (s) paints += 1;
  });
  smoother.feed(envelope({
    type: "message_start",
    message: { model: "claude" }, // no id
  }, "should-not-become-messageId"));
  smoother.feed(envelope({
    type: "content_block_start",
    index: 0,
    content_block: { type: "text", text: "" },
  }));
  smoother.feed(envelope({
    type: "content_block_delta",
    index: 0,
    delta: { type: "text_delta", text: "x" },
  }));
  assert.equal(paints, 0, "no task without api message.id");
  smoother.dispose();
});

test("leaked durable same api id is replaced by zE partial (typewriter ownership)", () => {
  // Simulate eke race: durable full dump already in Xa with Anthropic id.
  const durable = [
    {
      author: "assistant",
      id: "msg_api_real",
      items: [{ id: "msg_api_real-t0", kind: "text", text: "Hello world from stream FULL DUMP" }],
    },
  ];
  const streamItems = [{ id: "msg_api_real-t0", kind: "text", text: "Hel" }];
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: "msg_api_real", blocks: [{ kind: "text", text: "Hel" }] },
    streamItems,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].items[0].text, "Hel");
});

test("if streamingMessageId wrongly used outer uuid, same-id replace would miss (regression guard)", () => {
  const durable = [
    {
      author: "assistant",
      id: "msg_api_real",
      items: [{ id: "msg_api_real-t0", kind: "text", text: "FULL" }],
    },
  ];
  const streamItems = [{ id: "outer-uuid-t0", kind: "text", text: "Hel" }];
  // Wrong: Va.messageId = outer uuid → last.id !== Va.messageId → Gwe or append path.
  // Official Gwe: no overlapping item ids with different schemes → appends onto last.
  const merged = mergeOfficialStreamOntoTranscript(
    durable,
    { messageId: "outer-uuid-per-event", blocks: [{ kind: "text", text: "Hel" }] },
    streamItems,
  );
  // Either freezes FULL or appends Hel beside FULL — never pure typewriter "Hel".
  const text = merged.flatMap((e) => e.items).map((i) => i.text).join("");
  assert.ok(text.includes("FULL"), "wrong messageId must not silently own typewriter");
  assert.notEqual(text, "Hel");
});
