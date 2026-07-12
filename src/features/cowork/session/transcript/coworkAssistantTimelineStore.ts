import { useLayoutEffect, useMemo, useRef } from "react";
import { useStore } from "zustand";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { CoworkAssistantSequenceItem, CoworkAssistantTimelineItem, CoworkContentBlock, CoworkContentSegment } from "./coworkMessageTypes";

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
  return sameTimelineBlocks(current, next)
    && current.segment.statusText === next.segment.statusText
    && current.segment.summaryType === next.segment.summaryType
    && current.segment.timelineIndex === next.segment.timelineIndex
    && sameContentSegment(current.contentAfter, next.contentAfter)
    && current.contentAfterIndex === next.contentAfterIndex
    && current.contentHasTextAfter === next.contentHasTextAfter
    && current.isFirst === next.isFirst
    && current.isLastContent === next.isLastContent
    && current.liveUpdates === next.liveUpdates;
}

function sameTimelineBlocks(current: CoworkAssistantTimelineItem, next: CoworkAssistantTimelineItem) {
  if (current.liveUpdates) return current.segment.blocks === next.segment.blocks;
  return sameSettledBlocks(current.segment.blocks, next.segment.blocks);
}

function sameSettledBlocks(current: CoworkContentBlock[], next: CoworkContentBlock[]) {
  if (current === next) return true;
  if (current.length !== next.length) return false;
  return current.every((block, index) => sameSettledBlock(block, next[index]));
}

function sameSettledBlock(current: CoworkContentBlock, next: CoworkContentBlock) {
  if (current === next) return true;
  if (current.type !== next.type) return false;
  const currentId = current.id ?? current.tool_use_id;
  const nextId = next.id ?? next.tool_use_id;
  if (currentId !== undefined && currentId === nextId && current.stop_timestamp === next.stop_timestamp) return true;
  if (current.type === "text") return current.text === next.text;
  if (current.type === "connector_text") return current.connector_text === next.connector_text;
  return current.type === "thinking"
    && current.thinking === next.thinking
    && current.stop_timestamp === next.stop_timestamp;
}

function sameContentSegment(current?: CoworkContentSegment, next?: CoworkContentSegment) {
  if (current === next) return true;
  if (!current || !next || current.blocks.length !== next.blocks.length) return false;
  return current.blocks.every((block, index) => {
    const candidate = next.blocks[index];
    return block === candidate
      || block.type === "text" && candidate.type === "text" && block.text === candidate.text
      || block.type === "connector_text" && candidate.type === "connector_text" && block.connector_text === candidate.connector_text;
  });
}
