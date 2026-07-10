import type { ChatMessage } from "../../../../adapters/desktopBridge/types";
import { parseCoworkUploadedFilesText } from "../../newTask/coworkUploadedFiles";
import {
  asRecord,
  normalizeCoworkToolUse,
  rawMessageContent,
  rawMessageHasToolResult,
  stringValue,
  toolResultText,
} from "../recordUtils";
import type { CoworkToolUse, CoworkTranscriptEntry, CoworkTranscriptItem } from "../types";

export function parseCoworkTranscript(messages: ChatMessage[], streamingMessageId?: string | null) {
  const entries: CoworkTranscriptEntry[] = [];
  const pendingTools = new Map<string, CoworkToolUse>();
  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    if (rawType === "result" || rawType === "stream_event" || raw.parent_tool_use_id || raw.parentToolUseId) return;
    if (rawType === "user" && rawMessageHasToolResult(raw)) {
      attachToolResults(raw, pendingTools);
      return;
    }
    const nested = asRecord(raw.message);
    const role = transcriptRole(rawType, message.role, nested);
    if (!role || role === "assistant" && streamingMessageId && stringValue(nested.id) === streamingMessageId) return;
    const content = transcriptContent(raw, nested);
    const items = role === "assistant"
      ? parseAssistantItems(content, pendingTools, index, message.text)
      : parseUserItems(content, index, message.text);
    pushEntry(entries, {
      author: role,
      id: stringValue(raw.id) ?? stringValue(raw.uuid) ?? stringValue(nested.id) ?? message.id,
      items,
      timestamp: stringValue(raw.timestamp) ?? message.createdAt,
    });
  });
  return entries;
}

function transcriptRole(rawType: string | undefined, role: ChatMessage["role"], nested: Record<string, unknown>) {
  const candidate = rawType === "assistant" || rawType === "user" ? rawType : role === "assistant" || role === "user" ? role : stringValue(nested.role);
  return candidate === "assistant" || candidate === "user" ? candidate : null;
}

function transcriptContent(raw: Record<string, unknown>, nested: Record<string, unknown>) {
  if (Array.isArray(nested.content) || typeof nested.content === "string") return nested.content;
  if (Array.isArray(raw.content) || typeof raw.content === "string") return raw.content;
  return undefined;
}

function pushEntry(entries: CoworkTranscriptEntry[], entry: CoworkTranscriptEntry) {
  if (entry.items.length === 0) return;
  const previous = entries.at(-1);
  if (previous?.author === "assistant" && entry.author === "assistant") {
    entries[entries.length - 1] = {
      ...previous,
      items: mergeAssistantItems([...previous.items, ...entry.items]),
      timestamp: entry.timestamp ?? previous.timestamp,
    };
    return;
  }
  entries.push({ ...entry, items: entry.author === "assistant" ? mergeAssistantItems(entry.items) : entry.items });
}

function parseAssistantItems(content: unknown, pendingTools: Map<string, CoworkToolUse>, messageIndex: number, fallbackText: string) {
  const source = normalizeContent(content, fallbackText);
  const items: CoworkTranscriptItem[] = [];
  let toolBuffer: CoworkToolUse[] = [];
  const flushTools = () => {
    if (toolBuffer.length === 0) return;
    items.push({ id: `assistant-${messageIndex}-tools-${items.length}`, kind: "tools", tools: toolBuffer });
    toolBuffer = [];
  };
  source.forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    if (kind === "tool_use") {
      const tool = normalizeCoworkToolUse(record, index);
      toolBuffer.push(tool);
      pendingTools.set(tool.id, tool);
      return;
    }
    flushTools();
    pushAssistantContent(items, record, kind, messageIndex, index);
  });
  flushTools();
  return items;
}

function pushAssistantContent(items: CoworkTranscriptItem[], record: Record<string, unknown>, kind: string | undefined, messageIndex: number, index: number) {
  const id = stringValue(record.id) ?? `assistant-${messageIndex}-${index}`;
  if (kind === "text") {
    const text = stringValue(record.text) ?? stringValue(record.content);
    if (text) items.push({ id, kind: "text", text });
  } else if (kind === "thinking") {
    const text = stringValue(record.thinking) ?? stringValue(record.text);
    if (text) items.push({ id, kind: "thinking", text });
  } else if (kind === "error") {
    items.push({ code: stringValue(record.code), id, kind: "error", text: stringValue(record.text) ?? stringValue(record.error) ?? "Error" });
  }
}

function parseUserItems(content: unknown, messageIndex: number, fallbackText: string) {
  const items: CoworkTranscriptItem[] = [];
  normalizeContent(content, fallbackText).forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    const id = stringValue(record.id) ?? `user-${messageIndex}-${index}`;
    if (kind === "text") pushUserText(items, id, stringValue(record.text) ?? stringValue(record.content));
    else if (kind === "bash") items.push({ command: stringValue(record.command), error: stringValue(record.error), id, kind: "bash", output: stringValue(record.output) });
    else if (kind === "event") {
      const contentText = stringValue(record.content) ?? stringValue(record.text);
      if (contentText) items.push({ content: contentText, eventType: stringValue(record.eventType), id, kind: "event" });
    }
  });
  return items;
}

function normalizeContent(content: unknown, fallbackText: string) {
  if (typeof content === "string") return [{ type: "text", text: content }];
  if (Array.isArray(content)) return content;
  return fallbackText.trim() ? [{ type: "text", text: fallbackText }] : [];
}

function pushUserText(items: CoworkTranscriptItem[], id: string, text?: string) {
  if (!text) return;
  const parsed = parseCoworkUploadedFilesText(text);
  parsed.files.forEach((file, index) => items.push({ file, id: `${id}-file-${index}`, kind: "uploaded-file" }));
  if (parsed.text) items.push({ id, kind: "text", text: parsed.text });
}

function attachToolResults(raw: Record<string, unknown>, pendingTools: Map<string, CoworkToolUse>) {
  for (const item of rawMessageContent(raw)) {
    const record = asRecord(item);
    if ((stringValue(record.type) ?? stringValue(record.kind)) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    const tool = toolUseId ? pendingTools.get(toolUseId) : undefined;
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    tool.output = toolResultText(record.content);
    pendingTools.delete(tool.id);
  }
}

function mergeAssistantItems(items: CoworkTranscriptItem[]) {
  const merged: CoworkTranscriptItem[] = [];
  for (const item of items) {
    const previous = merged.at(-1);
    if (previous?.kind === "tools" && item.kind === "tools") {
      merged[merged.length - 1] = { ...previous, tools: [...previous.tools, ...item.tools] };
    } else merged.push(item);
  }
  return merged;
}
