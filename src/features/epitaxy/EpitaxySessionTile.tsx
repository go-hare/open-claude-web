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
import { setDraftPermissionMode } from "./codeDraftComposerStore";
import type { PermissionMode } from "../../adapters/desktopBridge";
import {
  useOfficialFilesBrowserMenuGate,
} from "./session/OfficialFilesBrowserPane";
import { useOfficialFramebufferMenuGate } from "./session/OfficialFramebufferPane";
import { sessionHasOfficialRuns } from "./session/OfficialRunsPane";
import { type OfficialFileViewTarget as OfficialFileViewTargetImported } from "./session/OfficialFilePane";
import { type OfficialPreviewTarget as OfficialPreviewTargetImported } from "./session/OfficialPreviewPane";
import { EpitaxySidePaneColumn, chatDefaultFlex, defaultTerminalTabId, sidePaneMinWidth, terminalPtyKey } from "./session/EpitaxySidePanes";
import {
  EpitaxyTranscriptActionContext,
  type EpitaxySessionType,
  type EpitaxySessionRef as EpitaxySessionRefImported,
  type OfficialSubagentTarget,
} from "./session/epitaxyTranscriptActionContext";
import {
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
  ExistingSessionComposer,
  type OfficialComposerSurfaceApi,
} from "./session/OfficialExistingSessionComposer";
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
  const sessionRef = useMemo(() => activeSessionId ? { id: activeSessionId, type: sessionType } : null, [activeSessionId, sessionType]);

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
    <OfficialChatTileShell>
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
    <OfficialSidePaneStoreProvider persistKey={EPITAXY_SIDE_PANE_PERSIST_KEY}>
      <div className="epitaxy-root select-none h-full w-full flex flex-col">
        <div className="flex-1 min-h-0">
          <EpitaxyTileLayout>{renderChatTile(undefined, true)}</EpitaxyTileLayout>
        </div>
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
    <OfficialChatTileShell>
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

  return (
    <OfficialSidePaneStoreProvider persistKey={sidePanePersistKey}>
      <div className="epitaxy-root select-none flex-1 min-h-0 flex flex-col overflow-hidden">
        <EpitaxyTileLayout>{renderChatTile()}</EpitaxyTileLayout>
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
    entries,
    error,
    errorCategory,
    isLoading,
    isResponding,
    isSessionNotFound,
    isUltrareviewTagged,
    messages,
    reload,
    reviewProgress,
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
  // Residual Ur / zr — this pane's Nr store (primary v1 or secondary v1.slot).
  const sidePaneStore = useOfficialSidePaneStoreApi();
  // Residual live tileLayout / sidePane / transcriptMode in Nr (not product useState flat sideTiles).
  const tileLayout = useOfficialSidePaneSessionStore((s) => s.tileLayout);
  const residualSidePane = useOfficialSidePaneSessionStore((s) => s.sidePane);
  const transcriptMode = useOfficialSidePaneSessionStore((s) => s.transcriptMode);
  const sideTiles = useMemo(() => residualOfficialViewPanes(tileLayout), [tileLayout]);
  const sideColumns = useMemo(() => residualSideColumns(tileLayout), [tileLayout]);
  const chatFlex = useMemo(() => residualChatFlex(tileLayout), [tileLayout]);
  // activeView ≡ residual sidePane focused kind (none → undefined).
  const activeView: OfficialViewPane | undefined =
    residualSidePane === "none" ? undefined : residualSidePane;
  // Residual Lr.fileView / subagentView live in Nr; product mirrors for render (previewTarget product-only).
  const [fileView, setFileViewLocal] = useState<OfficialFileViewTarget | null>(null);
  const [previewTarget, setPreviewTarget] = useState<OfficialPreviewTarget | null>(null);
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
  const title = officialSessionHeaderTitle(session, initialSessionId);
  const effectiveSessionRef = sessionRef ?? (initialSessionId ? { id: initialSessionId, type: sessionType } : null);
  const bridge = desktopBridge.LocalSessions;
  const tasks = useMemo(() => parseOfficialTasks(messages), [messages]);
  const hasRunningTasks = useMemo(() => tasks.some((task) => task.status === "running"), [tasks]);
  // Official YR Screen: T && (A || u.has("framebuffer"))
  const framebufferPaneOpen = sideTiles.includes("framebuffer");
  const canOpenFramebuffer = useOfficialFramebufferMenuGate(session?.cwd, framebufferPaneOpen);
  // Official VC(): el("ccd_file_browser") && listSessionDirectory && fetchMentionOptions
  const canOpenBrowser = useOfficialFilesBrowserMenuGate();
  // Residual setSidePane(e): if tile already present only focus; else ur() insert.
  const openSidePane = useCallback((view: OfficialViewPane) => {
    sidePaneStore.getState().setSidePane(view);
  }, [sidePaneStore]);
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
  const openFile = useCallback((target: OfficialFileViewTarget) => {
    setFileView({ ...target, scrollNonce: Date.now() });
    openSidePane("file");
  }, [openSidePane, setFileView]);
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
  const openDiff = useCallback(() => openSidePane("diff"), [openSidePane]);
  const transcriptRef = useRef<OfficialTranscriptHandle | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const composerAttachRef = useRef<((text: string) => void) | null>(null);
  const composerApiRef = useRef<OfficialComposerSurfaceApi | null>(null);
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
  const setComposerText = useCallback((text: string) => {
    composerApiRef.current?.setComposerText(text);
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
      beginLocalUserTurn(text, messageUuid);
      scrollTranscriptToBottom();
      await sendMessageToSession(initialSessionId, text, { messageUuid });
    },
    [beginLocalUserTurn, initialSessionId, scrollTranscriptToBottom],
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
    sessionId: initialSessionId,
    sessionRef: effectiveSessionRef,
    setComposerText,
    submitToChat,
  }), [
    attachAsContext,
    attachPreviewAnnotation,
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
    && !isResponding
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
  const onRewindPickerSelect = useCallback(
    async (uuid: string, text: string) => {
      // Official $a from DM pick: null → can't-rewind toast; else truncate+xt(prompt||text).
      if (!initialSessionId || !bridge.rewind) return;
      if ((effectiveSessionRef?.type ?? "local") !== "local") return;
      const prompt = await bridge.rewind(initialSessionId, uuid);
      if (prompt === null) {
        errors?.addError("Can't rewind to this message.", {
          messageForLogging: "epitaxy-rewind-not-possible",
        });
        return;
      }
      await reload({ silent: true });
      const prefill =
        typeof prompt === "string" && prompt.length > 0 ? prompt : text;
      composerApiRef.current?.setComposerText(prefill);
    },
    [bridge, effectiveSessionRef?.type, errors, initialSessionId, reload],
  );

  // Official session lk + Esc Esc — only when this chat panel is the active primary.
  useEpitaxyViewShortcuts({
    canOpenBrowser,
    enabled: isPanelActive,
    onClosePane: closeLastSidePane,
    onCycleTranscriptMode: cycleTranscriptMode,
    onRewind: canOpenRewindPicker ? openRewindPicker : undefined,
    onTogglePane: selectView,
    // toggleSideChat omitted — honest wall (no Side chat product path).
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
      if (isResponding) return;
      if (rewindPickerOpen) return;
      event.preventDefault();
      closeLastSidePane();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeLastSidePane, isPanelActive, isResponding, rewindPickerOpen, sideTiles.length]);
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
  // Official ab Play: open terminal pane and write command into default shell PTY.
  useEffect(() => {
    const onRunInline = (event: Event) => {
      const command = (event as CustomEvent<{ command?: string }>).detail?.command;
      if (!command || !initialSessionId) return;
      openSidePane("terminal");
      const ptyKey = terminalPtyKey(initialSessionId, defaultTerminalTabId);
      void (async () => {
        try {
          // Ensure PTY exists; OfficialShellPtyPane will also start/fit when mounted.
          await bridge.startShellPty?.(ptyKey);
          await bridge.writeShellPty?.(ptyKey, `${command}\n`);
        } catch {
          // Ignore run failures; user can retry from terminal.
        }
      })();
    };
    window.addEventListener("epitaxy-run-inline", onRunInline as EventListener);
    return () => window.removeEventListener("epitaxy-run-inline", onRunInline as EventListener);
  }, [bridge, initialSessionId, openSidePane]);
  /**
   * Residual ca0135 Nr.reset(sessionId) — not invent hard-clear.
   * Live tileLayout/transcriptMode already in Nr; reset saves prev tree via xr, restore strip.
   * Unmount saveLive: residual Nr keeps live tileLayout; still upsert bySession for safety.
   * Multi-pane: each panel owns its own Nr (kI persistKey) — secondary never mutates primary.
   */
  useEffect(() => {
    const restored = sidePaneStore.getState().reset(initialSessionId);
    // Residual same-session keeps Lr.fileView/subagentView; cross-session Lr clears → undefined.
    // Mirror store result into local React state (do not invent hard-clear).
    setFileViewLocal(restored.fileView ?? null);
    setSubagentViewLocal(restored.subagentView ?? null);
    // Product-only previewTarget (not residual Lr field) — clear when preview tile not restored.
    if (!restored.sideTiles.includes("preview")) setPreviewTarget(null);
    return () => {
      sidePaneStore.getState().saveLive(initialSessionId);
    };
  }, [initialSessionId, sidePaneStore]);
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
                        isResponding={isResponding}
                        sessionRef={effectiveSessionRef}
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
            // Remount per session so Mode/model useState seed runs with openSession meta
            // (official be(n.permissionMode) first paint — no invent default flash).
            key={initialSessionId}
            attachRef={composerAttachRef}
            bridge={bridge}
            composerApiRef={composerApiRef}
            // Residual Qj disabled via residualQjDisabled (Os/J/Ns/Ga/xn). See qjDisabled above.
            // Error stays banner-only (W); not folded into disabled.
            disabled={qjDisabled}
            isResponding={isResponding}
            onOpenDiff={openDiff}
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
              // Official Gr onMutate: noteQueuedSend + beginPendingTurn (or queue when mid-turn).
              // Stable uuid ties optimistic row / cancelQueued / CLI echo (index-BELzQL5P zke).
              const messageUuid = input?.messageUuid ?? createMessageUuid();
              beginLocalUserTurn(text, messageUuid);
              // Official keeps pin and sticks to bottom on send (scrollHeight).
              scrollTranscriptToBottom();
              await sendMessageToSession(initialSessionId, text, { ...input, messageUuid });
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
  return (
    <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
      {/* Official stack gap nE.gap=12 between chat tile and side column(s). */}
      <div className="relative h-full min-w-0 flex" style={{ gap: hasSidePanes ? 12 : 0 }}>
        {/* Chat shell matches iE: h-full w-full min-w-0 relative isolate rounded-r6 + Nn sidebar elevation.
            Official c119 iE: Nn(elevation:"sidebar") is opacity-0 until .tiles-dragging — ring is NOT always on.
            data-official-source: ion-dist c11959232 iE + Nn / k_e */}
        <div className="relative min-w-0 h-full flex flex-col rounded-r6 isolate" style={chatTileStyle}>
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated opacity-0 transition-opacity duration-200 [.tiles-dragging_&]:opacity-100"
            data-surface="sidebar"
          />
          <EpitaxyChatHeader
            activeView={activeView}
            canOpenBrowser={canOpenBrowser}
            canOpenFramebuffer={canOpenFramebuffer}
            canOpenRuns={sessionHasOfficialRuns(session, effectiveSessionRef)}
            dragHandle={dragHandle}
            hasRunningTasks={hasRunningTasks}
            isTitleLoading={isLoading && !session}
            isTopLeft={isTopLeft}
            onSessionRemoved={onSessionRemoved}
            onTranscriptModeChange={applyTranscriptMode}
            onViewSelect={selectView}
            openViews={sideTiles}
            paneIndex={paneIndex}
            session={session}
            sessionRef={effectiveSessionRef}
            title={title}
            transcriptMode={transcriptMode}
          />
          {chatBody}
        </div>
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
              isTopLeft={isTopLeft && columnIndex === 0}
              messages={messages}
              onCloseAll={closeAllSidePanes}
              onCloseTile={closeSidePane}
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
              sidePaneWidth={columnIndex === 0 ? sidePaneWidth : undefined}
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

