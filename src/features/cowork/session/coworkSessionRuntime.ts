import { createMessageUuid } from "../../../adapters/desktopBridge/messageUuid";
import type { CoworkSessionsBridge, SendMessageInput } from "../../../adapters/desktopBridge/types";
import {
  officialStreamClear,
  officialStreamFeed,
  officialStreamSubscribe,
} from "../../epitaxy/session/officialStreamSessionStore";
import type { OfficialStreamSnapshot } from "../../epitaxy/officialStreamSmoother";
import { createPendingCoworkUserMessage } from "./coworkPendingMessages";
import {
  coworkPermissionResolvedId,
  normalizeCoworkPermissionRequest,
} from "./coworkPermissionEvents";
import {
  coworkStreamMessage,
  coworkTranscriptMessage,
  isCoworkSessionEvent,
} from "./coworkSessionEvents";
import {
  createInitialCoworkSessionState,
  messageIdentity,
} from "./coworkSessionHydration";
import { reduceCoworkSessionState, type CoworkSessionAction } from "./coworkSessionReducer";
import type { CoworkSessionStore } from "./coworkSessionStore";
import { buildCoworkChatMessages } from "./transcript/coworkMessageModel";
import { coworkMessagePathStore, type CoworkMessagePathStore } from "./transcript/coworkMessagePathStore";
import { estimateCoworkStreamTokens } from "./transcript/coworkStreamTranscript";
import { asRecord, stringValue } from "./recordUtils";
import type { CoworkStreamSnapshot } from "./stream/coworkStreamTypes";
import type { CoworkRawMessage } from "./types";

type RuntimeOptions = { bridge: CoworkSessionsBridge; messageStore?: CoworkMessagePathStore; sessionId: string; store: CoworkSessionStore };

