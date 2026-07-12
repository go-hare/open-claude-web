import { createStore, type StoreApi } from "zustand/vanilla";
import { asRecord, stringValue } from "../recordUtils";
import {
  aggregateCoworkArtifacts,
  type CoworkArtifact,
  updateCoworkStreamingArtifacts,
} from "./coworkMessageArtifacts";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";

type CoworkMessagePathState = {
  allAttachments: unknown[];
  allFiles: unknown[];
  allSyncSources: unknown[];
  appendMessages: (conversationId: string, messages: CoworkChatMessage[]) => void;
  artifacts: Record<string, CoworkArtifact>;
  conversationSettings: unknown | null;
  fullText: string;
  getConversationMessages: (conversationId: string) => CoworkChatMessage[];
  hasArtifacts: boolean;
  lastStreamingArtifactId: string | null;
  messageByUuid: Record<string, CoworkChatMessage>;
  pathUuidsByConversation: Record<string, string[]>;
  selectedMessageUuid: string | null;
  setArtifacts: (artifacts: Record<string, CoworkArtifact>) => void;
  setConversationSettings: (settings: unknown | null) => void;
  setMessageStopDetails: (conversationId: string, messageUuid: string | undefined, details: unknown) => void;
  setMessages: (conversationId: string, messages: CoworkChatMessage[]) => void;
  setPathUuids: (conversationId: string, messageUuids: string[]) => void;
  setSelectedMessage: (messageUuid: string | null) => void;
  streamingArtifacts: Record<string, CoworkArtifact>;
  updateMessage: (messageUuid: string, message: CoworkChatMessage) => void;
  updateStreamingMessage: (
    conversationId: string,
    messageUuid: string | undefined,
    content: CoworkContentBlock[],
  ) => void;
};

export type CoworkMessagePathStore = StoreApi<CoworkMessagePathState>;

const emptyAssistantMessage: CoworkChatMessage = {
  attachments: [],
  content: [],
  created_at: "",
  files: [],
  files_v2: [],
  index: 0,
  parent_message_uuid: undefined,
  sender: "assistant",
  sync_sources: [],
  updated_at: "",
  uuid: "",
};

