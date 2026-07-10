import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { coworkSessionsBridge, loadCoworkSession } from "./coworkSessionBridge";
import {
  coworkStreamActivity,
  coworkStreamMessage,
  coworkStreamMessageId,
  coworkTranscriptMessage,
  isCoworkSessionEvent,
  isCoworkStreamStart,
  mergeCoworkTranscriptMessage,
  shouldClearCoworkStream,
  shouldReloadCoworkTranscript,
  shouldSettleCoworkStream,
} from "./coworkSessionEvents";
import { createCoworkSessionStreamSmoother } from "./stream/coworkStreamSmoother";
import { mergeCoworkStream, estimateCoworkStreamTokens } from "./transcript/coworkStreamTranscript";
import { parseCoworkTranscript } from "./transcript/coworkTranscriptParser";
import type { CoworkSessionDataState } from "./types";

const sessionDataCache = new Map<string, CoworkSessionDataState>();
const idleActivity = "idle" as const;

export function useCoworkSessionData(sessionId: string) {
  const [state, setState] = useCachedSessionState(sessionId);
  const smootherRef = useRef(createCoworkSessionStreamSmoother());
  const streamGenerationRef = useRef(0);
  const finalizingGenerationRef = useRef<number | null>(null);
  const clearStream = useClearCoworkStream(setState, smootherRef);
  const reload = useCoworkSessionReload(sessionId, setState, clearStream);
  const subscription = useMemo(() => ({
    clearStream,
    finalizingGenerationRef,
    reload,
    sessionId,
    setState,
    smootherRef,
    streamGenerationRef,
  }), [clearStream, reload, sessionId, setState]);

  useCoworkSmoother(sessionId, setState, smootherRef);
  useCoworkSessionSubscription(subscription);

  const activeMessageId = state.streamingMessageId ?? state.streamSnapshot?.messageId ?? null;
  const parsedEntries = useMemo(() => parseCoworkTranscript(state.messages, activeMessageId), [activeMessageId, state.messages]);
  const entries = useMemo(() => mergeCoworkStream(parsedEntries, state.streamSnapshot), [parsedEntries, state.streamSnapshot]);
  const streamTokenEstimate = useMemo(() => estimateCoworkStreamTokens(state.streamSnapshot), [state.streamSnapshot]);
  const isResponding = state.streamActivity !== idleActivity || state.streamSnapshot !== null
    || state.streamingMessageId !== null || state.session?.isRunning === true;
  return { ...state, entries, isResponding, reload, streamTokenEstimate };
}

function useCachedSessionState(sessionId: string) {
  const [state, setLocalState] = useState(() => sessionDataCache.get(sessionId) ?? emptySessionState(true));
  const setState = useCallback((updater: CoworkSessionDataState | ((current: CoworkSessionDataState) => CoworkSessionDataState)) => {
    setLocalState((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      sessionDataCache.set(sessionId, next);
      return next;
    });
  }, [sessionId]);
  useEffect(() => {
    setLocalState(sessionDataCache.get(sessionId) ?? emptySessionState(true));
  }, [sessionId]);
  return [state, setState] as const;
}

function useCoworkSmoother(sessionId: string, setState: SessionStateSetter, smootherRef: SmootherRef) {
  useEffect(() => {
    const smoother = createCoworkSessionStreamSmoother();
    smootherRef.current.dispose();
    smootherRef.current = smoother;
    const unsubscribe = smoother.subscribe((streamSnapshot) => setState((current) => ({ ...current, streamSnapshot })));
    return () => {
      unsubscribe();
      smoother.dispose();
    };
  }, [sessionId, setState, smootherRef]);
}

function useClearCoworkStream(setState: SessionStateSetter, smootherRef: SmootherRef) {
  return useCallback((markSessionSettled = false) => {
    smootherRef.current.clear();
    setState((current) => ({
      ...current,
      pendingTurnStartedAt: null,
      session: markSessionSettled && current.session ? { ...current.session, isRunning: false } : current.session,
      streamActivity: idleActivity,
      streamingMessageId: null,
      streamSnapshot: null,
    }));
  }, [setState, smootherRef]);
}

