import { Fragment, createContext, createElement, forwardRef, memo, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type Ref } from "react";
import { Popover } from "@base-ui-components/react/popover";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { FitAddon } from "@xterm/addon-fit";
import { WebglAddon } from "@xterm/addon-webgl";
import { Terminal } from "@xterm/xterm";
import "@xterm/xterm/css/xterm.css";
import { desktopBridge, type ContextUsage, type SessionSummary } from "../../adapters/desktopBridge";
import type { ChatMessage, LocalSessionsBridge, SendMessageInput } from "../../adapters/desktopBridge/types";
import { Icon } from "../../shell/icons";
import { sessionHomePath, sessionPath } from "../../shell/sessionPaths";
import type { PaneSlot } from "../../stores/paneStore";
import { EpitaxyTileLayout } from "./EpitaxyFrameSurface";
import {
  OfficialAssistantMessage,
  OfficialButton,
  OfficialChatTileShell,
  OfficialDropdownButton,
  OfficialSessionHeader,
  OfficialSessionSource,
  OfficialUserMessage,
  type OfficialDropdownItem,
  type OfficialTranscriptMode,
  type OfficialViewPane,
} from "./OfficialEpitaxyComponents";
import { OfficialEpitaxyBranchRows } from "./OfficialEpitaxyBranchRows";
import { OfficialDiffPane, type OfficialDiffCompareMeta } from "./OfficialDiffPane";
import { OfficialPierreWorkerPool } from "./diff/OfficialPierreWorkerPool";
import { parseEpitaxyUploadedFilesText, type EpitaxyUploadedFile } from "./epitaxyUploadedFiles";
import { createOfficialSessionStreamSmoother, type OfficialStreamSnapshot } from "./officialStreamSmoother";
import { OfficialEpitaxySlashCommandMenu } from "./slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "./slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "./slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "./slash/OfficialSlashTypes";

type EpitaxySessionType = "local" | "remote" | "bridge";
type StreamActivityMode = "idle" | "requesting" | "thinking" | "responding" | "tool-use";

type EpitaxyTranscriptActionContextValue = {
  bridge: LocalSessionsBridge;
  openFile: (target: OfficialFileViewTarget) => void;
  openPreview: (target: OfficialPreviewTarget) => void;
  openSubagent: (target: OfficialSubagentTarget) => void;
  openTasks: () => void;
  onNavigate: (path: string) => void;
  reload: () => Promise<void>;
  sessionId?: string;
};

const EpitaxyTranscriptActionContext = createContext<EpitaxyTranscriptActionContextValue | null>(null);

type OfficialPreviewTarget = {
  path: string;
  title?: string;
};

type OfficialFileViewTarget = {
  findQuery?: string;
  line?: number;
  path: string;
  scrollNonce?: number;
  title?: string;
};

type OfficialSubagentTarget = {
  description: string;
  toolUseId: string;
};

type OfficialSparkAnimation = {
  frameCount: number;
  height: number;
  speed: number;
  svg: string;
  width: number;
};

type EpitaxySessionRef = {
  id: string;
  type: EpitaxySessionType;
};

type OfficialTranscriptScrollBehavior = ScrollBehavior | "instant";

type OfficialTranscriptHandle = {
  scrollToBottom: (behavior?: OfficialTranscriptScrollBehavior) => void;
  scrollToEntry: (entryId: string) => void;
};

type OfficialTranscriptScrollState = {
  showBottomFade: boolean;
  showScrollButton: boolean;
};

function scrollElementToBottom(node: HTMLElement, behavior?: OfficialTranscriptScrollBehavior) {
  node.scrollTo({ top: node.scrollHeight, behavior: (behavior ?? "instant") as ScrollBehavior });
  node.dispatchEvent(new Event("scroll", { bubbles: true }));
  if (behavior === "smooth") {
    window.setTimeout(() => {
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (distanceFromBottom > 8) {
        node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      }
      node.dispatchEvent(new Event("scroll", { bubbles: true }));
    }, 450);
  }
}

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
const idleStreamActivityMode: StreamActivityMode = "idle";
const officialSparkBundlePath = "/assets/v1/cad8c092d-DAwbTyVP.js";
const officialSparkMaskPath = "/assets/v1/epitaxy-spark-mask.webp";
let officialThinkingSparkAnimationCache: OfficialSparkAnimation | null = null;
let officialThinkingSparkAnimationPromise: Promise<OfficialSparkAnimation | null> | null = null;

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
  const { entries, error, isLoading, isResponding, isSessionNotFound, messages, pendingTurnStartedAt, reload, session, streamTokenEstimate } = useEpitaxySessionData(initialSessionId);
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
  const openFile = useCallback((target: OfficialFileViewTarget) => {
    setFileView({ ...target, scrollNonce: Date.now() });
    setActiveView("file");
  }, []);
  const openPreview = useCallback((target: OfficialPreviewTarget) => {
    setPreviewTarget(target);
    setActiveView("preview");
  }, []);
  const openSubagent = useCallback((target: OfficialSubagentTarget) => {
    setSubagentView(target);
    setActiveView("subagent");
  }, []);
  const openTasks = useCallback(() => setActiveView("tasks"), []);
  const openDiff = useCallback(() => setActiveView("diff"), []);
  const transcriptRef = useRef<OfficialTranscriptHandle | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
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
  const transcriptActionContext = useMemo(() => ({
    bridge,
    openFile,
    openPreview,
    openSubagent,
    openTasks,
    onNavigate,
    reload,
    sessionId: initialSessionId,
  }), [bridge, initialSessionId, onNavigate, openFile, openPreview, openSubagent, openTasks, reload]);
  const selectView = useCallback((view: OfficialViewPane) => {
    setActiveView((current) => current === view ? undefined : view);
  }, []);

  useEpitaxyViewShortcuts(selectView);
  useEffect(() => {
    setFileView(null);
    setPreviewTarget(null);
    setSubagentView(null);
    if (!initialSessionId) {
      setActiveView(undefined);
    }
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
            {renderTranscriptBody({ entries, error, initialSessionId, isLoading, isResponding, isSessionNotFound, landingBody, onScrollState: updateTranscriptScrollState, pendingTurnStartedAt, ref: transcriptRef, reload, scrollRef: transcriptScrollRef, session, streamTokenEstimate, tasks, transcriptMode })}
          </EpitaxyTranscriptActionContext.Provider>
        </div>
        {!hideComposer && initialSessionId && !isSessionNotFound ? (
          <ExistingSessionComposer
            bridge={bridge}
            disabled={isLoading || Boolean(error)}
            isResponding={isResponding}
            onOpenDiff={openDiff}
            onSubmit={async (text, input) => {
              await sendMessageToSession(initialSessionId, text, input);
              await reload();
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
  // c119 YI: flexGrow from tile.flex, flexShrink:1, flexBasis:0, minWidth:minTilePx(100).
  const chatTileStyle = useMemo<CSSProperties>(() => {
    if (!activeView) return { height: "100%", minWidth: 0, flex: "1 1 0" };
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
  }, [activeView, sidePaneWidth]);

  return (
    <OfficialPierreWorkerPool>
      <EpitaxyTranscriptActionContext.Provider value={transcriptActionContext}>
        <div className="relative h-full min-w-0 flex">
          <div className="relative min-w-0 flex flex-col" style={chatTileStyle}>
            <EpitaxyChatHeader
              activeView={activeView}
              dragHandle={dragHandle}
              hasRunningTasks={hasRunningTasks}
              isTitleLoading={isLoading && !session}
              isTopLeft={isTopLeft}
              onClose={onClose}
              onSessionRemoved={onSessionRemoved}
              onTranscriptModeChange={setTranscriptMode}
              onViewSelect={selectView}
              paneIndex={paneIndex}
              session={session}
              sessionRef={effectiveSessionRef}
              title={title}
              transcriptMode={transcriptMode}
            />
            {chatBody}
          </div>
          {activeView ? (
            <EpitaxySidePaneTile
              activeView={activeView}
              fileView={fileView}
              isTopLeft={isTopLeft}
              onClose={() => setActiveView(undefined)}
              previewTarget={previewTarget}
              session={session}
              sessionRef={effectiveSessionRef}
              sidePaneWidth={sidePaneWidth}
              subagentView={subagentView}
              onSidePaneWidthChange={setSidePaneWidth}
            />
          ) : null}
        </div>
      </EpitaxyTranscriptActionContext.Provider>
    </OfficialPierreWorkerPool>
  );
}

function officialSessionHeaderTitle(session: SessionSummary | null, initialSessionId: string | undefined) {
  if (!initialSessionId) return "Claude Code";
  const title = session?.title?.trim();
  // Official local code empty/placeholder → "Coding session" (c11959232 header fallback).
  if (isPlaceholderCodingTitle(title) || (title && /^\d+$/.test(title) && (session?.kind === "code" || session?.kind === "epitaxy"))) {
    return "Coding session";
  }
  return title!;
}

function EpitaxyChatHeader({ activeView, dragHandle, hasRunningTasks, hideViews = false, isTitleLoading, isTopLeft, onClose, onSessionRemoved, onTranscriptModeChange, onViewSelect, paneIndex, session, sessionRef, title, transcriptMode = "normal" }: {
  activeView?: OfficialViewPane;
  dragHandle?: ReactNode;
  hasRunningTasks?: boolean;
  hideViews?: boolean;
  isTitleLoading: boolean;
  isTopLeft?: boolean;
  onClose?: () => void;
  onSessionRemoved?: () => void;
  onTranscriptModeChange?: (mode: OfficialTranscriptMode) => void;
  onViewSelect?: (view: OfficialViewPane) => void;
  paneIndex: number;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  title: string;
  transcriptMode?: OfficialTranscriptMode;
}) {
  return (
    <OfficialSessionHeader
      activeView={activeView}
      dragHandle={dragHandle}
      hasRunningTasks={hasRunningTasks}
      hideViews={hideViews}
      isTitleLoading={isTitleLoading}
      isTopLeft={isTopLeft}
      onSessionRemoved={onSessionRemoved}
      onTranscriptModeChange={onTranscriptModeChange}
      onViewSelect={onViewSelect}
      paneIndex={paneIndex}
      session={session}
      sessionRef={sessionRef}
      title={title}
      transcriptMode={transcriptMode}
    />
  );
}

function useEpitaxyViewShortcuts(onSelect: (view: OfficialViewPane) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.metaKey && event.shiftKey && event.code === "KeyP") {
        event.preventDefault();
        onSelect("preview");
        return;
      }
      if (event.metaKey && event.shiftKey && event.code === "KeyD") {
        event.preventDefault();
        onSelect("diff");
        return;
      }
      if (event.ctrlKey && event.code === "Backquote") {
        event.preventDefault();
        onSelect("terminal");
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [enabled, onSelect]);
}

/**
 * Official tile layout (ca0135bc5 `ur` / `Xs` / c119 `YI` / `nE`):
 * - open side pane beside chat: `[["chat", 2], sideTile]` → flexGrow chat=2, side=1
 * - tile wrap: flexGrow / flexShrink:1 / flexBasis:0, minSize = minTilePx:100
 * - no 42% / 760 invent-width; width comes from flex until user resizes
 */
const sidePaneMinWidth = 100;
const sidePaneResizeStep = 24;
const sidePaneResizeHandleSize = 12;
/** Official ur: chat flex 2 vs side flex 1 → side ≈ 1/3 until resized. */
const sidePaneDefaultFlex = 1;
const chatDefaultFlex = 2;

const sidePaneBoundaryHandleStyle: CSSProperties = {
  position: "relative",
  zIndex: 1,
  transform: "translateZ(2px)",
  padding: 0,
  outline: "none",
  border: 0,
  background: "transparent",
  touchAction: "none",
  flex: "none",
  cursor: "col-resize",
  alignSelf: "stretch",
  width: sidePaneResizeHandleSize,
};

const sidePaneBoundaryAffordanceStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  borderRadius: 999,
  transform: "translate(-50%, -50%)",
  transition: "opacity 120ms ease",
  width: "var(--tile-resize-thickness)",
  height: "var(--tile-resize-length)",
};

function clampSidePaneWidth(width: number, maxWidth: number) {
  return Math.max(sidePaneMinWidth, Math.min(maxWidth, Math.round(width)));
}

function getSidePaneMaxWidth(containerWidth?: number) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  // Leave at least minTilePx for chat (official nE.minTilePx = 100).
  const usable = Math.max(sidePaneMinWidth, (containerWidth ?? viewportWidth) - sidePaneMinWidth);
  return usable;
}

function getDefaultSidePaneWidth(containerWidth?: number) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const total = containerWidth ?? viewportWidth;
  // Official default flex share: side / (chat+side) = 1/3.
  const baseWidth = (total * sidePaneDefaultFlex) / (chatDefaultFlex + sidePaneDefaultFlex);
  return clampSidePaneWidth(baseWidth, getSidePaneMaxWidth(containerWidth));
}

function sidePaneWidthToAriaValue(width: number | undefined, containerWidth?: number) {
  // Official separator valueNow ≈ leftFlex/(left+right)*100 with default chat:2 side:1 → ~67 for chat side of handle.
  // Our handle reports side share so 33 when default.
  if (width === undefined) {
    return Math.round((sidePaneDefaultFlex / (chatDefaultFlex + sidePaneDefaultFlex)) * 100);
  }
  const maxWidth = getSidePaneMaxWidth(containerWidth);
  const range = Math.max(1, maxWidth - sidePaneMinWidth);
  return Math.max(0, Math.min(100, Math.round(((width - sidePaneMinWidth) / range) * 100)));
}

function EpitaxySidePaneTile({
  activeView,
  fileView,
  isTopLeft,
  onClose,
  onSidePaneWidthChange,
  previewTarget,
  session,
  sessionRef,
  sidePaneWidth,
  subagentView,
}: {
  activeView: OfficialViewPane;
  fileView: OfficialFileViewTarget | null;
  isTopLeft?: boolean;
  onClose: () => void;
  onSidePaneWidthChange: (width: number) => void;
  previewTarget: OfficialPreviewTarget | null;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  sidePaneWidth?: number;
  subagentView: OfficialSubagentTarget | null;
}) {
  const codeSurface = activeView === "terminal" || activeView === "diff";
  const bridge = desktopBridge.LocalSessions;
  // Official Lr (ca0135bc5): diffShowTree:!1 — tree off until user clicks Show files.
  const [diffShowTree, setDiffShowTree] = useState(false);
  // Official oN: diffCanFitTree[repoKey] ?? true — Hide/Show files only when d (canFitTree).
  const [diffCanFitTree, setDiffCanFitTree] = useState(true);
  const [diffCompareMeta, setDiffCompareMeta] = useState<OfficialDiffCompareMeta | null>(null);
  const [terminalTabs, setTerminalTabs] = useState<TerminalTabsState>(() => createDefaultTerminalTabs());
  const plan = useMemo(() => activeView === "plan" ? parseOfficialPlan(session?.messages ?? []) : { content: undefined, path: undefined }, [activeView, session?.messages]);

  useEffect(() => {
    setTerminalTabs(createDefaultTerminalTabs());
    setDiffCompareMeta(null);
    setDiffCanFitTree(true);
  }, [sessionRef?.id]);

  const addTerminalTab = useCallback(() => {
    setTerminalTabs((current) => {
      const id = String(current.nextId);
      const tab = { id, ordinal: current.nextId + 1 };
      return {
        activeId: id,
        nextId: current.nextId + 1,
        tabs: [...current.tabs, tab],
      };
    });
  }, []);

  const selectTerminalTab = useCallback((tabId: string) => {
    setTerminalTabs((current) => current.activeId === tabId ? current : { ...current, activeId: tabId });
  }, []);

  const closeTerminalTab = useCallback((tabId: string) => {
    if (sessionRef) void bridge.stopShellPty?.(terminalPtyKey(sessionRef.id, tabId));
    setTerminalTabs((current) => {
      const index = current.tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0) return current;
      const tabs = current.tabs.filter((tab) => tab.id !== tabId);
      if (tabs.length === 0) return createDefaultTerminalTabs();
      const activeId = current.activeId === tabId ? tabs[Math.min(index, tabs.length - 1)]?.id ?? tabs[0].id : current.activeId;
      return { ...current, activeId, tabs };
    });
  }, [bridge, sessionRef]);

  const renameTerminalTab = useCallback((tabId: string, name: string) => {
    setTerminalTabs((current) => ({
      ...current,
      tabs: current.tabs.map((tab) => tab.id === tabId ? { ...tab, name: name || undefined } : tab),
    }));
  }, []);

  const activeTerminalTab = terminalTabs.tabs.find((tab) => tab.id === terminalTabs.activeId) ?? terminalTabs.tabs[0];
  const asideRef = useRef<HTMLElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [isResizingSidePane, setIsResizingSidePane] = useState(false);
  const ariaValueNow = sidePaneWidthToAriaValue(sidePaneWidth);
  // Official YI tile wrap: flexGrow / flexShrink:1 / flexBasis:0 until user resizes to a fixed width.
  const sidePaneStyle = useMemo<CSSProperties>(() => {
    if (sidePaneWidth === undefined) {
      return {
        height: "100%",
        minWidth: sidePaneMinWidth,
        flexGrow: sidePaneDefaultFlex,
        flexShrink: 1,
        flexBasis: 0,
      };
    }
    return {
      height: "100%",
      minWidth: sidePaneMinWidth,
      width: `${sidePaneWidth}px`,
      flex: "0 0 auto",
    };
  }, [sidePaneWidth]);
  const commitSidePaneWidth = useCallback((width: number, maxWidth?: number) => {
    onSidePaneWidthChange(clampSidePaneWidth(width, maxWidth));
  }, [onSidePaneWidthChange]);
  const readSidePaneWidth = useCallback((containerWidth?: number) => {
    return sidePaneWidth ?? asideRef.current?.getBoundingClientRect().width ?? getDefaultSidePaneWidth(containerWidth);
  }, [sidePaneWidth]);
  const stopResizeListeners = useCallback(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
    setIsResizingSidePane(false);
  }, []);
  const startSidePaneResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeCleanupRef.current?.();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    const containerWidth = handle.parentElement?.getBoundingClientRect().width;
    const maxWidth = getSidePaneMaxWidth(containerWidth);
    const startX = event.clientX;
    const startWidth = clampSidePaneWidth(readSidePaneWidth(containerWidth), maxWidth);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    try {
      handle.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the pointer was already released.
    }
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      commitSidePaneWidth(startWidth - (moveEvent.clientX - startX), maxWidth);
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // Ignore stale pointer capture after pointerup/cancel.
      }
      resizeCleanupRef.current = null;
      setIsResizingSidePane(false);
    };
    resizeCleanupRef.current = handlePointerUp;
    setIsResizingSidePane(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [commitSidePaneWidth, readSidePaneWidth]);
  const handleSidePaneResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const containerWidth = event.currentTarget.parentElement?.getBoundingClientRect().width;
    const maxWidth = getSidePaneMaxWidth(containerWidth);
    const currentWidth = clampSidePaneWidth(readSidePaneWidth(containerWidth), maxWidth);
    if (event.key === "Home") {
      commitSidePaneWidth(sidePaneMinWidth, maxWidth);
      return;
    }
    if (event.key === "End") {
      commitSidePaneWidth(maxWidth, maxWidth);
      return;
    }
    commitSidePaneWidth(currentWidth + (event.key === "ArrowLeft" ? sidePaneResizeStep : -sidePaneResizeStep), maxWidth);
  }, [commitSidePaneWidth, readSidePaneWidth]);

  useEffect(() => () => stopResizeListeners(), [stopResizeListeners]);

  return (
    <>
      <div
        aria-label="Resize"
        aria-orientation="vertical"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={ariaValueNow}
        className={`tiles-handle draggable-none hide-focus-ring ${isResizingSidePane ? "is-active" : ""}`}
        onKeyDown={handleSidePaneResizeKeyDown}
        onPointerDown={startSidePaneResize}
        role="separator"
        style={sidePaneBoundaryHandleStyle}
        tabIndex={0}
      >
        <span aria-hidden="true" className="tiles-handle-affordance" style={sidePaneBoundaryAffordanceStyle} />
      </div>
      <aside
        ref={asideRef}
        className={`min-w-0 relative isolate flex flex-col rounded-r6${codeSurface ? " epitaxy-code-surface" : ""}`}
        style={sidePaneStyle}
      >
        <div aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated" data-surface="sidebar" />
        <div data-top-left={isTopLeft || undefined} className="relative flex items-center justify-between gap-g6 h-[32px] pl-[8px] pr-[4px] shrink-0">
          <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
            {renderSidePaneTitle(activeView, session, sessionRef, {
              activeTab: activeTerminalTab,
              diffCanFitTree,
              diffCompareMeta,
              diffShowTree,
              fileView,
              onDiffShowTreeChange: setDiffShowTree,
              onAddTab: addTerminalTab,
              subagentView,
            onCloseTab: closeTerminalTab,
            onRenameTab: renameTerminalTab,
            onSelectTab: selectTerminalTab,
            tabs: terminalTabs.tabs,
          })}
          <div className="relative z-[1] flex items-center gap-g1 shrink-0 draggable-none">
            {activeView === "plan" ? <OfficialPlanHeaderActions bridge={bridge} plan={plan} session={session} /> : null}
            <OfficialButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} />
          </div>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden rounded-b-r6">
          <ViewPaneBody
            activeTerminalTab={activeTerminalTab}
            activeView={activeView}
            bridge={bridge}
            diffShowTree={diffShowTree}
            fileView={fileView}
            onDiffCanFitTreeChange={setDiffCanFitTree}
            onDiffCompareMetaChange={setDiffCompareMeta}
            previewTarget={previewTarget}
            session={session}
            sessionRef={sessionRef}
            subagentView={subagentView}
          />
        </div>
      </aside>
    </>
  );
}

const viewPaneConfig: Record<OfficialViewPane, { icon: string; label: string }> = {
  preview: { icon: "Play", label: "预览" },
  diff: { icon: "ChangesDiffPlusMinusBox", label: "Diff" },
  terminal: { icon: "TerminalOpenCommandLine", label: "Terminal" },
  tasks: { icon: "Blocks", label: "任务" },
  plan: { icon: "CheckList", label: "Plan" },
  file: { icon: "NoteSquareLines", label: "File" },
  subagent: { icon: "Agent", label: "Agent" },
};

type TerminalTab = {
  id: string;
  name?: string;
  ordinal: number;
};

type TerminalTabsState = {
  activeId: string;
  nextId: number;
  tabs: TerminalTab[];
};

type TerminalTitleState = {
  activeTab?: TerminalTab;
  /** Official oN: Hide/Show files only when canFitTree (width >= 400). */
  diffCanFitTree?: boolean;
  /** Official oN: baseBranch → working tree / head */
  diffCompareMeta?: OfficialDiffCompareMeta | null;
  diffShowTree?: boolean;
  fileView?: OfficialFileViewTarget | null;
  onDiffShowTreeChange?: (showTree: boolean) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, name: string) => void;
  onSelectTab: (tabId: string) => void;
  subagentView?: OfficialSubagentTarget | null;
  tabs: TerminalTab[];
};

const defaultTerminalTabId = "0";

function createDefaultTerminalTabs(): TerminalTabsState {
  return { activeId: defaultTerminalTabId, nextId: 1, tabs: [{ id: defaultTerminalTabId, ordinal: 1 }] };
}

function terminalTabLabel(tab: TerminalTab | undefined, forceOrdinal = false) {
  if (!tab) return "Terminal";
  return tab.name ?? (forceOrdinal || tab.ordinal > 1 ? `Terminal ${tab.ordinal}` : "Terminal");
}

function terminalPtyKey(sessionId: string, tabId: string) {
  return tabId === defaultTerminalTabId ? sessionId : `${sessionId}::${tabId}`;
}

function renderSidePaneTitle(activeView: OfficialViewPane, session: SessionSummary | null, sessionRef: EpitaxySessionRef | null, terminalState?: TerminalTitleState) {
  if (activeView === "preview" && sessionRef?.type === "local") {
    return (
      <div className="relative z-[1] flex items-center gap-g3 min-w-0 draggable-none">
        <OfficialDropdownButton
          align="start"
          className="-ml-[5px]"
          header="Servers"
          label="预览"
          mode="text"
          side="bottom"
        />
      </div>
    );
  }

  if (activeView === "diff" && sessionRef) {
    // Official oN (c11959232): FolderOpenFront Hide/Show files only when canFitTree + base → head
    const baseLabel = terminalState?.diffCompareMeta?.base ?? "main";
    const headLabel = terminalState?.diffCompareMeta?.headLabel ?? "working tree";
    const canFitTree = terminalState?.diffCanFitTree ?? true;
    return (
      <div className="relative z-[1] flex items-center gap-g3 min-w-0 draggable-none">
        {canFitTree ? (
          <OfficialButton
            ariaLabel={terminalState?.diffShowTree ? "Hide files" : "Show files"}
            className="-ml-[4px]"
            icon="FolderOpenFront"
            onClick={() => terminalState?.onDiffShowTreeChange?.(!terminalState.diffShowTree)}
            pressed={terminalState?.diffShowTree}
          />
        ) : null}
        <span className="flex items-center gap-g3 text-body text-t6 min-w-0 -ml-[2px]">
          <span className="text-t7 truncate">{baseLabel}</span>
          <span className="text-t4">→</span>
          <span className="text-t7 truncate">{headLabel}</span>
        </span>
      </div>
    );
  }

  if (activeView === "terminal") {
    return <OfficialTerminalTitle terminalState={terminalState} />;
  }

  if (activeView === "file" && terminalState?.fileView) {
    const fileTitle = terminalState.fileView.title ?? basename(terminalState.fileView.path) ?? terminalState.fileView.path;
    return (
      <div className="relative z-[1] flex min-w-0 items-center gap-g3 draggable-none pl-[1px]">
        <Icon name="NoteSquareLines" size="sm" />
        <span className="text-body text-t7 select-none truncate">{fileTitle}</span>
      </div>
    );
  }

  if (activeView === "subagent" && terminalState?.subagentView) {
    return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{terminalState.subagentView.description}</span>;
  }

  const label = activeView === "preview" && session?.title ? "预览" : viewPaneConfig[activeView].label;
  return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{label}</span>;
}

function OfficialTerminalTitle({ terminalState }: { terminalState?: TerminalTitleState }) {
  const activeTab = terminalState?.activeTab;
  const hasMultipleTabs = Boolean(terminalState && terminalState.tabs.length > 1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const renameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }, []);
  const closeRename = useCallback(() => {
    setIsRenaming(false);
    if (terminalState && activeTab) terminalState.onRenameTab(activeTab.id, draftName.trim());
  }, [activeTab, draftName, terminalState]);
  const openRename = useCallback(() => {
    setDraftName(activeTab?.name ?? "");
    setIsRenaming(true);
  }, [activeTab?.name]);

  const tabItems: OfficialDropdownItem[] = terminalState?.tabs.map((tab) => ({
    checked: tab.id === activeTab?.id,
    label: terminalTabLabel(tab, true),
    onSelect: () => terminalState.onSelectTab(tab.id),
    trailing: terminalState.tabs.length > 1 ? (
      <TerminalTabDeleteButton ariaLabel={`Close ${terminalTabLabel(tab, true)}`} onDelete={() => terminalState.onCloseTab(tab.id)} />
    ) : undefined,
  })) ?? [];
  const extraSections = terminalState ? [{
    items: [
      { label: "New terminal", onSelect: terminalState.onAddTab },
      { label: "Rename terminal", onSelect: openRename },
    ],
  }] : undefined;

  if (isRenaming) {
    return (
      <input
        aria-label="Terminal name"
        className="h-small w-[200px] min-w-0 pl-p5 pr-p2 rounded-small bg-t1 text-footnote text-t8 outline-none ring-focus border-0"
        onBlur={closeRename}
        onChange={(event) => setDraftName(event.currentTarget.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            closeRename();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsRenaming(false);
          }
        }}
        ref={renameInputRef}
        value={draftName}
      />
    );
  }

  return (
    <div className="relative z-[1] flex items-center gap-g1 min-w-0 draggable-none">
      {hasMultipleTabs ? (
        <OfficialDropdownButton
          align="start"
          className="-ml-[5px]"
          extraSections={extraSections}
          header="Terminals"
          items={tabItems}
          label={terminalTabLabel(activeTab, true)}
          mode="text"
          side="bottom"
        />
      ) : (
        <span className="text-body text-uncontained-default select-none truncate max-w-[200px] pl-[1px]">{terminalTabLabel(activeTab)}</span>
      )}
      {hasMultipleTabs ? <span aria-hidden className="inline-block w-px h-[10px] rounded-full bg-t3 -ml-[2px] -mr-[2px]" /> : null}
      <OfficialButton ariaLabel="New terminal" className="w-[20px]" icon="PlusSmall" onClick={terminalState?.onAddTab} />
    </div>
  );
}

function TerminalTabDeleteButton({ ariaLabel, onDelete }: { ariaLabel: string; onDelete: () => void }) {
  return (
    <button
      aria-label={ariaLabel}
      className="ml-auto flex items-center justify-center size-[20px] shrink-0 rounded-r3 bg-transparent border-0 outline-none ring-focus text-t5 hover:text-[var(--core-red)] hover:bg-t2"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      type="button"
    >
      <Icon name="TrashCanRound" size="sm" />
    </button>
  );
}

function OfficialPlanHeaderActions({ bridge, plan, session }: { bridge: LocalSessionsBridge; plan: { content?: string; path?: string }; session: SessionSummary | null }) {
  const [copied, setCopied] = useState(false);
  const openPath = plan.path ? resolvePlanOpenPath(plan.path, session) : undefined;
  const canOpen = Boolean(openPath && bridge.openInEditor);
  const openItems: OfficialDropdownItem[] = canOpen ? [{
    icon: "Folder1Open",
    label: "Default editor",
    onSelect: () => {
      if (openPath) void bridge.openInEditor?.(openPath);
    },
  }] : [];

  if (!plan.content) return null;
  return (
    <>
      {canOpen ? (
        <OfficialDropdownButton
          align="end"
          ariaLabel="Open in…"
          header="Open in…"
          icon="Folder1Open"
          items={openItems}
          revealChevron="never"
        />
      ) : null}
      <OfficialButton
        ariaLabel={copied ? "Copied" : "Copy plan"}
        icon={copied ? "CheckSelection" : "CopySquareBehind"}
        onClick={() => {
          void navigator.clipboard.writeText(plan.content ?? "").then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }).catch(() => {});
        }}
      />
    </>
  );
}

