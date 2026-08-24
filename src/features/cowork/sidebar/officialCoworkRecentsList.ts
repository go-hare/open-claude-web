/**
 * Official index-BELzQL5P Cowork session list residual (Q5 / X5 / e6 / t6 / n6).
 *
 *   Q5  — Zustand {sessions, isInitialized} from hT = LocalAgentModeSessions
 *   t6  — hT.getAll → set sessions; catch sets isInitialized only (keep previous)
 *   e6  — hT.getSession(id, {skipReplay:true}) → upsert FULL session if !X5
 *   n6  — one-shot onOnEvent switch
 *   X5  — tombstone set: skip e6 while archived/deleted
 *
 * Q5 is NOT Code Dve (kve):
 *   - META has no cleared | stopped | paused | unarchived
 *   - no event.session merge path — always e6(sessionId)
 *   - archived only sets isArchived:true (does not clear worktree)
 *
 * Product Recents stores SessionSummary[] (bridge-normalized list rows).
 */
import type { CoworkSessionSnapshot, SessionSummary } from "../../../adapters/desktopBridge/types";
import { clearCoworkSessionCaches } from "../session/coworkSessionDeletion";

/**
 * Official e6 equality: vendor `v()` → lodash isEqual.
 * Product has no lodash dep — plain JSON-like deep equal for SessionSummary rows.
 */
function officialCoworkRecentsDeepEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (left == null || right == null) return left === right;
  if (typeof left !== typeof right) return false;
  if (typeof left !== "object") return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    for (let i = 0; i < left.length; i += 1) {
      if (!officialCoworkRecentsDeepEqual(left[i], right[i])) return false;
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
    if (!officialCoworkRecentsDeepEqual(a[key], b[key])) return false;
  }
  return true;
}

/** Official X5 — ids that must not be re-inserted by e6 after archived/deleted. */
const archivedTombstones = new Set<string>();

export function officialCoworkRecentsClearTombstonesForTests() {
  archivedTombstones.clear();
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Strip getSession snapshot-only fields so list rows match t6 getAll / list().
 * Official Q5 stores the full getSession object; product Recents is SessionSummary.
 */
export function toCoworkListRow(
  snapshot: SessionSummary | CoworkSessionSnapshot,
): SessionSummary {
  const {
    messages: _messages,
    bufferedMessages: _bufferedMessages,
    rawSession: _rawSession,
    rawBufferedMessages: _rawBufferedMessages,
    rawMessages: _rawMessages,
    ...row
  } = snapshot as CoworkSessionSnapshot;
  return row;
}

/** Official e6 upsert; deep-equal prior row → keep array identity. */
export function officialCoworkRecentsUpsert(
  sessions: SessionSummary[],
  session: SessionSummary,
): SessionSummary[] {
  if (archivedTombstones.has(session.id)) return sessions;
  const index = sessions.findIndex((row) => row.id === session.id);
  if (index >= 0) {
    if (officialCoworkRecentsDeepEqual(sessions[index], session)) return sessions;
    const next = sessions.slice();
    next[index] = session;
    return next;
  }
  return [...sessions, session];
}

/**
 * Official n6 archived: X5.add + `{...row, isArchived:true}` only
 * + $5.clearSession + H5.removePrsForSession + K5.dismissNudge.
 * Product analog for $5/$H5: clearCoworkSessionCaches (called by dispatcher).
 * No worktreePath on Cowork list rows — do not invent Dve hasWorktree clear.
 */
export function officialCoworkRecentsMarkArchived(
  sessions: SessionSummary[],
  sessionId: string,
): SessionSummary[] {
  archivedTombstones.add(sessionId);
  const index = sessions.findIndex((row) => row.id === sessionId);
  if (index < 0) return sessions;
  const next = sessions.slice();
  next[index] = { ...sessions[index], isArchived: true };
  return next;
}

/** Official n6 deleted: X5.add + filter out. */
export function officialCoworkRecentsRemove(
  sessions: SessionSummary[],
  sessionId: string,
): SessionSummary[] {
  archivedTombstones.add(sessionId);
  const next = sessions.filter((row) => row.id !== sessionId);
  return next.length === sessions.length ? sessions : next;
}

/**
 * Official n6 META upsert types — always e6(sessionId), never event.session.
 * Does NOT include Code-only cleared | stopped | paused | unarchived.
 */
const Q5_META_UPSERT_TYPES = new Set([
  "session_updated",
  "close",
  "error",
  "tool_permission_request",
  "tool_permission_resolved",
  "start",
]);

export type OfficialCoworkRecentsListEvent = {
  type?: string;
  sessionId?: string;
  session?: unknown;
};

/**
 * Official n6 onOnEvent dispatch.
 * Returns whether the event was a Q5 meta list path. message/stream ignored.
 * archived/deleted also run $5.clearSession analog (clearCoworkSessionCaches).
 */
export function applyOfficialCoworkRecentsListEvent(
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

  if (Q5_META_UPSERT_TYPES.has(type)) {
    // Official e6: always getSession(id,{skipReplay:true}). No event.session merge.
    if (!sessionId) return false;
    void fetchSession(sessionId).then((session) => {
      if (!session) return;
      setSessions((current) => officialCoworkRecentsUpsert(current, session));
    });
    return true;
  }

  if (type === "archived" && sessionId) {
    setSessions((current) => officialCoworkRecentsMarkArchived(current, sessionId));
    clearCoworkSessionCaches(sessionId);
    return true;
  }
  if (type === "deleted" && sessionId) {
    setSessions((current) => officialCoworkRecentsRemove(current, sessionId));
    clearCoworkSessionCaches(sessionId);
    return true;
  }
  if (type === "initialized") {
    reloadAll();
    return true;
  }
  return false;
}
