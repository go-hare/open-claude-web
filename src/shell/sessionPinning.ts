import type { SessionSummary } from "../adapters/desktopBridge";

/**
 * Shared pin key for FrameStore.pinnedOrder (code + cowork).
 *
 * Residual routing (`sessionPath` / isCoworkSession):
 *   sessionKind "cowork" OR kind "epitaxy" → cowork
 *   sessionKind "code" OR kind "code" → code
 *
 * Always prefer the product mode label (`cowork` / `code`) over raw `kind: "epitaxy"`,
 * so Code and Cowork sidebars agree on the same key for a given session id.
 * Legacy keys `epitaxy:${id}` are accepted when reading for migration only.
 */
export function sessionPinKey(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  return `${sessionPinKind(session)}:${session.id}`;
}

export function sessionPinKeyAliases(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  const primary = sessionPinKey(session);
  if (primary.startsWith("cowork:")) return [primary, `epitaxy:${session.id}`];
  return [primary];
}

function sessionPinKind(session: Pick<SessionSummary, "kind" | "sessionKind">) {
  if (session.sessionKind === "cowork" || session.kind === "epitaxy") return "cowork";
  if (session.sessionKind === "code" || session.kind === "code") return "code";
  return session.kind;
}

export function orderPinnedSessions(sessions: SessionSummary[], pinnedOrder: string[]) {
  const byKey = new Map<string, SessionSummary>();
  for (const session of sessions) {
    for (const key of sessionPinKeyAliases(session)) byKey.set(key, session);
  }
  const ordered: SessionSummary[] = [];
  const seen = new Set<string>();
  for (const key of pinnedOrder) {
    const session = byKey.get(key);
    if (!session || seen.has(session.id)) continue;
    seen.add(session.id);
    ordered.push(session);
  }
  const fallback = sessions.filter((session) => session.isPinned && !seen.has(session.id));
  return [...ordered, ...fallback];
}

export function isPinnedSession(session: SessionSummary, pinnedOrder: string[]) {
  if (session.isPinned) return true;
  return sessionPinKeyAliases(session).some((key) => pinnedOrder.includes(key));
}

export function pinSession(session: SessionSummary, pinnedOrder: string[]) {
  const key = sessionPinKey(session);
  const drop = new Set(sessionPinKeyAliases(session));
  return [key, ...pinnedOrder.filter((item) => !drop.has(item))];
}

export function unpinSession(session: SessionSummary, pinnedOrder: string[]) {
  const drop = new Set(sessionPinKeyAliases(session));
  return pinnedOrder.filter((item) => !drop.has(item));
}
