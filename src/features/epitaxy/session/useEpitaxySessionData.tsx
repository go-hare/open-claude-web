/**
 * Official session data hook + load/stream event helpers (c11959232 he/Pe/Xa).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { ChatMessage, SendMessageInput, SessionSummary } from "../../../adapters/desktopBridge/types";
import {
  officialCodeSessionStore,
  useOfficialCodeSessionBucket,
} from "./officialCodeSessionStore";
import { createOfficialCodeLocalTransport } from "./officialCodeSessionTransport";
import {
  clearOfficialEkeCache,
  mergeOfficialStreamSnapshot,
  parseOfficialTranscriptEntries,
  parseOfficialTranscriptEntriesCached,
  type TranscriptEntry,
} from "./officialTranscriptParse";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";
import {
  officialMarkTurnStarted,
  officialSetStreamCharBudget,
  officialStreamActiveMessageId,
  officialStreamClear,
  officialStreamHasListeners,
  officialStreamSetVisibility,
  officialStreamSubscribe,
} from "./officialStreamSessionStore";
import {
  acknowledgeOfficialToolDecision,
  rehydrateOfficialApprovedPlanFromMessages,
} from "./officialPlanCommentsStore";
import { useOfficialAutoSessionTitle } from "./useOfficialAutoSessionTitle";
import {
  getOfficialUltrareviewLaunchingVersion,
  isOfficialUltrareviewLaunching,
  subscribeOfficialUltrareviewLaunching,
} from "./officialUltrareviewLaunch";
import {
  residualExtractUltrareviewProgress,
} from "./residualUltrareviewProgress";
import type { EpitaxySessionType } from "./epitaxyTranscriptActionContext";
import { OfficialButton } from "../OfficialEpitaxyComponents";

export {
  isOfficialParentResultEvent,
  shouldClearOfficialStreamForEvent,
  shouldDiscardQueuedMessagesForLifecycleEvent,
  shouldFlushOfficialStreamAfterMergedResult,
  shouldKeepPendingTurnOnOfficialPkeClear,
} from "./officialStreamLifecycleEvents";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

export function isMacPlatform() {
  return typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.platform);
}


/**
 * Official c119 CC residual:
 * - main VZoQaACZaG
 * - optional CLI subtitle DgpHBoCXb3 when `?from=cli`
 * - contained small CTA +4zh1/luZI "Start a new session" → home (not Retry/reload)
 */
export function SessionNotFound({ onStartNewSession }: { onStartNewSession: () => void }) {
  const fromCli =
    typeof window !== "undefined"
    && new URLSearchParams(window.location.search).get("from") === "cli";
  return (
    <div className="h-full flex flex-col items-center justify-center gap-g5 text-body text-t6">
      <span>This session could not be found. It may have been deleted, or you may not have access.</span>
      {fromCli ? (
        <span className="text-t7 max-w-md text-center">
          If you just created this session from the Claude Code CLI, make sure you&apos;re signed in to the same Claude account here as in your terminal.
        </span>
      ) : null}
      <OfficialButton onClick={onStartNewSession} size="small" variant="contained">
        Start a new session
      </OfficialButton>
    </div>
  );
}

/**
 * Official c119 remote tR residual (diHcJ+720f):
 * title + footnote error body only — no Retry button.
 */
export function SessionError({ error }: { error: Error }) {
  return (
    <div className="h-full flex flex-col items-center justify-center gap-g3 px-p8 text-body text-t5 text-center">
      <span>Couldn&apos;t load this session.</span>
      <div className="text-footnote text-t6 break-words">{error.message}</div>
    </div>
  );
}

/**
 * Official local Code route is always local for `code_*` ids. Do NOT invent a full
 * LocalSessions.list() on every session switch — that IPC + sort of all sessions
 * blocked the open path (Recents already holds meta).
 */
export function useEpitaxySessionType(sessionId?: string): EpitaxySessionType {
  return useMemo(() => inferSessionType(sessionId), [sessionId]);
}

/**
 * Official LocalSessions.setFocusedSession(o) residual (asar):
 *   focusedSessionId = o; if (t !== o) emit focusedSessionChanged
 *   o && preconnectSSHIfNeeded(o)
 * Visibility warm is setSessionVisibility(id, true|false) for **previous vs next**
 * only — never an intermediate null on A→B switch.
 *
 * Product invent: effect cleanup setFocusedSession(null) ran between A and B,
 * so previousFocused was lost and every switch still re-warmed B while thrashing
 * idle state. Align: only set next id (or null when leaving /code/:id entirely).
 */