export function createCoworkMessagePathStore(): CoworkMessagePathStore {
  return createStore((set, get) => ({
    allAttachments: [],
    allFiles: [],
    allSyncSources: [],
    artifacts: {},
    conversationSettings: null,
    fullText: "",
    hasArtifacts: false,
    lastStreamingArtifactId: null,
    messageByUuid: {},
    pathUuidsByConversation: {},
    selectedMessageUuid: null,
    streamingArtifacts: {},
    setSelectedMessage: (messageUuid) => set({ selectedMessageUuid: messageUuid }),
    setConversationSettings: (conversationSettings) => set({ conversationSettings }),
    setMessages: (conversationId, messages) => set((state) => {
      const normalized = messages.map(normalizeSyncSources);
      const messageByUuid: Record<string, CoworkChatMessage> = {};
      const messageUuids: string[] = [];
      for (const message of normalized) {
        const previous = state.messageByUuid[message.uuid];
        messageByUuid[message.uuid] = message.stop_details === undefined && previous?.stop_details !== undefined
          ? { ...message, stop_details: previous.stop_details }
          : message;
        messageUuids.push(message.uuid);
      }
      return {
        ...aggregateMessageResources(normalized),
        artifacts: aggregateCoworkArtifacts(normalized),
        lastStreamingArtifactId: null,
        messageByUuid,
        pathUuidsByConversation: { ...state.pathUuidsByConversation, [conversationId]: messageUuids },
        streamingArtifacts: {},
      };
    }),
    appendMessages: (conversationId, messages) => {
      const state = get();
      state.setMessages(conversationId, [...state.getConversationMessages(conversationId), ...messages]);
    },
    updateMessage: (messageUuid, message) => {
      const normalized = normalizeSyncSources(message);
      const messageByUuid = { ...get().messageByUuid, [messageUuid]: normalized };
      const messages = Object.values(messageByUuid);
      set({
        ...aggregateMessageResources(messages),
        artifacts: aggregateCoworkArtifacts(messages),
        lastStreamingArtifactId: null,
        messageByUuid,
      });
    },
    setArtifacts: (artifacts) => set({ artifacts, hasArtifacts: Object.keys(artifacts).length > 0 }),
    setPathUuids: (conversationId, messageUuids) => set((state) => ({
      pathUuidsByConversation: { ...state.pathUuidsByConversation, [conversationId]: messageUuids },
    })),
    updateStreamingMessage: (conversationId, _messageUuid, content) => {
      const state = get();
      const path = state.pathUuidsByConversation[conversationId] ?? [];
      const finalUuid = path.at(-1);
      const message = finalUuid ? state.messageByUuid[finalUuid] : undefined;
      if (!message || !finalUuid) return;
      const next = { ...message, content };
      const [streamingArtifacts, lastStreamingArtifactId] = updateCoworkStreamingArtifacts(state.artifacts, next);
      set({
        lastStreamingArtifactId,
        messageByUuid: { ...state.messageByUuid, [finalUuid]: next },
        streamingArtifacts,
      });
    },
    setMessageStopDetails: (conversationId, messageUuid, details) => {
      const state = get();
      const path = state.pathUuidsByConversation[conversationId] ?? [];
      const targetUuid = messageUuid ?? path.at(-1);
      if (!targetUuid) return;
      const current = state.messageByUuid[targetUuid];
      set({
        messageByUuid: {
          ...state.messageByUuid,
          [targetUuid]: current
            ? { ...current, stop_details: details }
            : { ...emptyAssistantMessage, stop_details: details, uuid: targetUuid },
        },
      });
      persistStopDetails(conversationId, targetUuid, details);
    },
    getConversationMessages: (conversationId) => {
      const state = get();
      return (state.pathUuidsByConversation[conversationId] ?? [])
        .map((messageUuid) => state.messageByUuid[messageUuid])
        .filter((message): message is CoworkChatMessage => message !== undefined);
    },
  }));
}

export const coworkMessagePathStore = createCoworkMessagePathStore();

function normalizeSyncSources(message: CoworkChatMessage) {
  return message.sync_sources === undefined ? { ...message, sync_sources: [] } : message;
}

function aggregateMessageResources(messages: CoworkChatMessage[]) {
  const artifacts = aggregateCoworkArtifacts(messages);
  return {
    allAttachments: messages.flatMap((message) => message.attachments),
    allFiles: messages.flatMap((message) => message.files),
    allSyncSources: messages.flatMap((message) => message.sync_sources),
    fullText: messages.map(messageSearchText).join(" "),
    hasArtifacts: Object.keys(artifacts).length > 0,
  };
}

function messageSearchText(message: CoworkChatMessage) {
  const displayText = message.content.map((block) => {
    if (block.type === "text") return block.text ?? "";
    if (block.type === "connector_text") return block.connector_text ?? "";
    return "";
  }).join("");
  const attachments = message.attachments
    .map((attachment) => stringValue(asRecord(attachment).extracted_content) ?? "")
    .join(" ");
  const toolInputs = message.content
    .filter((block) => block.type === "tool_use")
    .map((block) => block.input ? JSON.stringify(block.input) : stringValue(block.partial_json) ?? "")
    .join(" ");
  const toolResults = message.content
    .filter((block) => block.type === "tool_result")
    .flatMap((block) => typeof block.content === "string"
      ? [block.content]
      : Array.isArray(block.content)
        ? block.content.filter((item) => item.type === "text").map((item) => item.text ?? "")
        : [])
    .join(" ");
  return `${displayText} ${attachments} ${toolInputs} ${toolResults}`;
}

function persistStopDetails(conversationId: string, messageUuid: string, stopDetails: unknown) {
  if (typeof window === "undefined") return;
  const key = `stop_details:${conversationId}`;
  try {
    if (messageUuid && stopDetails) {
      window.localStorage.setItem(key, JSON.stringify({ messageUuid, stopDetails }));
    } else {
      window.localStorage.removeItem(key);
    }
  } catch {}
}
