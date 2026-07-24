import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";
import type { ChatMessage } from "../../adapters/desktopBridge/types";
import { sessionHomePath } from "../../shell/sessionPaths";
import type { PaneSlot } from "../../stores/paneStore";
import { EpitaxyTileLayout } from "./EpitaxyFrameSurface";
import {
  OfficialChatTileShell,
  type OfficialTranscriptMode,
  type OfficialViewPane,
} from "./OfficialEpitaxyComponents";
import { OfficialPierreWorkerPool } from "./diff/OfficialPierreWorkerPool";
import "./diff/ensurePierreDiffsContainer";
import { createMessageUuid } from "../../adapters/desktopBridge/messageUuid";
import {
  officialCodeSessionStore,
} from "./session/officialCodeSessionStore";
import {
  canUseOfficialFilesBrowser,
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
import {
  loadOfficialThinkingSparkAnimation,
  renderTranscriptBody,
  scrollElementToBottom,
  type OfficialTranscriptHandle,
  type OfficialTranscriptScrollBehavior,
  type OfficialTranscriptScrollState,
} from "./session/OfficialTranscript";
import {
  EpitaxyChatHeader,
  OfficialSubagentPane,
  officialSessionHeaderTitle,
  useEpitaxyViewShortcuts,
} from "./session/EpitaxyChatChrome";
import { ExistingSessionComposer } from "./session/OfficialExistingSessionComposer";

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

  useEffect(() => {
    void loadOfficialThinkingSparkAnimation();
  }, []);
  const sessionRef = useMemo(() => activeSessionId ? { id: activeSessionId, type: sessionType } : null, [activeSessionId, sessionType]);

  useFocusedSession(activeSessionId);

  // Official tile layout (c11959232 KI/YI): topLeftId marks the primary pane tile isTopLeft.
  // EpitaxyFramePage is always the dframe-pane-primary chat tile, so isTopLeft must be true.
  // Official CSS then applies:
  //   .dframe-root[data-collapsed] .dframe-pane-primary .epitaxy-root [data-top-left]{margin-left:112px}
  const renderChatTile = useCallback((_onViewDragOut?: unknown, isTopLeft = true, dragHandle?: ReactNode) => (
    <OfficialChatTileShell>
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
        sessionRef={sessionRef}
        sessionType={activeSessionId ? sessionType : undefined}
      />
    </OfficialChatTileShell>
  ), [activeSessionId, hideComposer, landingActions, landingBody, onNavigate, sessionRef, sessionType]);

  return (
    <div className="epitaxy-root select-none h-full w-full flex flex-col">
      <div className="flex-1 min-h-0">
        <EpitaxyTileLayout>{renderChatTile(undefined, true)}</EpitaxyTileLayout>
      </div>
    </div>
  );
}

export function EpitaxySessionTile({ isLonePane = false, onClose, onMovePane, onNavigate, paneIndex = 0, sessionId, slot }: EpitaxySessionTileProps) {
  return (
    <EpitaxySecondPane
      isLonePane={isLonePane}
      onClose={onClose}
      onMovePane={onMovePane}
      onNavigate={onNavigate}
      paneIndex={paneIndex}
      sessionId={sessionId}
      slot={slot}
    />
  );
}

