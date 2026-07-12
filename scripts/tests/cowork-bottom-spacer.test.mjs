import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});
const {
  COWORK_DESKTOP_TOP_BAR_HEIGHT_PX,
  COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX,
  COWORK_SPACER_DEFAULT_BUFFER_PX,
  computeCoworkBottomSpacerHeight,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/CoworkConversationBottomSpacer.tsx",
);

after(async () => {
  await vite.close();
});

test("LUt default buffer is 98 and desktop top bar Qg is 45", () => {
  assert.equal(COWORK_SPACER_DEFAULT_BUFFER_PX, 98);
  assert.equal(COWORK_DESKTOP_TOP_BAR_HEIGHT_PX, 45);
});

test("computes official spacer height without desktop top bar", () => {
  // container 1000 - human 100 - assistant 200 - extras 50 - chat 150 - buffer 98 = 402
  assert.equal(
    computeCoworkBottomSpacerHeight({
      assistantHeight: 200,
      chatInputHeight: 150,
      containerHeight: 1000,
      extrasHeight: 50,
      hasDesktopTopBar: false,
      humanHeight: 100,
    }),
    402,
  );
});

test("adds official desktop top bar Qg (45) into buffer when A5-equivalent is true", () => {
  // same as above but buffer 98+45 → 357
  assert.equal(
    computeCoworkBottomSpacerHeight({
      assistantHeight: 200,
      chatInputHeight: 150,
      containerHeight: 1000,
      extrasHeight: 50,
      hasDesktopTopBar: true,
      humanHeight: 100,
    }),
    357,
  );
});

test("uses additionalBuffer when provided (official Je.show ? 220)", () => {
  assert.equal(COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX, 220);
  // buffer 220, no desktop → 1000-100-200-50-150-220 = 280
  assert.equal(
    computeCoworkBottomSpacerHeight({
      additionalBuffer: COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX,
      assistantHeight: 200,
      chatInputHeight: 150,
      containerHeight: 1000,
      extrasHeight: 50,
      hasDesktopTopBar: false,
      humanHeight: 100,
    }),
    280,
  );
});

test("clamps negative results to 0", () => {
  assert.equal(
    computeCoworkBottomSpacerHeight({
      assistantHeight: 900,
      chatInputHeight: 200,
      containerHeight: 500,
      extrasHeight: 50,
      hasDesktopTopBar: true,
      humanHeight: 100,
    }),
    0,
  );
});

test("includes pubsec banner height (ALt 2.25rem) when enabled", () => {
  // banner 2.25 * 16 = 36; buffer 98; total subtract extra 36 vs no-banner
  const without = computeCoworkBottomSpacerHeight({
    assistantHeight: 100,
    chatInputHeight: 100,
    containerHeight: 1000,
    extrasHeight: 0,
    hasDesktopTopBar: false,
    hasPubsecBanner: false,
    humanHeight: 100,
    rootFontSizePx: 16,
  });
  const withBanner = computeCoworkBottomSpacerHeight({
    assistantHeight: 100,
    chatInputHeight: 100,
    containerHeight: 1000,
    extrasHeight: 0,
    hasDesktopTopBar: false,
    hasPubsecBanner: true,
    humanHeight: 100,
    rootFontSizePx: 16,
  });
  assert.equal(without - withBanner, 36);
  assert.equal(withBanner, 1000 - 100 - 100 - 0 - 100 - 36 - 98);
});
