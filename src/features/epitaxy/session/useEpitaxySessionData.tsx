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
import { extractOfficialLiveMeta } from "./officialLiveMeta";
import {
  idleStreamActivityMode,
  officialCodeSessionStore,
  useOfficialCodeSessionBucket,
  type StreamActivityMode,
} from "./officialCodeSessionStore";
import {
  clearOfficialEkeCache,
  mergeOfficialStreamSnapshot,
  parseOfficialTranscriptEntries,
  parseOfficialTranscriptEntriesCached,
  rawMessageContent,
  type TranscriptEntry,
} from "./officialTranscriptParse";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";
import {
  officialClearTurnStarted,
  officialGetTurnStartedAt,
  officialMarkTurnStarted,
  officialSetStreamCharBudget,
  officialStreamActiveMessageId,
  officialStreamClear,
  officialStreamFeed,
  officialStreamGetSnapshot,
  officialStreamHasListeners,
  officialStreamSetVisibility,
  officialStreamSettleAfterReveal,
  officialStreamSubscribe,
} from "./officialStreamSessionStore";
import {
  acknowledgeOfficialToolDecision,
  rehydrateOfficialApprovedPlanFromMessages,
} from "./officialPlanCommentsStore";
import {
  getOfficialUltrareviewLaunchingVersion,
  isOfficialUltrareviewLaunching,
  subscribeOfficialUltrareviewLaunching,
} from "./officialUltrareviewLaunch";
import {
  residualExtractUltrareviewProgress,
  type OfficialReviewProgress,
} from "./residualUltrareviewProgress";
import type { EpitaxySessionType } from "./epitaxyTranscriptActionContext";
import { OfficialButton } from "../OfficialEpitaxyComponents";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
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
  const finalizeStreamGenerationRef = useRef<number | null>(null);
  const streamGenerationRef = useRef(0);
  const store = officialCodeSessionStore;
  // Never mutate the store during render (ensureBucket → set would break useSyncExternalStore).
  // Bucket is created in effects / beginPendingTurn / reload / openSession from Recents.
  const bucket = useOfficialCodeSessionBucket(sessionId);
  // Residual c119 Va: Pe.subscribe → useState; same messageId ticks via startTransition;
  // messageId change / null clear are sync setState. Visibility is a boolean ref (default true).
  // Do not invent useSyncExternalStore for Va — denser commits amplify Fu pin re-stick while streaming.
  const [streamSnapshot, setStreamSnapshot] = useState<OfficialStreamSnapshot>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamActivityMode, setStreamActivityMode] = useState<StreamActivityMode>(idleStreamActivityMode);
  const streamMessageIdRef = useRef<string | null>(null);
  const streamSnapshotRef = useRef<OfficialStreamSnapshot>(null);
  const streamActivityModeRef = useRef<StreamActivityMode>(idleStreamActivityMode);
  // Residual Va visibility arg `n` (default true) — ref so setVisibility(() => r.current) tracks live.
  const transcriptVisibleRef = useRef(true);
  streamSnapshotRef.current = streamSnapshot;
  streamActivityModeRef.current = streamActivityMode;

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

  // useLayoutEffect: Va is per sessionId (official Pe). useState would keep the previous
  // session's streamSnapshot / activity for one paint → Working / empty chrome flash on switch.
  // Hydrate + subscribe before paint; openSession re-entry does not Jwe/clear target Va.
  useLayoutEffect(() => {
    // Official openSession re-entry: only bump refCount — do NOT Jwe / Pe.clear.
    // streamGeneration only gates in-flight settle finalize for THIS mount cycle.
    streamGenerationRef.current += 1;
    finalizeStreamGenerationRef.current = null;

    if (!sessionId) {
      setStreamSnapshot(null);
      setStreamActivityMode(idleStreamActivityMode);
      streamMessageIdRef.current = null;
      setStreamingMessageId(null);
      return undefined;
    }
    // Residual Va: Pe.subscribe + visibility only — no window.__simulateOfficialStream invent.
    store.getState().ensureBucket(sessionId);
    // Residual Va(sessionId, enabled, visible=true): Pe.subscribe + setVisibility(() => r.current)
    // Product: Pe keeps lastSnapshot per sessionId. On re-subscribe after switch, hydrate
    // from lastSnapshot so live typewriter does not invent-blank until next delta.
    let lastMessageId: string | null = null;
    const hydrate = officialStreamGetSnapshot(sessionId);
    const bucketNow = store.getState().buckets[sessionId];
    if (hydrate) {
      lastMessageId = hydrate.messageId;
      setStreamSnapshot(hydrate);
      streamMessageIdRef.current = hydrate.messageId;
      setStreamingMessageId(hydrate.messageId);
      setStreamActivityMode(bucketNow?.streamActivityMode ?? idleStreamActivityMode);
    } else {
      lastMessageId = null;
      setStreamSnapshot(null);
      streamMessageIdRef.current = null;
      setStreamingMessageId(null);
      setStreamActivityMode(bucketNow?.streamActivityMode ?? idleStreamActivityMode);
    }
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
      // Official: if no listeners left, setVisibility(() => false)
      if (!officialStreamHasListeners(sessionId)) {
        officialStreamSetVisibility(sessionId, () => false);
      }
    };
  }, [sessionId, store]);

  // Residual: je (turnStartedAt) is Gv elapsed only; cleared on settle — no idle-scan invent.

  const clearStreamState = useCallback((markSessionSettled = false, discardQueued = false) => {
    if (!sessionId) return;
    // Official settle (result → clear Va / Rke + Jwe): do NOT invent a durable assistant
    // with outer uuid = Anthropic message.id. Live multi-emit already lands via
    // mergeMessage (outer CLI uuid); eke suppress lifts when streamingMessageId nulls
    // and f() merges consecutive assistants. Synthetic promote polluted identity and
    // could race real multi-emit rows (residual P1-B).
    officialStreamClear(sessionId);
    // Official Jwe(sessionId) drops Xwe cache when stream settles / clears.
    clearOfficialEkeCache(sessionId);
    if (markSessionSettled) officialClearTurnStarted(sessionId);
    setStreamSnapshot(null);
    setStreamingMessageId(null);
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
    streamSnapshotRef.current = null;
    streamActivityModeRef.current = idleStreamActivityMode;
    store.getState().clearStream(sessionId, markSessionSettled, discardQueued);
  }, [sessionId, store]);

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

  const beginLocalUserTurn = useCallback((text: string, messageUuid?: string) => {
    if (!sessionId) return;
    const bucket = store.getState().buckets[sessionId];
    // Official wasMidTurn = null !== buckets[id]?.pendingTurn before this send.
    const wasMidTurn = Boolean(
      bucket
      && (
        bucket.pendingTurnStartedAt !== null
        || bucket.session?.isRunning === true
        || bucket.streamActivityMode !== idleStreamActivityMode
        || bucket.streamingMessageId !== null
        || bucket.streamSnapshot !== null
        || (bucket.queuedMessages?.length ?? 0) > 0
        || (bucket.pendingQueuedSends ?? 0) > 0
      ),
    );
    // Official Gr: noteQueuedSend always (only increments when pendingTurn already set).
    store.getState().noteQueuedSend(sessionId);
    const optimistic = makeOptimisticUserChatMessage(text, messageUuid);
    if (wasMidTurn) {
      // Local optimistic seed into queuedMessages so Hb isQueued chrome shows immediately
      // (official local waits for CLI user echo via pendingQueuedSends route).
      store.getState().enqueueQueuedMessage(sessionId, optimistic);
      return { queued: true as const, uuid: optimistic.id };
    }
    // Fresh turn: official beginPendingTurn = mCe.reset + Pke.clear then pendingTurn.
    // Residual only clears when no pendingTurn yet (beginPendingTurn no-ops mid-turn).
    officialStreamClear(sessionId);
    clearOfficialEkeCache(sessionId);
    setStreamSnapshot(null);
    setStreamingMessageId(null);
    streamMessageIdRef.current = null;
    streamSnapshotRef.current = null;
    officialMarkTurnStarted(sessionId);
    store.getState().beginPendingTurn(sessionId, optimistic);
    setStreamActivityMode("requesting");
    streamActivityModeRef.current = "requesting";
    return { queued: false as const, uuid: optimistic.id };
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
        // Residual clearPendingTurn — do not mark session settled (turn may still stream).
        store.getState().setStreamActivity(sessionId, { pendingTurnStartedAt: null });
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
    // Residual openSession (index-BELzQL5P): if (a?.sub) return — only refCount +
    // reclaim. No getTranscript, no getSession. Product warm Ya (messages already
    // durable, B false) must match: skip disk reload AND invent meta getSession.
    // First open / Recents meta-only: still full load so Ja/B paints.
    const hasWarmTranscript = Boolean(
      existing
      && existing.messages.length > 0
      && !existing.isTranscriptPending,
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

  useEffect(() => {
    if (!sessionId) return undefined;
    const handleEvent = (event: unknown) => {
      if (!isSessionEventForId(event, sessionId)) return;
      const streamMessage = streamEventMessageFromBridgeEvent(event);
      if (streamMessage) {
        // Official index feed: Pke.feed(sessionId, stream_event.event, parent_tool_use_id)
        // Official Pke: if (null !== parent) return — only strict null drives main Va.
        // Do NOT use `??` here: null is the main-turn sentinel and must not fall through.
        // Early-return also keeps subagent stream from re-opening isRunning / pendingTurn
        // after parent result (product densable; official still mCe-counts sidechain).
        const parentToolUseId = Object.prototype.hasOwnProperty.call(streamMessage, "parent_tool_use_id")
          ? streamMessage.parent_tool_use_id
          : streamMessage.parentToolUseId;
        if (parentToolUseId !== null) {
          return;
        }
        const innerEvent = asRecord(streamMessage.event);
        const isStart = stringValue(innerEvent.type) === "message_start";
        // Official Pke/Qa: Anthropic event.message.id only — never outer stream_event.uuid.
        const streamMessageId = isStart
          ? (stringValue(asRecord(innerEvent.message).id) ?? null)
          : null;
        // Official Xke/pe: stream only advances an open turn (Gr pendingTurn / isRunning).
        // densable orphan flush after stopSession/result settle must not re-open busy —
        // that made the Stop square "close then reopen by itself".
        // Esc→queue residual: after markInterrupting, Va/stream flags are idle but
        // pendingTurn + queuedMessages still own the continue turn — keep turnOpen so
        // post-interrupt message_start can re-arm typewriter for the drained follow-up.
        const bucketBeforeStream = store.getState().buckets[sessionId];
        const turnOpen =
          bucketBeforeStream?.pendingTurnStartedAt != null
          || bucketBeforeStream?.session?.isRunning === true
          || bucketBeforeStream?.streamingMessageId != null
          || (
            bucketBeforeStream != null
            && bucketBeforeStream.streamActivityMode !== idleStreamActivityMode
          )
          || (bucketBeforeStream?.queuedMessages?.length ?? 0) > 0
          || (bucketBeforeStream?.pendingQueuedSends ?? 0) > 0;
        if (!turnOpen) {
          return;
        }
        if (isStart) {
          streamGenerationRef.current += 1;
          finalizeStreamGenerationRef.current = null;
          officialMarkTurnStarted(sessionId);
          // Stamp live id on the ref immediately so eke suppress cannot race
          // the first durable assistant merge before React commits setState.
          // Drop Xwe cache: durable multi-emit may have already been parsed without
          // suppress (streamingMessageId was null) — must re-eke so Kwe/Gwe sees clean Xa.
          if (streamMessageId) {
            streamMessageIdRef.current = streamMessageId;
            setStreamingMessageId(streamMessageId);
            clearOfficialEkeCache(sessionId);
            store.getState().setStreamActivity(sessionId, {
              pendingTurnStartedAt: officialGetTurnStartedAt(sessionId) ?? Date.now(),
              streamActivityMode: "requesting",
              streamingMessageId: streamMessageId,
              isRunning: true,
            });
          } else {
            store.getState().setStreamActivity(sessionId, {
              pendingTurnStartedAt: officialGetTurnStartedAt(sessionId) ?? Date.now(),
              streamActivityMode: "requesting",
              isRunning: true,
            });
          }
        } else if (
          // Only re-assert isRunning while pendingTurn/open busy still owns the turn.
          bucketBeforeStream?.pendingTurnStartedAt != null
          && bucketBeforeStream?.session?.isRunning !== true
        ) {
          store.getState().setStreamActivity(sessionId, { isRunning: true });
        }
        // Activity mode from inner event (official stream_event.event).
        setStreamActivityMode((current) => streamActivityModeFromInnerEvent(innerEvent, current));
        // Official Pke.feed(sessionId, stream_event.event, parent) — typewriter via zE.
        officialStreamFeed(sessionId, streamMessage, parentToolUseId);
        return;
      }
      // Official Fke/Uke (index-BELzQL5P): system init/status (+ root assistant model)
      // merge into bucket.liveMeta (survives stale session_updated with old mode).
      // Mode pill seeds from host session.permissionMode (`be(n.permissionMode)`);
      // only system/status may mirror permissionMode onto session (EnterPlanMode etc.).
      // system/init updates liveMeta bookkeeping only — never clobber user bypass/host mode.
      const liveMeta = extractOfficialLiveMeta(event);
      if (liveMeta) {
        const outer = asRecord(event);
        const raw =
          stringValue(outer.type) === "message" && outer.message && typeof outer.message === "object"
            ? asRecord(outer.message)
            : outer;
        const mirrorPermissionMode =
          stringValue(raw.type) === "system"
            ? stringValue(raw.subtype) === "status"
            : Boolean(liveMeta.permissionMode);
        store.getState().mergeLiveMeta(sessionId, liveMeta, { mirrorPermissionMode });
      }
      const transcriptMessage = chatMessageFromBridgeMessageEvent(event);
      if (transcriptMessage) {
        // Official: durable messages stay in the array in CLI order (assistant tool_use
        // before user tool_result). eke/Xwe suppress *rendering* of the live Anthropic
        // message.id while Va owns the typewriter — do NOT drop merge here or rke order breaks.
        store.getState().mergeMessage(sessionId, transcriptMessage);
        // Residual index-BELzQL5P `p`: assistant end_turn → pendingTurn.endTurnSeen only.
        // Does NOT Pke.clear / lift Va / clear streamingMessageId. eke keeps suppress until
        // result/done/error (`u&&Pke.clear`) so Kwe(Va) owns typewriter through reveal.
        // Product previously cleared Va on end_turn → blank→refill flash (not official).
        if (isAssistantEndTurnBridgeEvent(event)) {
          return;
        }
        // Official `g` (result + queue + pendingTurn): mergeMessage already promoted
        // and opened a new pendingTurn — do not settle Va here.
        // Empty-queue parent result (success or error): mergeMessage already
        // cleared pendingTurn / isRunning (h); fall through to clearStream for Va.
        if (!shouldSettleEmptyQueueAfterMergedResult(event, store.getState().buckets[sessionId])) {
          return;
        }
      }
      if (shouldReloadTranscriptForEvent(event)) {
        // Official type:"error" (+ nested message.type error) → FM category when host sends it.
        // failPendingTurn only when pendingTurn is set (store guard); else applyRuntimeError.
        // Do NOT route isRunning/stream-only into failPendingTurn — that NOOPs and drops FM.
        if (isBridgeRuntimeErrorEvent(event)) {
          const runtimeError = bridgeRuntimeErrorFromEvent(event);
          const bucket = store.getState().buckets[sessionId];
          if (bucket && bucket.pendingTurnStartedAt !== null) {
            store.getState().failPendingTurn(
              sessionId,
              runtimeError.message,
              runtimeError.errorCategory,
            );
          } else {
            store.getState().applyRuntimeError(
              sessionId,
              new Error(runtimeError.message),
              runtimeError.errorCategory,
            );
          }
          clearStreamState(true);
          return;
        }
        if (shouldClearOfficialStreamForEvent(event)) {
          const streamGeneration = streamGenerationRef.current;
          const finalize = () => {
            if (streamGenerationRef.current !== streamGeneration) return;
            finalizeStreamGenerationRef.current = null;
            const eventType = stringValue(asRecord(event).type);
            // Official stopSession / close / clear: drop optimistic queue (host
            // deferredSends already cleared). Distinct from Esc interrupt-continue.
            if (eventType === "stopped" || eventType === "close" || eventType === "cleared") {
              clearStreamState(true, true);
              return;
            }
            const after = store.getState().buckets[sessionId];
            // Official BELz g/h: queue promote only on type:result mergeMessage.
            // Do NOT invent hasQueue from pendingTurn alone — that blocked
            // success-result settle forever (Stop stuck after host idle).
            // Real deferred queue: flush Va only; g continues on next result merge.
            const hasDeferredQueue = Boolean(
              after
              && (
                (after.queuedMessages?.length ?? 0) > 0
                || (after.pendingQueuedSends ?? 0) > 0
              ),
            );
            if (hasDeferredQueue) {
              officialStreamClear(sessionId);
              clearOfficialEkeCache(sessionId);
              setStreamSnapshot(null);
              setStreamingMessageId(null);
              setStreamActivityMode(idleStreamActivityMode);
              streamMessageIdRef.current = null;
              streamSnapshotRef.current = null;
              streamActivityModeRef.current = idleStreamActivityMode;
              store.getState().setStreamActivity(sessionId, {
                streamingMessageId: null,
                streamActivityMode: idleStreamActivityMode,
              });
              return;
            }
            clearStreamState(true);
            // Official settles from live merge only. Product residual (3p end_turn /
            // Esc→queue multi-send): durable assistants can land on CLI jsonl while
            // live merge/stream suppress races leave bucket.messages user-only — UI
            // shows stacked user bubbles and no reply. One silent getTranscript after
            // final settle recovers jsonl SoT.
            void reload({ silent: true }).finally(() => {
              if (streamGenerationRef.current !== streamGeneration) return;
              void refreshSessionTitleAfterSettle(sessionId).then((nextSession) => {
                if (!nextSession) return;
                if (streamGenerationRef.current !== streamGeneration) return;
                store.getState().patchSession(sessionId, nextSession);
              });
            });
          };
          if (shouldSettleOfficialStreamForEvent(event)) {
            if (finalizeStreamGenerationRef.current === streamGeneration) return;
            finalizeStreamGenerationRef.current = streamGeneration;
            void officialStreamSettleAfterReveal(sessionId).finally(() => {
              if (streamGenerationRef.current !== streamGeneration) return;
              finalize();
            });
          } else {
            finalize();
          }
        } else if (stringValue(asRecord(event).type) === "session_updated") {
          // Official session_updated: metadata only (title/folders/permissions) — never
          // getTranscript/reload the conversation body mid-turn.
          const nextSession = asRecord(event).session ?? asRecord(asRecord(event).payload).session;
          if (nextSession) {
            const prevBucket = store.getState().buckets[sessionId];
            const prevRunning = prevBucket?.session?.isRunning === true;
            const patched = normalizeSessionSummaryPatch(prevBucket?.session ?? null, nextSession);
            if (patched) store.getState().patchSession(sessionId, patched);
            // Official session_updated: metadata + isRunning only (no queue promote).
            // Host markNotRunning (isRunning false): settle Va only when web has no
            // open turn (pendingTurn/queue). Official g continues with pendingTurn
            // after result promote — keep that. Real deferred queue: flush stream only.
            if (prevRunning && patched?.isRunning === false) {
              const after = store.getState().buckets[sessionId];
              const hasDeferredQueue = Boolean(
                after
                && (
                  (after.queuedMessages?.length ?? 0) > 0
                  || (after.pendingQueuedSends ?? 0) > 0
                ),
              );
              const hasOpenTurn = Boolean(
                after
                && (
                  after.pendingTurnStartedAt !== null
                  || hasDeferredQueue
                ),
              );
              if (hasDeferredQueue || hasOpenTurn) {
                // Lift Va / eke only — keep pendingTurn for official g / H busy.
                officialStreamClear(sessionId);
                clearOfficialEkeCache(sessionId);
                setStreamSnapshot(null);
                setStreamingMessageId(null);
                setStreamActivityMode(idleStreamActivityMode);
                streamMessageIdRef.current = null;
                streamSnapshotRef.current = null;
                streamActivityModeRef.current = idleStreamActivityMode;
                store.getState().setStreamActivity(sessionId, {
                  streamingMessageId: null,
                  streamActivityMode: idleStreamActivityMode,
                });
              } else {
                clearStreamState(true);
              }
            }
          }
        } else if (stringValue(asRecord(event).type) === "initialization_status") {
          // Official $s / initialization_status → Gv spawnLabel step (plugins/worktree/…).
          const raw = asRecord(event);
          const statusSource = asRecord(raw.initializationStatus);
          const step = stringValue(statusSource.step) ?? stringValue(raw.step);
          const isComplete = typeof statusSource.isComplete === "boolean"
            ? statusSource.isComplete
            : typeof raw.isComplete === "boolean"
              ? raw.isComplete
              : undefined;
          const current = store.getState().buckets[sessionId]?.session ?? null;
          if (current) {
            store.getState().patchSession(sessionId, {
              ...current,
              initializationStatus: {
                ...(asRecord(current.initializationStatus) as Record<string, unknown>),
                ...(step ? { step } : {}),
                ...(isComplete !== undefined ? { isComplete } : {}),
              },
            });
          }
        } else if (stringValue(asRecord(event).type) === "permission_mode_changed") {
          // Official ion-dist: permission_mode_changed → be(s.permissionMode) on Mode pill.
          const raw = asRecord(event);
          const nextMode =
            stringValue(raw.permissionMode)
            ?? stringValue(asRecord(raw.session).permissionMode)
            ?? stringValue(asRecord(raw.payload).permissionMode);
          if (nextMode) {
            store.getState().mergeLiveMeta(sessionId, { permissionMode: nextMode }, { mirrorPermissionMode: true });
            const current = store.getState().buckets[sessionId]?.session ?? null;
            if (current) {
              store.getState().patchSession(sessionId, { ...current, permissionMode: nextMode });
            }
          }
        } else if (stringValue(asRecord(event).type) === "permission_mode_change_failed") {
          // Host refused live CLI set_permission_mode — restore Mode from prior session on event.
          const raw = asRecord(event);
          const priorMode =
            stringValue(asRecord(raw.session).permissionMode)
            ?? stringValue(asRecord(raw.payload).permissionMode)
            ?? stringValue(store.getState().buckets[sessionId]?.session?.permissionMode);
          if (priorMode) {
            store.getState().mergeLiveMeta(sessionId, { permissionMode: priorMode }, { mirrorPermissionMode: true });
            const current = store.getState().buckets[sessionId]?.session ?? null;
            if (current) {
              store.getState().patchSession(sessionId, { ...current, permissionMode: priorMode });
            }
          }
        } else {
          // Non-stream lifecycle events (stopped/error/cleared): metadata reload only when
          // no live typewriter is active.
          const liveId = streamMessageIdRef.current
            ?? streamingMessageId
            ?? officialStreamActiveMessageId(sessionId);
          if (!liveId) void reload({ silent: true });
        }
      } else if (
        stringValue(asRecord(event).type) === "tool_permission_request"
        || stringValue(asRecord(event).type) === "tool_permission_resolved"
        || stringValue(asRecord(event).type) === "tool_permission_response_failed"
      ) {
        // Outside shouldReload: keep pendingToolPermissions on the code session for hydrate / isAwaitingReply.
        void bridgeGetSessionPending(sessionId).then((pending) => {
          const current = store.getState().buckets[sessionId]?.session ?? null;
          if (!current) return;
          store.getState().patchSession(sessionId, {
            ...current,
            pendingToolPermissions: pending,
          });
        });
      }
    };
    const offCode = desktopBridge.LocalSessions.onEvent?.(handleEvent);
    return () => {
      offCode?.();
    };
  }, [clearStreamState, reload, sessionId, store]);

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
    const turnActive = bucket.pendingTurnStartedAt !== null
      || session.isRunning === true
      || bucket.streamActivityMode !== idleStreamActivityMode
      || bucket.streamingMessageId !== null;
    if (!turnActive) return undefined;
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
    bucket.streamActivityMode,
    bucket.streamingMessageId,
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

  // Official Qa = Va?.messageId. streamMessageIdRef is stamped on message_start before
  // React commits setState — must win so eke suppress cannot race durable assistant merges.
  const activeStreamingMessageId =
    streamMessageIdRef.current
    ?? streamingMessageId
    ?? streamSnapshot?.messageId
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
  // Official Xke/pe (index-BELzQL5P): Qke = pendingTurn && !endTurnSeen.
  // Residual Xb isResponding paint: H || "spawning"===Os || null!==Js || bs
  //   H → Xke (not invent host isRunning alone; end_turn keeps pendingTurn with endTurnSeen)
  //   null!==Js → optimistic user (pendingTurnStartedAt after beginLocalUserTurn)
  //   bs → ultrareview launch chrome
  // Residual Gv tokens/elapsed: _e / je maps only — do NOT invent streamTokenEstimate prop.
  const pendingTurnStartedAt = bucket.pendingTurnStartedAt;
  const pendingTurnOpen = pendingTurnStartedAt !== null && !bucket.pendingTurnEndTurnSeen;
  // Residual we = gw(U) — ultrareview progress from system hook_progress/hook_response.
  const reviewProgress = useMemo(
    () => residualExtractUltrareviewProgress(bucket.messages),
    [bucket.messages],
  );
  // Residual isResponding arm for ultrareview: bs (launch in flight) or di (we running).
  // Do NOT invent tag+isRunning → sticky busy / Launching after invent startDiffReview.
  const isUltrareviewBusy = isUltrareviewLaunching
    || reviewProgress?.status === "running";
  // Keep stream-owned chrome while Va still has snapshot / streamingMessageId (after end_turn
  // residual keeps Va until result clears — loader/stream row must not stick via host isRunning).
  const isResponding =
    pendingTurnOpen
    || streamActivityMode !== idleStreamActivityMode
    || streamSnapshot !== null
    || streamingMessageId !== null
    || (bucket.queuedMessages?.length ?? 0) > 0
    || (bucket.pendingQueuedSends ?? 0) > 0
    || isUltrareviewBusy;
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
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
    streamSnapshotRef.current = null;
    streamActivityModeRef.current = idleStreamActivityMode;
    store.getState().markInterrupting(sessionId);
  }, [sessionId, store]);

  // Residual oi gate inputs (c119):
  //   ri = we != null || tags includes "ultrareview"
  //   oi = ri || (empty && ii) — ii/remote Mx not ported (云端不要)
  // Product: expose we + tag so EpitaxyChatPanel can mount oi shell before Vn/Xb.
  const isUltrareviewTagged = Boolean(bucket.session?.tags?.includes("ultrareview"));

  return {
    beginLocalUserTurn,
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

/**
 * Optimistic user transcript row so send does not wait on getTranscript.
 * Prefer durable UUID (createMessageUuid) so CLI echo / cancelQueued share identity (official zke).
 * Fallback local-user-* still matches isOptimisticLocalUser for text promote.
 */
function makeOptimisticUserChatMessage(text: string, messageUuid?: string): ChatMessage {
  const createdAt = new Date().toISOString();
  const id = messageUuid && messageUuid.length > 0
    ? messageUuid
    : `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    role: "user",
    text,
    createdAt,
    raw: {
      type: "user",
      uuid: id,
      timestamp: createdAt,
      // Store marker — stripped naturally when CLI durable echo replaces the row.
      isLocalOptimistic: true,
      message: {
        role: "user",
        content: [{ type: "text", text }],
      },
    },
  };
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

function isSessionEventForId(event: unknown, sessionId: string) {
  const raw = asRecord(event);
  if (raw.sessionId === sessionId || raw.id === sessionId) return true;
  const session = asRecord(raw.session);
  return session.id === sessionId || session.sessionId === sessionId;
}


/**
 * Events that may need stream settle / session metadata handling.
 * Name is historical — do NOT full-reload transcript body for these unless
 * handleEvent's branch explicitly reloads when idle.
 *
 * Official local agent (index-BELzQL5P):
 * - stream_event → Pke.feed only
 * - durable message → append to T (mergeMessage)
 * - session_updated → metadata (title/folders/permissions) only
 * - result → settle stream, no getTranscript thrash
 */
function shouldReloadTranscriptForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    // Keep result so shouldClearOfficialStreamForEvent can settle Va → durable.
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  return type === "transcript_loaded"
    || type === "result"
    || type === "completed"
    || type === "close"
    || type === "error"
    || type === "cleared"
    || type === "stopped"
    || type === "permission_mode_changed"
    || type === "permission_mode_change_failed"
    || type === "session_updated";
}

/**
 * Product residual (observed 3p/gateway jsonl): turn may end with durable assistant
 * `message.stop_reason === "end_turn"` and no stream-json `type:"result"`. Host already
 * signals turn-complete from that row; web must settle Va / promote queue the same way.
 * Do not treat partial assistants (tool_use / null stop_reason) as settle.
 */
function isAssistantEndTurnMessage(message: Record<string, unknown>): boolean {
  if (stringValue(message.type) !== "assistant") return false;
  const nested = asRecord(message.message);
  return stringValue(nested.stop_reason) === "end_turn";
}

function isAssistantEndTurnBridgeEvent(event: unknown): boolean {
  const raw = asRecord(event);
  if (stringValue(raw.type) === "message") {
    return isAssistantEndTurnMessage(asRecord(raw.message));
  }
  return isAssistantEndTurnMessage(raw);
}

/** Host runtime error residual (type error / nested message.type error). */
function isBridgeRuntimeErrorEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "error") return true;
  if (type === "message" && stringValue(asRecord(raw.message).type) === "error") return true;
  return false;
}

function bridgeRuntimeErrorFromEvent(event: unknown): { errorCategory: string | null; message: string } {
  const raw = asRecord(event);
  const nested = asRecord(raw.message);
  const message =
    stringValue(raw.error)
    ?? stringValue(raw.message)
    ?? stringValue(nested.error)
    ?? stringValue(nested.message)
    ?? stringValue(nested.content)
    ?? "Claude Code session failed";
  const errorCategory =
    stringValue(raw.errorCategory)
    ?? stringValue(raw.error_category)
    ?? stringValue(nested.errorCategory)
    ?? stringValue(nested.error_category)
    ?? null;
  return { errorCategory, message };
}

async function bridgeGetSessionPending(sessionId: string): Promise<SessionSummary["pendingToolPermissions"]> {
  try {
    const session = await desktopBridge.LocalSessions.getSession(sessionId);
    return session?.pendingToolPermissions ?? [];
  } catch {
    return [];
  }
}

export function isPlaceholderCodingTitle(title?: string | null) {
  const text = title?.trim() ?? "";
  if (!text) return true;
  if (/^\d+$/.test(text)) return true;
  return text === "Untitled"
    || text === "Untitled session"
    || text === "Coding session"
    || text === "General coding session"
    || text === "New session";
}

async function refreshSessionTitleAfterSettle(sessionId: string): Promise<SessionSummary | null> {
  const bridge = desktopBridge.LocalSessions;
  // Residual summarizeSession is forked live summary (events), NOT title SoT.
  // Product refreshSessionTitle → store.refreshTitleFromTranscript + session_updated.
  if (!bridge.refreshSessionTitle && !bridge.getSession) return null;
  try {
    if (bridge.refreshSessionTitle) {
      const result = await bridge.refreshSessionTitle(sessionId);
      if (!result) return null;
      const current = officialCodeSessionStore.getState().buckets[sessionId]?.session ?? null;
      const nextSession = normalizeSessionSummaryPatch(current, result);
      if (nextSession) officialCodeSessionStore.getState().patchSession(sessionId, nextSession);
      return nextSession;
    }
    // Fallback: re-fetch session after host may have updated title elsewhere.
    const session = await bridge.getSession(sessionId);
    if (!session) return null;
    officialCodeSessionStore.getState().patchSession(sessionId, session);
    return session;
  } catch {
    // Title refresh is best-effort.
    return null;
  }
}

function normalizeSessionSummaryPatch(current: SessionSummary | null, patch: unknown): SessionSummary | null {
  if (!patch || typeof patch !== "object") return current;
  const raw = asRecord(patch);
  const id = stringValue(raw.id) ?? stringValue(raw.sessionId) ?? current?.id;
  if (!id) return current;
  const title = stringValue(raw.title);
  const updatedAtMs = typeof raw.updatedAtMs === "number"
    ? raw.updatedAtMs
    : typeof raw.updatedAt === "string"
      ? Date.parse(raw.updatedAt) || current?.updatedAtMs
      : typeof raw.lastActivityAt === "string"
        ? Date.parse(raw.lastActivityAt) || current?.updatedAtMs
        : current?.updatedAtMs;
  // Keep approval queue on session_updated. Dropping pendingToolPermissions here made
  // isAwaitingReply / hydrate think there was nothing to approve after permission request.
  const pendingToolPermissions = Array.isArray(raw.pendingToolPermissions)
    ? (raw.pendingToolPermissions as NonNullable<SessionSummary["pendingToolPermissions"]>)
    : current?.pendingToolPermissions;
  const permissionMode = stringValue(raw.permissionMode) ?? current?.permissionMode;
  const model = stringValue(raw.model) ?? current?.model;
  // Residual jR session meta effort (He): sparse session_updated must not drop effort —
  // switch-back re-seed uses session.effort / ultracode; missing field was inventing medium.
  const effort = stringValue(raw.effort) ?? current?.effort;
  // Official initialization_status / session_updated may carry init step for Gv spawnLabel.
  const initializationStatus = raw.initializationStatus !== undefined
    ? raw.initializationStatus
    : current?.initializationStatus;
  const hasWorktree = typeof raw.hasWorktree === "boolean" ? raw.hasWorktree : current?.hasWorktree;
  if (!current) {
    return {
      id,
      kind: (stringValue(raw.kind) as SessionSummary["kind"]) ?? "code",
      title: title ?? "Coding session",
      updatedAtMs: updatedAtMs ?? Date.now(),
      isRunning: raw.isRunning === true,
      isArchived: raw.isArchived === true,
      isUnread: raw.isUnread === true,
      pendingToolPermissions,
      permissionMode,
      model,
      effort,
      initializationStatus,
      hasWorktree,
    } as SessionSummary;
  }
  return {
    ...current,
    title: title ?? current.title,
    updatedAtMs: updatedAtMs ?? current.updatedAtMs,
    isRunning: typeof raw.isRunning === "boolean" ? raw.isRunning : current.isRunning,
    isArchived: typeof raw.isArchived === "boolean" ? raw.isArchived : current.isArchived,
    isUnread: typeof raw.isUnread === "boolean" ? raw.isUnread : current.isUnread,
    isAgentCompleted: typeof raw.isAgentCompleted === "boolean" ? raw.isAgentCompleted : current.isAgentCompleted,
    hasCompleted: typeof raw.hasCompleted === "boolean" ? raw.hasCompleted : current.hasCompleted,
    error: stringValue(raw.error) ?? current.error,
    pendingToolPermissions,
    permissionMode,
    model,
    effort,
    initializationStatus,
    hasWorktree,
  };
}

function streamEventMessageFromBridgeEvent(event: unknown): Record<string, unknown> | null {
  const raw = asRecord(event);
  const message = asRecord(raw.message);
  if (raw.type === "message" && message.type === "stream_event") return message;
  return raw.type === "stream_event" ? raw : null;
}

function chatMessageFromBridgeMessageEvent(event: unknown): ChatMessage | null {
  const raw = asRecord(event);
  if (raw.type !== "message") return null;
  const message = asRecord(raw.message);
  if (message.type === "stream_event") return null;
  // Official BELz mergeMessage: parent `type:"result"` is always merged (u).
  // g = result && queue && pendingTurn → continue; h settles. Do NOT drop
  // success results — that invent blocked g promote and left pendingTurn stuck
  // (Stop hollow box after turn finished; host isRunning already false).
  if (message.type === "result") {
    return chatMessageFromRawTranscriptEvent(message);
  }
  if (message.type === "error") return null;
  const type = stringValue(message.type);
  // queue-operation residual: CLI may enqueue <task-notification> XML without
  // system dual-emit yet; Jp parseOfficialTasks reads raw.type === "queue-operation".
  if (
    type !== "assistant"
    && type !== "user"
    && type !== "system"
    && type !== "queue-operation"
  ) {
    return null;
  }
  const chat = chatMessageFromRawTranscriptEvent(message);
  // Keep raw.type=queue-operation for Jp, but role=system so eke does not paint a
  // user bubble of raw XML (role default would be "user" for non user/assistant/system types).
  if (type === "queue-operation" && chat) {
    return { ...chat, role: "system", text: "" };
  }
  return chat;
}

function chatMessageFromRawTranscriptEvent(rawEvent: Record<string, unknown>): ChatMessage {
  const nestedMessage = asRecord(rawEvent.message);
  const rawAuthor = stringValue(rawEvent.author);
  const rawRole = stringValue(rawEvent.role) ?? stringValue(nestedMessage.role);
  const rawType = stringValue(rawEvent.type);
  const role = rawRole === "assistant" || rawRole === "system"
    ? rawRole
    : rawAuthor === "assistant"
      ? "assistant"
      : rawAuthor === "system"
        ? "system"
        : rawType === "assistant"
          ? "assistant"
          : rawType === "system"
            ? "system"
            : "user";
  const createdAt = stringValue(rawEvent.createdAt) ?? stringValue(rawEvent.timestamp) ?? new Date().toISOString();
  const id = stringValue(rawEvent.id) ?? stringValue(rawEvent.uuid) ?? stringValue(rawEvent.message_id) ?? stringValue(nestedMessage.id) ?? `msg_${Date.now()}`;
  return {
    id,
    role,
    text: rawTranscriptEventText(rawEvent),
    createdAt,
    raw: rawEvent,
  };
}

function rawTranscriptEventText(rawEvent: Record<string, unknown>) {
  const direct = stringValue(rawEvent.text) ?? stringValue(rawEvent.content) ?? stringValue(rawEvent.result) ?? stringValue(rawEvent.error);
  if (direct) return direct;
  const nestedMessage = asRecord(rawEvent.message);
  const nestedDirect = stringValue(nestedMessage.text) ?? stringValue(nestedMessage.content);
  if (nestedDirect) return nestedDirect;
  const content = Array.isArray(nestedMessage.content) ? nestedMessage.content : rawMessageContent(rawEvent);
  return content.map((item) => {
    const record = asRecord(item);
    if (stringValue(record.type) === "text") return stringValue(record.text) ?? "";
    if (stringValue(record.type) === "thinking") return stringValue(record.thinking) ?? "";
    if (stringValue(record.type) === "tool_result") return stringValue(record.content) ?? "";
    return "";
  }).join("");
}

function isOfficialStreamMessageStart(streamMessage: Record<string, unknown>) {
  return stringValue(asRecord(streamMessage.event).type) === "message_start";
}

function officialStreamMessageId(streamMessage: Record<string, unknown>) {
  // Official Pke: event.message.id only (index-BELzQL5P). Outer uuid must not drive Qa/eke.
  const event = asRecord(streamMessage.event);
  const message = asRecord(event.message);
  return stringValue(message.id) ?? null;
}

/** Activity mode from official inner stream event (`content_block_delta` etc.). */
function streamActivityModeFromInnerEvent(event: Record<string, unknown>, currentMode: StreamActivityMode): StreamActivityMode {
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return "requesting";
  if (eventType === "message_stop") return currentMode;
  if (eventType === "content_block_start") {
    const contentBlock = asRecord(event.content_block);
    const blockType = stringValue(contentBlock.type);
    if (blockType === "thinking") return "thinking";
    if (blockType === "tool_use") return "tool-use";
  }
  if (eventType === "content_block_delta") {
    const delta = asRecord(event.delta);
    const deltaType = stringValue(delta.type);
    if (deltaType === "thinking_delta") return "thinking";
    if (deltaType === "text_delta" || deltaType === "connector_text_delta") return "responding";
  }
  return currentMode;
}

/**
 * After mergeMessage of a parent result: official `g` is false when the queue is
 * empty, so pendingTurn is already null. Fall through to settle Va.
 * Continue (`g`) leaves a fresh pendingTurn — keep running (return false).
 * Success and error results both merge (BELz u); only empty-queue h settles here.
 */
function shouldSettleEmptyQueueAfterMergedResult(
  event: unknown,
  bucket: {
    pendingTurnStartedAt: number | null;
    queuedMessages?: unknown[];
    pendingQueuedSends?: number;
  } | undefined,
): boolean {
  const raw = asRecord(event);
  const message = raw.type === "message" ? asRecord(raw.message) : raw;
  if (stringValue(message.type) !== "result") return false;
  // Official u: parent result only (subagent results keep parent_tool_use_id).
  if (message.parent_tool_use_id != null && message.parent_tool_use_id !== "") return false;
  if (!bucket) return false;
  return bucket.pendingTurnStartedAt === null
    && (bucket.queuedMessages?.length ?? 0) === 0
    && (bucket.pendingQueuedSends ?? 0) === 0;
}

function shouldClearOfficialStreamForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "error" || messageType === "completed";
  }
  return type === "result"
    || type === "completed"
    || type === "close"
    || type === "error"
    || type === "cleared"
    || type === "stopped";
}

function shouldSettleOfficialStreamForEvent(event: unknown) {
  const raw = asRecord(event);
  const type = stringValue(raw.type);
  if (type === "message") {
    const messageType = stringValue(asRecord(raw.message).type);
    return messageType === "result" || messageType === "completed";
  }
  return type === "result" || type === "completed" || type === "close";
}

function streamActivityModeFromStreamEvent(streamMessage: Record<string, unknown>, currentMode: StreamActivityMode): StreamActivityMode {
  const event = asRecord(streamMessage.event);
  const eventType = stringValue(event.type);
  if (eventType === "message_start") return "requesting";
  if (eventType === "message_stop") return currentMode;
  if (eventType === "content_block_start") {
    const contentBlock = asRecord(event.content_block);
    const blockType = stringValue(contentBlock.type);
    if (blockType === "thinking") return "thinking";
    if (blockType === "tool_use") return "tool-use";
  }
  if (eventType === "content_block_delta") {
    const delta = asRecord(event.delta);
    const deltaType = stringValue(delta.type);
    if (deltaType === "thinking_delta") return "thinking";
    if (deltaType === "text_delta" || deltaType === "connector_text_delta") return "responding";
  }
  return currentMode;
}

function parseJsonObject(value: string): Record<string, unknown> | null {
  if (!value.trim()) return null;
  try {
    const parsed = JSON.parse(value);
    return asRecord(parsed);
  } catch {
    return null;
  }
}

function officialMessageIdentity(message: ChatMessage) {
  const raw = asRecord(message.raw);
  return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
}
