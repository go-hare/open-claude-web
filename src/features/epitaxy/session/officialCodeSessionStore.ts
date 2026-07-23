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
import { emitResponseCompletion } from "../../settings/responseCompletionNotify";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";
import {
  extractOfficialLiveMeta,
  foldOfficialLiveMeta,
  foldOfficialStatusPermissionMode,
  type OfficialLiveMeta,
} from "./officialLiveMeta";

export type StreamActivityMode = "idle" | "requesting" | "thinking" | "responding" | "tool-use";

export const idleStreamActivityMode: StreamActivityMode = "idle";

/** Official index-BELzQL5P `Hke` — stable empty array for queuedMessages. */
export const EMPTY_QUEUED_MESSAGES: ChatMessage[] = [];

export type OfficialCodeSessionBucket = {
  error: Error | null;
  /** True while first transcript fetch is in flight and bucket has no messages yet. */
  isTranscriptPending: boolean;
  /** True while session meta fetch is in flight and bucket has no session yet. */
  isMetaPending: boolean;
  isSessionNotFound: boolean;
  /**
   * Official index-BELzQL5P `liveMeta` (Fke/Uke).
   * CLI system init/status permissionMode + model — not wiped by stale session_updated.
   */
  liveMeta: OfficialLiveMeta | null;
  messages: ChatMessage[];
  /**
   * Official `queuedMessages` (Hke/Jke) — user sends while a turn is still pending.
   * Rendered as Hb `isQueued` tail (opacity-50 + Remove X), not in main transcript.
   */
  queuedMessages: ChatMessage[];
  /**
   * Official `pendingQueuedSends` — count of in-flight mid-turn sends awaiting user echo.
   * When > 0, durable non-synthetic user messages land in queuedMessages instead of messages.
   */
  pendingQueuedSends: number;
  pendingTurnStartedAt: number | null;
  /**
   * Official index-BELzQL5P `compactionStatus` (d_e / Gv).
   * Set from system/status `status` (any string; Gv chrome only for `"compacting"`); cleared on result settle.
   */
  compactionStatus: string | null;
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
    liveMeta: null,
    messages: [],
    queuedMessages: EMPTY_QUEUED_MESSAGES,
    pendingQueuedSends: 0,
    pendingTurnStartedAt: null,
    compactionStatus: null,
    session: null,
    streamActivityMode: idleStreamActivityMode,
    streamingMessageId: null,
    streamSnapshot: null,
    loadGeneration: 0,
  };
}

function sessionWithLiveMeta(session: SessionSummary | null, liveMeta: OfficialLiveMeta | null): SessionSummary | null {
  if (!session || !liveMeta) return session;
  const next = { ...session };
  if (liveMeta.permissionMode) next.permissionMode = liveMeta.permissionMode;
  if (liveMeta.model) next.model = liveMeta.model;
  return next;
}

function liveMetaFromMessages(messages: ChatMessage[]): OfficialLiveMeta | null {
  return foldOfficialLiveMeta(messages.map((message) => message.raw ?? message));
}

function statusPermissionModeFromMessages(messages: ChatMessage[]): string | undefined {
  return foldOfficialStatusPermissionMode(messages.map((message) => message.raw ?? message));
}

/**
 * Load / reseed path for Mode pill (official ion-dist):
 * - Host session.permissionMode is the seed (`be(n.permissionMode)`).
 * - system/status in transcript recovers EnterPlanMode when host lag left disk stale.
 * - system/init alone must not overwrite host mode (init default vs user bypass).
 * Live Fke still uses sessionWithLiveMeta via mergeLiveMeta (incoming wins).
 */
function sessionForLoad(
  session: SessionSummary | null,
  messages: ChatMessage[],
  liveMeta: OfficialLiveMeta | null,
): SessionSummary | null {
  if (!session) return null;
  const next = { ...session, messages };
  const statusMode = statusPermissionModeFromMessages(messages);
  if (statusMode) next.permissionMode = statusMode;
  else if (liveMeta?.permissionMode && !session.permissionMode) {
    next.permissionMode = liveMeta.permissionMode;
  }
  // Model from liveMeta/init is fine to fill gaps; do not invent over host model when set.
  if (liveMeta?.model && (!session.model || session.model === "default")) {
    next.model = liveMeta.model;
  }
  return next;
}

