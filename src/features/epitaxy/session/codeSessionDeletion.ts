/**
 * Shared Code session delete / archive commands (official Ses / Lve / archived residual).
 *
 * Owns only:
 *   1. $Yt uncommitted confirm (when getUncommittedChanges available)
 *   2. await LocalSessions.delete | archive({cleanupWorktree:true})
 *   3. success-only cache cleanup (+ H5-like PR glyph cache clear)
 *   4. success-only local notification
 *
 * Does NOT navigate or mutate sidebar list order —
 * those stay in the caller's UI context (sidebar de next/prev/home).
 *
 * Official index-BELzQL5P:
 *   archiveLocalSession: $Yt → CT.archive(id,{cleanupWorktree:!0})
 *   deleteLocalSession:  $Yt → CT.delete → Lve
 *   Dve archived/deleted: Eve + clearSession($5) + removePrsForSession(H5)
 *   sidebar ue (archive): await archive → de(next/prev/home) → KEe (unpin/unstar)
 *   sidebar ge (delete):  confirm → await delete → de → KEe
 *   PaneLayout: separate subscribe closes extra panes by ref (not KEe)
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { removeCodeSidebarPrStateForSession } from "../../../shell/useCodeSidebarPrState";
import { confirmOfficialWorktreeDisposal } from "../../../shell/officialWorktreeDisposalStore";
import { sessionHomePath, sessionPath } from "../../../shell/sessionPaths";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import { officialPlanCommentsApi } from "./officialPlanCommentsStore";
import { officialEvictSidePaneSession } from "./officialSidePaneSessionStore";
import {
  officialClearTurnStarted,
  officialStreamDrop,
} from "./officialStreamSessionStore";
import { clearOfficialEkeCache } from "./officialTranscriptParse";
import { previewAnnotationQueue } from "./previewAnnotationQueue";

export const CODE_SESSION_DELETED_EVENT = "epitaxy:code-session-deleted";
export const CODE_SESSION_ARCHIVED_EVENT = "epitaxy:code-session-archived";
export const CODE_SESSION_UNARCHIVED_EVENT = "epitaxy:code-session-unarchived";

export type CodeSessionIdDetail = {
  sessionId: string;
};

/** @deprecated alias — same shape as CodeSessionIdDetail */
export type CodeSessionDeletedDetail = CodeSessionIdDetail;

const inflightDelete = new Map<string, Promise<boolean>>();
const inflightArchive = new Map<string, Promise<boolean>>();
const inflightUnarchive = new Map<string, Promise<boolean>>();

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

/**
 * Official $5.clearSession + H5.removePrsForSession (+ product transcript/stream/eke/side-pane).
 * Called from archive/delete success AND Dve archived/deleted list arms.
 */
export function clearCodeSessionCaches(sessionId: string) {
  officialCodeSessionStore.getState().removeSession(sessionId);
  clearOfficialEkeCache(sessionId);
  officialStreamDrop(sessionId);
  officialClearTurnStarted(sessionId);
  officialPlanCommentsApi.clear(sessionId);
  previewAnnotationQueue.getState().clearSession(sessionId);
  // Official H5.removePrsForSession — drop sidebar PR glyph cache for this id.
  removeCodeSidebarPrStateForSession(sessionId);
  // Residual ca0135 Kr: for (const t of Ar) t.getState().evictSession(e) + yr localStorage scrub.
  officialEvictSidePaneSession(sessionId);
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
    // Official deleteLocalSession: await $Yt(n,"delete") before CT.delete.
    if (!(await confirmOfficialWorktreeDisposal(
      sessionId,
      "delete",
      desktopBridge.LocalSessions.getUncommittedChanges,
    ))) {
      return false;
    }
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
    // Official archiveLocalSession: await $Yt(n,"archive") then CT.archive(n,{cleanupWorktree:!0}).
    if (!(await confirmOfficialWorktreeDisposal(
      sessionId,
      "archive",
      desktopBridge.LocalSessions.getUncommittedChanges,
    ))) {
      return false;
    }
    try {
      await desktopBridge.LocalSessions.archive(sessionId, { cleanupWorktree: true });
    } catch {
      return false;
    }
    // Official archived residual: list keeps isArchived (caller); $5.clearSession drops live transcript/stream.
    clearCodeSessionCaches(sessionId);
    emitSessionIdEvent(CODE_SESSION_ARCHIVED_EVENT, sessionId);
    return true;
  });
}

/** Official unarchive residual — restore row to active recents. */
export async function unarchiveCodeSession(sessionId: string): Promise<boolean> {
  return runExclusive(inflightUnarchive, sessionId, async () => {
    try {
      if (!desktopBridge.LocalSessions.unarchive) return false;
      await desktopBridge.LocalSessions.unarchive(sessionId);
    } catch {
      return false;
    }
    emitSessionIdEvent(CODE_SESSION_UNARCHIVED_EVENT, sessionId);
    return true;
  });
}

export function subscribeCodeSessionUnarchived(listener: (sessionId: string) => void): () => void {
  return subscribeSessionIdEvent(CODE_SESSION_UNARCHIVED_EVENT, listener);
}
