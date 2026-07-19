/**
 * Cowork live paint: Va/Pke stream snapshot must own the Anthropic message.id row.
 * Durable multi-emit assistants for the same api id must not sit beside stream text
 * (that paints as whole-message dump, not typewriter).
 */
import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const {
  mergeCoworkStreamedSdkMessage,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessageStreamMerge.ts",
);
const {
  buildOfficialCoworkMessageChains,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessageChains.ts",
);
const {
  normalizeSdkMessages,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessageStore.ts",
);

after(async () => {
  await vite.close();
});

test("mergeCoworkStreamedSdkMessage replaces durable same-api-id assistants with stream row", () => {
  const durablePartial = {
    type: "assistant",
    uuid: "sdk-uuid-1",
    message: {
      id: "api-msg-1",
      role: "assistant",
      content: [{ type: "text", text: "Hello whole" }],
    },
  };
  const durableLater = {
    type: "assistant",
    uuid: "sdk-uuid-2",
    message: {
      id: "api-msg-1",
      role: "assistant",
      content: [{ type: "text", text: "Hello whole world" }],
    },
  };
  const snapshot = {
    apiMessageId: "api-msg-1",
    messageId: "api-msg-1",
    blocks: [{ kind: "text", text: "Hel" }],
  };
  const merged = mergeCoworkStreamedSdkMessage(
    [durablePartial, durableLater],
    snapshot,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0].message.id, "api-msg-1");
  assert.equal(merged[0].message.content[0].text, "Hel");
  assert.ok(merged[0].receivedStreamAt);
});

test("buildOfficialCoworkMessageChains isStreaming matches Anthropic apiMessageIds", () => {
  const chat = normalizeSdkMessages([
    {
      type: "assistant",
      uuid: "sdk-row",
      message: {
        id: "api-msg-live",
        role: "assistant",
        content: [{ type: "text", text: "Hi" }],
      },
    },
  ]);
  const chains = buildOfficialCoworkMessageChains(chat, "api-msg-live");
  assert.equal(chains.length, 1);
  assert.equal(chains[0].isStreaming, true);
  // Outer uuid mismatch must not leave isStreaming false (was progressive markdown off).
  assert.equal(chains[0].messageUuids.includes("api-msg-live"), false);
});
