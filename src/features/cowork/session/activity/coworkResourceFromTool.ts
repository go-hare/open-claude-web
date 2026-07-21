import type { CoworkRawMessage } from "../types";
import { basename, coworkMemoryPath, coworkResourceCategory, coworkResourceDisplayName, normalizeCoworkPath } from "./coworkResourcePaths";
import { parseCoworkSearchResults } from "./coworkResourceSearchResults";
import type { CoworkResourceActivity, CoworkResourceOperation, CoworkTranscriptToolUse } from "./coworkResourceTypes";

export const coworkChromeMcpServerUuid = "a8f3c7e2-4b9d-4f1a-8c3e-9d2a5b7f8e1c";

type ResourceActivityInput = Omit<CoworkResourceActivity, "categoryKey" | "displayName" | "fileName"> & {
  fileName?: string;
};

type CoworkToolResult = {
  content: unknown;
  isError?: boolean;
};

type CoworkMcpToolMatch = {
  server: {
    iconSrc?: string;
    iconType?: string;
    name: string;
    uuid: string;
  };
  tool: {
    displayName?: string;
    name: string;
  };
};

export type CoworkResourceActivityOptions = {
  lookupMcpTool?: (toolName?: string) => CoworkMcpToolMatch | undefined;
};

export function collectCoworkToolResults(messages: CoworkRawMessage[]) {
  const results = new Map<string, CoworkToolResult>();
  for (const message of messages) {
    for (const item of rawMessageContent(message)) {
      const result = asRecord(item);
      const toolUseId = stringValue(result.tool_use_id);
      if (result.type !== "tool_result" || !toolUseId) continue;
      results.set(toolUseId, {
        content: result.content,
        isError: booleanValue(result.is_error),
      });
    }
  }
  return results;
}

export function rawCoworkToolUses(message: CoworkRawMessage): CoworkTranscriptToolUse[] {
  return rawMessageContent(message).flatMap((item, index) => {
    const record = asRecord(item);
    const itemType = stringValue(record.type) ?? stringValue(record.kind);
    const name = stringValue(record.name) ?? stringValue(record.tool_name);
    if (itemType !== "tool_use" && !name) return [];
    return [{ id: stringValue(record.id) ?? `tool-${index}`, input: asRecord(record.input), name: name ?? "Tool" }];
  });
}

export function coworkResourceActivitiesFromTool(
  message: CoworkRawMessage,
  messageIndex: number,
  tool: CoworkTranscriptToolUse,
  result: CoworkToolResult | undefined,
  options: CoworkResourceActivityOptions,
): CoworkResourceActivity[] {
  const operation = coworkResourceOperation(tool);
  if (!operation) return [];
  const timestamp = coworkResourceTimestamp(message, messageIndex);
  if (operation === "web_search") return [webSearchActivity(tool, timestamp, result)];
  if (operation === "skill_invoked") return optionalActivity(skillActivity(tool, timestamp));
  if (operation === "mcp_tool") return optionalActivity(mcpActivity(tool, timestamp, result, options));
  if (tool.name === "present_files" || tool.name === "mcp__cowork__present_files") {
    return presentFilesActivities(tool, timestamp, result);
  }
  const filePath = coworkToolFilePath(tool);
  if (!filePath) return [];
  return [createCoworkResourceActivity({
    filePath,
    latestId: tool.id,
    operation: coworkMemoryPath(filePath) ? "memory" : operation,
    timestamp,
    toolName: tool.name,
  })];
}

function webSearchActivity(tool: CoworkTranscriptToolUse, timestamp: number, result?: CoworkToolResult) {
  const query = stringValue(tool.input.query) ?? "Web search";
  return createCoworkResourceActivity({
    fileName: query,
    filePath: `web_search://${tool.id}`,
    isError: result?.isError,
    latestId: tool.id,
    operation: "web_search",
    searchQuery: query,
    searchResults: parseCoworkSearchResults(result?.content),
    timestamp,
    toolName: tool.name,
  });
}

function skillActivity(tool: CoworkTranscriptToolUse, timestamp: number) {
  const skill = stringValue(tool.input.skill) ?? stringValue(tool.input.name);
  if (!skill) return null;
  return createCoworkResourceActivity({
    fileName: basename(skill) ?? skill,
    filePath: `skill://${skill}`,
    latestId: tool.id,
    operation: "skill_invoked",
    pluginName: pluginNameFromQualifiedName(skill),
    skillName: skill,
    timestamp,
    toolName: tool.name,
  });
}

