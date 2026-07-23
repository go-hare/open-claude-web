import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RouteViewProps } from "../../../app/routes";
import {
  ARTIFACTS_PREF_EVENT,
  readPreviewFeatureUsesArtifacts,
} from "../../settings/artifactsPreference";
import { CoworkPermissionApprovals } from "../composer/CoworkPermissionApprovals";
import { CoworkSessionComposer } from "../composer/CoworkSessionComposer";
import { CoworkActivityPanelHeaderToggle } from "./activity/CoworkActivityPanelShell";
import { parseCoworkBackgroundTasks } from "./activity/coworkBackgroundTasks";
import { parseCoworkConversationStatus } from "./activity/CoworkConversationStatus";
import { CoworkSessionActivityPanel } from "./activity/CoworkSessionActivityPanel";
import {
  CoworkChatResourceProvider,
  useCoworkCloseFileDrawer,
  useCoworkFileDrawerOpen,
  useCoworkOpenArtifact,
  useCoworkOpenFile,
  useCoworkSelectedItem,
  useCoworkStreamingFile,
} from "./chatResource/CoworkChatResourceProvider";
import { CoworkChatResourcePanel } from "./chatResource/CoworkChatResourcePanels";
import { coworkSessionsBridge } from "./coworkSessionBridge";
import { CoworkSessionController } from "./CoworkSessionController";
import { CoworkFileViewer } from "./CoworkFileViewer";
import { CoworkSessionFileDrawerLayout } from "./CoworkSessionFileDrawerLayout";
import { CoworkSessionHeader } from "./CoworkSessionHeader";
import { parseCoworkResourceActivity } from "./activity/coworkResourceActivity";
import { CoworkConversation, type CoworkScrollState } from "./transcript/CoworkConversation";
import type { CoworkAutoscrollHandle } from "./transcript/coworkAutoscroll";
import {
  scrollCoworkSessionOpenToBottom,
  shouldScrollCoworkSessionOpen,
} from "./transcript/coworkAutoscroll";
import type { CoworkChatMessage } from "./transcript/coworkMessageModel";
import { coworkMessagePathStore } from "./transcript/coworkMessagePathStore";
import { CoworkTranscriptActions } from "./transcript/CoworkTranscriptActions";
import { useCoworkSessionData } from "./useCoworkSessionData";
import { CoworkSessionStoreProvider, createCoworkSessionStore } from "./coworkSessionStore";

export function CoworkSessionView({ onNavigate, sessionId }: Pick<RouteViewProps, "onNavigate"> & { sessionId: string }) {
  const store = useMemo(() => createCoworkSessionStore(sessionId), [sessionId]);
  return (
    <CoworkSessionStoreProvider store={store}>
      <CoworkChatResourceProvider conversationUuid={sessionId}>
        <CoworkSessionController sessionId={sessionId} store={store} />
        <CoworkSessionRenderer onNavigate={onNavigate} sessionId={sessionId} />
      </CoworkChatResourceProvider>
    </CoworkSessionStoreProvider>
  );
}

