import assert from "node:assert/strict";
import { after, test } from "node:test";
import { createServer } from "vite";

const vite = await createServer({
  appType: "custom",
  logLevel: "silent",
  root: process.cwd(),
  server: { middlewareMode: true },
});

const { initialDrawerExpanded } = await vite.ssrLoadModule(
  "/src/features/cowork/session/chatResource/CoworkChatResourceProvider.tsx",
);
const { animateCoworkDrawerSpring, clampCoworkDrawerFlex, COWORK_DRAWER_SPRING } = await vite.ssrLoadModule(
  "/src/features/cowork/session/CoworkSessionFileDrawerLayout.tsx",
);

after(async () => {
  await vite.close();
});

test("yUt uses the exact official xUt spring", () => {
  assert.deepEqual(COWORK_DRAWER_SPRING, {
    type: "spring",
    stiffness: 1200,
    damping: 80,
    mass: 0.1,
  });
});

test("yUt re-clamps intended drawer flex against the 420px main minimum", () => {
  assert.equal(clampCoworkDrawerFlex(50, 1200), 50);
  assert.equal(clampCoworkDrawerFlex(50, 700), 40);
  assert.equal(clampCoworkDrawerFlex(50, 420), 0);
  assert.equal(clampCoworkDrawerFlex(-10, 1200), 0);
});

test("fle has a false server-side drawer default", () => {
  assert.equal(initialDrawerExpanded("session-1"), false);
});

test("yUt rAF spring reaches terminal flex (motion number animate is inert here)", async () => {
  const updates = [];
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("spring did not complete")), 2000);
    animateCoworkDrawerSpring(0, 50, {
      onUpdate: (value) => updates.push(value),
      onComplete: () => {
        clearTimeout(timer);
        resolve();
      },
    });
  });
  assert.ok(updates.length >= 2, `expected intermediate updates, got ${updates.length}`);
  assert.equal(updates.at(-1), 50);
});