export function createCoworkSessionRuntime({ bridge, messageStore = coworkMessagePathStore, sessionId, store }: RuntimeOptions) {
  let data = createInitialCoworkSessionState(sessionId);
  let disposed = false;
  let hydrating = true;
  let reloadPromise: Promise<void> | null = null;
  let removeEventListener: (() => void) | undefined;
  let removeStreamSubscribe: (() => void) | undefined;
  const bufferedEvents: unknown[] = [];
  const seenMessageUuids = new Set<string>();

  const publish = () => {
    const chatMessages = buildCoworkChatMessages(data.messages, data.streamSnapshot, { pendingMessages: data.pendingMessages });
    messageStore.getState().setMessages(sessionId, chatMessages);
    // Official Qke(bucket): pendingTurn != null && !endTurnSeen.
    // isRunning alone is not enough after end_turn (turn still open until result).
    const isResponding = data.pendingTurn !== null && !data.pendingTurn.endTurnSeen;
    store.setState({
      sessionContext: {
        ...data,
        isResponding,
        messageUuids: chatMessages.map((message) => message.uuid),
        reload,
        setPermissionRequests,
        streamTokenEstimate: estimateCoworkStreamTokens(data.streamSnapshot),
        submitMessage,
      },
    });
  };

  const dispatch = (action: CoworkSessionAction) => {
    if (disposed) return;
    data = reduceCoworkSessionState(data, action);
    publish();
  };

  /** Official Oke → Va: map zE blocks into CoworkStreamSnapshot shape. */
  const onOfficialStreamSnapshot = (snapshot: OfficialStreamSnapshot) => {
    if (disposed) return;
    if (snapshot === null) {
      dispatch({ snapshot: null, type: "stream-snapshot" });
      return;
    }
    const mapped: NonNullable<CoworkStreamSnapshot> = {
      apiMessageId: snapshot.messageId,
      blocks: snapshot.blocks.map((block) => {
        if (block.kind === "tool") return { id: block.id, kind: "tool" as const, name: block.name, partialJson: block.partialJson };
        if (block.kind === "thinking") return { kind: "thinking" as const, text: block.text };
        return { kind: "text" as const, text: block.text };
      }),
      messageId: snapshot.messageId,
    };
    dispatch({ snapshot: mapped, type: "stream-snapshot" });
  };

  async function reload() {
    if (reloadPromise) return reloadPromise;
    reloadPromise = hydrate().finally(() => {
      reloadPromise = null;
    });
    return reloadPromise;
  }

  async function hydrate() {
    hydrating = true;
    dispatch({ type: "hydration-started" });
    try {
      const transcriptPromise = bridge.getRawTranscript(sessionId).catch(() => []);
      const sessionPromise = bridge.getRawSession(sessionId);
      const [transcript, session] = await Promise.all([transcriptPromise, sessionPromise]);
      if (disposed) return;
      dispatch({ session, transcript, type: "hydration-succeeded" });
      resetSeenMessages(data.messages);
    } catch (caught) {
      dispatch({ error: caught instanceof Error ? caught : new Error(String(caught)), type: "hydration-failed" });
    } finally {
      if (!disposed) drainBufferedEvents();
    }
  }

  async function submitMessage(text: string, input?: SendMessageInput) {
    if (!bridge.sendMessage) throw new Error("Cowork session bridge cannot send messages");
    const messageUuid = input?.messageUuid ?? createMessageUuid();
    const pending = createPendingCoworkUserMessage(sessionId, messageUuid, text);
    dispatch({ message: pending, startedAt: Date.now(), type: "pending-message-added" });
    try {
      await bridge.sendMessage(sessionId, text, { ...input, messageUuid });
    } catch (caught) {
      dispatch({ messageUuid, type: "pending-message-failed" });
      throw caught;
    }
  }

  function setPermissionRequests(
    value: typeof data.toolPermissionRequests | ((current: typeof data.toolPermissionRequests) => typeof data.toolPermissionRequests),
  ) {
    const requests = typeof value === "function" ? value(data.toolPermissionRequests) : value;
    dispatch({ requests, type: "permissions-replaced" });
  }

  function onBridgeEvent(event: unknown) {
    const permissionRequest = normalizeCoworkPermissionRequest(event, sessionId);
    const isSessionEvent = isCoworkSessionEvent(event, sessionId);
    if (!permissionRequest && !isSessionEvent) return;
    if (hydrating) bufferedEvents.push(event);
    else applyEvent(event);
  }

  function drainBufferedEvents() {
    hydrating = false;
    const queued = bufferedEvents.splice(0);
    for (const event of queued) applyEvent(event);
  }

  function applyEvent(event: unknown) {
    if (applyPermissionEvent(event)) return;
    const raw = asRecord(event);
    const type = stringValue(raw.type);
    if (type === "cleared") {
      officialStreamClear(sessionId);
      void reload();
      return;
    }
    if (type === "message") applyMessageEvent(event);
    else if (type === "error") applyErrorEvent(raw);
    // Official LocalAgentModeSessions settle on close/result/error — not synthetic "completed".
    else if (type === "close" || type === "stopped") settleSession(raw);
    else if (type === "pty_close") void refreshTranscript();
    else if (type === "session_updated" || type === "permission_mode_changed") void refreshSessionMetadata();
    else if (type === "initialization_status") applyInitializationStatus(raw);
    else if (type === "prompt_suggestion") dispatch({ suggestion: stringValue(raw.data) ?? null, type: "prompt-suggestion" });
  }

  function applyPermissionEvent(event: unknown) {
    const resolvedId = coworkPermissionResolvedId(event, sessionId);
    if (resolvedId) {
      dispatch({ requestId: resolvedId, type: "permission-resolved" });
      return true;
    }
    const request = normalizeCoworkPermissionRequest(event, sessionId);
    if (!request) return false;
    dispatch({ request, type: "permission-upserted" });
    return true;
  }

  function applyMessageEvent(event: unknown) {
    const streamMessage = coworkStreamMessage(event);
    if (streamMessage) {
      // Official Pke.feed(sessionId, event, parent_tool_use_id) — zE owns typewriter.
      const parentToolUseId = streamMessage.parent_tool_use_id ?? streamMessage.parentToolUseId;
      officialStreamFeed(sessionId, streamMessage, parentToolUseId);
      // Activity / streamingMessageId only — blocks come from stream-snapshot (Oke).
      dispatch({ message: streamMessage, startedAt: Date.now(), type: "stream-event" });
      return;
    }
    const message = coworkTranscriptMessage(event);
    if (!message) {
      const messageType = stringValue(asRecord(asRecord(event).message).type);
      if (messageType === "result" || messageType === "error") settleSession(asRecord(event));
      return;
    }
    const uuid = messageIdentity(message);
    if (seenMessageUuids.has(uuid)) return;
    seenMessageUuids.add(uuid);
    dispatch({ message, receivedAt: Date.now(), type: "transcript-message" });
  }

  function applyErrorEvent(raw: Record<string, unknown>) {
    const message = stringValue(raw.error) ?? stringValue(raw.message) ?? "Cowork session failed";
    const errorCategory = stringValue(raw.errorCategory) ?? stringValue(raw.error_category);
    officialStreamClear(sessionId);
    dispatch({ error: new Error(message), errorCategory, type: "runtime-error" });
  }

  function settleSession(raw: Record<string, unknown>) {
    // Official result/done/error → Pke.clear (null Va); not message_stop.
    officialStreamClear(sessionId);
    dispatch({ disconnected: raw.code === 1, type: "settled" });
  }

  function applyInitializationStatus(raw: Record<string, unknown>) {
    const source = asRecord(raw.initializationStatus);
    if (!Object.keys(source).length) return;
    const status = {
      ...(typeof source.isComplete === "boolean" ? { isComplete: source.isComplete } : {}),
      ...(typeof source.message === "string" ? { message: source.message } : {}),
      ...(typeof source.step === "string" ? { step: source.step } : {}),
    };
    dispatch({ receivedAt: Date.now(), status, type: "initialization-status" });
  }

  async function refreshSessionMetadata() {
    const session = await bridge.getRawSession(sessionId).catch(() => null);
    if (!session || disposed) return;
    dispatch({ session, type: "metadata-refreshed" });
  }

  async function refreshTranscript() {
    const transcript = await bridge.getRawTranscript(sessionId).catch(() => null);
    if (!transcript || disposed) return;
    dispatch({ transcript, type: "transcript-refreshed" });
    resetSeenMessages(data.messages);
  }

  function resetSeenMessages(messages: CoworkRawMessage[]) {
    seenMessageUuids.clear();
    for (const message of messages) seenMessageUuids.add(messageIdentity(message));
  }
  function start() {
    publish();
    // Official Pe.subscribe(sessionId, Oke) → local Va (stream-snapshot).
    removeStreamSubscribe = officialStreamSubscribe(sessionId, onOfficialStreamSnapshot);
    removeEventListener = bridge.onEvent?.(onBridgeEvent);
    void reload();
  }
  function dispose() {
    disposed = true;
    removeEventListener?.();
    removeStreamSubscribe?.();
    officialStreamClear(sessionId);
  }

  return { dispose, reload, start, submitMessage };
}
