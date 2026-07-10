import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { CoworkChevronDownGlyph, CoworkCollapseGlyph, CoworkExpandGlyph } from "../../ui/CoworkOfficialGlyphs";
import { CoworkClaudeAvatar } from "./CoworkClaudeAvatar";

type CaretPosition = "leading" | "leading-chip" | "trailing";

type CoworkStatusPillProps = {
  animateTextChange?: boolean;
  caretPosition?: CaretPosition;
  children?: ReactNode;
  className?: string;
  isExpanded?: boolean;
  isWorking: boolean;
  onToggle?: () => void;
  prefix?: ReactNode;
  showSpark?: boolean;
  statusPrefix?: ReactNode;
  statusText: string;
  summarySuffix?: ReactNode;
  textClassName?: string;
};

export function CoworkStatusPill({
  animateTextChange = true,
  caretPosition = "trailing",
  children,
  className,
  isExpanded,
  isWorking,
  onToggle,
  prefix,
  showSpark = true,
  statusPrefix,
  statusText,
  summarySuffix,
  textClassName = "text-sm font-base",
}: CoworkStatusPillProps) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = isExpanded ?? localExpanded;
  const renderChildren = useDelayedCollapsedChildren(expanded);
  const toggle = useCallback(() => onToggle ? onToggle() : setLocalExpanded((value) => !value), [onToggle]);
  const workingWithSpark = showSpark && isWorking;
  const status = buildStatusContent({
    animateTextChange,
    caretPosition,
    expanded,
    isWorking,
    prefix,
    statusText,
    textClassName,
    workingWithSpark,
  });

  return (
    <div className={classes("min-w-0", className)}>
      <div className={classes("flex items-center gap-2", Boolean(summarySuffix) && "min-h-16")}>
        <button
          aria-expanded={expanded}
          className={classes(statusButtonClass(workingWithSpark), "flex-1 min-w-0")}
          onClick={toggle}
          type="button"
        >
          {workingWithSpark ? <CoworkWritingSpark expanded={expanded} /> : null}
          {statusPrefix}
          {status}
        </button>
        {summarySuffix && !expanded ? <div className="shrink-0">{summarySuffix}</div> : null}
      </div>
      <span aria-live="polite" className="sr-only" role="status">{statusText}</span>
      {children ? (
        <div className="grid transition-[grid-template-rows] duration-300 ease-out" style={{ gridTemplateRows: expanded ? "1fr" : "0fr" }}>
          <div className="overflow-hidden min-w-0">{expanded || renderChildren ? children : null}</div>
        </div>
      ) : null}
    </div>
  );
}

function buildStatusContent({ animateTextChange, caretPosition, expanded, isWorking, prefix, statusText, textClassName, workingWithSpark }: {
  animateTextChange: boolean;
  caretPosition: CaretPosition;
  expanded: boolean;
  isWorking: boolean;
  prefix?: ReactNode;
  statusText: string;
  textClassName: string;
  workingWithSpark: boolean;
}) {
  const content = (
    <>
      {!workingWithSpark && caretPosition === "leading" ? <StatusCaret expanded={expanded} size={14} /> : null}
      {!workingWithSpark && caretPosition === "leading-chip" ? <StatusChipCaret expanded={expanded} /> : null}
      {prefix}
      {isWorking ? <span className={classes("text-left truncate epitaxy-text-shine", textClassName)}>{statusText}</span> : <span className={classes("truncate", textClassName)}>{statusText}</span>}
      {!workingWithSpark && caretPosition === "trailing" ? <StatusCaret expanded={expanded} size={12} /> : null}
    </>
  );
  if (!animateTextChange) return <div className="inline-flex items-center gap-1 min-w-0">{content}</div>;
  return (
    <AnimatePresence initial={false} mode="wait">
      <motion.div animate={{ opacity: 1 }} className="inline-flex items-center gap-1 min-w-0" exit={{ opacity: 0 }} initial={{ opacity: 0 }} key={statusText} transition={{ duration: 0.25, ease: "easeInOut" }}>
        {content}
      </motion.div>
    </AnimatePresence>
  );
}

function CoworkWritingSpark({ expanded }: { expanded: boolean }) {
  return (
    <div className="relative w-5 h-5 flex items-center justify-center shrink-0">
      <div className="pt-1">
        <CoworkClaudeAvatar className="!w-5 !text-brand-200 group-hover/status:opacity-0 transition-opacity duration-100" isInteractive={false} state="writing" />
      </div>
      {expanded
        ? <CoworkCollapseGlyph className="absolute opacity-0 group-hover/status:opacity-100 transition-opacity duration-100 text-text-500" size={16} />
        : <CoworkExpandGlyph className="absolute opacity-0 group-hover/status:opacity-100 transition-opacity duration-100 text-text-500" size={16} />}
    </div>
  );
}

function StatusCaret({ expanded, size }: { expanded: boolean; size: number }) {
  return <span className={classes("inline-flex transition-transform duration-200 shrink-0", !expanded && "-rotate-90")}><CoworkChevronDownGlyph size={size as 12 | 14} /></span>;
}

function StatusChipCaret({ expanded }: { expanded: boolean }) {
  return (
    <span className={classes("inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-bg-300 text-text-300 transition-all duration-200 group-hover/status:bg-bg-400 group-hover/status:text-text-100", !expanded && "-rotate-90")}>
      <CoworkChevronDownGlyph size={14} />
    </span>
  );
}

function useDelayedCollapsedChildren(expanded: boolean) {
  const [removed, setRemoved] = useState(!expanded);
  const timerRef = useRef<number | null>(null);
  useEffect(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    if (expanded) setRemoved(false);
    else timerRef.current = window.setTimeout(() => setRemoved(true), 300);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [expanded]);
  return !removed;
}

function statusButtonClass(working: boolean) {
  return classes(
    "group/status flex items-center gap-2 py-1 text-sm transition-colors cursor-pointer text-left",
    working ? "text-text-300 hover:text-text-200" : "text-text-500 hover:text-text-300",
  );
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
