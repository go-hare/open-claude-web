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
const { officialStreamFlush } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialStreamSessionStore.ts",
);
const { applyCoworkRateLimitToStore, coworkRateLimitStore, createCoworkRateLimitStore } =
  await vite.ssrLoadModule(
    "/src/features/cowork/session/rateLimit/coworkRateLimitStore.ts",
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

test("applies archived and fs_file_* events per official D1e", async () => {
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
    fsFile: { fileName: "a.txt", hostPath: "/tmp/a.txt", timestamp: 100 },
    sessionId: "session-1",
    type: "fs_file_created",
  });
  assert.equal(context.fsDetectedFiles.get("/tmp/a.txt")?.fileName, "a.txt");

  emit({
    fsFile: { fileName: "a.txt", hostPath: "/tmp/a.txt", timestamp: 200 },
    sessionId: "session-1",
    type: "fs_file_modified",
  });
  assert.equal(context.fsDetectedFiles.get("/tmp/a.txt")?.timestamp, 200);

  emit({
    fsFile: { fileName: "a.txt", hostPath: "/tmp/a.txt", timestamp: 200 },
    sessionId: "session-1",
    type: "fs_file_deleted",
  });
  assert.equal(context.fsDetectedFiles.has("/tmp/a.txt"), false);

  emit({ sessionId: "session-1", type: "archived" });
  assert.equal(context.session?.isArchived, true);
  assert.equal(context.session?.isRunning, false);
  assert.equal(context.pendingTurn, null);
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

  // Stream smoother paints via rAF/setTimeout — flush so node tests see Oke→Va without waiting frames.
  officialStreamFlush("session-1");
  await new Promise((resolve) => setTimeout(resolve, 0));

  // Official: no synthetic empty text seed; thinking lives at its own index.
  assert.ok(context.streamSnapshot, "streamSnapshot should publish after flush");
  assert.deepEqual(context.streamSnapshot.blocks, [
    { kind: "thinking", text: "Live thinking" },
  ]);
  assert.equal(context.streamSnapshot.apiMessageId, "api-id");
  const canonical = messageStore.getState().getConversationMessages("session-1");
  // Official Pke: messageId = event.message.id only (never outer stream uuid).
  assert.deepEqual(canonical.at(-1).apiMessageIds, ["api-id"]);
  assert.match(JSON.stringify(canonical), /Live thinking/);
  assert.deepEqual(context.messageUuids, ["api-id"]);
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


test("rate_limit_event updates store without blocking unrelated messages", async () => {
  let emit;
  let context;
  const fresh = createCoworkRateLimitStore().getState();
  coworkRateLimitStore.setState({
    messageLimits: fresh.messageLimits,
    lastSessionId: fresh.lastSessionId,
  });
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
    rate_limit_info: {
      status: "allowed_warning",
      rateLimitType: "five_hour",
      resetsAt: 42,
      utilization: 0.9,
    },
    sessionId: "session-1",
    type: "rate_limit_event",
  });
  const stored = coworkRateLimitStore.getState().getMessageLimit("_");
  assert.equal(stored?.type, "approaching_limit");
  assert.equal(stored?.conversationUuid, "session-1");

  // Unrelated message still applies (rate_limit extractor must not swallow stream_event envelopes).
  emit({
    message: {
      message: { content: [{ text: "hi", type: "text" }], id: "api-2", role: "assistant" },
      type: "assistant",
      uuid: "assistant-2",
    },
    sessionId: "session-1",
    type: "message",
  });
  assert.equal(context.messages.some((m) => m.id === "assistant-2"), true);
  runtime.dispose();
});

test("hydrate scans transcript rate_limit via official Tke.scanTranscript", async () => {
  let context;
  const future = Math.floor(Date.now() / 1000) + 7200;
  const fresh = createCoworkRateLimitStore().getState();
  coworkRateLimitStore.setState({
    messageLimits: fresh.messageLimits,
    lastSessionId: fresh.lastSessionId,
  });
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [
      message("assistant-old"),
      {
        type: "rate_limit_event",
        rate_limit_info: {
          status: "rejected",
          rateLimitType: "five_hour",
          resetsAt: future,
          utilization: 1,
        },
      },
    ],
    onEvent: () => () => {},
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
  const stored = coworkRateLimitStore.getState().getMessageLimit("_");
  assert.equal(stored?.type, "exceeded_limit");
  assert.equal(stored?.conversationUuid, "session-1");
  assert.equal(context.connectionState, "connected");
  runtime.dispose();
});

