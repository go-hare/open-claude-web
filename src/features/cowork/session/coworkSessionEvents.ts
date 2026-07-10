import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { asRecord, rawMessageContent, stringValue } from "./recordUtils";
import type { CoworkSessionDataState, CoworkStreamActivity } from "./types";

export function isCoworkSessionEvent(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  if (raw.sessionId === sessionId || raw.id === sessionId) return true;
  const session = asRecord(raw.session);
  return session.id === sessionId || session.sessionId === sessionId;
}

export function coworkStreamMessage(event: unknown): Record<string, unknown> | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  if (raw.type === "message" && message.type === "stream_event") return message;
  return raw.type === "stream_event" ? raw : null;
}

export function coworkTranscriptMessage(event: unknown): ChatMessage | null {
  const raw = asRecord(event);
  if (raw.type !== "message") return null;
  const message = asRecord(raw.message);
  if (message.type === "stream_event" || message.type === "result" || message.type === "error") return null;
  const type = stringValue(message.type);
  if (type !== "assistant" && type !== "user" && type !== "system") return null;
  return chatMessageFromRawEvent(message);
}

export function shouldReloadCoworkTranscript(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  return ["transcript_loaded", "result", "completed", "close", "error", "cleared", "stopped", "permission_mode_changed"].includes(type ?? "");
}

export function shouldClearCoworkStream(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  return ["result", "completed", "close", "error", "cleared", "stopped"].includes(type ?? "");
}

export function shouldSettleCoworkStream(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "completed";
  }
  return type === "result" || type === "completed" || type === "close";
}

export function isCoworkStreamStart(streamMessage: Record<string, unknown>) {
  return stringValue(asRecord(streamMessage.event).type) === "message_start";
}

export function coworkStreamMessageId(streamMessage: Record<string, unknown>) {
  const event = asRecord(streamMessage.event);
  return stringValue(asRecord(event.message).id) ?? stringValue(streamMessage.uuid) ?? null;
}

export function coworkStreamActivity(streamMessage: Record<string, unknown>, current: CoworkStreamActivity) {
  const event = asRecord(streamMessage.event);
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return "requesting";
  if (eventType === "content_block_start") {
    const blockType = stringValue(asRecord(event.content_block).type);
    if (blockType === "thinking") return "thinking";
    if (blockType === "tool_use") return "tool-use";
  }
  if (eventType === "content_block_delta") {
    const deltaType = stringValue(asRecord(event.delta).type);
    if (deltaType === "thinking_delta") return "thinking";
    if (deltaType === "text_delta" || deltaType === "connector_text_delta") return "responding";
  }
  return current;
}

export function mergeCoworkTranscriptMessage(current: CoworkSessionDataState, nextMessage: ChatMessage) {
  const rawMessages = current.session?.messages ?? current.messages;
  const nextMessages = upsertMessage(rawMessages, nextMessage);
  if (nextMessages === rawMessages) return current;
  return {
    ...current,
    messages: nextMessages.filter((message) => stringValue(asRecord(message.raw).type) !== "stream_event"),
    session: current.session ? { ...current.session, messages: nextMessages } : current.session,
  };
}

function chatMessageFromRawEvent(rawEvent: Record<string, unknown>): ChatMessage {
  const nested = asRecord(rawEvent.message);
  const rawAuthor = stringValue(rawEvent.author);
  const rawRole = stringValue(rawEvent.role) ?? stringValue(nested.role);
  const rawType = stringValue(rawEvent.type);
  const role = rawRole === "assistant" || rawRole === "system" ? rawRole
    : rawAuthor === "assistant" || rawAuthor === "system" ? rawAuthor
      : rawType === "assistant" || rawType === "system" ? rawType : "user";
  return {
    id: stringValue(rawEvent.id) ?? stringValue(rawEvent.uuid) ?? stringValue(rawEvent.message_id) ?? stringValue(nested.id) ?? `msg_${Date.now()}`,
    role,
    text: rawEventText(rawEvent),
    createdAt: stringValue(rawEvent.createdAt) ?? stringValue(rawEvent.timestamp) ?? new Date().toISOString(),
    raw: rawEvent,
  };
}

function rawEventText(rawEvent: Record<string, unknown>) {
  const direct = stringValue(rawEvent.text) ?? stringValue(rawEvent.content) ?? stringValue(rawEvent.result) ?? stringValue(rawEvent.error);
  if (direct) return direct;
  const nested = asRecord(rawEvent.message);
  const nestedDirect = stringValue(nested.text) ?? stringValue(nested.content);
  if (nestedDirect) return nestedDirect;
  const content = Array.isArray(nested.content) ? nested.content : rawMessageContent(rawEvent);
  return content.map((item) => {
    const record = asRecord(item);
    if (stringValue(record.type) === "text") return stringValue(record.text) ?? "";
    if (stringValue(record.type) === "thinking") return stringValue(record.thinking) ?? "";
    if (stringValue(record.type) === "tool_result") return stringValue(record.content) ?? "";
    return "";
  }).join("");
}

function upsertMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  const identity = messageIdentity(nextMessage);
  const index = messages.findIndex((message) => messageIdentity(message) === identity);
  if (index < 0) return [...messages, nextMessage];
  if (messages[index] === nextMessage) return messages;
  const nextMessages = messages.slice();
  nextMessages[index] = nextMessage;
  return nextMessages;
}

function messageIdentity(message: ChatMessage) {
  const raw = asRecord(message.raw);
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
}
