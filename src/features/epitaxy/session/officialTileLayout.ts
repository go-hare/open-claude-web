/**
 * Residual ca0135bc5 tileLayout tree ops (exact semantics).
 *
 * tileLayout = { root: tile | stack }
 * stack = { kind:"stack", id, direction:"row"|"column", flex, children }
 * tile  = { kind:"tile", tileId, flex }
 *
 * Core:
 *   _r()  = Xs("chat")
 *   ir(e) = Set of tileIds
 *   ur(e,t) = insert side tile (first: row [chat:2, t:1]; under side tile → column wrap)
 *   Zs(e,t) = remove tile + Gs normalize + Ys ensure stack root
 *   Js(e,t) = append tile as new row child
 *   Xs(spec) = { root: Ys(Gs(Ws(spec))) }
 *
 * Product bridge: residualNonChatTileIds / residualSideColumns for openViews + column render.
 * Full drag-drop (or/Us/Hs) not required for open/close residual path.
 */

export type ResidualTileDirection = "row" | "column";

export type ResidualTileNode = {
  kind: "tile";
  tileId: string;
  flex: number;
};

export type ResidualStackNode = {
  kind: "stack";
  id: string;
  direction: ResidualTileDirection;
  flex: number;
  children: ResidualLayoutNode[];
};

export type ResidualLayoutNode = ResidualTileNode | ResidualStackNode;

export type ResidualTileLayout = {
  root: ResidualLayoutNode;
};

/** Residual Ws input shape. */
export type ResidualWsSpec =
  | string
  | [string, number]
  | {
      direction: ResidualTileDirection;
      flex?: number;
      children: ResidualWsSpec[];
    };

const stackIdPrefix =
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
let stackSeq = 0;

/** Residual Ls() — unique stack id. */
export function residualNewStackId(): string {
  stackSeq += 1;
  return `stack-${stackIdPrefix}-${stackSeq}`;
}

/** Residual Rr — simulator tile ids (ur special-cases). */
export function residualIsSimulatorTileId(tileId: string): boolean {
  return tileId === "simulator" || tileId.startsWith("simulator:");
}

/** Residual Rs — deep clone tree (mutable path for Zs/ur wrap). */
export function residualCloneLayoutNode(node: ResidualLayoutNode): ResidualLayoutNode {
  if (node.kind === "tile") return { ...node };
  return {
    ...node,
    children: node.children.map(residualCloneLayoutNode),
  };
}

/** Residual Ds — path of child indexes from root to tileId. */
export function residualFindTilePath(
  node: ResidualLayoutNode,
  tileId: string,
  path: number[] = [],
): number[] | null {
  if (node.kind === "tile") return node.tileId === tileId ? path : null;
  for (let i = 0; i < node.children.length; i += 1) {
    const found = residualFindTilePath(node.children[i]!, tileId, [...path, i]);
    if (found) return found;
  }
  return null;
}

/** Residual Es — parent stack at path (path points at child). */
export function residualParentAtPath(
  root: ResidualLayoutNode,
  path: number[],
): ResidualStackNode | null {
  if (path.length === 0) return null;
  let node: ResidualLayoutNode = root;
  for (const index of path.slice(0, -1)) {
    if (node.kind !== "stack" || index >= node.children.length) return null;
    node = node.children[index]!;
  }
  return node.kind === "stack" ? node : null;
}

/**
 * Residual Gs — collapse empty stacks, merge same-direction stacks, promote single child.
 */
export function residualNormalizeLayoutNode(node: ResidualLayoutNode): ResidualLayoutNode {
  if (node.kind === "tile") return node;
  const children = node.children
    .map(residualNormalizeLayoutNode)
    .filter((child) => child.kind === "tile" || child.children.length > 0)
    .flatMap((child) =>
      child.kind === "stack" && child.direction === node.direction ? child.children : [child],
    );
  if (children.length === 1) {
    const only = children[0]!;
    if (only.kind === "stack") return { ...only, flex: node.flex };
    return { kind: "tile", tileId: only.tileId, flex: node.flex };
  }
  return { ...node, children };
}

/** Residual Ys — ensure root is a stack (wrap lone tile in row stack). */
export function residualEnsureStackRoot(node: ResidualLayoutNode): ResidualLayoutNode {
  if (node.kind === "stack") return node;
  return {
    kind: "stack",
    id: residualNewStackId(),
    direction: "row",
    flex: 1,
    children: [node],
  };
}

