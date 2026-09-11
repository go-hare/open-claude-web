/**
 * Official Pw non-coordinator attention mapper (c11959232).
 * Split from epitaxyActionCenterState so unit tests do not import desktopBridge.
 */
import type { SessionSummary } from "../../adapters/desktopBridge/types";

export type ActionCenterSessionKind = "blocked" | "review" | "unread" | "routine";

export type ActionCenterSessionRow = {
  kind: ActionCenterSessionKind;
  session: SessionSummary;
};

/** Official kn(status_category) for Action Center attention. */
export function isActionCenterBlockedCategory(category?: string | null): boolean {
  return category === "blocked" || category === "need_input" || category === "failed";
}

export function sessionTimestampMs(session: SessionSummary): number {
  if (typeof session.updatedAtMs === "number" && Number.isFinite(session.updatedAtMs)) {
    return session.updatedAtMs;
  }
  if (typeof session.createdAtMs === "number" && Number.isFinite(session.createdAtMs)) {
    return session.createdAtMs;
  }
  const parsed = Date.parse(session.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Map LocalSessions list → attention rows (Pw non-coordinator path).
 * Local unread = bn().has(id) only — never host isUnread.
 * Remote unread / PR list still not invented.
 */
export function buildEpitaxyActionCenterAttention(
  sessions: SessionSummary[],
  unreadIds: ReadonlySet<string> = new Set(),
): ActionCenterSessionRow[] {
  const blocked: ActionCenterSessionRow[] = [];
  const unread: ActionCenterSessionRow[] = [];

  for (const session of sessions) {
    if (session.isArchived) continue;
    if (session.isPinned) continue;
    if (session.kind !== "epitaxy" && session.kind !== "code") continue;
    if (session.sessionKind === "cowork") continue;

    const needsAction = Boolean(session.postTurnSummary?.needsAction?.trim());
    const blockedCategory = isActionCenterBlockedCategory(session.postTurnSummary?.statusCategory);
    const isRunning = session.isRunning === true;
    if (needsAction || blockedCategory) {
      blocked.push({ session, kind: "blocked" });
      continue;
    }
    if (!isRunning && unreadIds.has(session.id)) {
      unread.push({ session, kind: "unread" });
    }
  }

  const byTimeDesc = (left: ActionCenterSessionRow, right: ActionCenterSessionRow) =>
    sessionTimestampMs(right.session) - sessionTimestampMs(left.session);

  return [...blocked.sort(byTimeDesc), ...unread.sort(byTimeDesc)];
}
