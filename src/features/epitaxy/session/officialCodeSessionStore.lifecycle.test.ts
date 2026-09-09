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
    fetchTranscript: async () => [],
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
      fetchTranscript: async () => [],
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

  it("empty Wke has connection/promptSuggestion/seenUuids/contextTokens/contextUsage, not streamSnapshot", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(bucket.connection).toBe("idle");
    expect(bucket.promptSuggestion).toBeNull();
    expect(bucket.seenUuids).toBeInstanceOf(Set);
    expect(bucket.contextTokens).toBeNull();
    expect(bucket.contextUsage).toBeNull();
    expect("streamSnapshot" in bucket).toBe(false);
  });

  it("setConnection and prompt_suggestion write Wke fields; beginPendingTurn clears suggestion", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().setConnection("s1", "connected");
    officialCodeSessionStore.getState().setPromptSuggestion("s1", "try this");
    expect(officialCodeSessionStore.getState().buckets.s1!.connection).toBe("connected");
    expect(officialCodeSessionStore.getState().buckets.s1!.promptSuggestion).toBe("try this");
    officialCodeSessionStore.getState().beginPendingTurn("s1");
    expect(officialCodeSessionStore.getState().buckets.s1!.promptSuggestion).toBeNull();
    expect(officialCodeSessionStore.getState().buckets.s1!.pendingTurnStartedAt).not.toBeNull();
  });

  it("seedPromptSuggestion only when idle and suggestion empty", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().seedPromptSuggestion("s1", "from meta");
    expect(officialCodeSessionStore.getState().buckets.s1!.promptSuggestion).toBe("from meta");
    officialCodeSessionStore.getState().seedPromptSuggestion("s1", "ignored");
    expect(officialCodeSessionStore.getState().buckets.s1!.promptSuggestion).toBe("from meta");
    officialCodeSessionStore.getState().beginPendingTurn("s1");
    officialCodeSessionStore.getState().seedPromptSuggestion("s1", "still ignored");
    expect(officialCodeSessionStore.getState().buckets.s1!.promptSuggestion).toBeNull();
  });

  it("mergeMessage stamps seenUuids and Bke contextTokens from root assistant usage", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().mergeMessage("s1", {
      id: "a1",
      role: "assistant",
      text: "hi",
      createdAt: "0",
      raw: {
        type: "assistant",
        uuid: "a1",
        message: {
          usage: { input_tokens: 10, cache_read_input_tokens: 5, cache_creation_input_tokens: 1 },
        },
      },
    } as never);
    const bucket = officialCodeSessionStore.getState().buckets.s1!;
    expect(bucket.seenUuids.has("a1")).toBe(true);
    expect(bucket.contextTokens).toBe(16);
  });

  it("seenUuids.has same assistant uuid replaces in place", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().mergeMessage("s1", {
      id: "a1",
      role: "assistant",
      text: "first",
      createdAt: "0",
      raw: { type: "assistant", uuid: "a1" },
    } as never);
    officialCodeSessionStore.getState().mergeMessage("s1", {
      id: "a1",
      role: "assistant",
      text: "second",
      createdAt: "1",
      raw: { type: "assistant", uuid: "a1" },
    } as never);
    const messages = officialCodeSessionStore.getState().buckets.s1!.messages;
    expect(messages).toHaveLength(1);
    expect(messages[0]?.text).toBe("second");
  });

  it("seenUuids.has unknown uuid drops the event", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().mergeMessage("s1", {
      id: "u1",
      role: "user",
      text: "hi",
      createdAt: "0",
      raw: { type: "user", uuid: "u1" },
    } as never);
    officialCodeSessionStore.getState().buckets.s1!.seenUuids.add("ghost");
    officialCodeSessionStore.getState().mergeMessage("s1", {
      id: "ghost",
      role: "user",
      text: "replay",
      createdAt: "1",
      raw: { type: "user", uuid: "ghost" },
    } as never);
    expect(officialCodeSessionStore.getState().buckets.s1!.messages).toHaveLength(1);
    expect(officialCodeSessionStore.getState().buckets.s1!.messages[0]?.text).toBe("hi");
  });

  it("cleared overlay keeps connection", () => {
    const { transport } = fakeTransport();
    officialCodeSessionStore.getState().openSessionTransport("s1", transport);
    officialCodeSessionStore.getState().setConnection("s1", "connected");
    officialCodeSessionStore.getState().resetOnCleared("s1");
    expect(officialCodeSessionStore.getState().buckets.s1!.connection).toBe("connected");
  });
});
