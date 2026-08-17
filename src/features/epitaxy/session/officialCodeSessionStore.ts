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
import { officialUserMessageIsInterrupt } from "./officialTranscriptParse";
import { officialMarkTurnStarted } from "./officialStreamSessionStore";

export type StreamActivityMode = "idle" | "requesting" | "thinking" | "responding" | "tool-use";

export const idleStreamActivityMode: StreamActivityMode = "idle";

/** Official index-BELzQL5P `Hke` — stable empty array for queuedMessages. */
export const EMPTY_QUEUED_MESSAGES: ChatMessage[] = [];

export type OfficialCodeSessionBucket = {
  error: Error | null;
  /** Official tm errorCategory for FM/si residual; null when unknown. */
  errorCategory: string | null;
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
   * Official `pendingTurn.endTurnSeen` (index-BELzQL5P).
   * Set on durable assistant stop_reason=end_turn (`p`); cleared when pendingTurn resets.
   * Xke / pe = pendingTurn && !endTurnSeen — end_turn alone does NOT Pke.clear / lift Va.
   */
  pendingTurnEndTurnSeen: boolean;
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
    errorCategory: null,
    isTranscriptPending: pending,
    isMetaPending: pending,
    isSessionNotFound: false,
    liveMeta: null,
    messages: [],
    queuedMessages: EMPTY_QUEUED_MESSAGES,
    pendingQueuedSends: 0,
    pendingTurnStartedAt: null,
    pendingTurnEndTurnSeen: false,
    compactionStatus: null,
    session: null,
    streamActivityMode: idleStreamActivityMode,
    streamingMessageId: null,
    streamSnapshot: null,
    loadGeneration: 0,
  };
}

/**
 * Official Qke / cowork hydrate: host `isRunning` means an open pendingTurn until
 * result/error/clear. Seed only when missing — never invent sticky busy for idle,
 * never clear endTurnSeen on an already-open turn.
 * Also stamps je (turnStartedAt) so Gv spark elapsed does not wait on first stream tick.
 */
function seedPendingTurnIfHostRunning(
  prev: OfficialCodeSessionBucket,
  session: SessionSummary | null | undefined,
  sessionId: string,
): Pick<OfficialCodeSessionBucket, "pendingTurnStartedAt" | "pendingTurnEndTurnSeen"> {
  if (session?.isRunning !== true) {
    return {
      pendingTurnStartedAt: prev.pendingTurnStartedAt,
      pendingTurnEndTurnSeen: prev.pendingTurnEndTurnSeen,
    };
  }
  if (prev.pendingTurnStartedAt !== null) {
    return {
      pendingTurnStartedAt: prev.pendingTurnStartedAt,
      pendingTurnEndTurnSeen: prev.pendingTurnEndTurnSeen,
    };
  }
  const at = Date.now();
  officialMarkTurnStarted(sessionId, at);
  // pendingTurn only — do NOT invent streamActivityMode requesting. That would make
  // host isRunning=false treat the seed as live stream and sticky-busy forever.
  // H = pendingTurn || isRunning || real Va/queue; re-entry spark comes from those.
  return {
    pendingTurnStartedAt: at,
    pendingTurnEndTurnSeen: false,
  };
}

