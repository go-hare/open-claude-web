import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode, type RefObject } from "react";
import type { CoworkConversationStatusState } from "../activity/CoworkConversationStatus";
import { CoworkConversationStatus } from "../activity/CoworkConversationStatus";
import type { CoworkPermissionRequest } from "../coworkPermissionTypes";
import { CoworkMessageCell } from "./CoworkMessageCell";
import { CoworkMessageContextProvider } from "./CoworkMessageContext";
import { CoworkConversationBottomSpacer } from "./CoworkConversationBottomSpacer";
import { CoworkAskUserQuestionProvider } from "../../composer/CoworkAskUserQuestionContext";
import { CoworkTimelineStatusVisibilityProvider } from "./CoworkTimelineStatusVisibility";
import type { CoworkAutoscrollHandle, CoworkPinToBottomConfig } from "./coworkAutoscroll";
import { isCoworkNearBottom } from "./coworkAutoscroll";
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
  const chains = useMemo(() => buildOfficialCoworkMessageChains(
    messageUuids
      .map((messageUuid) => coworkMessagePathStore.getState().messageByUuid[messageUuid])
      .filter((message): message is CoworkChatMessage => message !== undefined),
    streamingMessageId,
  ), [messageUuids, streamingMessageId]);
  // Official paint ownership is streamingMessageId / Va (eke suppress + progressive), not
  // Qke isResponding. end_turn flips endTurnSeen → isResponding false while Pke/zE is still
  // revealing — progressive must stay on until streamingMessageId clears on settle.
  const conversationIsStreaming = Boolean(streamingMessageId) || isResponding;
  const messagePositions = useMemo(() => buildMessagePositions(chains), [chains]);
  const messageContext = useMemo(() => ({ onRetry: onTryAgain, onToolDecision, toolPermissionRequests: permissionRequests }), [onToolDecision, onTryAgain, permissionRequests]);
  // Official IYe pin controller. Conversation shell omits pinToBottomConfig (initial false);
  // session path re-pins via t$t scroll-to-bottom / streaming session effects.
  const autoscroll = useCoworkAutoscroll(localScrollRef, innerRef, pinToBottomConfig);
  useLayoutEffect(() => {
    scrollRef.current = localScrollRef.current;
    return () => { scrollRef.current = null; };
  }, [scrollRef]);
  useLayoutEffect(() => {
    spacerAutoscrollRef.current = autoscroll;
    if (autoscrollRef) autoscrollRef.current = autoscroll;
    return () => {
      spacerAutoscrollRef.current = null;
      if (autoscrollRef) autoscrollRef.current = null;
    };
  }, [autoscroll, autoscrollRef]);
  useConversationScrollState(localScrollRef, innerRef, lastMessageSentinelRef, onScrollState);
  return (
    <CoworkAskUserQuestionProvider>
      <div className="flex flex-1 h-full w-full overflow-hidden max-md:relative md:-mt-[var(--df-header-h,0px)] md:h-[calc(100%+var(--df-header-h,0px))]">
      <div className="h-full flex flex-col overflow-hidden md:pt-[var(--df-header-h,0px)] relative" style={{ flex: "100 0" }}>
        <div className="overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] pt-14 flex-1" data-autoscroll-container ref={localScrollRef}>
          <div className="relative w-full min-h-full flex flex-col" ref={innerRef}>
            <div className="mx-auto flex w-full flex-1 flex-col max-w-3xl md:px-2">
              <CoworkResponseStatusAnnouncer isStreaming={isResponding} />
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
                  <CoworkConversationStatus error={error} errorCategory={errorCategory} isWorking={isResponding} onTryAgain={onTryAgain} ref={extrasRef} startedAt={activityStartedAt} status={status} />
                  <div className="h-12" />
                  <CoworkConversationBottomSpacer autoScrollRef={spacerAutoscrollRef} composerRef={composerRef} extrasRef={extrasRef} lastAssistantMessageRef={lastAssistantMessageRef} lastHumanMessageRef={lastHumanMessageRef} messageCount={messageUuids.length} scrollRef={localScrollRef} />
                </CoworkTimelineStatusVisibilityProvider>
              </div>
              {composer}
            </div>
          </div>
        </div>
      </div>
      </div>
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
    let showScrollButton = false;
    const updateFade = () => {
      if (node.offsetParent === null) return;
      onScrollState({ showScrollButton, showBottomFade: !isCoworkNearBottom(node) });
    };
    node.addEventListener("scroll", updateFade, { passive: true });
    const resizeObserver = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(updateFade);
    resizeObserver?.observe(node);
    if (innerRef.current) resizeObserver?.observe(innerRef.current);
    const intersectionObserver = typeof IntersectionObserver === "undefined" ? undefined : new IntersectionObserver(([entry]) => {
      showScrollButton = !entry.isIntersecting;
      updateFade();
    }, { root: node, threshold: 0.01, rootMargin: "0px 0px 150px 0px" });
    intersectionObserver?.observe(sentinel);
    updateFade();
    return () => {
      node.removeEventListener("scroll", updateFade);
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      onScrollState({ showScrollButton: false, showBottomFade: false });
    };
  }, [innerRef, onScrollState, scrollRef, sentinelRef]);
}
