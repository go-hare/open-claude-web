import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { createCoworkMessagePathStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessagePathStore.ts",
);

after(async () => {
  await vite.close();
});

function message(uuid, sender, content, overrides = {}) {
  return {
    attachments: [],
    content,
    created_at: "",
    files: [],
    files_v2: [],
    index: 0,
    sender,
    sync_sources: [],
    uuid,
    ...overrides,
  };
}

test("setMessages replaces the active message map, preserves stop details, and records path order", () => {
  const store = createCoworkMessagePathStore();
  const first = message("assistant-1", "assistant", [{ text: "first", type: "text" }], {
    stop_details: { reason: "user_canceled" },
  });
  store.getState().setMessages("session-1", [first]);
  store.getState().setMessages("session-1", [
    message("human-1", "human", [{ text: "hello", type: "text" }]),
    message("assistant-1", "assistant", [{ text: "updated", type: "text" }], { sync_sources: undefined }),
  ]);

  const state = store.getState();
  assert.deepEqual(state.pathUuidsByConversation["session-1"], ["human-1", "assistant-1"]);
  assert.deepEqual(Object.keys(state.messageByUuid), ["human-1", "assistant-1"]);
  assert.deepEqual(state.messageByUuid["assistant-1"].stop_details, { reason: "user_canceled" });
  assert.deepEqual(state.messageByUuid["assistant-1"].sync_sources, []);
});

test("selected message and conversation settings follow the official store actions", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setSelectedMessage("assistant-1");
  store.getState().setConversationSettings({ style: "concise" });

  assert.equal(store.getState().selectedMessageUuid, "assistant-1");
  assert.deepEqual(store.getState().conversationSettings, { style: "concise" });
});

test("append, update, and setPathUuids retain official conversation lookup semantics", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setMessages("session-1", [message("human-1", "human", [{ text: "one", type: "text" }])]);
  store.getState().appendMessages("session-1", [message("assistant-1", "assistant", [{ text: "two", type: "text" }])]);
  store.getState().updateMessage(
    "assistant-1",
    message("assistant-1", "assistant", [{ text: "three", type: "text" }], { sync_sources: undefined }),
  );

  assert.deepEqual(
    store.getState().getConversationMessages("session-1").map((item) => item.content[0].text),
    ["one", "three"],
  );
  store.getState().setPathUuids("session-1", ["assistant-1"]);
  assert.deepEqual(store.getState().getConversationMessages("session-1").map((item) => item.uuid), ["assistant-1"]);
});

test("streaming content and stop details target the final path message", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setMessages("session-1", [message("assistant-1", "assistant", [])]);
  store.getState().updateStreamingMessage(
    "session-1",
    "ignored-by-official-store",
    [{ thinking: "live", type: "thinking" }],
  );
  store.getState().setMessageStopDetails("session-1", undefined, { reason: "user_canceled" });

  const current = store.getState().messageByUuid["assistant-1"];
  assert.deepEqual(current.content, [{ thinking: "live", type: "thinking" }]);
  assert.deepEqual(current.stop_details, { reason: "user_canceled" });
});

test("setMessageStopDetails creates the official assistant placeholder when the message is absent", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setMessageStopDetails("session-1", "missing-message", { reason: "no_stop_reason" });

  const placeholder = store.getState().messageByUuid["missing-message"];
  assert.equal(placeholder.sender, "assistant");
  assert.deepEqual(placeholder.content, []);
  assert.deepEqual(placeholder.stop_details, { reason: "no_stop_reason" });
});

test("resource aggregates and searchable text follow official message-store inputs", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setMessages("session-1", [
    message("assistant-1", "assistant", [
      { connector_text: "connector", type: "connector_text" },
      { input: { path: "/tmp/file" }, type: "tool_use" },
      { content: [{ text: "tool result", type: "text" }], type: "tool_result" },
    ], {
      attachments: [{ extracted_content: "attachment text", id: "attachment-1" }],
      files: [{ id: "file-1" }],
      sync_sources: [{ id: "sync-1" }],
    }),
  ]);

  const state = store.getState();
  assert.deepEqual(state.allFiles, [{ id: "file-1" }]);
  assert.deepEqual(state.allAttachments, [{ extracted_content: "attachment text", id: "attachment-1" }]);
  assert.deepEqual(state.allSyncSources, [{ id: "sync-1" }]);
  assert.match(state.fullText, /connector/);
  assert.match(state.fullText, /attachment text/);
  assert.match(state.fullText, /\/tmp\/file/);
  assert.match(state.fullText, /tool result/);
});

test("committed and streaming artifacts retain official version result state", () => {
  const store = createCoworkMessagePathStore();
  store.getState().setMessages("session-1", [message("assistant-1", "assistant", [{
    text: '<antArtifact identifier="doc-1" type="text/plain" title="Notes">first</antArtifact>',
    type: "text",
  }])]);
  store.getState().updateStreamingMessage("session-1", undefined, [{
    input: { command: "update", id: "doc-1", new_str: "second", old_str: "first", title: "Notes", type: "text/plain" },
    name: "artifacts",
    type: "tool_use",
  }]);

  assert.equal(store.getState().artifacts["doc-1"].versions.at(-1).resultState, "first");
  assert.equal(store.getState().streamingArtifacts["doc-1"].versions.at(-1).resultState, "second");
  assert.equal(store.getState().lastStreamingArtifactId, "doc-1");
});
