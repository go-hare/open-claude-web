/**
 * Official index-BELzQL5P Code session list residual (kve / Eve / Ive / Tve / Ave / Lve / Rve / Dve).
 *
 *   Rve  — CT.getAll → set sessions (cold)
 *   Dve  — onOnEvent switch; ignores message/stream_event
 *   Ive  — upsert session; v()/lodash isEqual → return prior state
 *   Eve  — tombstone set: skip Ive while archived/deleted
 *   Ave  — unarchive (clear tombstone + isArchived:false)
 *   Lve  — delete (tombstone + filter out)
 *
 * Product RecentsSection stores SessionSummary[] (bridge-normalized), not raw host rows.
 */
import type { SessionSummary } from "../adapters/desktopBridge/types";
import { clearCodeSessionCaches } from "../features/epitaxy/session/codeSessionDeletion";

/**
 * Official Ive equality: vendor `e$` / `ug` → lodash `Jf` (isEqual).
 * Product has no lodash dep — plain JSON-like deep equal for SessionSummary rows.
 */
function officialRecentsDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left === right;
  if (typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!officialRecentsDeepEqual(left[i], right[i])) return false;
    }
    return true;
  }
  const a = left as Record<string, unknown>;
  const b = right as Record<string, unknown>;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!officialRecentsDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

/** Official Eve — ids that must not be re-inserted by Ive until unarchived. */
const archivedTombstones = new Set<string>();

