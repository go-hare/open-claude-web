/**
 * Official c4bf U.subscribe: `if (n.sessionId === e)` then dispatch.
 * Product host envelopes also stamp id / session.id (same as tile isSessionEventForId).
 */
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function isOfficialCodeSessionEventForId(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  if (raw.sessionId === sessionId || raw.id === sessionId) return true;
  const session = asRecord(raw.session);
  return session.id === sessionId || session.sessionId === sessionId;
}
