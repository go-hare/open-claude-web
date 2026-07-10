import type { CoworkToolUse } from "./types";

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

export function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

export function rawMessageHasToolResult(raw: Record<string, unknown>) {
  return rawMessageContent(raw).some((item) => {
    const record = asRecord(item);
    return (stringValue(record.type) ?? stringValue(record.kind)) === "tool_result";
  });
}

export function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(toolResultText).filter(Boolean).join("\n");
  const record = asRecord(content);
  return stringValue(record.text)
    ?? stringValue(record.content)
    ?? (Object.keys(record).length ? JSON.stringify(record, null, 2) : "");
}

export function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    return asRecord(JSON.parse(value));
  } catch {
    return null;
  }
}

export function normalizeCoworkToolUse(tool: unknown, index = 0): CoworkToolUse {
  const record = asRecord(tool);
  const result = asRecord(record.toolUseResult ?? record.tool_use_result);
  const isError = record.isError === true || record.is_error === true || result.isError === true || result.is_error === true;
  const output = stringValue(record.output) ?? stringValue(record.content)
    ?? stringValue(result.output) ?? stringValue(result.content);
  const activity = normalizeSubagentActivity(record.subagentActivity ?? record.subagent_activity);
  return {
    id: stringValue(record.id) ?? `tool-${index}`,
    input: asRecord(record.input),
    isError,
    name: stringValue(record.name) ?? stringValue(record.tool_name) ?? stringValue(record.kind) ?? "Tool",
    output,
    status: normalizeToolStatus(record.status, isError, output),
    ...(activity ? { subagentActivity: activity } : {}),
  };
}

function normalizeSubagentActivity(value: unknown): CoworkToolUse["subagentActivity"] | undefined {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return undefined;
  return {
    latestToolName: stringValue(raw.latestToolName) ?? stringValue(raw.latest_tool_name),
    model: stringValue(raw.model),
    toolCallCount: typeof raw.toolCallCount === "number"
      ? raw.toolCallCount
      : typeof raw.tool_call_count === "number" ? raw.tool_call_count : undefined,
  };
}

function normalizeToolStatus(status: unknown, isError?: boolean, output?: string): CoworkToolUse["status"] {
  if (status === "awaiting_approval") return "awaiting_approval";
  if (status === "running") return "running";
  if (status === "error" || isError) return "error";
  if (status === "completed" || output) return "completed";
  return "running";
}
