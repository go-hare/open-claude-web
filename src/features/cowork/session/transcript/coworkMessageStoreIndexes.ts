import { asRecord, stringValue } from "../recordUtils";
import { messageContent, normalizeResultContent } from "./coworkMessageStoreHelpers";
import type { CoworkContentBlock } from "./coworkMessageTypes";

export function collectToolResults(messages: Record<string, unknown>[]) {
  const output = new Map<string, CoworkContentBlock>();
  messages.filter((message) => message.type === "user").forEach((message) => {
    messageContent(message).forEach((block) => {
      if (block.type === "tool_result" && block.tool_use_id) {
        output.set(block.tool_use_id, { ...block, content: normalizeResultContent(block.content) });
      }
    });
  });
  return output;
}

export function collectAnswers(messages: Record<string, unknown>[]) {
  const output = new Map<string, unknown>();
  messages.filter((message) => message.type === "user").forEach((message) => {
    const answers = asRecord(message.toolUseResult ?? message.tool_use_result).answers;
    const result = messageContent(message).find((block) => block.type === "tool_result" && block.tool_use_id);
    if (answers && result?.tool_use_id) output.set(result.tool_use_id, answers);
  });
  return output;
}

export function collectResultMetadata(messages: Record<string, unknown>[]) {
  const output = new Map<string, Record<string, unknown>>();
  messages.filter((message) => message.type === "user").forEach((message) => {
    const snake = asRecord(message.tool_use_result);
    const camel = asRecord(message.toolUseResult);
    const mcp = asRecord(message.mcpMeta);
    const structured = snake.structuredContent ?? mcp.structuredContent;
    const meta = snake._meta ?? mcp._meta;
    const attachments = snake.attachments ?? camel.attachments;
    if (!structured && !meta && attachments === undefined) return;
    const result = messageContent(message).find((block) => block.type === "tool_result" && block.tool_use_id);
    if (!result?.tool_use_id) return;
    output.set(result.tool_use_id, {
      ...(structured ? { structured_content: structured } : {}),
      ...(meta ? { meta } : {}),
      ...(attachments !== undefined ? { attachments } : {}),
    });
  });
  return output;
}

export function collectToolSummaries(messages: Record<string, unknown>[]) {
  const output = new Map<string, CoworkContentBlock>();
  messages.filter((message) => message.type === "tool_use_summary").forEach((message) => {
    const ids = Array.isArray(message.preceding_tool_use_ids)
      ? message.preceding_tool_use_ids.filter((id): id is string => typeof id === "string")
      : [];
    const id = ids.at(-1);
    if (id) output.set(id, {
      type: "tool_use_summary",
      summary: stringValue(message.summary) ?? "",
      preceding_tool_use_ids: ids,
    });
  });
  return output;
}
