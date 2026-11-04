/**
 * Official shared-19 session-row drag → shared-23 `qQ` pane drop overlay.
 *
 * Residual:
 *   `SY` clone of `[data-row-key]` as `rowGhost`
 *   `LY` follows pointer (`xY`) — clone fades, label `8IBKnZa76A` when paneIntent
 *   `PM` toggles `.dframe-root[data-session-dragging]` (shared-22)
 *   drop `B.addPane(..., slot, "drag")`
 */
import type { PaneRef, PaneSlot } from "../stores/paneStore";
import { PANE_SPLIT_BOUNDS } from "../stores/paneStore";

export const SESSION_DRAG_MIME = "application/x-dframe-session-key";

export type SessionRowGhost = {
  clone: HTMLElement;
  h: number;
  w: number;
  dx: number;
  dy: number;
  portal: HTMLElement | null;
};

type DragSnapshot = {
  dragging: boolean;
  ghost: SessionRowGhost | null;
  cursor: { x: number; y: number };
  paneOver: boolean;
};

const subscribers = new Set<() => void>();
let snapshot: DragSnapshot = {
  dragging: false,
  ghost: null,
  cursor: { x: -1000, y: -1000 },
  paneOver: false,
};

/** Official DY `rJ`. */
const POINTER_DRAG_THRESHOLD = 4;

let consumeNextClick = false;
let pointerCleanup: (() => void) | null = null;

function emit() {
  for (const subscriber of subscribers) subscriber();
}

function setSnapshot(next: DragSnapshot) {
  snapshot = next;
  emit();
}

export function subscribeSessionDragging(subscriber: () => void) {
  subscribers.add(subscriber);
  subscriber();
  return () => subscribers.delete(subscriber);
}

export function getSessionDragSnapshot() {
  return snapshot;
}

export function isSessionDragging() {
  return snapshot.dragging;
}

/** Official SY — clone the row, strip identity attrs, copy indent tokens. */
export function cloneSessionRowGhost(row: HTMLElement): HTMLElement {
  const clone = row.cloneNode(true) as HTMLElement;
  const nodes = [clone, ...clone.querySelectorAll("[data-row-key], [data-jump-hint-row], [id], .df-drag-shiftable")];
  for (const node of nodes) {
    if (!(node instanceof HTMLElement)) continue;
    node.removeAttribute("data-row-key");
    node.removeAttribute("data-jump-hint-row");
    node.removeAttribute("id");
    node.classList.remove("df-drag-shiftable");
  }
  clone.removeAttribute("style");
  const computed = getComputedStyle(row);
  for (const token of ["--df-row-indent", "--df-described-trim"]) {
    clone.style.setProperty(token, computed.getPropertyValue(token));
  }
  clone.style.paddingLeft = computed.paddingLeft;
  clone.setAttribute("inert", "");
  return clone;
}

function beginFromRow(row: HTMLElement, clientX: number, clientY: number) {
  const rect = row.getBoundingClientRect();
  const rowH = parseFloat(getComputedStyle(row).getPropertyValue("--df-row-h") || "") || rect.height;
  const height = Math.min(rect.height, rowH);
  const root = document.querySelector(".dframe-root") as HTMLElement | null;
  const ghost: SessionRowGhost = {
    clone: cloneSessionRowGhost(row),
    h: height,
    w: rect.width,
    dx: Math.min(Math.max(clientX - rect.left, 4), rect.width - 4),
    dy: Math.min(Math.max(clientY - rect.top, 2), height - 2),
    portal: root,
  };
  root?.toggleAttribute("data-session-dragging", true);
  document.documentElement.classList.add("dframe-session-dragging");
  document.body.style.userSelect = "none";
  setSnapshot({
    dragging: true,
    ghost,
    cursor: { x: clientX, y: clientY },
    paneOver: false,
  });
}

function isPointerDragIgnored(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("[data-row-action], a, input, textarea, [contenteditable='true']"));
}

/**
 * Official DY pointer drag on `[data-row-key]`.
 * Threshold `rJ=4`, then `showCursor("grabbing")` + `SY` ghost. Not HTML5 `draggable`.
 */
