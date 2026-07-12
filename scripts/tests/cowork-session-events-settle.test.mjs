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
  shouldClearCoworkStream,
  shouldSettleCoworkStream,
} = await vite.ssrLoadModule("/src/features/cowork/session/coworkSessionEvents.ts");
const { createCoworkSessionRuntime } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionRuntime.ts",
);
const { createCoworkMessagePathStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessagePathStore.ts",
);

after(async () => {
  await vite.close();
});

test("does not treat synthetic completed as a stream clear or settle signal", () => {
  assert.equal(shouldClearCoworkStream({ type: "completed", sessionId: "s1" }), false);
  assert.equal(shouldSettleCoworkStream({ type: "completed", sessionId: "s1" }), false);
  assert.equal(
    shouldClearCoworkStream({
      type: "message",
      message: { type: "completed" },
      sessionId: "s1",
    }),
    false,
  );
  assert.equal(
    shouldSettleCoworkStream({
      type: "message",
      message: { type: "completed" },
      sessionId: "s1",
    }),
    false,
  );
});

test("still settles on official close and result", () => {
  assert.equal(shouldSettleCoworkStream({ type: "close", sessionId: "s1" }), true);
  assert.equal(shouldSettleCoworkStream({ type: "result", sessionId: "s1" }), true);
  assert.equal(
    shouldSettleCoworkStream({
      type: "message",
      message: { type: "result", subtype: "success" },
      sessionId: "s1",
    }),
    true,
  );
  assert.equal(shouldClearCoworkStream({ type: "close", sessionId: "s1" }), true);
  assert.equal(shouldClearCoworkStream({ type: "error", sessionId: "s1" }), true);
});

test("runtime ignores top-level completed and keeps responding until close/result", async () => {
  let emit;
  let context;
  const bridge = {
    getRawSession: async () => ({
      id: "session-1",
      isRunning: true,
      kind: "epitaxy",
      sessionKind: "cowork",
      title: "Task",
      updatedAt: "now",
      updatedAtMs: 1,
    }),
    getRawTranscript: async () => [],
    onEvent: (listener) => {
      emit = listener;
      return () => {};
    },
    sendMessage: async () => null,
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore,
    sessionId: "session-1",
    store,
  });
  runtime.start();
  await runtime.reload();
  await runtime.submitMessage("hello", { messageUuid: "u1" });
  assert.equal(context.isResponding, true);

  emit({ sessionId: "session-1", type: "completed" });
  assert.equal(context.isResponding, true);
  assert.equal(context.session.isRunning, true);
  assert.notEqual(context.pendingTurn, null);

  emit({
    message: {
      message: {
        content: [{ text: "done", type: "text" }],
        role: "assistant",
        stop_reason: "end_turn",
      },
      type: "assistant",
      uuid: "assistant-1",
    },
    sessionId: "session-1",
    type: "message",
  });
  // Official Qke: end_turn marks endTurnSeen; isResponding false before result.
  assert.equal(context.pendingTurn?.endTurnSeen, true);
  assert.equal(context.isResponding, false);

  emit({
    message: { is_error: false, subtype: "success", type: "result", uuid: "result-1" },
    sessionId: "session-1",
    type: "message",
  });
  assert.equal(context.isResponding, false);
  assert.equal(context.session.isRunning, false);
  assert.equal(context.pendingTurn, null);
  runtime.dispose();
});
