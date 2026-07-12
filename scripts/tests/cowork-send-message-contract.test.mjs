import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { buildOfficialCoworkSendMessageArgs } = await vite.ssrLoadModule(
  "/src/adapters/desktopBridge/coworkSendMessageContract.ts",
);

after(async () => {
  await vite.close();
});

test("builds the official LocalAgentModeSessions.sendMessage argument order", () => {
  const images = [{ base64: "aGVsbG8=", filename: "hello.png", mimeType: "image/png" }];
  const userSelectedFiles = ["/tmp/report.txt"];
  const toolStates = [{ tool_name: "example", content: [{ type: "text", text: "ready" }] }];

  assert.deepEqual(
    buildOfficialCoworkSendMessageArgs(
      "session-1",
      "hello",
      { images, messageUuid: "ignored-by-builder", toolStates, userSelectedFiles },
      "message-1",
    ),
    ["session-1", "hello", images, userSelectedFiles, "message-1", toolStates],
  );
});

test("keeps official optional arguments undefined and images as an empty array", () => {
  assert.deepEqual(
    buildOfficialCoworkSendMessageArgs("session-2", "hello", undefined, "message-2"),
    ["session-2", "hello", [], undefined, "message-2", undefined],
  );
});