function sessionWithLiveMeta(session: SessionSummary | null, liveMeta: OfficialLiveMeta | null): SessionSummary | null {
  if (!session || !liveMeta) return session;
  const next = { ...session };
  if (liveMeta.permissionMode) next.permissionMode = liveMeta.permissionMode;
  // densable system/init (and root assistant) may report a resolved id that differs
  // from bag/host selection (e.g. grok-4.5 → grok-4.5-build). Footer/composer seed
  // from session.model — only gap-fill empty/default, never clobber user bag id.
  // Same spirit as sessionForLoad model path + Mode init policy.
  if (
    liveMeta.model
    && liveMeta.model !== "<synthetic>"
    && (!session.model || session.model === "default")
  ) {
    next.model = liveMeta.model;
  }
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

/**
 * Content that can paint Ya (transcript entries / live Va). Session meta alone is NOT
 * transcript content — Recents openSession(meta) must still leave Ja pending until
 * getTranscript lands (official: Ja = sessionId && Ya.length===0 && (B||J)).
 */
function hasTranscriptContent(bucket: OfficialCodeSessionBucket) {
  return bucket.messages.length > 0 || bucket.streamSnapshot !== null;
}

function hasRenderableContent(bucket: OfficialCodeSessionBucket) {
  return hasTranscriptContent(bucket) || bucket.session !== null;
}

type OfficialCodeSessionActions = {
  /** Official seedTranscript — replace/seed message list without wiping meta. */
  seedTranscript: (sessionId: string, messages: ChatMessage[]) => void;
  /** Official openSession — attach session meta (and optional messages). */
  openSession: (sessionId: string, session: SessionSummary | null, messages?: ChatMessage[]) => void;
  /** Official beginPendingTurn — mark turn started (optimistic send). */
  beginPendingTurn: (sessionId: string, optimisticUser?: ChatMessage) => void;
  /**
   * Official he.failPendingTurn(id, message, category?) residual.
   * Only when pendingTurn is active — sets error + errorCategory for FM shell.
   */
  failPendingTurn: (sessionId: string, message: string, errorCategory?: string | null) => void;
  /** Official clearError residual — FM Try again / next send path. */
  clearError: (sessionId: string) => void;
  /**
   * Runtime/session error with optional MAt category (non-pending path).
   * failPendingTurn remains the mid-turn residual; this covers host type:"error" when idle.
   */
  applyRuntimeError: (sessionId: string, error: Error, errorCategory?: string | null) => void;
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
  /**
   * Official markInterrupting (Wr onMutate / Pke.flush + mCe.reset).
   * Flush Va / stream flags only. Keep pendingTurn, queuedMessages, isRunning.
   */
  markInterrupting: (sessionId: string) => void;
  /**
   * Official `g` for success parent results (not mergeMessage'd).
   * Promote queuedMessages after the result, new pendingTurn, keep isRunning.
   */
  promoteQueueAndContinue: (sessionId: string) => boolean;
  /**
   * Local stream settle / stop.
   * Official result+queue+pendingTurn (`g`) is handled in mergeMessage — reset
   * pendingTurn and keep isRunning so host drain can continue.
   * `discardQueued` is host stopSession teardown only (not Esc).
   */
  clearStream: (sessionId: string, markSessionSettled?: boolean, discardQueued?: boolean) => void;
  /**
   * Drop a session bucket after host delete (official Lve residual).
   * Idempotent — missing id is a no-op.
   */
  removeSession: (sessionId: string) => void;
  getBucket: (sessionId: string) => OfficialCodeSessionBucket | undefined;
  ensureBucket: (sessionId: string) => OfficialCodeSessionBucket;
};

export type OfficialCodeSessionStore = OfficialCodeSessionState & OfficialCodeSessionActions;

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? value as Record<string, unknown> : {};
}

/**
 * Structural richness for *reload* same-outer-uuid choice only.
 * Live path never uses this — official same-uuid is pure replace (index-BELzQL5P).
 * Multi-emit different outer uuids append; eke f() merges consecutive assistants.
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

/**
 * Reload/applyLoad only: same outer uuid → keep the richer whole envelope.
 * Does NOT invent union content blocks (that was residual P1 drift from official replace).
 * Incomplete getTranscript must not wipe a fuller in-memory row of the same uuid.
 */
function preferRicherOnReload(prev: ChatMessage, next: ChatMessage): ChatMessage {
  if (prev === next) return prev;
  // Prefer envelope that carries parent_tool_use_id (host-stamped agent rows) so
  // silent getTranscript can fill OfficialSubagentPane after live rows without parent.
  const prevParent = Boolean(asRecord(prev.raw).parent_tool_use_id ?? asRecord(prev.raw).parentToolUseId);
  const nextParent = Boolean(asRecord(next.raw).parent_tool_use_id ?? asRecord(next.raw).parentToolUseId);
  if (nextParent && !prevParent) return next;
  if (prevParent && !nextParent) return prev;
  const nextScore = chatMessageRichness(next);
  const prevScore = chatMessageRichness(prev);
  if (nextScore > prevScore) return next;
  if (nextScore < prevScore) return prev;
  // Tie-break: longer plain text wins (delta growth on same structure).
  return (next.text?.length ?? 0) >= (prev.text?.length ?? 0) ? next : prev;
}

function isPlainUserPrompt(message: ChatMessage): boolean {
  if (message.role !== "user") return false;
  const raw = asRecord(message.raw);
  if (raw.parent_tool_use_id) return false;
  if (raw.isMeta === true || raw.isSynthetic === true) return false;
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  if (Array.isArray(content)) {
    for (const block of content) {
      const type = asRecord(block).type;
      if (type === "tool_result" || type === "tool_use") return false;
    }
  }
  return (message.text?.trim().length ?? 0) > 0;
}

/**
 * Plain text blocks inside a user envelope (string content → one block; array → each type:text).
 * Used to detect CLI multi-block consolidation vs host pre-echo singles.
 */
function plainUserTextBlocks(message: ChatMessage): string[] {
  if (message.role !== "user") return [];
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  if (typeof content === "string") {
    const trimmed = content.trim();
    return trimmed ? [trimmed] : [];
  }
  if (!Array.isArray(content)) {
    const trimmed = message.text?.trim() ?? "";
    return trimmed ? [trimmed] : [];
  }
  const blocks: string[] = [];
  for (const item of content) {
    const record = asRecord(item);
    const type = record.type;
    // Only plain text blocks participate in multi-block consolidations.
    if (type != null && type !== "" && type !== "text") continue;
    const text = typeof record.text === "string"
      ? record.text
      : typeof record.content === "string"
        ? record.content
        : "";
    const trimmed = text.trim();
    if (trimmed) blocks.push(trimmed);
  }
  if (blocks.length === 0) {
    const trimmed = message.text?.trim() ?? "";
    if (trimmed) return [trimmed];
  }
  return blocks;
}

