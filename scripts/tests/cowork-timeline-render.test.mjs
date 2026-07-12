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
const { CoworkTimeline } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTimeline.tsx",
);
const { coworkTimelineMaxVisibleTools } = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkTimelineSegment.tsx",
);

after(async () => {
  await vite.close();
});

test("keeps the official content-after overlay layer when no child is mounted", () => {
  const html = renderToStaticMarkup(React.createElement(CoworkTimeline, {
    blocks: [{ thinking: "Checking", type: "thinking" }],
    isStreaming: false,
    renderBlock: () => React.createElement("span", null, "Checking"),
    turnIsOver: true,
  }));

  assert.match(html, /row-start-1 col-start-1 relative z-\[2\] min-w-0/);
});

test("limits live tool trimming to the first official timeline segment", () => {
  assert.equal(coworkTimelineMaxVisibleTools({ isFirst: true, liveUpdates: true }), 3);
  assert.equal(coworkTimelineMaxVisibleTools({ isFirst: false, liveUpdates: true }), 0);
  assert.equal(coworkTimelineMaxVisibleTools({ isFirst: true, liveUpdates: false }), 0);
});
