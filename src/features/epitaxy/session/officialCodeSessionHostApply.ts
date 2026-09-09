/**
 * Official he.mergeMessage / U.subscribe callback for local Code (index-BELzQL5P `r(s,e)`).
 *
 * Bound into bucket.sub by he.openSession(id, transport) so pendingClose still
 * receives events after De unmount (official 360s evict). Not a tile-only IPC.
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";
import { extractOfficialLiveMeta } from "./officialLiveMeta";
import {
  bindOfficialCodeSessionHostApply,
  idleStreamActivityMode,
  officialCodeSessionStore,
} from "./officialCodeSessionStore";
import {
  officialClearTurnStarted,
  officialGetTurnStartedAt,
  officialMarkTurnStarted,
  officialStreamClear,
  officialStreamFeed,
} from "./officialStreamSessionStore";
import { clearOfficialEkeCache, rawMessageContent } from "./officialTranscriptParse";
import {
  shouldClearOfficialStreamForEvent,
  shouldDiscardQueuedMessagesForLifecycleEvent,
  shouldFlushOfficialStreamAfterMergedResult,
  shouldKeepPendingTurnOnOfficialPkeClear,
} from "./officialStreamLifecycleEvents";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function streamEventMessageFromBridgeEvent(event: unknown): Record<string, unknown> | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  if (raw.type === "message" && message.type === "stream_event") return message;
  return raw.type === "stream_event" ? raw : null;
}

function isAssistantEndTurnMessage(message: Record<string, unknown>): boolean {
  if (stringValue(message.type) !== "assistant") return false;
  const nested = asRecord(message.message);
  return stringValue(nested.stop_reason) === "end_turn";
}

function isAssistantEndTurnBridgeEvent(event: unknown): boolean {
  const raw = asRecord(event);
  if (stringValue(raw.type) === "message") {
    return isAssistantEndTurnMessage(asRecord(raw.message));
  }
  return isAssistantEndTurnMessage(raw);
}

function isBridgeRuntimeErrorEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "error") return true;
  if (type === "message" && stringValue(asRecord(raw.message).type) === "error") return true;
  return false;
}

function bridgeRuntimeErrorFromEvent(event: unknown): { errorCategory: string | null; message: string } {
  const raw = asRecord(event);
  const nested = asRecord(raw.message);
  const message =
    stringValue(raw.error)
    ?? stringValue(raw.message)
    ?? stringValue(nested.error)
    ?? stringValue(nested.message)
    ?? stringValue(nested.content)
    ?? "Claude Code session failed";
  const errorCategory =
    stringValue(raw.errorCategory)
    ?? stringValue(raw.error_category)
    ?? stringValue(nested.errorCategory)
    ?? stringValue(nested.error_category)
    ?? null;
  return { errorCategory, message };
}

function chatMessageFromRawTranscriptEvent(rawEvent: Record<string, unknown>): ChatMessage {
  const nestedMessage = asRecord(rawEvent.message);
  const rawAuthor = stringValue(rawEvent.author);
  const rawRole = stringValue(rawEvent.role) ?? stringValue(nestedMessage.role);
  const rawType = stringValue(rawEvent.type);
  const role = rawRole === "assistant" || rawRole === "system"
    ? rawRole
    : rawAuthor === "assistant"
      ? "assistant"
      : rawAuthor === "system"
        ? "system"
        : rawType === "assistant"
          ? "assistant"
          : rawType === "system"
            ? "system"
            : "user";
  const createdAt = stringValue(rawEvent.createdAt) ?? stringValue(rawEvent.timestamp) ?? new Date().toISOString();
  const id = stringValue(rawEvent.id) ?? stringValue(rawEvent.uuid) ?? stringValue(rawEvent.message_id) ?? stringValue(nestedMessage.id) ?? `msg_${Date.now()}`;
  return {
    id,
    role,
    text: rawTranscriptEventText(rawEvent),
    createdAt,
    raw: rawEvent,
  };
}

function rawTranscriptEventText(rawEvent: Record<string, unknown>) {
  const direct = stringValue(rawEvent.text) ?? stringValue(rawEvent.content) ?? stringValue(rawEvent.result) ?? stringValue(rawEvent.error);
  if (direct) return direct;
  const nestedMessage = asRecord(rawEvent.message);
  const nestedDirect = stringValue(nestedMessage.text) ?? stringValue(nestedMessage.content);
  if (nestedDirect) return nestedDirect;
  const content = Array.isArray(nestedMessage.content) ? nestedMessage.content : rawMessageContent(rawEvent);
  return content.map((item) => {
    const record = asRecord(item);
    if (stringValue(record.type) === "text") return stringValue(record.text) ?? "";
    if (stringValue(record.type) === "thinking") return stringValue(record.thinking) ?? "";
    if (stringValue(record.type) === "tool_result") return stringValue(record.content) ?? "";
    return "";
  }).join("");
}

function chatMessageFromBridgeMessageEvent(event: unknown): ChatMessage | null {
  const raw = asRecord(event);
  if (raw.type !== "message") return null;
  const message = asRecord(raw.message);
  if (message.type === "stream_event") return null;
  if (message.type === "result") {
    return chatMessageFromRawTranscriptEvent(message);
  }
  if (message.type === "error") return null;
  const type = stringValue(message.type);
  if (
    type !== "assistant"
    && type !== "user"
    && type !== "system"
    && type !== "queue-operation"
  ) {
    return null;
  }
  const chat = chatMessageFromRawTranscriptEvent(message);
  if (type === "queue-operation" && chat) {
    return { ...chat, role: "system", text: "" };
  }
  return chat;
}

export function normalizeSessionSummaryPatch(current: SessionSummary | null, patch: unknown): SessionSummary | null {
  if (!patch || typeof patch !== "object") return current;
  const raw = asRecord(patch);
  const id = stringValue(raw.id) ?? stringValue(raw.sessionId) ?? current?.id;
  if (!id) return current;
  const title = stringValue(raw.title);
  const updatedAtMs = typeof raw.updatedAtMs === "number"
    ? raw.updatedAtMs
    : typeof raw.updatedAt === "string"
      ? Date.parse(raw.updatedAt) || current?.updatedAtMs
      : typeof raw.lastActivityAt === "string"
        ? Date.parse(raw.lastActivityAt) || current?.updatedAtMs
        : current?.updatedAtMs;
  const pendingToolPermissions = Array.isArray(raw.pendingToolPermissions)
    ? (raw.pendingToolPermissions as NonNullable<SessionSummary["pendingToolPermissions"]>)
    : current?.pendingToolPermissions;
  const permissionMode = stringValue(raw.permissionMode) ?? current?.permissionMode;
  const model = stringValue(raw.model) ?? current?.model;
  const effort = stringValue(raw.effort) ?? current?.effort;
  const initializationStatus = raw.initializationStatus !== undefined
    ? raw.initializationStatus
    : current?.initializationStatus;
  const hasWorktree = typeof raw.hasWorktree === "boolean" ? raw.hasWorktree : current?.hasWorktree;
  if (!current) {
    return {
      id,
      kind: (stringValue(raw.kind) as SessionSummary["kind"]) ?? "code",
      title: title ?? "Coding session",
      updatedAtMs: updatedAtMs ?? Date.now(),
      isRunning: raw.isRunning === true,
      isArchived: raw.isArchived === true,
      isUnread: raw.isUnread === true,
      pendingToolPermissions,
      permissionMode,
      model,
      effort,
      initializationStatus,
      hasWorktree,
    } as SessionSummary;
  }
  return {
    ...current,
    title: title ?? current.title,
    updatedAtMs: updatedAtMs ?? current.updatedAtMs,
    isRunning: typeof raw.isRunning === "boolean" ? raw.isRunning : current.isRunning,
    isArchived: typeof raw.isArchived === "boolean" ? raw.isArchived : current.isArchived,
    isUnread: typeof raw.isUnread === "boolean" ? raw.isUnread : current.isUnread,
    isAgentCompleted: typeof raw.isAgentCompleted === "boolean" ? raw.isAgentCompleted : current.isAgentCompleted,
    hasCompleted: typeof raw.hasCompleted === "boolean" ? raw.hasCompleted : current.hasCompleted,
    error: stringValue(raw.error) ?? current.error,
    pendingToolPermissions,
    permissionMode,
    model,
    effort,
    initializationStatus,
    hasWorktree,
  };
}

async function refreshSessionTitleAfterSettle(sessionId: string): Promise<SessionSummary | null> {
  const bridge = desktopBridge.LocalSessions;
  if (!bridge.refreshSessionTitle && !bridge.getSession) return null;
  try {
    if (bridge.refreshSessionTitle) {
      const result = await bridge.refreshSessionTitle(sessionId);
      if (!result) return null;
      const current = officialCodeSessionStore.getState().buckets[sessionId]?.session ?? null;
      const nextSession = normalizeSessionSummaryPatch(current, result);
      if (nextSession) officialCodeSessionStore.getState().patchSession(sessionId, nextSession);
      return nextSession;
    }
    const session = await bridge.getSession(sessionId);
    if (!session) return null;
    officialCodeSessionStore.getState().patchSession(sessionId, session);
    return session;
  } catch {
    return null;
  }
}

async function bridgeGetSessionPending(sessionId: string): Promise<SessionSummary["pendingToolPermissions"]> {
  try {
    const session = await desktopBridge.LocalSessions.getSession(sessionId);
    return session?.pendingToolPermissions ?? [];
  } catch {
    return [];
  }
}

function pkeClearVa(sessionId: string) {
  officialStreamClear(sessionId);
  clearOfficialEkeCache(sessionId);
  officialCodeSessionStore.getState().setStreamActivity(sessionId, {
    streamingMessageId: null,
    streamActivityMode: idleStreamActivityMode,
  });
}

function shouldHandleLifecycleEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "done";
  }
  return type === "transcript_loaded"
    || type === "result"
    || type === "done"
    || type === "close"
    || type === "error"
    || type === "cleared"
    || type === "stopped"
    || type === "permission_mode_changed"
    || type === "permission_mode_change_failed"
    || type === "session_updated"
    || type === "initialization_status";
}

/**
 * Official U.subscribe → he `r(s, event)` for one session id.
 * Product events stay host envelopes (type/message), not official kind:message remap.
 */