/**
 * Warm reload: keep existing liveMeta (including user Mode menu + live Fke) over
 * re-folding the full transcript, which may end on an older status if desktop has
 * not yet persisted the latest mode. Cold open (prev null) uses fold only.
 * Live Fke merges use `{...prev, ...incoming}` instead (incoming wins).
 *
 * Official reseed uses `{...Uke(incoming), ...existingLiveMeta}` (existing wins).
 */
function liveMetaPreferCurrent(
  prev: OfficialLiveMeta | null,
  folded: OfficialLiveMeta | null,
): OfficialLiveMeta | null {
  if (!prev && !folded) return null;
  return { ...(folded ?? {}), ...(prev ?? {}) };
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
  /**
   * Official noteQueuedSend — only bumps pendingQueuedSends when a turn is already pending.
   * Gr onMutate always calls this before beginPendingTurn / echo.
   */
  noteQueuedSend: (sessionId: string) => void;
  /**
   * Optimistic mid-turn user bubble into queuedMessages (local Hb path).
   * Official local waits for CLI echo; we seed the queue immediately so isQueued chrome shows.
   */
  enqueueQueuedMessage: (sessionId: string, message: ChatMessage) => void;
  /** Official dropQueuedMessage — Remove queued message / cancel mid-turn send. */
  dropQueuedMessage: (sessionId: string, uuid: string) => void;
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
  /**
   * Official Fke merge into bucket.liveMeta.
   * `mirrorPermissionMode` (default true): write permissionMode onto session for Mode pill.
   * Pass false for system/init — official pill seeds from host session, not Uke(init).
   */
  mergeLiveMeta: (
    sessionId: string,
    meta: OfficialLiveMeta | null | undefined,
    options?: { mirrorPermissionMode?: boolean },
  ) => void;
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

/**
 * Local optimistic user rows (beginPendingTurn / enqueueQueuedMessage).
 * Official uses the client-supplied uuid for zke identity; we also stamp
 * `isLocalOptimistic` so promote-by-text still works if the host rewrites uuid.
 */
function isOptimisticLocalUser(message: ChatMessage) {
  if (message.role !== "user") return false;
  const raw = message.raw && typeof message.raw === "object"
    ? message.raw as Record<string, unknown>
    : {};
  if (raw.isLocalOptimistic === true) return true;
  return message.id.startsWith("local-user-")
    || String(raw.uuid ?? "").startsWith("local-user-");
}

/** HMR / pre-queue store snapshots may lack queued fields — normalize before read/write. */
function withQueueDefaults(bucket: OfficialCodeSessionBucket): OfficialCodeSessionBucket {
  const hasQueue = Array.isArray(bucket.queuedMessages) && typeof bucket.pendingQueuedSends === "number";
  const hasCompaction = "compactionStatus" in bucket;
  if (hasQueue && hasCompaction) return bucket;
  return {
    ...bucket,
    queuedMessages: Array.isArray(bucket.queuedMessages) ? bucket.queuedMessages : EMPTY_QUEUED_MESSAGES,
    pendingQueuedSends: typeof bucket.pendingQueuedSends === "number" ? bucket.pendingQueuedSends : 0,
    compactionStatus: hasCompaction ? bucket.compactionStatus : null,
  };
}

/**
 * Official index-BELzQL5P:
 *   v = system/status with `"status" in e` → e.status (any string, incl. compacting|complete|failed)
 * Gv only treats `compacting` as compacting chrome; failed/complete leave that branch.
 */
function compactionStatusFromMessage(raw: Record<string, unknown>): string | undefined {
  if (raw.type !== "system" || raw.subtype !== "status") return undefined;
  if (!("status" in raw)) return undefined;
  return typeof raw.status === "string" ? raw.status : undefined;
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

const OFFICIAL_CODE_SESSION_STORE_KEY = "__hareOfficialCodeSessionStore__";

function createOfficialCodeSessionStore() {
  return createStore<OfficialCodeSessionStore>((set, get) => ({
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
      const messagesToKeep = nextMessages.length > 0 || prev.messages.length === 0 ? nextMessages : prev.messages;
      const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(messagesToKeep));
      const baseSession = prev.session
        ? { ...prev.session, messages: nextMessages.length ? nextMessages : prev.session.messages }
        : prev.session;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isSessionNotFound: false,
            liveMeta,
            messages: messagesToKeep,
            // Load path: host mode + status recovery (not full Uke init overwrite).
            session: sessionForLoad(baseSession, messagesToKeep, liveMeta),
          },
        },
      };
    });
  },

  openSession: (sessionId, session, messages) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const nextMessages = messages ? filterStreamEvents(messages) : prev.messages;
      const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(nextMessages));
      const baseSession = session
        ? { ...session, messages: nextMessages.length ? nextMessages : session.messages ?? nextMessages }
        : prev.session;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isMetaPending: false,
            isTranscriptPending: messages ? false : prev.isTranscriptPending && nextMessages.length === 0,
            isSessionNotFound: session === null && nextMessages.length === 0,
            liveMeta,
            messages: nextMessages,
            // Host session.permissionMode + system/status recovery (official be(n.permissionMode)).
            session: sessionForLoad(baseSession, nextMessages, liveMeta),
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

  // Official noteQueuedSend: only when pendingTurn already set (mid-turn follow-up).
  noteQueuedSend: (sessionId) => {
    set((state) => {
      const raw = state.buckets[sessionId];
      if (!raw) return state;
      const prev = withQueueDefaults(raw);
      const turnActive = prev.pendingTurnStartedAt !== null
        || prev.session?.isRunning === true
        || prev.streamActivityMode !== idleStreamActivityMode
        || prev.streamingMessageId !== null
        || prev.streamSnapshot !== null;
      if (!turnActive) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            pendingQueuedSends: prev.pendingQueuedSends + 1,
          },
        },
      };
    });
  },

  enqueueQueuedMessage: (sessionId, message) => {
    set((state) => {
      const prev = withQueueDefaults(state.buckets[sessionId] ?? emptyBucket(false));
      const identity = messageIdentity(message);
      if (prev.queuedMessages.some((item) => messageIdentity(item) === identity)) {
        return state;
      }
      // Local optimistic seed is the stand-in for official CLI user echo into
      // queuedMessages (index d path decrements pendingQueuedSends there). Consume one
      // pending slot so cancel/drop leaves the same 0 pending + N queue shape as official
      // post-echo, and same-uuid durable echo still updates the queued row in place.
      const pendingQueuedSends = prev.pendingQueuedSends > 0
        ? prev.pendingQueuedSends - 1
        : prev.pendingQueuedSends;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isMetaPending: false,
            queuedMessages: [...prev.queuedMessages, message],
            pendingQueuedSends,
          },
        },
      };
    });
  },

  dropQueuedMessage: (sessionId, uuid) => {
    set((state) => {
      const raw = state.buckets[sessionId];
      if (!raw) return state;
      const prev = withQueueDefaults(raw);
      const queuedMessages = prev.queuedMessages.filter((message) => messageIdentity(message) !== uuid);
      const removed = queuedMessages.length < prev.queuedMessages.length;
      // Official: if no matching queued row, still decrement pendingQueuedSends when > 0
      // (cancel before CLI user echo lands).
      const decrementPending = !removed && prev.pendingQueuedSends > 0;
      if (!removed && !decrementPending) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            queuedMessages: queuedMessages.length > 0 ? queuedMessages : EMPTY_QUEUED_MESSAGES,
            pendingQueuedSends: decrementPending
              ? prev.pendingQueuedSends - 1
              : prev.pendingQueuedSends,
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
        const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(messages));
        // While live: still apply status recovery; liveMeta from live Fke already on prev.
        const baseSession = payload.session
          ? { ...prev.session, ...payload.session, id: payload.session.id, messages } as SessionSummary
          : prev.session
            ? { ...prev.session, messages }
            : null;
        return {
          buckets: {
            ...state.buckets,
            [sessionId]: {
              ...prev,
              error: null,
              isTranscriptPending: false,
              isMetaPending: false,
              isSessionNotFound: false,
              liveMeta,
              messages,
              session: sessionForLoad(baseSession, messages, liveMeta)
                // Keep live Fke mirror if status fold did not apply.
                ?? sessionWithLiveMeta(baseSession, liveMeta),
            },
          },
        };
      }
      const nextMessages = filterStreamEvents(payload.messages);
      // Always union — never wholesale-replace history (even when settled).
      const messages = mergeTranscriptUnion(prev.messages, nextMessages);
      const sessionSettled = payload.session ? payload.session.isRunning !== true : true;
      const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(messages));
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            isTranscriptPending: false,
            isMetaPending: false,
            isSessionNotFound: false,
            liveMeta,
            messages,
            session: payload.session
              ? sessionForLoad({ ...payload.session, messages }, messages, liveMeta)
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
      // Metadata-only patches (title / isRunning / pending permissions from getSession)
      // must not clobber oe(sessionId) history. Sparse session.messages was wiping
      // parent_tool_use_id rows and task_started prompts → empty OfficialSubagentPane.
      const { messages: _patchMessages, ...metaPatch } = patch as SessionSummary & {
        messages?: ChatMessage[];
      };
      // Protect Mode pill when session already mirrors a live mode (system/status or user
      // menu). liveMeta may still hold system/init permissionMode for bookkeeping — do
      // NOT treat init-only liveMeta as authority over host/session Mode pill.
      // Official seeds Mode from host session.permissionMode (`be(n.permissionMode)`).
      const sessionMode = prev.session?.permissionMode;
      const liveMode = prev.liveMeta?.permissionMode;
      const sessionAlreadyMirrorsLiveMode = Boolean(
        liveMode && sessionMode && liveMode === sessionMode,
      );
      if (
        sessionAlreadyMirrorsLiveMode
        && "permissionMode" in metaPatch
        && (metaPatch as { permissionMode?: string }).permissionMode !== liveMode
      ) {
        // Incoming host meta is older than live status/user mode already on session.
        delete (metaPatch as { permissionMode?: string }).permissionMode;
      }
      if (prev.liveMeta?.model && prev.session?.model && prev.liveMeta.model === prev.session.model && "model" in metaPatch) {
        const incomingModel = (metaPatch as { model?: string }).model;
        if (incomingModel && incomingModel !== prev.liveMeta.model) {
          // keep live model when session already mirrors it and incoming differs (stale)
          delete (metaPatch as { model?: string }).model;
        }
      }
      const nextSession = {
        ...(base ?? {
          id: sessionId,
          kind: "code" as const,
          title: "Coding session",
          updatedAtMs: Date.now(),
        }),
        ...metaPatch,
        id: (patch as SessionSummary).id ?? base?.id ?? sessionId,
        // Always mirror bucket.messages (official oe source of truth).
        messages: prev.messages,
      } as SessionSummary;
      // Model gap-fill from liveMeta only. Never force liveMeta.permissionMode here —
      // init default would clobber host bypass / live status already on nextSession.
      const modelFilled =
        nextSession.model
        || (prev.liveMeta?.model && prev.liveMeta.model !== "<synthetic>" ? prev.liveMeta.model : undefined);
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            isMetaPending: false,
            session: modelFilled && modelFilled !== nextSession.model
              ? { ...nextSession, model: modelFilled }
              : nextSession,
          },
        },
      };
    });
  },

  mergeLiveMeta: (sessionId, meta, options) => {
    if (!meta || Object.keys(meta).length === 0) return;
    const mirrorPermissionMode = options?.mirrorPermissionMode !== false;
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      const liveMeta = { ...prev.liveMeta, ...meta };
      const samePermission = liveMeta.permissionMode === prev.liveMeta?.permissionMode;
      const sameModel = liveMeta.model === prev.liveMeta?.model;
      const mirrorMeta: OfficialLiveMeta = mirrorPermissionMode
        ? liveMeta
        : { ...(liveMeta.model ? { model: liveMeta.model } : {}) };
      if (samePermission && sameModel && prev.session) {
        const mirrored = sessionWithLiveMeta(prev.session, mirrorMeta);
        if (
          mirrored?.permissionMode === prev.session.permissionMode
          && mirrored?.model === prev.session.model
        ) {
          // liveMeta bookkeeping may still need write when only liveMeta changed shape.
          if (samePermission && sameModel) return state;
        }
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            liveMeta,
            session: sessionWithLiveMeta(prev.session, mirrorMeta),
          },
        },
      };
    });
  },

  mergeMessage: (sessionId, message) => {
    set((state) => {
      const prev = withQueueDefaults(state.buckets[sessionId] ?? emptyBucket(false));
      const raw = message.raw ?? message;
      const rawRecord = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
      const identity = messageIdentity(message);
      const isUser = message.role === "user" || rawRecord.type === "user";
      const isSynthetic = rawRecord.isSynthetic === true || rawRecord.isMeta === true;
      const hasParentTool = Boolean(rawRecord.parent_tool_use_id);
      const turnStillActive = prev.pendingTurnStartedAt !== null
        || prev.session?.isRunning === true
        || prev.streamActivityMode !== idleStreamActivityMode
        || prev.streamingMessageId !== null
        || prev.streamSnapshot !== null
        || prev.pendingQueuedSends > 0
        || prev.queuedMessages.length > 0;
      // Same uuid already in queuedMessages:
      // - While turn active → update in place (optimistic → durable CLI echo). Do NOT promote.
      // - Official same-uuid promote-to-messages only applies after the row was already
      //   seen; for mid-turn follow-ups we keep the Hb isQueued tail until settle.
      const queuedIndex = prev.queuedMessages.findIndex((item) => messageIdentity(item) === identity);
      if (queuedIndex >= 0) {
        if (turnStillActive || prev.pendingQueuedSends > 0) {
          const nextQueued = prev.queuedMessages.slice();
          nextQueued[queuedIndex] = preferRicherChatMessage(nextQueued[queuedIndex]!, message);
          return {
            buckets: {
              ...state.buckets,
              [sessionId]: {
                ...prev,
                isTranscriptPending: false,
                queuedMessages: nextQueued,
                // Consume one pending slot when durable echo replaces optimistic.
                pendingQueuedSends: prev.pendingQueuedSends > 0
                  ? prev.pendingQueuedSends - 1
                  : prev.pendingQueuedSends,
              },
            },
          };
        }
        // Settled: promote queued row into main transcript (official re-delivery path).
        if (prev.messages.every((item) => messageIdentity(item) !== identity)) {
          const promoted = preferRicherChatMessage(prev.queuedMessages[queuedIndex]!, message);
          const nextQueued = [
            ...prev.queuedMessages.slice(0, queuedIndex),
            ...prev.queuedMessages.slice(queuedIndex + 1),
          ];
          const messages = filterStreamEvents(upsertMessage(prev.messages, promoted));
          return {
            buckets: {
              ...state.buckets,
              [sessionId]: {
                ...prev,
                isTranscriptPending: false,
                messages,
                queuedMessages: nextQueued.length > 0 ? nextQueued : EMPTY_QUEUED_MESSAGES,
                session: prev.session ? { ...prev.session, messages } : prev.session,
              },
            },
          };
        }
      }
      // Official d: mid-turn durable user echo while pendingQueuedSends > 0 → queue, not transcript.
      const routeToQueue = prev.pendingQueuedSends > 0
        && isUser
        && !isSynthetic
        && !hasParentTool
        && !isOptimisticLocalUser(message);
      if (routeToQueue) {
        // Prefer replacing optimistic queued row by text match / local-user id, else append.
        let queuedMessages = prev.queuedMessages.slice();
        const optimisticIdx = [...queuedMessages]
          .map((item, i) => ({ item, i }))
          .reverse()
          .find(({ item }) => isOptimisticLocalUser(item) && item.text.trim() === message.text.trim())?.i;
        if (optimisticIdx !== undefined) {
          queuedMessages[optimisticIdx] = message;
        } else if (!queuedMessages.some((item) => messageIdentity(item) === identity)) {
          queuedMessages = [...queuedMessages, message];
        }
        return {
          buckets: {
            ...state.buckets,
            [sessionId]: {
              ...prev,
              isTranscriptPending: false,
              queuedMessages,
              pendingQueuedSends: Math.max(0, prev.pendingQueuedSends - 1),
            },
          },
        };
      }
      // Official result/error settle: append remaining queue into messages and clear queue.
      const isResult = rawRecord.type === "result" && !hasParentTool;
      const isApiError = !isUser
        && (rawRecord.type === "assistant" || message.role === "assistant")
        && rawRecord.isApiErrorMessage === true
        && prev.pendingTurnStartedAt !== null;
      const settleQueue = (isResult || isApiError)
        && (prev.queuedMessages.length > 0 || prev.pendingQueuedSends > 0);
      let messages = filterStreamEvents(upsertMessage(prev.messages, message));
      if (settleQueue && prev.queuedMessages.length > 0) {
        for (const queued of prev.queuedMessages) {
          messages = upsertMessage(messages, queued);
        }
      }
      const fromMessage = extractOfficialLiveMeta(raw);
      const liveMeta = fromMessage ? { ...prev.liveMeta, ...fromMessage } : prev.liveMeta;
      // Official v / compactionStatus from system/status; clear on result/error settle (h).
      const nextCompaction = compactionStatusFromMessage(rawRecord);
      const compactionStatus = isResult || isApiError
        ? null
        : (nextCompaction !== undefined ? nextCompaction : prev.compactionStatus);
      const messagesUnchanged = messages === prev.messages || (messages.length === prev.messages.length
        && messages.every((item, index) => item === prev.messages[index]));
      const liveUnchanged = liveMeta?.permissionMode === prev.liveMeta?.permissionMode
        && liveMeta?.model === prev.liveMeta?.model;
      const queueUnchanged = !settleQueue;
      const compactionUnchanged = compactionStatus === prev.compactionStatus;
      if (messagesUnchanged && liveUnchanged && queueUnchanged && compactionUnchanged) {
        return state;
      }
      // Official Mode pill: only system/status mirrors permissionMode onto session.
      // system/init updates liveMeta bookkeeping but must not clobber host mode.
      const isStatus =
        rawRecord.type === "system" && rawRecord.subtype === "status";
      const mirrorMeta: OfficialLiveMeta | null = liveMeta
        ? isStatus
          ? liveMeta
          : (liveMeta.model ? { model: liveMeta.model } : null)
        : null;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            isTranscriptPending: false,
            liveMeta,
            messages,
            compactionStatus,
            ...(settleQueue
              ? { queuedMessages: EMPTY_QUEUED_MESSAGES, pendingQueuedSends: 0 }
              : {}),
            session: sessionWithLiveMeta(
              prev.session ? { ...prev.session, messages } : prev.session,
              mirrorMeta,
            ),
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
    let shouldNotifyCompletion = false;
    set((state) => {
      const raw = state.buckets[sessionId];
      if (!raw) return state;
      const prev = withQueueDefaults(raw);
      // Official settle (result/error): remaining queuedMessages append into messages.
      // clearStream(true) is our local settle path (stop / stream end).
      let messages = prev.messages;
      let queuedMessages = prev.queuedMessages;
      let pendingQueuedSends = prev.pendingQueuedSends;
      if (markSessionSettled && (queuedMessages.length > 0 || pendingQueuedSends > 0)) {
        if (queuedMessages.length > 0) {
          for (const queued of queuedMessages) {
            messages = upsertMessage(messages, queued);
          }
        }
        queuedMessages = EMPTY_QUEUED_MESSAGES;
        pendingQueuedSends = 0;
      }
      // Only notify when a live turn actually settles (was streaming / running).
      if (
        markSessionSettled
        && (prev.streamActivityMode !== idleStreamActivityMode
          || prev.streamingMessageId
          || prev.session?.isRunning === true
          || prev.pendingTurnStartedAt != null)
      ) {
        shouldNotifyCompletion = true;
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            messages,
            queuedMessages,
            pendingQueuedSends,
            // Official clearPendingTurn / result settle also clears compactionStatus.
            compactionStatus: markSessionSettled ? null : prev.compactionStatus,
            pendingTurnStartedAt: null,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
            session: markSessionSettled && prev.session
              ? { ...prev.session, isRunning: false, messages }
              : prev.session
                ? { ...prev.session, messages }
                : prev.session,
          },
        },
      };
    });
    if (shouldNotifyCompletion) {
      emitResponseCompletion({ title: "Claude", body: "Response complete" });
    }
  },
}));
}