function EpitaxySecondPane({ isLonePane, onClose, onMovePane, onNavigate, paneIndex, sessionId, slot }: EpitaxySessionTileProps) {
  const sessionType = useEpitaxySessionType(sessionId);
  const sessionRef = useMemo(() => ({ id: sessionId, type: sessionType }), [sessionId, sessionType]);
  const fallbackHome = sessionHomePath("code");
  const renderChatTile = useCallback((_onViewDragOut?: unknown, isTopLeft?: boolean, dragHandle?: ReactNode) => (
    <OfficialChatTileShell>
      <EpitaxyChatPanel
        draftPersistKey={`epitaxy-pane-${sessionId}`}
        dragHandle={dragHandle}
        initialSessionId={sessionId}
        isLonePane={isLonePane}
        isPanelActive={false}
        isTopLeft={isTopLeft}
        onClose={onClose}
        onNavigate={onNavigate}
        onMovePane={onMovePane}
        onSessionRemoved={onClose ?? (() => onNavigate(fallbackHome))}
        paneIndex={paneIndex}
        sessionRef={sessionRef}
        sessionType={sessionType}
        slot={slot}
      />
    </OfficialChatTileShell>
  ), [fallbackHome, isLonePane, onClose, onMovePane, onNavigate, paneIndex, sessionId, sessionRef, sessionType, slot]);

  return (
    <div className="epitaxy-root select-none flex-1 min-h-0 flex flex-col overflow-hidden">
      <EpitaxyTileLayout>{renderChatTile()}</EpitaxyTileLayout>
    </div>
  );
}

type EpitaxyChatPanelProps = {
  draftPersistKey: string;
  dragHandle?: ReactNode;
  hideComposer?: boolean;
  initialSessionId?: string;
  isLonePane?: boolean;
  isPanelActive: boolean;
  isTopLeft?: boolean;
  landingActions?: ReactNode;
  landingBody?: ReactNode;
  onClose?: () => void;
  onMovePane?: (slot: PaneSlot) => void;
  onNavigate: (path: string) => void;
  onSessionRemoved?: () => void;
  paneIndex?: number;
  sessionRef: EpitaxySessionRef | null;
  sessionType?: EpitaxySessionType;
  slot?: PaneSlot;
};

