/**
 * Official-shaped code session bucket store (c11959232 `he` / `tm` / `rm`).
 *
 * Official flow:
 *   openSession(id, meta) | seedTranscript(id, messages)
 *   beginPendingTurn(id)
 *   message/stream events mutate bucket
 *   isTranscriptPending / isMetaPending drive Ja loading (with 20ms delay in UI)
 *
 * This is the durable cross-panel cache — Recents + chat tile share the same buckets.
 */
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { ChatMessage, SessionSummary } from "../../../adapters/desktopBridge/types";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";

export type StreamActivityMode = "idle" | "requesting" | "thinking" | "responding" | "tool-use";

export const idleStreamActivityMode: StreamActivityMode = "idle";

export type OfficialCodeSessionBucket = {
  error: Error | null;
  /** True while first transcript fetch is in flight and bucket has no messages yet. */
  isTranscriptPending: boolean;
  /** True while session meta fetch is in flight and bucket has no session yet. */
  isMetaPending: boolean;
  isSessionNotFound: boolean;
  messages: ChatMessage[];
  pendingTurnStartedAt: number | null;
  session: SessionSummary | null;
  streamActivityMode: StreamActivityMode;
  streamingMessageId: string | null;
  streamSnapshot: OfficialStreamSnapshot;
  /** Monotonic load generation for stale response discard. */
  loadGeneration: number;
};

export type OfficialCodeSessionState = {
  buckets: Record<string, OfficialCodeSessionBucket>;
};

function emptyBucket(pending: boolean): OfficialCodeSessionBucket {
  return {
    error: null,
    isTranscriptPending: pending,
    isMetaPending: pending,
    isSessionNotFound: false,
    messages: [],
    pendingTurnStartedAt: null,
    session: null,
    streamActivityMode: idleStreamActivityMode,
    streamingMessageId: null,
    streamSnapshot: null,
    loadGeneration: 0,
  };
}

function hasRenderableContent(bucket: OfficialCodeSessionBucket) {
  return bucket.messages.length > 0 || bucket.session !== null || bucket.streamSnapshot !== null;
}

type OfficialCodeSessionActions = {
  /** Official seedTranscript — replace/seed message list without wiping meta. */
  seedTranscript: (sessionId: string, messages: ChatMessage[]) => void;
  /** Official openSession — attach session meta (and optional messages). */
  openSession: (sessionId: string, session: SessionSummary | null, messages?: ChatMessage[]) => void;
  /** Official beginPendingTurn — mark turn started (optimistic send). */
  beginPendingTurn: (sessionId: string, optimisticUser?: ChatMessage) => void;
  /** Mark cold open pending flags (only when no renderable content). */
  markLoading: (sessionId: string, silent?: boolean) => number;
  /** Apply successful load for a generation. */
  applyLoad: (
    sessionId: string,
    generation: number,
    payload: { messages: ChatMessage[]; session: SessionSummary | null } | null,
    options?: { preserveLiveStream?: boolean },
  ) => void;
  applyLoadError: (sessionId: string, generation: number, error: Error) => void;
  patchSession: (sessionId: string, patch: Partial<SessionSummary> | SessionSummary) => void;
  mergeMessage: (sessionId: string, message: ChatMessage) => void;
  setStreamSnapshot: (sessionId: string, streamSnapshot: OfficialStreamSnapshot) => void;
  setStreamActivity: (
    sessionId: string,
    patch: {
      pendingTurnStartedAt?: number | null;
      streamActivityMode?: StreamActivityMode;
      streamingMessageId?: string | null;
      isRunning?: boolean;
    },
  ) => void;
  clearStream: (sessionId: string, markSessionSettled?: boolean) => void;
  getBucket: (sessionId: string) => OfficialCodeSessionBucket | undefined;
  ensureBucket: (sessionId: string) => OfficialCodeSessionBucket;
};

export type OfficialCodeSessionStore = OfficialCodeSessionState & OfficialCodeSessionActions;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

/**
 * Prefer content-block structure (tools/thinking/text) over plain text.length.
 * Official durable assistant rows carry full message.content arrays; collapsing by
 * text.length alone wiped tool_use envelopes and looked like "history overwrite".
 */
function chatMessageRichness(message: ChatMessage): number {
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  if (Array.isArray(content)) {
    let score = content.length * 1000;
    for (const block of content) {
      const record = asRecord(block);
      const type = typeof record.type === "string" ? record.type : "";
      if (type === "tool_use") score += 500;
      if (type === "tool_result") score += 400;
      if (type === "text" && typeof record.text === "string") score += record.text.length;
      if (type === "thinking" && typeof record.thinking === "string") score += record.thinking.length;
    }
    return score;
  }
  if (typeof content === "string") return content.length;
  return message.text?.length ?? 0;
}

