import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { desktopBridge, type EffortLevel, type PermissionMode, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useI18nText, type MessageDescriptors } from "../../i18n/footerMenuMessages";
import { fetchBootstrapPayload } from "../settings/accountSettingsApi";
import { BOOTSTRAP_QUERY_KEY } from "../settings/bootstrapQuery";
import { sessionPath } from "../../shell/sessionPaths";
import { paneStore } from "../../stores/paneStore";
import { EpitaxyRouteFrame } from "./EpitaxyFrameSurface";
import { OfficialChatTileShell, OfficialSessionHeader, type OfficialViewPane } from "./OfficialEpitaxyComponents";
import { CodeStatsCard } from "./CodeStatsCard";
import { EpitaxyActionCenter } from "./EpitaxyActionCenter";
import { useEpitaxyActionCenterState } from "./epitaxyActionCenterState";
import { OfficialCodeComposer, type OfficialCodeComposerSubmitOptions } from "./composer/OfficialCodeComposer";
import { OfficialEpitaxyDropZone, type OfficialEpitaxyDropHandlers } from "./session/OfficialEpitaxyDropZone";
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
  OFFICIAL_LANDING_COMPOSER_DRAFT_KEY,
  persistComposerDraft,
  readComposerDraft,
} from "./officialComposerDraftStore";
import {
  clampEffortToCatalog,
  cliEffortLevelsForModel,
} from "./session/officialComposerOptions";
import { officialCodeSessionStore } from "./session/officialCodeSessionStore";
import {
  officialAgentFromSearch,
  officialDirectPromptFromSearch,
  officialFolderFromSearch,
  replaceOfficialConsumedSearch,
  useOfficialPromptUrlSeed,
} from "./session/officialPromptUrl";
import { useErrorsOptional } from "../settings/errorsToast";
import { kickOfficialAutoSessionTitle } from "./session/useOfficialAutoSessionTitle";
import {
  getSelectedFolder,
  setSelectedFolder,
  subscribeSelectedFolder,
} from "../customize/selectedFolderStore";
import { applySelectedFolderToDraftWorkspace } from "../customize/applySelectedFolderToDraftWorkspace";
import { OfficialSparkIdle } from "../shared/OfficialSparkIdle";
import { EpitaxySidePaneColumn, sidePaneMinWidth } from "./session/EpitaxySidePanes";
import type { OfficialFileViewTarget } from "./session/OfficialFilePane";
import { useOfficialFramebufferMenuGate } from "./session/OfficialFramebufferPane";

