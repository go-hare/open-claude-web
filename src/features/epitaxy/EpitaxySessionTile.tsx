import { Fragment, createContext, createElement, forwardRef, memo, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MutableRefObject, type MouseEvent, type PointerEvent as ReactPointerEvent, type ReactElement, type ReactNode, type Ref } from "react";
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
import { desktopBridge, type CodeStats, type ContextUsage, type SessionSummary } from "../../adapters/desktopBridge";
import type { ChatMessage, LocalSessionsBridge, SendMessageInput } from "../../adapters/desktopBridge/types";
import {
  canResetRateLimitsFromBootstrap,
  fetchBootstrapPayload,
  organizationUuidFromBootstrap,
  postOrganizationResetRateLimits,
} from "../settings/accountSettingsApi";
import { BaseContextMenuItem, BaseContextMenuPopup, BaseContextMenuSeparator, ContextMenu } from "../../shell/BaseMenu";
import { Icon } from "../../shell/icons";
import { isOfficialMermaidMarkdownLanguage, OfficialMermaidDiagramCard } from "./OfficialMermaidDiagramCard";
import { OfficialSearchTree, officialSearchTreeLanguage } from "./OfficialSearchTree";
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
import {
  buildOfficialToolDiffMeta,
  OfficialToolDiffBadge,
  OfficialToolDiffDetails,
  OfficialToolReadFileDetails,
  type OfficialToolDiffMeta,
} from "./diff/OfficialToolDiffDetails";
import {
  idleStreamActivityMode,
  officialCodeSessionStore,
  useOfficialCodeSessionBucket,
  type StreamActivityMode,
} from "./session/officialCodeSessionStore";
import { classifyOfficialMemoryOp, isOfficialMemoryTool } from "./session/officialMemoryPath";
import { CodeStatsCard } from "./CodeStatsCard";
import { parseEpitaxyUploadedFilesText, type EpitaxyUploadedFile } from "./epitaxyUploadedFiles";
import { OfficialContextWindowUsage } from "./OfficialComposerContextUsage";
import type { OfficialStreamSnapshot } from "./officialStreamSmoother";
import {
  officialClearTurnStarted,
  officialGetStreamTokenEstimate,
  officialGetTurnStartedAt,
  officialMarkTurnStarted,
  officialSetStreamCharBudget,
  officialStreamClear,
  officialStreamFeed,
  officialStreamHasListeners,
  officialStreamSetVisibility,
  officialStreamSettleAfterReveal,
  officialStreamSubscribe,
} from "./session/officialStreamSessionStore";
import { OfficialEpitaxySlashCommandMenu } from "./slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "./slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "./slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "./slash/OfficialSlashTypes";

type EpitaxySessionType = "local" | "remote" | "bridge";
// StreamActivityMode + idleStreamActivityMode imported from officialCodeSessionStore.

