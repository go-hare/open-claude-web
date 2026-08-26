import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { desktopBridge, type EffortLevel, type PermissionMode, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useI18nText, type MessageDescriptors } from "../../i18n/footerMenuMessages";
import { fetchBootstrapPayload } from "../settings/accountSettingsApi";
import { BOOTSTRAP_QUERY_KEY } from "../settings/bootstrapQuery";
import { sessionPath } from "../../shell/sessionPaths";
import { EpitaxyRouteFrame } from "./EpitaxyFrameSurface";
import { CodeStatsCard } from "./CodeStatsCard";
import { EpitaxyActionCenter } from "./EpitaxyActionCenter";
import { useEpitaxyActionCenterState } from "./epitaxyActionCenterState";
import { OfficialCodeComposer, type OfficialCodeComposerSubmitOptions } from "./composer/OfficialCodeComposer";
import {
  getCodeDraftComposerState,
  getLandingWorktreeEnabled,
  resetCodeDraftComposer,
  resolveDraftPermissionMode,
  setCodeDraftEffort,
  setCodeDraftModel,
  setDraftPermissionMode,
  setLandingWorktreeEnabled,
} from "./codeDraftComposerStore";
import {
  clampEffortToCatalog,
  cliEffortLevelsForModel,
} from "./session/officialComposerOptions";
import { officialCodeSessionStore } from "./session/officialCodeSessionStore";
import { kickOfficialAutoSessionTitle } from "./session/useOfficialAutoSessionTitle";
import {
  getSelectedFolder,
  subscribeSelectedFolder,
} from "../customize/selectedFolderStore";
import { applySelectedFolderToDraftWorkspace } from "../customize/applySelectedFolderToDraftWorkspace";

/**
 * Official c119 react-query residual for Code home draft seed:
 *   ["ccd-default-effort"] staleTime: Infinity
 *   ["epitaxy-project-default-mode", cwd] staleTime/gcTime: Infinity + placeholderData
 * Product was remounting EpitaxyHome → full-page skeleton + re-IPC every visit.
 * Cache hits paint Mode/effort immediately; only first cold workspace wait shows skeleton.
 */
const WORKSPACE_QUERY_KEY = ["code-workspace-context"] as const;
const DEFAULT_EFFORT_QUERY_KEY = ["ccd-default-effort"] as const;

