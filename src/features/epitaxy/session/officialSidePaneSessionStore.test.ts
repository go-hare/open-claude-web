import { beforeEach, describe, expect, it } from "vitest";
import {
  residualChatOnlyLayout,
  residualIr,
  residualLayoutFromSideTiles,
  residualNonChatTileIds,
  residualUr,
} from "./officialTileLayout";
import {
  createOfficialSidePaneSessionStore,
  EPITAXY_SIDE_PANE_PERSIST_KEY,
  getOrCreateOfficialSidePaneStore,
  officialEvictSidePaneSession,
  officialSidePaneSessionStore,
  registerOfficialSidePaneStore,
  residualIsTempPreviewServerId,
  residualMapUpsert,
  residualOfficialViewPanes,
  residualSecondarySidePanePersistKey,
  residualStripRestoredSideTiles,
  type OfficialSidePaneStore,
} from "./officialSidePaneSessionStore";

function resetStore(store: OfficialSidePaneStore) {
  store.setState({
    currentSessionId: undefined,
    tileLayout: residualChatOnlyLayout(),
    sidePane: "none",
    transcriptMode: "normal",
    previewServerId: undefined,
    fileView: undefined,
    subagentView: undefined,
    tileLayoutBySession: {},
    transcriptModeBySession: {},
    previewServerIdBySession: {},
  });
}

describe("residualMapUpsert (xr)", () => {
  it("upserts and caps to most-recent max keys", () => {
    let map: Record<string, number> = {};
    for (let i = 0; i < 5; i++) {
      map = residualMapUpsert(map, `s${i}`, i, 3);
    }
    expect(Object.keys(map)).toEqual(["s2", "s3", "s4"]);
    expect(map.s4).toBe(4);
  });

  it("deletes when value is undefined", () => {
    const map = residualMapUpsert({ a: 1, b: 2 }, "a", undefined, 100);
    expect(map).toEqual({ b: 2 });
  });
});

describe("residualStripRestoredSideTiles (bridge)", () => {
  it("strips session-scoped panes and keeps durable ones", () => {
    expect(
      residualStripRestoredSideTiles(
        ["tasks", "file", "subagent", "plan", "preview", "diff", "framebuffer", "terminal", "browser", "runs"],
        false,
      ),
    ).toEqual(["tasks", "plan", "terminal", "browser", "runs"]);
  });

  it("keeps preview only when keepPreview", () => {
    expect(residualStripRestoredSideTiles(["preview", "tasks"], true)).toEqual(["preview", "tasks"]);
    expect(residualStripRestoredSideTiles(["preview", "tasks"], false)).toEqual(["tasks"]);
  });
});

describe("residualIsTempPreviewServerId (Ps)", () => {
  it("matches html-preview- prefix only", () => {
    expect(residualIsTempPreviewServerId("html-preview-abc")).toBe(true);
    expect(residualIsTempPreviewServerId("srv-1")).toBe(false);
    expect(residualIsTempPreviewServerId(undefined)).toBe(false);
  });
});

describe("residualSecondarySidePanePersistKey", () => {
  it("matches residual `${dd}.${slot}`", () => {
    expect(residualSecondarySidePanePersistKey("tr")).toBe(`${EPITAXY_SIDE_PANE_PERSIST_KEY}.tr`);
    expect(residualSecondarySidePanePersistKey("br")).toBe(`${EPITAXY_SIDE_PANE_PERSIST_KEY}.br`);
    expect(residualSecondarySidePanePersistKey("bl")).toBe(`${EPITAXY_SIDE_PANE_PERSIST_KEY}.bl`);
  });
});

