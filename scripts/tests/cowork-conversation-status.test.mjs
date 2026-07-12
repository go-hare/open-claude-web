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
const { CoworkConversationStatus, parseCoworkConversationStatus } = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/CoworkConversationStatus.tsx",
);
const { coworkWaitingStatus } = await vite.ssrLoadModule(
  "/src/features/cowork/session/activity/coworkWaitingStatus.ts",
);
const { CoworkTimelineStatusVisibilityProvider } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTimelineStatusVisibility.tsx",
);

after(async () => {
  await vite.close();
});

function renderStatus(props) {
  return renderToStaticMarkup(React.createElement(
    CoworkTimelineStatusVisibilityProvider,
    null,
    React.createElement(CoworkConversationStatus, props),
  ));
}

test("keeps the official static Claude avatar after a Cowork response settles", () => {
  const html = renderStatus({ isWorking: false, status: {} });

  assert.match(html, /mt-6/);
  assert.match(html, /w-8 text-accent-brand/);
  assert.match(html, /viewBox="0 0 100 100"/);
});

test("uses the official raised writing avatar position while Cowork is active", () => {
  const html = renderStatus({ isWorking: true, status: { statusMessage: "Working on it..." } });

  assert.match(html, /mt-2 -translate-y-2\.5/);
  assert.match(html, /Working on it\.\.\./);
  assert.match(html, /ml-2 pb-1\.5 font-base text-text-500/);
  assert.doesNotMatch(html, /font-claude-response|italic/);
});

test("uses the official Cowork waiting-state copy thresholds", () => {
  assert.deepEqual(coworkWaitingStatus("Working on it...", 29, true), {
    message: "Working on it...",
    detail: "29s",
  });
  assert.deepEqual(coworkWaitingStatus("Working on it...", 30, true), {
    message: "Still thinking...",
    detail: "30s",
  });
  assert.deepEqual(coworkWaitingStatus("Working on it...", 60, true), {
    message: "Working through a complex response...",
    detail: "1m 0s",
  });
});

test("keeps an activity message and prefers the official character count detail", () => {
  assert.deepEqual(coworkWaitingStatus("Reading file...", 60, false, 1234), {
    message: "Reading file...",
    detail: "~1,234 characters",
  });
});

test("replaces the avatar with the official Cowork session error banner", () => {
  const html = renderStatus({
    error: new Error("network unavailable"),
    errorCategory: "network_error",
    isWorking: false,
    onTryAgain: () => {},
    status: {},
  });

  assert.match(html, /max-w-xl ml-1 mb-1\.5 rounded-lg border border-warning-200 overflow-hidden/);
  assert.match(html, /Can&#x27;t reach Anthropic/);
  assert.match(html, /Check your internet connection/);
  assert.match(html, /Details/);
  assert.match(html, /Try again/);
  assert.doesNotMatch(html, /viewBox="0 0 100 100"/);
});

test("expands unknown Cowork error details by default", () => {
  const html = renderStatus({
    error: new Error("raw bridge failure"),
    isWorking: false,
    status: {},
  });

  assert.match(html, /Something went wrong/);
  assert.match(html, /raw bridge failure/);
  assert.match(html, /aria-expanded="true"/);
});

test("uses the official initialization message and activity start time", () => {
  const initializing = parseCoworkConversationStatus([], null, null, true, {
    isComplete: false,
    message: "Starting Claude Code...",
    startTime: 123,
    step: "sdk",
  });
  const initialized = parseCoworkConversationStatus([], null, {
    activity: "writing",
    lastActivityTime: 456,
  }, true, {
    isComplete: true,
    message: "Ready",
    step: "complete",
  });

  assert.equal(initializing.statusMessage, "Starting Claude Code...");
  assert.equal(initializing.activityStartTime, 123);
  assert.equal(initialized.statusMessage, "Writing...");
  assert.equal(initialized.activityStartTime, 456);
});
