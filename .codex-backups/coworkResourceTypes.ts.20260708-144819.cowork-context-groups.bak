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
  displayName: string;
  fileName: string;
  filePath: string;
  latestId: string;
  operation: CoworkResourceOperation;
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