/**
 * HMR-safe singleton. Vite can re-evaluate this module and create a second
 * zustand store; React fiber would keep the old instance while dynamic
 * import()/tooling sees empty buckets. Cache on globalThis so one store wins.
 *
 * When the action surface grows (e.g. noteQueuedSend / queuedMessages), replace the
 * singleton and migrate buckets so HMR does not leave a stale pre-queue store alive.
 */
type OfficialCodeSessionStoreGlobal = typeof globalThis & {
  [OFFICIAL_CODE_SESSION_STORE_KEY]?: ReturnType<typeof createOfficialCodeSessionStore>;
};

function migrateBucketsWithQueueDefaults(
  buckets: Record<string, OfficialCodeSessionBucket>,
): Record<string, OfficialCodeSessionBucket> {
  const next: Record<string, OfficialCodeSessionBucket> = {};
  for (const [sessionId, bucket] of Object.entries(buckets)) {
    next[sessionId] = withQueueDefaults(bucket);
  }
  return next;
}

/**
 * Bump when queue pipeline action bodies change so HMR rebinds implementations
 * without wiping transcript buckets (zustand keeps old closures otherwise).
 */
const OFFICIAL_CODE_SESSION_STORE_QUEUE_REV = 5;
const OFFICIAL_CODE_SESSION_STORE_REV_KEY = "__hareOfficialCodeSessionStoreQueueRev__";