export function useFocusedSession(sessionId?: string) {
  useEffect(() => {
    void desktopBridge.LocalSessions.setFocusedSession?.(sessionId ?? null);
  }, [sessionId]);
}

/**
 * Official session data hook:
 * - durable meta/messages: `officialCodeSessionStore` (`he`/`tm`)
 * - live stream: official `Pe` (`officialStreamSessionStore`) → local Va state
 *   (stream is NOT written into durable bucket until settle promote)
 */
export function useEpitaxySessionData(sessionId?: string) {
  const store = officialCodeSessionStore;
  // Never mutate the store during render (ensureBucket → set would break useSyncExternalStore).
  // Bucket is created in effects / beginPendingTurn / reload / openSession from Recents.
  const bucket = useOfficialCodeSessionBucket(sessionId);
  // Residual c119 Va: Pe.subscribe → useState; same messageId ticks via startTransition;
  // messageId change / null clear are sync setState. Visibility is a boolean ref (default true).
  // Do not invent useSyncExternalStore for Va — denser commits amplify Fu pin re-stick while streaming.
  const [streamSnapshot, setStreamSnapshot] = useState<OfficialStreamSnapshot>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const streamMessageIdRef = useRef<string | null>(null);
  // Residual Va visibility arg `n` (default true) — ref so setVisibility(() => r.current) tracks live.
  const transcriptVisibleRef = useRef(true);

  /**
   * Official c4bf `De`: mount he.openSession(id, transport), unmount releaseSession(id).
   * Product load path is useLayoutEffect (Ja before paint); bind sub in the same
   * phase and earlier than the load layout effect so Ae warm skip (`sub && messages`) sees it.
   */
  useLayoutEffect(() => {
    if (!sessionId) return undefined;
    const transport = createOfficialCodeLocalTransport();
    store.getState().openSessionTransport(sessionId, transport);
    return () => {
      store.getState().releaseSession(sessionId);
    };
  }, [sessionId, store]);

  // Keep Qa/eke suppress + char budget in lockstep with Va.
  useEffect(() => {
    if (!sessionId) {
      setStreamingMessageId(null);
      streamMessageIdRef.current = null;
      return;
    }
    if (streamSnapshot === null) {
      streamMessageIdRef.current = null;
      setStreamingMessageId(null);
      return;
    }
    const nextId = streamSnapshot.messageId;
    if (!nextId) return;
    const chars = streamSnapshot.blocks.reduce((total, block) => {
      if (block.kind === "text") return total + block.text.length;
      if (block.kind === "tool") return total + 1 + block.partialJson.length;
      return total;
    }, 0);
    // Residual Pe/Va: char budget only — no product window.__tileVaDiag invent.
    officialSetStreamCharBudget(sessionId, chars);
    streamMessageIdRef.current = nextId;
    setStreamingMessageId((current) => (current === nextId ? current : nextId));
  }, [sessionId, streamSnapshot]);

  // Official Va (c119): useState(null) + useEffect(Pe.subscribe) + startTransition same-id.
  // Product bridge: useLayoutEffect so Pe.subscribe is live before paint (Electron/3p burst
  // otherwise lets result clear abort pending startTransition paints → dump-at-end).
  // Still NO lastSnapshot hydrate (official starts null until next emit).
  useLayoutEffect(() => {
    // Official: if (!s || !t) return void i(null);
    if (!sessionId) {
      setStreamSnapshot(null);
      streamMessageIdRef.current = null;
      setStreamingMessageId(null);
      return undefined;
    }
    officialCodeSessionStore.getState().ensureBucket(sessionId);
    // Official does NOT clear useState here — keep prior until subscribe emit / null.
    let lastMessageId: string | null = null;
    const unsubscribe = officialStreamSubscribe(sessionId, (snapshot) => {
      if (snapshot === null) {
        lastMessageId = null;
        setStreamSnapshot(null);
        return;
      }
      if (snapshot.messageId !== lastMessageId) {
        lastMessageId = snapshot.messageId;
        setStreamSnapshot(snapshot);
        return;
      }
      startTransition(() => setStreamSnapshot(snapshot));
    });
    officialStreamSetVisibility(sessionId, () => transcriptVisibleRef.current);
    return () => {
      unsubscribe();
      if (!officialStreamHasListeners(sessionId)) {
        officialStreamSetVisibility(sessionId, () => false);
      }
    };
  }, [sessionId]);

  // Residual: je (turnStartedAt) is Gv elapsed only; cleared on settle — no idle-scan invent.
  // Stream settle (result / cleared / error) is hostApply on bucket.sub, not this hook.

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!sessionId) return;
    // Official clearError before retry/reload so FM drops while revalidating.
    store.getState().clearError(sessionId);
    const generation = store.getState().markLoading(sessionId, silent);
    try {
      const next = await loadEpitaxySession(sessionId);
      store.getState().applyLoad(sessionId, generation, next);
    } catch (caught) {
      store.getState().applyLoadError(
        sessionId,
        generation,
        caught instanceof Error ? caught : new Error(String(caught)),
      );
    }
  }, [sessionId, store]);

  /**
   * Official Gr onMutate (ca0135bc5):
   *   wasMidTurn = null !== pendingTurn
   *   noteQueuedSend always; beginPendingTurn always (no-op mid-turn)
   * Local does NOT echoPending / enqueueQueuedMessage — Hb via merge `d` CLI echo.
   * Returns wasMidTurn so callers can Gr.onError rollback.
   */
  const beginLocalUserTurn = useCallback((text: string, messageUuid?: string) => {
    if (!sessionId) return { wasMidTurn: false as const, uuid: messageUuid ?? "" };
    const bucket = store.getState().buckets[sessionId];
    // Official wasMidTurn = null !== buckets[id]?.pendingTurn (Gr). Do NOT invent
    // from isRunning/Va/queue — that desynced web queue from host deferredSends.
    const wasMidTurn = bucket != null && bucket.pendingTurnStartedAt !== null;
    store.getState().clearError(sessionId);
    // Official Gr: noteQueuedSend always (only increments when pendingTurn already set).
    store.getState().noteQueuedSend(sessionId);
    if (!wasMidTurn) {
      // Fresh turn: official beginPendingTurn = mCe.reset + Pke.clear then pendingTurn.
      // Local does not echoPending — no optimistic user row in messages.
      officialStreamClear(sessionId);
      clearOfficialEkeCache(sessionId);
      setStreamSnapshot(null);
      setStreamingMessageId(null);
      streamMessageIdRef.current = null;
      officialMarkTurnStarted(sessionId);
      store.getState().beginPendingTurn(sessionId);
    } else {
      // Mid-turn: beginPendingTurn no-ops; do NOT invent enqueueQueuedMessage.
      store.getState().beginPendingTurn(sessionId);
    }
    return { wasMidTurn, uuid: messageUuid ?? "" };
  }, [sessionId, store]);

  /**
   * Official Gr.onError (ca0135bc5):
   *   wasMidTurn → dropQueuedMessage(uuid); if queue+pendingQueuedSends empty → clearPendingTurn
   *   else → clearPendingTurn
   * Local mid-turn may only have pendingQueuedSends (no optimistic Hb row) until CLI echo.
   */
  const rollbackLocalUserTurn = useCallback((uuid: string, wasMidTurn: boolean) => {
    if (!sessionId) return;
    if (wasMidTurn) {
      store.getState().dropQueuedMessage(sessionId, uuid);
      const bucket = store.getState().buckets[sessionId];
      if (
        bucket
        && bucket.pendingTurnStartedAt != null
        && bucket.queuedMessages.length === 0
        && bucket.pendingQueuedSends === 0
      ) {
        store.getState().clearPendingTurn(sessionId);
      }
      return;
    }
    store.getState().clearPendingTurn(sessionId);
  }, [sessionId, store]);

  // Official ca0135 Yr:
  //   o = await transport.cancelQueued(id, uuid) ?? false
  //   if (o) dropQueuedMessage; if queue empty && pendingTurn → clearPendingTurn
  const cancelQueuedMessage = useCallback((uuid: string) => {
    if (!sessionId) return;
    void (async () => {
      const cancelled =
        (await desktopBridge.LocalSessions.cancelQueuedMessage?.(sessionId, uuid).catch(() => false)) ===
        true;
      if (!cancelled) return;
      store.getState().dropQueuedMessage(sessionId, uuid);
      const bucket = store.getState().buckets[sessionId];
      if (
        bucket &&
        bucket.pendingTurnStartedAt != null &&
        bucket.queuedMessages.length === 0 &&
        bucket.pendingQueuedSends === 0
      ) {
        store.getState().clearPendingTurn(sessionId);
      }
    })();
  }, [sessionId, store]);

  // useLayoutEffect: markLoading / open path must set B before paint so Ja shows
  // (official openSession leaves transcript pending until Ya). useEffect painted one
  // frame of empty idle → "No messages yet." flash on cold / hot-open empty buckets.
  useLayoutEffect(() => {
    let alive = true;
    if (!sessionId) return () => { alive = false; };
    const existing = store.getState().buckets[sessionId];
    // Official Ae local warm skip (c4bf): s?.sub && s.messages.length>0 → skip fetchTranscript.
    // Official De/he: if (a?.sub) only refCount + reclaim — no getTranscript, no getSession.
    const hasWarmTranscript = Boolean(
      existing?.sub
      && existing.messages.length > 0,
    );
    if (hasWarmTranscript) {
      return () => { alive = false; };
    }
    const silent = Boolean(existing && (existing.messages.length > 0 || existing.streamSnapshot !== null));
    void reload({ silent }).finally(() => {
      if (!alive) return;
    });
    return () => { alive = false; };
  }, [reload, sessionId, store]);

  /**
   * Official c119 residual:
   * E = session.type === "bridge" && pendingTurn && connectionStatus === "disconnected"
   * → getSession recheck → failPendingTurn(..., "bridge_offline")
   * Product host maps connection via session.connectionState (types residual).
   */
  useEffect(() => {
    if (!sessionId) return undefined;
    const session = bucket.session;
    if (!session || session.sessionType !== "bridge") return undefined;
    // Official: bridge + pendingTurn + disconnected (not Va / isRunning invent).
    if (bucket.pendingTurnStartedAt === null) return undefined;
    if (session.connectionState !== "disconnected") return undefined;
    let cancelled = false;
    void desktopBridge.LocalSessions.getSession(sessionId)
      .then((latest) => {
        if (cancelled || !latest) return;
        // Official: only when recheck still reports disconnected.
        if (latest.connectionState !== "disconnected") return;
        const still = store.getState().buckets[sessionId];
        if (!still || still.pendingTurnStartedAt === null) return;
        store.getState().failPendingTurn(
          sessionId,
          "The bridged Claude Code process stopped responding mid-turn. Check your terminal for errors (you may need to run /login), then resend your message.",
          "bridge_offline",
        );
        officialStreamClear(sessionId);
        clearOfficialEkeCache(sessionId);
      })
      .catch(() => {
        /* host recheck failed — leave pending turn; do not invent error */
      });
    return () => {
      cancelled = true;
    };
  }, [
    bucket.pendingTurnStartedAt,
    bucket.session,
    sessionId,
    store,
  ]);

  // Official rwe: seed Mfe.approvedPlans from transcript when last ExitPlanMode already has tool_result.
  // Also acknowledge settled ExitPlanMode ids so jfe skips re-showing Wk after reload/reconnect.
  useEffect(() => {
    if (!sessionId || bucket.messages.length === 0) return;
    const scan = rehydrateOfficialApprovedPlanFromMessages(sessionId, bucket.messages);
    if (scan.lastPlan && !scan.isPending) {
      acknowledgeOfficialToolDecision(sessionId, scan.lastPlan.id, "ExitPlanMode");
    }
  }, [bucket.messages, sessionId]);

  // Official Qa = Va?.messageId. hostApply stamps bucket.streamingMessageId on
  // message_start (same tick as mergeMessage) so eke suppress cannot race durable
  // assistant merges before Pe/Va useState commits.
  const activeStreamingMessageId =
    streamMessageIdRef.current
    ?? streamingMessageId
    ?? streamSnapshot?.messageId
    ?? bucket.streamingMessageId
    ?? (sessionId ? officialStreamActiveMessageId(sessionId) : null);
  // Official Xa = Xwe/eke(sessionId, messages, streamingMessageId); Ya = Kwe(Xa, Va) only.
  const parsedEntries = useMemo(
    () => parseOfficialTranscriptEntriesCached(sessionId, bucket.messages, activeStreamingMessageId),
    [activeStreamingMessageId, bucket.messages, sessionId],
  );
  // Official ge = fi([...me]) from Jke queuedMessages — Hb isQueued tail after main transcript.
  const queuedEntries = useMemo(() => {
    const queued = bucket.queuedMessages ?? [];
    if (queued.length === 0) return [] as TranscriptEntry[];
    return parseOfficialTranscriptEntries(queued, null).map((entry) => ({
      ...entry,
      isQueued: true,
    }));
  }, [bucket.queuedMessages]);
  // Official [bs,ys] ultrareview launch chrome — module store set by ExistingSessionComposer.
  const ultrareviewLaunchVersion = useSyncExternalStore(
    subscribeOfficialUltrareviewLaunching,
    getOfficialUltrareviewLaunchingVersion,
    () => 0,
  );
  const isUltrareviewLaunching = ultrareviewLaunchVersion >= 0 && isOfficialUltrareviewLaunching(sessionId);
  // Official Gv spawnLabel (c11959232 Xb):
  //   bs? Ultrareview : "spawning"===Os ? plugins|worktree|Starting : J? Starting : void 0
  // Os=F?"active":createPending?"spawning":"draft" — once route has session meta (F active),
  // init-step labels do NOT apply. Product invent: any incomplete initializationStatus →
  // sticky "Starting session…" on warm/empty sessions.
  const spawnLabel = useMemo(
    () => deriveOfficialCodeSpawnLabel({
      hasSessionId: Boolean(sessionId),
      isMetaPending: bucket.isMetaPending,
      isSessionNotFound: bucket.isSessionNotFound,
      isUltrareviewLaunching,
      session: bucket.session,
    }),
    [bucket.isMetaPending, bucket.isSessionNotFound, bucket.session, isUltrareviewLaunching, sessionId],
  );
  // Residual Xb isResponding paint (c11959232): H || "spawning"===Os || null!==Js || bs
  // Official H = pe = Xke = Qke(pendingTurn && !endTurnSeen) — index-BELzQL5P.
  // Composer busy:H (c119 Qj). Residual p (assistant end_turn) sets endTurnSeen → H false
  // while Va stays until result `u&&Pke.clear` (typewriter continues; Stop→Send).
  // Do NOT invent OR of streamSnapshot / streamingMessageId / isRunning / queue / streamActivity
  // into Xb isResponding — that stuck Gv spark after host idle when Pe/Va lagged.
  // Local Js (optimistic draft) is unused on existing /code/:id; spawnLabel covers
  // "spawning"===Os + bs label; isUltrareviewLaunching covers bs in flight.
  // Residual Gv tokens/elapsed: _e / je maps only — do NOT invent streamTokenEstimate prop.
  const pendingTurnStartedAt = bucket.pendingTurnStartedAt;
  // Official Qke / H: pendingTurn exists AND endTurnSeen is still false.
  const H = pendingTurnStartedAt !== null && !bucket.pendingTurnEndTurnSeen;
  // Residual we = gw(U) — ultrareview progress from system hook_progress/hook_response.
  const reviewProgress = useMemo(
    () => residualExtractUltrareviewProgress(bucket.messages),
    [bucket.messages],
  );
  const isResponding =
    H
    || Boolean(spawnLabel)
    || isUltrareviewLaunching;
  // Official Ya = Kwe(Xa, Va). Tool settle is eke/rke object-ref mutation — no settleOrphan invent.
  // Official also appends ge (queued Hb rows) after the main stream-merged transcript.
  const entries = useMemo(() => {
    const merged = mergeOfficialStreamSnapshot(parsedEntries, streamSnapshot);
    if (queuedEntries.length === 0) return merged;
    return [...merged, ...queuedEntries];
  }, [parsedEntries, queuedEntries, streamSnapshot]);

  // Residual Ja (c119): Boolean(D) && 0===Ya.length && (B||J)
  // Ya = painted entries (Xa+Va+queue), not raw messages alone. B=isTranscriptPending, J=isMetaPending
  // (product maps residual J=X&&!O via isMetaPending until session meta lands).
  // Do NOT invent !session as loading — that flashed Ja on empty idle buckets.
  const isLoading = Boolean(sessionId)
    && entries.length === 0
    && (
      bucket.isTranscriptPending
      || bucket.isMetaPending
    );

  const stopLiveTurn = useCallback(async () => {
    // Official Wr onMutate = markInterrupting (Pke.flush + mCe.reset).
    // Esc is interrupt-then-continue: keep queuedMessages + pendingTurn + isRunning.
    if (!sessionId) return;
    officialStreamClear(sessionId);
    clearOfficialEkeCache(sessionId);
    setStreamSnapshot(null);
    setStreamingMessageId(null);
    streamMessageIdRef.current = null;
    store.getState().markInterrupting(sessionId);
  }, [sessionId, store]);

  // Residual oi gate inputs (c11959232):
  //   ri = we != null || (O?.tags?.includes("ultrareview") ?? false)
  //   oi = ri || (0===Ya.length && void 0!==ii)
  // Local: no ye/ii → oi = ri. Expose we + tag for EpitaxyChatPanel shell (before Vn/Xb).
  const isUltrareviewTagged = Boolean(bucket.session?.tags?.includes("ultrareview"));

  // Official auto title residual (create + open-session fallback).
  useOfficialAutoSessionTitle(bucket.session, bucket.messages, isLoading);

  return {
    beginLocalUserTurn,
    busy: H,
    cancelQueuedMessage,
    entries,
    error: bucket.error,
    errorCategory: bucket.errorCategory,
    isLoading,
    isResponding,
    isSessionNotFound: bucket.isSessionNotFound,
    isUltrareviewTagged,
    messages: bucket.messages,
    reload,
    reviewProgress,
    rollbackLocalUserTurn,
    session: bucket.session,
    spawnLabel,
    stopLiveTurn,
  };
}

