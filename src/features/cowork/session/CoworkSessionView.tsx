import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { RouteViewProps } from "../../../app/routes";
import {
  ARTIFACTS_PREF_EVENT,
  readPreviewFeatureUsesArtifacts,
} from "../../settings/artifactsPreference";
import { CoworkPermissionApprovals } from "../composer/CoworkPermissionApprovals";
import { CoworkSessionComposer } from "../composer/CoworkSessionComposer";
import { resolveCoworkComposerToolStates } from "../composer/coworkModelContextStore";
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
import { resolveCoworkConversationIsStreaming } from "./transcript/coworkConversationStreaming";
import type { CoworkChatMessage } from "./transcript/coworkMessageModel";
import { coworkMessagePathStore } from "./transcript/coworkMessagePathStore";
import { CoworkTranscriptActions } from "./transcript/CoworkTranscriptActions";
import { useCoworkSessionData } from "./useCoworkSessionData";
import { CoworkSessionStoreProvider, createCoworkSessionStore } from "./coworkSessionStore";
import { OfficialPierreWorkerPool } from "../../epitaxy/diff/OfficialPierreWorkerPool";

export function CoworkSessionView({ onNavigate, sessionId }: Pick<RouteViewProps, "onNavigate"> & { sessionId: string }) {
  const store = useMemo(() => createCoworkSessionStore(sessionId), [sessionId]);
  return (
    <OfficialPierreWorkerPool>
      <CoworkSessionStoreProvider store={store}>
        <CoworkChatResourceProvider conversationUuid={sessionId}>
          <CoworkSessionController sessionId={sessionId} store={store} />
          <CoworkSessionRenderer onNavigate={onNavigate} sessionId={sessionId} />
        </CoworkChatResourceProvider>
      </CoworkSessionStoreProvider>
    </OfficialPierreWorkerPool>
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
  // Official t$t (index-BELzQL5P ~226504): isSession path.
  //   if streaming: isSession && !showScrollButton → setPinToBottom(true) + scrollToBottom("instant")
  //   else: !isSession → setPinToBottom(false)  (session path never unpins on stream end)
  // Cowork session is always isSession=true. showScrollButton is sentinel-only (official `l`).
  // Streaming flag must match v$t `l` (streamingMessageId || isResponding), not isResponding alone.
  const conversationIsStreaming = resolveCoworkConversationIsStreaming({
    isResponding: data.isResponding,
    streamingMessageId: data.streamingMessageId,
  });
  useEffect(() => {
    if (!conversationIsStreaming) return;
    if (scrollState.showScrollButton) return;
    const handle = autoscrollRef.current;
    if (!handle) return;
    handle.setPinToBottom(true);
    handle.scrollToBottom("instant");
  }, [conversationIsStreaming, scrollState.showScrollButton, sessionId]);
  // Official z3t (index-BELzQL5P.pretty.js function z3t):
  // if (isLoading) return; if (!hasMessages) return; if (d.current === sessionId) return;
  // d.current = sessionId; single rAF → [data-autoscroll-container].scrollTop = scrollHeight.
  // Product: only commit d.current after the container exists (Conversation mounted). Marking
  // early while still on the loading shell permanently skips open-at-bottom for short sessions.
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
    // Official z3t commits d.current = sessionId before rAF. Product only commits after the
    // IYe container exists so the loading shell cannot permanently skip open-at-bottom.
    const frame = requestAnimationFrame(() => {
      const node = document.querySelector("[data-autoscroll-container]");
      if (!(node instanceof HTMLElement)) return;
      // Measure-era residual: LUt may still grow after this frame; pin first so IYe RO resticks.
      const handle = autoscrollRef.current;
      handle?.setPinToBottom(true);
      scrollCoworkSessionOpenToBottom(node);
      handle?.scrollToBottom("instant");
      sessionOpenScrolledRef.current = sessionId;
    });
    return () => {
      cancelAnimationFrame(frame);
    };
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
  const onSessionPatched = useCallback(
    (_patch: Partial<NonNullable<typeof data.session>>) => {
      // Header optimistically patches; re-fetch so sidebar/store catch up.
      void data.reload();
    },
    [data],
  );
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
            // Official yUt main column children: gUt header + IYe. min-h-0 keeps flex-1
            // overflow-y-auto (IYe) bounded so pin-to-bottom can actually scroll.
            <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
              <CoworkSessionHeader
                isTitleLoading={data.isLoading && !data.session}
                onNavigate={onNavigate}
                onSessionPatched={onSessionPatched}
                rightAction={!data.isSessionNotFound ? <CoworkActivityPanelHeaderToggle sessionId={sessionId} /> : null}
                session={data.session}
                sessionId={sessionId}
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
  // Official v$t `l` — same boolean as Renderer pin + Conversation Et/g$t/t$t.
  const conversationIsStreaming = resolveCoworkConversationIsStreaming({
    isResponding: data.isResponding,
    streamingMessageId: data.streamingMessageId,
  });
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
  // Official Re: Ae=V7 then Kte.getModelContextStates(conversationUuid) on try-again.
  const onTryAgain = useCallback(async () => {
    if (!lastUserText || retryingRef.current) return;
    retryingRef.current = true;
    try {
      const toolStates = resolveCoworkComposerToolStates(sessionId);
      await data.submitMessage(
        lastUserText,
        toolStates ? { toolStates } : undefined,
      );
    } finally {
      retryingRef.current = false;
    }
  }, [data.submitMessage, lastUserText, sessionId]);
  // Official kAt onRetryNow — product has no ensureConnected/retryNow bridge method;
  // reload rehydrates session + connectionState from host (showRetryButton residual path).
  const onRetryConnection = useCallback(() => {
    void data.reload();
  }, [data.reload]);
  const conversationStatus = parseCoworkConversationStatus(
    data.messages,
    data.session,
    data.agentActivity,
    conversationIsStreaming,
    data.initializationStatus,
    {
      // Live reducer state for kAt; session snapshot may lag host reconnect fields.
      connectionState: data.connectionState,
      // Official ns uses path message count `p.length` (display chains ≈ uuid path).
      messageCount: data.messageUuids.length || data.messages.length,
      retryCount: 0,
    },
  );
  // Official bw residual eePQiZiD6b — Conversation not found. (not product "Session not found.")
  if (data.isSessionNotFound) {
    return (
      <CoworkSessionMessage
        action={() => onNavigate("/task/new")}
        actionLabel="Start a new task"
        message="Conversation not found."
      />
    );
  }
  if (data.isLoading && !data.messageUuids.length) return <CoworkLoading />;
  const composer = (
    <CoworkSessionComposer
      connectionState={conversationStatus.connectionState}
      containerRef={composerRef}
      disabled={data.isLoading || Boolean(data.error)}
      isResponding={data.isResponding}
      isStreaming={conversationIsStreaming}
      nextReconnectTime={conversationStatus.nextReconnectTime}
      onNavigate={onNavigate}
      onRetryConnection={onRetryConnection}
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
      sessionId={sessionId}
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

function CoworkLoading() {
  return (
    <div className="flex flex-1 items-center justify-center pt-14 text-text-400" role="status">
      <span className="size-5 animate-spin rounded-full border-2 border-t-transparent" />
      <span className="sr-only">Loading conversation</span>
    </div>
  );
}

/**
 * Cowork missing-session residual (index-BELzQL5P bw / eePQiZiD6b).
 * Structure mirrors Code SessionNotFound residual: centered gap + primary CTA to home.
 */
function CoworkSessionMessage({
  action,
  actionLabel,
  message,
}: {
  action: () => void;
  actionLabel: string;
  message: string;
}) {
  return (
    <div
      className="flex flex-1 flex-col items-center justify-center gap-g5 pt-14 text-t6"
      data-official-source="index-BELzQL5P.js:bw-eePQiZiD6b"
    >
      <p className="text-sm text-text-300 m-0">{message}</p>
      <button
        className="rounded-md bg-bg-300 px-3 py-2 text-sm text-text-100 border-0 cursor-pointer"
        onClick={action}
        type="button"
      >
        {actionLabel}
      </button>
    </div>
  );
}

/**
 * Official header empty residual (3kbIhS7KZS): Untitled.
 * Numeric-only titles are still placeholders → Untitled (not product 新任务 invent).
 */
function coworkSessionTitle(title?: string) {
  if (!title?.trim() || title === "Untitled" || /^\d+$/.test(title)) return "Untitled";
  return title;
}

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
