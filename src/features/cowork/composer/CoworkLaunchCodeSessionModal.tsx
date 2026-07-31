/**
 * Official MTe LaunchCodeSessionModal residual (index-BELzQL5P ~79944).
 * 3p honesty: CCD (local LocalSessions.start) only — no CCR / Anthropic cloud environments.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { WorkspaceContext } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialSelect } from "../../shared/OfficialSelect";
import {
  asRecord,
  basename,
  buildRecentFolders,
  parseLocalBranches,
  resolveOfficialBaseBranch,
  stringValue,
} from "../../epitaxy/composer/workspaceControlsHelpers";
import { OfficialComposerBranchGroup } from "../../epitaxy/OfficialComposerPills";

const BROWSE_VALUE = "__browse__";

export type CoworkLaunchCodeLaunched = {
  displayPath: string;
  sessionId: string;
  target: "ccd";
};

type CoworkLaunchCodeSessionModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLaunched: (result: CoworkLaunchCodeLaunched) => void;
  source?: "tool";
  spec: string;
  suggestedCwd?: string;
};

export function CoworkLaunchCodeSessionModal({
  isOpen,
  onClose,
  onLaunched,
  source = "tool",
  spec,
  suggestedCwd,
}: CoworkLaunchCodeSessionModalProps) {
  const canUseCcd = Boolean(desktopBridge.LocalSessions?.start);
  const [folder, setFolder] = useState<string | undefined>(suggestedCwd);
  const [folderOptions, setFolderOptions] = useState<string[]>([]);
  const [branches, setBranches] = useState<string[]>([]);
  const [sourceBranch, setSourceBranch] = useState("");
  const [useWorktree, setUseWorktree] = useState(true);
  const [isGitRepo, setIsGitRepo] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const longSpec = spec.split("\n").length > 6;

  useEffect(() => {
    if (!isOpen) return;
    setFolder(suggestedCwd);
    setExpanded(false);
    setError(null);
    setLoading(false);
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.list().catch(() => []),
      (desktopBridge.LocalSessions.getDetectedProjects?.() ?? Promise.resolve([])).catch(() => []),
    ]).then(([sessions, projects]) => {
      if (!alive) return;
      const recent = buildRecentFolders([...sessions, ...projects], suggestedCwd);
      const paths = recent.map((entry) => entry.path).filter(Boolean);
      setFolderOptions(paths);
      if (!suggestedCwd && paths[0]) setFolder(paths[0]);
    });
    return () => {
      alive = false;
    };
  }, [isOpen, suggestedCwd]);

  useEffect(() => {
    if (!isOpen || !folder) {
      setBranches([]);
      setIsGitRepo(false);
      setSourceBranch("");
      return;
    }
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.getGitInfo?.(folder).catch(() => null),
      desktopBridge.LocalSessions.getLocalBranches?.(folder).catch(() => null),
    ])
      .then(([gitInfo, branchResult]) => {
        if (!alive) return;
        const git = asRecord(gitInfo);
        const gitBranch = stringValue(git.branch);
        const nextBranches = parseLocalBranches(branchResult, gitBranch ?? "");
        const nextIsGit = Boolean(stringValue(git.root) || gitBranch || nextBranches.length > 0);
        setIsGitRepo(nextIsGit);
        setBranches(nextIsGit ? nextBranches : []);
        if (nextIsGit) {
          setSourceBranch(
            resolveOfficialBaseBranch({
              branches: nextBranches,
              currentBranch: gitBranch,
              defaultBranch: stringValue(git.defaultBranch),
            }),
          );
        } else {
          setSourceBranch("");
          setUseWorktree(false);
        }
      })
      .catch(() => {
        if (!alive) return;
        setBranches([]);
        setIsGitRepo(false);
        setSourceBranch("");
        setUseWorktree(false);
      });
    return () => {
      alive = false;
    };
  }, [folder, isOpen]);

  const selectOptions = useMemo(() => {
    const paths = folder && !folderOptions.includes(folder) ? [folder, ...folderOptions] : folderOptions;
    const options = paths.map((path) => ({
      value: path,
      label: (
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="font-mono text-sm truncate">{basename(path) || path}</span>
          <span className="text-xs text-text-400 truncate">{path}</span>
        </span>
      ),
    }));
    if (desktopBridge.FileSystem?.browseFolder) {
      options.push({
        value: BROWSE_VALUE,
        label: <span>Browse for folder…</span>,
      });
    }
    return options;
  }, [folder, folderOptions]);

  const onFolderChange = useCallback(async (value: string) => {
    if (value === BROWSE_VALUE) {
      const browse = desktopBridge.FileSystem?.browseFolder;
      if (!browse) return;
      const picked = await browse("Choose a folder");
      if (picked) {
        setFolder(picked);
        setFolderOptions((current) => (current.includes(picked) ? current : [picked, ...current]));
        setSourceBranch("");
      }
      return;
    }
    setFolder(value);
    setSourceBranch("");
  }, []);

  const canLaunch = canUseCcd && Boolean(folder) && !loading;

  const handleClose = useCallback(() => {
    if (!loading) onClose();
  }, [loading, onClose]);

  const handleLaunch = useCallback(async () => {
    if (!folder || !canUseCcd || loading) return;
    setLoading(true);
    setError(null);
    try {
      if (desktopBridge.LocalSessions.checkTrust) {
        const trust = await desktopBridge.LocalSessions.checkTrust(folder);
        if (!trust?.trusted) {
          throw new Error("This folder isn't trusted yet. Open it from Claude Code first to trust it.");
        }
      }
      const workspace: WorkspaceContext = {
        mode: "local",
        projectName: basename(folder) ?? folder,
        branchName: sourceBranch,
        hasWorktree: isGitRepo ? useWorktree : false,
        cwd: folder,
        sourceBranch: isGitRepo ? sourceBranch || undefined : undefined,
        worktree: isGitRepo ? useWorktree : false,
        worktreeSupported: isGitRepo,
      };
      // Official CT.start residual: cwd + message + useWorktree/sourceBranch.
      // Product LocalSessions.start uses StartSessionInput (kind/prompt/workspace).
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        cwd: folder,
        message: spec,
        prompt: spec,
        sourceBranch: isGitRepo ? sourceBranch || undefined : undefined,
        useWorktree: isGitRepo ? useWorktree : undefined,
        workspace,
      });
      const sessionId = session?.id;
      if (!sessionId) throw new Error("LocalSessions.start returned no sessionId");
      void source;
      onLaunched({ sessionId, target: "ccd", displayPath: folder });
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : "Couldn't launch the code session. You can try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [canUseCcd, folder, isGitRepo, loading, onLaunched, source, sourceBranch, spec, useWorktree]);

  if (!isOpen) return null;

  return (
    <OfficialModal
      autoCloseOnFocusOut={!loading}
      isOpen={isOpen}
      modalSize="lg"
      onClose={handleClose}
      subtitle="Claude will open a Claude Code session with this task as the first message."
      title={
        <span className="flex min-w-0 items-center gap-2">
          <Icon className="text-text-300 flex-shrink-0" customSize={20} name="Code" />
          <span>Launch code session</span>
        </span>
      }
    >
      <div className="flex flex-col gap-4 mt-2" data-official-source="index-BELzQL5P:MTe" data-launch-code-modal="true">
        <div className="rounded-lg border border-border-300 bg-bg-100 p-3">
          <div className="text-xs font-semibold text-text-300 mb-2">Task</div>
          <pre
            className={
              expanded
                ? "text-sm whitespace-pre-wrap break-words"
                : "text-sm whitespace-pre-wrap break-words max-h-48 overflow-y-auto"
            }
          >
            {spec}
          </pre>
          {longSpec ? (
            <button
              className="text-xs text-text-300 hover:text-text-100 mt-2"
              onClick={() => setExpanded((value) => !value)}
              type="button"
            >
              {expanded ? "Show less" : "Show more"}
            </button>
          ) : null}
        </div>

        {!canUseCcd ? (
          <div className="text-sm text-text-300">
            Claude Code isn&apos;t set up yet. Configure a local Code session path to launch from here.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-text-200">Folder</label>
              <OfficialSelect
                onValueChange={(value) => void onFolderChange(value)}
                options={selectOptions}
                value={folder ?? ""}
              />
              {!folder ? (
                <span className="text-xs text-text-400">Choose a folder</span>
              ) : null}
            </div>
            {isGitRepo && folder ? (
              <div className="flex items-center gap-3">
                <OfficialComposerBranchGroup
                  branch={sourceBranch}
                  branches={branches}
                  onSelectBranch={setSourceBranch}
                  onWorktreeChange={setUseWorktree}
                  worktree={useWorktree}
                  worktreeSupported
                />
              </div>
            ) : null}
          </div>
        )}

        {error ? <div className="text-sm text-danger-100">{error}</div> : null}

        <div className="flex justify-end gap-2 pt-1">
          <OfficialButton disabled={loading} onClick={handleClose} variant="secondary">
            Cancel
          </OfficialButton>
          <OfficialButton disabled={!canLaunch || !canUseCcd} loading={loading} onClick={() => void handleLaunch()} variant="primary">
            Launch
          </OfficialButton>
        </div>
      </div>
    </OfficialModal>
  );
}
