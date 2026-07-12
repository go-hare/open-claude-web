import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { createCoworkSessionRuntime } = await vite.ssrLoadModule(
  "/src/features/cowork/session/coworkSessionRuntime.ts",
);
const { createCoworkMessagePathStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessagePathStore.ts",
);

after(async () => {
  await vite.close();
});

function deferred() {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
}

function message(uuid, role = "assistant") {
  return {
    createdAt: "2026-07-11T00:00:00.000Z",
    id: uuid,
    raw: { message: { content: [{ text: uuid, type: "text" }], role }, type: role, uuid },
    role,
    text: uuid,
  };
}

function session() {
  return {
    id: "session-1",
    isRunning: true,
    kind: "epitaxy",
    sessionKind: "cowork",
    title: "Task",
    updatedAt: "now",
    updatedAtMs: 1,
  };
}

test("subscribes before concurrent hydration and drains buffered events afterward", async () => {
  const transcript = deferred();
  const sessionResult = deferred();
  const calls = [];
  let emit;
  let context;
  const bridge = {
    getRawSession: () => { calls.push("getRawSession"); return sessionResult.promise; },
    getRawTranscript: () => { calls.push("getRawTranscript"); return transcript.promise; },
    onEvent: (listener) => { calls.push("subscribe"); emit = listener; return () => {}; },
    onToolPermissionRequest: () => { throw new Error("Cowork must not subscribe to the legacy permission channel"); },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });

  runtime.start();
  assert.deepEqual(calls, ["subscribe", "getRawTranscript", "getRawSession"]);
  emit({
    message: { message: { content: [{ text: "event-1", type: "text" }], role: "assistant" }, type: "assistant", uuid: "event-1" },
    sessionId: "session-1",
    type: "message",
  });
  assert.deepEqual(context.messages, []);

  transcript.resolve([message("transcript-1")]);
  sessionResult.resolve(session());
  await runtime.reload();

  assert.deepEqual(context.messages.map((item) => item.id), ["transcript-1", "event-1"]);
  assert.equal(context.connectionState, "connected");
  runtime.dispose();
});

test("restores the official responding state when a running session is hydrated", async () => {
  let context;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [message("assistant-running")],
    onEvent: () => () => {},
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });

  runtime.start();
  await runtime.reload();

  assert.equal(context.session.isRunning, true);
  assert.equal(context.isResponding, true);
  runtime.dispose();
});

test("does not reload the transcript when the official result message arrives", async () => {
  let emit;
  let context;
  let transcriptReads = 0;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => {
      transcriptReads += 1;
      return transcriptReads === 1 ? [] : [message("canonical-transcript")];
    },
    onEvent: (listener) => { emit = listener; return () => {}; },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });

  runtime.start();
  await runtime.reload();
  emit({
    message: {
      message: { content: [{ thinking: "work", type: "thinking" }], id: "api-1", role: "assistant" },
      type: "assistant",
      uuid: "live-fragment-1",
    },
    sessionId: "session-1",
    type: "message",
  });
  emit({
    message: { is_error: false, subtype: "success", type: "result", uuid: "result-1" },
    sessionId: "session-1",
    type: "message",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(transcriptReads, 1);
  assert.deepEqual(context.messages.map((item) => item.id), ["live-fragment-1"]);
  runtime.dispose();
});

test("applies official error state without silently clearing it", async () => {
  let emit;
  let context;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
    sendMessage: async () => null,
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();
  await runtime.submitMessage("pending request", { messageUuid: "pending-1" });
  assert.equal(context.pendingMessages.length, 1);

  emit({ error: "runtime failed", error_category: "network_error", sessionId: "session-1", type: "error" });
  assert.equal(context.error.message, "runtime failed");
  assert.equal(context.errorCategory, "network_error");
  assert.equal(context.session.isRunning, false);
  assert.equal(context.isResponding, false);
  assert.equal(context.streamSnapshot, null);
  runtime.dispose();
});

