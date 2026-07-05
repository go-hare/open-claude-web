import { useSyncExternalStore } from "react";
import type { FrameMode } from "./frameStore";

export type PaneSlot = "tr" | "br" | "bl";
export type PaneSplitAxis = "col" | "row";

export type PaneRef = {
  kind: "code";
  id: string;
  title?: string | null;
};

export type PaneEntry = {
  ref: PaneRef;
  slot: PaneSlot;
};

export type PaneStoreState = {
  extraPanesByMode: Partial<Record<FrameMode, PaneEntry[]>>;
  focusedIndex: number;
  colSplit: number;
  rowSplit: number;
};

type PersistedPaneStore = {
  extraPanesByMode?: unknown;
  focusedIndex?: unknown;
  colSplit?: unknown;
  rowSplit?: unknown;
};

const PANE_STORE_KEY = "desktop-frame.paneStore.v1";
export const PANE_SLOTS: PaneSlot[] = ["tr", "br", "bl"];
export const PANE_SPLIT_BOUNDS = {
  MIN: 0.15,
  MAX: 0.85,
  DEFAULT: 0.5,
  MIN_PX: 320,
} as const;

const PANE_SWAP_TARGET: Partial<Record<PaneSlot, PaneSlot>> = {
  tr: "br",
  br: "tr",
};

const subscribers = new Set<() => void>();
let paneState: PaneStoreState = createInitialPaneState();

export const paneStore = {
  addPane,
  closePane,
  getState: () => paneState,
  movePane,
  openInPane,
  setFocusedIndex,
  setSplit,
  subscribe,
};

export function usePaneStoreSnapshot() {
  return useSyncExternalStore(subscribe, paneStore.getState, paneStore.getState);
}

export function paneRefKey(ref: PaneRef) {
  return `${ref.kind}:${ref.id}`;
}

export function paneRefFromPath(path: string, title?: string | null): PaneRef | null {
  const pathname = path.split("?")[0] ?? path;
  if (!pathname.startsWith("/epitaxy/")) return null;
  if (pathname.startsWith("/epitaxy/scheduled/") || pathname.startsWith("/epitaxy/tasks/") || pathname.startsWith("/epitaxy/pull-requests/")) {
    return null;
  }
  const id = decodeURIComponent(pathname.split("/").filter(Boolean).at(-1) ?? "");
  return id ? { kind: "code", id, title } : null;
}

export function paneRefToPath(ref: PaneRef) {
  return `/epitaxy/${encodeURIComponent(ref.id)}`;
}

function subscribe(callback: () => void) {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
}

function emit() {
  for (const subscriber of subscribers) subscriber();
}

function updatePaneState(updater: (state: PaneStoreState) => PaneStoreState) {
  const next = updater(paneState);
  if (next === paneState) return;
  paneState = next;
  persistPaneState(next);
  emit();
}

function addPane(mode: FrameMode, currentKey: string, ref: PaneRef, preferredSlot?: PaneSlot) {
  updatePaneState((state) => {
    if (!canSplitMode(mode)) return state;
    const panes = getPanes(state, mode);
    const existingIndex = findPaneIndex(panes, ref);
    if (existingIndex !== -1) return { ...state, focusedIndex: existingIndex + 1 };
    const slot = preferredSlot ?? findOpenSlot(panes) ?? panes.at(-1)?.slot;
    if (slot === undefined) return state;
    const slotIndex = panes.findIndex((pane) => pane.slot === slot);
    if (slotIndex !== -1) {
      const swapTarget = PANE_SWAP_TARGET[slot];
      const canMoveExisting = swapTarget && !panes.some((pane) => pane.slot === swapTarget);
      const nextPanes = panes.slice();
      if (swapTarget && canMoveExisting) {
        nextPanes[slotIndex] = { ...nextPanes[slotIndex], slot: swapTarget };
        nextPanes.push({ ref, slot });
        return withPanes(state, mode, nextPanes, nextPanes.length);
      }
      nextPanes[slotIndex] = { ref, slot };
      return withPanes(state, mode, nextPanes, slotIndex + 1);
    }
    const normalizedSlot = panes.length === 0 && slot === "br" ? "bl" : slot;
    const nextPanes = [...panes, { ref, slot: normalizedSlot }];
    return withPanes(state, mode, nextPanes, nextPanes.length);
  });
}

function openInPane(mode: FrameMode, currentKey: string, paneIndex: number, ref: PaneRef | null) {
  updatePaneState((state) => {
    if (paneIndex === 0) return { ...state, focusedIndex: 0 };
    if (!ref || !canSplitMode(mode)) return state;
    const targetIndex = paneIndex - 1;
    if (targetIndex >= 3) return state;
    const panes = getPanes(state, mode);
    const existingIndex = findPaneIndex(panes, ref);
    if (existingIndex !== -1 && existingIndex !== targetIndex) return { ...state, focusedIndex: existingIndex + 1 };
    if (targetIndex >= panes.length) return state;
    const nextPanes = panes.slice();
    nextPanes[targetIndex] = { ...nextPanes[targetIndex], ref };
    return withPanes(state, mode, nextPanes, paneIndex);
  });
}

