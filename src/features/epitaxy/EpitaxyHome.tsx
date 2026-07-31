import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type EffortLevel, type PermissionMode, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useI18nText, type MessageDescriptors } from "../../i18n/footerMenuMessages";
import { fetchBootstrapPayload } from "../settings/accountSettingsApi";
import { sessionPath } from "../../shell/sessionPaths";
import { EpitaxyRouteFrame, EpitaxySessionLoading } from "./EpitaxyFrameSurface";
import { CodeStatsCard } from "./CodeStatsCard";
import { EpitaxyActionCenter } from "./EpitaxyActionCenter";
import { useEpitaxyActionCenterState } from "./epitaxyActionCenterState";
import { OfficialCodeComposer } from "./composer/OfficialCodeComposer";
import { normalizePermissionMode } from "./composer/options";
import {
  clampEffortToCatalog,
  cliEffortLevelsForModel,
} from "./session/officialComposerOptions";

export function EpitaxyHome({ onNavigate, route }: RouteViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  void route;

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getWorkspaceContext().then((nextWorkspace) => {
      if (alive) setWorkspace(nextWorkspace);
    });
    return () => {
      alive = false;
    };
  }, []);

  /**
   * Official c119 residual when no session (`!E`) and selectedFolder `je` is set:
   * Uo?.onOpenFile → pickFileAtCwd(je).then(tt).
   * Official home is the same tile as the session (has file side pane `tt`).
   * Our CodeNewSessionPage has no file pane — only the pick half of the residual
   * is valid here. Do not invent epitaxy-open-file / openInEditor fallbacks.
   * Full tt path lives on EpitaxySessionTile when a session is open.
   */
  useEffect(() => {
    if (!workspace?.cwd) return;
    const menuEvents = window["claude.web"]?.MenuEvents as
      | { onOpenFile?: (cb: () => void) => (() => void) | void; openFile?: (cb: () => void) => (() => void) | void }
      | undefined;
    if (!menuEvents?.onOpenFile && !menuEvents?.openFile) return;
    const cwd = workspace.cwd;
    const pick = () => {
      void desktopBridge.LocalSessions.pickFileAtCwd?.(cwd);
    };
    const subscribe = menuEvents.onOpenFile ?? menuEvents.openFile;
    return subscribe?.(pick) ?? undefined;
  }, [workspace?.cwd]);

  if (!workspace) return <EpitaxySessionLoading />;

  return <CodeNewSessionPage onNavigate={onNavigate} workspace={workspace} />;
}

