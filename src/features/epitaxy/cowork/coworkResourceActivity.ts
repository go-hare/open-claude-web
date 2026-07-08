import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";
import {
  basename,
  coworkContextResourceOperations,
  coworkMemoryPath,
  coworkResourceCategory,
  coworkResourceDisplayName,
  isCoworkUserFolderResource,
  normalizeCoworkPath,
} from "./coworkResourcePaths";
import type {
  CoworkResourceActivity,
  CoworkResourceOperation,
  CoworkResourceSections,
  CoworkTranscriptToolUse,
} from "./coworkResourceTypes";

export type {
  CoworkResourceActivity,
  CoworkResourceCategory,
  CoworkResourceOperation,
  CoworkResourceSections,
} from "./coworkResourceTypes";

export function parseCoworkResourceActivity(messages: ChatMessage[]): CoworkResourceActivity[] {
  const resources = new Map<string, CoworkResourceActivity>();
  messages.forEach((message, messageIndex) => {
    for (const tool of rawToolUsesFromMessage(message)) {
      const activity = coworkResourceActivityFromTool(message, messageIndex, tool);
      if (!activity) continue;
      const existing = resources.get(activity.filePath);
      if (existing && existing.timestamp > activity.timestamp) continue;
      resources.set(activity.filePath, activity);
    }
  });
  return Array.from(resources.values()).sort((left, right) => right.timestamp - left.timestamp);
}

export function splitCoworkResourceSections(resources: CoworkResourceActivity[], folders: string[]): CoworkResourceSections {
  const workingResources: CoworkResourceActivity[] = [];
  const scratchpadResources: CoworkResourceActivity[] = [];
  const contextResources: CoworkResourceActivity[] = [];

  for (const resource of resources) {
    if (coworkContextResourceOperations.has(resource.operation)) {
      contextResources.push(resource);
      continue;
    }
    if (isCoworkUserFolderResource(resource.filePath, folders)) {
      workingResources.push(resource);
      continue;
    }
    if (resource.categoryKey === "working") {
      scratchpadResources.push(resource);
      continue;
    }
    if (resource.categoryKey !== "internal") contextResources.push(resource);
  }

  return { contextResources, scratchpadResources, workingResources };
}

export function coworkResourceOperationLabel(operation: CoworkResourceOperation) {
  switch (operation) {
    case "cli_tool":
      return "ran";
    case "command_invoked":
    case "skill_invoked":
      return "invoked";
    case "create":
      return "created";
    case "edit":
      return "edited";
    case "fs_detected":
      return "updated";
    case "mcp_tool":
      return "used";
    case "memory":
      return "referenced";
    case "read":
      return "viewed";
    case "web_search":
      return "searched";
    case "write":
      return "wrote to";
  }
}

export function coworkSessionFolders(session: SessionSummary | null) {
  const folders = session?.folders?.filter(Boolean) ?? [];
  if (folders.length > 0) return folders;
  return session?.cwd ? [session.cwd] : [];
}

export function coworkFolderSectionTitle(folders: string[]) {
  if (folders.length === 1) return basename(folders[0]) ?? folders[0];
  return folders.length > 1 ? "Working folders" : "Working folder";
}

function rawToolUsesFromMessage(message: ChatMessage): CoworkTranscriptToolUse[] {
  const raw = asRecord(message.raw);
  const content = rawMessageContent(raw);
  return content.flatMap((item, index) => {
    const record = asRecord(item);
    const itemType = stringValue(record.type) ?? stringValue(record.kind);
    const name = stringValue(record.name) ?? stringValue(record.tool_name);
    if (itemType !== "tool_use" && !name) return [];
    return [{
      id: stringValue(record.id) ?? `tool-${index}`,
      input: asRecord(record.input),
      name: name ?? "Tool",
    }];
  });
}

function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

function coworkResourceActivityFromTool(message: ChatMessage, messageIndex: number, tool: CoworkTranscriptToolUse): CoworkResourceActivity | null {
  const operation = coworkResourceOperation(tool);
  if (!operation) return null;
  const timestamp = coworkResourceTimestamp(message, messageIndex);

  if (operation === "web_search") {
    const query = stringValue(tool.input.query) ?? "Web search";
    return createCoworkResourceActivity({
      fileName: query,
      filePath: `web_search://${tool.id}`,
      latestId: `${message.id}-${tool.id}`,
      operation,
      timestamp,
      toolName: tool.name,
    });
  }

  if (operation === "skill_invoked") {
    const skill = stringValue(tool.input.skill) ?? stringValue(tool.input.name);
    if (!skill) return null;
    return createCoworkResourceActivity({
      fileName: basename(skill) ?? skill,
      filePath: `skill://${skill}`,
      latestId: `${message.id}-${tool.id}`,
      operation,
      timestamp,
      toolName: tool.name,
    });
  }

  if (operation === "mcp_tool") {
    const parsed = parseCoworkMcpToolName(tool.name);
    if (!parsed) return null;
    return createCoworkResourceActivity({
      fileName: parsed.tool,
      filePath: `mcp://${parsed.server}/${parsed.tool}`,
      latestId: `${message.id}-${tool.id}`,
      operation,
      timestamp,
      toolName: tool.name,
    });
  }

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

function createCoworkResourceActivity({
  fileName,
  filePath,
  latestId,
  operation,
  timestamp,
  toolName,
}: {
  fileName?: string;
  filePath: string;
  latestId: string;
  operation: CoworkResourceOperation;
  timestamp: number;
  toolName: string;
}): CoworkResourceActivity {
  const normalizedPath = normalizeCoworkPath(filePath);
  const derivedFileName = fileName ?? basename(normalizedPath) ?? normalizedPath;
  const categoryKey = coworkResourceCategory(normalizedPath, operation);
  return {
    categoryKey,
    displayName: coworkResourceDisplayName(normalizedPath, derivedFileName, categoryKey),
    fileName: derivedFileName,
    filePath,
    latestId,
    operation,
    timestamp,
    toolName,
  };
}

function coworkResourceTimestamp(message: ChatMessage, messageIndex: number) {
  const parsed = Date.parse(message.createdAt);
  return Number.isFinite(parsed) ? parsed : messageIndex;
}

function coworkToolFilePath(tool: CoworkTranscriptToolUse) {
  return stringValue(tool.input.file_path)
    ?? stringValue(tool.input.filePath)
    ?? stringValue(tool.input.notebook_path)
    ?? stringValue(tool.input.notebookPath)
    ?? stringValue(tool.input.path);
}

function parseCoworkMcpToolName(toolName: string) {
  const match = /^mcp__(.+?)__(.+)$/.exec(toolName);
  if (!match) return null;
  return { server: match[1], tool: match[2] };
}

function coworkResourceOperation(tool: CoworkTranscriptToolUse): CoworkResourceOperation | null {
  if (parseCoworkMcpToolName(tool.name)) return "mcp_tool";
  switch (tool.name) {
    case "Read":
    case "View":
      return "read";
    case "Write":
      return "write";
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return "edit";
    case "WebSearch":
      return "web_search";
    case "Skill":
      return "skill_invoked";
    case "present_files":
    case "mcp__cowork__present_files":
      return "create";
    case "Grep":
    case "Glob": {
      const filePath = coworkToolFilePath(tool);
      return filePath && coworkMemoryPath(filePath) ? "memory" : null;
    }
    default:
      return null;
  }
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}
