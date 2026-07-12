import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { coworkAgentActivityFromStream } = await vite.ssrLoadModule(
  "/src/features/cowork/session/stream/coworkStreamActivity.ts",
);

after(async () => {
  await vite.close();
});

test("starts the official thinking activity at message_start", () => {
  const snapshot = { blocks: [{ kind: "text", text: "" }], messageId: "live-1" };
  const event = { event: { type: "message_start" } };

  assert.deepEqual(coworkAgentActivityFromStream(snapshot, event, null, 100), {
    activity: "thinking",
    contentLength: 0,
    lastActivityTime: 100,
  });
});

test("resets activity time only on the first writing delta", () => {
  const first = coworkAgentActivityFromStream(
    { blocks: [{ kind: "text", text: "hello" }], messageId: "live-1" },
    { event: { delta: { type: "text_delta" }, type: "content_block_delta" } },
    { activity: "thinking", contentLength: 0, lastActivityTime: 100 },
    200,
  );
  const second = coworkAgentActivityFromStream(
    { blocks: [{ kind: "text", text: "hello world" }], messageId: "live-1" },
    { event: { delta: { type: "text_delta" }, type: "content_block_delta" } },
    first,
    300,
  );

  assert.equal(first.lastActivityTime, 200);
  assert.equal(second.lastActivityTime, 200);
  assert.equal(second.contentLength, 11);
});

test("counts partial tool JSON and exposes its path during tool activity", () => {
  const partialJson = '{"file_path":"/tmp/example.txt","content":"abc';
  const activity = coworkAgentActivityFromStream(
    { activeToolId: "tool-1", blocks: [{ id: "tool-1", kind: "tool", name: "Write", partialJson }], messageId: "live-1" },
    { event: { content_block: { name: "Write", type: "tool_use" }, type: "content_block_start" } },
    { activity: "writing", contentLength: 4, lastActivityTime: 100 },
    400,
  );

  assert.deepEqual(activity, {
    activity: "tool_use",
    contentLength: partialJson.length,
    filePath: "/tmp/example.txt",
    lastActivityTime: 400,
    toolName: "Write",
  });
});
