import { useEffect, useRef, type RefObject } from "react";
import type { CoworkMessageChain } from "./coworkMessageTypes";
import { CoworkAssistantMessage } from "./CoworkAssistantMessage";
import { CoworkHumanMessage } from "./CoworkHumanMessage";

export function CoworkMessageCell({ chain, conversationIsStreaming, isLastHumanMessage, isLastMessage, lastAssistantMessageRef, lastHumanMessageRef }: {
  chain: CoworkMessageChain;
  conversationIsStreaming: boolean;
  isLastHumanMessage: boolean;
  isLastMessage: boolean;
  lastAssistantMessageRef: RefObject<HTMLDivElement | null>;
  lastHumanMessageRef: RefObject<HTMLDivElement | null>;
}) {
  const renderCount = useMessageRenderCount(isLastMessage);
  const message = chain.displayMessage ?? chain.messages[0];
  if (!message) return null;
  return (
    <div
      data-test-render-count={renderCount}
      ref={isLastHumanMessage ? lastHumanMessageRef : isLastMessage ? lastAssistantMessageRef : undefined}
    >
      {message.sender === "human"
        ? <CoworkHumanMessage chain={chain} conversationIsStreaming={conversationIsStreaming} isLastMessage={isLastMessage} />
        : <CoworkAssistantMessage chain={chain} conversationIsStreaming={conversationIsStreaming} isLastMessage={isLastMessage} />}
    </div>
  );
}

function useMessageRenderCount(isLastMessage: boolean) {
  const renderCount = useRef(1);
  useEffect(() => {
    if (!isLastMessage) renderCount.current += 1;
  }, [isLastMessage]);
  return renderCount.current;
}
