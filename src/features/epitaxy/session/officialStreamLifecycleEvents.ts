/**
 * Official index-BELzQL5P mergeMessage vs Ive (list store) event split.
 *
 * mergeMessage handles: transcript / connection / reconnected / cleared / done / error.
 * close / stopped are Ive list-store metadata only — they must NOT dump queuedMessages
 * or clear pendingTurn. Host interrupt timeout still stopSession+stopped; web queue
 * stays until result g/h.
 */

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

/** Official Pke.clear / Va settle. close/stopped are Ive list-only — not here. */
export function shouldClearOfficialStreamForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "done";
  }
  return type === "result"
    || type === "done"
    || type === "error"
    || type === "cleared";
}

/** Official mergeMessage `cleared` dumps queue. close/stopped must not. */
export function shouldDiscardQueuedMessagesForLifecycleEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") return stringValue(asRecord(raw.message).type) === "cleared";
  return type === "cleared";
}

/**
 * Official `u`: parent `type:"result"` (no parent_tool_use_id).
 * Subagent results keep parent_tool_use_id and must not Pke.clear / g.
 */
export function isOfficialParentResultEvent(event: unknown): boolean {
  const raw = asRecord(event);
  const message = raw.type === "message" ? asRecord(raw.message) : raw;
  if (stringValue(message.type) !== "result") return false;
  if (message.parent_tool_use_id != null && message.parent_tool_use_id !== "") return false;
  return true;
}

/**
 * After mergeMessage of a parent result: official `u && Pke.clear` always.
 * Includes `g` (queue + pendingTurn remint) — Pke.clear is independent of g/h.
 * Distinct from `p` (assistant end_turn) which does NOT Pke.clear.
 */
export function shouldFlushOfficialStreamAfterMergedResult(event: unknown): boolean {
  return isOfficialParentResultEvent(event);
}

/**
 * Official u && Pke.clear must not call clearPendingTurn when `g` reminted
 * pendingTurn, or when a leftover deferred queue still owns the turn.
 * `h` (empty-queue parent result) has pendingTurn already null → full settle.
 */
export function shouldKeepPendingTurnOnOfficialPkeClear(
  event: unknown,
  bucket: {
    pendingTurnStartedAt: number | null;
    queuedMessages?: unknown[];
    pendingQueuedSends?: number;
  } | undefined,
): boolean {
  if (!bucket) return false;
  const hasDeferredQueue =
    (bucket.queuedMessages?.length ?? 0) > 0
    || (bucket.pendingQueuedSends ?? 0) > 0;
  if (hasDeferredQueue) return true;
  return isOfficialParentResultEvent(event) && bucket.pendingTurnStartedAt != null;
}