function resolveOfficialCodeSessionStore() {
  const globalStore = globalThis as OfficialCodeSessionStoreGlobal & {
    [OFFICIAL_CODE_SESSION_STORE_REV_KEY]?: number;
  };
  const existing = globalStore[OFFICIAL_CODE_SESSION_STORE_KEY];
  const prevRev = globalStore[OFFICIAL_CODE_SESSION_STORE_REV_KEY] ?? 0;
  if (existing) {
    const state = existing.getState() as OfficialCodeSessionStore & {
      noteQueuedSend?: unknown;
    };
    const hasQueueActions = typeof state.noteQueuedSend === "function";
    if (hasQueueActions && prevRev === OFFICIAL_CODE_SESSION_STORE_QUEUE_REV) {
      return existing;
    }
    // Shape / action-body upgrade: rebuild store, keep transcript buckets.
    const upgraded = createOfficialCodeSessionStore();
    upgraded.setState({
      buckets: migrateBucketsWithQueueDefaults(state.buckets ?? {}),
    });
    globalStore[OFFICIAL_CODE_SESSION_STORE_KEY] = upgraded;
    globalStore[OFFICIAL_CODE_SESSION_STORE_REV_KEY] = OFFICIAL_CODE_SESSION_STORE_QUEUE_REV;
    return upgraded;
  }
  const created = createOfficialCodeSessionStore();
  globalStore[OFFICIAL_CODE_SESSION_STORE_KEY] = created;
  globalStore[OFFICIAL_CODE_SESSION_STORE_REV_KEY] = OFFICIAL_CODE_SESSION_STORE_QUEUE_REV;
  return created;
}

export const officialCodeSessionStore = resolveOfficialCodeSessionStore();

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
    const bucket = state.buckets[sessionId];
    if (!bucket) return EMPTY_BUCKET_PENDING;
    return withQueueDefaults(bucket);
  });
}

export function officialCodeSessionHasContent(sessionId: string) {
  const bucket = officialCodeSessionStore.getState().buckets[sessionId];
  return bucket ? hasRenderableContent(bucket) : false;
}

export { hasRenderableContent as officialCodeSessionBucketHasContent, emptyBucket as emptyOfficialCodeSessionBucket };