describe("setSidePane / toggleSidePane / closeSidePane (ur/Zs)", () => {
  beforeEach(() => {
    resetStore(officialSidePaneSessionStore);
  });

  it("first setSidePane ur inserts chat:2 + side", () => {
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    const state = officialSidePaneSessionStore.getState();
    expect(state.sidePane).toBe("tasks");
    expect(residualOfficialViewPanes(state.tileLayout)).toEqual(["tasks"]);
    expect(residualIr(state.tileLayout).has("chat")).toBe(true);
  });

  it("second setSidePane stacks column under first side tile", () => {
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    officialSidePaneSessionStore.getState().setSidePane("file");
    expect(residualNonChatTileIds(officialSidePaneSessionStore.getState().tileLayout)).toEqual([
      "tasks",
      "file",
    ]);
    expect(officialSidePaneSessionStore.getState().sidePane).toBe("file");
  });

  it("setSidePane on already-open tile only focuses", () => {
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    const layout = officialSidePaneSessionStore.getState().tileLayout;
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    expect(officialSidePaneSessionStore.getState().tileLayout).toBe(layout);
    expect(officialSidePaneSessionStore.getState().sidePane).toBe("tasks");
  });

  it("toggleSidePane closes open tile", () => {
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    officialSidePaneSessionStore.getState().toggleSidePane("tasks");
    expect(residualOfficialViewPanes(officialSidePaneSessionStore.getState().tileLayout)).toEqual([]);
    expect(officialSidePaneSessionStore.getState().sidePane).toBe("none");
  });

  it("closeSidePane Zs and clears focus when matched", () => {
    officialSidePaneSessionStore.getState().setSidePane("tasks");
    officialSidePaneSessionStore.getState().setSidePane("file");
    officialSidePaneSessionStore.getState().closeSidePane("file");
    expect(residualOfficialViewPanes(officialSidePaneSessionStore.getState().tileLayout)).toEqual([
      "tasks",
    ]);
    expect(officialSidePaneSessionStore.getState().sidePane).toBe("none");
  });
});

