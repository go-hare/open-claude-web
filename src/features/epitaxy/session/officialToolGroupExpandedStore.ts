/**
 * Official cc6e9624e `c(e)` expand store:
 *   `setGroupExpanded` / `_` / cd5a `dS(Te)` → groups[firstToolId]
 *   `setRowExpanded` / `m` / cd5a `fS(e.id)` → rows[toolId]
 *   persist `{rows, groups, openItemKeys}` into Map `o`, LRU `s=50`
 *   `l(e)` deletes key === e or key.endsWith(`:${e}`)
 *   `u(e)` deletes key.startsWith(e)
 * Official cccc2cf0a QC `Vu` / `setTaskRowsOpen` → tasks[taskId]
 *
 * Live append / sidebar remount must NOT reset expand.
 */
import { useCallback, useSyncExternalStore } from "react";

const OFFICIAL_GROUP_EXPAND_LRU = 50;

type ExpandBucket = {
  groups: Map<string, boolean>;
  openItemKeys: Set<string>;
  rows: Map<string, boolean>;
  tasks: Map<string, boolean>;
};

const sessionStores = new Map<string, ExpandBucket>();
const listeners = new Set<() => void>();
let version = 0;

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function emptyBucket(): ExpandBucket {
  return { groups: new Map(), openItemKeys: new Set(), rows: new Map(), tasks: new Map() };
}

function storeFor(sessionId: string) {
  let store = sessionStores.get(sessionId);
  if (store) {
    sessionStores.delete(sessionId);
    sessionStores.set(sessionId, store);
    return store;
  }
  store = emptyBucket();
  sessionStores.set(sessionId, store);
  while (sessionStores.size > OFFICIAL_GROUP_EXPAND_LRU) {
    const oldest = sessionStores.keys().next();
    if (oldest.done) break;
    sessionStores.delete(oldest.value);
  }
  return store;
}

type ExpandFlagKind = Exclude<keyof ExpandBucket, "openItemKeys">;

function mapFor(sessionId: string | undefined, kind: ExpandFlagKind) {
  return storeFor(sessionId ?? "_")[kind];
}

function readExpanded(
  sessionId: string | undefined,
  kind: ExpandFlagKind,
  key: string,
  defaultExpanded: boolean,
) {
  if (!key) return defaultExpanded;
  const stored = mapFor(sessionId, kind).get(key);
  return stored ?? defaultExpanded;
}

function writeExpanded(
  sessionId: string | undefined,
  kind: ExpandFlagKind,
  key: string,
  expanded: boolean,
) {
  if (!key) return;
  const store = mapFor(sessionId, kind);
  if (store.get(key) === expanded) return;
  store.set(key, expanded);
  emit();
}

export function officialToolGroupExpanded(
  sessionId: string | undefined,
  groupKey: string,
  defaultExpanded: boolean,
): boolean {
  return readExpanded(sessionId, "groups", groupKey, defaultExpanded);
}

export function setOfficialToolGroupExpanded(
  sessionId: string | undefined,
  groupKey: string,
  expanded: boolean,
) {
  writeExpanded(sessionId, "groups", groupKey, expanded);
}

export function officialToolRowExpanded(
  sessionId: string | undefined,
  toolId: string,
  defaultExpanded: boolean,
): boolean {
  return readExpanded(sessionId, "rows", toolId, defaultExpanded);
}

export function setOfficialToolRowExpanded(
  sessionId: string | undefined,
  toolId: string,
  expanded: boolean,
) {
  writeExpanded(sessionId, "rows", toolId, expanded);
}

export function officialTaskRowExpanded(
  sessionId: string | undefined,
  taskId: string,
  defaultExpanded = false,
): boolean {
  return readExpanded(sessionId, "tasks", taskId, defaultExpanded);
}

export function setOfficialTaskRowExpanded(
  sessionId: string | undefined,
  taskId: string,
  expanded: boolean,
) {
  writeExpanded(sessionId, "tasks", taskId, expanded);
}

