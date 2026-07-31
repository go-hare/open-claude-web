import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode, type RefObject } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { CoworkConversationStatusState } from "../activity/CoworkConversationStatus";
import { CoworkConversationStatus } from "../activity/CoworkConversationStatus";
import type { CoworkPermissionRequest } from "../coworkPermissionTypes";
import { CoworkMessageCell } from "./CoworkMessageCell";
import { CoworkMessageContextProvider } from "./CoworkMessageContext";
import { CoworkConversationBottomSpacer } from "./CoworkConversationBottomSpacer";
import { CoworkAskUserQuestionProvider } from "../../composer/CoworkAskUserQuestionContext";
import { CoworkTimelineStatusVisibilityProvider } from "./CoworkTimelineStatusVisibility";
import type { CoworkAutoscrollHandle, CoworkPinToBottomConfig } from "./coworkAutoscroll";
import { isCoworkNearBottom, resolveCoworkShowScrollButton } from "./coworkAutoscroll";
import { resolveCoworkPathAvatarState } from "./CoworkClaudeAvatar";
import { CoworkConversationAvatarProvider } from "./CoworkConversationAvatarContext";
import { resolveCoworkConversationIsStreaming } from "./coworkConversationStreaming";
import { buildOfficialCoworkMessageChains, type CoworkChatMessage, type CoworkMessageChain } from "./coworkMessageModel";
import { coworkMessagePathStore } from "./coworkMessagePathStore";
import { useCoworkAutoscroll } from "./useCoworkAutoscroll";

export type CoworkScrollState = { showBottomFade: boolean; showScrollButton: boolean };

