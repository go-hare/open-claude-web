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
const { CoworkMessageActions } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkMessageActions.tsx",
);
const { CoworkTranscriptActions } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTranscriptActions.tsx",
);

after(async () => {
  await vite.close();
});

const bridgeActions = {
  bridge: { rewind: async () => null },
  onNavigate() {},
  openFile() {},
  reload: async () => {},
  sessionId: "session-1",
};

function renderActions(props) {
  return renderToStaticMarkup(React.createElement(
    CoworkTranscriptActions.Provider,
    { value: bridgeActions },
    React.createElement(CoworkMessageActions, {
      isLastMessage: true,
      messageUuid: "msg-1",
      text: "hello",
      ...props,
    }),
  ));
}

test("uses the official Cowork retry glyph for local-session human rewind", () => {
  const html = renderActions({ isAssistant: false, isStreaming: false });
  assert.match(html, /M10\.386 2\.51A7\.5 7\.5 0 1 1 5\.499 4H3/);
  assert.match(html, /action-bar-rewind/);
  assert.match(html, /action-bar-copy/);
});

test("hides human rewind while streaming (official S && k && T && !r)", () => {
  const html = renderActions({ isAssistant: false, isStreaming: true });
  assert.match(html, /action-bar-copy/);
  assert.doesNotMatch(html, /action-bar-rewind/);
});

test("hides assistant action bar while streaming in agent mode", () => {
  const html = renderActions({ isAssistant: true, isStreaming: true });
  assert.match(html, /\bhidden\b/);
  assert.doesNotMatch(html, /action-bar-copy/);
});

test("assistant settled bar is copy-only in agent mode (no footer retry)", () => {
  const html = renderActions({ isAssistant: true, isStreaming: false });
  assert.match(html, /action-bar-copy/);
  assert.doesNotMatch(html, /action-bar-retry/);
  assert.doesNotMatch(html, /action-bar-rewind/);
});
