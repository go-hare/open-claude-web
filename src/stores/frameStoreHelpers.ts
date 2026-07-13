import type { DFrameCustomGroup, DFrameGroupBy, DFrameSortBy, FrameMode, FrameState } from "./frameStore";

export const SIDEBAR_WIDTH_BOUNDS = { MIN: 200, MAX: 420 } as const;
const DEFAULT_SIDEBAR_WIDTH = 280;
const DFRAME_STORE_KEY = "dframe-store";
const GROUP_BY_VALUES = ["none", "date", "project", "state", "environment", "homespace", "custom"] as const;
const SORT_BY_VALUES = ["recency", "alpha", "created"] as const;
const FRAME_MODE_VALUES = ["cowork", "code"] as const;

type PersistedDFrameState = {
  collapsed?: unknown; collapsedGroups?: unknown; customGroupAssignments?: unknown; customGroupOrder?: unknown; customGroups?: unknown;
  darkerCode?: unknown; groupByByMode?: unknown; mode?: unknown; navPinnedIds?: unknown; pinnedOrder?: unknown; seenDragPinHint?: unknown;
  sidebarWidth?: unknown; sortByByMode?: unknown; systemFont?: unknown;
};

export function clampSidebarWidth(width: number): number {
  return Math.min(SIDEBAR_WIDTH_BOUNDS.MAX, Math.max(SIDEBAR_WIDTH_BOUNDS.MIN, width));
}

export function persistDFrameState(partial: PersistedDFrameState) {
  if (typeof window === "undefined") return;
  try {
    const rawStore = window.localStorage.getItem(DFRAME_STORE_KEY);
    const parsed = rawStore ? JSON.parse(rawStore) as { state?: Record<string, unknown>; version?: number } : {};
    window.localStorage.setItem(DFRAME_STORE_KEY, JSON.stringify({ ...parsed, state: { ...(parsed.state ?? {}), ...partial }, version: parsed.version ?? 0 }));
  } catch {
    window.localStorage.setItem(DFRAME_STORE_KEY, JSON.stringify({ state: partial, version: 0 }));
  }
}

/** Official H6t mode read for standalone routes (e.g. /customize back target). */
export function readPersistedFrameMode(): FrameMode {
  const mode = readPersistedDFrameState().mode;
  return mode === "cowork" || mode === "code" ? mode : "code";
}

export function createInitialFrameState(): FrameState {
  const persisted = readPersistedDFrameState();
  return {
    mode: readPersistedFrameMode(),
    collapsedGroups: getStringArray(persisted.collapsedGroups),
    customGroupAssignments: getStringRecord(persisted.customGroupAssignments),
    customGroupOrder: getStringArrayRecord(persisted.customGroupOrder),
    customGroups: getCustomGroups(persisted.customGroups),
    darkerCode: getBoolean(persisted.darkerCode),
    groupByByMode: getEnumByMode<DFrameGroupBy>(persisted.groupByByMode, GROUP_BY_VALUES),
    navPinnedIds: getNavPinnedIds(persisted.navPinnedIds),
    pinnedOrder: getStringArray(persisted.pinnedOrder),
    seenDragPinHint: getBoolean(persisted.seenDragPinHint),
    sidebarCollapsed: getBoolean(persisted.collapsed),
    sidebarHovering: false,
    sidebarResizing: false,
    sidebarWidth: typeof persisted.sidebarWidth === "number" ? clampSidebarWidth(persisted.sidebarWidth) : DEFAULT_SIDEBAR_WIDTH,
    showDragPinHint: false,
    sortByByMode: getEnumByMode<DFrameSortBy>(persisted.sortByByMode, SORT_BY_VALUES),
    systemFont: getBoolean(persisted.systemFont),
    moreOpen: false,
  };
}

export function assignToCustomGroupState(current: FrameState, sessionKey: string, groupId: string | null, nextOrder?: string[]): FrameState {
  const previous = current.customGroupAssignments[sessionKey] ?? null;
  const customGroupAssignments = { ...current.customGroupAssignments };
  const customGroupOrder = { ...current.customGroupOrder };
  if (groupId === null) delete customGroupAssignments[sessionKey];
  else customGroupAssignments[sessionKey] = groupId;
  if (previous && previous !== groupId) customGroupOrder[previous] = (customGroupOrder[previous] ?? []).filter((item) => item !== sessionKey);
  if (groupId !== null) {
    const currentOrder = (customGroupOrder[groupId] ?? []).filter((item) => item !== sessionKey);
    customGroupOrder[groupId] = nextOrder ? [...nextOrder, ...currentOrder.filter((item) => !nextOrder.includes(item))] : [...currentOrder, sessionKey];
  }
  persistDFrameState({ customGroupAssignments, customGroupOrder });
  return { ...current, customGroupAssignments, customGroupOrder };
}

export function deleteCustomGroupState(current: FrameState, id: string): FrameState {
  const customGroupAssignments = Object.fromEntries(Object.entries(current.customGroupAssignments).filter(([, groupId]) => groupId !== id));
  const { [id]: _deleted, ...customGroupOrder } = current.customGroupOrder;
  const customGroups = current.customGroups.filter((group) => group.id !== id);
  const collapsedGroups = current.collapsedGroups.filter((item) => item !== `custom-${id}`);
  persistDFrameState({ collapsedGroups, customGroupAssignments, customGroupOrder, customGroups });
  return { ...current, collapsedGroups, customGroupAssignments, customGroupOrder, customGroups };
}

export function moveCustomGroupState(current: FrameState, id: string, index: number): FrameState {
  const from = current.customGroups.findIndex((group) => group.id === id);
  if (from < 0 || from === index) return current;
  const customGroups = [...current.customGroups];
  const [group] = customGroups.splice(from, 1);
  customGroups.splice(Math.max(0, Math.min(index, customGroups.length)), 0, group);
  persistDFrameState({ customGroups });
  return { ...current, customGroups };
}

function readPersistedDFrameState(): PersistedDFrameState {
  if (typeof window === "undefined") return {};
  try {
    const rawStore = window.localStorage.getItem(DFRAME_STORE_KEY);
    if (!rawStore) return {};
    const parsed = JSON.parse(rawStore) as PersistedDFrameState & { state?: PersistedDFrameState };
    return parsed.state ?? parsed;
  } catch { return {}; }
}

function getBoolean(value: unknown) { return typeof value === "boolean" ? value : false; }
function getStringArray(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []; }
function getNavPinnedIds(value: unknown): string[] | null { return value === null || !Array.isArray(value) ? null : getStringArray(value); }
function getCustomGroups(value: unknown): DFrameCustomGroup[] {
  return Array.isArray(value) ? value.filter((item): item is DFrameCustomGroup => Boolean(item) && typeof item.id === "string" && typeof item.name === "string") : [];
}
function getStringRecord(value: unknown): Record<string, string> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string")) : {};
}
function getStringArrayRecord(value: unknown): Record<string, string[]> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, getStringArray(item)]).filter(([, item]) => item.length > 0)) : {};
}
function getEnumByMode<T extends string>(value: unknown, allowed: readonly T[]) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const modes = new Set<string>(FRAME_MODE_VALUES);
  const options = new Set<string>(allowed);
  return Object.fromEntries(Object.entries(value).filter(([mode, option]) => modes.has(mode) && typeof option === "string" && options.has(option))) as Partial<Record<FrameMode, T>>;
}