export function CoworkConversation({
  activityStartedAt,
  autoscrollRef,
  composer,
  composerRef,
  error,
  errorCategory,
  isResponding,
  messageUuids,
  onScrollState,
  onToolDecision,
  onTryAgain,
  permissionApprovals,
  permissionRequests,
  pinToBottomConfig,
  scrollRef,
  sessionId,
  status,
  streamingMessageId,
}: {
  activityStartedAt?: number | null;
  /** Official IYe imperative handle surface (getScrollContainer / scrollToBottom / setPinToBottom). */
  autoscrollRef?: MutableRefObject<CoworkAutoscrollHandle | null>;
  composer: ReactNode;
  composerRef: RefObject<HTMLDivElement | null>;
  error?: Error | null;
  errorCategory?: string | null;
  isResponding: boolean;
  messageUuids: string[];
  onScrollState: (state: CoworkScrollState) => void;
  onToolDecision?: (requestId: string, toolUseId: string, input: Record<string, unknown>, decision: "always" | "deny" | "once") => void;
  onTryAgain?: () => Promise<void> | void;
  permissionApprovals?: ReactNode;
  permissionRequests: CoworkPermissionRequest[];
  /** Official IYe pinToBottomConfig; default { disabled:false, initialValue:false }. */
  pinToBottomConfig?: CoworkPinToBottomConfig;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  sessionId?: string | null;
  status: CoworkConversationStatusState | null;
  streamingMessageId: string | null;
}) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const spacerAutoscrollRef = useRef<CoworkAutoscrollHandle | null>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement | null>(null);
  const lastHumanMessageRef = useRef<HTMLDivElement | null>(null);
  const extrasRef = useRef<HTMLDivElement | null>(null);
  const lastMessageSentinelRef = useRef<HTMLDivElement | null>(null);
  // Official path is reactive (Zle). Product must re-render Conversation when path-store
  // rows hydrate — not only when messageUuids length changes. Otherwise isLastHuman /
  // Cat refs and LUt RO bind against empty shells while MessageCell paints live content.
  const pathMessages = useStore(
    coworkMessagePathStore,
    useShallow((state) => messageUuids
      .map((messageUuid) => state.messageByUuid[messageUuid])
      .filter((message): message is CoworkChatMessage => message !== undefined)),
  );
  const chains = useMemo(
    () => buildOfficialCoworkMessageChains(pathMessages, streamingMessageId),
    [pathMessages, streamingMessageId],
  );
  // Official paint ownership is streamingMessageId / Va (eke suppress + progressive), not
  // Qke isResponding. end_turn flips endTurnSeen → isResponding false while Pke/zE is still
  // revealing — progressive must stay on until streamingMessageId clears on settle.
  // Official v$t `l` is ONE streaming flag for Et + g$t layout + t$t Ace — not isResponding-only.
  const conversationIsStreaming = resolveCoworkConversationIsStreaming({
    isResponding,
    streamingMessageId,
  });
  const messagePositions = useMemo(() => buildMessagePositions(chains), [chains]);
  // Official v$t Et from path last message (wt/kt) — shared by g$t Ace + t$t scroll Ace.
  const avatarState = useMemo(
    () => resolveCoworkPathAvatarState({
      isSession: true,
      isStreaming: conversationIsStreaming,
      pathMessages,
    }),
    [conversationIsStreaming, pathMessages],
  );
  // LUt RO residual deps [e, m, s]: s = path length. Product also rebinds when the painted
  // last chain / stream id changes so lastAssistant attaches after uuid list already settled
  // (live Thinking/tool: A was frozen at 0 → spacer ~357 mid-viewport).
  const lutObserveEpoch = `${chains.at(-1)?.lastMessageUuid ?? chains.at(-1)?.firstMessageUuid ?? ""}:${streamingMessageId ?? ""}:${pathMessages.length}`;
  const messageContext = useMemo(() => ({ onRetry: onTryAgain, onToolDecision, toolPermissionRequests: permissionRequests }), [onToolDecision, onTryAgain, permissionRequests]);
  // Official IYe pin controller. Conversation shell omits pinToBottomConfig (initial false);
  // session path re-pins via t$t scroll-to-bottom / streaming session effects.
  const autoscroll = useCoworkAutoscroll(localScrollRef, innerRef, pinToBottomConfig);
  // Official IYe useImperativeHandle assigns Me/autoscrollRef BEFORE child LUt
  // useLayoutEffects. Product must mirror that timing: write refs during render so
  // LUt's third layout effect can call scrollToBottom("instant") in the same commit
  // after spacer measure — not one rAF later with a still-null handle (short sessions
  // then open at scrollTop=0 while LUt band grows → stuck at top).
  scrollRef.current = localScrollRef.current;
  spacerAutoscrollRef.current = autoscroll;
  if (autoscrollRef) autoscrollRef.current = autoscroll;
  useLayoutEffect(() => {
    scrollRef.current = localScrollRef.current;
    spacerAutoscrollRef.current = autoscroll;
    if (autoscrollRef) autoscrollRef.current = autoscroll;
    return () => {
      scrollRef.current = null;
      spacerAutoscrollRef.current = null;
      if (autoscrollRef) autoscrollRef.current = null;
    };
  }, [autoscroll, autoscrollRef, scrollRef]);
  useConversationScrollState(localScrollRef, innerRef, lastMessageSentinelRef, onScrollState);
  // Official yUt is owned by CoworkSessionFileDrawerLayout. Conversation is only the
  // IYe autoscroll body under gUt (header is an absolute sibling in SessionView).
  // Nesting another yUt here (md:-mt / md:h calc / flex:100 0) broke the height chain:
  // the scroll node grew with content, parent overflow-hidden clipped the top, and
  // stream growth never entered the viewport — "output always at top".
  // Official t$t avatarState={Et} + isStreaming={l}. Product SessionView builds composer
  // outside Conversation — Provider residual replaces cloneElement prop inject.
  return (
    <CoworkAskUserQuestionProvider>
      <CoworkConversationAvatarProvider avatarState={avatarState} isStreaming={conversationIsStreaming}>
        <div
          className="overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] pt-14 flex-1 min-h-0"
          data-autoscroll-container
          data-official-source="index-BELzQL5P.js:IYe"
          ref={localScrollRef}
        >
          <div className="relative w-full min-h-full flex flex-col" ref={innerRef}>
            <div className="mx-auto flex w-full flex-1 flex-col max-w-3xl md:px-2">
              <CoworkResponseStatusAnnouncer isStreaming={conversationIsStreaming} />
              <div className="flex-1 flex flex-col px-4 max-w-3xl mx-auto w-full pt-1">
                <CoworkTimelineStatusVisibilityProvider>
                  <CoworkMessageContextProvider value={messageContext}>
                    {chains.map((chain, index) => (
                      <CoworkMessageCell
                        chain={chain}
                        conversationIsStreaming={conversationIsStreaming}
                        isLastHumanMessage={messagePositions[index]?.isLastHumanMessage ?? false}
                        isLastMessage={messagePositions[index]?.isLastMessage ?? false}
                        key={chain.firstMessageUuid}
                        lastAssistantMessageRef={lastAssistantMessageRef}
                        lastHumanMessageRef={lastHumanMessageRef}
                      />
                    ))}
                  </CoworkMessageContextProvider>
                  {permissionApprovals}
                  <div aria-hidden="true" className="h-px w-full pointer-events-none" ref={lastMessageSentinelRef} />
                  <CoworkConversationStatus
                    avatarState={avatarState}
                    error={error}
                    errorCategory={errorCategory}
                    isWorking={conversationIsStreaming}
                    onTryAgain={onTryAgain}
                    ref={extrasRef}
                    sessionId={sessionId}
                    startedAt={activityStartedAt}
                    status={status}
                  />
                  <div className="h-12" />
                  {/*
                    LUt residuals (honest dframe, not invent):
                    - parentContainerRef=IYe: official LUt supports it; v$t omits → window.
                      dframe column is shorter than window — must measure scrollport.
                    - hasDesktopTopBar=false when measuring IYe (Qg already outside scrollport).
                    - observeEpoch: path hydrate / stream id without messageCount change.
                  */}
                  <CoworkConversationBottomSpacer
                    autoScrollRef={spacerAutoscrollRef}
                    composerRef={composerRef}
                    extrasRef={extrasRef}
                    hasDesktopTopBar={false}
                    lastAssistantMessageRef={lastAssistantMessageRef}
                    lastHumanMessageRef={lastHumanMessageRef}
                    messageCount={messageUuids.length}
                    observeEpoch={lutObserveEpoch}
                    parentContainerRef={localScrollRef}
                    scrollRef={localScrollRef}
                  />
                </CoworkTimelineStatusVisibilityProvider>
              </div>
              {composer}
            </div>
          </div>
        </div>
      </CoworkConversationAvatarProvider>
    </CoworkAskUserQuestionProvider>
  );
}

