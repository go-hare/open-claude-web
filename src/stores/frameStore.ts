import { useSyncExternalStore } from "react";
import {
  assignToCustomGroupState,
  clampSidebarWidth,
  clearSessionSidebarMetaState,
  collapsedGroupsForMode,
  createInitialFrameState,
  deleteCustomGroupState,
  moveCustomGroupState,
  persistDFrameState,
  toggleGroupCollapsedState,
} from "./frameStoreHelpers";

export { SIDEBAR_WIDTH_BOUNDS } from "./frameStoreHelpers";

export type FrameMode = "cowork" | "code";
export type DFrameGroupBy = "none" | "date" | "project" | "state" | "environment" | "homespace" | "custom";
export type DFrameSortBy = "recency" | "alpha" | "created";
export type DFrameCustomGroup = { id: string; name: string };
export type DFrameGroupByByMode = Partial<Record<FrameMode, DFrameGroupBy>>;
export type DFrameSortByByMode = Partial<Record<FrameMode, DFrameSortBy>>;

export type FrameState = {
  mode: FrameMode;
  /**
   * Product delta: official H6t uses one global collapsedGroups[]; we store per mode
   * so cowork/code sidebar sections fold independently. Call sites still read
   * `collapsedGroups` (derived for current mode) via FrameStore.
   */
  collapsedGroupsByMode: Partial<Record<FrameMode, string[]>>;
  customGroupAssignments: Record<string, string>;
  customGroupOrder: Record<string, string[]>;
  customGroups: DFrameCustomGroup[];
  darkerCode: boolean;
  groupByByMode: DFrameGroupByByMode;
  navPinnedIds: string[] | null;
  /**
   * Official H6t `navHasCodeRoutinesByOrg` (shared-50). w2 `Kf`/`Yg` reads this
   * until CCD settles so Code Routines does not flash overflow on first paint.
   * Only `true` entries are kept (official merge filter `e===!0`).
   */
  navHasCodeRoutinesByOrg: Record<string, true>;
  pinnedOrder: string[];
  seenDragPinHint: boolean;
  sidebarCollapsed: boolean;
  sidebarHovering: boolean;
  sidebarResizing: boolean;
  sidebarWidth: number;
  showDragPinHint: boolean;
  sortByByMode: DFrameSortByByMode;
  systemFont: boolean;
  moreOpen: boolean;
  /** Official T1 NgcLgMejq0. Default false; S1 treats true as an active filter. */
  showEmptyGroups: boolean;
  /** Official Wz `Oy(Qc, !0)`. Default true. */
  showPrStatus: boolean;
};

export type FrameActions = {
  addCustomGroup: (name: string) => DFrameCustomGroup;
  assignToCustomGroup: (sessionKey: string, groupId: string | null, nextOrder?: string[]) => void;
  /** Drop pin + custom-group assignment/order for a deleted/archived session key. */
  clearSessionSidebarMeta: (sessionKey: string) => void;
  commitSidebarWidth: (width: number) => void;
  deleteCustomGroup: (id: string) => void;
  markDragPinHintSeen: () => void;
  maybeShowDragPinHint: () => void;
  moveCustomGroup: (id: string, index: number) => void;
  removeFromPinnedOrder: (id: string) => void;
  renameCustomGroup: (id: string, name: string) => void;
  setCustomGroupOrder: (id: string, order: string[]) => void;
  setDarkerCode: (enabled: boolean) => void;
  setGroupBy: (mode: FrameMode, groupBy: DFrameGroupBy) => void;
  setMode: (mode: FrameMode) => void;
  setMoreOpen: (open: boolean) => void;
  /** Official `setNavHasCodeRoutines(orgId, value)` — true writes, false deletes. */
  setNavHasCodeRoutines: (orgId: string, value: boolean) => void;
  setNavPinnedIds: (ids: string[] | null) => void;
  setPinnedOrder: (ids: string[]) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHovering: (hovering: boolean) => void;
  setSidebarResizing: (resizing: boolean) => void;
  setShowEmptyGroups: (enabled: boolean) => void;
  setShowPrStatus: (enabled: boolean) => void;
  setSortBy: (mode: FrameMode, sortBy: DFrameSortBy) => void;
  setSystemFont: (enabled: boolean) => void;
  toggleGroupCollapsed: (id: string) => void;
  toggleMore: () => void;
  toggleSidebar: () => void;
};