/** Official cc6e `l(e)`: drop key === e or key.endsWith(`:${e}`). */
export function dropOfficialToolGroupExpandedSession(sessionId: string) {
  let dropped = false;
  for (const key of [...sessionStores.keys()]) {
    if (key === sessionId || key.endsWith(`:${sessionId}`)) {
      sessionStores.delete(key);
      dropped = true;
    }
  }
  if (dropped) emit();
}

/** Official cc6e `u(e)`: drop every key that starts with e. */
export function dropOfficialToolGroupExpandedPrefix(prefix: string) {
  let dropped = false;
  for (const key of [...sessionStores.keys()]) {
    if (key.startsWith(prefix)) {
      sessionStores.delete(key);
      dropped = true;
    }
  }
  if (dropped) emit();
}

export function officialExpandOpenItemKeys(sessionId: string | undefined): ReadonlySet<string> {
  return storeFor(sessionId ?? "_").openItemKeys;
}

export function setOfficialExpandItemOpen(sessionId: string | undefined, itemKey: string, open: boolean) {
  if (!itemKey) return;
  const keys = storeFor(sessionId ?? "_").openItemKeys;
  if (open) {
    if (keys.has(itemKey)) return;
    keys.add(itemKey);
  } else {
    if (!keys.has(itemKey)) return;
    keys.delete(itemKey);
  }
  emit();
}

/** Test/residual: official `s=50`. */
export function officialExpandSessionLruSize() {
  return sessionStores.size;
}

/** Test-only: empty `o` so LRU count is isolated. */
export function resetOfficialToolGroupExpandedStoreForTests() {
  sessionStores.clear();
  emit();
}

function useOfficialExpandFlag(
  sessionId: string | undefined,
  kind: ExpandFlagKind,
  key: string,
  defaultExpanded: boolean,
): [boolean, (next: boolean) => void] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);
  const getSnapshot = useCallback(
    () => `${version}:${readExpanded(sessionId, kind, key, defaultExpanded) ? "1" : "0"}`,
    [defaultExpanded, key, kind, sessionId],
  );
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const expanded = snapshot.endsWith(":1");
  const setExpanded = useCallback(
    (next: boolean) => {
      writeExpanded(sessionId, kind, key, next);
    },
    [key, kind, sessionId],
  );
  return [expanded, setExpanded];
}

export function useOfficialToolGroupExpanded(
  sessionId: string | undefined,
  groupKey: string,
  defaultExpanded: boolean,
): [boolean, (next: boolean) => void] {
  return useOfficialExpandFlag(sessionId, "groups", groupKey, defaultExpanded);
}

/** Official qIe `fS(e.id)` — `je=T||(j??A)`. */
export function useOfficialToolRowExpanded(
  sessionId: string | undefined,
  toolId: string,
  defaultExpanded: boolean,
): [boolean, (next: boolean) => void] {
  return useOfficialExpandFlag(sessionId, "rows", toolId, defaultExpanded);
}

/** Official cccc2cf0a QC `Vu` / `setTaskRowsOpen`. */
export function useOfficialTaskRowExpanded(
  sessionId: string | undefined,
  taskId: string,
  defaultExpanded = false,
): [boolean, (next: boolean) => void] {
  return useOfficialExpandFlag(sessionId, "tasks", taskId, defaultExpanded);
}

/** Official cd5a `a2e=8` — auto-expand when a live group has an error and is still small. */
export const OFFICIAL_TOOL_GROUP_ERROR_AUTOEXPAND_MAX = 8;

export function officialToolGroupDefaultExpanded(tools: Array<{ isError?: boolean; policyDenied?: boolean }>) {
  if (tools.length === 0 || tools.length > OFFICIAL_TOOL_GROUP_ERROR_AUTOEXPAND_MAX) return false;
  return tools.some((tool) => tool.isError === true || tool.policyDenied === true);
}
