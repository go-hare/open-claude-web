/**
 * Official v$t / g$t / t$t share one streaming boolean `l`.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  configFile: "vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
});

const { resolveCoworkConversationIsStreaming } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkConversationStreaming.ts",
);
const { resolveCoworkAceTickleTooltip } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkClaudeAvatar.tsx",
);

test("streaming residual: isResponding only → true", () => {
  assert.equal(resolveCoworkConversationIsStreaming({ isResponding: true, streamingMessageId: null }), true);
});

test("streaming residual: streamingMessageId only (progressive settle) → true", () => {
  assert.equal(
    resolveCoworkConversationIsStreaming({
      isResponding: false,
      streamingMessageId: "msg_live",
    }),
    true,
  );
});

test("streaming residual: both false → false", () => {
  assert.equal(
    resolveCoworkConversationIsStreaming({ isResponding: false, streamingMessageId: null }),
    false,
  );
});

test("streaming residual: both true → true", () => {
  assert.equal(
    resolveCoworkConversationIsStreaming({ isResponding: true, streamingMessageId: "msg_live" }),
    true,
  );
});

test("Ace tickle tooltip ladder residual", () => {
  assert.equal(resolveCoworkAceTickleTooltip(0), "Hi, I’m Claude. How can I help you today?");
  assert.equal(resolveCoworkAceTickleTooltip(5), "Hi, I’m Claude. How can I help you today?");
  assert.equal(resolveCoworkAceTickleTooltip(6), "Yes, yes. What can I do for you?");
  assert.equal(resolveCoworkAceTickleTooltip(13), "Are you still doing that?");
  assert.equal(resolveCoworkAceTickleTooltip(19), "Alright, alright, you have my attention!");
  assert.equal(resolveCoworkAceTickleTooltip(25), "Ugh, well you can’t do that forever");
});

await vite.close();
