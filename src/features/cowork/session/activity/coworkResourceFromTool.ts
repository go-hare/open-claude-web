import type { ChatMessage } from "../../../../adapters/desktopBridge/types";
import { basename, coworkMemoryPath, coworkResourceCategory, coworkResourceDisplayName, normalizeCoworkPath } from "./coworkResourcePaths";
import type { CoworkResourceActivity, CoworkResourceOperation, CoworkTranscriptToolUse } from "./coworkResourceTypes";

export const coworkChromeMcpServerUuid = "a8f3c7e2-4b9d-4f1a-8c3e-9d2a5b7f8e1c";

type ResourceActivityInput = Omit<CoworkResourceActivity, "categoryKey" | "displayName" | "fileName"> & {
  fileName?: string;
};

export function rawCoworkToolUses(message: ChatMessage): CoworkTranscriptToolUse[] {
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  const content = raw.content ?? nested.content;
  if (!Array.isArray(content)) return [];
  return content.flatMap((item, index) => {
    const record = asRecord(item);
    const itemType = stringValue(record.type) ?? stringValue(record.kind);
    const name = stringValue(record.name) ?? stringValue(record.tool_name);
    if (itemType !== "tool_use" && !name) return [];
    return [{ id: stringValue(record.id) ?? `tool-${index}`, input: asRecord(record.input), name: name ?? "Tool" }];
  });
}

export function coworkResourceActivityFromTool(message: ChatMessage, messageIndex: number, tool: CoworkTranscriptToolUse) {
  const operation = coworkResourceOperation(tool);
  if (!operation) return null;
  const timestamp = coworkResourceTimestamp(message, messageIndex);
  if (operation === "web_search") return webSearchActivity(message, tool, timestamp);
  if (operation === "skill_invoked") return skillActivity(message, tool, timestamp);
  if (operation === "mcp_tool") return mcpActivity(message, tool, timestamp);
  const filePath = coworkToolFilePath(tool);
  if (!filePath) return null;
  return createCoworkResourceActivity({
    filePath,
    latestId: `${message.id}-${tool.id}`,
    operation: coworkMemoryPath(filePath) ? "memory" : operation,
    timestamp,
    toolName: tool.name,
  });
}

function webSearchActivity(message: ChatMessage, tool: CoworkTranscriptToolUse, timestamp: number) {
  const query = stringValue(tool.input.query) ?? "Web search";
  return createCoworkResourceActivity({
    fileName: query,
    filePath: `web_search://${tool.id}`,
    latestId: `${message.id}-${tool.id}`,
    operation: "web_search",
    searchQuery: query,
    timestamp,
    toolName: tool.name,
  });
}

function skillActivity(message: ChatMessage, tool: CoworkTranscriptToolUse, timestamp: number) {
  const skill = stringValue(tool.input.skill) ?? stringValue(tool.input.name);
  if (!skill) return null;
  return createCoworkResourceActivity({
    fileName: basename(skill) ?? skill,
    filePath: `skill://${skill}`,
    latestId: `${message.id}-${tool.id}`,
    operation: "skill_invoked",
    pluginName: pluginNameFromQualifiedName(skill),
    skillName: skill,
    timestamp,
    toolName: tool.name,
  });
}

function mcpActivity(message: ChatMessage, tool: CoworkTranscriptToolUse, timestamp: number) {
  const parsed = parseCoworkMcpToolName(tool.name);
  if (!parsed) return null;
  const serverName = coworkMcpServerDisplayName(parsed.server, tool.input);
  const displayName = stringValue(tool.input.tool_display_name) ?? stringValue(tool.input.toolDisplayName) ?? parsed.tool;
  return createCoworkResourceActivity({
    fileName: parsed.tool,
    filePath: `mcp://${parsed.server}/${parsed.tool}`,
    latestId: `${message.id}-${tool.id}`,
    mcpServer: { name: serverName, uuid: parsed.server },
    mcpServerUuid: parsed.server,
    mcpToolDisplayName: displayName,
    mcpToolInput: tool.input,
    mcpToolName: parsed.tool,
    operation: "mcp_tool",
    timestamp,
    toolName: tool.name,
  });
}

function createCoworkResourceActivity(input: ResourceActivityInput): CoworkResourceActivity {
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

function coworkResourceTimestamp(message: ChatMessage, messageIndex: number) {
  const parsed = Date.parse(message.createdAt);
  return Number.isFinite(parsed) ? parsed : messageIndex;
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
  if (parseCoworkMcpToolName(tool.name)) return "mcp_tool";
  if (tool.name === "Read" || tool.name === "View") return "read";
  if (tool.name === "Write") return "write";
  if (["Edit", "MultiEdit", "NotebookEdit"].includes(tool.name)) return "edit";
  if (tool.name === "WebSearch") return "web_search";
  if (tool.name === "Skill") return "skill_invoked";
  if (tool.name === "present_files" || tool.name === "mcp__cowork__present_files") return "create";
  if (tool.name === "Grep" || tool.name === "Glob") {
    const filePath = coworkToolFilePath(tool);
    return filePath && coworkMemoryPath(filePath) ? "memory" : null;
  }
  return null;
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
