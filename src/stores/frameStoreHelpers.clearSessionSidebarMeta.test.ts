import { describe, expect, it, vi } from "vitest";

vi.mock("./frameStoreHelpers", async (importOriginal) => {
  // Keep real helpers; only stub persist side effect via localStorage.
  return importOriginal();
});

import { clearSessionSidebarMetaState, type FrameState } from "./frameStoreHelpers";

function baseState(partial: Partial<FrameState> = {}): FrameState {
  return {
    collapsedGroups: [],
    customGroupAssignments: {},
    customGroupOrder: {},
    customGroups: [],
    dragPinHintSeen: true,
    groupByByMode: { code: "none", cowork: "none" },
    mode: "code",
    navPinnedIds: null,
    pinnedOrder: [],
    showDragPinHint: false,
    sidebarCollapsed: false,
    sidebarWidth: 240,
    sortByByMode: { code: "recent", cowork: "recent" },
    ...partial,
  } as FrameState;
}

describe("clearSessionSidebarMetaState", () => {
  it("removes pin + assignment + order entry for the session key", () => {
    const current = baseState({
      pinnedOrder: ["code:a", "code:b"],
      customGroupAssignments: { "code:a": "g1", "code:b": "g1" },
      customGroupOrder: {
        g1: ["code:a", "code:b"],
        g2: ["code:c"],
      },
    });
    const next = clearSessionSidebarMetaState(current, "code:a");
    expect(next.pinnedOrder).toEqual(["code:b"]);
    expect(next.customGroupAssignments).toEqual({ "code:b": "g1" });
    expect(next.customGroupOrder).toEqual({
      g1: ["code:b"],
      g2: ["code:c"],
    });
  });

  it("drops empty group order arrays after last key is removed", () => {
    const current = baseState({
      customGroupAssignments: { "code:a": "g1" },
      customGroupOrder: { g1: ["code:a"] },
    });
    const next = clearSessionSidebarMetaState(current, "code:a");
    expect(next.customGroupAssignments).toEqual({});
    expect(next.customGroupOrder).toEqual({});
  });

  it("is a no-op when key is absent", () => {
    const current = baseState({
      pinnedOrder: ["code:b"],
      customGroupAssignments: { "code:b": "g1" },
      customGroupOrder: { g1: ["code:b"] },
    });
    const next = clearSessionSidebarMetaState(current, "code:missing");
    expect(next).toBe(current);
  });

  it("drops legacy epitaxy:id when clearing cowork:id (and reverse)", () => {
    const current = baseState({
      pinnedOrder: ["epitaxy:x", "code:other"],
      customGroupAssignments: { "epitaxy:x": "g1", "code:other": "g1" },
      customGroupOrder: { g1: ["epitaxy:x", "code:other"] },
    });
    const next = clearSessionSidebarMetaState(current, "cowork:x");
    expect(next.pinnedOrder).toEqual(["code:other"]);
    expect(next.customGroupAssignments).toEqual({ "code:other": "g1" });
    expect(next.customGroupOrder).toEqual({ g1: ["code:other"] });

    const reverse = clearSessionSidebarMetaState(
      baseState({
        pinnedOrder: ["cowork:y", "code:z"],
        customGroupAssignments: { "cowork:y": "g2" },
        customGroupOrder: { g2: ["cowork:y"] },
      }),
      "epitaxy:y",
    );
    expect(reverse.pinnedOrder).toEqual(["code:z"]);
    expect(reverse.customGroupAssignments).toEqual({});
    expect(reverse.customGroupOrder).toEqual({});
  });
});
