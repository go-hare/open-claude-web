import type { CoworkDetectedFile, CoworkSessionSnapshot } from "../../../adapters/desktopBridge/types";
import type { CoworkPermissionRequest } from "./coworkPermissionTypes";
import { chatMessageFromCoworkEvent } from "./coworkSessionEvents";
import type { CoworkInitializationStatus, CoworkRawMessage, CoworkSessionDataState } from "./types";

export function createInitialCoworkSessionState(sessionId: string): CoworkSessionDataState {
  return {
    agentActivity: null,
    connectionState: "connecting",
    error: null,
    errorCategory: null,
    fsDetectedFiles: new Map(),
    initializationStatus: null,
    isLoading: true,
    isSessionNotFound: false,
    messages: [],
    pendingMessages: [],
    pendingTurn: null,
    promptSuggestion: null,
    session: null,
    sessionId,
    streamActivity: "idle",
    streamingMessageId: null,
    streamSnapshot: null,
    toolPermissionRequests: [],
  };
}

export function hydrateCoworkSessionState(
  current: CoworkSessionDataState,
  session: CoworkSessionSnapshot | null,
  transcript: readonly unknown[],
): CoworkSessionDataState {
  if (!session) {
    return {
      ...current,
      connectionState: "disconnected",
      error: null,
      errorCategory: null,
      isLoading: false,
      isSessionNotFound: true,
    };
  }
  const rawSource = transcript.length ? transcript : session.rawMessages ?? session.messages ?? [];
  const source = normalizeCoworkTranscript(rawSource);
  const buffered = normalizeCoworkTranscript(session.rawBufferedMessages ?? session.bufferedMessages ?? []);
  const messages = mergeBufferedMessages(source, buffered, source.length > 0);
  const canonicalMessages = messages.length ? messages : initialMessage(session);
  const messageUuids = new Set(canonicalMessages.map(messageIdentity).filter(Boolean));
  // Official beginPendingTurn / Qke: a running session has an active pendingTurn
  // until result/error/clear. Seed when hydrating a live turn without one.
  const pendingTurn =
    session.isRunning === true
      ? (current.pendingTurn ?? { endTurnSeen: false, startTime: Date.now() })
      : null;
  return {
    ...current,
    connectionState: "connected",
    error: session.error ? new Error(session.error) : null,
    errorCategory: null,
    // Official D1e hydrate ~114116: n.fsDetectedFiles → Me Map.
    fsDetectedFiles: coworkFsDetectedMapFromSession(session, current.fsDetectedFiles),
    initializationStatus: normalizeInitializationStatus(session.initializationStatus),
    isLoading: false,
    isSessionNotFound: false,
    messages: canonicalMessages,
    pendingMessages: current.pendingMessages.filter((message) => !messageUuids.has(messageIdentity(message))),
    pendingTurn,
    promptSuggestion: session.promptSuggestion ?? null,
    session: { ...session, messages: canonicalMessages },
    streamActivity: pendingTurn && !pendingTurn.endTurnSeen ? current.streamActivity : "idle",
    streamingMessageId: pendingTurn && !pendingTurn.endTurnSeen ? current.streamingMessageId : null,
    streamSnapshot: pendingTurn && !pendingTurn.endTurnSeen ? current.streamSnapshot : null,
    toolPermissionRequests: normalizePendingPermissions(session),
  };
}

/** Official: only replace Me when getSession returns a non-empty fsDetectedFiles array. */
export function coworkFsDetectedMapFromSession(
  session: CoworkSessionSnapshot | null | undefined,
  previous: Map<string, CoworkDetectedFile>,
) {
  const files = session?.fsDetectedFiles;
  if (!files?.length) return previous;
  return new Map(files.map((file) => [file.hostPath, file]));
}

