import type { CoworkSessionSnapshot } from "../../../adapters/desktopBridge/types";
import type { CoworkPermissionRequest } from "./coworkPermissionTypes";
import { upsertCoworkPermission } from "./coworkPermissionEvents";
import {
  coworkStreamActivity,
  coworkStreamMessageId,
  isCoworkStreamStart,
  mergeCoworkTranscriptMessage,
} from "./coworkSessionEvents";
import {
  hydrateCoworkSessionState,
  mergeTranscriptMessages,
  messageIdentity,
  normalizeCoworkTranscript,
} from "./coworkSessionHydration";
import { asRecord } from "./recordUtils";
import { reduceCoworkStreamEvent } from "./stream/coworkStreamingState";
import { coworkAgentActivityFromStream } from "./stream/coworkStreamActivity";
import type { CoworkInitializationStatus, CoworkRawMessage, CoworkSessionDataState } from "./types";

export type CoworkSessionAction =
  | { type: "hydration-started" }
  | { error: Error; type: "hydration-failed" }
  | { session: CoworkSessionSnapshot | null; transcript: readonly unknown[]; type: "hydration-succeeded" }
  | { message: CoworkRawMessage; startedAt: number; type: "pending-message-added" }
  | { messageUuid: string; type: "pending-message-failed" }
  | { requests: CoworkPermissionRequest[]; type: "permissions-replaced" }
  | { request: CoworkPermissionRequest; type: "permission-upserted" }
  | { requestId: string; type: "permission-resolved" }
  | { message: Record<string, unknown>; startedAt: number; type: "stream-event" }
  | { message: CoworkRawMessage; receivedAt: number; type: "transcript-message" }
  | { disconnected: boolean; type: "settled" }
  | { error: Error; errorCategory?: string; type: "runtime-error" }
  | { receivedAt: number; status: CoworkInitializationStatus; type: "initialization-status" }
  | { suggestion: string | null; type: "prompt-suggestion" }
  | { session: CoworkSessionSnapshot; type: "metadata-refreshed" }
  | { transcript: readonly unknown[]; type: "transcript-refreshed" };

export function reduceCoworkSessionState(
  state: CoworkSessionDataState,
  action: CoworkSessionAction,
): CoworkSessionDataState {
  switch (action.type) {
    case "hydration-started":
      return { ...state, connectionState: "connecting", error: null, errorCategory: null, isLoading: !state.session && !state.messages.length };
    case "hydration-failed":
      return { ...state, connectionState: "disconnected", error: action.error, isLoading: false };
    case "hydration-succeeded":
      return hydrateCoworkSessionState(state, action.session, action.transcript);
    case "pending-message-added":
      return {
        ...state,
        error: null,
        errorCategory: null,
        pendingMessages: [...state.pendingMessages, action.message],
        pendingTurn: { endTurnSeen: false, startTime: action.startedAt },
      };
    case "pending-message-failed":
      return { ...state, pendingMessages: withoutMessage(state.pendingMessages, action.messageUuid), pendingTurn: null };
    case "permissions-replaced":
      return { ...state, toolPermissionRequests: action.requests };
    case "permission-upserted":
      return { ...state, toolPermissionRequests: upsertCoworkPermission(state.toolPermissionRequests, action.request) };
    case "permission-resolved":
      return { ...state, toolPermissionRequests: state.toolPermissionRequests.filter((request) => request.requestId !== action.requestId) };
    case "stream-event":
      return reduceStreamEvent(state, action.message, action.startedAt);
    case "transcript-message":
      return reduceTranscriptMessage(state, action.message, action.receivedAt);
    case "settled":
      return settleState(state, action.disconnected);
    case "runtime-error":
      return failState(state, action.error, action.errorCategory);
    case "initialization-status":
      return applyInitializationStatus(state, action.status, action.receivedAt);
    case "prompt-suggestion":
      return { ...state, promptSuggestion: action.suggestion };
    case "metadata-refreshed":
      return refreshMetadata(state, action.session);
    case "transcript-refreshed":
      return refreshTranscript(state, action.transcript);
  }
}

function applyInitializationStatus(state: CoworkSessionDataState, status: CoworkInitializationStatus, receivedAt: number): CoworkSessionDataState {
  const sameStep = state.initializationStatus?.step === status.step;
  const startTime = status.isComplete
    ? undefined
    : sameStep ? state.initializationStatus?.startTime ?? receivedAt : receivedAt;
  return {
    ...state,
    initializationStatus: {
      ...status,
      ...(startTime === undefined ? {} : { startTime }),
    },
  };
}