describe("officialSidePaneSessionStore.reset", () => {
  beforeEach(() => {
    resetStore(officialSidePaneSessionStore);
  });

  it("saves prev and restores stripped target (A→B→A)", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      tileLayout: residualLayoutFromSideTiles(["tasks", "file", "subagent"]),
      transcriptMode: "thinking",
      sidePane: "file",
    });
    const leaveA = officialSidePaneSessionStore.getState().reset("B");
    expect(leaveA.sideTiles).toEqual([]);
    expect(
      residualOfficialViewPanes(officialSidePaneSessionStore.getState().tileLayoutBySession.A!),
    ).toEqual(["tasks", "file", "subagent"]);
    expect(officialSidePaneSessionStore.getState().transcriptModeBySession.A).toBe("thinking");

    // B opens plan then switch back to A
    officialSidePaneSessionStore.getState().setSidePane("plan");
    officialSidePaneSessionStore.getState().setTranscriptMode("verbose");
    const backA = officialSidePaneSessionStore.getState().reset("A");
    expect(backA.sideTiles).toEqual(["tasks"]);
    expect(backA.transcriptMode).toBe("thinking");
    expect(backA.sidePane).toBe("none");
  });

  it("same-session keeps live tileLayout and only strips preview+framebuffer when no server", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      previewServerId: undefined,
      tileLayout: residualLayoutFromSideTiles(["tasks", "file", "preview", "framebuffer"]),
      transcriptMode: "normal",
      sidePane: "file",
    });
    const same = officialSidePaneSessionStore.getState().reset("A");
    expect(same.sideTiles.sort()).toEqual(["file", "tasks"].sort());
    expect(same.sidePane).toBe("file");
  });

  it("same-session keeps preview when live temp html-preview-* server is bound", () => {
    // Residual: hasServer = previewServerId !== undefined (live), not durable-only.
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      previewServerId: "html-preview-temp-1",
      tileLayout: residualLayoutFromSideTiles(["preview", "file"]),
      transcriptMode: "normal",
      sidePane: "preview",
    });
    const same = officialSidePaneSessionStore.getState().reset("A");
    expect(same.sideTiles.sort()).toEqual(["file", "preview"].sort());
    expect(same.previewServerId).toBe("html-preview-temp-1");
    expect(same.sidePane).toBe("preview");
  });

  it("keeps preview tile when restored durable previewServerId", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      previewServerId: "srv-live",
      tileLayout: residualLayoutFromSideTiles(["preview", "tasks"]),
      transcriptMode: "normal",
      tileLayoutBySession: {},
      transcriptModeBySession: {},
      previewServerIdBySession: {},
    });
    officialSidePaneSessionStore.getState().bindPreviewServer("srv-live");
    const leaveA = officialSidePaneSessionStore.getState().reset("B");
    expect(leaveA.sideTiles).toEqual([]);
    expect(officialSidePaneSessionStore.getState().previewServerIdBySession.A).toBe("srv-live");

    const backA = officialSidePaneSessionStore.getState().reset("A");
    expect(backA.sideTiles).toEqual(["preview", "tasks"]);
    expect(backA.previewServerId).toBe("srv-live");
    expect(officialSidePaneSessionStore.getState().previewServerId).toBe("srv-live");
  });

  it("does not persist temporary html-preview- server ids across sessions", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      previewServerId: "html-preview-x",
      tileLayout: residualLayoutFromSideTiles(["preview"]),
    });
    officialSidePaneSessionStore.getState().reset("B");
    expect(officialSidePaneSessionStore.getState().previewServerIdBySession.A).toBeUndefined();
  });

  it("carry runs when target has no saved layout and live has runs", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      tileLayout: residualLayoutFromSideTiles(["runs", "file"]),
      transcriptMode: "normal",
    });
    const toB = officialSidePaneSessionStore.getState().reset("B");
    expect(toB.sideTiles).toEqual(["runs"]);
  });

  it("same-session keeps fileView/subagentView (Lr not spread)", () => {
    const fileView = { path: "/tmp/a.ts", line: 3 };
    const subagentView = { toolUseId: "tu-1", description: "Explore" };
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      fileView,
      subagentView,
      tileLayout: residualLayoutFromSideTiles(["tasks", "file", "subagent"]),
      sidePane: "subagent",
    });
    const same = officialSidePaneSessionStore.getState().reset("A");
    expect(same.fileView).toEqual(fileView);
    expect(same.subagentView).toEqual(subagentView);
    expect(same.sideTiles).toEqual(["tasks", "file", "subagent"]);
  });

  it("cross-session clears fileView/subagentView via Lr", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      fileView: { path: "/tmp/a.ts" },
      subagentView: { toolUseId: "tu-1", description: "Explore" },
      tileLayout: residualLayoutFromSideTiles(["file", "subagent", "tasks"]),
    });
    const toB = officialSidePaneSessionStore.getState().reset("B");
    expect(toB.fileView).toBeUndefined();
    expect(toB.subagentView).toBeUndefined();
    expect(officialSidePaneSessionStore.getState().fileView).toBeUndefined();
    expect(officialSidePaneSessionStore.getState().subagentView).toBeUndefined();
  });

  it("same-session remount keeps live file tile (residual live tileLayout)", () => {
    officialSidePaneSessionStore.setState({
      currentSessionId: "A",
      fileView: { path: "/tmp/a.ts" },
      tileLayout: residualLayoutFromSideTiles(["tasks", "file"]),
      transcriptMode: "normal",
      sidePane: "file",
    });
    const remount = officialSidePaneSessionStore.getState().reset("A");
    expect(remount.sideTiles).toContain("tasks");
    expect(remount.sideTiles).toContain("file");
    expect(remount.fileView).toEqual({ path: "/tmp/a.ts" });
  });
});

describe("bind/unbind preview", () => {
  beforeEach(() => {
    resetStore(officialSidePaneSessionStore);
    officialSidePaneSessionStore.setState({ currentSessionId: "A" });
  });

  it("bind writes live + bySession for durable ids", () => {
    officialSidePaneSessionStore.getState().bindPreviewServer("srv-1");
    expect(officialSidePaneSessionStore.getState().previewServerId).toBe("srv-1");
    expect(officialSidePaneSessionStore.getState().previewServerIdBySession.A).toBe("srv-1");
  });

  it("unbind clears only when id matches", () => {
    officialSidePaneSessionStore.getState().bindPreviewServer("srv-1");
    officialSidePaneSessionStore.getState().unbindPreviewServer("other");
    expect(officialSidePaneSessionStore.getState().previewServerId).toBe("srv-1");
    officialSidePaneSessionStore.getState().unbindPreviewServer("srv-1");
    expect(officialSidePaneSessionStore.getState().previewServerId).toBeUndefined();
    expect(officialSidePaneSessionStore.getState().previewServerIdBySession.A).toBeUndefined();
  });
});