function CoworkSessionRenderer({ onNavigate, sessionId }: Pick<RouteViewProps, "onNavigate"> & { sessionId: string }) {
  const data = useCoworkSessionData();
  const openFile = useCoworkOpenFile();
  const openArtifactHandler = useCoworkOpenArtifact();
  // Official showArtifacts: h?.preview_feature_uses_artifacts ?? !1 — gate onOpenArtifact.
  const showArtifacts = usePreviewFeatureUsesArtifacts();
  const openArtifact = showArtifacts ? openArtifactHandler : undefined;
  const closeFileDrawer = useCoworkCloseFileDrawer();
  const selectedItem = useCoworkSelectedItem();
  const selectedFile = selectedItem?.type === "file" ? selectedItem : null;
  const streamingFile = useCoworkStreamingFile(selectedFile?.path);
  // Official yUt: isDrawerOpen = Boolean(isDrawerExpanded && selectedItem).
  const isDrawerOpen = useCoworkFileDrawerOpen();
  const transcriptScrollRef = useRef<HTMLDivElement | null>(null);
  const autoscrollRef = useRef<CoworkAutoscrollHandle | null>(null);
  const composerRef = useRef<HTMLDivElement | null>(null);
  const [scrollState, setScrollState] = useState<CoworkScrollState>({ showBottomFade: false, showScrollButton: false });
  const tasks = useMemo(() => parseCoworkBackgroundTasks(data.messages), [data.messages]);
  // Official cFt resourceActivity for mcp/web_search/browser panels.
  const resourceActivity = useMemo(() => parseCoworkResourceActivity(data.messages), [data.messages]);
  // Official IYe handle: prefer imperative scrollToBottom; fallback to DOM scroll while mounting.
  const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
    const handle = autoscrollRef.current;
    if (handle) {
      handle.scrollToBottom(behavior);
      return;
    }
    transcriptScrollRef.current?.scrollTo({ behavior, top: transcriptScrollRef.current.scrollHeight });
  }, []);
  // Official t$t onClick: scrollToBottom("instant") + setPinToBottom(true) for session path.
  const scrollToBottomAndPin = useCallback(() => {
    const handle = autoscrollRef.current;
    if (handle) {
      handle.scrollToBottom("instant");
      handle.setPinToBottom(true);
      return;
    }
    scrollToBottom("auto");
  }, [scrollToBottom]);
  // Official t$t: while streaming on session and button not visible (near bottom), re-pin + instant scroll.
  // Do not force pin when user has scrolled up (showScrollButton).
  useEffect(() => {
    if (!data.isResponding || scrollState.showScrollButton) return;
    const handle = autoscrollRef.current;
    if (!handle) return;
    handle.setPinToBottom(true);
    handle.scrollToBottom("instant");
  }, [data.isResponding, scrollState.showScrollButton, sessionId]);
  // Official z3t (index-BELzQL5P.pretty.js function z3t):
  // if (isLoading) return; if (!hasMessages) return; if (d.current === sessionId) return;
  // d.current = sessionId; rAF → [data-autoscroll-container].scrollTop = scrollHeight.
  const sessionOpenScrolledRef = useRef<string | null>(null);
  const isLoading = data.isLoading;
  const hasMessages = (data.messages.length ?? 0) > 0 || data.messageUuids.length > 0;
  useLayoutEffect(() => {
    if (!shouldScrollCoworkSessionOpen({
      hasMessages,
      isLoading,
      lastScrolledSessionId: sessionOpenScrolledRef.current,
      sessionId,
    })) return;
    sessionOpenScrolledRef.current = sessionId;
    const frame = requestAnimationFrame(() => {
      const node = document.querySelector("[data-autoscroll-container]");
      if (node instanceof HTMLElement) scrollCoworkSessionOpenToBottom(node);
    });
    return () => cancelAnimationFrame(frame);
  }, [hasMessages, isLoading, sessionId]);
  useCoworkScrollShortcuts(sessionId, transcriptScrollRef, scrollToBottom);
  const actions = useMemo(
    () => ({
      bridge: coworkSessionsBridge,
      onNavigate,
      openArtifact,
      openFile,
      reload: data.reload,
      sessionId,
    }),
    [data.reload, onNavigate, openArtifact, openFile, sessionId],
  );
  const title = coworkSessionTitle(data.session?.title);
  // Official cFt: selectedItem type switch — file → Gzt, else activity detail panels.
  const drawer = (() => {
    if (!selectedItem) return null;
    if (selectedItem.type === "file") {
      const fileTarget = {
        path: selectedItem.path,
        toolType: selectedItem.toolType,
        messageId: selectedItem.messageId,
        fileUuid: selectedItem.fileUuid,
      };
      return (
        <CoworkFileViewer
          goBack={closeFileDrawer}
          onClose={closeFileDrawer}
          sessionId={sessionId}
          showBackButton={fileTarget.path.startsWith("/mnt/user-data/outputs/")}
          streamingFile={streamingFile}
          target={fileTarget}
        />
      );
    }
    return (
      <CoworkChatResourcePanel
        onClose={closeFileDrawer}
        resourceActivity={resourceActivity}
        selectedItem={selectedItem}
      />
    );
  })();
  return (
    <CoworkTranscriptActions.Provider value={actions}>
      <div className="relative flex h-full min-h-0 w-full">
        <CoworkSessionFileDrawerLayout
          drawer={drawer}
          isDrawerOpen={isDrawerOpen}
          main={
            <div className="relative flex h-full min-w-0 flex-1 flex-col">
              <CoworkSessionHeader
                isTitleLoading={data.isLoading && !data.session}
                rightAction={!data.isSessionNotFound ? <CoworkActivityPanelHeaderToggle sessionId={sessionId} /> : null}
                title={title}
              />
              <CoworkChatBody
                autoscrollRef={autoscrollRef}
                composerRef={composerRef}
                data={data}
                onNavigate={onNavigate}
                scrollState={scrollState}
                scrollToBottomAndPin={scrollToBottomAndPin}
                sessionId={sessionId}
                setScrollState={setScrollState}
                transcriptScrollRef={transcriptScrollRef}
              />
            </div>
          }
          rightSidebar={
            !data.isSessionNotFound ? (
              <CoworkSessionActivityPanel
                bridge={coworkSessionsBridge}
                fsDetectedFiles={data.fsDetectedFiles}
                messages={data.messages}
                onNavigate={onNavigate}
                onOpenFile={openFile}
                session={data.session}
                sessionId={sessionId}
                tasks={tasks}
              />
            ) : null
          }
        />
      </div>
    </CoworkTranscriptActions.Provider>
  );
}

