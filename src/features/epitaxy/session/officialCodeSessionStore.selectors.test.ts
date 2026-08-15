/**
 * Residual Gv selectors: d_e/ws compaction + js permission — not full-bucket.
 * Store-level checks (no RTL) — hooks are thin useStore wrappers over these paths.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { officialCodeSessionStore } from "./officialCodeSessionStore";

function compactionStatusOf(sessionId: string) {
  return officialCodeSessionStore.getState().buckets[sessionId]?.compactionStatus ?? null;
}

function permissionSuppressedOf(sessionId: string) {
  return (officialCodeSessionStore.getState().buckets[sessionId]?.session?.pendingToolPermissions?.length ?? 0) > 0;
}

describe("official Code Gv residual selectors", () => {
  beforeEach(() => {
    officialCodeSessionStore.setState({ buckets: {} });
  });

  it("compactionStatus tracks only compactionStatus (stream fields independent)", () => {
    officialCodeSessionStore.getState().markLoading("s1", true);
    officialCodeSessionStore.setState((prev) => ({
      buckets: {
        ...prev.buckets,
        s1: {
          ...prev.buckets.s1!,
          isTranscriptPending: false,
          isMetaPending: false,
          compactionStatus: "compacting",
        },
      },
    }));
    expect(compactionStatusOf("s1")).toBe("compacting");

    officialCodeSessionStore.setState((prev) => ({
      buckets: {
        ...prev.buckets,
        s1: {
          ...prev.buckets.s1!,
          streamingMessageId: "msg-1",
          streamActivityMode: "requesting" as never,
        },
      },
    }));
    expect(compactionStatusOf("s1")).toBe("compacting");

    officialCodeSessionStore.setState((prev) => ({
      buckets: {
        ...prev.buckets,
        s1: { ...prev.buckets.s1!, compactionStatus: null },
      },
    }));
    expect(compactionStatusOf("s1")).toBe(null);
  });

  it("permission suppressed follows pendingToolPermissions length", () => {
    officialCodeSessionStore.getState().markLoading("s2", true);
    officialCodeSessionStore.setState((prev) => ({
      buckets: {
        ...prev.buckets,
        s2: {
          ...prev.buckets.s2!,
          isTranscriptPending: false,
          isMetaPending: false,
          session: {
            id: "s2",
            title: "t",
            cwd: "/",
            createdAt: 0,
            updatedAt: 0,
            isRunning: true,
            pendingToolPermissions: [{ id: "p1" } as never],
          } as never,
        },
      },
    }));
    expect(permissionSuppressedOf("s2")).toBe(true);

    officialCodeSessionStore.setState((prev) => ({
      buckets: {
        ...prev.buckets,
        s2: {
          ...prev.buckets.s2!,
          session: {
            ...(prev.buckets.s2!.session as object),
            pendingToolPermissions: [],
          } as never,
        },
      },
    }));
    expect(permissionSuppressedOf("s2")).toBe(false);
  });
});