export function officialRecentsClearTombstonesForTests() {
  archivedTombstones.clear();
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function timestampMs(raw: Record<string, unknown>, fallback?: number): number | undefined {
  if (typeof raw.updatedAtMs === "number" && Number.isFinite(raw.updatedAtMs)) return raw.updatedAtMs;
  if (typeof raw.updatedAt === "string") {
    const parsed = Date.parse(raw.updatedAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  if (typeof raw.lastActivityAt === "string") {
    const parsed = Date.parse(raw.lastActivityAt);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

/**
 * Merge host onEvent.session (bridge shape) into a Recents SessionSummary row.
 * Sparse fields keep prior row values (same idea as tile session_updated patch).
 */
export function mergeOfficialRecentsSessionPatch(
  current: SessionSummary | null,
  patch: unknown,
): SessionSummary | null {
  if (!patch || typeof patch !== "object") return current;
  const raw = asRecord(patch);
  const id = stringValue(raw.id) ?? stringValue(raw.sessionId) ?? current?.id;
  if (!id) return current;
  const title = stringValue(raw.title);
  const updatedAtMs = timestampMs(raw, current?.updatedAtMs);
  const titleSource = (stringValue(raw.titleSource) as SessionSummary["titleSource"] | undefined)
    ?? current?.titleSource;
  const cwd = stringValue(raw.cwd) ?? current?.cwd;
  const permissionMode = stringValue(raw.permissionMode) ?? current?.permissionMode;
  const model = stringValue(raw.model) ?? current?.model;
  const effort = stringValue(raw.effort) ?? current?.effort;
  const isRunning = typeof raw.isRunning === "boolean"
    ? raw.isRunning
    : typeof raw.stopped === "boolean"
      ? !raw.stopped
      : current?.isRunning;
  const isArchived = typeof raw.isArchived === "boolean"
    ? raw.isArchived
    : typeof raw.archived === "boolean"
      ? raw.archived
      : current?.isArchived;
  const isUnread = typeof raw.isUnread === "boolean" ? raw.isUnread : current?.isUnread;
  const hasWorktree = typeof raw.hasWorktree === "boolean"
    ? raw.hasWorktree
    : typeof raw.useWorktree === "boolean"
      ? raw.useWorktree
      : current?.hasWorktree;
  const repoBranch = stringValue(asRecord(raw.repo).branch)
    ?? stringValue(raw.sourceBranch)
    ?? current?.repo?.branch;
  const repoName = stringValue(asRecord(raw.repo).name) ?? current?.repo?.name;
  const updatedAt = typeof raw.updatedAt === "string" && !/^\d{4}-/.test(raw.updatedAt)
    ? raw.updatedAt
    : current?.updatedAt ?? "";

  if (!current) {
    return {
      id,
      kind: "code",
      sessionKind: "code",
      title: title ?? "Coding session",
      titleSource,
      updatedAt,
      updatedAtMs: updatedAtMs ?? Date.now(),
      cwd,
      permissionMode,
      model,
      effort,
      isRunning: isRunning === true,
      isArchived: isArchived === true,
      isUnread: isUnread === true,
      hasWorktree: hasWorktree === true,
      repo: repoName || repoBranch ? { name: repoName, branch: repoBranch } : undefined,
    };
  }

  return {
    ...current,
    title: title ?? current.title,
    titleSource,
    updatedAt: updatedAt || current.updatedAt,
    updatedAtMs: updatedAtMs ?? current.updatedAtMs,
    cwd,
    permissionMode,
    model,
    effort,
    isRunning,
    isArchived,
    isUnread,
    hasWorktree,
    repo: (repoName || repoBranch)
      ? { name: repoName ?? current.repo?.name, branch: repoBranch ?? current.repo?.branch }
      : current.repo,
  };
}

/** Official Ive — upsert; deep-equal prior row → keep array identity. */
export function officialRecentsUpsert(
  sessions: SessionSummary[],
  session: SessionSummary,
): SessionSummary[] {
  if (archivedTombstones.has(session.id)) return sessions;
  const index = sessions.findIndex((row) => row.id === session.id);
  if (index >= 0) {
    if (officialRecentsDeepEqual(sessions[index], session)) return sessions;
    const next = sessions.slice();
    next[index] = session;
    return next;
  }
  return [...sessions, session];
}

/**
 * Official archived branch (Dve case "archived"):
 * Eve.add + `{...row, isArchived:true, worktreePath:void 0, worktreeName:void 0}`.
 * Product SessionSummary uses `hasWorktree` (no worktreePath field on the row).
 */
export function officialRecentsMarkArchived(
  sessions: SessionSummary[],
  sessionId: string,
): SessionSummary[] {
  archivedTombstones.add(sessionId);
  const index = sessions.findIndex((row) => row.id === sessionId);
  if (index < 0) return sessions;
  const prev = sessions[index];
  if (
    prev.isArchived === true
    && prev.isPinned !== true
    && prev.hasWorktree !== true
  ) {
    return sessions;
  }
  const next = sessions.slice();
  next[index] = { ...prev, isArchived: true, isPinned: false, hasWorktree: false };
  return next;
}

/** Official Ave — clear tombstone + isArchived:false. */
export function officialRecentsMarkUnarchived(
  sessions: SessionSummary[],
  sessionId: string,
): SessionSummary[] {
  archivedTombstones.delete(sessionId);
  const index = sessions.findIndex((row) => row.id === sessionId);
  if (index < 0) return sessions;
  const prev = sessions[index];
  if (prev.isArchived === false) return sessions;
  const next = sessions.slice();
  next[index] = { ...prev, isArchived: false };
  return next;
}

/** Official Lve — Eve.add + drop from list. */
export function officialRecentsRemove(
  sessions: SessionSummary[],
  sessionId: string,
): SessionSummary[] {
  archivedTombstones.add(sessionId);
  const next = sessions.filter((row) => row.id !== sessionId);
  return next.length === sessions.length ? sessions : next;
}

const META_UPSERT_TYPES = new Set([
  "session_updated",
  "close",
  "error",
  "start",
  "cleared",
  "stopped",
  "paused",
  "tool_permission_request",
  "tool_permission_resolved",
]);

export type OfficialRecentsListEvent = {
  type?: string;
  sessionId?: string;
  session?: unknown;
};

/**
 * Official Dve onEvent dispatch (mutates via setSessions updater).
 * Returns whether the event was handled (meta list path). message/stream ignored.
 * archived/deleted also run $5.clearSession + H5.removePrsForSession (via clearCodeSessionCaches).
 */
export function applyOfficialRecentsListEvent(
  event: unknown,
  setSessions: (updater: (current: SessionSummary[]) => SessionSummary[]) => void,
  fetchSession: (sessionId: string) => Promise<SessionSummary | null>,
  reloadAll: () => void,
): boolean {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (!type) return false;
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(asRecord(raw.session).id)
    ?? stringValue(asRecord(raw.session).sessionId);

  if (META_UPSERT_TYPES.has(type)) {
    const sessionRaw = raw.session;
    if (sessionRaw && typeof sessionRaw === "object") {
      setSessions((current) => {
        const id = stringValue(asRecord(sessionRaw).id)
          ?? stringValue(asRecord(sessionRaw).sessionId)
          ?? sessionId;
        if (!id) return current;
        const prev = current.find((row) => row.id === id) ?? null;
        const merged = mergeOfficialRecentsSessionPatch(prev, sessionRaw);
        if (!merged) return current;
        return officialRecentsUpsert(current, merged);
      });
      return true;
    }
    if (sessionId) {
      void fetchSession(sessionId).then((session) => {
        if (!session) return;
        setSessions((current) => officialRecentsUpsert(current, session));
      });
      return true;
    }
    return false;
  }

  if (type === "archived" && sessionId) {
    // Official Dve archived: Eve + isArchived/worktree clear + $5.clearSession + H5.removePrs.
    setSessions((current) => officialRecentsMarkArchived(current, sessionId));
    clearCodeSessionCaches(sessionId);
    return true;
  }
  if (type === "unarchived" && sessionId) {
    setSessions((current) => {
      let next = officialRecentsMarkUnarchived(current, sessionId);
      if (raw.session && typeof raw.session === "object") {
        const prev = next.find((row) => row.id === sessionId) ?? null;
        const merged = mergeOfficialRecentsSessionPatch(prev, raw.session);
        if (merged) next = officialRecentsUpsert(next, merged);
      }
      return next;
    });
    return true;
  }
  if (type === "deleted" && sessionId) {
    // Official Lve: Eve + drop + $5.clearSession + H5.removePrs.
    setSessions((current) => officialRecentsRemove(current, sessionId));
    clearCodeSessionCaches(sessionId);
    return true;
  }
  if (type === "initialized") {
    reloadAll();
    return true;
  }
  return false;
}
