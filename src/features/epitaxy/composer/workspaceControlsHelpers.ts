import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { OfficialComposerFolderRecent } from "../OfficialEpitaxyComponents";

export function parseLocalBranches(value: unknown, fallbackBranch: string): string[] {
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === "string"));
  const result = asRecord(value);
  const stdout = stringValue(result.stdout);
  if (!stdout) return fallbackBranch ? [fallbackBranch] : [];
  return uniqueStrings(stdout.split(/\r?\n/)
    .map((line) => line.replace(/^\*\s*/, "").trim())
    .filter((line) => line.length > 0));
}

/**
 * Official c11959232 base branch pick (ia):
 * defaultBranch ?? branches.find(main|master) ?? currentBranch.
 */
export function resolveOfficialBaseBranch(options: {
  branches?: string[];
  currentBranch?: string | null;
  defaultBranch?: string | null;
}): string {
  const defaultBranch = options.defaultBranch?.trim();
  if (defaultBranch) return defaultBranch;
  const branches = options.branches ?? [];
  const preferred = branches.find((branch) => branch === "main" || branch === "master");
  if (preferred) return preferred;
  const current = options.currentBranch?.trim();
  if (current) return current;
  return "main";
}

export function buildRecentFolders(sessions: SessionSummary[], currentCwd?: string, existing: OfficialComposerFolderRecent[] = []) {
  const seen = new Set<string>();
  const recent: OfficialComposerFolderRecent[] = [];
  const addPath = (path: string | undefined) => {
    if (!path || seen.has(path)) return;
    seen.add(path);
    recent.push({ path });
  };
  addPath(currentCwd);
  for (const item of existing) addPath(item.path);
  for (const session of sessions.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))) {
    addPath(session.cwd);
    for (const folder of session.folders ?? []) addPath(folder);
  }
  return recent.slice(0, 12);
}

export function uniqueStrings(values: string[]) {
  return [...new Set(values.filter(Boolean))];
}

export function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

export function hasWorktreeInfo(gitInfo: Record<string, unknown>): boolean {
  if (typeof gitInfo.hasWorktree === "boolean") return gitInfo.hasWorktree;
  if (typeof gitInfo.useWorktree === "boolean") return gitInfo.useWorktree;
  return Boolean(stringValue(gitInfo.worktreeName) ?? stringValue(gitInfo.worktreePath));
}
