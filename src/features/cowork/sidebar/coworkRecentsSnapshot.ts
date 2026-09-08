/**
 * Official Q5 analog for D1e hydrate: module-level Cowork recents rows so
 * lookup can read sidebar lastActivityAt / isRunning without React state.
 *
 * Official: `Q5.getState().sessions.find(t => t.sessionId === e)` then
 * `i?.lastActivityAt` / `i?.isRunning ?? false`.
 *
 * Product Recents is SessionSummary[] (id, not sessionId). Sidebar writes
 * this snapshot on every list mutation; hydrate reads it.
 */
import type { SessionSummary } from "../../../adapters/desktopBridge/types";

let recentsSnapshot: readonly SessionSummary[] = [];

export function setCoworkRecentsSnapshot(sessions: readonly SessionSummary[]) {
  recentsSnapshot = sessions;
}

export function getCoworkRecentsRow(sessionId: string): SessionSummary | undefined {
  return recentsSnapshot.find((row) => row.id === sessionId);
}

/** Official cache key: host lastActivityAt as-is (strict !==). */
export function coworkRecentsLastActivityAt(row: SessionSummary | undefined): unknown {
  return row?.lastActivityAt;
}

export function resetCoworkRecentsSnapshotForTests() {
  recentsSnapshot = [];
}

export function getCoworkRecentsSnapshotForTests() {
  return recentsSnapshot;
}