function ViewPaneBody({
  activeTerminalTab,
  activeView,
  bridge,
  diffShowTree,
  fileView,
  onDiffCanFitTreeChange,
  onDiffCompareMetaChange,
  previewTarget,
  session,
  sessionRef,
  subagentView,
}: {
  activeTerminalTab?: TerminalTab;
  activeView: OfficialViewPane;
  bridge: LocalSessionsBridge;
  diffShowTree: boolean;
  fileView: OfficialFileViewTarget | null;
  onDiffCanFitTreeChange?: (canFit: boolean) => void;
  onDiffCompareMetaChange?: (meta: OfficialDiffCompareMeta) => void;
  previewTarget: OfficialPreviewTarget | null;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  subagentView: OfficialSubagentTarget | null;
}) {
  switch (activeView) {
    case "preview":
      return <OfficialPreviewPane bridge={bridge} previewTarget={previewTarget} session={session} sessionRef={sessionRef} />;
    case "file":
      return <OfficialFilePane bridge={bridge} fileView={fileView} sessionRef={sessionRef} />;
    case "diff":
      return sessionRef ? (
        <OfficialDiffPane
          bridge={bridge}
          onCanFitTreeChange={onDiffCanFitTreeChange}
          onCompareMetaChange={onDiffCompareMetaChange}
          session={session}
          sessionRef={sessionRef}
          showTree={diffShowTree}
        />
      ) : null;
    case "terminal":
      return sessionRef ? <OfficialShellPtyPane bridge={bridge} ptyKey={terminalPtyKey(sessionRef.id, activeTerminalTab?.id ?? defaultTerminalTabId)} sessionRef={sessionRef} /> : null;
    case "tasks":
      return sessionRef ? <OfficialTasksPane bridge={bridge} session={session} sessionRef={sessionRef} /> : null;
    case "plan":
      return sessionRef ? <OfficialPlanPane session={session} /> : null;
    case "subagent":
      return sessionRef && subagentView ? <OfficialSubagentPane session={session} subagentView={subagentView} /> : null;
  }
}

function OfficialSubagentPane({ session, subagentView }: { session: SessionSummary | null; subagentView: OfficialSubagentTarget }) {
  const messages = session?.messages ?? [];
  const entries = useMemo(() => parseOfficialSubagentTranscriptEntries(messages, subagentView.toolUseId), [messages, subagentView.toolUseId]);
  const task = useMemo(() => parseOfficialTasks(messages).find((item) => item.toolUseId === subagentView.toolUseId), [messages, subagentView.toolUseId]);
  const isRunning = task?.status === "running";

  if (entries.length === 0 && task && (task.prompt || task.result)) {
    return (
      <div className="h-full overflow-y-auto px-p8 py-p6 select-text">
        <div className="epitaxy-chat-column flex flex-col gap-[var(--chat-turn-gap)]">
          {task.prompt ? <CodeUserEntryMessage entry={{ author: "user", id: `${subagentView.toolUseId}-prompt`, items: [{ id: `${subagentView.toolUseId}-prompt-t`, kind: "text", text: task.prompt }] }} /> : null}
          {task.result ? (
            <div className="epitaxy-markdown">
              <MarkdownContent text={task.result} />
            </div>
          ) : task.status === "failed" || task.status === "stopped" ? (
            <p className="text-body text-t6">No result — task {task.status}.</p>
          ) : (
            <div className="flex items-center h-h3"><OfficialSparkSpinner size="m" /></div>
          )}
        </div>
      </div>
    );
  }

  if (entries.length !== 0 || isRunning) {
    return (
      <div className="h-full overflow-y-auto px-p8 py-p6">
        <div className="epitaxy-chat-column flex flex-col gap-[var(--chat-turn-gap)]">
          {entries.map((entry, index) => entry.author === "user"
            ? <CodeUserEntryMessage entry={entry} key={entry.id} />
            : <CodeAssistantEntryMessage entry={entry} isStreaming={isRunning && index === entries.length - 1} key={entry.id} showAwaitingDot={isRunning && index === entries.length - 1} />)}
          <div className="flex items-center h-h3"><OfficialSparkSpinner isWorking={isRunning} size="m" /></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center h-full p-p8">
      <p className="text-body text-t6 text-pretty max-w-[40ch]">No activity yet.</p>
    </div>
  );
}

type OfficialTaskStatus = "completed" | "failed" | "running" | "stopped";

type OfficialBackgroundTask = {
  completedAt?: number;
  description: string;
  index: number;
  lastToolName?: string;
  prompt?: string;
  result?: string;
  startedAt?: number;
  status: OfficialTaskStatus;
  summary?: string;
  taskId: string;
  taskType?: string;
  toolUseId?: string;
  usage?: {
    durationMs: number;
    toolUses: number;
    totalTokens: number;
  };
  workflowProgress?: Array<{
    index: number;
    label: string;
    state: "done" | "error" | "pending" | "running" | "start";
    title?: string;
    type: "agent" | "workflow_phase";
  }>;
};

function OfficialTasksPane({ bridge, session, sessionRef }: { bridge: LocalSessionsBridge; session: SessionSummary | null; sessionRef: EpitaxySessionRef }) {
  const tasks = useMemo(() => parseOfficialTasks(session?.messages ?? []), [session?.messages]);
  const visibleTasks = useMemo(() => tasks.filter((task) => task.taskType !== "dream"), [tasks]);
  const running = useMemo(() => visibleTasks.filter((task) => task.status === "running").sort((left, right) => (left.startedAt ?? Infinity) - (right.startedAt ?? Infinity) || left.index - right.index), [visibleTasks]);
  const finished = useMemo(() => visibleTasks.filter((task) => task.status !== "running").sort((left, right) => (right.completedAt ?? -Infinity) - (left.completedAt ?? -Infinity) || left.index - right.index), [visibleTasks]);
  const stopTask = useCallback((taskId: string) => {
    void bridge.stopTask?.(sessionRef.id, taskId);
  }, [bridge, sessionRef.id]);
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        {running.length === 0 && finished.length === 0 ? <OfficialTasksEmpty /> : (
          <>
            <OfficialTaskSection heading="Running" onStop={bridge.stopTask ? stopTask : undefined} tasks={running} />
            <OfficialTaskSection heading="Completed" tasks={finished} />
          </>
        )}
      </div>
    </div>
  );
}

function OfficialTasksEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-g4 py-[64px] text-body text-t5">
      <Icon name="Blocks" size="lg" />
      <span>No tasks.</span>
    </div>
  );
}

const OfficialTaskSection = memo(function OfficialTaskSection({ heading, onStop, tasks }: { heading: string; onStop?: (taskId: string) => void; tasks: OfficialBackgroundTask[] }) {
  if (tasks.length === 0) return null;
  return (
    <motion.section className="flex flex-col gap-g3" layout="position" transition={officialTaskLayoutTransition}>
      <h3 className="text-footnote text-t6">{heading}</h3>
      {tasks.map((task) => (
        <motion.div key={task.taskId} layout="position" transition={officialTaskLayoutTransition}>
          <OfficialTaskCard onStop={onStop} task={task} />
        </motion.div>
      ))}
    </motion.section>
  );
});

const officialTaskLayoutTransition = { type: "spring", stiffness: 500, damping: 40 } as const;
const officialTaskSeparator = " · ";

const OfficialTaskCard = memo(function OfficialTaskCard({ onStop, task }: { onStop?: (taskId: string) => void; task: OfficialBackgroundTask }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const [expanded, setExpanded] = useState(false);
  const kind = officialTaskKind(task.taskType);
  const usage = task.usage ? [formatDuration(task.usage.durationMs), formatTokens(task.usage.totalTokens), `${task.usage.toolUses} ${task.usage.toolUses === 1 ? "tool use" : "tool uses"}`].join(officialTaskSeparator) : null;
  const canOpenSubagent = kind.kind === "agent" && Boolean(task.toolUseId && actions?.openSubagent);
  const canExpand = !canOpenSubagent && Boolean(task.summary || task.workflowProgress?.length);
  const canActivate = canOpenSubagent || canExpand;
  const canStop = task.status === "running" && Boolean(onStop);
  const activate = () => {
    if (canOpenSubagent && task.toolUseId && actions?.openSubagent) {
      actions.openSubagent({ description: task.description, toolUseId: task.toolUseId });
      return;
    }
    if (canExpand) setExpanded((value) => !value);
  };
  return (
    <div className={`group flex flex-col rounded-r6 bg-t1 ${canActivate ? "hover:bg-t2 focus-within:bg-t2" : ""}`}>
      <div className="flex items-center gap-g6 pl-p6 pr-p8 py-p6">
        <button
          type="button"
          onClick={activate}
          disabled={!canActivate}
          aria-expanded={canExpand ? expanded : undefined}
          aria-label={`Background task: ${task.description}`}
          className="flex-1 min-w-0 flex items-start gap-g6 text-left outline-none hide-focus-ring ring-focus disabled:cursor-default"
        >
          <span className="flex h-[var(--leading-body)] w-[20px] shrink-0 items-center justify-center">
            <OfficialTaskStatusIcon status={task.status} />
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-g4 pb-p2">
            <span className="min-w-0 flex items-center gap-g2 text-body text-t9">
              <span className="truncate">{task.description}</span>
              {canActivate ? <Icon name={canExpand && expanded ? "ChevronDownMedium" : "ChevronRightMedium"} size="sm" className="shrink-0 text-t6" /> : null}
            </span>
            <span className="text-footnote text-t6 truncate">
              <span className="text-t7">{kind.label}</span>
              <span>{officialTaskSeparator}</span>
              <OfficialTaskStatusLabel task={task} />
              {usage ? <><span>{officialTaskSeparator}</span>{usage}</> : null}
            </span>
          </span>
        </button>
        {canStop ? (
          <OfficialButton ariaLabel="Stop this task" className="min-w-[44px] justify-center" onClick={() => onStop?.(task.taskId)} size="small" variant="contained">Stop</OfficialButton>
        ) : null}
      </div>
      {expanded && canExpand ? (
        <div className="flex flex-col gap-g4 pl-[calc(var(--p6)+20px+var(--g6))] pr-p8 pb-[16px] select-text">
          {task.summary ? <div className="text-footnote text-t7 whitespace-pre-wrap break-words">{task.summary}</div> : null}
          {task.workflowProgress?.length ? <OfficialWorkflowProgress progress={task.workflowProgress} /> : null}
        </div>
      ) : null}
    </div>
  );
});

function OfficialTaskStatusIcon({ status }: { status: OfficialTaskStatus }) {
  if (status === "completed") return <Icon name="CircleCheck" size="md" className="text-t6" />;
  if (status === "failed") return <Icon name="XCrossCloseMedium" size="md" className="text-extended-pink" />;
  if (status === "stopped") return <Icon name="Hand4FingerStop" size="md" className="text-t6" />;
  return <OfficialSpinner />;
}

function OfficialTaskStatusLabel({ task }: { task: OfficialBackgroundTask }) {
  if (task.status === "running") return <>{task.lastToolName ? `Running ${task.lastToolName}` : "Running"}</>;
  if (task.status === "completed") return <>Completed</>;
  if (task.status === "failed") return <>Failed</>;
  return <>Stopped</>;
}

function OfficialWorkflowProgress({ progress }: { progress: NonNullable<OfficialBackgroundTask["workflowProgress"]> }) {
  return (
    <ul className="flex flex-col gap-g2">
      {progress.map((item) => item.type === "workflow_phase" ? (
        <li className="text-footnote text-t7 pt-p6 pb-p2 first:pt-0" key={`phase-${item.index}`}>{item.title}</li>
      ) : (
        <li className="-ml-[calc(12px+var(--g3))] flex items-center gap-g3 text-footnote text-t6" key={`agent-${item.index}`}>
          <span className="flex w-[12px] shrink-0 translate-y-px justify-center">
            {item.state === "done" ? <Icon name="CircleCheck" size="xs" /> : item.state === "error" ? <Icon name="XCrossCloseMedium" size="xs" className="text-extended-pink" /> : <OfficialSpinner animate={item.state !== "start"} size="m" />}
          </span>
          <span className="truncate">{item.label}</span>
        </li>
      ))}
    </ul>
  );
}

function OfficialPlanPane({ session }: { session: SessionSummary | null }) {
  const plan = useMemo(() => parseOfficialPlan(session?.messages ?? []), [session?.messages]);
  if (!plan.content) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g3 px-[32px] text-center text-t6">
        <Icon name="CheckList" size="lg" />
        <div className="text-body">No plan yet.</div>
        <div className="text-caption">Claude writes the plan here as it explores. Keep chatting.</div>
      </div>
    );
  }
  return (
    <div className="h-full select-text overflow-y-auto p-p8" style={{ scrollbarGutter: "stable" }}>
      <div className="epitaxy-markdown mx-auto max-w-[68ch]">
        <pre className="m-0 whitespace-pre-wrap break-words text-body text-t8 font-sans">{plan.content}</pre>
      </div>
    </div>
  );
}

function OfficialPreviewPane({ bridge, previewTarget, session, sessionRef }: { bridge: LocalSessionsBridge; previewTarget: OfficialPreviewTarget | null; session: SessionSummary | null; sessionRef: EpitaxySessionRef | null }) {
  const [selectedTarget, setSelectedTarget] = useState<OfficialPreviewTarget | null>(previewTarget);
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({ isLoading: false });

  useEffect(() => {
    setSelectedTarget(previewTarget);
  }, [previewTarget]);

  useEffect(() => {
    let alive = true;
    const target = selectedTarget;
    if (!target || !sessionRef) {
      setState({ isLoading: false });
      return () => { alive = false; };
    }
    setState({ isLoading: true });
    const load = isPreviewImagePath(target.path)
      ? bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, target.path).then((dataUrl) => ({ dataUrl: dataUrl ?? undefined }))
        : Promise.reject(new Error("Image preview is unavailable."))
      : readPreviewText(bridge, sessionRef.id, target.path).then((text) => ({ text }));
    void load.then((result) => {
      if (!alive) return;
      setState({ ...result, isLoading: false });
    }).catch((error) => {
      if (!alive) return;
      setState({ error: error instanceof Error ? error.message : String(error), isLoading: false });
    });
    return () => { alive = false; };
  }, [bridge, selectedTarget, sessionRef]);

  const pickFile = async () => {
    if (!sessionRef) return;
    const picked = await bridge.pickFileAtCwd?.(sessionRef.id) ?? await bridge.pickSessionFile?.(sessionRef.id);
    if (picked) setSelectedTarget({ path: picked });
  };

  if (!selectedTarget) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g8 px-p8 text-center">
        <img alt="" className="select-none" draggable={false} height={94} src="/assets/v1/clawd-laptop-official.gif" width={140} />
        <div role="status" className="flex items-center gap-g3 text-body text-t7">
          <OfficialSpinner />
          <span>{session ? "Run your dev server to inspect network requests, debug with logs, and see changes live." : "Run your dev server to inspect network requests, debug with logs, and see changes live."}</span>
        </div>
        {sessionRef && (bridge.pickFileAtCwd || bridge.pickSessionFile) ? <OfficialButton onClick={() => void pickFile()} variant="contained">Open preview file</OfficialButton> : null}
      </div>
    );
  }

  const title = selectedTarget.title ?? basename(selectedTarget.path) ?? selectedTarget.path;
  return (
    <div className="h-full min-w-0 flex flex-col bg-bg-000">
      <div className="flex items-center gap-g4 border-b border-border-300 px-p6 py-p4">
        <Icon name="NoteSquareLines" size="sm" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-body text-t8">{title}</div>
          <div className="truncate text-caption text-t5">{selectedTarget.path}</div>
        </div>
        <OfficialButton ariaLabel="Copy path" icon="CopySquareBehind" onClick={() => void navigator.clipboard?.writeText(selectedTarget.path)} />
        {bridge.openInEditor ? <OfficialButton ariaLabel="Open in editor" icon="Folder1Open" onClick={() => void bridge.openInEditor?.(selectedTarget.path)} /> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {state.isLoading ? (
          <div role="status" className="h-full flex items-center justify-center text-t5"><OfficialSpinner /><span className="sr-only">Loading preview</span></div>
        ) : state.error ? (
          <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">{state.error}</div>
        ) : state.dataUrl ? (
          <div className="flex min-h-full items-center justify-center p-p8">
            <img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
          </div>
        ) : isHtmlPreviewPath(selectedTarget.path) && state.text !== undefined ? (
          <iframe className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" srcDoc={state.text} title={title} />
        ) : (
          <pre className="m-0 min-w-max p-p8 text-code text-t8 leading-[18px] whitespace-pre-wrap">{state.text ?? ""}</pre>
        )}
      </div>
    </div>
  );
}

function OfficialFilePane({ bridge, fileView, sessionRef }: { bridge: LocalSessionsBridge; fileView: OfficialFileViewTarget | null; sessionRef: EpitaxySessionRef | null }) {
  const [state, setState] = useState<{ dataUrl?: string; error?: string; isLoading: boolean; text?: string }>({ isLoading: false });
  const [sourceMode, setSourceMode] = useState(false);
  const [copied, setCopied] = useState<"contents" | "path" | null>(null);
  const filePath = fileView?.path ?? "";
  const title = fileView?.title ?? basename(filePath) ?? filePath;
  const markdownPreview = isMarkdownPreviewPath(filePath) && !sourceMode && state.text !== undefined;

  useEffect(() => {
    let alive = true;
    if (!fileView || !sessionRef) {
      setState({ isLoading: false });
      return () => { alive = false; };
    }

    setState({ isLoading: true });
    const load = isPreviewImagePath(fileView.path)
      ? bridge.readSessionImageAsDataUrl
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, fileView.path).then((dataUrl) => ({ dataUrl: dataUrl ?? undefined }))
        : Promise.reject(new Error("Image preview is unavailable."))
      : readPreviewText(bridge, sessionRef.id, fileView.path).then((text) => ({ text }));
    void load.then((result) => {
      if (!alive) return;
      setState({ ...result, isLoading: false });
    }).catch((error) => {
      if (!alive) return;
      setState({ error: error instanceof Error ? error.message : String(error), isLoading: false });
    });
    return () => { alive = false; };
  }, [bridge, fileView, fileView?.scrollNonce, sessionRef]);

  const copyPath = () => {
    if (!filePath) return;
    void navigator.clipboard?.writeText(filePath).then(() => {
      setCopied("path");
      window.setTimeout(() => setCopied(null), 1200);
    }).catch(() => {});
  };
  const copyContents = () => {
    if (state.text === undefined) return;
    void navigator.clipboard?.writeText(state.text).then(() => {
      setCopied("contents");
      window.setTimeout(() => setCopied(null), 1200);
    }).catch(() => {});
  };

  if (!fileView) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-g5 px-p8 text-center text-body text-t6">
        <Icon name="NoteSquareLines" size="lg" />
        <div>Select a file from a tool result to view it here.</div>
      </div>
    );
  }

  return (
    <div className="h-full min-w-0 flex flex-col bg-bg-000">
      <div className="flex min-h-[36px] shrink-0 items-center gap-g3 border-b border-border-300 px-p5">
        <div className="min-w-0 flex-1">
          <div className="truncate text-body text-t8">{title}</div>
          <div className="truncate text-caption text-t5">{filePath}</div>
        </div>
        {isMarkdownPreviewPath(filePath) && state.text !== undefined ? (
          <OfficialButton
            ariaLabel={sourceMode ? "Show preview" : "Show source"}
            icon={sourceMode ? "Eye" : "Code"}
            onClick={() => setSourceMode((value) => !value)}
            pressed={sourceMode}
          />
        ) : null}
        <OfficialButton ariaLabel={copied === "contents" ? "Copied contents" : "Copy contents"} disabled={state.text === undefined} icon={copied === "contents" ? "CheckSelection" : "CopySquareBehind"} onClick={copyContents} />
        <OfficialButton ariaLabel={copied === "path" ? "Copied path" : "Copy path"} icon={copied === "path" ? "CheckSelection" : "Link"} onClick={copyPath} />
        {bridge.openInEditor ? <OfficialButton ariaLabel="Open in editor" icon="Folder1Open" onClick={() => void bridge.openInEditor?.(filePath, undefined, fileView.line)} /> : null}
      </div>
      <div className="min-h-0 flex-1 overflow-auto">
        {state.isLoading ? (
          <div role="status" className="h-full flex items-center justify-center gap-g3 text-t5"><OfficialSpinner /><span>Loading file…</span></div>
        ) : state.error ? (
          <div className="h-full flex items-center justify-center px-p8 text-center text-body text-extended-pink">{state.error}</div>
        ) : state.dataUrl ? (
          <div className="flex min-h-full items-center justify-center p-p8">
            <img alt={title} className="max-h-full max-w-full rounded-r4 object-contain" src={state.dataUrl} />
          </div>
        ) : markdownPreview ? (
          <div className="select-text px-[24px] py-[16px]">
            <div className="epitaxy-markdown max-w-[72ch]">
              <MarkdownContent text={state.text ?? ""} />
            </div>
          </div>
        ) : isHtmlPreviewPath(filePath) && state.text !== undefined ? (
          <iframe className="h-full w-full border-0 bg-white" sandbox="allow-scripts allow-same-origin" srcDoc={state.text} title={title} />
        ) : (
          <pre className="m-0 min-w-max select-text p-p6 font-mono text-code text-t8 leading-[18px] whitespace-pre-wrap">{state.text ?? ""}</pre>
        )}
      </div>
    </div>
  );
}

async function readPreviewText(bridge: LocalSessionsBridge, sessionId: string, filePath: string) {
  const sessionValue = await bridge.readSessionFile?.(sessionId, filePath).catch(() => null);
  const sessionText = previewTextFromBridgeValue(sessionValue);
  if (sessionText !== null) return sessionText;
  const localValue = await desktopBridge.FileSystem.readLocalFile?.(filePath).catch(() => null);
  const localText = previewTextFromBridgeValue(localValue);
  if (localText !== null) return localText;
  const cwdResult = await bridge.readFileAtCwd?.(sessionId, filePath);
  if (cwdResult?.ok === false) throw new Error(cwdResult.error ?? cwdResult.stderr ?? "Failed to read file");
  return cwdResult?.stdout ?? "";
}

function previewTextFromBridgeValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  const raw = asRecord(value);
  if (raw.tooLarge === true) throw new Error(`File is too large to preview (${numberValue(raw.size)} bytes).`);
  const text = stringValue(raw.stdout) ?? stringValue(raw.contents) ?? stringValue(raw.content) ?? stringValue(raw.text);
  return text ?? null;
}

function isPreviewImagePath(filePath: string) {
  return /\.(?:apng|avif|gif|jpe?g|png|svg|webp)$/i.test(filePath);
}

function isHtmlPreviewPath(filePath: string) {
  return /\.(?:html?|svg)$/i.test(filePath);
}

function isMarkdownPreviewPath(filePath: string) {
  return /\.(?:md|mdx|markdown)$/i.test(filePath);
}

type OfficialShellTerminalEntry = {
  closed: boolean;
  fitAddon: FitAddon;
  fitted: boolean;
  host: HTMLDivElement;
  pendingReplay?: string;
  ptyStarted: boolean;
  terminal: Terminal;
  transport: LocalSessionsBridge;
};

const officialShellTerminalCache = new Map<string, OfficialShellTerminalEntry>();
const officialShellSubscribedBridges = new WeakSet<LocalSessionsBridge>();
const officialShellTerminalCacheLimit = 16;

function ensureOfficialShellBridgeSubscription(bridge: LocalSessionsBridge) {
  if (officialShellSubscribedBridges.has(bridge)) return;
  officialShellSubscribedBridges.add(bridge);
  bridge.onShellPtyEvent?.((event) => {
    const entry = officialShellTerminalCache.get(event.sessionId);
    if (!entry) return;
    if (event.type === "shell_pty_data" && event.data) {
      if (entry.fitted) entry.terminal.write(event.data);
      else entry.pendingReplay = (entry.pendingReplay ?? "") + event.data;
      return;
    }
    if (event.type === "shell_pty_close") {
      entry.closed = true;
      entry.terminal.dispose();
      officialShellTerminalCache.delete(event.sessionId);
    }
  });
}

function disposeOfficialShellTerminal(ptyKey: string, stopPty = false) {
  const entry = officialShellTerminalCache.get(ptyKey);
  if (!entry) return;
  if (stopPty && entry.ptyStarted) void entry.transport.stopShellPty?.(ptyKey);
  entry.terminal.dispose();
  entry.host.remove();
  officialShellTerminalCache.delete(ptyKey);
}

function replayOfficialShellBuffer(entry: OfficialShellTerminalEntry, buffered: string | undefined) {
  if (buffered === undefined) return;
  entry.terminal.write(terminalReconnectReplay + buffered);
}

async function ensureOfficialShellTerminal(ptyKey: string, bridge: LocalSessionsBridge): Promise<OfficialShellTerminalEntry> {
  ensureOfficialShellBridgeSubscription(bridge);
  const cached = officialShellTerminalCache.get(ptyKey);
  if (cached && !cached.closed) {
    officialShellTerminalCache.delete(ptyKey);
    officialShellTerminalCache.set(ptyKey, cached);
    return cached;
  }
  if (cached) disposeOfficialShellTerminal(ptyKey);
  if (officialShellTerminalCache.size >= officialShellTerminalCacheLimit) {
    const oldestKey = officialShellTerminalCache.keys().next().value;
    if (oldestKey !== undefined) disposeOfficialShellTerminal(oldestKey, true);
  }

  const host = document.createElement("div");
  host.style.height = "100%";
  host.style.width = "100%";
  const terminal = new Terminal({
    cursorBlink: true,
    fontFamily: "\"SF Mono\", Menlo, Monaco, \"Courier New\", monospace",
    fontSize: 12,
    scrollback: 1000,
    theme: officialLightTerminalTheme,
  });
  terminal.attachCustomKeyEventHandler((event) => {
    if (event.type !== "keydown") return true;
    if (event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.code === "Backquote") return false;
    if (event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && (event.code === "BracketLeft" || event.code === "BracketRight")) {
      event.preventDefault();
      if (!event.repeat) {
        if (event.code === "BracketLeft") window.history.back();
        else window.history.forward();
      }
      return false;
    }
    if ((event.metaKey || (event.ctrlKey && event.shiftKey)) && event.code === "KeyC" && terminal.hasSelection()) {
      event.preventDefault();
      void navigator.clipboard.writeText(terminal.getSelection()).catch(() => {});
      return false;
    }
    return true;
  });
  const fitAddon = new FitAddon();
  terminal.loadAddon(fitAddon);
  terminal.open(host);
  try {
    const webglAddon = new WebglAddon();
    webglAddon.onContextLoss(() => webglAddon.dispose());
    terminal.loadAddon(webglAddon);
  } catch (error) {
    console.warn("WebGL terminal renderer unavailable, using DOM", error);
  }
  terminal.onData((data) => {
    void bridge.writeShellPty?.(ptyKey, data);
  });
  const entry: OfficialShellTerminalEntry = { closed: false, fitAddon, fitted: false, host, ptyStarted: false, terminal, transport: bridge };
  officialShellTerminalCache.set(ptyKey, entry);
  return entry;
}

function officialShellPtyError(error: string | undefined, ptyKey: string, sessionId: string) {
  return ptyKey !== sessionId && error === "Session not found"
    ? "Additional terminal tabs require a newer Claude desktop app. Restart Claude to update."
    : error ?? "Failed to start shell";
}

function OfficialShellPtyPane({ bridge, ptyKey, sessionRef }: { bridge: LocalSessionsBridge; ptyKey: string; sessionRef: EpitaxySessionRef }) {
  const [closed, setClosed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restartNonce, setRestartNonce] = useState(0);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const terminalRef = useRef<OfficialShellTerminalEntry | null>(null);

  useEffect(() => {
    let alive = true;
    let resizeFrame = 0;
    let resizeObserver: ResizeObserver | null = null;
    let selectionDisposable: { dispose: () => void } | undefined;
    setClosed(false);
    setError(null);
    hostRef.current?.replaceChildren();

    const closeUnsubscribe = bridge.onShellPtyEvent?.((event) => {
      if (event.sessionId === ptyKey && event.type === "shell_pty_close") setClosed(true);
    });

    const refitAndStart = () => {
      resizeFrame = 0;
      const entry = terminalRef.current;
      if (!alive || !entry || entry.closed || !hostRef.current || hostRef.current.offsetHeight === 0) return;
      try {
        entry.fitAddon.fit();
      } catch {
        return;
      }
      const { cols, rows } = entry.terminal;
      if (cols <= 0 || rows <= 0) return;
      entry.fitted = true;
      if (entry.ptyStarted) {
        void bridge.resizeShellPty?.(ptyKey, cols, rows);
        if (entry.pendingReplay !== undefined) {
          entry.terminal.write(entry.pendingReplay);
          entry.pendingReplay = undefined;
          entry.terminal.focus();
        }
        return;
      }
      entry.ptyStarted = true;
      void bridge.startShellPty?.(ptyKey, cols, rows).then((result) => {
        if (!alive) return;
        if (!result?.ok) {
          entry.ptyStarted = false;
          setError(officialShellPtyError(result?.error, ptyKey, sessionRef.id));
          return;
        }
        replayOfficialShellBuffer(entry, result.buffered);
        if (entry.pendingReplay !== undefined) {
          entry.terminal.write(entry.pendingReplay);
          entry.pendingReplay = undefined;
        }
        entry.terminal.focus();
      }).catch(() => {
        entry.ptyStarted = false;
        if (alive) setError("Failed to start shell");
      });
    };

    ensureOfficialShellTerminal(ptyKey, bridge).then((entry) => {
      if (!alive || !hostRef.current) return;
      terminalRef.current = entry;
      hostRef.current.replaceChildren(entry.host);
      setClosed(entry.closed);
      if (entry.closed) return;
      selectionDisposable = entry.terminal.onSelectionChange(() => {
        // Official keeps terminal selection live for contextual actions. The current pane
        // does not yet expose that action surface, but keeping this hook matches the
        // terminal lifecycle and avoids browser-level selection stealing focus.
      });
      resizeObserver = new ResizeObserver(() => {
        if (!resizeFrame) resizeFrame = requestAnimationFrame(refitAndStart);
      });
      resizeObserver.observe(hostRef.current);
      requestAnimationFrame(refitAndStart);
    }).catch((err) => {
      if (alive) setError(err instanceof Error ? err.message : "Failed to load terminal");
    });

    return () => {
      alive = false;
      closeUnsubscribe?.();
      if (resizeFrame) cancelAnimationFrame(resizeFrame);
      resizeObserver?.disconnect();
      selectionDisposable?.dispose();
      terminalRef.current?.host.remove();
      terminalRef.current = null;
    };
  }, [bridge, ptyKey, restartNonce, sessionRef.id]);

  const restartShell = useCallback(() => {
    disposeOfficialShellTerminal(ptyKey);
    setClosed(false);
    setError(null);
    setRestartNonce((value) => value + 1);
  }, [ptyKey]);

  const hidden = Boolean(error || closed);
  return (
    <div style={{ height: "100%", padding: "var(--p6)", backgroundColor: officialLightTerminalTheme.background }} className="relative w-full">
      <div
        ref={hostRef}
        className="h-full w-full [&_.xterm-viewport]:!bg-transparent [&_textarea]:[caret-color:transparent]"
        style={{ display: hidden ? "none" : undefined }}
        onMouseDown={() => terminalRef.current?.terminal.focus()}
      />
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center bg-bg-100 text-text-300">
          <p className="text-sm max-w-[320px] px-4 text-center text-balance">{error}</p>
        </div>
      ) : null}
      {!error && closed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-g3 bg-bg-100 text-text-400">
          <p className="text-body text-t6">Shell exited.</p>
          <button type="button" onClick={restartShell} className="rounded-md border-0.5 border-border-300 bg-bg-000 px-3 py-1.5 text-xs text-text-200 hover:bg-bg-200 transition-colors">
            Restart shell
          </button>
        </div>
      ) : null}
    </div>
  );
}

