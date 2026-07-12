import { AnimatePresence, motion } from "motion/react";
import { memo, useCallback, useMemo, useState, type ReactNode } from "react";
import { CoworkChevronRightSmallGlyph, CoworkTaskGlyph } from "../../ui/CoworkOfficialGlyphs";
import type { CoworkContentBlock } from "./coworkMessageTypes";
import { CoworkTimelineGroup } from "./CoworkTimelinePrimitives";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

type RenderFlags = { isFirstItem: boolean; isLastItem: boolean };

type CoworkTaskToolCellProps = {
  description?: string;
  isComplete?: boolean;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  renderMode?: CoworkToolRenderMode;
  renderSubagentBlock?: (block: CoworkContentBlock, index: number, flags: RenderFlags) => ReactNode;
  subagentBlocks?: CoworkContentBlock[];
};

export const CoworkTaskToolCell = memo(function CoworkTaskToolCell(props: CoworkTaskToolCellProps) {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded((value) => !value), []);
  const canExpand = Boolean(props.subagentBlocks?.length && props.renderSubagentBlock);
  const visibleBlocks = useMemo(() => expanded && canExpand ? props.subagentBlocks ?? [] : [], [canExpand, expanded, props.subagentBlocks]);
  const secondary = props.subagentBlocks?.length ? <TaskStepCount count={props.subagentBlocks.length} expanded={expanded} /> : undefined;
  return (
    <CoworkToolRow
      handleClick={canExpand ? toggle : undefined}
      hideCaret
      icon={<CoworkTaskGlyph className="text-text-500" size={16} />}
      isFirstBlockOfMessage={props.isFirstBlockOfMessage}
      isFirstItemInGroup={props.isFirstItemInGroup}
      isLastBlockOfMessage={props.isLastBlockOfMessage}
      isLastItemInGroup={props.isLastItemInGroup}
      isStreaming={props.isStreaming && !props.isComplete}
      renderMode={props.renderMode}
      secondaryText={secondary}
      text={props.description || "Running subagent"}
    >
      <TaskSteps blocks={visibleBlocks} expanded={expanded} renderBlock={props.renderSubagentBlock} />
    </CoworkToolRow>
  );
});

function TaskStepCount({ count, expanded }: { count: number; expanded: boolean }) {
  return (
    <span className="flex items-center gap-1 text-sm">
      {count} {count === 1 ? "step" : "steps"}
      <CoworkChevronRightSmallGlyph className={classes("transition-transform duration-200", expanded && "rotate-45")} size={16} />
    </span>
  );
}

function TaskSteps({ blocks, expanded, renderBlock }: { blocks: CoworkContentBlock[]; expanded: boolean; renderBlock?: CoworkTaskToolCellProps["renderSubagentBlock"] }) {
  return (
    <AnimatePresence>
      {blocks.length > 0 ? (
        <motion.div animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} key="nested-timeline" style={{ overflow: "hidden" }} transition={{ duration: 0.2, ease: "easeOut" }}>
          <div className="mt-1">
            <CoworkTimelineGroup autoCollapse={false} borderless isFirstBlockOfMessage={false} isLastBlockOfMessage={false}>
              {blocks.map((block, index) => <TaskStep block={block} expanded={expanded} index={index} key={block.id ?? `block-${index}`} renderBlock={renderBlock} total={blocks.length} />)}
            </CoworkTimelineGroup>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function TaskStep({ block, expanded, index, renderBlock, total }: { block: CoworkContentBlock; expanded: boolean; index: number; renderBlock?: CoworkTaskToolCellProps["renderSubagentBlock"]; total: number }) {
  return (
    <motion.div animate={{ height: expanded ? "auto" : 0, opacity: expanded ? 1 : 0 }} className="overflow-hidden" initial={false} transition={{ delay: expanded ? 0 : 0.15, duration: 0.2, ease: [0.19, 1, 0.22, 1] }}>
      {renderBlock?.(block, index, { isFirstItem: index === 0, isLastItem: index === total - 1 })}
    </motion.div>
  );
}

function classes(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(" ");
}
