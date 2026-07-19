import type { CoworkChatMessage, CoworkMessageChain } from "./coworkMessageTypes";

export function buildOfficialCoworkMessageChains(
  messages: CoworkChatMessage[],
  streamingMessageId?: string | null,
): CoworkMessageChain[] {
  const messageByUuid = Object.fromEntries(messages.map((message) => [message.uuid, message]));
  const chains = groupMessageUuids(messages.map((message) => message.uuid), messageByUuid);
  const liveId = streamingMessageId ?? "";
  return chains.map((chain): CoworkMessageChain => {
    const first = messageByUuid[chain.firstMessageUuid];
    const last = messageByUuid[chain.lastMessageUuid];
    // Official streamingMessageId is Anthropic message.id (Pke.messageId), not always the
    // outer SDK uuid. Match uuid OR apiMessageIds so isStreaming / progressive markdown arm.
    const isStreaming = Boolean(
      liveId
      && (
        chain.messageUuids.includes(liveId)
        || chain.messages.some((message) => message.uuid === liveId || Boolean(message.apiMessageIds?.includes(liveId)))
        || Boolean(first?.apiMessageIds?.includes(liveId))
        || Boolean(last?.apiMessageIds?.includes(liveId))
      ),
    );
    return {
      ...chain,
      displayMessage: chain.isChain && first && last
        ? { ...first, content: chain.mergedContent, stop_reason: last.stop_reason, updated_at: last.updated_at }
        : undefined,
      isStreaming,
    };
  });
}

export function hydrateOfficialCoworkMessageChain(
  chain: CoworkMessageChain,
  messages: CoworkChatMessage[],
): CoworkMessageChain {
  const messageByUuid = Object.fromEntries(messages.map((message) => [message.uuid, message]));
  const hydrated = createOfficialCoworkMessageChain(chain.messageUuids, messageByUuid);
  const first = messageByUuid[hydrated.firstMessageUuid];
  const last = messageByUuid[hydrated.lastMessageUuid];
  return {
    ...hydrated,
    displayMessage: hydrated.isChain && first && last
      ? { ...first, content: hydrated.mergedContent, stop_reason: last.stop_reason, updated_at: last.updated_at }
      : undefined,
    isStreaming: chain.isStreaming,
  };
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