const terminalReconnectReplay = "\x1b[3J\x1b[2J\x1b[H\x1b[2m[shell reconnected — replaying buffered output]\x1b[0m\r\n";

const officialLightTerminalTheme = {
  background: "#ffffff",
  foreground: "#1a1a1a",
  cursor: "#0073e6",
  cursorAccent: "#ffffff",
  black: "#1a1a1a",
  red: "#ff3a30",
  green: "#1e9e3c",
  yellow: "#98801f",
  blue: "#0073e6",
  magenta: "#cd2054",
  cyan: "#8e6bd9",
  white: "#999999",
  brightBlack: "#666666",
  brightRed: "#ff5047",
  brightGreen: "#1e9e3c",
  brightYellow: "#98801f",
  brightBlue: "#0078f0",
  brightMagenta: "#cd2054",
  brightCyan: "#8e6bd9",
  brightWhite: "#d6d6d6",
};

const taskNotificationPattern = /<task-notification>([\s\S]*?)<\/task-notification>/g;
const taskIdPattern = /<task-id>([^<]+)<\/task-id>/;
const taskStatusPattern = /<status>([^<]+)<\/status>/;
const taskSummaryPattern = /<summary>([^<]+)<\/summary>/;
const taskResultPattern = /<result>([\s\S]*?)<\/result>/;
const taskToolUseIdPattern = /<tool-use-id>([^<]+)<\/tool-use-id>/;
const taskTypePattern = /<task-type>([^<]+)<\/task-type>/;
const taskDescriptionPattern = /^(Agent|Workflow|Background command|Monitor|Remote task) "(.+?)" (?:completed|failed|was|stopped|stream|script|appears)/;
const taskTypeFromNotification: Record<string, string> = {
  Agent: "local_agent",
  Workflow: "local_workflow",
  "Background command": "local_bash",
  Monitor: "local_bash",
  "Remote task": "remote_agent",
};

function parseOfficialTasks(messages: ChatMessage[]): OfficialBackgroundTask[] {
  const tasks = new Map<string, OfficialBackgroundTask>();
  const ensureTask = (taskId: string) => {
    let task = tasks.get(taskId);
    if (!task) {
      task = {
        description: taskId,
        index: tasks.size,
        status: "running",
        taskId,
      };
      tasks.set(taskId, task);
    }
    return task;
  };

  for (const message of messages) {
    const raw = asRecord(message.raw);
    if (raw.type === "user") {
      for (const notification of parseTaskNotifications(raw, message)) {
        const task = ensureTask(notification.taskId);
        task.status = notification.status;
        if (notification.summary) task.summary = notification.summary;
        if (notification.result) task.result = notification.result;
        if (notification.toolUseId) task.toolUseId ??= notification.toolUseId;
        if (notification.taskType) task.taskType ??= notification.taskType;
        if (notification.description && task.description === task.taskId) task.description = notification.description;
        if (task.completedAt === undefined && notification.status !== "running") task.completedAt = timestampFromRaw(raw, message);
      }
      continue;
    }

    if (!isOfficialTaskEvent(raw)) continue;
    const taskId = stringValue(raw.task_id) ?? stringValue(raw.taskId);
    if (!taskId) continue;
    const task = ensureTask(taskId);
    const timestamp = timestampFromRaw(raw, message);
    const toolUseId = stringValue(raw.tool_use_id) ?? stringValue(raw.toolUseId);
    if (toolUseId) task.toolUseId = toolUseId;

    switch (raw.subtype) {
      case "task_started":
        task.description = stringValue(raw.description) ?? task.description;
        task.taskType = stringValue(raw.task_type) ?? stringValue(raw.taskType) ?? task.taskType;
        task.prompt = stringValue(raw.prompt) ?? task.prompt;
        task.status = "running";
        if (task.startedAt === undefined) task.startedAt = timestamp;
        break;
      case "task_progress":
        if (task.startedAt === undefined) task.startedAt = timestamp;
        if (task.description === task.taskId) task.description = stringValue(raw.description) ?? task.description;
        task.usage = normalizeTaskUsage(raw.usage) ?? task.usage;
        task.lastToolName = stringValue(raw.last_tool_name) ?? stringValue(raw.lastToolName) ?? task.lastToolName;
        task.summary = stringValue(raw.summary) ?? task.summary;
        task.workflowProgress = normalizeWorkflowProgress(raw.workflow_progress) ?? normalizeWorkflowProgress(raw.workflowProgress) ?? task.workflowProgress;
        break;
      case "task_notification":
        task.status = normalizeTaskStatus(raw.status);
        if (task.completedAt === undefined) task.completedAt = timestamp;
        task.summary = stringValue(raw.summary) ?? task.summary;
        task.usage = normalizeTaskUsage(raw.usage) ?? task.usage;
        break;
    }
  }

  return Array.from(tasks.values());
}

function parseTaskNotifications(raw: Record<string, unknown>, message: ChatMessage) {
  const text = rawUserText(raw) || message.text;
  if (!text.includes("<task-notification>")) return [];
  const notifications: Array<{ description?: string; result?: string; status: OfficialTaskStatus; summary?: string; taskId: string; taskType?: string; toolUseId?: string }> = [];
  for (const match of text.matchAll(taskNotificationPattern)) {
    const body = match[1];
    const taskId = body.match(taskIdPattern)?.[1];
    const rawStatus = body.match(taskStatusPattern)?.[1];
    if (!taskId || !rawStatus) continue;
    const summary = decodeTaskNotificationText(body.match(taskSummaryPattern)?.[1]);
    const descriptionMatch = summary?.match(taskDescriptionPattern);
    notifications.push({
      description: descriptionMatch?.[2],
      result: decodeTaskNotificationText(body.match(taskResultPattern)?.[1])?.trim(),
      status: normalizeTaskStatus(rawStatus),
      summary,
      taskId,
      taskType: body.match(taskTypePattern)?.[1] ?? (descriptionMatch ? taskTypeFromNotification[descriptionMatch[1]] : undefined),
      toolUseId: body.match(taskToolUseIdPattern)?.[1],
    });
  }
  return notifications;
}

function parseOfficialPlan(messages: ChatMessage[]) {
  let content: string | undefined;
  let path: string | undefined;
  for (const message of messages) {
    const raw = asRecord(message.raw);
    if (raw.type !== "assistant" || raw.parent_tool_use_id || raw.parentToolUseId) continue;
    const items = rawMessageContent(raw);
    for (const item of items) {
      const record = asRecord(item);
      if (record.type !== "tool_use" && record.kind !== "tool_use") continue;
      const name = stringValue(record.name) ?? stringValue(record.tool_name);
      const input = asRecord(record.input);
      if (name === "ExitPlanMode") {
        content = stringValue(input.plan) ?? content;
        continue;
      }
      const filePath = stringValue(input.file_path) ?? stringValue(input.filePath);
      if (filePath && filePath.includes("/.claude/plans/") && (path ??= filePath) === filePath) {
        if (name === "Write") {
          content = stringValue(input.content) ?? content;
        } else if (name === "Edit" && content !== undefined) {
          content = applyPlanEdit(content, input);
        } else if (name === "MultiEdit" && Array.isArray(input.edits) && content !== undefined) {
          for (const edit of input.edits) content = applyPlanEdit(content, asRecord(edit));
        }
      }
    }
  }
  return { content, path };
}

function resolvePlanOpenPath(planPath: string, session: SessionSummary | null) {
  if (/^(\/|~\/|[A-Za-z]:[\\/])/.test(planPath)) return planPath;
  const cwd = session?.cwd;
  if (!cwd) return planPath;
  return `${cwd.replace(/[\\/]$/, "")}/${planPath.replace(/^\.?[\\/]/, "")}`;
}

function applyPlanEdit(content: string, edit: Record<string, unknown>) {
  const oldString = stringValue(edit.old_string) ?? stringValue(edit.oldString);
  const newString = stringValue(edit.new_string) ?? stringValue(edit.newString);
  if (oldString === undefined || newString === undefined) return content;
  if (edit.replace_all === true || edit.replaceAll === true) return content.split(oldString).join(newString);
  const index = content.indexOf(oldString);
  if (index < 0) return content;
  return content.slice(0, index) + newString + content.slice(index + oldString.length);
}

function isOfficialTaskEvent(raw: Record<string, unknown>) {
  return raw.type === "system" && (raw.subtype === "task_started" || raw.subtype === "task_progress" || raw.subtype === "task_notification");
}

function officialTaskKind(taskType?: string) {
  switch (taskType) {
    case "local_agent":
    case "in_process_teammate":
      return { kind: "agent", label: "Agent" };
    case "remote_agent":
      return { kind: "remote_agent", label: "Remote agent" };
    case "local_bash":
      return { kind: "bash", label: "Bash" };
    case "local_workflow":
      return { kind: "workflow", label: "Workflow" };
    case "monitor_mcp":
      return { kind: "monitor", label: "Monitor" };
    case "dream":
      return { kind: "dream", label: "Dream" };
    default:
      return { kind: "task", label: taskType ?? "Task" };
  }
}

function rawMessageContent(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  return Array.isArray(content) ? content : [];
}

function rawUserText(raw: Record<string, unknown>) {
  const message = asRecord(raw.message);
  const content = raw.content ?? message.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content.map((item) => stringValue(asRecord(item).text) ?? "").join("\n");
  }
  return "";
}

function toolResultText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map(toolResultText).filter(Boolean).join("\n");
  const record = asRecord(content);
  return stringValue(record.text) ?? stringValue(record.content) ?? (Object.keys(record).length ? JSON.stringify(record, null, 2) : "");
}

function normalizeTaskStatus(value: unknown): OfficialTaskStatus {
  if (value === "running") return "running";
  if (value === "failed") return "failed";
  if (value === "stopped" || value === "killed") return "stopped";
  return "completed";
}

function normalizeTaskUsage(value: unknown): OfficialBackgroundTask["usage"] | undefined {
  const raw = asRecord(value);
  const totalTokens = numberValue(raw.total_tokens ?? raw.totalTokens);
  const toolUses = numberValue(raw.tool_uses ?? raw.toolUses);
  const durationMs = numberValue(raw.duration_ms ?? raw.durationMs);
  if (!totalTokens && !toolUses && !durationMs) return undefined;
  return { durationMs, toolUses, totalTokens };
}

function normalizeWorkflowProgress(value: unknown): OfficialBackgroundTask["workflowProgress"] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((item, index) => {
    const raw = asRecord(item);
    const type = raw.type === "workflow_phase" ? "workflow_phase" : "agent";
    return {
      index: numberValue(raw.index) || index,
      label: stringValue(raw.label) ?? stringValue(raw.title) ?? "",
      state: raw.state === "done" || raw.state === "error" || raw.state === "pending" || raw.state === "running" || raw.state === "start" ? raw.state : "pending",
      title: stringValue(raw.title),
      type,
    };
  });
}

function timestampFromRaw(raw: Record<string, unknown>, fallback?: ChatMessage) {
  const value = stringValue(raw.timestamp) ?? stringValue(raw.createdAt) ?? fallback?.createdAt;
  const parsed = value ? Date.parse(value) : NaN;
  return Number.isNaN(parsed) ? undefined : parsed;
}

function decodeTaskNotificationText(value?: string) {
  return value?.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

function formatDuration(durationMs: number) {
  if (!durationMs) return "0s";
  if (durationMs < 60_000) return `${Math.max(1, Math.round(durationMs / 1000))}s`;
  const minutes = Math.floor(durationMs / 60_000);
  const seconds = Math.round((durationMs % 60_000) / 1000);
  return seconds ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatTokens(tokens: number) {
  return `${tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens)} tokens`;
}

function OfficialSpinner({ animate = true, className = "", inheritColor = false, size = "m" }: { animate?: boolean; className?: string; inheritColor?: boolean; size?: "s" | "m" | "l" }) {
  const config = size === "s" ? { box: 12, stroke: 1.5 } : size === "l" ? { box: 20, stroke: 2 } : { box: 16, stroke: 1.75 };
  const color = inheritColor ? "currentColor" : "var(--cds-text-muted, var(--t6))";
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${config.stroke}px), #000 calc(100% - ${config.stroke - 0.5}px))`;
  return (
    <span data-cds="Spinner" className={`relative inline-block shrink-0 align-middle ${className}`} style={{ height: config.box, width: config.box }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: `${config.stroke}px solid var(--cds-border, var(--t2))` }} />
      <span className={`absolute inset-0 rounded-full ${animate ? "animate-[spin_2s_linear_infinite]" : ""}`} style={{ background: `conic-gradient(transparent 40%, ${color})`, WebkitMask: mask, mask }} />
    </span>
  );
}

function OfficialSparkSpinner({ className = "", isWorking = true, size = "m" }: { className?: string; isWorking?: boolean; size?: "s" | "m" | "l" }) {
  const box = size === "s" ? 12 : size === "l" ? 20 : 16;
  return (
    <span className={`inline-block overflow-hidden shrink-0 ${className}`} style={{ width: box, height: box, color: "var(--accent-brand)" }} aria-hidden="true">
      <span
        className={`block ${isWorking ? "epitaxy-spark-working" : ""}`}
        style={{
          width: box,
          height: 84 * box,
          background: "currentColor",
          WebkitMaskImage: `url("${officialSparkMaskPath}")`,
          maskImage: `url("${officialSparkMaskPath}")`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          "--spark-frames": 84,
          "--spark-duration": "5040ms",
          transform: `translateY(-${400 / 84}%)`,
        } as CSSProperties}
      />
    </span>
  );
}

function OfficialWorkingStatus({ isWorking, sessionId: _sessionId, startedAt, tokenEstimate = 0 }: { isWorking: boolean; sessionId?: string; startedAt?: number | null; tokenEstimate?: number }) {
  const startedAtRef = useRef(startedAt ?? Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isWorking) {
      setElapsedSeconds(0);
      startedAtRef.current = startedAt ?? Date.now();
      return undefined;
    }
    startedAtRef.current = startedAt ?? Date.now();
    setElapsedSeconds(0);
    const update = () => setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAtRef.current) / 1000)));
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [isWorking, startedAt]);

  const showMeta = isWorking && elapsedSeconds >= 2;
  const showTokens = showMeta && tokenEstimate > 0;
  return (
    <div className="flex items-center gap-[16px] h-h3">
      <OfficialSparkSpinner isWorking={isWorking} size="m" />
      <div className={`flex items-center text-footnote text-assistant-secondary tabular-nums shrink-0 transition-opacity ${showMeta && isWorking ? "opacity-100" : "opacity-0"}`}>
        {formatElapsedSeconds(elapsedSeconds)}
        {showTokens ? (
          <>
            {" · "}
            <Icon name="ArrowDown" size="xs" />
            {formatGeneratedTokenCount(tokenEstimate)} tokens
          </>
        ) : null}
      </div>
    </div>
  );
}

function formatElapsedSeconds(seconds: number) {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  return remaining ? `${minutes}m ${remaining}s` : `${minutes}m`;
}

function formatGeneratedTokenCount(tokens: number) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

function renderTranscriptBody({ entries, error, initialSessionId, isLoading, isResponding, isSessionNotFound, landingBody, onScrollState, pendingTurnStartedAt, ref, reload, scrollRef, session, streamTokenEstimate, tasks, transcriptMode }: {
  entries: TranscriptEntry[];
  error: Error | null;
  initialSessionId?: string;
  isLoading: boolean;
  isResponding: boolean;
  isSessionNotFound: boolean;
  landingBody?: ReactNode;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  pendingTurnStartedAt?: number | null;
  ref: Ref<OfficialTranscriptHandle>;
  reload: () => Promise<void>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  session: SessionSummary | null;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
}) {
  if (isSessionNotFound) return <SessionNotFound onBack={reload} />;
  if (error && entries.length === 0) return <SessionError error={error} onRetry={reload} />;
  if (!initialSessionId) return <div className="h-full overflow-y-auto overflow-x-hidden">{landingBody ?? null}</div>;
  const transcriptKey = `${initialSessionId}:messages`;
  if (isLoading && entries.length === 0 && !session) {
    return (
      <div role="status" className="h-full flex items-center justify-center text-t5">
        <OfficialSparkSpinner isWorking size="l" />
        <span className="sr-only">Loading conversation</span>
      </div>
    );
  }
  if (entries.length === 0 && !isResponding) return <div className="h-full flex items-center justify-center text-body text-t5">No messages yet.</div>;
  return <Transcript key={transcriptKey} entries={entries} isAwaitingReply={officialIsAwaitingReply(session, isResponding)} isResponding={isResponding} onScrollState={onScrollState} pendingTurnStartedAt={pendingTurnStartedAt} ref={ref} restoreKey={transcriptKey} scrollRef={scrollRef} sessionId={initialSessionId} streamTokenEstimate={streamTokenEstimate} tasks={tasks} transcriptMode={transcriptMode} />;
}

function officialIsAwaitingReply(session: SessionSummary | null, isResponding: boolean) {
  if (isResponding) return false;
  if ((session?.pendingToolPermissions?.length ?? 0) > 0) return false;
  return officialIsBlockedPostTurnCategory(session?.postTurnSummary?.statusCategory);
}

function officialIsBlockedPostTurnCategory(category?: string) {
  return category === "blocked" || category === "need_input" || category === "failed";
}

type TranscriptRow =
  | { entry: TranscriptEntry; entryIdx: number; id: string; kind: "assistant" | "user" }
  | { id: string; kind: "loader" }
  | { id: string; kind: "running-tasks" };

type OfficialTranscriptRestore = {
  anchorKey?: string;
  anchorOffsetPx: number;
  isPinned: boolean;
  measurements: VirtualItem[];
};

const officialTranscriptScrollRestores = new Map<string, OfficialTranscriptRestore>();

type TranscriptProps = {
  entries: TranscriptEntry[];
  isAwaitingReply: boolean;
  isResponding: boolean;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  pendingTurnStartedAt?: number | null;
  restoreKey?: string;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  sessionId?: string;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
};

type CodeUserChapter = {
  afterId: string;
  id: string;
  title: string;
};

const emptyCodeUserChaptersByAfterId = new Map<string, CodeUserChapter[]>();