function useCoworkSessionReload(sessionId: string, setState: SessionStateSetter, clearStream: (settled?: boolean) => void) {
  const loadSequence = useRef(0);
  const reload = useCallback(async () => {
    const sequence = ++loadSequence.current;
    setState((current) => ({ ...current, error: null, isLoading: current.session === null && current.messages.length === 0 && current.streamSnapshot === null }));
    try {
      const next = await loadCoworkSession(sessionId);
      if (loadSequence.current !== sequence) return;
      setLoadedState(next, setState, clearStream);
    } catch (caught) {
      if (loadSequence.current !== sequence) return;
      setState((current) => ({ ...current, error: caught instanceof Error ? caught : new Error(String(caught)), isLoading: false }));
    }
  }, [clearStream, sessionId, setState]);
  useEffect(() => { void reload(); }, [reload]);
  return reload;
}

function setLoadedState(next: Awaited<ReturnType<typeof loadCoworkSession>>, setState: SessionStateSetter, clearStream: (settled?: boolean) => void) {
  const sessionSettled = next?.session.isRunning !== true;
  if (sessionSettled) clearStream();
  setState((current) => ({
    error: null,
    isLoading: false,
    isSessionNotFound: !next,
    messages: next?.messages ?? [],
    pendingTurnStartedAt: sessionSettled ? null : current.pendingTurnStartedAt,
    session: next?.session ?? null,
    streamActivity: sessionSettled ? idleActivity : current.streamActivity,
    streamingMessageId: sessionSettled ? null : current.streamingMessageId,
    streamSnapshot: sessionSettled ? null : current.streamSnapshot,
  }));
}

type SubscriptionContext = {
  clearStream: (settled?: boolean) => void;
  finalizingGenerationRef: { current: number | null };
  reload: () => Promise<void>;
  sessionId: string;
  setState: SessionStateSetter;
  smootherRef: SmootherRef;
  streamGenerationRef: { current: number };
};

function useCoworkSessionSubscription(context: SubscriptionContext) {
  useEffect(() => {
    const handleEvent = (event: unknown) => {
      if (!isCoworkSessionEvent(event, context.sessionId)) return;
      const streamMessage = coworkStreamMessage(event);
      if (streamMessage) handleStreamMessage(context, streamMessage);
      else {
        const message = coworkTranscriptMessage(event);
        if (message) context.setState((current) => mergeCoworkTranscriptMessage(current, message));
        else if (shouldReloadCoworkTranscript(event)) handleSettlingEvent(context, event);
      }
    };
    return coworkSessionsBridge.onEvent?.(handleEvent);
  }, [context]);
}

function handleStreamMessage(context: SubscriptionContext, streamMessage: Record<string, unknown>) {
  const isStart = isCoworkStreamStart(streamMessage);
  if (isStart) {
    context.streamGenerationRef.current += 1;
    context.finalizingGenerationRef.current = null;
  }
  context.setState((current) => ({
    ...current,
    pendingTurnStartedAt: isStart || current.pendingTurnStartedAt === null ? Date.now() : current.pendingTurnStartedAt,
    streamActivity: coworkStreamActivity(streamMessage, current.streamActivity),
    streamingMessageId: (isStart ? coworkStreamMessageId(streamMessage) : null) ?? current.streamingMessageId,
  }));
  context.smootherRef.current.feed(streamMessage);
}

function handleSettlingEvent(context: SubscriptionContext, event: unknown) {
  if (!shouldClearCoworkStream(event)) {
    void context.reload();
    return;
  }
  const generation = context.streamGenerationRef.current;
  const finalize = () => {
    if (context.streamGenerationRef.current !== generation) return;
    context.finalizingGenerationRef.current = null;
    context.clearStream(true);
  };
  if (!shouldSettleCoworkStream(event)) {
    finalize();
    return;
  }
  if (context.finalizingGenerationRef.current === generation) return;
  context.finalizingGenerationRef.current = generation;
  void context.smootherRef.current.settleAfterReveal().finally(finalize);
}

function emptySessionState(isLoading: boolean): CoworkSessionDataState {
  return {
    error: null,
    isLoading,
    isSessionNotFound: false,
    messages: [],
    pendingTurnStartedAt: null,
    session: null,
    streamActivity: idleActivity,
    streamingMessageId: null,
    streamSnapshot: null,
  };
}

type SessionStateSetter = (updater: CoworkSessionDataState | ((current: CoworkSessionDataState) => CoworkSessionDataState)) => void;
type SmootherRef = { current: ReturnType<typeof createCoworkSessionStreamSmoother> };
