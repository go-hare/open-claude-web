import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useStore } from "zustand";
import { useShallow } from "zustand/react/shallow";
import type { CoworkChatMessage, CoworkMessageChain } from "./coworkMessageTypes";
import { CoworkAssistantMessage } from "./CoworkAssistantMessage";
import { CoworkHumanMessage } from "./CoworkHumanMessage";
import { hydrateOfficialCoworkMessageChain } from "./coworkMessageModel";
import { coworkMessagePathStore } from "./coworkMessagePathStore";

export function CoworkMessageCell({ chain, conversationIsStreaming, isLastHumanMessage, isLastMessage, lastAssistantMessageRef, lastHumanMessageRef }: {
  chain: CoworkMessageChain;
  conversationIsStreaming: boolean;
  isLastHumanMessage: boolean;
  isLastMessage: boolean;
  lastAssistantMessageRef: RefObject<HTMLDivElement | null>;
  lastHumanMessageRef: RefObject<HTMLDivElement | null>;
}) {
  const renderCount = useMessageRenderCount(isLastMessage);
  const messages = useStore(coworkMessagePathStore, useShallow((state) => chain.messageUuids
    .map((messageUuid) => state.messageByUuid[messageUuid])
    .filter((message): message is CoworkChatMessage => message !== undefined)));
  const hydratedChain = useMemo(() => hydrateOfficialCoworkMessageChain(chain, messages), [chain, messages]);
  // Official live paint: while the conversation is streaming the last assistant chain,
  // do NOT use displayMessage (merged multi-uuid dump). Prefer the latest partial row
  // (Pke/zE stream message lands as the tail via mergeCoworkStreamedSdkMessage).
  // messages[0] froze on the first multi-emit assistant → "one message arrives then dumps".
  const activeChain = conversationIsStreaming && isLastMessage && hydratedChain.displayMessage
    ? { ...hydratedChain, displayMessage: undefined }
    : hydratedChain;
  const message = conversationIsStreaming && isLastMessage
    ? (activeChain.messages[activeChain.messages.length - 1] ?? activeChain.messages[0])
    : (activeChain.displayMessage ?? activeChain.messages[0]);
  if (!message) return null;
  return (
    <div
      data-test-render-count={renderCount}
      ref={isLastHumanMessage ? lastHumanMessageRef : isLastMessage ? lastAssistantMessageRef : undefined}
    >
      {message.sender === "human"
        ? <CoworkHumanMessage chain={activeChain} conversationIsStreaming={conversationIsStreaming} isLastMessage={isLastMessage} />
        : <CoworkAssistantMessage chain={activeChain} conversationIsStreaming={conversationIsStreaming} isLastMessage={isLastMessage} />}
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
