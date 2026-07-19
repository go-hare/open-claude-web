import { asRecord, parseJsonObject, stringValue } from "../recordUtils";
import type { CoworkAgentActivity } from "../types";
import type { CoworkStreamSnapshot } from "./coworkStreamTypes";

export function coworkAgentActivityFromStream(
  snapshot: CoworkStreamSnapshot,
  streamMessage: Record<string, unknown>,
  previous: CoworkAgentActivity | null,
  receivedAt: number,
): CoworkAgentActivity | null {
  const event = asRecord(streamMessage.event);
  // Official: message_start before first content_block — no Va blocks yet (Pke emits only when length>0).
  if (!snapshot) {
    const eventType = stringValue(event.type);
    if (eventType === "message_start") {
      return { activity: "thinking", contentLength: 0, lastActivityTime: receivedAt };
    }
    if (eventType === "content_block_start") {
      const blockType = stringValue(asRecord(event.content_block).type);
      if (blockType === "tool_use") {
        return {
          activity: "tool_use",
          contentLength: 0,
          lastActivityTime: receivedAt,
          toolName: stringValue(asRecord(event.content_block).name),
        };
      }
      if (blockType === "thinking") return { activity: "thinking", contentLength: 0, lastActivityTime: receivedAt };
    }
    if (eventType === "content_block_delta") {
      const deltaType = stringValue(asRecord(event.delta).type);
      if (deltaType === "text_delta" || deltaType === "connector_text_delta") {
        return { activity: "writing", contentLength: previous?.contentLength ?? 0, lastActivityTime: receivedAt };
      }
      if (deltaType === "thinking_delta") {
        return { activity: "thinking", contentLength: previous?.contentLength ?? 0, lastActivityTime: previous?.lastActivityTime ?? receivedAt };
      }
    }
    return previous;
  }
  const activity = nextActivity(snapshot, event, previous);
  const lastActivityTime = shouldResetActivityTime(event, previous, activity)
    ? receivedAt
    : previous?.lastActivityTime ?? receivedAt;
  const contentLength = snapshot.blocks.reduce((length, block) => {
    if (block.kind === "text") return length + block.text.length;
    if (block.kind === "tool") return length + block.partialJson.length;
    return length;
  }, 0);
  if (activity !== "tool_use") return { activity, contentLength, lastActivityTime };
  const block = activeToolBlock(snapshot);
  if (!block) return { activity, contentLength, lastActivityTime };
  const filePath = toolFilePath(block.partialJson);
  return {
    activity,
    contentLength,
    ...(filePath ? { filePath } : {}),
    lastActivityTime,
    toolName: block.name,
  };
}

function nextActivity(snapshot: NonNullable<CoworkStreamSnapshot>, event: Record<string, unknown>, previous: CoworkAgentActivity | null): CoworkAgentActivity["activity"] {
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return "thinking";
  if (eventType === "content_block_start") {
    const blockType = stringValue(asRecord(event.content_block).type);
    if (blockType === "tool_use") return "tool_use";
    if (blockType === "thinking") return "thinking";
  }
  if (eventType === "content_block_delta") {
    const deltaType = stringValue(asRecord(event.delta).type);
    if (deltaType === "text_delta" || deltaType === "connector_text_delta") return "writing";
    if (deltaType === "thinking_delta") return "thinking";
  }
  if (previous) return previous.activity;
  const block = snapshot.blocks.at(-1);
  return block?.kind === "tool" ? "tool_use" : block?.kind === "text" && block.text ? "writing" : "thinking";
}

function shouldResetActivityTime(event: Record<string, unknown>, previous: CoworkAgentActivity | null, activity: CoworkAgentActivity["activity"]) {
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return true;
  if (eventType === "content_block_start" && stringValue(asRecord(event.content_block).type) === "tool_use") return true;
  return activity === "writing" && previous?.activity !== "writing";
}

function activeToolBlock(snapshot: NonNullable<CoworkStreamSnapshot>) {
  for (let index = snapshot.blocks.length - 1; index >= 0; index -= 1) {
    const block = snapshot.blocks[index];
    if (block.kind === "tool" && (!snapshot.activeToolId || block.id === snapshot.activeToolId)) return block;
  }
  return undefined;
}

function toolFilePath(partialJson: string) {
  const input = parseJsonObject(partialJson) ?? {};
  return stringValue(input.file_path) ?? stringValue(input.path)
    ?? partialJson.match(/"(?:file_path|path)"\s*:\s*"([^"]+)/)?.[1];
}
