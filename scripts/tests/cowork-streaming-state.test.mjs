import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { reduceCoworkStreamEvent } = await vite.ssrLoadModule(
  "/src/features/cowork/session/stream/coworkStreamingState.ts",
);

after(async () => {
  await vite.close();
});

test("uses the outer SDK uuid while preserving the API message id separately", () => {
  const snapshot = reduceCoworkStreamEvent(null, {
    event: {
      message: {
        id: "api-message-id",
        model: "claude-opus-4",
        usage: { cache_creation_input_tokens: 2, cache_read_input_tokens: 3, input_tokens: 5, output_tokens: 0 },
      },
      type: "message_start",
    },
    uuid: "sdk-message-uuid",
  });
  assert.equal(snapshot.messageId, "sdk-message-uuid");
  assert.equal(snapshot.apiMessageId, "api-message-id");
  assert.equal(snapshot.model, "claude-opus-4");
  assert.deepEqual(snapshot.usage, {
    cache_creation_input_tokens: 2,
    cache_read_input_tokens: 3,
    input_tokens: 5,
    output_tokens: 0,
  });
  // Official: no synthetic empty text seed on message_start.
  assert.deepEqual(snapshot.blocks, []);
});

test("publishes thinking deltas immediately on the target index", () => {
  const started = reduceCoworkStreamEvent(null, {
    event: { message: { id: "api-message-id" }, type: "message_start" },
    uuid: "sdk-message-uuid",
  });
  const thinking = reduceCoworkStreamEvent(started, {
    event: { content_block: { type: "thinking" }, index: 0, type: "content_block_start" },
  });
  const updated = reduceCoworkStreamEvent(thinking, {
    event: { delta: { thinking: "Checking files", type: "thinking_delta" }, index: 0, type: "content_block_delta" },
  });
  assert.deepEqual(updated.blocks, [
    { kind: "thinking", text: "Checking files" },
  ]);
});

test("does not stamp joined thinking text onto every thinking block", () => {
  // Regression: nested/duplicated Thought process rows came from join-all + map all thinking.
  let snapshot = reduceCoworkStreamEvent(null, {
    event: { message: { id: "api-message-id" }, type: "message_start" },
    uuid: "sdk-message-uuid",
  });
  snapshot = reduceCoworkStreamEvent(snapshot, {
    event: { content_block: { type: "thinking" }, index: 0, type: "content_block_start" },
  });
  snapshot = reduceCoworkStreamEvent(snapshot, {
    event: { delta: { thinking: "First thought. ", type: "thinking_delta" }, index: 0, type: "content_block_delta" },
  });
  snapshot = reduceCoworkStreamEvent(snapshot, {
    event: { content_block: { type: "thinking" }, index: 1, type: "content_block_start" },
  });
  snapshot = reduceCoworkStreamEvent(snapshot, {
    event: { delta: { thinking: "Second thought.", type: "thinking_delta" }, index: 1, type: "content_block_delta" },
  });
  assert.equal(snapshot.blocks.length, 2);
  assert.equal(snapshot.blocks[0].kind, "thinking");
  assert.equal(snapshot.blocks[0].text, "First thought. ");
  assert.equal(snapshot.blocks[1].kind, "thinking");
  assert.equal(snapshot.blocks[1].text, "Second thought.");
  // Must not become ["First thought. Second thought.", "First thought. Second thought."]
  assert.notEqual(snapshot.blocks[0].text, snapshot.blocks[1].text);
});

test("appends text deltas only to the text block at event.index", () => {
  const started = { blocks: [], messageId: "sdk-message-uuid" };
  const tool = reduceCoworkStreamEvent(started, {
    event: { content_block: { id: "tool-1", name: "Read", type: "tool_use" }, index: 0, type: "content_block_start" },
  });
  const toolDelta = reduceCoworkStreamEvent(tool, {
    event: { delta: { partial_json: '{"file_path":"/tmp/a"}', type: "input_json_delta" }, index: 0, type: "content_block_delta" },
  });
  const text = reduceCoworkStreamEvent(toolDelta, {
    event: { content_block: { text: "", type: "text" }, index: 1, type: "content_block_start" },
  });
  const final = reduceCoworkStreamEvent(text, {
    event: { delta: { text: "Done", type: "text_delta" }, index: 1, type: "content_block_delta" },
  });
  // Official order: blocks stay in stream order (tool then text), not reordered.
  assert.deepEqual(final.blocks, [
    { id: "tool-1", kind: "tool", name: "Read", partialJson: '{"file_path":"/tmp/a"}' },
    { kind: "text", text: "Done" },
  ]);
});

test("updates streamed usage from message_delta", () => {
  const started = reduceCoworkStreamEvent(null, {
    event: { message: { id: "api-message-id", usage: {} }, type: "message_start" },
    uuid: "sdk-message-uuid",
  });
  const updated = reduceCoworkStreamEvent(started, {
    event: {
      type: "message_delta",
      usage: { cache_creation_input_tokens: 7, cache_read_input_tokens: 11, input_tokens: 13, output_tokens: 17 },
    },
  });

  assert.deepEqual(updated.usage, {
    cache_creation_input_tokens: 7,
    cache_read_input_tokens: 11,
    input_tokens: 13,
    output_tokens: 17,
  });
});
