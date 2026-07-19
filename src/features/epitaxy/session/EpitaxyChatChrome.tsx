/**
 * Epitaxy chat header / view shortcuts / subagent pane — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { useEffect, useMemo, type ReactNode } from "react";
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

export function EpitaxyChatHeader({ activeView, canOpenBrowser = false, canOpenFramebuffer = false, canOpenRuns = false, dragHandle, hasRunningTasks, hideViews = false, isTitleLoading, isTopLeft, onClose, onSessionRemoved, onTranscriptModeChange, onViewSelect, openViews, paneIndex, session, sessionRef, title, transcriptMode = "normal" }: {
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
  onClose?: () => void;
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

export function useEpitaxyViewShortcuts(onSelect: (view: OfficialViewPane) => void, enabled = true) {
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
      // Official toggleBrowser ⇧⌘F — only when VC() Files is available.
      if (event.metaKey && event.shiftKey && event.code === "KeyF") {
        if (!canUseOfficialFilesBrowser()) return;
        event.preventDefault();
        onSelect("browser");
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

export function OfficialSubagentPane({ messages, subagentView }: { messages: ChatMessage[]; subagentView: OfficialSubagentTarget }) {
  // Official CR: dr(oe(sessionId), toolUseId) + Jp(sessionId) task lookup on same list.
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


