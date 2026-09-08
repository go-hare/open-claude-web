/**
 * Official c4bf De / index he.openSession + releaseSession residual.
 * Recents attachSession (product openSession) is NOT transport open.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  bindOfficialCodeSessionHostApply,
  OFFICIAL_CODE_SESSION_PENDING_CLOSE_MS,
  officialCodeSessionStore,
} from "./officialCodeSessionStore";
import type { OfficialCodeSessionTransport } from "./officialCodeSessionTransport";

function fakeTransport() {
  const unsubscribes: string[] = [];
  let subscribeCount = 0;
  const transport: OfficialCodeSessionTransport = {
    subscribe(sessionId, _onEvent) {
      subscribeCount += 1;
      return {
        unsubscribe: () => {
          unsubscribes.push(sessionId);
        },
        wake: () => undefined,
      };
    },
  };
  return {
    transport,
    unsubscribes,
    subscribeCount: () => subscribeCount,
  };
}

describe("official he.openSession / releaseSession (De)", () => {
  beforeEach(() => {
    officialCodeSessionStore.setState({ buckets: {} });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    officialCodeSessionStore.setState({ buckets: {} });
    bindOfficialCodeSessionHostApply(() => undefined);
  });

  it("first transport open binds sub and increments refCount", () => {
    const { transport, subscribeCount } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(subscribeCount()).toBe(1);
    expect(bucket.sub).not.toBeNull();
    expect(bucket.refCount).toBe(1);
    expect(bucket.pendingClose).toBe(false);
  });

  it("second transport open with existing sub only refCount++ (no resubscribe)", () => {
    const { transport, subscribeCount } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(subscribeCount()).toBe(1);
    expect(bucket.refCount).toBe(2);
  });

  it("Recents attachSession does not bind sub", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "A",
      updatedAtMs: 1,
    } as never);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(bucket.sub).toBeNull();
    expect(bucket.refCount).toBe(0);
  });

  it("releaseSession with refCount>1 keeps bucket and sub", () => {
    const { transport, unsubscribes } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().releaseSession("s1");
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(bucket.refCount).toBe(1);
    expect(bucket.sub).not.toBeNull();
    expect(unsubscribes).toEqual([]);
  });

  it("idle last release evicts immediately", () => {
    const { transport, unsubscribes } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().releaseSession("s1");
    expect(officialCodeSessionStore.getState().buckets.s1).toBeUndefined();
    expect(unsubscribes).toEqual(["s1"]);
  });

  it("pendingTurn last release sets pendingClose and evicts after 360s", () => {
    const { transport, unsubscribes } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().beginPendingTurn("s1");
    officialCodeSessionStore.getState().releaseSession("s1");
    const held = officialCodeSessionStore.getState().buckets.s1!;
    expect(held.refCount).toBe(0);
    expect(held.pendingClose).toBe(true);
    expect(held.evictTimer).not.toBeNull();
    expect(held.sub).not.toBeNull();
    expect(unsubscribes).toEqual([]);

    vi.advanceTimersByTime(OFFICIAL_CODE_SESSION_PENDING_CLOSE_MS - 1);
    expect(officialCodeSessionStore.getState().buckets.s1).toBeDefined();
    vi.advanceTimersByTime(1);
    expect(officialCodeSessionStore.getState().buckets.s1).toBeUndefined();
    expect(unsubscribes).toEqual(["s1"]);
  });

  it("re-open during pendingClose cancels evict and keeps the same sub", () => {
    const { transport, subscribeCount, unsubscribes } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().beginPendingTurn("s1");
    officialCodeSessionStore.getState().releaseSession("s1");
    const sub = officialCodeSessionStore.getState().buckets.s1!.sub;
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(subscribeCount()).toBe(1);
    expect(bucket.refCount).toBe(1);
    expect(bucket.pendingClose).toBe(false);
    expect(bucket.evictTimer).toBeNull();
    expect(bucket.sub).toBe(sub);
    vi.advanceTimersByTime(OFFICIAL_CODE_SESSION_PENDING_CLOSE_MS);
    expect(officialCodeSessionStore.getState().buckets.s1).toBeDefined();
    expect(unsubscribes).toEqual([]);
  });

  it("cleared Wke overlay keeps sub / refCount / pendingClose", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "A",
      updatedAtMs: 1,
    } as never, [{ id: "u1", role: "user", text: "hi", createdAt: 0 } as never]);
    officialCodeSessionStore.getState().beginPendingTurn("s1");
    officialCodeSessionStore.getState().releaseSession("s1");
    const before = officialCodeSessionStore.getState().buckets.s1!;
    officialCodeSessionStore.getState().resetOnCleared("s1");
    const after = officialCodeSessionStore.getState().buckets.s1!;
    expect(after.messages).toEqual([]);
    expect(after.sub).toBe(before.sub);
    expect(after.refCount).toBe(before.refCount);
    expect(after.pendingClose).toBe(true);
    expect(after.liveMeta).toBe(before.liveMeta);
    expect(after.session?.id).toBe("s1");
    expect(after.evictTimer).toBe(before.evictTimer);
  });

  it("openSessionTransport dispatches subscribe events through bound hostApply", () => {
    const applied: Array<{ sessionId: string; event: unknown }> = [];
    bindOfficialCodeSessionHostApply((sessionId, event) => {
      applied.push({ sessionId, event });
    });
    let emit: ((event: unknown) => void) | undefined;
    const transport: OfficialCodeSessionTransport = {
      subscribe(_sessionId, onEvent) {
        emit = onEvent;
        return { unsubscribe: () => undefined, wake: () => undefined };
      },
    };
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    emit?.({ type: "session_updated", session: { id: "s1", title: "B" } });
    expect(applied).toEqual([
      { sessionId: "s1", event: { type: "session_updated", session: { id: "s1", title: "B" } } },
    ]);
  });

  it("Ae warm skip is sub && messages.length>0", () => {
    officialCodeSessionStore.getState().openSession("s1", {
      id: "s1",
      kind: "code",
      title: "A",
      updatedAtMs: 1,
    } as never, [{ id: "u1", role: "user", text: "hi", createdAt: 0 } as never]);
    const metaOnly = officialCodeSessionStore.getState().buckets.s1!;
    expect(Boolean(metaOnly.sub && metaOnly.messages.length > 0)).toBe(false);

    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    const warm = officialCodeSessionStore.getState().buckets.s1!;
    expect(Boolean(warm.sub && warm.messages.length > 0)).toBe(true);
  });
});
