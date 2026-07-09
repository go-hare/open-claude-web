import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type EffortLevel, type PermissionMode, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { sessionPath } from "../../shell/sessionPaths";
import { useFrameContext } from "../../stores/frameContext";
import { EpitaxyRouteFrame, EpitaxySessionLoading } from "./EpitaxyFrameSurface";
import { CodeStatsCard } from "./CodeStatsCard";
import { OfficialCodeComposer } from "./composer/OfficialCodeComposer";
import { normalizePermissionMode } from "./composer/options";
import { CoworkNewTaskPage } from "./CoworkNewTaskPage";

export function EpitaxyHome({ onNavigate, route }: RouteViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  const frame = useFrameContext();
  const routeMode = route.id === "cowork-home" ? "cowork" : route.id === "code-home" ? "code" : undefined;
  const mode = routeMode ?? frame?.mode ?? "code";

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getWorkspaceContext().then((nextWorkspace) => {
      if (alive) setWorkspace(nextWorkspace);
    });
    return () => {
      alive = false;
    };
  }, []);

  if (!workspace) return <EpitaxySessionLoading />;

  return mode === "cowork" ? (
    <CoworkNewTaskPage onNavigate={onNavigate} workspace={workspace} />
  ) : (
    <CodeNewSessionPage onNavigate={onNavigate} workspace={workspace} />
  );
}

function CodeNewSessionPage({ onNavigate, workspace }: { onNavigate: (path: string) => void; workspace: WorkspaceContext }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("default");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [effort, setEffort] = useState<EffortLevel>("medium");
  const [composerWorkspace, setComposerWorkspace] = useState(workspace);
  const [sourceBranch, setSourceBranch] = useState(workspace.cwd ? workspace.branchName : "");
  const [useWorktree, setUseWorktree] = useState(false);

  useEffect(() => {
    setComposerWorkspace(workspace);
    setSourceBranch(workspace.cwd ? workspace.branchName : "");
    setUseWorktree(false);
  }, [workspace]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.LocalSessions.getDefaultEffort?.(),
      desktopBridge.LocalSessions.getDefaultPermissionMode?.(composerWorkspace.cwd),
    ]).then(([nextEffort, nextPermissionMode]) => {
      if (!alive) return;
      if (nextEffort) setEffort(nextEffort);
      setPermissionMode(normalizePermissionMode(nextPermissionMode));
    });
    return () => {
      alive = false;
    };
  }, [composerWorkspace.cwd]);

  const submit = useCallback(async () => {
    const normalized = prompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const shouldUseGitControls = Boolean(composerWorkspace.cwd && sourceBranch);
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        effort,
        model,
        prompt: normalized,
        sourceBranch: shouldUseGitControls ? sourceBranch : undefined,
        useWorktree: shouldUseGitControls ? useWorktree : undefined,
        workspace: shouldUseGitControls ? composerWorkspace : {
          ...composerWorkspace,
          branchName: "",
          hasWorktree: false,
        },
        permissionMode,
      });
      onNavigate(sessionPath(session));
    } finally {
      setBusy(false);
    }
  }, [busy, composerWorkspace, effort, model, onNavigate, permissionMode, prompt, sourceBranch, useWorktree]);

  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <div className="h-full min-w-0 flex flex-col">
          <div className="relative">
            <CodeGreeting workspace={workspace} />
          </div>
          <div className="contents">
            <div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]">
              <div className="epitaxy-top-scrim" aria-hidden="true" />
              <div className="epitaxy-bottom-scrim" aria-hidden="true" style={{ opacity: 0.9 }} />
              <div className="h-full overflow-y-auto overflow-x-hidden">
                <div className="flex flex-col">
                  <div className="epitaxy-chat-column epitaxy-chat-size py-[24px]">
                    <CodeStatsCard />
                  </div>
                </div>
              </div>
            </div>
            <div className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
              <OfficialCodeComposer
                busy={busy}
                effort={effort}
                model={model}
                onEffortChange={setEffort}
                onModelChange={setModel}
                onPermissionModeChange={setPermissionMode}
                onSourceBranchChange={setSourceBranch}
                onSubmit={() => void submit()}
                onUseWorktreeChange={setUseWorktree}
                onWorkspaceChange={setComposerWorkspace}
                permissionMode={permissionMode}
                prompt={prompt}
                setPrompt={setPrompt}
                sourceBranch={sourceBranch}
                useWorktree={useWorktree}
                workspace={composerWorkspace}
              />
            </div>
          </div>
        </div>
      </div>
    </EpitaxyRouteFrame>
  );
}

function CodeGreeting({ workspace }: { workspace: WorkspaceContext }) {
  const orgName = workspace.projectName === "claude-desktop" ? "Cowork 3P" : "Cowork 3P";
  return (
    <header className="epitaxy-chat-column epitaxy-chat-size flex flex-row items-center gap-[calc(var(--g3)+2px)] pt-[12px] pb-[24px]">
      <img alt="" aria-hidden="true" className="size-[22px] shrink-0 translate-y-px" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
      <h1 className="text-title text-t9">{orgName}，接下来做点什么？</h1>
    </header>
  );
}
