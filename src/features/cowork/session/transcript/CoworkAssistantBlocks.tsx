import { useMemo, useRef } from "react";
import type { CoworkChatMessage, CoworkContentBlock, CoworkMessageSegment } from "./coworkMessageTypes";
import {
  arrangeCoworkAssistantSegments,
  segmentCoworkMessageBlocks,
  visibleCoworkAssistantBlocks,
} from "./coworkTimelineModel";
import {
  useCoworkAssistantTimelineStore,
  useSyncCoworkAssistantTimelineStore,
} from "./coworkAssistantTimelineStore";
import { CoworkAssistantContentSegment } from "./CoworkAssistantContent";
import { CoworkAssistantRenderProvider } from "./CoworkAssistantRenderContext";
import { CoworkTimelineSegment } from "./CoworkTimelineSegment";
import { CoworkResponseInterruption } from "./CoworkResponseInterruption";
import { coworkInterruptedTimelineIndex, coworkInterruptionVariant } from "./coworkInterruptionState";
import { useCoworkMessageContext } from "./CoworkMessageContext";

export function CoworkAssistantBlocks({ blocks, isStreaming, isThisMessageStreaming, message }: {
  blocks: CoworkContentBlock[];
  isStreaming: boolean;
  isThisMessageStreaming: boolean;
  message: CoworkChatMessage;
}) {
  const rawSegments = useMemo(
    () => segmentCoworkMessageBlocks(visibleCoworkAssistantBlocks(blocks)),
    [blocks],
  );
  const stableSegments = useStableCoworkSegments(rawSegments);
  const sequence = useMemo(() => arrangeCoworkAssistantSegments(stableSegments), [stableSegments]);
  const timelineStore = useCoworkAssistantTimelineStore();
  const { onRetry } = useCoworkMessageContext();
  useSyncCoworkAssistantTimelineStore(timelineStore, sequence, isThisMessageStreaming);
  const interruption = coworkInterruptionVariant(sequence, message, isStreaming, isThisMessageStreaming);
  const interruptedTimelineIndex = interruption ? coworkInterruptedTimelineIndex(sequence) : undefined;
  const context = useMemo(
    () => ({ blocks, isStreaming, isThisMessageStreaming, message }),
    [blocks, isStreaming, isThisMessageStreaming, message],
  );

  return (
    <CoworkAssistantRenderProvider value={context}>
      {sequence.map((item) => item.kind === "timeline" ? (
          <CoworkTimelineSegment
            key={`timeline-${item.segment.timelineIndex}`}
            showDoneIndicator={item.segment.timelineIndex !== interruptedTimelineIndex}
            store={timelineStore}
            timelineIndex={item.segment.timelineIndex}
          />
        ) : (
          <CoworkAssistantContentSegment
            hasTextAfter={item.hasTextAfter}
            isLastContent={item.isLastContent}
            key={`content-${item.index}`}
            segment={item.segment}
          />
        ))}
      {interruption ? <CoworkResponseInterruption onRetry={onRetry} variant={interruption} /> : null}
    </CoworkAssistantRenderProvider>
  );
}

function useStableCoworkSegments(segments: CoworkMessageSegment[]) {
  const timelineBlocksRef = useRef(new Map<number, CoworkContentBlock[]>());
  const contentBlocksRef = useRef(new Map<number, CoworkContentBlock[]>());
  return useMemo(() => stabilizeSegments(segments, timelineBlocksRef.current, contentBlocksRef.current), [segments]);
}

function stabilizeSegments(
  segments: CoworkMessageSegment[],
  previousTimelines: Map<number, CoworkContentBlock[]>,
  previousContent: Map<number, CoworkContentBlock[]>,
) {
  const nextTimelines = new Map<number, CoworkContentBlock[]>();
  const nextContent = new Map<number, CoworkContentBlock[]>();
  const stable = segments.map((segment, index) => {
    const previous = segment.type === "timeline" ? previousTimelines.get(segment.timelineIndex) : previousContent.get(index);
    const blocks = reuseStableBlocks(previous, segment.blocks);
    if (segment.type === "timeline") nextTimelines.set(segment.timelineIndex, blocks);
    else nextContent.set(index, blocks);
    return blocks === segment.blocks ? segment : { ...segment, blocks };
  });
  replaceMap(previousTimelines, nextTimelines);
  replaceMap(previousContent, nextContent);
  return stable;
}

function reuseStableBlocks(previous: CoworkContentBlock[] | undefined, next: CoworkContentBlock[]) {
  if (!previous || previous.length !== next.length) return next;
  let unchanged = true;
  const blocks = next.map((block, index) => {
    if (sameStableBlock(previous[index], block)) return previous[index];
    unchanged = false;
    return block;
  });
  return unchanged ? previous : blocks;
}

function sameStableBlock(previous: CoworkContentBlock, next: CoworkContentBlock) {
  if (previous === next) return true;
  if (previous.type !== next.type) return false;
  if (next.type === "thinking") return previous.thinking === next.thinking && previous.stop_timestamp === next.stop_timestamp;
  if (next.type === "text") return previous.text === next.text;
  if (next.type === "connector_text") return previous.connector_text === next.connector_text;
  return false;
}

function replaceMap<T>(target: Map<number, T>, source: Map<number, T>) {
  target.clear();
  source.forEach((value, key) => target.set(key, value));
}
