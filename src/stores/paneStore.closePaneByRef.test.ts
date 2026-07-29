import { beforeEach, describe, expect, it } from "vitest";
import { paneStore } from "./paneStore";

describe("paneStore.closePaneByRef", () => {
  beforeEach(() => {
    paneStore.getState();
    // Reset by closing all known panes via raw state rewrite is not exported;
    // clear by closing by ref after seeding.
    for (const pane of paneStore.getState().extraPanesByMode.code ?? []) {
      paneStore.closePaneByRef("code", pane.ref);
    }
  });

  it("removes the matching pane by stable ref even if index shifts", () => {
    paneStore.addPane("code", "code:primary", { kind: "code", id: "a", title: "A" }, "tr");
    paneStore.addPane("code", "code:primary", { kind: "code", id: "b", title: "B" }, "br");

    // Close first pane so B's index shifts from 2 → 1.
    paneStore.closePaneByRef("code", { kind: "code", id: "a" });
    // Still closes B by ref, not by stale index.
    paneStore.closePaneByRef("code", { kind: "code", id: "b" });

    expect(paneStore.getState().extraPanesByMode.code ?? []).toEqual([]);
  });

  it("no-ops when ref is absent", () => {
    paneStore.addPane("code", "code:primary", { kind: "code", id: "a", title: "A" }, "tr");
    const before = paneStore.getState().extraPanesByMode.code;
    paneStore.closePaneByRef("code", { kind: "code", id: "missing" });
    expect(paneStore.getState().extraPanesByMode.code).toEqual(before);
  });
});