/** Residual Ws — expand compact spec to node. */
export function residualWs(spec: ResidualWsSpec): ResidualLayoutNode {
  if (typeof spec === "string") {
    return { kind: "tile", tileId: spec, flex: 1 };
  }
  if (Array.isArray(spec)) {
    return { kind: "tile", tileId: spec[0], flex: spec[1] };
  }
  return {
    kind: "stack",
    id: residualNewStackId(),
    direction: spec.direction,
    flex: spec.flex ?? 1,
    children: spec.children.map(residualWs),
  };
}

/** Residual Xs(spec) → tileLayout. */
export function residualXs(spec: ResidualWsSpec): ResidualTileLayout {
  return {
    root: residualEnsureStackRoot(residualNormalizeLayoutNode(residualWs(spec))),
  };
}

/** Residual _r() — chat-only default layout. */
export function residualChatOnlyLayout(): ResidualTileLayout {
  return residualXs("chat");
}

/** Residual ir(layout) — all tileIds. */
export function residualIr(layout: ResidualTileLayout): Set<string> {
  const out = new Set<string>();
  const walk = (node: ResidualLayoutNode) => {
    if (node.kind === "tile") out.add(node.tileId);
    else node.children.forEach(walk);
  };
  walk(layout.root);
  return out;
}

/** Residual Js — append tile as new row child (new column). */
export function residualJs(layout: ResidualTileLayout, tileId: string): ResidualTileLayout {
  const tile: ResidualTileNode = { kind: "tile", tileId, flex: 1 };
  const root = layout.root;
  if (root.kind === "stack" && root.direction === "row") {
    return {
      root: residualEnsureStackRoot(
        residualNormalizeLayoutNode({
          ...root,
          children: [...root.children, tile],
        }),
      ),
    };
  }
  return {
    root: residualEnsureStackRoot(
      residualNormalizeLayoutNode({
        kind: "stack",
        id: residualNewStackId(),
        direction: "row",
        flex: 1,
        children: [{ ...root, flex: 1 }, tile],
      }),
    ),
  };
}

/** Residual Zs — remove tileId. */
export function residualZs(layout: ResidualTileLayout, tileId: string): ResidualTileLayout {
  const root = residualCloneLayoutNode(layout.root);
  const path = residualFindTilePath(root, tileId);
  if (!path) return layout;
  const parent = residualParentAtPath(root, path);
  if (!parent) return layout;
  parent.children.splice(path[path.length - 1]!, 1);
  return { root: residualEnsureStackRoot(residualNormalizeLayoutNode(root)) };
}

/**
 * Residual ur(layout, tileId) — setSidePane insert path.
 * - No non-chat tiles → Xs row [chat:2, tile]
 * - Last child of root row is a non-chat non-sim tile → wrap/append column under it
 * - Else → Js append column
 */
export function residualUr(layout: ResidualTileLayout, tileId: string): ResidualTileLayout {
  const ids = residualIr(layout);
  if (![...ids].some((id) => id !== "chat")) {
    return residualXs({
      direction: "row",
      children: [["chat", 2], tileId],
    });
  }
  const root = layout.root;
  const last: ResidualLayoutNode =
    root.kind === "stack" && root.direction === "row"
      ? root.children[root.children.length - 1]!
      : root;
  if (
    last.kind !== "tile"
    || last.tileId === "chat"
    || (residualIsSimulatorTileId(tileId) && residualIsSimulatorTileId(last.tileId))
  ) {
    return residualJs(layout, tileId);
  }
  // Wrap/append under last side tile into a column stack.
  const cloned = residualCloneLayoutNode(layout.root);
  const path = residualFindTilePath(cloned, last.tileId);
  const parent = path ? residualParentAtPath(cloned, path) : null;
  if (!path || !parent) return residualJs(layout, tileId);
  const nextTile: ResidualTileNode = { kind: "tile", tileId, flex: 1 };
  if (parent.direction === "column") {
    parent.children.push(nextTile);
  } else {
    const index = path[path.length - 1]!;
    const existing = parent.children[index]!;
    const column: ResidualStackNode = {
      kind: "stack",
      id: residualNewStackId(),
      direction: "column",
      flex: existing.flex,
      children: [existing, nextTile],
    };
    if (existing.kind === "tile") existing.flex = 1;
    else existing.flex = 1;
    parent.children[index] = column;
  }
  return { root: residualEnsureStackRoot(residualNormalizeLayoutNode(cloned)) };
}

