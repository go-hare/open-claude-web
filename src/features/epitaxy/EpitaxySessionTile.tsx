import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";
import type { ChatMessage } from "../../adapters/desktopBridge/types";
import { sessionHomePath } from "../../shell/sessionPaths";
import {
  paneRefToPath,
  paneStore,
  usePaneStoreSnapshot,
  type PaneSlot,
} from "../../stores/paneStore";
import { EpitaxyTileLayout } from "./EpitaxyFrameSurface";
import { OfficialSplitSuggestionToast } from "./session/OfficialSplitSuggestionToast";
import { OfficialPendingNavFrame } from "./session/OfficialPendingNavFrame";
import {
  OfficialChatTileShell,
  type OfficialTranscriptMode,
  type OfficialViewPane,
} from "./OfficialEpitaxyComponents";
import "./diff/ensurePierreDiffsContainer";
import { createMessageUuid } from "../../adapters/desktopBridge/messageUuid";
import {
  officialCodeSessionStore,
  useOfficialCodeSessionBucket,
} from "./session/officialCodeSessionStore";
import { officialSideChatStore } from "./session/officialSideChatStore";
import { setDraftPermissionMode } from "./codeDraftComposerStore";
import { readComposerDraftAgent } from "./officialComposerDraftStore";
import type { PermissionMode } from "../../adapters/desktopBridge";
import {
  officialTitlebarFilesAvailable,
  useOfficialFilesBrowserMenuGate,
} from "./session/OfficialFilesBrowserPane";
import { useOfficialFramebufferMenuGate } from "./session/OfficialFramebufferPane";
import { sessionHasOfficialRuns } from "./session/OfficialRunsPane";
import { type OfficialFileViewTarget as OfficialFileViewTargetImported } from "./session/OfficialFilePane";
import { type OfficialPreviewTarget as OfficialPreviewTargetImported } from "./session/OfficialPreviewPane";
import {
  isOfficialHtmlPreviewServerId,
  isOfficialTtHtmlPreviewPath,
  officialLoadHtmlPreview,
  officialTtHtmlPreviewAbsPath,
  useOfficialHtmlPreviewAutoOpen,
} from "./session/officialHtmlPreviewAutoOpen";
import { officialAgentFromSearch, replaceOfficialConsumedSearch, useOfficialPromptUrlSeed } from "./session/officialPromptUrl";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { SESSION_LOAD_MESSAGES, SIDE_CHAT_MESSAGES } from "./officialCodeChromeMessages";
import { EpitaxySidePaneColumn, chatDefaultFlex, sidePaneMinWidth } from "./session/EpitaxySidePanes";
import {
  officialAsciinemaPlayCommand,
  officialEpitaxyShellRunStore,
  officialFlushPendingShellCommand,
} from "./session/officialEpitaxyShellRunStore";
import {
  OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
  officialTerminalPtyKey,
} from "./session/officialEpitaxyTerminalTabsStore";
import {
  EpitaxyTranscriptActionContext,
  type EpitaxySessionType,
  type EpitaxySessionRef as EpitaxySessionRefImported,
  type OfficialSubagentTarget,
} from "./session/epitaxyTranscriptActionContext";
import {
  parseOfficialPlan,
  parseOfficialTasks,
} from "./session/officialTasksAndPlan";
import {
  sendMessageToSession,
  useEpitaxySessionData,
  useEpitaxySessionType,
  useFocusedSession,
} from "./session/useEpitaxySessionData";
import { previewAnnotationQueue } from "./session/previewAnnotationQueue";
import {
  loadOfficialThinkingSparkAnimation,
  renderTranscriptBody,
  scrollElementToBottom,
  type OfficialTranscriptHandle,
  type OfficialTranscriptScrollBehavior,
  type OfficialTranscriptScrollState,
} from "./session/OfficialTranscript";
import { OfficialChapterToc } from "./session/OfficialChapterToc";
import { OfficialSummaryTranscriptBody } from "./session/OfficialSummaryTranscriptBody";
import { OfficialUltrareviewProgress } from "./session/OfficialUltrareviewProgress.tsx";
import { OfficialWorkingStatus } from "./session/OfficialWorkingStatus";
import {
  EpitaxyChatHeader,
  OfficialSubagentPane,
  officialSessionHeaderTitle,
  useEpitaxyViewShortcuts,
} from "./session/EpitaxyChatChrome";
import { cycleOfficialTranscriptMode } from "./session/officialTranscriptMode";
import {
  EPITAXY_SIDE_PANE_PERSIST_KEY,
  OfficialSidePaneStoreProvider,
  residualOfficialViewPanes,
  residualSecondarySidePanePersistKey,
  useOfficialSidePaneSessionStore,
  useOfficialSidePaneStoreApi,
} from "./session/officialSidePaneSessionStore";
import {
  residualChatFlex,
  residualSideColumns,
} from "./session/officialTileLayout";
import {
  isEpitaxyPopoutWindow,
  officialViewPanePopoutTitle,
  readEpitaxyPopoutHydration,
  readEpitaxyPopoutPane,
} from "./session/epitaxyPopoutWindow";
import {
  ExistingSessionComposer,
  type OfficialComposerSurfaceApi,
} from "./session/OfficialExistingSessionComposer";
import { OfficialEpitaxyDropZone, type OfficialEpitaxyDropHandlers } from "./session/OfficialEpitaxyDropZone";
import { OfficialCodeSessionErrorBanner } from "./session/OfficialCodeSessionErrorBanner";
import { EpitaxyChatPanelErrorBoundary } from "./session/EpitaxyChatPanelErrorBoundary";
import { useErrorsOptional } from "../settings/errorsToast";
import { OfficialRewindPicker } from "./session/OfficialRewindPicker";
import { collectOfficialRewindTurns } from "./session/officialRewindTurns";
import { coworkRateLimitStore } from "../cowork/session/rateLimit/coworkRateLimitStore";
import {
  residualGaFromMessageLimits,
  residualOs,
  residualQjDisabled,
} from "./session/officialQjComposerGate";

type OfficialPreviewTarget = OfficialPreviewTargetImported;

type OfficialFileViewTarget = OfficialFileViewTargetImported;


type EpitaxySessionRef = EpitaxySessionRefImported;

type EpitaxyFramePageProps = {
  hideComposer?: boolean;
  landingActions?: ReactNode;
  landingBody?: ReactNode;
  onNavigate: (path: string) => void;
  sessionId: string;
};

type EpitaxySessionTileProps = {
  isLonePane?: boolean;
  onClose?: () => void;
  onMovePane?: (slot: PaneSlot) => void;
  onNavigate: (path: string) => void;
  paneIndex?: number;
  sessionId: string;
  slot?: PaneSlot;
};

const draftPersistKey = "epitaxy-draft";

