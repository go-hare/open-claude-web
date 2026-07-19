/**
 * Official CR/Jp read oe(sessionId) full transcript.
 * patchSession must not clobber bucket.messages with sparse getSession payloads.
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

const { officialCodeSessionStore } = await vite.ssrLoadModule(
  "/src/features/epitaxy/session/officialCodeSessionStore.ts",
);

after(async () => {
  await vite.close();
});

function makeMessages() {
  return [
    {
      id: "u1",
      role: "user",
      text: "开 子 agent 分析一下",
      createdAt: "2026-07-18T00:00:00.000Z",
      raw: {
        type: "user",
        uuid: "u1",
        parent_tool_use_id: null,
        message: { role: "user", content: "开 子 agent 分析一下" },
      },
    },
    {
      id: "sys1",
      role: "system",
      text: "",
      createdAt: "2026-07-18T00:00:01.000Z",
      raw: {
        type: "system",
        subtype: "task_started",
        uuid: "sys1",
        task_id: "task-1",
        tool_use_id: "call-agent-1",
        task_type: "local_agent",
        description: "Analyze cowork changes",
        prompt: "Please analyze the cowork changes carefully.",
      },
    },
    {
      id: "a-child",
      role: "assistant",
      text: "child agent text",
      createdAt: "2026-07-18T00:00:02.000Z",
      raw: {
        type: "assistant",
        uuid: "a-child",
        parent_tool_use_id: "call-agent-1",
        message: {
          id: "msg_child",
          role: "assistant",
          content: [{ type: "text", text: "child agent text" }],
        },
      },
    },
  ];
}

test("patchSession metadata does not wipe parent_tool_use_id rows", () => {
  const id = "test_subagent_msg_source";
  const full = makeMessages();
  officialCodeSessionStore.getState().openSession(
    id,
    {
      id,
      kind: "code",
      title: "Coding session",
      updatedAtMs: Date.now(),
      messages: full,
    },
    full,
  );

  const before = officialCodeSessionStore.getState().buckets[id].messages.length;
  officialCodeSessionStore.getState().patchSession(id, {
    id,
    kind: "code",
    title: "renamed",
    updatedAtMs: Date.now(),
    // Sparse getSession-shaped payload — must not replace oe history.
    messages: [full[0]],
    isRunning: false,
  });

  const bucket = officialCodeSessionStore.getState().buckets[id];
  assert.equal(before, 3);
  assert.equal(bucket.messages.length, 3);
  assert.equal(bucket.session?.messages?.length, 3);
  assert.equal(bucket.session?.title, "renamed");
  assert.equal(
    bucket.messages.filter((m) => m.raw?.parent_tool_use_id === "call-agent-1").length,
    1,
  );
  assert.equal(
    bucket.messages.filter((m) => m.raw?.subtype === "task_started").length,
    1,
  );
});

test("mergeMessage keeps parent child rows and mirrors session.messages", () => {
  const id = "test_subagent_merge";
  const full = makeMessages();
  officialCodeSessionStore.getState().openSession(
    id,
    {
      id,
      kind: "code",
      title: "Coding session",
      updatedAtMs: Date.now(),
      messages: full.slice(0, 2),
    },
    full.slice(0, 2),
  );

  officialCodeSessionStore.getState().mergeMessage(id, full[2]);
  const bucket = officialCodeSessionStore.getState().buckets[id];
  assert.equal(bucket.messages.length, 3);
  assert.equal(bucket.session?.messages?.length, 3);
  assert.equal(bucket.messages.at(-1)?.raw?.parent_tool_use_id, "call-agent-1");
});