function CodeNewSessionPage({ onNavigate, workspace }: { onNavigate: (path: string) => void; workspace: WorkspaceContext }) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [model, setModel] = useState("default");
  const [permissionMode, setPermissionMode] = useState<PermissionMode>("default");
  const [effort, setEffort] = useState<EffortLevel>("medium");
  /** Official yR — new drafts start without Ultracode (session-only flag). */
  const [ultracode, setUltracode] = useState(false);
  /** Official get_settings.applied (CLI 2.7.16+) — per-model catalog ladder for the draft slider. */
  const [effortLevels, setEffortLevels] = useState<string[] | null>(null);
  const [ultracodeOfferable, setUltracodeOfferable] = useState<boolean | null>(null);
  const [composerWorkspace, setComposerWorkspace] = useState(workspace);
  const [sourceBranch, setSourceBranch] = useState(workspace.cwd ? workspace.branchName : "");
  const [useWorktree, setUseWorktree] = useState(false);
  /** Official c119: epitaxy:reset-draft remount key when no session id (void 0===o). */
  const [draftEpoch, setDraftEpoch] = useState(0);

  useEffect(() => {
    setComposerWorkspace(workspace);
    setSourceBranch(workspace.cwd ? workspace.branchName : "");
    setUseWorktree(false);
  }, [workspace]);

  /**
   * Official c119 residual (sidebar Qas epitaxy mode → CustomEvent "epitaxy:reset-draft"):
   * when no session id, clear draft store + bump remount counter.
   * Listener only on home draft (no session) — session tiles own their own residual.
   */
  useEffect(() => {
    const onReset = () => {
      setPrompt("");
      setBusy(false);
      // Official: Ultracode is session-only; reset draft clears it.
      setUltracode(false);
      setDraftEpoch((n) => n + 1);
    };
    window.addEventListener("epitaxy:reset-draft", onReset);
    return () => window.removeEventListener("epitaxy:reset-draft", onReset);
  }, []);

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

  /**
   * Effort ladder = CLI only.
   * 1) Immediately seed from CLI catalog residual for model (no invent 5-stop flash).
   * 2) Replace with get_settings.applied.effortLevels when host probe returns.
   */
  useEffect(() => {
    let alive = true;
    const modelKey = model === "default" ? undefined : model;
    const provisional = cliEffortLevelsForModel(modelKey ?? model);
    setEffortLevels(provisional);
    setEffort((prev) => clampEffortToCatalog(prev, provisional));
    const fn = desktopBridge.LocalSessions.getEffortCatalogDefaults;
    if (!fn) return;
    void fn(modelKey).then((applied) => {
      if (!alive || !applied) return;
      const levels =
        applied.effortLevels && applied.effortLevels.length > 0
          ? applied.effortLevels
          : provisional;
      setEffortLevels(levels);
      setUltracodeOfferable(applied.ultracodeOfferable ?? null);
      setEffort((prev) => clampEffortToCatalog(prev, levels));
    });
    return () => {
      alive = false;
    };
  }, [model]);

  const submit = useCallback(async () => {
    const normalized = prompt.trim();
    if (!normalized || busy) return;
    setBusy(true);
    try {
      const shouldUseGitControls = Boolean(composerWorkspace.cwd && sourceBranch);
      const isSsh = composerWorkspace.mode === "ssh" && Boolean(composerWorkspace.sshConfig);
      // Wire residual: Ultracode → "ultracode"; else ladder id (same as setEffort).
      const wireEffort = ultracode ? "ultracode" : effort;
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        effort: wireEffort,
        model,
        prompt: normalized,
        sourceBranch: shouldUseGitControls ? sourceBranch : undefined,
        useWorktree: shouldUseGitControls ? useWorktree : undefined,
        workspace: shouldUseGitControls || isSsh ? composerWorkspace : {
          ...composerWorkspace,
          branchName: "",
          hasWorktree: false,
        },
        // Official Hd session.sshConfig — desktop start normalizes host/sshHost shapes.
        ...(isSsh && composerWorkspace.sshConfig
          ? {
              sshConfig: composerWorkspace.sshConfig,
              cwd: composerWorkspace.cwd || composerWorkspace.sshConfig.remoteCwd,
            }
          : {}),
        permissionMode,
      });
      onNavigate(sessionPath(session));
    } finally {
      setBusy(false);
    }
  }, [busy, composerWorkspace, effort, model, onNavigate, permissionMode, prompt, sourceBranch, ultracode, useWorktree]);

  // Official Pw shared by Tw greeting + _w ActionCenter / $x stats branch.
  const actionCenter = useEpitaxyActionCenterState();

  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <div className="h-full min-w-0 flex flex-col">
          <div className="relative">
            <CodeGreeting greetEmpty={actionCenter.greetEmpty} workspace={workspace} />
          </div>
          <div className="contents">
            <div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]">
              <div className="epitaxy-top-scrim" aria-hidden="true" />
              <div className="epitaxy-bottom-scrim" aria-hidden="true" style={{ opacity: 0.9 }} />
              {/* Official empty draft body: k ?? _w — allClear → $x CodeStats; else ActionCenter */}
              <div className="h-full overflow-y-auto overflow-x-hidden">
                {actionCenter.isSessionsLoading ? null : actionCenter.allClear ? (
                  <div className="flex flex-col">
                    <div className="epitaxy-chat-column epitaxy-chat-size py-[24px]">
                      <CodeStatsCard />
                    </div>
                  </div>
                ) : (
                  <EpitaxyActionCenter onNavigate={onNavigate} state={actionCenter} />
                )}
              </div>
            </div>
            <div className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
              <OfficialCodeComposer
                key={draftEpoch}
                busy={busy}
                effort={effort}
                effortLevels={effortLevels}
                model={model}
                onEffortChange={(level, nextUltracode) => {
                  setEffort(level);
                  setUltracode(nextUltracode);
                }}
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
                ultracode={ultracode}
                ultracodeOfferable={ultracodeOfferable}
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

/**
 * Official c119 EpitaxyActionCenterGreeting residual (Tw):
 *   name = account.display_name || account.full_name?.split(" ")[0]
 *   greetEmpty (Pw) → "What’s up next, {name}?" / "What’s up next?"
 *   else → "Welcome back, {name}" / "Welcome back"
 * ids: flLEnDzvfG / W8pMCdh9hq / UOxi8mioge / UKxoV8UIxo
 */
const CODE_GREETING_MESSAGES = {
  whatsUpNextNamed: { defaultMessage: "What’s up next, {name}?", id: "flLEnDzvfG" },
  whatsUpNext: { defaultMessage: "What’s up next?", id: "W8pMCdh9hq" },
  welcomeBackNamed: { defaultMessage: "Welcome back, {name}", id: "UOxi8mioge" },
  welcomeBack: { defaultMessage: "Welcome back", id: "UKxoV8UIxo" },
} satisfies MessageDescriptors;

function CodeGreeting({
  greetEmpty,
  workspace,
}: {
  greetEmpty: boolean;
  workspace: WorkspaceContext;
}) {
  void workspace;
  const text = useI18nText(CODE_GREETING_MESSAGES);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchBootstrapPayload().then((payload) => {
      if (!alive || !payload) return;
      const account =
        payload.account && typeof payload.account === "object"
          ? (payload.account as Record<string, unknown>)
          : null;
      const display =
        typeof account?.display_name === "string" && account.display_name.trim()
          ? account.display_name.trim()
          : null;
      const full =
        typeof account?.full_name === "string" && account.full_name.trim()
          ? account.full_name.trim().split(/\s+/)[0] ?? null
          : null;
      setName(display || full || null);
    });
    return () => {
      alive = false;
    };
  }, []);

  const title = greetEmpty
    ? name
      ? text.whatsUpNextNamed.replace("{name}", name)
      : text.whatsUpNext
    : name
      ? text.welcomeBackNamed.replace("{name}", name)
      : text.welcomeBack;

  return (
    <header
      className="epitaxy-chat-column epitaxy-chat-size flex flex-row items-center gap-[calc(var(--g3)+2px)] pt-[12px] pb-[24px]"
      data-official-source="c11959232-h_zsw3wI.js:EpitaxyActionCenterGreeting"
    >
      <img alt="" aria-hidden="true" className="size-[22px] shrink-0 translate-y-px" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
      <h1 className="text-title text-t9">{title}</h1>
    </header>
  );
}
