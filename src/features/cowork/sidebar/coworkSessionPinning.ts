import type { SessionSummary } from "../../../adapters/desktopBridge";

export function coworkSessionPinKey(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  const kind = session.sessionKind === "cowork" ? "cowork" : session.kind;
  return `${kind}:${session.id}`;
}

export function orderCoworkPinnedSessions(sessions: SessionSummary[], pinnedOrder: string[]) {
  const byKey = new Map(sessions.map((session) => [coworkSessionPinKey(session), session]));
  const ordered = pinnedOrder.map((key) => byKey.get(key)).filter((session): session is SessionSummary => Boolean(session));
  const explicit = new Set(ordered.map(coworkSessionPinKey));
  const fallback = sessions.filter((session) => session.isPinned && !explicit.has(coworkSessionPinKey(session)));
  return [...ordered, ...fallback];
}

export function isCoworkSessionPinned(session: SessionSummary, pinnedOrder: string[]) {
  return session.isPinned || pinnedOrder.includes(coworkSessionPinKey(session));
}

export function pinCoworkSession(session: SessionSummary, pinnedOrder: string[]) {
  const key = coworkSessionPinKey(session);
  return [key, ...pinnedOrder.filter((item) => item !== key)];
}

export function unpinCoworkSession(session: SessionSummary, pinnedOrder: string[]) {
  const key = coworkSessionPinKey(session);
  return pinnedOrder.filter((item) => item !== key);
}
