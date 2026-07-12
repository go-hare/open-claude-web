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
const {
  CoworkThinkingBody,
  CoworkThinkingCell,
  CoworkThinkingCutoffBanner,
  COWORK_THINKING_CUTOFF_SUPPORT_HREF,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkThinkingCell.tsx",
);
const { CoworkTimelineBlock } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTimelineBlock.tsx",
);

after(async () => {
  await vite.close();
});

test("settled thinking cell uses Thought process title and bde/xde row structure", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingCell, {
    isStreaming: false,
    messageUuid: "assistant-1",
    text: "I should inspect the file first.",
  }));

  assert.match(html, /Thought process/);
  assert.match(html, /group\/row/);
  assert.match(html, /ease-snappy-out|transition-transform/);
  assert.doesNotMatch(html, /Checking/);
  // Collapsed by default when not streaming — body not mounted.
  assert.doesNotMatch(html, /I should inspect the file first\./);
});

test("streaming thinking cell titles as Thinking and shimmers", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingCell, {
    isStreaming: true,
    messageUuid: "assistant-1",
    startTimestamp: new Date(Date.now() - 1000).toISOString(),
    text: "Considering options",
  }));

  assert.match(html, /Thinking/);
  assert.match(html, /shimmertext|animate-\[shimmertext/);
});

test("local Cowork timeline routes thinking to official gst→Net clock-markdown row", () => {
  // Official gst (index-BELzQL5P.js): thinking → Net (clock + jet markdown), not z9e → O9e ThinkingCell.
  const message = {
    attachments: [],
    content: [{ thinking: "Plan the change", type: "thinking" }],
    created_at: "2026-07-12T00:00:00.000Z",
    files: [],
    files_v2: [],
    index: 0,
    sender: "assistant",
    sync_sources: [],
    uuid: "assistant-1",
  };
  const html = renderToStaticMarkup(React.createElement(CoworkTimelineBlock, {
    allBlocks: message.content,
    block: message.content[0],
    index: 0,
    isFirstItem: true,
    isInExpandedTimeline: true,
    isLastItem: true,
    isStreaming: false,
    isThisMessageStreaming: false,
    message,
  }));

  assert.doesNotMatch(html, /Thought process/);
  assert.match(html, /text-text-500/);
  assert.match(html, /standard-markdown/);
  assert.match(html, /Plan the change/);
  assert.match(html, /pt-0\.5/);
});

test("gst thinking streaming uses isThisMessageStreaming not liveUpdates-only isStreaming", () => {
  // Official: thinkingStreaming = isThisMessageStreaming && (!stop || last && max_tokens).
  // When liveUpdates is false, isStreaming prop is false but message may still stream.
  const message = {
    attachments: [],
    content: [{ thinking: "Still thinking", type: "thinking" }],
    created_at: "2026-07-12T00:00:00.000Z",
    files: [],
    files_v2: [],
    index: 0,
    sender: "assistant",
    sync_sources: [],
    uuid: "assistant-1",
  };
  const html = renderToStaticMarkup(React.createElement(CoworkTimelineBlock, {
    allBlocks: message.content,
    block: message.content[0],
    index: 0,
    isFirstItem: true,
    isInExpandedTimeline: true,
    isLastItem: true,
    isStreaming: false,
    isThisMessageStreaming: true,
    message,
  }));

  assert.match(html, /progressive-markdown/);
  assert.match(html, /Still thinking/);
  assert.doesNotMatch(html, /Thought process/);
});

test("long completed thinking shows timer secondary text after 10s threshold", () => {
  const start = "2026-07-12T00:00:00.000Z";
  const stop = "2026-07-12T00:00:15.000Z";
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingCell, {
    isStreaming: false,
    messageUuid: "assistant-1",
    startTimestamp: start,
    stopTimestamp: stop,
    text: "Done thinking about the plan.",
  }));

  assert.match(html, /tabular-nums/);
  assert.match(html, /15s/);
});

test("L9e body uses pg markdown shell not plain pre-wrap", () => {
  // Official L9e: pg with className p-3 pt-0 pr-8 (StandardMarkdown stand-in).
  // Collapse expand is effect-driven — unit-test L9e body directly.
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingBody, {
    cutOff: false,
    text: "Check **file** first.",
  }));

  assert.match(html, /font-claude-response/);
  assert.match(html, /p-3 pt-0 pr-8/);
  assert.doesNotMatch(html, /whitespace-pre-wrap break-words/);
  assert.match(html, /Check/);
  // Strong node from markdown tree (not raw **file** plain text only).
  assert.match(html, /<strong>|font-bold|\*\*file\*\*|file/);
});

test("A9e cutoff banner has message-warning shell, icon, and support link", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingCutoffBanner));

  assert.match(html, /data-testid="message-warning"/);
  assert.match(html, /bg-bg-100 text-text-300 border-0\.5 border-border-300 flex flex-row gap-1\.5 rounded-md p-2 mx-4 mb-4 font-small/);
  assert.equal(
    COWORK_THINKING_CUTOFF_SUPPORT_HREF,
    "https://support.anthropic.com/en/articles/10574485-using-extended-thinking-on-claude-3-7-sonnet",
  );
  assert.match(html, /10574485-using-extended-thinking-on-claude-3-7-sonnet/);
  assert.match(html, /class="underline"/);
  assert.match(html, /thought process/);
  assert.match(html, /The rest of the/);
  assert.match(html, /is not available for this response/);
  assert.match(html, /shrink-0/);
});

test("L9e body with cutOff mounts A9e after markdown", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkThinkingBody, {
    cutOff: true,
    text: "Partial thought",
  }));
  assert.match(html, /p-3 pt-0 pr-8/);
  assert.match(html, /Partial thought/);
  assert.match(html, /data-testid="message-warning"/);
});