function preferRicherChatMessage(prev: ChatMessage, next: ChatMessage): ChatMessage {
  return chatMessageRichness(next) >= chatMessageRichness(prev) ? next : prev;
}

function upsertMessage(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const identity = messageIdentity(next);
  const index = messages.findIndex((message) => messageIdentity(message) === identity);
  if (index >= 0) {
    const existing = messages[index]!;
    if (existing === next) return messages;
    // Official live path (index-BELzQL5P message handler): same-uuid assistant replaces in place.
    // When comparing structural richness, never let a poorer text-only row wipe tools.
    const chosen = preferRicherChatMessage(existing, next);
    if (chosen === existing) {
      // Still allow pure text growth on the same envelope when structure is equal-or-better next.
      if (chatMessageRichness(next) === chatMessageRichness(existing) && (next.text?.length ?? 0) > (existing.text?.length ?? 0)) {
        const copy = messages.slice();
        copy[index] = next;
        return copy;
      }
      return messages;
    }
    const copy = messages.slice();
    copy[index] = chosen;
    return copy;
  }
  if (next.role === "user" && !isOptimisticLocalUser(next)) {
    const optimisticIndex = [...messages]
      .map((message, i) => ({ message, i }))
      .reverse()
      .find(({ message }) => isOptimisticLocalUser(message) && message.text.trim() === next.text.trim())?.i;
    if (optimisticIndex !== undefined) {
      const copy = messages.slice();
      copy[optimisticIndex] = next;
      return copy;
    }
  }
  return [...messages, next];
}

/**
 * Official zke-style durable row identity (index-BELzQL5P live message handler):
 * outer CLI `uuid` is per NDJSON event. Multi-emit assistant partials APPEND as separate
 * rows; eke suppresses paint while message.id === streamingMessageId, then f() merges
 * consecutive assistants. Collapsing by Anthropic message.id at upsert time forced
 * in-place replace → full eke thrash every partial (stutter) and text-length wipe risk.
 *
 * Anthropic message.id collapse belongs in load/getTranscript richer-merge, not live upsert.
 */
function messageIdentity(message: ChatMessage) {
  const raw = (message.raw && typeof message.raw === "object" ? message.raw : {}) as Record<string, unknown>;
  return String(raw.uuid ?? raw.id ?? message.id);
}

/** Anthropic message.id for assistants — used by load collapse / eke suppress only. */
export function anthropicAssistantMessageId(message: ChatMessage): string | undefined {
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  if (message.role !== "assistant" && raw.type !== "assistant") return undefined;
  const id = nested.id ?? raw.message_id;
  return typeof id === "string" && id.length > 0 ? id : undefined;
}

function isOptimisticLocalUser(message: ChatMessage) {
  return message.role === "user" && (message.id.startsWith("local-user-") || String((message.raw as { uuid?: string } | undefined)?.uuid ?? "").startsWith("local-user-"));
}

/**
 * Union-merge transcripts by identity. NEVER drops a previous row.
 * - Walk prev order first (stable history)
 * - Prefer richer content-block envelopes when the same identity appears in next
 * - Append identities that only exist in next
 *
 * Replacing prev wholesale with next was the "stream wipes old messages" bug:
 * getTranscript can return a longer-but-incomplete event list (more system/result
 * noise, missing durable assistants) and length checks alone are not enough.
 */
function mergeTranscriptUnion(prev: ChatMessage[], next: ChatMessage[]) {
  if (next.length === 0) return prev;
  if (prev.length === 0) return next;
  const nextById = new Map(next.map((message) => [messageIdentity(message), message]));
  const seen = new Set<string>();
  const out: ChatMessage[] = [];
  for (const message of prev) {
    const id = messageIdentity(message);
    seen.add(id);
    const incoming = nextById.get(id);
    if (!incoming) {
      out.push(message);
      continue;
    }
    out.push(preferRicherChatMessage(message, incoming));
  }
  for (const message of next) {
    const id = messageIdentity(message);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(message);
  }
  return out;
}

/** @deprecated use mergeTranscriptUnion — kept name for call sites that meant "prefer local". */
function mergeTranscriptPreferLocal(prev: ChatMessage[], next: ChatMessage[]) {
  return mergeTranscriptUnion(prev, next);
}

/** Live-turn merge: same as union (never drop local history). */
function mergeTranscriptPreserveAll(prev: ChatMessage[], next: ChatMessage[]) {
  return mergeTranscriptUnion(prev, next);
}