export type FrameStore = FrameState & FrameActions & {
  /** Current-mode collapsed section ids (product: mode-scoped; mirrors official key names). */
  collapsedGroups: string[];
};

/**
 * Official H6t (shared-50): module store, not useState inside DesktopFrame.
 * toggleCollapsed patches `collapsed` on the store; session tiles do not subscribe.
 * Product used to keep useState in DesktopFrame so Cmd+B rebuilt PaneLayout + Fu.
 */
const subscribers = new Set<() => void>();
let frameState: FrameState = createInitialFrameState();

function emitFrameStore() {
  for (const listener of subscribers) listener();
}

function patchFrameState(updater: (current: FrameState) => FrameState) {
  const next = updater(frameState);
  if (next === frameState) return;
  frameState = next;
  emitFrameStore();
}

const frameActions: FrameActions = {
  addCustomGroup: (name) => {
    const group = { id: `cg-${crypto.randomUUID()}`, name };
    patchFrameState((current) => {
      const customGroups = [...current.customGroups, group];
      persistDFrameState({ customGroups });
      return { ...current, customGroups };
    });
    return group;
  },
  assignToCustomGroup: (sessionKey, groupId, nextOrder) => {
    patchFrameState((current) => assignToCustomGroupState(current, sessionKey, groupId, nextOrder));
  },
  clearSessionSidebarMeta: (sessionKey) => {
    patchFrameState((current) => clearSessionSidebarMetaState(current, sessionKey));
  },
  commitSidebarWidth: (width) => {
    patchFrameState((current) => {
      const sidebarWidth = clampSidebarWidth(width);
      persistDFrameState({ sidebarWidth });
      return { ...current, sidebarWidth };
    });
  },
  deleteCustomGroup: (id) => {
    patchFrameState((current) => deleteCustomGroupState(current, id));
  },
  markDragPinHintSeen: () => {
    patchFrameState((current) => {
      persistDFrameState({ seenDragPinHint: true });
      return { ...current, seenDragPinHint: true, showDragPinHint: false };
    });
  },
  maybeShowDragPinHint: () => {
    patchFrameState((current) => (
      current.seenDragPinHint || current.sidebarCollapsed ? current : { ...current, showDragPinHint: true }
    ));
  },
  moveCustomGroup: (id, index) => {
    patchFrameState((current) => moveCustomGroupState(current, id, index));
  },
  removeFromPinnedOrder: (id) => {
    patchFrameState((current) => {
      if (!current.pinnedOrder.includes(id)) return current;
      const pinnedOrder = current.pinnedOrder.filter((item) => item !== id);
      persistDFrameState({ pinnedOrder });
      return { ...current, pinnedOrder };
    });
  },
  renameCustomGroup: (id, name) => {
    patchFrameState((current) => {
      const customGroups = current.customGroups.map((group) => group.id === id ? { ...group, name } : group);
      persistDFrameState({ customGroups });
      return { ...current, customGroups };
    });
  },
  setCustomGroupOrder: (id, order) => {
    patchFrameState((current) => {
      const customGroupOrder = { ...current.customGroupOrder, [id]: order };
      persistDFrameState({ customGroupOrder });
      return { ...current, customGroupOrder };
    });
  },
  setDarkerCode: (darkerCode) => {
    patchFrameState((current) => {
      persistDFrameState({ darkerCode });
      return { ...current, darkerCode };
    });
  },
  setGroupBy: (mode, groupBy) => {
    patchFrameState((current) => {
      const groupByByMode = { ...current.groupByByMode, [mode]: groupBy };
      persistDFrameState({ groupByByMode });
      return { ...current, groupByByMode };
    });
  },
  setMode: (mode) => {
    patchFrameState((current) => {
      persistDFrameState({ mode });
      return { ...current, mode, moreOpen: false, showDragPinHint: false };
    });
  },
  setMoreOpen: (moreOpen) => {
    patchFrameState((current) => (current.moreOpen === moreOpen ? current : { ...current, moreOpen }));
  },
  setNavHasCodeRoutines: (orgId, value) => {
    patchFrameState((current) => {
      const prev = current.navHasCodeRoutinesByOrg[orgId] === true;
      if (prev === value) return current;
      const navHasCodeRoutinesByOrg = { ...current.navHasCodeRoutinesByOrg };
      if (value) navHasCodeRoutinesByOrg[orgId] = true;
      else delete navHasCodeRoutinesByOrg[orgId];
      persistDFrameState({ navHasCodeRoutinesByOrg });
      return { ...current, navHasCodeRoutinesByOrg };
    });
  },
  setNavPinnedIds: (navPinnedIds) => {
    patchFrameState((current) => {
      persistDFrameState({ navPinnedIds });
      return { ...current, navPinnedIds };
    });
  },
  setPinnedOrder: (pinnedOrder) => {
    patchFrameState((current) => {
      persistDFrameState({ pinnedOrder });
      return { ...current, pinnedOrder };
    });
  },
  setSidebarCollapsed: (sidebarCollapsed) => {
    patchFrameState((current) => {
      persistDFrameState({ collapsed: sidebarCollapsed });
      return { ...current, sidebarCollapsed, moreOpen: false, showDragPinHint: false, sidebarHovering: false };
    });
  },
  setSidebarHovering: (sidebarHovering) => {
    patchFrameState((current) => (
      current.sidebarHovering === sidebarHovering
        ? current
        : { ...current, sidebarHovering, showDragPinHint: sidebarHovering ? current.showDragPinHint : false }
    ));
  },
  setSidebarResizing: (sidebarResizing) => {
    patchFrameState((current) => (
      current.sidebarResizing === sidebarResizing ? current : { ...current, sidebarResizing }
    ));
  },
  setShowEmptyGroups: (showEmptyGroups) => {
    patchFrameState((current) => {
      persistDFrameState({ showEmptyGroups });
      return { ...current, showEmptyGroups };
    });
  },
  setShowPrStatus: (showPrStatus) => {
    patchFrameState((current) => {
      persistDFrameState({ showPrStatus });
      return { ...current, showPrStatus };
    });
  },
  setSortBy: (mode, sortBy) => {
    patchFrameState((current) => {
      const sortByByMode = { ...current.sortByByMode, [mode]: sortBy };
      persistDFrameState({ sortByByMode });
      return { ...current, sortByByMode };
    });
  },
  setSystemFont: (systemFont) => {
    patchFrameState((current) => {
      persistDFrameState({ systemFont });
      return { ...current, systemFont };
    });
  },
  toggleGroupCollapsed: (id) => {
    patchFrameState((current) => toggleGroupCollapsedState(current, id));
  },
  toggleMore: () => {
    patchFrameState((current) => ({ ...current, moreOpen: !current.moreOpen }));
  },
  toggleSidebar: () => {
    patchFrameState((current) => {
      const sidebarCollapsed = !current.sidebarCollapsed;
      persistDFrameState({ collapsed: sidebarCollapsed });
      return { ...current, sidebarCollapsed, moreOpen: false, showDragPinHint: false, sidebarHovering: false };
    });
  },
};

function subscribeFrameStore(onStoreChange: () => void) {
  subscribers.add(onStoreChange);
  return () => {
    subscribers.delete(onStoreChange);
  };
}

function getFrameState() {
  return frameState;
}

function toFrameStore(state: FrameState): FrameStore {
  return {
    ...state,
    collapsedGroups: collapsedGroupsForMode(state.collapsedGroupsByMode, state.mode),
    ...frameActions,
  };
}

export const frameStore = {
  getState: getFrameState,
  subscribe: subscribeFrameStore,
  ...frameActions,
};

export function useFrameStore(): FrameStore {
  const state = useSyncExternalStore(subscribeFrameStore, getFrameState, getFrameState);
  return toFrameStore(state);
}

/** Official H6t selector: session tiles must not subscribe to collapsed. */
export function useFrameStoreSelector<T>(selector: (state: FrameState) => T): T {
  return useSyncExternalStore(
    subscribeFrameStore,
    () => selector(frameState),
    () => selector(frameState),
  );
}
