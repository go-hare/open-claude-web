import { AnimatePresence, motion } from "motion/react";
import { useCallback, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkStatusPill } from "./CoworkStatusPill";
import { CoworkTimelineDoneItem, CoworkTimelineGroup } from "./CoworkTimelinePrimitives";

export type CoworkTimelineRenderMeta = {
  isFirstItem: boolean;
  isInExpandedTimeline: boolean;
  isLastItem: boolean;
  isTimelineExpanded: boolean;
  standalone?: boolean;
};

export type CoworkTimelineRenderBlock = (block: CoworkContentBlock, index: number, meta: CoworkTimelineRenderMeta) => ReactNode;

type CoworkTimelineProps = {
  actionedToolIds?: Set<string>;
  alwaysVisibleTrailing?: ReactNode;
  blocks: CoworkContentBlock[];
  childrenAfterTimeline?: ReactNode;
  className?: string;
  forceExpanded?: boolean;
  groupFooter?: ReactNode;
  hasVisibleTrailingContent?: boolean;
  isStreaming: boolean;
  isToolAwaitingInput?: (block: CoworkContentBlock) => boolean;
  maxVisibleTools?: number;
  onStatusDisplayVisibilityChange?: (visible: boolean) => void;
  renderBlock: CoworkTimelineRenderBlock;
  showDoneIndicator?: boolean;
  showSpark?: boolean;
  statusPillClassName?: string;
  statusText?: string;
  stepsDisplayText?: string;
  timelineClassName?: string;
  trailingContent?: ReactNode;
  turnIsOver: boolean;
  workingHint?: ReactNode;
};