function filterStreamEvents(messages: ChatMessage[]) {
  return messages.filter((message) => {
    const raw = message.raw && typeof message.raw === "object" ? message.raw as Record<string, unknown> : {};
    return raw.type !== "stream_event";
  });
}

export const officialCodeSessionStore = createStore<OfficialCodeSessionStore>((set, get) => ({
  buckets: {},

  getBucket: (sessionId) => get().buckets[sessionId],

  ensureBucket: (sessionId) => {
    const existing = get().buckets[sessionId];
    if (existing) return existing;
    const created = emptyBucket(true);
    set((state) => ({ buckets: { ...state.buckets, [sessionId]: created } }));
    return created;
  },

  seedTranscript: (sessionId, messages) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const nextMessages = filterStreamEvents(messages);
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isSessionNotFound: false,
            messages: nextMessages.length > 0 || prev.messages.length === 0 ? nextMessages : prev.messages,
            session: prev.session
              ? { ...prev.session, messages: nextMessages.length ? nextMessages : prev.session.messages }
              : prev.session,
          },
        },
      };
    });
  },

  openSession: (sessionId, session, messages) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const nextMessages = messages ? filterStreamEvents(messages) : prev.messages;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isMetaPending: false,
            isTranscriptPending: messages ? false : prev.isTranscriptPending && nextMessages.length === 0,
            isSessionNotFound: session === null && nextMessages.length === 0,
            messages: nextMessages,
            session: session
              ? { ...session, messages: nextMessages.length ? nextMessages : session.messages ?? nextMessages }
              : prev.session,
          },
        },
      };
    });
  },

  beginPendingTurn: (sessionId, optimisticUser) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const messages = optimisticUser ? upsertMessage(prev.messages, optimisticUser) : prev.messages;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isMetaPending: false,
            messages,
            pendingTurnStartedAt: Date.now(),
            streamActivityMode: "requesting",
            session: prev.session ? { ...prev.session, isRunning: true, messages } : prev.session,
          },
        },
      };
    });
  },

  markLoading: (sessionId, silent = false) => {
    const prev = get().buckets[sessionId] ?? emptyBucket(true);
    const generation = prev.loadGeneration + 1;
    const hasContent = hasRenderableContent(prev);
    set((state) => ({
      buckets: {
        ...state.buckets,
        [sessionId]: {
          ...prev,
          error: null,
          loadGeneration: generation,
          // Official: never blank a populated bucket while revalidating.
          isTranscriptPending: silent || hasContent ? false : true,
          isMetaPending: silent || hasContent ? false : true,
        },
      },
    }));
    return generation;
  },

  applyLoad: (sessionId, generation, payload, options) => {
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev || prev.loadGeneration !== generation) return state;
      if (!payload) {
        return {
          buckets: {
            ...state.buckets,
            [sessionId]: {
              ...prev,
              error: null,
              isTranscriptPending: false,
              isMetaPending: false,
              isSessionNotFound: true,
            },
          },
        };
      }
      // Stream snapshot now lives in Pe/local Va — protect live turns via session flags.
      const liveStreaming = options?.preserveLiveStream
        || prev.streamSnapshot !== null
        || prev.streamingMessageId !== null
        || prev.streamActivityMode !== idleStreamActivityMode
        || prev.session?.isRunning === true
        || prev.messages.some((message) => isOptimisticLocalUser(message));
      if (liveStreaming) {
        // While a turn is live, never replace local history with a partial fetch.
        // Only append missing identities from the server payload.
        const nextMessages = filterStreamEvents(payload.messages);
        const messages = mergeTranscriptPreserveAll(prev.messages, nextMessages);
        return {
          buckets: {
            ...state.buckets,
            [sessionId]: {
              ...prev,
              error: null,
              isTranscriptPending: false,
              isMetaPending: false,
              isSessionNotFound: false,
              messages,
              session: payload.session
                ? { ...prev.session, ...payload.session, id: payload.session.id, messages } as SessionSummary
                : prev.session,
            },
          },
        };
      }
      const nextMessages = filterStreamEvents(payload.messages);
      // Always union — never wholesale-replace history (even when settled).
      const messages = mergeTranscriptUnion(prev.messages, nextMessages);
      const sessionSettled = payload.session ? payload.session.isRunning !== true : true;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isMetaPending: false,
            isSessionNotFound: false,
            messages,
            session: payload.session
              ? { ...payload.session, messages }
              : null,
            pendingTurnStartedAt: sessionSettled ? null : prev.pendingTurnStartedAt,
            streamActivityMode: sessionSettled ? idleStreamActivityMode : prev.streamActivityMode,
            streamingMessageId: sessionSettled ? null : prev.streamingMessageId,
            streamSnapshot: sessionSettled ? null : prev.streamSnapshot,
          },
        },
      };
    });
  },

  applyLoadError: (sessionId, generation, error) => {
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev || prev.loadGeneration !== generation) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error,
            isTranscriptPending: false,
            isMetaPending: false,
          },
        },
      };
    });
  },

  patchSession: (sessionId, patch) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const base = prev.session;
      const nextSession = {
        ...(base ?? {
          id: sessionId,
          kind: "code" as const,
          title: "Coding session",
          updatedAtMs: Date.now(),
        }),
        ...patch,
        id: (patch as SessionSummary).id ?? base?.id ?? sessionId,
      } as SessionSummary;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            isMetaPending: false,
            session: nextSession,
          },
        },
      };
    });
  },

  mergeMessage: (sessionId, message) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const messages = upsertMessage(prev.messages, message);
      if (messages === prev.messages) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            isTranscriptPending: false,
            messages: filterStreamEvents(messages),
            session: prev.session ? { ...prev.session, messages } : prev.session,
          },
        },
      };
    });
  },

  setStreamSnapshot: (sessionId, streamSnapshot) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      // Skip no-op emits (same message, same revealed char budget) to reduce stream jank.
      if (streamSnapshotsEquivalent(prev.streamSnapshot, streamSnapshot)) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: { ...prev, streamSnapshot },
        },
      };
    });
  },

  setStreamActivity: (sessionId, patch) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const pendingTurnStartedAt = patch.pendingTurnStartedAt !== undefined
        ? patch.pendingTurnStartedAt
        : prev.pendingTurnStartedAt;
      const streamActivityMode = patch.streamActivityMode ?? prev.streamActivityMode;
      const streamingMessageId = patch.streamingMessageId !== undefined
        ? patch.streamingMessageId
        : prev.streamingMessageId;
      const session = prev.session && patch.isRunning !== undefined
        ? (prev.session.isRunning === patch.isRunning ? prev.session : { ...prev.session, isRunning: patch.isRunning })
        : prev.session;
      if (
        pendingTurnStartedAt === prev.pendingTurnStartedAt
        && streamActivityMode === prev.streamActivityMode
        && streamingMessageId === prev.streamingMessageId
        && session === prev.session
      ) {
        return state;
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            pendingTurnStartedAt,
            streamActivityMode,
            streamingMessageId,
            session,
          },
        },
      };
    });
  },

  clearStream: (sessionId, markSessionSettled = false) => {
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            pendingTurnStartedAt: null,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
            session: markSessionSettled && prev.session
              ? { ...prev.session, isRunning: false }
              : prev.session,
          },
        },
      };
    });
  },
}));

