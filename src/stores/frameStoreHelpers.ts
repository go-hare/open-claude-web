import type { DFrameCustomGroup, DFrameGroupBy, DFrameSortBy, FrameMode, FrameState } from "./frameStore";

export const SIDEBAR_WIDTH_BOUNDS = { MIN: 200, MAX: 420 } as const;
const DEFAULT_SIDEBAR_WIDTH = 280;
const DFRAME_STORE_KEY = "dframe-store";
const GROUP_BY_VALUES = ["none", "date", "project", "state", "environment", "homespace", "custom"] as const;
const SORT_BY_VALUES = ["recency", "alpha", "created"] as const;
const FRAME_MODE_VALUES = ["cowork", "code"] as const;

type PersistedDFrameState = {
  collapsed?: unknown;
  /** Legacy flat list (pre mode-split). Migrated into collapsedGroupsByMode once. */
  collapsedGroups?: unknown;
  /**
   * Product delta vs official H6t: official keeps one global collapsedGroups array
   * shared across modes. We split by mode so cowork/code recents|pinned|… fold independently.
   */
  collapsedGroupsByMode?: unknown;
  customGroupAssignments?: unknown; customGroupOrder?: unknown; customGroups?: unknown;
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
  const collapsedGroupsByMode = readCollapsedGroupsByMode(persisted);
  return {
    mode: readPersistedFrameMode(),
    collapsedGroupsByMode,
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

/** Current-mode collapsed group ids (call sites keep using frame.collapsedGroups). */
export function collapsedGroupsForMode(
  byMode: Partial<Record<FrameMode, string[]>>,
  mode: FrameMode,
): string[] {
  return byMode[mode] ?? [];
}

export function toggleGroupCollapsedState(
  current: FrameState,
  id: string,
): FrameState {
  const mode = current.mode;
  const prev = current.collapsedGroupsByMode[mode] ?? [];
  const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
  const collapsedGroupsByMode = { ...current.collapsedGroupsByMode, [mode]: next };
  persistDFrameState({ collapsedGroupsByMode });
  return { ...current, collapsedGroupsByMode };
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

/**
 * Official residual after session delete/archive: drop pin + custom-group assignment/order
 * for a session key so sidebar meta does not keep orphan keys.
 * Also drops legacy `epitaxy:${id}` when clearing `cowork:${id}` (and reverse) so the
 * shared pinnedOrder migration does not leave ghosts.
 */
export function clearSessionSidebarMetaState(current: FrameState, sessionKey: string): FrameState {
  if (!sessionKey) return current;
  const dropKeys = sessionSidebarMetaKeyAliases(sessionKey);
  const pinnedOrder = current.pinnedOrder.some((item) => dropKeys.has(item))
    ? current.pinnedOrder.filter((item) => !dropKeys.has(item))
    : current.pinnedOrder;
  const hadAssignment = Object.keys(current.customGroupAssignments).some((key) => dropKeys.has(key));
  const customGroupAssignments = hadAssignment
    ? Object.fromEntries(Object.entries(current.customGroupAssignments).filter(([key]) => !dropKeys.has(key)))
    : current.customGroupAssignments;
  let orderChanged = false;
  const customGroupOrder: Record<string, string[]> = {};
  for (const [groupId, order] of Object.entries(current.customGroupOrder)) {
    if (!order.some((item) => dropKeys.has(item))) {
      customGroupOrder[groupId] = order;
      continue;
    }
    orderChanged = true;
    const next = order.filter((item) => !dropKeys.has(item));
    if (next.length > 0) customGroupOrder[groupId] = next;
  }
  if (pinnedOrder === current.pinnedOrder && !hadAssignment && !orderChanged) return current;
  persistDFrameState({ pinnedOrder, customGroupAssignments, customGroupOrder });
  return { ...current, pinnedOrder, customGroupAssignments, customGroupOrder };
}

function sessionSidebarMetaKeyAliases(sessionKey: string) {
  const keys = new Set<string>([sessionKey]);
  const colon = sessionKey.indexOf(":");
  if (colon <= 0) return keys;
  const kind = sessionKey.slice(0, colon);
  const id = sessionKey.slice(colon + 1);
  if (!id) return keys;
  if (kind === "cowork") keys.add(`epitaxy:${id}`);
  if (kind === "epitaxy") keys.add(`cowork:${id}`);
  return keys;
}

export function deleteCustomGroupState(current: FrameState, id: string): FrameState {
  const customGroupAssignments = Object.fromEntries(Object.entries(current.customGroupAssignments).filter(([, groupId]) => groupId !== id));
  const { [id]: _deleted, ...customGroupOrder } = current.customGroupOrder;
  const customGroups = current.customGroups.filter((group) => group.id !== id);
  const dropKey = `custom-${id}`;
  // Custom groups are shared across modes; drop collapse marker from every mode bucket.
  const collapsedGroupsByMode = mapCollapsedGroupsByMode(current.collapsedGroupsByMode, (list) =>
    list.filter((item) => item !== dropKey),
  );
  persistDFrameState({ collapsedGroupsByMode, customGroupAssignments, customGroupOrder, customGroups });
  return { ...current, collapsedGroupsByMode, customGroupAssignments, customGroupOrder, customGroups };
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

/**
 * Prefer mode-split persist key. Legacy flat collapsedGroups seeds both modes once
 * so existing fold state is not lost when upgrading.
 */
function readCollapsedGroupsByMode(persisted: PersistedDFrameState): Partial<Record<FrameMode, string[]>> {
  const byMode = getStringArrayByMode(persisted.collapsedGroupsByMode);
  if (Object.keys(byMode).length > 0) return byMode;
  const legacy = getStringArray(persisted.collapsedGroups);
  if (legacy.length === 0) return {};
  return { code: [...legacy], cowork: [...legacy] };
}

function getStringArrayByMode(value: unknown): Partial<Record<FrameMode, string[]>> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const modes = new Set<string>(FRAME_MODE_VALUES);
  const out: Partial<Record<FrameMode, string[]>> = {};
  for (const [mode, list] of Object.entries(value)) {
    if (!modes.has(mode)) continue;
    const items = getStringArray(list);
    if (items.length > 0) out[mode as FrameMode] = items;
  }
  return out;
}

function mapCollapsedGroupsByMode(
  byMode: Partial<Record<FrameMode, string[]>>,
  map: (list: string[]) => string[],
): Partial<Record<FrameMode, string[]>> {
  const next: Partial<Record<FrameMode, string[]>> = {};
  for (const mode of FRAME_MODE_VALUES) {
    const list = byMode[mode];
    if (!list) continue;
    const mapped = map(list);
    if (mapped.length > 0) next[mode] = mapped;
  }
  return next;
}
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
