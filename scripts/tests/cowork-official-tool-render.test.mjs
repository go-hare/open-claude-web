import assert from "node:assert/strict";
import { after, test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const { CoworkOfficialToolRenderer } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkOfficialToolRenderer.tsx",
);
const { CoworkMessageContextProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkMessageContext.tsx",
);
const { CoworkChatResourceProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/session/chatResource/CoworkChatResourceProvider.tsx",
);

after(async () => {
  await vite.close();
});

function renderTool(block, options = {}) {
  const message = {
    attachments: [],
    content: options.content ?? [block, ...(options.toolResult ? [options.toolResult] : [])],
    created_at: "2026-07-12T00:00:00.000Z",
    files: [],
    files_v2: [],
    index: 0,
    sender: "assistant",
    sync_sources: [],
    uuid: "assistant-1",
  };
  const renderer = React.createElement(CoworkOfficialToolRenderer, {
    block,
    isFirstBlockOfMessage: true,
    isFirstItem: true,
    isLastBlockOfMessage: true,
    isLastItem: true,
    isStreaming: options.isStreaming ?? false,
    message,
    standalone: options.standalone ?? false,
    toolResult: options.toolResult,
  });
  return renderToStaticMarkup(React.createElement(CoworkChatResourceProvider, {
    conversationUuid: "session-1",
    children: React.createElement(CoworkMessageContextProvider, {
      children: renderer,
      value: { toolPermissionRequests: options.permissions ?? [] },
    }),
  }));
}

test("keeps Glob on the official generic search row", () => {
  const html = renderTool({ id: "glob-1", input: { path: "/tmp", pattern: "*.md" }, name: "Glob", type: "tool_use" });

  assert.match(html, /Finding files/);
  assert.equal(html.includes("Reading tmp"), false);
  assert.match(html, /text-text-500/);
  assert.match(html, /M8\.5 2a6\.5 6\.5/);
});

test("uses the exact official local tool glyphs", () => {
  const bash = renderTool({ id: "bash-1", input: { command: "pwd" }, name: "Bash", type: "tool_use" });
  const task = renderTool({ id: "task-1", input: { description: "Inspect" }, name: "Task", type: "tool_use" });
  const todo = renderTool({ id: "todo-1", input: {}, name: "TodoWrite", type: "tool_use" });

  assert.match(bash, /M5\.146 7\.146/);
  assert.match(bash, /M16\.5 4A1\.5 1\.5/);
  assert.match(task, /M5 2\.5A2 2/);
  assert.match(todo, /M6 13\.5a1 1/);
});

test("uses the official memory status and glyph branches", () => {
  const searching = renderTool({ id: "memory-search", input: { file_path: "/mnt/.auto-memory/search-index" }, name: "Read", type: "tool_use" }, { isStreaming: true });
  const completed = renderTool({ id: "memory-read", input: { file_path: "/mnt/.auto-memory/project_notes.md" }, name: "Read", type: "tool_use" }, {
    toolResult: { content: [{ text: "notes", type: "text" }], tool_use_id: "memory-read", type: "tool_result" },
  });

  assert.match(searching, /Searching memory/);
  assert.match(searching, /M13\.29 8\.804/);
  assert.match(completed, /Read memory/);
  assert.match(completed, /Project notes/);
});

test("uses the official skill glyph for SKILL.md file tools", () => {
  const html = renderTool({ id: "skill-read", input: { file_path: "/mnt/skills/release/SKILL.md" }, name: "Read", type: "tool_use" }, { isStreaming: true });

  assert.match(html, /M13\.04 7\.304/);
});

test("renders an empty streaming create_file with the official expanded Wlt body", () => {
  const html = renderTool({ id: "create-empty", input: { file_path: "/tmp/notes.md" }, name: "create_file", type: "tool_use" }, { isStreaming: true });

  assert.match(html, /data-testid="repl-output"/);
  assert.match(html, /max-h-\[238px\]/);
  assert.match(html, /Creating/);
});

test("renders completed create_file as a compact Wlt row", () => {
  const block = { id: "create-complete", input: { content: "# Notes", file_path: "/tmp/notes.md" }, name: "create_file", type: "tool_use" };
  const html = renderTool(block, {
    toolResult: { content: [{ text: "created", type: "text" }], tool_use_id: block.id, type: "tool_result" },
  });

  assert.equal(html.includes('data-testid="repl-output"'), false);
  assert.match(html, /Created/);
  assert.match(html, /Notes/);
});