function streamSnapshotsEquivalent(
  left: OfficialStreamSnapshot,
  right: OfficialStreamSnapshot,
) {
  if (left === right) return true;
  if (!left || !right) return left === right;
  if (left.messageId !== right.messageId || left.blocks.length !== right.blocks.length) return false;
  for (let index = 0; index < left.blocks.length; index += 1) {
    const a = left.blocks[index];
    const b = right.blocks[index];
    if (a.kind !== b.kind) return false;
    if (a.kind === "text" && b.kind === "text" && a.text !== b.text) return false;
    if (a.kind === "thinking" && b.kind === "thinking" && a.text !== b.text) return false;
    if (a.kind === "tool" && b.kind === "tool" && (a.id !== b.id || a.name !== b.name || a.partialJson !== b.partialJson)) return false;
  }
  return true;
}

// Stable fallbacks — React useSyncExternalStore requires getSnapshot to return
// cached references. Returning `emptyBucket(true)` every call caused:
// "The result of getSnapshot should be cached to avoid an infinite loop"
// which blanked the chat (no input rows / no stream / stuck loader).
const EMPTY_BUCKET_IDLE = emptyBucket(false);
const EMPTY_BUCKET_PENDING = emptyBucket(true);

export function useOfficialCodeSessionBucket(sessionId?: string) {
  return useStore(officialCodeSessionStore, (state) => {
    if (!sessionId) return EMPTY_BUCKET_IDLE;
    return state.buckets[sessionId] ?? EMPTY_BUCKET_PENDING;
  });
}

export function officialCodeSessionHasContent(sessionId: string) {
  const bucket = officialCodeSessionStore.getState().buckets[sessionId];
  return bucket ? hasRenderableContent(bucket) : false;
}

export { hasRenderableContent as officialCodeSessionBucketHasContent, emptyBucket as emptyOfficialCodeSessionBucket };