export function CoworkTimeline({
  actionedToolIds,
  alwaysVisibleTrailing,
  blocks,
  childrenAfterTimeline,
  className,
  forceExpanded = false,
  groupFooter,
  hasVisibleTrailingContent,
  isStreaming,
  isToolAwaitingInput,
  maxVisibleTools = 3,
  onStatusDisplayVisibilityChange,
  renderBlock,
  showDoneIndicator = true,
  showSpark = true,
  statusPillClassName,
  statusText,
  stepsDisplayText,
  timelineClassName,
  trailingContent,
  turnIsOver,
  workingHint,
}: CoworkTimelineProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpanded || localExpanded;
  const settledRef = useSettledTimelineRef(blocks.length, turnIsOver);
  const showLiveTimeline = !turnIsOver && isStreaming && blocks.length > 0 && !settledRef.current;
  const statusDisplayVisible = showLiveTimeline && Boolean(statusText);
  useLayoutEffect(() => {
    onStatusDisplayVisibilityChange?.(statusDisplayVisible);
    return () => onStatusDisplayVisibilityChange?.(false);
  }, [onStatusDisplayVisibilityChange, statusDisplayVisible]);
  const waitingForInput = useCallback((block: CoworkContentBlock) => isWaitingForInput(block, actionedToolIds, isToolAwaitingInput), [actionedToolIds, isToolAwaitingInput]);
  const visibleBlocks = useMemo(() => selectVisibleBlocks(blocks, expanded, maxVisibleTools, turnIsOver, waitingForInput), [blocks, expanded, maxVisibleTools, turnIsOver, waitingForInput]);
  const blockIndexes = useMemo(() => new Map(blocks.map((block, index) => [block, index])), [blocks]);
  const exitingBlocks = useExitingBlocks(visibleBlocks, blockIndexes, turnIsOver);
  const hasAfterTimeline = childrenAfterTimeline !== null;
  if (blocks.length === 0 && !hasAfterTimeline) return null;

  const working = showLiveTimeline && Boolean(statusText);
  const displayText = working ? statusText ?? "Working" : stepsDisplayText ?? `${blocks.length} ${blocks.length === 1 ? "step" : "steps"}`;
  const hasBlocks = blocks.length > 0;
  return (
    <div className={className}>
      <div className="grid grid-rows-[auto_auto] min-w-0">
        {hasBlocks ? (
          <div className="row-start-1 col-start-1 min-w-0">
            <CoworkStatusPill className={statusPillClassName} isExpanded={expanded} isWorking={working} onToggle={() => setLocalExpanded((value) => !value)} showSpark={showSpark} statusText={displayText}>
              {!showLiveTimeline ? <SettledTimeline alwaysVisibleTrailing={alwaysVisibleTrailing} blocks={blocks} hasVisibleTrailingContent={hasVisibleTrailingContent ?? Boolean(trailingContent)} renderBlock={renderBlock} showDoneIndicator={showDoneIndicator} trailingContent={trailingContent} /> : null}
            </CoworkStatusPill>
            {workingHint && showLiveTimeline && statusText ? <div className="min-w-0 mt-1">{workingHint}</div> : null}
            {alwaysVisibleTrailing && turnIsOver ? <div className="min-w-0">{alwaysVisibleTrailing}</div> : null}
            {groupFooter && turnIsOver ? <div className="min-w-0">{groupFooter}</div> : null}
          </div>
        ) : null}
        {hasBlocks || hasAfterTimeline ? (
          <div className="row-start-2 col-start-1 relative grid isolate min-w-0">
            {hasAfterTimeline ? <div className="row-start-1 col-start-1 relative z-[2] min-w-0">{childrenAfterTimeline}</div> : null}
            {hasBlocks ? <LiveTimeline blocks={visibleBlocks} blockIndexes={blockIndexes} className={timelineClassName} exitingBlocks={exitingBlocks} hasAfterTimeline={hasAfterTimeline} renderBlock={renderBlock} show={showLiveTimeline} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SettledTimeline({ alwaysVisibleTrailing, blocks, hasVisibleTrailingContent, renderBlock, showDoneIndicator, trailingContent }: {
  alwaysVisibleTrailing?: ReactNode;
  blocks: CoworkContentBlock[];
  hasVisibleTrailingContent: boolean;
  renderBlock: CoworkTimelineRenderBlock;
  showDoneIndicator: boolean;
  trailingContent?: ReactNode;
}) {
  return (
    <CoworkTimelineGroup autoCollapse={false} borderless isFirstBlockOfMessage={false} isLastBlockOfMessage={false}>
      {blocks.map((block, index) => {
        const follows = showDoneIndicator && !alwaysVisibleTrailing || hasVisibleTrailingContent;
        const last = index === blocks.length - 1;
        return <div key={blockKey(block, index)}>{renderBlock(block, index, { isFirstItem: index === 0, isInExpandedTimeline: false, isLastItem: last && !follows, isTimelineExpanded: true })}</div>;
      })}
      {trailingContent}
      {showDoneIndicator && !alwaysVisibleTrailing ? <CoworkTimelineDoneItem /> : null}
    </CoworkTimelineGroup>
  );
}

function LiveTimeline({ blocks, blockIndexes, className, exitingBlocks, hasAfterTimeline, renderBlock, show }: {
  blocks: CoworkContentBlock[];
  blockIndexes: Map<CoworkContentBlock, number>;
  className?: string;
  exitingBlocks: Map<number, CoworkContentBlock>;
  hasAfterTimeline: boolean;
  renderBlock: CoworkTimelineRenderBlock;
  show: boolean;
}) {
  return (
    <AnimatePresence>
      {show ? (
        <motion.div className={classes("row-start-1 col-start-1 relative min-w-0 z-[3] overflow-hidden", className)} exit={{ height: 0, opacity: 0 }} initial={{ opacity: 1 }} key="expanded-tools" style={{ overflowAnchor: "none" }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <CoworkTimelineGroup animateEntrance={false} autoCollapse={false} borderless isFirstBlockOfMessage={false} isLastBlockOfMessage={false}>
            {[...exitingBlocks].map(([index, block]) => (
              <div className="timeline-block-exit" key={index}>
                <div>{renderBlock(block, index, { isFirstItem: false, isInExpandedTimeline: true, isLastItem: false, isTimelineExpanded: false })}</div>
              </div>
            ))}
            {blocks.map((block, localIndex) => {
              const index = blockIndexes.get(block) ?? localIndex;
              const last = localIndex === blocks.length - 1;
              return <div key={blockKey(block, index)} style={timelineBlockStyle}>{renderBlock(block, index, { isFirstItem: localIndex === 0 && exitingBlocks.size === 0, isInExpandedTimeline: true, isLastItem: last && !hasAfterTimeline, isTimelineExpanded: false })}</div>;
            })}
          </CoworkTimelineGroup>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function selectVisibleBlocks(blocks: CoworkContentBlock[], expanded: boolean, maxVisibleTools: number, turnIsOver: boolean, waitingForInput: (block: CoworkContentBlock) => boolean) {
  if (turnIsOver || expanded) return blocks;
  const withoutThinking = blocks.filter((block) => block.type !== "thinking");
  const waiting = withoutThinking.filter(waitingForInput);
  const ordinary = withoutThinking.filter((block) => !waitingForInput(block));
  const recent = maxVisibleTools > 0 ? ordinary.slice(-maxVisibleTools) : [];
  const visible = new Set([...waiting, ...recent]);
  return withoutThinking.filter((block) => visible.has(block));
}

function isWaitingForInput(block: CoworkContentBlock, actionedToolIds?: Set<string>, callback?: (block: CoworkContentBlock) => boolean) {
  if (block.type !== "tool_use" || block.id && actionedToolIds?.has(block.id)) return false;
  return Boolean(block.approval_options && block.approval_key
    || block.mcp_auth_required
    || block.mcp_elicitation
    || callback?.(block)
    || block.name === "AskUserQuestion");
}

function useSettledTimelineRef(blockCount: number, turnIsOver: boolean) {
  const settledRef = useRef(false);
  if (turnIsOver && blockCount > 0) settledRef.current = true;
  if (blockCount === 0) settledRef.current = false;
  return settledRef;
}

function useExitingBlocks(visibleBlocks: CoworkContentBlock[], indexes: Map<CoworkContentBlock, number>, turnIsOver: boolean) {
  const previous = useRef(new Map<number, CoworkContentBlock>());
  const [exiting, setExiting] = useState(new Map<number, CoworkContentBlock>());
  useLayoutEffect(() => {
    if (turnIsOver) { previous.current = new Map(visibleBlocks.map((block) => [indexes.get(block) ?? 0, block])); return; }
    const nextIndexes = new Set(visibleBlocks.map((block) => indexes.get(block)));
    const removed = new Map([...previous.current].filter(([index]) => !nextIndexes.has(index)));
    previous.current = new Map(visibleBlocks.map((block) => [indexes.get(block) ?? 0, block]));
    if (removed.size === 0) return;
    setExiting(removed);
    const timer = window.setTimeout(() => setExiting(new Map()), 100);
    return () => window.clearTimeout(timer);
  }, [indexes, turnIsOver, visibleBlocks]);
  return exiting;
}

const timelineBlockStyle = { animation: "timeline-fade-in 200ms cubic-bezier(0.19, 1, 0.22, 1)" };

function blockKey(block: CoworkContentBlock, index: number) {
  return block.id ?? block.tool_use_id ?? `${block.type}-${index}`;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
