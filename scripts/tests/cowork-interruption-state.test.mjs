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
const { coworkInterruptionVariant } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkInterruptionState.ts",
);
const { CoworkResponseInterruption } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkResponseInterruption.tsx",
);

after(async () => {
  await vite.close();
});

const timeline = {
  contentHasTextAfter: false,
  isFirst: true,
  isLastContent: true,
  kind: "timeline",
  liveUpdates: true,
  segment: { blocks: [{ thinking: "work", type: "thinking" }], timelineIndex: 0, type: "timeline" },
};

test("shows user_canceled only after the current assistant stops streaming", () => {
  const message = { stop_reason: "user_canceled" };
  assert.equal(coworkInterruptionVariant([timeline], message, false, false), "user_canceled");
  assert.equal(coworkInterruptionVariant([timeline], message, true, true), null);
});

test("shows no_stop_reason only for a terminal timeline without trailing visible text", () => {
  assert.equal(coworkInterruptionVariant([timeline], {}, false, false), "no_stop_reason");
  assert.equal(coworkInterruptionVariant([{
    ...timeline,
    contentAfter: { blocks: [{ text: "done", type: "text" }], type: "content" },
  }], {}, false, false), null);
});

test("renders the official interruption retry action when retry is available", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkResponseInterruption, {
    onRetry: () => {},
    variant: "user_canceled",
  }));

  assert.match(html, /Claude&#x27;s response was interrupted/);
  assert.match(html, />Retry</);
  assert.match(html, /mt-2 pl-1/);
});
