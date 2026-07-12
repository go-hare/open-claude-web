import type { CoworkFileAction } from "./CoworkFileToolCell";

const skillPathMatchers = [
  (path: string) => path.startsWith("/mnt/skills/"),
  (path: string) => /\/sessions\/[^/]+\/mnt\/skills\//.test(path),
  (path: string) => /\/sessions\/[^/]+\/mnt\/\.(plugins|local-plugins|remote-plugins)\/.*\/skills\//.test(path),
  (path: string) => /\/sessions\/[^/]+\/mnt\/\.claude\/(skills|cowork_plugins\/.*\/skills)\//.test(path),
  (path: string) => /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(cowork_plugins|rpm)\/.*\/skills\//.test(path),
  (path: string) => /\/claude-hostloop-plugins\/[0-9a-f]+\/skills\//.test(path),
  (path: string) => /\/local-agent-mode-sessions\/skills-plugin\/.*\/skills\//.test(path),
];

export function coworkFileAction(name: string, path: string): CoworkFileAction {
  if (isSkillPath(path) && ["open_file", "view"].includes(name)) return "skill";
  if (["create_file", "write"].includes(name)) return "create";
  if (["open_file", "view", "read", "grep", "glob"].includes(name)) return "read";
  return "edit";
}

export function coworkFileDisplayName(path: string) {
  if (isMemoryPath(path) && !isMemoryFileWithoutMarkdown(path)) return humanizeMemoryFileName(path);
  if (basename(path) !== "CLAUDE.md") return "";
  return `${isGlobalInstructionsPath(path) ? "Global instructions" : "Folder instructions"} (CLAUDE.md)`;
}

export function coworkFileStatusText(input: {
  action: CoworkFileAction;
  description?: string;
  isError: boolean;
  normalizedName: string;
  path: string;
  streaming: boolean;
}) {
  if (input.description) return input.description;
  if (input.action === "skill") return skillStatus(input.path, input.streaming);
  if (isMemoryPath(input.path)) return memoryStatus(input);
  if (input.action !== "edit") return undefined;
  const name = coworkFileDisplayName(input.path) || basename(input.path);
  return input.streaming ? `Editing ${name}` : input.isError ? `Failed to edit ${name}` : `Edited ${name}`;
}

export function isMemoryPath(path: string) {
  const normalized = normalizePath(path);
  const fileName = basename(normalized).toLowerCase();
  if (fileName === "memory.md" || fileName === "claude.md") return false;
  return /\/mnt\/\.auto-memory(\/|$)/.test(normalized)
    || /\/local-agent-mode-sessions\/[^/]+\/[^/]+\/(memory|spaces\/[^/]+\/memory|agent\/memory)(\/|$)/.test(normalized);
}

export function isMemoryFileWithoutMarkdown(path: string) {
  return isMemoryPath(path) && !/\.md$/i.test(path);
}

export function basename(path: string) {
  return path.split(path.startsWith("/") ? "/" : /[\\/]/).pop() || path;
}

/**
 * Official D5e create_file Blt target: strip extension, split `_`, title-case parts.
 * Wlt still special-cases CLAUDE.md via coworkFileDisplayName before calling this.
 */
export function coworkCreateFileBltTarget(path: string) {
  const file = basename(path);
  if (file === "CLAUDE.md") return coworkFileDisplayName(path) || file;
  return file
    .replace(/\.[^/.]+$/, "")
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isSkillPath(path: string) {
  const normalized = normalizePath(path);
  return skillPathMatchers.some((matcher) => matcher(normalized));
}

function isGlobalInstructionsPath(path: string) {
  const normalized = normalizePath(path);
  return normalized.endsWith("/CLAUDE.md") && (
    normalized.includes("/mnt/.claude/CLAUDE.md")
    || /\/local-agent-mode-sessions(?:\/[^/]+){3,4}\/\.claude\/CLAUDE\.md$/.test(normalized)
    || /\/claude-hostloop-plugins\/[^/]+\/CLAUDE\.md$/.test(normalized)
  );
}

function skillStatus(path: string, streaming: boolean) {
  const parts = normalizePath(path).split("/");
  const skillName = parts[parts.indexOf("skills") + 1] || "";
  return `${streaming ? "Loading" : "Loaded"}${skillName ? ` ${skillName}` : ""} skill`;
}

function memoryStatus(input: { action: CoworkFileAction; isError: boolean; normalizedName: string; path: string; streaming: boolean }) {
  const action = input.action === "read" && isMemoryFileWithoutMarkdown(input.path) ? "search" : input.action;
  const state = input.streaming ? "streaming" : input.isError ? "error" : "done";
  return ({
    create_streaming: "Creating memory", create_error: "Failed to create memory", create_done: "Created memory",
    read_streaming: "Reading memory", read_error: "Failed to read memory", read_done: "Read memory",
    edit_streaming: "Editing memory", edit_error: "Failed to edit memory", edit_done: "Edited memory",
    search_streaming: "Searching memory", search_error: "Failed to search memory", search_done: "Searched memory",
  } as Record<string, string>)[`${action}_${state}`];
}

function humanizeMemoryFileName(path: string) {
  const words = basename(path).replace(/\.[^/.]+$/, "").split(/[_\s-]+/);
  return words.map((word, index) => sentenceWord(word, index)).join(" ");
}

function sentenceWord(word: string, index: number) {
  if (index === 0) return /[A-Z]/.test(word.slice(1)) ? word : capitalize(word);
  if (word === "I" || word.startsWith("I'")) return word;
  return /^[A-Z][a-z']*$/.test(word) ? word.toLowerCase() : word;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function normalizePath(path: string) {
  return path.replaceAll("\\", "/");
}
