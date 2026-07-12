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
const { CoworkHumanMarkdown } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkHumanMarkdown.tsx",
);
const {
  CoworkAssistantMarkdown,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkAssistantMarkdown.tsx",
);
const {
  parseCoworkMarkdown,
  partitionCoworkMarkdown,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkMarkdown.tsx",
);
const {
  computeCoworkProgressiveMarkdownChunks,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkProgressiveMarkdown.ts",
);
const { CoworkAssistantMessage } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkAssistantMessage.tsx",
);
const { CoworkHumanMessage } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkHumanMessage.tsx",
);
const { CoworkMessageContextProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkMessageContext.tsx",
);
const { CoworkAskUserQuestionProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/composer/CoworkAskUserQuestionContext.tsx",
);

after(async () => {
  await vite.close();
});

test("keeps Human markdown on the official restricted parser surface", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkHumanMarkdown, {
    text: "# Heading\n\n**bold** [named](https://example.com) <https://anthropic.com>\n\n- item\n\n```js\nconst x = 1;\n```",
  }));

  assert.equal(html.includes("<h1"), false);
  assert.equal(html.includes("<strong>"), false);
  assert.match(html, /# Heading/);
  assert.match(html, /\*\*bold\*\* \[named\]\(https:\/\/example.com\)/);
  assert.match(html, /href="https:\/\/anthropic.com"/);
  assert.match(html, /<ul><li>item<\/li><\/ul>/);
  assert.match(html, /<pre class="language-js"><code>const x = 1;<\/code><\/pre>/);
});

test("renders Assistant structured markdown and preserves dynamic runtime branches", () => {
  const text = "# Heading\n\n| A | B |\n| --- | --- |\n| x | y |\n\nInline $x$ and ~~gone~~.\n\n[link](https://example.com)";
  const progressive = renderToStaticMarkup(React.createElement(CoworkAssistantMarkdown, {
    featureEvaluator: () => false,
    isStreaming: true,
    text,
  }));
  const alluvium = renderToStaticMarkup(React.createElement(CoworkAssistantMarkdown, {
    featureEvaluator: (feature) => feature === "claude_ai_alluvium_main",
    isStreaming: true,
    text,
  }));

  assert.match(progressive, /class="progressive-markdown"/);
  assert.match(progressive, /<h2[^>]*>Heading<\/h2>/);
  assert.match(progressive, /<table>/);
  assert.match(progressive, /data-math-inline="true">x<\/span>/);
  assert.match(progressive, /<del>gone<\/del>/);
  assert.match(progressive, /href="https:\/\/example.com"/);
  assert.match(alluvium, /class="alluvium-markdown"/);
});

test("keeps the final streaming AST node on the frontier (alluvium residual)", () => {
  const text = "Committed paragraph.\n\nStreaming paragraph";
  const parts = partitionCoworkMarkdown(parseCoworkMarkdown(text), text);

  assert.equal(parts.committed.length, 1);
  assert.equal(parts.frontier?.children.length, 1);
  assert.equal(parts.frontier?.children[0].type, "paragraph");
});

test("uses official Le/Oe progressive line chunker for blank-line commits", () => {
  const text = "Committed paragraph.\n\nStreaming paragraph";
  const settled = computeCoworkProgressiveMarkdownChunks(text, false);
  assert.deepEqual(settled, { completedChunks: [text], streamingChunk: "" });

  const streaming = computeCoworkProgressiveMarkdownChunks(text, true);
  assert.deepEqual(streaming.completedChunks, ["Committed paragraph."]);
  assert.equal(streaming.streamingChunk, "Streaming paragraph");
});

test("does not flush progressive chunks inside fenced code while streaming", () => {
  const text = "Intro\n\n```js\nconst x = 1;\n\nconst y = 2;\n```\n\nAfter";
  const streaming = computeCoworkProgressiveMarkdownChunks(text, true);
  assert.ok(streaming.completedChunks.some((chunk) => chunk.includes("```js")));
  assert.match(streaming.completedChunks.join("\n") + "\n" + streaming.streamingChunk, /const y = 2/);
});

test("settled assistant markdown uses standard class without progressive wrapper", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkAssistantMarkdown, {
    className: "standard-markdown",
    featureEvaluator: () => false,
    isStreaming: false,
    text: "Hello **world**",
  }));
  assert.match(html, /class="standard-markdown"/);
  assert.doesNotMatch(html, /progressive-markdown/);
});

test("renders the official Human and Assistant accessibility summaries", () => {
  const human = message("human", [{ text: "# Launch review\n\nCheck **risks** first.", type: "text" }]);
  const assistant = message("assistant", [{ text: "```txt\ninternal\n```\n\n## Recommendation\n\nProceed with [evidence](https://example.com).", type: "text" }]);
  const humanHtml = renderToStaticMarkup(React.createElement(CoworkHumanMessage, {
    chain: chain(human),
    conversationIsStreaming: false,
    isLastMessage: false,
  }));
  const assistantHtml = renderToStaticMarkup(withAssistantProviders(
    React.createElement(CoworkAssistantMessage, {
      chain: chain(assistant),
      conversationIsStreaming: false,
      isLastMessage: true,
    }),
  ));

  assert.match(humanHtml, /<h2 class="sr-only">You said: Launch review<\/h2>/);
  assert.match(assistantHtml, /<h2 class="sr-only">Claude responded: Recommendation<\/h2>/);
});

function withAssistantProviders(child) {
  return React.createElement(
    CoworkAskUserQuestionProvider,
    null,
    React.createElement(
      CoworkMessageContextProvider,
      { value: { toolPermissionRequests: [] } },
      child,
    ),
  );
}

function message(sender, content) {
  return {
    attachments: [],
    content,
    created_at: "2026-07-12T00:00:00.000Z",
    files: [],
    files_v2: [],
    index: 0,
    sender,
    sync_sources: [],
    uuid: `${sender}-1`,
  };
}

function chain(displayMessage) {
  return {
    displayMessage,
    firstMessageUuid: displayMessage.uuid,
    lastMessageUuid: displayMessage.uuid,
    messageUuids: [displayMessage.uuid],
    messages: [displayMessage],
  };
}
