export type CoworkResourceOperation =
  | "cli_tool"
  | "command_invoked"
  | "create"
  | "edit"
  | "fs_detected"
  | "mcp_tool"
  | "memory"
  | "read"
  | "skill_invoked"
  | "web_search"
  | "write";

export type CoworkResourceCategory = "commands" | "connectors" | "internal" | "memory" | "outputs" | "skills" | "uploads" | "working";

export type CoworkResourceActivity = {
  categoryKey: CoworkResourceCategory;
  cliDisplayName?: string;
  cliIcon?: unknown;
  cliName?: string;
  commandName?: string;
  displayName: string;
  fileName: string;
  filePath: string;
  latestId: string;
  isError?: boolean;
  mcpServer?: {
    iconSrc?: string;
    iconType?: string;
    name?: string;
    uuid?: string;
  };
  mcpServerUuid?: string;
  mcpToolDisplayName?: string;
  mcpToolInput?: Record<string, unknown>;
  mcpToolName?: string;
  mcpToolResult?: {
    content: unknown[];
    isError?: boolean;
  };
  operation: CoworkResourceOperation;
  pluginId?: string;
  pluginName?: string;
  searchQuery?: string;
  searchResults?: unknown[];
  skillName?: string;
  timestamp: number;
  toolName: string;
};

export type CoworkResourceSections = {
  contextResources: CoworkResourceActivity[];
  scratchpadResources: CoworkResourceActivity[];
  workingResources: CoworkResourceActivity[];
};

export type CoworkTranscriptToolUse = {
  id: string;
  input: Record<string, unknown>;
  name: string;
};
