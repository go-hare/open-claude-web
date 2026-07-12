import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { createDesktopBridgeFromOfficialNamespaces } = await vite.ssrLoadModule(
  "/src/adapters/desktopBridge/officialBridgeAdapter.ts",
);

after(async () => {
  await vite.close();
});

test("keeps Cowork session, transcript, and events raw on the dedicated bridge", async () => {
  const buffered = rawMessage("buffered-1", "assistant");
  const sessionMessage = rawMessage("session-1-user", "user");
  const transcriptMessage = rawMessage("assistant-1", "assistant");
  const rawSession = {
    bufferedMessages: [buffered],
    messages: [sessionMessage],
    sessionId: "session-1",
    title: "Task",
  };
  let emit;
  const event = { sessionId: "session-1", type: "session_updated" };
  const bridge = createDesktopBridgeFromOfficialNamespaces({
    LocalAgentModeSessions: {
      getAll: async () => [rawSession],
      getSession: async () => rawSession,
      getTranscript: async () => [transcriptMessage],
      onOnEvent: (listener) => { emit = listener; return () => {}; },
    },
  });

  const cowork = bridge.LocalAgentModeSessions;
  const snapshot = await cowork.getRawSession("session-1");
  const transcript = await cowork.getRawTranscript("session-1");
  let received;
  cowork.onEvent?.((next) => { received = next; });
  emit(event);

  assert.equal(snapshot.rawSession, rawSession);
  assert.equal(snapshot.rawBufferedMessages[0], buffered);
  assert.equal(snapshot.rawMessages[0], sessionMessage);
  assert.equal(transcript[0], transcriptMessage);
  assert.equal(received, event);
  assert.equal(cowork.onToolPermissionRequest, undefined);
  assert.deepEqual((await cowork.getTranscript?.("session-1")).map((message) => message.id), ["assistant-1"]);
});

test("leaves the Code transcript normalization contract unchanged", async () => {
  const transcriptMessage = rawMessage("code-assistant-1", "assistant");
  const bridge = createDesktopBridgeFromOfficialNamespaces({
    LocalSessions: {
      getSession: async () => ({ sessionId: "code-1", title: "Code" }),
      getTranscript: async () => [transcriptMessage],
    },
  });

  const transcript = await bridge.LocalSessions.getTranscript?.("code-1");
  assert.deepEqual(transcript.map((message) => ({ id: message.id, role: message.role })), [
    { id: "code-assistant-1", role: "assistant" },
  ]);
  assert.equal(transcript[0].raw, transcriptMessage);
});

function rawMessage(uuid, role) {
  return {
    message: { content: [{ text: uuid, type: "text" }], role },
    timestamp: "2026-07-11T00:00:00.000Z",
    type: role,
    uuid,
  };
}
