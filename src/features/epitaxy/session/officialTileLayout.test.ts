import { describe, expect, it } from "vitest";
import {
  residualChatFlex,
  residualChatOnlyLayout,
  residualHasSidePanes,
  residualIr,
  residualJs,
  residualLayoutFromSideTiles,
  residualNonChatTileIds,
  residualSideColumns,
  residualSameSessionStripTileLayout,
  residualStripRestoredTileLayout,
  residualUr,
  residualXs,
  residualZs,
  type ResidualTileLayout,
} from "./officialTileLayout";

function tileIds(layout: ResidualTileLayout): string[] {
  return [...residualIr(layout)];
}

function sideColumnTiles(layout: ResidualTileLayout): string[][] {
  return residualSideColumns(layout).map((c) => c.tiles);
}

describe("residualChatOnlyLayout (_r)", () => {
  it("is a row stack wrapping chat", () => {
    const layout = residualChatOnlyLayout();
    expect(tileIds(layout)).toEqual(["chat"]);
    expect(layout.root.kind).toBe("stack");
    if (layout.root.kind === "stack") {
      expect(layout.root.direction).toBe("row");
      expect(layout.root.children).toHaveLength(1);
    }
  });
});

describe("residualUr (setSidePane insert)", () => {
  it("first non-chat open → row [chat:2, side:1]", () => {
    const layout = residualUr(residualChatOnlyLayout(), "tasks");
    expect(tileIds(layout).sort()).toEqual(["chat", "tasks"].sort());
    expect(residualChatFlex(layout)).toBe(2);
    expect(sideColumnTiles(layout)).toEqual([["tasks"]]);
    const root = layout.root;
    expect(root.kind).toBe("stack");
    if (root.kind === "stack") {
      expect(root.direction).toBe("row");
      expect(root.children).toHaveLength(2);
      const chat = root.children[0]!;
      const side = root.children[1]!;
      expect(chat.kind === "tile" && chat.tileId === "chat" && chat.flex === 2).toBe(true);
      expect(side.kind === "tile" && side.tileId === "tasks" && side.flex === 1).toBe(true);
    }
  });

  it("second open under last side tile → one column stack (tasks above, file below)", () => {
    let layout = residualUr(residualChatOnlyLayout(), "tasks");
    layout = residualUr(layout, "file");
    expect(residualNonChatTileIds(layout)).toEqual(["tasks", "file"]);
    expect(sideColumnTiles(layout)).toEqual([["tasks", "file"]]);
    const root = layout.root;
    expect(root.kind).toBe("stack");
    if (root.kind === "stack") {
      expect(root.children).toHaveLength(2);
      const side = root.children[1]!;
      expect(side.kind).toBe("stack");
      if (side.kind === "stack") {
        expect(side.direction).toBe("column");
        expect(side.children.map((c) => (c.kind === "tile" ? c.tileId : "?"))).toEqual([
          "tasks",
          "file",
        ]);
      }
    }
  });

  it("third open when last root child is column stack → residualJs new side column", () => {
    let layout = residualUr(residualChatOnlyLayout(), "tasks");
    layout = residualUr(layout, "file");
    layout = residualUr(layout, "plan");
    // last is stack → Js appends plan as new row child
    expect(sideColumnTiles(layout)).toEqual([["tasks", "file"], ["plan"]]);
    expect(residualNonChatTileIds(layout)).toEqual(["tasks", "file", "plan"]);
  });

  it("is idempotent for membership checks at call site (ur always inserts if called)", () => {
    const layout = residualUr(residualChatOnlyLayout(), "tasks");
    // residual setSidePane gates on ir().has before ur; raw ur would insert again via Js/column
    expect(residualIr(layout).has("tasks")).toBe(true);
  });
});

describe("residualZs (closeSidePane)", () => {
  it("removes one tile and normalizes back toward chat-only", () => {
    let layout = residualUr(residualChatOnlyLayout(), "tasks");
    layout = residualUr(layout, "file");
    layout = residualZs(layout, "file");
    expect(residualNonChatTileIds(layout)).toEqual(["tasks"]);
    layout = residualZs(layout, "tasks");
    expect(residualNonChatTileIds(layout)).toEqual([]);
    expect(tileIds(layout)).toEqual(["chat"]);
  });

  it("no-op when tile missing", () => {
    const base = residualChatOnlyLayout();
    expect(residualZs(base, "tasks")).toEqual(base);
  });
});

describe("residualJs", () => {
  it("appends a new row child column", () => {
    const layout = residualJs(residualChatOnlyLayout(), "runs");
    expect(sideColumnTiles(layout)).toEqual([["runs"]]);
  });
});

describe("residualStripRestoredTileLayout (Nr.reset cross-session)", () => {
  it("strips file/subagent/session/diff/transcript/framebuffer; preview only if keep", () => {
    let layout = residualLayoutFromSideTiles([
      "tasks",
      "file",
      "subagent",
      "plan",
      "preview",
      "diff",
      "framebuffer",
      "terminal",
      "browser",
      "runs",
    ]);
    // inject a residual-style diff: tile
    layout = residualUr(layout, "diff:abc");
    const stripped = residualStripRestoredTileLayout(layout, false);
    const ids = residualNonChatTileIds(stripped);
    expect(ids).toEqual(expect.arrayContaining(["tasks", "plan", "terminal", "browser", "runs"]));
    expect(ids).not.toContain("file");
    expect(ids).not.toContain("subagent");
    expect(ids).not.toContain("preview");
    expect(ids).not.toContain("framebuffer");
    expect(ids).not.toContain("diff");
    expect(ids.some((id) => id.startsWith("diff:"))).toBe(false);
    expect(residualIr(stripped).has("chat")).toBe(true);
  });

  it("keeps preview when keepPreview", () => {
    const layout = residualLayoutFromSideTiles(["preview", "tasks"]);
    expect(residualNonChatTileIds(residualStripRestoredTileLayout(layout, true))).toEqual(
      expect.arrayContaining(["preview", "tasks"]),
    );
  });
});

describe("residualSameSessionStripTileLayout", () => {
  it("strips preview without server + framebuffer only", () => {
    const layout = residualLayoutFromSideTiles(["tasks", "file", "preview", "framebuffer"]);
    const next = residualSameSessionStripTileLayout(layout, false);
    expect(residualNonChatTileIds(next).sort()).toEqual(["file", "tasks"].sort());
  });

  it("keeps preview when hasPreviewServer", () => {
    const layout = residualLayoutFromSideTiles(["preview", "tasks"]);
    const next = residualSameSessionStripTileLayout(layout, true);
    expect(residualNonChatTileIds(next).sort()).toEqual(["preview", "tasks"].sort());
  });
});

describe("residualLayoutFromSideTiles migrate bridge", () => {
  it("replays ur sequence from flat sideTiles", () => {
    const layout = residualLayoutFromSideTiles(["tasks", "file"]);
    expect(sideColumnTiles(layout)).toEqual([["tasks", "file"]]);
    expect(residualHasSidePanes(layout)).toBe(true);
  });
});

describe("residualXs", () => {
  it("builds nested row/column from compact spec", () => {
    const layout = residualXs({
      direction: "row",
      children: [["chat", 2], { direction: "column", children: ["tasks", "file"] }],
    });
    expect(sideColumnTiles(layout)).toEqual([["tasks", "file"]]);
    expect(residualChatFlex(layout)).toBe(2);
  });
});