function CoworkResponseStatusAnnouncer({ isStreaming }: { isStreaming: boolean }) {
  const statusRef = useRef<HTMLDivElement | null>(null);
  const respondedRef = useRef(false);
  useEffect(() => {
    if (!statusRef.current) return;
    if (isStreaming) {
      respondedRef.current = true;
      statusRef.current.textContent = "Claude is responding";
    } else if (respondedRef.current) {
      statusRef.current.textContent = "Claude finished the response";
    }
  }, [isStreaming]);
  return <div className="sr-only" ref={statusRef} role="status" />;
}

/**
 * Official conversation residual (index-BELzQL5P ~8222478):
 * isLastMsg = n === length-1
 * isLastHuman = lastMessage.sender === "human" && (secondToLast || last)
 * Cat ref: isLastHuman ? lastHuman : isLastMessage ? lastAssistant : null
 */
function buildMessagePositions(chains: CoworkMessageChain[]) {
  return chains.map((chain, index) => {
    const isLastMessage = index === chains.length - 1;
    const isSecondToLast = index === chains.length - 2;
    const lastMessage = chain.messages.at(-1) ?? chain.displayMessage;
    return {
      isLastHumanMessage: lastMessage?.sender === "human" && (isLastMessage || isSecondToLast),
      isLastMessage,
    };
  });
}

function useConversationScrollState(scrollRef: React.RefObject<HTMLDivElement | null>, innerRef: React.RefObject<HTMLDivElement | null>, sentinelRef: React.RefObject<HTMLDivElement | null>, onScrollState: (state: CoworkScrollState) => void) {
  useLayoutEffect(() => {
    const node = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!node || !sentinel) return;
    // Official t$t: IntersectionObserver on e$t sentinel (rootMargin 150px bottom).
    // showScrollButton = !entry.isIntersecting only — no near-bottom rewrite.
    let sentinelAway = false;
    const publish = () => {
      if (node.offsetParent === null) return;
      const nearBottom = isCoworkNearBottom(node);
      onScrollState({
        showScrollButton: resolveCoworkShowScrollButton(sentinelAway),
        showBottomFade: !nearBottom,
      });
    };
    node.addEventListener("scroll", publish, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(publish);
    resizeObserver?.observe(node);
    if (innerRef.current) resizeObserver?.observe(innerRef.current);
    const intersectionObserver = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(([entry]) => {
      sentinelAway = !entry.isIntersecting;
      publish();
    }, { root: node, threshold: 0.01, rootMargin: "0px 0px 150px 0px" });
    intersectionObserver?.observe(sentinel);
    publish();
    return () => {
      node.removeEventListener("scroll", publish);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      onScrollState({ showScrollButton: false, showBottomFade: false });
    };
  }, [innerRef, onScrollState, scrollRef, sentinelRef]);
}