function normalizeInitializationStatus(value: unknown): CoworkInitializationStatus | null {
  const source = record(value);
  if (!Object.keys(source).length) return null;
  return {
    ...(typeof source.isComplete === "boolean" ? { isComplete: source.isComplete } : {}),
    ...(typeof source.message === "string" ? { message: source.message } : {}),
    ...(typeof source.startTime === "number" ? { startTime: source.startTime } : {}),
    ...(typeof source.step === "string" ? { step: source.step } : {}),
  };
}

export function normalizeCoworkTranscript(entries: readonly unknown[]): CoworkRawMessage[] {
  return entries
    .map(normalizeCoworkTranscriptEntry)
    .filter((message): message is CoworkRawMessage => message !== null);
}

export function mergeTranscriptMessages(fresh: CoworkRawMessage[], existing: CoworkRawMessage[]) {
  const receivedAtByUuid = new Map<string, unknown>();
  for (const message of existing) {
    const uuid = messageIdentity(message);
    const receivedStreamAt = record(message.raw).receivedStreamAt;
    if (uuid && receivedStreamAt !== undefined) receivedAtByUuid.set(uuid, receivedStreamAt);
  }
  const merged = uniqueMessages(fresh).map((message) => {
    const uuid = messageIdentity(message);
    const receivedStreamAt = uuid ? receivedAtByUuid.get(uuid) : undefined;
    return receivedStreamAt === undefined
      ? message
      : { ...message, raw: { ...record(message.raw), receivedStreamAt } };
  });
  const freshUuids = new Set(merged.map(messageIdentity).filter(Boolean));
  return [...merged, ...existing.filter((message) => {
    const uuid = messageIdentity(message);
    return Boolean(uuid) && !freshUuids.has(uuid);
  })];
}

function mergeBufferedMessages(
  transcript: CoworkRawMessage[],
  buffered: CoworkRawMessage[],
  hasTranscript: boolean,
) {
  const additions = hasTranscript
    ? buffered.filter((message) => Boolean(record(message.raw).parent_tool_use_id))
    : buffered;
  return uniqueMessages([...transcript, ...additions]);
}

function initialMessage(session: CoworkSessionSnapshot): CoworkRawMessage[] {
  if (!session.initialMessage) return [];
  const uuid = `${session.id}:initial-message`;
  return [{
    createdAt: new Date(session.createdAtMs ?? Date.now()).toISOString(),
    id: uuid,
    raw: {
      message: { content: [{ text: session.initialMessage, type: "text" }], role: "user" },
      session_id: session.id,
      type: "user",
      uuid,
    },
    role: "user",
    text: session.initialMessage,
  }];
}

function normalizeCoworkTranscriptEntry(value: unknown): CoworkRawMessage | null {
  const raw = record(value);
  const id = stringValue(raw.id);
  const role = raw.role;
  if (
    id
    && (role === "user" || role === "assistant" || role === "system")
    && typeof raw.text === "string"
    && typeof raw.createdAt === "string"
  ) {
    return {
      createdAt: raw.createdAt,
      id,
      raw: raw.raw ?? value,
      role,
      text: raw.text,
    };
  }
  const message = raw.type === "message" ? record(raw.message) : raw;
  return chatMessageFromCoworkEvent(message);
}

function normalizePendingPermissions(session: CoworkSessionSnapshot): CoworkPermissionRequest[] {
  return (session.pendingToolPermissions ?? []).map((request) => ({
    alwaysAllowScope: request.alwaysAllowScope,
    description: request.description,
    hasAlwaysAllow: request.hasAlwaysAllow,
    input: record(request.input),
    requestId: request.requestId,
    sessionId: request.sessionId || session.id,
    suggestions: request.suggestions,
    toolName: request.toolName,
    toolUseId: request.toolUseId ?? request.requestId,
  }));
}

function uniqueMessages(messages: CoworkRawMessage[]) {
  const seen = new Set<string>();
  return messages.filter((message) => {
    const uuid = messageIdentity(message);
    if (!uuid || seen.has(uuid)) return false;
    seen.add(uuid);
    return true;
  });
}

export function messageIdentity(message: CoworkRawMessage) {
  const raw = record(message.raw);
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length ? value : undefined;
}
