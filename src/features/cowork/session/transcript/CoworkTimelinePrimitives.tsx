import { AnimatePresence, motion } from "motion/react";
import { Children, createContext, isValidElement, useContext, useState, type ReactNode } from "react";
import { CoworkChevronDownGlyph, CoworkCircleCheckGlyph } from "../../ui/CoworkOfficialGlyphs";

const TimelineContext = createContext({ hasCollapseHeader: false });

export function CoworkTimelineGroup({ animateEntrance = false, autoCollapse = false, borderless = false, children, className, isFirstBlockOfMessage = false, isLastBlockOfMessage = false }: {
  animateEntrance?: boolean;
  autoCollapse?: boolean;
  borderless?: boolean;
  children: ReactNode;
  className?: string;
  isFirstBlockOfMessage?: boolean;
  isLastBlockOfMessage?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const items = Children.toArray(children);
  const collapsible = autoCollapse && items.length >= 3;
  const collapsedCount = Math.max(0, items.length - 2);
  const hasCollapseHeader = collapsible && collapsedCount > 0;
  const content = renderTimelineGroupItems(items, { animateEntrance, collapsible, expanded });
  return (
    <div className={classes("flex flex-col font-ui leading-normal", !borderless && "rounded-lg border-0.5 border-border-300 my-3", !borderless && (isFirstBlockOfMessage ? "mt-2" : "mt-3"), !borderless && (isLastBlockOfMessage ? "mb-2" : "mb-3"), className)}>
      <TimelineContext.Provider value={{ hasCollapseHeader }}>
        {hasCollapseHeader ? <CoworkCollapseHeader count={collapsedCount} expanded={expanded} onToggle={() => setExpanded((value) => !value)} /> : null}
        {content}
      </TimelineContext.Provider>
    </div>
  );
}

export function CoworkTimelineRow({ children, icon, isActive = false, isExpanded = false, isFirstItem, isLastItem }: { children: ReactNode; icon?: ReactNode; isActive?: boolean; isExpanded?: boolean; isFirstItem: boolean; isLastItem: boolean }) {
  const lineHeight = { minHeight: `calc((2.125rem - ${icon ? "16px" : "6px"}) / 2)` };
  return (
    <div className={classes("flex flex-row min-h-[2.125rem] shrink-0", isExpanded && "bg-bg-000", !isExpanded && "hover:bg-bg-200")}>
      <div className="flex flex-col items-center justify-center pl-3 box-border">
        <div className={classes("transition-all w-[1px]", !isFirstItem && "bg-border-300")} style={lineHeight} />
        <div className={classes("transition-all flex items-center justify-center my-1 shrink-0 w-[16px]", Boolean(icon) && "h-[16px]")}>{icon ?? <div className={classes("size-[6px] rounded-full", isActive ? "bg-brand-200" : "bg-border-300")} />}</div>
        <div className={classes("transition-all grow w-[1px]", !isLastItem && "bg-border-300")} style={lineHeight} />
      </div>
      <div className="w-full flex flex-col min-w-0">{children}</div>
    </div>
  );
}

export function CoworkTimelineGroupItem({ children, header, icon, isActive = false, isExpanded = false, isFirstItem, isLastItem, showDotFallback = true }: {
  children?: ReactNode;
  header?: ReactNode;
  icon?: ReactNode;
  isActive?: boolean;
  isExpanded?: boolean;
  isFirstItem: boolean;
  isLastItem: boolean;
  showDotFallback?: boolean;
}) {
  const { hasCollapseHeader } = useContext(TimelineContext);
  const firstLineHidden = !hasCollapseHeader && isFirstItem;
  const fallback = showDotFallback ? <div className="size-[8px] rounded-full bg-border-100 mt-0.5" /> : null;
  return (
    <div className="flex flex-col shrink-0">
      <TimelineConnector className={!firstLineHidden ? "bg-border-300" : undefined} />
      <div className={classes("transition-colors rounded-lg duration-150", isExpanded && "bg-bg-000")}>
        {header ? <div className="flex flex-row items-center py-1"><div className="w-[20px] flex justify-center shrink-0 text-text-500">{icon ?? fallback}</div><div className="flex-1 min-w-0">{header}</div></div> : null}
        {children ? <div className="flex flex-row"><div className="w-[20px] flex justify-center shrink-0">{header ? <div className={classes("w-[1px] h-full duration-150", !isLastItem && "bg-border-300")} /> : <div className="flex flex-col items-center pt-1">{icon ?? fallback}<div className={classes("w-[1px] flex-1 mt-1 duration-150", !(showDotFallback && isLastItem) && "bg-border-300")} /></div>}</div><div className="flex-1 min-w-0">{children}</div></div> : null}
      </div>
      <TimelineConnector className={!isLastItem ? "bg-border-300" : undefined} />
    </div>
  );
}

export function CoworkTimelineDoneItem() {
  return <CoworkTimelineGroupItem icon={<CoworkCircleCheckGlyph className="text-text-500" size={16} />} isActive={false} isFirstItem={false} isLastItem showDotFallback={false}><div className="pl-2.5 pt-0.5 text-text-300 !font-base">完成</div></CoworkTimelineGroupItem>;
}

function CoworkCollapseHeader({ count, expanded, onToggle }: { count: number; expanded: boolean; onToggle: () => void }) {
  return (
    <CoworkTimelineGroupItem icon={<CoworkChevronDownGlyph className={classes("transition-transform text-text-300", expanded ? "rotate-0" : "rotate-180")} size={16} />} isActive={false} isFirstItem isLastItem={false} showDotFallback={false}>
      <button aria-expanded={expanded} className="px-3 py-2 w-full text-left text-sm text-text-300" onClick={onToggle} type="button">{expanded ? "Hide steps" : `${count} ${count === 1 ? "step" : "steps"}`}</button>
    </CoworkTimelineGroupItem>
  );
}

function renderTimelineGroupItems(items: ReactNode[], options: { animateEntrance: boolean; collapsible: boolean; expanded: boolean }) {
  if (!options.collapsible && !options.animateEntrance) return items.map((item, index) => <div key={isValidElement(item) ? item.key : index}>{item}</div>);
  return (
    <AnimatePresence initial={options.animateEntrance}>
      {items.map((item, index) => {
        if (options.collapsible && !options.expanded && index < items.length - 2) return null;
        return <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden shrink-0" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} key={isValidElement(item) ? item.key : index} transition={{ duration: 0.2, ease: [0.19, 1, 0.22, 1] }}>{item}</motion.div>;
      })}
    </AnimatePresence>
  );
}

function TimelineConnector({ className }: { className?: string }) {
  return <div className="flex flex-row h-[8px]"><div className="w-[20px] flex justify-center"><div className={classes("w-[1px] h-full duration-150", className)} /></div></div>;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
