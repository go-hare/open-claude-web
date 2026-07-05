import type { SessionSummary } from "../adapters/desktopBridge";

export function sessionPinKey(session: SessionSummary) {
  const kind = session.sessionKind === "code" ? "code" : session.sessionKind === "cowork" ? "cowork" : session.kind;
  return `${kind}:${session.id}`;
}

export function orderPinnedSessions(sessions: SessionSummary[], pinnedOrder: string[]) {
  const byKey = new Map(sessions.map((session) => [sessionPinKey(session), session]));
  const ordered = pinnedOrder.map((key) => byKey.get(key)).filter((session): session is SessionSummary => Boolean(session));
  const explicit = new Set(ordered.map(sessionPinKey));
  const fallback = sessions.filter((session) => session.isPinned && !explicit.has(sessionPinKey(session)));
  return [...ordered, ...fallback];
}

export function isPinnedSession(session: SessionSummary, pinnedOrder: string[]) {
  return session.isPinned || pinnedOrder.includes(sessionPinKey(session));
}

export function pinSession(session: SessionSummary, pinnedOrder: string[]) {
  const key = sessionPinKey(session);
  return [key, ...pinnedOrder.filter((item) => item !== key)];
}

export function unpinSession(session: SessionSummary, pinnedOrder: string[]) {
  const key = sessionPinKey(session);
  return pinnedOrder.filter((item) => item !== key);
}
