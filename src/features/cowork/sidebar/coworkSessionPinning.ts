import type { SessionSummary } from "../../../adapters/desktopBridge";
import {
  isPinnedSession,
  orderPinnedSessions,
  pinSession,
  sessionPinKey,
  unpinSession,
} from "../../../shell/sessionPinning";

/**
 * Cowork pin helpers — same keys as Code (`sessionPinKey`).
 * Prefer `cowork:${id}` over legacy `epitaxy:${id}` so shared FrameStore.pinnedOrder stays consistent.
 */
export function coworkSessionPinKey(session: Pick<SessionSummary, "id" | "kind" | "sessionKind">) {
  return sessionPinKey(session);
}

export function orderCoworkPinnedSessions(sessions: SessionSummary[], pinnedOrder: string[]) {
  return orderPinnedSessions(sessions, pinnedOrder);
}

export function isCoworkSessionPinned(session: SessionSummary, pinnedOrder: string[]) {
  return isPinnedSession(session, pinnedOrder);
}

export function pinCoworkSession(session: SessionSummary, pinnedOrder: string[]) {
  return pinSession(session, pinnedOrder);
}

export function unpinCoworkSession(session: SessionSummary, pinnedOrder: string[]) {
  return unpinSession(session, pinnedOrder);
}