describe("multi-pane Nr ownership (kI sidePanePersistKey)", () => {
  it("primary and secondary stores are independent", () => {
    const primary = officialSidePaneSessionStore;
    const secondary = createOfficialSidePaneSessionStore();
    resetStore(primary);
    resetStore(secondary);

    primary.setState({
      currentSessionId: "A",
      tileLayout: residualLayoutFromSideTiles(["tasks", "file"]),
      transcriptMode: "thinking",
    });
    primary.getState().reset("B");
    expect(residualOfficialViewPanes(primary.getState().tileLayoutBySession.A!)).toEqual([
      "tasks",
      "file",
    ]);
    expect(secondary.getState().tileLayoutBySession.A).toBeUndefined();

    // Secondary same-session reset must not wipe primary bySession.
    secondary.setState({ currentSessionId: "A" });
    secondary.getState().reset("A");
    expect(residualOfficialViewPanes(primary.getState().tileLayoutBySession.A!)).toEqual([
      "tasks",
      "file",
    ]);
    expect(primary.getState().transcriptModeBySession.A).toBe("thinking");
  });

  it("secondary saveLive does not overwrite primary maps", () => {
    const primary = officialSidePaneSessionStore;
    const secondary = createOfficialSidePaneSessionStore();
    resetStore(primary);
    resetStore(secondary);

    primary.setState({
      currentSessionId: "A",
      tileLayout: residualLayoutFromSideTiles(["tasks", "plan"]),
      transcriptMode: "verbose",
    });
    primary.getState().saveLive("A");
    secondary.setState({
      currentSessionId: "A",
      tileLayout: residualChatOnlyLayout(),
      transcriptMode: "normal",
    });
    secondary.getState().saveLive("A");
    expect(residualOfficialViewPanes(primary.getState().tileLayoutBySession.A!)).toEqual([
      "tasks",
      "plan",
    ]);
    expect(residualNonChatTileIds(secondary.getState().tileLayoutBySession.A!)).toEqual([]);
  });

  it("getOrCreateOfficialSidePaneStore reuses primary for EPITAXY key", () => {
    const a = getOrCreateOfficialSidePaneStore(EPITAXY_SIDE_PANE_PERSIST_KEY);
    const b = getOrCreateOfficialSidePaneStore(EPITAXY_SIDE_PANE_PERSIST_KEY);
    expect(a).toBe(officialSidePaneSessionStore);
    expect(b).toBe(a);
  });

  it("officialEvictSidePaneSession clears all live stores (Kr)", () => {
    const primary = officialSidePaneSessionStore;
    const secondary = createOfficialSidePaneSessionStore();
    resetStore(primary);
    resetStore(secondary);
    primary.setState({
      currentSessionId: "gone",
      tileLayoutBySession: { gone: residualUr(residualChatOnlyLayout(), "tasks") },
      transcriptModeBySession: { gone: "normal" },
    });
    secondary.setState({
      currentSessionId: "gone",
      tileLayoutBySession: { gone: residualUr(residualChatOnlyLayout(), "plan") },
      transcriptModeBySession: { gone: "verbose" },
    });
    const unreg = registerOfficialSidePaneStore(secondary);
    officialEvictSidePaneSession("gone");
    expect(primary.getState().tileLayoutBySession.gone).toBeUndefined();
    expect(secondary.getState().tileLayoutBySession.gone).toBeUndefined();
    expect(primary.getState().currentSessionId).toBeUndefined();
    expect(secondary.getState().currentSessionId).toBeUndefined();
    unreg();
  });
});