/**
 * Residual restore strip on tileLayout (Nr.reset cross-session):
 *   Zs file, subagent, session; strip diff:*; Zs transcript;
 *   preview only if keepPreview; Zs framebuffer;
 *   ensure chat via Js if missing.
 */
export function residualStripRestoredTileLayout(
  layout: ResidualTileLayout,
  keepPreview: boolean,
): ResidualTileLayout {
  let next = residualZs(layout, "file");
  next = residualZs(next, "subagent");
  next = residualZs(next, "session");
  // Residual: strip every tileId that startsWith("diff:") (openDiffPane uses br → diff:…).
  // Product also uses bare "diff" as OfficialViewPane tile id — strip that too (same intent).
  for (const id of residualIr(next)) {
    if (id === "diff" || id.startsWith("diff:")) next = residualZs(next, id);
  }
  next = residualZs(next, "transcript");
  if (!keepPreview) next = residualZs(next, "preview");
  next = residualZs(next, "framebuffer");
  if (!residualIr(next).has("chat")) next = residualJs(next, "chat");
  return next;
}

/** Same-session reset strip: preview without server + framebuffer. */
export function residualSameSessionStripTileLayout(
  layout: ResidualTileLayout,
  hasPreviewServer: boolean,
): ResidualTileLayout {
  let next = layout;
  if (!hasPreviewServer && residualIr(next).has("preview")) {
    next = residualZs(next, "preview");
  }
  if (residualIr(next).has("framebuffer")) {
    next = residualZs(next, "framebuffer");
  }
  return next;
}

/** DFS non-chat tile ids (openViews membership / product sideTiles bridge). */
export function residualNonChatTileIds(layout: ResidualTileLayout): string[] {
  const out: string[] = [];
  const walk = (node: ResidualLayoutNode) => {
    if (node.kind === "tile") {
      if (node.tileId !== "chat") out.push(node.tileId);
      return;
    }
    node.children.forEach(walk);
  };
  walk(layout.root);
  return out;
}

export type ResidualSideColumn = {
  flex: number;
  /** Tile ids top→bottom in this side column. */
  tiles: string[];
};

/**
 * Product render bridge: side columns as residual row children after chat.
 * - row child tile (non-chat) → one column
 * - row child column-stack → flatten tiles
 * - nested row stacks flatten tiles in DFS (best-effort without full YI host)
 */
export function residualSideColumns(layout: ResidualTileLayout): ResidualSideColumn[] {
  const root = layout.root;
  if (root.kind === "tile") return [];

  const flattenTiles = (node: ResidualLayoutNode): string[] => {
    if (node.kind === "tile") return node.tileId === "chat" ? [] : [node.tileId];
    return node.children.flatMap(flattenTiles);
  };

  if (root.direction === "row") {
    const columns: ResidualSideColumn[] = [];
    for (const child of root.children) {
      if (child.kind === "tile") {
        if (child.tileId === "chat") continue;
        columns.push({ flex: child.flex, tiles: [child.tileId] });
        continue;
      }
      const tiles = flattenTiles(child);
      if (tiles.length > 0) columns.push({ flex: child.flex, tiles });
    }
    return columns;
  }

  const tiles = flattenTiles(root);
  return tiles.length > 0 ? [{ flex: root.flex, tiles }] : [];
}

/** Build layout by residual ur sequence from chat-only (migrate flat sideTiles[]). */
export function residualLayoutFromSideTiles(tiles: readonly string[]): ResidualTileLayout {
  let layout = residualChatOnlyLayout();
  for (const tile of tiles) {
    if (residualIr(layout).has(tile)) continue;
    layout = residualUr(layout, tile);
  }
  return layout;
}

/** Whether layout has any non-chat tile (hasSidePanes). */
export function residualHasSidePanes(layout: ResidualTileLayout): boolean {
  return residualNonChatTileIds(layout).length > 0;
}

/** Chat flex weight from root row child (default 2 when side open residual ur). */
export function residualChatFlex(layout: ResidualTileLayout): number {
  const root = layout.root;
  if (root.kind !== "stack" || root.direction !== "row") return 1;
  const chat = root.children.find((c) => c.kind === "tile" && c.tileId === "chat");
  return chat?.flex ?? 1;
}