const Transcript = forwardRef<OfficialTranscriptHandle, TranscriptProps>(function Transcript({ entries, isAwaitingReply, isResponding, onScrollState, pendingTurnStartedAt, restoreKey, scrollRef, sessionId, streamTokenEstimate, tasks, transcriptMode }, ref) {
  const rowsRef = useRef<TranscriptRow[]>([]);
  const initialCount = useRef(entries.length);
  const [userChapters, setUserChapters] = useState<CodeUserChapter[]>([]);
  const rows = useMemo(() => buildTranscriptRows(entries), [entries]);
  const userChaptersByAfterId = useMemo(() => groupCodeUserChaptersByAfterId(userChapters), [userChapters]);
  const lastEntryIdx = entries.length - 1;
  const lastTextLength = entries.at(-1)?.items.flatMap((item) => item.kind === "text" ? [item.text] : []).join("\n").length ?? 0;
  const officialVirtualizer = useOfficialTranscriptVirtualizer({
    estimateSize: estimateTranscriptRowSize,
    getKey: (row) => row.id,
    items: rows,
    overscan: 6,
    paddingEnd: 48,
    paddingStart: 48,
    restoreKey,
    useFlushSync: false,
  });
  const virtualItems = officialVirtualizer.virtualItems;
  const translateY = virtualItems[0]?.start ?? 0;

  useLayoutEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useLayoutEffect(() => {
    scrollRef.current = officialVirtualizer.scrollRef.current;
    return () => {
      scrollRef.current = null;
    };
  }, [officialVirtualizer.scrollRef, scrollRef]);

  useLayoutEffect(() => {
    const node = officialVirtualizer.scrollRef.current;
    const sizer = officialVirtualizer.sizerRef.current;
    if (!node) return undefined;
    const updateScrollState = () => {
      if (node.offsetParent === null) return;
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      onScrollState({ showScrollButton: distanceFromBottom > 200, showBottomFade: distanceFromBottom > 8 });
    };
    node.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    if (sizer) observer.observe(sizer);
    observer.observe(node);
    updateScrollState();
    return () => {
      node.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
      onScrollState({ showScrollButton: false, showBottomFade: false });
    };
  }, [officialVirtualizer.scrollRef, officialVirtualizer.sizerRef, onScrollState]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior) => {
      officialVirtualizer.setPinned(true);
      const node = officialVirtualizer.scrollRef.current;
      if (node) scrollElementToBottom(node, behavior);
    },
    scrollToEntry: (entryId) => {
      const index = rowsRef.current.findIndex((row) => (row.kind === "user" || row.kind === "assistant") && row.entry.id === entryId);
      if (index >= 0) officialVirtualizer.scrollToIndex(index, "start");
    },
  }), [officialVirtualizer]);

  const unpinTranscript = useCallback(() => {
    officialVirtualizer.setPinned(false);
  }, [officialVirtualizer]);
  const unpinTranscriptFromKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (target instanceof HTMLElement && !target.matches('input,textarea,[contenteditable="true"]')) {
      officialVirtualizer.setPinned(false);
    }
  }, [officialVirtualizer]);
  const pinUserChapter = useCallback((afterId: string, text: string) => {
    setUserChapters((current) => {
      if (current.some((chapter) => chapter.afterId === afterId)) return current;
      return [...current, {
        afterId,
        id: `chapter-${afterId}`,
        title: officialChapterTitleFromText(text),
      }];
    });
  }, []);
  const unpinUserChapters = useCallback((afterId: string) => {
    setUserChapters((current) => current.filter((chapter) => chapter.afterId !== afterId));
  }, []);

  return (
    <div ref={officialVirtualizer.scrollRef} data-testid="epitaxy-virtual-transcript" className="h-full overflow-y-auto overflow-x-hidden [contain:strict]">
      <div ref={officialVirtualizer.sizerRef} className="relative epitaxy-chat-column" style={{ height: officialVirtualizer.sizerHeight }}>
        <div onPointerDownCapture={unpinTranscript} onKeyDownCapture={unpinTranscriptFromKeyboard} className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${translateY}px)` }}>
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            return (
              <div data-index={virtualRow.index} key={virtualRow.key} ref={officialVirtualizer.measureElement}>
                <div className={virtualRow.index < rows.length - 1 ? "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0" : "epitaxy-chat-size"}>
                  <TranscriptRowContent initialCount={initialCount.current} isAwaitingReply={isAwaitingReply} isResponding={isResponding} lastEntryIdx={lastEntryIdx} onPinUserChapter={pinUserChapter} onUnpinUserChapters={unpinUserChapters} pendingTurnStartedAt={pendingTurnStartedAt} row={row} sessionId={sessionId} streamTokenEstimate={streamTokenEstimate} tasks={tasks} transcriptMode={transcriptMode} userChaptersByAfterId={userChaptersByAfterId} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function groupCodeUserChaptersByAfterId(chapters: CodeUserChapter[]) {
  const grouped = new Map<string, CodeUserChapter[]>();
  for (const chapter of chapters) {
    const existing = grouped.get(chapter.afterId);
    if (existing) existing.push(chapter);
    else grouped.set(chapter.afterId, [chapter]);
  }
  return grouped;
}

function officialChapterTitleFromText(text: string) {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0)?.trim() ?? text.trim();
  const title = firstLine.slice(0, 40);
  return firstLine.length > 40 ? `${title}…` : title || "Chapter";
}

function useOfficialTranscriptVirtualizer<TItem>({
  estimateSize,
  getKey,
  items,
  nearTopThresholdPx = 400,
  onAnchorNotFound,
  onNearTop,
  overscan = 6,
  paddingEnd,
  paddingStart,
  restoreKey,
  useFlushSync,
}: {
  estimateSize: (item: TItem, index: number) => number;
  getKey: (item: TItem) => string;
  items: TItem[];
  nearTopThresholdPx?: number;
  onAnchorNotFound?: () => void;
  onNearTop?: () => void;
  overscan?: number;
  paddingEnd?: number;
  paddingStart?: number;
  restoreKey?: string;
  useFlushSync?: boolean;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const itemCount = items.length;
  const restoreRef = useRef<OfficialTranscriptRestore | undefined | null>(null);
  if (restoreRef.current === null) {
    restoreRef.current = restoreKey !== undefined ? officialTranscriptScrollRestores.get(restoreKey) : undefined;
  }

  const pinnedRef = useRef(restoreRef.current?.isPinned ?? true);
  const initialOffsetRef = useRef<number | undefined>(undefined);
  if (initialOffsetRef.current === undefined) {
    initialOffsetRef.current = pinnedRef.current
      ? (paddingStart ?? 0) + items.reduce((total, item, index) => total + estimateSize(item, index), 0) + (paddingEnd ?? 0)
      : 0;
  }

  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const onNearTopRef = useRef(onNearTop);
  onNearTopRef.current = onNearTop;
  const onAnchorNotFoundRef = useRef(onAnchorNotFound);
  onAnchorNotFoundRef.current = onAnchorNotFound;

  const virtualizer = useVirtualizer({
    count: itemCount,
    estimateSize: (index) => estimateSize(itemsRef.current[index], index),
    getItemKey: (index) => getKeyRef.current(itemsRef.current[index]),
    getScrollElement: () => scrollRef.current,
    initialMeasurementsCache: restoreRef.current?.measurements,
    initialOffset: initialOffsetRef.current,
    overscan,
    paddingEnd,
    paddingStart,
    useFlushSync,
  });
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) => !pinnedRef.current && item.end <= (instance.scrollOffset ?? 0);

  const totalSize = virtualizer.getTotalSize();
  const isScrolling = virtualizer.isScrolling;
  const lastScrollTopRef = useRef(0);
  const lastTotalSizeRef = useRef(0);
  const programmaticScrollTopRef = useRef(-1);
  const pendingAnchorIndexRef = useRef<number | null>(null);
  const pendingAnchorKeyRef = useRef<string | null>(null);
  const anchorRestoredThisPassRef = useRef(false);
  const sizerTransformOffsetRef = useRef(0);

  const adjustScrollBy = useCallback((delta: number, node: HTMLElement) => {
    if (virtualizer.isScrolling) {
      sizerTransformOffsetRef.current += delta;
      const sizer = sizerRef.current;
      if (sizer) sizer.style.transform = `translateY(${-sizerTransformOffsetRef.current}px)`;
      return;
    }
    node.scrollTop += delta;
    lastScrollTopRef.current = node.scrollTop;
  }, [virtualizer]);

  const scrollToVirtualOffset = useCallback((node: HTMLElement, offset: number) => {
    virtualizer.scrollToOffset(offset);
    node.scrollTop = offset;
  }, [virtualizer]);

  const updatePinnedFromScroll = useCallback((node: HTMLElement) => {
    const nextTotalSize = virtualizer.getTotalSize();
    const nextScrollTop = node.scrollTop + sizerTransformOffsetRef.current;
    const scrollDelta = lastScrollTopRef.current - nextScrollTop;
    const shrinkDelta = Math.max(0, lastTotalSizeRef.current - nextTotalSize);
    lastScrollTopRef.current = nextScrollTop;
    lastTotalSizeRef.current = nextTotalSize;
    if (Math.abs(scrollDelta) > shrinkDelta + 8) {
      pendingAnchorIndexRef.current = null;
      pendingAnchorKeyRef.current = null;
    }
    const scrolledUp = scrollDelta > shrinkDelta + 1;
    if (nextTotalSize - nextScrollTop - node.clientHeight < 8 && !scrolledUp) {
      pinnedRef.current = true;
    } else if (scrolledUp) {
      pinnedRef.current = false;
    }
    const firstStart = virtualizer.measurementsCache[0]?.start ?? 0;
    if (!pinnedRef.current && nextScrollTop < firstStart + nearTopThresholdPx) onNearTopRef.current?.();
  }, [nearTopThresholdPx, virtualizer]);

  const initializedRef = useRef(false);
  const anchorWaitCountRef = useRef(0);
  useLayoutEffect(() => {
    anchorRestoredThisPassRef.current = false;
    if (itemCount === 0) return;
    const node = scrollRef.current;
    const setPendingAnchor = (key: string) => {
      const index = itemsRef.current.findIndex((item) => getKeyRef.current(item) === key);
      if (index < 0) return false;
      pendingAnchorIndexRef.current = index;
      pendingAnchorKeyRef.current = null;
      pinnedRef.current = false;
      anchorRestoredThisPassRef.current = true;
      return true;
    };

    if (initializedRef.current) {
      if (pendingAnchorKeyRef.current !== null && itemCount > anchorWaitCountRef.current) {
        anchorWaitCountRef.current = itemCount;
        if (!setPendingAnchor(pendingAnchorKeyRef.current)) onAnchorNotFoundRef.current?.();
      }
    } else {
      initializedRef.current = true;
      const anchorKey = restoreRef.current?.anchorKey;
      if (!pinnedRef.current) {
        if (anchorKey === undefined || setPendingAnchor(anchorKey)) {
          if (anchorKey === undefined) pinnedRef.current = true;
        } else {
          pendingAnchorKeyRef.current = anchorKey;
          anchorWaitCountRef.current = itemCount;
          pinnedRef.current = true;
          onAnchorNotFoundRef.current?.();
        }
      }
    }

    if (pendingAnchorIndexRef.current !== null && node) {
      if (isScrolling && node.scrollTop !== programmaticScrollTopRef.current) return;
      const measurement = virtualizer.measurementsCache[pendingAnchorIndexRef.current];
      if (measurement) {
        const anchorOffset = restoreRef.current?.anchorOffsetPx ?? 0;
        const nextScrollTop = measurement.start + anchorOffset;
        const scrollOffset = virtualizer.scrollOffset;
        if (scrollOffset !== null && Math.abs(scrollOffset - nextScrollTop) < 1) {
          pendingAnchorIndexRef.current = null;
          return;
        }
        const nextTotalSize = virtualizer.getTotalSize();
        if (sizerRef.current) {
          const viewportHeight = virtualizer.scrollRect?.height ?? 0;
          sizerRef.current.style.height = `${Math.max(nextTotalSize, viewportHeight)}px`;
        }
        scrollToVirtualOffset(node, nextScrollTop);
        programmaticScrollTopRef.current = node.scrollTop;
        lastScrollTopRef.current = node.scrollTop;
        lastTotalSizeRef.current = nextTotalSize;
      }
      return;
    }

    if (!pinnedRef.current || !node) return;
    if (isScrolling && node.scrollTop !== programmaticScrollTopRef.current) return;
    const nextTotalSize = virtualizer.getTotalSize();
    if (sizerRef.current) {
      const viewportHeight = virtualizer.scrollRect?.height ?? 0;
      sizerRef.current.style.height = `${Math.max(nextTotalSize, viewportHeight)}px`;
    }
    scrollToVirtualOffset(node, nextTotalSize);
    programmaticScrollTopRef.current = node.scrollTop;
    lastScrollTopRef.current = node.scrollTop;
    lastTotalSizeRef.current = nextTotalSize;
    if (nextTotalSize <= (virtualizer.scrollRect?.height ?? 0)) onNearTopRef.current?.();
  }, [itemCount, totalSize, isScrolling, scrollToVirtualOffset, updatePinnedFromScroll, virtualizer]);

  const firstKeyRef = useRef<string | null>(null);
  const previousTotalSizeRef = useRef(0);
  const adjustedForPrependRef = useRef(false);
  useLayoutEffect(() => {
    const firstKey = itemCount > 0 ? getKeyRef.current(itemsRef.current[0]) : null;
    const previousFirstKey = firstKeyRef.current;
    firstKeyRef.current = firstKey;
    const sizeDelta = totalSize - previousTotalSizeRef.current;
    previousTotalSizeRef.current = totalSize;
    adjustedForPrependRef.current = false;
    if (previousFirstKey === null || firstKey === previousFirstKey) return;
    if (pinnedRef.current) return;
    if (anchorRestoredThisPassRef.current) return;
    if (pendingAnchorIndexRef.current !== null) {
      const previousIndex = itemsRef.current.findIndex((item) => getKeyRef.current(item) === previousFirstKey);
      if (previousIndex > 0) pendingAnchorIndexRef.current += previousIndex;
    }
    const node = scrollRef.current;
    if (node && sizeDelta !== 0) {
      adjustedForPrependRef.current = true;
      adjustScrollBy(sizeDelta, node);
      lastTotalSizeRef.current = totalSize;
    }
  }, [adjustScrollBy, itemCount, totalSize]);

  const paddingStartRef = useRef(paddingStart ?? 0);
  useLayoutEffect(() => {
    const previousPaddingStart = paddingStartRef.current;
    const nextPaddingStart = paddingStart ?? 0;
    paddingStartRef.current = nextPaddingStart;
    if (nextPaddingStart === previousPaddingStart) return;
    if (pinnedRef.current) return;
    if (pendingAnchorIndexRef.current !== null) return;
    if (adjustedForPrependRef.current) return;
    const node = scrollRef.current;
    if (node) adjustScrollBy(nextPaddingStart - previousPaddingStart, node);
  }, [adjustScrollBy, paddingStart]);

  useLayoutEffect(() => {
    if (isScrolling) return;
    const offset = sizerTransformOffsetRef.current;
    if (offset === 0) return;
    const node = scrollRef.current;
    const sizer = sizerRef.current;
    if (!node || !sizer) return;
    sizerTransformOffsetRef.current = 0;
    sizer.style.transform = "";
    node.scrollTop += offset;
    lastScrollTopRef.current = node.scrollTop;
  }, [isScrolling]);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const handler = () => updatePinnedFromScroll(node);
    node.addEventListener("scroll", handler, { passive: true });
    return () => node.removeEventListener("scroll", handler);
  }, [updatePinnedFromScroll]);

  const latestRestoreKeyRef = useRef(restoreKey);
  latestRestoreKeyRef.current = restoreKey;
  useEffect(() => () => {
    const key = latestRestoreKeyRef.current;
    if (key === undefined) return;
    if (pendingAnchorKeyRef.current !== null && restoreRef.current) {
      officialTranscriptScrollRestores.set(key, restoreRef.current);
      return;
    }
    const scrollOffset = (virtualizer.scrollOffset ?? 0) + sizerTransformOffsetRef.current;
    const measurements = virtualizer.measurementsCache;
    const anchor = measurements.find((measurement) => measurement.end > scrollOffset);
    officialTranscriptScrollRestores.set(key, {
      anchorKey: anchor ? String(anchor.key) : undefined,
      anchorOffsetPx: anchor ? scrollOffset - anchor.start : 0,
      isPinned: pinnedRef.current,
      measurements,
    });
  }, [virtualizer]);

  const viewportHeight = virtualizer.scrollRect?.height ?? 0;
  const anchorOffset = Math.max(0, viewportHeight - totalSize);
  const resizeObserverState = useMemo(() => {
    if (typeof ResizeObserver === "undefined") return null;
    const observed = new Set<Element>();
    return {
      observed,
      ro: new ResizeObserver((entries) => {
        for (const entry of entries) virtualizer.measureElement(entry.target as HTMLElement);
        if (!pinnedRef.current) return;
        const node = scrollRef.current;
        const sizer = sizerRef.current;
        if (!node || !sizer) return;
        if (virtualizer.isScrolling && node.scrollTop !== programmaticScrollTopRef.current) return;
        const nextTotalSize = virtualizer.getTotalSize();
        if (nextTotalSize === lastTotalSizeRef.current) return;
        const nextViewportHeight = virtualizer.scrollRect?.height ?? 0;
        sizer.style.height = `${Math.max(nextTotalSize, nextViewportHeight)}px`;
        scrollToVirtualOffset(node, nextTotalSize);
        programmaticScrollTopRef.current = node.scrollTop;
        lastScrollTopRef.current = node.scrollTop;
        lastTotalSizeRef.current = nextTotalSize;
      }),
    };
  }, [virtualizer]);

  useEffect(() => {
    if (!resizeObserverState) return undefined;
    for (const element of resizeObserverState.observed) resizeObserverState.ro.observe(element, { box: "border-box" });
    return () => resizeObserverState.ro.disconnect();
  }, [resizeObserverState]);

  const measureElement = useCallback((node: HTMLElement | null) => {
    virtualizer.measureElement(node);
    if (!resizeObserverState) return;
    if (node) {
      if (!resizeObserverState.observed.has(node)) {
        resizeObserverState.observed.add(node);
        resizeObserverState.ro.observe(node, { box: "border-box" });
      }
      return;
    }
    for (const element of resizeObserverState.observed) {
      if (!element.isConnected) {
        resizeObserverState.ro.unobserve(element);
        resizeObserverState.observed.delete(element);
      }
    }
  }, [resizeObserverState, virtualizer]);

  const scrollToIndex = useCallback((index: number, align: "start" | "center" | "end" | "auto" = "start") => {
    pinnedRef.current = false;
    pendingAnchorIndexRef.current = null;
    virtualizer.scrollToIndex(index, { align });
  }, [virtualizer]);

  const setPinned = useCallback((value: boolean) => {
    pinnedRef.current = value;
    if (!value) pendingAnchorIndexRef.current = null;
  }, []);

  return {
    anchorOffset,
    measureElement,
    scrollRef,
    scrollToIndex,
    setPinned,
    sizerHeight: Math.max(totalSize, viewportHeight),
    sizerRef,
    virtualItems: virtualizer.getVirtualItems(),
  };
}

function estimateTranscriptRowSize(row: TranscriptRow) {
  if (row.kind === "assistant") return 400;
  if (row.kind === "user") return 80;
  return 48;
}

function buildTranscriptRows(entries: TranscriptEntry[]): TranscriptRow[] {
  const usedIds = new Set<string>();
  const rowId = (id: string, index: number) => {
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
    const next = `${id}:${index}`;
    usedIds.add(next);
    return next;
  };
  const rows: TranscriptRow[] = entries.map((entry, entryIdx) => ({
    entry,
    entryIdx,
    id: rowId(entry.id, entryIdx),
    kind: entry.author,
  }));
  rows.push({ id: "running-tasks", kind: "running-tasks" });
  rows.push({ id: "loader", kind: "loader" });
  return rows;
}

function TranscriptRowContent({
  initialCount,
  isAwaitingReply,
  isResponding,
  lastEntryIdx,
  onPinUserChapter,
  onUnpinUserChapters,
  pendingTurnStartedAt,
  row,
  sessionId,
  streamTokenEstimate,
  tasks,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  initialCount: number;
  isAwaitingReply: boolean;
  isResponding: boolean;
  lastEntryIdx: number;
  onPinUserChapter: (afterId: string, text: string) => void;
  onUnpinUserChapters: (afterId: string) => void;
  pendingTurnStartedAt?: number | null;
  row: TranscriptRow;
  sessionId?: string;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId: Map<string, CodeUserChapter[]>;
}) {
  if (row.kind === "running-tasks") return <OfficialRunningTasks isResponding={isResponding} tasks={tasks} />;
  if (row.kind === "loader") return <OfficialWorkingStatus isWorking={isResponding} sessionId={sessionId} startedAt={pendingTurnStartedAt} tokenEstimate={streamTokenEstimate} />;

  const isNewUserEntry = row.kind === "user" && row.entryIdx >= initialCount;
  const isStreaming = row.kind === "assistant" && isResponding && row.entryIdx === lastEntryIdx;
  const showCodeAwaitingDot = row.kind === "assistant" && isAwaitingReply && row.entryIdx === lastEntryIdx;
  const content = row.kind === "user"
    ? <CodeUserEntryMessage entry={row.entry} />
    : (
      <CodeAssistantEntryMessage
        entry={row.entry}
        isStreaming={isStreaming}
        onPinUserChapter={onPinUserChapter}
        onUnpinUserChapters={onUnpinUserChapters}
        showAwaitingDot={showCodeAwaitingDot}
        transcriptMode={transcriptMode}
        userChaptersByAfterId={userChaptersByAfterId}
      />
    );
  if (row.kind === "user") {
    return <div data-epitaxy-entry={row.entry.id} className={`origin-left ${isNewUserEntry ? "epitaxy-user-enter" : ""}`}>{content}</div>;
  }
  return <div data-epitaxy-entry={row.entry.id}>{content}</div>;
}

function OfficialRunningTasks({ isResponding, tasks }: { isResponding: boolean; tasks: OfficialBackgroundTask[] }) {
  const context = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => summarizeOfficialRunningTasks(tasks), [tasks]);
  if (isResponding || !summary) return null;
  const content = (
    <>
      <span className={`text-body truncate min-w-0 ${summary.waiting ? "epitaxy-text-shine" : "text-assistant-secondary"}`}>
        {formatOfficialRunningTasksSummary(summary)}
      </span>
      <ToolChevron expanded={false} />
    </>
  );
  if (!context?.openTasks) {
    return <div className="flex self-start max-w-full items-center">{content}</div>;
  }
  return (
    <button type="button" onClick={context.openTasks} className="flex self-start max-w-full items-center gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3">
      {content}
    </button>
  );
}

type OfficialRunningTaskKind = "shell" | "agent" | "workflow" | "monitor" | "dream" | "task";

type OfficialRunningTasksSummary = {
  count: number;
  kind: OfficialRunningTaskKind;
  waiting: boolean;
};

function summarizeOfficialRunningTasks(tasks: OfficialBackgroundTask[]): OfficialRunningTasksSummary | null {
  const running = tasks.filter((task) => task.status === "running");
  if (running.length === 0) return null;
  const selectedKind = officialTaskRunningKind(running[0]?.taskType);
  const sameKindCount = running.filter((task) => officialTaskRunningKind(task.taskType) === selectedKind).length;
  return {
    count: sameKindCount,
    kind: selectedKind,
    waiting: running.some((task) => !task.lastToolName && !task.usage),
  };
}

function officialTaskRunningKind(taskType?: string): OfficialRunningTaskKind {
  switch (taskType) {
    case "local_bash":
      return "shell";
    case "local_agent":
    case "remote_agent":
    case "in_process_teammate":
      return "agent";
    case "local_workflow":
      return "workflow";
    case "monitor_mcp":
      return "monitor";
    case "dream":
      return "dream";
    default:
      return "task";
  }
}

function formatOfficialRunningTasksSummary(summary: OfficialRunningTasksSummary) {
  if (summary.kind === "dream") return "Dreaming";
  if (summary.kind === "task") return `${summary.count} ${summary.count === 1 ? "background task" : "background tasks"}`;
  const label = summary.kind === "shell" ? "shell" : summary.kind;
  return `${summary.count} ${label}${summary.count === 1 ? " running" : "s running"}`;
}

type TranscriptEntry = {
  author: "assistant" | "user";
  id: string;
  items: TranscriptEntryItem[];
  timestamp?: string;
};

type TranscriptEntryItem =
  | { id: string; kind: "bash"; command?: string; error?: string; output?: string }
  | { id: string; kind: "error"; code?: string; text: string }
  | { id: string; kind: "event"; content: string; eventType?: string }
  | { file: EpitaxyUploadedFile; id: string; kind: "uploaded-file" }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "thinking"; text: string }
  | { id: string; kind: "tools"; tools: TranscriptToolUse[] };

type TranscriptToolUse = {
  id: string;
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  output?: string;
  status: "awaiting_approval" | "completed" | "error" | "running";
  subagentActivity?: {
    latestToolName?: string;
    model?: string;
    toolCallCount?: number;
  };
};

function parseOfficialTranscriptEntries(messages: ChatMessage[], streamingMessageId?: string | null): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const pendingTools = new Map<string, TranscriptToolUse>();
  const pushEntry = (entry: TranscriptEntry) => {
    if (entry.items.length === 0) return;
    const previous = entries.at(-1);
    if (previous?.author === "assistant" && entry.author === "assistant") {
      entries[entries.length - 1] = {
        ...previous,
        items: mergeAdjacentAssistantItems([...previous.items, ...entry.items]),
        timestamp: entry.timestamp ?? previous.timestamp,
      };
      return;
    }
    entries.push({ ...entry, items: entry.author === "assistant" ? mergeAdjacentAssistantItems(entry.items) : entry.items });
  };

  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    if (rawType === "result") return;
    if (rawType === "stream_event" || raw.parent_tool_use_id || raw.parentToolUseId) return;
    if (rawType === "user" && rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
      return;
    }
    const nestedMessage = asRecord(raw.message);
    const role = rawType === "assistant" || rawType === "user"
      ? rawType
      : message.role === "assistant" || message.role === "user"
        ? message.role
        : stringValue(nestedMessage.role);
    if (role !== "assistant" && role !== "user") return;
    if (role === "assistant" && streamingMessageId && stringValue(nestedMessage.id) === streamingMessageId) return;
    const content = Array.isArray(nestedMessage.content) || typeof nestedMessage.content === "string"
      ? nestedMessage.content
      : Array.isArray(raw.content) || typeof raw.content === "string"
        ? raw.content
        : undefined;
    const items = role === "assistant"
      ? parseAssistantTranscriptItems(content, pendingTools, index, message.text)
      : parseUserTranscriptItems(content, index, message.text);
    pushEntry({
      author: role,
      id: stringValue(raw.id) ?? stringValue(raw.uuid) ?? stringValue(nestedMessage.id) ?? message.id,
      items,
      timestamp: stringValue(raw.timestamp) ?? message.createdAt,
    });
  });

  return entries;
}

function parseOfficialSubagentTranscriptEntries(messages: ChatMessage[], parentToolUseId: string): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const pendingTools = new Map<string, TranscriptToolUse>();
  const pushEntry = (entry: TranscriptEntry) => {
    if (entry.items.length === 0) return;
    const previous = entries.at(-1);
    if (previous?.author === "assistant" && entry.author === "assistant") {
      entries[entries.length - 1] = {
        ...previous,
        items: mergeAdjacentAssistantItems([...previous.items, ...entry.items]),
        timestamp: entry.timestamp ?? previous.timestamp,
      };
      return;
    }
    entries.push({ ...entry, items: entry.author === "assistant" ? mergeAdjacentAssistantItems(entry.items) : entry.items });
  };

  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    if (rawType === "result" || rawType === "stream_event") return;
    const parent = stringValue(raw.parent_tool_use_id) ?? stringValue(raw.parentToolUseId);
    if (parent !== parentToolUseId) return;
    if (rawType === "user" && rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
      return;
    }
    const nestedMessage = asRecord(raw.message);
    const role = rawType === "assistant" || rawType === "user"
      ? rawType
      : message.role === "assistant" || message.role === "user"
        ? message.role
        : stringValue(nestedMessage.role);
    if (role !== "assistant" && role !== "user") return;
    const content = Array.isArray(nestedMessage.content) || typeof nestedMessage.content === "string"
      ? nestedMessage.content
      : Array.isArray(raw.content) || typeof raw.content === "string"
        ? raw.content
        : undefined;
    const items = role === "assistant"
      ? parseAssistantTranscriptItems(content, pendingTools, index, message.text)
      : parseUserTranscriptItems(content, index, message.text);
    pushEntry({
      author: role,
      id: stringValue(raw.id) ?? stringValue(raw.uuid) ?? stringValue(nestedMessage.id) ?? message.id,
      items,
      timestamp: stringValue(raw.timestamp) ?? message.createdAt,
    });
  });

  return entries;
}

function parseAssistantTranscriptItems(content: unknown, pendingTools: Map<string, TranscriptToolUse>, messageIndex: number, fallbackText: string): TranscriptEntryItem[] {
  const source = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : fallbackText.trim() ? [{ type: "text", text: fallbackText }] : [];
  const items: TranscriptEntryItem[] = [];
  let toolBuffer: TranscriptToolUse[] = [];
  const flushTools = () => {
    if (toolBuffer.length === 0) return;
    items.push({ id: `assistant-${messageIndex}-tools-${items.length}`, kind: "tools", tools: toolBuffer });
    toolBuffer = [];
  };

  source.forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    if (kind === "tool_use") {
      const tool = normalizeToolUse(record, index);
      toolBuffer.push(tool);
      pendingTools.set(tool.id, tool);
      return;
    }
    flushTools();
    const id = stringValue(record.id) ?? `assistant-${messageIndex}-${index}`;
    if (kind === "text") {
      const text = stringValue(record.text) ?? stringValue(record.content);
      if (text) items.push({ id, kind: "text", text });
    } else if (kind === "thinking") {
      const text = stringValue(record.thinking) ?? stringValue(record.text);
      if (text) items.push({ id, kind: "thinking", text });
    } else if (kind === "error") {
      items.push({ code: stringValue(record.code), id, kind: "error", text: stringValue(record.text) ?? stringValue(record.error) ?? "Error" });
    }
  });
  flushTools();
  return items;
}

function parseUserTranscriptItems(content: unknown, messageIndex: number, fallbackText: string): TranscriptEntryItem[] {
  const source = typeof content === "string" ? [{ type: "text", text: content }] : Array.isArray(content) ? content : fallbackText.trim() ? [{ type: "text", text: fallbackText }] : [];
  const items: TranscriptEntryItem[] = [];
  source.forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    const id = stringValue(record.id) ?? `user-${messageIndex}-${index}`;
    if (kind === "text") {
      const text = stringValue(record.text) ?? stringValue(record.content);
      if (text) pushUserTextAndUploadedFiles(items, id, text);
    } else if (kind === "bash") {
      items.push({ command: stringValue(record.command), error: stringValue(record.error), id, kind: "bash", output: stringValue(record.output) });
    } else if (kind === "event") {
      const eventText = stringValue(record.content) ?? stringValue(record.text);
      if (eventText) items.push({ content: eventText, eventType: stringValue(record.eventType), id, kind: "event" });
    }
  });
  return items;
}

function pushUserTextAndUploadedFiles(items: TranscriptEntryItem[], id: string, text: string) {
  const parsed = parseEpitaxyUploadedFilesText(text);
  parsed.files.forEach((file, index) => items.push({ file, id: `${id}-file-${index}`, kind: "uploaded-file" }));
  if (parsed.text) items.push({ id, kind: "text", text: parsed.text });
}

function attachToolResultMessages(raw: Record<string, unknown>, pendingTools: Map<string, TranscriptToolUse>) {
  for (const item of rawMessageContent(raw)) {
    const record = asRecord(item);
    if ((stringValue(record.type) ?? stringValue(record.kind)) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    const tool = toolUseId ? pendingTools.get(toolUseId) : undefined;
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    tool.output = toolResultText(record.content);
    pendingTools.delete(tool.id);
  }
}

function mergeAdjacentAssistantItems(items: TranscriptEntryItem[]) {
  const merged: TranscriptEntryItem[] = [];
  for (const item of items) {
    const previous = merged.at(-1);
    if (previous?.kind === "tools" && item.kind === "tools") {
      merged[merged.length - 1] = { ...previous, tools: [...previous.tools, ...item.tools] };
    } else {
      merged.push(item);
    }
  }
  return merged;
}

function mergeOfficialStreamSnapshot(entries: TranscriptEntry[], snapshot: OfficialStreamSnapshot): TranscriptEntry[] {
  if (!snapshot) return entries;
  const streamItems = streamSnapshotToTranscriptItems(snapshot);
  if (streamItems.length === 0) return entries;
  const lastEntry = entries.at(-1);
  if (lastEntry?.author !== "assistant") {
    return [...entries, { author: "assistant", id: snapshot.messageId, items: streamItems }];
  }
  const incomingToolIds = new Set(streamItems.flatMap((item) => item.kind === "tools" ? item.tools.map((tool) => tool.id) : []));
  if (incomingToolIds.size > 0) {
    const existingToolIds = new Set(lastEntry.items.flatMap((item) => item.kind === "tools" ? item.tools.map((tool) => tool.id) : []));
    for (const id of incomingToolIds) if (existingToolIds.has(id)) return entries;
  }
  const previousLastItem = lastEntry.items.at(-1);
  const firstStreamItem = streamItems[0];
  const nextItems = previousLastItem?.kind === "tools" && firstStreamItem?.kind === "tools"
    ? [...lastEntry.items.slice(0, -1), { ...previousLastItem, tools: [...previousLastItem.tools, ...firstStreamItem.tools] }, ...streamItems.slice(1)]
    : [...lastEntry.items, ...streamItems];
  return [...entries.slice(0, -1), { ...lastEntry, items: nextItems }];
}

function streamSnapshotToTranscriptItems(snapshot: NonNullable<OfficialStreamSnapshot>): TranscriptEntryItem[] {
  const items: TranscriptEntryItem[] = [];
  let toolBuffer: TranscriptToolUse[] = [];
  let thinkingBuffer: string[] = [];
  const flushThinking = () => {
    for (const text of thinkingBuffer) items.push({ id: `${snapshot.messageId}-thinking-${items.length}`, kind: "thinking", text });
    thinkingBuffer = [];
  };
  const flushTools = () => {
    if (toolBuffer.length === 0) return;
    items.push({ id: `${snapshot.messageId}-tools-${items.length}`, kind: "tools", tools: toolBuffer });
    toolBuffer = [];
  };

  for (const block of snapshot.blocks) {
    if (block.kind === "thinking") {
      const text = block.text.trim();
      if (text) thinkingBuffer.push(text);
      continue;
    }
    if (block.kind === "text") {
      if (!block.text) continue;
      flushTools();
      flushThinking();
      items.push({ id: `${snapshot.messageId}-text-${items.length}`, kind: "text", text: block.text });
      continue;
    }
    flushThinking();
    toolBuffer.push({
      id: block.id,
      input: parseJsonObject(block.partialJson) ?? {},
      name: block.name,
      status: "running",
    });
  }
  flushTools();
  flushThinking();
  return items;
}

function estimateOfficialStreamSnapshotTokens(snapshot: OfficialStreamSnapshot) {
  if (!snapshot) return 0;
  const charCount = snapshot.blocks.reduce((total, block) => {
    if (block.kind === "tool") return total + block.partialJson.length;
    return total + block.text.length;
  }, 0);
  return Math.round(charCount / 4);
}

function CodeUserEntryMessage({ entry }: { entry: TranscriptEntry }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const textItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "text" }> => item.kind === "text");
  const bashItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "bash" }> => item.kind === "bash");
  const eventItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "event" }> => item.kind === "event");
  const fileItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "uploaded-file" }> => item.kind === "uploaded-file");
  const copyText = textItems.map((item) => item.text).join("\n\n") || undefined;
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload();
  }, [actions, entry.id]);
  const onFork = actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const [expandedLongText, setExpandedLongText] = useState(false);
  const isLongText = (copyText?.length ?? 0) > 1200;
  const messageBody = (
    <>
      {fileItems.length > 0 ? <UserUploadedFiles files={fileItems.map((item) => item.file)} /> : null}
      <div className={isLongText && !expandedLongText ? "flex flex-col gap-g4 max-h-[16rem] overflow-clip [mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)]" : "flex flex-col gap-g4"}>
        {textItems.map((item) => <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty" key={item.id}>{renderInlineMarkdown(item.text, item.id)}</p>)}
        {bashItems.map((item) => <UserBashBlock item={item} key={item.id} />)}
        {eventItems.map((item) => <p className="text-body text-t7 whitespace-pre-wrap [overflow-wrap:anywhere]" key={item.id}>{item.content}</p>)}
      </div>
      {isLongText ? (
        <OfficialButton className="self-start" onClick={() => setExpandedLongText((value) => !value)} size="small" variant="uncontained">
          {expandedLongText ? "Show less" : "Show more"}
        </OfficialButton>
      ) : null}
    </>
  );

  return (
    <OfficialUserMessage copyText={copyText} createdAt={entry.timestamp} onFork={onFork} onRewind={onRewind}>
      {messageBody}
    </OfficialUserMessage>
  );
}

function UserUploadedFiles({ files }: { files: EpitaxyUploadedFile[] }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  return (
    <div className="flex flex-wrap gap-g2">
      {files.map((file) => (
        <button className="inline-flex max-w-full items-center gap-g2 rounded-r4 bg-fill-contained-default px-p4 py-p2 text-footnote text-t8 effect-contained-default" key={`${file.path}-${file.fileUuid ?? "local"}`} onClick={() => actions?.openFile({ path: file.path })} type="button">
          <Icon name="Document" size="xs" />
          <span className="max-w-[220px] truncate">{file.fileName}</span>
        </button>
      ))}
    </div>
  );
}

function CodeAssistantEntryMessage({
  entry,
  isStreaming = false,
  onPinUserChapter,
  onUnpinUserChapters,
  showAwaitingDot = false,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  entry: TranscriptEntry;
  isStreaming?: boolean;
  onPinUserChapter?: (afterId: string, text: string) => void;
  onUnpinUserChapters?: (afterId: string) => void;
  showAwaitingDot?: boolean;
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId?: Map<string, CodeUserChapter[]>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const chaptersByAfterId = userChaptersByAfterId ?? emptyCodeUserChaptersByAfterId;
  const visibleItems = entry.items.filter(isVisibleAssistantEntryItem);
  const copyText = visibleItems.flatMap((item) => item.kind === "text" ? [item.text] : []).join("\n\n") || undefined;
  const firstVisibleItem = visibleItems[0];
  const pinnedChapters = firstVisibleItem ? chaptersByAfterId.get(firstVisibleItem.id) : undefined;
  const onPinChapter = firstVisibleItem && onPinUserChapter && onUnpinUserChapters
    ? () => {
      if (pinnedChapters?.length) onUnpinUserChapters(firstVisibleItem.id);
      else onPinUserChapter(firstVisibleItem.id, copyText ?? "");
    }
    : undefined;
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload();
  }, [actions, entry.id]);
  const onFork = !isStreaming && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = !isStreaming && actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const onRateMessage = !isStreaming && actions?.sessionId && actions.bridge.submitTranscriptFeedback
    ? (messageUuid: string, rating: "negative" | "positive") => {
      void actions.bridge.submitTranscriptFeedback?.(actions.sessionId, {
        messageUuid,
        rating,
        source: "epitaxy-transcript",
        type: "message_rating",
      });
    }
    : undefined;
  if (visibleItems.length === 0) return null;

  return (
    <OfficialAssistantMessage copyText={copyText} createdAt={isStreaming ? undefined : entry.timestamp} isPinned={Boolean(pinnedChapters?.length)} onFork={onFork} onPinChapter={onPinChapter} onRateMessage={onRateMessage} onRewind={onRewind} rateMessageUuid={entry.id} showAwaitingDot={showAwaitingDot}>
      {visibleItems.map((item) => (
        <Fragment key={item.id}>
          {chaptersByAfterId.get(item.id)?.map((chapter) => <CodeChapterTitle chapter={chapter} key={chapter.id} />)}
          {renderCodeAssistantEntryItem(item, isStreaming, transcriptMode)}
        </Fragment>
      ))}
    </OfficialAssistantMessage>
  );
}

function renderCodeAssistantEntryItem(item: Exclude<TranscriptEntryItem, { kind: "uploaded-file" }>, isStreaming: boolean, transcriptMode: OfficialTranscriptMode) {
  if (item.kind === "thinking") return <CodeThinkingBlock text={item.text} transcriptMode={transcriptMode} />;
  if (item.kind === "text") return <div><OfficialCodeMarkdown isStreaming={isStreaming} text={item.text} /></div>;
  if (item.kind === "tools") return <AssistantToolsBlock item={item} transcriptMode={transcriptMode} />;
  if (item.kind === "error") return <div className="rounded-r3 border border-[var(--fill-destructive-default)] px-p3 py-p2 text-code text-destructive-default whitespace-pre-wrap break-words">{item.text}</div>;
  if (item.kind === "bash") return <UserBashBlock item={item} />;
  return <div className="text-body text-t6 whitespace-pre-wrap break-words">{item.content}</div>;
}

function CodeChapterTitle({ chapter }: { chapter: CodeUserChapter }) {
  return (
    <div id={chapter.id} className="text-body-semibold text-assistant-primary select-text scroll-mt-[56px]">
      {chapter.title}
    </div>
  );
}

function CodeThinkingBlock({ text, transcriptMode }: { text: string; transcriptMode: OfficialTranscriptMode }) {
  if (!officialTranscriptModeShowsThinking(transcriptMode)) return null;
  return <div className="text-body text-t6 italic whitespace-pre-wrap break-words">{text}</div>;
}

function officialTranscriptModeShowsThinking(mode: OfficialTranscriptMode) {
  return mode === "thinking" || mode === "verbose";
}

function officialTranscriptModeExpandsDetails(mode: OfficialTranscriptMode) {
  return mode === "verbose";
}

function AssistantToolsBlock({ item, transcriptMode = "normal" }: { item: Extract<TranscriptEntryItem, { kind: "tools" }>; transcriptMode?: OfficialTranscriptMode }) {
  const runs = groupOfficialToolRuns(item.tools);
  if (runs.length === 1) {
    const run = runs[0];
    return run.tools.length === 1 ? <OfficialToolRow tool={run.tools[0]} transcriptMode={transcriptMode} /> : <OfficialToolGroup tools={run.tools} transcriptMode={transcriptMode} />;
  }
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full">
      {runs.map((run) => run.tools.length === 1
        ? <OfficialToolRow key={run.id} tool={run.tools[0]} transcriptMode={transcriptMode} />
        : <OfficialToolGroup key={run.id} tools={run.tools} transcriptMode={transcriptMode} />)}
    </div>
  );
}

const standaloneToolNames = new Set(["AskUserQuestion", "EnterPlanMode", "ExitPlanMode", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop"]);

function groupOfficialToolRuns(tools: TranscriptToolUse[]) {
  const groups: Array<{ bucket: "default" | "standalone"; id: string; tools: TranscriptToolUse[] }> = [];
  tools.forEach((tool) => {
    const bucket = standaloneToolNames.has(tool.name) ? "standalone" : "default";
    const previous = groups.at(-1);
    if (previous && previous.bucket === bucket && bucket !== "standalone") {
      previous.tools.push(tool);
      return;
    }
    groups.push({ bucket, id: `${bucket}:${tool.id}`, tools: [tool] });
  });
  return groups;
}

function OfficialToolGroup({ tools, transcriptMode = "normal" }: { tools: TranscriptToolUse[]; transcriptMode?: OfficialTranscriptMode }) {
  const [expanded, setExpanded] = useState(false);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const toolsKey = tools.map((tool) => tool.id).join("|");
  useEffect(() => {
    setExpanded(false);
  }, [toolsKey]);
  const summary = officialToolSummaryPieces(tools);
  const status = aggregateToolStatus(tools);
  const isRunning = status === "running";
  const isAwaitingApproval = status === "awaiting_approval";
  const runningTool = isRunning ? tools.find((tool) => tool.status === "running") : undefined;
  const debouncedRunningToolId = useDebouncedDisplayedKey(runningTool?.id ?? "settled", 650);
  const displayedRunningTool = debouncedRunningToolId !== "settled" ? tools.find((tool) => tool.id === debouncedRunningToolId) : undefined;
  const runningSummary = displayedRunningTool ? officialToolRowSummary(displayedRunningTool) : undefined;
  const isExpanded = isVerbose || expanded;
  const toggle = () => {
    if (isVerbose) return;
    setExpanded((value) => !value);
  };
  return (
    <div className="flex flex-col w-full">
      <button
        aria-expanded={isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3"
        onClick={toggle}
        type="button"
      >
        {isRunning ? <span className="sr-only">running</span> : null}
        <OfficialAnimatedToolLabel className="inline-flex items-center gap-g3 min-w-0" mode="wait" morphKey={runningSummary ? debouncedRunningToolId : "settled"}>
          {runningSummary ? (
            <>
              <span className="text-body epitaxy-text-shine shrink-0">{runningSummary.runningVerb}</span>
              {runningSummary.meta ? <span className="text-body text-assistant-secondary truncate min-w-0">{runningSummary.meta}</span> : null}
            </>
          ) : (
            <>
              <span className="text-body truncate min-w-0">{summary.map(renderToolSummaryPiece)}</span>
              {isAwaitingApproval ? <span className="text-body text-extended-yellow shrink-0">Needs approval</span> : null}
            </>
          )}
        </OfficialAnimatedToolLabel>
        <ToolChevron expanded={isExpanded} />
      </button>
      <OfficialCollapse expanded={isExpanded}>
        <div className="flex flex-col gap-g3 bg-t1 rounded-r6 p-p7 mt-[var(--p6)]">
          {tools.map((tool) => <OfficialToolRow inGroup key={tool.id} tool={tool} transcriptMode={transcriptMode} />)}
        </div>
      </OfficialCollapse>
    </div>
  );
}

function OfficialToolRow({ inGroup = false, tool, transcriptMode = "normal" }: { inGroup?: boolean; tool: TranscriptToolUse; transcriptMode?: OfficialTranscriptMode }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => officialToolRowSummary(tool), [tool]);
  const hasDetails = hasToolDetails(tool, summary);
  const [expanded, setExpanded] = useState(false);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const isQuestionPrompt = summary.kind === "question" && typeof tool.output !== "string" && !tool.isError;
  const isExpanded = isVerbose || expanded || isQuestionPrompt;
  const isRunning = tool.status === "running";
  const isError = tool.status === "error" || Boolean(tool.isError);
  const isAwaitingApproval = tool.status === "awaiting_approval";
  const opensSubagent = (tool.name === "Task" || tool.name === "Agent") && Boolean(actions?.openSubagent);
  const metaHref = summary.metaHref && /^https:\/\//i.test(summary.metaHref) ? summary.metaHref : undefined;
  const toggle = () => {
    if (opensSubagent && actions?.openSubagent) {
      actions.openSubagent({ description: stringValue(tool.input.description) ?? tool.name, toolUseId: tool.id });
      return;
    }
    if (isVerbose || !hasDetails || isQuestionPrompt) return;
    setExpanded((value) => !value);
  };
  return (
    <div className="flex flex-col w-full">
      <div
        aria-expanded={opensSubagent || !hasDetails ? undefined : isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g2 text-left cursor-pointer outline-none hide-focus-ring focus:ring-focus rounded-r3"
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggle();
        }}
        role="button"
        tabIndex={0}
      >
        <OfficialAnimatedToolLabel
          className={`shrink-0 ${isRunning ? "text-body epitaxy-text-shine" : isError ? "text-body text-extended-pink" : "text-body text-assistant-secondary"}`}
          morphKey={isRunning ? "running" : "settled"}
        >
          {isRunning ? summary.runningVerb : summary.verb}
        </OfficialAnimatedToolLabel>
        {tool.subagentActivity?.model ? <span className="text-body text-assistant-secondary shrink-0">{tool.subagentActivity.model}</span> : null}
        {tool.subagentActivity ? (
          <span className="text-body text-assistant-secondary truncate min-w-0">
            {tool.subagentActivity.model ? "· " : ""}{tool.subagentActivity.latestToolName ?? tool.name} · {tool.subagentActivity.toolCallCount ?? 0}
          </span>
        ) : isAwaitingApproval ? <span className="text-body text-extended-yellow shrink-0">Needs approval</span> : null}
        {!tool.subagentActivity && !isAwaitingApproval && summary.meta ? (
          metaHref ? (
            <a className="text-code text-assistant-primary truncate min-w-0" href={metaHref} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} rel="noreferrer" target="_blank">{summary.meta}</a>
          ) : (
            <span className={officialToolRowMetaClassName(summary)}>{summary.meta}</span>
          )
        ) : null}
        {isRunning ? <span className="sr-only">running</span> : null}
        {hasDetails ? <ToolChevron expanded={isExpanded} /> : null}
      </div>
      <OfficialCollapse expanded={isExpanded}>
        <OfficialToolDetails tool={tool} />
      </OfficialCollapse>
    </div>
  );
}

function OfficialCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ height: { type: "spring", duration: 0.35, bounce: 0 }, opacity: { duration: 0.2, ease: "easeOut" } }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OfficialAnimatedToolLabel({ children, className, mode = "popLayout", morphKey }: { children: ReactNode; className: string; mode?: "popLayout" | "sync" | "wait"; morphKey: string }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <span className={className}>{children}</span>;
  return (
    <AnimatePresence initial={false} mode={mode}>
      <motion.span
        animate={{ opacity: 1, y: 0 }}
        className={className}
        exit={{ opacity: 0, y: -3 }}
        initial={{ opacity: 0, y: 3 }}
        key={morphKey}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

function useDebouncedDisplayedKey(key: string, delayMs: number) {
  const [state, setState] = useState(() => ({ displayed: key, lastSwapAt: 0 }));

  useEffect(() => {
    if (key === state.displayed) return undefined;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = now - state.lastSwapAt;
    if (elapsed >= delayMs) {
      setState({ displayed: key, lastSwapAt: now });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const swapTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      setState({ displayed: key, lastSwapAt: swapTime });
    }, delayMs - elapsed);
    return () => window.clearTimeout(timer);
  }, [delayMs, key, state.displayed, state.lastSwapAt]);

  return state.displayed;
}

const toolStatusPriority: Record<TranscriptToolUse["status"], number> = {
  awaiting_approval: 3,
  running: 2,
  error: 1,
  completed: 0,
};

function aggregateToolStatus(tools: TranscriptToolUse[]): TranscriptToolUse["status"] {
  let status: TranscriptToolUse["status"] = "completed";
  for (const tool of tools) {
    if (toolStatusPriority[tool.status] > toolStatusPriority[status]) status = tool.status;
  }
  return status;
}

function ToolChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="shrink-0 text-assistant-secondary" style={{ "--class-base-icon": "14px" } as CSSProperties}>
      <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="sm" />
    </span>
  );
}

type OfficialToolRowKind = "bash" | "diff" | "file" | "plan" | "question" | "text" | "todos";

type OfficialToolRowSummary = {
  kind: OfficialToolRowKind;
  meta?: string;
  metaHref?: string;
  metaIsCode?: boolean;
  runningVerb: string;
  verb: string;
};

type OfficialBashAction =
  | { commitKind: "amended" | "cherry-picked" | "committed"; kind: "commit"; meta?: string }
  | { kind: "push"; meta?: string }
  | { action: "merged" | "rebased"; kind: "branch"; meta?: string }
  | { action: "closed" | "commented" | "created" | "edited" | "merged" | "ready"; kind: "pr"; meta?: string; url?: string };

function officialToolRowKind(name: string): OfficialToolRowKind {
  switch (name) {
    case "Bash":
    case "BashTool":
      return "bash";
    case "Read":
      return "file";
    case "Write":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return "diff";
    case "TodoWrite":
    case "TaskCreate":
    case "TaskUpdate":
    case "TaskGet":
    case "TaskList":
    case "TaskStop":
      return "todos";
    case "ExitPlanMode":
      return "plan";
    case "AskUserQuestion":
      return "question";
    default:
      return "text";
  }
}

function officialToolRowSummary(tool: TranscriptToolUse): OfficialToolRowSummary {
  const input = tool.input;
  const inputString = (key: string) => stringValue(input[key]);
  const kind = officialToolRowKind(tool.name);
  switch (tool.name) {
    case "Bash":
    case "BashTool": {
      const command = inputString("command");
      const recognized = command && !tool.isError ? officialRecognizedBashAction(command, tool.output) : null;
      if (recognized) {
        const verbs = officialBashActionVerbs(recognized);
        return {
          ...verbs,
          kind,
          meta: recognized.meta ?? inputString("description") ?? command,
          metaHref: recognized.kind === "pr" ? recognized.url : undefined,
          metaIsCode: recognized.meta !== undefined,
        };
      }
      return { kind, meta: inputString("description") ?? command, runningVerb: "Running", verb: "Ran" };
    }
    case "Read":
      return { kind, meta: basename(inputString("file_path")), runningVerb: "Reading", verb: "Read" };
    case "Write":
      return { kind, meta: basename(inputString("file_path")), runningVerb: "Creating", verb: "Created" };
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return { kind, meta: basename(inputString("file_path") ?? inputString("notebook_path")), runningVerb: "Editing", verb: "Edited" };
    case "Grep":
    case "Glob":
      return { kind, meta: inputString("pattern"), runningVerb: "Searching", verb: "Searched" };
    case "LS":
      return { kind, meta: inputString("path"), runningVerb: "Listing", verb: "Listed" };
    case "WebFetch":
      return { kind, meta: inputString("url"), runningVerb: "Fetching", verb: "Fetched" };
    case "WebSearch":
      return { kind, meta: inputString("query"), runningVerb: "Searching web", verb: "Searched web" };
    case "Task":
    case "Agent":
      return { kind, meta: inputString("description"), runningVerb: "Running agent", verb: "Ran agent" };
    case "Skill": {
      const skill = inputString("skill");
      return { kind, meta: skill ? `/${skill}` : undefined, metaIsCode: true, runningVerb: "Running skill", verb: "Ran skill" };
    }
    case "TaskCreate":
    case "TaskUpdate":
    case "TaskGet":
    case "TaskList":
    case "TaskStop":
      return { kind, runningVerb: "Updating todos", verb: "Updated todos" };
    case "TodoWrite":
      return { kind, runningVerb: "Updating todos", verb: Array.isArray(input.todos) && input.todos.length > 0 ? "Updated todos" : "Cleared todos" };
    case "EnterPlanMode":
      return { kind, runningVerb: "Entering plan mode", verb: "Entered plan mode" };
    case "ExitPlanMode":
      return { kind, runningVerb: "Proposing plan", verb: "Proposed plan" };
    case "AskUserQuestion": {
      const questions = Array.isArray(input.questions) ? input.questions : [];
      const firstQuestion = asRecord(questions[0]);
      return { kind, meta: stringValue(firstQuestion.header) ?? (questions.length > 1 ? `${questions.length} questions` : undefined), runningVerb: "Asking", verb: "Asked" };
    }
    case "SendUserMessage":
    case "SendUserFile":
      return { kind, runningVerb: "Sending", verb: "Sent" };
    default: {
      const label = tool.name.startsWith("mcp__") ? tool.name.split("__").at(-1)?.replace(/_/g, " ") ?? tool.name : tool.name;
      return { kind, runningVerb: `Using ${label}`, verb: `Used ${label}` };
    }
  }
}

function officialToolRowMetaClassName(summary: OfficialToolRowSummary) {
  return summary.kind === "diff" || summary.kind === "file" || summary.metaIsCode
    ? "text-code text-assistant-primary truncate min-w-0"
    : "text-body text-assistant-secondary truncate min-w-0";
}

const officialGitCommitRe = officialGitCommandRe("commit");
const officialGitPushRe = officialGitCommandRe("push");
const officialGitCherryPickRe = officialGitCommandRe("cherry-pick");
const officialGitMergeRe = officialGitCommandRe("merge", "(?!-)");
const officialGitRebaseRe = officialGitCommandRe("rebase");
const officialGithubPrActions = [
  { action: "created", re: /\bgh\s+pr\s+create\b/ },
  { action: "edited", re: /\bgh\s+pr\s+edit\b/ },
  { action: "merged", re: /\bgh\s+pr\s+merge\b/ },
  { action: "commented", re: /\bgh\s+pr\s+comment\b/ },
  { action: "closed", re: /\bgh\s+pr\s+close\b/ },
  { action: "ready", re: /\bgh\s+pr\s+ready\b/ },
] as const;

function officialGitCommandRe(command: string, suffix = "") {
  return new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--\\S+=\\S+)*\\s+${command}\\b${suffix}`);
}

