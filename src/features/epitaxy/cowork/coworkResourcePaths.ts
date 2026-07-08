import type { CoworkResourceCategory, CoworkResourceOperation } from "./coworkResourceTypes";

export const coworkContextResourceOperations = new Set<CoworkResourceOperation>(["mcp_tool", "cli_tool", "web_search", "skill_invoked", "command_invoked", "memory"]);

export function coworkResourceCategory(filePath: string, operation: CoworkResourceOperation): CoworkResourceCategory {
  if (operation === "mcp_tool" || operation === "cli_tool" || operation === "web_search") return "connectors";
  if (operation === "skill_invoked") return "skills";
  if (operation === "command_invoked") return "commands";
  if (operation === "memory" || coworkMemoryPath(filePath)) return "memory";
  return coworkPathCategory(normalizeCoworkPath(filePath));
}

export function coworkResourceDisplayName(filePath: string, fileName: string, categoryKey: CoworkResourceCategory) {
  if (categoryKey === "memory") return titleizeCoworkFileName(fileName);
  const normalizedPath = normalizeCoworkPath(filePath);
  if (/\/SKILL\.md$/i.test(normalizedPath)) return skillFolderName(normalizedPath, fileName);
  return fileName;
}

export function isCoworkUserFolderResource(filePath: string, folders: string[]) {
  if (coworkResourceCategory(filePath, "read") === "outputs") return true;
  const normalizedPath = normalizeCoworkPath(filePath);
  return folders.some((folder) => normalizedPath.startsWith(`${folderPrefix(folder)}/`));
}

export function coworkMemoryPath(filePath: string) {
  const normalized = normalizeCoworkPath(filePath);
  const fileName = basename(normalized)?.toLowerCase();
  if (fileName === "memory.md" || fileName === "claude.md") return false;
  return /\/mnt\/\.auto-memory(\/|$)/.test(normalized) || /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(memory|spaces\/[^/]+\/memory|agent\/memory)(\/|$)/.test(normalized);
}

export function normalizeCoworkPath(value: string) {
  return value.replace(/\\/g, "/");
}

export function basename(value?: string) {
  if (!value) return undefined;
  const normalized = value.replace(/\\/g, "/").replace(/\/+$/, "");
  return normalized.split("/").filter(Boolean).at(-1);
}

function coworkPathCategory(normalized: string): CoworkResourceCategory {
  if (coworkClaudeInstructionsPath(normalized)) return "working";
  if (coworkOutputPath(normalized)) return "outputs";
  if (coworkUploadPath(normalized)) return "uploads";
  if (coworkPluginPath(normalized)) return "internal";
  if (coworkSkillPath(normalized)) return "skills";
  return "working";
}

function coworkOutputPath(normalized: string) {
  return normalized.startsWith("/mnt/user-data/outputs/") || /\/sessions\/[^/]+\/mnt\/outputs\//.test(normalized) || /\/local-agent-mode-sessions(?:\/[^/]+){3,4}\/outputs\//.test(normalized);
}

function coworkUploadPath(normalized: string) {
  return normalized.startsWith("/mnt/user-data/uploads/") || /\/sessions\/[^/]+\/mnt\/uploads\//.test(normalized) || /\/local-agent-mode-sessions(?:\/[^/]+){3,4}\/uploads\//.test(normalized);
}

function coworkPluginPath(normalized: string) {
  return /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/cowork_plugins\//.test(normalized) || /\/sessions\/[^/]+\/mnt\/\.claude\/cowork_plugins\//.test(normalized) || /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/remote_cowork_plugins\//.test(normalized);
}

function coworkSkillPath(normalized: string) {
  return normalized.startsWith("/mnt/skills/") || /\/sessions\/[^/]+\/mnt\/skills\//.test(normalized) || /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/cowork_plugins\/.*\/skills\//.test(normalized);
}

function skillFolderName(normalizedPath: string, fileName: string) {
  const parts = normalizedPath.split("/");
  return parts.length >= 2 ? parts[parts.length - 2] : fileName;
}

function folderPrefix(folder: string) {
  const normalizedFolder = normalizeCoworkPath(folder);
  return normalizedFolder.endsWith("/") ? normalizedFolder.slice(0, -1) : normalizedFolder;
}

function coworkClaudeInstructionsPath(filePath: string) {
  const normalized = normalizeCoworkPath(filePath);
  return normalized.endsWith("/CLAUDE.md") && (normalized.includes("/mnt/.claude/CLAUDE.md") || /\/local-agent-mode-sessions(?:\/[^/]+){3,4}\/\.claude\/CLAUDE\.md$/.test(normalized) || /\/claude-hostloop-plugins\/[^/]+\/CLAUDE\.md$/.test(normalized));
}

function titleizeCoworkFileName(value: string) {
  return value.replace(/\.[^/.]+$/, "").split(/[_\s-]+/).filter(Boolean).map(titlePart).join(" ");
}

function titlePart(part: string, index: number) {
  if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
  if (part === "I" || part.startsWith("I'")) return part;
  return /^[A-Z][a-z']*$/.test(part) ? part.toLowerCase() : part;
}
