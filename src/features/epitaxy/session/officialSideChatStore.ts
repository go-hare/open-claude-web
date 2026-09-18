/**
 * Official c4bf44b41 `$()` Side chat store — keyed by parent sessionId.
 * Residual fields: openBySession, pendingQuestionBySession, messagesBySession,
 * statusBySession, errorBySession, queuedBySession, startedBySession, isStartingBySession.
 */
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

export type OfficialSideChatStatus = "idle" | "starting" | "thinking" | "ready";

export type OfficialSideChatMessage = {
  role: "user" | "assistant";
  text: string;
};

function omitKey<T>(map: Record<string, T>, key: string): Record<string, T> {
  if (!(key in map)) return map;
  const { [key]: _drop, ...rest } = map;
  return rest;
}

type OfficialSideChatState = {
  appendMessage: (sessionId: string, message: OfficialSideChatMessage) => void;
  clearMessages: (sessionId: string) => void;
  clearPendingQuestion: (sessionId: string) => void;
  close: (sessionId: string) => void;
  errorBySession: Record<string, string | null>;
  evictSession: (sessionId: string) => void;
  isStartingBySession: Record<string, boolean>;
  messagesBySession: Record<string, OfficialSideChatMessage[]>;
  openBySession: Record<string, boolean>;
  openWith: (sessionId: string, question?: string) => void;
  pendingQuestionBySession: Record<string, string>;
  popLastUserMessage: (sessionId: string) => void;
  pushUserMessage: (sessionId: string, text: string, replaceQueued: boolean) => void;
  queuedBySession: Record<string, string>;
  setError: (sessionId: string, error: string | null) => void;
  setIsStarting: (sessionId: string, value: boolean) => void;
  setQueued: (sessionId: string, text: string | null) => void;
  setStarted: (sessionId: string, value: boolean) => void;
  setStatus: (sessionId: string, status: OfficialSideChatStatus) => void;
  startedBySession: Record<string, boolean>;
  statusBySession: Record<string, OfficialSideChatStatus>;
  toggle: (sessionId: string) => void;
};

const EMPTY_MESSAGES: OfficialSideChatMessage[] = [];

export const officialSideChatStore = createStore<OfficialSideChatState>()((set) => ({
  openBySession: {},
  pendingQuestionBySession: {},
  messagesBySession: {},
  statusBySession: {},
  errorBySession: {},
  queuedBySession: {},
  startedBySession: {},
  isStartingBySession: {},
  toggle: (sessionId) => set((state) => ({
    openBySession: { ...state.openBySession, [sessionId]: !state.openBySession[sessionId] },
  })),
  close: (sessionId) => set((state) => ({
    openBySession: { ...state.openBySession, [sessionId]: false },
    pendingQuestionBySession: omitKey(state.pendingQuestionBySession, sessionId),
  })),
  openWith: (sessionId, question) => set((state) => {
    const pending = { ...state.pendingQuestionBySession };
    if (question) pending[sessionId] = question;
    else delete pending[sessionId];
    return {
      openBySession: { ...state.openBySession, [sessionId]: true },
      pendingQuestionBySession: pending,
    };
  }),
  clearPendingQuestion: (sessionId) => set((state) => ({
    pendingQuestionBySession: omitKey(state.pendingQuestionBySession, sessionId),
  })),
  appendMessage: (sessionId, message) => set((state) => ({
    messagesBySession: {
      ...state.messagesBySession,
      [sessionId]: [...(state.messagesBySession[sessionId] ?? []), message],
    },
  })),
  pushUserMessage: (sessionId, text, replaceQueued) => set((state) => {
    const rows = state.messagesBySession[sessionId] ?? [];
    const next = replaceQueued && rows.at(-1)?.role === "user" ? rows.slice(0, -1) : rows;
    return {
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: [...next, { role: "user", text }],
      },
    };
  }),
  popLastUserMessage: (sessionId) => set((state) => {
    const rows = state.messagesBySession[sessionId];
    if (!rows || rows.at(-1)?.role !== "user") return state;
    return {
      messagesBySession: {
        ...state.messagesBySession,
        [sessionId]: rows.slice(0, -1),
      },
    };
  }),
  clearMessages: (sessionId) => set((state) => ({
    messagesBySession: omitKey(state.messagesBySession, sessionId),
  })),
  setStatus: (sessionId, status) => set((state) => ({
    statusBySession: { ...state.statusBySession, [sessionId]: status },
  })),
  setError: (sessionId, error) => set((state) => ({
    errorBySession: { ...state.errorBySession, [sessionId]: error },
  })),
  setQueued: (sessionId, text) => set((state) => {
    const queued = { ...state.queuedBySession };
    if (text == null || text === "") delete queued[sessionId];
    else queued[sessionId] = text;
    return { queuedBySession: queued };
  }),
  setStarted: (sessionId, value) => set((state) => ({
    startedBySession: { ...state.startedBySession, [sessionId]: value },
  })),
  setIsStarting: (sessionId, value) => set((state) => ({
    isStartingBySession: { ...state.isStartingBySession, [sessionId]: value },
  })),
  evictSession: (sessionId) => set((state) => ({
    openBySession: omitKey(state.openBySession, sessionId),
    pendingQuestionBySession: omitKey(state.pendingQuestionBySession, sessionId),
    messagesBySession: omitKey(state.messagesBySession, sessionId),
    statusBySession: omitKey(state.statusBySession, sessionId),
    errorBySession: omitKey(state.errorBySession, sessionId),
    queuedBySession: omitKey(state.queuedBySession, sessionId),
    startedBySession: omitKey(state.startedBySession, sessionId),
    isStartingBySession: omitKey(state.isStartingBySession, sessionId),
  })),
}));

export const officialSideChatApi = officialSideChatStore.getState;

export function useOfficialSideChatOpen(sessionId: string | null) {
  return useStore(officialSideChatStore, (state) => Boolean(sessionId && (state.openBySession[sessionId] ?? false)));
}

export function useOfficialSideChatMessages(sessionId: string | null) {
  return useStore(
    officialSideChatStore,
    (state) => (sessionId ? state.messagesBySession[sessionId] ?? EMPTY_MESSAGES : EMPTY_MESSAGES),
  );
}

export function useOfficialSideChatStatus(sessionId: string | null): OfficialSideChatStatus {
  return useStore(officialSideChatStore, (state) => (sessionId ? state.statusBySession[sessionId] ?? "idle" : "idle"));
}

export function useOfficialSideChatError(sessionId: string | null) {
  return useStore(officialSideChatStore, (state) => (sessionId ? state.errorBySession[sessionId] ?? null : null));
}

export function useOfficialSideChatPendingQuestion(sessionId: string | null) {
  return useStore(
    officialSideChatStore,
    (state) => (sessionId ? state.pendingQuestionBySession[sessionId] ?? null : null),
  );
}

export function resetOfficialSideChatStoreForTests() {
  officialSideChatStore.setState({
    openBySession: {},
    pendingQuestionBySession: {},
    messagesBySession: {},
    statusBySession: {},
    errorBySession: {},
    queuedBySession: {},
    startedBySession: {},
    isStartingBySession: {},
  });
}