function officialGitArgument(command: string, subcommand: string) {
  const rest = command.split(officialGitCommandRe(subcommand))[1];
  if (!rest) return undefined;
  for (const token of rest.trim().split(/\s+/)) {
    if (/^[&|;><]/.test(token)) break;
    if (!token.startsWith("-")) return token;
  }
  return undefined;
}

function officialRecognizedBashAction(command: string, output?: string): OfficialBashAction | null {
  const text = output ?? "";
  const prAction = officialGithubPrActions.find((item) => item.re.test(command))?.action;
  if (prAction) {
    const urlMatch = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/);
    if (urlMatch?.[1]) return { action: prAction, kind: "pr", meta: `#${Number.parseInt(urlMatch[1], 10)}`, url: urlMatch[0] };
    const numberMatch = text.match(/[Pp]ull request (?:\S+#)?#?(\d+)/);
    return { action: prAction, kind: "pr", meta: numberMatch?.[1] ? `#${Number.parseInt(numberMatch[1], 10)}` : undefined };
  }
  const isCherryPick = officialGitCherryPickRe.test(command);
  if (officialGitCommitRe.test(command) || isCherryPick) {
    const commitMatch = text.match(/\[[\w./-]+(?: \(root-commit\))? ([0-9a-f]+)\]/);
    return { commitKind: isCherryPick ? "cherry-picked" : /--amend\b/.test(command) ? "amended" : "committed", kind: "commit", meta: commitMatch?.[1]?.slice(0, 7) };
  }
  if (officialGitPushRe.test(command)) {
    const refMatch = text.match(/^\s*[+\-*!= ]?\s*(?:\[new branch\]|\S+\.\.+\S+)\s+\S+\s*->\s*(\S+)/m);
    return { kind: "push", meta: refMatch?.[1] };
  }
  if (officialGitMergeRe.test(command)) {
    const branch = officialGitArgument(command, "merge");
    if (branch) return { action: "merged", kind: "branch", meta: output === undefined || /(Fast-forward|Merge made by)/.test(text) ? branch : undefined };
  }
  if (officialGitRebaseRe.test(command)) {
    const branch = officialGitArgument(command, "rebase");
    if (branch) return { action: "rebased", kind: "branch", meta: output === undefined || /Successfully rebased/.test(text) ? branch : undefined };
  }
  return null;
}

function officialBashActionVerbs(action: OfficialBashAction) {
  if (action.kind === "commit") {
    if (action.commitKind === "amended") return { runningVerb: "Amending commit", verb: "Amended commit" };
    if (action.commitKind === "cherry-picked") return { runningVerb: "Cherry-picking", verb: "Cherry-picked" };
    return { runningVerb: "Committing", verb: "Committed" };
  }
  if (action.kind === "push") return { runningVerb: "Pushing", verb: "Pushed" };
  if (action.kind === "branch") return action.action === "merged" ? { runningVerb: "Merging", verb: "Merged" } : { runningVerb: "Rebasing onto", verb: "Rebased onto" };
  switch (action.action) {
    case "created": return { runningVerb: "Creating PR", verb: "Created PR" };
    case "edited": return { runningVerb: "Editing PR", verb: "Edited PR" };
    case "merged": return { runningVerb: "Merging PR", verb: "Merged PR" };
    case "commented": return { runningVerb: "Commenting on PR", verb: "Commented on PR" };
    case "closed": return { runningVerb: "Closing PR", verb: "Closed PR" };
    case "ready": return { runningVerb: "Marking PR ready", verb: "Marked PR ready" };
  }
}

type ToolSummaryPiece = {
  isError?: boolean;
  meta?: string;
  verb: string;
};

function officialToolSummaryPieces(tools: TranscriptToolUse[]): ToolSummaryPiece[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const errors = new Map<string, boolean>();
  let otherCount = 0;
  let otherError = false;
  for (const tool of tools) {
    const kind = officialToolKind(tool.name);
    if (!kind) {
      otherCount += 1;
      otherError ||= Boolean(tool.isError);
      continue;
    }
    if (!counts.has(kind)) order.push(kind);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    errors.set(kind, errors.get(kind) || Boolean(tool.isError));
  }
  const pieces = order.flatMap((kind) => officialToolKindSummary(kind, counts.get(kind) ?? 0, errors.get(kind)));
  if (otherCount > 0) pieces.push({ isError: otherError, meta: plural(otherCount, "tool", "tools"), verb: "used" });
  return pieces.length ? pieces : [{ meta: plural(tools.length, "tool", "tools"), verb: "used" }];
}

function renderToolSummaryPiece(piece: ToolSummaryPiece, index: number) {
  const verb = index === 0 ? capitalize(piece.verb) : piece.verb;
  return (
    <span key={`${piece.verb}-${piece.meta ?? index}`}>
      {index > 0 ? <span className="text-assistant-secondary">, </span> : null}
      <span className={piece.isError ? "text-extended-pink" : "text-assistant-secondary"}>{verb}</span>
      {piece.meta ? <span className="text-assistant-secondary"> {piece.meta}</span> : null}
    </span>
  );
}

function officialToolKindSummary(kind: string, count: number, isError?: boolean): ToolSummaryPiece[] {
  switch (kind) {
    case "bash": return [{ isError, meta: plural(count, "command", "commands"), verb: "ran" }];
    case "read": return [{ isError, meta: plural(count, "file", "files"), verb: "read" }];
    case "view": return [{ isError, meta: plural(count, "file", "files"), verb: "viewed" }];
    case "write": return [{ isError, meta: plural(count, "file", "files"), verb: "created" }];
    case "edit": return [{ isError, meta: plural(count, "file", "files"), verb: "edited" }];
    case "notebook_edit": return [{ isError, meta: plural(count, "notebook", "notebooks"), verb: "edited" }];
    case "delete_file": return [{ isError, meta: plural(count, "file", "files"), verb: "deleted" }];
    case "grep": return [{ isError, meta: "code", verb: "searched" }];
    case "glob": return [{ isError, meta: "files", verb: "found" }];
    case "web": return [{ isError, meta: "the web", verb: "browsed" }];
    case "task": return [{ isError, meta: plural(count, "agent", "agents", "an"), verb: "ran" }];
    case "todo": return [{ isError, meta: "todos", verb: "updated" }];
    case "exit_plan_mode": return [{ isError, meta: "a plan", verb: "proposed" }];
    default: return [];
  }
}

function officialToolKind(name: string) {
  if (name === "Bash" || name === "BashTool") return "bash";
  if (name === "Read") return "read";
  if (name === "View") return "view";
  if (name === "Write") return "write";
  if (name === "Edit" || name === "MultiEdit") return "edit";
  if (name === "NotebookEdit") return "notebook_edit";
  if (name === "Delete" || name === "DeleteFile") return "delete_file";
  if (name === "Grep") return "grep";
  if (name === "Glob" || name === "LS") return "glob";
  if (name === "WebFetch" || name === "WebSearch") return "web";
  if (name === "Task" || name === "Agent") return "task";
  if (name === "TodoWrite") return "todo";
  if (name === "ExitPlanMode") return "exit_plan_mode";
  return undefined;
}

function hasToolDetails(tool: TranscriptToolUse, summary: OfficialToolRowSummary) {
  return !(summary.kind === "todos" && officialTodoItems(tool.input).length === 0);
}

function officialTodoItems(input: Record<string, unknown>) {
  const todos = Array.isArray(input.todos) ? input.todos : [];
  return todos.flatMap((todo) => {
    const record = asRecord(todo);
    const id = stringValue(record.id);
    const content = stringValue(record.content);
    if (!id || !content) return [];
    const rawStatus = stringValue(record.status);
    const status = rawStatus === "completed" || rawStatus === "in_progress" ? rawStatus : "pending";
    return [{ content, id, status }];
  });
}

function OfficialToolDetails({ tool }: { tool: TranscriptToolUse }) {
  if (tool.name === "Bash" || tool.name === "BashTool") return <OfficialBashToolDetails tool={tool} />;
  if (tool.name === "Read" && tool.output && !tool.isError) return <OfficialReadFileToolDetails tool={tool} />;
  if (tool.name === "ExitPlanMode" && typeof tool.input.plan === "string") return <OfficialTextToolDetails label="Plan" text={tool.input.plan} />;
  return <OfficialGenericToolDetails tool={tool} />;
}

function OfficialBashToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const command = stringValue(tool.input.command);
  const copyText = [command ? `$ ${command}` : "", tool.output ?? ""].filter(Boolean).join("\n\n");
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 flex flex-col">
        <div className="flex items-center px-p6 py-p5">
          <span className="flex-1 text-body text-assistant-secondary">Bash</span>
          <ToolDetailsCopyButton text={copyText} />
        </div>
        <div className="flex flex-col gap-g8 px-p6 pb-p8 text-code">
          {command ? <div className="whitespace-pre-wrap">$ {command}</div> : null}
          {tool.output ? <div className={`whitespace-pre-wrap break-all ${tool.isError ? "text-extended-pink" : "text-assistant-secondary"}`}>{tool.output}</div> : null}
        </div>
      </div>
    </div>
  );
}

function OfficialReadFileToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const path = stringValue(tool.input.file_path) ?? "file";
  const contents = normalizeReadFileOutput(tool.output ?? "");
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 overflow-clip flex flex-col">
        <div className="flex items-center gap-g3 px-p6 py-p5">
          <ToolPathButton path={path} />
          <ToolDetailsCopyButton text={contents} />
        </div>
        <pre className="m-0 px-p6 pb-p8 text-code text-assistant-secondary whitespace-pre-wrap break-all">{contents}</pre>
      </div>
    </div>
  );
}

function OfficialGenericToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const inputKeys = Object.keys(tool.input);
  const copyText = toolCopyText(tool);
  return (
    <div className="group/body relative flex flex-col w-full pt-p3">
      <div className="flex w-full">
        <div className={`flex-1 min-w-0 flex flex-col gap-g4 text-body whitespace-pre-wrap break-words ${tool.isError ? "" : "text-assistant-secondary"}`}>
          {inputKeys.length > 0 ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
          {tool.output ? <div className={tool.isError ? "text-extended-pink" : undefined}>{tool.output}</div> : null}
        </div>
        <ToolDetailsCopyButton text={copyText} />
      </div>
    </div>
  );
}

function OfficialTextToolDetails({ label, text }: { label: string; text: string }) {
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 flex flex-col overflow-hidden">
        <div className="px-p6 pt-p5 pb-p3 text-body text-assistant-secondary">{label}</div>
        <pre className="m-0 px-p6 pb-p5 text-code text-t8 whitespace-pre-wrap break-words">{text}</pre>
      </div>
    </div>
  );
}

function ToolPathButton({ path }: { path: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const open = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    actions?.openFile({ path });
  };
  return (
    <button className="flex flex-1 min-w-0 text-left text-body text-assistant-secondary outline-none hide-focus-ring ring-focus hover:underline underline-offset-[3px] bg-transparent border-0 p-0 m-0 cursor-default" onClick={open} type="button">
      <span className="truncate">{basename(path) ?? path}</span>
    </button>
  );
}

