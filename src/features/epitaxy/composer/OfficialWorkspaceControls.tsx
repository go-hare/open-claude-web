import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge, type WorkspaceContext, type WorkspaceSshConfig } from "../../../adapters/desktopBridge";
import { setSelectedFolder } from "../../customize/selectedFolderStore";
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
  /** Official focusComposer residual after folder menu closes. */
  onFolderMenuClosed?: () => void;
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
  onFolderMenuClosed,
  onSourceBranchChange,
  onUseWorktreeChange,
  onWorkspaceChange,
  sourceBranch,
  useWorktree,
  workspace,
}: OfficialWorkspaceControlsProps) {
  const [branches, setBranches] = useState<string[]>([sourceBranch].filter(Boolean));
  /**
   * Official Vn = Mt(local cwd) ?? true. SSH never calls Mt so Vn stays true.
   * Default true so empty-cwd / pending probe still allow Gn until git says otherwise.
   */
  const [isGitRepo, setIsGitRepo] = useState(true);
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
    const isSsh = workspace.mode === "ssh";
    if (!workspace.cwd) {
      setBranches([]);
      // Official Mt(null) ?? true (local) / SSH never probes Vn.
      setIsGitRepo(true);
      onSourceBranchChange("");
      // Do not wipe sticky Kn when Gn is still true (empty cwd / pending probe).
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
        // Official Vn: SSH skips Mt → always true. Local uses git probe.
        setIsGitRepo(isSsh ? true : nextIsGitRepo);
        setBranches(nextIsGitRepo || isSsh ? nextBranches : []);
        if (!nextIsGitRepo && !isSsh) {
          onSourceBranchChange("");
          // Official hides the switch when !Gn; Kn sticky stays.
        } else if (gitBranch && !workspace.branchName) {
          // Overlay from fl `+` seeds empty branchName; fill HEAD like Ikt getGitInfo.
          onSourceBranchChange(gitBranch);
        }
      })
      .catch(() => {
        if (!alive) return;
        setBranches([]);
        setIsGitRepo(isSsh);
        onSourceBranchChange("");
      });
    return () => {
      alive = false;
    };
  }, [onSourceBranchChange, workspace.branchName, workspace.cwd, workspace.mode]);

  const isSsh = workspace.mode === "ssh" && Boolean(workspace.sshConfig);

  const applyWorkspacePath = useCallback(async (selectedPath: string) => {
    if (workspace.mode === "ssh" && workspace.sshConfig) {
      // Official Browse remote folder residual: path is remote; keep sshConfig.
      const nextWorkspace: WorkspaceContext = {
        mode: "ssh",
        projectName: basename(selectedPath) ?? selectedPath,
        branchName: "",
        hasWorktree: false,
        cwd: selectedPath,
        sshConfig: {
          ...workspace.sshConfig,
          remoteCwd: selectedPath,
        },
      };
      setIsGitRepo(true);
      setBranches([]);
      onWorkspaceChange(nextWorkspace);
      onSourceBranchChange("");
      setRecentFolders((current) => buildRecentFolders([], selectedPath, current));
      // Official Ikt J: setSelectedFolder after picking a folder.
      setSelectedFolder(selectedPath);
      return;
    }
    const gitInfo = await desktopBridge.LocalSessions.getGitInfo?.(selectedPath).catch(() => null);
    const git = asRecord(gitInfo);
    const root = stringValue(git.root);
    const branch = stringValue(git.branch) ?? "";
    const nextIsGitRepo = Boolean(root || branch);
    const nextWorkspace = {
      mode: "local" as const,
      projectName: basename(root) ?? basename(selectedPath) ?? selectedPath,
      branchName: nextIsGitRepo ? branch : "",
      hasWorktree: hasWorktreeInfo(git),
      cwd: selectedPath,
    } satisfies WorkspaceContext;
    setIsGitRepo(nextIsGitRepo);
    setBranches(nextIsGitRepo ? [branch].filter(Boolean) : []);
    onWorkspaceChange(nextWorkspace);
    onSourceBranchChange(nextIsGitRepo ? branch : "");
    setRecentFolders((current) => buildRecentFolders([], selectedPath, current));
    // Official Ikt J: setSelectedFolder after picking a folder.
    setSelectedFolder(selectedPath);
  }, [onSourceBranchChange, onWorkspaceChange, workspace.mode, workspace.sshConfig]);

  const chooseWorkspace = useCallback(async () => {
    if (isSsh && workspace.sshConfig) {
      // Official listSSHDirectory(sshConfig, remoteCwd) — without a full remote
      // folder browser modal, re-prompt remoteCwd via existing path or ~.
      const remoteBase = workspace.cwd || workspace.sshConfig.remoteCwd || "~";
      const listed = await desktopBridge.LocalSessions.listSSHDirectory?.(workspace.sshConfig, remoteBase).catch(() => null);
      const entries = asRecord(listed).entries;
      // Prefer first directory entry under remote base when browse modal is absent.
      if (Array.isArray(entries) && entries.length > 0) {
        const firstDir = entries.find((entry) => asRecord(entry).isDirectory) ?? entries[0];
        const path = stringValue(asRecord(firstDir).path) ?? remoteBase;
        await applyWorkspacePath(path);
        onFolderMenuClosed?.();
        return;
      }
      await applyWorkspacePath(remoteBase);
      onFolderMenuClosed?.();
      return;
    }
    const selectedPaths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const selectedPath = selectedPaths?.[0];
    if (selectedPath) await applyWorkspacePath(selectedPath);
    // Native dialog steals focus; official residual re-focuses composer (Ye.focus).
    onFolderMenuClosed?.();
  }, [applyWorkspacePath, isSsh, onFolderMenuClosed, workspace.cwd, workspace.sshConfig]);

  const selectLocalEnv = useCallback(() => {
    const next: WorkspaceContext = {
      mode: "local",
      projectName: workspace.projectName || "local",
      branchName: workspace.branchName || "",
      hasWorktree: false,
      cwd: workspace.mode === "ssh" ? undefined : workspace.cwd,
    };
    onWorkspaceChange(next);
    onSourceBranchChange(next.branchName);
  }, [onSourceBranchChange, onWorkspaceChange, workspace.branchName, workspace.cwd, workspace.mode, workspace.projectName]);

  const selectSshEnv = useCallback((config: WorkspaceSshConfig) => {
    const remoteCwd = config.remoteCwd || workspace.cwd || "~";
    const next: WorkspaceContext = {
      mode: "ssh",
      projectName: config.name || config.host || config.sshHost || "SSH",
      branchName: "",
      hasWorktree: false,
      cwd: remoteCwd,
      sshConfig: {
        ...config,
        remoteCwd,
      },
    };
    onWorkspaceChange(next);
    onSourceBranchChange("");
  }, [onSourceBranchChange, onWorkspaceChange, workspace.cwd]);

  const selectBranch = useCallback((branch: string) => {
    const apply = () => onSourceBranchChange(branch);
    if (!useWorktree && branch !== workspace.branchName) {
      void ensureTrusted(workspace.cwd, apply);
      return;
    }
    apply();
  }, [ensureTrusted, onSourceBranchChange, useWorktree, workspace.branchName, workspace.cwd]);

  /** Official Dt(rs): worktree chrome only for local/ssh. Product composer is local|ssh. */
  const envSupportsWorktree = workspace.mode === "local" || workspace.mode === "ssh";
  /** Official Gn = Dt(rs) && Vn. When false hide switch; do not write Kn false. */
  const worktreeSupported = envSupportsWorktree && isGitRepo;
  const showGitControls = Boolean(workspace.cwd) && worktreeSupported;
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
      <LocalEnvironmentPill
        disabled={disabled}
        onSelectLocal={selectLocalEnv}
        onSelectSsh={selectSshEnv}
        workspace={workspace}
      />
      <OfficialComposerPillPulse>
        <OfficialComposerFolderPill
          browseDisabled={disabled}
          folder={workspace.cwd}
          isSSH={isSsh}
          onBrowse={() => void chooseWorkspace()}
          onMenuClosed={onFolderMenuClosed}
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