export function onSessionRowPointerDown(event: { button: number; pointerId: number; clientX: number; clientY: number; currentTarget: EventTarget | null; target: EventTarget | null; preventDefault?: () => void }, key: string) {
  if (event.button !== 0) return;
  if (isPointerDragIgnored(event.target)) return;
  const row = (event.currentTarget as HTMLElement | null)?.closest("[data-row-key]") as HTMLElement | null;
  if (!row) return;
  const pointerId = event.pointerId;
  const startX = event.clientX;
  const startY = event.clientY;
  let started = false;
  pointerCleanup?.();
  const onMove = (move: PointerEvent) => {
    if (move.pointerId !== pointerId) return;
    if (!started) {
      if (Math.abs(move.clientX - startX) < POINTER_DRAG_THRESHOLD && Math.abs(move.clientY - startY) < POINTER_DRAG_THRESHOLD) return;
      started = true;
      beginFromRow(row, move.clientX, move.clientY);
    }
    moveSessionDrag(move.clientX, move.clientY, snapshot.paneOver);
  };
  const onUp = (up: PointerEvent) => {
    if (up.pointerId !== pointerId) return;
    cleanup();
    if (!started) return;
    consumeNextClick = true;
    window.dispatchEvent(new CustomEvent("dframe:session-drag-end", {
      detail: { key, x: up.clientX, y: up.clientY },
    }));
    endSessionDrag();
  };
  const cleanup = () => {
    document.removeEventListener("pointermove", onMove);
    document.removeEventListener("pointerup", onUp);
    document.removeEventListener("pointercancel", onUp);
    pointerCleanup = null;
  };
  pointerCleanup = cleanup;
  document.addEventListener("pointermove", onMove);
  document.addEventListener("pointerup", onUp);
  document.addEventListener("pointercancel", onUp);
}

export function consumeSessionRowDragClick() {
  if (!consumeNextClick) return false;
  consumeNextClick = false;
  return true;
}

export function beginSessionDrag(event: DragEvent, key: string) {
  const row = (event.currentTarget as HTMLElement | null)?.closest("[data-row-key]") as HTMLElement | null;
  if (row) beginFromRow(row, event.clientX, event.clientY);
  void key;
}

export function moveSessionDrag(clientX: number, clientY: number, paneOver: boolean) {
  if (!snapshot.dragging) return;
  if (
    snapshot.cursor.x === clientX
    && snapshot.cursor.y === clientY
    && snapshot.paneOver === paneOver
  ) return;
  setSnapshot({
    ...snapshot,
    cursor: { x: clientX, y: clientY },
    paneOver,
  });
}

export function setSessionDragPaneOver(paneOver: boolean) {
  if (!snapshot.dragging || snapshot.paneOver === paneOver) return;
  setSnapshot({ ...snapshot, paneOver });
}

export function endSessionDrag() {
  document.querySelector(".dframe-root")?.toggleAttribute("data-session-dragging", false);
  document.documentElement.classList.remove("dframe-session-dragging");
  document.body.style.userSelect = "";
  pointerCleanup?.();
  pointerCleanup = null;
  setSnapshot({
    dragging: false,
    ghost: null,
    cursor: { x: -1000, y: -1000 },
    paneOver: false,
  });
}

export function hasSessionDrag(event: { dataTransfer: DataTransfer | null }) {
  const types = event.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).some((type) => type === SESSION_DRAG_MIME || type === "text/plain");
}

export function writeSessionDragKey(event: DragEvent, key: string) {
  event.dataTransfer?.setData(SESSION_DRAG_MIME, key);
  event.dataTransfer?.setData("text/plain", key);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = "copyMove";
  beginSessionDrag(event, key);
}

export function readSessionDragKey(event: DragEvent) {
  return event.dataTransfer?.getData(SESSION_DRAG_MIME) || event.dataTransfer?.getData("text/plain") || "";
}

export function paneRefFromSessionKey(key: string): PaneRef | null {
  const colon = key.indexOf(":");
  if (colon <= 0) return null;
  const kind = key.slice(0, colon);
  const id = key.slice(colon + 1);
  if (!id) return null;
  if (kind === "code") return { kind: "code", id };
  if (kind === "cowork" || kind === "epitaxy") return { kind: "cowork", id };
  return null;
}

