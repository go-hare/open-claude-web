import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge, type WorkspaceContext } from "../../../adapters/desktopBridge";
import {
  OfficialComposerFolderPill,
  OfficialComposerPill,
  OfficialComposerPillPulse,
  OfficialSearchSelect,
  officialComposerSplitPillClass,
  type OfficialComposerFolderRecent,
} from "../OfficialEpitaxyComponents";
import { LocalEnvironmentPill } from "./LocalEnvironmentPill";
import {
  asRecord,
  basename,
  buildRecentFolders,
  hasWorktreeInfo,
  parseLocalBranches,
  stringValue,
  uniqueStrings,
} from "./workspaceControlsHelpers";

export type EnsureWorkspaceTrusted = (cwd: string | undefined, afterAccept: () => void) => Promise<boolean>;

type OfficialWorkspaceControlsProps = {
  disabled?: boolean;
  ensureTrusted: EnsureWorkspaceTrusted;
  onSourceBranchChange: (branch: string) => void;
  onUseWorktreeChange: (enabled: boolean) => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  sourceBranch: string;
  useWorktree: boolean;
  workspace: WorkspaceContext;
};


export function OfficialWorkspaceControls({
  disabled,
  ensureTrusted,
  onSourceBranchChange,
  onUseWorktreeChange,
  onWorkspaceChange,
  sourceBranch,
  useWorktree,
  workspace,
}: OfficialWorkspaceControlsProps) {
  const [branches, setBranches] = useState<string[]>([sourceBranch].filter(Boolean));
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [recentFolders, setRecentFolders] = useState<OfficialComposerFolderRecent[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.list().catch(() => []),
      (desktopBridge.LocalSessions.getDetectedProjects?.() ?? Promise.resolve([])).catch(() => []),
    ]).then(([codeSessions, codeProjects]) => {
      if (!alive) return;
      setRecentFolders(buildRecentFolders([...codeSessions, ...codeProjects], workspace.cwd));
    });
    return () => {
      alive = false;
    };
  }, [workspace.cwd]);

  useEffect(() => {
    if (!workspace.cwd) {
      setBranches([]);
      setIsGitRepo(false);
      onSourceBranchChange("");
      onUseWorktreeChange(false);
      return;
    }
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.getGitInfo?.(workspace.cwd).catch(() => null),
      desktopBridge.LocalSessions.getLocalBranches?.(workspace.cwd).catch(() => null),
    ])
      .then(([gitInfo, branchResult]) => {
        if (!alive) return;
        const git = asRecord(gitInfo);
        const gitBranch = stringValue(git.branch) ?? workspace.branchName;
        const nextBranches = parseLocalBranches(branchResult, gitBranch);
        const nextIsGitRepo = Boolean(stringValue(git.root) || gitBranch || nextBranches.length > 0);
        setIsGitRepo(nextIsGitRepo);
        setBranches(nextIsGitRepo ? nextBranches : []);
        if (!nextIsGitRepo) {
          onSourceBranchChange("");
          onUseWorktreeChange(false);
        }
      })
      .catch(() => {
        if (!alive) return;
        setBranches([]);
        setIsGitRepo(false);
        onSourceBranchChange("");
        onUseWorktreeChange(false);
      });
    return () => {
      alive = false;
    };
  }, [onSourceBranchChange, onUseWorktreeChange, workspace.branchName, workspace.cwd]);

  const applyWorkspacePath = useCallback(async (selectedPath: string) => {
    const gitInfo = await desktopBridge.LocalSessions.getGitInfo?.(selectedPath).catch(() => null);
    const git = asRecord(gitInfo);
    const root = stringValue(git.root);
    const branch = stringValue(git.branch) ?? "";
    const nextIsGitRepo = Boolean(root || branch);
    const nextWorkspace = {
      mode: "local",
      projectName: basename(root) ?? basename(selectedPath) ?? selectedPath,
      branchName: nextIsGitRepo ? branch : "",
      hasWorktree: hasWorktreeInfo(git),
      cwd: selectedPath,
    } satisfies WorkspaceContext;
    setIsGitRepo(nextIsGitRepo);
    setBranches(nextIsGitRepo ? [branch].filter(Boolean) : []);
    onWorkspaceChange(nextWorkspace);
    onSourceBranchChange(nextIsGitRepo ? branch : "");
    onUseWorktreeChange(false);
    setRecentFolders((current) => buildRecentFolders([], selectedPath, current));
  }, [onSourceBranchChange, onUseWorktreeChange, onWorkspaceChange]);

  const chooseWorkspace = useCallback(async () => {
    const selectedPaths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const selectedPath = selectedPaths?.[0];
    if (selectedPath) await applyWorkspacePath(selectedPath);
  }, [applyWorkspacePath]);

  const selectBranch = useCallback((branch: string) => {
    const apply = () => onSourceBranchChange(branch);
    if (!useWorktree && branch !== workspace.branchName) {
      void ensureTrusted(workspace.cwd, apply);
      return;
    }
    apply();
  }, [ensureTrusted, onSourceBranchChange, useWorktree, workspace.branchName, workspace.cwd]);

  const showGitControls = Boolean(workspace.cwd && isGitRepo);
  const branchItems = useMemo(() => (
    showGitControls ? uniqueStrings([sourceBranch, workspace.branchName, ...branches]) : []
  ), [branches, showGitControls, sourceBranch, workspace.branchName]);

  useEffect(() => {
    if (!showGitControls || !useWorktree || branches.length === 0) return;
    if (sourceBranch && sourceBranch !== workspace.branchName) return;
    const preferred = branches.find((branch) => branch === "main" || branch === "master") ?? branches[0];
    if (preferred && preferred !== sourceBranch) onSourceBranchChange(preferred);
  }, [branches, onSourceBranchChange, showGitControls, sourceBranch, useWorktree, workspace.branchName]);

  return (
    <div className="flex flex-wrap gap-g5 pb-p3 pr-[96px]">
      <LocalEnvironmentPill disabled={disabled} />
      <OfficialComposerPillPulse>
        <OfficialComposerFolderPill
          browseDisabled={disabled}
          folder={workspace.cwd}
          onBrowse={() => void chooseWorkspace()}
          onSelectFolder={(path) => void applyWorkspacePath(path)}
          recentFolders={recentFolders}
        />
      </OfficialComposerPillPulse>
      {showGitControls ? (
        <div className="group/split inline-flex rounded-r5 bg-fill-contained-default effect-contained-default has-[[aria-expanded=true]]:bg-[var(--fill-contained-selected)]">
          <OfficialSearchSelect
            disabled={disabled || branchItems.length === 0}
            emptyMessage="No branches match."
            icon="GitBranch"
            itemToLabel={(branch) => branch}
            items={branchItems}
            onSelect={selectBranch}
            placeholder="Search branches…"
            triggerAriaLabel="Branch"
            triggerClassName={`${officialComposerSplitPillClass} gap-g5 px-p5`}
            triggerLabel={sourceBranch || workspace.branchName}
            value={sourceBranch || null}
          />
          <span aria-hidden="true" className="w-px my-[7px] bg-t3 transition-opacity group-hover/split:opacity-0 group-focus-within/split:opacity-0" />
          <button
            aria-checked={useWorktree}
            className={`${officialComposerSplitPillClass} group/cb gap-g2 pl-p4 pr-p5`}
            data-checked={useWorktree || undefined}
            disabled={disabled}
            onClick={() => onUseWorktreeChange(!useWorktree)}
            role="switch"
            type="button"
          >
            <span className="inline-flex items-center justify-center size-[16px] shrink-0 p-[2.4px]">
              <span className="flex items-center justify-center size-full rounded-[2.4px] bg-[var(--ui-switch-off-background)] group-data-[checked]/cb:bg-[var(--accent)]">
                <span className="flex items-center justify-center data-[unchecked]:hidden" data-unchecked={!useWorktree || undefined}>
                  <svg width="6" height="5" viewBox="0 0 5.875 5.375" fill="none" aria-hidden="true" className="text-[var(--core-white)]">
                    <path d="M0.500014 2.75004L2.25001 4.87504L5.37501 0.500039" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </span>
            </span>
            <span>worktree</span>
          </button>
        </div>
      ) : null}
      {workspace.cwd ? <OfficialComposerPill ariaLabel="Add another folder" icon="FolderAddRight" onClick={() => void chooseWorkspace()} /> : null}
    </div>
  );
}
