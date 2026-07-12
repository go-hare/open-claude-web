/**
 * Official ThinkingCell (pretty O9e → bde/xde/gde/L9e/R9e).
 * Source: index-BELzQL5P.js ThinkingCell; flag claudeai_isp_thinking_ux defaults off (E9e).
 */
import { AnimatePresence, motion } from "motion/react";
import {
  memo,
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { Icon } from "../../../../shell/icons";
import { CoworkTimelineClockGlyph } from "../../ui/CoworkOfficialGlyphs";
import { CoworkAssistantMarkdown } from "./CoworkAssistantMarkdown";
import { coworkComputerLinkPath } from "./coworkComputerLink";
import { useCoworkTranscriptActions } from "./CoworkTranscriptActions";
import { CoworkToolRow, type CoworkToolRenderMode } from "./CoworkToolRow";

/** Official A9e support article for extended-thinking cutoff copy. */
export const COWORK_THINKING_CUTOFF_SUPPORT_HREF =
  "https://support.anthropic.com/en/articles/10574485-using-extended-thinking-on-claude-3-7-sonnet";

const FALLBACK_SUMMARY = {
  debounceMs: 2000,
  maxLen: 100,
  minLen: 50,
  regex: /.*(\n|\.(\s|$)|。)/,
} as const;

export type CoworkThinkingCellProps = {
  cutOff?: boolean;
  index?: number;
  isFirstBlockOfMessage?: boolean;
  isFirstItemInGroup?: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItemInGroup?: boolean;
  isStreaming: boolean;
  messageUuid: string;
  mostRecentSummary?: string;
  onToggle?: () => void;
  renderMode?: CoworkToolRenderMode;
  startTimestamp?: string;
  stopTimestamp?: string;
  text: string;
};

export const CoworkThinkingCell = memo(function CoworkThinkingCell({
  cutOff = false,
  index = 0,
  isFirstBlockOfMessage,
  isFirstItemInGroup,
  isLastBlockOfMessage,
  isLastItemInGroup,
  isStreaming,
  messageUuid,
  mostRecentSummary,
  onToggle,
  renderMode = "timeline",
  startTimestamp,
  stopTimestamp,
  text,
}: CoworkThinkingCellProps) {
  // ISP UX flag default false (E9e.enabled) — titles Thinking / Thought process.
  const ispThinkingUx = false;
  const { isExpanded, setIsExpanded, snappyTransition } = useExpandableThinking(
    !ispThinkingUx && isStreaming,
    String(index),
  );
  const sawStreaming = useRef(false);
  const [fallbackSummary, setFallbackSummary] = useState<string | null>(null);
  const hasCompletedDuration = Boolean(startTimestamp && stopTimestamp && !sawStreaming.current);
  const [showTimer, setShowTimer] = useState(() => {
    if (!hasCompletedDuration || !startTimestamp || !stopTimestamp) return false;
    const ms = durationMs(startTimestamp, stopTimestamp);
    return ms != null && ms >= 10_000;
  });

  useEffect(() => {
    if (!isStreaming) return;
    const timer = window.setTimeout(() => setShowTimer(true), 10_000);
    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming) sawStreaming.current = true;
  }, [isStreaming]);

  useEffect(() => {
    if (isStreaming || text.length === 0) return;
    const debounce = sawStreaming.current ? FALLBACK_SUMMARY.debounceMs : 0;
    const handle = window.setTimeout(() => {
      setFallbackSummary(extractFallbackSummary(text));
    }, debounce);
    return () => window.clearTimeout(handle);
  }, [isStreaming, text]);

  const collapsedTitle = mostRecentSummary
    ?? (ispThinkingUx
      ? (isStreaming ? "Thinking..." : (fallbackSummary ?? "Thinking..."))
      : (isStreaming ? "Thinking" : "Thought process"));
  const title: ReactNode = isExpanded
    ? "Thought process"
    : (!isStreaming && !sawStreaming.current)
      ? <span className="text-text-300">{collapsedTitle}</span>
      : (
        <motion.span
          animate={{ opacity: 1, y: 0 }}
          className="text-text-300"
          initial={{ opacity: 0, y: 4 }}
          key={String(collapsedTitle)}
          transition={{ duration: 0.3, ease: "easeIn" }}
        >
          {collapsedTitle}
        </motion.span>
      );

  const secondaryText = showTimer ? (
    <span className="flex items-center gap-1 transition-opacity">
      <CoworkTimelineClockGlyph
        className={[
          "text-text-300 transition-all duration-300 ease-in-out",
          isStreaming ? "opacity-0 scale-50" : "opacity-50 scale-100",
        ].join(" ")}
        size={12}
      />
      <span className="tabular-nums">
        <ThinkingDuration
          isStreaming={isStreaming}
          startTimestamp={startTimestamp}
          stopTimestamp={hasCompletedDuration ? stopTimestamp : undefined}
        />
      </span>
    </span>
  ) : undefined;

  const toggle = useCallback(() => {
    setIsExpanded(!isExpanded);
    onToggle?.();
  }, [isExpanded, onToggle, setIsExpanded]);

  if (!text && !isStreaming) return null;

  return (
    <CoworkToolRow
      handleClick={toggle}
      isExpanded={isExpanded}
      isFirstBlockOfMessage={isFirstBlockOfMessage}
      isFirstItemInGroup={isFirstItemInGroup}
      isLastBlockOfMessage={isLastBlockOfMessage}
      isLastItemInGroup={isLastItemInGroup}
      isStreaming={isStreaming}
      renderMode={renderMode}
      secondaryText={secondaryText}
      text={title}
    >
      <ThinkingCollapse
        isExpanded={isExpanded}
        onTransitionEnd={onToggle}
        snappyTransition={snappyTransition}
      >
        <CoworkThinkingBody cutOff={cutOff} text={text} />
      </ThinkingCollapse>
    </CoworkToolRow>
  );
});