/**
 * Official Gv spawnLabel (c11959232 Xb path only — oi Gv omits spawnLabel):
 *   bs? "Launching Ultrareview…"
 *   : "spawning"===Os ? ($s plugins | worktree | "Starting session…")
 *   : J ? "Starting session…"
 *   : void 0
 *
 * Os = F ? "active" : createPending ? "spawning" : "draft".
 * $s init steps only while Os==="spawning". Once session meta exists, F is active —
 * incomplete initializationStatus must NOT keep "Starting session…".
 * Ultrareview label is ONLY bs (fe.launchUltrareview in flight) — not tags+isRunning invent.
 */
function deriveOfficialCodeSpawnLabel(input: {
  hasSessionId: boolean;
  isMetaPending: boolean;
  isSessionNotFound: boolean;
  isUltrareviewLaunching?: boolean;
  session: SessionSummary | null;
}): string | undefined {
  const { hasSessionId, isMetaPending, isSessionNotFound, isUltrareviewLaunching, session } = input;
  // Official spawnLabel:bs? "Launching Ultrareview…" while fe.launchUltrareview in flight.
  if (isUltrareviewLaunching) return "Launching Ultrareview…";
  // Official J = expectedId && !meta — cold navigate before meta arrives.
  // (Does not alone force Xb isResponding; empty path uses Ja Loading.)
  const awaitingMeta = hasSessionId && !session && !isSessionNotFound && isMetaPending;
  if (awaitingMeta) return "Starting session…";
  // Official $s only while "spawning"===Os. Product /code/:id always has F once meta exists
  // (Os active). Do not map sticky initializationStatus → Starting session invent.
  void session;
  return undefined;
}