function ToolInputLine({ input, inputKey }: { input: Record<string, unknown>; inputKey: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const value = inputValueText(input[inputKey]);
  const isPath = inputKey === "file_path" || inputKey === "notebook_path" || inputKey === "path";
  return (
    <div>
      {inputKey}:{" "}
      {isPath ? (
        <button
          className="rounded-[4px] outline-none hide-focus-ring ring-focus bg-transparent border-0 p-0 m-0 text-left cursor-default"
          onClick={(event) => {
            event.stopPropagation();
            actions?.openFile({ path: value });
          }}
          type="button"
        >
          <code className="epitaxy-code-chip">{value}</code>
        </button>
      ) : value}
    </div>
  );
}

function inputValueText(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toolCopyText(tool: TranscriptToolUse) {
  const inputText = Object.keys(tool.input).map((key) => `${key}: ${inputValueText(tool.input[key])}`).join("\n");
  return tool.output ? [inputText, tool.output].filter(Boolean).join("\n\n") : inputText;
}

function normalizeReadFileOutput(output: string) {
  const stripped = output.replace(/\n<system-reminder>[\s\S]*$/, "").replace(/\n+$/, "");
  const lines = stripped.split("\n");
  const numberedLine = /^ *\d+(?:[:|→] ?|\t)/;
  return lines.every((line) => !line || numberedLine.test(line))
    ? lines.map((line) => line.replace(numberedLine, "")).join("\n")
    : stripped;
}

function ToolDetailsCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  if (!text) return null;
  return (
    <div className="opacity-0 group-hover/body:opacity-100 focus-within:opacity-100 [transition:opacity_150ms_cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none">
      <OfficialButton ariaLabel={copied ? "Copied" : "Copy"} icon={copied ? "CheckSelection" : "CopySquareBehind"} onClick={copy} size="small" variant="uncontained" />
    </div>
  );
}

function plural(count: number, singular: string, pluralValue: string, oneArticle?: string) {
  if (count === 1) return oneArticle ? `${oneArticle} ${singular}` : `1 ${singular}`;
  return `${count} ${pluralValue}`;
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

function UserBashBlock({ item }: { item: Extract<TranscriptEntryItem, { kind: "bash" }> }) {
  return (
    <div className="rounded-r4 bg-t1 px-p6 py-p4 text-code text-t8 whitespace-pre-wrap break-all">
      {item.command ? <pre className="m-0">{item.command}</pre> : null}
      {item.output || item.error ? <pre className={`m-0 ${item.command ? "mt-p4" : ""} ${item.error ? "text-destructive-default" : "text-assistant-secondary"}`}>{item.error ?? item.output}</pre> : null}
    </div>
  );
}

function normalizeToolUse(tool: unknown, index = 0): TranscriptToolUse {
  const record = asRecord(tool);
  const toolUseResult = asRecord(record.toolUseResult ?? record.tool_use_result);
  const isError = record.isError === true || record.is_error === true || toolUseResult.isError === true || toolUseResult.is_error === true;
  const output = stringValue(record.output) ?? stringValue(record.content) ?? stringValue(toolUseResult.output) ?? stringValue(toolUseResult.content);
  const subagentActivity = normalizeSubagentActivity(record.subagentActivity ?? record.subagent_activity);
  return {
    id: stringValue(record.id) ?? `tool-${index}`,
    input: asRecord(record.input),
    isError,
    name: stringValue(record.name) ?? stringValue(record.tool_name) ?? stringValue(record.kind) ?? "Tool",
    output,
    status: normalizeToolStatus(record.status, isError, output),
    ...(subagentActivity ? { subagentActivity } : {}),
  };
}

function normalizeSubagentActivity(value: unknown): TranscriptToolUse["subagentActivity"] | undefined {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return undefined;
  return {
    latestToolName: stringValue(raw.latestToolName) ?? stringValue(raw.latest_tool_name),
    model: stringValue(raw.model),
    toolCallCount: typeof raw.toolCallCount === "number" ? raw.toolCallCount : typeof raw.tool_call_count === "number" ? raw.tool_call_count : undefined,
  };
}

function normalizeToolStatus(status: unknown, isError?: boolean, output?: string) {
  if (status === "awaiting_approval") return "awaiting_approval";
  if (status === "running") return "running";
  if (status === "error" || isError) return "error";
  if (status === "completed" || output) return "completed";
  return "running";
}

function isVisibleAssistantEntryItem(item: TranscriptEntryItem): item is Exclude<TranscriptEntryItem, { kind: "uploaded-file" }> {
  return item.kind !== "uploaded-file";
}

type MarkdownBlock =
  | { kind: "blockquote"; key: string; lines: string[] }
  | { kind: "code"; key: string; language?: string; text: string }
  | { kind: "heading"; key: string; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "hr"; key: string }
  | { kind: "list"; items: string[]; key: string; ordered: boolean }
  | { kind: "paragraph"; key: string; lines: string[] }
  | { headers: string[]; kind: "table"; key: string; rows: string[][] };

function OfficialCodeMarkdown({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const normalized = useMemo(() => preprocessOfficialCodeMarkdown(text), [text]);
  const chunks = useOfficialCodeMarkdownChunks(normalized, isStreaming);
  const renderedChunks = useMemo(() => {
    const completed = chunks.completedChunks.map((chunk, index) => index > 0 ? `\n\n${chunk}` : chunk);
    const streaming = chunks.streamingChunk || (chunks.completedChunks.length === 0 ? normalized : "");
    if (streaming) completed.push(chunks.completedChunks.length > 0 ? `\n\n${streaming}` : streaming);
    return completed;
  }, [chunks.completedChunks, chunks.streamingChunk, normalized]);
  return (
    <div className="epitaxy-markdown" data-official-source="c11959232-h_zsw3wI.js:kb + c93fb40ec-C-L_NkHO.js:Oe">
      {renderedChunks.map((chunk, index) => (
        <OfficialCodeMarkdownChunk chunk={chunk} key={index} scope={`code-${index}`} />
      ))}
    </div>
  );
}

const OfficialCodeMarkdownChunk = memo(function OfficialCodeMarkdownChunk({ chunk, scope }: { chunk: string; scope: string }) {
  return <>{parseMarkdownBlocks(chunk).map((block) => renderMarkdownBlock(block, scope))}</>;
}, (previous, next) => previous.chunk === next.chunk && previous.scope === next.scope);

function useOfficialCodeMarkdownChunks(text: string, isStreaming: boolean) {
  const stableChunks = useMemo(() => ({ completedChunks: text ? [text] : [], streamingChunk: "" }), [text]);
  const [chunks, setChunks] = useState<{ completedChunks: string[]; streamingChunk: string }>({ completedChunks: [], streamingChunk: "" });
  const trackerRef = useRef<OfficialMarkdownStructureTracker | null>(null);

  useEffect(() => {
    if (!isStreaming) return undefined;
    if (!text) {
      setChunks({ completedChunks: [], streamingChunk: "" });
      return undefined;
    }
    trackerRef.current ??= new OfficialMarkdownStructureTracker();
    const lines = text.split("\n");
    const completedChunks: string[] = [];
    let pendingLines: string[] = [];
    let completedThrough = -1;
    trackerRef.current.reset();
    for (let index = 0; index < lines.length; index += 1) {
      const line = lines[index];
      const { insideStructure, previousLineWasEmpty, structureJustClosed } = trackerRef.current.processLine(line);
      pendingLines.push(line);
      if (structureJustClosed || (!insideStructure && line.trim() === "" && pendingLines.length > 1 && !previousLineWasEmpty)) {
        while (pendingLines.length > 0 && pendingLines[pendingLines.length - 1].trim() === "") pendingLines.pop();
        if (pendingLines.length > 0) {
          completedChunks.push(pendingLines.join("\n"));
          completedThrough = index;
          pendingLines = [];
        }
      }
    }
    setChunks({
      completedChunks,
      streamingChunk: lines.slice(completedThrough + 1).join("\n"),
    });
    return undefined;
  }, [isStreaming, text]);

  return isStreaming ? chunks : stableChunks;
}

class OfficialMarkdownStructureTracker {
  private codeBlockDelimiter = "";
  private inBlockquote = false;
  private inCodeBlock = false;
  private inList = false;
  private inMathBlock = false;
  private inTable = false;
  private lastLineWasEmpty = true;

  reset() {
    this.inBlockquote = false;
    this.inCodeBlock = false;
    this.codeBlockDelimiter = "";
    this.inList = false;
    this.inMathBlock = false;
    this.inTable = false;
    this.lastLineWasEmpty = true;
  }

  processLine(line: string) {
    const trimmed = line.trim();
    const wasInsideStructure = this.isInsideStructure();
    if ((trimmed.startsWith("```") || trimmed.startsWith("~~~")) && !this.inMathBlock) {
      if (this.inCodeBlock) {
        if (trimmed.startsWith(this.codeBlockDelimiter)) {
          this.inCodeBlock = false;
          this.codeBlockDelimiter = "";
        }
      } else {
        this.inCodeBlock = true;
        this.codeBlockDelimiter = trimmed.substring(0, 3);
      }
    }
    if (trimmed === "$$" && !this.inCodeBlock) this.inMathBlock = !this.inMathBlock;
    const inCodeOrMath = this.inCodeBlock || this.inMathBlock;
    if (/^[-*+]|\d+\./.test(trimmed) && !inCodeOrMath) this.inList = true;
    else if (this.inList && trimmed === "") this.inList = false;
    if (line.includes("|") && !inCodeOrMath) this.inTable = true;
    else if (this.inTable && trimmed === "") this.inTable = false;
    const isBlockquoteLine = trimmed.startsWith(">");
    if (isBlockquoteLine && !inCodeOrMath) this.inBlockquote = true;
    else if (this.inBlockquote && trimmed === "" && !isBlockquoteLine) this.inBlockquote = false;
    const previousLineWasEmpty = this.lastLineWasEmpty;
    this.lastLineWasEmpty = trimmed === "";
    return {
      insideStructure: this.isInsideStructure(),
      previousLineWasEmpty,
      structureJustClosed: wasInsideStructure && !this.isInsideStructure(),
    };
  }

  private isInsideStructure() {
    return this.inBlockquote || this.inCodeBlock || this.inList || this.inMathBlock || this.inTable;
  }
}

const officialSearchTreeBlockPattern = /<search_tree>([\s\S]*?)<\/search_tree>/g;

function preprocessOfficialCodeMarkdown(text: string) {
  return text.includes("<search_tree>")
    ? text.replace(officialSearchTreeBlockPattern, (_match, body: string) => `\n\n\`\`\`search_tree\n${body.trim()}\n\`\`\`\n\n`)
    : text;
}

function MarkdownContent({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const chunks = useMemo(() => splitStreamingMarkdown(text, isStreaming), [isStreaming, text]);
  const committedBlocks = useMemo(() => parseMarkdownBlocks(chunks.committed), [chunks.committed]);
  const frontierBlocks = useMemo(() => parseMarkdownBlocks(chunks.frontier), [chunks.frontier]);
  return (
    <>
      {committedBlocks.map((block) => renderMarkdownBlock(block, "committed"))}
      {frontierBlocks.map((block) => renderMarkdownBlock(block, "frontier"))}
    </>
  );
}

function splitStreamingMarkdown(text: string, isStreaming: boolean) {
  if (!isStreaming) return { committed: text, frontier: "" };
  const normalized = text.replace(/\r\n?/g, "\n");
  const boundary = lastStableMarkdownBoundary(normalized);
  if (boundary <= 0) return { committed: "", frontier: normalized };
  return {
    committed: normalized.slice(0, boundary).trimEnd(),
    frontier: normalized.slice(boundary).replace(/^\n+/, ""),
  };
}

function lastStableMarkdownBoundary(text: string) {
  let inFence = false;
  let lastBoundary = -1;
  let offset = 0;
  for (const line of text.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    offset += line.length + 1;
    if (!inFence && line.trim() === "") lastBoundary = offset;
  }
  return lastBoundary;
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", key: `p-${blocks.length}`, lines: paragraph });
    paragraph = [];
  };

  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (line.trim() === "") { flushParagraph(); index += 1; continue; }
    const fenced = line.match(/^```(.*)$/);
    if (fenced) { flushParagraph(); index = pushCodeBlock(lines, index, fenced[1], blocks); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flushParagraph(); blocks.push({ kind: "heading", key: `h-${blocks.length}`, level: heading[1].length as MarkdownBlockHeadingLevel, text: heading[2].trim() }); index += 1; continue; }
    if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { flushParagraph(); blocks.push({ kind: "hr", key: `hr-${blocks.length}` }); index += 1; continue; }
    if (isTableStart(lines, index)) { flushParagraph(); index = pushTableBlock(lines, index, blocks); continue; }
    const listMatch = parseListItem(line);
    if (listMatch) { flushParagraph(); index = pushListBlock(lines, index, listMatch.ordered, blocks); continue; }
    const quote = line.match(/^>\s?(.*)$/);
    if (quote) { flushParagraph(); index = pushQuoteBlock(lines, index, blocks); continue; }
    paragraph.push(line);
    index += 1;
  }
  flushParagraph();
  return blocks;
}

type MarkdownBlockHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

function pushCodeBlock(lines: string[], start: number, rawLanguage: string, blocks: MarkdownBlock[]) {
  const code: string[] = [];
  let index = start + 1;
  while (index < lines.length && !lines[index].startsWith("```")) {
    code.push(lines[index]);
    index += 1;
  }
  blocks.push({ kind: "code", key: `code-${blocks.length}`, language: rawLanguage.trim() || undefined, text: code.join("\n") });
  return index < lines.length ? index + 1 : index;
}

function pushListBlock(lines: string[], start: number, ordered: boolean, blocks: MarkdownBlock[]) {
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    if (lines[index].trim() === "" && parseListItem(lines[index + 1] ?? "")?.ordered === ordered) {
      index += 1;
      continue;
    }
    const item = parseListItem(lines[index]);
    if (!item || item.ordered !== ordered) break;
    items.push(item.text);
    index += 1;
  }
  blocks.push({ kind: "list", items, key: `list-${blocks.length}`, ordered });
  return index;
}

function isTableStart(lines: string[], index: number) {
  return lines[index]?.includes("|") && /^(\s*\|)?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "");
}

function pushTableBlock(lines: string[], start: number, blocks: MarkdownBlock[]) {
  const headers = splitTableRow(lines[start]);
  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length && lines[index].includes("|") && lines[index].trim() !== "") {
    rows.push(splitTableRow(lines[index]));
    index += 1;
  }
  blocks.push({ headers, kind: "table", key: `table-${blocks.length}`, rows });
  return index;
}

function splitTableRow(line: string) {
  return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim());
}

function pushQuoteBlock(lines: string[], start: number, blocks: MarkdownBlock[]) {
  const quoteLines: string[] = [];
  let index = start;
  while (index < lines.length) {
    const quote = lines[index].match(/^>\s?(.*)$/);
    if (!quote) break;
    quoteLines.push(quote[1]);
    index += 1;
  }
  blocks.push({ kind: "blockquote", key: `quote-${blocks.length}`, lines: quoteLines });
  return index;
}

function parseListItem(line: string) {
  const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
  if (bullet) return { ordered: false, text: bullet[1] };
  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
  if (ordered) return { ordered: true, text: ordered[1] };
  return null;
}

function renderMarkdownBlock(block: MarkdownBlock, keyScope = "block") {
  const blockKey = `${keyScope}-${block.key}`;
  if (block.kind === "heading") return createElement(`h${block.level}`, { key: blockKey }, renderInlineMarkdown(block.text, blockKey));
  if (block.kind === "code") return <pre key={blockKey}><code className={block.language ? `language-${block.language}` : undefined}>{block.text}</code></pre>;
  if (block.kind === "list") return createElement(block.ordered ? "ol" : "ul", { key: blockKey }, block.items.map((item, index) => <li key={index}>{renderInlineMarkdown(item, `${blockKey}-${index}`)}</li>));
  if (block.kind === "blockquote") return <blockquote key={blockKey}>{block.lines.map((line, index) => <p key={index}>{renderInlineMarkdown(line, `${blockKey}-${index}`)}</p>)}</blockquote>;
  if (block.kind === "table") return <MarkdownTable block={block} key={blockKey} keyPrefix={blockKey} />;
  if (block.kind === "hr") return <hr key={blockKey} />;
  return <p key={blockKey}>{renderInlineMarkdown(block.lines.join("\n"), blockKey)}</p>;
}