function EpitaxyChatPanel({
  dragHandle,
  hideComposer = false,
  initialSessionId,
  isLonePane = false,
  isPanelActive,
  isTopLeft,
  landingActions,
  landingBody,
  onClose,
  onNavigate,
  onMovePane,
  onSessionRemoved,
  paneIndex = 0,
  sessionRef,
  sessionType = "local",
  slot,
}: EpitaxyChatPanelProps) {
  const {
    beginLocalUserTurn,
    cancelQueuedMessage,
    entries,
    error,
    isLoading,
    isResponding,
    isSessionNotFound,
    messages,
    pendingTurnStartedAt,
    reload,
    session,
    spawnLabel,
    stopLiveTurn,
    streamTokenEstimate,
  } = useEpitaxySessionData(initialSessionId);
  // Official ca0135 tileLayout + sidePane: multi-tile side stack (tasks + subagent column via ur).
  // activeView ≡ sidePane focused kind; openViews ≡ ir(tileLayout) non-chat tiles.
  const [sideTiles, setSideTiles] = useState<OfficialViewPane[]>([]);
  const [activeView, setActiveView] = useState<OfficialViewPane | undefined>(undefined);
  const [transcriptMode, setTranscriptMode] = useState<OfficialTranscriptMode>("normal");
  const [fileView, setFileView] = useState<OfficialFileViewTarget | null>(null);
  const [previewTarget, setPreviewTarget] = useState<OfficialPreviewTarget | null>(null);
  const [subagentView, setSubagentView] = useState<OfficialSubagentTarget | null>(null);
  const [sidePaneWidth, setSidePaneWidth] = useState<number | undefined>(undefined);
  const title = officialSessionHeaderTitle(session, initialSessionId);
  const effectiveSessionRef = sessionRef ?? (initialSessionId ? { id: initialSessionId, type: sessionType } : null);
  const bridge = desktopBridge.LocalSessions;
  const tasks = useMemo(() => parseOfficialTasks(messages), [messages]);
  const hasRunningTasks = useMemo(() => tasks.some((task) => task.status === "running"), [tasks]);
  // Official YR Screen: T && (A || u.has("framebuffer"))
  const framebufferPaneOpen = sideTiles.includes("framebuffer");
  const canOpenFramebuffer = useOfficialFramebufferMenuGate(session?.cwd, framebufferPaneOpen);
  // Official setSidePane(e): if tile already present only focus; else ur() insert (column under existing side).
  const openSidePane = useCallback((view: OfficialViewPane) => {
    setSideTiles((current) => current.includes(view) ? current : [...current, view]);
    setActiveView(view);
  }, []);
  // Official closeSidePane(e): Zs(tileLayout, e) remove one tile; clear sidePane if focused was that tile.
  const closeSidePane = useCallback((view: OfficialViewPane) => {
    setSideTiles((current) => {
      const next = current.filter((item) => item !== view);
      setActiveView((focused) => {
        if (next.length === 0) return undefined;
        if (focused === view) return next[next.length - 1];
        return focused && next.includes(focused) ? focused : next[next.length - 1];
      });
      return next;
    });
    if (view === "subagent") setSubagentView(null);
    if (view === "file") setFileView(null);
    if (view === "preview") setPreviewTarget(null);
  }, []);
  const closeAllSidePanes = useCallback(() => {
    setSideTiles([]);
    setActiveView(undefined);
    setSubagentView(null);
    setFileView(null);
    setPreviewTarget(null);
  }, []);
  const openFile = useCallback((target: OfficialFileViewTarget) => {
    setFileView({ ...target, scrollNonce: Date.now() });
    openSidePane("file");
  }, [openSidePane]);
  const openPreview = useCallback((target: OfficialPreviewTarget) => {
    setPreviewTarget(target);
    openSidePane("preview");
  }, [openSidePane]);
  // Official AR: setSubagentView + setSidePane("subagent") — stacks under tasks when tasks already open (ur column).
  const openSubagent = useCallback((target: OfficialSubagentTarget) => {
    setSubagentView(target);
    openSidePane("subagent");
  }, [openSidePane]);
  const openTasks = useCallback(() => openSidePane("tasks"), [openSidePane]);
  // Official Wk onOpenPlan → qn("plan") / setSidePane("plan").
  const openPlan = useCallback(() => openSidePane("plan"), [openSidePane]);
  const openDiff = useCallback(() => openSidePane("diff"), [openSidePane]);
  const transcriptRef = useRef<OfficialTranscriptHandle | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const composerAttachRef = useRef<((text: string) => void) | null>(null);
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
  const attachAsContext = useCallback((text: string) => {
    composerAttachRef.current?.(text);
  }, []);
  const transcriptActionContext = useMemo(() => ({
    attachAsContext,
    bridge,
    cancelQueuedMessage,
    openFile,
    openPlan,
    openPreview,
    openSubagent,
    openTasks,
    onNavigate,
    reload,
    sessionId: initialSessionId,
  }), [attachAsContext, bridge, cancelQueuedMessage, initialSessionId, onNavigate, openFile, openPlan, openPreview, openSubagent, openTasks, reload]);
  // Official toggleSidePane: remove if present else ur insert.
  const selectView = useCallback((view: OfficialViewPane) => {
    setSideTiles((current) => {
      if (current.includes(view)) {
        const next = current.filter((item) => item !== view);
        setActiveView((focused) => {
          if (next.length === 0) return undefined;
          if (focused === view) return next[next.length - 1];
          return focused && next.includes(focused) ? focused : next[next.length - 1];
        });
        if (view === "subagent") setSubagentView(null);
        if (view === "file") setFileView(null);
        if (view === "preview") setPreviewTarget(null);
        return next;
      }
      setActiveView(view);
      return [...current, view];
    });
  }, []);

  useEpitaxyViewShortcuts(selectView);
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
  useEffect(() => {
    setFileView(null);
    setPreviewTarget(null);
    setSubagentView(null);
    setSideTiles([]);
    setActiveView(undefined);
  }, [initialSessionId]);
  useEffect(() => {
    if (!initialSessionId || (entries.length === 0 && !isResponding)) {
      updateTranscriptScrollState({ showScrollButton: false, showBottomFade: false });
    }
  }, [entries.length, initialSessionId, isResponding, updateTranscriptScrollState]);
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
          <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
            {renderTranscriptBody({ entries, error, initialSessionId, isLoading, isResponding, isSessionNotFound, landingBody, onScrollState: updateTranscriptScrollState, pendingTurnStartedAt, ref: transcriptRef, reload, scrollRef: transcriptScrollRef, session, spawnLabel, streamTokenEstimate, tasks, transcriptMode })}
          </EpitaxyTranscriptActionContext.Provider>
        </div>
        {!hideComposer && initialSessionId && !isSessionNotFound ? (
          <ExistingSessionComposer
            attachRef={composerAttachRef}
            bridge={bridge}
            disabled={isLoading || Boolean(error)}
            isResponding={isResponding}
            onOpenDiff={openDiff}
            onOpenPlan={openPlan}
            onPermissionModeChange={async (mode) => {
              // Official Wk onModeChange after plan Accept — host Mode pill + CLI set_permission_mode.
              if (!effectiveSessionRef) return;
              officialCodeSessionStore.getState().mergeLiveMeta(effectiveSessionRef.id, { permissionMode: mode });
              await bridge.setPermissionMode?.(effectiveSessionRef.id, mode);
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
        ) : null}
      </div>
    </>
  );

  // Official kI wraps session with `sg` (PierreWorkerPool) so Diff/File Zd mounts with a warm pool.
  // Official ur (ca0135): first open beside chat → Xs({direction:"row", children:[["chat",2], side]}).
  // Second side open under existing side tile → column stack (tasks above, subagent below) — "from below".
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
      flexGrow: chatDefaultFlex,
      flexShrink: 1,
      flexBasis: 0,
    };
  }, [hasSidePanes, sidePaneWidth]);

  // Official iE row stack: gap from nE.gap (12). Side tile FI uses DI + Nn sidebar elevation.
  // Chat tile also sits in the same padded container (EpitaxyTileLayout padding:8) so elevated rings show.
  return (
    <OfficialPierreWorkerPool>
      <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
        {/* Official stack gap nE.gap=12 between chat tile and side column. */}
        <div className="relative h-full min-w-0 flex" style={{ gap: hasSidePanes ? 12 : 0 }}>
          {/* Chat shell matches iE: h-full w-full min-w-0 relative isolate rounded-r6 + Nn sidebar elevation */}
          <div className="relative min-w-0 h-full flex flex-col rounded-r6 isolate" style={chatTileStyle}>
            <div
              aria-hidden="true"
              className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
              data-surface="sidebar"
            />
            <EpitaxyChatHeader
              activeView={activeView}
              canOpenBrowser={canUseOfficialFilesBrowser()}
              canOpenFramebuffer={canOpenFramebuffer}
              canOpenRuns={sessionHasOfficialRuns(session, effectiveSessionRef)}
              dragHandle={dragHandle}
              hasRunningTasks={hasRunningTasks}
              isTitleLoading={isLoading && !session}
              isTopLeft={isTopLeft}
              onClose={onClose}
              onSessionRemoved={onSessionRemoved}
              onTranscriptModeChange={setTranscriptMode}
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
          {hasSidePanes ? (
            <EpitaxySidePaneColumn
              fileView={fileView}
              isTopLeft={isTopLeft}
              messages={messages}
              onCloseAll={closeAllSidePanes}
              onCloseTile={closeSidePane}
              onSidePaneWidthChange={setSidePaneWidth}
              previewTarget={previewTarget}
              renderSubagent={(view) => <OfficialSubagentPane messages={messages} subagentView={view} />}
              session={session}
              sessionRef={effectiveSessionRef}
              sidePaneWidth={sidePaneWidth}
              sideTiles={sideTiles}
              subagentView={subagentView}
            />
          ) : null}
        </div>
      </EpitaxyTranscriptActionContext.Provider>
    </OfficialPierreWorkerPool>
  );
}