export function EpitaxyFramePage({ hideComposer, landingActions, landingBody, onNavigate, sessionId }: EpitaxyFramePageProps) {
  const activeSessionId = sessionId || undefined;
  const sessionType = useEpitaxySessionType(activeSessionId);
  const fallbackHome = sessionHomePath("code");
  // Official c119 bE: $o() = extraPanesByMode[mode]; Close pane only when length > 0.
  const paneSnapshot = usePaneStoreSnapshot();
  const hasExtraCodePanes = (paneSnapshot.extraPanesByMode.code ?? []).length > 0;

  useEffect(() => {
    void loadOfficialThinkingSparkAnimation();
  }, []);
  // Official bE: session bound still strips Tb keys; skip folder/repos/environment.
  useEffect(() => {
    replaceOfficialConsumedSearch();
  }, []);
  const sessionRef = useMemo(() => activeSessionId ? { id: activeSessionId, type: sessionType } : null, [activeSessionId, sessionType]);
  const loadBucket = useOfficialCodeSessionBucket(activeSessionId);
  const sessionLoadPending = Boolean(activeSessionId)
    && loadBucket.messages.length === 0
    && (loadBucket.isTranscriptPending || loadBucket.isMetaPending)
    && loadBucket.compactionStatus !== "compacting";
  const popoutPane = readEpitaxyPopoutPane();
  const sidePanePersistKey = popoutPane
    ? `${EPITAXY_SIDE_PANE_PERSIST_KEY}.popout.${popoutPane}`
    : EPITAXY_SIDE_PANE_PERSIST_KEY;

  useFocusedSession(activeSessionId);

  /**
   * Official primary Close pane residual (`cd` / `_l` in ca0135bc5):
   *   Ue = $o().length > 0 ? cd() : void 0
   * When split exists: close extra pane index 1 and navigate to that ref.
   * Lone primary: no Close pane X — delete/archive leave via OfficialSessionTitle fallback home.
   */
  const onCloseExtraPane = useCallback(() => {
    const first = (paneStore.getState().extraPanesByMode.code ?? [])[0];
    if (!first) return;
    paneStore.closePane("code", 1);
    onNavigate(paneRefToPath(first.ref));
  }, [onNavigate]);

  // Official Ho fallback onBack → landing (uc Back to landing page).
  const onChatPanelBack = useCallback(() => {
    onNavigate(fallbackHome);
  }, [fallbackHome, onNavigate]);

  // Official tile layout (c11959232 KI/YI): topLeftId marks the primary pane tile isTopLeft.
  // EpitaxyFramePage is always the dframe-pane-primary chat tile, so isTopLeft must be true.
  // Official CSS then applies:
  //   .dframe-root[data-collapsed] .dframe-pane-primary .epitaxy-root [data-top-left]{margin-left:112px}
  // Official wt: Ho(EpitaxyChatPanel) → fallback uc({ message, onBack, error }).
  const renderChatTile = useCallback((_onViewDragOut?: unknown, isTopLeft = true, dragHandle?: ReactNode) => (
    <OfficialChatTileShell onActivate={() => paneStore.setFocusedIndex("code", 0)}>
      <EpitaxyChatPanelErrorBoundary onBack={onChatPanelBack} sessionId={activeSessionId}>
        <EpitaxyChatPanel
          draftPersistKey={activeSessionId ? `epitaxy-${activeSessionId}` : draftPersistKey}
          dragHandle={dragHandle}
          hideComposer={hideComposer}
          initialSessionId={activeSessionId}
          isPanelActive
          isTopLeft={isTopLeft}
          landingActions={landingActions}
          landingBody={landingBody}
          onNavigate={onNavigate}
          onSessionRemoved={hasExtraCodePanes ? onCloseExtraPane : undefined}
          sessionRef={sessionRef}
          sessionType={activeSessionId ? sessionType : undefined}
        />
      </EpitaxyChatPanelErrorBoundary>
    </OfficialChatTileShell>
  ), [activeSessionId, hasExtraCodePanes, hideComposer, landingActions, landingBody, onChatPanelBack, onCloseExtraPane, onNavigate, sessionRef, sessionType]);

  // Official kI/`sg` PierreWorkerPool is provided by App shell for kind==="code"
  // (stays mounted across /code/:id). Do not wrap here — remounting pool on each
  // session switch re-inits workers (~1s longtask).
  // Residual kI(sidePanePersistKey=EPITAXY_SIDE_PANE_PERSIST_KEY): primary Nr store.
  return (
    <OfficialSidePaneStoreProvider persistKey={sidePanePersistKey}>
      <div className="epitaxy-root select-none h-full w-full flex flex-col">
        <OfficialPendingNavFrame className="flex-1 min-h-0" pending={sessionLoadPending}>
          <EpitaxyTileLayout>{renderChatTile(undefined, true)}</EpitaxyTileLayout>
        </OfficialPendingNavFrame>
        <OfficialSplitSuggestionToast
          enabled
          pathname={typeof window === "undefined" ? "" : window.location.pathname}
          sessionRef={sessionRef}
        />
      </div>
    </OfficialSidePaneStoreProvider>
  );
}

export function EpitaxySessionTile({ onClose, onNavigate, paneIndex = 0, sessionId, slot }: EpitaxySessionTileProps) {
  // isLonePane / onMovePane / slot kept on props for PaneLayout API; secondary Close pane only needs onClose.
  // Residual EpitaxySecondPane: sidePanePersistKey = `${dd}.${slot}` (tr|br|bl).
  return (
    <EpitaxySecondPane
      onClose={onClose}
      onNavigate={onNavigate}
      paneIndex={paneIndex}
      sessionId={sessionId}
      slot={slot}
    />
  );
}

function EpitaxySecondPane({ onClose, onNavigate, paneIndex, sessionId, slot }: EpitaxySessionTileProps) {
  const sessionType = useEpitaxySessionType(sessionId);
  const sessionRef = useMemo(() => ({ id: sessionId, type: sessionType }), [sessionId, sessionType]);
  // Residual `${dd}.${slot}` — fall back tr when slot omitted (legacy callers).
  const sidePanePersistKey = residualSecondarySidePanePersistKey(slot ?? "tr");
  // Secondary pane crash: close the pane if possible, else home (do not steal primary route on close alone).
  const onChatPanelBack = useCallback(() => {
    if (onClose) {
      onClose();
      return;
    }
    onNavigate(sessionHomePath("code"));
  }, [onClose, onNavigate]);
  // Official yE: onSessionRemoved:a = onClose (Close pane X always on secondary).
  // Official ZR residual: secondary delete also calls a (close pane by stable ref).
  // Never fall back to onNavigate(home) — that would steal the primary route.
  const renderChatTile = useCallback((_onViewDragOut?: unknown, isTopLeft?: boolean, dragHandle?: ReactNode) => (
    <OfficialChatTileShell onActivate={() => paneStore.setFocusedIndex("code", paneIndex)}>
      <EpitaxyChatPanelErrorBoundary onBack={onChatPanelBack} sessionId={sessionId}>
        <EpitaxyChatPanel
          draftPersistKey={`epitaxy-pane-${sessionId}`}
          dragHandle={dragHandle}
          initialSessionId={sessionId}
          isPanelActive={false}
          isTopLeft={isTopLeft}
          onNavigate={onNavigate}
          onSessionRemoved={onClose}
          paneIndex={paneIndex}
          sessionRef={sessionRef}
          sessionType={sessionType}
        />
      </EpitaxyChatPanelErrorBoundary>
    </OfficialChatTileShell>
  ), [onChatPanelBack, onClose, onNavigate, paneIndex, sessionId, sessionRef, sessionType]);

  const loadBucket = useOfficialCodeSessionBucket(sessionId);
  const sessionLoadPending = loadBucket.messages.length === 0
    && (loadBucket.isTranscriptPending || loadBucket.isMetaPending)
    && loadBucket.compactionStatus !== "compacting";
  return (
    <OfficialSidePaneStoreProvider persistKey={sidePanePersistKey}>
      <div className="epitaxy-root select-none flex-1 min-h-0 flex flex-col overflow-hidden">
        <OfficialPendingNavFrame className="flex-1 min-h-0" pending={sessionLoadPending}>
          <EpitaxyTileLayout>{renderChatTile()}</EpitaxyTileLayout>
        </OfficialPendingNavFrame>
      </div>
    </OfficialSidePaneStoreProvider>
  );
}

type EpitaxyChatPanelProps = {
  draftPersistKey: string;
  dragHandle?: ReactNode;
  hideComposer?: boolean;
  initialSessionId?: string;
  isPanelActive: boolean;
  isTopLeft?: boolean;
  landingActions?: ReactNode;
  landingBody?: ReactNode;
  onNavigate: (path: string) => void;
  /** Official eI Close pane handler — truthy shows header X. */
  onSessionRemoved?: () => void;
  paneIndex?: number;
  sessionRef: EpitaxySessionRef | null;
  sessionType?: EpitaxySessionType;
};

