import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const { resolveTrafficLightPadding } = await vite.ssrLoadModule("/src/shell/trafficLightPadding.ts");

after(async () => {
  await vite.close();
});

test("qWt traffic light spacer is 74px when not fullscreen", () => {
  assert.deepEqual(resolveTrafficLightPadding(false, 1), { needsPadding: true, spacerWidth: 74 });
});

test("qWt traffic light spacer is 0 when fullscreen", () => {
  assert.deepEqual(resolveTrafficLightPadding(true, 1), { needsPadding: false, spacerWidth: 0 });
});

test("qWt traffic light spacer expands when zoomFactor < 1", () => {
  assert.deepEqual(resolveTrafficLightPadding(false, 0.5), { needsPadding: true, spacerWidth: 148 });
});

test("qWt traffic light spacer does not shrink when zoomFactor > 1", () => {
  assert.deepEqual(resolveTrafficLightPadding(false, 2), { needsPadding: true, spacerWidth: 74 });
});

test("asStrictBoolean path: only true removes padding (objects must not)", () => {
  // Mirrors officialBridgeAdapter asStrictBoolean + resolveTrafficLightPadding.
  const asStrictBoolean = (value) => value === true;
  assert.equal(resolveTrafficLightPadding(asStrictBoolean({ ok: true }), 1).needsPadding, true);
  assert.equal(resolveTrafficLightPadding(asStrictBoolean(true), 1).needsPadding, false);
  assert.equal(resolveTrafficLightPadding(asStrictBoolean(false), 1).needsPadding, true);
});