test("publishes live thinking through the session context and assistant chain", async () => {
  let emit;
  let context;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({
    message: { event: { message: { id: "api-id" }, type: "message_start" }, session_id: "session-1", type: "stream_event", uuid: "sdk-uuid" },
    sessionId: "session-1",
    type: "message",
  });
  emit({
    message: { event: { content_block: { type: "thinking" }, index: 0, type: "content_block_start" }, session_id: "session-1", type: "stream_event" },
    sessionId: "session-1",
    type: "message",
  });
  emit({
    message: { event: { delta: { thinking: "Live thinking", type: "thinking_delta" }, index: 0, type: "content_block_delta" }, session_id: "session-1", type: "stream_event" },
    sessionId: "session-1",
    type: "message",
  });

  // Official: no synthetic empty text seed; thinking lives at its own index.
  assert.deepEqual(context.streamSnapshot.blocks, [
    { kind: "thinking", text: "Live thinking" },
  ]);
  assert.equal(context.streamSnapshot.apiMessageId, "api-id");
  const canonical = messageStore.getState().getConversationMessages("session-1");
  assert.deepEqual(canonical.at(-1).apiMessageIds, ["api-id"]);
  assert.match(JSON.stringify(canonical), /Live thinking/);
  assert.deepEqual(context.messageUuids, ["sdk-uuid"]);
  runtime.dispose();
});

test("reduces permission requests and resolutions from the single official event channel", async () => {
  let emit;
  let context;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
    onToolPermissionRequest: () => { throw new Error("legacy permission channel must stay unused"); },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({
    request: { requestId: "request-1", session_id: "session-1", toolName: "Read" },
    type: "tool_permission_request",
  });
  assert.deepEqual(context.toolPermissionRequests.map((request) => request.requestId), ["request-1"]);

  emit({
    request: { requestId: "request-1", session_id: "session-1" },
    type: "tool_permission_resolved",
  });
  assert.deepEqual(context.toolPermissionRequests, []);
  runtime.dispose();
});

test("does not restore a locally resolved permission from stale session metadata", async () => {
  let emit;
  let context;
  let currentSession = session();
  const bridge = {
    getRawSession: async () => currentSession,
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();
  emit({
    request: { input: { file_path: "/tmp/a.txt" }, requestId: "request-1", sessionId: "session-1", toolName: "Write" },
    sessionId: "session-1",
    type: "tool_permission_request",
  });
  assert.deepEqual(context.toolPermissionRequests.map((request) => request.requestId), ["request-1"]);
  context.setPermissionRequests((requests) => requests.filter((request) => request.requestId !== "request-1"));
  assert.deepEqual(context.toolPermissionRequests, []);

  currentSession = {
    ...session(),
    pendingToolPermissions: [{
      input: { file_path: "/tmp/a.txt" },
      requestId: "request-1",
      sessionId: "session-1",
      toolName: "Write",
    }],
  };
  emit({ sessionId: "session-1", type: "session_updated" });
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(context.toolPermissionRequests, []);
  runtime.dispose();
});

test("tracks official initialization status timing and clears it on completion", async () => {
  let emit;
  let context;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
  };
  const store = { setState: (next) => { context = next.sessionContext; } };
  const runtime = createCoworkSessionRuntime({ bridge, messageStore: createCoworkMessagePathStore(), sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({ initializationStatus: { isComplete: false, message: "Starting...", step: "sdk" }, sessionId: "session-1", type: "initialization_status" });
  assert.equal(context.initializationStatus.message, "Starting...");
  assert.equal(typeof context.initializationStatus.startTime, "number");

  emit({ initializationStatus: { isComplete: true, message: "Ready", step: "sdk" }, sessionId: "session-1", type: "initialization_status" });
  assert.equal(context.initializationStatus.isComplete, true);
  assert.equal(context.initializationStatus.startTime, undefined);
  runtime.dispose();
});