test("cu_lock_released event is handled without throwing (DOM-less)", async () => {
  let emit;
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => {
      emit = listener;
      return () => {};
    },
  };
  const store = { setState: () => {} };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({
    bridge,
    messageStore,
    sessionId: "session-1",
    store,
  });
  runtime.start();
  await runtime.reload();
  // Official sessionId match path; no document in node — must not throw.
  emit({ sessionId: "session-1", type: "cu_lock_released" });
  emit({ sessionId: "other-session", type: "cu_lock_released" });
  runtime.dispose();
});

test("pty_close refreshTranscript re-scans rate_limit (official reseed)", async () => {
  let emit;
  let context;
  const future = Math.floor(Date.now() / 1000) + 7200;
  let transcriptCalls = 0;
  const fresh = createCoworkRateLimitStore().getState();
  coworkRateLimitStore.setState({
    messageLimits: fresh.messageLimits,
    lastSessionId: fresh.lastSessionId,
  });
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => {
      transcriptCalls += 1;
      if (transcriptCalls === 1) return [message("assistant-old")];
      return [
        message("assistant-old"),
        {
          type: "rate_limit_event",
          rate_limit_info: {
            status: "allowed_warning",
            rateLimitType: "five_hour",
            resetsAt: future,
            utilization: 0.95,
            surpassedThreshold: 0.8,
          },
        },
      ];
    },
    onEvent: (listener) => {
      emit = listener;
      return () => {};
    },
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
  assert.equal(coworkRateLimitStore.getState().getMessageLimit("_"), undefined);
  emit({ sessionId: "session-1", type: "pty_close" });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stored = coworkRateLimitStore.getState().getMessageLimit("_");
  assert.equal(stored?.type, "approaching_limit");
  assert.equal(stored?.conversationUuid, "session-1");
  assert.ok(transcriptCalls >= 2);
  assert.ok(context);
  runtime.dispose();
});

test("directory_servers_search reverse-RPC responds via bridge", async () => {
  let emit;
  const responses = [];
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
    respondDirectoryServers: async (requestId, servers) => {
      responses.push({ requestId, servers });
    },
  };
  const store = { setState: () => {} };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({
    data: JSON.stringify({ requestId: "dir-1", keywords: ["gmail"] }),
    sessionId: "session-1",
    type: "directory_servers_search",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(responses.length, 1);
  assert.equal(responses[0].requestId, "dir-1");
  assert.ok(responses[0].servers.some((s) => s.name === "Gmail"));
  runtime.dispose();
});

test("slash_menu_skills_resolve reverse-RPC responds via bridge", async () => {
  let emit;
  const responses = [];
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    getSupportedCommands: async () => [
      { name: "docs", description: "Write documentation" },
    ],
    onEvent: (listener) => { emit = listener; return () => {}; },
    respondSlashMenuSkills: async (requestId, skillsJson) => {
      responses.push({ requestId, skillsJson });
    },
  };
  const store = { setState: () => {} };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({
    data: JSON.stringify({ requestId: "sk-1", skillNames: ["docs"], keywords: [] }),
    sessionId: "session-1",
    type: "slash_menu_skills_resolve",
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(responses.length, 1);
  assert.equal(responses[0].requestId, "sk-1");
  const skills = JSON.parse(responses[0].skillsJson);
  assert.ok(Array.isArray(skills));
  assert.ok(skills.some((s) => s.name === "docs"));
  runtime.dispose();
});

test("plugins_search reverse-RPC responds empty catalog when no org (honest residual)", async () => {
  let emit;
  const responses = [];
  const bridge = {
    getRawSession: async () => session(),
    getRawTranscript: async () => [],
    onEvent: (listener) => { emit = listener; return () => {}; },
    respondPluginSearch: async (requestId, resultsJson) => {
      responses.push({ requestId, resultsJson });
    },
  };
  const store = { setState: () => {} };
  const messageStore = createCoworkMessagePathStore();
  const runtime = createCoworkSessionRuntime({ bridge, messageStore, sessionId: "session-1", store });
  runtime.start();
  await runtime.reload();

  emit({
    data: JSON.stringify({ requestId: "pl-1", keywords: ["legal"], listInstalledOnly: false }),
    sessionId: "session-1",
    type: "plugins_search",
  });
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(responses.length, 1);
  assert.equal(responses[0].requestId, "pl-1");
  const parsed = JSON.parse(responses[0].resultsJson);
  assert.deepEqual(parsed.results, []);
  runtime.dispose();
});
