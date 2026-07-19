/**
 * Official session data hook + load/stream event helpers (c11959232 he/Pe/Xa).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import {
  useCallback,
  useEffect,
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
  estimateOfficialStreamSnapshotTokens,
  mergeOfficialStreamSnapshot,
  parseOfficialTranscriptEntries,
  parseOfficialTranscriptEntriesCached,
  rawMessageContent,
  type TranscriptEntry,
} from "./officialTranscriptParse";
import type { OfficialStreamSnapshot } from "../officialStreamSmoother";
import {
  officialClearTurnStarted,
  officialGetStreamTokenEstimate,
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
  officialStreamSubscribeStore,
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
import type { EpitaxySessionType } from "./epitaxyTranscriptActionContext";

const composerDropdownButtonClass = "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2";

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


export function SessionNotFound({ onBack }: { onBack: () => Promise<void> }) {
  return (
    <div className="h-full flex items-center justify-center text-body text-t5">
      <div className="flex flex-col items-center gap-g5">
        <span>找不到这个会话。</span>
        <button className={composerDropdownButtonClass} onClick={() => void onBack()} type="button">重试</button>
      </div>
    </div>
  );
}

export function SessionError({ error, onRetry }: { error: Error; onRetry: () => Promise<void> }) {
  return (
    <div className="h-full flex items-center justify-center text-body text-t5">
      <div className="flex max-w-[360px] flex-col items-center gap-g5 text-center">
        <span>Something went wrong loading this session.</span>
        <code className="text-code text-t6 break-words">{error.message}</code>
        <button className={composerDropdownButtonClass} onClick={() => void onRetry()} type="button">Retry</button>
      </div>
    </div>
  );
}

export function useEpitaxySessionType(sessionId?: string): EpitaxySessionType {
  const [sessionType, setSessionType] = useState<EpitaxySessionType>(() => inferSessionType(sessionId));

  useEffect(() => {
    let alive = true;
    setSessionType(inferSessionType(sessionId));
    if (!sessionId) return () => { alive = false; };

    desktopBridge.LocalSessions.list().then((sessions) => {
      if (!alive) return;
      setSessionType(inferSessionType(sessionId, sessions.find((session) => session.id === sessionId)));
    }).catch(() => undefined);

    return () => { alive = false; };
  }, [sessionId]);

  return sessionType;
}

export function useFocusedSession(sessionId?: string) {
  useEffect(() => {
    void desktopBridge.LocalSessions.setFocusedSession?.(sessionId ?? null);
    return () => {
      void desktopBridge.LocalSessions.setFocusedSession?.(null);
    };
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
  // Official Va is Pe.subscribe → local state. c119 uses startTransition for same-messageId
  // ticks, but React 19 concurrent scheduling in Electron drops intermediate 60fps lengths
  // (paragraph dumps). Subscribe with useSyncExternalStore so every Oke emit is committed.
  const streamSnapshot = useSyncExternalStore(
    useCallback((onStoreChange) => {
      if (!sessionId) return () => undefined;
      return officialStreamSubscribeStore(sessionId, onStoreChange);
    }, [sessionId]),
    useCallback(() => officialStreamGetSnapshot(sessionId), [sessionId]),
    () => null,
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [streamActivityMode, setStreamActivityMode] = useState<StreamActivityMode>(idleStreamActivityMode);
  const streamMessageIdRef = useRef<string | null>(null);
  const streamSnapshotRef = useRef<OfficialStreamSnapshot>(null);
  const streamActivityModeRef = useRef<StreamActivityMode>(idleStreamActivityMode);
  streamSnapshotRef.current = streamSnapshot;
  streamActivityModeRef.current = streamActivityMode;

  // Keep Qa/eke suppress + char budget in lockstep with Va without startTransition lag.
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
    // Dev probe for live typewriter cadence (window.__tileVaDiag).
    const win = window as typeof window & { __tileVaDiag?: Array<{ t: number; chars: number }> };
    const diag = win.__tileVaDiag ?? [];
    diag.push({ t: performance.now(), chars });
    if (diag.length > 400) diag.splice(0, diag.length - 400);
    win.__tileVaDiag = diag;
    officialSetStreamCharBudget(sessionId, chars);
    streamMessageIdRef.current = nextId;
    setStreamingMessageId((current) => (current === nextId ? current : nextId));
  }, [sessionId, streamSnapshot]);

  useEffect(() => {
    if (!sessionId) {
      setStreamActivityMode(idleStreamActivityMode);
      streamMessageIdRef.current = null;
      return undefined;
    }
    // Dev probe: expose a simulator so the main process can drive a synthetic stream
    // and measure paint cadence without calling the real CLI.
    const win = window as typeof window & Record<string, unknown>;
    win.__simulateOfficialStream = (targetSessionId: string) => {
      const apiMsgId = `simulate_${Date.now()}`;
      officialStreamFeed(targetSessionId, {
        type: "stream_event",
        event: { type: "message_start", message: { id: apiMsgId, model: "claude-opus", usage: {} } },
        parent_tool_use_id: null,
      });
      officialStreamFeed(targetSessionId, {
        type: "stream_event",
        event: { type: "content_block_start", index: 0, content_block: { type: "text", text: "" } },
        parent_tool_use_id: null,
      });
      const words = "alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega".split(" ");
      let i = 0;
      const tick = () => {
        if (i >= words.length) {
          officialStreamFeed(targetSessionId, { type: "stream_event", event: { type: "message_stop" }, parent_tool_use_id: null });
          return;
        }
        const word = i === 0 ? words[i] : ` ${words[i]}`;
        i += 1;
        officialStreamFeed(targetSessionId, {
          type: "stream_event",
          event: { type: "content_block_delta", index: 0, delta: { type: "text_delta", text: word } },
          parent_tool_use_id: null,
        });
        setTimeout(tick, 30);
      };
      tick();
    };
    store.getState().ensureBucket(sessionId);
    // Official Pe.setVisibility — transcript is visible while this tile is mounted.
    const transcriptVisibleRef = { current: true };
    officialStreamSetVisibility(sessionId, () => transcriptVisibleRef.current);
    return () => {
      // Official: if no listeners left, setVisibility(() => false)
      if (!officialStreamHasListeners(sessionId)) {
        officialStreamSetVisibility(sessionId, () => false);
      }
    };
  }, [sessionId, store]);

  useEffect(() => {
    streamGenerationRef.current += 1;
    finalizeStreamGenerationRef.current = null;
    if (!sessionId) return;
    officialStreamClear(sessionId);
    clearOfficialEkeCache(sessionId);
    setStreamingMessageId(null);
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
  }, [sessionId]);

  const clearStreamState = useCallback((markSessionSettled = false) => {
    if (!sessionId) return;
    // Promote Va only when durable does not already hold this Anthropic message id
    // (CLI final assistant dump usually lands first — re-promoting duplicated the whole turn).
    const live = streamSnapshotRef.current;
    if (markSessionSettled && live && live.blocks.length > 0) {
      const alreadyDurable = store.getState().buckets[sessionId]?.messages.some((message) => {
        if (message.role !== "assistant") return false;
        const raw = asRecord(message.raw);
        const nested = asRecord(raw.message);
        const anthropicId = stringValue(nested.id) ?? stringValue(raw.message_id) ?? message.id;
        return anthropicId === live.messageId;
      });
      if (!alreadyDurable) {
        const content: Array<Record<string, unknown>> = [];
        for (const block of live.blocks) {
          if (block.kind === "text" && block.text) content.push({ type: "text", text: block.text });
          else if (block.kind === "thinking" && block.text) content.push({ type: "thinking", thinking: block.text });
          else if (block.kind === "tool") {
            content.push({
              type: "tool_use",
              id: block.id,
              name: block.name,
              input: (() => {
                try { return JSON.parse(block.partialJson || "{}"); } catch { return {}; }
              })(),
            });
          }
        }
        if (content.length > 0) {
          const text = content
            .map((block) => (typeof block.text === "string" ? block.text : ""))
            .filter(Boolean)
            .join("");
          const createdAt = new Date().toISOString();
          store.getState().mergeMessage(sessionId, {
            id: live.messageId,
            role: "assistant",
            text,
            createdAt,
            raw: {
              type: "assistant",
              uuid: live.messageId,
              timestamp: createdAt,
              message: {
                id: live.messageId,
                role: "assistant",
                content,
              },
            },
          });
        }
      }
    }
    officialStreamClear(sessionId);
    // Official Jwe(sessionId) drops Xwe cache when stream settles / clears.
    clearOfficialEkeCache(sessionId);
    if (markSessionSettled) officialClearTurnStarted(sessionId);
    setStreamingMessageId(null);
    setStreamActivityMode(idleStreamActivityMode);
    streamMessageIdRef.current = null;
    streamSnapshotRef.current = null;
    streamActivityModeRef.current = idleStreamActivityMode;
    store.getState().clearStream(sessionId, markSessionSettled);
  }, [sessionId, store]);

  const reload = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent === true;
    if (!sessionId) return;
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
    // Fresh turn: official beginPendingTurn + je turn-start stamp (stable for Gv elapsed).
    officialMarkTurnStarted(sessionId);
    store.getState().beginPendingTurn(sessionId, optimistic);
    setStreamActivityMode("requesting");
    return { queued: false as const, uuid: optimistic.id };
  }, [sessionId, store]);

  // Official yt → ve.mutateAsync({ ref, uuid }) → Yr cancelQueued + dropQueuedMessage.
  const cancelQueuedMessage = useCallback((uuid: string) => {
    if (!sessionId) return;
    store.getState().dropQueuedMessage(sessionId, uuid);
    void desktopBridge.LocalSessions.cancelQueuedMessage?.(sessionId, uuid);
  }, [sessionId, store]);

  useEffect(() => {
    let alive = true;
    if (!sessionId) return () => { alive = false; };
    const existing = store.getState().buckets[sessionId];
    const silent = Boolean(existing && (existing.messages.length > 0 || existing.session));
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
        const parentToolUseId = streamMessage.parent_tool_use_id ?? streamMessage.parentToolUseId;
        const innerEvent = asRecord(streamMessage.event);
        const isStart = stringValue(innerEvent.type) === "message_start";
        // Official Pke/Qa: Anthropic event.message.id only — never outer stream_event.uuid.
        const streamMessageId = isStart
          ? (stringValue(asRecord(innerEvent.message).id) ?? null)
          : null;
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
        } else if (store.getState().buckets[sessionId]?.session?.isRunning !== true) {
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
        return;
      }
      if (shouldReloadTranscriptForEvent(event)) {
        if (shouldClearOfficialStreamForEvent(event)) {
          const streamGeneration = streamGenerationRef.current;
          const finalize = () => {
            if (streamGenerationRef.current !== streamGeneration) return;
            finalizeStreamGenerationRef.current = null;
            clearStreamState(true);
            // Official does not full-reload transcript on every result; mergeMessage already
            // holds durable rows. Avoid silent reload thrash that "refreshes old messages".
            void refreshSessionTitleAfterSettle(sessionId).then((nextSession) => {
              if (!nextSession) return;
              if (streamGenerationRef.current !== streamGeneration) return;
              store.getState().patchSession(sessionId, nextSession);
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
            const patched = normalizeSessionSummaryPatch(store.getState().buckets[sessionId]?.session ?? null, nextSession);
            if (patched) store.getState().patchSession(sessionId, patched);
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

  // Official Ja
  const isLoading = Boolean(sessionId) && (bucket.isTranscriptPending || bucket.isMetaPending);

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
  // Official Gv spawnLabel (c11959232 Xb): bs ultrareview / spawning / J cold-start / init step.
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
  // Official isResponding on Xb: H || spawning || null!==Js || bs — keep loader while spawnLabel set.
  const isResponding =
    streamActivityMode !== idleStreamActivityMode
    || streamSnapshot !== null
    || streamingMessageId !== null
    || bucket.session?.isRunning === true
    || (bucket.queuedMessages?.length ?? 0) > 0
    || (bucket.pendingQueuedSends ?? 0) > 0
    || Boolean(spawnLabel);
  // Official Ya = Kwe(Xa, Va). Tool settle is eke/rke object-ref mutation — no settleOrphan invent.
  // Official also appends ge (queued Hb rows) after the main stream-merged transcript.
  const entries = useMemo(() => {
    const merged = mergeOfficialStreamSnapshot(parsedEntries, streamSnapshot);
    if (queuedEntries.length === 0) return merged;
    return [...merged, ...queuedEntries];
  }, [parsedEntries, queuedEntries, streamSnapshot]);
  const streamTokenEstimate = sessionId
    ? officialGetStreamTokenEstimate(sessionId) || estimateOfficialStreamSnapshotTokens(streamSnapshot)
    : estimateOfficialStreamSnapshotTokens(streamSnapshot);
  const pendingTurnStartedAt = sessionId
    ? (officialGetTurnStartedAt(sessionId) ?? bucket.pendingTurnStartedAt)
    : bucket.pendingTurnStartedAt;

  const stopLiveTurn = useCallback(async () => {
    // Official wt(): clear local Va/stream flags immediately so the stop button
    // and loader drop without waiting for CLI process exit / reload.
    clearStreamState(true);
  }, [clearStreamState]);

  return {
    beginLocalUserTurn,
    cancelQueuedMessage,
    entries,
    error: bucket.error,
    isLoading,
    isResponding,
    isSessionNotFound: bucket.isSessionNotFound,
    messages: bucket.messages,
    pendingTurnStartedAt,
    reload,
    session: bucket.session,
    spawnLabel,
    stopLiveTurn,
    streamTokenEstimate,
  };
}

/**
 * Official Gv spawnLabel (c11959232):
 *   bs ultrareview launch → Launching Ultrareview…
 *   spawning + init step plugins → Setting up plugins…
 *   spawning + (worktree step | local useWorktree pending) → Creating worktree…
 *   spawning | J (id expected, meta not yet) → Starting session…
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
  // Official tags includes ultrareview while remote agent progress may also show; keep launch flag primary.
  if (session?.tags?.includes("ultrareview") && session.isRunning) return "Launching Ultrareview…";
  // Official J = expectedId && !meta — cold navigate before meta arrives.
  const awaitingMeta = hasSessionId && !session && !isSessionNotFound && isMetaPending;
  const init = parseOfficialInitializationStatus(session?.initializationStatus);
  // Only incomplete init drives spawn chrome; completed/absent status must not stick.
  const initIncomplete = Boolean(init && init.isComplete !== true);
  const step = init?.step ?? null;

  // Official $s step while spawning: plugins / worktree / default Starting session.
  if (initIncomplete) {
    if (step === "plugins") return "Setting up plugins…";
    if (step === "worktree") return "Creating worktree…";
    return "Starting session…";
  }
  // Official J branch: id expected, meta not loaded yet.
  if (awaitingMeta) return "Starting session…";
  return undefined;
}

function parseOfficialInitializationStatus(value: unknown): {
  isComplete?: boolean;
  step?: string | null;
} | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const step = typeof raw.step === "string" ? raw.step : null;
  const isComplete = typeof raw.isComplete === "boolean" ? raw.isComplete : undefined;
  if (step == null && isComplete === undefined) return null;
  return { isComplete, step };
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

async function loadEpitaxySession(sessionId: string): Promise<{ messages: ChatMessage[]; session: SessionSummary } | null> {
  const bridge = desktopBridge.LocalSessions;
  const session = await bridge.getSession(sessionId).catch(() => null);
  if (!session) return null;
  const transcript = await bridge.getTranscript?.(sessionId).catch(() => undefined);
  const sessionMessages = session.messages ?? [];
  const transcriptMessages = transcript?.length ? transcript : [];
  // Load-time collapse (not live upsert):
  // - Assistant → Anthropic message.id (one turn one history row; multi-emit partials collapse)
  // - Prefer content-block richness over text.length so tools/thinking are not wiped
  // - User → outer uuid/id
  const identityOf = (message: ChatMessage) => {
    const raw = asRecord(message.raw);
    const nested = asRecord(raw.message);
    if (message.role === "assistant" || stringValue(raw.type) === "assistant") {
      return stringValue(nested.id) ?? stringValue(raw.message_id) ?? stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
    }
    return stringValue(raw.uuid) ?? stringValue(raw.id) ?? message.id;
  };
  const isStreamEvent = (message: ChatMessage) => stringValue(asRecord(message.raw).type) === "stream_event";
  const byId = new Map<string, ChatMessage>();
  const order: string[] = [];
  const put = (message: ChatMessage) => {
    if (isStreamEvent(message)) return;
    const key = identityOf(message);
    const existing = byId.get(key);
    if (!existing) {
      byId.set(key, message);
      order.push(key);
      return;
    }
    if (chatMessageContentRichness(message) >= chatMessageContentRichness(existing)) {
      byId.set(key, message);
    }
  };
  // Preserve transcript order first, then append durable-only rows (optimistic user etc.).
  for (const message of transcriptMessages) put(message);
  for (const message of sessionMessages) put(message);
  const messages = order.map((key) => byId.get(key)!).filter(Boolean);
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
    || type === "session_updated";
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
  if (!bridge.summarizeSession) return null;
  try {
    const result = await bridge.summarizeSession(sessionId);
    // Desktop also dispatches session_updated; apply return shape so fake/web-only bridges update header immediately.
    if (!result || typeof result === "string") return null;
    const title = typeof result.title === "string" ? result.title : null;
    const sessionPatch = result.session ?? (title ? { id: sessionId, title } : null);
    if (!sessionPatch && !title) return null;
    const current = officialCodeSessionStore.getState().buckets[sessionId]?.session ?? null;
    const nextSession = normalizeSessionSummaryPatch(
      current,
      sessionPatch ?? { id: sessionId, title },
    );
    if (nextSession) officialCodeSessionStore.getState().patchSession(sessionId, nextSession);
    return nextSession;
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
  // Official eke keeps result / system task events in the transcript stream so
  // turn_error + task_event items can render without waiting for full reload.
  if (message.type === "result") {
    if (message.is_error !== true && message.isError !== true) return null;
    return chatMessageFromRawTranscriptEvent(message);
  }
  if (message.type === "error") return null;
  const type = stringValue(message.type);
  if (type !== "assistant" && type !== "user" && type !== "system") return null;
  return chatMessageFromRawTranscriptEvent(message);
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
