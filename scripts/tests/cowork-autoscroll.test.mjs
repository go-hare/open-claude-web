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
  applyCoworkCuLockReleasedScroll,
  COWORK_AUTOSCROLL_NEAR_BOTTOM_PX,
  isCoworkNearBottom,
  resolveCoworkScrollBehavior,
  scrollCoworkSessionOpenToBottom,
  shouldScrollCoworkSessionOpen,
  updateCoworkAutoscrollPin,
} = await vite.ssrLoadModule(
  "/src/features/cowork/session/transcript/coworkAutoscroll.ts",
);

after(async () => {
  await vite.close();
});

test("IYe near-bottom floor is Math.floor(distance) < 8", () => {
  assert.equal(COWORK_AUTOSCROLL_NEAR_BOTTOM_PX, 8);
  // distance 7 → near; distance 8 → not near (official: Math.floor(i) < 8).
  assert.equal(isCoworkNearBottom({ clientHeight: 100, scrollHeight: 200, scrollTop: 93 }), true);
  assert.equal(isCoworkNearBottom({ clientHeight: 100, scrollHeight: 200, scrollTop: 92 }), false);
  assert.equal(isCoworkNearBottom({ clientHeight: 100, scrollHeight: 200, scrollTop: 91 }), false);
});

test("IYe unpins only when scrolledUp && !nearBottom && !heightShrank", () => {
  assert.equal(
    updateCoworkAutoscrollPin({
      heightShrank: false,
      nearBottom: false,
      pinned: true,
      programmatic: false,
      scrolledUp: true,
    }),
    false,
  );
  assert.equal(
    updateCoworkAutoscrollPin({
      heightShrank: false,
      nearBottom: true,
      pinned: true,
      programmatic: false,
      scrolledUp: true,
    }),
    true,
  );
  assert.equal(
    updateCoworkAutoscrollPin({
      heightShrank: true,
      nearBottom: false,
      pinned: true,
      programmatic: false,
      scrolledUp: true,
    }),
    true,
  );
  assert.equal(
    updateCoworkAutoscrollPin({
      heightShrank: false,
      nearBottom: false,
      pinned: true,
      programmatic: true,
      scrolledUp: true,
    }),
    true,
  );
});

test("maps official instant behavior to auto", () => {
  assert.equal(resolveCoworkScrollBehavior("instant"), "auto");
  assert.equal(resolveCoworkScrollBehavior("smooth"), "smooth");
  assert.equal(resolveCoworkScrollBehavior("auto"), "auto");
  assert.equal(resolveCoworkScrollBehavior(), "auto");
});

test("z3t session-open gate matches official l/c/d.current checks", () => {
  // Official: if (l) return; if (!c) return; if (d.current === e) return;
  assert.equal(shouldScrollCoworkSessionOpen({
    hasMessages: true,
    isLoading: false,
    lastScrolledSessionId: null,
    sessionId: "session-1",
  }), true);
  assert.equal(shouldScrollCoworkSessionOpen({
    hasMessages: true,
    isLoading: true,
    lastScrolledSessionId: null,
    sessionId: "session-1",
  }), false);
  assert.equal(shouldScrollCoworkSessionOpen({
    hasMessages: false,
    isLoading: false,
    lastScrolledSessionId: null,
    sessionId: "session-1",
  }), false);
  assert.equal(shouldScrollCoworkSessionOpen({
    hasMessages: true,
    isLoading: false,
    lastScrolledSessionId: "session-1",
    sessionId: "session-1",
  }), false);
  // New sessionId after switch — gate opens again (official d.current === e only).
  assert.equal(shouldScrollCoworkSessionOpen({
    hasMessages: true,
    isLoading: false,
    lastScrolledSessionId: "session-2",
    sessionId: "session-1",
  }), true);
});

test("z3t rAF body assigns scrollTop = scrollHeight", () => {
  const container = { scrollHeight: 2400, scrollTop: 120 };
  assert.equal(scrollCoworkSessionOpenToBottom(container), true);
  assert.equal(container.scrollTop, 2400);
  assert.equal(scrollCoworkSessionOpenToBottom(null), false);
});

test("cu_lock_released schedules scroll only when sessionId matches", () => {
  const container = { scrollHeight: 900, scrollTop: 0 };
  const scheduled = [];
  assert.equal(
    applyCoworkCuLockReleasedScroll({
      container,
      eventSessionId: "s1",
      sessionId: "s1",
      schedule: (cb) => scheduled.push(cb),
    }),
    true,
  );
  assert.equal(container.scrollTop, 0);
  assert.equal(scheduled.length, 1);
  scheduled[0]();
  assert.equal(container.scrollTop, 900);

  assert.equal(
    applyCoworkCuLockReleasedScroll({
      container,
      eventSessionId: "other",
      sessionId: "s1",
      schedule: (cb) => scheduled.push(cb),
    }),
    false,
  );
  assert.equal(scheduled.length, 1);

  // querySelector path when no explicit container.
  const fakeDoc = {
    querySelector: (sel) => {
      assert.equal(sel, "[data-autoscroll-container]");
      return container;
    },
  };
  container.scrollTop = 10;
  const more = [];
  applyCoworkCuLockReleasedScroll({
    document: fakeDoc,
    eventSessionId: "s1",
    sessionId: "s1",
    schedule: (cb) => more.push(cb),
  });
  more[0]();
  assert.equal(container.scrollTop, 900);
});
