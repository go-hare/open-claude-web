import type { WorkspaceContext } from "../../adapters/desktopBridge";

function folderBasename(value: string): string {
  return value.split(/[\\/]/).filter(Boolean).at(-1) ?? value;
}

/**
 * Official c119 zm: `_ = P?.cwd ?? p ?? undefined`.
 * Home has no session meta (`P` undefined) so draft cwd is `selectedFolder`.
 * Product `getWorkspaceContext` is host densable seed, not `P` — it must not
 * outrank `selectedFolder` (ca0135 fl mapped `+` writes the store, then home
 * reads it).
 */
export function officialDraftCwd(
  sessionCwd: string | undefined,
  selectedFolder: string | null | undefined,
): string | undefined {
  return sessionCwd ?? selectedFolder ?? undefined;
}

/**
 * Overlay vK `selectedFolder` onto Code home draft workspace.
 * When the folder already matches host cwd, keep host git/ssh fields.
 */
export function applySelectedFolderToDraftWorkspace(
  host: WorkspaceContext,
  selectedFolder: string | null,
): WorkspaceContext {
  if (!selectedFolder) return host;
  if (host.cwd === selectedFolder) return host;
  return {
    mode: "local",
    projectName: folderBasename(selectedFolder),
    branchName: "",
    hasWorktree: false,
    cwd: selectedFolder,
  };
}