function isSingleTextPlainUser(message: ChatMessage): boolean {
  return isPlainUserPrompt(message) && plainUserTextBlocks(message).length === 1;
}

function isMultiTextPlainUser(message: ChatMessage): boolean {
  return isPlainUserPrompt(message) && plainUserTextBlocks(message).length >= 2;
}

/** Multiset of text blocks from multi-block durable plain users (CLI consolidated mid-turn sends). */
function multiBlockTextMultiset(messages: Iterable<ChatMessage>): Map<string, number> {
  const counts = new Map<string, number>();
  for (const message of messages) {
    if (!isMultiTextPlainUser(message)) continue;
    for (const block of plainUserTextBlocks(message)) {
      counts.set(block, (counts.get(block) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Drop host pre-echo single-text plain users superseded by a multi-block durable user.
 * Host sendMessage residual always emits a user row per send (unique uuid); go-hare CLI may
 * later durable-write ONE multi-text user. Outer-uuid union then kept both → orphan singles
 * + multi-block pill. Absorb singles whose text is multiset-covered by multi-block rows.
 * Intentional re-sends that are themselves durable (present in `keepIds`) stay.
 */
function absorbHostPreEchoSingles(
  messages: ChatMessage[],
  multiBlockSource: Iterable<ChatMessage>,
  keepIds?: Set<string>,
): ChatMessage[] {
  const multiset = multiBlockTextMultiset(multiBlockSource);
  if (multiset.size === 0) return messages;
  let changed = false;
  const out: ChatMessage[] = [];
  for (const message of messages) {
    if (
      isSingleTextPlainUser(message)
      && (!keepIds || !keepIds.has(messageIdentity(message)))
    ) {
      const text = plainUserTextBlocks(message)[0]!;
      const remaining = multiset.get(text) ?? 0;
      if (remaining > 0) {
        if (remaining === 1) multiset.delete(text);
        else multiset.set(text, remaining - 1);
        changed = true;
        continue;
      }
    }
    out.push(message);
  }
  return changed ? out : messages;
}

/**
 * Promote host/start optimistic user seed → durable CLI echo when outer uuid differs
 * (same trimmed plain text). Intentional re-sends of the same text keep separate uuids
 * and are NOT collapsed — only isLocalOptimistic / local-user-* rows promote.
 */
function findOptimisticPlainUserIndex(messages: ChatMessage[], text: string): number | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  return [...messages]
    .map((message, i) => ({ message, i }))
    .reverse()
    .find(({ message }) => (
      isOptimisticLocalUser(message)
      && isPlainUserPrompt(message)
      && message.text.trim() === trimmed
    ))?.i;
}

function upsertMessage(messages: ChatMessage[], next: ChatMessage): ChatMessage[] {
  const identity = messageIdentity(next);
  const index = messages.findIndex((message) => messageIdentity(message) === identity);
  if (index >= 0) {
    const existing = messages[index]!;
    if (existing === next) return messages;
    // Official live path (index-BELzQL5P): same outer-uuid assistant/user replaces in place.
    // Multi-emit uses different outer uuids → append below; never mid-collapse here.
    const copy = messages.slice();
    copy[index] = next;
    // Multi-block durable replace may still need to absorb host pre-echo siblings.
    return isMultiTextPlainUser(next)
      ? absorbHostPreEchoSingles(copy, [next], new Set([identity]))
      : copy;
  }
  if (next.role === "user" && !isOptimisticLocalUser(next) && isPlainUserPrompt(next)) {
    const optimisticIndex = findOptimisticPlainUserIndex(messages, next.text);
    if (optimisticIndex !== undefined) {
      const copy = messages.slice();
      copy[optimisticIndex] = next;
      return copy;
    }
  }
  if (isMultiTextPlainUser(next)) {
    // CLI multi-block durable: drop host pre-echo singles this row consolidates.
    return [...absorbHostPreEchoSingles(messages, [next]), next];
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
  const hasEndTurnSeen = "pendingTurnEndTurnSeen" in bucket;
  if (hasQueue && hasCompaction && hasEndTurnSeen) return bucket;
  return {
    ...bucket,
    queuedMessages: Array.isArray(bucket.queuedMessages) ? bucket.queuedMessages : EMPTY_QUEUED_MESSAGES,
    pendingQueuedSends: typeof bucket.pendingQueuedSends === "number" ? bucket.pendingQueuedSends : 0,
    pendingTurnEndTurnSeen: hasEndTurnSeen ? Boolean(bucket.pendingTurnEndTurnSeen) : false,
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
 * Union-merge transcripts by outer-uuid identity. NEVER drops a previous row.
 * - Walk prev order first (stable history)
 * - Same identity: prefer richer whole envelope (reload defense only — not live replace)
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
  // Durable plain-user texts from next — used to promote prev optimistic seeds whose
  // outer uuid never matched the CLI jsonl echo (same message body, different uuid).
  const durablePlainByText = new Map<string, ChatMessage>();
  // Multi-block CLI durable (mid-turn consolidates N host pre-echoes into one row).
  // Multiset of its text blocks — absorb prev single-text rows not present in next.
  const multiBlockCoverage = multiBlockTextMultiset(next);
  for (const message of next) {
    if (
      message.role === "user"
      && !isOptimisticLocalUser(message)
      && isPlainUserPrompt(message)
    ) {
      const key = message.text.trim();
      if (!key) continue;
      const existing = durablePlainByText.get(key);
      durablePlainByText.set(
        key,
        existing ? preferRicherOnReload(existing, message) : message,
      );
    }
  }
  const consumedDurableTexts = new Set<string>();
  const out: ChatMessage[] = [];
  for (const message of prev) {
    const id = messageIdentity(message);
    seen.add(id);
    const incoming = nextById.get(id);
    if (incoming) {
      out.push(preferRicherOnReload(message, incoming));
      continue;
    }
    // Prev optimistic/start seed + next durable echo (different outer uuid, same text).
    if (isOptimisticLocalUser(message) && isPlainUserPrompt(message)) {
      const durable = durablePlainByText.get(message.text.trim());
      if (durable) {
        const durableId = messageIdentity(durable);
        seen.add(durableId);
        consumedDurableTexts.add(message.text.trim());
        out.push(preferRicherOnReload(message, durable));
        continue;
      }
    }
    // Host pre-echo single (unique uuid, not on disk) superseded by multi-block durable.
    // Official zke would not keep both; product residual: drop covered singles only.
    if (isSingleTextPlainUser(message) && multiBlockCoverage.size > 0) {
      const text = plainUserTextBlocks(message)[0]!;
      const remaining = multiBlockCoverage.get(text) ?? 0;
      if (remaining > 0) {
        if (remaining === 1) multiBlockCoverage.delete(text);
        else multiBlockCoverage.set(text, remaining - 1);
        continue;
      }
    }
    out.push(message);
  }
  for (const message of next) {
    const id = messageIdentity(message);
    if (seen.has(id)) continue;
    // Skip durable plain user already consumed via optimistic promote above.
    if (
      message.role === "user"
      && !isOptimisticLocalUser(message)
      && isPlainUserPrompt(message)
      && consumedDurableTexts.has(message.text.trim())
    ) {
      continue;
    }
    // Next durable may still need to replace a prev optimistic that was already pushed
    // only if promote missed (e.g. prev walk order). Defense: upsert-style replace.
    if (message.role === "user" && !isOptimisticLocalUser(message) && isPlainUserPrompt(message)) {
      const optimisticIndex = findOptimisticPlainUserIndex(out, message.text);
      if (optimisticIndex !== undefined) {
        out[optimisticIndex] = message;
        seen.add(id);
        continue;
      }
    }
    seen.add(id);
    out.push(message);
  }
  // Final pass: multi-block rows in `out` may still sit next to leftover singles if
  // coverage was exhausted by order; re-absorb against multi-blocks present in out.
  return absorbHostPreEchoSingles(
    out,
    out,
    new Set(
      out
        .filter((message) => isMultiTextPlainUser(message))
        .map((message) => messageIdentity(message)),
    ),
  );
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
    // Official openSession/seed creates a real bucket; do NOT invent pending=true
    // here — that made useOfficialCodeSessionBucket + isLoading flash Ja / disable
    // composer for one frame on every switch before openSession/reload ran.
    // markLoading(false-path) still sets isTranscriptPending for cold first fetch.
    const created = emptyBucket(false);
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
            errorCategory: null,
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
      // Official openSession(meta): attach session; B stays pending until messages / applyLoad.
      // Do NOT resurrect B after empty settle (messages=[], B=false, session already known).
      // Cold/missing (no session yet) or still-pending keep B=true so Ja paints.
      const transcriptPending = messages !== undefined
        ? false
        : nextMessages.length > 0
          ? false
          : prev.isTranscriptPending || prev.session === null;
      const nextSession = sessionForLoad(baseSession, nextMessages, liveMeta);
      // Host isRunning on Recents/open path → seed Qke immediately (coexist with Ja until Ya).
      const pendingSeed = seedPendingTurnIfHostRunning(prev, nextSession ?? baseSession, sessionId);
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            errorCategory: null,
            isMetaPending: session ? false : prev.isMetaPending,
            isTranscriptPending: transcriptPending,
            isSessionNotFound: session === null && nextMessages.length === 0,
            liveMeta,
            messages: nextMessages,
            // Host session.permissionMode + system/status recovery (official be(n.permissionMode)).
            session: nextSession,
            pendingTurnStartedAt: pendingSeed.pendingTurnStartedAt,
            pendingTurnEndTurnSeen: pendingSeed.pendingTurnEndTurnSeen,
          },
        },
      };
    });
  },

  beginPendingTurn: (sessionId, optimisticUser) => {
    // Official beginPendingTurn: if pendingTurn already set → no-op.
    // Else mCe.reset + Pke.clear (caller clears Pe/Va) then pendingTurn={start,endTurnSeen:false}.
    set((state) => {
      const raw = state.buckets[sessionId] ?? emptyBucket(false);
      const prev = withQueueDefaults(raw);
      if (prev.pendingTurnStartedAt !== null) return state;
      const messages = optimisticUser ? upsertMessage(prev.messages, optimisticUser) : prev.messages;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            errorCategory: null,
            isTranscriptPending: false,
            isMetaPending: false,
            messages,
            pendingTurnStartedAt: Date.now(),
            pendingTurnEndTurnSeen: false,
            // Residual: Pke.clear companion — lift prior Va ownership flags for the new turn.
            streamActivityMode: "requesting",
            streamingMessageId: null,
            streamSnapshot: null,
            session: prev.session ? { ...prev.session, isRunning: true, messages } : prev.session,
          },
        },
      };
    });
  },

  // Official failPendingTurn: only when pendingTurn set → error + category (bridge_offline path).
  failPendingTurn: (sessionId, message, errorCategory) => {
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev || prev.pendingTurnStartedAt === null) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: new Error(message),
            errorCategory: errorCategory ?? null,
            pendingTurnStartedAt: null,
            pendingTurnEndTurnSeen: false,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
            session: prev.session ? { ...prev.session, isRunning: false } : prev.session,
          },
        },
      };
    });
  },

  clearError: (sessionId) => {
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev || (!prev.error && !prev.errorCategory)) return state;
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            errorCategory: null,
          },
        },
      };
    });
  },

  applyRuntimeError: (sessionId, error, errorCategory) => {
    set((state) => {
      const prev = state.buckets[sessionId] ?? emptyBucket(false);
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error,
            errorCategory: errorCategory ?? null,
            isTranscriptPending: false,
            isMetaPending: false,
            pendingTurnStartedAt: null,
            pendingTurnEndTurnSeen: false,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
            session: prev.session ? { ...prev.session, isRunning: false } : prev.session,
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
            errorCategory: null,
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
    const hasTranscript = hasTranscriptContent(prev);
    const hasSessionMeta = prev.session !== null;
    set((state) => ({
      buckets: {
        ...state.buckets,
        [sessionId]: {
          ...prev,
          error: null,
          errorCategory: null,
          loadGeneration: generation,
          // Official Ja B: transcript pending only when Ya empty. Session meta alone must
          // not suppress B (Recents openSession seeds session without messages).
          // Silent revalidate never blanks an already-painted transcript.
          isTranscriptPending: silent || hasTranscript ? false : true,
          isMetaPending: silent || hasSessionMeta ? false : true,
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
              errorCategory: null,
              isTranscriptPending: false,
              isMetaPending: false,
              isSessionNotFound: true,
            },
          },
        };
      }
      // Stream snapshot now lives in Pe/local Va — protect live turns via session flags.
      // Official BELz applyLoad/transcript: merge messages only — does NOT clear
      // pendingTurn / queue (g is result-gated). Silent getTranscript must not
      // invent-settle mid-turn or while deferred queue still owns continue.
      const hasDeferredQueue =
        prev.pendingQueuedSends > 0
        || prev.queuedMessages.length > 0;
      const liveStreaming = options?.preserveLiveStream
        || prev.streamSnapshot !== null
        || prev.streamingMessageId !== null
        || prev.streamActivityMode !== idleStreamActivityMode
        || prev.session?.isRunning === true
        || prev.pendingTurnStartedAt !== null
        || hasDeferredQueue
        || prev.messages.some((message) => isOptimisticLocalUser(message));
      if (liveStreaming) {
        // While a turn is live, never replace local history with a partial fetch.
        // Only append missing identities from the server payload.
        // Official: keep pendingTurn / queue / isRunning (no invent clear).
        const nextMessages = filterStreamEvents(payload.messages);
        const messages = mergeTranscriptPreserveAll(prev.messages, nextMessages);
        const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(messages));
        // While live: still apply status recovery; liveMeta from live Fke already on prev.
        const baseSession = payload.session
          ? { ...prev.session, ...payload.session, id: payload.session.id, messages } as SessionSummary
          : prev.session
            ? { ...prev.session, messages }
            : null;
        // Host isRunning mirror only when payload has it; do not clear pendingTurn
        // while real Va/queue live. Cold re-entry seeds when host still running.
        const nextSession = sessionForLoad(baseSession, messages, liveMeta)
          ?? sessionWithLiveMeta(baseSession, liveMeta);
        const hasLiveStream = Boolean(
          prev.streamSnapshot !== null
          || prev.streamingMessageId !== null
          || prev.streamActivityMode !== idleStreamActivityMode,
        );
        // Bare leftover pendingTurn + host idle → settle (same as patchSession).
        // Real Va/queue keep pendingTurn even if host meta lags false.
        let pendingSeed = seedPendingTurnIfHostRunning(prev, nextSession, sessionId);
        if (
          nextSession?.isRunning !== true
          && !hasLiveStream
          && !hasDeferredQueue
          && prev.pendingTurnStartedAt !== null
        ) {
          pendingSeed = {
            pendingTurnStartedAt: null,
            pendingTurnEndTurnSeen: false,
          };
        }
        return {
          buckets: {
            ...state.buckets,
            [sessionId]: {
              ...prev,
              error: null,
              errorCategory: null,
              isTranscriptPending: false,
              isMetaPending: false,
              isSessionNotFound: false,
              liveMeta,
              messages,
              session: nextSession,
              pendingTurnStartedAt: pendingSeed.pendingTurnStartedAt,
              pendingTurnEndTurnSeen: pendingSeed.pendingTurnEndTurnSeen,
            },
          },
        };
      }
      const nextMessages = filterStreamEvents(payload.messages);
      // Always union — never wholesale-replace history (even when settled).
      const messages = mergeTranscriptUnion(prev.messages, nextMessages);
      // Official transcript load does not clear pendingTurn while host still running
      // or local Va/queue owns the turn. Host idle + no Va/queue → settle leftover.
      const hasLiveStream = Boolean(
        prev.streamSnapshot !== null
        || prev.streamingMessageId !== null
        || prev.streamActivityMode !== idleStreamActivityMode,
      );
      const hostIdle = payload.session ? payload.session.isRunning !== true : true;
      const sessionSettled = hostIdle && !hasDeferredQueue && !hasLiveStream;
      const liveMeta = liveMetaPreferCurrent(prev.liveMeta, liveMetaFromMessages(messages));
      const nextSession = payload.session
        ? sessionForLoad({ ...payload.session, messages }, messages, liveMeta)
        : null;
      // Host isRunning on getSession/getTranscript → seed pendingTurn (re-entry H).
      const pendingSeed = sessionSettled
        ? { pendingTurnStartedAt: null as number | null, pendingTurnEndTurnSeen: false }
        : seedPendingTurnIfHostRunning(prev, nextSession ?? payload.session, sessionId);
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            error: null,
            errorCategory: null,
            isTranscriptPending: false,
            isMetaPending: false,
            isSessionNotFound: false,
            liveMeta,
            messages,
            session: nextSession,
            pendingTurnStartedAt: pendingSeed.pendingTurnStartedAt,
            pendingTurnEndTurnSeen: pendingSeed.pendingTurnEndTurnSeen,
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
            errorCategory: null,
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
      let session =
        modelFilled && modelFilled !== nextSession.model
          ? { ...nextSession, model: modelFilled }
          : nextSession;
      // Host isRunning=false while real Va/queue still live = stale race. Keep busy.
      // Bare pendingTurn alone is NOT protect evidence — residual p leaves pendingTurn
      // until result; background completed must settle leftover pendingTurn (no sticky Stop).
      // streamActivityMode from real stream events counts; seed must not invent it.
      const hasLiveStream = Boolean(
        prev.streamingMessageId != null
        || prev.streamSnapshot != null
        || prev.streamActivityMode !== idleStreamActivityMode,
      );
      const hasDeferredQueue = Boolean(
        (prev.queuedMessages?.length ?? 0) > 0
        || (prev.pendingQueuedSends ?? 0) > 0,
      );
      if (session.isRunning === false && (hasLiveStream || hasDeferredQueue)) {
        session = { ...session, isRunning: true };
      }
      // Official session_updated / formatSessionForEvent: metadata + isRunning only.
      // Official web H (isResponding) = stream || isRunning || pendingTurn || queue.
      // Host isRunning true with no local pendingTurn seeds pendingTurn for re-entry H.
      let pendingSeed = seedPendingTurnIfHostRunning(prev, session, sessionId);
      if (
        session.isRunning === false
        && !hasLiveStream
        && !hasDeferredQueue
        && prev.pendingTurnStartedAt !== null
      ) {
        // Host idle + no Va/queue: settle leftover pendingTurn (unsubscribed completed).
        pendingSeed = {
          pendingTurnStartedAt: null,
          pendingTurnEndTurnSeen: false,
        };
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            isMetaPending: false,
            session,
            pendingTurnStartedAt: pendingSeed.pendingTurnStartedAt,
            pendingTurnEndTurnSeen: pendingSeed.pendingTurnEndTurnSeen,
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
          // Official same-uuid: durable CLI echo replaces optimistic queued row in place.
          const nextQueued = prev.queuedMessages.slice();
          nextQueued[queuedIndex] = message;
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
          const nextQueued = [
            ...prev.queuedMessages.slice(0, queuedIndex),
            ...prev.queuedMessages.slice(queuedIndex + 1),
          ];
          // Live/settle promote: official replace semantics — use the durable echo as-is.
          const messages = filterStreamEvents(upsertMessage(prev.messages, message));
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
      // Official _ke interrupt marker is a current-turn user row, never a queued follow-up.
      const isInterruptUser = isUser && officialUserMessageIsInterrupt(rawRecord);
      const routeToQueue = prev.pendingQueuedSends > 0
        && isUser
        && !isSynthetic
        && !hasParentTool
        && !isOptimisticLocalUser(message)
        && !isInterruptUser;
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
      // Official index-BELzQL5P merge residual (literal):
      //   u = type==="result" && !parent
      //   m = apiError assistant while pendingTurn
      //   h = u || m          → settle: messages += [n, ...queuedMessages], clear queue
      //   f = queue nonempty
      //   g = u && f && pendingTurn  → new pendingTurn (continue)
      //   p = assistant end_turn → only endTurnSeen; does NOT promote queue
      // Inventing promote-on-end_turn strips Hb isQueued chrome (opacity + Remove).
      const isResult = rawRecord.type === "result" && !hasParentTool;
      const isApiError = !isUser
        && (rawRecord.type === "assistant" || message.role === "assistant")
        && rawRecord.isApiErrorMessage === true
        && prev.pendingTurnStartedAt !== null;
      const nestedAssistant = asRecord(rawRecord.message);
      const isEndTurnAssistant = !isUser
        && !hasParentTool
        && (rawRecord.type === "assistant" || message.role === "assistant")
        && nestedAssistant.stop_reason === "end_turn";
      const hasQueue = prev.queuedMessages.length > 0 || prev.pendingQueuedSends > 0;
      // Official h: result or api-error settles and dumps queue into messages.
      const settleWithQueue = isResult || isApiError;
      // Official g: only parent result + queue + pendingTurn continues.
      const continueTurn = isResult
        && hasQueue
        && prev.pendingTurnStartedAt !== null;
      let messages = prev.messages;
      if (settleWithQueue && prev.queuedMessages.length > 0) {
        // Official: [...messages, n, ...queuedMessages]
        messages = filterStreamEvents(upsertMessage(messages, message));
        for (const queued of prev.queuedMessages) {
          messages = upsertMessage(messages, queued);
        }
      } else {
        messages = filterStreamEvents(upsertMessage(messages, message));
      }
      const fromMessage = extractOfficialLiveMeta(raw);
      const liveMeta = fromMessage ? { ...prev.liveMeta, ...fromMessage } : prev.liveMeta;
      const nextCompaction = compactionStatusFromMessage(rawRecord);
      // Official h clears compactionStatus; end_turn alone does not.
      const compactionStatus = settleWithQueue
        ? null
        : (nextCompaction !== undefined ? nextCompaction : prev.compactionStatus);
      // Official: h → pendingTurn = g ? {startTime:now,endTurnSeen:false} : null
      //           p → pendingTurn.endTurnSeen only (keep pendingTurn / queue / Va)
      const nextPendingTurn = settleWithQueue
        ? (continueTurn ? Date.now() : null)
        : prev.pendingTurnStartedAt;
      // Residual p: end_turn + pendingTurn → endTurnSeen=true. Does NOT Pke.clear / lift Va.
      const nextEndTurnSeen = settleWithQueue
        ? false
        : (isEndTurnAssistant && prev.pendingTurnStartedAt !== null
          ? true
          : prev.pendingTurnEndTurnSeen);
      const messagesUnchanged = messages === prev.messages || (messages.length === prev.messages.length
        && messages.every((item, index) => item === prev.messages[index]));
      const liveUnchanged = liveMeta?.permissionMode === prev.liveMeta?.permissionMode
        && liveMeta?.model === prev.liveMeta?.model;
      const queueUnchanged = !settleWithQueue;
      const compactionUnchanged = compactionStatus === prev.compactionStatus;
      const pendingUnchanged = nextPendingTurn === prev.pendingTurnStartedAt
        && nextEndTurnSeen === prev.pendingTurnEndTurnSeen;
      if (
        messagesUnchanged
        && liveUnchanged
        && queueUnchanged
        && compactionUnchanged
        && pendingUnchanged
      ) {
        return state;
      }
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
            pendingTurnStartedAt: nextPendingTurn,
            pendingTurnEndTurnSeen: nextPendingTurn === null ? false : nextEndTurnSeen,
            ...(settleWithQueue
              ? {
                  queuedMessages: EMPTY_QUEUED_MESSAGES,
                  pendingQueuedSends: 0,
                  // Official u&&Pke.clear — result settles Va ownership with h.
                  streamActivityMode: idleStreamActivityMode,
                  streamingMessageId: null,
                  streamSnapshot: null,
                }
              : {}),
            session: sessionWithLiveMeta(
              prev.session
                ? {
                    ...prev.session,
                    messages,
                    // Official g keeps session running; non-g result settles.
                    // end_turn does not invent isRunning=false here (host session_updated).
                    isRunning: continueTurn
                      ? true
                      : settleWithQueue
                        ? false
                        : prev.session.isRunning,
                  }
                : prev.session,
              mirrorMeta,
            ),
          },
        },
      };
    });
  },

  promoteQueueAndContinue: (sessionId) => {
    let continued = false;
    set((state) => {
      const raw = state.buckets[sessionId];
      if (!raw) return state;
      const prev = withQueueDefaults(raw);
      if (prev.queuedMessages.length === 0 && prev.pendingQueuedSends === 0) return state;
      continued = true;
      let messages = prev.messages;
      for (const queued of prev.queuedMessages) {
        messages = upsertMessage(messages, queued);
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            messages,
            queuedMessages: EMPTY_QUEUED_MESSAGES,
            pendingQueuedSends: 0,
            pendingTurnStartedAt: Date.now(),
            pendingTurnEndTurnSeen: false,
            compactionStatus: null,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
            session: prev.session ? { ...prev.session, messages, isRunning: true } : prev.session,
          },
        },
      };
    });
    return continued;
  },

  markInterrupting: (sessionId) => {
    // Official Wr onMutate: Pke.flush + mCe.reset only. Do not clearPendingTurn,
    // queuedMessages, or isRunning — interrupt then continues the queue.
    set((state) => {
      const prev = state.buckets[sessionId];
      if (!prev) return state;
      if (
        prev.streamActivityMode === idleStreamActivityMode
        && prev.streamingMessageId === null
        && prev.streamSnapshot === null
      ) {
        return state;
      }
      return {
        buckets: {
          ...state.buckets,
          [sessionId]: {
            ...prev,
            streamActivityMode: idleStreamActivityMode,
            streamingMessageId: null,
            streamSnapshot: null,
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
      // Residual: new/cleared pendingTurn resets endTurnSeen; keep flag when only stream flags patch.
      const pendingTurnEndTurnSeen = patch.pendingTurnStartedAt !== undefined || pendingTurnStartedAt === null
        ? false
        : prev.pendingTurnEndTurnSeen;
      const streamActivityMode = patch.streamActivityMode ?? prev.streamActivityMode;
      const streamingMessageId = patch.streamingMessageId !== undefined
        ? patch.streamingMessageId
        : prev.streamingMessageId;
      const session = prev.session && patch.isRunning !== undefined
        ? (prev.session.isRunning === patch.isRunning ? prev.session : { ...prev.session, isRunning: patch.isRunning })
        : prev.session;
      if (
        pendingTurnStartedAt === prev.pendingTurnStartedAt
        && pendingTurnEndTurnSeen === prev.pendingTurnEndTurnSeen
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
            pendingTurnEndTurnSeen,
            streamActivityMode,
            streamingMessageId,
            session,
          },
        },
      };
    });
  },

  clearStream: (sessionId, markSessionSettled = false, discardQueued = false) => {
    let shouldNotifyCompletion = false;
    set((state) => {
      const raw = state.buckets[sessionId];
      if (!raw) return state;
      const prev = withQueueDefaults(raw);
      // Official result/error/done: remaining queuedMessages append into messages.
      // Esc is markInterrupting + interrupt (not clearPendingTurn / not discard).
      // discardQueued is stopSession teardown only (stopped/close/cleared).
      let messages = prev.messages;
      let queuedMessages = prev.queuedMessages;
      let pendingQueuedSends = prev.pendingQueuedSends;
      if (markSessionSettled && (queuedMessages.length > 0 || pendingQueuedSends > 0)) {
        if (!discardQueued && queuedMessages.length > 0) {
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
            pendingTurnEndTurnSeen: false,
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

  removeSession: (sessionId) => {
    if (!sessionId) return;
    set((state) => {
      if (!state.buckets[sessionId]) return state;
      const { [sessionId]: _removed, ...remaining } = state.buckets;
      return { buckets: remaining };
    });
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
const OFFICIAL_CODE_SESSION_STORE_QUEUE_REV = 10;
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
      removeSession?: unknown;
    };
    const hasQueueActions = typeof state.noteQueuedSend === "function"
      && typeof state.removeSession === "function"
      && typeof (state as { markInterrupting?: unknown }).markInterrupting === "function";
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
    // Official he.buckets[id] missing → treat as idle empty, not invent pending Ja.
    // Cold open sets pending via markLoading / openSession meta-only path.
    // Returning EMPTY_BUCKET_PENDING here disabled composer + swapped full loading
    // chrome for a frame on warm switch (bottom flash).
    if (!bucket) return EMPTY_BUCKET_IDLE;
    return withQueueDefaults(bucket);
  });
}

/**
 * Residual c119 d_e / Gv `ws(t)` — only compactionStatus.
 * Full-bucket Gv subscribe re-renders the loader row on every stream tick → Fu
 * remeasure under pin (stream up/down jitter).
 */
export function useOfficialCodeSessionCompactionStatus(sessionId?: string) {
  return useStore(officialCodeSessionStore, (state) => {
    if (!sessionId) return null;
    return state.buckets[sessionId]?.compactionStatus ?? null;
  });
}

/**
 * Residual c119 Gv `js(t)` — true while tool permission requests are pending.
 * Product stores the pending queue on session.pendingToolPermissions.
 */
export function useOfficialCodeSessionPermissionSuppressed(sessionId?: string) {
  return useStore(officialCodeSessionStore, (state) => {
    if (!sessionId) return false;
    return (state.buckets[sessionId]?.session?.pendingToolPermissions?.length ?? 0) > 0;
  });
}

export function officialCodeSessionHasContent(sessionId: string) {
  const bucket = officialCodeSessionStore.getState().buckets[sessionId];
  return bucket ? hasRenderableContent(bucket) : false;
}

export { hasRenderableContent as officialCodeSessionBucketHasContent, emptyBucket as emptyOfficialCodeSessionBucket };
