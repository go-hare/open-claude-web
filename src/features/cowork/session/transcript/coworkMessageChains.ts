import type { CoworkChatMessage, CoworkMessageChain } from "./coworkMessageTypes";

export function buildOfficialCoworkMessageChains(messages: CoworkChatMessage[], streamingMessageId?: string | null) {
  const messageByUuid = Object.fromEntries(messages.map((message) => [message.uuid, message]));
  const chains = groupMessageUuids(messages.map((message) => message.uuid), messageByUuid);
  return chains.map((chain) => {
    const first = messageByUuid[chain.firstMessageUuid];
    const last = messageByUuid[chain.lastMessageUuid];
    return {
      ...chain,
      displayMessage: chain.isChain && first && last
        ? { ...first, content: chain.mergedContent, stop_reason: last.stop_reason, updated_at: last.updated_at }
        : undefined,
      isStreaming: chain.messageUuids.includes(streamingMessageId ?? ""),
    };
  });
}

export function createOfficialCoworkMessageChain(messageUuids: string[], messageByUuid: Record<string, CoworkChatMessage>): CoworkMessageChain {
  const messages = messageUuids.map((uuid) => messageByUuid[uuid]).filter((message): message is CoworkChatMessage => message !== undefined);
  return {
    displayUuid: messageUuids[0],
    messageUuids,
    firstMessageUuid: messageUuids[0],
    lastMessageUuid: messageUuids[messageUuids.length - 1],
    mergedContent: messages.flatMap((message) => message.content),
    isChain: messageUuids.length > 1,
    isStreaming: false,
    messages,
  };
}

function groupMessageUuids(messageUuids: string[], messageByUuid: Record<string, CoworkChatMessage>) {
  const chains: CoworkMessageChain[] = [];
  let current: string[] = [];
  let sender: CoworkChatMessage["sender"] | null = null;
  const flush = () => {
    if (current.length > 0) chains.push(createOfficialCoworkMessageChain(current, messageByUuid));
    current = [];
    sender = null;
  };
  for (const uuid of messageUuids) {
    const message = messageByUuid[uuid];
    if (!message) {
      flush();
      continue;
    }
    if (message.sender === "assistant") {
      if (sender === "assistant" || sender === null) current.push(uuid);
      else {
        flush();
        current = [uuid];
      }
      sender = "assistant";
      continue;
    }
    flush();
    current = [uuid];
    sender = "human";
  }
  flush();
  return chains;
}
