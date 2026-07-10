import { useLayoutEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { CoworkAssistantSequenceItem, CoworkAssistantTimelineItem } from "./coworkMessageTypes";

export type CoworkAssistantTimelineState = {
  currentStatus?: string;
  isThisMessageStreaming: boolean;
  timelines: CoworkAssistantTimelineItem[];
};

export type CoworkAssistantTimelineStore = StoreApi<CoworkAssistantTimelineState>;

const initialState: CoworkAssistantTimelineState = {
  currentStatus: undefined,
  isThisMessageStreaming: false,
  timelines: [],
};

export function useCoworkAssistantTimelineStore() {
  const storeRef = useRef<CoworkAssistantTimelineStore | null>(null);
  if (!storeRef.current) storeRef.current = createStore(() => initialState);
  return storeRef.current;
}

export function useCoworkTimelineStoreItem(store: CoworkAssistantTimelineStore, timelineIndex: number) {
  return useStore(store, (state) => state.timelines[timelineIndex]);
}

export function useCoworkTimelineStreamingState(store: CoworkAssistantTimelineStore) {
  return useStore(store, (state) => state.isThisMessageStreaming);
}

export function useCoworkTimelineCurrentStatus(store: CoworkAssistantTimelineStore) {
  return useStore(store, (state) => state.currentStatus);
}

export function useSyncCoworkAssistantTimelineStore(
  store: CoworkAssistantTimelineStore,
  sequence: CoworkAssistantSequenceItem[],
  isThisMessageStreaming: boolean,
) {
  const nextState = useMemo(() => buildTimelineState(sequence, isThisMessageStreaming), [isThisMessageStreaming, sequence]);
  useLayoutEffect(() => {
    const current = store.getState();
    if (!sameTimelineState(current, nextState)) store.setState(nextState, true);
  }, [nextState, store]);
}

function buildTimelineState(sequence: CoworkAssistantSequenceItem[], isThisMessageStreaming: boolean) {
  const timelines = sequence.flatMap((item) => item.kind === "timeline" ? [item] : []);
  return {
    currentStatus: isThisMessageStreaming ? "Working" : undefined,
    isThisMessageStreaming,
    timelines,
  };
}

function sameTimelineState(current: CoworkAssistantTimelineState, next: CoworkAssistantTimelineState) {
  if (current.isThisMessageStreaming !== next.isThisMessageStreaming
    || current.currentStatus !== next.currentStatus
    || current.timelines.length !== next.timelines.length) return false;
  return current.timelines.every((item, index) => sameTimelineItem(item, next.timelines[index]));
}

function sameTimelineItem(current: CoworkAssistantTimelineItem, next?: CoworkAssistantTimelineItem) {
  if (!next) return false;
  return current.segment === next.segment
    && current.contentAfter === next.contentAfter
    && current.contentAfterIndex === next.contentAfterIndex
    && current.contentHasTextAfter === next.contentHasTextAfter
    && current.isFirst === next.isFirst
    && current.isLastContent === next.isLastContent
    && current.liveUpdates === next.liveUpdates;
}
