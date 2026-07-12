import { asRecord, rawMessageContent, stringValue } from "./recordUtils";
import type { CoworkRawMessage, CoworkSessionDataState, CoworkStreamActivity } from "./types";

export function isCoworkSessionEvent(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  if (raw.sessionId === sessionId || raw.session_id === sessionId || raw.id === sessionId) return true;
  const message = asRecord(raw.message);
  const session = asRecord(raw.session);
  const request = asRecord(raw.request);
  return message.sessionId === sessionId
    || message.session_id === sessionId
    || session.id === sessionId
    || session.sessionId === sessionId
    || session.session_id === sessionId
    || request.sessionId === sessionId
    || request.session_id === sessionId;
}

export function coworkStreamMessage(event: unknown): Record<string, unknown> | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  if (raw.type === "message" && message.type === "stream_event") return message;
  return raw.type === "stream_event" ? raw : null;
}

export function coworkTranscriptMessage(event: unknown): CoworkRawMessage | null {
  const raw = asRecord(event);
  if (raw.type !== "message") return null;
  const message = asRecord(raw.message);
  if (message.type === "stream_event" || message.type === "result" || message.type === "error") return null;
  const type = stringValue(message.type);
  if (type !== "assistant" && type !== "user" && type !== "system") return null;
  return chatMessageFromCoworkEvent(message);
}

export function shouldClearCoworkStream(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    // Official session lifecycle has no manager-level type:"completed".
    // Clear on result/error only for nested message envelopes.
    return messageType === "result" || messageType === "error";
  }
  return ["result", "close", "error", "cleared", "stopped"].includes(type ?? "");
}

export function shouldSettleCoworkStream(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    // Official settle: result (and runtime also handles top-level close/error).
    // Do not treat synthetic "completed" as a session settle signal.
    return messageType === "result";
  }
  return type === "result" || type === "close" || type === "stopped";
}

export function isCoworkStreamStart(streamMessage: Record<string, unknown>) {
  return stringValue(asRecord(streamMessage.event).type) === "message_start";
}

export function coworkStreamMessageId(streamMessage: Record<string, unknown>) {
  const event = asRecord(streamMessage.event);
  return stringValue(streamMessage.uuid) ?? stringValue(asRecord(event.message).id) ?? null;
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

export function mergeCoworkTranscriptMessage(current: CoworkSessionDataState, nextMessage: CoworkRawMessage) {
  const rawMessages = current.messages;
  const nextMessages = upsertMessage(rawMessages, nextMessage);
  if (nextMessages === rawMessages) return current;
  return {
    ...current,
    messages: nextMessages.filter((message) => stringValue(asRecord(message.raw).type) !== "stream_event"),
    session: current.session,
  };
}

export function chatMessageFromCoworkEvent(rawEvent: Record<string, unknown>): CoworkRawMessage | null {
  const nested = asRecord(rawEvent.message);
  const rawAuthor = stringValue(rawEvent.author);
  const rawRole = stringValue(rawEvent.role) ?? stringValue(nested.role);
  const rawType = stringValue(rawEvent.type);
  const id = stringValue(rawEvent.uuid) ?? stringValue(rawEvent.id) ?? stringValue(rawEvent.message_id) ?? stringValue(nested.id);
  if (!id) return null;
  const role = rawRole === "assistant" || rawRole === "system" ? rawRole
    : rawAuthor === "assistant" || rawAuthor === "system" ? rawAuthor
      : rawType === "assistant" || rawType === "system" ? rawType : "user";
  return {
    id,
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

function upsertMessage(messages: CoworkRawMessage[], nextMessage: CoworkRawMessage) {
  const identity = messageIdentity(nextMessage);
  const index = messages.findIndex((message) => messageIdentity(message) === identity);
  if (index < 0) return [...messages, nextMessage];
  if (messages[index] === nextMessage) return messages;
  const nextMessages = messages.slice();
  nextMessages[index] = nextMessage;
  return nextMessages;
}

function messageIdentity(message: CoworkRawMessage) {
  const raw = asRecord(message.raw);
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
}
