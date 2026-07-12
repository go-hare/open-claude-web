import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { buildCoworkChatMessages, normalizeSdkMessages } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkMessageStore.ts",
);
const { createCoworkMcpRegistryStore } = await vite.ssrLoadModule(
  "/src/features/cowork/session/mcp/coworkMcpRegistryStore.ts",
);

after(async () => {
  await vite.close();
});

test("normalizes official command messages and filters synthetic humans", () => {
  const messages = normalizeSdkMessages([
    {
      message: { content: [{ text: "<command-name>/compact</command-name><command-args>now</command-args>", type: "text" }] },
      type: "user",
      uuid: "user-command",
    },
    {
      isSynthetic: true,
      message: { content: [{ text: "hidden", type: "text" }] },
      type: "user",
      uuid: "user-hidden",
    },
  ]);

  assert.equal(messages.length, 1);
  assert.equal(messages[0].content[0].text, "/compact now");
});

test("pairs tool results, answers, structured content, metadata, and attachments", () => {
  const messages = normalizeSdkMessages([
    {
      message: {
        content: [{ id: "tool-question", input: { questions: [] }, name: "AskUserQuestion", type: "tool_use" }],
        id: "api-assistant",
      },
      type: "assistant",
      uuid: "assistant-1",
    },
    {
      message: { content: [{ content: "answer recorded", tool_use_id: "tool-question", type: "tool_result" }] },
      tool_use_result: {
        _meta: { source: "fixture" },
        answers: { choice: "A" },
        attachments: [{ id: "attachment-1" }],
        structuredContent: { ok: true },
      },
      type: "user",
      uuid: "result-1",
    },
  ]);

  const [tool, result] = messages[0].content;
  assert.deepEqual(tool.input.answers, { choice: "A" });
  assert.deepEqual(result.content, [{ text: "answer recorded", type: "text" }]);
  assert.deepEqual(result.structured_content, { ok: true });
  assert.deepEqual(result.meta, { source: "fixture" });
  assert.deepEqual(result.attachments, [{ id: "attachment-1" }]);
  assert.deepEqual(messages[0].apiMessageIds, ["api-assistant"]);
});

test("restores AskUserQuestion answers from the official camel-case JSONL field", () => {
  const messages = normalizeSdkMessages([
    {
      message: {
        content: [{ id: "tool-question", input: { questions: [] }, name: "AskUserQuestion", type: "tool_use" }],
      },
      type: "assistant",
      uuid: "assistant-1",
    },
    {
      message: {
        content: [{ content: "answer recorded", tool_use_id: "tool-question", type: "tool_result" }],
      },
      toolUseResult: { answers: { Question: "OK" } },
      type: "user",
      uuid: "result-1",
    },
  ]);

  assert.deepEqual(messages[0].content[0].input.answers, { Question: "OK" });
});

test("attaches subagent blocks to their Task parent", () => {
  const messages = normalizeSdkMessages([
    {
      message: { content: [{ id: "task-1", input: {}, name: "Task", type: "tool_use" }], id: "api-parent" },
      type: "assistant",
      uuid: "assistant-parent",
    },
    {
      message: { content: [{ id: "read-1", input: {}, name: "Read", type: "tool_use" }], id: "api-child" },
      parent_tool_use_id: "task-1",
      type: "assistant",
      uuid: "assistant-child",
    },
    {
      message: { content: [{ content: "child result", tool_use_id: "read-1", type: "tool_result" }] },
      parent_tool_use_id: "task-1",
      type: "user",
      uuid: "user-child-result",
    },
  ]);

  assert.equal(messages.length, 1);
  assert.match(JSON.stringify(messages[0].content), /child result/);
  assert.equal(messages[0].content.some((block) => block._parentToolUseId === "task-1"), true);
});