function closePane(mode: FrameMode, paneIndex: number) {
  updatePaneState((state) => {
    const targetIndex = paneIndex - 1;
    const panes = getPanes(state, mode);
    if (targetIndex < 0 || targetIndex >= panes.length) return state;
    const removed = panes[targetIndex];
    const nextPanes = normalizeRemainingPanes(panes.filter((_, index) => index !== targetIndex), removed.slot);
    const focusedIndex = paneIndex < state.focusedIndex ? state.focusedIndex - 1 : Math.min(state.focusedIndex, nextPanes.length);
    return withPanes(state, mode, nextPanes, focusedIndex);
  });
}

function setFocusedIndex(mode: FrameMode, paneIndex: number) {
  updatePaneState((state) => {
    const focusedIndex = Math.max(0, Math.min(paneIndex, getPanes(state, mode).length));
    return focusedIndex === state.focusedIndex ? state : { ...state, focusedIndex };
  });
}

function movePane(mode: FrameMode, paneIndex: number, slot: PaneSlot) {
  updatePaneState((state) => {
    const targetIndex = paneIndex - 1;
    const panes = getPanes(state, mode);
    if (targetIndex < 0 || targetIndex >= panes.length) return state;
    if (panes[targetIndex].slot === slot) return state;
    if (panes.length === 1 && slot === "br") return state;
    const existingSlotIndex = panes.findIndex((pane) => pane.slot === slot);
    const nextPanes = panes.slice();
    if (existingSlotIndex !== -1) {
      const targetRef = nextPanes[targetIndex].ref;
      nextPanes[targetIndex] = { ...nextPanes[targetIndex], ref: nextPanes[existingSlotIndex].ref };
      nextPanes[existingSlotIndex] = { ...nextPanes[existingSlotIndex], ref: targetRef };
      return withPanes(state, mode, nextPanes, existingSlotIndex + 1);
    }
    nextPanes[targetIndex] = { ...nextPanes[targetIndex], slot };
    return withPanes(state, mode, nextPanes, paneIndex);
  });
}

function setSplit(axis: PaneSplitAxis, split: number) {
  updatePaneState((state) => {
    const nextSplit = Math.min(PANE_SPLIT_BOUNDS.MAX, Math.max(PANE_SPLIT_BOUNDS.MIN, split));
    return axis === "col" ? { ...state, colSplit: nextSplit } : { ...state, rowSplit: nextSplit };
  });
}

function canSplitMode(mode: FrameMode) {
  return mode === "code";
}

function getPanes(state: PaneStoreState, mode: FrameMode) {
  return state.extraPanesByMode[mode] ?? [];
}

function withPanes(state: PaneStoreState, mode: FrameMode, panes: PaneEntry[], focusedIndex: number): PaneStoreState {
  return {
    ...state,
    extraPanesByMode: {
      ...state.extraPanesByMode,
      [mode]: panes,
    },
    focusedIndex,
  };
}

function findPaneIndex(panes: PaneEntry[], ref: PaneRef) {
  const key = paneRefKey(ref);
  return panes.findIndex((pane) => paneRefKey(pane.ref) === key);
}

function findOpenSlot(panes: PaneEntry[]) {
  const occupied = new Set(panes.map((pane) => pane.slot));
  return PANE_SLOTS.find((slot) => !occupied.has(slot)) ?? null;
}

function normalizeRemainingPanes(panes: PaneEntry[], removedSlot: PaneSlot) {
  if (panes.length === 1 && panes[0].slot === "br" && removedSlot !== "br") {
    return [{ ...panes[0], slot: removedSlot }];
  }
  return panes;
}

function createInitialPaneState(): PaneStoreState {
  const persisted = readPersistedPaneState();
  return {
    extraPanesByMode: getPersistedPanes(persisted.extraPanesByMode),
    focusedIndex: 0,
    colSplit: getPersistedSplit(persisted.colSplit),
    rowSplit: getPersistedSplit(persisted.rowSplit),
  };
}

function readPersistedPaneState(): PersistedPaneStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(PANE_STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PersistedPaneStore & { state?: PersistedPaneStore };
    return parsed.state ?? parsed;
  } catch {
    return {};
  }
}

function persistPaneState(state: PaneStoreState) {
  if (typeof window === "undefined") return;
  const partial = {
    extraPanesByMode: state.extraPanesByMode,
    colSplit: state.colSplit,
    rowSplit: state.rowSplit,
  };
  window.localStorage.setItem(PANE_STORE_KEY, JSON.stringify({ state: partial, version: 1 }));
}

function getPersistedSplit(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(PANE_SPLIT_BOUNDS.MAX, Math.max(PANE_SPLIT_BOUNDS.MIN, value))
    : PANE_SPLIT_BOUNDS.DEFAULT;
}

function getPersistedPanes(value: unknown): PaneStoreState["extraPanesByMode"] {
  if (!value || typeof value !== "object") return {};
  const result: PaneStoreState["extraPanesByMode"] = {};
  for (const mode of ["cowork", "code"] as FrameMode[]) {
    const entries = (value as Partial<Record<FrameMode, unknown>>)[mode];
    if (!Array.isArray(entries)) continue;
    result[mode] = entries.filter(isPaneEntry).slice(0, 3);
  }
  return result;
}

function isPaneEntry(value: unknown): value is PaneEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<PaneEntry>;
  return Boolean(entry.ref && entry.ref.kind === "code" && typeof entry.ref.id === "string" && PANE_SLOTS.includes(entry.slot as PaneSlot));
}