export type PaneDropIntent = {
  slot: PaneSlot;
  /** Official `pc` — pointer is in the target cell (`data-over`). Else `data-hint`. */
  over: boolean;
};

/** Official `UQ`. */
const DROP_INSET_PX = 8;
const DROP_ROW_VAR = "var(--df-pane-row, 0.5)";

type DropCell = { col: number; row: 0 | 1 };
type DropEdge = "full" | "top" | "bottom";

/** Official `KQ`. */
function officialDropBox(leftPct: number, widthPct: number, edge: DropEdge) {
  return {
    left: `calc(${leftPct}% + ${DROP_INSET_PX}px)`,
    width: `calc(${widthPct}% - 16px)`,
    top: edge === "bottom" ? `calc(${DROP_ROW_VAR} * 100% + ${DROP_INSET_PX}px)` : DROP_INSET_PX,
    height: edge === "full"
      ? "calc(100% - 16px)"
      : edge === "top"
        ? `calc(${DROP_ROW_VAR} * 100% - 16px)`
        : `calc((1 - ${DROP_ROW_VAR}) * 100% - 16px)`,
    right: "auto",
    bottom: "auto",
  };
}

/**
 * Official `GQ(cell, weights, splitColumn)`.
 * Unsplit right-half Split view is `col >= weights.length` → 50% new column.
 */
export function officialDropBadgeStyle(cell: DropCell, weights: number[], splitColumn: boolean) {
  const columns = weights.length;
  if (cell.col >= columns) {
    const width = 100 / (columns + 1);
    return officialDropBox(100 - width, width, "full");
  }
  if (cell.col < 0) return officialDropBox(0, 100 / (columns + 1), "full");
  let total = 0;
  let before = 0;
  for (let index = 0; index < columns; index++) {
    if (index < cell.col) before += weights[index];
    total += weights[index];
  }
  const sum = Math.max(1, total);
  const left = before / sum * 100;
  const width = weights[cell.col] / sum * 100;
  if (cell.row === 1) return officialDropBox(left, width, "bottom");
  return officialDropBox(left, width, splitColumn ? "top" : "full");
}

export function dropCellForSlot(slot: PaneSlot, hasSplit: boolean): DropCell {
  if (!hasSplit) return { col: 1, row: 0 };
  if (slot === "bl") return { col: 0, row: 1 };
  if (slot === "br") return { col: 1, row: 1 };
  return { col: 1, row: 0 };
}

export function dropColumnWeights(hasSplit: boolean, colSplit: number): number[] {
  if (!hasSplit) return [1];
  const left = Number.isFinite(colSplit) ? colSplit : PANE_SPLIT_BOUNDS.DEFAULT;
  return [left, 1 - left];
}

/**
 * Official xJ / product paneIntentFromPoint, for HTML5 session drag over `.dframe-pane-host`.
 * Unsplit: right half → `tr` (crop Split view). Split: existing 2×2 cells.
 */
export function paneDropIntentFromPoint(
  host: HTMLElement,
  clientX: number,
  clientY: number,
  hasSplit: boolean,
): PaneDropIntent | null {
  const rect = host.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const col = parseFloat(getComputedStyle(host).getPropertyValue("--df-pane-col"));
  const row = parseFloat(getComputedStyle(host).getPropertyValue("--df-pane-row"));
  const colSplit = Number.isFinite(col) ? col : PANE_SPLIT_BOUNDS.DEFAULT;
  const rowSplit = Number.isFinite(row) ? row : PANE_SPLIT_BOUNDS.DEFAULT;
  const right = clientX > rect.left + rect.width * colSplit;
  const bottom = clientY > rect.top + rect.height * rowSplit;
  if (!hasSplit) {
    return { slot: "tr", over: right };
  }
  if (right && bottom) return { slot: "br", over: true };
  if (right) return { slot: "tr", over: true };
  if (bottom) return { slot: "bl", over: true };
  return { slot: "tr", over: false };
}
