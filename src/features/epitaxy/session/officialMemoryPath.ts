/**
 * Official memory-tool grouping (`_v` memory bucket / `bs`).
 * When bridge exposes isMemoryPath it should be preferred; otherwise path/name heuristics
 * match Claude Code memory file locations.
 */

const MEMORY_PATH_RE = /(?:^|[\\/])(?:\.claude[\\/](?:projects[\\/][^\\/]+[\\/])?)?memory(?:[\\/]|\.md$)|(?:^|[\\/])MEMORY\.md$|(?:^|[\\/])\.claude[\\/]memory[\\/]/i;

export function isOfficialMemoryToolName(name: string) {
  if (/memory/i.test(name)) return true;
  if (name.startsWith("mcp__") && /memory|mem0|knowledge/i.test(name)) return true;
  return false;
}

export function isOfficialMemoryPath(path?: string | null) {
  if (!path) return false;
  return MEMORY_PATH_RE.test(path);
}

export function isOfficialMemoryTool(tool: {
  name: string;
  input?: Record<string, unknown>;
}, isMemoryPath?: (path: string) => boolean) {
  if (isOfficialMemoryToolName(tool.name)) return true;
  const input = tool.input ?? {};
  const path =
    (typeof input.file_path === "string" && input.file_path)
    || (typeof input.path === "string" && input.path)
    || (typeof input.notebook_path === "string" && input.notebook_path)
    || undefined;
  if (!path) return false;
  if (isMemoryPath?.(path)) return true;
  return isOfficialMemoryPath(path);
}

export function classifyOfficialMemoryOp(tool: { name: string }): "read" | "search" | "write" | null {
  const name = tool.name.toLowerCase();
  if (/write|edit|update|save|create|append/.test(name)) return "write";
  if (/search|grep|glob|find|query/.test(name)) return "search";
  if (isOfficialMemoryToolName(tool.name) || /read|get|list|view/.test(name)) return "read";
  return "read";
}