/**
 * Official L9e: shell + pg StandardMarkdown (`className: "p-3 pt-0 pr-8", text`) + optional A9e.
 * Source: index-BELzQL5P.pretty.js L9e / A9e / T9e (~136499).
 * Exported for SSR unit tests (collapse expand is effect-driven).
 */
export function CoworkThinkingBody({ cutOff, text }: { cutOff: boolean; text: string }) {
  const actions = useCoworkTranscriptActions();
  // Official ~136785: computer:// → SELECT_FILE + open drawer.
  const onLinkClick = useCallback((event: MouseEvent<HTMLAnchorElement>, url: string) => {
    const path = coworkComputerLinkPath(url);
    if (!path) return;
    event.preventDefault();
    actions?.openFile({ path, toolType: "create_file" });
  }, [actions]);
  return (
    <div className="text-text-300 text-sm font-normal gap-0.5 relative font-claude-response">
      <CoworkAssistantMarkdown className="p-3 pt-0 pr-8" onLinkClick={onLinkClick} text={text} />
      {cutOff ? <CoworkThinkingCutoffBanner /> : null}
    </div>
  );
}

/**
 * Official A9e via T9e: Sm icon + linked "thought process" → support article.
 * T9e spreads props onto shell (data-testid="message-warning").
 * Source: index-BELzQL5P.pretty.js T9e/A9e (~136499).
 */
export function CoworkThinkingCutoffBanner() {
  return (
    <div
      className="bg-bg-100 text-text-300 border-0.5 border-border-300 flex flex-row gap-1.5 rounded-md p-2 mx-4 mb-4 font-small"
      data-testid="message-warning"
    >
      <Icon className="shrink-0" customSize={16} name="Warning" />
      <span>
        The rest of the{" "}
        <a
          className="underline"
          href={COWORK_THINKING_CUTOFF_SUPPORT_HREF}
          rel="noreferrer"
          target="_blank"
        >
          thought process
        </a>{" "}
        is not available for this response.
      </span>
    </div>
  );
}