function mcpActivity(
  tool: CoworkTranscriptToolUse,
  timestamp: number,
  result: CoworkToolResult | undefined,
  options: CoworkResourceActivityOptions,
) {
  const match = options.lookupMcpTool?.(tool.name);
  const parsed = match ? null : parseCoworkMcpToolName(tool.name);
  if (!match && !parsed) return null;
  const serverUuid = match?.server.uuid ?? parsed?.server ?? "";
  const toolName = match?.tool.name ?? parsed?.tool ?? "";
  const serverName = match?.server.name ?? coworkMcpServerDisplayName(serverUuid, tool.input);
  const displayName = match?.tool.displayName
    ?? stringValue(tool.input.tool_display_name)
    ?? stringValue(tool.input.toolDisplayName)
    ?? toolName;
  return createCoworkResourceActivity({
    fileName: toolName,
    filePath: `mcp://${serverUuid}/${toolName}`,
    latestId: tool.id,
    mcpServer: {
      iconSrc: match?.server.iconSrc,
      iconType: match?.server.iconType,
      name: serverName,
      uuid: serverUuid,
    },
    mcpServerUuid: serverUuid,
    mcpToolDisplayName: displayName,
    mcpToolInput: tool.input,
    mcpToolName: toolName,
    mcpToolResult: result ? {
      content: normalizeCoworkToolResultContent(result.content),
      isError: result.isError,
    } : undefined,
    operation: "mcp_tool",
    timestamp,
    toolName: tool.name,
  });
}

function presentFilesActivities(tool: CoworkTranscriptToolUse, timestamp: number, result?: CoworkToolResult) {
  if (result?.isError || !Array.isArray(result?.content)) return [];
  return result.content.flatMap((item) => {
    const content = asRecord(item);
    const filePath = content.type === "local_resource"
      ? stringValue(content.file_path)
      : content.type === "text"
        ? stringValue(content.text)
        : undefined;
    if (!filePath) return [];
    return [createCoworkResourceActivity({
      filePath,
      latestId: `${tool.id}-${filePath}`,
      operation: "create",
      timestamp,
      toolName: tool.name,
    })];
  });
}

export function createCoworkResourceActivity(input: ResourceActivityInput): CoworkResourceActivity {
  const normalizedPath = normalizeCoworkPath(input.filePath);
  const fileName = input.fileName ?? basename(normalizedPath) ?? normalizedPath;
  const categoryKey = coworkResourceCategory(normalizedPath, input.operation);
  return {
    ...input,
    categoryKey,
    displayName: coworkResourceDisplayName(normalizedPath, fileName, categoryKey),
    fileName,
  };
}

function coworkResourceTimestamp(message: CoworkRawMessage, messageIndex: number) {
  return numberValue(asRecord(message.raw).receivedStreamAt) ?? messageIndex;
}

function rawMessageContent(message: CoworkRawMessage) {
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  const content = raw.content ?? nested.content;
  return Array.isArray(content) ? content : [];
}

function optionalActivity(activity: CoworkResourceActivity | null) {
  return activity ? [activity] : [];
}

function normalizeCoworkToolResultContent(content: unknown): unknown[] {
  if (Array.isArray(content)) {
    return content.map((item) => typeof item === "string" ? { text: item, type: "text" } : item);
  }
  return typeof content === "string" ? [{ text: content, type: "text" }] : [];
}

function coworkToolFilePath(tool: CoworkTranscriptToolUse) {
  return stringValue(tool.input.file_path) ?? stringValue(tool.input.filePath)
    ?? stringValue(tool.input.notebook_path) ?? stringValue(tool.input.notebookPath)
    ?? stringValue(tool.input.path);
}

function parseCoworkMcpToolName(toolName: string) {
  const match = /^mcp__(.+?)__(.+)$/.exec(toolName);
  return match ? { server: match[1], tool: match[2] } : null;
}

function coworkMcpServerDisplayName(server: string, input: Record<string, unknown>) {
  const explicitName = stringValue(input.server_name) ?? stringValue(input.serverName)
    ?? stringValue(input.mcp_server_name) ?? stringValue(input.mcpServerName);
  return isCoworkChromeMcpServer({ uuid: server, name: explicitName }) ? "Claude in Chrome" : explicitName ?? server;
}

export function isCoworkChromeMcpServer(server: { uuid?: string; name?: string }) {
  return server.uuid === coworkChromeMcpServerUuid || server.name === "Claude in Chrome" || server.name === "Claude for Chrome";
}

function pluginNameFromQualifiedName(value: string) {
  const separator = value.indexOf(":");
  return separator > 0 ? value.slice(0, separator) : undefined;
}

function coworkResourceOperation(tool: CoworkTranscriptToolUse): CoworkResourceOperation | null {
  if (tool.name === "present_files" || tool.name === "mcp__cowork__present_files") return "create";
  if (parseCoworkMcpToolName(tool.name)) return "mcp_tool";
  if (tool.name === "Read" || tool.name === "View") return "read";
  if (tool.name === "Write") return "write";
  if (["Edit", "MultiEdit", "NotebookEdit"].includes(tool.name)) return "edit";
  if (tool.name === "WebSearch") return "web_search";
  if (tool.name === "Skill") return "skill_invoked";
  if (tool.name === "Grep" || tool.name === "Glob") {
    const filePath = coworkToolFilePath(tool);
    return filePath && coworkMemoryPath(filePath) ? "memory" : null;
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown) {
  return typeof value === "boolean" ? value : undefined;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
