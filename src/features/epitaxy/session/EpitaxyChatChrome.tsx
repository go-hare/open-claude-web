/**
 * Epitaxy chat header / view shortcuts / subagent pane — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useEffect, useMemo, useRef, type ReactNode } from "react";
// useRef used by useEpitaxyViewShortcuts (Esc Esc stamp) + OfficialSubagentPane.
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import {
  OfficialSessionHeader,
  OfficialSessionSource,
  type OfficialTranscriptMode,
  type OfficialViewPane,
} from "../OfficialEpitaxyComponents";
import { MarkdownContent } from "../OfficialCodeMarkdown";
import { canUseOfficialFilesBrowser } from "./OfficialFilesBrowserPane";
import { OfficialSparkSpinner } from "./OfficialWorkingStatus";
import type { EpitaxySessionRef, OfficialSubagentTarget } from "./epitaxyTranscriptActionContext";
import { matchOfficialSessionShortcut } from "./officialSessionShortcuts";
import { parseOfficialTasks } from "./officialTasksAndPlan";
import { parseOfficialSubagentTranscriptEntries } from "./officialTranscriptParse";
import { CodeAssistantEntryMessage, CodeUserEntryMessage } from "./OfficialTranscript";
import { isPlaceholderCodingTitle } from "./useEpitaxySessionData";

export function officialSessionHeaderTitle(session: SessionSummary | null, initialSessionId: string | undefined) {
  if (!initialSessionId) return "Claude Code";
  const title = session?.title?.trim();
  // Official local code empty/placeholder → "Coding session" (c11959232 header fallback).
  if (isPlaceholderCodingTitle(title) || (title && /^\d+$/.test(title) && (session?.kind === "code" || session?.kind === "epitaxy"))) {
    return "Coding session";
  }
  return title!;
}

export function EpitaxyChatHeader({ activeView, canOpenBrowser = false, canOpenFramebuffer = false, canOpenRuns = false, dragHandle, hasRunningTasks, hideViews = false, isTitleLoading, isTopLeft, onSessionRemoved, onTranscriptModeChange, onViewSelect, openViews, paneIndex, session, sessionRef, title, transcriptMode = "normal" }: {
  activeView?: OfficialViewPane;
  /** Official VC — Files (browser) Views item. */
  canOpenBrowser?: boolean;
  /** Official YR Screen (framebuffer) Views item. */
  canOpenFramebuffer?: boolean;
  /** Official ES — Runs Views item. */
  canOpenRuns?: boolean;
  dragHandle?: ReactNode;
  hasRunningTasks?: boolean;
  hideViews?: boolean;
  isTitleLoading: boolean;
  isTopLeft?: boolean;
  /**
   * Official eI Close pane residual (`onSessionRemoved:d`).
   * Truthy → show XCrossCloseMedium "Close pane".
   * Primary: only when extra panes exist. Secondary: pane close handler.
   */
  onSessionRemoved?: () => void;
  onTranscriptModeChange?: (mode: OfficialTranscriptMode) => void;
  onViewSelect?: (view: OfficialViewPane) => void;
  openViews?: readonly OfficialViewPane[];
  paneIndex: number;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  title: string;
  transcriptMode?: OfficialTranscriptMode;
}) {
  return (
    <OfficialSessionHeader
      activeView={activeView}
      canOpenBrowser={canOpenBrowser}
      canOpenFramebuffer={canOpenFramebuffer}
      canOpenRuns={canOpenRuns}
      openViews={openViews}
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

/**
 * Official session keydown residual (c11959232 `lk` switch):
 * togglePreview / toggleDiff / toggleBrowser / toggleTerminal → onTogglePane
 * cycleTranscriptMode → onCycleTranscriptMode
 * closePane → onClosePane (side tile closeLastPane residual)
 * toggleSideChat → only when onToggleSideChat provided (honest wall: product has none)
 *
 * Footer still owns openMode/Model/Effort menus; toggleSelectionMode stays on Preview pane.
 */
export type EpitaxySessionShortcutHandlers = {
  /**
   * Official VC() — when false, toggleBrowser is a no-op (same as Files menu hidden).
   * Default keeps prior sync probe for callers that omit the gate.
   */
  canOpenBrowser?: boolean;
  enabled?: boolean;
  onClosePane?: () => void;
  onCycleTranscriptMode?: () => void;
  /**
   * Official double-Esc (≤500ms) → openRewindPicker.
   * Plain Escape only; modifiers abort the latch.
   */
  onRewind?: () => void;
  /** Official onTogglePane(view) — toggle side tile for preview/diff/browser/terminal. */
  onTogglePane: (view: OfficialViewPane) => void;
  /**
   * Official onToggleSideChat — local-only Side chat. Omit to leave cmd+; as honest wall
   * (match but no dispatch), matching product without inventing Side chat.
   */
  onToggleSideChat?: () => void;
};

export function useEpitaxyViewShortcuts({
  canOpenBrowser = canUseOfficialFilesBrowser(),
  enabled = true,
  onClosePane,
  onCycleTranscriptMode,
  onRewind,
  onTogglePane,
  onToggleSideChat,
}: EpitaxySessionShortcutHandlers) {
  const escEscStampRef = useRef(0);
  useEffect(() => {
    if (!enabled) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      // Official: if (!t || e.repeat) return.
      if (!enabled || event.repeat) return;

      // Official Esc Esc rewind picker (before lk switch; plain Escape only).
      if (
        event.key === "Escape"
        && !event.metaKey
        && !event.ctrlKey
        && !event.shiftKey
        && !event.altKey
      ) {
        if (!onRewind) {
          escEscStampRef.current = 0;
        } else {
          const now = Date.now();
          if (now - escEscStampRef.current <= 500) {
            escEscStampRef.current = 0;
            event.preventDefault();
            onRewind();
            return;
          }
          escEscStampRef.current = now;
          // First Esc: do not preventDefault — composer stop / blur / side-pane Esc still run.
        }
      }

      if (event.defaultPrevented) return;
      const command = matchOfficialSessionShortcut(event);
      if (!command) return;
      switch (command) {
        case "toggleTerminal":
          event.preventDefault();
          onTogglePane("terminal");
          return;
        case "cycleTranscriptMode":
          if (!onCycleTranscriptMode) return;
          event.preventDefault();
          onCycleTranscriptMode();
          return;
        case "closePane":
          if (!onClosePane) return;
          event.preventDefault();
          onClosePane();
          return;
        case "toggleSideChat":
          // Honest wall: no product Side chat unless caller wires onToggleSideChat.
          if (!onToggleSideChat) return;
          event.preventDefault();
          onToggleSideChat();
          return;
        case "togglePreview":
          event.preventDefault();
          onTogglePane("preview");
          return;
        case "toggleDiff":
          event.preventDefault();
          onTogglePane("diff");
          return;
        case "toggleBrowser":
          if (!canOpenBrowser) return;
          event.preventDefault();
          onTogglePane("browser");
          return;
        default:
          // openMode/Model/Effort + toggleSelectionMode handled elsewhere (footer / preview).
          return;
      }
    };
    // Official tc("keydown", i) — bubble phase session-level listener.
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    canOpenBrowser,
    enabled,
    onClosePane,
    onCycleTranscriptMode,
    onRewind,
    onTogglePane,
    onToggleSideChat,
  ]);
}

/**
 * Official tile layout (ca0135bc5 `ur` / `Xs` / c119 `YI` / `nE`):
 * - open side pane beside chat: `[["chat", 2], sideTile]` → flexGrow chat=2, side=1
 * - tile wrap: flexGrow / flexShrink:1 / flexBasis:0, minSize = minTilePx:100
 * - no 42% / 760 invent-width; width comes from flex until user resizes
 */

export function OfficialSubagentPane({
  messages,
  onRefreshTranscript,
  subagentView,
}: {
  messages: ChatMessage[];
  /** While open + running, host silently re-reads CLI agent jsonl into the bucket. */
  onRefreshTranscript?: () => void;
  subagentView: OfficialSubagentTarget;
}) {
  // Official CR: dr(oe(sessionId), toolUseId) + Jp(sessionId) task lookup on same list.
  // task-id in notifications is often the CLI agentId; tool-use-id is the Agent tool id.
  const task = useMemo(
    () => parseOfficialTasks(messages).find(
      (item) => item.toolUseId === subagentView.toolUseId || item.taskId === subagentView.toolUseId,
    ),
    [messages, subagentView.toolUseId],
  );
  const entries = useMemo(
    () => parseOfficialSubagentTranscriptEntries(messages, subagentView.toolUseId, task?.taskId),
    [messages, subagentView.toolUseId, task?.taskId],
  );
  // Official Host: running only when Jp task row is running. New CLI dual-emits
  // task_started (+ async_launched residual still creates a running row via agentId).
  // Missing task must not invent eternal spinner/poll (was residual for pre-bookend CLI).
  const isRunning = task?.status === "running";

  // Live agent rows live on disk under {session}/subagents/; CLI stdout does not stream them
  // with parent_tool_use_id. Poll getTranscript only while the task is running so the UI
  // fills without a manual full-session refresh. Always refresh once on open.
  //
  // IMPORTANT: do NOT put `onRefreshTranscript` in the effect deps. Tile used to pass an
  // inline `() => void reload({ silent: true })` — every poll/reload re-rendered the tile,
  // created a new callback, re-ran this effect, called reload again → React #185
  // (Maximum update depth exceeded) and white-screen chat panel.
  const refreshRef = useRef(onRefreshTranscript);
  refreshRef.current = onRefreshTranscript;
  useEffect(() => {
    const refresh = () => {
      refreshRef.current?.();
    };
    refresh();
    if (!isRunning) return;
    const timer = window.setInterval(refresh, 900);
    return () => window.clearInterval(timer);
  }, [subagentView.toolUseId, isRunning]);

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