function ThinkingCollapse({
  children,
  isExpanded,
  onTransitionEnd,
  snappyTransition,
}: {
  children: ReactNode;
  isExpanded: boolean;
  onTransitionEnd?: () => void;
  snappyTransition: boolean;
}) {
  // Official gde (non collapsesHalfway): AnimatePresence height auto, snappyOut 0.25/0.3.
  const transition = {
    duration: snappyTransition ? 0.25 : 0.3,
    ease: [0.19, 1, 0.22, 1] as const,
  };
  return (
    <AnimatePresence initial={false}>
      {isExpanded ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden shrink-0"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          key="content"
          onAnimationComplete={onTransitionEnd}
          tabIndex={-1}
          transition={transition}
        >
          <div className="h-full !max-h-[238px] overflow-y-auto" style={{ scrollbarGutter: "stable" }}>
            {children}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ThinkingDuration({
  isStreaming = false,
  startTimestamp,
  stopTimestamp,
}: {
  isStreaming?: boolean;
  startTimestamp?: string;
  stopTimestamp?: string;
}) {
  // Official R9e: tick every 1s while streaming; fixed interval when both timestamps present.
  const [ms, setMs] = useState(() => durationMs(startTimestamp, stopTimestamp));
  useEffect(() => {
    setMs(durationMs(startTimestamp, stopTimestamp));
    if (!isStreaming || !startTimestamp) return;
    const id = window.setInterval(() => setMs(durationMs(startTimestamp)), 1000);
    return () => window.clearInterval(id);
  }, [isStreaming, startTimestamp, stopTimestamp]);
  if (ms == null) return null;
  return <>{formatNarrowDuration(ms)}</>;
}

function useExpandableThinking(autoExpandWhileStreaming: boolean, itemKey: string) {
  // Official fue(e, t): expand while streaming; 2s after end collapse, then snappyTransition true.
  const sawAutoExpand = useRef(false);
  const collapseTimer = useRef<number | null>(null);
  const snappyTimer = useRef<number | null>(null);
  const [localExpanded, setLocalExpanded] = useState(false);
  const [snappyTransition, setSnappyTransition] = useState(!autoExpandWhileStreaming);

  const setIsExpanded = useCallback((next: boolean) => {
    setLocalExpanded(next);
  }, []);

  useEffect(() => {
    if (collapseTimer.current) {
      window.clearTimeout(collapseTimer.current);
      collapseTimer.current = null;
    }
    if (snappyTimer.current) {
      window.clearTimeout(snappyTimer.current);
      snappyTimer.current = null;
    }
    if (autoExpandWhileStreaming) {
      sawAutoExpand.current = true;
      setIsExpanded(true);
      setSnappyTransition(false);
      return;
    }
    if (sawAutoExpand.current) {
      collapseTimer.current = window.setTimeout(() => {
        setIsExpanded(false);
        snappyTimer.current = window.setTimeout(() => {
          setSnappyTransition(true);
          sawAutoExpand.current = false;
        }, 350);
      }, 2000);
    }
    return () => {
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      if (snappyTimer.current) window.clearTimeout(snappyTimer.current);
    };
  }, [autoExpandWhileStreaming, itemKey, setIsExpanded]);

  return { isExpanded: localExpanded, setIsExpanded, snappyTransition };
}

function durationMs(start?: string, stop?: string) {
  if (!start) return undefined;
  const startMs = Date.parse(start);
  if (Number.isNaN(startMs)) return undefined;
  const endMs = stop ? Date.parse(stop) : Date.now();
  if (Number.isNaN(endMs)) return undefined;
  return Math.max(0, endMs - startMs);
}

function formatNarrowDuration(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}

function extractFallbackSummary(text: string) {
  const clipped = text.substring(0, FALLBACK_SUMMARY.maxLen);
  const match = FALLBACK_SUMMARY.regex.exec(clipped);
  if (match) return match[0];
  for (let i = clipped.length - 1; i >= FALLBACK_SUMMARY.minLen; i -= 1) {
    if (/\s/.test(clipped[i]!)) return clipped.substring(0, i + 1);
  }
  return clipped;
}