test("renders present_files as a single compact Klt row", () => {
  const block = { id: "present-1", input: {}, name: "present_files", type: "tool_use" };
  const html = renderTool(block, {
    toolResult: {
      content: [{ file_path: "/tmp/first.md", type: "local_resource" }],
      tool_use_id: block.id,
      type: "tool_result",
    },
  });

  assert.match(html, /Presented file\(s\)/);
  assert.equal(html.includes("first.md"), false);
  assert.equal(html.includes('data-testid="repl-output"'), false);
});

test("uses the official Ome file-type glyph for ordinary file tools", () => {
  const html = renderTool({ id: "markdown-read", input: { file_path: "/tmp/AppAgent.md" }, name: "Read", type: "tool_use" }, { isStreaming: true });

  assert.match(html, /viewBox="0 0 256 256"/);
  assert.match(html, /M212\.24,83\.76l-56-56/);
  assert.match(html, /M144,146H128/);
});

test("suppresses a tool row while its official permission approval owns the UI", () => {
  const block = { id: "read-1", input: { file_path: "/tmp/a.txt" }, name: "Read", type: "tool_use" };
  const html = renderTool(block, {
    permissions: [{ input: block.input, requestId: "permission-1", sessionId: "session-1", toolName: "Read", toolUseId: "read-1" }],
  });

  assert.equal(html, "");
});

test("renders WebFetch with the official favicon link and hostname branch", () => {
  const html = renderTool({ id: "fetch-1", input: { url: "https://example.com/page" }, name: "WebFetch", type: "tool_use" }, {
    toolResult: { content: [{ title: "Example page", type: "knowledge" }], tool_use_id: "fetch-1", type: "tool_result" },
  });

  assert.match(html, /href="https:\/\/example.com\/page"/);
  assert.match(html, /Example page/);
  assert.match(html, /example.com/);
  assert.match(html, /google.com\/s2\/favicons/);
});

test("renders WebSearch result count and official result rows", () => {
  const html = renderTool({ id: "search-1", input: { query: "Claude" }, name: "WebSearch", type: "tool_use" }, {
    toolResult: {
      content: [{ metadata: { favicon_url: "https://example.com/favicon.ico", type: "webpage_metadata" }, title: "Claude result", type: "knowledge", url: "https://example.com/result" }],
      tool_use_id: "search-1",
      type: "tool_result",
    },
  });

  assert.match(html, /Claude/);
  assert.match(html, /1 result/);
  assert.match(html, /Claude result/);
  assert.match(html, /flex flex-row gap-3 items-center px-2 py-1.5 w-full/);
});

test("renders only the submitted AskUserQuestion state in the transcript", () => {
  const unanswered = { id: "question-1", input: { questions: [{ question: "Choose", options: [] }] }, name: "AskUserQuestion", type: "tool_use" };
  assert.equal(renderTool(unanswered, { standalone: true }), "");

  const answered = { ...unanswered, input: { ...unanswered.input, answers: { Choose: "A" } } };
  const html = renderTool(answered, { standalone: true });
  assert.match(html, /Choose/);
  assert.match(html, />A</);
  assert.match(html, /rounded-xl outline-none border border-border-300 border-0.5 p-4 my-4/);
});

test("renders an errored AskUserQuestion as Dismissed", () => {
  const block = { id: "question-2", input: { questions: [{ question: "Continue?", options: [] }] }, name: "AskUserQuestion", type: "tool_use" };
  const html = renderTool(block, { standalone: true, toolResult: { is_error: true, tool_use_id: "question-2", type: "tool_result" } });

  assert.match(html, /Continue\?/);
  assert.match(html, /Dismissed/);
});

test("renders a successful SaveSkill with the official standalone result card", () => {
  const html = renderTool(
    { id: "skill-1", input: { name: "Release review" }, name: "save_skill", type: "tool_use" },
    { standalone: true },
  );

  assert.match(html, /href="\/customize\/skills"/);
  assert.match(html, /Saved skill: <span class="font-base-bold text-text-200">Release review<\/span>/);
  assert.match(html, /M13\.04 7\.304/);
  assert.match(html, /M6\.134 3\.16/);
  assert.equal(html.includes("title=\"Result\""), false);
});

test("renders a successful scheduled task with the official standalone result card", () => {
  const html = renderTool({
    id: "schedule-1",
    input: { cronExpression: "0 9 * * 1", prompt: "Review launch risks", taskId: "review-launch-risks" },
    name: "create_scheduled_task",
    type: "tool_use",
  }, { standalone: true });

  assert.match(html, /href="\/scheduled-task\/review-launch-risks"/);
  assert.match(html, /Created scheduled task: <span class="font-base-bold text-text-200">Review launch risks<\/span>/);
  assert.match(html, /M10 2\.5a7\.5 7\.5/);
  assert.match(html, /M7\.128 5\.165/);
});
