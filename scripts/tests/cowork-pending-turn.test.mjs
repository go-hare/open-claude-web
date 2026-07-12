import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { createInitialCoworkSessionState } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionHydration.ts",
);
const { reduceCoworkSessionState } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionReducer.ts",
);

after(async () => vite.close());

test("marks the official pending turn complete on top-level assistant end_turn", () => {
  const initial = createInitialCoworkSessionState("session-1");
  const user = rawMessage("user-1", "user", null);
  const pending = reduceCoworkSessionState(initial, {
    message: user,
    startedAt: 10,
    type: "pending-message-added",
  });
  const streaming = {
    ...pending,
    agentActivity: { activity: "writing" },
    streamActivity: "responding",
    streamingMessageId: "assistant-1",
    streamSnapshot: { blocks: [{ kind: "text", text: "done" }], messageId: "assistant-1" },
  };
  const completed = reduceCoworkSessionState(streaming, {
    message: rawMessage("assistant-1", "assistant", "end_turn"),
    receivedAt: 20,
    type: "transcript-message",
  });

  assert.deepEqual(completed.pendingTurn, { endTurnSeen: true, startTime: 10 });
  assert.equal(completed.agentActivity, null);
  assert.equal(completed.streamActivity, "idle");
  assert.equal(completed.streamingMessageId, null);
  assert.equal(completed.streamSnapshot, null);
});

test("metadata refresh seeds pendingTurn for a running session and clears when idle", () => {
  const initial = createInitialCoworkSessionState("session-1");
  const running = reduceCoworkSessionState(initial, {
    session: {
      id: "session-1",
      isRunning: true,
      kind: "epitaxy",
      sessionKind: "cowork",
      title: "Task",
      updatedAt: "now",
      updatedAtMs: 1,
    },
    type: "metadata-refreshed",
  });
  assert.equal(running.pendingTurn?.endTurnSeen, false);

  const idle = reduceCoworkSessionState(running, {
    session: {
      id: "session-1",
      isRunning: false,
      kind: "epitaxy",
      sessionKind: "cowork",
      title: "Task",
      updatedAt: "now",
      updatedAtMs: 2,
    },
    type: "metadata-refreshed",
  });
  assert.equal(idle.pendingTurn, null);
});

function rawMessage(uuid, role, stopReason) {
  return {
    createdAt: "2026-07-11T00:00:00.000Z",
    id: uuid,
    raw: {
      message: { content: [{ text: uuid, type: "text" }], role, stop_reason: stopReason },
      type: role,
      uuid,
    },
    role,
    text: uuid,
  };
}
