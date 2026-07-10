import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { CoworkPermissionApprovals, useCoworkPermissionRequests } from "../composer/CoworkPermissionApprovals";
import { CoworkSessionComposer } from "../composer/CoworkSessionComposer";
import { CoworkActivityPanelHeaderToggle } from "./activity/CoworkActivityPanelShell";
import { parseCoworkBackgroundTasks } from "./activity/coworkBackgroundTasks";
import { parseCoworkConversationStatus } from "./activity/CoworkConversationStatus";
import { CoworkSessionActivityPanel } from "./activity/CoworkSessionActivityPanel";
import { coworkSessionsBridge, sendCoworkSessionMessage } from "./coworkSessionBridge";
import { CoworkFileViewer } from "./CoworkFileViewer";
import { CoworkSessionHeader } from "./CoworkSessionHeader";
import { CoworkConversation, type CoworkScrollState } from "./transcript/CoworkConversation";
import { CoworkTranscriptActions, type CoworkFileTarget } from "./transcript/CoworkTranscriptActions";
import { useCoworkSessionData } from "./useCoworkSessionData";

export function CoworkSessionView({ onNavigate, sessionId }: Pick<RouteViewProps, "onNavigate"> & { sessionId: string }) {
  const data = useCoworkSessionData(sessionId);
  const [fileTarget, setFileTarget] = useState<CoworkFileTarget | null>(null);
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<CoworkScrollState>({ showBottomFade: false, showScrollButton: false });
  const tasks = useMemo(() => parseCoworkBackgroundTasks(data.messages), [data.messages]);
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => transcriptScrollRef.current?.scrollTo({ behavior, top: transcriptScrollRef.current.scrollHeight }), []);
  useCoworkScrollShortcuts(sessionId, transcriptScrollRef, scrollToBottom);
  const actions = useMemo(() => ({ bridge: coworkSessionsBridge, onNavigate, openFile: setFileTarget, reload: data.reload, sessionId }), [data.reload, onNavigate, sessionId]);
  const title = coworkSessionTitle(data.session?.title);
  return (
    <CoworkTranscriptActions.Provider value={actions}>
      <div className="relative flex h-full">
        <div className="relative flex-1 min-w-0 flex flex-col">
          <CoworkSessionHeader
            isTitleLoading={data.isLoading && !data.session}
            rightAction={!data.isSessionNotFound ? <CoworkActivityPanelHeaderToggle sessionId={sessionId} /> : null}
            title={title}
          />
          <CoworkChatBody
            composerRef={composerRef}
            data={data}
            onNavigate={onNavigate}
            scrollState={scrollState}
            scrollToBottom={scrollToBottom}
            sessionId={sessionId}
            setScrollState={setScrollState}
            transcriptScrollRef={transcriptScrollRef}
          />
        </div>
        {fileTarget ? <CoworkFileViewer onClose={() => setFileTarget(null)} sessionId={sessionId} target={fileTarget} /> : null}
        {!data.isSessionNotFound ? <CoworkSessionActivityPanel bridge={coworkSessionsBridge} messages={data.messages} onNavigate={onNavigate} onOpenFile={setFileTarget} session={data.session} sessionId={sessionId} tasks={tasks} /> : null}
      </div>
    </CoworkTranscriptActions.Provider>
  );
}

function CoworkChatBody({ composerRef, data, onNavigate, scrollState, scrollToBottom, sessionId, setScrollState, transcriptScrollRef }: { composerRef: React.RefObject<HTMLDivElement | null>; data: ReturnType<typeof useCoworkSessionData>; onNavigate: (path: string) => void; scrollState: CoworkScrollState; scrollToBottom: (behavior?: ScrollBehavior) => void; sessionId: string; setScrollState: (state: CoworkScrollState) => void; transcriptScrollRef: React.MutableRefObject<HTMLDivElement | null> }) {
  const permissionController = useCoworkPermissionRequests(coworkSessionsBridge, sessionId);
  if (data.isSessionNotFound) return <CoworkSessionMessage action={() => onNavigate("/task/new")} actionLabel="Back to Cowork" message="Session not found." />;
  if (data.error && !data.chains.length) return <CoworkSessionMessage action={() => void data.reload()} actionLabel="Retry" message={data.error.message} />;
  if (data.isLoading && !data.chains.length) return <CoworkLoading />;
  const composer = (
    <CoworkSessionComposer
      containerRef={composerRef}
      disabled={data.isLoading || Boolean(data.error)}
      isResponding={data.isResponding}
      onNavigate={onNavigate}
      onScrollToBottom={() => scrollToBottom("smooth")}
      onSubmit={async (text, input) => {
        await sendCoworkSessionMessage(sessionId, text, input);
        await data.reload();
      }}
      reload={data.reload}
      session={data.session}
      sessionId={sessionId}
      showScrollButton={scrollState.showScrollButton}
    />
  );
  return (
    <CoworkConversation
      chains={data.chains}
      composer={composer}
      composerRef={composerRef}
      isResponding={data.isResponding}
      onScrollState={setScrollState}
      pendingTurnStartedAt={data.pendingTurnStartedAt}
      permissionApprovals={<CoworkPermissionApprovals controller={permissionController} />}
      permissionRequests={permissionController.requests}
      scrollRef={transcriptScrollRef}
      status={parseCoworkConversationStatus(data.messages, data.session)}
    />
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

function CoworkLoading() { return <div className="flex flex-1 items-center justify-center pt-14 text-text-400" role="status"><span className="size-5 animate-spin rounded-full border-2 border-t-transparent" /><span className="sr-only">Loading conversation</span></div>; }
function CoworkSessionMessage({ action, actionLabel, message }: { action: () => void; actionLabel: string; message: string }) { return <div className="flex flex-1 flex-col items-center justify-center gap-4 pt-14 text-sm text-text-300"><p>{message}</p><button className="rounded-md bg-bg-300 px-3 py-2 text-text-100" onClick={action} type="button">{actionLabel}</button></div>; }
function coworkSessionTitle(title?: string) { return !title?.trim() || title === "Untitled" || /^\d+$/.test(title) ? "新任务" : title; }