function EpitaxyChatPanel({
  draftPersistKey,
  dragHandle,
  hideComposer = false,
  initialSessionId,
  isPanelActive,
  isTopLeft,
  landingActions,
  landingBody,
  onNavigate,
  onSessionRemoved,
  paneIndex = 0,
  sessionRef,
  sessionType = "local",
}: EpitaxyChatPanelProps) {
  const {
    beginLocalUserTurn,
    cancelQueuedMessage,
    reorderQueuedMessage,
    steerQueuedMessage,
    entries,
    queuedEntries,
    error,
    errorCategory,
    isLoading,
    busy,
    isResponding,
    isSessionNotFound,
    isUltrareviewTagged,
    messages,
    promptSuggestion,
    reload,
    reviewProgress,
    rollbackLocalUserTurn,
    session,
    spawnLabel,
    stopLiveTurn,
  } = useEpitaxySessionData(initialSessionId);
  // Residual Qj J = expectedId && !meta — reactive isMetaPending for composer disabled.
  const codeBucket = useOfficialCodeSessionBucket(initialSessionId);
  // Residual Ga from pr() messageLimits — shared store also used by Code rate-limit path.
  const messageLimits = useSyncExternalStore(
    (onStoreChange) => coworkRateLimitStore.subscribe(onStoreChange),
    () => coworkRateLimitStore.getState().messageLimits,
    () => coworkRateLimitStore.getState().messageLimits,
  );
  /**
   * Residual Qj disabled on /code/:id shell:
   * Os = F?"active":Qt.isPending&&0===Ns?"spawning":"draft"
   * Product: create navigates away (LocalSessions.start) — never same-shell createPending/spawning.
   * Ns=0 always on existing shell. J = expectedId && !meta. Ga from messageLimits. xn N/A local-first.
   * error is residual banner W only — NOT invent Qj disabled lock.
   */
  const qjDisabled = residualQjDisabled({
    os: residualOs({
      hasSessionMeta: Boolean(session),
      createPending: false,
      createInFlightCount: 0,
    }),
    isMetaPending: Boolean(initialSessionId) && !session && codeBucket.isMetaPending,
    createInFlightCount: 0,
    rateLimitExceeded: residualGaFromMessageLimits(messageLimits),
    isRemoteUploading: false,
  });
  /**
   * Official vI `[E,P]=useState(()=>l??wr(a)?.agent)` — eI chip seed.
   * Official remounts vI when `o` changes (`Q=V.current`). Product keeps this
   * panel mounted A→B, so re-seed when persistKey changes. Falsy hides.
   */
  const persistAgentKeyRef = useRef(draftPersistKey);
  const [agent, setAgent] = useState(() =>
    officialAgentFromSearch(typeof window === "undefined" ? "" : window.location.search)
    ?? readComposerDraftAgent(draftPersistKey),
  );
  let liveAgent = agent;
  if (persistAgentKeyRef.current !== draftPersistKey) {
    persistAgentKeyRef.current = draftPersistKey;
    liveAgent =
      officialAgentFromSearch(typeof window === "undefined" ? "" : window.location.search)
      ?? readComposerDraftAgent(draftPersistKey);
    setAgent(liveAgent);
  }
  // Residual Ur / zr — this pane's Nr store (primary v1 or secondary v1.slot).
  const sidePaneStore = useOfficialSidePaneStoreApi();
  // Residual live tileLayout / sidePane / transcriptMode in Nr (not product useState flat sideTiles).
  const tileLayout = useOfficialSidePaneSessionStore((s) => s.tileLayout);
  const residualSidePane = useOfficialSidePaneSessionStore((s) => s.sidePane);
  const transcriptMode = useOfficialSidePaneSessionStore((s) => s.transcriptMode);
  const previewServerId = useOfficialSidePaneSessionStore((s) => s.previewServerId);
  const sideTiles = useMemo(() => residualOfficialViewPanes(tileLayout), [tileLayout]);
  const sideColumns = useMemo(() => residualSideColumns(tileLayout), [tileLayout]);
  const chatFlex = useMemo(() => residualChatFlex(tileLayout), [tileLayout]);
  // activeView ≡ residual sidePane focused kind (none → undefined).
  const activeView: OfficialViewPane | undefined =
    residualSidePane === "none" ? undefined : residualSidePane;
  // Residual Lr.fileView / subagentView live in Nr; product mirrors for render (previewTarget product-only).
  const hostedHydration = useMemo(() => readEpitaxyPopoutHydration(), []);
  const [fileView, setFileViewLocal] = useState<OfficialFileViewTarget | null>(() => hostedHydration?.fileView ?? null);
  const [fileTabs, setFileTabs] = useState<string[]>(() => hostedHydration?.fileTabs ?? []);
  const [previewTarget, setPreviewTarget] = useState<OfficialPreviewTarget | null>(null);
  useOfficialHtmlPreviewAutoOpen({
    enabled: isPanelActive,
    sessionCwd: session?.cwd,
    onOpen: ({ filePath, serverId }) => {
      // Official Wu: bindPreviewServer + setSidePane("preview") + addHtmlFile(filePath).
      setPreviewTarget({ path: filePath });
      sidePaneStore.getState().addHtmlFile(filePath);
      sidePaneStore.getState().bindPreviewServer(serverId);
      sidePaneStore.getState().setSidePane("preview");
    },
    sessionId: initialSessionId,
  });
  const [subagentView, setSubagentViewLocal] = useState<OfficialSubagentTarget | null>(null);
  const setFileView = useCallback((view: OfficialFileViewTarget | null) => {
    setFileViewLocal(view);
    sidePaneStore.getState().setFileView(view ?? undefined);
  }, [sidePaneStore]);
  const setSubagentView = useCallback((view: OfficialSubagentTarget | null) => {
    setSubagentViewLocal(view);
    sidePaneStore.getState().setSubagentView(view ?? undefined);
  }, [sidePaneStore]);
  const [sidePaneWidth, setSidePaneWidth] = useState<number | undefined>(undefined);
  const [popoutAlwaysOnTop, setPopoutAlwaysOnTop] = useState(false);
  const title = officialSessionHeaderTitle(session, initialSessionId);
  const effectiveSessionRef = sessionRef ?? (initialSessionId ? { id: initialSessionId, type: sessionType } : null);
  const bridge = desktopBridge.LocalSessions;
  const tasks = useMemo(() => parseOfficialTasks(messages), [messages]);
  const hasRunningTasks = useMemo(() => tasks.some((task) => task.status === "running"), [tasks]);
  const taskCount = tasks.length;
  const hasPlan = useMemo(() => {
    const plan = parseOfficialPlan(messages);
    return Boolean(plan.content);
  }, [messages]);
  // Official YR Screen: T && (A || u.has("framebuffer"))
  const framebufferPaneOpen = sideTiles.includes("framebuffer");
  const canOpenFramebuffer = useOfficialFramebufferMenuGate(session?.cwd, framebufferPaneOpen);
  // Official VC(): el("ccd_file_browser") && listSessionDirectory && fetchMentionOptions — ⇧⌘F.
  const canOpenBrowser = useOfficialFilesBrowserMenuGate();
  // Official p4 `A_`/`W`: Files overflow without ccd_file_browser.
  const canOpenFiles = officialTitlebarFilesAvailable(effectiveSessionRef?.type);
  // Residual setSidePane(e): if tile already present only focus; else ur() insert.
  const openSidePane = useCallback((view: OfficialViewPane) => {
    sidePaneStore.getState().setSidePane(view);
  }, [sidePaneStore]);
  const hostedPopoutPane = hostedHydration?.pane ?? readEpitaxyPopoutPane();
  useEffect(() => {
    if (!hostedPopoutPane) return;
    sidePaneStore.getState().setSidePane(hostedPopoutPane);
  }, [hostedPopoutPane, sidePaneStore]);
  useEffect(() => {
    if (!hostedPopoutPane) return;
    void desktopBridge.Window.getAlwaysOnTop?.().then((on) => {
      setPopoutAlwaysOnTop(on === true);
    });
  }, [hostedPopoutPane]);
  const dockPopoutToMain = useCallback(() => {
    void desktopBridge.Window.dockPopout?.();
  }, []);
  useEffect(() => {
    const subscribe = desktopBridge.Window.onEpitaxyPopoutDocked;
    if (!subscribe) return;
    return subscribe((entry) => {
      if (!entry.paneTileId) return;
      if (entry.sessionId && initialSessionId && entry.sessionId !== initialSessionId) return;
      if (hostedPopoutPane) return;
      const pane = entry.paneTileId as OfficialViewPane;
      sidePaneStore.getState().setSidePane(pane);
      if (pane === "file") {
        if (entry.fileView?.path) {
          setFileView({ ...entry.fileView, scrollNonce: Date.now() });
        }
        if (Array.isArray(entry.fileTabs) && entry.fileTabs.length > 0) {
          setFileTabs(entry.fileTabs);
        }
      }
    });
  }, [hostedPopoutPane, initialSessionId, setFileView, sidePaneStore]);
  const togglePopoutAlwaysOnTop = useCallback(() => {
    const next = !popoutAlwaysOnTop;
    setPopoutAlwaysOnTop(next);
    void desktopBridge.Window.setAlwaysOnTop?.(next)?.then((on) => {
      if (typeof on === "boolean") setPopoutAlwaysOnTop(on);
    });
  }, [popoutAlwaysOnTop]);
  useEffect(() => {
    const path = fileView?.path;
    if (!path) return;
    setFileTabs((current) => (current.includes(path) ? current : [...current, path]));
  }, [fileView?.path]);
  // Residual closeSidePane(e): Zs(tileLayout, e); clear sidePane if focused was that tile.
  const closeSidePane = useCallback((view: OfficialViewPane) => {
    sidePaneStore.getState().closeSidePane(view);
    if (view === "subagent") setSubagentView(null);
    if (view === "file") setFileView(null);
    if (view === "preview") {
      setPreviewTarget(null);
      // Residual unbind when closing preview tile so restore does not re-open dead pane.
      const sid = sidePaneStore.getState().previewServerId;
      if (sid) sidePaneStore.getState().unbindPreviewServer(sid);
    }
  }, [setFileView, setSubagentView, sidePaneStore]);
  const closeAllSidePanes = useCallback(() => {
    sidePaneStore.getState().closeAllSidePanes();
    setSubagentView(null);
    setFileView(null);
    setPreviewTarget(null);
    const sid = sidePaneStore.getState().previewServerId;
    if (sid) sidePaneStore.getState().unbindPreviewServer(sid);
  }, [setFileView, setSubagentView, sidePaneStore]);
  /** Official cccc `nT`: openPopout then closeSidePane. */
  const popOutSidePane = useCallback((view: OfficialViewPane) => {
    const sessionId = effectiveSessionRef?.id;
    const openPopout = desktopBridge.Window.openPopout;
    if (!sessionId) return;
    if (typeof openPopout !== "function") return;
    const tabs = fileView?.path && !fileTabs.includes(fileView.path)
      ? [...fileTabs, fileView.path]
      : fileTabs;
    void openPopout({
      type: "epitaxy-side-pane",
      sessionId,
      sessionType: effectiveSessionRef?.type,
      paneTileId: view,
      title: officialViewPanePopoutTitle(view, session),
      entryPoint: "header",
      fileTabs: view === "file" ? tabs : undefined,
      fileView: view === "file" && fileView ? fileView : undefined,
    }).then((opened) => {
      if (opened && !hostedPopoutPane) closeSidePane(view);
    });
  }, [closeSidePane, effectiveSessionRef, fileTabs, fileView, hostedPopoutPane, session]);
  const openPreview = useCallback((target: OfficialPreviewTarget) => {
    setPreviewTarget(target);
    openSidePane("preview");
  }, [openSidePane]);
  // Official AR: setSubagentView + setSidePane("subagent") — stacks under tasks when tasks already open (ur column).
  const openSubagent = useCallback((target: OfficialSubagentTarget) => {
    setSubagentView(target);
    openSidePane("subagent");
  }, [openSidePane, setSubagentView]);
  /** Stable poll callback for OfficialSubagentPane — must not be recreated each render. */
  const refreshSubagentTranscript = useCallback(() => {
    void reload({ silent: true });
  }, [reload]);
  const openTasks = useCallback(() => openSidePane("tasks"), [openSidePane]);
  // Official Wk onOpenPlan → qn("plan") / setSidePane("plan").
  const openPlan = useCallback(() => openSidePane("plan"), [openSidePane]);
  const runInTerminal = useCallback((command: string, runId?: string) => {
    if (!initialSessionId || !command) return;
    const ready = officialEpitaxyShellRunStore.getState().defaultTabReadySessionId === initialSessionId;
    if (runId) officialEpitaxyShellRunStore.getState().runInline(runId, initialSessionId, command);
    else officialEpitaxyShellRunStore.getState().queueCommand(initialSessionId, command);
    openSidePane("terminal");
    if (ready) {
      officialFlushPendingShellCommand(initialSessionId, (ptyKey, data) => {
        void bridge.writeShellPty?.(ptyKey, data);
      });
    }
  }, [bridge, initialSessionId, openSidePane]);
  const cancelInTerminal = useCallback(() => {
    if (!initialSessionId) return;
    const pending = officialEpitaxyShellRunStore.getState().pendingCommand;
    const alreadyFlushed = !(pending && pending.sessionId === initialSessionId);
    if (alreadyFlushed) {
      void bridge.writeShellPty?.(
        officialTerminalPtyKey(initialSessionId, OFFICIAL_DEFAULT_TERMINAL_TAB_ID),
        "",
      );
    }
    officialEpitaxyShellRunStore.getState().cancelInlineRun();
  }, [bridge, initialSessionId]);
  const openFile = useCallback((target: OfficialFileViewTarget) => {
    const local = effectiveSessionRef?.type !== "remote";
    const cwd = session?.cwd;
    if (/\.cast$/i.test(target.path) && initialSessionId && local) {
      const abs = officialTtHtmlPreviewAbsPath(target.path, cwd);
      runInTerminal(officialAsciinemaPlayCommand(abs));
      return;
    }
    // Official c119 `tt` `a`: local html/svg/pdf/mp4… → loadHtmlPreview + Preview; miss → File.
    if (local && isOfficialTtHtmlPreviewPath(target.path)) {
      const abs = officialTtHtmlPreviewAbsPath(target.path, cwd);
      const nonce = Date.now();
      void officialLoadHtmlPreview(abs).then(
        (loaded) => {
          if (!loaded) {
            setFileView({ ...target, path: abs, scrollNonce: nonce });
            openSidePane("file");
            return;
          }
          setPreviewTarget({ path: abs });
          sidePaneStore.getState().addHtmlFile(abs);
          if (typeof loaded === "string" && isOfficialHtmlPreviewServerId(loaded)) {
            sidePaneStore.getState().bindPreviewServer(loaded);
          }
          sidePaneStore.getState().setSidePane("preview");
        },
        () => {
          setFileView({ ...target, path: abs, scrollNonce: nonce });
          openSidePane("file");
        },
      );
      return;
    }
    setFileView({ ...target, scrollNonce: Date.now() });
    openSidePane("file");
  }, [effectiveSessionRef?.type, initialSessionId, openSidePane, runInTerminal, session?.cwd, setFileView, sidePaneStore]);
  const openDiff = useCallback(() => openSidePane("diff"), [openSidePane]);
  const transcriptRef = useRef<OfficialTranscriptHandle | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const composerAttachRef = useRef<((text: string) => void) | null>(null);
  const composerApiRef = useRef<OfficialComposerSurfaceApi | null>(null);
  /** Official Ek on the session column; Qj publishes handlers. */
  const dropHandlersRef = useRef<OfficialEpitaxyDropHandlers | null>(null);
  const [rewindPickerOpen, setRewindPickerOpen] = useState(false);
  const rewindDismissedAtRef = useRef(0);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [showBottomFade, setShowBottomFade] = useState(false);
  const updateTranscriptScrollState = useCallback((state: OfficialTranscriptScrollState) => {
    setShowScrollButton((current) => current === state.showScrollButton ? current : state.showScrollButton);
    setShowBottomFade((current) => current === state.showBottomFade ? current : state.showBottomFade);
  }, []);
  const scrollTranscriptToBottom = useCallback((behavior?: OfficialTranscriptScrollBehavior) => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollToBottom(behavior);
      return;
    }
    const node = transcriptScrollRef.current;
    if (node) scrollElementToBottom(node, behavior);
  }, []);
  // Residual Wa → tt.current?.scrollToEntry(e) for Qw jump when chapter node not mounted.
  const scrollTranscriptToEntry = useCallback((entryId: string) => {
    transcriptRef.current?.scrollToEntry(entryId);
  }, []);
  const attachAsContext = useCallback((text: string) => {
    composerApiRef.current?.attachAsContext(text)
      ?? composerAttachRef.current?.(text);
  }, []);
  const insertFileMention = useCallback((path: string) => {
    composerApiRef.current?.insertFileMention(path);
  }, []);
  const setComposerText = useCallback((text: string) => {
    composerApiRef.current?.setComposerText(text);
  }, []);
  /** Official rN `j` → requestComposerAction(submit?"submit":"focus"). */
  const requestComposerAction = useCallback((action: "focus" | "submit") => {
    if (action === "submit") {
      composerApiRef.current?.submit();
      return;
    }
    composerApiRef.current?.focus();
  }, []);
  // Official mc submitToChat — Preview Set up / start-failed residual (c11959232).
  const submitToChat = useCallback(
    async (text: string) => {
      if (!initialSessionId) {
        composerApiRef.current?.setComposerText(text)
          ?? composerAttachRef.current?.(text);
        return;
      }
      const messageUuid = createMessageUuid();
      // Official Gr onMutate → mutationFn → onError rollback (ca0135).
      const { wasMidTurn, uuid } = beginLocalUserTurn(text, messageUuid);
      scrollTranscriptToBottom();
      try {
        await sendMessageToSession(initialSessionId, text, { messageUuid: uuid });
      } catch {
        rollbackLocalUserTurn(uuid, wasMidTurn);
      }
    },
    [beginLocalUserTurn, initialSessionId, rollbackLocalUserTurn, scrollTranscriptToBottom],
  );
  /**
   * Official Preview Annotate → qy.push residual only.
   * Does NOT send a turn; ExistingSessionComposer drains pending into staged images.
   */
  const attachPreviewAnnotation = useCallback(
    (payload: { name: string; dataUrl: string; contextNote?: string }) => {
      if (!initialSessionId || !payload.dataUrl) return;
      previewAnnotationQueue.getState().push(initialSessionId, {
        name: payload.name || "preview-annotation.png",
        dataUrl: payload.dataUrl,
        contextNote: payload.contextNote,
      });
    },
    [initialSessionId],
  );
  const transcriptActionContext = useMemo(() => ({
    attachAsContext,
    attachPreviewAnnotation,
    insertFileMention,
    runInTerminal,
    cancelInTerminal,
    bridge,
    cancelQueuedMessage,
    isResponding,
    openFile,
    openPlan,
    openPreview,
    openSubagent,
    openTasks,
    onNavigate,
    reload,
    requestComposerAction,
    sessionId: initialSessionId,
    sessionRef: effectiveSessionRef,
    setComposerText,
    submitToChat,
  }), [
    attachAsContext,
    attachPreviewAnnotation,
    insertFileMention,
    runInTerminal,
    cancelInTerminal,
    bridge,
    cancelQueuedMessage,
    effectiveSessionRef,
    initialSessionId,
    isResponding,
    onNavigate,
    openFile,
    openPlan,
    openPreview,
    openSubagent,
    openTasks,
    reload,
    requestComposerAction,
    setComposerText,
    submitToChat,
  ]);
  // Residual toggleSidePane: Zs if present else ur insert.
  const selectView = useCallback((view: OfficialViewPane) => {
    const wasOpen = residualOfficialViewPanes(sidePaneStore.getState().tileLayout).includes(view);
    sidePaneStore.getState().toggleSidePane(view);
    if (wasOpen) {
      if (view === "subagent") setSubagentView(null);
      if (view === "file") setFileView(null);
      if (view === "preview") {
        setPreviewTarget(null);
        const sid = sidePaneStore.getState().previewServerId;
        if (sid) sidePaneStore.getState().unbindPreviewServer(sid);
      }
    }
  }, [setFileView, setSubagentView, sidePaneStore]);

  /**
   * Official onCycleTranscriptMode (c119): ladder fr/ld, skip summary when hideSummary.
   * Residual ca0135 setTranscriptMode also writes localStorage epitaxy.transcriptMode (kr).
   * Product header defaults hideSummary=false (summary item shown).
   */
  /** Residual ca0135 setTranscriptMode: persist epitaxy.transcriptMode for kr() default. */
  const applyTranscriptMode = useCallback((next: OfficialTranscriptMode) => {
    sidePaneStore.getState().setTranscriptMode(next);
  }, [sidePaneStore]);
  const cycleTranscriptMode = useCallback(() => {
    const current = sidePaneStore.getState().transcriptMode;
    sidePaneStore.getState().setTranscriptMode(cycleOfficialTranscriptMode(current));
  }, [sidePaneStore]);

  /**
   * Official closePane ⌘\ → closeLastPane residual:
   * close focused non-chat side tile (activeView), else last open side tile.
   * Does not invent multi-session paneStore close — that is header Close pane / Se path.
   */
  const closeLastSidePane = useCallback(() => {
    const tiles = residualOfficialViewPanes(sidePaneStore.getState().tileLayout);
    if (tiles.length === 0) return;
    const focused = sidePaneStore.getState().sidePane;
    const target =
      (focused !== "none" && tiles.includes(focused) ? focused : undefined)
      ?? tiles[tiles.length - 1];
    if (!target) return;
    closeSidePane(target);
  }, [closeSidePane, sidePaneStore]);

  /**
   * Official openRewindPicker **pa** (not ma): local + !responding + empty composer + 600ms
   * dismiss cooldown. Esc Esc chrome → openRewindPicker → pa. (ma force-opens from transcript UI.)
   */
  const canOpenRewindPicker =
    isPanelActive
    && Boolean(bridge.rewind)
    && !busy
    && (effectiveSessionRef?.type ?? "local") === "local";

  const openRewindPicker = useCallback(() => {
    if (!canOpenRewindPicker) return;
    if (Date.now() - rewindDismissedAtRef.current < 600) return;
    // Official pa: require empty composer for auto-open path.
    const composerText = composerApiRef.current?.getText()?.trim() ?? "";
    if (composerText.length > 0) return;
    setRewindPickerOpen(true);
  }, [canOpenRewindPicker]);

  const closeRewindPicker = useCallback(() => {
    rewindDismissedAtRef.current = Date.now();
    setRewindPickerOpen(false);
  }, []);

  const rewindTurns = useMemo(() => collectOfficialRewindTurns(entries), [entries]);

  const errors = useErrorsOptional();
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const sideChatText = useI18nText(SIDE_CHAT_MESSAGES);
  useOfficialPromptUrlSeed({
    addError: errors?.addError,
    enabled: isPanelActive,
    isComposerReady: () => composerApiRef.current !== null,
    sessionBound: Boolean(initialSessionId),
    setComposerText,
  });
  const onRewindPickerSelect = useCallback(
    async (uuid: string, text: string) => {
      // Official $a from DM pick: null → can't-rewind toast; else truncate+xt(prompt||text).
      if (!initialSessionId || !bridge.rewind) return;
      if ((effectiveSessionRef?.type ?? "local") !== "local") return;
      const prompt = await bridge.rewind(initialSessionId, uuid);
      if (prompt === null) {
        errors?.addError(sessionLoadText.cantRewindToThisMessage, {
          messageForLogging: "epitaxy-rewind-not-possible",
        });
        return;
      }
      await reload({ silent: true });
      const prefill =
        typeof prompt === "string" && prompt.length > 0 ? prompt : text;
      composerApiRef.current?.setComposerText(prefill);
    },
    [bridge, effectiveSessionRef?.type, errors, initialSessionId, reload, sessionLoadText.cantRewindToThisMessage],
  );

  // Official session lk + Esc Esc — only when this chat panel is the active primary.
  useEpitaxyViewShortcuts({
    canOpenBrowser: canOpenBrowser || canOpenFiles,
    enabled: isPanelActive,
    onClosePane: closeLastSidePane,
    onCycleTranscriptMode: cycleTranscriptMode,
    onRewind: canOpenRewindPicker ? openRewindPicker : undefined,
    onTogglePane: selectView,
    // Official dE: onToggleSideChat: a ? C : void 0 — primary local only.
    onToggleSideChat: isPanelActive
      ? () => {
          if (!effectiveSessionRef || effectiveSessionRef.type !== "local") {
            errors?.addError(sideChatText.sideChatLocalOnly, {
              messageForLogging: "epitaxy-side-chat-remote",
            });
            return;
          }
          officialSideChatStore.getState().toggle(effectiveSessionRef.id);
        }
      : undefined,
  });

  /**
   * Official side-pane Escape closer (c119 Yt): when side pane open and not blocked,
   * Escape closes last side tile. Composer busy Esc→stop still wins via preventDefault
   * on first Esc while responding; we skip when defaultPrevented.
   */
  useEffect(() => {
    if (!isPanelActive) return undefined;
    if (sideTiles.length === 0) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      // Leave busy-stop and permission cards alone when they already claimed Escape.
      if (busy) return;
      if (rewindPickerOpen) return;
      event.preventDefault();
      closeLastSidePane();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, closeLastSidePane, isPanelActive, rewindPickerOpen, sideTiles.length]);
  // Bridge OfficialCodeMarkdown / Hb inline path clicks (ob/db/Db) → file pane.
  useEffect(() => {
    const onOpenFile = (event: Event) => {
      const path = (event as CustomEvent<{ path?: string }>).detail?.path;
      if (!path) return;
      openFile({ path });
    };
    window.addEventListener("epitaxy-open-file", onOpenFile as EventListener);
    return () => window.removeEventListener("epitaxy-open-file", onOpenFile as EventListener);
  }, [openFile]);
  /**
   * Official c119 residual: File → Open File… (asar oEr → MenuEvents.openFile).
   * st = () => {
   *   if (E && E.type !== "remote") pickSessionFile(E.id).then(tt)
   *   else if (!E && je) pickFileAtCwd(je).then(tt)   // je = selectedFolder
   * }
   * tt → setFileView + side pane "file" (our openFile).
   * Only the active primary panel claims the menu binding.
   */
  useEffect(() => {
    if (!isPanelActive) return;
    const menuEvents = window["claude.web"]?.MenuEvents as
      | { onOpenFile?: (cb: () => void) => (() => void) | void; openFile?: (cb: () => void) => (() => void) | void }
      | undefined;
    if (!menuEvents?.onOpenFile && !menuEvents?.openFile) return;

    const pickAndOpen = () => {
      const ref = effectiveSessionRef;
      // Official: remote session has no pickSessionFile branch for menu open.
      if (ref?.type === "remote") return;

      if (ref) {
        if (!bridge.pickSessionFile) return;
        void bridge.pickSessionFile(ref.id).then((picked) => {
          if (picked) openFile({ path: picked });
        });
        return;
      }

      // Official !E && je: je is selectedFolder store. Prefer session.cwd, else workspace cwd.
      const folder = session?.cwd;
      if (folder) {
        if (!bridge.pickFileAtCwd) return;
        void bridge.pickFileAtCwd(folder).then((picked) => {
          if (picked) openFile({ path: picked });
        });
        return;
      }
      void desktopBridge.Preferences.getWorkspaceContext().then((workspace) => {
        const cwd = workspace?.cwd;
        if (!cwd || !bridge.pickFileAtCwd) return;
        void bridge.pickFileAtCwd(cwd).then((picked) => {
          if (picked) openFile({ path: picked });
        });
      });
    };

    const subscribe = menuEvents.onOpenFile ?? menuEvents.openFile;
    return subscribe?.(pickAndOpen) ?? undefined;
  }, [bridge, effectiveSessionRef, isPanelActive, openFile, session?.cwd]);
  // Official ab Play is vt.run → Grt.queueCommand + setSidePane("terminal") (runInTerminal).
  // Default-tab BR writes pendingCommand after onPtyReady.
  /**
   * Residual ca0135 Nr.reset(sessionId) — not invent hard-clear.
   * Live tileLayout/transcriptMode already in Nr; reset saves prev tree via xr, restore strip.
   * Unmount saveLive: residual Nr keeps live tileLayout; still upsert bySession for safety.
   * Multi-pane: each panel owns its own Nr (kI persistKey) — secondary never mutates primary.
   */
  useEffect(() => {
    const restored = sidePaneStore.getState().reset(initialSessionId);
    // Residual same-session keeps Lr.fileView/subagentView; cross-session Lr clears → undefined.
    // Official c563 `at`: reset then c73 `Ns`/`Oe` with XO payload (empty popout clears persisted fileView).
    const applyPopoutHydration = () => {
      if (!hostedHydration) return;
      setFileViewLocal(hostedHydration.fileView);
      setFileTabs(hostedHydration.fileTabs);
      sidePaneStore.getState().setFileView(hostedHydration.fileView ?? undefined);
    };
    if (hostedHydration) applyPopoutHydration();
    else {
      setFileViewLocal(restored.fileView ?? null);
      setFileTabs([]);
    }
    setSubagentViewLocal(restored.subagentView ?? null);
    // Product-only previewTarget (not residual Lr field) — clear when preview tile not restored.
    if (!restored.sideTiles.includes("preview")) setPreviewTarget(null);
    const persistApi = (
      sidePaneStore as {
        persist?: { onFinishHydration?: (cb: () => void) => () => void };
      }
    ).persist;
    const unsubHydration = hostedHydration
      ? persistApi?.onFinishHydration?.(applyPopoutHydration)
      : undefined;
    return () => {
      unsubHydration?.();
      sidePaneStore.getState().saveLive(initialSessionId);
    };
  }, [hostedHydration, initialSessionId, sidePaneStore]);
  // Official R (c119 Ka): parent only mirrors onScrollState from Gb.
  // showBottomFade/showScrollButton false comes solely from Xb unmount cleanup
  // (empty/loading branch). No invent parent effect on sessionId/entries.
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!initialSessionId) return;
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const isMac = /Mac|iPhone|iPad|iPod/.test(window.navigator.platform);
      const primaryPressed = isMac ? event.metaKey : event.ctrlKey;
      const secondaryPressed = isMac ? event.ctrlKey : event.metaKey;
      if (!primaryPressed || secondaryPressed || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tagName = target.tagName;
        if (tagName === "INPUT" || tagName === "TEXTAREA" || target.isContentEditable) return;
      }
      const node = transcriptScrollRef.current;
      if (!node) return;
      event.preventDefault();
      event.stopPropagation();
      if (event.key === "ArrowDown") {
        scrollTranscriptToBottom();
      } else {
        node.scrollTop = 0;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [initialSessionId, scrollTranscriptToBottom]);

  const chatBody = (
    <>
      {!initialSessionId && landingActions ? <div className="relative"><div className="epitaxy-chat-column epitaxy-chat-size pointer-events-none absolute inset-x-0 top-[12px] flex justify-end"><div className="pointer-events-auto">{landingActions}</div></div></div> : null}
      <div className="contents">
        <div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]">
          <div aria-hidden="true" className="epitaxy-top-scrim" />
          <div aria-hidden="true" className="epitaxy-bottom-scrim" style={{ opacity: showBottomFade ? 1 : 0 }} />
          {/* Residual !Vn && Qw — chapter left rail; omit on summary (yC). scrollKey = Gn. */}
          {transcriptMode !== "summary" && initialSessionId ? (
            <OfficialChapterToc
              sessionId={initialSessionId}
              entries={entries}
              scrollRef={transcriptScrollRef}
              scrollKey={`${initialSessionId}:${transcriptMode}`}
              scrollToEntry={scrollTranscriptToEntry}
            />
          ) : null}
          <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
            {/* Residual c119 shell order after Ja/li:
                  oi? init chrome (Mx remote | TM ultrareview | Gv)
                  : Vn && F ? yC
                  : Xb
                Residual (c11959232):
                  ri = null!==we || (O?.tags?.includes("ultrareview")??false)
                  oi = ri || (0===Ya.length && void 0!==ii)
                  li = 0===Ya.length && !oi && !H && "spawning"!==Os
                Local path: no ye/ii Mx (云端不要) → oi collapses to ri.
                we/tag always mounts oi (incl. completed we) — no invent completed→Xb,
                no invent tag+entries→Xb (prior product delta deleted).
                Vn→yC and oi mounted here (not OfficialTranscript) to keep shells co-located. */}
            {(() => {
              const shellReady = Boolean(initialSessionId)
                && !isSessionNotFound
                && !(error && entries.length === 0)
                && !isLoading;
              // Residual ri / oi (local, no ii):
              //   ri = we!=null || tags ultrareview
              //   oi = ri
              const residualRi = reviewProgress != null || isUltrareviewTagged;
              const residualOi = shellReady && residualRi;
              // Residual li = empty && !oi && !H && spawning!==Os — tile uses this for
              // summary gate only; Xb empty "No messages yet." stays in renderTranscriptBody.
              const canPaintTranscriptBody = shellReady
                && !(entries.length === 0 && !isResponding && !residualOi);
              if (residualOi && initialSessionId) {
                // Residual ui / pi for TM + Gv inside oi:
                //   di = running we && isConnected; ui = H || isRunning || di || !ii?.isDone
                //   pi = !isConnected && running we && ii?.isDone
                // Local: no isConnected/ii — map isRunning + isResponding; stopped = !running && we running.
                const weRunning = reviewProgress?.status === "running";
                const sessionWorking = isResponding
                  || Boolean(session?.isRunning)
                  || weRunning;
                const isStopped = weRunning
                  && !Boolean(session?.isRunning)
                  && !isResponding;
                return (
                  <div
                    key={`${initialSessionId}:oi`}
                    ref={(node) => {
                      transcriptScrollRef.current = node;
                    }}
                    className="h-full overflow-y-auto overflow-x-hidden [contain:strict]"
                  >
                    <div className="epitaxy-chat-column epitaxy-chat-size flex flex-col gap-[var(--chat-turn-gap)] pt-[48px] pb-[32px]">
                      {reviewProgress ? (
                        <OfficialUltrareviewProgress
                          progress={reviewProgress}
                          isSessionWorking={sessionWorking}
                          isStopped={isStopped}
                        />
                      ) : null}
                      {/* Residual oi Gv: sessionId + isWorking only — no spawnLabel (c119 ~1163334).
                          Xb path still passes spawnLabel (bs / Starting session…). */}
                      <OfficialWorkingStatus
                        isWorking={sessionWorking && (!reviewProgress || reviewProgress.status === "running")}
                        sessionId={initialSessionId}
                        tasks={tasks}
                      />
                    </div>
                  </div>
                );
              }
              if (
                transcriptMode === "summary"
                && effectiveSessionRef
                && canPaintTranscriptBody
              ) {
                return (
                  <div
                    key={`${initialSessionId}:${transcriptMode}`}
                    ref={(node) => {
                      transcriptScrollRef.current = node;
                    }}
                    className="h-full overflow-y-auto overflow-x-hidden [contain:strict]"
                  >
                    <div className="epitaxy-chat-column epitaxy-chat-size h-full flex flex-col pt-[48px] pb-[32px]">
                      <OfficialSummaryTranscriptBody
                        entries={entries}
                        isResponding={busy}
                        sessionRef={effectiveSessionRef}
                        tasks={tasks}
                      />
                    </div>
                  </div>
                );
              }
              return renderTranscriptBody({
                entries,
                error,
                initialSessionId,
                isLoading,
                isResponding,
                isSessionNotFound,
                landingBody,
                onNavigate,
                onScrollState: updateTranscriptScrollState,
                ref: transcriptRef,
                reload,
                scrollRef: transcriptScrollRef,
                session,
                sessionType,
                spawnLabel,
                tasks,
                transcriptMode,
              });
            })()}
          </EpitaxyTranscriptActionContext.Provider>
        </div>
        {!hideComposer && initialSessionId && !isSessionNotFound ? (
          <>
          {error ? (
            <div className="epitaxy-chat-column epitaxy-chat-size shrink-0 pb-g3">
              <OfficialCodeSessionErrorBanner
                errorCategory={errorCategory}
                errorMessage={error.message}
                // Official W&&!xn?vi — product maps retry to clearError+reload (FM Try again).
                onRetry={reload ? () => void reload() : undefined}
                sessionId={initialSessionId}
              />
            </div>
          ) : null}
          <ExistingSessionComposer
            agent={liveAgent}
            attachRef={composerAttachRef}
            bridge={bridge}
            queuedEntries={queuedEntries}
            onCancelQueued={cancelQueuedMessage}
            onReorderQueued={reorderQueuedMessage}
            onSteerQueued={steerQueuedMessage}
            onEditQueued={(entryId) => {
              const entry = queuedEntries.find((row) => row.id === entryId);
              const preview = entry
                ? entry.items
                    .map((item) => {
                      if (item.kind === "text") return item.text;
                      if (item.kind === "bash" && item.command) return `! ${item.command}`;
                      return "";
                    })
                    .filter(Boolean)
                    .join(" ")
                    .replace(/\s+/g, " ")
                    .trim()
                : "";
              cancelQueuedMessage(entryId);
              if (preview) setComposerText(preview);
            }}
            composerApiRef={composerApiRef}
            dropHandlersRef={dropHandlersRef}
            // Residual Qj disabled via residualQjDisabled (Os/J/Ns/Ga/xn). See qjDisabled above.
            // Error stays banner-only (W); not folded into disabled.
            disabled={qjDisabled}
            isPanelActive={isPanelActive}
            isResponding={busy}
            promptSuggestion={promptSuggestion}
            onOpenDiff={openDiff}
            persistKey={draftPersistKey}
            onOpenPlan={openPlan}
            onPermissionModeChange={async (mode) => {
              // Official Wk onModeChange after plan Accept — host Mode pill + CLI set_permission_mode.
              // Same residual as composer: if host returns null (active-turn control fail), do not keep optimistic mode.
              if (!effectiveSessionRef) return;
              const bucket = officialCodeSessionStore.getState().buckets[effectiveSessionRef.id];
              const previousMode =
                bucket?.session?.permissionMode
                ?? bucket?.liveMeta?.permissionMode
                ?? session?.permissionMode
                ?? "default";
              if (previousMode === mode) {
                officialCodeSessionStore.getState().mergeLiveMeta(effectiveSessionRef.id, { permissionMode: mode });
                return;
              }
              officialCodeSessionStore.getState().mergeLiveMeta(effectiveSessionRef.id, { permissionMode: mode });
              try {
                const result = await bridge.setPermissionMode?.(effectiveSessionRef.id, mode);
                if (result == null) {
                  officialCodeSessionStore.getState().mergeLiveMeta(effectiveSessionRef.id, {
                    permissionMode: previousMode,
                  });
                  return;
                }
                // Official jn: folder map + landing sticky so draft home keeps Mode.
                setDraftPermissionMode(mode as PermissionMode, {
                  cwd: session?.cwd,
                });
              } catch {
                officialCodeSessionStore.getState().mergeLiveMeta(effectiveSessionRef.id, {
                  permissionMode: previousMode,
                });
              }
            }}
            onStop={stopLiveTurn}
            onSubmit={async (text, input) => {
              // Official Gr (ca0135): onMutate noteQueuedSend+beginPendingTurn; local Hb via CLI echo `d`.
              // Stable uuid ties cancelQueued / CLI echo (cd5a31703 zke).
              const messageUuid = input?.messageUuid ?? createMessageUuid();
              const { wasMidTurn, uuid } = beginLocalUserTurn(text, messageUuid);
              scrollTranscriptToBottom();
              try {
                await sendMessageToSession(initialSessionId, text, { ...input, messageUuid: uuid });
              } catch {
                // Official Gr.onError: mid-turn dropQueued(+clearPending if empty); else clearPendingTurn.
                rollbackLocalUserTurn(uuid, wasMidTurn);
              }
            }}
            reload={reload}
            session={session}
            sessionRef={effectiveSessionRef}
            showScrollButton={showScrollButton}
            onScrollToBottom={() => scrollTranscriptToBottom("smooth")}
          />
          </>
        ) : null}
      </div>
    </>
  );

  // Official kI wraps session with `sg` (PierreWorkerPool) so Diff/File Zd mounts with a warm pool.
  // Residual ur (ca0135): first open beside chat → Xs({direction:"row", children:[["chat",2], side]}).
  // Second side open under existing side tile → column stack (tasks above, subagent below).
  // Third when last root child is stack → Js new side column (residualSideColumns).
  // c119 YI: flexGrow from tile.flex, flexShrink:1, flexBasis:0, minWidth:minTilePx(100).
  const hasSidePanes = sideTiles.length > 0;
  const chatTileStyle = useMemo<CSSProperties>(() => {
    if (!hasSidePanes) return { height: "100%", minWidth: 0, flex: "1 1 0" };
    if (sidePaneWidth !== undefined) {
      // After user resize: chat takes remaining space (official live flexGrow update on drag).
      return { height: "100%", minWidth: sidePaneMinWidth, flex: "1 1 0" };
    }
    return {
      height: "100%",
      minWidth: sidePaneMinWidth,
      flexGrow: chatFlex || chatDefaultFlex,
      flexShrink: 1,
      flexBasis: 0,
    };
  }, [chatFlex, hasSidePanes, sidePaneWidth]);

  // Official iE row stack: gap from nE.gap (12). Side tile FI uses DI + Nn sidebar elevation.
  // Chat tile also sits in the same padded container (EpitaxyTileLayout padding:8) so elevated rings show.
  // Pierre pool (`sg`) is provided by EpitaxyFramePage / outer shell (official kI), not here.
  // Official vI (c11959232) return is jsxs(Ek) filling iE isolate. KI stack wrap
  // (relative h-full min-w-0 flex + nE.gap=12) only when a side column exists.
  // Product: keep the KI wrap always so opening Tasks/Files does not remount Ek/Fu
  // (ternary `hasSidePanes ? wrap : chatColumn` unmounted the transcript → flash).
  const chatColumn = (
    <OfficialEpitaxyDropZone
      className="h-full min-w-0 flex flex-col"
      tileHost="chat"
      onFilesDropped={(files) => dropHandlersRef.current?.onFilesDropped(files)}
      onFolderDropped={(folders) => dropHandlersRef.current?.onFolderDropped(folders)}
      onNonImageFilesDropped={(files) => dropHandlersRef.current?.onNonImageFilesDropped(files)}
      style={chatTileStyle}
    >
      <EpitaxyChatHeader
        activeView={activeView}
        agent={liveAgent}
        canOpenFiles={canOpenFiles}
        canOpenFramebuffer={canOpenFramebuffer}
        canOpenRuns={sessionHasOfficialRuns(session, effectiveSessionRef)}
        dragHandle={dragHandle}
        hasPlan={hasPlan}
        hasRunningTasks={hasRunningTasks}
        isTitleLoading={isLoading && !session}
        isTopLeft={isTopLeft}
        onSessionRemoved={onSessionRemoved}
        onTranscriptModeChange={applyTranscriptMode}
        onViewSelect={selectView}
        openViews={sideTiles}
        paneIndex={paneIndex}
        previewServerId={previewServerId}
        session={session}
        sessionRef={effectiveSessionRef}
        taskCount={taskCount}
        title={title}
        transcriptMode={transcriptMode}
      />
      {chatBody}
    </OfficialEpitaxyDropZone>
  );
  return (
    <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
      <div
        className="relative h-full min-w-0 flex"
        style={{ gap: hostedPopoutPane || hasSidePanes ? (hostedPopoutPane ? 0 : 12) : 0 }}
      >
        {hostedPopoutPane ? null : chatColumn}
        {hostedPopoutPane && sideTiles.length === 0 ? (
            <EpitaxySidePaneColumn
              key="popout-host"
              fileView={fileView}
              flex={1}
              isTopLeft
              messages={messages}
              onCloseAll={() => { void desktopBridge.Window.close(); }}
              onCloseTile={() => { void desktopBridge.Window.close(); }}
              onFileViewChange={setFileView}
              onDock={dockPopoutToMain}
              popoutAlwaysOnTop={popoutAlwaysOnTop}
              onTogglePopoutAlwaysOnTop={togglePopoutAlwaysOnTop}
              hideCloseButton
              fileTabs={fileTabs}
              onFileTabsChange={setFileTabs}
              onSidePaneWidthChange={setSidePaneWidth}
              previewTarget={previewTarget}
              renderSubagent={(view) => (
                <OfficialSubagentPane
                  messages={messages}
                  onRefreshTranscript={refreshSubagentTranscript}
                  subagentView={view}
                />
              )}
              session={session}
              sessionRef={effectiveSessionRef}
              sideTiles={[hostedPopoutPane]}
              subagentView={subagentView}
            />
        ) : null}
        {sideColumns.map((column, columnIndex) => {
          // Residual column tiles → OfficialViewPane ids (product supports these kinds only).
          const renderTiles = column.tiles.filter((id): id is OfficialViewPane =>
            (sideTiles as string[]).includes(id),
          );
          if (renderTiles.length === 0) return null;
          return (
            <EpitaxySidePaneColumn
              key={`side-col-${columnIndex}-${renderTiles.join("|")}`}
              fileView={fileView}
              flex={hostedPopoutPane ? 1 : column.flex}
              isTopLeft={(hostedPopoutPane || isTopLeft) && columnIndex === 0}
              messages={messages}
              onCloseAll={hostedPopoutPane ? () => { void desktopBridge.Window.close(); } : closeAllSidePanes}
              onCloseTile={hostedPopoutPane ? () => { void desktopBridge.Window.close(); } : closeSidePane}
              onFileViewChange={setFileView}
              onPopOut={hostedPopoutPane ? undefined : popOutSidePane}
              onDock={hostedPopoutPane ? dockPopoutToMain : undefined}
              popoutAlwaysOnTop={hostedPopoutPane ? popoutAlwaysOnTop : undefined}
              onTogglePopoutAlwaysOnTop={hostedPopoutPane ? togglePopoutAlwaysOnTop : undefined}
              showExpand={!hostedPopoutPane}
              hideCloseButton={Boolean(hostedPopoutPane)}
              fileTabs={fileTabs}
              onFileTabsChange={setFileTabs}
              onSidePaneWidthChange={setSidePaneWidth}
              previewTarget={previewTarget}
              renderSubagent={(view) => (
                <OfficialSubagentPane
                  messages={messages}
                  onRefreshTranscript={refreshSubagentTranscript}
                  subagentView={view}
                />
              )}
              session={session}
              sessionRef={effectiveSessionRef}
              // First residual side column keeps product resize width; extra columns use residual flex.
              sidePaneWidth={hostedPopoutPane ? undefined : columnIndex === 0 ? sidePaneWidth : undefined}
              sideTiles={renderTiles}
              subagentView={subagentView}
            />
          );
        })}
      </div>
      {/* Official DM rewind picker — Esc Esc / openRewindPicker residual. */}
      <OfficialRewindPicker
        isOpen={rewindPickerOpen}
        onClose={closeRewindPicker}
        onSelect={(uuid, text) => {
          void onRewindPickerSelect(uuid, text);
        }}
        turns={rewindTurns}
      />
    </EpitaxyTranscriptActionContext.Provider>
  );
}

