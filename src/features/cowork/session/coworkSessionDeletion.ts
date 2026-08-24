/**
 * Shared Cowork session delete / archive commands.
 *
 * Mirrors codeSessionDeletion residual:
 *   1. await LocalAgentModeSessions.delete | archive
 *   2. success-only cache cleanup
 *   3. success-only local notification
 *
 * Does NOT navigate, close panes, or mutate sidebar list order —
 * those stay in the caller's UI context (sidebar next/prev/home vs
 * primary header /task/new vs secondary pane close).
 */
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { sessionHomePath, sessionPath } from "../../../shell/sessionPaths";
import {
  officialStreamClear,
  officialStreamDrop,
} from "../../epitaxy/session/officialStreamSessionStore";
import { coworkSessionsBridge } from "./coworkSessionBridge";
import { coworkMessagePathStore } from "./transcript/coworkMessagePathStore";

export const COWORK_SESSION_DELETED_EVENT = "epitaxy:cowork-session-deleted";
export const COWORK_SESSION_ARCHIVED_EVENT = "epitaxy:cowork-session-archived";

export type CoworkSessionIdDetail = {
  sessionId: string;
};

const inflightDelete = new Map<string, Promise<boolean>>();
const inflightArchive = new Map<string, Promise<boolean>>();

/** Official next → previous → /task/new selection over a frozen visible order. */
export function resolveDeletedCoworkSessionFallback(
  ordered: readonly Pick<SessionSummary, "id" | "kind" | "sessionKind">[],
  deletedId: string,
): string {
  const index = ordered.findIndex((session) => session.id === deletedId);
  if (index < 0) return sessionHomePath("cowork");
  const fallback = ordered[index + 1] ?? ordered[index - 1];
  return fallback ? sessionPath(fallback) : sessionHomePath("cowork");
}

/** Same as codeSessionDeletion.replaceAppNavigation — inlined to avoid desktopBridge import in unit tests. */
export function replaceAppNavigation(path: string) {
  if (typeof window === "undefined") return;
  const current = `${window.location.pathname}${window.location.search}`;
  if (path === current) return;
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new Event("app:navigation"));
}

/**
 * Official Q5 archived/deleted: $5.clearSession + H5.removePrsForSession + K5.dismissNudge.
 * Product analog for the session caches ($5 / transcript / stop_details).
 * Exported so n6 onEvent can clear without going through delete/archive commands.
 */
export function clearCoworkSessionCaches(sessionId: string) {
  // Runtime uses official stream store for Cowork stream snapshots.
  officialStreamClear(sessionId);
  officialStreamDrop(sessionId);
  // Drop transcript path for this conversation so remounts do not flash stale rows.
  try {
    coworkMessagePathStore.getState().setMessages(sessionId, []);
  } catch {
    // Store may be unavailable in non-DOM unit tests without full setup.
  }
  try {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(`stop_details:${sessionId}`);
    }
  } catch {
    // ignore storage failures
  }
}

function emitSessionIdEvent(eventName: string, sessionId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CoworkSessionIdDetail>(eventName, {
      detail: { sessionId },
    }),
  );
}

function subscribeSessionIdEvent(
  eventName: string,
  listener: (sessionId: string) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;
  const onEvent = (event: Event) => {
    const sessionId = (event as CustomEvent<CoworkSessionIdDetail>).detail?.sessionId;
    if (sessionId) listener(sessionId);
  };
  window.addEventListener(eventName, onEvent as EventListener);
  return () => window.removeEventListener(eventName, onEvent as EventListener);
}

export function subscribeCoworkSessionDeleted(
  listener: (sessionId: string) => void,
): () => void {
  return subscribeSessionIdEvent(COWORK_SESSION_DELETED_EVENT, listener);
}

export function subscribeCoworkSessionArchived(
  listener: (sessionId: string) => void,
): () => void {
  return subscribeSessionIdEvent(COWORK_SESSION_ARCHIVED_EVENT, listener);
}

async function runExclusive(
  map: Map<string, Promise<boolean>>,
  sessionId: string,
  work: () => Promise<boolean>,
): Promise<boolean> {
  if (!sessionId) return false;
  const existing = map.get(sessionId);
  if (existing) return existing;
  const run = work();
  map.set(sessionId, run);
  try {
    return await run;
  } finally {
    if (map.get(sessionId) === run) map.delete(sessionId);
  }
}

/**
 * Delete a local Cowork session. Returns true only after bridge success + cache clear.
 * Same-id concurrent callers share one in-flight promise.
 */
export async function deleteCoworkSession(sessionId: string): Promise<boolean> {
  return runExclusive(inflightDelete, sessionId, async () => {
    try {
      await coworkSessionsBridge.delete(sessionId);
    } catch {
      return false;
    }
    clearCoworkSessionCaches(sessionId);
    emitSessionIdEvent(COWORK_SESSION_DELETED_EVENT, sessionId);
    return true;
  });
}

/**
 * Archive a local Cowork session.
 * Keeps the row in the list as isArchived (caller marks UI); clears live caches;
 * emits archived so panes/sidebar meta can sync.
 */
export async function archiveCoworkSession(sessionId: string): Promise<boolean> {
  return runExclusive(inflightArchive, sessionId, async () => {
    try {
      await coworkSessionsBridge.archive(sessionId);
    } catch {
      return false;
    }
    clearCoworkSessionCaches(sessionId);
    emitSessionIdEvent(COWORK_SESSION_ARCHIVED_EVENT, sessionId);
    return true;
  });
}