function reduceStreamEvent(
  state: CoworkSessionDataState,
  message: Record<string, unknown>,
  startedAt: number,
) {
  const isStart = isCoworkStreamStart(message);
  const streamSnapshot = reduceCoworkStreamEvent(state.streamSnapshot, message);
  return {
    ...state,
    agentActivity: coworkAgentActivityFromStream(streamSnapshot, message, state.agentActivity, startedAt),
    connectionState: "connected" as const,
    error: null,
    errorCategory: null,
    pendingTurn: state.pendingTurn ?? { endTurnSeen: false, startTime: startedAt },
    session: isStart && state.session ? { ...state.session, isRunning: true } : state.session,
    streamActivity: streamSnapshot ? coworkStreamActivity(message, state.streamActivity) : "idle" as const,
    streamingMessageId: isStart ? coworkStreamMessageId(message) : streamSnapshot ? state.streamingMessageId : null,
    streamSnapshot,
  };
}

function reduceTranscriptMessage(
  state: CoworkSessionDataState,
  message: CoworkRawMessage,
  receivedAt: number,
) {
  const received = { ...message, raw: { ...asRecord(message.raw), receivedStreamAt: receivedAt } };
  const merged = mergeCoworkTranscriptMessage(state, received);
  const endTurnSeen = isTopLevelAssistantEndTurn(message);
  return {
    ...merged,
    agentActivity: endTurnSeen ? null : merged.agentActivity,
    connectionState: "connected" as const,
    error: null,
    errorCategory: null,
    pendingMessages: withoutMessage(merged.pendingMessages, messageIdentity(message)),
    pendingTurn: endTurnSeen && merged.pendingTurn
      ? { ...merged.pendingTurn, endTurnSeen: true }
      : merged.pendingTurn,
    streamActivity: endTurnSeen ? "idle" : merged.streamActivity,
    streamingMessageId: endTurnSeen ? null : merged.streamingMessageId,
    streamSnapshot: endTurnSeen ? null : merged.streamSnapshot,
  };
}

function failState(state: CoworkSessionDataState, error: Error, errorCategory?: string): CoworkSessionDataState {
  return {
    ...state,
    agentActivity: null,
    error,
    errorCategory: errorCategory ?? null,
    initializationStatus: null,
    isLoading: false,
    pendingTurn: null,
    session: state.session ? { ...state.session, error: error.message, isRunning: false } : state.session,
    streamActivity: "idle",
    streamingMessageId: null,
    streamSnapshot: null,
  };
}

function settleState(state: CoworkSessionDataState, disconnected: boolean): CoworkSessionDataState {
  return {
    ...state,
    agentActivity: null,
    connectionState: disconnected ? "disconnected" : state.connectionState,
    pendingTurn: null,
    session: state.session ? { ...state.session, isRunning: false } : state.session,
    streamActivity: "idle",
    streamingMessageId: null,
    streamSnapshot: null,
  };
}

function refreshMetadata(
  state: CoworkSessionDataState,
  session: CoworkSessionSnapshot,
): CoworkSessionDataState {
  // Mirror hydrate: running sessions keep/seed an active pendingTurn (official beginPendingTurn).
  const pendingTurn =
    session.isRunning === true
      ? (state.pendingTurn ?? { endTurnSeen: false, startTime: Date.now() })
      : state.pendingTurn && !session.isRunning
        ? null
        : state.pendingTurn;
  return {
    ...state,
    error: session.error ? new Error(session.error) : null,
    errorCategory: session.error ? state.errorCategory : null,
    initializationStatus: session.initializationStatus ?? state.initializationStatus,
    pendingTurn,
    promptSuggestion: session.promptSuggestion ?? state.promptSuggestion,
    session: { ...state.session, ...session },
    toolPermissionRequests: state.toolPermissionRequests,
  };
}

function refreshTranscript(
  state: CoworkSessionDataState,
  transcript: readonly unknown[],
): CoworkSessionDataState {
  const messages = mergeTranscriptMessages(normalizeCoworkTranscript(transcript), state.messages);
  const messageUuids = new Set(messages.map(messageIdentity));
  return {
    ...state,
    messages,
    pendingMessages: state.pendingMessages.filter((message) => !messageUuids.has(messageIdentity(message))),
    session: state.session,
  };
}

function withoutMessage(messages: CoworkRawMessage[], messageUuid: string) {
  return messages.filter((message) => messageIdentity(message) !== messageUuid);
}

function isTopLevelAssistantEndTurn(message: CoworkRawMessage) {
  const raw = asRecord(message.raw);
  const payload = asRecord(raw.message);
  return raw.type === "assistant"
    && !raw.parent_tool_use_id
    && payload.stop_reason === "end_turn";
}