function chatMessageContentRichness(message: ChatMessage): number {
  const raw = asRecord(message.raw);
  const nested = asRecord(raw.message);
  const content = nested.content ?? raw.content;
  if (Array.isArray(content)) {
    let score = content.length * 1000;
    for (const block of content) {
      const record = asRecord(block);
      const type = stringValue(record.type) ?? "";
      if (type === "tool_use") score += 500;
      if (type === "tool_result") score += 400;
      if (type === "text") score += (stringValue(record.text) ?? "").length;
      if (type === "thinking") score += (stringValue(record.thinking) ?? "").length;
    }
    return score;
  }
  if (typeof content === "string") return content.length;
  return message.text?.length ?? 0;
}

/**
 * Official eke/zke load path (index-BELzQL5P):
 * - Identity for de-dupe is OUTER CLI uuid (per NDJSON event), NOT Anthropic message.id.
 * - Multi-emit assistants (thinking emit + text emit, same mid, different uuid) stay as
 *   separate ChatMessages; eke ake + f() merges consecutive assistant items into one bubble.
 * - session.messages durable assistants are mid-collapsed chat history — only back-fill when
 *   no transcript multi-emit for that Anthropic id is present.
 */
async function loadEpitaxySession(sessionId: string): Promise<{ messages: ChatMessage[]; session: SessionSummary } | null> {
  const bridge = desktopBridge.LocalSessions;
  const session = await bridge.getSession(sessionId).catch(() => null);
  if (!session) return null;
  const transcript = await bridge.getTranscript?.(sessionId).catch(() => undefined);
  const sessionMessages = session.messages ?? [];
  const transcriptMessages = transcript?.length ? transcript : [];
  const outerUuidOf = (message: ChatMessage) => {
    const raw = asRecord(message.raw);
    return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
  };
  const anthropicIdOf = (message: ChatMessage) => {
    const raw = asRecord(message.raw);
    const nested = asRecord(raw.message);
    if (message.role !== "assistant" && stringValue(raw.type) !== "assistant") return undefined;
    return stringValue(nested.id) ?? stringValue(raw.message_id);
  };
  const isStreamEvent = (message: ChatMessage) => stringValue(asRecord(message.raw).type) === "stream_event";
  const byOuter = new Map<string, ChatMessage>();
  const order: string[] = [];
  const anthropicIdsFromTranscript = new Set<string>();
  const isOptimisticUser = (message: ChatMessage) => {
    if (message.role !== "user") return false;
    const raw = asRecord(message.raw);
    if (raw.isLocalOptimistic === true) return true;
    return message.id.startsWith("local-user-")
      || String(raw.uuid ?? "").startsWith("local-user-");
  };
  const isPlainUser = (message: ChatMessage) => {
    if (message.role !== "user") return false;
    const raw = asRecord(message.raw);
    if (raw.parent_tool_use_id || raw.isMeta === true || raw.isSynthetic === true) return false;
    return (message.text?.trim().length ?? 0) > 0;
  };
  /** Outer-uuid map + promote optimistic plain-user seed when durable echo has another uuid. */
  const put = (message: ChatMessage) => {
    if (isStreamEvent(message)) return;
    // Durable plain user: replace optimistic seed of same text (different outer uuid).
    if (message.role === "user" && !isOptimisticUser(message) && isPlainUser(message)) {
      const trimmed = message.text.trim();
      for (const [key, existing] of byOuter) {
        if (
          isOptimisticUser(existing)
          && isPlainUser(existing)
          && existing.text.trim() === trimmed
        ) {
          byOuter.delete(key);
          const ordIdx = order.indexOf(key);
          const durableKey = outerUuidOf(message);
          if (ordIdx >= 0) order[ordIdx] = durableKey;
          else order.push(durableKey);
          byOuter.set(durableKey, message);
          return;
        }
      }
    }
    const key = outerUuidOf(message);
    const existing = byOuter.get(key);
    if (!existing) {
      byOuter.set(key, message);
      order.push(key);
      return;
    }
    // Same outer uuid only — prefer richer envelope (not multi-emit mid collapse).
    if (chatMessageContentRichness(message) >= chatMessageContentRichness(existing)) {
      byOuter.set(key, message);
    }
  };
  for (const message of transcriptMessages) {
    put(message);
    const mid = anthropicIdOf(message);
    if (mid) anthropicIdsFromTranscript.add(mid);
  }
  for (const message of sessionMessages) {
    if (message.role === "assistant") {
      const mid = anthropicIdOf(message) ?? message.id;
      // Durable mid-collapsed row must not replace multi-emit transcript rows.
      if (mid && anthropicIdsFromTranscript.has(mid)) continue;
    }
    put(message);
  }
  const messages = order.map((key) => byOuter.get(key)!).filter(Boolean);
  return { messages, session: { ...session, messages } };
}

export async function sendMessageToSession(sessionId: string, text: string, input?: SendMessageInput) {
  const bridge = desktopBridge.LocalSessions;
  if (bridge.sendMessage) {
    await bridge.sendMessage(sessionId, text, input);
    return;
  }
  await desktopBridge.LocalSessions.sendMessage?.(sessionId, text, input);
}

function inferSessionType(sessionId?: string, session?: SessionSummary): EpitaxySessionType {
  if (!sessionId) return "local";
  if (session?.kind === "code") return "local";
  if (sessionId.startsWith("bridge_")) return "bridge";
  if (sessionId.startsWith("local_") || sessionId.startsWith("code_")) return "local";
  return "remote";
}

export function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

export { isPlaceholderCodingTitle } from "./officialSessionTitle";