function useCodeWorkspaceContext() {
  return useQuery({
    queryKey: WORKSPACE_QUERY_KEY,
    queryFn: () => desktopBridge.Preferences.getWorkspaceContext(),
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

function useCcdDefaultEffort() {
  const hasHost = typeof desktopBridge.LocalSessions.getDefaultEffort === "function";
  return useQuery({
    queryKey: DEFAULT_EFFORT_QUERY_KEY,
    queryFn: async () => {
      const value = await desktopBridge.LocalSessions.getDefaultEffort?.().catch(() => null);
      return (value as EffortLevel | null | undefined) ?? null;
    },
    enabled: hasHost,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

function useEpitaxyProjectDefaultMode(cwd: string | undefined) {
  const hasHost = typeof desktopBridge.LocalSessions.getDefaultPermissionMode === "function";
  // Official placeholderData = sticky landing/folder seed while host resolves (no Mode flash).
  const stickyMode = useMemo(
    () =>
      resolveDraftPermissionMode({
        cwd,
        preferOverride: true,
      }),
    [cwd],
  );
  return useQuery({
    queryKey: ["epitaxy-project-default-mode", cwd ?? ""],
    queryFn: async () => {
      if (!cwd) return null;
      const value = await desktopBridge.LocalSessions.getDefaultPermissionMode?.(cwd).catch(() => null);
      return typeof value === "string" && value.length > 0 ? value : null;
    },
    enabled: Boolean(cwd && hasHost),
    placeholderData: stickyMode,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
}

export function EpitaxyHome({ onNavigate, route }: RouteViewProps) {
  void route;
  const sticky = getCodeDraftComposerState();
  const workspaceQuery = useCodeWorkspaceContext();
  const effortQuery = useCcdDefaultEffort();
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);
  const hostWorkspace = workspaceQuery.data ?? null;
  /**
   * Official c119 zm: `_ = P?.cwd ?? p ?? undefined`. Home has no session
   * meta so draft cwd is vK selectedFolder (ca0135 fl mapped `+`).
   */
  const workspace = useMemo(
    () => applySelectedFolderToDraftWorkspace(hostWorkspace ?? EMPTY_DRAFT_WORKSPACE, selectedFolder),
    [hostWorkspace, selectedFolder],
  );
  const hostDefaultModeQuery = useEpitaxyProjectDefaultMode(workspace.cwd);

  /**
   * Official draft seed (c119):
   * folder map + landing sticky (localStorage) outrank host defaultMode.
   * Host getDefaultPermissionMode only fills when no folder/landing preference.
   * Do NOT block the whole page on effort/mode IPC — only cold workspace.
   */
  const permissionMode = useMemo(
    () =>
      resolveDraftPermissionMode({
        cwd: workspace.cwd,
        hostDefaultMode:
          typeof hostDefaultModeQuery.data === "string" ? hostDefaultModeQuery.data : null,
        preferOverride: true,
      }),
    [workspace.cwd, hostDefaultModeQuery.data],
  );
  const effort: EffortLevel =
    (effortQuery.data as EffortLevel | null | undefined)
    || sticky.effort
    || "medium";

  /**
   * Official c119 residual when no session (`!E`) and selectedFolder `je` is set:
   * Uo?.onOpenFile → pickFileAtCwd(je).then(tt).
   * Official home is the same tile as the session (has file side pane `tt`).
   * Our CodeNewSessionPage has no file pane — only the pick half of the residual
   * is valid here. Do not invent epitaxy-open-file / openInEditor fallbacks.
   * Full tt path lives on EpitaxySessionTile when a session is open.
   */
  useEffect(() => {
    if (!selectedFolder) return;
    const menuEvents = window["claude.web"]?.MenuEvents as
      | { onOpenFile?: (cb: () => void) => (() => void) | void; openFile?: (cb: () => void) => (() => void) | void }
      | undefined;
    if (!menuEvents?.onOpenFile && !menuEvents?.openFile) return;
    const je = selectedFolder;
    const pick = () => {
      void desktopBridge.LocalSessions.pickFileAtCwd?.(je);
    };
    const subscribe = menuEvents.onOpenFile ?? menuEvents.openFile;
    return subscribe?.(pick) ?? undefined;
  }, [selectedFolder]);

  /**
   * Official draft home mounts real Qj Prompt immediately (tipTap + RNt).
   * Do NOT invent a fake Prompt skeleton → live editor swap (blank ::before
   * then data-placeholder flash). Overlay selectedFolder onto host seed
   * (EMPTY_DRAFT_WORKSPACE until getWorkspaceContext resolves).
   */
  return (
    <CodeNewSessionPage
      initialEffort={effort}
      initialPermissionMode={permissionMode}
      onNavigate={onNavigate}
      workspace={workspace}
    />
  );
}

/** Host workspace not ready yet — same shape as bridge emptyWorkspace residual. */
const EMPTY_DRAFT_WORKSPACE: WorkspaceContext = {
  mode: "local",
  projectName: "local",
  branchName: "main",
  hasWorktree: false,
};

function CodeNewSessionPage({
  initialEffort,
  initialPermissionMode,
  onNavigate,
  workspace,
}: {
  initialEffort: EffortLevel;
  initialPermissionMode: PermissionMode;
  onNavigate: (path: string) => void;
  workspace: WorkspaceContext;
}) {
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  // Sticky draft model/effort/ultracode survive leave/return (same store as Mode).
  const [model, setModel] = useState(() => getCodeDraftComposerState().model ?? "default");
  // Seeded from host getDefaultPermissionMode before first paint (no "default" flash).
  const [permissionMode, setPermissionMode] = useState<PermissionMode>(initialPermissionMode);
  const [effort, setEffort] = useState<EffortLevel>(
    () => getCodeDraftComposerState().effort ?? initialEffort,
  );
  /** Official yR — new drafts start without Ultracode (session-only flag). */
  const [ultracode, setUltracode] = useState(() => getCodeDraftComposerState().ultracode);
  /** Official get_settings.applied (CLI 2.7.16+) — per-model catalog ladder for the draft slider. */
  const [effortLevels, setEffortLevels] = useState<string[] | null>(null);
  const [ultracodeOfferable, setUltracodeOfferable] = useState<boolean | null>(null);
  const [composerWorkspace, setComposerWorkspace] = useState(workspace);
  const [sourceBranch, setSourceBranch] = useState(workspace.cwd ? workspace.branchName : "");
  /** Official fc("cc-landing-worktree-enabled", true) — sticky Kn; cwd change does not wipe. */
  const [useWorktree, setUseWorktree] = useState(() => getLandingWorktreeEnabled());
  /** Official c119: epitaxy:reset-draft remount key when no session id (void 0===o). */
  const [draftEpoch, setDraftEpoch] = useState(0);

  /**
   * Seed composer from parent overlay. If cwd already matches (Ikt browse
   * wrote git-enriched workspace then setSelectedFolder), keep local state —
   * do not wipe branch/worktree with the empty overlay object.
   */
  useEffect(() => {
    let replaced = false;
    setComposerWorkspace((current) => {
      if (workspace.cwd && current.cwd === workspace.cwd) return current;
      replaced = true;
      return workspace;
    });
    if (replaced) {
      setSourceBranch(workspace.cwd ? workspace.branchName : "");
      // Official Kn sticky survives cwd change. Qn = Gn && Kn at startIntent.
    }
  }, [workspace]);

  /**
   * Official c119 residual (sidebar Qas → CustomEvent "epitaxy:reset-draft"):
   * when no session id: clear prompt/ultracode + remount counter.
   * Does NOT wipe folder map / landing sticky Mode (official zo(uE) only).
   */
  useEffect(() => {
    const onReset = () => {
      setPrompt("");
      setBusy(false);
      setUltracode(false);
      resetCodeDraftComposer();
      // Re-resolve Mode from persisted folder/landing (not host "default").
      setPermissionMode(
        resolveDraftPermissionMode({
          cwd: composerWorkspace.cwd,
          preferOverride: false,
        }),
      );
      setDraftEpoch((n) => n + 1);
    };
    window.addEventListener("epitaxy:reset-draft", onReset);
    return () => window.removeEventListener("epitaxy:reset-draft", onReset);
  }, [composerWorkspace.cwd]);

  /**
   * Cwd change: official rn = folderMap[cwd] ?? getDefaultPermissionMode ?? landing.
   * Uses same react-query keys as EpitaxyHome (staleTime Infinity) — no re-IPC on cache hit.
   * Never snap to "default" while host is loading.
   */
  const cwdEffortQuery = useCcdDefaultEffort();
  const cwdModeQuery = useEpitaxyProjectDefaultMode(composerWorkspace.cwd);
  useEffect(() => {
    // Immediate folder/landing paint for new cwd (no host wait flash).
    setPermissionMode(
      resolveDraftPermissionMode({
        cwd: composerWorkspace.cwd,
        preferOverride: false,
      }),
    );
  }, [composerWorkspace.cwd]);
  useEffect(() => {
    if (cwdEffortQuery.data) {
      setEffort(cwdEffortQuery.data as EffortLevel);
      setCodeDraftEffort(cwdEffortQuery.data as EffortLevel, ultracode);
    }
  }, [cwdEffortQuery.data, ultracode]);
  useEffect(() => {
    setPermissionMode(
      resolveDraftPermissionMode({
        cwd: composerWorkspace.cwd,
        hostDefaultMode:
          cwdModeQuery.data != null && cwdModeQuery.data !== ""
            ? String(cwdModeQuery.data)
            : null,
        preferOverride: true,
      }),
    );
  }, [composerWorkspace.cwd, cwdModeQuery.data]);

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

  /**
   * Residual create path (product host-loop):
   * - busy maps Ns create-in-flight (Rs±1 around mutate); OfficialCodeComposer → residualQjDisabled
   * - LocalSessions.start then navigate to /code/:id — never keep createPending on same shell
   * - Os "spawning" only when createPending && Ns===0; product has no same-shell pending shell
   * - Do NOT invent sticky "Starting…" from initializationStatus on existing session tile
   */
  const submit = useCallback(async (options?: OfficialCodeComposerSubmitOptions) => {
    const normalized = prompt.trim();
    const images = options?.images?.filter((image) => typeof image?.base64 === "string" && image.base64.length > 0);
    // Official Te (he||m): allow image-only first turn; host still needs a prompt string.
    if ((!normalized && !(images && images.length > 0)) || busy) return;
    setBusy(true);
    try {
      const shouldUseGitControls = Boolean(composerWorkspace.cwd && sourceBranch);
      const isSsh = composerWorkspace.mode === "ssh" && Boolean(composerWorkspace.sshConfig);
      // Wire residual: Ultracode → "ultracode"; else ladder id (same as setEffort).
      const wireEffort = ultracode ? "ultracode" : effort;
      const startPrompt = normalized || " ";
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        effort: wireEffort,
        model,
        prompt: startPrompt,
        ...(images && images.length > 0 ? { images } : {}),
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
      // Official create residual: generate_session_title when prompt length >= 10 → titleSource auto.
      kickOfficialAutoSessionTitle(session.id, startPrompt);
      // Residual openSession(meta) before route paint so ExistingSessionComposer seeds
      // Mode from host session.permissionMode (`be(n.permissionMode)`) — not invent
      // "default" (询问权限) for one frame after draft already showed bypass/accept.
      officialCodeSessionStore.getState().openSession(session.id, session);
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
                  setCodeDraftEffort(level, nextUltracode);
                }}
                onModelChange={(next) => {
                  setModel(next);
                  setCodeDraftModel(next);
                }}
                onPermissionModeChange={(next) => {
                  // Official jn: folder map + landing sticky (not settings.defaultMode).
                  setPermissionMode(next);
                  setDraftPermissionMode(next, { cwd: composerWorkspace.cwd });
                }}
                onSourceBranchChange={setSourceBranch}
                onSubmit={(options) => void submit(options)}
                onUseWorktreeChange={(enabled) => {
                  setUseWorktree(enabled);
                  setLandingWorktreeEnabled(enabled);
                }}
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
 *   name = account.display_name || account.full_name?.split(" ")[0]  (Go())
 *   greetEmpty (Pw) → "What’s up next, {name}?" / "What’s up next?"
 *   else → "Welcome back, {name}" / "Welcome back"
 * ids: flLEnDzvfG / W8pMCdh9hq / UOxi8mioge / UKxoV8UIxo
 * zh-CN flLEnDzvfG: "{name}，接下来做点什么？"
 *
 * Official Go is a store already hydrated when Tw paints. Product shares App
 * login-gate bootstrap via react-query (BOOTSTRAP_QUERY_KEY) so name is not a
 * second late useEffect after Welcome back / un-named What's up next flash.
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
  // Official Go() account — shared bootstrap cache (App seeds on login gate).
  const bootstrapQuery = useQuery({
    queryKey: BOOTSTRAP_QUERY_KEY,
    queryFn: async () => (await fetchBootstrapPayload()) ?? null,
    staleTime: Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
  });
  const name = useMemo(() => {
    const payload = bootstrapQuery.data;
    if (!payload || typeof payload !== "object") return null;
    const account =
      "account" in payload && payload.account && typeof payload.account === "object"
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
    return display || full || null;
  }, [bootstrapQuery.data]);

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