/**
 * Official cd5a31703 react-query residual for Code home draft seed:
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
   * Official cd5a31703 zm: `_ = P?.cwd ?? p ?? undefined`. Home has no session
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
      selectedFolder={selectedFolder}
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
  selectedFolder,
  workspace,
}: {
  initialEffort: EffortLevel;
  initialPermissionMode: PermissionMode;
  onNavigate: (path: string) => void;
  selectedFolder: string | null;
  workspace: WorkspaceContext;
}) {
  const search = typeof window === "undefined" ? "" : window.location.search;
  /**
   * Official vI `E=l??wr(a)?.agent` seeds BEFORE bE `zo(uE,{text:u})`.
   * Capture first so query prompt wipe does not drop a real chip name.
   */
  const [landingAgent] = useState(() =>
    officialAgentFromSearch(search) ?? readComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY)?.agent,
  );
  const [prompt, setPrompt] = useState(() => {
    const query = officialDirectPromptFromSearch(search);
    const queryAgent = officialAgentFromSearch(search);
    // Official bE `u?zo(uE,{text:u})` — text-only wipe of files/agent in LS.
    if (query) persistComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY, { text: query });
    else if (queryAgent) {
      const existing = readComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY);
      persistComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY, {
        agent: queryAgent,
        files: existing?.files,
        text: existing?.text,
      });
    }
    return query ?? readComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY)?.text ?? "";
  });
  const [draftEpoch, setDraftEpoch] = useState(0);
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
  /**
   * Official Ek on the session column; tC/Qj chrome publishes handlers.
   * Drop overlay is `absolute inset-0` of this h-full box — not the shrink-0 composer.
   */
  const dropHandlersRef = useRef<OfficialEpitaxyDropHandlers | null>(null);
  const errors = useErrorsOptional();
  /**
   * Official bE `prompt_url` fetch → zo({text}) + remount when no session is bound.
   * Direct `prompt`/`q` already zo'd in the prompt useState init.
   */
  useOfficialPromptUrlSeed({
    addError: errors?.addError,
    enabled: true,
    sessionBound: false,
    setComposerText: (text) => {
      persistComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY, { text });
      setPrompt(text);
      setDraftEpoch((n) => n + 1);
    },
  });
  /**
   * Official bE: `f=i.folder` + `src!==external` → setSelectedFolder(f).
   * Then strip Tb keys (`q/prompt/prompt_url/folder/src/…`). Skip SSH confirm.
   */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const folder = officialFolderFromSearch(window.location.search);
    if (folder) setSelectedFolder(folder);
    replaceOfficialConsumedSearch();
  }, []);
  /**
   * Official c119 `tt`: pickFileAtCwd(je).then(tt) → setFileView + setSidePane("file").
   * Empty home has no tiles until a pick succeeds — do not invent Nn on first paint.
   */
  const [homeFileView, setHomeFileView] = useState<OfficialFileViewTarget | null>(null);
  /** Official eI YR setSidePane on draft (sessionRef null). */
  const [homeSideTiles, setHomeSideTiles] = useState<OfficialViewPane[]>([]);
  const canOpenHomeFiles = Boolean(composerWorkspace.cwd && desktopBridge.LocalSessions.pickFileAtCwd);
  const selectHomeView = useCallback((view: OfficialViewPane) => {
    if (view === "file") {
      if (homeFileView) {
        setHomeFileView(null);
        setHomeSideTiles((tiles) => tiles.filter((tile) => tile !== "file"));
        return;
      }
      const cwd = composerWorkspace.cwd;
      const pick = desktopBridge.LocalSessions.pickFileAtCwd;
      if (!cwd || !pick) return;
      void pick(cwd).then((picked) => {
        if (!picked) return;
        setHomeFileView({ path: picked, scrollNonce: Date.now() });
        setHomeSideTiles((tiles) => (tiles.includes("file") ? tiles : [...tiles, "file"]));
      });
      return;
    }
    setHomeSideTiles((tiles) => (
      tiles.includes(view) ? tiles.filter((tile) => tile !== view) : [...tiles, view]
    ));
  }, [composerWorkspace.cwd, homeFileView]);
  const homeTiles = useMemo((): OfficialViewPane[] => {
    if (homeFileView && !homeSideTiles.includes("file")) return [...homeSideTiles, "file"];
    return homeSideTiles;
  }, [homeFileView, homeSideTiles]);
  /** Official YR T && (sources || already open). Draft cwd is landing folder. */
  const canOpenHomeFramebuffer = useOfficialFramebufferMenuGate(
    composerWorkspace.cwd,
    homeTiles.includes("framebuffer"),
  );

  /**
   * Official cd5a31703 residual when no session (`!E`) and selectedFolder `je` is set:
   * Uo?.onOpenFile → pickFileAtCwd(je).then(tt).
   * `tt` = setFileView + setSidePane("file") on the same home tile.
   */
  useEffect(() => {
    if (!selectedFolder) return;
    const menuEvents = window["claude.web"]?.MenuEvents as
      | { onOpenFile?: (cb: () => void) => (() => void) | void; openFile?: (cb: () => void) => (() => void) | void }
      | undefined;
    if (!menuEvents?.onOpenFile && !menuEvents?.openFile) return;
    const je = selectedFolder;
    const pick = () => {
      const fn = desktopBridge.LocalSessions.pickFileAtCwd;
      if (!fn) return;
      void fn(je).then((picked) => {
        if (picked) {
          setHomeFileView({ path: picked, scrollNonce: Date.now() });
          setHomeSideTiles((tiles) => (tiles.includes("file") ? tiles : [...tiles, "file"]));
        }
      });
    };
    const subscribe = menuEvents.onOpenFile ?? menuEvents.openFile;
    return subscribe?.(pick) ?? undefined;
  }, [selectedFolder]);

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
   * Official cd5a31703 residual (sidebar Qas → CustomEvent "epitaxy:reset-draft"):
   * when no session id: clear prompt/ultracode + remount counter.
   * Does NOT wipe folder map / landing sticky Mode (official zo(uE) only).
   */
  useEffect(() => {
    const onReset = () => {
      persistComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY, {});
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
    const fileMentionPrefix = options?.fileMentionPrefix ?? "";
    // Official Te (he||m) + f(): text, images, or local file mention prefix (@relativePath ).
    if ((!normalized && !(images && images.length > 0) && !fileMentionPrefix.trim()) || busy) return;
    setBusy(true);
    try {
      const shouldUseGitControls = Boolean(composerWorkspace.cwd && sourceBranch);
      const isSsh = composerWorkspace.mode === "ssh" && Boolean(composerWorkspace.sshConfig);
      // Wire residual: Ultracode → "ultracode"; else ladder id (same as setEffort).
      const wireEffort = ultracode ? "ultracode" : effort;
      const startPrompt = `${fileMentionPrefix}${normalized || " "}`;
      const session = await desktopBridge.LocalSessions.start({
        kind: "code",
        effort: wireEffort,
        model,
        prompt: startPrompt,
        ...(options?.agent ? { agent: options.agent } : {}),
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
      // Official vI keeps E across draft→session (same instance, persistKey epitaxy-draft → epitaxy-${id}).
      // Product remounts ChatPanel — copy a real wr().agent only; never invent a name.
      const persistedAgent = readComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY)?.agent ?? landingAgent;
      if (persistedAgent) persistComposerDraft(`epitaxy-${session.id}`, { agent: persistedAgent });
      persistComposerDraft(OFFICIAL_LANDING_COMPOSER_DRAFT_KEY, {});
      // Residual openSession(meta) before route paint so ExistingSessionComposer seeds
      // Mode from host session.permissionMode (`be(n.permissionMode)`) — not invent
      // "default" (询问权限) for one frame after draft already showed bypass/accept.
      officialCodeSessionStore.getState().openSession(session.id, session);
      onNavigate(sessionPath(session));
    } finally {
      setBusy(false);
    }
  }, [busy, composerWorkspace, effort, landingAgent, model, onNavigate, permissionMode, prompt, sourceBranch, ultracode, useWorktree]);

  // Official Pw shared by Tw greeting + _w ActionCenter / $x stats branch.
  const actionCenter = useEpitaxyActionCenterState();

  // Official bE (cd5a31703 / cc43287c9) always mounts iE for draft (sessionRef may be null):
  // isolate rounded-r6 + Nn sidebar, then Ek as the chat-column child. Do not
  // hand-roll a second isolate around Ek.
  const chatColumn = (
        <OfficialEpitaxyDropZone
          className="h-full min-w-0 flex flex-col"
          onFilesDropped={(files) => dropHandlersRef.current?.onFilesDropped(files)}
          onFolderDropped={(folders) => dropHandlersRef.current?.onFolderDropped(folders)}
          onNonImageFilesDropped={(files) => dropHandlersRef.current?.onNonImageFilesDropped(files)}
          style={homeTiles.length > 0 ? { height: "100%", minWidth: sidePaneMinWidth, flex: "1 1 0" } : undefined}
        >
          {/* Official vI eI then nz greeting. YR mounts with sessionRef null. */}
          <OfficialSessionHeader
            agent={landingAgent}
            canOpenFiles={canOpenHomeFiles}
            canOpenFramebuffer={canOpenHomeFramebuffer}
            isTitleLoading={false}
            isTopLeft
            onViewSelect={selectHomeView}
            openViews={homeTiles}
            paneIndex={0}
            session={null}
            sessionRef={null}
            title=""
          />
          {/* Official cc432 nz: greeting is a direct Ek child (session tile: header + body). */}
          <CodeGreeting greetEmpty={actionCenter.greetEmpty} workspace={workspace} />
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
                persistKey={OFFICIAL_LANDING_COMPOSER_DRAFT_KEY}
                initialAgent={landingAgent}
                busy={busy}
                dropHandlersRef={dropHandlersRef}
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
        </OfficialEpitaxyDropZone>
  );

  return (
    <EpitaxyRouteFrame>
      <OfficialChatTileShell onActivate={() => paneStore.setFocusedIndex("code", 0)}>
        {homeTiles.length > 0 ? (
          <div className="relative h-full min-w-0 flex" style={{ gap: 12 }}>
            {chatColumn}
            <EpitaxySidePaneColumn
              fileView={homeFileView}
              flex={homeFileView || homeTiles.includes("diff") || homeTiles.includes("preview") ? 3 : 1}
              landingCwd={composerWorkspace.cwd}
              messages={[]}
              onCloseAll={() => {
                setHomeFileView(null);
                setHomeSideTiles([]);
              }}
              onCloseTile={(view) => {
                if (view === "file") setHomeFileView(null);
                setHomeSideTiles((tiles) => tiles.filter((tile) => tile !== view));
              }}
              onFileViewChange={setHomeFileView}
              onSidePaneWidthChange={() => undefined}
              previewTarget={null}
              session={null}
              sessionRef={null}
              sideTiles={homeTiles}
              subagentView={null}
            />
          </div>
        ) : chatColumn}
      </OfficialChatTileShell>
    </EpitaxyRouteFrame>
  );
}

/**
 * Official cc43287c9 `nz` greeting (non-centered): Spark `bu` size 22 + h1, not Ace raster.
 *   name = account.display_name || account.full_name?.split(" ")[0]  (Go())
 *   greetEmpty (Pw) → "What’s up next, {name}?" / "What’s up next?"
 *   else → "Welcome back, {name}" / "Welcome back"
 * ids: flLEnDzvfG / W8pMCdh9hq / UOxi8mioge / UKxoV8UIxo
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
      data-official-source="cc43287c9-Bchz60VT.js:nz Tw EpitaxyActionCenterGreeting"
    >
      <OfficialSparkIdle size={22} />
      <h1 className="text-title text-t9">{title}</h1>
    </header>
  );
}
