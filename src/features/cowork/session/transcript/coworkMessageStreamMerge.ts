import type { CoworkStreamSnapshot } from "../stream/coworkStreamTypes";
import type { CoworkRawMessage } from "../types";
import { asRecord, parseJsonObject } from "../recordUtils";
import { apiMessageId, messageUuid } from "./coworkMessageStoreHelpers";

export function toCoworkSdkMessage(message: CoworkRawMessage) {
  const raw = asRecord(message.raw);
  if (Object.keys(raw).length > 0) return raw;
  return {
    type: message.role,
    uuid: message.id,
    message: {
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    },
  };
}

export function mergeCoworkStreamedSdkMessage(
  messages: Record<string, unknown>[],
  snapshot: NonNullable<CoworkStreamSnapshot>,
) {
  const streamed = sdkMessageFromStream(snapshot);
  // Official: while Va/Pke owns this Anthropic message.id, durable multi-emit assistants
  // for the same id must not sit beside the stream row (whole-message dump vs typewriter).
  const liveApiId = snapshot.apiMessageId ?? snapshot.messageId;
  const match = (message: Record<string, unknown>) => {
    if (message.type !== "assistant") return false;
    const apiId = apiMessageId(message);
    if (liveApiId && apiId && apiId === liveApiId) return true;
    const uuid = messageUuid(message, "");
    return uuid === snapshot.messageId || (liveApiId ? uuid === liveApiId : false);
  };
  const index = messages.findIndex(match);
  if (index < 0) return [...messages, streamed];
  return [
    ...messages.slice(0, index),
    streamed,
    ...messages.slice(index + 1).filter((message) => !match(message)),
  ];
}

function sdkMessageFromStream(snapshot: NonNullable<CoworkStreamSnapshot>) {
  return {
    type: "assistant",
    uuid: snapshot.messageId,
    receivedStreamAt: Date.now(),
    message: {
      id: snapshot.apiMessageId ?? snapshot.messageId,
      model: snapshot.model,
      role: "assistant",
      stop_reason: null,
      stop_sequence: null,
      type: "message",
      usage: snapshot.usage,
      content: snapshot.blocks.map(streamBlock),
    },
  };
}

function streamBlock(block: NonNullable<CoworkStreamSnapshot>["blocks"][number]) {
  if (block.kind === "tool") {
    return {
      type: "tool_use",
      id: block.id,
      name: block.name,
      input: parseJsonObject(block.partialJson) ?? {},
      partial_json: block.partialJson,
    };
  }
  if (block.kind === "thinking") {
    return {
      type: "thinking",
      thinking: block.text,
      ...(block.cutOff ? { cut_off: true } : {}),
      ...(block.summaries?.length ? { summaries: block.summaries } : {}),
    };
  }
  return { type: "text", text: block.text };
}
