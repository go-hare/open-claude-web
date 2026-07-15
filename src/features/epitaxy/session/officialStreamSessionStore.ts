/**
 * Official code stream session manager (index-BELzQL5P `Pke` / c119 `Pe`).
 *
 * Official shape:
 *   Rke: Map<sessionId, { smoother, abort, messageId, cleared, listeners }>
 *   feed(sessionId, event, parentToolUseId)
 *   subscribe(sessionId, listener) → listener({ messageId, blocks } | null)
 *   clear / flush / setVisibility / hasListeners
 *
 * Stream snapshots stay OUT of the durable session message bucket — UI holds them
 * in local React state (Va) and applies startTransition for same-message ticks.
 */
import {
  createOfficialSessionStreamSmoother,
  type OfficialStreamSnapshot,
  type OfficialSessionStreamSmoother,
} from "../officialStreamSmoother";

type StreamSessionEntry = {
  smoother: OfficialSessionStreamSmoother;
  messageId: string;
  cleared: boolean;
  listeners: Set<(snapshot: OfficialStreamSnapshot) => void>;
  unsubscribeSmoother: () => void;
};

const sessions = new Map<string, StreamSessionEntry>();

function emit(entry: StreamSessionEntry, snapshot: OfficialStreamSnapshot) {
  for (const listener of entry.listeners) listener(snapshot);
}

function ensureSession(sessionId: string): StreamSessionEntry {
  let entry = sessions.get(sessionId);
  if (entry) return entry;
  const smoother = createOfficialSessionStreamSmoother();
  const created: StreamSessionEntry = {
    smoother,
    messageId: "",
    cleared: true,
    listeners: new Set(),
    unsubscribeSmoother: () => undefined,
  };
  created.unsubscribeSmoother = smoother.subscribe((snapshot) => {
    if (snapshot) created.messageId = snapshot.messageId;
    emit(created, snapshot);
  });
  sessions.set(sessionId, created);
  return created;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/**
 * Official Pke.feed(sessionId, event, parent_tool_use_id):
 *   feed(s, n.message.event, n.message.parent_tool_use_id)
 * `event` must be the INNER stream event (`message_start` / `content_block_delta` / …),
 * NOT the outer `{ type: "stream_event", event }` envelope.
 *
 * Callers may pass either the envelope or the inner event — we normalize here.
 */
export function officialStreamFeed(
  sessionId: string,
  streamMessageOrEvent: Record<string, unknown>,
  parentToolUseId?: unknown,
) {
  // Normalize to official feed shape: inner event + parent_tool_use_id.
  const outerType = stringValue(streamMessageOrEvent.type);
  const nestedEvent = asRecord(streamMessageOrEvent.event);
  const isEnvelope = outerType === "stream_event" && stringValue(nestedEvent.type) !== undefined;
  const event = isEnvelope ? nestedEvent : streamMessageOrEvent;
  const parent =
    parentToolUseId
    ?? streamMessageOrEvent.parent_tool_use_id
    ?? streamMessageOrEvent.parentToolUseId
    ?? (isEnvelope ? streamMessageOrEvent.parent_tool_use_id : undefined);
  // Official: if (null !== parent) return;
  if (parent !== undefined && parent !== null) return;

  const entry = ensureSession(sessionId);
  // OfficialSessionStreamSmoother.feed historically accepted envelopes; pass a
  // synthetic envelope so existing unwrap (streamMessage.event) stays correct.
  const feedPayload = isEnvelope
    ? streamMessageOrEvent
    : { type: "stream_event", event, parent_tool_use_id: parent ?? null };
  entry.smoother.feed(feedPayload);
  if (stringValue(event.type) === "message_start") {
    entry.cleared = false;
    const message = asRecord(event.message);
    entry.messageId =
      stringValue(message.id)
      ?? stringValue(streamMessageOrEvent.uuid)
      ?? stringValue(event.uuid)
      ?? entry.messageId;
  }
}

/** Active stream message id for a session (official streamingMessageId / Qa). */
export function officialStreamActiveMessageId(sessionId: string | undefined) {
  if (!sessionId) return null;
  const entry = sessions.get(sessionId);
  if (!entry || entry.cleared) return null;
  return entry.messageId || null;
}

export function officialStreamClear(sessionId: string) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  entry.cleared = true;
  entry.smoother.clear();
  emit(entry, null);
}

export function officialStreamFlush(sessionId: string) {
  const entry = sessions.get(sessionId);
  if (!entry || entry.cleared) return;
  entry.smoother.flush();
}

export async function officialStreamSettleAfterReveal(sessionId: string, maxWaitMs = 8000) {
  const entry = sessions.get(sessionId);
  if (!entry || entry.cleared) return false;
  return entry.smoother.settleAfterReveal(maxWaitMs);
}

export function officialStreamDrop(sessionId: string) {
  const entry = sessions.get(sessionId);
  if (!entry) return;
  entry.unsubscribeSmoother();
  entry.smoother.dispose();
  sessions.delete(sessionId);
}

/** Official Pe.subscribe — returns unsubscribe. */
export function officialStreamSubscribe(
  sessionId: string,
  listener: (snapshot: OfficialStreamSnapshot) => void,
) {
  const entry = ensureSession(sessionId);
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
  };
}

export function officialStreamSetVisibility(sessionId: string, check: () => boolean) {
  // Official Pke.setVisibility(sessionId, check) → smoother.checkVisibility = check
  const entry = sessions.get(sessionId);
  if (!entry) return;
  entry.smoother.setVisibility(check);
}

export function officialStreamHasListeners(sessionId: string) {
  return (sessions.get(sessionId)?.listeners.size ?? 0) > 0;
}

/** Official je / turn-start map — stable per session for Gv elapsed seconds. */
const turnStartedAtBySession = new Map<string, number>();
/** Official _e-ish char budget for token estimate display. */
const streamCharBudgetBySession = new Map<string, number>();

export function officialMarkTurnStarted(sessionId: string, at = Date.now()) {
  if (!turnStartedAtBySession.has(sessionId)) turnStartedAtBySession.set(sessionId, at);
  return turnStartedAtBySession.get(sessionId)!;
}

export function officialGetTurnStartedAt(sessionId: string | undefined) {
  if (!sessionId) return null;
  return turnStartedAtBySession.get(sessionId) ?? null;
}

export function officialClearTurnStarted(sessionId: string) {
  turnStartedAtBySession.delete(sessionId);
  streamCharBudgetBySession.delete(sessionId);
}

export function officialSetStreamCharBudget(sessionId: string, chars: number) {
  streamCharBudgetBySession.set(sessionId, chars);
}

export function officialGetStreamTokenEstimate(sessionId: string | undefined) {
  if (!sessionId) return 0;
  return Math.round((streamCharBudgetBySession.get(sessionId) ?? 0) / 4);
}