type EpitaxyTranscriptActionContextValue = {
  /** Official onAttachAsContext: insert message/selection text into the session composer. */
  attachAsContext?: (text: string) => void;
  bridge: LocalSessionsBridge;
  openFile: (target: OfficialFileViewTarget) => void;
  openPreview: (target: OfficialPreviewTarget) => void;
  openSubagent: (target: OfficialSubagentTarget) => void;
  openTasks: () => void;
  onNavigate: (path: string) => void;
  reload: (options?: { silent?: boolean }) => Promise<void>;
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
  const { beginLocalUserTurn, entries, error, isLoading, isResponding, isSessionNotFound, messages, pendingTurnStartedAt, reload, session, stopLiveTurn, streamTokenEstimate } = useEpitaxySessionData(initialSessionId);
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
    openFile,
    openPreview,
    openSubagent,
    openTasks,
    onNavigate,
    reload,
    sessionId: initialSessionId,
  }), [attachAsContext, bridge, initialSessionId, onNavigate, openFile, openPreview, openSubagent, openTasks, reload]);
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
            attachRef={composerAttachRef}
            bridge={bridge}
            disabled={isLoading || Boolean(error)}
            isResponding={isResponding}
            onOpenDiff={openDiff}
            onStop={stopLiveTurn}
            onSubmit={async (text, input) => {
              // Official: seed user turn + beginPendingTurn; stream/message events fill assistant.
              // Do not hard-reload transcript (avoids switch/send flash).
              beginLocalUserTurn(text);
              // Official keeps pin and sticks to bottom on send (scrollHeight).
              scrollTranscriptToBottom();
              await sendMessageToSession(initialSessionId, text, input);
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

/** Official vN (c11959232) empty body when `!ee` / no readable contents. */
const OFFICIAL_FILE_UNREADABLE_MESSAGE =
  "File could not be read. It may have been deleted or moved, or it lives outside the session folder.";

function OfficialFilePane({ bridge, fileView, sessionRef }: { bridge: LocalSessionsBridge; fileView: OfficialFileViewTarget | null; sessionRef: EpitaxySessionRef | null }) {
  const [state, setState] = useState<{
    dataUrl?: string;
    error?: string;
    isLoading: boolean;
    text?: string;
    unreadable?: boolean;
  }>({ isLoading: false });
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
        ? bridge.readSessionImageAsDataUrl(sessionRef.id, fileView.path).then((dataUrl) => {
            if (!dataUrl) return { unreadable: true as const };
            return { dataUrl };
          })
        : Promise.resolve({ unreadable: true as const })
      : readPreviewText(bridge, sessionRef.id, fileView.path);
    void load.then((result) => {
      if (!alive) return;
      setState({ ...result, isLoading: false });
    }).catch((error) => {
      if (!alive) return;
      const normalized = previewReadError(error, fileView.path);
      setState({
        isLoading: false,
        unreadable: normalized.unreadable,
        error: normalized.unreadable ? undefined : normalized.message,
      });
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
          // Official vN loading: spinner + sr-only "Loading file"
          <div role="status" className="h-full flex items-center justify-center text-t5">
            <OfficialSpinner />
            <span className="sr-only">Loading file</span>
          </div>
        ) : state.unreadable || (state.text === undefined && !state.dataUrl && !state.error) ? (
          // Official vN `!ee`: muted centered copy (not pink IPC / custom directory text)
          <div className="h-full flex items-center justify-center px-p8 text-body text-t6 text-center text-balance select-text">
            {OFFICIAL_FILE_UNREADABLE_MESSAGE}
          </div>
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

/**
 * Official epitaxy-file query: null / no contents → unreadable empty state.
 * Directory / missing / outside session folder all map to the same soft empty body.
 */
async function readPreviewText(
  bridge: LocalSessionsBridge,
  sessionId: string,
  filePath: string,
): Promise<{ text?: string; unreadable?: boolean }> {
  try {
    const sessionValue = await bridge.readSessionFile?.(sessionId, filePath);
    const sessionText = previewTextFromBridgeValue(sessionValue);
    if (sessionText !== null) return { text: sessionText };
    if (isUnreadableFilePayload(sessionValue)) return { unreadable: true };
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  try {
    const localValue = await desktopBridge.FileSystem.readLocalFile?.(filePath);
    const localText = previewTextFromBridgeValue(localValue);
    if (localText !== null) return { text: localText };
    if (isUnreadableFilePayload(localValue)) return { unreadable: true };
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  try {
    const cwdResult = await bridge.readFileAtCwd?.(sessionId, filePath);
    const cwdText = previewTextFromBridgeValue(cwdResult);
    if (cwdText !== null) return { text: cwdText };
    if (isUnreadableFilePayload(cwdResult)) return { unreadable: true };
    const raw = asRecord(cwdResult);
    if (raw.ok === false) {
      const err = stringValue(raw.error) ?? stringValue(raw.stderr) ?? "Failed to read file";
      if (isSoftUnreadableMessage(err)) return { unreadable: true };
      throw new Error(err);
    }
  } catch (error) {
    const normalized = previewReadError(error, filePath);
    if (normalized.unreadable) return { unreadable: true };
    throw new Error(normalized.message);
  }

  return { unreadable: true };
}

function previewTextFromBridgeValue(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value == null) return null;
  const raw = asRecord(value);
  if (raw.isDirectory === true || raw.tooLarge === true) return null;
  if (stringValue(raw.error) && raw.contents == null && raw.content == null && raw.stdout == null && raw.text == null) {
    return null;
  }
  return stringValue(raw.contents) ?? stringValue(raw.content) ?? stringValue(raw.stdout) ?? stringValue(raw.text);
}

function isUnreadableFilePayload(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return false;
  const raw = asRecord(value);
  return (
    raw.isDirectory === true ||
    raw.tooLarge === true ||
    (Boolean(stringValue(raw.error)) &&
      raw.contents == null &&
      raw.content == null &&
      raw.stdout == null &&
      raw.text == null)
  );
}

function isSoftUnreadableMessage(message: string) {
  return /EISDIR|illegal operation on a directory|is a directory|Cannot preview a directory|ENOENT|no such file|Not a regular file|too large/i.test(
    message,
  );
}

/** Collapse Node EISDIR / remote IPC noise; soft failures → official unreadable empty state. */
function previewReadError(error: unknown, _filePath: string): { message: string; unreadable: boolean } {
  const message = error instanceof Error ? error.message : String(error ?? "Failed to read file");
  if (isSoftUnreadableMessage(message)) {
    return { message: OFFICIAL_FILE_UNREADABLE_MESSAGE, unreadable: true };
  }
  const remote = message.match(/Error invoking remote method '[^']+':\s*(?:Error:\s*)?(.*)$/i);
  const cleaned = remote?.[1]?.trim() || message;
  if (isSoftUnreadableMessage(cleaned)) {
    return { message: OFFICIAL_FILE_UNREADABLE_MESSAGE, unreadable: true };
  }
  return { message: cleaned, unreadable: false };
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

/**
 * Official Gv (c11959232):
 * - elapsed/tokens from session-level maps (je / _e), NOT props that reset every stream tick
 * - l = isWorking && !suppressed; meta opacity when (spawnLabel || elapsed>=2 || compacting) && l
 * - spark stays mounted; meta uses opacity transition (does not unmount on brief content updates)
 */
function OfficialWorkingStatus({
  isWorking,
  sessionId,
  tokenEstimate = 0,
}: {
  isWorking: boolean;
  sessionId?: string;
  startedAt?: number | null;
  tokenEstimate?: number;
}) {
  // Official je(t): stable turn start for this sessionId.
  const startedAt = sessionId
    ? (officialGetTurnStartedAt(sessionId) ?? (isWorking ? officialMarkTurnStarted(sessionId) : null))
    : null;
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0
  ));
  const [tokens, setTokens] = useState(tokenEstimate);

  useEffect(() => {
    // Official je(t): only zero when there is no turn-start timestamp for the session.
    // Do NOT clear elapsed merely because isWorking briefly flickers when text appears.
    if (startedAt == null || !sessionId) {
      setElapsedSeconds(0);
      return undefined;
    }
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      setTokens(officialGetStreamTokenEstimate(sessionId) || tokenEstimate);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, startedAt, tokenEstimate]);

  // Official Gv: d=elapsed>=2; meta opacity = (d||spawn||compacting) && isWorking
  // Spark stays mounted; when isWorking false, meta opacity→0 but timer map stays until settle.
  const showMeta = elapsedSeconds >= 2;
  const showTokens = showMeta && tokens > 0;
  const metaVisible = isWorking && showMeta;
  return (
    <div className="flex items-center gap-[16px] h-h3">
      <OfficialSparkSpinner isWorking={isWorking} size="m" />
      <div className={`flex items-center text-footnote text-assistant-secondary tabular-nums shrink-0 transition-opacity ${metaVisible ? "opacity-100" : "opacity-0"}`}>
        {formatElapsedSeconds(elapsedSeconds)}
        {showTokens ? (
          <>
            {" · "}
            <Icon name="ArrowDown" size="xs" />
            {formatGeneratedTokenCount(tokens)} tokens
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

/** Official c11959232: Za = delayed(Ja, 20) before showing Loading conversation spinner. */
function useOfficialDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active && elapsed;
}

/** Official Ja/Za loading branch — must be a component so the delayed flag is a valid hook. */
function OfficialConversationLoading() {
  const showSpinner = useOfficialDelayedFlag(true, 20);
  if (!showSpinner) return null;
  return (
    <div role="status" className="h-full flex items-center justify-center text-t5">
      <OfficialSparkSpinner isWorking size="l" />
      <span className="sr-only">Loading conversation</span>
    </div>
  );
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
  reload: (options?: { silent?: boolean }) => Promise<void>;
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
  // Official Ja: Boolean(D) && 0===Ya.length && (B||J) — only when nothing to show yet.
  if (isLoading && entries.length === 0 && !session) {
    return <OfficialConversationLoading />;
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

/** Official Fu (c119 / c3d5) transcript restore: pin + measurements + anchor. */
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

/**
 * Official Gb/R transcript (c11959232):
 *   Fu({ items, getKey, estimateSize, overscan, paddingStart:48, paddingEnd:48 })
 *   DOM: scrollRef > sizerRef(height) > absolute translateY(virtualItems[0].start) > measureElement rows
 *   scrollToBottom: setPinned(true); scrollTo({ top: scrollHeight })
 */
const Transcript = forwardRef<OfficialTranscriptHandle, TranscriptProps>(function Transcript({ entries, isAwaitingReply, isResponding, onScrollState, pendingTurnStartedAt, restoreKey, scrollRef, sessionId, streamTokenEstimate, tasks, transcriptMode }, ref) {
  const rowsRef = useRef<TranscriptRow[]>([]);
  const initialCount = useRef(entries.length);
  const [userChapters, setUserChapters] = useState<CodeUserChapter[]>([]);
  const rows = useMemo(() => buildTranscriptRows(entries), [entries]);
  const userChaptersByAfterId = useMemo(() => groupCodeUserChaptersByAfterId(userChapters), [userChapters]);
  const lastEntryIdx = entries.length - 1;

  const officialVirtualizer = useOfficialTranscriptVirtualizer({
    estimateSize: estimateTranscriptRowSize,
    getKey: (row) => row.id,
    items: rows,
    overscan: 6,
    paddingEnd: 48,
    paddingStart: 48,
    restoreKey,
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

  // Official R (c119 Gb): scroll listener only drives showScrollButton / showBottomFade.
  // Pin state lives entirely in Fu — never toggle pin from distance-from-bottom here.
  const onScrollStateRef = useRef(onScrollState);
  useLayoutEffect(() => {
    onScrollStateRef.current = onScrollState;
  }, [onScrollState]);

  useLayoutEffect(() => {
    const node = officialVirtualizer.scrollRef.current;
    const sizer = officialVirtualizer.sizerRef.current;
    if (!node) return undefined;
    const updateScrollState = () => {
      if (node.offsetParent === null) return;
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      onScrollStateRef.current({ showScrollButton: distanceFromBottom > 200, showBottomFade: distanceFromBottom > 8 });
    };
    node.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    if (sizer) observer.observe(sizer);
    observer.observe(node);
    updateScrollState();
    return () => {
      node.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
      onScrollStateRef.current({ showScrollButton: false, showBottomFade: false });
    };
  }, [officialVirtualizer.scrollRef, officialVirtualizer.sizerRef]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior) => {
      // Official R: setPinned(true); scrollTo({ top: scrollHeight, behavior ?? "instant" })
      officialVirtualizer.setPinned(true);
      const node = officialVirtualizer.scrollRef.current;
      node?.scrollTo({ top: node.scrollHeight, behavior: (behavior ?? "instant") as ScrollBehavior });
    },
    scrollToEntry: (entryId) => {
      const index = rowsRef.current.findIndex((row) => (row.kind === "user" || row.kind === "assistant") && row.entry.id === entryId);
      if (index >= 0) officialVirtualizer.scrollToIndex(index, "start");
    },
  }), [officialVirtualizer]);

  // Official R: pointer/keyboard on the list unpins (user intent). Wheel/touch unpin is Fu scroll-direction.
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

  // Official DOM structure (c119 Gb return) — NOT bare virtua <Virtualizer>.
  return (
    <div ref={officialVirtualizer.scrollRef} data-testid="epitaxy-virtual-transcript" className="h-full overflow-y-auto overflow-x-hidden [contain:strict]">
      <div ref={officialVirtualizer.sizerRef} className="relative epitaxy-chat-column" style={{ height: officialVirtualizer.sizerHeight }}>
        <div onPointerDownCapture={unpinTranscript} onKeyDownCapture={unpinTranscriptFromKeyboard} className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${translateY}px)` }}>
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <div data-index={virtualRow.index} key={virtualRow.key} ref={officialVirtualizer.measureElement}>
                <div className={virtualRow.index < rows.length - 1 ? "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0" : "epitaxy-chat-size"}>
                  <TranscriptRowContent
                    initialCount={initialCount.current}
                    isAwaitingReply={isAwaitingReply}
                    isResponding={isResponding}
                    lastEntryIdx={lastEntryIdx}
                    onPinUserChapter={pinUserChapter}
                    onUnpinUserChapters={unpinUserChapters}
                    pendingTurnStartedAt={pendingTurnStartedAt}
                    row={row}
                    sessionId={sessionId}
                    streamTokenEstimate={streamTokenEstimate}
                    tasks={tasks}
                    transcriptMode={transcriptMode}
                    userChaptersByAfterId={userChaptersByAfterId}
                  />
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

function estimateTranscriptRowSize(row: TranscriptRow) {
  if (row.kind === "assistant") return 400;
  if (row.kind === "user") return 80;
  return 48;
}

/**
 * Official Fu virtualizer (c3d5 `ve`, used as Fu from c119 Gb/R):
 * - pin is set only by scroll-direction in Fu, setPinned/scrollToIndex, or restore
 * - while pinned + not mid-user-scroll, stick scrollTop = totalSize
 * - unmount saves isPinned + anchorKey + anchorOffsetPx + measurements for restoreKey
 */
function useOfficialTranscriptVirtualizer<TItem>({
  estimateSize,
  getKey,
  items,
  overscan = 6,
  paddingEnd = 48,
  paddingStart = 48,
  restoreKey,
}: {
  estimateSize: (item: TItem, index: number) => number;
  getKey: (item: TItem) => string;
  items: TItem[];
  overscan?: number;
  paddingEnd?: number;
  paddingStart?: number;
  restoreKey?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const itemCount = items.length;
  const restoreRef = useRef<OfficialTranscriptRestore | undefined | null>(null);
  if (restoreRef.current === null) {
    restoreRef.current = restoreKey !== undefined ? officialTranscriptScrollRestores.get(restoreKey) : undefined;
  }
  const pinnedRef = useRef(restoreRef.current?.isPinned ?? true);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const estimateSizeRef = useRef(estimateSize);
  estimateSizeRef.current = estimateSize;

  // Official Fu refs: last observed scroll / total, last programmatic top, restore target index, missing anchor.
  const lastObservedScrollTopRef = useRef(0);
  const lastObservedTotalSizeRef = useRef(0);
  const lastProgrammaticScrollTopRef = useRef(-1);
  const restoreTargetIndexRef = useRef<number | null>(null);
  const pendingMissingAnchorKeyRef = useRef<string | null>(null);
  const didInitRestoreRef = useRef(false);
  const lastItemCountForMissingRef = useRef(0);

  const initialOffsetRef = useRef<number | undefined>(undefined);
  if (initialOffsetRef.current === undefined) {
    const restored = restoreRef.current;
    if (pinnedRef.current) {
      initialOffsetRef.current = (paddingStart ?? 0)
        + items.reduce((total, item, index) => total + estimateSize(item, index), 0)
        + (paddingEnd ?? 0);
    } else if (restored?.anchorKey && restored.measurements?.length) {
      const anchor = restored.measurements.find((item) => String(item.key) === restored.anchorKey);
      initialOffsetRef.current = anchor ? Math.max(0, anchor.start + (restored.anchorOffsetPx ?? 0)) : 0;
    } else {
      initialOffsetRef.current = 0;
    }
  }

  const virtualizer = useVirtualizer({
    count: itemCount,
    estimateSize: (index) => estimateSizeRef.current(itemsRef.current[index], index),
    getItemKey: (index) => getKeyRef.current(itemsRef.current[index]),
    getScrollElement: () => scrollRef.current,
    initialMeasurementsCache: restoreRef.current?.measurements,
    initialOffset: initialOffsetRef.current,
    overscan,
    paddingEnd,
    paddingStart,
  });
  // Official Fu assigns this on the instance (not as a useVirtualizer option).
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) => (
    !pinnedRef.current && item.end <= (instance.scrollOffset ?? 0)
  );

  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;
  const totalSize = virtualizer.getTotalSize();
  const viewportHeight = virtualizer.scrollRect?.height ?? 0;
  const isScrolling = virtualizer.isScrolling;
  // Official sizerHeight: max(totalSize, viewport) so short transcripts still fill and pin-to-bottom works.
  const sizerHeight = Math.max(totalSize, viewportHeight);

  const applySizerHeight = useCallback((size: number) => {
    const sizer = sizerRef.current;
    if (!sizer) return;
    const height = virtualizerRef.current.scrollRect?.height ?? 0;
    sizer.style.height = `${Math.max(size, height)}px`;
  }, []);

  const tryRestoreAnchorKey = useCallback((anchorKey: string) => {
    const index = itemsRef.current.findIndex((item) => getKeyRef.current(item) === anchorKey);
    if (index < 0) return false;
    restoreTargetIndexRef.current = index;
    pendingMissingAnchorKeyRef.current = null;
    pinnedRef.current = false;
    return true;
  }, []);

  // Official Fu scroll handler: direction vs content shrink decides pin — never distance-from-bottom alone.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const onScroll = () => {
      const vz = virtualizerRef.current;
      const nextTotal = vz.getTotalSize();
      const scrollTop = node.scrollTop;
      const deltaUp = lastObservedScrollTopRef.current - scrollTop;
      const shrinkAllowance = Math.max(0, lastObservedTotalSizeRef.current - nextTotal);
      lastObservedScrollTopRef.current = scrollTop;
      lastObservedTotalSizeRef.current = nextTotal;
      if (Math.abs(deltaUp) > shrinkAllowance + 8) {
        restoreTargetIndexRef.current = null;
        pendingMissingAnchorKeyRef.current = null;
      }
      const scrollingUp = deltaUp > shrinkAllowance + 1;
      const distanceFromBottom = nextTotal - scrollTop - node.clientHeight;
      if (distanceFromBottom < 8 && !scrollingUp) pinnedRef.current = true;
      else if (scrollingUp) pinnedRef.current = false;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [itemCount]);

  // Official Fu layout: restore anchor once, else while pinned stick to totalSize (skip if user is mid-scroll).
  useLayoutEffect(() => {
    if (itemCount === 0) return;
    const vz = virtualizerRef.current;
    const node = scrollRef.current;

    if (!didInitRestoreRef.current) {
      didInitRestoreRef.current = true;
      const anchorKey = restoreRef.current?.anchorKey;
      if (!pinnedRef.current) {
        if (anchorKey === undefined || tryRestoreAnchorKey(anchorKey)) {
          if (anchorKey === undefined) pinnedRef.current = true;
        } else {
          pendingMissingAnchorKeyRef.current = anchorKey;
          lastItemCountForMissingRef.current = itemCount;
          // Official falls back to pin until the missing anchor appears.
          pinnedRef.current = true;
        }
      }
    } else if (
      pendingMissingAnchorKeyRef.current
      && itemCount > lastItemCountForMissingRef.current
    ) {
      lastItemCountForMissingRef.current = itemCount;
      tryRestoreAnchorKey(pendingMissingAnchorKeyRef.current);
    }

    if (restoreTargetIndexRef.current !== null && node) {
      if (isScrolling && node.scrollTop !== lastProgrammaticScrollTopRef.current) return;
      const targetItem = vz.measurementsCache[restoreTargetIndexRef.current];
      if (targetItem) {
        const offset = restoreRef.current?.anchorOffsetPx ?? 0;
        const targetTop = targetItem.start + offset;
        const currentOffset = vz.scrollOffset;
        if (currentOffset !== null && Math.abs(currentOffset - targetTop) < 1) {
          restoreTargetIndexRef.current = null;
          return;
        }
        applySizerHeight(vz.getTotalSize());
        node.scrollTop = targetTop;
        lastProgrammaticScrollTopRef.current = node.scrollTop;
        lastObservedScrollTopRef.current = node.scrollTop;
        lastObservedTotalSizeRef.current = vz.getTotalSize();
      }
      return;
    }

    if (!pinnedRef.current || !node) return;
    // Official: if user is actively scrolling away from our last programmatic top, do not re-pin.
    if (isScrolling && node.scrollTop !== lastProgrammaticScrollTopRef.current) return;

    const nextTotal = vz.getTotalSize();
    applySizerHeight(nextTotal);
    node.scrollTop = nextTotal;
    lastProgrammaticScrollTopRef.current = node.scrollTop;
    lastObservedScrollTopRef.current = node.scrollTop;
    lastObservedTotalSizeRef.current = nextTotal;
  }, [applySizerHeight, isScrolling, itemCount, totalSize, tryRestoreAnchorKey]);

  useLayoutEffect(() => {
    const sizer = sizerRef.current;
    if (sizer) sizer.style.height = `${sizerHeight}px`;
  }, [sizerHeight]);

  // Official Fu unmount save: isPinned + anchor + measurements for session switch restore.
  const restoreKeyRef = useRef(restoreKey);
  restoreKeyRef.current = restoreKey;
  useEffect(() => () => {
    const key = restoreKeyRef.current;
    if (key === undefined) return;
    if (pendingMissingAnchorKeyRef.current && restoreRef.current) {
      officialTranscriptScrollRestores.set(key, restoreRef.current);
      return;
    }
    const vz = virtualizerRef.current;
    const node = scrollRef.current;
    const scrollOffset = node?.scrollTop ?? vz.scrollOffset ?? 0;
    const measurements = vz.measurementsCache;
    const anchor = measurements.find((item) => item.end > scrollOffset);
    officialTranscriptScrollRestores.set(key, {
      isPinned: pinnedRef.current,
      anchorKey: anchor ? String(anchor.key) : undefined,
      anchorOffsetPx: anchor ? scrollOffset - anchor.start : 0,
      measurements: measurements.slice(),
    });
  }, []);

  // Official measureElement: measure only; pin stick is handled by the layout effect above.
  const measureElement = useCallback((node: HTMLElement | null) => {
    virtualizerRef.current.measureElement(node);
  }, []);

  const scrollToIndex = useCallback((index: number, align: "start" | "center" | "end" | "auto" = "start") => {
    pinnedRef.current = false;
    restoreTargetIndexRef.current = null;
    virtualizerRef.current.scrollToIndex(index, { align });
  }, []);

  // Official setPinned: only flips the flag (and clears restore target when unpinning). Does NOT scroll.
  const setPinned = useCallback((value: boolean) => {
    pinnedRef.current = value;
    if (!value) restoreTargetIndexRef.current = null;
  }, []);

  const isPinned = useCallback(() => pinnedRef.current, []);

  return {
    isPinned,
    measureElement,
    scrollRef,
    scrollToIndex,
    setPinned,
    sizerHeight,
    sizerRef,
    virtualItems: virtualizer.getVirtualItems(),
  };
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

/** Official group-level task event placement (`at` = tool index in the group). */
type OfficialToolGroupTaskEvent = {
  at: number;
  event: {
    description?: string;
    id: string;
    kind: "task_event";
    status: OfficialTaskStatus;
    summary?: string;
    taskId: string;
    taskType?: string;
  };
};

type TranscriptEntryItem =
  | { id: string; kind: "bash"; command?: string; error?: string; output?: string }
  /** Official eke nke / $we mark_chapter → chapter (Lh). */
  | { id: string; kind: "chapter"; summary?: string; title: string }
  /** Official eke local_command dCe → context (Ku). */
  | { id: string; kind: "context"; usage: ContextUsage }
  | { id: string; kind: "error"; code?: string; text: string }
  | { id: string; kind: "event"; content: string; eventType?: string }
  /** Official Ike: attachment file chips (Hb `file`). */
  | { fileName: string; id: string; kind: "file" }
  /** Official Ike: image content blocks (Hb `image`). */
  | { data: string; id: string; kind: "image"; mimeType: string }
  /** Official Ike/Cke: cross-session / teammate / channel peer messages (Hb `peer`). */
  | {
    content: string;
    id: string;
    kind: "peer";
    origin: {
      from?: string;
      kind: "channel" | "coordinator" | "peer" | "teammate";
      name?: string;
      server?: string;
    };
  }
  /** Local bridge file chips kept for composer uploads (rendered via Hb file path). */
  | { file: EpitaxyUploadedFile; id: string; kind: "uploaded-file" }
  /** Official eke local_command swe → stats ($x / CodeStatsCard). */
  | { id: string; kind: "stats"; stats: CodeStats | null }
  | { description?: string; id: string; kind: "task_event"; status: OfficialTaskStatus; summary?: string; taskId: string; taskType?: string }
  | { id: string; kind: "text"; text: string }
  | { id: string; kind: "thinking"; text: string }
  | {
    id: string;
    kind: "tools";
    /** Official iv taskEvents: chips interleaved at tool indices inside a default group. */
    taskEvents?: OfficialToolGroupTaskEvent[];
    tools: TranscriptToolUse[];
  }
  /** Official eke result→turn_error (index-BELzQL5P) / rv card (c11959232). */
  | { errors: string[]; id: string; kind: "turn_error"; subtype?: string };

/** Official $we chapter tool name (index-BELzQL5P). */
const OFFICIAL_CHAPTER_TOOL_NAME = "mcp__ccd_session__mark_chapter";

/**
 * Official Vwe: tools that do not absorb task_events into their group
 * (session UI interrupts — always push task_event as its own row).
 */
const OFFICIAL_NON_ABSORB_TOOL_NAMES = new Set([
  "AskUserQuestion",
  "ExitPlanMode",
  "SendUserMessage",
  "SendUserFile",
]);

type TranscriptToolUse = {
  id: string;
  input: Record<string, unknown>;
  isError?: boolean;
  name: string;
  output?: string;
  /** Official Zg outputImages — rendered inside collapse when inGroup, outside when standalone. */
  outputImages?: Array<{ data?: string; media_type?: string; mimeType?: string; url?: string }>;
  /** Official Kwe: thinking text buffered before a tool group is flushed into tools. */
  precedingThinking?: string[];
  status: "awaiting_approval" | "completed" | "error" | "running";
  subagentActivity?: {
    latestToolName?: string;
    model?: string;
    toolCallCount?: number;
  };
};

/**
 * Official eke (index-BELzQL5P) → durable transcript entries.
 * Critical control flow (must not invent):
 * 1. ake(content, messageId, pendingTools) ALWAYS runs for assistant — registers tool
 *    object refs into pendingTools before any streaming skip.
 * 2. if message.id === streamingMessageId: skip pushing the entry (Va owns it) but keep
 *    tools in pendingTools so later rke(user tool_result) mutates the same objects.
 * 3. user messages: rke(content, pendingTools, toolUseResult) mutates tool.status/output
 *    by reference, then optionally push user text/bash via Ike-shaped parse.
 * 4. parent_tool_use_id: uke(subagent activity) only — do not push as main transcript.
 */
function parseOfficialTranscriptEntries(messages: ChatMessage[], streamingMessageId?: string | null): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  const pendingTools = new Map<string, TranscriptToolUse>();
  let lastTimestamp: string | undefined;

  // Official f(): merge consecutive assistant items onto the last assistant entry.
  const pushAuthorItems = (
    author: "assistant" | "user",
    items: TranscriptEntryItem[],
    entryId: string,
    synthetic?: boolean,
  ) => {
    if (items.length === 0) return;
    const previous = entries.at(-1);
    if (previous && previous.author === author && author === "assistant") {
      const nextItems = items.slice();
      const first = nextItems[0];
      if (first?.kind === "tools") {
        // Official: peel trailing thinking into precedingThinking of first tool group.
        let lastItem = previous.items[previous.items.length - 1];
        while (lastItem?.kind === "thinking") {
          previous.items.pop();
          const thinkingText = lastItem.text;
          const firstTool = first.tools[0];
          if (firstTool) {
            firstTool.precedingThinking = [thinkingText, ...(firstTool.precedingThinking ?? [])];
          }
          lastItem = previous.items[previous.items.length - 1];
        }
      }
      const lastItem = previous.items[previous.items.length - 1];
      if (lastItem?.kind === "tools" && first?.kind === "tools") {
        lastItem.tools.push(...first.tools);
        previous.items.push(...nextItems.slice(1));
      } else {
        previous.items.push(...nextItems);
      }
      if (lastTimestamp) previous.timestamp = lastTimestamp;
      return;
    }
    entries.push({
      author,
      id: entryId,
      items: author === "assistant" ? mergeAdjacentAssistantItems(items) : items,
      ...(lastTimestamp ? { timestamp: lastTimestamp } : {}),
      ...(synthetic ? { /* synthetic user answers from lke — not stored on type */ } : {}),
    });
  };

  messages.forEach((message, index) => {
    const raw = asRecord(message.raw);
    const rawType = stringValue(raw.type);
    lastTimestamp = stringValue(raw.timestamp) ?? message.createdAt;

    // Official eke: result (no parent_tool_use_id) → interrupt pending tools; is_error → turn_error.
    const resultParentId = raw.parent_tool_use_id ?? raw.parentToolUseId;
    if (rawType === "result" && !resultParentId) {
      for (const tool of pendingTools.values()) {
        tool.status = "error";
        tool.isError = true;
        tool.output = tool.output ?? "Tool execution was interrupted.";
      }
      pendingTools.clear();
      if (raw.is_error === true || raw.isError === true) {
        const subtype = stringValue(raw.subtype);
        if (subtype === "error_during_execution" && officialResultErrorDuringExecutionSkippable(messages, index)) {
          return;
        }
        const errors = Array.isArray(raw.errors) && raw.errors.length > 0
          ? raw.errors.map(String)
          : typeof raw.result === "string" && raw.result
            ? [raw.result]
            : message.text.trim()
              ? [message.text]
              : [];
        const entryId = stringValue(raw.uuid) ?? `result-${index}`;
        pushAuthorItems("assistant", [{
          errors,
          id: entryId,
          kind: "turn_error",
          subtype,
        }], entryId);
      }
      return;
    }

    if (rawType === "stream_event") return;

    // Official eke: system local_command / local_command_output → context | stats | text.
    if (rawType === "system" && (stringValue(raw.subtype) === "local_command" || stringValue(raw.subtype) === "local_command_output")) {
      const content = typeof raw.content === "string" ? raw.content : stringValue(raw.content);
      if (content && !officialSkipLocalCommandStdout(content)) {
        const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim();
        const stderr = content.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)?.[1]?.trim();
        const body = stderr || stdout;
        if (body) {
          const entryId = stringValue(raw.uuid) ?? stringValue(raw.id) ?? `sys-${index}`;
          const contextUsage = parseOfficialContextUsageMarkdown(body);
          const codeStats = parseOfficialCodeStatsXml(body);
          const items: TranscriptEntryItem[] = contextUsage
            ? [{ id: `${entryId}-ctx`, kind: "context", usage: contextUsage }]
            : codeStats.kind === "data" || codeStats.kind === "loading"
              ? [{ id: `${entryId}-stats`, kind: "stats", stats: codeStats.kind === "data" ? codeStats.stats : null }]
              : [{ id: entryId, kind: "text", text: body }];
          pushAuthorItems("assistant", items, entryId);
        }
      }
      return;
    }

    // Official eke system task_* → absorb into trailing tools group when possible (Vwe rules).
    if (rawType === "system" && isOfficialTaskEvent(raw)) {
      officialAbsorbOrPushTaskEvent(entries, raw, index, pushAuthorItems);
      return;
    }

    if (rawType !== "user" && rawType !== "assistant") {
      // Fall through for ChatMessage.role when raw.type missing (optimistic local user).
      if (message.role !== "user" && message.role !== "assistant") return;
    }

    // Official uke: parent_tool_use_id messages only update subagent activity on the parent tool.
    const parentToolUseId = stringValue(raw.parent_tool_use_id) ?? stringValue(raw.parentToolUseId);
    if (parentToolUseId) {
      if (rawType === "assistant" || message.role === "assistant") {
        officialUkeSubagentActivity(raw, parentToolUseId, pendingTools);
      }
      return;
    }

    const nestedMessage = asRecord(raw.message);
    const role: "assistant" | "user" | undefined = rawType === "assistant" || rawType === "user"
      ? rawType
      : message.role === "assistant" || message.role === "user"
        ? message.role
        : (stringValue(nestedMessage.role) === "assistant" || stringValue(nestedMessage.role) === "user"
          ? stringValue(nestedMessage.role) as "assistant" | "user"
          : undefined);
    if (role !== "assistant" && role !== "user") return;

    const content = Array.isArray(nestedMessage.content) || typeof nestedMessage.content === "string"
      ? nestedMessage.content
      : Array.isArray(raw.content) || typeof raw.content === "string"
        ? raw.content
        : undefined;
    const toolUseResult = raw.tool_use_result ?? raw.toolUseResult;

    if (role === "assistant") {
      // Official Bwe: API error messages.
      if (raw.isApiErrorMessage === true || (typeof raw.error === "string" && raw.error.length > 0)) {
        const entryId = stringValue(raw.uuid) ?? `${rawType ?? "assistant"}-${index}`;
        const errText = typeof content === "string"
          ? content
          : Array.isArray(content) && asRecord(content[0]).type === "text"
            ? (stringValue(asRecord(content[0]).text) ?? "")
            : (stringValue(raw.error) ?? message.text ?? "");
        pushAuthorItems("assistant", [{
          code: stringValue(raw.error),
          id: entryId,
          kind: "error",
          text: errText,
        }], stringValue(nestedMessage.id) ?? entryId);
        return;
      }

      // Official ake FIRST — registers tool refs into pendingTools even when entry is skipped.
      const anthropicMessageId = stringValue(nestedMessage.id) ?? stringValue(raw.message_id);
      const entryId = anthropicMessageId
        ?? stringValue(raw.uuid)
        ?? stringValue(raw.id)
        ?? message.id;
      const items = parseAssistantTranscriptItems(content, pendingTools, entryId, message.text);

      // Official: if (t && e === t) { mark deferred hoist tool ids; continue } — Va owns the row.
      if (streamingMessageId && anthropicMessageId && anthropicMessageId === streamingMessageId) {
        return;
      }

      pushAuthorItems("assistant", items, entryId);
      return;
    }

    // Official user path: rke mutates pending tool refs, then Ike-shaped user items.
    officialRkeAttachToolResults(content, pendingTools, toolUseResult);
    // Also accept top-level / non-array tool_result envelopes from the local CLI bridge.
    if (rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
    }
    const entryId = stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
    const userItems = parseUserTranscriptItems(content, index, message.text);
    // Pure tool_result user rows often have no visible text — rke already settled tools.
    if (userItems.length === 0) return;
    pushAuthorItems("user", userItems, entryId);
  });

  return entries;
}

/** Official uke: fold child-agent tool_use activity onto the parent tool in pendingTools. */
function officialUkeSubagentActivity(
  raw: Record<string, unknown>,
  parentToolUseId: string,
  pendingTools: Map<string, TranscriptToolUse>,
) {
  const parent = pendingTools.get(parentToolUseId);
  if (!parent) return;
  const nested = asRecord(raw.message);
  const model = typeof nested.model === "string" ? nested.model : undefined;
  const content = nested.content;
  if (!Array.isArray(content)) return;
  for (const block of content) {
    const record = asRecord(block);
    if (stringValue(record.type) !== "tool_use" || !stringValue(record.name)) continue;
    const previous = parent.subagentActivity;
    parent.subagentActivity = {
      latestToolName: stringValue(record.name),
      model: model ?? previous?.model,
      toolCallCount: (previous?.toolCallCount ?? 0) + 1,
    };
  }
}

/**
 * Official rke: walk user content for tool_result blocks; mutate pendingTools by tool_use_id.
 * Object identity is the settle mechanism — same refs live inside already-pushed assistant entries.
 */
function officialRkeAttachToolResults(
  content: unknown,
  pendingTools: Map<string, TranscriptToolUse>,
  toolUseResult?: unknown,
) {
  if (!Array.isArray(content)) return;
  for (const block of content) {
    const record = asRecord(block);
    if (stringValue(record.type) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    if (!toolUseId) continue;
    const tool = pendingTools.get(toolUseId);
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    const { text, images } = officialDkeToolResultContent(record.content);
    tool.output = text;
    if (images.length > 0) tool.outputImages = images;
    // toolUseResult kept on the raw envelope for specialized tools (AskUserQuestion etc.).
    void toolUseResult;
    pendingTools.delete(toolUseId);
  }
}

/** Official dke: tool_result content → text + images. */
function officialDkeToolResultContent(content: unknown): {
  text: string;
  images: Array<{ data?: string; media_type?: string; mimeType?: string }>;
} {
  if (typeof content === "string") {
    return { text: content, images: [] };
  }
  if (!Array.isArray(content)) {
    return { text: toolResultText(content), images: [] };
  }
  const texts: string[] = [];
  const images: Array<{ data?: string; media_type?: string; mimeType?: string }> = [];
  for (const part of content) {
    const record = asRecord(part);
    if (stringValue(record.type) === "text" && stringValue(record.text)) {
      texts.push(stringValue(record.text)!);
    } else if (stringValue(record.type) === "image") {
      const source = asRecord(record.source);
      const data = stringValue(source.data) ?? stringValue(record.data);
      const mimeType = stringValue(source.media_type) ?? stringValue(record.mimeType) ?? "image/png";
      if (data) images.push({ data, mimeType, media_type: mimeType });
    }
  }
  return { text: texts.join("\n"), images };
}

/** Official jke: walk back; if prior assistant exists return false; if prior user, return whether user has image blocks. */
function officialResultErrorDuringExecutionSkippable(messages: ChatMessage[], resultIndex: number) {
  for (let index = resultIndex - 1; index >= 0; index -= 1) {
    const raw = asRecord(messages[index]?.raw);
    const type = stringValue(raw.type);
    if (type === "assistant") return false;
    if (type === "user") return rawMessageContentContainsImage(raw);
  }
  return false;
}

function rawMessageContentContainsImage(raw: Record<string, unknown>) {
  return rawMessageContent(raw).some((item) => {
    const record = asRecord(item);
    return (stringValue(record.type) ?? stringValue(record.kind)) === "image";
  });
}

function officialTaskEventItemFromSystemRaw(raw: Record<string, unknown>, index: number): Extract<TranscriptEntryItem, { kind: "task_event" }> | null {
  const subtype = stringValue(raw.subtype);
  const taskId = stringValue(raw.task_id) ?? stringValue(raw.taskId);
  if (!taskId) return null;
  // Official eke: skip_transcript task_started never enters the transcript.
  if (raw.skip_transcript === true || raw.skipTranscript === true) return null;
  let status: OfficialTaskStatus = "running";
  if (subtype === "task_notification") {
    const rawStatus = stringValue(raw.status);
    status = rawStatus === "completed" || rawStatus === "failed" || rawStatus === "stopped" || rawStatus === "running"
      ? rawStatus
      : "failed";
  } else if (subtype === "task_progress") {
    status = "running";
  }
  return {
    description: stringValue(raw.description),
    id: stringValue(raw.uuid) ?? stringValue(raw.id) ?? `task-event-${index}`,
    kind: "task_event",
    status,
    summary: stringValue(raw.summary),
    taskId,
    taskType: stringValue(raw.task_type) ?? stringValue(raw.taskType),
  };
}

/**
 * Official eke task absorb (index-BELzQL5P):
 * tryAbsorb(ev, toolUseId):
 *   last entry must be assistant; last item tools; not all Vwe tools;
 *   if toolUseId already in group tools → drop; else push {at: tools.length, ev}.
 * Returns "absorbed" | "pushed" | "dropped" | "updated".
 */
function officialAbsorbOrPushTaskEvent(
  entries: TranscriptEntry[],
  raw: Record<string, unknown>,
  index: number,
  pushAuthorItems: (
    author: "assistant" | "user",
    items: TranscriptEntryItem[],
    entryId: string,
    synthetic?: boolean,
  ) => void,
) {
  const taskEvent = officialTaskEventItemFromSystemRaw(raw, index);
  if (!taskEvent) return;

  // Official: if this taskId already exists, mutate status/description/summary in place.
  const existing = findOfficialTaskEventRef(entries, taskEvent.taskId);
  if (existing) {
    if (taskEvent.description) existing.description = taskEvent.description;
    if (taskEvent.summary !== undefined) existing.summary = taskEvent.summary;
    if (taskEvent.taskType) existing.taskType = taskEvent.taskType;
    existing.status = taskEvent.status;
    return;
  }

  const toolUseId = stringValue(raw.tool_use_id) ?? stringValue(raw.toolUseId);
  const last = entries.at(-1);
  if (last?.author === "assistant") {
    const lastItem = last.items.at(-1);
    if (lastItem?.kind === "tools" && !lastItem.tools.every((tool) => OFFICIAL_NON_ABSORB_TOOL_NAMES.has(tool.name))) {
      // Official: if the group already contains the spawning tool id, drop the chip.
      if (toolUseId && lastItem.tools.some((tool) => tool.id === toolUseId)) {
        return;
      }
      (lastItem.taskEvents ??= []).push({ at: lastItem.tools.length, event: taskEvent });
      return;
    }
  }
  pushAuthorItems("assistant", [taskEvent], taskEvent.id);
}

/** Walk entries for an existing task_event (standalone or absorbed in tools.taskEvents). */
function findOfficialTaskEventRef(
  entries: TranscriptEntry[],
  taskId: string,
): Extract<TranscriptEntryItem, { kind: "task_event" }> | null {
  for (const entry of entries) {
    for (const item of entry.items) {
      if (item.kind === "task_event" && item.taskId === taskId) return item;
      if (item.kind === "tools") {
        for (const placed of item.taskEvents ?? []) {
          if (placed.event.taskId === taskId) return placed.event;
        }
      }
    }
  }
  return null;
}

/** Official Nke: skip model-set local_command noise. */
function officialSkipLocalCommandStdout(content: string) {
  if (content.includes("<command-name>/model</command-name>")) return true;
  const stdout = content.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1];
  return stdout?.trimStart().startsWith("Set model to ") ?? false;
}

/** Official iCe: parse "1.2k" / "3.4m" token counts. */
function officialParseTokenCountLabel(value: string | undefined) {
  if (!value) return 0;
  const match = /^([\d.]+)\s*([km])?$/i.exec(value.trim());
  if (!match) return 0;
  const amount = Number.parseFloat(match[1]);
  if (!Number.isFinite(amount)) return 0;
  const unit = match[2]?.toLowerCase();
  const scale = unit === "m" ? 1_000_000 : unit ? 1_000 : 1;
  return Math.round(amount * scale);
}

const officialContextModelRe = /\*\*Model:\*\*\s*(.+?)\s*$/m;
const officialContextTokensRe = /\*\*Tokens:\*\*\s*(\S+)\s*\/\s*(\S+)\s*\((\d+)%\)/;

function officialParseMarkdownTableSection(text: string, heading: string) {
  const escaped = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`### ${escaped}\\n\\n([\\s\\S]*?)(?=\\n###|\\n##|$)`).exec(text);
  if (!match) return [] as string[][];
  return match[1]
    .split("\n")
    .filter((line) => line.startsWith("|") && !/^\|[-\s|:]+\|$/.test(line))
    .slice(1)
    .map((line) => line.split("|").slice(1, -1).map((cell) => cell.trim()));
}

/** Official dCe: parse `## Context Usage` local_command stdout into ContextUsage. */
function parseOfficialContextUsageMarkdown(text: string): ContextUsage | null {
  if (!text.startsWith("## Context Usage")) return null;
  const model = officialContextModelRe.exec(text)?.[1];
  const tokens = officialContextTokensRe.exec(text);
  if (!model || !tokens) return null;
  const rawMaxTokens = officialParseTokenCountLabel(tokens[2]);
  if (rawMaxTokens === 0) return null;
  const categories = officialParseMarkdownTableSection(text, "Estimated usage by category").map(([name, count]) => ({
    name: name ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const mcpTools = officialParseMarkdownTableSection(text, "MCP Tools").map(([name, serverName, count]) => ({
    name: name ?? "",
    serverName: serverName ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const memoryFiles = officialParseMarkdownTableSection(text, "Memory Files").map(([_type, path, count]) => ({
    path: path ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  const agents = officialParseMarkdownTableSection(text, "Custom Agents").map(([agentType, , count]) => ({
    agentType: agentType ?? "",
    tokens: officialParseTokenCountLabel(count),
  }));
  return {
    agents,
    cacheCreationInputTokens: 0,
    cacheReadInputTokens: 0,
    categories,
    inputTokens: 0,
    mcpTools,
    memoryFiles,
    model,
    outputTokens: 0,
    percentage: Number(tokens[3]),
    rawMaxTokens,
    totalTokens: officialParseTokenCountLabel(tokens[1]),
  } as ContextUsage & { model?: string };
}

const officialCodeStatsXmlRe = /<code-stats>([\s\S]*?)<\/code-stats>/;

/** Official swe: parse `<code-stats>…</code-stats>` local_command stdout. */
function parseOfficialCodeStatsXml(text: string): { kind: "none" } | { kind: "loading" } | { kind: "data"; stats: CodeStats } {
  const match = officialCodeStatsXmlRe.exec(text);
  if (!match) return { kind: "none" };
  const payload = match[1].trim();
  if (!payload) return { kind: "loading" };
  try {
    const parsed = JSON.parse(payload) as CodeStats;
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.dailyActivity)) {
      return { kind: "data", stats: parsed };
    }
    return { kind: "none" };
  } catch {
    return { kind: "none" };
  }
}

function parseOfficialSubagentTranscriptEntries(messages: ChatMessage[], parentToolUseId: string): TranscriptEntry[] {
  // Same eke control flow as main transcript, filtered to parent_tool_use_id === parentToolUseId.
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
    if (role === "assistant") {
      const entryId = stringValue(nestedMessage.id)
        ?? stringValue(raw.message_id)
        ?? stringValue(raw.uuid)
        ?? stringValue(raw.id)
        ?? message.id;
      // ake first (registers pendingTools), always push in subagent view (no Va suppress).
      const items = parseAssistantTranscriptItems(content, pendingTools, entryId, message.text);
      pushEntry({
        author: "assistant",
        id: entryId,
        items,
        timestamp: stringValue(raw.timestamp) ?? message.createdAt,
      });
      return;
    }
    // rke then optional user text
    officialRkeAttachToolResults(content, pendingTools, raw.tool_use_result ?? raw.toolUseResult);
    if (rawMessageContentContainsToolResult(raw)) {
      attachToolResultMessages(raw, pendingTools);
    }
    const userItems = parseUserTranscriptItems(content, index, message.text);
    if (userItems.length === 0) return;
    pushEntry({
      author: "user",
      id: stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id,
      items: userItems,
      timestamp: stringValue(raw.timestamp) ?? message.createdAt,
    });
  });

  return entries;
}

/**
 * Official ake(content, messageId, pendingTools):
 * - text / connector_text → text items with stable `${messageId}-tN` ids
 * - thinking buffered then flushed as `${messageId}-thN`
 * - tool_use → status always "running", registered into pendingTools by id
 * - consecutive tool_use share one tools group; group id = first tool id
 */
function parseAssistantTranscriptItems(
  content: unknown,
  pendingTools: Map<string, TranscriptToolUse>,
  messageId: string,
  fallbackText: string,
): TranscriptEntryItem[] {
  if (typeof content === "string") {
    const text = content.trim();
    return text ? [{ id: messageId, kind: "text", text }] : [];
  }
  const source = Array.isArray(content)
    ? content
    : fallbackText.trim()
      ? [{ type: "text", text: fallbackText }]
      : [];
  const items: TranscriptEntryItem[] = [];
  let textIndex = 0;
  let thinkingIndex = 0;
  let toolGroup: TranscriptToolUse[] | null = null;
  let thinkingBuffer: string[] = [];
  const flushThinking = () => {
    for (const text of thinkingBuffer) {
      items.push({ id: `${messageId}-th${thinkingIndex++}`, kind: "thinking", text });
    }
    thinkingBuffer = [];
  };

  for (const item of source) {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    if (kind === "thinking") {
      const text = (stringValue(record.thinking) ?? stringValue(record.text) ?? "").trim();
      if (text) thinkingBuffer.push(text);
      continue;
    }
    const textBody = kind === "text"
      ? (stringValue(record.text) ?? stringValue(record.content))
      : kind === "connector_text"
        ? stringValue(record.connector_text) ?? stringValue(record.connectorText)
        : undefined;
    if (textBody) {
      const text = textBody.trim();
      if (!text) continue;
      toolGroup = null;
      flushThinking();
      // context / stats from local_command-shaped assistant text (official dCe/swe on ake path).
      const contextUsage = parseOfficialContextUsageMarkdown(text);
      const codeStats = parseOfficialCodeStatsXml(text);
      const idBase = `${messageId}-t${textIndex++}`;
      if (contextUsage) {
        items.push({ id: `${idBase}-ctx`, kind: "context", usage: contextUsage });
      } else if (codeStats.kind === "data" || codeStats.kind === "loading") {
        items.push({ id: `${idBase}-stats`, kind: "stats", stats: codeStats.kind === "data" ? codeStats.stats : null });
      } else {
        items.push({ id: idBase, kind: "text", text });
      }
      continue;
    }
    if (kind === "tool_use") {
      const toolId = stringValue(record.id);
      const toolName = stringValue(record.name) ?? stringValue(record.tool_name);
      if (!toolId || !toolName) continue;
      // Official ake/nke: $we mark_chapter → { kind:"chapter", id, title, summary }.
      if (toolName === OFFICIAL_CHAPTER_TOOL_NAME) {
        toolGroup = null;
        flushThinking();
        const input = asRecord(record.input);
        const title = stringValue(input.title)?.trim() ?? "";
        const summary = stringValue(input.summary)?.trim();
        items.push({
          id: toolId,
          kind: "chapter",
          title,
          ...(summary ? { summary } : {}),
        });
        continue;
      }
      const tool: TranscriptToolUse = {
        id: toolId,
        input: asRecord(record.input),
        name: toolName,
        // Official ake always starts tools as running; rke settles via object ref.
        status: "running",
        ...(thinkingBuffer.length > 0 ? { precedingThinking: thinkingBuffer.slice() } : {}),
      };
      thinkingBuffer = [];
      pendingTools.set(tool.id, tool);
      if (toolGroup) {
        toolGroup.push(tool);
      } else {
        toolGroup = [tool];
        items.push({ id: tool.id, kind: "tools", tools: toolGroup });
      }
      continue;
    }
    if (kind === "error") {
      toolGroup = null;
      flushThinking();
      items.push({
        code: stringValue(record.code),
        id: stringValue(record.id) ?? `${messageId}-err${textIndex++}`,
        kind: "error",
        text: stringValue(record.text) ?? stringValue(record.error) ?? "Error",
      });
    }
  }
  flushThinking();
  return items;
}

/**
 * Official Ike (index-BELzQL5P): user content → file | image | peer | event | bash | text.
 * Also accepts local bridge shapes used by the desktop CLI runner.
 */
function parseUserTranscriptItems(content: unknown, messageIndex: number, fallbackText: string): TranscriptEntryItem[] {
  const entryId = `user-${messageIndex}`;
  // Official Ike string path: peer envelope → event → bash → plain text.
  if (typeof content === "string" || (!content && fallbackText.trim())) {
    const text = typeof content === "string" ? content : fallbackText;
    const peer = parseOfficialPeerTaggedText(text);
    if (peer) {
      return [{ content: peer.content, id: entryId, kind: "peer", origin: peer.origin }];
    }
    const event = parseOfficialWebhookEventText(text);
    if (event) {
      return [{ content: event.content, eventType: event.eventType, id: entryId, kind: "event" }];
    }
    const bash = parseOfficialBashTaggedText(text);
    if (bash) {
      return [{
        command: bash.command,
        id: `${entryId}-bash`,
        kind: "bash",
        output: bash.output || undefined,
      }];
    }
  }
  const source = typeof content === "string"
    ? [{ type: "text", text: content }]
    : Array.isArray(content)
      ? content
      : fallbackText.trim()
        ? [{ type: "text", text: fallbackText }]
        : [];
  const items: TranscriptEntryItem[] = [];
  const textChunks: string[] = [];
  let imageIndex = 0;
  let peerIndex = 0;
  let eventIndex = 0;
  let bashIndex = 0;
  source.forEach((item, index) => {
    const record = asRecord(item);
    const kind = stringValue(record.type) ?? stringValue(record.kind);
    const id = stringValue(record.id) ?? `${entryId}-${index}`;
    if (kind === "text") {
      const text = stringValue(record.text) ?? stringValue(record.content);
      if (!text) return;
      const peer = parseOfficialPeerTaggedText(text);
      if (peer) {
        items.push({ content: peer.content, id: `${entryId}-peer${peerIndex++}`, kind: "peer", origin: peer.origin });
        return;
      }
      const event = parseOfficialWebhookEventText(text);
      if (event) {
        items.push({ content: event.content, eventType: event.eventType, id: `${entryId}-ev${eventIndex++}`, kind: "event" });
        return;
      }
      const bash = parseOfficialBashTaggedText(text);
      if (bash) {
        items.push({
          command: bash.command,
          id: `${entryId}-bash${bashIndex++}`,
          kind: "bash",
          output: bash.output || undefined,
        });
        return;
      }
      // Local bridge may embed uploaded-file markers inside plain text.
      // Keep uploaded-file (path-openable) only — do not also emit official `file` chips.
      const parsed = parseEpitaxyUploadedFilesText(text);
      parsed.files.forEach((file, fileIndex) => {
        items.push({ file, id: `${id}-uploaded-${fileIndex}`, kind: "uploaded-file" });
      });
      if (parsed.text) textChunks.push(parsed.text);
      return;
    }
    if (kind === "image") {
      const sourceRecord = asRecord(record.source);
      const data = stringValue(sourceRecord.data) ?? stringValue(record.data);
      const mimeType = stringValue(sourceRecord.media_type)
        ?? stringValue(record.mimeType)
        ?? stringValue(record.media_type)
        ?? "image/png";
      if (data) {
        items.push({ data, id: `${entryId}-img${imageIndex++}`, kind: "image", mimeType });
      }
      return;
    }
    if (kind === "file" || kind === "document") {
      const fileName = stringValue(record.file_name)
        ?? stringValue(record.fileName)
        ?? stringValue(record.name)
        ?? "file";
      items.push({ fileName, id: `${entryId}-file${index}`, kind: "file" });
      return;
    }
    if (kind === "bash") {
      items.push({
        command: stringValue(record.command),
        error: stringValue(record.error),
        id,
        kind: "bash",
        output: stringValue(record.output),
      });
      return;
    }
    if (kind === "event") {
      const eventText = stringValue(record.content) ?? stringValue(record.text);
      if (eventText) items.push({ content: eventText, eventType: stringValue(record.eventType), id, kind: "event" });
      return;
    }
    if (kind === "peer") {
      const originRecord = asRecord(record.origin);
      const originKind = stringValue(originRecord.kind);
      if (
        originKind === "peer"
        || originKind === "teammate"
        || originKind === "channel"
        || originKind === "coordinator"
      ) {
        items.push({
          content: stringValue(record.content) ?? "",
          id,
          kind: "peer",
          origin: {
            kind: originKind,
            ...(stringValue(originRecord.from) ? { from: stringValue(originRecord.from) } : {}),
            ...(stringValue(originRecord.name) ? { name: stringValue(originRecord.name) } : {}),
            ...(stringValue(originRecord.server) ? { server: stringValue(originRecord.server) } : {}),
          },
        });
      }
    }
  });
  if (textChunks.length > 0) {
    items.push({ id: entryId, kind: "text", text: textChunks.join("\n") });
  }
  return items;
}

/** Official Cke / yke peer envelope tags. */
function parseOfficialPeerTaggedText(text: string): {
  content: string;
  origin: Extract<TranscriptEntryItem, { kind: "peer" }>["origin"];
} | null {
  const match = text.match(
    /^\s*<(cross-session-message|teammate-message|channel-message)([^>]*)>([\s\S]*?)<\/\1>\s*$/,
  );
  if (!match) return null;
  const tag = match[1];
  const attrs = match[2] ?? "";
  const content = (match[3] ?? "").trim();
  const attr = (name: string) => attrs.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];
  if (tag === "cross-session-message") {
    return { content, origin: { kind: "peer", from: attr("from") ?? "unknown" } };
  }
  if (tag === "teammate-message") {
    return { content, origin: { kind: "teammate", from: attr("teammate_id") ?? "unknown" } };
  }
  return { content, origin: { kind: "channel", server: attr("server") } };
}

/** Official bke / pke webhook / CI event envelopes. */
function parseOfficialWebhookEventText(text: string): { content: string; eventType: string } | null {
  const trimmed = text.trim();
  const patterns: Array<[string, RegExp]> = [
    ["github", /^<github-webhook-activity>([\s\S]*)<\/github-webhook-activity>$/],
    ["ci", /^<ci-monitor-event>([\s\S]*)<\/ci-monitor-event>$/],
  ];
  for (const [eventType, pattern] of patterns) {
    const match = trimmed.match(pattern);
    if (match) return { content: (match[1] ?? "").trim(), eventType };
  }
  const hook = trimmed.match(/^\w+ hook feedback:\n([\s\S]+)$/);
  if (hook) return { content: hook[1].trim(), eventType: "hook" };
  return null;
}

/**
 * Official Ske (index-BELzQL5P): parse bash / local_command tags from a text blob.
 * Returns null when the blob is a bare <command-message> without bash/local-command streams.
 */
function parseOfficialBashTaggedText(text: string): { command: string; output: string } | null {
  if (
    text.includes("<command-message>")
    && !text.includes("<bash-input>")
    && !text.includes("<local-command-stdout>")
    && !text.includes("<bash-stdout>")
    && !text.includes("<local-command-stderr>")
    && !text.includes("<bash-stderr>")
  ) {
    return null;
  }
  const command = text.match(/<command-name>(.*?)<\/command-name>/)?.[1]
    ?? text.match(/<bash-input>([\s\S]*?)<\/bash-input>/)?.[1]?.trim();
  const stdout = text.match(/<local-command-stdout>([\s\S]*?)<\/local-command-stdout>/)?.[1]?.trim()
    ?? text.match(/<bash-stdout>([\s\S]*?)<\/bash-stdout>/)?.[1]?.trim();
  const stderr = text.match(/<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/)?.[1]?.trim()
    ?? text.match(/<bash-stderr>([\s\S]*?)<\/bash-stderr>/)?.[1]?.trim();
  if (command === undefined && stdout === undefined && stderr === undefined) return null;
  return {
    command: command ?? "",
    output: (stdout ?? "") + (stderr ? `\n${stderr}` : ""),
  };
}

function attachToolResultMessages(raw: Record<string, unknown>, pendingTools: Map<string, TranscriptToolUse>) {
  // Bridge-tolerant rke: same mutation semantics as officialRkeAttachToolResults.
  for (const item of rawMessageContent(raw)) {
    const record = asRecord(item);
    if ((stringValue(record.type) ?? stringValue(record.kind)) !== "tool_result") continue;
    const toolUseId = stringValue(record.tool_use_id) ?? stringValue(record.toolUseId);
    const tool = toolUseId ? pendingTools.get(toolUseId) : undefined;
    if (!tool) continue;
    const isError = record.is_error === true || record.isError === true;
    tool.isError = isError;
    tool.status = isError ? "error" : "completed";
    const { text, images } = officialDkeToolResultContent(record.content);
    tool.output = text;
    if (images.length > 0) tool.outputImages = images;
    pendingTools.delete(tool.id);
  }
}

function mergeAdjacentAssistantItems(items: TranscriptEntryItem[]) {
  const merged: TranscriptEntryItem[] = [];
  for (const item of items) {
    const previous = merged.at(-1);
    if (previous?.kind === "tools" && item.kind === "tools") {
      const shiftedEvents = (item.taskEvents ?? []).map((entry) => ({
        ...entry,
        at: entry.at + previous.tools.length,
      }));
      merged[merged.length - 1] = {
        ...previous,
        taskEvents: [...(previous.taskEvents ?? []), ...shiftedEvents],
        tools: [...previous.tools, ...item.tools],
      };
    } else if (previous?.kind === "tools" && item.kind === "task_event") {
      // Official: task events attach into the surrounding default tool group at current length.
      merged[merged.length - 1] = {
        ...previous,
        taskEvents: [...(previous.taskEvents ?? []), { at: previous.tools.length, event: item }],
      };
    } else {
      merged.push(item);
    }
  }
  return merged;
}

/**
 * Official Kwe / lo(Xa, Va) from index-BELzQL5P — pure control flow only:
 *   if (!Va) return Xa
 *   items = map(Va.blocks)  // tools always status:"running"
 *   if items empty return Xa
 *   last = Xa[Xa.length-1]
 *   if last.author === "assistant":
 *     Gwe id overlap → return Xa
 *     else merge tools groups or append items onto last
 *   else append { id: Va.messageId, author:"assistant", items }
 *
 * Tool settle is eke/rke (pendingTools object refs), not a post-merge invent.
 */
function mergeOfficialStreamSnapshot(
  entries: TranscriptEntry[],
  snapshot: OfficialStreamSnapshot,
): TranscriptEntry[] {
  if (!snapshot) return entries;
  const streamItems = streamSnapshotToTranscriptItems(snapshot);
  if (streamItems.length === 0) return entries;

  const last = entries[entries.length - 1];
  if (last?.author === "assistant") {
    // Official Gwe: collect item/tool ids; any overlap → return Xa unchanged.
    const streamIds = new Set<string>();
    collectOfficialTranscriptItemIds(streamItems, streamIds);
    const lastIds = new Set<string>();
    collectOfficialTranscriptItemIds(last.items, lastIds);
    for (const id of streamIds) {
      if (lastIds.has(id)) return entries;
    }
    const lastItem = last.items[last.items.length - 1];
    const firstStream = streamItems[0];
    const nextItems = lastItem?.kind === "tools" && firstStream?.kind === "tools"
      ? [
          ...last.items.slice(0, -1),
          { ...lastItem, tools: [...lastItem.tools, ...firstStream.tools] },
          ...streamItems.slice(1),
        ]
      : [...last.items, ...streamItems];
    return [...entries.slice(0, -1), { ...last, items: nextItems }];
  }
  return [...entries, { author: "assistant", id: snapshot.messageId, items: streamItems }];
}

/** Official Gwe: add item.id and nested tool ids into a set. */
function collectOfficialTranscriptItemIds(items: TranscriptEntryItem[], into: Set<string>) {
  for (const item of items) {
    into.add(item.id);
    if (item.kind === "tools") {
      for (const tool of item.tools) into.add(tool.id);
    }
  }
}

/** Official Kwe block→item mapping: stable `${messageId}-tN` / `-thN` ids. */
function streamSnapshotToTranscriptItems(snapshot: NonNullable<OfficialStreamSnapshot>): TranscriptEntryItem[] {
  const items: TranscriptEntryItem[] = [];
  let textIndex = 0;
  let thinkingIndex = 0;
  let toolGroup: TranscriptToolUse[] | null = null;
  let thinkingBuffer: string[] = [];
  const flushThinking = () => {
    for (const text of thinkingBuffer) {
      items.push({ id: `${snapshot.messageId}-th${thinkingIndex++}`, kind: "thinking", text });
    }
    thinkingBuffer = [];
  };
  const flushTools = () => {
    toolGroup = null;
  };

  for (const block of snapshot.blocks) {
    if (block.kind === "thinking") {
      const text = block.text.trim();
      if (text) thinkingBuffer.push(text);
      continue;
    }
    if (block.kind === "text") {
      if (!block.text) continue;
      toolGroup = null;
      flushThinking();
      items.push({ id: `${snapshot.messageId}-t${textIndex++}`, kind: "text", text: block.text });
      continue;
    }
    // Official Kwe: $we mark_chapter → nke chapter item (not tools group).
    if (block.name === OFFICIAL_CHAPTER_TOOL_NAME) {
      toolGroup = null;
      flushThinking();
      const input = parseJsonObject(block.partialJson) ?? {};
      const title = stringValue(input.title)?.trim() ?? "";
      const summary = stringValue(input.summary)?.trim();
      items.push({
        id: block.id,
        kind: "chapter",
        title,
        ...(summary ? { summary } : {}),
      });
      continue;
    }
    const tool: TranscriptToolUse = {
      id: block.id,
      input: parseJsonObject(block.partialJson) ?? {},
      name: block.name,
      status: "running",
      ...(thinkingBuffer.length > 0 ? { precedingThinking: thinkingBuffer.slice() } : {}),
    };
    thinkingBuffer = [];
    if (toolGroup) {
      toolGroup.push(tool);
    } else {
      toolGroup = [tool];
      items.push({ id: block.id, kind: "tools", tools: toolGroup });
    }
  }
  flushThinking();
  void flushTools;
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

/**
 * Official Hb user entry (c11959232):
 * filters file/image/text/event/bash/peer, then branch layouts
 * (bash-only / peer-only / event-only / default bubble).
 */
function CodeUserEntryMessage({ entry }: { entry: TranscriptEntry }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const textItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "text" }> => item.kind === "text");
  const bashItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "bash" }> => item.kind === "bash");
  const eventItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "event" }> => item.kind === "event");
  const peerItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "peer" }> => item.kind === "peer");
  const imageItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "image" }> => item.kind === "image");
  const fileItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "file" }> => item.kind === "file");
  const uploadedItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "uploaded-file" }> => item.kind === "uploaded-file");
  const copyText = textItems.map((item) => item.text).join("\n\n") || undefined;
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  const onFork = actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const [expandedLongText, setExpandedLongText] = useState(false);
  const isLongText = (copyText?.length ?? 0) > 1200;
  const attachmentStrip = (
    <OfficialUserAttachments
      files={fileItems}
      images={imageItems}
      uploaded={uploadedItems}
    />
  );

  // Official Hb: bash-only branch (no images/text/events).
  if (bashItems.length > 0 && imageItems.length === 0 && textItems.length === 0 && eventItems.length === 0 && peerItems.length === 0) {
    return (
      <div className="flex flex-col gap-g6 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb bash-only">
        {attachmentStrip}
        {bashItems.map((item) => <UserBashBlock item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb: peer-only branch.
  if (peerItems.length > 0 && imageItems.length === 0 && textItems.length === 0) {
    return (
      <div className="flex flex-col gap-g3 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb peer-only">
        {attachmentStrip}
        {peerItems.map((item) => <OfficialUserPeerCard item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb: event-only branch.
  if (eventItems.length > 0 && imageItems.length === 0 && textItems.length === 0) {
    return (
      <div className="flex flex-col gap-g3 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb event-only">
        {attachmentStrip}
        {eventItems.map((item) => <OfficialUserEventCard item={item} key={item.id} />)}
      </div>
    );
  }

  const messageBody = (
    <>
      {attachmentStrip}
      <div className={isLongText && !expandedLongText ? "flex flex-col gap-g4 max-h-[16rem] overflow-clip [mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)]" : "flex flex-col gap-g4"}>
        {textItems.map((item) => (
          <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty" key={item.id}>
            {renderInlineMarkdown(item.text, item.id)}
          </p>
        ))}
        {bashItems.map((item) => <UserBashBlock item={item} key={item.id} />)}
        {eventItems.map((item) => <OfficialUserEventCard item={item} key={item.id} />)}
        {peerItems.map((item) => <OfficialUserPeerCard item={item} key={item.id} />)}
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

/** Official Sv attachment strip: images (data URLs) + file chips. */
function OfficialUserAttachments({
  files,
  images,
  uploaded,
}: {
  files: Array<Extract<TranscriptEntryItem, { kind: "file" }>>;
  images: Array<Extract<TranscriptEntryItem, { kind: "image" }>>;
  uploaded: Array<Extract<TranscriptEntryItem, { kind: "uploaded-file" }>>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  if (files.length === 0 && images.length === 0 && uploaded.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-g2" data-official-source="c11959232-h_zsw3wI.js:Sv">
      {images.map((image) => (
        <img
          alt=""
          className="max-h-[180px] max-w-[240px] rounded-r4 border border-border-300 object-contain"
          key={image.id}
          src={`data:${image.mimeType};base64,${image.data}`}
        />
      ))}
      {files.map((file) => (
        <span
          className="inline-flex max-w-full items-center gap-g2 rounded-r4 bg-fill-contained-default px-p4 py-p2 text-footnote text-t8 effect-contained-default"
          key={file.id}
        >
          <Icon name="Document" size="xs" />
          <span className="max-w-[220px] truncate">{file.fileName}</span>
        </span>
      ))}
      {uploaded.map((item) => (
        <button
          className="inline-flex max-w-full items-center gap-g2 rounded-r4 bg-fill-contained-default px-p4 py-p2 text-footnote text-t8 effect-contained-default border-0 cursor-default outline-none hide-focus-ring ring-focus"
          key={item.id}
          onClick={() => actions?.openFile({ path: item.file.path })}
          type="button"
        >
          <Icon name="Document" size="xs" />
          <span className="max-w-[220px] truncate">{item.file.fileName}</span>
        </button>
      ))}
    </div>
  );
}

/** Official Ib peer card (c11959232). */
function OfficialUserPeerCard({ item }: { item: Extract<TranscriptEntryItem, { kind: "peer" }> }) {
  const title = (() => {
    switch (item.origin.kind) {
      case "peer":
        return `Message from session ${item.origin.name ?? item.origin.from ?? "unknown"}`;
      case "teammate":
        return `Message from teammate ${item.origin.from ?? "unknown"}`;
      case "coordinator":
        return "Message from team lead";
      case "channel":
        return item.origin.server ? `Message from ${item.origin.server}` : "Channel message";
      default:
        return "Message";
    }
  })();
  return (
    <div className="flex w-full flex-col gap-g3 rounded-r6 border border-t3 bg-t1 p-p5" data-official-source="c11959232-h_zsw3wI.js:Ib">
      <div className="flex items-center gap-g3 text-body text-t6">
        <Icon name="ChatBubble" size="xs" />
        <span className="font-medium text-t7">{title}</span>
      </div>
      <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty m-0">{item.content}</p>
    </div>
  );
}

/** Official Rb event card (c11959232). */
function OfficialUserEventCard({ item }: { item: Extract<TranscriptEntryItem, { kind: "event" }> }) {
  return (
    <div className="flex w-full flex-col gap-g2 rounded-r6 border border-border-300 bg-bg-100 p-p4" data-official-source="c11959232-h_zsw3wI.js:Rb">
      <div className="text-footnote font-mono text-t5">{item.eventType ? `${item.eventType} event` : "event"}</div>
      <pre className="m-0 whitespace-pre-wrap break-words text-code text-t7">{item.content}</pre>
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
  const hasErrorItem = visibleItems.some((item) => item.kind === "error");
  const pinHandlersForItem = useCallback((itemId: string, textForTitle: () => string) => {
    const pinned = chaptersByAfterId.get(itemId);
    if (!onPinUserChapter || !onUnpinUserChapters) return { isPinned: Boolean(pinned?.length) };
    if (pinned?.length) {
      return {
        isPinned: true,
        onPinChapter: () => pinned.forEach((chapter) => onUnpinUserChapters(itemId)),
      };
    }
    return {
      isPinned: false,
      onPinChapter: () => onPinUserChapter(itemId, textForTitle()),
    };
  }, [chaptersByAfterId, onPinUserChapter, onUnpinUserChapters]);
  const firstPin = firstVisibleItem
    ? pinHandlersForItem(firstVisibleItem.id, () => copyText ?? "")
    : { isPinned: false as boolean };
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  const retryLastTurn = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  const onFork = !isStreaming && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = !isStreaming && actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const onRetry = !isStreaming && actions?.bridge.rewind ? () => { void retryLastTurn(); } : undefined;
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

  // Official Kb (c11959232): shell + per-item Uv context menu on text/tools + Vv message actions.
  return (
    <OfficialAssistantMessage
      copyText={copyText}
      createdAt={isStreaming ? undefined : entry.timestamp}
      isPinned={Boolean(firstPin.isPinned)}
      onFork={onFork}
      onPinChapter={firstPin.onPinChapter}
      onRateMessage={onRateMessage}
      onRewind={onRewind}
      rateMessageUuid={entry.id}
      showAwaitingDot={showAwaitingDot}
    >
      {visibleItems.map((item) => (
        <Fragment key={item.id}>
          {chaptersByAfterId.get(item.id)?.map((chapter) => <CodeChapterTitle chapter={chapter} key={chapter.id} />)}
          {/* Official Kb: hide turn_error when same entry already has error items (x). */}
          {item.kind === "turn_error" && hasErrorItem
            ? null
            : renderCodeAssistantEntryItem(item, {
              isStreaming,
              onAttachAsContext: actions?.attachAsContext,
              onFork,
              onRetry: hasErrorItem ? undefined : onRetry,
              onRewind,
              pin: pinHandlersForItem,
              sessionId: actions?.sessionId,
              transcriptMode,
            })}
        </Fragment>
      ))}
    </OfficialAssistantMessage>
  );
}

function renderCodeAssistantEntryItem(
  item: Exclude<TranscriptEntryItem, { kind: "file" | "image" | "peer" | "uploaded-file" }>,
  options: {
    isStreaming: boolean;
    onAttachAsContext?: (text: string) => void;
    onFork?: () => void;
    onRetry?: () => void;
    onRewind?: () => void;
    pin: (itemId: string, textForTitle: () => string) => { isPinned?: boolean; onPinChapter?: () => void };
    sessionId?: string;
    transcriptMode: OfficialTranscriptMode;
  },
) {
  if (item.kind === "thinking") return <CodeThinkingBlock text={item.text} transcriptMode={options.transcriptMode} />;
  if (item.kind === "text") {
    const pin = options.pin(item.id, () => item.text);
    return (
      <CodeTranscriptItemMenu
        isPinned={pin.isPinned}
        onAttachAsContext={options.onAttachAsContext}
        onFork={options.onFork}
        onPinChapter={pin.onPinChapter}
        onRewind={options.onRewind}
        text={item.text}
      >
        <div>
          <OfficialCodeMarkdown isStreaming={options.isStreaming} text={item.text} />
        </div>
      </CodeTranscriptItemMenu>
    );
  }
  if (item.kind === "tools") {
    const pin = options.pin(item.id, () => officialToolsCopyText(item.tools));
    return (
      <CodeTranscriptItemMenu
        isPinned={pin.isPinned}
        onAttachAsContext={options.onAttachAsContext}
        onFork={options.onFork}
        onPinChapter={pin.onPinChapter}
        onRewind={options.onRewind}
        text={officialToolsCopyText(item.tools) || undefined}
      >
        <div className="flex flex-col gap-[var(--chat-item-gap)]">
          <AssistantToolsBlock item={item} transcriptMode={options.transcriptMode} />
        </div>
      </CodeTranscriptItemMenu>
    );
  }
  if (item.kind === "error") {
    return <CodeApiErrorBlock code={item.code} onRetry={options.onRetry} sessionId={options.sessionId} text={item.text} />;
  }
  // Official Kb: turn_error → rv (hidden when same message also has error items).
  if (item.kind === "turn_error") {
    return (
      <CodeTurnErrorBlock
        errors={item.errors}
        onRetry={options.onRetry}
        onRewind={options.onRewind}
        sessionId={options.sessionId}
        subtype={item.subtype}
      />
    );
  }
  // Official Kb: task_event → ev EpitaxyTaskChip
  if (item.kind === "task_event") {
    return <CodeTaskEventChip item={item} />;
  }
  // Official Kb: chapter → Lh
  if (item.kind === "chapter") {
    return <CodeOfficialChapterItem item={item} sessionId={options.sessionId} />;
  }
  // Official Kb: context → Ku; stats → $x
  if (item.kind === "context") {
    return (
      <div className="max-w-[520px]" data-official-source="c11959232-h_zsw3wI.js:Ku + index dCe">
        <OfficialContextWindowUsage usage={item.usage} />
      </div>
    );
  }
  if (item.kind === "stats") {
    return <CodeStatsCard stats={item.stats} />;
  }
  if (item.kind === "bash") return <UserBashBlock item={item} />;
  return <div className="text-body text-t6 whitespace-pre-wrap break-words">{item.content}</div>;
}

/** Official Uv (c11959232): context menu on text/tools items — copy, pin, attach, rewind, fork. */
function CodeTranscriptItemMenu({
  children,
  isPinned = false,
  onAttachAsContext,
  onFork,
  onPinChapter,
  onRewind,
  text,
}: {
  children: ReactElement;
  isPinned?: boolean;
  onAttachAsContext?: (text: string) => void;
  onFork?: () => void;
  onPinChapter?: () => void;
  onRewind?: () => void;
  text?: string;
}) {
  const hasText = text !== undefined;
  const [selectionIsPartial, setSelectionIsPartial] = useState(false);
  const canAttach = Boolean(onAttachAsContext) && hasText;
  if (!hasText && !onPinChapter && !onFork && !onRewind && !canAttach) return children;

  const copyMessage = () => {
    if (text === undefined) return;
    void navigator.clipboard?.writeText(text);
  };
  const copyMarkdown = () => {
    if (text === undefined) return;
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  };
  const attachAsContext = () => {
    if (!onAttachAsContext || text === undefined) return;
    const selected = window.getSelection()?.toString().trim() ?? "";
    const payload = selected.length >= 2 ? selected : text;
    if (payload) onAttachAsContext(payload);
  };

  return (
    <ContextMenu.Root
      onOpenChange={(open) => {
        if (!open) {
          setSelectionIsPartial(false);
          return;
        }
        const selected = window.getSelection()?.toString().trim() ?? "";
        setSelectionIsPartial(selected.length >= 2);
      }}
    >
      <ContextMenu.Trigger render={children} />
      <BaseContextMenuPopup>
        {hasText ? <BaseContextMenuItem onClick={copyMessage}>Copy message</BaseContextMenuItem> : null}
        {hasText ? <BaseContextMenuItem onClick={copyMarkdown}>Copy as Markdown</BaseContextMenuItem> : null}
        {canAttach ? (
          <BaseContextMenuItem onClick={attachAsContext}>
            {selectionIsPartial ? "Attach selection as context" : "Attach message as context"}
          </BaseContextMenuItem>
        ) : null}
        {onPinChapter ? (
          <BaseContextMenuItem onClick={onPinChapter}>{isPinned ? "Unpin chapter" : "Pin as chapter"}</BaseContextMenuItem>
        ) : null}
        {(onRewind || onFork) && (hasText || onPinChapter || canAttach) ? <BaseContextMenuSeparator /> : null}
        {onRewind ? <BaseContextMenuItem onClick={onRewind}>Rewind to here</BaseContextMenuItem> : null}
        {onFork ? <BaseContextMenuItem onClick={onFork}>Fork from here</BaseContextMenuItem> : null}
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}

/** Official Bb API Error card (c11959232) + Dh reset_rate_limits when gated. */
function CodeApiErrorBlock({
  code,
  onRetry,
  sessionId: _sessionId,
  text,
}: {
  code?: string;
  onRetry?: () => void;
  sessionId?: string;
  text: string;
}) {
  const isRateLimit = code === "rate_limit" || /hit your limit|out of (extra )?usage|usage allocation|monthly usage limit/i.test(text);
  const [resetState, setResetState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [canReset, setCanReset] = useState(false);
  const [orgUuid, setOrgUuid] = useState<string | null>(null);

  useEffect(() => {
    if (!isRateLimit) return undefined;
    let alive = true;
    void fetchBootstrapPayload().then((bootstrap) => {
      if (!alive) return;
      const uuid = organizationUuidFromBootstrap(bootstrap);
      setOrgUuid(uuid);
      setCanReset(Boolean(uuid) && canResetRateLimitsFromBootstrap(bootstrap));
    });
    return () => {
      alive = false;
    };
  }, [isRateLimit]);

  const resetLimits = async () => {
    if (!orgUuid || resetState === "pending") return;
    setResetState("pending");
    const result = await postOrganizationResetRateLimits(orgUuid);
    setResetState(result.ok ? "done" : "error");
  };

  return (
    <div className="rounded-r3 border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="c11959232-h_zsw3wI.js:Bb+Dh">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote flex items-center justify-between gap-g3">
        <span>API Error</span>
        {isRateLimit && canReset ? (
          <OfficialButton
            disabled={resetState === "pending" || resetState === "done"}
            onClick={() => void resetLimits()}
            size="small"
            variant="uncontained"
          >
            {resetState === "pending" ? "Resetting…" : resetState === "done" ? "Limits reset" : resetState === "error" ? "Reset failed" : "Reset limits"}
          </OfficialButton>
        ) : null}
      </div>
      <div className="px-p3 py-p2">
        <code className="text-code break-words whitespace-pre-wrap">{text}</code>
      </div>
      {onRetry && !isRateLimit ? (
        <div className="flex flex-wrap items-center gap-g3 px-p3 pb-p3">
          <OfficialButton onClick={onRetry} size="small" variant="contained">
            Try again
          </OfficialButton>
        </div>
      ) : null}
    </div>
  );
}

/** Official rv turn_error card (c11959232). */
function CodeTurnErrorBlock({
  errors,
  onRetry,
  onRewind,
  sessionId: _sessionId,
  subtype,
}: {
  errors: string[];
  onRetry?: () => void;
  onRewind?: () => void;
  sessionId?: string;
  subtype?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const title = officialTurnErrorTitle(subtype);
  const statusCode = officialHttpStatusFromErrors(errors);
  const imageTooLarge = errors.some((line) => /exceeds the dimension limit/i.test(line));
  const detailText = errors.join("\n");
  const guidance = officialTurnErrorGuidance(subtype, statusCode, imageTooLarge);
  const showDetailToggle = detailText.length > 0 && detailText.trim().toLowerCase() !== title.trim().toLowerCase();
  const preferRewind = Boolean(onRewind) && (imageTooLarge || subtype === "error_max_turns");
  const showRetry = Boolean(onRetry) && !preferRewind && subtype !== "error_max_turns";
  const mutedGuidance = statusCode === 429 || (statusCode !== undefined && statusCode >= 500);

  return (
    <div className="rounded-r3 border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="c11959232-h_zsw3wI.js:rv">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote">{title}</div>
      <div className="flex flex-col gap-g3 px-p3 py-p3">
        <p className={`text-body ${mutedGuidance ? "text-assistant-secondary" : "text-assistant-primary"}`}>{guidance}</p>
        {showDetailToggle && detailsOpen ? (
          <code className="rounded-r3 bg-t1 px-p3 py-p2 text-code text-t7 break-words whitespace-pre-wrap">{detailText}</code>
        ) : null}
        <div className="flex flex-wrap items-center gap-g3">
          {preferRewind && onRewind ? (
            <OfficialButton onClick={onRewind} size="small" variant="contained">Rewind</OfficialButton>
          ) : null}
          {showRetry && onRetry ? (
            <OfficialButton onClick={onRetry} size="small" variant="contained">Try again</OfficialButton>
          ) : null}
          {showDetailToggle ? (
            <button
              aria-expanded={detailsOpen}
              className="flex items-center gap-g2 text-footnote text-assistant-secondary hover:text-t7 hide-focus-ring focus:ring-focus rounded-r3 border-0 bg-transparent cursor-pointer p-0"
              onClick={() => setDetailsOpen((value) => !value)}
              type="button"
            >
              <Icon name={detailsOpen ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" />
              Details
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function officialTurnErrorTitle(subtype?: string) {
  if (subtype === "error_during_execution") return "Claude couldn't process that message";
  if (subtype === "error_max_turns") return "Reached maximum number of turns";
  return "Turn failed";
}

function officialTurnErrorGuidance(subtype: string | undefined, statusCode: number | undefined, imageTooLarge: boolean) {
  if (subtype === "error_max_turns") return "Rewind to an earlier message or clear the session to continue.";
  if (imageTooLarge) return "This image is too large to send. Rewind to remove it and try again.";
  if (statusCode === 429) return "Rate limited — try again in a moment.";
  if (statusCode === 401) return "Authentication failed — sign in again and retry.";
  if (statusCode === 403) return "Request was blocked — check your permissions and retry.";
  if (statusCode !== undefined && statusCode >= 500) return "Service is busy — try again in a moment, or switch to a different model.";
  return "Try sending your message again.";
}

function officialHttpStatusFromErrors(errors: string[]) {
  for (const line of errors) {
    const match = /\b(4\d{2}|5\d{2})\b/.exec(line);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Official ev / EpitaxyTaskChip (c11959232). */
function CodeTaskEventChip({ item }: { item: Extract<TranscriptEntryItem, { kind: "task_event" }> }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const failed = item.status === "failed";
  const noun = officialTaskTypeNoun(item.taskType);
  const statusWord = officialTaskStatusWord(item.status);
  const label = item.description ?? item.summary;
  const body = (
    <>
      <span className={`text-body min-w-0 truncate ${failed ? "text-extended-pink" : "text-assistant-primary"}`}>
        Background {noun} {statusWord}
      </span>
      {label ? <span className="text-body text-assistant-secondary min-w-0 truncate">{label}</span> : null}
    </>
  );
  if (actions?.openTasks) {
    return (
      <button
        aria-label="View background task"
        className="flex items-center gap-g3 py-0 max-w-full text-left cursor-pointer hover:opacity-80 transition-opacity border-0 bg-transparent p-0"
        data-official-source="c11959232-h_zsw3wI.js:ev EpitaxyTaskChip"
        onClick={actions.openTasks}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-g3 py-0 max-w-full" data-official-source="c11959232-h_zsw3wI.js:ev EpitaxyTaskChip">
      {body}
    </div>
  );
}

function officialTaskTypeNoun(taskType?: string) {
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

function officialTaskStatusWord(status: OfficialTaskStatus) {
  switch (status) {
    case "running":
      return "started";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "stopped":
      return "stopped";
    default:
      return status;
  }
}

function officialToolsCopyText(tools: TranscriptToolUse[]) {
  const tool = tools[0];
  if (!tool) return "";
  const inputString = (key: string) => stringValue(tool.input[key]);
  return inputString("description") ?? inputString("command") ?? inputString("file_path") ?? inputString("pattern") ?? inputString("prompt") ?? tool.name;
}

function CodeChapterTitle({ chapter }: { chapter: CodeUserChapter }) {
  return (
    <div id={chapter.id} className="text-body-semibold text-assistant-primary select-text scroll-mt-[56px]">
      {chapter.title}
    </div>
  );
}

/** Official Lh chapter item from nke / mark_chapter (c11959232). */
function CodeOfficialChapterItem({
  item,
  sessionId: _sessionId,
}: {
  item: Extract<TranscriptEntryItem, { kind: "chapter" }>;
  sessionId?: string;
}) {
  return (
    <div
      className="text-body-semibold text-assistant-primary select-text scroll-mt-[56px]"
      data-official-source="c11959232-h_zsw3wI.js:Lh + index nke"
      id={item.id}
    >
      {item.title || "Chapter"}
      {item.summary ? (
        <div className="text-body text-assistant-secondary font-normal mt-p2">{item.summary}</div>
      ) : null}
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
  // Official Kb: _v(tools, memoryPath?, taskEvents) → map iv groups.
  const runs = groupOfficialToolRuns(item.tools, item.taskEvents);
  if (runs.length === 1) {
    const run = runs[0];
    return run.tools.length === 1 && run.bucket !== "memory" && !(run.taskEvents?.length)
      ? <OfficialToolRow tool={run.tools[0]} transcriptMode={transcriptMode} />
      : <OfficialToolGroup memoryOps={run.memoryOps} taskEvents={run.taskEvents} tools={run.tools} transcriptMode={transcriptMode} />;
  }
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full">
      {runs.map((run) => run.tools.length === 1 && run.bucket !== "memory" && !(run.taskEvents?.length)
        ? <OfficialToolRow key={run.id} tool={run.tools[0]} transcriptMode={transcriptMode} />
        : <OfficialToolGroup key={run.id} memoryOps={run.memoryOps} taskEvents={run.taskEvents} tools={run.tools} transcriptMode={transcriptMode} />)}
    </div>
  );
}

/**
 * Official standalone buckets (do not coalesce into default runs):
 * - todos family + ExitPlanMode (ion c1a1184fb Phe-like)
 * - AskUserQuestion / EnterPlanMode / SendUser* (session UI interrupts)
 */
const standaloneToolNames = new Set([
  "AskUserQuestion",
  "EnterPlanMode",
  "ExitPlanMode",
  "TodoWrite",
  "TodoRead",
  "TaskCreate",
  "TaskUpdate",
  "TaskGet",
  "TaskList",
  "TaskStop",
  "SendUserMessage",
  "SendUserFile",
]);

type OfficialMemoryOps = { read: number; search: number; write: number };

type OfficialToolRunGroup = {
  bucket: "default" | "memory" | "standalone";
  id: string;
  memoryOps?: OfficialMemoryOps;
  taskEvents?: OfficialToolGroupTaskEvent[];
  tools: TranscriptToolUse[];
};

function aggregateOfficialMemoryOps(tools: TranscriptToolUse[]): OfficialMemoryOps | undefined {
  const ops: OfficialMemoryOps = { read: 0, search: 0, write: 0 };
  let any = false;
  for (const tool of tools) {
    if (!isOfficialMemoryTool(tool)) continue;
    const kind = classifyOfficialMemoryOp(tool);
    if (!kind) continue;
    ops[kind] += 1;
    any = true;
  }
  return any ? ops : undefined;
}

/**
 * Official _v grouping:
 * standalone (vs) | memory (bs) | default, with taskEvents snapped into nearest default group.
 */
function groupOfficialToolRuns(tools: TranscriptToolUse[], taskEvents?: OfficialToolGroupTaskEvent[]) {
  const groups: OfficialToolRunGroup[] = [];
  tools.forEach((tool, index) => {
    const bucket: OfficialToolRunGroup["bucket"] = standaloneToolNames.has(tool.name)
      ? "standalone"
      : isOfficialMemoryTool(tool)
        ? "memory"
        : "default";
    const previous = groups.at(-1);
    if (previous && previous.bucket === bucket && bucket !== "standalone") {
      previous.tools.push(tool);
      return;
    }
    groups.push({
      bucket,
      id: `${bucket}:${tool.id}:${index}`,
      tools: [tool],
    });
  });
  for (const group of groups) {
    if (group.bucket === "memory") group.memoryOps = aggregateOfficialMemoryOps(group.tools);
  }
  if (taskEvents?.length && groups.length > 0) {
    const starts: number[] = [];
    let offset = 0;
    for (const group of groups) {
      starts.push(offset);
      offset += group.tools.length;
    }
    for (const event of taskEvents) {
      // Official: place into the group whose tool range covers `at`, prefer default bucket.
      let groupIndex = groups.length - 1;
      for (let index = 0; index < groups.length; index += 1) {
        const end = starts[index] + groups[index].tools.length;
        if (event.at <= end || index === groups.length - 1) {
          groupIndex = index;
          break;
        }
      }
      if (groups[groupIndex].bucket !== "default") {
        const after = groups.findIndex((group, idx) => idx > groupIndex && group.bucket === "default");
        if (after >= 0) groupIndex = after;
        else {
          for (let back = groupIndex - 1; back >= 0; back -= 1) {
            if (groups[back].bucket === "default") {
              groupIndex = back;
              break;
            }
          }
        }
      }
      const at = Math.max(0, Math.min(event.at - starts[groupIndex], groups[groupIndex].tools.length));
      (groups[groupIndex].taskEvents ??= []).push({ at, event: event.event });
    }
  }
  return groups;
}

function officialMemorySummaryPieces(ops: OfficialMemoryOps): ToolSummaryPiece[] {
  // Official: recalled {a memory|# memories}, saved {a memory|# memories}
  const pieces: ToolSummaryPiece[] = [];
  const recalled = ops.read + ops.search;
  if (recalled > 0) pieces.push({ meta: officialCountNoun(recalled, "memory", "memories", "a"), verb: "recalled" });
  if (ops.write > 0) pieces.push({ meta: officialCountNoun(ops.write, "memory", "memories", "a"), verb: "saved" });
  return pieces.length ? pieces : [{ meta: "memories", verb: "used" }];
}

function OfficialToolGroup({
  memoryOps,
  taskEvents,
  tools,
  transcriptMode = "normal",
}: {
  memoryOps?: OfficialMemoryOps;
  taskEvents?: OfficialToolGroupTaskEvent[];
  tools: TranscriptToolUse[];
  transcriptMode?: OfficialTranscriptMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const toolsKey = tools.map((tool) => tool.id).join("|");
  useEffect(() => {
    setExpanded(false);
  }, [toolsKey]);
  const summary = memoryOps ? officialMemorySummaryPieces(memoryOps) : officialToolSummaryPieces(tools);
  const status = aggregateToolStatus(tools);
  const isRunning = status === "running";
  const isAwaitingApproval = status === "awaiting_approval";
  const runningTool = isRunning ? tools.find((tool) => tool.status === "running") : undefined;
  const debouncedRunningToolId = useDebouncedDisplayedKey(runningTool?.id ?? "settled", 650);
  const displayedRunningTool = debouncedRunningToolId !== "settled" ? tools.find((tool) => tool.id === debouncedRunningToolId) : undefined;
  const runningSummary = displayedRunningTool ? officialToolRowSummary(displayedRunningTool) : undefined;
  const isExpanded = isVerbose || expanded;
  // Official: Map<index, taskEvent[]> for chips before tool at index, plus trailing at tools.length.
  const taskEventsByIndex = useMemo(() => {
    if (!taskEvents?.length) return undefined;
    const map = new Map<number, OfficialToolGroupTaskEvent["event"][]>();
    for (const entry of taskEvents) {
      const at = Math.min(Math.max(entry.at, 0), tools.length);
      const list = map.get(at) ?? [];
      list.push(entry.event);
      map.set(at, list);
    }
    return map;
  }, [taskEvents, tools.length]);
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
          {tools.map((tool, index) => (
            <Fragment key={tool.id}>
              {taskEventsByIndex?.get(index)?.map((event) => <CodeTaskEventChip item={event} key={event.id} />)}
              <OfficialToolRow inGroup tool={tool} transcriptMode={transcriptMode} />
            </Fragment>
          ))}
          {taskEventsByIndex?.get(tools.length)?.map((event) => <CodeTaskEventChip item={event} key={event.id} />)}
        </div>
      </OfficialCollapse>
    </div>
  );
}

function OfficialToolRow({ inGroup = false, tool, transcriptMode = "normal" }: { inGroup?: boolean; tool: TranscriptToolUse; transcriptMode?: OfficialTranscriptMode }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => officialToolRowSummary(tool), [tool]);
  // Official Zg C: diffMeta for Write/Edit when !error.
  const diffMeta = useMemo(
    () => (summary.kind === "diff" ? buildOfficialToolDiffMeta(tool) : null),
    [summary.kind, tool],
  );
  // Official Zg: j = !(todos && empty); details always available unless empty todos.
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
  // Official P = !inGroup — output images sit outside collapse when standalone, inside when grouped.
  const showImagesOutsideCollapse = !inGroup;
  // Official M=useRef(v): flash +N-M when the row started as running.
  const flashDiffBadgeRef = useRef(isRunning);
  if (isRunning) flashDiffBadgeRef.current = true;
  const showDiffBadge = Boolean(diffMeta) && !isRunning && ((diffMeta?.counts.additions ?? 0) > 0 || (diffMeta?.counts.deletions ?? 0) > 0);
  const toggle = () => {
    if (opensSubagent && actions?.openSubagent) {
      actions.openSubagent({ description: stringValue(tool.input.description) ?? tool.name, toolUseId: tool.id });
      return;
    }
    if (isVerbose || !hasDetails || isQuestionPrompt) return;
    setExpanded((value) => !value);
  };
  const details = hasDetails ? (
    <OfficialCollapse expanded={isExpanded}>
      <OfficialToolDetails diffMeta={diffMeta} tool={tool} />
      {inGroup ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
    </OfficialCollapse>
  ) : null;
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
        {/* Official Vg+Xg: settled diff counts after meta */}
        {showDiffBadge && diffMeta ? (
          <OfficialToolDiffBadge
            adds={diffMeta.counts.additions}
            dels={diffMeta.counts.deletions}
            flashOnMount={flashDiffBadgeRef.current}
          />
        ) : null}
        {hasDetails ? <ToolChevron expanded={isExpanded} /> : null}
      </div>
      {details}
      {showImagesOutsideCollapse ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
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

/**
 * Official index-BELzQL5P `rhe` tool-group settled labels (all tools, not just Read):
 *   read:  Read a file / Read {n} files
 *   write: Created a file / Created {n} files
 *   edit:  Edited a file / Edited {n} files
 *   bash:  Ran a command / Ran {n} commands
 *   grep:  Searched code / Searched {n} patterns
 *   glob:  Found files / Searched {n} patterns
 *   web:   Searched the web
 *   task:  Ran an agent / Ran {n} agents
 * Verb is lowercase; renderToolSummaryPiece capitalizes the first piece.
 */
function officialToolKindSummary(kind: string, count: number, isError?: boolean): ToolSummaryPiece[] {
  switch (kind) {
    case "bash":
      return [{ isError, meta: officialCountNoun(count, "command", "commands", "a"), verb: "ran" }];
    case "read":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "read" }];
    case "view":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "viewed" }];
    case "write":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "created" }];
    case "edit":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "edited" }];
    case "notebook_edit":
      return [{ isError, meta: officialCountNoun(count, "notebook", "notebooks", "a"), verb: "edited" }];
    case "delete_file":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "deleted" }];
    case "grep":
      // Official: 1 → "Searched code"; n → "Searched {n} patterns"
      return count === 1
        ? [{ isError, meta: "code", verb: "searched" }]
        : [{ isError, meta: `${count} patterns`, verb: "searched" }];
    case "glob":
      // Official: 1 → "Found files"; n → "Searched {n} patterns"
      return count === 1
        ? [{ isError, meta: "files", verb: "found" }]
        : [{ isError, meta: `${count} patterns`, verb: "searched" }];
    case "web":
      return [{ isError, meta: "the web", verb: "searched" }];
    case "task":
      return [{ isError, meta: officialCountNoun(count, "agent", "agents", "an"), verb: "ran" }];
    case "todo":
      return [{ isError, meta: "todos", verb: "updated" }];
    case "skill":
      return [{ isError, meta: officialCountNoun(count, "skill", "skills", "a"), verb: "ran" }];
    case "exit_plan_mode":
      return [{ isError, meta: "a plan", verb: "proposed" }];
    default:
      return [];
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
  if (name === "Skill") return "skill";
  if (
    name === "TodoWrite"
    || name === "TaskCreate"
    || name === "TaskUpdate"
    || name === "TaskGet"
    || name === "TaskList"
    || name === "TaskStop"
  ) return "todo";
  if (name === "ExitPlanMode") return "exit_plan_mode";
  // MCP tools still get per-row running/settled verbs; group falls through to "used N tools".
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

function OfficialToolDetails({ diffMeta, tool }: { diffMeta?: OfficialToolDiffMeta | null; tool: TranscriptToolUse }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summaryKind = officialToolRowKind(tool.name);
  // Official sx order: todos → plan → question → bash → diff+meta → file → error/generic.
  if (summaryKind === "todos") {
    const todos = officialTodoItems(tool.input);
    return todos.length > 0 ? <OfficialTodosToolDetails todos={todos} /> : null;
  }
  if (summaryKind === "plan") return <OfficialPlanToolDetails tool={tool} />;
  if (summaryKind === "question" && typeof tool.output !== "string" && !tool.isError) {
    return <OfficialQuestionToolDetails tool={tool} />;
  }
  if (tool.name === "Bash" || tool.name === "BashTool") return <OfficialBashToolDetails tool={tool} />;
  if (tool.name === "Read" && tool.output && !tool.isError) return <OfficialReadFileToolDetails tool={tool} />;
  // Official sx diff branch: `"diff"===s.kind&&n` → pierre File / FileDiff body.
  if (diffMeta) {
    const copyText = diffMeta.pureSide === "deletions" ? diffMeta.oldFile.contents : diffMeta.newFile.contents;
    return (
      <OfficialToolDiffDetails
        copySlot={<ToolDetailsCopyButton text={copyText} />}
        diffMeta={diffMeta}
        onOpenPath={(path) => actions?.openFile({ path })}
      />
    );
  }
  return <OfficialGenericToolDetails tool={tool} />;
}

/** Official px: checklist body for TodoWrite / Task* tools. */
function OfficialTodosToolDetails({ todos }: { todos: Array<{ content: string; id: string; status: "completed" | "in_progress" | "pending" }> }) {
  return (
    <ul className="flex flex-col gap-[var(--p5)] text-body py-p3">
      {todos.map((todo) => (
        <li
          className={`flex items-start gap-g3 ${todo.status === "completed" ? "line-through decoration-1 text-assistant-secondary" : "text-assistant-primary"}`}
          key={todo.id}
        >
          <OfficialTodoStatusIcon status={todo.status} />
          <span>{todo.content}</span>
        </li>
      ))}
    </ul>
  );
}

function OfficialTodoStatusIcon({ status }: { status: "completed" | "in_progress" | "pending" }) {
  // Official ux + dx: 14px status slot.
  const className = "flex size-[14px] shrink-0 items-center justify-center text-assistant-primary";
  if (status === "completed") {
    return (
      <span className={className}>
        <Icon name="CheckSelection" size="sm" />
        <span className="sr-only">done</span>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={className}>
        <Icon name="StatusInProgressQuarterCircle" size="sm" />
        <span className="sr-only">in progress</span>
      </span>
    );
  }
  // Official pending: empty 12px circle border, not an icon glyph.
  return (
    <span className={className}>
      <span aria-hidden className="block w-[12px] h-[12px] rounded-full border border-[var(--t5)]" />
      <span className="sr-only">not done</span>
    </span>
  );
}

/** Official mx: ExitPlanMode plan body (pending border / approved check). */
function OfficialPlanToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const plan = typeof tool.input.plan === "string" ? tool.input.plan : "";
  if (tool.status === "running" || tool.status === "awaiting_approval") {
    return plan ? (
      <div className="text-body text-assistant-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)] py-p3">
        {plan}
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-g3 py-p3">
      {tool.isError ? null : (
        <div className="flex items-center gap-g3 text-body text-extended-green">
          <Icon name="CircleCheck" size="sm" />
          <span>Plan approved</span>
        </div>
      )}
      {plan ? (
        <div className="text-body text-assistant-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)]">
          {plan}
        </div>
      ) : null}
    </div>
  );
}

/** Official hx: AskUserQuestion pending prompt body — question texts only. */
function OfficialQuestionToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const questions = useMemo(() => {
    const raw = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    return raw
      .map((item) => {
        const record = asRecord(item);
        return typeof record.question === "string" ? record.question : "";
      })
      .filter(Boolean);
  }, [tool.input.questions]);
  if (questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-g3 pt-p3">
      {questions.map((question, index) => (
        <div className="text-body text-assistant-secondary [overflow-wrap:anywhere]" key={`${index}-${question.slice(0, 24)}`}>
          {question}
        </div>
      ))}
    </div>
  );
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
  const actions = useContext(EpitaxyTranscriptActionContext);
  const path = stringValue(tool.input.file_path) ?? "file";
  const contents = normalizeReadFileOutput(tool.output ?? "");
  // Official sx file branch → pierre File (iu), not plain <pre>.
  return (
    <OfficialToolReadFileDetails
      contents={contents}
      copySlot={<ToolDetailsCopyButton text={contents} />}
      onOpenPath={(nextPath) => actions?.openFile({ path: nextPath })}
      path={path}
    />
  );
}

/** Official c11959232 sx generic branch: only render when ox(tool) is non-empty; error output is pink. */
function OfficialGenericToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const inputKeys = Object.keys(tool.input);
  const copyText = toolCopyText(tool);
  // Official: if (t.isError && t.output) error body; else if (ox(t)) generic; else null.
  if (tool.isError && tool.output) {
    return (
      <div className="group/body relative flex flex-col w-full pt-p3">
        <div className="flex w-full">
          <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body whitespace-pre-wrap break-words">
            {inputKeys.length > 0 ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
            <div className="text-extended-pink">{tool.output}</div>
          </div>
          <ToolDetailsCopyButton text={copyText} />
        </div>
      </div>
    );
  }
  if (!copyText) return null;
  return (
    <div className="group/body relative flex flex-col w-full pt-p3">
      <div className="flex w-full">
        <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body text-assistant-secondary whitespace-pre-wrap break-words">
          {inputKeys.length > 0 ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
          {tool.output ? <div>{tool.output}</div> : null}
        </div>
        <ToolDetailsCopyButton text={copyText} />
      </div>
    </div>
  );
}

/** Official gx — tool output images; placement depends on inGroup (Zg P=!inGroup). */
function OfficialToolOutputImages({ images }: { images?: TranscriptToolUse["outputImages"] }) {
  if (!images?.length) return null;
  return (
    <div className="flex flex-wrap gap-g3 pt-p3">
      {images.map((image, index) => {
        const src = image.url ?? (image.data ? `data:${image.mimeType ?? image.media_type ?? "image/png"};base64,${image.data}` : undefined);
        if (!src) return null;
        return <img alt="" className="max-h-[240px] max-w-[320px] rounded-lg" key={`${src}-${index}`} src={src} />;
      })}
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

// Official c11959232 `_Component28`: only file_path / notebook_path use fileRef → open side file pane.
// Generic keys like Glob/LS `path` stay plain text (often directories).
const OFFICIAL_FILE_OPEN_INPUT_KEYS = new Set(["file_path", "notebook_path"]);

function ToolInputLine({ input, inputKey }: { input: Record<string, unknown>; inputKey: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const raw = input[inputKey];
  const value = inputValueText(raw);
  const isOpenableFilePath = OFFICIAL_FILE_OPEN_INPUT_KEYS.has(inputKey) && typeof raw === "string";
  return (
    <div>
      {inputKey}:{" "}
      {isOpenableFilePath ? (
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

/** Official ICU one/other for tool-group counts: one → "a file", other → "3 files". */
function officialCountNoun(count: number, singular: string, pluralValue: string, oneArticle: "a" | "an") {
  if (count === 1) return `${oneArticle} ${singular}`;
  return `${count} ${pluralValue}`;
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

function isVisibleAssistantEntryItem(
  item: TranscriptEntryItem,
): item is Exclude<TranscriptEntryItem, { kind: "file" | "image" | "peer" | "uploaded-file" }> {
  // Official Kb only switches assistant kinds; user-only Ike kinds never render here.
  return item.kind !== "uploaded-file"
    && item.kind !== "file"
    && item.kind !== "image"
    && item.kind !== "peer";
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
  if (block.kind === "code") {
    // Official hit (index-BELzQL5P): language-mermaid → eit; language-search_tree → ait SearchTree.
    if (isOfficialMermaidMarkdownLanguage(block.language)) {
      return <OfficialMermaidDiagramCard key={blockKey} source={block.text} />;
    }
    if ((block.language?.trim() ?? "") === officialSearchTreeLanguage) {
      return <OfficialSearchTree content={block.text} key={blockKey} />;
    }
    return <pre key={blockKey}><code className={block.language ? `language-${block.language}` : undefined}>{block.text}</code></pre>;
  }
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
  // Also read session.pendingToolPermissions from the code session store so session_updated
  // (after control_request) can hydrate the card even if a permission event was missed.
  const storePending = useOfficialCodeSessionBucket(sessionId)?.session?.pendingToolPermissions;

  useEffect(() => {
    if (!sessionId) {
      setRequests([]);
      return undefined;
    }
    let alive = true;
    const hydrateFromPending = (pending: NonNullable<SessionSummary["pendingToolPermissions"]> | undefined) => {
      if (!pending?.length) return;
      setRequests((current) => mergeInlinePermissionRequests(current, pending.map(inlinePermissionFromPending)));
    };
    void bridge.getSession(sessionId).then((session) => {
      if (!alive) return;
      hydrateFromPending(session?.pendingToolPermissions);
    }).catch(() => {});
    const onPermissionEvent = (event: unknown) => {
      // session_updated carries the full pending queue after register/clear.
      const raw = asRecord(event);
      if (stringValue(raw.type) === "session_updated") {
        const session = asRecord(raw.session);
        const sessionIdFromEvent = stringValue(raw.sessionId) ?? stringValue(session.id) ?? stringValue(session.sessionId);
        if (sessionIdFromEvent && sessionIdFromEvent !== sessionId) return;
        const pending = session.pendingToolPermissions;
        if (Array.isArray(pending)) {
          setRequests(pending.map((item) => inlinePermissionFromPending(item as NonNullable<SessionSummary["pendingToolPermissions"]>[number])));
        }
        return;
      }
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

  useEffect(() => {
    if (!sessionId || !storePending) return;
    setRequests((current) => mergeInlinePermissionRequests(current, storePending.map(inlinePermissionFromPending)));
  }, [sessionId, storePending]);

  const request = requests[0];
  const hasAlwaysAllow = request?.hasAlwaysAllow !== false;
  const decide = useCallback(async (decision: "always" | "deny" | "once") => {
    if (!request || !bridge.respondToToolPermission) return;
    if (decision === "always" && request.hasAlwaysAllow === false) return;
    setResolvingId(request.requestId);
    setResolveError(null);
    try {
      // Pass sessionId inside updatedInput so desktop IPC can resolve the live turn
      // without relying only on findSessionIdForPermission store fallback.
      const result = await bridge.respondToToolPermission(request.requestId, decision, {
        ...request.input,
        sessionId: request.sessionId,
      });
      if (toolPermissionResponseFailed(result)) {
        setResolveError(toolPermissionResponseError(result));
        // Stale turn: drop the card so the user is not stuck on a dead approval.
        if (toolPermissionResponseError(result).includes("no_active_turn")) {
          setRequests((current) => current.filter((item) => item.requestId !== request.requestId));
        }
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

/** Plain text → TipTap doc (same shape as OfficialCodeComposer). */
function tiptapDocFromPlainText(value: string) {
  if (!value) return { type: "doc", content: [] as Array<{ type: string; content?: Array<{ type: string; text: string }> }> };
  return {
    type: "doc",
    content: value.split("\n").map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : [],
    })),
  };
}

function ExistingSessionComposer({
  attachRef,
  bridge,
  disabled,
  isResponding,
  onOpenDiff,
  onScrollToBottom,
  onStop,
  onSubmit,
  reload,
  session,
  sessionRef,
  showScrollButton,
}: {
  attachRef?: MutableRefObject<((text: string) => void) | null>;
  bridge: LocalSessionsBridge;
  disabled: boolean;
  isResponding: boolean;
  onOpenDiff?: () => void;
  onScrollToBottom: () => void;
  onStop?: () => void | Promise<void>;
  onSubmit: (text: string, input?: SendMessageInput) => Promise<void>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
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

  /** Official onAttachAsContext → setComposerText + focus (c119 Ye.current). */
  const attachTextAsContext = useCallback((value: string) => {
    const next = value.trim();
    if (!next || !editor || editor.isDestroyed) return;
    const current = editor.getText({ blockSeparator: "\n" }).trim();
    const combined = current ? `${current}\n\n${next}` : next;
    editor.commands.setContent(tiptapDocFromPlainText(combined), { emitUpdate: true });
    setText(editor.getText({ blockSeparator: "\n" }));
    editor.commands.focus("end");
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

  useEffect(() => {
    if (!attachRef) return undefined;
    attachRef.current = attachTextAsContext;
    return () => {
      if (attachRef.current === attachTextAsContext) attachRef.current = null;
    };
  }, [attachRef, attachTextAsContext]);

  const stopResponse = async () => {
    if (!sessionRef || !bridge.stop) return;
    // Official wt(): clear local stream first, then await LocalSessions.stop.
    await onStop?.();
    try {
      await bridge.stop(sessionRef.id);
    } finally {
      await reload({ silent: true });
    }
  };

  const applyModel = async (nextModel: string) => {
    if (!sessionRef || nextModel === model) return;
    setModel(nextModel);
    setConfigBusy(true);
    try {
      await bridge.setModel?.(sessionRef.id, nextModel);
      await reload({ silent: true });
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
      await reload({ silent: true });
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
      await reload({ silent: true });
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
      await reload({ silent: true });
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

/**
 * Official session data hook:
 * - durable meta/messages: `officialCodeSessionStore` (`he`/`tm`)
 * - live stream: official `Pe` (`officialStreamSessionStore`) → local Va state
 *   (stream is NOT written into durable bucket until settle promote)
 */
function useEpitaxySessionData(sessionId?: string) {
  const finalizeStreamGenerationRef = useRef<number | null>(null);
  const streamGenerationRef = useRef(0);
  const store = officialCodeSessionStore;
  // Never mutate the store during render (ensureBucket → set would break useSyncExternalStore).
  // Bucket is created in effects / beginPendingTurn / reload / openSession from Recents.
  const bucket = useOfficialCodeSessionBucket(sessionId);
  // Official Va: local stream snapshot state (not he.buckets).
  const [streamSnapshot, setStreamSnapshot] = useState<OfficialStreamSnapshot>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamActivityMode, setStreamActivityMode] = useState<StreamActivityMode>(idleStreamActivityMode);
  const streamMessageIdRef = useRef<string | null>(null);
  const streamSnapshotRef = useRef<OfficialStreamSnapshot>(null);
  const streamActivityModeRef = useRef<StreamActivityMode>(idleStreamActivityMode);
  streamSnapshotRef.current = streamSnapshot;
  streamActivityModeRef.current = streamActivityMode;

  useEffect(() => {
    if (!sessionId) {
      setStreamSnapshot(null);
      setStreamingMessageId(null);
      setStreamActivityMode(idleStreamActivityMode);
      streamMessageIdRef.current = null;
      return undefined;
    }
    store.getState().ensureBucket(sessionId);
    // Official Pe.subscribe(sessionId, listener) + Pe.setVisibility (c119).
    const transcriptVisibleRef = { current: true };
    officialStreamSetVisibility(sessionId, () => transcriptVisibleRef.current);
    const unsubscribe = officialStreamSubscribe(sessionId, (snapshot) => {
      const nextId = snapshot?.messageId ?? null;
      if (snapshot) {
        const chars = snapshot.blocks.reduce((total, block) => {
          if (block.kind === "text") return total + block.text.length;
          if (block.kind === "tool") return total + 1 + block.partialJson.length;
          return total;
        }, 0);
        officialSetStreamCharBudget(sessionId, chars);
      }
      // Paint every smoother tick. Official c119 uses startTransition for same-messageId, but
      // under concurrent React that can drop intermediate reveals and look like a single dump.
      // Typewriter needs the 60fps Va frames to actually commit.
      streamMessageIdRef.current = nextId;
      setStreamSnapshot(snapshot);
      if (nextId) setStreamingMessageId(nextId);
    });
    return () => {
      unsubscribe();
      // Official: if no listeners left, setVisibility(() => false)
      if (!officialStreamHasListeners(sessionId)) {
        officialStreamSetVisibility(sessionId, () => false);
      }
    };
  }, [sessionId, store]);

  useEffect(() => {
    streamGenerationRef.current += 1;
    finalizeStreamGenerationRef.current = null;
    if (!sessionId) return;
    officialStreamClear(sessionId);
    setStreamSnapshot(null);
    setStreamingMessageId(null);
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
  }, [sessionId]);

  const clearStreamState = useCallback((markSessionSettled = false) => {
    if (!sessionId) return;
    // Promote Va only when durable does not already hold this Anthropic message id
    // (CLI final assistant dump usually lands first — re-promoting duplicated the whole turn).
    const live = streamSnapshotRef.current;
    if (markSessionSettled && live && live.blocks.length > 0) {
      const alreadyDurable = store.getState().buckets[sessionId]?.messages.some((message) => {
        if (message.role !== "assistant") return false;
        const raw = asRecord(message.raw);
        const nested = asRecord(raw.message);
        const anthropicId = stringValue(nested.id) ?? stringValue(raw.message_id) ?? message.id;
        return anthropicId === live.messageId;
      });
      if (!alreadyDurable) {
        const content = live.blocks.flatMap((block) => {
          if (block.kind === "text" && block.text) return [{ type: "text", text: block.text }];
          if (block.kind === "thinking" && block.text) return [{ type: "thinking", thinking: block.text }];
          if (block.kind === "tool") {
            return [{
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: (() => {
                try { return JSON.parse(block.partialJson || "{}"); } catch { return {}; }
              })(),
            }];
          }
          return [];
        });
        if (content.length > 0) {
          const text = content
            .map((block) => ("text" in block ? String(block.text ?? "") : ""))
            .filter(Boolean)
            .join("");
          const createdAt = new Date().toISOString();
          store.getState().mergeMessage(sessionId, {
            id: live.messageId,
            role: "assistant",
            text,
            createdAt,
            raw: {
              type: "assistant",
              uuid: live.messageId,
              timestamp: createdAt,
              message: {
                id: live.messageId,
                role: "assistant",
                content,
              },
            },
          });
        }
      }
    }
    officialStreamClear(sessionId);
    if (markSessionSettled) officialClearTurnStarted(sessionId);
    setStreamSnapshot(null);
    setStreamingMessageId(null);
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
    streamSnapshotRef.current = null;
    streamActivityModeRef.current = idleStreamActivityMode;
    store.getState().clearStream(sessionId, markSessionSettled);
  }, [sessionId, store]);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!sessionId) return;
    const generation = store.getState().markLoading(sessionId, silent);
    try {
      const next = await loadEpitaxySession(sessionId);
      store.getState().applyLoad(sessionId, generation, next);
    } catch (caught) {
      store.getState().applyLoadError(
        sessionId,
        generation,
        caught instanceof Error ? caught : new Error(String(caught)),
      );
    }
  }, [sessionId, store]);

  const beginLocalUserTurn = useCallback((text: string) => {
    if (!sessionId) return;
    // Official beginPendingTurn + je turn-start stamp (stable for Gv elapsed).
    officialMarkTurnStarted(sessionId);
    store.getState().beginPendingTurn(sessionId, makeOptimisticUserChatMessage(text));
    setStreamActivityMode("requesting");
  }, [sessionId, store]);

  useEffect(() => {
    let alive = true;
    if (!sessionId) return () => { alive = false; };
    const existing = store.getState().buckets[sessionId];
    const silent = Boolean(existing && (existing.messages.length > 0 || existing.session));
    void reload({ silent }).finally(() => {
      if (!alive) return;
    });
    return () => { alive = false; };
  }, [reload, sessionId, store]);

  useEffect(() => {
    if (!sessionId) return undefined;
    const handleEvent = (event: unknown) => {
      if (!isSessionEventForId(event, sessionId)) return;
      const streamMessage = streamEventMessageFromBridgeEvent(event);
      if (streamMessage) {
        // Official index feed: Pke.feed(sessionId, stream_event.event, parent_tool_use_id)
        const parentToolUseId = streamMessage.parent_tool_use_id ?? streamMessage.parentToolUseId;
        const innerEvent = asRecord(streamMessage.event);
        const isStart = stringValue(innerEvent.type) === "message_start";
        const streamMessageId = isStart
          ? (stringValue(asRecord(innerEvent.message).id) ?? stringValue(streamMessage.uuid) ?? null)
          : null;
        if (isStart) {
          streamGenerationRef.current += 1;
          finalizeStreamGenerationRef.current = null;
          officialMarkTurnStarted(sessionId);
          if (streamMessageId) setStreamingMessageId(streamMessageId);
          store.getState().setStreamActivity(sessionId, {
            pendingTurnStartedAt: officialGetTurnStartedAt(sessionId) ?? Date.now(),
            streamActivityMode: "requesting",
            streamingMessageId: streamMessageId,
            isRunning: true,
          });
        } else if (store.getState().buckets[sessionId]?.session?.isRunning !== true) {
          store.getState().setStreamActivity(sessionId, { isRunning: true });
        }
        // Activity mode from inner event (official stream_event.event).
        setStreamActivityMode((current) => streamActivityModeFromInnerEvent(innerEvent, current));
        // Official Pe.feed(sessionId, event, parent) — typewriter via zE smoother.
        officialStreamFeed(sessionId, streamMessage, parentToolUseId);
        return;
      }
      const transcriptMessage = chatMessageFromBridgeMessageEvent(event);
      if (transcriptMessage) {
        // Official: durable messages stay in the array in CLI order (assistant tool_use
        // before user tool_result). eke/Xwe suppress *rendering* of the live Anthropic
        // message.id while Va owns the typewriter — do NOT drop merge here or rke order breaks.
        store.getState().mergeMessage(sessionId, transcriptMessage);
        return;
      }
      if (shouldReloadTranscriptForEvent(event)) {
        if (shouldClearOfficialStreamForEvent(event)) {
          const streamGeneration = streamGenerationRef.current;
          const finalize = () => {
            if (streamGenerationRef.current !== streamGeneration) return;
            finalizeStreamGenerationRef.current = null;
            clearStreamState(true);
            const cached = store.getState().buckets[sessionId];
            const mayNeedToolResults = (cached?.messages ?? []).some((message) => {
              const raw = asRecord(message.raw);
              if (stringValue(raw.type) !== "assistant") return false;
              const content = asRecord(raw.message).content;
              if (!Array.isArray(content)) return false;
              return content.some((block) => stringValue(asRecord(block).type) === "tool_use");
            });
            if (mayNeedToolResults) void reload({ silent: true });
            void refreshSessionTitleAfterSettle(sessionId).then((nextSession) => {
              if (!nextSession) return;
              if (streamGenerationRef.current !== streamGeneration) return;
              store.getState().patchSession(sessionId, nextSession);
            });
          };
          if (shouldSettleOfficialStreamForEvent(event)) {
            if (finalizeStreamGenerationRef.current === streamGeneration) return;
            finalizeStreamGenerationRef.current = streamGeneration;
            void officialStreamSettleAfterReveal(sessionId).finally(() => {
              if (streamGenerationRef.current !== streamGeneration) return;
              finalize();
            });
          } else {
            finalize();
          }
        } else if (stringValue(asRecord(event).type) === "session_updated") {
          const nextSession = asRecord(event).session ?? asRecord(asRecord(event).payload).session;
          if (nextSession) {
            // Full session from desktop includes pendingToolPermissions after control_request.
            const patched = normalizeSessionSummaryPatch(store.getState().buckets[sessionId]?.session ?? null, nextSession);
            if (patched) store.getState().patchSession(sessionId, patched);
          } else {
            void reload({ silent: true });
          }
        } else {
          void reload({ silent: true });
        }
      } else if (
        stringValue(asRecord(event).type) === "tool_permission_request"
        || stringValue(asRecord(event).type) === "tool_permission_resolved"
        || stringValue(asRecord(event).type) === "tool_permission_response_failed"
      ) {
        // Outside shouldReload: keep pendingToolPermissions on the code session for hydrate / isAwaitingReply.
        void bridgeGetSessionPending(sessionId).then((pending) => {
          const current = store.getState().buckets[sessionId]?.session ?? null;
          if (!current) return;
          store.getState().patchSession(sessionId, {
            ...current,
            pendingToolPermissions: pending,
          });
        });
      }
    };
    const offCode = desktopBridge.LocalSessions.onEvent?.(handleEvent);
    return () => {
      offCode?.();
    };
  }, [clearStreamState, reload, sessionId, store]);

  // Official Ja
  const isLoading = Boolean(sessionId) && (bucket.isTranscriptPending || bucket.isMetaPending);
  const activeStreamingMessageId = streamingMessageId ?? streamSnapshot?.messageId ?? null;
  // Official Xa = eke/Xwe(messages, streamingMessageId); Ya = Kwe(Xa, Va) only.
  const parsedEntries = useMemo(
    () => parseOfficialTranscriptEntries(bucket.messages, activeStreamingMessageId),
    [activeStreamingMessageId, bucket.messages],
  );
  const isResponding =
    streamActivityMode !== idleStreamActivityMode
    || streamSnapshot !== null
    || streamingMessageId !== null
    || bucket.session?.isRunning === true;
  // Official Ya = Kwe(Xa, Va). Tool settle is eke/rke object-ref mutation — no settleOrphan invent.
  const entries = useMemo(
    () => mergeOfficialStreamSnapshot(parsedEntries, streamSnapshot),
    [parsedEntries, streamSnapshot],
  );
  const streamTokenEstimate = sessionId
    ? officialGetStreamTokenEstimate(sessionId) || estimateOfficialStreamSnapshotTokens(streamSnapshot)
    : estimateOfficialStreamSnapshotTokens(streamSnapshot);
  const pendingTurnStartedAt = sessionId
    ? (officialGetTurnStartedAt(sessionId) ?? bucket.pendingTurnStartedAt)
    : bucket.pendingTurnStartedAt;

  const stopLiveTurn = useCallback(async () => {
    // Official wt(): clear local Va/stream flags immediately so the stop button
    // and loader drop without waiting for CLI process exit / reload.
    clearStreamState(true);
  }, [clearStreamState]);

  return {
    beginLocalUserTurn,
    entries,
    error: bucket.error,
    isLoading,
    isResponding,
    isSessionNotFound: bucket.isSessionNotFound,
    messages: bucket.messages,
    pendingTurnStartedAt,
    reload,
    session: bucket.session,
    stopLiveTurn,
    streamTokenEstimate,
  };
}

async function loadEpitaxySession(sessionId: string): Promise<{ messages: ChatMessage[]; session: SessionSummary } | null> {
  const bridge = desktopBridge.LocalSessions;
  const session = await bridge.getSession(sessionId).catch(() => null);
  if (!session) return null;
  const transcript = await bridge.getTranscript?.(sessionId).catch(() => undefined);
  const sessionMessages = session.messages ?? [];
  const transcriptMessages = transcript?.length ? transcript : [];
  // Assistant identity = Anthropic message.id (one turn → one durable row).
  // Outer CLI uuid is per NDJSON event; using it as the only key duplicated the same turn.
  // User identity stays outer uuid/id (each user event is unique).
  const identityOf = (message: ChatMessage) => {
    const raw = asRecord(message.raw);
    const nested = asRecord(raw.message);
    if (message.role === "assistant" || stringValue(raw.type) === "assistant") {
      return stringValue(nested.id) ?? stringValue(raw.message_id) ?? stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
    }
    return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
  };
  const isStreamEvent = (message: ChatMessage) => stringValue(asRecord(message.raw).type) === "stream_event";
  const byId = new Map<string, ChatMessage>();
  const order: string[] = [];
  const put = (message: ChatMessage) => {
    if (isStreamEvent(message)) return;
    const key = identityOf(message);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, message);
      order.push(key);
      return;
    }
    if ((message.text?.length ?? 0) >= (existing.text?.length ?? 0)) {
      byId.set(key, message);
    }
  };
  // Preserve transcript order first, then append durable-only rows (optimistic user etc.).
  for (const message of transcriptMessages) put(message);
  for (const message of sessionMessages) put(message);
  const messages = order.map((key) => byId.get(key)!).filter(Boolean);
  return { messages, session: { ...session, messages } };
}

async function sendMessageToSession(sessionId: string, text: string, input?: SendMessageInput) {
  const bridge = desktopBridge.LocalSessions;
  if (bridge.sendMessage) {
    await bridge.sendMessage(sessionId, text, input);
    return;
  }
  await desktopBridge.LocalSessions.sendMessage?.(sessionId, text, input);
}

/** Optimistic user transcript row so send does not wait on getTranscript (official seedTranscript path). */
function makeOptimisticUserChatMessage(text: string): ChatMessage {
  const createdAt = new Date().toISOString();
  const id = `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    role: "user",
    text,
    createdAt,
    raw: {
      type: "user",
      uuid: id,
      timestamp: createdAt,
      message: {
        role: "user",
        content: [{ type: "text", text }],
      },
    },
  };
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
  // Do NOT reload transcript for tool_permission_* — that would thrash the stream/approval card.
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

async function bridgeGetSessionPending(sessionId: string): Promise<SessionSummary["pendingToolPermissions"]> {
  try {
    const session = await desktopBridge.LocalSessions.getSession(sessionId);
    return session?.pendingToolPermissions ?? [];
  } catch {
    return [];
  }
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
    const current = officialCodeSessionStore.getState().buckets[sessionId]?.session ?? null;
    const nextSession = normalizeSessionSummaryPatch(
      current,
      sessionPatch ?? { id: sessionId, title },
    );
    if (nextSession) officialCodeSessionStore.getState().patchSession(sessionId, nextSession);
    return nextSession;
  } catch {
    // Title refresh is best-effort.
    return null;
  }
}

function normalizeSessionSummaryPatch(current: SessionSummary | null, patch: unknown): SessionSummary | null {
  if (!patch || typeof patch !== "object") return current;
  const raw = asRecord(patch);
  const id = stringValue(raw.id) ?? stringValue(raw.sessionId) ?? current?.id;
  if (!id) return current;
  const title = stringValue(raw.title);
  const updatedAtMs = typeof raw.updatedAtMs === "number"
    ? raw.updatedAtMs
    : typeof raw.updatedAt === "string"
      ? Date.parse(raw.updatedAt) || current?.updatedAtMs
      : typeof raw.lastActivityAt === "string"
        ? Date.parse(raw.lastActivityAt) || current?.updatedAtMs
        : current?.updatedAtMs;
  // Keep approval queue on session_updated. Dropping pendingToolPermissions here made
  // isAwaitingReply / hydrate think there was nothing to approve after permission request.
  const pendingToolPermissions = Array.isArray(raw.pendingToolPermissions)
    ? (raw.pendingToolPermissions as NonNullable<SessionSummary["pendingToolPermissions"]>)
    : current?.pendingToolPermissions;
  const permissionMode = stringValue(raw.permissionMode) ?? current?.permissionMode;
  const model = stringValue(raw.model) ?? current?.model;
  if (!current) {
    return {
      id,
      kind: (stringValue(raw.kind) as SessionSummary["kind"]) ?? "code",
      title: title ?? "Coding session",
      updatedAtMs: updatedAtMs ?? Date.now(),
      isRunning: raw.isRunning === true,
      isArchived: raw.isArchived === true,
      isUnread: raw.isUnread === true,
      pendingToolPermissions,
      permissionMode,
      model,
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
    pendingToolPermissions,
    permissionMode,
    model,
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
  if (message.type === "stream_event") return null;
  // Official eke keeps result / system task events in the transcript stream so
  // turn_error + task_event items can render without waiting for full reload.
  if (message.type === "result") {
    if (message.is_error !== true && message.isError !== true) return null;
    return chatMessageFromRawTranscriptEvent(message);
  }
  if (message.type === "error") return null;
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

function isOfficialStreamMessageStart(streamMessage: Record<string, unknown>) {
  return stringValue(asRecord(streamMessage.event).type) === "message_start";
}

function officialStreamMessageId(streamMessage: Record<string, unknown>) {
  const event = asRecord(streamMessage.event);
  const message = asRecord(event.message);
  return stringValue(message.id) ?? stringValue(streamMessage.uuid) ?? null;
}

/** Activity mode from official inner stream event (`content_block_delta` etc.). */
function streamActivityModeFromInnerEvent(event: Record<string, unknown>, currentMode: StreamActivityMode): StreamActivityMode {
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

function inlinePermissionFromPending(item: NonNullable<SessionSummary["pendingToolPermissions"]>[number]): InlineToolPermissionRequest {
  return {
    alwaysAllowScope: item.alwaysAllowScope,
    decisionReason: item.decisionReason,
    description: item.description,
    hasAlwaysAllow: item.hasAlwaysAllow,
    input: asRecord(item.input),
    requestId: item.requestId,
    sessionId: item.sessionId,
    toolName: item.toolName,
    toolUseId: item.toolUseId,
  };
}

function mergeInlinePermissionRequests(
  current: InlineToolPermissionRequest[],
  incoming: InlineToolPermissionRequest[],
) {
  if (incoming.length === 0) return current;
  if (current.length === 0) return incoming;
  const byId = new Map(current.map((item) => [item.requestId, item]));
  for (const item of incoming) byId.set(item.requestId, item);
  // Preserve arrival order of existing requests, then append new ids.
  const ordered: InlineToolPermissionRequest[] = [];
  const seen = new Set<string>();
  for (const item of current) {
    const next = byId.get(item.requestId);
    if (next) {
      ordered.push(next);
      seen.add(item.requestId);
    }
  }
  for (const item of incoming) {
    if (!seen.has(item.requestId)) ordered.push(item);
  }
  return ordered;
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