test("hides completion-only blocks and appends pending Human messages", () => {
  const pending = {
    createdAt: "2026-07-11T00:00:00.000Z",
    id: "pending-1",
    raw: {
      message: { content: [{ text: "pending request", type: "text" }], role: "user" },
      type: "user",
      uuid: "pending-1",
    },
    role: "user",
    text: "pending request",
  };
  const messages = normalizeSdkMessages([
    {
      message: {
        content: [
          { id: "complete-1", input: {}, name: "mcp__cowork__mark_task_complete", type: "tool_use" },
          { text: "No response requested.", type: "text" },
        ],
      },
      type: "assistant",
      uuid: "assistant-hidden",
    },
  ], { pendingMessages: [pending] });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].sender, "human");
  assert.equal(messages[0].pending, true);
  assert.equal(messages[0].content[0].text, "pending request");
});

test("replaces the transcript assistant by inner API message id during streaming", () => {
  const transcript = [{
    createdAt: "2026-07-11T00:00:00.000Z",
    id: "transcript-uuid",
    raw: {
      message: { content: [{ text: "stale", type: "text" }], id: "api-message-id", role: "assistant" },
      type: "assistant",
      uuid: "transcript-uuid",
    },
    role: "assistant",
    text: "stale",
  }];
  const messages = buildCoworkChatMessages(transcript, {
    apiMessageId: "api-message-id",
    blocks: [{ kind: "text", text: "live" }],
    messageId: "stream-uuid",
  });

  assert.equal(messages.length, 1);
  assert.equal(messages[0].uuid, "stream-uuid");
  assert.equal(messages[0].content[0].text, "live");
});

test("preserves official stop details on normalized assistant messages", () => {
  const messages = normalizeSdkMessages([{
    message: {
      content: [{ text: "Stopped", type: "text" }],
      stop_details: { category: "user" },
      stop_reason: "user_canceled",
    },
    type: "assistant",
    uuid: "assistant-stopped",
  }]);

  assert.equal(messages[0].stop_reason, "user_canceled");
  assert.deepEqual(messages[0].stop_details, { category: "user" });
});

test("marks MCP Apps through the official registry and creates one reconnect suggestion per remote server", () => {
  const registry = createCoworkMcpRegistryStore();
  registry.getState().setRemoteServer("remote-1", {
    name: "Canvas",
    url: "https://canvas.example/mcp",
    uuid: "remote-1",
  });
  registry.getState().setRemoteTools("remote-1", [{
    _meta: { ui: { resourceUri: "ui://canvas/editor" } },
    displayName: "Open editor",
    name: "open_editor",
  }]);
  const toolUse = (id) => ({ id, input: {}, name: "mcp__remote-1__open_editor", type: "tool_use" });
  const toolResult = (id) => ({
    mcpMeta: { _meta: { anthropic_error_code: "mcp_unauthorized" } },
    message: { content: [{ content: "unauthorized", is_error: true, tool_use_id: id, type: "tool_result" }] },
    type: "user",
    uuid: `result-${id}`,
  });
  const messages = normalizeSdkMessages([
    {
      message: { content: [toolUse("tool-auth-1"), toolUse("tool-auth-2")] },
      receivedStreamAt: 123,
      type: "assistant",
      uuid: "assistant-auth",
    },
    toolResult("tool-auth-1"),
    toolResult("tool-auth-2"),
  ], {
    lookupMcpTool: registry.getState().lookupTool,
    syntheticReconnectEnabled: true,
  });

  const content = messages[0].content;
  assert.equal(content[0].is_mcp_app, true);
  assert.equal(content.filter((block) => block.name === "suggest_connectors" && block.type === "tool_use").length, 1);
  const reconnect = content.find((block) => block.name === "suggest_connectors" && block.type === "tool_result");
  const payload = JSON.parse(reconnect.content[0].text);
  assert.deepEqual(payload._authErrorOverride, {
    errorCode: "mcp_unauthorized",
    isLive: true,
    serverUuid: "remote-1",
  });
  assert.equal(payload.connectors[0].name, "Canvas");
});
