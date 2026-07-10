import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { CoworkSessionComposer } from "../composer/CoworkSessionComposer";
import { CoworkActivityPanelHeaderToggle } from "./activity/CoworkActivityPanelShell";
import { parseCoworkBackgroundTasks } from "./activity/coworkBackgroundTasks";
import { parseCoworkConversationStatus } from "./activity/CoworkConversationStatus";
import { CoworkSessionActivityPanel } from "./activity/CoworkSessionActivityPanel";
import { coworkSessionsBridge, sendCoworkSessionMessage } from "./coworkSessionBridge";
import { CoworkFileViewer } from "./CoworkFileViewer";
import { CoworkSessionHeader } from "./CoworkSessionHeader";
import { CoworkSessionLayout } from "./CoworkSessionLayout";
import { CoworkConversation, type CoworkScrollState } from "./transcript/CoworkConversation";
import { CoworkTranscriptActions, type CoworkFileTarget } from "./transcript/CoworkTranscriptActions";
import { useCoworkSessionData } from "./useCoworkSessionData";

export function CoworkSessionView({ onNavigate, sessionId }: Pick<RouteViewProps, "onNavigate"> & { sessionId: string }) {
  const data = useCoworkSessionData(sessionId);
  const [fileTarget, setFileTarget] = useState<CoworkFileTarget | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<CoworkScrollState>({ showBottomFade: false, showScrollButton: false });
  const tasks = useMemo(() => parseCoworkBackgroundTasks(data.messages), [data.messages]);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => transcriptScrollRef.current?.scrollTo({ behavior, top: transcriptScrollRef.current.scrollHeight }), []);
  useCoworkScrollShortcuts(sessionId, transcriptScrollRef, scrollToBottom);
  const actions = useMemo(() => ({ bridge: coworkSessionsBridge, onNavigate, openFile: setFileTarget, reload: data.reload, sessionId }), [data.reload, onNavigate, sessionId]);
  const title = coworkSessionTitle(data.session?.title);
  return (
    <div className="epitaxy-root select-none h-full w-full flex flex-col"><div className="flex-1 min-h-0"><CoworkSessionLayout><CoworkTranscriptActions.Provider value={actions}><div className="relative h-full min-w-0 flex">
      <div className="relative h-full min-w-0 flex flex-col flex-1"><CoworkSessionHeader isTitleLoading={data.isLoading && !data.session} rightAction={!data.isSessionNotFound ? <CoworkActivityPanelHeaderToggle sessionId={sessionId} /> : null} title={title} /><CoworkChatBody data={data} onNavigate={onNavigate} scrollState={scrollState} scrollToBottom={scrollToBottom} sessionId={sessionId} setScrollState={setScrollState} transcriptScrollRef={transcriptScrollRef} /></div>
      {fileTarget ? <CoworkFileViewer onClose={() => setFileTarget(null)} sessionId={sessionId} target={fileTarget} /> : null}
      {!data.isSessionNotFound ? <CoworkSessionActivityPanel bridge={coworkSessionsBridge} messages={data.messages} onNavigate={onNavigate} onOpenFile={setFileTarget} session={data.session} sessionId={sessionId} tasks={tasks} /> : null}
    </div></CoworkTranscriptActions.Provider></CoworkSessionLayout></div></div>
  );
}

function CoworkChatBody({ data, onNavigate, scrollState, scrollToBottom, sessionId, setScrollState, transcriptScrollRef }: { data: ReturnType<typeof useCoworkSessionData>; onNavigate: (path: string) => void; scrollState: CoworkScrollState; scrollToBottom: (behavior?: ScrollBehavior) => void; sessionId: string; setScrollState: (state: CoworkScrollState) => void; transcriptScrollRef: React.MutableRefObject<HTMLDivElement | null> }) {
  if (data.isSessionNotFound) return <CoworkSessionMessage action={() => onNavigate("/task/new")} actionLabel="Back to Cowork" message="Session not found." />;
  if (data.error && !data.entries.length) return <CoworkSessionMessage action={() => void data.reload()} actionLabel="Retry" message={data.error.message} />;
  return (
    <div className="contents"><div className="flex-1 min-h-0 relative isolate [--epitaxy-scrim-inset-end:16px]"><div aria-hidden="true" className="epitaxy-top-scrim" /><div aria-hidden="true" className="epitaxy-bottom-scrim" style={{ opacity: scrollState.showBottomFade ? 1 : 0 }} />{data.isLoading && !data.entries.length ? <CoworkLoading /> : !data.entries.length && !data.isResponding ? <div className="h-full flex items-center justify-center text-body text-t5">No messages yet.</div> : <CoworkConversation entries={data.entries} isResponding={data.isResponding} onScrollState={setScrollState} pendingTurnStartedAt={data.pendingTurnStartedAt} scrollRef={transcriptScrollRef} status={parseCoworkConversationStatus(data.messages, data.session)} />}</div><CoworkSessionComposer disabled={data.isLoading || Boolean(data.error)} isResponding={data.isResponding} onNavigate={onNavigate} onScrollToBottom={() => scrollToBottom("smooth")} onSubmit={async (text, input) => { await sendCoworkSessionMessage(sessionId, text, input); await data.reload(); }} reload={data.reload} session={data.session} sessionId={sessionId} showScrollButton={scrollState.showScrollButton} /></div>
  );
}

function useCoworkScrollShortcuts(sessionId: string, scrollRef: React.MutableRefObject<HTMLDivElement | null>, scrollToBottom: () => void) {
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (!sessionId || event.key !== "ArrowDown" && event.key !== "ArrowUp" || !event.metaKey && !event.ctrlKey || event.shiftKey || event.altKey) return;
      if (event.target instanceof HTMLElement && (event.target.isContentEditable || ["INPUT", "TEXTAREA"].includes(event.target.tagName))) return;
      if (!scrollRef.current) return;
      event.preventDefault();
      event.key === "ArrowDown" ? scrollToBottom() : scrollRef.current.scrollTo({ top: 0 });
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [scrollRef, scrollToBottom, sessionId]);
}

function CoworkLoading() { return <div className="h-full flex items-center justify-center text-t5" role="status"><span className="size-5 animate-spin rounded-full border-2 border-t-transparent" /><span className="sr-only">Loading conversation</span></div>; }
function CoworkSessionMessage({ action, actionLabel, message }: { action: () => void; actionLabel: string; message: string }) { return <div className="flex h-full flex-col items-center justify-center gap-4 text-body text-t6"><p>{message}</p><button className="rounded-r5 bg-fill-contained-default px-p6 py-p3 text-t8" onClick={action} type="button">{actionLabel}</button></div>; }
function coworkSessionTitle(title?: string) { return !title?.trim() || title === "Untitled" || /^\d+$/.test(title) ? "新任务" : title; }