export function applyOfficialCodeSessionHostEvent(sessionId: string, event: unknown) {
  const store = officialCodeSessionStore;
  const outer = asRecord(event);
  const outerType = stringValue(outer.type) ?? stringValue(outer.kind);
  // Official merge kind:"connection" → bucket.connection = n.state.
  if (outerType === "connection") {
    const state = stringValue(outer.state);
    if (
      state === "idle"
      || state === "connecting"
      || state === "connected"
      || state === "reconnecting"
      || state === "disconnected"
    ) {
      store.getState().setConnection(sessionId, state);
    }
    return;
  }
  // Official merge kind:"prompt_suggestion" → promptSuggestion: n.suggestion||null.
  if (outerType === "prompt_suggestion") {
    const suggestion = stringValue(outer.suggestion) ?? stringValue(outer.data) ?? "";
    store.getState().setPromptSuggestion(sessionId, suggestion);
    return;
  }
  const streamMessage = streamEventMessageFromBridgeEvent(event);
  if (streamMessage) {
    const parentToolUseId = Object.prototype.hasOwnProperty.call(streamMessage, "parent_tool_use_id")
      ? streamMessage.parent_tool_use_id
      : streamMessage.parentToolUseId;
    if (parentToolUseId !== null) {
      return;
    }
    const innerEvent = asRecord(streamMessage.event);
    const isStart = stringValue(innerEvent.type) === "message_start";
    const streamMessageId = isStart
      ? (stringValue(asRecord(innerEvent.message).id) ?? null)
      : null;
    const bucketBeforeStream = store.getState().buckets[sessionId];
    if (isStart) {
      const existingPending = bucketBeforeStream?.pendingTurnStartedAt;
      if (existingPending == null) {
        officialMarkTurnStarted(sessionId);
      }
      if (streamMessageId) {
        clearOfficialEkeCache(sessionId);
      }
      store.getState().setStreamActivity(sessionId, {
        streamActivityMode: "requesting",
        ...(streamMessageId ? { streamingMessageId: streamMessageId } : {}),
        ...(existingPending == null
          ? { pendingTurnStartedAt: officialGetTurnStartedAt(sessionId) ?? Date.now() }
          : {}),
      });
    } else if (bucketBeforeStream?.pendingTurnStartedAt == null) {
      officialMarkTurnStarted(sessionId);
      store.getState().setStreamActivity(sessionId, {
        pendingTurnStartedAt: officialGetTurnStartedAt(sessionId) ?? Date.now(),
      });
    }
    officialStreamFeed(sessionId, streamMessage, parentToolUseId);
    return;
  }

  const liveMeta = extractOfficialLiveMeta(event);
  if (liveMeta) {
    const outer = asRecord(event);
    const raw =
      stringValue(outer.type) === "message" && outer.message && typeof outer.message === "object"
        ? asRecord(outer.message)
        : outer;
    const mirrorPermissionMode =
      stringValue(raw.type) === "system"
        ? stringValue(raw.subtype) === "status"
        : Boolean(liveMeta.permissionMode);
    store.getState().mergeLiveMeta(sessionId, liveMeta, { mirrorPermissionMode });
  }

  const transcriptMessage = chatMessageFromBridgeMessageEvent(event);
  if (transcriptMessage) {
    store.getState().mergeMessage(sessionId, transcriptMessage);
    if (isAssistantEndTurnBridgeEvent(event)) {
      return;
    }
    if (!shouldFlushOfficialStreamAfterMergedResult(event)) {
      return;
    }
  }

  if (shouldHandleLifecycleEvent(event)) {
    if (isBridgeRuntimeErrorEvent(event)) {
      const runtimeError = bridgeRuntimeErrorFromEvent(event);
      const bucket = store.getState().buckets[sessionId];
      if (bucket && bucket.pendingTurnStartedAt !== null) {
        store.getState().failPendingTurn(
          sessionId,
          runtimeError.message,
          runtimeError.errorCategory,
        );
      } else {
        store.getState().applyRuntimeError(
          sessionId,
          new Error(runtimeError.message),
          runtimeError.errorCategory,
        );
      }
      officialStreamClear(sessionId);
      clearOfficialEkeCache(sessionId);
      officialClearTurnStarted(sessionId);
      store.getState().clearStream(sessionId, true);
      return;
    }
    const eventType = stringValue(asRecord(event).type);
    if (eventType === "stopped" || eventType === "close") {
      const nextSession = asRecord(event).session ?? asRecord(asRecord(event).payload).session;
      if (nextSession) {
        const prevBucket = store.getState().buckets[sessionId];
        const patched = normalizeSessionSummaryPatch(prevBucket?.session ?? null, nextSession);
        if (patched) store.getState().patchSession(sessionId, patched);
      }
      return;
    }
    if (shouldClearOfficialStreamForEvent(event)) {
      if (shouldDiscardQueuedMessagesForLifecycleEvent(event)) {
        officialStreamClear(sessionId);
        clearOfficialEkeCache(sessionId);
        officialClearTurnStarted(sessionId);
        store.getState().resetOnCleared(sessionId);
        return;
      }
      const after = store.getState().buckets[sessionId];
      if (shouldKeepPendingTurnOnOfficialPkeClear(event, after)) {
        pkeClearVa(sessionId);
        return;
      }
      officialStreamClear(sessionId);
      clearOfficialEkeCache(sessionId);
      store.getState().clearStream(sessionId, true);
      void refreshSessionTitleAfterSettle(sessionId);
    } else if (eventType === "session_updated") {
      const nextSession = asRecord(event).session ?? asRecord(asRecord(event).payload).session;
      if (nextSession) {
        const prevBucket = store.getState().buckets[sessionId];
        const patched = normalizeSessionSummaryPatch(prevBucket?.session ?? null, nextSession);
        if (patched) store.getState().patchSession(sessionId, patched);
      }
    } else if (eventType === "initialization_status") {
      const raw = asRecord(event);
      const statusSource = asRecord(raw.initializationStatus);
      const step = stringValue(statusSource.step) ?? stringValue(raw.step);
      const isComplete = typeof statusSource.isComplete === "boolean"
        ? statusSource.isComplete
        : typeof raw.isComplete === "boolean"
          ? raw.isComplete
          : undefined;
      const current = store.getState().buckets[sessionId]?.session ?? null;
      if (current) {
        store.getState().patchSession(sessionId, {
          ...current,
          initializationStatus: {
            ...(asRecord(current.initializationStatus) as Record<string, unknown>),
            ...(step ? { step } : {}),
            ...(isComplete !== undefined ? { isComplete } : {}),
          },
        });
      }
    } else if (eventType === "permission_mode_changed") {
      const raw = asRecord(event);
      const nextMode =
        stringValue(raw.permissionMode)
        ?? stringValue(asRecord(raw.session).permissionMode)
        ?? stringValue(asRecord(raw.payload).permissionMode);
      if (nextMode) {
        store.getState().mergeLiveMeta(sessionId, { permissionMode: nextMode }, { mirrorPermissionMode: true });
        const current = store.getState().buckets[sessionId]?.session ?? null;
        if (current) {
          store.getState().patchSession(sessionId, { ...current, permissionMode: nextMode });
        }
      }
    } else if (eventType === "permission_mode_change_failed") {
      const raw = asRecord(event);
      const priorMode =
        stringValue(asRecord(raw.session).permissionMode)
        ?? stringValue(asRecord(raw.payload).permissionMode)
        ?? stringValue(store.getState().buckets[sessionId]?.session?.permissionMode);
      if (priorMode) {
        store.getState().mergeLiveMeta(sessionId, { permissionMode: priorMode }, { mirrorPermissionMode: true });
        const current = store.getState().buckets[sessionId]?.session ?? null;
        if (current) {
          store.getState().patchSession(sessionId, { ...current, permissionMode: priorMode });
        }
      }
    }
  } else if (
    stringValue(asRecord(event).type) === "tool_permission_request"
    || stringValue(asRecord(event).type) === "tool_permission_resolved"
    || stringValue(asRecord(event).type) === "tool_permission_response_failed"
  ) {
    void bridgeGetSessionPending(sessionId).then((pending) => {
      const current = store.getState().buckets[sessionId]?.session ?? null;
      if (!current) return;
      store.getState().patchSession(sessionId, {
        ...current,
        pendingToolPermissions: pending,
      });
    });
  }
}

bindOfficialCodeSessionHostApply(applyOfficialCodeSessionHostEvent);
