import { desktopBridge, type WorkspaceContext } from "../../../adapters/desktopBridge";

export async function pickCoworkWorkspace(): Promise<WorkspaceContext | null> {
  const selectedPaths = await desktopBridge.Preferences.getDirectoryPath?.(false);
  const selectedPath = selectedPaths?.[0];
  return selectedPath ? coworkWorkspaceFromPath(selectedPath) : null;
}

async function coworkWorkspaceFromPath(selectedPath: string): Promise<WorkspaceContext> {
  const gitInfo = await readGitInfo(selectedPath);
  const git = asRecord(gitInfo);
  const root = stringValue(git.root);
  const branchName = stringValue(git.branch) ?? "";
  const projectName = basename(root) ?? basename(selectedPath) ?? selectedPath;
  return {
    mode: "local",
    projectName,
    branchName: root || branchName ? branchName : "",
    hasWorktree: Boolean(git.worktree || git.hasWorktree || git.worktreeName),
    cwd: selectedPath,
  };
}

async function readGitInfo(selectedPath: string) {
  return await desktopBridge.LocalAgentModeSessions.getGitInfo?.(selectedPath).catch(() => null)
    ?? await desktopBridge.LocalSessions.getGitInfo?.(selectedPath).catch(() => null);
}

function basename(path?: string | null) {
  return path?.split(/[\\/]/).filter(Boolean).at(-1);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
