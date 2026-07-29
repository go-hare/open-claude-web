/**
 * Shared Code session delete / archive commands (official Ses / Lve / archived residual).
 *
 * Owns only:
 *   1. await LocalSessions.delete | archive
 *   2. success-only cache cleanup
 *   3. success-only local notification
 *
 * Does NOT navigate, close panes, or mutate sidebar list order —
 * those stay in the caller's UI context (sidebar next/prev/home vs
 * primary header /code vs secondary pane close).
 *
 * Official index-BELzQL5P:
 *   delete → Lve (drop from list + clearSession)
 *   archive event → isArchived + clearSession + removePrs
 *   sidebar ue → archive/delete then de(next/prev/home) + KEe(pane ref)
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { sessionHomePath, sessionPath } from "../../../shell/sessionPaths";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { officialPlanCommentsApi } from "./officialPlanCommentsStore";
import {
  officialClearTurnStarted,
  officialStreamDrop,
} from "./officialStreamSessionStore";
import { clearOfficialEkeCache } from "./officialTranscriptParse";
import { previewAnnotationQueue } from "./previewAnnotationQueue";

export const CODE_SESSION_DELETED_EVENT = "epitaxy:code-session-deleted";
export const CODE_SESSION_ARCHIVED_EVENT = "epitaxy:code-session-archived";

export type CodeSessionIdDetail = {
  sessionId: string;
};

/** @deprecated alias — same shape as CodeSessionIdDetail */
export type CodeSessionDeletedDetail = CodeSessionIdDetail;

const inflightDelete = new Map<string, Promise<boolean>>();
const inflightArchive = new Map<string, Promise<boolean>>();

/** Official next → previous → /code selection over a frozen visible order. */
export function resolveDeletedCodeSessionFallback(
  ordered: readonly Pick<SessionSummary, "id" | "kind" | "sessionKind">[],
  deletedId: string,
): string {
  const index = ordered.findIndex((session) => session.id === deletedId);
  if (index < 0) return sessionHomePath("code");
  const fallback = ordered[index + 1] ?? ordered[index - 1];
  return fallback ? sessionPath(fallback) : sessionHomePath("code");
}

export function replaceAppNavigation(path: string) {
  const current = `${window.location.pathname}${window.location.search}`;
  if (path === current) return;
  window.history.replaceState({}, "", path);
  window.dispatchEvent(new Event("app:navigation"));
}

function clearCodeSessionCaches(sessionId: string) {
  officialCodeSessionStore.getState().removeSession(sessionId);
  clearOfficialEkeCache(sessionId);
  officialStreamDrop(sessionId);
  officialClearTurnStarted(sessionId);
  officialPlanCommentsApi.clear(sessionId);
  previewAnnotationQueue.getState().clearSession(sessionId);
}

function emitSessionIdEvent(eventName: string, sessionId: string) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<CodeSessionIdDetail>(eventName, {
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
    const sessionId = (event as CustomEvent<CodeSessionIdDetail>).detail?.sessionId;
    if (sessionId) listener(sessionId);
  };
  window.addEventListener(eventName, onEvent as EventListener);
  return () => window.removeEventListener(eventName, onEvent as EventListener);
}

export function subscribeCodeSessionDeleted(
  listener: (sessionId: string) => void,
): () => void {
  return subscribeSessionIdEvent(CODE_SESSION_DELETED_EVENT, listener);
}

export function subscribeCodeSessionArchived(
  listener: (sessionId: string) => void,
): () => void {
  return subscribeSessionIdEvent(CODE_SESSION_ARCHIVED_EVENT, listener);
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
 * Delete a local Code session. Returns true only after bridge success + cache clear.
 * Same-id concurrent callers share one in-flight promise.
 */
export async function deleteCodeSession(sessionId: string): Promise<boolean> {
  return runExclusive(inflightDelete, sessionId, async () => {
    try {
      await desktopBridge.LocalSessions.delete(sessionId);
    } catch {
      return false;
    }
    clearCodeSessionCaches(sessionId);
    emitSessionIdEvent(CODE_SESSION_DELETED_EVENT, sessionId);
    return true;
  });
}

/**
 * Archive a local Code session (official CT.archive + archived residual).
 * Keeps the row in the list as isArchived (caller marks UI); clears live caches
 * like official $5.clearSession; emits archived so panes/sidebar meta can sync.
 */
export async function archiveCodeSession(sessionId: string): Promise<boolean> {
  return runExclusive(inflightArchive, sessionId, async () => {
    try {
      await desktopBridge.LocalSessions.archive(sessionId);
    } catch {
      return false;
    }
    // Official archived residual: list keeps isArchived (caller); $5.clearSession drops live transcript/stream.
    clearCodeSessionCaches(sessionId);
    emitSessionIdEvent(CODE_SESSION_ARCHIVED_EVENT, sessionId);
    return true;
  });
}