function MarkdownTable({ block, keyPrefix = block.key }: { block: Extract<MarkdownBlock, { kind: "table" }>; keyPrefix?: string }) {
  return (
    <table>
      <thead>
        <tr>{block.headers.map((cell, index) => <th key={index}>{renderInlineMarkdown(cell, `${keyPrefix}-h${index}`)}</th>)}</tr>
      </thead>
      <tbody>
        {block.rows.map((row, rowIndex) => (
          <tr key={rowIndex}>{block.headers.map((_header, cellIndex) => <td key={cellIndex}>{renderInlineMarkdown(row[cellIndex] ?? "", `${keyPrefix}-${rowIndex}-${cellIndex}`)}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function renderInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const tokenPattern = /(`[^`]+`|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  for (const match of text.matchAll(tokenPattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(renderInlineToken(match[0], `${keyPrefix}-i${nodes.length}`));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function renderInlineToken(token: string, key: string) {
  if (token.startsWith("`")) return <code key={key}>{token.slice(1, -1)}</code>;
  if (token.startsWith("**") || token.startsWith("__")) return <strong key={key}>{renderInlineMarkdown(token.slice(2, -2), key)}</strong>;
  if (token.startsWith("*") || token.startsWith("_")) return <em key={key}>{renderInlineMarkdown(token.slice(1, -1), key)}</em>;
  const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  if (link) return <a key={key} href={link[2]} rel="noreferrer" target="_blank">{link[1]}</a>;
  return token;
}

function ThinkingActivity() {
  return (
    <div className="flex items-center gap-4 text-t7 select-none" data-testid="epitaxy-thinking-activity">
      <div className="w-5 h-5 shrink-0">
        <OfficialThinkingSpark className="!w-5 !h-5" size={20} />
      </div>
      <span className="text-sm text-t6">Thinking...</span>
    </div>
  );
}

function OfficialThinkingSpark({ className, size = 20 }: { className?: string; size?: number }) {
  const animation = useOfficialThinkingSparkAnimation();
  const animationRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = animationRef.current;
    if (!animation || !node || typeof node.animate !== "function") return undefined;
    const frames = Array.from({ length: animation.frameCount }, (_frame, index) => ({
      transform: `translateY(-${index * (100 / animation.frameCount)}%)`,
    }));
    const player = node.animate(frames, {
      duration: animation.speed * animation.frameCount,
      easing: `steps(${animation.frameCount}, jump-none)`,
      fill: "forwards",
      iterations: Infinity,
    });
    return () => player.cancel();
  }, [animation]);

  if (!animation) {
    return <Icon className={className} customSize={size} name="ExtendedThinking" style={{ color: "var(--cds-clay, #d97757)" }} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-block overflow-hidden select-none [@media(max-resolution:1.99dppx)]:[clip-path:inset(1px_0)] ${className ?? ""}`}
      data-cds="Spark"
      style={{ aspectRatio: animation.width / animation.height, color: "var(--cds-clay, #d97757)", width: size }}
    >
      <span
        className="block [&>svg]:block [&>svg]:w-full [&>svg]:fill-current"
        dangerouslySetInnerHTML={{ __html: animation.svg }}
        ref={animationRef}
      />
    </span>
  );
}

function useOfficialThinkingSparkAnimation() {
  const [animation, setAnimation] = useState<OfficialSparkAnimation | null>(officialThinkingSparkAnimationCache);

  useEffect(() => {
    let alive = true;
    loadOfficialThinkingSparkAnimation()
      .then((next) => {
        if (alive && next) setAnimation(next);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return animation;
}

function loadOfficialThinkingSparkAnimation() {
  if (officialThinkingSparkAnimationCache) return Promise.resolve(officialThinkingSparkAnimationCache);
  if (!officialThinkingSparkAnimationPromise) {
    officialThinkingSparkAnimationPromise = fetch(officialSparkBundlePath)
      .then((response) => response.ok ? response.text() : "")
      .then((source) => {
        const next = source ? parseOfficialThinkingSparkAnimation(source) : null;
        officialThinkingSparkAnimationCache = next;
        officialThinkingSparkAnimationPromise = null;
        return next;
      })
      .catch(() => {
        officialThinkingSparkAnimationPromise = null;
        return null;
      });
  }
  return officialThinkingSparkAnimationPromise;
}

function parseOfficialThinkingSparkAnimation(source: string): OfficialSparkAnimation | null {
  const match = source.match(/thinking:\{svg:'([\s\S]*?)',width:(\d+),height:(\d+),frameCount:(\d+),speed:(\d+)\}/);
  if (!match) return null;
  return {
    svg: decodeBundledString(match[1]),
    width: Number(match[2]),
    height: Number(match[3]),
    frameCount: Number(match[4]),
    speed: Number(match[5]),
  };
}

function decodeBundledString(value: string) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}

const codeModelOptions = [
  { label: "Default", value: "default" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus", value: "opus" },
];

const permissionModeOptions = [
  { label: "询问权限", value: "default" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "规划模式", value: "plan" },
  { label: "绕过权限", value: "bypassPermissions" },
];

const effortLevelOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
];

function modelLabel(value: string) {
  const normalized = normalizeCodeModelValue(value);
  return codeModelOptions.find((option) => option.value === normalized)?.label ?? formatClaudeModelLabel(value);
}

function normalizeCodeModelValue(value?: string) {
  if (!value || value === "opus-4") return "default";
  if (value === "sonnet-4") return "sonnet";
  return value;
}

function formatClaudeModelLabel(value: string) {
  const match = value.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/i);
  if (!match) return value;
  const family = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
  return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}

function permissionModeLabel(value: string) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

function normalizeEffortValue(value?: string) {
  return effortLevelOptions.some((option) => option.value === value) ? value! : "medium";
}

function effortLevelLabel(value: string) {
  return effortLevelOptions.find((option) => option.value === value)?.label ?? value;
}

type InlineToolPermissionRequest = {
  alwaysAllowScope?: string;
  decisionReason?: string;
  description?: string;
  hasAlwaysAllow?: boolean;
  input: Record<string, unknown>;
  requestId: string;
  sessionId: string;
  toolName: string;
  toolUseId?: string;
};

function InlineToolPermissionApprovals({ bridge, sessionId }: { bridge: LocalSessionsBridge; sessionId?: string }) {
  const [requests, setRequests] = useState<InlineToolPermissionRequest[]>([]);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) {
      setRequests([]);
      return undefined;
    }
    let alive = true;
    void bridge.getSession(sessionId).then((session) => {
      if (!alive || !session?.pendingToolPermissions?.length) return;
      setRequests(session.pendingToolPermissions.map((item) => ({
        alwaysAllowScope: item.alwaysAllowScope,
        decisionReason: item.decisionReason,
        description: item.description,
        hasAlwaysAllow: item.hasAlwaysAllow,
        input: asRecord(item.input),
        requestId: item.requestId,
        sessionId: item.sessionId,
        toolName: item.toolName,
        toolUseId: item.toolUseId,
      })));
    }).catch(() => {});
    const onPermissionEvent = (event: unknown) => {
      const resolvedId = toolPermissionResolvedId(event, sessionId);
      if (resolvedId) {
        setRequests((current) => current.filter((request) => request.requestId !== resolvedId));
        return;
      }
      const request = normalizeToolPermissionRequest(event, sessionId);
      if (!request) return;
      setResolveError(null);
      setRequests((current) => {
        const existingIndex = current.findIndex((item) => item.requestId === request.requestId);
        if (existingIndex < 0) return [...current, request];
        const next = current.slice();
        next[existingIndex] = request;
        return next;
      });
    };
    const unsubscribePermission = bridge.onToolPermissionRequest?.(onPermissionEvent);
    const unsubscribeEvents = bridge.onEvent?.(onPermissionEvent);
    return () => {
      alive = false;
      unsubscribePermission?.();
      unsubscribeEvents?.();
    };
  }, [bridge, sessionId]);

  const request = requests[0];
  const hasAlwaysAllow = request?.hasAlwaysAllow !== false;
  const decide = useCallback(async (decision: "always" | "deny" | "once") => {
    if (!request || !bridge.respondToToolPermission) return;
    if (decision === "always" && request.hasAlwaysAllow === false) return;
    setResolvingId(request.requestId);
    setResolveError(null);
    try {
      const result = await bridge.respondToToolPermission(request.requestId, decision, request.input);
      if (toolPermissionResponseFailed(result)) {
        setResolveError(toolPermissionResponseError(result));
        return;
      }
      setRequests((current) => current.filter((item) => item.requestId !== request.requestId));
    } catch (error) {
      setResolveError(error instanceof Error ? error.message : String(error));
    } finally {
      setResolvingId(null);
    }
  }, [bridge, request]);

  useEffect(() => {
    if (!request) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || resolvingId === request.requestId) return;
      if (event.key === "Escape") {
        if (event.isComposing) {
          event.stopPropagation();
          return;
        }
        event.preventDefault();
        event.stopPropagation();
        void decide("deny");
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
        event.preventDefault();
        event.stopPropagation();
        const decision = event.shiftKey ? "always" : "once";
        if (decision === "always" && !hasAlwaysAllow) return;
        void decide(decision);
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [decide, hasAlwaysAllow, request, resolvingId]);

  if (!request) return null;

  const busy = resolvingId === request.requestId;
  return (
    <OfficialToolApprovalCard
      busy={busy}
      onDecide={(decision) => void decide(decision)}
      queueDepth={Math.max(0, requests.length - 1)}
      request={request}
    >
      {resolveError ? <div className="text-footnote text-extended-pink">{resolveError}</div> : null}
    </OfficialToolApprovalCard>
  );
}

type OfficialToolApprovalDecision = "always" | "deny" | "once";

type OfficialToolApprovalCopy = {
  action: ReactNode;
  detail?: string;
  meta?: string;
};

const officialApprovalCollapseTransition = {
  height: { type: "spring", duration: 0.35, bounce: 0 },
  opacity: { duration: 0.2, ease: "easeOut" },
} as const;

const officialApprovalCollapsed = { height: 0, opacity: 0 } as const;
const officialApprovalExpanded = { height: "auto", opacity: 1 } as const;

const OfficialToolApprovalCard = memo(function OfficialToolApprovalCard({
  busy,
  children,
  onDecide,
  queueDepth,
  request,
}: {
  busy?: boolean;
  children?: ReactNode;
  onDecide: (decision: OfficialToolApprovalDecision) => void;
  queueDepth: number;
  request: InlineToolPermissionRequest;
}) {
  const copy = useMemo(() => officialToolApprovalCopy(request), [request]);
  const ghostCount = Math.min(queueDepth, 2);
  const hasAlwaysAllow = request.hasAlwaysAllow !== false;

  return (
    <div className="epitaxy-approval-card">
      {Array.from({ length: ghostCount }, (_, index) => {
        const layer = index + 1;
        return (
          <div
            aria-hidden="true"
            className="absolute inset-0 rounded-r7 bg-surface-primary-elevated epitaxy-approval-ghost"
            key={layer}
            style={{
              opacity: 1 - 0.25 * layer,
              transform: `translateY(-${6 * layer}px) scale(${1 - 0.03 * layer})`,
              zIndex: -layer,
            }}
          />
        );
      })}
      <OfficialApprovalSurface elevation="sidebar" />
      <OfficialToolApprovalCopyView copy={copy} description={request.description} toolName={request.toolName} />
      {request.decisionReason ? <div className="text-footnote text-t7 select-text break-words">{request.decisionReason}</div> : null}
      {children}
      <div className="epitaxy-approval-actions flex flex-wrap justify-between gap-x-g3 gap-y-[8px]">
        <OfficialButton ariaLabel="Deny" className="shrink-0" disabled={busy} onClick={() => onDecide("deny")} size="base" variant="contained">
          Deny
          <OfficialApprovalShortcut>esc</OfficialApprovalShortcut>
        </OfficialButton>
        <div className="flex min-w-0 flex-wrap gap-[8px]">
          {hasAlwaysAllow ? (
            <OfficialButton ariaLabel="Always allow" className="min-w-0" disabled={busy} onClick={() => onDecide("always")} size="base" variant="contained">
              <span className="min-w-0 truncate">{officialAlwaysAllowLabel(request.alwaysAllowScope)}</span>
              <OfficialApprovalShortcut>⌘⇧⏎</OfficialApprovalShortcut>
            </OfficialButton>
          ) : null}
          <OfficialButton ariaLabel="Allow once" className="min-w-0" disabled={busy} onClick={() => onDecide("once")} size="base" variant="primary">
            <span className="min-w-0 truncate">Allow once</span>
            <OfficialApprovalShortcut>⌘⏎</OfficialApprovalShortcut>
          </OfficialButton>
        </div>
      </div>
    </div>
  );
});

function OfficialToolApprovalCopyView({ copy, description, toolName }: { copy: OfficialToolApprovalCopy; description?: string; toolName: string }) {
  const [expanded, setExpanded] = useState(true);
  const hasDetail = Boolean(copy.detail && copy.detail !== copy.meta);
  const toolIntro = <div className="text-footnote text-t6 select-text break-words">Claude wants to use {toolName}</div>;
  const descriptionNode = description ? <div className="text-footnote text-t6 select-text break-words">{description}</div> : null;
  const title = (
    <>
      Allow Claude to <span className="text-t9">{copy.action}</span>
      {copy.meta ? <> <span className="text-t9">{copy.meta}</span></> : null}?
    </>
  );

  if (hasDetail) {
    return (
      <div className="flex flex-col gap-[8px]">
        {toolIntro}
        <OfficialApprovalHeader ariaExpanded={expanded} onClick={() => setExpanded((value) => !value)}>{title}</OfficialApprovalHeader>
        {descriptionNode}
        <OfficialApprovalCollapse expanded={expanded}>
          <div className="bg-t1 rounded-r4 py-p6 px-p8 text-code text-t7 whitespace-pre-wrap break-words select-text max-h-[240px] overflow-y-auto">{copy.detail}</div>
        </OfficialApprovalCollapse>
      </div>
    );
  }

  if (descriptionNode) {
    return (
      <div className="flex flex-col gap-[8px]">
        {toolIntro}
        <OfficialApprovalHeader>{title}</OfficialApprovalHeader>
        {descriptionNode}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-[8px]">
      {toolIntro}
      <OfficialApprovalHeader>{title}</OfficialApprovalHeader>
    </div>
  );
}

function OfficialApprovalHeader({
  ariaExpanded,
  children,
  className,
  onClick,
}: {
  ariaExpanded?: boolean;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const baseClass = className ?? "text-body-semibold text-t9 min-h-[24px] flex items-center gap-1 pb-p6";
  const content = (
    <span className="flex flex-1 min-w-0 flex-col gap-[2px]">
      <span className="flex items-center gap-g3 min-w-0">
        <span aria-hidden="true" className="grid size-[20px] shrink-0 place-items-center">
          <span className="size-[6px] rounded-full bg-extended-yellow" />
        </span>
        <span className="min-w-0 break-words">{children}</span>
      </span>
    </span>
  );

  return onClick ? (
    <button
      aria-expanded={ariaExpanded}
      className={`${baseClass} w-full text-left outline-none hide-focus-ring focus:ring-focus`}
      onClick={onClick}
      type="button"
    >
      {content}
    </button>
  ) : (
    <div className={baseClass}>{content}</div>
  );
}

function OfficialApprovalCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          animate={officialApprovalExpanded}
          className="overflow-hidden"
          exit={officialApprovalCollapsed}
          initial={officialApprovalCollapsed}
          transition={officialApprovalCollapseTransition}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OfficialApprovalSurface({ className, elevation }: { className?: string; elevation: "hud" | "popover" | "prompt" | "sidebar" }) {
  const elevationClass = {
    hud: "bg-surface-hud effect-hud",
    popover: "bg-surface-popover effect-stroke-shadow",
    prompt: "bg-surface-prompt-blur effect-prompt-blur",
    sidebar: "bg-surface-primary-elevated effect-primary-elevated",
  }[elevation];
  return <div aria-hidden="true" className={`absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none ${elevationClass} ${className ?? ""}`} data-surface={elevation} />;
}

function OfficialApprovalShortcut({ children }: { children: ReactNode }) {
  return <kbd className="text-caption opacity-60 shrink-0">{children}</kbd>;
}

function officialAlwaysAllowLabel(scope?: string) {
  if (scope === "session") return "Always allow in this session";
  if (scope === "project") return "Always allow in this project";
  if (scope === "projectLocal") return "Always allow in this project (local)";
  if (scope === "user") return "Always allow everywhere";
  return "Always allow";
}

function officialToolApprovalCopy(request: InlineToolPermissionRequest): OfficialToolApprovalCopy {
  const input = request.input;
  const stringInput = (key: string) => stringValue(input[key]);
  const toolName = request.toolName;
  const normalizedName = toolName.split("__").pop() ?? toolName;
  switch (normalizedName) {
    case "Bash":
    case "BashTool":
      return { action: "run", meta: stringInput("description"), detail: stringInput("command") };
    case "Read":
      return { action: "read", ...officialPathCopy(stringInput("file_path")) };
    case "Write":
      return { action: "write", ...officialPathCopy(stringInput("file_path")) };
    case "Edit":
    case "MultiEdit":
      return { action: "edit", ...officialPathCopy(stringInput("file_path")) };
    case "NotebookEdit":
      return { action: "edit", ...officialPathCopy(stringInput("notebook_path")) };
    case "Grep":
    case "Glob":
      return { action: "search", meta: stringInput("pattern") };
    case "WebFetch":
      return { action: "fetch", meta: stringInput("url") };
    case "WebSearch":
      return { action: "search the web", meta: stringInput("query") };
    case "Skill": {
      const skill = stringInput("skill");
      return { action: "run skill", meta: skill ? `/${skill}` : undefined, detail: stringInput("args") };
    }
    case "Task":
    case "Agent":
      return { action: "run an agent", meta: stringInput("description") };
    case "request_directory": {
      const directory = stringInput("path");
      return directory ? { action: "access", ...officialPathCopy(directory) } : { action: "access a folder" };
    }
    default: {
      const label = toolName.startsWith("mcp__") ? normalizedName.replace(/_/g, " ") : normalizedName;
      return {
        action: `use ${label}`,
        detail: Object.keys(input).length > 0 ? JSON.stringify(input, null, 2) : undefined,
      };
    }
  }
}

function officialPathCopy(value?: string) {
  return value ? { meta: officialBasename(value), detail: value } : {};
}

function officialBasename(value: string) {
  const trimmed = value.replace(/[\\/]+$/, "");
  const index = Math.max(trimmed.lastIndexOf("/"), trimmed.lastIndexOf("\\"));
  return index < 0 ? trimmed : trimmed.slice(index + 1);
}

function toolPermissionResponseFailed(value: unknown) {
  const raw = asRecord(value);
  return raw.ok === false || raw.success === false || Boolean(raw.error);
}

function toolPermissionResponseError(value: unknown) {
  const raw = asRecord(value);
  return stringValue(raw.error) ?? "Permission response failed.";
}

function ExistingSessionComposer({
  bridge,
  disabled,
  isResponding,
  onOpenDiff,
  onScrollToBottom,
  onSubmit,
  reload,
  session,
  sessionRef,
  showScrollButton,
}: {
  bridge: LocalSessionsBridge;
  disabled: boolean;
  isResponding: boolean;
  onOpenDiff?: () => void;
  onScrollToBottom: () => void;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: () => Promise<void>;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  showScrollButton: boolean;
}) {
  const [text, setText] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [model, setModel] = useState(() => normalizeCodeModelValue(session?.model));
  const [permissionMode, setPermissionMode] = useState(session?.permissionMode ?? "default");
  const [effort, setEffort] = useState(() => normalizeEffortValue(session?.effort));
  const [isConfigBusy, setConfigBusy] = useState(false);
  const submitRef = useRef<() => Promise<void>>(async () => {});
  const clearComposerRef = useRef<() => void>(() => {});
  const tiptapEditorRef = useRef<Editor | null>(null);
  const slashMenuStateRef = useRef({ bridge, session, sessionRef });
  slashMenuStateRef.current = { bridge, session, sessionRef };
  const slashMenuComponent = useMemo(() => function EpitaxySlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={state.session} sessionRef={state.sessionRef} />;
  }, []);
  const bashModeRef = useRef(false);
  const respondingRef = useRef(isResponding);
  const isBashMode = text.trimStart().startsWith("!");
  const placeholder = "Type / for commands";
  const canStop = isResponding && Boolean(sessionRef && bridge.stop);
  const canSubmit = text.trim().length > 0 && !disabled && !isSubmitting && !isResponding;
  const editor = useEditor({
    content: "",
    editable: !disabled && !isSubmitting && !isResponding,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (tiptapEditorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Escape" && bashModeRef.current && !hasSlashMenu) {
          event.preventDefault();
          clearComposerRef.current();
          return true;
        }
        if (event.key === "Enter" && !event.shiftKey && !event.altKey && !event.isComposing && !hasSlashMenu) {
          event.preventDefault();
          if (!respondingRef.current) void submitRef.current();
          return true;
        }
        return false;
      },
    },
    onCreate: ({ editor }) => {
      tiptapEditorRef.current = editor;
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
      }),
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onUpdate: ({ editor: nextEditor }) => {
      setText(nextEditor.getText({ blockSeparator: "\n" }));
    },
  }, [placeholder, slashMenuComponent]);

  useEffect(() => {
    setModel(normalizeCodeModelValue(session?.model));
    setPermissionMode(session?.permissionMode ?? "default");
    setEffort(normalizeEffortValue(session?.effort));
  }, [session?.effort, session?.model, session?.permissionMode]);

  useEffect(() => {
    bashModeRef.current = isBashMode;
    respondingRef.current = isResponding;
  }, [isBashMode, isResponding]);

  useEffect(() => {
    const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { disabled?: boolean } | undefined;
    if (slashStorage) slashStorage.disabled = isBashMode;
  }, [editor, isBashMode]);

  useEffect(() => {
    editor?.setEditable(!disabled && !isSubmitting && !isResponding);
  }, [disabled, editor, isResponding, isSubmitting]);

  const clearComposer = useCallback(() => {
    editor?.commands.clearContent(true);
    setText("");
  }, [editor]);

  const insertSlashCommand = useCallback(() => {
    editor?.chain().focus("start").insertContent("/").run();
  }, [editor]);

  const submit = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onSubmit(text.trim());
      clearComposer();
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, clearComposer, onSubmit, text]);

  useEffect(() => {
    submitRef.current = submit;
    clearComposerRef.current = clearComposer;
  }, [clearComposer, submit]);

  const stopResponse = async () => {
    if (!sessionRef || !bridge.stop) return;
    await bridge.stop(sessionRef.id);
    await reload();
  };

  const applyModel = async (nextModel: string) => {
    if (!sessionRef || nextModel === model) return;
    setModel(nextModel);
    setConfigBusy(true);
    try {
      await bridge.setModel?.(sessionRef.id, nextModel);
      await reload();
    } finally {
      setConfigBusy(false);
    }
  };

  const applyPermissionMode = async (nextMode: string) => {
    if (!sessionRef || nextMode === permissionMode) return;
    setPermissionMode(nextMode);
    setConfigBusy(true);
    try {
      await bridge.setPermissionMode?.(sessionRef.id, nextMode);
      await reload();
    } finally {
      setConfigBusy(false);
    }
  };

  const applyEffort = async (nextEffort: string) => {
    if (!sessionRef || nextEffort === effort) return;
    setEffort(nextEffort);
    setConfigBusy(true);
    try {
      await bridge.setEffort?.(sessionRef.id, nextEffort);
      await reload();
    } finally {
      setConfigBusy(false);
    }
  };

  const addFolder = async () => {
    if (!sessionRef) return;
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    const folder = paths?.[0];
    if (!folder) return;
    setConfigBusy(true);
    try {
      await bridge.addFolderToSession?.(sessionRef.id, folder);
      await reload();
    } finally {
      setConfigBusy(false);
    }
  };

  const modelItems = codeModelOptions.map((option) => ({
    label: option.label,
    checked: option.value === model,
    onSelect: () => void applyModel(option.value),
  }));
  const permissionItems = permissionModeOptions.map((option) => ({
    label: option.label,
    checked: option.value === permissionMode,
    onSelect: () => void applyPermissionMode(option.value),
  }));
  const effortItems = effortLevelOptions.map((option) => ({
    label: option.label,
    checked: option.value === effort,
    onSelect: () => void applyEffort(option.value),
  }));
  const modelExtraSections = bridge.setEffort ? [{ key: "effort", header: "Effort", items: effortItems }] : undefined;
  const plusMenuItems = [{ icon: "Folder1", label: "Add folder", onSelect: () => void addFolder() }];

  return (
    <div data-skip-approval-enter={undefined} className="epitaxy-chat-column epitaxy-chat-size relative shrink-0 flex flex-col gap-g5 [contain:layout]">
      <button
        aria-hidden={!showScrollButton}
        aria-label="Scroll to bottom"
        className={`inline-flex items-center h-[24px] px-p3 rounded-r5 bg-fill-contained-default text-contained-default effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover cursor-default border-0 outline-none hide-focus-ring ring-focus absolute -top-[32px] left-1/2 -translate-x-1/2 z-[1] transition-opacity duration-150 ${showScrollButton ? "opacity-100" : "opacity-0 pointer-events-none"}`}
        onClick={onScrollToBottom}
        tabIndex={showScrollButton ? 0 : -1}
        type="button"
      >
        <Icon name="ChevronDownSmall" size="s" />
      </button>
      <OfficialEpitaxyBranchRows bridge={bridge} onOpenDiff={onOpenDiff} session={session} sessionRef={sessionRef} />
      <InlineToolPermissionApprovals bridge={bridge} sessionId={sessionRef?.id} />
      <div
        className={`epitaxy-prompt relative isolate rounded-r7 transition-shadow duration-300 ${isBashMode ? "[&_.tiptap]:font-mono [&_.tiptap]:text-[length:var(--text-code)]" : ""}`}
        onClick={(event) => {
          if (event.target instanceof HTMLElement && event.target.closest("button")) return;
          editor?.commands.focus();
        }}
      >
        <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-prompt-blur effect-prompt-blur" data-surface="prompt" />
        {isBashMode ? <div aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-r7 shadow-[inset_0_0_0_1px_var(--extended-purple)]" /> : null}
        <span className="sr-only" role="status">{isBashMode ? "Bash mode. Press Escape to return to chat." : "Chat mode"}</span>
        <div aria-hidden="true" className="grid min-w-0 transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" style={{ gridTemplateRows: "0fr" }}><div className="min-h-0 overflow-hidden" /></div>
        <div className="relative flex w-full">
          {isBashMode ? <span aria-hidden="true" title="Run as a shell command" className="ml-[var(--p7)] mt-[13px] shrink-0 select-none self-start rounded-r2 bg-extended-purple px-p3 text-code text-[var(--core-black)]">bash</span> : null}
          <EditorContent
            className={`epitaxy-prompt-input flex-1 min-w-0 text-heading text-t9 [&_.tiptap]:min-h-[var(--h8)] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:py-[13px] [&_.tiptap]:pl-p7 [&_.tiptap]:pr-p3 [&_.tiptap_p]:m-0 ${text.trim().length === 0 ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
            editor={editor}
            onKeyDownCapture={(event) => {
              const slashStorage = (editor?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
              const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
              if (event.key === "Escape" && isBashMode && !hasSlashMenu) {
                event.preventDefault();
                clearComposer();
              }
            }}
          />
          {text.trim().length === 0 ? <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 right-[var(--h8)] truncate pl-p7 pt-[13px] text-heading text-t5">{placeholder}</span> : null}
          <div className="flex self-end p-p7 pl-p3">
            <OfficialButton
              ariaLabel={canStop ? "Stop response" : "Send"}
              disabled={!canSubmit && !canStop}
              icon={canStop || isSubmitting ? "Stop" : "ArrowReturn"}
              onClick={() => void (canStop ? stopResponse() : submit())}
            />
          </div>
        </div>
      </div>
      <OfficialComposerFooter
        bridge={bridge}
        fastModeOn={false}
        hideDictation
        isPanelActive={!disabled}
        modelExtraSections={modelExtraSections}
        modelItems={modelItems}
        modelLabel={modelLabel(model)}
        modelPickerDisabled={disabled || isConfigBusy}
        permissionDanger={permissionMode === "bypassPermissions"}
        permissionItems={permissionItems}
        permissionLabel={permissionModeLabel(permissionMode)}
        plusAriaLabel="Add"
        plusMenuItems={plusMenuItems}
        session={session}
        sessionRef={sessionRef}
        onInsertSlashCommand={insertSlashCommand}
      />
    </div>
  );
}

type OfficialComposerDropdownItem = OfficialDropdownItem & { noQuickKey?: boolean };
type OfficialComposerExtraSection = {
  header?: ReactNode;
  items: OfficialComposerDropdownItem[];
  key?: string;
  triggerKey?: string;
};
type OfficialComposerLoop = {
  createdAt: number;
  cron?: string;
  humanSchedule?: string;
  id: string;
  nextRunAt?: number;
  prompt?: string;
};
type OfficialComposerFooterProps = {
  bridge: LocalSessionsBridge;
  coordinatorMode?: boolean;
  dictationDisabledReason?: ReactNode;
  fastModeOn?: boolean;
  hideDictation?: boolean;
  isPanelActive?: boolean;
  loops?: OfficialComposerLoop[];
  modelExtraSections?: OfficialComposerExtraSection[];
  modelItems: OfficialComposerDropdownItem[];
  modelLabel: ReactNode;
  modelPickerDisabled?: boolean;
  hideSessionSource?: boolean;
  plusAriaLabel?: string;
  onAddFiles?: (files: File[]) => void;
  onCoordinatorModeChange?: (value: boolean) => void;
  onInsertSlashCommand?: () => void;
  onStopLoop?: (loop: OfficialComposerLoop) => void;
  permissionDanger?: boolean | null;
  permissionItems: OfficialComposerDropdownItem[];
  permissionLabel: ReactNode;
  plusMenuAlignOffset?: number;
  plusMenuItems?: OfficialComposerDropdownItem[];
  plusMenuPopupClassName?: string;
  plusMenuSide?: "top" | "right" | "bottom" | "left";
  plusMenuSideOffset?: number;
  session?: SessionSummary | null;
  sessionRef?: EpitaxySessionRef | null;
  showDictationButton?: boolean;
  supportsFileAttachments?: boolean;
};

const emptyComposerMenuItems: OfficialComposerDropdownItem[] = [];
const composerShortcutBindings = [
  { command: "togglePreview", key: "cmd+shift+p", code: "KeyP", when: "isClaudeApp" },
  { command: "togglePreview", key: "cmd+alt+p", code: "KeyP" },
  { command: "toggleDiff", key: "cmd+shift+d", code: "KeyD", when: "isClaudeApp" },
  { command: "toggleDiff", key: "ctrl+shift+d", code: "KeyD", when: "!isClaudeApp" },
  { command: "toggleTerminal", key: "ctrl+`", code: "Backquote" },
  { command: "toggleBrowser", key: "cmd+shift+f", code: "KeyF" },
  { command: "closePane", key: "cmd+\\", code: "Backslash" },
  { command: "toggleSideChat", key: "cmd+;", code: "Semicolon" },
  { command: "cycleTranscriptMode", key: "ctrl+o", code: "KeyO" },
  { command: "openModeMenu", key: "cmd+shift+m", code: "KeyM", when: "isClaudeApp" },
  { command: "openModeMenu", key: "cmd+alt+m", code: "KeyM" },
  { command: "openModelMenu", key: "cmd+shift+i", code: "KeyI" },
  { command: "openEffortMenu", key: "cmd+shift+e", code: "KeyE" },
  { command: "toggleSelectionMode", key: "cmd+shift+s", code: "KeyS" },
] as const;
const composerMenuTargetByCommand = { openModeMenu: "mode", openModelMenu: "model", openEffortMenu: "effort" } as const;
const composerUsageCircleSize = 12;
const composerUsageCircumference = 2 * Math.PI * 5;

type ComposerShortcutCommand = (typeof composerShortcutBindings)[number]["command"];
type ComposerMenuTarget = "mode" | "model" | "effort";

function OfficialComposerFooter({
  bridge,
  coordinatorMode = false,
  dictationDisabledReason,
  fastModeOn = false,
  hideDictation = false,
  isPanelActive = true,
  loops,
  modelExtraSections,
  modelItems,
  modelLabel,
  modelPickerDisabled = false,
  hideSessionSource = false,
  plusAriaLabel = "Add",
  onAddFiles,
  onCoordinatorModeChange,
  onInsertSlashCommand,
  onStopLoop,
  permissionDanger = null,
  permissionItems,
  permissionLabel,
  plusMenuAlignOffset,
  plusMenuItems,
  plusMenuPopupClassName,
  plusMenuSide,
  plusMenuSideOffset,
  session,
  sessionRef = null,
  showDictationButton = false,
  supportsFileAttachments = false,
}: OfficialComposerFooterProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const effortSection = modelExtraSections?.find((section) => section.key === "effort");
  const effortItems = effortSection?.items ?? emptyComposerMenuItems;
  const menu = useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems: permissionItems, modelItems });
  const selectedEffortLabel = effortSection?.items.find((item) => item.checked)?.label;
  const fastModeLabel = fastModeOn ? "Fast" : null;
  const modelSections = useMemo(() => modelExtraSections?.map((section) => section.key === "effort" ? {
    ...section,
    items: menu.numberedEffortItems,
    triggerKey: composerShortcutForCommand("openEffortMenu", true),
  } : section), [menu.numberedEffortItems, modelExtraSections]);
  const openFilePicker = useCallback(() => fileInputRef.current?.click(), []);
  const footerPlusItems = useMemo(() => composeOfficialPlusItems(onInsertSlashCommand, onAddFiles ? openFilePicker : undefined, supportsFileAttachments, plusMenuItems), [onAddFiles, onInsertSlashCommand, openFilePicker, plusMenuItems, supportsFileAttachments]);
  const onFileInputChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) onAddFiles?.(files);
    event.target.value = "";
  }, [onAddFiles]);
  return (
    <div className="w-full flex items-center gap-g5 py-[4px]">
      <div className="flex items-center gap-g5 min-w-0">
        <OfficialDropdownButton ariaLabel="Permission mode" align="start" header="Mode" items={menu.numberedModeItems} label={permissionDanger ? <span className="text-extended-yellow">{permissionLabel}</span> : permissionLabel} onOpenChange={menu.onModeOpenChange} open={menu.modeOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModeMenu", true)} />
        {onCoordinatorModeChange ? <OfficialCoordinatorModeToggle onChange={onCoordinatorModeChange} value={coordinatorMode} /> : null}
        {plusAriaLabel === "Add" ? (
          <OfficialDropdownButton ariaLabel="Add" align="start" className="shrink-0" disabled={footerPlusItems.length === 0} icon="PlusLarge" items={footerPlusItems} revealChevron="never" side="top" size="small" />
        ) : (
          <OfficialDropdownButton align="start" alignOffset={plusMenuAlignOffset} ariaLabel={plusAriaLabel} className="shrink-0" disabled={footerPlusItems.length === 0} icon="PlusLarge" items={footerPlusItems} popupClassName={plusMenuPopupClassName} revealChevron="never" side={plusMenuSide ?? "top"} sideOffset={plusMenuSideOffset} size="small" />
        )}
        <input ref={fileInputRef} type="file" multiple accept={supportsFileAttachments ? undefined : "image/png,image/jpeg,image/gif,image/webp"} className="hidden" onChange={onFileInputChange} />
        {sessionRef && !hideSessionSource ? <span className="flex min-w-0"><OfficialSessionSource ariaLabel="Workspace" session={session ?? null} sessionRef={sessionRef} /></span> : null}
        {hideDictation ? null : <OfficialDictationSlot disabledReason={dictationDisabledReason} showButton={showDictationButton} />}
        {loops?.length && onStopLoop ? <OfficialLoopIndicator loops={loops} onStopLoop={onStopLoop} /> : null}
      </div>
      <div className="ml-auto flex items-center gap-g4">
        <OfficialDropdownButton ariaLabel="Model" align="end" disabled={modelItems.length === 0 || modelPickerDisabled} extraSections={modelSections} header="Models" items={menu.numberedModelItems} label={<OfficialModelFooterLabel effortLabel={selectedEffortLabel} fastModeLabel={fastModeLabel} modelLabel={modelLabel} />} onOpenChange={menu.onModelOpenChange} open={menu.modelOpen} revealChevron="never" side="top" size="small" triggerKey={composerShortcutForCommand("openModelMenu", true)} />
        <OfficialComposerUsageIndicator bridge={bridge} session={session} sessionRef={sessionRef} />
      </div>
    </div>
  );
}

function OfficialModelFooterLabel({ effortLabel, fastModeLabel, modelLabel }: { effortLabel?: ReactNode; fastModeLabel?: ReactNode; modelLabel: ReactNode }) {
  if (!effortLabel && !fastModeLabel) return <>{modelLabel}</>;
  return (
    <span className="flex items-baseline gap-g3 min-w-0">
      <span className="truncate">{modelLabel}</span>
      {effortLabel ? <span className="text-t6 shrink-0">· {effortLabel}</span> : null}
      {fastModeLabel ? <span className="text-t6 shrink-0">· {fastModeLabel}</span> : null}
    </span>
  );
}

function OfficialCoordinatorModeToggle({ onChange, value }: { onChange: (value: boolean) => void; value: boolean }) {
  return <OfficialButton ariaLabel="Toggle coordinator mode" icon="AgentPlanPath" onClick={() => onChange(!value)} pressed={value} size="small" variant="toggle" />;
}

function OfficialDictationSlot({ disabledReason, showButton }: { disabledReason?: ReactNode; showButton: boolean }) {
  const ariaLabel = disabledReason ? String(disabledReason) : "Dictate";
  return showButton ? <OfficialButton ariaLabel="Dictate" disabled icon="MicrophoneDictation" size="small" /> : <OfficialButton ariaLabel={ariaLabel} disabled icon="MicrophoneDictation" size="small" />;
}

function OfficialLoopIndicator({ loops, onStopLoop }: { loops: OfficialComposerLoop[]; onStopLoop: (loop: OfficialComposerLoop) => void }) {
  const label = loops.length > 1 ? `${loops.length} loops` : "Loop";
  const items = loops.map((loop) => ({ icon: "XCrossCloseMedium", label: loop.prompt || "Recurring loop", onSelect: () => onStopLoop(loop) }));
  return <OfficialDropdownButton className="shrink-0" header="Active loops" items={items} label={label} revealChevron="never" side="top" size="small" />;
}

function composeOfficialPlusItems(onInsertSlashCommand: (() => void) | undefined, openFilePicker: (() => void) | undefined, supportsFileAttachments: boolean, plusMenuItems?: OfficialComposerDropdownItem[]) {
  const items: OfficialComposerDropdownItem[] = [];
  if (onInsertSlashCommand) {
    items.push({
      icon: "SlashShortcutCommand",
      label: "Slash commands",
      onSelect: onInsertSlashCommand,
    });
  }
  if (openFilePicker) {
    items.push({
      icon: "PaperclipAttach",
      label: supportsFileAttachments ? "Add files or photos" : "Add image",
      onSelect: openFilePicker,
    });
  }
  if (plusMenuItems?.length) items.push(...plusMenuItems);
  return items.length > 0 ? items : emptyComposerMenuItems;
}

const officialContextUsageCache = new Map<string, ContextUsage>();

function OfficialComposerUsageIndicator({ bridge, session, sessionRef }: { bridge: LocalSessionsBridge; session?: SessionSummary | null; sessionRef?: EpitaxySessionRef | null }) {
  const sessionId = sessionRef?.id;
  const [bridgeUsage, setBridgeUsage] = useState<ContextUsage | null>(() => sessionId ? officialContextUsageCache.get(sessionId) ?? null : null);
  const [isFetching, setIsFetching] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const setUsageForSession = useCallback((nextUsage: ContextUsage | null) => {
    if (!sessionId) {
      setBridgeUsage(null);
      return;
    }
    if (nextUsage) officialContextUsageCache.set(sessionId, nextUsage);
    setBridgeUsage(nextUsage ?? officialContextUsageCache.get(sessionId) ?? null);
  }, [sessionId]);
  const refreshUsage = useCallback(async () => {
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return;
    }
    setIsFetching(true);
    let alive = true;
    await bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    alive = false;
  }, [bridge, sessionId, setUsageForSession]);
  useEffect(() => {
    let alive = true;
    if (!sessionId || !bridge.getContextUsage) {
      setUsageForSession(null);
      setIsFetching(false);
      return undefined;
    }
    setBridgeUsage(officialContextUsageCache.get(sessionId) ?? null);
    setIsFetching(true);
    void bridge.getContextUsage(sessionId).then((nextUsage) => {
      if (alive) setUsageForSession(nextUsage);
    }).catch(() => {
      if (alive) setUsageForSession(null);
    }).finally(() => {
      if (alive) setIsFetching(false);
    });
    return () => {
      alive = false;
    };
  }, [bridge, sessionId, setUsageForSession]);

  const isLocalContext = sessionRef?.type === "local" || session?.kind === "code";
  const usage = bridgeUsage;
  const usedTokens = usage?.totalTokens ?? 0;
  const maxTokens = usage?.rawMaxTokens ?? null;
  const usagePercent = typeof maxTokens === "number" && maxTokens > 0 ? officialClampPercent(usedTokens / maxTokens * 100) : null;
  const contextSummary = typeof maxTokens === "number" && maxTokens > 0 ? `${formatUsageTokenCount(usedTokens)} / ${formatUsageTokenCount(maxTokens)} (${usagePercent}%)` : formatUsageTokenCount(usedTokens);
  const triggerPercent = isLocalContext ? usagePercent ?? 0 : 0;
  const strokeDashoffset = composerUsageCircumference * (1 - triggerPercent / 100);
  const ariaParts = [isLocalContext ? `context ${usagePercent !== null ? `${usagePercent}%` : contextSummary}` : null].filter(Boolean);
  const ariaLabel = ariaParts.length > 0 ? `Usage: ${ariaParts.join(", ")}` : "Usage";
  const handleOpenChange = useCallback((open: boolean) => {
    if (open && isLocalContext) void refreshUsage();
    if (!open) setExpanded(false);
  }, [isLocalContext, refreshUsage]);
  return (
    <Popover.Root onOpenChange={handleOpenChange}>
      <Popover.Trigger render={<OfficialButton ariaLabel={ariaLabel} className="shrink-0" customIcon={<OfficialUsageCircle strokeDashoffset={strokeDashoffset} usagePercent={triggerPercent} />} size="small" variant="uncontained" />} />
      <Popover.Portal>
        <Popover.Positioner align="end" className="epitaxy-root size-0" side="top" sideOffset={8}>
          <Popover.Popup className="outline-none absolute bottom-0 right-0">
            <div className="relative isolate flex flex-col py-p5 rounded-r6 w-[360px] max-w-[calc(100vw-2rem)] max-h-[min(var(--available-height),640px)]">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <h2 className="sr-only">Usage</h2>
              <div className="flex-1 min-h-0 flex flex-col overflow-y-auto overscroll-contain">
                {isLocalContext ? (
                  <OfficialContextWindowSummary
                    contextPct={usagePercent}
                    contextUsage={usage}
                    expanded={expanded}
                    isFetching={isFetching}
                    onToggle={() => setExpanded((value) => !value)}
                    summary={contextSummary}
                  />
                ) : null}
              </div>
            </div>
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

function OfficialContextWindowSummary({
  contextPct,
  contextUsage,
  expanded,
  isFetching,
  onToggle,
  summary,
}: {
  contextPct: number | null;
  contextUsage: ContextUsage | null;
  expanded: boolean;
  isFetching: boolean;
  onToggle: () => void;
  summary: string;
}) {
  const canToggle = contextUsage !== null || isFetching;
  return (
    <div className="flex flex-col gap-g2">
      <button
        aria-expanded={canToggle ? expanded : undefined}
        className="group flex items-center gap-g6 px-p8 py-p2 min-h-[20px] text-left outline-none hide-focus-ring ring-focus rounded-r3"
        disabled={!canToggle}
        onClick={canToggle ? onToggle : undefined}
        type="button"
      >
        <span className="text-footnote text-t6">Context window</span>
        <span className="text-footnote text-t6 tabular-nums ml-auto">{summary}</span>
        {canToggle ? <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" className="text-t6 group-hover:text-t8 shrink-0" /> : null}
      </button>
      <div className="px-p8 pb-p2">
        {contextUsage ? <OfficialContextWindowUsage usage={contextUsage} defaultExpanded={expanded} compact className="" /> : <OfficialContextProgressBar contextPct={contextPct} />}
      </div>
      {canToggle && expanded && !contextUsage ? (
        <div className="px-p8 pb-p2 flex items-center gap-g4 text-footnote text-t7 min-h-[var(--h4)]">
          <OfficialInlineSpinner />
          <span>Loading context breakdown…</span>
        </div>
      ) : null}
    </div>
  );
}

function OfficialContextProgressBar({ contextPct }: { contextPct: number | null }) {
  return (
    <div className="h-[4px] rounded-r2 overflow-hidden bg-t2" role="progressbar" aria-valuenow={contextPct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      {contextPct !== null ? <div className={`h-full ${officialContextUsageColorClass(contextPct)} transition-[width]`} style={{ width: `${contextPct}%` }} /> : null}
    </div>
  );
}

type OfficialContextCategory = { color: string; name: string; tokens: number };
type OfficialContextUsageModel = {
  agents: Array<{ agentType: string; tokens: number }>;
  categories: OfficialContextCategory[];
  mcpTools: Array<{ name: string; serverName: string; tokens: number }>;
  memoryFiles: Array<{ path: string; tokens: number }>;
  percentage: number;
  rawMaxTokens: number;
  totalTokens: number;
};

function OfficialContextWindowUsage({ className = "p-[12px] rounded-r6 bg-t1 max-w-[520px]", compact = false, defaultExpanded = false, usage }: { className?: string; compact?: boolean; defaultExpanded?: boolean; usage: ContextUsage }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actualExpanded = compact ? defaultExpanded : expanded;
  const model = useMemo(() => normalizeOfficialContextUsageModel(usage), [usage]);
  const categoryTotal = model.categories.reduce((total, category) => total + category.tokens, 0) || 1;
  return (
    <div className={`flex flex-col gap-g4 ${className}`}>
      {!compact ? (
        <button type="button" className="flex items-center gap-g4 min-w-0 text-left outline-none hide-focus-ring ring-focus rounded-r3" onClick={() => setExpanded((value) => !value)} aria-expanded={actualExpanded}>
          <Icon name="Blocks" size="sm" className="text-t7 shrink-0" />
          <span className="text-body text-t9 shrink-0">Context window</span>
          <span className="text-footnote text-t6 truncate flex-1 text-right">{`${formatUsageTokenCount(model.totalTokens)} / ${formatUsageTokenCount(model.rawMaxTokens)} (${model.percentage}%)`}</span>
          <Icon name={actualExpanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" className="text-t6 shrink-0" />
        </button>
      ) : null}
      <div className={`flex shrink-0 rounded-r2 overflow-hidden bg-t2 ${compact ? "h-[4px]" : "h-[8px]"}`} role="img" aria-label={`${model.percentage}% of context window used`}>
        {model.categories.map((category) => {
          const visibleWidth = category.tokens / categoryTotal * 100;
          const rawPercent = category.tokens / model.rawMaxTokens * 100;
          if (visibleWidth < 0.5) return null;
          return (
            <div key={category.name} aria-label={`${category.name} — ${formatUsageTokenCount(category.tokens)} (${rawPercent.toFixed(1)}%)`} style={{ width: `${visibleWidth}%`, backgroundColor: category.color }} />
          );
        })}
      </div>
      {actualExpanded ? (
        <div className="flex flex-col gap-g2">
          {model.categories.map((category) => {
            const rawPercent = category.tokens / model.rawMaxTokens * 100;
            return (
              <div className="flex items-center gap-g3 text-footnote" key={category.name}>
                <span className="size-[8px] rounded-r1 shrink-0" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <span className="text-t8 flex-1 truncate">{category.name}</span>
                <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(category.tokens)}</span>
                <span className="text-t8 shrink-0 tabular-nums w-[44px] text-right">{`${rawPercent.toFixed(1)}%`}</span>
              </div>
            );
          })}
          {model.mcpTools.length > 0 ? <OfficialContextUsageRows label="MCP tools" rows={model.mcpTools.map((row) => ({ name: `${row.serverName} · ${row.name}`, tokens: row.tokens }))} /> : null}
          {model.memoryFiles.length > 0 ? <OfficialContextUsageRows label="Memory files" rows={model.memoryFiles.map((row) => ({ name: row.path, tokens: row.tokens }))} /> : null}
          {model.agents.length > 0 ? <OfficialContextUsageRows label="Custom agents" rows={model.agents.map((row) => ({ name: row.agentType, tokens: row.tokens }))} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function OfficialContextUsageRows({ label, rows }: { label: string; rows: Array<{ name: string; tokens: number }> }) {
  const [expanded, setExpanded] = useState(false);
  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  return (
    <div className="flex flex-col gap-g1 mt-[var(--p2)]">
      <button type="button" className="flex items-center gap-g3 text-footnote text-left" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="size-[8px] shrink-0 flex items-center justify-center">
          <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" className="text-t5" />
        </span>
        <span className="text-t7 flex-1">{label}</span>
        <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(total)}</span>
        <span className="text-t6 shrink-0 tabular-nums w-[44px] text-right">{rows.length}</span>
      </button>
      {expanded ? (
        <div className={`flex flex-col gap-g1 ${rows.length > 12 ? "max-h-[168px] overflow-y-auto overscroll-contain" : ""}`}>
          {rows.map((row) => (
            <div className="flex items-center gap-g3 text-footnote" key={row.name}>
              <span className="size-[8px] shrink-0" aria-hidden="true" />
              <span className="text-t6 flex-1 truncate">{row.name}</span>
              <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(row.tokens)}</span>
              <span className="w-[44px] shrink-0" aria-hidden="true" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const officialFreeSpaceContextCategory = "Free space";
const officialAutocompactContextCategory = "Autocompact buffer";

function normalizeOfficialContextUsageModel(usage: ContextUsage): OfficialContextUsageModel {
  const rawMaxTokens = Math.max(1, usage.rawMaxTokens ?? 1);
  const totalTokens = Math.max(0, usage.totalTokens);
  const percentage = typeof usage.percentage === "number" && Number.isFinite(usage.percentage)
    ? officialClampPercent(usage.percentage)
    : officialClampPercent(totalTokens / rawMaxTokens * 100);
  const categories = usage.categories ?? [];
  return {
    agents: usage.agents ?? [],
    categories: sortOfficialContextCategories(categories).map((category, index) => ({
      ...category,
      color: officialContextCategoryColor(category.name, index),
    })),
    mcpTools: usage.mcpTools ?? [],
    memoryFiles: usage.memoryFiles ?? [],
    percentage,
    rawMaxTokens,
    totalTokens,
  };
}

function sortOfficialContextCategories(categories: Array<{ name: string; tokens: number }>) {
  const visible = categories.filter((category) => category.name !== officialFreeSpaceContextCategory && category.name !== officialAutocompactContextCategory && !isDeferredOfficialContextCategory(category.name))
    .sort((left, right) => right.tokens - left.tokens);
  const deferred = categories.filter((category) => isDeferredOfficialContextCategory(category.name)).sort((left, right) => right.tokens - left.tokens);
  const autocompact = categories.find((category) => category.name === officialAutocompactContextCategory);
  const free = categories.find((category) => category.name === officialFreeSpaceContextCategory);
  return [...visible, ...deferred, ...(autocompact ? [autocompact] : []), ...(free ? [free] : [])].filter((category) => category.tokens > 0);
}

function isDeferredOfficialContextCategory(name: string) {
  return /\(deferred\)$/i.test(name);
}

function officialContextCategoryColor(name: string, index: number) {
  if (name === officialFreeSpaceContextCategory) return "var(--t2)";
  if (name === officialAutocompactContextCategory || isDeferredOfficialContextCategory(name)) return "var(--t4)";
  return `hsl(217 70% ${Math.min(88, 62 + 6 * index)}%)`;
}

function officialContextUsageColorClass(percent: number) {
  return percent >= 95 ? "bg-extended-pink" : percent >= 80 ? "bg-extended-yellow" : "bg-[var(--accent)]";
}

function officialClampPercent(value: number) {
  return Math.round(100 * Math.max(0, Math.min(1, value / 100)));
}

function OfficialInlineSpinner() {
  return (
    <span className="relative inline-block shrink-0 align-middle size-4" aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--t2)" }} />
      <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, var(--spinner-arc, var(--t6)))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), rgb(0, 0, 0) calc(100% - 1.5px))" }} />
    </span>
  );
}

function OfficialUsageCircle({ strokeDashoffset, usagePercent }: { strokeDashoffset: number; usagePercent: number }) {
  return (
    <svg width={composerUsageCircleSize} height={composerUsageCircleSize} viewBox="0 0 12 12" className="-rotate-90" aria-hidden="true">
      <circle cx={6} cy={6} r={5} fill="none" strokeWidth={2} stroke="var(--t3)" />
      <circle cx={6} cy={6} r={5} fill="none" strokeWidth={2} strokeDasharray={composerUsageCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke={usagePercent >= 95 ? "var(--extended-pink)" : usagePercent >= 80 ? "var(--extended-yellow)" : "var(--accent)"} className="transition-[stroke-dashoffset] duration-300" />
    </svg>
  );
}

function useOfficialComposerFooterMenuState({ effortItems, isPanelActive, modeItems, modelItems }: { effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[] }) {
  const [openMenu, setOpenMenu] = useState<ComposerMenuTarget | null>(null);
  const closeMenu = useCallback(() => setOpenMenu(null), []);
  useEffect(() => { if (!isPanelActive) closeMenu(); }, [closeMenu, isPanelActive]);
  const selectableModeItems = useMemo(() => modeItems.filter(isQuickSelectableComposerItem), [modeItems]);
  const selectableModelItems = useMemo(() => modelItems.filter(isQuickSelectableComposerItem), [modelItems]);
  const selectableEffortItems = useMemo(() => effortItems.filter(isQuickSelectableComposerItem), [effortItems]);
  const onKeyDown = useCallback((event: KeyboardEvent) => {
    handleComposerFooterKeyDown(event, { closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems, setOpenMenu });
  }, [closeMenu, effortItems, isPanelActive, modeItems, modelItems, openMenu, selectableEffortItems, selectableModeItems, selectableModelItems]);
  useEffect(() => {
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onKeyDown]);
  return {
    modeOpen: openMenu === "mode",
    modelOpen: openMenu === "model" || openMenu === "effort",
    numberedEffortItems: openMenu === "effort" ? numberComposerMenuItems(effortItems) : effortItems,
    numberedModeItems: openMenu === "mode" ? numberComposerMenuItems(modeItems) : modeItems,
    numberedModelItems: openMenu === "model" ? numberComposerMenuItems(modelItems) : modelItems,
    onModeOpenChange: (open: boolean) => setOpenMenu(open ? "mode" : null),
    onModelOpenChange: (open: boolean) => setOpenMenu(open ? "model" : null),
  };
}

function handleComposerFooterKeyDown(event: KeyboardEvent, state: { closeMenu: () => void; effortItems: OfficialComposerDropdownItem[]; isPanelActive: boolean; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[]; openMenu: ComposerMenuTarget | null; selectableEffortItems: OfficialComposerDropdownItem[]; selectableModeItems: OfficialComposerDropdownItem[]; selectableModelItems: OfficialComposerDropdownItem[]; setOpenMenu: (menu: ComposerMenuTarget | null) => void }) {
  if (!state.isPanelActive || event.defaultPrevented) return;
  const menuIsOpen = state.openMenu !== null;
  const plainKey = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  if (menuIsOpen && plainKey && event.key === "Escape") return event.preventDefault(), event.stopImmediatePropagation(), state.closeMenu();
  if (menuIsOpen && plainKey && event.code.startsWith("Digit")) return selectNumberedComposerItem(event, state);
  const command = composerCommandForKeyboardEvent(event, { isClaudeApp: true, mac: isMacPlatform() });
  const target = command ? composerMenuTargetByCommand[command as keyof typeof composerMenuTargetByCommand] : undefined;
  if (!target || !composerMenuHasItems(target, state)) return;
  event.preventDefault();
  event.stopPropagation();
  if (!menuIsOpen) state.setOpenMenu(target === "effort" && state.effortItems.length === 0 ? "model" : target);
}

function selectNumberedComposerItem(event: KeyboardEvent, state: Parameters<typeof handleComposerFooterKeyDown>[1]) {
  event.preventDefault();
  event.stopPropagation();
  const digit = Number(event.code.slice(5));
  if (digit < 1 || digit > 9) return;
  const items = state.openMenu === "mode" ? state.selectableModeItems : state.openMenu === "effort" ? state.selectableEffortItems : state.selectableModelItems;
  const item = items[digit - 1];
  if (!item?.onSelect) return;
  item.onSelect();
  state.closeMenu();
}

function composerMenuHasItems(target: ComposerMenuTarget, state: { effortItems: OfficialComposerDropdownItem[]; modeItems: OfficialComposerDropdownItem[]; modelItems: OfficialComposerDropdownItem[] }) {
  if (target === "mode") return state.modeItems.length > 0;
  if (target === "effort") return state.effortItems.length > 0 || state.modelItems.length > 0;
  return state.modelItems.length > 0 || state.effortItems.length > 0;
}

function numberComposerMenuItems(items: OfficialComposerDropdownItem[]) {
  let count = 0;
  return items.map((item) => item.disabled || item.noQuickKey || count >= 9 ? item : { ...item, shortcut: String(++count) });
}

function isQuickSelectableComposerItem(item: OfficialComposerDropdownItem) {
  return !item.disabled && !item.noQuickKey;
}

function composerCommandForKeyboardEvent(event: KeyboardEvent, options: { isClaudeApp: boolean; mac: boolean }) {
  for (const binding of composerShortcutBindings) {
    const when = "when" in binding ? binding.when : undefined;
    if (event.code === binding.code && composerShortcutConditionMatches(when, options.isClaudeApp) && composerShortcutMatches(event, binding.key, options.mac)) return binding.command;
  }
  return null;
}

function composerShortcutConditionMatches(when: string | undefined, isClaudeApp: boolean) {
  return when === "isClaudeApp" ? isClaudeApp : when !== "!isClaudeApp" || !isClaudeApp;
}

function composerShortcutMatches(event: KeyboardEvent, spec: string, mac: boolean) {
  const parts = spec.split("+");
  const wantsCmd = parts.includes("cmd");
  const wantsCtrl = parts.includes("ctrl");
  return event.metaKey === (mac && wantsCmd) && event.ctrlKey === (wantsCtrl || (!mac && wantsCmd)) && event.shiftKey === parts.includes("shift") && event.altKey === parts.includes("alt");
}

function composerShortcutForCommand(command: ComposerShortcutCommand, isClaudeApp: boolean) {
  const binding = composerShortcutBindings.find((item) => item.command === command && composerShortcutConditionMatches("when" in item ? item.when : undefined, isClaudeApp));
  return binding?.key;
}

function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}

function formatUsageTokenCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}

function SessionNotFound({ onBack }: { onBack: () => Promise<void> }) {
  return (
    <div className="h-full flex items-center justify-center text-body text-t5">
      <div className="flex flex-col items-center gap-g5">
        <span>找不到这个会话。</span>
        <button className={composerDropdownButtonClass} onClick={() => void onBack()} type="button">重试</button>
      </div>
    </div>
  );
}

function SessionError({ error, onRetry }: { error: Error; onRetry: () => Promise<void> }) {
  return (
    <div className="h-full flex items-center justify-center text-body text-t5">
      <div className="flex max-w-[360px] flex-col items-center gap-g5 text-center">
        <span>Something went wrong loading this session.</span>
        <code className="text-code text-t6 break-words">{error.message}</code>
        <button className={composerDropdownButtonClass} onClick={() => void onRetry()} type="button">Retry</button>
      </div>
    </div>
  );
}

function useEpitaxySessionType(sessionId?: string): EpitaxySessionType {
  const [sessionType, setSessionType] = useState<EpitaxySessionType>(() => inferSessionType(sessionId));

  useEffect(() => {
    let alive = true;
    setSessionType(inferSessionType(sessionId));
    if (!sessionId) return () => { alive = false; };

    desktopBridge.LocalSessions.list().then((sessions) => {
      if (!alive) return;
      setSessionType(inferSessionType(sessionId, sessions.find((session) => session.id === sessionId)));
    }).catch(() => undefined);

    return () => { alive = false; };
  }, [sessionId]);

  return sessionType;
}

function useFocusedSession(sessionId?: string) {
  useEffect(() => {
    void desktopBridge.LocalSessions.setFocusedSession?.(sessionId ?? null);
    return () => {
      void desktopBridge.LocalSessions.setFocusedSession?.(null);
    };
  }, [sessionId]);
}

type SessionDataState = {
  error: Error | null;
  isLoading: boolean;
  isSessionNotFound: boolean;
  messages: ChatMessage[];
  pendingTurnStartedAt: number | null;
  session: SessionSummary | null;
  streamActivityMode: StreamActivityMode;
  streamingMessageId: string | null;
  streamSnapshot: OfficialStreamSnapshot;
};

function emptySessionDataState(isLoading: boolean): SessionDataState {
  return {
    error: null,
    isLoading,
    isSessionNotFound: false,
    messages: [],
    pendingTurnStartedAt: null,
    session: null,
    streamActivityMode: idleStreamActivityMode,
    streamingMessageId: null,
    streamSnapshot: null,
  };
}

const officialSessionDataCache = new Map<string, SessionDataState>();
type SessionDataStateUpdater = SessionDataState | ((current: SessionDataState) => SessionDataState);

function useEpitaxySessionData(sessionId?: string) {
  const finalizeStreamGenerationRef = useRef<number | null>(null);
  const loadSeqRef = useRef(0);
  const streamGenerationRef = useRef(0);
  const smootherRef = useRef(createOfficialSessionStreamSmoother());
  const [, forceSessionDataRender] = useState(0);
  const state = sessionId ? officialSessionDataCache.get(sessionId) ?? emptySessionDataState(true) : emptySessionDataState(false);
  const setState = useCallback((updater: SessionDataStateUpdater) => {
    if (!sessionId) {
      forceSessionDataRender((version) => version + 1);
      return;
    }
    const current = officialSessionDataCache.get(sessionId) ?? emptySessionDataState(true);
    const next = typeof updater === "function" ? updater(current) : updater;
    officialSessionDataCache.set(sessionId, next);
    forceSessionDataRender((version) => version + 1);
  }, [sessionId]);

  useEffect(() => {
    const smoother = createOfficialSessionStreamSmoother();
    smootherRef.current.dispose();
    smootherRef.current = smoother;
    const unsubscribe = smoother.subscribe((streamSnapshot) => {
      setState((current) => ({ ...current, streamSnapshot }));
    });
    return () => {
      unsubscribe();
      smoother.dispose();
    };
  }, [sessionId]);

  useEffect(() => {
    loadSeqRef.current += 1;
    streamGenerationRef.current += 1;
    finalizeStreamGenerationRef.current = null;
    smootherRef.current.clear();
    setState((current) => {
      if (!sessionId) return emptySessionDataState(false);
      return officialSessionDataCache.get(sessionId) ?? emptySessionDataState(true);
    });
  }, [sessionId]);

  const clearStreamState = useCallback((markSessionSettled = false) => {
    smootherRef.current.clear();
    setState((current) => ({
      ...current,
      pendingTurnStartedAt: null,
      session: markSessionSettled && current.session ? { ...current.session, isRunning: false } : current.session,
      streamActivityMode: idleStreamActivityMode,
      streamingMessageId: null,
      streamSnapshot: null,
    }));
  }, []);

  const reload = useCallback(async () => {
    const loadSeq = ++loadSeqRef.current;
    if (!sessionId) {
      clearStreamState();
      setState(emptySessionDataState(false));
      return;
    }
    setState((current) => ({
      ...current,
      error: null,
      isLoading: current.session === null && current.messages.length === 0 && current.streamSnapshot === null,
    }));
    try {
      const next = await loadEpitaxySession(sessionId);
      if (loadSeqRef.current !== loadSeq) return;
      const nextSession = next?.session ?? null;
      const sessionSettled = nextSession ? nextSession.isRunning !== true : false;
      if (sessionSettled) smootherRef.current.clear();
      setState((current) => ({
        error: null,
        isLoading: false,
        isSessionNotFound: !next,
        messages: next?.messages ?? [],
        pendingTurnStartedAt: sessionSettled ? null : current.pendingTurnStartedAt,
        session: nextSession,
        streamActivityMode: sessionSettled ? idleStreamActivityMode : current.streamActivityMode,
        streamingMessageId: sessionSettled ? null : current.streamingMessageId,
        streamSnapshot: sessionSettled ? null : current.streamSnapshot,
      }));
    } catch (caught) {
      if (loadSeqRef.current !== loadSeq) return;
      setState((current) => ({
        ...current,
        error: caught instanceof Error ? caught : new Error(String(caught)),
        isLoading: false,
      }));
    }
  }, [clearStreamState, sessionId]);

  useEffect(() => {
    let alive = true;
    void reload().finally(() => {
      if (!alive) return;
    });
    return () => { alive = false; };
  }, [reload]);

  useEffect(() => {
    if (!sessionId) return;
    if (state.error || state.isSessionNotFound) return;
    if (!state.session && state.messages.length === 0) return;
    officialSessionDataCache.set(sessionId, state);
  }, [sessionId, state]);

  useEffect(() => {
    if (!sessionId) return undefined;
    const handleEvent = (event: unknown) => {
      if (!isSessionEventForId(event, sessionId)) return;
      const streamMessage = streamEventMessageFromBridgeEvent(event);
      if (streamMessage) {
        const isStart = isOfficialStreamMessageStart(streamMessage);
        const streamMessageId = isStart ? officialStreamMessageId(streamMessage) : null;
        if (isStart) {
          streamGenerationRef.current += 1;
          finalizeStreamGenerationRef.current = null;
        }
        setState((current) => ({
          ...current,
          pendingTurnStartedAt: isStart || current.pendingTurnStartedAt === null ? Date.now() : current.pendingTurnStartedAt,
          streamActivityMode: streamActivityModeFromStreamEvent(streamMessage, current.streamActivityMode),
          streamingMessageId: streamMessageId ?? current.streamingMessageId,
        }));
        smootherRef.current.feed(streamMessage);
        return;
      }
      const transcriptMessage = chatMessageFromBridgeMessageEvent(event);
      if (transcriptMessage) {
        setState((current) => mergeTranscriptMessageIntoState(current, transcriptMessage));
        return;
      }
      if (shouldReloadTranscriptForEvent(event)) {
        if (shouldClearOfficialStreamForEvent(event)) {
          const streamGeneration = streamGenerationRef.current;
          const finalize = () => {
            if (streamGenerationRef.current !== streamGeneration) return;
            finalizeStreamGenerationRef.current = null;
            clearStreamState(true);
            // Official: after turn settle, promote placeholder titles (desktop summarizeSession / refreshTitleFromMessages).
            void refreshSessionTitleAfterSettle(sessionId).then((nextSession) => {
              if (!nextSession) return;
              if (streamGenerationRef.current !== streamGeneration) return;
              setState((current) => ({
                ...current,
                session: normalizeSessionSummaryPatch(current.session, nextSession) ?? current.session,
              }));
            });
          };
          if (shouldSettleOfficialStreamForEvent(event)) {
            if (finalizeStreamGenerationRef.current === streamGeneration) return;
            finalizeStreamGenerationRef.current = streamGeneration;
            void smootherRef.current.settleAfterReveal().finally(() => {
              if (streamGenerationRef.current !== streamGeneration) return;
              finalize();
            });
          } else {
            finalize();
          }
        } else if (stringValue(asRecord(event).type) === "session_updated") {
          const nextSession = asRecord(event).session ?? asRecord(asRecord(event).payload).session;
          if (nextSession) {
            setState((current) => ({
              ...current,
              session: normalizeSessionSummaryPatch(current.session, nextSession) ?? current.session,
            }));
          } else {
            void reload();
          }
        } else {
          void reload();
        }
      }
    };
    const offCode = desktopBridge.LocalSessions.onEvent?.(handleEvent);
    return () => {
      offCode?.();
    };
  }, [clearStreamState, reload, sessionId]);

  const activeStreamingMessageId = state.streamingMessageId ?? state.streamSnapshot?.messageId ?? null;
  const parsedEntries = useMemo(() => parseOfficialTranscriptEntries(state.messages, activeStreamingMessageId), [activeStreamingMessageId, state.messages]);
  const entries = useMemo(() => mergeOfficialStreamSnapshot(parsedEntries, state.streamSnapshot), [parsedEntries, state.streamSnapshot]);
  const streamTokenEstimate = useMemo(() => estimateOfficialStreamSnapshotTokens(state.streamSnapshot), [state.streamSnapshot]);
  const isResponding = state.streamActivityMode !== idleStreamActivityMode || state.streamSnapshot !== null || state.streamingMessageId !== null || state.session?.isRunning === true;
  return { ...state, entries, isResponding, reload, streamTokenEstimate };
}

async function loadEpitaxySession(sessionId: string): Promise<{ messages: ChatMessage[]; session: SessionSummary } | null> {
  const bridge = desktopBridge.LocalSessions;
  const session = await bridge.getSession(sessionId).catch(() => null);
  if (!session) return null;
  const transcript = await bridge.getTranscript?.(sessionId).catch(() => undefined);
  const rawMessages = transcript?.length ? transcript : session.messages ?? [];
  const messages = rawMessages.filter((message) => stringValue(asRecord(message.raw).type) !== "stream_event");
  return { messages, session: { ...session, messages: rawMessages } };
}

async function sendMessageToSession(sessionId: string, text: string, input?: SendMessageInput) {
  const bridge = desktopBridge.LocalSessions;
  if (bridge.sendMessage) {
    await bridge.sendMessage(sessionId, text, input);
    return;
  }
  await desktopBridge.LocalSessions.sendMessage?.(sessionId, text, input);
}

function inferSessionType(sessionId?: string, session?: SessionSummary): EpitaxySessionType {
  if (!sessionId) return "local";
  if (session?.kind === "code") return "local";
  if (sessionId.startsWith("bridge_")) return "bridge";
  if (sessionId.startsWith("local_") || sessionId.startsWith("code_")) return "local";
  return "remote";
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

function isSessionEventForId(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  if (raw.sessionId === sessionId || raw.id === sessionId) return true;
  const session = asRecord(raw.session);
  return session.id === sessionId || session.sessionId === sessionId;
}

function rawMessageContentContainsToolResult(raw: Record<string, unknown>) {
  return rawMessageContent(raw).some((item) => {
    const record = asRecord(item);
    return (stringValue(record.type) ?? stringValue(record.kind)) === "tool_result";
  });
}

function shouldReloadTranscriptForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  // session_updated carries title promotion from desktop summarize/setRunning.
  return type === "transcript_loaded"
    || type === "result"
    || type === "completed"
    || type === "close"
    || type === "error"
    || type === "cleared"
    || type === "stopped"
    || type === "permission_mode_changed"
    || type === "session_updated";
}

function isPlaceholderCodingTitle(title?: string | null) {
  const text = title?.trim() ?? "";
  if (!text) return true;
  if (/^\d+$/.test(text)) return true;
  return text === "Untitled"
    || text === "Untitled session"
    || text === "Coding session"
    || text === "General coding session"
    || text === "New session";
}

async function refreshSessionTitleAfterSettle(sessionId: string): Promise<SessionSummary | null> {
  const bridge = desktopBridge.LocalSessions;
  if (!bridge.summarizeSession) return null;
  try {
    const result = await bridge.summarizeSession(sessionId);
    // Desktop also dispatches session_updated; apply return shape so fake/web-only bridges update header immediately.
    if (!result || typeof result === "string") return null;
    const title = typeof result.title === "string" ? result.title : null;
    const sessionPatch = result.session ?? (title ? { id: sessionId, title } : null);
    if (!sessionPatch && !title) return null;
    const cache = officialSessionDataCache.get(sessionId);
    const nextSession = normalizeSessionSummaryPatch(
      cache?.session ?? null,
      sessionPatch ?? { id: sessionId, title },
    );
    if (nextSession && cache) {
      officialSessionDataCache.set(sessionId, { ...cache, session: nextSession });
    }
    return nextSession;
  } catch {
    // Title refresh is best-effort.
    return null;
  }
}

function normalizeSessionSummaryPatch(current: SessionSummary | null, patch: unknown): SessionSummary | null {
  if (!patch || typeof patch !== "object") return current;
  const raw = asRecord(patch);
  const id = stringValue(raw.id) ?? current?.id;
  if (!id) return current;
  const title = stringValue(raw.title);
  const updatedAtMs = typeof raw.updatedAtMs === "number"
    ? raw.updatedAtMs
    : typeof raw.updatedAt === "string"
      ? Date.parse(raw.updatedAt) || current?.updatedAtMs
      : current?.updatedAtMs;
  if (!current) {
    return {
      id,
      kind: (stringValue(raw.kind) as SessionSummary["kind"]) ?? "code",
      title: title ?? "Coding session",
      updatedAtMs: updatedAtMs ?? Date.now(),
      isRunning: raw.isRunning === true,
      isArchived: raw.isArchived === true,
      isUnread: raw.isUnread === true,
    } as SessionSummary;
  }
  return {
    ...current,
    title: title ?? current.title,
    updatedAtMs: updatedAtMs ?? current.updatedAtMs,
    isRunning: typeof raw.isRunning === "boolean" ? raw.isRunning : current.isRunning,
    isArchived: typeof raw.isArchived === "boolean" ? raw.isArchived : current.isArchived,
    isUnread: typeof raw.isUnread === "boolean" ? raw.isUnread : current.isUnread,
    isAgentCompleted: typeof raw.isAgentCompleted === "boolean" ? raw.isAgentCompleted : current.isAgentCompleted,
    hasCompleted: typeof raw.hasCompleted === "boolean" ? raw.hasCompleted : current.hasCompleted,
    error: stringValue(raw.error) ?? current.error,
  };
}

function streamEventMessageFromBridgeEvent(event: unknown): Record<string, unknown> | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  if (raw.type === "message" && message.type === "stream_event") return message;
  return raw.type === "stream_event" ? raw : null;
}

function chatMessageFromBridgeMessageEvent(event: unknown): ChatMessage | null {
  const raw = asRecord(event);
  if (raw.type !== "message") return null;
  const message = asRecord(raw.message);
  if (message.type === "stream_event" || message.type === "result" || message.type === "error") return null;
  const type = stringValue(message.type);
  if (type !== "assistant" && type !== "user" && type !== "system") return null;
  return chatMessageFromRawTranscriptEvent(message);
}

function chatMessageFromRawTranscriptEvent(rawEvent: Record<string, unknown>): ChatMessage {
  const nestedMessage = asRecord(rawEvent.message);
  const rawAuthor = stringValue(rawEvent.author);
  const rawRole = stringValue(rawEvent.role) ?? stringValue(nestedMessage.role);
  const rawType = stringValue(rawEvent.type);
  const role = rawRole === "assistant" || rawRole === "system"
    ? rawRole
    : rawAuthor === "assistant"
      ? "assistant"
      : rawAuthor === "system"
        ? "system"
        : rawType === "assistant"
          ? "assistant"
          : rawType === "system"
            ? "system"
            : "user";
  const createdAt = stringValue(rawEvent.createdAt) ?? stringValue(rawEvent.timestamp) ?? new Date().toISOString();
  const id = stringValue(rawEvent.id) ?? stringValue(rawEvent.uuid) ?? stringValue(rawEvent.message_id) ?? stringValue(nestedMessage.id) ?? `msg_${Date.now()}`;
  return {
    id,
    role,
    text: rawTranscriptEventText(rawEvent),
    createdAt,
    raw: rawEvent,
  };
}

function rawTranscriptEventText(rawEvent: Record<string, unknown>) {
  const direct = stringValue(rawEvent.text) ?? stringValue(rawEvent.content) ?? stringValue(rawEvent.result) ?? stringValue(rawEvent.error);
  if (direct) return direct;
  const nestedMessage = asRecord(rawEvent.message);
  const nestedDirect = stringValue(nestedMessage.text) ?? stringValue(nestedMessage.content);
  if (nestedDirect) return nestedDirect;
  const content = Array.isArray(nestedMessage.content) ? nestedMessage.content : rawMessageContent(rawEvent);
  return content.map((item) => {
    const record = asRecord(item);
    if (stringValue(record.type) === "text") return stringValue(record.text) ?? "";
    if (stringValue(record.type) === "thinking") return stringValue(record.thinking) ?? "";
    if (stringValue(record.type) === "tool_result") return stringValue(record.content) ?? "";
    return "";
  }).join("");
}

function mergeTranscriptMessageIntoState(current: SessionDataState, nextMessage: ChatMessage): SessionDataState {
  const rawMessages = current.session?.messages ?? current.messages;
  const nextRawMessages = upsertTranscriptMessage(rawMessages, nextMessage);
  if (nextRawMessages === rawMessages) return current;
  return {
    ...current,
    messages: nextRawMessages.filter((message) => stringValue(asRecord(message.raw).type) !== "stream_event"),
    session: current.session ? { ...current.session, messages: nextRawMessages } : current.session,
  };
}

function upsertTranscriptMessage(messages: ChatMessage[], nextMessage: ChatMessage) {
  const nextIdentity = officialMessageIdentity(nextMessage);
  const existingIndex = messages.findIndex((message) => officialMessageIdentity(message) === nextIdentity);
  if (existingIndex < 0) return [...messages, nextMessage];
  if (messages[existingIndex] === nextMessage) return messages;
  const nextMessages = messages.slice();
  nextMessages[existingIndex] = nextMessage;
  return nextMessages;
}

function isOfficialStreamMessageStart(streamMessage: Record<string, unknown>) {
  return stringValue(asRecord(streamMessage.event).type) === "message_start";
}

function officialStreamMessageId(streamMessage: Record<string, unknown>) {
  const event = asRecord(streamMessage.event);
  const message = asRecord(event.message);
  return stringValue(message.id) ?? stringValue(streamMessage.uuid) ?? null;
}

function shouldClearOfficialStreamForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  return type === "result"
    || type === "completed"
    || type === "close"
    || type === "error"
    || type === "cleared"
    || type === "stopped";
}

function shouldSettleOfficialStreamForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "completed";
  }
  return type === "result" || type === "completed" || type === "close";
}

function streamActivityModeFromStreamEvent(streamMessage: Record<string, unknown>, currentMode: StreamActivityMode): StreamActivityMode {
  const event = asRecord(streamMessage.event);
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return "requesting";
  if (eventType === "message_stop") return currentMode;
  if (eventType === "content_block_start") {
    const contentBlock = asRecord(event.content_block);
    const blockType = stringValue(contentBlock.type);
    if (blockType === "thinking") return "thinking";
    if (blockType === "tool_use") return "tool-use";
  }
  if (eventType === "content_block_delta") {
    const delta = asRecord(event.delta);
    const deltaType = stringValue(delta.type);
    if (deltaType === "thinking_delta") return "thinking";
    if (deltaType === "text_delta" || deltaType === "connector_text_delta") return "responding";
  }
  return currentMode;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function officialMessageIdentity(message: ChatMessage) {
  const raw = asRecord(message.raw);
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
}

function normalizeToolPermissionRequest(event: unknown, activeSessionId: string): InlineToolPermissionRequest | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstNonEmptyRecord(
    raw.request,
    raw.toolPermissionRequest,
    raw.permissionRequest,
    message.request,
    message.toolPermissionRequest,
    message.permissionRequest,
  );
  const type = stringValue(raw.type) ?? stringValue(message.type) ?? stringValue(raw.kind) ?? stringValue(message.kind);
  const subtype = stringValue(raw.subtype) ?? stringValue(message.subtype) ?? stringValue(request.subtype);
  const looksLikeRequest = type === "tool_permission_request"
    || type === "permission_request"
    || subtype === "tool_permission"
    || Object.keys(request).length > 0 && (request.toolName || request.tool_name || request.requestId || request.request_id);
  if (!looksLikeRequest) return null;
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(message.sessionId)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id)
    ?? activeSessionId;
  if (sessionId !== activeSessionId) return null;
  const requestId = stringValue(request.requestId)
    ?? stringValue(request.request_id)
    ?? stringValue(request.toolUseId)
    ?? stringValue(request.tool_use_id)
    ?? stringValue(raw.requestId)
    ?? stringValue(message.requestId);
  const toolName = stringValue(request.toolName)
    ?? stringValue(request.tool_name)
    ?? stringValue(raw.toolName)
    ?? stringValue(message.toolName)
    ?? "Tool";
  if (!requestId) return null;
  return {
    alwaysAllowScope: stringValue(request.alwaysAllowScope)
      ?? stringValue(request.always_allow_scope)
      ?? stringValue(request.permissionScope)
      ?? stringValue(request.permission_scope)
      ?? stringValue(raw.alwaysAllowScope)
      ?? stringValue(message.alwaysAllowScope),
    decisionReason: stringValue(request.decisionReason)
      ?? stringValue(request.decision_reason)
      ?? stringValue(raw.decisionReason)
      ?? stringValue(message.decisionReason),
    description: stringValue(request.description) ?? stringValue(raw.description) ?? stringValue(message.description),
    hasAlwaysAllow: booleanValue(request.hasAlwaysAllow)
      ?? booleanValue(request.has_always_allow)
      ?? booleanValue(raw.hasAlwaysAllow)
      ?? booleanValue(message.hasAlwaysAllow),
    input: asRecord(request.input ?? raw.input ?? message.input),
    requestId,
    sessionId,
    toolName,
    toolUseId: stringValue(request.toolUseId) ?? stringValue(request.tool_use_id),
  };
}

function toolPermissionResolvedId(event: unknown, activeSessionId: string): string | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  const request = firstNonEmptyRecord(raw.request, message.request);
  const type = stringValue(raw.type) ?? stringValue(message.type);
  if (type !== "tool_permission_resolved" && type !== "permission_resolved") return null;
  const sessionId = stringValue(raw.sessionId)
    ?? stringValue(message.sessionId)
    ?? stringValue(request.sessionId)
    ?? stringValue(request.session_id)
    ?? activeSessionId;
  if (sessionId !== activeSessionId) return null;
  return stringValue(request.requestId)
    ?? stringValue(request.request_id)
    ?? stringValue(request.toolUseId)
    ?? stringValue(request.tool_use_id)
    ?? stringValue(raw.requestId)
    ?? stringValue(message.requestId)
    ?? null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function firstNonEmptyRecord(...values: unknown[]): Record<string, unknown> {
  for (const value of values) {
    const record = asRecord(value);
    if (Object.keys(record).length > 0) return record;
  }
  return {};
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

const composerDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2";
