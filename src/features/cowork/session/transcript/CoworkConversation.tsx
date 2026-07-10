import { useEffect, useLayoutEffect, useMemo, useRef, type MutableRefObject, type ReactNode, type RefObject } from "react";
import type { CoworkConversationStatusState } from "../activity/CoworkConversationStatus";
import { CoworkConversationStatus } from "../activity/CoworkConversationStatus";
import type { CoworkPermissionRequest } from "../coworkPermissionTypes";
import { CoworkMessageCell } from "./CoworkMessageCell";
import { CoworkMessageContextProvider } from "./CoworkMessageContext";
import { CoworkConversationBottomSpacer } from "./CoworkConversationBottomSpacer";
import { CoworkTimelineStatusVisibilityProvider } from "./CoworkTimelineStatusVisibility";
import type { CoworkMessageChain } from "./coworkMessageModel";

export type CoworkScrollState = { showBottomFade: boolean; showScrollButton: boolean };

export function CoworkConversation({ chains, composer, composerRef, isResponding, onScrollState, pendingTurnStartedAt, permissionApprovals, permissionRequests, scrollRef, status }: { chains: CoworkMessageChain[]; composer: ReactNode; composerRef: RefObject<HTMLDivElement | null>; isResponding: boolean; onScrollState: (state: CoworkScrollState) => void; pendingTurnStartedAt?: number | null; permissionApprovals?: ReactNode; permissionRequests: CoworkPermissionRequest[]; scrollRef: MutableRefObject<HTMLDivElement | null>; status: CoworkConversationStatusState | null }) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const lastAssistantMessageRef = useRef<HTMLDivElement | null>(null);
  const lastHumanMessageRef = useRef<HTMLDivElement | null>(null);
  const extrasRef = useRef<HTMLDivElement | null>(null);
  const messagePositions = useMemo(() => buildMessagePositions(chains), [chains]);
  const messageContext = useMemo(() => ({ toolPermissionRequests: permissionRequests }), [permissionRequests]);
  useLayoutEffect(() => {
    scrollRef.current = localScrollRef.current;
    return () => { scrollRef.current = null; };
  }, [scrollRef]);
  usePinnedConversationScroll(localScrollRef, innerRef);
  useConversationScrollState(localScrollRef, innerRef, onScrollState);
  return (
    <div className="flex flex-1 h-full w-full overflow-hidden max-md:relative md:-mt-[var(--df-header-h,0px)] md:h-[calc(100%+var(--df-header-h,0px))]">
      <div className="h-full flex flex-col overflow-hidden md:pt-[var(--df-header-h,0px)] relative" style={{ flex: "100 0" }}>
        <div className="overflow-y-auto overflow-x-hidden [scrollbar-gutter:stable] pt-14 flex-1" data-autoscroll-container ref={localScrollRef}>
          <div className="relative w-full min-h-full flex flex-col" ref={innerRef}>
            <div className="mx-auto flex w-full flex-1 flex-col max-w-3xl md:px-2">
              <CoworkResponseStatusAnnouncer isStreaming={isResponding} />
              <div className="flex-1 flex flex-col px-4 max-w-3xl mx-auto w-full pt-1">
                {chains.length > 0 ? (
                  <CoworkTimelineStatusVisibilityProvider>
                    <CoworkMessageContextProvider value={messageContext}>
                      {chains.map((chain, index) => (
                        <CoworkMessageCell
                          chain={chain}
                          conversationIsStreaming={isResponding}
                          isLastHumanMessage={messagePositions[index]?.isLastHumanMessage ?? false}
                          isLastMessage={messagePositions[index]?.isLastMessage ?? false}
                          key={chain.firstMessageUuid}
                          lastAssistantMessageRef={lastAssistantMessageRef}
                          lastHumanMessageRef={lastHumanMessageRef}
                        />
                      ))}
                    </CoworkMessageContextProvider>
                    {permissionApprovals}
                    <div aria-hidden="true" className="h-px w-full pointer-events-none" />
                    <CoworkConversationStatus isWorking={isResponding} ref={extrasRef} startedAt={pendingTurnStartedAt} status={status} />
                    <div className="h-12" />
                    <CoworkConversationBottomSpacer composerRef={composerRef} extrasRef={extrasRef} lastAssistantMessageRef={lastAssistantMessageRef} lastHumanMessageRef={lastHumanMessageRef} messageCount={chains.length} scrollRef={localScrollRef} />
                  </CoworkTimelineStatusVisibilityProvider>
                ) : null}
              </div>
              {composer}
            </div>
          </div>
        </div>
      </div>
    </div>
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

function useConversationScrollState(scrollRef: React.RefObject<HTMLDivElement | null>, innerRef: React.RefObject<HTMLDivElement | null>, onScrollState: (state: CoworkScrollState) => void) {
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => {
      if (node.offsetParent === null) return;
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      onScrollState({ showScrollButton: distance > 200, showBottomFade: distance > 8 });
    };
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    if (innerRef.current) observer.observe(innerRef.current);
    update();
    return () => { node.removeEventListener("scroll", update); observer.disconnect(); onScrollState({ showScrollButton: false, showBottomFade: false }); };
  }, [innerRef, onScrollState, scrollRef]);
}

function usePinnedConversationScroll(scrollRef: React.RefObject<HTMLDivElement | null>, innerRef: React.RefObject<HTMLDivElement | null>) {
  const pinnedRef = useRef(true);
  const programmaticRef = useRef(false);
  const previousTopRef = useRef(0);
  const previousHeightRef = useRef(0);
  useLayoutEffect(() => {
    const node = scrollRef.current;
    const inner = innerRef.current;
    if (!node || !inner) return;
    const scrollToBottom = () => {
      if (!pinnedRef.current || node.scrollTop > node.scrollHeight - node.clientHeight) return;
      programmaticRef.current = true;
      node.scrollTo({ behavior: "auto", top: node.scrollHeight });
      window.setTimeout(() => { programmaticRef.current = false; }, 0);
    };
    const onScroll = () => updatePinnedState(node, pinnedRef, programmaticRef, previousTopRef, previousHeightRef);
    const observer = new ResizeObserver(scrollToBottom);
    node.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(inner);
    observer.observe(node);
    scrollToBottom();
    return () => { node.removeEventListener("scroll", onScroll); observer.disconnect(); };
  }, [innerRef, scrollRef]);
}

function updatePinnedState(node: HTMLDivElement, pinnedRef: React.MutableRefObject<boolean>, programmaticRef: React.MutableRefObject<boolean>, previousTopRef: React.MutableRefObject<number>, previousHeightRef: React.MutableRefObject<number>) {
  const scrolledUp = node.scrollTop < previousTopRef.current;
  const heightShrank = node.scrollHeight < previousHeightRef.current;
  previousTopRef.current = node.scrollTop;
  previousHeightRef.current = node.scrollHeight;
  if (programmaticRef.current) return;
  const nearBottom = Math.floor(node.scrollHeight - node.scrollTop - node.clientHeight) < 8;
  if (!nearBottom && scrolledUp && !heightShrank) pinnedRef.current = false;
}
