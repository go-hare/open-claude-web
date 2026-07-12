import { useMemo, useState } from "react";
import {
  assignToCustomGroupState,
  clampSidebarWidth,
  createInitialFrameState,
  deleteCustomGroupState,
  moveCustomGroupState,
  persistDFrameState,
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
  collapsedGroups: string[];
  customGroupAssignments: Record<string, string>;
  customGroupOrder: Record<string, string[]>;
  customGroups: DFrameCustomGroup[];
  darkerCode: boolean;
  groupByByMode: DFrameGroupByByMode;
  navPinnedIds: string[] | null;
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
};

export type FrameActions = {
  addCustomGroup: (name: string) => DFrameCustomGroup;
  assignToCustomGroup: (sessionKey: string, groupId: string | null, nextOrder?: string[]) => void;
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
  setNavPinnedIds: (ids: string[] | null) => void;
  setPinnedOrder: (ids: string[]) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setSidebarHovering: (hovering: boolean) => void;
  setSidebarResizing: (resizing: boolean) => void;
  setSortBy: (mode: FrameMode, sortBy: DFrameSortBy) => void;
  setSystemFont: (enabled: boolean) => void;
  toggleGroupCollapsed: (id: string) => void;
  toggleMore: () => void;
  toggleSidebar: () => void;
};

export type FrameStore = FrameState & FrameActions;

export function useFrameStore(): FrameStore {
  const [state, setState] = useState<FrameState>(createInitialFrameState);

  return useMemo(() => ({
    ...state,
    addCustomGroup: (name) => {
      const group = { id: `cg-${crypto.randomUUID()}`, name };
      setState((current) => {
        const customGroups = [...current.customGroups, group];
        persistDFrameState({ customGroups });
        return { ...current, customGroups };
      });
      return group;
    },
    assignToCustomGroup: (sessionKey, groupId, nextOrder) => setState((current) => assignToCustomGroupState(current, sessionKey, groupId, nextOrder)),
    commitSidebarWidth: (width) => setState((current) => {
      const sidebarWidth = clampSidebarWidth(width);
      persistDFrameState({ sidebarWidth });
      return { ...current, sidebarWidth };
    }),
    deleteCustomGroup: (id) => setState((current) => deleteCustomGroupState(current, id)),
    markDragPinHintSeen: () => setState((current) => {
      persistDFrameState({ seenDragPinHint: true });
      return { ...current, seenDragPinHint: true, showDragPinHint: false };
    }),
    maybeShowDragPinHint: () => setState((current) => (current.seenDragPinHint || current.sidebarCollapsed ? current : { ...current, showDragPinHint: true })),
    moveCustomGroup: (id, index) => setState((current) => moveCustomGroupState(current, id, index)),
    removeFromPinnedOrder: (id) => setState((current) => {
      if (!current.pinnedOrder.includes(id)) return current;
      const pinnedOrder = current.pinnedOrder.filter((item) => item !== id);
      persistDFrameState({ pinnedOrder });
      return { ...current, pinnedOrder };
    }),
    renameCustomGroup: (id, name) => setState((current) => {
      const customGroups = current.customGroups.map((group) => group.id === id ? { ...group, name } : group);
      persistDFrameState({ customGroups });
      return { ...current, customGroups };
    }),
    setCustomGroupOrder: (id, order) => setState((current) => {
      const customGroupOrder = { ...current.customGroupOrder, [id]: order };
      persistDFrameState({ customGroupOrder });
      return { ...current, customGroupOrder };
    }),
    setDarkerCode: (darkerCode) => setState((current) => {
      persistDFrameState({ darkerCode });
      return { ...current, darkerCode };
    }),
    setGroupBy: (mode, groupBy) => setState((current) => {
      const groupByByMode = { ...current.groupByByMode, [mode]: groupBy };
      persistDFrameState({ groupByByMode });
      return { ...current, groupByByMode };
    }),
    setMode: (mode) => setState((current) => ({ ...current, mode, moreOpen: false, showDragPinHint: false })),
    setMoreOpen: (moreOpen) => setState((current) => ({ ...current, moreOpen })),
    setNavPinnedIds: (navPinnedIds) => setState((current) => {
      persistDFrameState({ navPinnedIds });
      return { ...current, navPinnedIds };
    }),
    setPinnedOrder: (pinnedOrder) => setState((current) => {
      persistDFrameState({ pinnedOrder });
      return { ...current, pinnedOrder };
    }),
    setSidebarCollapsed: (sidebarCollapsed) => setState((current) => {
      persistDFrameState({ collapsed: sidebarCollapsed });
      return { ...current, sidebarCollapsed, moreOpen: false, showDragPinHint: false, sidebarHovering: false };
    }),
    setSidebarHovering: (sidebarHovering) => setState((current) => ({ ...current, sidebarHovering, showDragPinHint: sidebarHovering ? current.showDragPinHint : false })),
    setSidebarResizing: (sidebarResizing) => setState((current) => ({ ...current, sidebarResizing })),
    setSortBy: (mode, sortBy) => setState((current) => {
      const sortByByMode = { ...current.sortByByMode, [mode]: sortBy };
      persistDFrameState({ sortByByMode });
      return { ...current, sortByByMode };
    }),
    setSystemFont: (systemFont) => setState((current) => {
      persistDFrameState({ systemFont });
      return { ...current, systemFont };
    }),
    toggleGroupCollapsed: (id) => setState((current) => {
      const collapsedGroups = current.collapsedGroups.includes(id)
        ? current.collapsedGroups.filter((item) => item !== id)
        : [...current.collapsedGroups, id];
      persistDFrameState({ collapsedGroups });
      return { ...current, collapsedGroups };
    }),
    toggleMore: () => setState((current) => ({ ...current, moreOpen: !current.moreOpen })),
    toggleSidebar: () => setState((current) => {
      const sidebarCollapsed = !current.sidebarCollapsed;
      persistDFrameState({ collapsed: sidebarCollapsed });
      return { ...current, sidebarCollapsed, moreOpen: false, showDragPinHint: false, sidebarHovering: false };
    }),
  }), [state]);
}
