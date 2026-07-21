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
  createInitialCoworkSessionState,
  hydrateCoworkSessionState,
  mergeTranscriptMessages,
} = await vite.ssrLoadModule("/src/features/cowork/session/coworkSessionHydration.ts");

after(async () => {
  await vite.close();
});

function message(uuid, role = "assistant", extraRaw = {}) {
  return {
    createdAt: "2026-07-11T00:00:00.000Z",
    id: uuid,
    raw: { type: role, uuid, ...extraRaw },
    role,
    text: uuid,
  };
}

function session(overrides = {}) {
  return {
    id: "session-1",
    kind: "epitaxy",
    sessionKind: "cowork",
    title: "Task",
    updatedAt: "now",
    updatedAtMs: 1,
    ...overrides,
  };
}

test("hydrates transcript and only missing parent buffered messages", () => {
  const state = {
    ...createInitialCoworkSessionState("session-1"),
    messages: [message("stale-live-fragment")],
  };
  const transcript = [message("assistant-1")];
  const buffered = [
    message("assistant-1"),
    message("subagent-1", "assistant", { parent_tool_use_id: "tool-1" }),
    message("top-level-buffered"),
  ];
  const hydrated = hydrateCoworkSessionState(state, session({ bufferedMessages: buffered }), transcript);

  assert.deepEqual(hydrated.messages.map((item) => item.id), ["assistant-1", "subagent-1"]);
  assert.equal(hydrated.connectionState, "connected");
  assert.equal(hydrated.isLoading, false);
});

test("preserves receivedStreamAt and messages not present in a refreshed transcript", () => {
  const existing = [message("assistant-1", "assistant", { receivedStreamAt: 42 }), message("live-only")];
  const fresh = [message("assistant-1")];
  const merged = mergeTranscriptMessages(fresh, existing);

  assert.equal(merged[0].raw.receivedStreamAt, 42);
  assert.deepEqual(merged.map((item) => item.id), ["assistant-1", "live-only"]);
});

test("hydrates fsDetectedFiles into Me map and preserves previous when empty", () => {
  const previous = new Map([["/old", { fileName: "old", hostPath: "/old", timestamp: 1 }]]);
  const state = {
    ...createInitialCoworkSessionState("session-1"),
    fsDetectedFiles: previous,
  };
  const withFiles = hydrateCoworkSessionState(
    state,
    session({
      fsDetectedFiles: [
        { fileName: "a.txt", hostPath: "/tmp/a.txt", timestamp: 9 },
      ],
    }),
    [],
  );
  assert.equal(withFiles.fsDetectedFiles.get("/tmp/a.txt")?.fileName, "a.txt");
  assert.equal(withFiles.fsDetectedFiles.has("/old"), false);

  const withoutFiles = hydrateCoworkSessionState(withFiles, session({ isRunning: false }), []);
  assert.equal(withoutFiles.fsDetectedFiles.get("/tmp/a.txt")?.fileName, "a.txt");
});

test("removes hydrated optimistic messages and settles a stopped session", () => {
  const pending = message("user-1", "user");
  const state = {
    ...createInitialCoworkSessionState("session-1"),
    pendingMessages: [pending],
    pendingTurn: { endTurnSeen: false, startTime: 10 },
    streamActivity: "thinking",
    streamingMessageId: "assistant-stream",
    streamSnapshot: { blocks: [{ kind: "thinking", text: "work" }], messageId: "assistant-stream" },
  };
  const hydrated = hydrateCoworkSessionState(state, session({ isRunning: false }), [pending]);

  assert.deepEqual(hydrated.pendingMessages, []);
  assert.equal(hydrated.pendingTurn, null);
  assert.equal(hydrated.streamActivity, "idle");
  assert.equal(hydrated.streamSnapshot, null);
});

test("seeds official pendingTurn when hydrating a running session", () => {
  const state = createInitialCoworkSessionState("session-1");
  const hydrated = hydrateCoworkSessionState(state, session({ isRunning: true }), []);

  assert.equal(hydrated.pendingTurn?.endTurnSeen, false);
  assert.equal(typeof hydrated.pendingTurn?.startTime, "number");
});

test("keeps the initial user message in both session and runtime state", () => {
  const state = createInitialCoworkSessionState("session-1");
  const hydrated = hydrateCoworkSessionState(state, session({ initialMessage: "Start here" }), []);

  assert.deepEqual(hydrated.messages.map((item) => item.text), ["Start here"]);
  assert.deepEqual(hydrated.session.messages.map((item) => item.text), ["Start here"]);
});

test("hydrates official permission suggestions for the approval renderer", () => {
  const state = createInitialCoworkSessionState("session-1");
  const hydrated = hydrateCoworkSessionState(state, session({
    pendingToolPermissions: [{
      input: { file_path: "/tmp/a.txt" },
      requestId: "permission-1",
      sessionId: "session-1",
      suggestions: [{ destination: "session", type: "addRules" }],
      toolName: "Write",
    }],
  }), []);

  assert.deepEqual(hydrated.toolPermissionRequests[0].suggestions, [
    { destination: "session", type: "addRules" },
  ]);
});

test("normalizes official raw transcript and buffered session messages inside Cowork hydration", () => {
  const state = createInitialCoworkSessionState("session-1");
  const rawTranscript = [rawMessage("assistant-raw", "assistant")];
  const rawBuffered = [
    { ...rawMessage("subagent-raw", "assistant"), parent_tool_use_id: "tool-1" },
    rawMessage("top-level-buffered", "assistant"),
  ];
  const hydrated = hydrateCoworkSessionState(
    state,
    session({ rawBufferedMessages: rawBuffered, rawMessages: [] }),
    rawTranscript,
  );

  assert.deepEqual(hydrated.messages.map((item) => item.id), ["assistant-raw", "subagent-raw"]);
  assert.equal(hydrated.messages[0].raw, rawTranscript[0]);
});

function rawMessage(uuid, role) {
  return {
    message: { content: [{ text: uuid, type: "text" }], role },
    timestamp: "2026-07-11T00:00:00.000Z",
    type: role,
    uuid,
  };
}
