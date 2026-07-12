import { useCallback, useMemo } from "react";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import type { CoworkAssistantTimelineStore } from "./coworkAssistantTimelineStore";
import {
  useCoworkTimelineCurrentStatus,
  useCoworkTimelineStoreItem,
  useCoworkTimelineStreamingState,
} from "./coworkAssistantTimelineStore";
import { CoworkContentAfterTimeline } from "./CoworkAssistantContent";
import { useCoworkAssistantRenderContext } from "./CoworkAssistantRenderContext";
import { CoworkTimeline, type CoworkTimelineRenderMeta } from "./CoworkTimeline";
import { CoworkTimelineBlock } from "./CoworkTimelineBlock";
import { useCoworkTimelineStatusVisibility } from "./CoworkTimelineStatusVisibility";
import { coworkTimelineDisplayText } from "./coworkTimelineLabels";

export function CoworkTimelineSegment({ showDoneIndicator, store, timelineIndex }: {
  showDoneIndicator: boolean;
  store: CoworkAssistantTimelineStore;
  timelineIndex: number;
}) {
  const item = useCoworkTimelineStoreItem(store, timelineIndex);
  const isThisMessageStreaming = useCoworkTimelineStreamingState(store);
  const currentStatus = useCoworkTimelineCurrentStatus(store);
  const context = useCoworkAssistantRenderContext();
  const statusVisibility = useCoworkTimelineStatusVisibility();
  const resultById = useMemo(() => collectResults(context.blocks), [context.blocks]);
  const blocks = item?.segment.blocks ?? [];
  const renderBlock = useTimelineBlockRenderer(context, blocks, item?.liveUpdates ?? false, isThisMessageStreaming);
  if (!item) return null;

  const turnIsOver = !isThisMessageStreaming || !item.liveUpdates;
  const summary = coworkTimelineDisplayText(blocks, (id) => resultById.get(id));
  const statusText = item.liveUpdates ? item.segment.statusText ?? currentStatus : undefined;
  const stepsDisplayText = timelineDisplayText(item.segment.summaryType, item.segment.statusText, summary, statusText, isThisMessageStreaming, item.liveUpdates);

  return (
    <CoworkTimeline
      actionedToolIds={new Set()}
      blocks={blocks}
      childrenAfterTimeline={item.contentAfter ? <CoworkContentAfterTimeline store={store} timelineIndex={timelineIndex} /> : undefined}
      className={item.isFirst ? undefined : "mt-4"}
      isStreaming={isThisMessageStreaming && item.liveUpdates}
      maxVisibleTools={coworkTimelineMaxVisibleTools(item)}
      onStatusDisplayVisibilityChange={item.isFirst ? statusVisibility.setIsVisible : undefined}
      renderBlock={renderBlock}
      showDoneIndicator={showDoneIndicator}
      showSpark={item.isFirst}
      statusPillClassName="pl-2 py-1.5"
      statusText={statusText}
      stepsDisplayText={stepsDisplayText}
      timelineClassName="pl-2"
      turnIsOver={turnIsOver}
    />
  );
}

export function coworkTimelineMaxVisibleTools(item: { isFirst: boolean; liveUpdates: boolean }) {
  return item.isFirst && item.liveUpdates ? 3 : 0;
}

function useTimelineBlockRenderer(
  context: ReturnType<typeof useCoworkAssistantRenderContext>,
  blocks: CoworkContentBlock[],
  liveUpdates: boolean,
  isThisMessageStreaming: boolean,
) {
  // Official gst call site: isStreaming = liveUpdates && isStreaming; isThisMessageStreaming separate.
  return useCallback((block: CoworkContentBlock, index: number, meta: CoworkTimelineRenderMeta) => (
    <CoworkTimelineBlock
      allBlocks={context.blocks}
      block={block}
      index={context.blocks.indexOf(block) >= 0 ? context.blocks.indexOf(block) : index}
      isFirstItem={meta.isFirstItem}
      isInExpandedTimeline={meta.isInExpandedTimeline}
      isLastItem={meta.isLastItem}
      isStreaming={isThisMessageStreaming && liveUpdates}
      isThisMessageStreaming={isThisMessageStreaming}
      key={blockKey(block, index)}
      message={context.message}
    />
  ), [context, isThisMessageStreaming, liveUpdates]);
}

function timelineDisplayText(
  summaryType: "thinking" | "tool_use_summary" | undefined,
  segmentStatus: string | undefined,
  summary: string | undefined,
  statusText: string | undefined,
  streaming: boolean,
  liveUpdates: boolean,
) {
  if (liveUpdates && streaming) return statusText ?? "View steps";
  return summaryType ? segmentStatus ?? "View steps" : summary ?? "View steps";
}

function collectResults(blocks: CoworkContentBlock[]) {
  return new Map(blocks.flatMap((block) => block.type === "tool_result" && block.tool_use_id ? [[block.tool_use_id, block] as const] : []));
}

function blockKey(block: CoworkContentBlock, index: number) {
  return block.id ?? block.tool_use_id ?? `${block.type}-${index}`;
}