function CoworkChatBody({ autoscrollRef, composerRef, data, onNavigate, scrollState, scrollToBottomAndPin, sessionId, setScrollState, transcriptScrollRef }: { autoscrollRef: React.MutableRefObject<CoworkAutoscrollHandle | null>; composerRef: React.RefObject<HTMLDivElement | null>; data: ReturnType<typeof useCoworkSessionData>; onNavigate: (path: string) => void; scrollState: CoworkScrollState; scrollToBottomAndPin: () => void; sessionId: string; setScrollState: (state: CoworkScrollState) => void; transcriptScrollRef: React.MutableRefObject<HTMLDivElement | null> }) {
  const permissionController = {
    bridge: coworkSessionsBridge,
    requests: data.toolPermissionRequests,
    setRequests: data.setPermissionRequests,
  };
  const onToolDecision = useCallback(async (requestId: string, _toolUseId: string, input: Record<string, unknown>, decision: "always" | "deny" | "once") => {
    const request = data.toolPermissionRequests.find((candidate) => candidate.requestId === requestId);
    data.setPermissionRequests((current) => current.filter((candidate) => candidate.requestId !== requestId));
    try {
      await coworkSessionsBridge.respondToToolPermission?.(requestId, decision, input);
    } catch (error) {
      if (request) data.setPermissionRequests((current) => current.some((candidate) => candidate.requestId === requestId) ? current : [...current, request]);
      throw error;
    }
  }, [data.setPermissionRequests, data.toolPermissionRequests]);
  const lastUserText = useMemo(() => lastVisibleUserText(data.messageUuids), [data.messageUuids]);
  const retryingRef = useRef(false);
  const onTryAgain = useCallback(async () => {
    if (!lastUserText || retryingRef.current) return;
    retryingRef.current = true;
    try {
      await data.submitMessage(lastUserText);
    } finally {
      retryingRef.current = false;
    }
  }, [data.submitMessage, lastUserText]);
  const conversationStatus = parseCoworkConversationStatus(
    data.messages,
    data.session,
    data.agentActivity,
    data.isResponding,
    data.initializationStatus,
    {
      // Official ns uses path message count `p.length` (display chains ≈ uuid path).
      messageCount: data.messageUuids.length || data.messages.length,
      retryCount: 0,
    },
  );
  if (data.isSessionNotFound) return <CoworkSessionMessage action={() => onNavigate("/task/new")} actionLabel="Back to Cowork" message="Session not found." />;
  if (data.isLoading && !data.messageUuids.length) return <CoworkLoading />;
  const composer = (
    <CoworkSessionComposer
      containerRef={composerRef}
      disabled={data.isLoading || Boolean(data.error)}
      isResponding={data.isResponding}
      onNavigate={onNavigate}
      onScrollToBottom={scrollToBottomAndPin}
      onSubmit={data.submitMessage}
      reload={data.reload}
      session={data.session}
      sessionId={sessionId}
      showScrollButton={scrollState.showScrollButton}
    />
  );
  return (
    <CoworkConversation
      activityStartedAt={conversationStatus.activityStartTime}
      autoscrollRef={autoscrollRef}
      composer={composer}
      composerRef={composerRef}
      error={data.error}
      errorCategory={data.errorCategory}
      isResponding={data.isResponding}
      messageUuids={data.messageUuids}
      onScrollState={setScrollState}
      onToolDecision={(requestId, toolUseId, input, decision) => void onToolDecision(requestId, toolUseId, input, decision)}
      onTryAgain={lastUserText ? onTryAgain : undefined}
      permissionApprovals={<CoworkPermissionApprovals controller={permissionController} />}
      permissionRequests={permissionController.requests}
      scrollRef={transcriptScrollRef}
      status={conversationStatus}
      streamingMessageId={data.streamingMessageId}
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

function lastVisibleUserText(messageUuids: string[]) {
  const messages = coworkMessagePathStore.getState().messageByUuid;
  for (let index = messageUuids.length - 1; index >= 0; index -= 1) {
    const message: CoworkChatMessage | undefined = messages[messageUuids[index]];
    if (message?.sender !== "human") continue;
    const text = message.content
      .filter((block) => block.type === "text" && typeof block.text === "string")
      .map((block) => block.text)
      .join("\n")
      .trim();
    if (text) return text;
  }
  return undefined;
}

/**
 * Official conversation residual: showArtifacts from account.settings
 * `preview_feature_uses_artifacts` (default false on message path `?? !1`,
 * but settings Visuals default ON `?? !0` — mirror syncs from settings bag).
 * Re-subscribes to local preference events so toggles apply without reload.
 */
function usePreviewFeatureUsesArtifacts(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined") return () => {};
      const handler = () => onStoreChange();
      window.addEventListener(ARTIFACTS_PREF_EVENT, handler);
      window.addEventListener("storage", handler);
      return () => {
        window.removeEventListener(ARTIFACTS_PREF_EVENT, handler);
        window.removeEventListener("storage", handler);
      };
    },
    () => readPreviewFeatureUsesArtifacts(),
    () => true,
  );
}
