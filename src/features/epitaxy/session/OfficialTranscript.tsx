/**
 * Official transcript render (Gb/R, Hb/Kb, tool rows, thinking spark) — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import {
  Fragment,
  forwardRef,
  memo,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react";
import { useVirtualizer, type VirtualItem } from "@tanstack/react-virtual";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { sessionPath } from "../../../shell/sessionPaths";
import {
  canResetRateLimitsFromBootstrap,
  fetchBootstrapPayload,
  organizationUuidFromBootstrap,
  postOrganizationResetRateLimits,
} from "../../settings/accountSettingsApi";
import { isOfficialMermaidMarkdownLanguage, OfficialMermaidDiagramCard } from "../OfficialMermaidDiagramCard";
import { OfficialSearchTree, officialSearchTreeLanguage } from "../OfficialSearchTree";
import {
  OfficialAssistantMessage,
  OfficialButton,
  OfficialMessageActions,
  officialUserMessageClass,
  type OfficialTranscriptMode,
} from "../OfficialEpitaxyComponents";
import {
  OFFICIAL_DURABLE_UUID_RE,
  OfficialUserBashCommand,
  OfficialUserCodeAttachment,
  parseOfficialUserTextSegments,
  renderOfficialUserInlineText,
} from "../OfficialUserHbParts";
import { MarkdownContent, OfficialCodeMarkdown } from "../OfficialCodeMarkdown";
import {
  OfficialContextWindowUsage,
} from "../OfficialComposerContextUsage";
import {
  buildOfficialToolDiffMeta,
  OfficialToolDiffBadge,
  OfficialToolDiffDetails,
  OfficialToolReadFileDetails,
  type OfficialToolDiffMeta,
} from "../diff/OfficialToolDiffDetails";
import { OfficialTranscriptItemMenu } from "./OfficialTranscriptItemMenu";
import {
  OfficialConversationLoading,
  OfficialSparkSpinner,
  OfficialSpinner,
  OfficialWorkingStatus,
} from "./OfficialWorkingStatus";
import {
  EpitaxyTranscriptActionContext,
} from "./epitaxyTranscriptActionContext";
import {
  type OfficialBackgroundTask as OfficialBackgroundTaskImported,
  type OfficialTaskStatus,
} from "./officialTasksAndPlan";
import {
  type OfficialToolGroupTaskEvent,
  type TranscriptEntry,
  type TranscriptEntryItem,
  type TranscriptToolUse,
} from "./officialTranscriptParse";
import { SessionError, SessionNotFound, basename } from "./useEpitaxySessionData";
import { classifyOfficialMemoryOp, isOfficialMemoryTool } from "./officialMemoryPath";
import { CodeStatsCard } from "../CodeStatsCard";
import type { EpitaxyUploadedFile } from "../epitaxyUploadedFiles";

const officialSparkBundlePath = "/assets/v1/cad8c092d-DAwbTyVP.js";


function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

type OfficialSparkAnimation = {
  frameCount: number;
  height: number;
  speed: number;
  svg: string;
  width: number;
};

export type OfficialTranscriptScrollBehavior = ScrollBehavior | "instant";

export type OfficialTranscriptHandle = {
  scrollToBottom: (behavior?: OfficialTranscriptScrollBehavior) => void;
  scrollToEntry: (entryId: string) => void;
};

export type OfficialTranscriptScrollState = {
  showBottomFade: boolean;
  showScrollButton: boolean;
};

export function scrollElementToBottom(node: HTMLElement, behavior?: OfficialTranscriptScrollBehavior) {
  node.scrollTo({ top: node.scrollHeight, behavior: (behavior ?? "instant") as ScrollBehavior });
  node.dispatchEvent(new Event("scroll", { bubbles: true }));
  if (behavior === "smooth") {
    window.setTimeout(() => {
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      if (distanceFromBottom > 8) {
        node.scrollTo({ top: node.scrollHeight, behavior: "auto" });
      }
      node.dispatchEvent(new Event("scroll", { bubbles: true }));
    }, 450);
  }
}

let officialThinkingSparkAnimationCache: OfficialSparkAnimation | null = null;
let officialThinkingSparkAnimationPromise: Promise<OfficialSparkAnimation | null> | null = null;
type OfficialBackgroundTask = OfficialBackgroundTaskImported;


export function renderTranscriptBody({ entries, error, initialSessionId, isLoading, isResponding, isSessionNotFound, landingBody, onScrollState, pendingTurnStartedAt, ref, reload, scrollRef, session, spawnLabel, streamTokenEstimate, tasks, transcriptMode }: {
  entries: TranscriptEntry[];
  error: Error | null;
  initialSessionId?: string;
  isLoading: boolean;
  isResponding: boolean;
  isSessionNotFound: boolean;
  landingBody?: ReactNode;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  pendingTurnStartedAt?: number | null;
  ref: Ref<OfficialTranscriptHandle>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  session: SessionSummary | null;
  spawnLabel?: string;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
}) {
  if (isSessionNotFound) return <SessionNotFound onBack={reload} />;
  if (error && entries.length === 0) return <SessionError error={error} onRetry={reload} />;
  if (!initialSessionId) return <div className="h-full overflow-y-auto overflow-x-hidden">{landingBody ?? null}</div>;
  const transcriptKey = `${initialSessionId}:messages`;
  // Official Ja: Boolean(D) && 0===Ya.length && (B||J) — only when nothing to show yet.
  if (isLoading && entries.length === 0 && !session) {
    return <OfficialConversationLoading />;
  }
  if (entries.length === 0 && !isResponding) return <div className="h-full flex items-center justify-center text-body text-t5">No messages yet.</div>;
  return <Transcript key={transcriptKey} entries={entries} isAwaitingReply={officialIsAwaitingReply(session, isResponding)} isResponding={isResponding} onScrollState={onScrollState} pendingTurnStartedAt={pendingTurnStartedAt} ref={ref} restoreKey={transcriptKey} scrollRef={scrollRef} sessionId={initialSessionId} spawnLabel={spawnLabel} streamTokenEstimate={streamTokenEstimate} tasks={tasks} transcriptMode={transcriptMode} />;
}

function officialIsAwaitingReply(session: SessionSummary | null, isResponding: boolean) {
  if (isResponding) return false;
  if ((session?.pendingToolPermissions?.length ?? 0) > 0) return false;
  return officialIsBlockedPostTurnCategory(session?.postTurnSummary?.statusCategory);
}

function officialIsBlockedPostTurnCategory(category?: string) {
  return category === "blocked" || category === "need_input" || category === "failed";
}

type TranscriptRow =
  | { entry: TranscriptEntry; entryIdx: number; id: string; kind: "assistant" | "user" }
  | { id: string; kind: "loader" }
  | { id: string; kind: "running-tasks" };

/** Official Fu (c119 / c3d5) transcript restore: pin + measurements + anchor. */
type OfficialTranscriptRestore = {
  anchorKey?: string;
  anchorOffsetPx: number;
  isPinned: boolean;
  measurements: VirtualItem[];
};

const officialTranscriptScrollRestores = new Map<string, OfficialTranscriptRestore>();

type TranscriptProps = {
  entries: TranscriptEntry[];
  isAwaitingReply: boolean;
  isResponding: boolean;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  pendingTurnStartedAt?: number | null;
  restoreKey?: string;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  sessionId?: string;
  spawnLabel?: string;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
};

type CodeUserChapter = {
  afterId: string;
  id: string;
  title: string;
};

const emptyCodeUserChaptersByAfterId = new Map<string, CodeUserChapter[]>();

/**
 * Official Gb/R transcript (c11959232):
 *   Fu({ items, getKey, estimateSize, overscan, paddingStart:48, paddingEnd:48 })
 *   DOM: scrollRef > sizerRef(height) > absolute translateY(virtualItems[0].start) > measureElement rows
 *   scrollToBottom: setPinned(true); scrollTo({ top: scrollHeight })
 */
const Transcript = forwardRef<OfficialTranscriptHandle, TranscriptProps>(function Transcript({ entries, isAwaitingReply, isResponding, onScrollState, pendingTurnStartedAt, restoreKey, scrollRef, sessionId, spawnLabel, streamTokenEstimate, tasks, transcriptMode }, ref) {
  const rowsRef = useRef<TranscriptRow[]>([]);
  const initialCount = useRef(entries.length);
  const [userChapters, setUserChapters] = useState<CodeUserChapter[]>([]);
  const rows = useMemo(() => buildTranscriptRows(entries), [entries]);
  const userChaptersByAfterId = useMemo(() => groupCodeUserChaptersByAfterId(userChapters), [userChapters]);
  const lastEntryIdx = entries.length - 1;

  const officialVirtualizer = useOfficialTranscriptVirtualizer({
    estimateSize: estimateTranscriptRowSize,
    getKey: (row) => row.id,
    items: rows,
    overscan: 6,
    paddingEnd: 48,
    paddingStart: 48,
    restoreKey,
  });
  const virtualItems = officialVirtualizer.virtualItems;
  const translateY = virtualItems[0]?.start ?? 0;

  useLayoutEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  useLayoutEffect(() => {
    scrollRef.current = officialVirtualizer.scrollRef.current;
    return () => {
      scrollRef.current = null;
    };
  }, [officialVirtualizer.scrollRef, scrollRef]);

  // Official R (c119 Gb): scroll listener only drives showScrollButton / showBottomFade.
  // Pin state lives entirely in Fu — never toggle pin from distance-from-bottom here.
  const onScrollStateRef = useRef(onScrollState);
  useLayoutEffect(() => {
    onScrollStateRef.current = onScrollState;
  }, [onScrollState]);

  useLayoutEffect(() => {
    const node = officialVirtualizer.scrollRef.current;
    const sizer = officialVirtualizer.sizerRef.current;
    if (!node) return undefined;
    const updateScrollState = () => {
      if (node.offsetParent === null) return;
      const distanceFromBottom = node.scrollHeight - node.scrollTop - node.clientHeight;
      onScrollStateRef.current({ showScrollButton: distanceFromBottom > 200, showBottomFade: distanceFromBottom > 8 });
    };
    node.addEventListener("scroll", updateScrollState, { passive: true });
    const observer = new ResizeObserver(updateScrollState);
    if (sizer) observer.observe(sizer);
    observer.observe(node);
    updateScrollState();
    return () => {
      node.removeEventListener("scroll", updateScrollState);
      observer.disconnect();
      onScrollStateRef.current({ showScrollButton: false, showBottomFade: false });
    };
  }, [officialVirtualizer.scrollRef, officialVirtualizer.sizerRef]);

  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior) => {
      // Official R: setPinned(true); scrollTo({ top: scrollHeight, behavior ?? "instant" })
      officialVirtualizer.setPinned(true);
      const node = officialVirtualizer.scrollRef.current;
      node?.scrollTo({ top: node.scrollHeight, behavior: (behavior ?? "instant") as ScrollBehavior });
    },
    scrollToEntry: (entryId) => {
      const index = rowsRef.current.findIndex((row) => (row.kind === "user" || row.kind === "assistant") && row.entry.id === entryId);
      if (index >= 0) officialVirtualizer.scrollToIndex(index, "start");
    },
  }), [officialVirtualizer]);

  // Official R: pointer/keyboard on the list unpins (user intent). Wheel/touch unpin is Fu scroll-direction.
  const unpinTranscript = useCallback(() => {
    officialVirtualizer.setPinned(false);
  }, [officialVirtualizer]);
  const unpinTranscriptFromKeyboard = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const target = event.target;
    if (target instanceof HTMLElement && !target.matches('input,textarea,[contenteditable="true"]')) {
      officialVirtualizer.setPinned(false);
    }
  }, [officialVirtualizer]);
  const pinUserChapter = useCallback((afterId: string, text: string) => {
    setUserChapters((current) => {
      if (current.some((chapter) => chapter.afterId === afterId)) return current;
      return [...current, {
        afterId,
        id: `chapter-${afterId}`,
        title: officialChapterTitleFromText(text),
      }];
    });
  }, []);
  const unpinUserChapters = useCallback((afterId: string) => {
    setUserChapters((current) => current.filter((chapter) => chapter.afterId !== afterId));
  }, []);

  // Official DOM structure (c119 Gb return) — NOT bare virtua <Virtualizer>.
  return (
    <div ref={officialVirtualizer.scrollRef} data-testid="epitaxy-virtual-transcript" className="h-full overflow-y-auto overflow-x-hidden [contain:strict]">
      <div ref={officialVirtualizer.sizerRef} className="relative epitaxy-chat-column" style={{ height: officialVirtualizer.sizerHeight }}>
        <div onPointerDownCapture={unpinTranscript} onKeyDownCapture={unpinTranscriptFromKeyboard} className="absolute top-0 left-0 w-full" style={{ transform: `translateY(${translateY}px)` }}>
          {virtualItems.map((virtualRow) => {
            const row = rows[virtualRow.index];
            if (!row) return null;
            return (
              <div data-index={virtualRow.index} key={virtualRow.key} ref={officialVirtualizer.measureElement}>
                <div className={virtualRow.index < rows.length - 1 ? "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0" : "epitaxy-chat-size"}>
                  <TranscriptRowContent
                    initialCount={initialCount.current}
                    isAwaitingReply={isAwaitingReply}
                    isResponding={isResponding}
                    lastEntryIdx={lastEntryIdx}
                    onPinUserChapter={pinUserChapter}
                    onUnpinUserChapters={unpinUserChapters}
                    pendingTurnStartedAt={pendingTurnStartedAt}
                    row={row}
                    sessionId={sessionId}
                    spawnLabel={spawnLabel}
                    streamTokenEstimate={streamTokenEstimate}
                    tasks={tasks}
                    transcriptMode={transcriptMode}
                    userChaptersByAfterId={userChaptersByAfterId}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

function groupCodeUserChaptersByAfterId(chapters: CodeUserChapter[]) {
  const grouped = new Map<string, CodeUserChapter[]>();
  for (const chapter of chapters) {
    const existing = grouped.get(chapter.afterId);
    if (existing) existing.push(chapter);
    else grouped.set(chapter.afterId, [chapter]);
  }
  return grouped;
}

function officialChapterTitleFromText(text: string) {
  const firstLine = text.split("\n").find((line) => line.trim().length > 0)?.trim() ?? text.trim();
  const title = firstLine.slice(0, 40);
  return firstLine.length > 40 ? `${title}…` : title || "Chapter";
}

function estimateTranscriptRowSize(row: TranscriptRow) {
  if (row.kind === "assistant") return 400;
  if (row.kind === "user") return 80;
  return 48;
}

/**
 * Official Fu virtualizer (c3d5 `ve`, used as Fu from c119 Gb/R):
 * - pin is set only by scroll-direction in Fu, setPinned/scrollToIndex, or restore
 * - while pinned + not mid-user-scroll, stick scrollTop = totalSize
 * - unmount saves isPinned + anchorKey + anchorOffsetPx + measurements for restoreKey
 */
function useOfficialTranscriptVirtualizer<TItem>({
  estimateSize,
  getKey,
  items,
  overscan = 6,
  paddingEnd = 48,
  paddingStart = 48,
  restoreKey,
}: {
  estimateSize: (item: TItem, index: number) => number;
  getKey: (item: TItem) => string;
  items: TItem[];
  overscan?: number;
  paddingEnd?: number;
  paddingStart?: number;
  restoreKey?: string;
}) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const itemCount = items.length;
  const restoreRef = useRef<OfficialTranscriptRestore | undefined | null>(null);
  if (restoreRef.current === null) {
    restoreRef.current = restoreKey !== undefined ? officialTranscriptScrollRestores.get(restoreKey) : undefined;
  }
  const pinnedRef = useRef(restoreRef.current?.isPinned ?? true);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const estimateSizeRef = useRef(estimateSize);
  estimateSizeRef.current = estimateSize;

  // Official Fu refs: last observed scroll / total, last programmatic top, restore target index, missing anchor.
  const lastObservedScrollTopRef = useRef(0);
  const lastObservedTotalSizeRef = useRef(0);
  const lastProgrammaticScrollTopRef = useRef(-1);
  const restoreTargetIndexRef = useRef<number | null>(null);
  const pendingMissingAnchorKeyRef = useRef<string | null>(null);
  const didInitRestoreRef = useRef(false);
  const lastItemCountForMissingRef = useRef(0);

  const initialOffsetRef = useRef<number | undefined>(undefined);
  if (initialOffsetRef.current === undefined) {
    const restored = restoreRef.current;
    if (pinnedRef.current) {
      initialOffsetRef.current = (paddingStart ?? 0)
        + items.reduce((total, item, index) => total + estimateSize(item, index), 0)
        + (paddingEnd ?? 0);
    } else if (restored?.anchorKey && restored.measurements?.length) {
      const anchor = restored.measurements.find((item) => String(item.key) === restored.anchorKey);
      initialOffsetRef.current = anchor ? Math.max(0, anchor.start + (restored.anchorOffsetPx ?? 0)) : 0;
    } else {
      initialOffsetRef.current = 0;
    }
  }

  const virtualizer = useVirtualizer({
    count: itemCount,
    estimateSize: (index) => estimateSizeRef.current(itemsRef.current[index], index),
    getItemKey: (index) => getKeyRef.current(itemsRef.current[index]),
    getScrollElement: () => scrollRef.current,
    initialMeasurementsCache: restoreRef.current?.measurements,
    initialOffset: initialOffsetRef.current,
    overscan,
    paddingEnd,
    paddingStart,
  });
  // Official Fu assigns this on the instance (not as a useVirtualizer option).
  virtualizer.shouldAdjustScrollPositionOnItemSizeChange = (item, _delta, instance) => (
    !pinnedRef.current && item.end <= (instance.scrollOffset ?? 0)
  );

  const virtualizerRef = useRef(virtualizer);
  virtualizerRef.current = virtualizer;
  const totalSize = virtualizer.getTotalSize();
  const viewportHeight = virtualizer.scrollRect?.height ?? 0;
  const isScrolling = virtualizer.isScrolling;
  // Official sizerHeight: max(totalSize, viewport) so short transcripts still fill and pin-to-bottom works.
  const sizerHeight = Math.max(totalSize, viewportHeight);

  const applySizerHeight = useCallback((size: number) => {
    const sizer = sizerRef.current;
    if (!sizer) return;
    const height = virtualizerRef.current.scrollRect?.height ?? 0;
    sizer.style.height = `${Math.max(size, height)}px`;
  }, []);

  const tryRestoreAnchorKey = useCallback((anchorKey: string) => {
    const index = itemsRef.current.findIndex((item) => getKeyRef.current(item) === anchorKey);
    if (index < 0) return false;
    restoreTargetIndexRef.current = index;
    pendingMissingAnchorKeyRef.current = null;
    pinnedRef.current = false;
    return true;
  }, []);

  // Official Fu scroll handler: direction vs content shrink decides pin — never distance-from-bottom alone.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return undefined;
    const onScroll = () => {
      const vz = virtualizerRef.current;
      const nextTotal = vz.getTotalSize();
      const scrollTop = node.scrollTop;
      const deltaUp = lastObservedScrollTopRef.current - scrollTop;
      const shrinkAllowance = Math.max(0, lastObservedTotalSizeRef.current - nextTotal);
      lastObservedScrollTopRef.current = scrollTop;
      lastObservedTotalSizeRef.current = nextTotal;
      if (Math.abs(deltaUp) > shrinkAllowance + 8) {
        restoreTargetIndexRef.current = null;
        pendingMissingAnchorKeyRef.current = null;
      }
      const scrollingUp = deltaUp > shrinkAllowance + 1;
      const distanceFromBottom = nextTotal - scrollTop - node.clientHeight;
      if (distanceFromBottom < 8 && !scrollingUp) pinnedRef.current = true;
      else if (scrollingUp) pinnedRef.current = false;
    };
    node.addEventListener("scroll", onScroll, { passive: true });
    return () => node.removeEventListener("scroll", onScroll);
  }, [itemCount]);

  // Official Fu layout: restore anchor once, else while pinned stick to totalSize (skip if user is mid-scroll).
  useLayoutEffect(() => {
    if (itemCount === 0) return;
    const vz = virtualizerRef.current;
    const node = scrollRef.current;

    if (!didInitRestoreRef.current) {
      didInitRestoreRef.current = true;
      const anchorKey = restoreRef.current?.anchorKey;
      if (!pinnedRef.current) {
        if (anchorKey === undefined || tryRestoreAnchorKey(anchorKey)) {
          if (anchorKey === undefined) pinnedRef.current = true;
        } else {
          pendingMissingAnchorKeyRef.current = anchorKey;
          lastItemCountForMissingRef.current = itemCount;
          // Official falls back to pin until the missing anchor appears.
          pinnedRef.current = true;
        }
      }
    } else if (
      pendingMissingAnchorKeyRef.current
      && itemCount > lastItemCountForMissingRef.current
    ) {
      lastItemCountForMissingRef.current = itemCount;
      tryRestoreAnchorKey(pendingMissingAnchorKeyRef.current);
    }

    if (restoreTargetIndexRef.current !== null && node) {
      if (isScrolling && node.scrollTop !== lastProgrammaticScrollTopRef.current) return;
      const targetItem = vz.measurementsCache[restoreTargetIndexRef.current];
      if (targetItem) {
        const offset = restoreRef.current?.anchorOffsetPx ?? 0;
        const targetTop = targetItem.start + offset;
        const currentOffset = vz.scrollOffset;
        if (currentOffset !== null && Math.abs(currentOffset - targetTop) < 1) {
          restoreTargetIndexRef.current = null;
          return;
        }
        applySizerHeight(vz.getTotalSize());
        node.scrollTop = targetTop;
        lastProgrammaticScrollTopRef.current = node.scrollTop;
        lastObservedScrollTopRef.current = node.scrollTop;
        lastObservedTotalSizeRef.current = vz.getTotalSize();
      }
      return;
    }

    if (!pinnedRef.current || !node) return;
    // Official: if user is actively scrolling away from our last programmatic top, do not re-pin.
    if (isScrolling && node.scrollTop !== lastProgrammaticScrollTopRef.current) return;

    const nextTotal = vz.getTotalSize();
    applySizerHeight(nextTotal);
    node.scrollTop = nextTotal;
    lastProgrammaticScrollTopRef.current = node.scrollTop;
    lastObservedScrollTopRef.current = node.scrollTop;
    lastObservedTotalSizeRef.current = nextTotal;
  }, [applySizerHeight, isScrolling, itemCount, totalSize, tryRestoreAnchorKey]);

  useLayoutEffect(() => {
    const sizer = sizerRef.current;
    if (sizer) sizer.style.height = `${sizerHeight}px`;
  }, [sizerHeight]);

  // Official Fu unmount save: isPinned + anchor + measurements for session switch restore.
  const restoreKeyRef = useRef(restoreKey);
  restoreKeyRef.current = restoreKey;
  useEffect(() => () => {
    const key = restoreKeyRef.current;
    if (key === undefined) return;
    if (pendingMissingAnchorKeyRef.current && restoreRef.current) {
      officialTranscriptScrollRestores.set(key, restoreRef.current);
      return;
    }
    const vz = virtualizerRef.current;
    const node = scrollRef.current;
    const scrollOffset = node?.scrollTop ?? vz.scrollOffset ?? 0;
    const measurements = vz.measurementsCache;
    const anchor = measurements.find((item) => item.end > scrollOffset);
    officialTranscriptScrollRestores.set(key, {
      isPinned: pinnedRef.current,
      anchorKey: anchor ? String(anchor.key) : undefined,
      anchorOffsetPx: anchor ? scrollOffset - anchor.start : 0,
      measurements: measurements.slice(),
    });
  }, []);

  // Official measureElement: measure only; pin stick is handled by the layout effect above.
  const measureElement = useCallback((node: HTMLElement | null) => {
    virtualizerRef.current.measureElement(node);
  }, []);

  const scrollToIndex = useCallback((index: number, align: "start" | "center" | "end" | "auto" = "start") => {
    pinnedRef.current = false;
    restoreTargetIndexRef.current = null;
    virtualizerRef.current.scrollToIndex(index, { align });
  }, []);

  // Official setPinned: only flips the flag (and clears restore target when unpinning). Does NOT scroll.
  const setPinned = useCallback((value: boolean) => {
    pinnedRef.current = value;
    if (!value) restoreTargetIndexRef.current = null;
  }, []);

  const isPinned = useCallback(() => pinnedRef.current, []);

  return {
    isPinned,
    measureElement,
    scrollRef,
    scrollToIndex,
    setPinned,
    sizerHeight,
    sizerRef,
    virtualItems: virtualizer.getVirtualItems(),
  };
}

function buildTranscriptRows(entries: TranscriptEntry[]): TranscriptRow[] {
  const usedIds = new Set<string>();
  const rowId = (id: string, index: number) => {
    if (!usedIds.has(id)) {
      usedIds.add(id);
      return id;
    }
    const next = `${id}:${index}`;
    usedIds.add(next);
    return next;
  };
  const rows: TranscriptRow[] = entries.map((entry, entryIdx) => ({
    entry,
    entryIdx,
    id: rowId(entry.id, entryIdx),
    kind: entry.author,
  }));
  rows.push({ id: "running-tasks", kind: "running-tasks" });
  rows.push({ id: "loader", kind: "loader" });
  return rows;
}

function TranscriptRowContent({
  initialCount,
  isAwaitingReply,
  isResponding,
  lastEntryIdx,
  onPinUserChapter,
  onUnpinUserChapters,
  pendingTurnStartedAt,
  row,
  sessionId,
  spawnLabel,
  streamTokenEstimate,
  tasks,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  initialCount: number;
  isAwaitingReply: boolean;
  isResponding: boolean;
  lastEntryIdx: number;
  onPinUserChapter: (afterId: string, text: string) => void;
  onUnpinUserChapters: (afterId: string) => void;
  pendingTurnStartedAt?: number | null;
  row: TranscriptRow;
  sessionId?: string;
  spawnLabel?: string;
  streamTokenEstimate: number;
  tasks: OfficialBackgroundTask[];
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId: Map<string, CodeUserChapter[]>;
}) {
  if (row.kind === "running-tasks") return <OfficialRunningTasks isResponding={isResponding} tasks={tasks} />;
  if (row.kind === "loader") {
    return (
      <OfficialWorkingStatus
        isWorking={isResponding}
        sessionId={sessionId}
        spawnLabel={spawnLabel}
        startedAt={pendingTurnStartedAt}
        tokenEstimate={streamTokenEstimate}
      />
    );
  }

  const isNewUserEntry = row.kind === "user" && row.entryIdx >= initialCount;
  const isStreaming = row.kind === "assistant" && isResponding && row.entryIdx === lastEntryIdx;
  const showCodeAwaitingDot = row.kind === "assistant" && isAwaitingReply && row.entryIdx === lastEntryIdx;
  const content = row.kind === "user"
    ? <CodeUserEntryMessage entry={row.entry} isQueued={row.entry.isQueued === true} />
    : (
      <CodeAssistantEntryMessage
        entry={row.entry}
        isStreaming={isStreaming}
        onPinUserChapter={onPinUserChapter}
        onUnpinUserChapters={onUnpinUserChapters}
        showAwaitingDot={showCodeAwaitingDot}
        transcriptMode={transcriptMode}
        userChaptersByAfterId={userChaptersByAfterId}
      />
    );
  if (row.kind === "user") {
    return <div data-epitaxy-entry={row.entry.id} className={`origin-left ${isNewUserEntry ? "epitaxy-user-enter" : ""}`}>{content}</div>;
  }
  return <div data-epitaxy-entry={row.entry.id}>{content}</div>;
}

function OfficialRunningTasks({ isResponding, tasks }: { isResponding: boolean; tasks: OfficialBackgroundTask[] }) {
  const context = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => summarizeOfficialRunningTasks(tasks), [tasks]);
  if (isResponding || !summary) return null;
  const content = (
    <>
      <span className={`text-body truncate min-w-0 ${summary.waiting ? "epitaxy-text-shine" : "text-assistant-secondary"}`}>
        {formatOfficialRunningTasksSummary(summary)}
      </span>
      <ToolChevron expanded={false} />
    </>
  );
  if (!context?.openTasks) {
    return <div className="flex self-start max-w-full items-center">{content}</div>;
  }
  return (
    <button type="button" onClick={context.openTasks} className="flex self-start max-w-full items-center gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3">
      {content}
    </button>
  );
}

type OfficialRunningTaskKind = "shell" | "agent" | "workflow" | "monitor" | "dream" | "task";

type OfficialRunningTasksSummary = {
  count: number;
  kind: OfficialRunningTaskKind;
  waiting: boolean;
};

function summarizeOfficialRunningTasks(tasks: OfficialBackgroundTask[]): OfficialRunningTasksSummary | null {
  const running = tasks.filter((task) => task.status === "running");
  if (running.length === 0) return null;
  const selectedKind = officialTaskRunningKind(running[0]?.taskType);
  const sameKindCount = running.filter((task) => officialTaskRunningKind(task.taskType) === selectedKind).length;
  return {
    count: sameKindCount,
    kind: selectedKind,
    waiting: running.some((task) => !task.lastToolName && !task.usage),
  };
}

function officialTaskRunningKind(taskType?: string): OfficialRunningTaskKind {
  switch (taskType) {
    case "local_bash":
      return "shell";
    case "local_agent":
    case "remote_agent":
    case "in_process_teammate":
      return "agent";
    case "local_workflow":
      return "workflow";
    case "monitor_mcp":
      return "monitor";
    case "dream":
      return "dream";
    default:
      return "task";
  }
}

function formatOfficialRunningTasksSummary(summary: OfficialRunningTasksSummary) {
  if (summary.kind === "dream") return "Dreaming";
  if (summary.kind === "task") return `${summary.count} ${summary.count === 1 ? "background task" : "background tasks"}`;
  const label = summary.kind === "shell" ? "shell" : summary.kind;
  return `${summary.count} ${label}${summary.count === 1 ? " running" : "s running"}`;
}


/**
 * Official Hb user entry (c11959232):
 * filters file/image/text/event/bash/peer, then branch layouts
 * (bash-only / peer-only / event-only / default bubble).
 */
/**
 * Official Hb (c11959232):
 * branches — bash-only → code-attachment (Ob) → peer-only → event-only → default bubble.
 * Text segments via Eb/Pb/Tb; inline via zb; durable Ub gates fork/rewind.
 */
export function CodeUserEntryMessage({
  entry,
  isQueued = false,
  onCancelQueued,
}: {
  entry: TranscriptEntry;
  isQueued?: boolean;
  onCancelQueued?: () => void;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const cancelQueued = onCancelQueued ?? (isQueued && actions?.cancelQueuedMessage
    ? () => actions.cancelQueuedMessage?.(entry.id)
    : undefined);
  const textItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "text" }> => item.kind === "text");
  const bashItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "bash" }> => item.kind === "bash");
  const eventItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "event" }> => item.kind === "event");
  const peerItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "peer" }> => item.kind === "peer");
  const imageItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "image" }> => item.kind === "image");
  const fileItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "file" }> => item.kind === "file");
  const uploadedItems = entry.items.filter((item): item is Extract<TranscriptEntryItem, { kind: "uploaded-file" }> => item.kind === "uploaded-file");
  const copyText = textItems.map((item) => item.text).join("\n\n");
  const durableId = !isQueued && OFFICIAL_DURABLE_UUID_RE.test(entry.id);
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  // Official: n && y ? () => n(t.id, b) : void 0 — only durable UUIDs enable fork/rewind.
  const onFork = durableId && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = durableId && actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const onAttachAsContext = actions?.attachAsContext;
  const openPath = useCallback((path: string) => {
    actions?.openFile({ path });
  }, [actions]);
  const textSegments = useMemo(
    () => textItems.flatMap((item) => parseOfficialUserTextSegments(item.text, item.id)),
    [textItems],
  );
  // Official M: any code segment with filePath → code-attachment layout.
  const hasCodeAttachment = textSegments.some((segment) => segment.kind === "code" && Boolean(segment.filePath));
  const [expandedLongText, setExpandedLongText] = useState(false);
  const textLength = useMemo(() => textItems.reduce((sum, item) => sum + item.text.length, 0), [textItems]);
  // Official R = !M && N > 1200
  const isLongText = !hasCodeAttachment && textLength > 1200;
  const attachmentStrip = (
    <OfficialUserAttachments
      files={fileItems}
      images={imageItems}
      uploaded={uploadedItems}
    />
  );

  // Official Hb bash-only: m.length > 0 && u/f/p empty (images/text/events).
  if (bashItems.length > 0 && imageItems.length === 0 && textItems.length === 0 && eventItems.length === 0) {
    return (
      <div className="flex flex-col gap-g6 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb bash-only">
        {attachmentStrip}
        {bashItems.map((item) => <UserBashBlock item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb code-attachment (M && no images): Ob cards + per-segment text bubbles.
  if (hasCodeAttachment && imageItems.length === 0) {
    return (
      <div className="group/msg flex flex-col items-start gap-g6 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb code-attachment">
        {attachmentStrip}
        {textSegments.map((segment) => {
          if (segment.kind === "code") {
            return (
              <OfficialUserCodeAttachment
                filePath={segment.filePath}
                key={segment.key}
                lang={segment.lang}
                onOpenPath={openPath}
                startLine={segment.startLine}
                suggestion={segment.suggestion}
                text={segment.text}
              />
            );
          }
          return (
            <OfficialTranscriptItemMenu
              key={segment.key}
              onAttachAsContext={onAttachAsContext}
              onFork={onFork}
              onRewind={onRewind}
              text={segment.text}
            >
              <div className={`${officialUserMessageClass} max-w-[75%]`}>
                <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty m-0">
                  {renderOfficialUserInlineText(segment.text, false, openPath)}
                </p>
              </div>
            </OfficialTranscriptItemMenu>
          );
        })}
        <OfficialMessageActions
          buttonVariant="link"
          className="-mt-[8px]"
          copyText={copyText || undefined}
          onFork={onFork}
          onRewind={onRewind}
          timestamp={entry.timestamp}
        />
      </div>
    );
  }

  // Official Hb peer-only.
  if (peerItems.length > 0 && imageItems.length === 0 && textItems.length === 0) {
    return (
      <div className="flex flex-col gap-g3 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb peer-only">
        {attachmentStrip}
        {peerItems.map((item) => <OfficialUserPeerCard item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb event-only.
  if (eventItems.length > 0 && imageItems.length === 0 && textItems.length === 0) {
    return (
      <div className="flex flex-col gap-g3 w-full" data-official-source="c11959232-h_zsw3wI.js:Hb event-only">
        {attachmentStrip}
        {eventItems.map((item) => <OfficialUserEventCard item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb default bubble (max-w-[75%], Uv, zb/Ob segments, show more, Vv).
  const bubbleBody = textItems.length > 0 ? (
    <OfficialTranscriptItemMenu
      onAttachAsContext={onAttachAsContext}
      onFork={onFork}
      onRewind={onRewind}
      text={copyText}
    >
      <div className={`${officialUserMessageClass} max-w-full`}>
        <div className={isLongText && !expandedLongText
          ? "flex flex-col gap-g4 max-h-[16rem] overflow-clip [mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)]"
          : "flex flex-col gap-g4"}
        >
          {textSegments.map((segment) => (
            segment.kind === "code" ? (
              <OfficialUserCodeAttachment
                key={segment.key}
                lang={segment.lang}
                text={segment.text}
              />
            ) : (
              <p className="text-body whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty m-0" key={segment.key}>
                {renderOfficialUserInlineText(segment.text, isLongText && !expandedLongText, openPath)}
              </p>
            )
          ))}
        </div>
        {isLongText ? (
          <OfficialButton
            ariaLabel={expandedLongText ? "Show less" : "Show more"}
            className="self-start"
            onClick={() => setExpandedLongText((value) => !value)}
            size="small"
            variant="uncontained"
          >
            {expandedLongText ? "Show less" : "Show more"}
          </OfficialButton>
        ) : null}
      </div>
    </OfficialTranscriptItemMenu>
  ) : null;

  return (
    <div
      className={`group/msg flex justify-start items-start gap-g3 w-full transition-opacity duration-200 ${isQueued ? "opacity-50 hover:opacity-80" : ""}`}
      data-official-source="c11959232-h_zsw3wI.js:Hb default"
    >
      {isQueued ? (
        <span className="sr-only">Queued. Claude will read this after the current turn.</span>
      ) : null}
      <div className="flex flex-col items-start gap-g6 max-w-[75%] min-w-0">
        {attachmentStrip}
        {bubbleBody}
        {textItems.length > 0 && !isQueued ? (
          <OfficialMessageActions
            buttonVariant="link"
            className="-mt-[8px]"
            copyText={copyText || undefined}
            onFork={onFork}
            onRewind={onRewind}
            timestamp={entry.timestamp}
          />
        ) : null}
      </div>
      {/* Official Hb: s && o → yd link XCrossCloseMedium "Remove queued message" */}
      {isQueued && cancelQueued ? (
        <OfficialButton
          ariaLabel="Remove queued message"
          className="self-center opacity-0 group-hover/msg:opacity-100 focus-visible:opacity-100 transition-opacity"
          icon="XCrossCloseMedium"
          onClick={cancelQueued}
          size="small"
          variant="link"
        />
      ) : null}
    </div>
  );
}

/** Official Sv attachment strip: file chips + image thumbs (c11959232). */
function OfficialUserAttachments({
  files,
  images,
  uploaded,
}: {
  files: Array<Extract<TranscriptEntryItem, { kind: "file" }>>;
  images: Array<Extract<TranscriptEntryItem, { kind: "image" }>>;
  uploaded: Array<Extract<TranscriptEntryItem, { kind: "uploaded-file" }>>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const fileChips = [
    ...files.map((file) => ({ id: file.id, fileName: file.fileName, path: undefined as string | undefined })),
    ...uploaded.map((item) => ({ id: item.id, fileName: item.file.fileName, path: item.file.path })),
  ];
  if (fileChips.length === 0 && images.length === 0) return null;
  return (
    <>
      {fileChips.length > 0 ? (
        <ul
          aria-label="Attached files"
          className="flex flex-wrap items-end gap-g4 max-w-full"
          data-official-source="c11959232-h_zsw3wI.js:Sv files"
          role="list"
        >
          {fileChips.map((file) => {
            const chip = (
              <>
                <span aria-hidden="true" className="shrink-0 inline-flex items-center justify-center w-[24px] h-[24px] rounded-r3 bg-t2">
                  <Icon name="Document" size="xs" />
                </span>
                <span className="truncate">{file.fileName}</span>
              </>
            );
            return (
              <li
                className="flex items-center gap-g4 max-w-full h-[32px] pl-p3 pr-p5 rounded-r5 bg-fill-contained-default effect-contained-default text-contained-default text-body select-text"
                key={file.id}
                role="listitem"
                title={file.fileName}
              >
                {file.path ? (
                  <button
                    className="flex items-center gap-g4 max-w-full min-w-0 border-0 bg-transparent p-0 m-0 cursor-default outline-none hide-focus-ring ring-focus text-inherit"
                    onClick={() => actions?.openFile({ path: file.path! })}
                    type="button"
                  >
                    {chip}
                  </button>
                ) : chip}
              </li>
            );
          })}
        </ul>
      ) : null}
      {images.length > 0 ? (
        <div className="flex flex-wrap items-end gap-g6 max-w-full p-[1px]" data-official-source="c11959232-h_zsw3wI.js:Sv images">
          {images.map((image) => (
            <img
              alt=""
              className="block max-w-[120px] max-h-[120px] rounded-r3 effect-contrast-stroke"
              key={image.id}
              src={`data:${image.mimeType};base64,${image.data}`}
            />
          ))}
        </div>
      ) : null}
    </>
  );
}

/** Official Ib peer card (c11959232). */
function OfficialUserPeerCard({ item }: { item: Extract<TranscriptEntryItem, { kind: "peer" }> }) {
  const title = (() => {
    switch (item.origin.kind) {
      case "peer":
        return `Message from session ${item.origin.name ?? item.origin.from ?? "unknown"}`;
      case "teammate":
        return `Message from teammate ${item.origin.from ?? "unknown"}`;
      case "coordinator":
        return "Message from team lead";
      case "channel":
        return item.origin.server ? `Message from ${item.origin.server}` : "Channel message";
      default:
        return "Message";
    }
  })();
  return (
    <div className="flex w-full flex-col gap-g3 rounded-r6 border border-t3 bg-t1 p-p5" data-official-source="c11959232-h_zsw3wI.js:Ib">
      <div className="flex items-center gap-g3 text-body text-assistant-secondary">
        <Icon name="ChatBubble" size="xs" />
        <span className="truncate">{title}</span>
      </div>
      <p className="text-body text-assistant-primary whitespace-pre-wrap [overflow-wrap:anywhere] select-text m-0">
        {renderOfficialUserInlineText(item.content)}
      </p>
    </div>
  );
}

/** Official Nb event type labels (c11959232). */
const OFFICIAL_USER_EVENT_LABELS: Record<string, string> = {
  github: "GitHub event received",
  ci: "CI event",
  hook: "Hook re-prompted Claude",
};

/** Official Rb event card (c11959232) — collapsible tool-style row. */
function OfficialUserEventCard({ item }: { item: Extract<TranscriptEntryItem, { kind: "event" }> }) {
  const [expanded, setExpanded] = useState(false);
  const rawType = item.eventType ? String(item.eventType) : "event";
  const label = OFFICIAL_USER_EVENT_LABELS[rawType] ?? rawType;
  return (
    <div className="flex flex-col w-full" data-official-source="c11959232-h_zsw3wI.js:Rb">
      <button
        aria-expanded={expanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g3 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3 border-0 bg-transparent p-0 m-0 cursor-default"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="text-body text-assistant-primary">{label}</span>
        <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" />
      </button>
      {expanded ? (
        <div className="pl-p6 pt-p3 text-code text-assistant-secondary whitespace-pre-wrap break-all select-text">
          {item.content}
        </div>
      ) : null}
    </div>
  );
}

export function CodeAssistantEntryMessage({
  entry,
  isStreaming = false,
  onPinUserChapter,
  onUnpinUserChapters,
  showAwaitingDot = false,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  entry: TranscriptEntry;
  isStreaming?: boolean;
  onPinUserChapter?: (afterId: string, text: string) => void;
  onUnpinUserChapters?: (afterId: string) => void;
  showAwaitingDot?: boolean;
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId?: Map<string, CodeUserChapter[]>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const chaptersByAfterId = userChaptersByAfterId ?? emptyCodeUserChaptersByAfterId;
  const visibleItems = entry.items.filter(isVisibleAssistantEntryItem);
  const copyText = visibleItems.flatMap((item) => item.kind === "text" ? [item.text] : []).join("\n\n") || undefined;
  const firstVisibleItem = visibleItems[0];
  const hasErrorItem = visibleItems.some((item) => item.kind === "error");
  const pinHandlersForItem = useCallback((itemId: string, textForTitle: () => string) => {
    const pinned = chaptersByAfterId.get(itemId);
    if (!onPinUserChapter || !onUnpinUserChapters) return { isPinned: Boolean(pinned?.length) };
    if (pinned?.length) {
      return {
        isPinned: true,
        onPinChapter: () => pinned.forEach((chapter) => onUnpinUserChapters(itemId)),
      };
    }
    return {
      isPinned: false,
      onPinChapter: () => onPinUserChapter(itemId, textForTitle()),
    };
  }, [chaptersByAfterId, onPinUserChapter, onUnpinUserChapters]);
  const firstPin = firstVisibleItem
    ? pinHandlersForItem(firstVisibleItem.id, () => copyText ?? "")
    : { isPinned: false as boolean };
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const rewindToHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  const retryLastTurn = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  // Official Kb: fork/rewind only on Uv (item context menu), not on Vv hover action bar.
  const onFork = !isStreaming && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = !isStreaming && actions?.bridge.rewind ? () => { void rewindToHere(); } : undefined;
  const onRetry = !isStreaming && actions?.bridge.rewind ? () => { void retryLastTurn(); } : undefined;
  const onRateMessage = !isStreaming && actions?.sessionId && actions.bridge.submitTranscriptFeedback
    ? (messageUuid: string, rating: "negative" | "positive") => {
      void actions.bridge.submitTranscriptFeedback?.(actions.sessionId, {
        messageUuid,
        rating,
        source: "epitaxy-transcript",
        type: "message_rating",
      });
    }
    : undefined;
  if (visibleItems.length === 0) return null;

  // Official Kb (c11959232): shell + per-item Uv + Vv (text/timestamp/rate/pin only).
  return (
    <OfficialAssistantMessage
      copyText={copyText}
      createdAt={isStreaming ? undefined : entry.timestamp}
      isPinned={Boolean(firstPin.isPinned)}
      onPinChapter={firstPin.onPinChapter}
      onRateMessage={onRateMessage}
      rateMessageUuid={entry.id}
      showAwaitingDot={showAwaitingDot}
    >
      {visibleItems.map((item) => (
        <Fragment key={item.id}>
          {chaptersByAfterId.get(item.id)?.map((chapter) => <CodeChapterTitle chapter={chapter} key={chapter.id} />)}
          {/* Official Kb: hide turn_error when same entry already has error items (x). */}
          {item.kind === "turn_error" && hasErrorItem
            ? null
            : renderCodeAssistantEntryItem(item, {
              isStreaming,
              onAttachAsContext: actions?.attachAsContext,
              onFork,
              onRetry: hasErrorItem ? undefined : onRetry,
              onRewind,
              pin: pinHandlersForItem,
              sessionId: actions?.sessionId,
              transcriptMode,
            })}
        </Fragment>
      ))}
    </OfficialAssistantMessage>
  );
}

function renderCodeAssistantEntryItem(
  item: Exclude<TranscriptEntryItem, { kind: "file" | "image" | "peer" | "uploaded-file" }>,
  options: {
    isStreaming: boolean;
    onAttachAsContext?: (text: string) => void;
    onFork?: () => void;
    onRetry?: () => void;
    onRewind?: () => void;
    pin: (itemId: string, textForTitle: () => string) => { isPinned?: boolean; onPinChapter?: () => void };
    sessionId?: string;
    transcriptMode: OfficialTranscriptMode;
  },
) {
  if (item.kind === "thinking") return <CodeThinkingBlock text={item.text} transcriptMode={options.transcriptMode} />;
  if (item.kind === "text") {
    const pin = options.pin(item.id, () => item.text);
    return (
      <OfficialTranscriptItemMenu
        isPinned={pin.isPinned}
        onAttachAsContext={options.onAttachAsContext}
        onFork={options.onFork}
        onPinChapter={pin.onPinChapter}
        onRewind={options.onRewind}
        text={item.text}
      >
        <div>
          <OfficialCodeMarkdown isStreaming={options.isStreaming} text={item.text} />
        </div>
      </OfficialTranscriptItemMenu>
    );
  }
  if (item.kind === "tools") {
    const pin = options.pin(item.id, () => officialToolsCopyText(item.tools));
    return (
      <OfficialTranscriptItemMenu
        isPinned={pin.isPinned}
        onAttachAsContext={options.onAttachAsContext}
        onFork={options.onFork}
        onPinChapter={pin.onPinChapter}
        onRewind={options.onRewind}
        text={officialToolsCopyText(item.tools) || undefined}
      >
        <div className="flex flex-col gap-[var(--chat-item-gap)]">
          <AssistantToolsBlock item={item} transcriptMode={options.transcriptMode} />
        </div>
      </OfficialTranscriptItemMenu>
    );
  }
  if (item.kind === "error") {
    return <CodeApiErrorBlock code={item.code} onRetry={options.onRetry} sessionId={options.sessionId} text={item.text} />;
  }
  // Official Kb: turn_error → rv (hidden when same message also has error items).
  if (item.kind === "turn_error") {
    return (
      <CodeTurnErrorBlock
        errors={item.errors}
        onRetry={options.onRetry}
        onRewind={options.onRewind}
        sessionId={options.sessionId}
        subtype={item.subtype}
      />
    );
  }
  // Official Kb: task_event → ev EpitaxyTaskChip
  if (item.kind === "task_event") {
    return <CodeTaskEventChip item={item} />;
  }
  // Official Kb: chapter → Lh
  if (item.kind === "chapter") {
    return <CodeOfficialChapterItem item={item} sessionId={options.sessionId} />;
  }
  // Official Kb: context → Ku; stats → $x
  if (item.kind === "context") {
    return (
      <div className="max-w-[520px]" data-official-source="c11959232-h_zsw3wI.js:Ku + index dCe">
        <OfficialContextWindowUsage usage={item.usage} />
      </div>
    );
  }
  if (item.kind === "stats") {
    return <CodeStatsCard stats={item.stats} />;
  }
  if (item.kind === "bash") return <UserBashBlock item={item} />;
  return <div className="text-body text-t6 whitespace-pre-wrap break-words">{item.content}</div>;
}

/** Official Bb API Error card (c11959232) + Dh reset_rate_limits when gated. */
function CodeApiErrorBlock({
  code,
  onRetry,
  sessionId: _sessionId,
  text,
}: {
  code?: string;
  onRetry?: () => void;
  sessionId?: string;
  text: string;
}) {
  const isRateLimit = code === "rate_limit" || /hit your limit|out of (extra )?usage|usage allocation|monthly usage limit/i.test(text);
  const [resetState, setResetState] = useState<"idle" | "pending" | "done" | "error">("idle");
  const [canReset, setCanReset] = useState(false);
  const [orgUuid, setOrgUuid] = useState<string | null>(null);

  useEffect(() => {
    if (!isRateLimit) return undefined;
    let alive = true;
    void fetchBootstrapPayload().then((bootstrap) => {
      if (!alive) return;
      const uuid = organizationUuidFromBootstrap(bootstrap);
      setOrgUuid(uuid);
      setCanReset(Boolean(uuid) && canResetRateLimitsFromBootstrap(bootstrap));
    });
    return () => {
      alive = false;
    };
  }, [isRateLimit]);

  const resetLimits = async () => {
    if (!orgUuid || resetState === "pending") return;
    setResetState("pending");
    const result = await postOrganizationResetRateLimits(orgUuid);
    setResetState(result.ok ? "done" : "error");
  };

  return (
    <div className="rounded-r3 border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="c11959232-h_zsw3wI.js:Bb+Dh">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote flex items-center justify-between gap-g3">
        <span>API Error</span>
        {isRateLimit && canReset ? (
          <OfficialButton
            disabled={resetState === "pending" || resetState === "done"}
            onClick={() => void resetLimits()}
            size="small"
            variant="uncontained"
          >
            {resetState === "pending" ? "Resetting…" : resetState === "done" ? "Limits reset" : resetState === "error" ? "Reset failed" : "Reset limits"}
          </OfficialButton>
        ) : null}
      </div>
      <div className="px-p3 py-p2">
        <code className="text-code break-words whitespace-pre-wrap">{text}</code>
      </div>
      {onRetry && !isRateLimit ? (
        <div className="flex flex-wrap items-center gap-g3 px-p3 pb-p3">
          <OfficialButton onClick={onRetry} size="small" variant="contained">
            Try again
          </OfficialButton>
        </div>
      ) : null}
    </div>
  );
}

/** Official rv turn_error card (c11959232). */
function CodeTurnErrorBlock({
  errors,
  onRetry,
  onRewind,
  sessionId: _sessionId,
  subtype,
}: {
  errors: string[];
  onRetry?: () => void;
  onRewind?: () => void;
  sessionId?: string;
  subtype?: string;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const title = officialTurnErrorTitle(subtype);
  const statusCode = officialHttpStatusFromErrors(errors);
  const imageTooLarge = errors.some((line) => /exceeds the dimension limit/i.test(line));
  const detailText = errors.join("\n");
  const guidance = officialTurnErrorGuidance(subtype, statusCode, imageTooLarge);
  const showDetailToggle = detailText.length > 0 && detailText.trim().toLowerCase() !== title.trim().toLowerCase();
  const preferRewind = Boolean(onRewind) && (imageTooLarge || subtype === "error_max_turns");
  const showRetry = Boolean(onRetry) && !preferRewind && subtype !== "error_max_turns";
  const mutedGuidance = statusCode === 429 || (statusCode !== undefined && statusCode >= 500);

  return (
    <div className="rounded-r3 border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="c11959232-h_zsw3wI.js:rv">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote">{title}</div>
      <div className="flex flex-col gap-g3 px-p3 py-p3">
        <p className={`text-body ${mutedGuidance ? "text-assistant-secondary" : "text-assistant-primary"}`}>{guidance}</p>
        {showDetailToggle && detailsOpen ? (
          <code className="rounded-r3 bg-t1 px-p3 py-p2 text-code text-t7 break-words whitespace-pre-wrap">{detailText}</code>
        ) : null}
        <div className="flex flex-wrap items-center gap-g3">
          {preferRewind && onRewind ? (
            <OfficialButton onClick={onRewind} size="small" variant="contained">Rewind</OfficialButton>
          ) : null}
          {showRetry && onRetry ? (
            <OfficialButton onClick={onRetry} size="small" variant="contained">Try again</OfficialButton>
          ) : null}
          {showDetailToggle ? (
            <button
              aria-expanded={detailsOpen}
              className="flex items-center gap-g2 text-footnote text-assistant-secondary hover:text-t7 hide-focus-ring focus:ring-focus rounded-r3 border-0 bg-transparent cursor-pointer p-0"
              onClick={() => setDetailsOpen((value) => !value)}
              type="button"
            >
              <Icon name={detailsOpen ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" />
              Details
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function officialTurnErrorTitle(subtype?: string) {
  if (subtype === "error_during_execution") return "Claude couldn't process that message";
  if (subtype === "error_max_turns") return "Reached maximum number of turns";
  return "Turn failed";
}

function officialTurnErrorGuidance(subtype: string | undefined, statusCode: number | undefined, imageTooLarge: boolean) {
  if (subtype === "error_max_turns") return "Rewind to an earlier message or clear the session to continue.";
  if (imageTooLarge) return "This image is too large to send. Rewind to remove it and try again.";
  if (statusCode === 429) return "Rate limited — try again in a moment.";
  if (statusCode === 401) return "Authentication failed — sign in again and retry.";
  if (statusCode === 403) return "Request was blocked — check your permissions and retry.";
  if (statusCode !== undefined && statusCode >= 500) return "Service is busy — try again in a moment, or switch to a different model.";
  return "Try sending your message again.";
}

function officialHttpStatusFromErrors(errors: string[]) {
  for (const line of errors) {
    const match = /\b(4\d{2}|5\d{2})\b/.exec(line);
    if (match) return Number(match[1]);
  }
  return undefined;
}

/** Official ev / EpitaxyTaskChip (c11959232). */
function CodeTaskEventChip({ item }: { item: Extract<TranscriptEntryItem, { kind: "task_event" }> }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const failed = item.status === "failed";
  const noun = officialTaskTypeNoun(item.taskType);
  const statusWord = officialTaskStatusWord(item.status);
  const label = item.description ?? item.summary;
  const body = (
    <>
      <span className={`text-body min-w-0 truncate ${failed ? "text-extended-pink" : "text-assistant-primary"}`}>
        Background {noun} {statusWord}
      </span>
      {label ? <span className="text-body text-assistant-secondary min-w-0 truncate">{label}</span> : null}
    </>
  );
  if (actions?.openTasks) {
    return (
      <button
        aria-label="View background task"
        className="flex items-center gap-g3 py-0 max-w-full text-left cursor-pointer hover:opacity-80 transition-opacity border-0 bg-transparent p-0"
        data-official-source="c11959232-h_zsw3wI.js:ev EpitaxyTaskChip"
        onClick={actions.openTasks}
        type="button"
      >
        {body}
      </button>
    );
  }
  return (
    <div className="flex items-center gap-g3 py-0 max-w-full" data-official-source="c11959232-h_zsw3wI.js:ev EpitaxyTaskChip">
      {body}
    </div>
  );
}

function officialTaskTypeNoun(taskType?: string) {
  switch (taskType) {
    case "local_bash":
      return "shell";
    case "local_agent":
    case "remote_agent":
    case "in_process_teammate":
      return "agent";
    case "local_workflow":
      return "workflow";
    case "monitor_mcp":
      return "monitor";
    case "dream":
      return "dream";
    default:
      return "task";
  }
}

function officialTaskStatusWord(status: OfficialTaskStatus) {
  switch (status) {
    case "running":
      return "started";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "stopped":
      return "stopped";
    default:
      return status;
  }
}

function officialToolsCopyText(tools: TranscriptToolUse[]) {
  const tool = tools[0];
  if (!tool) return "";
  const inputString = (key: string) => stringValue(tool.input[key]);
  return inputString("description") ?? inputString("command") ?? inputString("file_path") ?? inputString("pattern") ?? inputString("prompt") ?? tool.name;
}

function CodeChapterTitle({ chapter }: { chapter: CodeUserChapter }) {
  return (
    <div id={chapter.id} className="text-body-semibold text-assistant-primary select-text scroll-mt-[56px]">
      {chapter.title}
    </div>
  );
}

/** Official Lh chapter item from nke / mark_chapter (c11959232). */
function CodeOfficialChapterItem({
  item,
  sessionId: _sessionId,
}: {
  item: Extract<TranscriptEntryItem, { kind: "chapter" }>;
  sessionId?: string;
}) {
  return (
    <div
      className="text-body-semibold text-assistant-primary select-text scroll-mt-[56px]"
      data-official-source="c11959232-h_zsw3wI.js:Lh + index nke"
      id={item.id}
    >
      {item.title || "Chapter"}
      {item.summary ? (
        <div className="text-body text-assistant-secondary font-normal mt-p2">{item.summary}</div>
      ) : null}
    </div>
  );
}

function CodeThinkingBlock({ text, transcriptMode }: { text: string; transcriptMode: OfficialTranscriptMode }) {
  if (!officialTranscriptModeShowsThinking(transcriptMode)) return null;
  return <div className="text-body text-t6 italic whitespace-pre-wrap break-words">{text}</div>;
}

/** Official av (c11959232): italic qb-style lines for precedingThinking on tool groups. */
function OfficialPrecedingThinkingLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-g2" data-official-source="c11959232-h_zsw3wI.js:av">
      {lines.map((line, index) => (
        <div className="text-body text-t6 italic whitespace-pre-wrap break-words" key={index}>
          {line}
        </div>
      ))}
    </div>
  );
}

function officialTranscriptModeShowsThinking(mode: OfficialTranscriptMode) {
  return mode === "thinking" || mode === "verbose";
}

function officialTranscriptModeExpandsDetails(mode: OfficialTranscriptMode) {
  return mode === "verbose";
}

function wrapStandaloneToolWithPrecedingThinking(
  tool: TranscriptToolUse,
  transcriptMode: OfficialTranscriptMode,
  key?: string,
) {
  const showThinking = officialTranscriptModeShowsThinking(transcriptMode);
  const thinking = showThinking ? tool.precedingThinking : undefined;
  const row = <OfficialToolRow key={key} tool={tool} transcriptMode={transcriptMode} />;
  if (!thinking?.length) return row;
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" key={key}>
      <OfficialPrecedingThinkingLines lines={thinking} />
      <OfficialToolRow tool={{ ...tool, precedingThinking: undefined }} transcriptMode={transcriptMode} />
    </div>
  );
}

function AssistantToolsBlock({ item, transcriptMode = "normal" }: { item: Extract<TranscriptEntryItem, { kind: "tools" }>; transcriptMode?: OfficialTranscriptMode }) {
  // Official Kb: _v(tools, memoryPath?, taskEvents) → map iv groups.
  const runs = groupOfficialToolRuns(item.tools, item.taskEvents);
  if (runs.length === 1) {
    const run = runs[0];
    return run.tools.length === 1 && run.bucket !== "memory" && !(run.taskEvents?.length)
      ? wrapStandaloneToolWithPrecedingThinking(run.tools[0], transcriptMode)
      : <OfficialToolGroup memoryOps={run.memoryOps} taskEvents={run.taskEvents} tools={run.tools} transcriptMode={transcriptMode} />;
  }
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full">
      {runs.map((run) => run.tools.length === 1 && run.bucket !== "memory" && !(run.taskEvents?.length)
        ? wrapStandaloneToolWithPrecedingThinking(run.tools[0], transcriptMode, run.id)
        : <OfficialToolGroup key={run.id} memoryOps={run.memoryOps} taskEvents={run.taskEvents} tools={run.tools} transcriptMode={transcriptMode} />)}
    </div>
  );
}

/**
 * Official standalone buckets (do not coalesce into default runs):
 * - todos family + ExitPlanMode (ion c1a1184fb Phe-like)
 * - AskUserQuestion / EnterPlanMode / SendUser* (session UI interrupts)
 */
const standaloneToolNames = new Set([
  "AskUserQuestion",
  "EnterPlanMode",
  "ExitPlanMode",
  "TodoWrite",
  "TodoRead",
  "TaskCreate",
  "TaskUpdate",
  "TaskGet",
  "TaskList",
  "TaskStop",
  "SendUserMessage",
  "SendUserFile",
]);

type OfficialMemoryOps = { read: number; search: number; write: number };

type OfficialToolRunGroup = {
  bucket: "default" | "memory" | "standalone";
  id: string;
  memoryOps?: OfficialMemoryOps;
  taskEvents?: OfficialToolGroupTaskEvent[];
  tools: TranscriptToolUse[];
};

function aggregateOfficialMemoryOps(tools: TranscriptToolUse[]): OfficialMemoryOps | undefined {
  const ops: OfficialMemoryOps = { read: 0, search: 0, write: 0 };
  let any = false;
  for (const tool of tools) {
    if (!isOfficialMemoryTool(tool)) continue;
    const kind = classifyOfficialMemoryOp(tool);
    if (!kind) continue;
    ops[kind] += 1;
    any = true;
  }
  return any ? ops : undefined;
}

/**
 * Official _v grouping:
 * standalone (vs) | memory (bs) | default, with taskEvents snapped into nearest default group.
 */
function groupOfficialToolRuns(tools: TranscriptToolUse[], taskEvents?: OfficialToolGroupTaskEvent[]) {
  const groups: OfficialToolRunGroup[] = [];
  tools.forEach((tool, index) => {
    const bucket: OfficialToolRunGroup["bucket"] = standaloneToolNames.has(tool.name)
      ? "standalone"
      : isOfficialMemoryTool(tool)
        ? "memory"
        : "default";
    const previous = groups.at(-1);
    if (previous && previous.bucket === bucket && bucket !== "standalone") {
      previous.tools.push(tool);
      return;
    }
    groups.push({
      bucket,
      id: `${bucket}:${tool.id}:${index}`,
      tools: [tool],
    });
  });
  for (const group of groups) {
    if (group.bucket === "memory") group.memoryOps = aggregateOfficialMemoryOps(group.tools);
  }
  if (taskEvents?.length && groups.length > 0) {
    const starts: number[] = [];
    let offset = 0;
    for (const group of groups) {
      starts.push(offset);
      offset += group.tools.length;
    }
    for (const event of taskEvents) {
      // Official: place into the group whose tool range covers `at`, prefer default bucket.
      let groupIndex = groups.length - 1;
      for (let index = 0; index < groups.length; index += 1) {
        const end = starts[index] + groups[index].tools.length;
        if (event.at <= end || index === groups.length - 1) {
          groupIndex = index;
          break;
        }
      }
      if (groups[groupIndex].bucket !== "default") {
        const after = groups.findIndex((group, idx) => idx > groupIndex && group.bucket === "default");
        if (after >= 0) groupIndex = after;
        else {
          for (let back = groupIndex - 1; back >= 0; back -= 1) {
            if (groups[back].bucket === "default") {
              groupIndex = back;
              break;
            }
          }
        }
      }
      const at = Math.max(0, Math.min(event.at - starts[groupIndex], groups[groupIndex].tools.length));
      (groups[groupIndex].taskEvents ??= []).push({ at, event: event.event });
    }
  }
  return groups;
}

function officialMemorySummaryPieces(ops: OfficialMemoryOps): ToolSummaryPiece[] {
  // Official: recalled {a memory|# memories}, saved {a memory|# memories}
  const pieces: ToolSummaryPiece[] = [];
  const recalled = ops.read + ops.search;
  if (recalled > 0) pieces.push({ meta: officialCountNoun(recalled, "memory", "memories", "a"), verb: "recalled" });
  if (ops.write > 0) pieces.push({ meta: officialCountNoun(ops.write, "memory", "memories", "a"), verb: "saved" });
  return pieces.length ? pieces : [{ meta: "memories", verb: "used" }];
}

function OfficialToolGroup({
  memoryOps,
  taskEvents,
  tools,
  transcriptMode = "normal",
}: {
  memoryOps?: OfficialMemoryOps;
  taskEvents?: OfficialToolGroupTaskEvent[];
  tools: TranscriptToolUse[];
  transcriptMode?: OfficialTranscriptMode;
}) {
  const [expanded, setExpanded] = useState(false);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const showThinking = officialTranscriptModeShowsThinking(transcriptMode);
  const toolsKey = tools.map((tool) => tool.id).join("|");
  useEffect(() => {
    setExpanded(false);
  }, [toolsKey]);

  /**
   * Official iv thinking runs (c11959232):
   * when thinking/verbose transcript mode and no memoryOps, split tools on
   * precedingThinking boundaries; each run paints av then recursive iv.
   */
  const thinkingRuns = useMemo(() => {
    if (!showThinking || memoryOps) return null;
    type ThinkingRun = {
      start: number;
      taskEvents?: OfficialToolGroupTaskEvent[];
      thinking?: string[];
      tools: TranscriptToolUse[];
    };
    const runs: ThinkingRun[] = [];
    tools.forEach((tool, index) => {
      const thinking = tool.precedingThinking;
      const stripped = thinking ? { ...tool, precedingThinking: undefined } : tool;
      if (thinking?.length || runs.length === 0) {
        runs.push({ thinking, tools: [stripped], start: index });
      } else {
        runs[runs.length - 1]!.tools.push(stripped);
      }
    });
    if (runs.length <= 1 && !runs[0]?.thinking?.length) return null;
    // Redistribute group taskEvents into runs (official iv u loop).
    if (taskEvents?.length) {
      for (const event of taskEvents) {
        for (let runIndex = 0; runIndex < runs.length; runIndex += 1) {
          const run = runs[runIndex]!;
          const end = run.start + run.tools.length;
          if (event.at <= end || runIndex === runs.length - 1) {
            (run.taskEvents ??= []).push({
              at: event.at - run.start,
              event: event.event,
            });
            break;
          }
        }
      }
    }
    return runs;
  }, [memoryOps, showThinking, taskEvents, tools]);

  // Official: memory group + thinking → flatMap precedingThinking above the whole iv card.
  const memoryPrecedingThinking = useMemo(() => {
    if (!showThinking || !memoryOps) return undefined;
    const lines = tools.flatMap((tool) => tool.precedingThinking ?? []);
    return lines.length > 0 ? lines : undefined;
  }, [memoryOps, showThinking, tools]);

  const summary = memoryOps ? officialMemorySummaryPieces(memoryOps) : officialToolSummaryPieces(tools);
  const status = aggregateToolStatus(tools);
  const isRunning = status === "running";
  const isAwaitingApproval = status === "awaiting_approval";
  const runningTool = isRunning ? tools.find((tool) => tool.status === "running") : undefined;
  const debouncedRunningToolId = useDebouncedDisplayedKey(runningTool?.id ?? "settled", 650);
  const displayedRunningTool = debouncedRunningToolId !== "settled" ? tools.find((tool) => tool.id === debouncedRunningToolId) : undefined;
  const runningSummary = displayedRunningTool ? officialToolRowSummary(displayedRunningTool) : undefined;
  const isExpanded = isVerbose || expanded;
  // Official: Map<index, taskEvent[]> for chips before tool at index, plus trailing at tools.length.
  const taskEventsByIndex = useMemo(() => {
    if (!taskEvents?.length) return undefined;
    const map = new Map<number, OfficialToolGroupTaskEvent["event"][]>();
    for (const entry of taskEvents) {
      const at = Math.min(Math.max(entry.at, 0), tools.length);
      const list = map.get(at) ?? [];
      list.push(entry.event);
      map.set(at, list);
    }
    return map;
  }, [taskEvents, tools.length]);
  const toggle = () => {
    if (isVerbose) return;
    setExpanded((value) => !value);
  };

  // Official early return: thinking runs replace the single iv card.
  if (thinkingRuns) {
    return (
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="c11959232-h_zsw3wI.js:iv thinking runs">
        {thinkingRuns.map((run) => (
          <Fragment key={run.tools[0]?.id ?? `thinking-run-${run.start}`}>
            {run.thinking?.length ? <OfficialPrecedingThinkingLines lines={run.thinking} /> : null}
            <OfficialToolGroup
              taskEvents={run.taskEvents}
              tools={run.tools}
              transcriptMode={transcriptMode}
            />
          </Fragment>
        ))}
      </div>
    );
  }

  // Official: single tool, no memoryOps, no taskEvents → Zg standalone (not a group card).
  if (tools.length === 1 && !memoryOps && !(taskEvents?.length)) {
    return wrapStandaloneToolWithPrecedingThinking(tools[0]!, transcriptMode);
  }

  const groupCard = (
    <div className="flex flex-col w-full" data-official-source="c11959232-h_zsw3wI.js:iv group">
      <button
        aria-expanded={isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3"
        onClick={toggle}
        type="button"
      >
        {isRunning ? <span className="sr-only">running</span> : null}
        <OfficialAnimatedToolLabel className="inline-flex items-center gap-g3 min-w-0" mode="wait" morphKey={runningSummary ? debouncedRunningToolId : "settled"}>
          {runningSummary ? (
            <>
              <span className="text-body epitaxy-text-shine shrink-0">{runningSummary.runningVerb}</span>
              {runningSummary.meta ? <span className="text-body text-assistant-secondary truncate min-w-0">{runningSummary.meta}</span> : null}
            </>
          ) : (
            <>
              <span className="text-body truncate min-w-0">{summary.map(renderToolSummaryPiece)}</span>
              {isAwaitingApproval ? <span className="text-body text-extended-yellow shrink-0">Needs approval</span> : null}
            </>
          )}
        </OfficialAnimatedToolLabel>
        <ToolChevron expanded={isExpanded} />
      </button>
      <OfficialCollapse expanded={isExpanded}>
        <div className="flex flex-col gap-g3 bg-t1 rounded-r6 p-p7 mt-[var(--p6)]">
          {tools.map((tool, index) => (
            <Fragment key={tool.id}>
              {taskEventsByIndex?.get(index)?.map((event) => <CodeTaskEventChip item={event} key={event.id} />)}
              <OfficialToolRow inGroup tool={tool} transcriptMode={transcriptMode} />
            </Fragment>
          ))}
          {taskEventsByIndex?.get(tools.length)?.map((event) => <CodeTaskEventChip item={event} key={event.id} />)}
        </div>
      </OfficialCollapse>
    </div>
  );

  if (memoryPrecedingThinking?.length) {
    return (
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="c11959232-h_zsw3wI.js:iv memory precedingThinking">
        <OfficialPrecedingThinkingLines lines={memoryPrecedingThinking} />
        {groupCard}
      </div>
    );
  }
  return groupCard;
}

function OfficialToolRow({ inGroup = false, tool, transcriptMode = "normal" }: { inGroup?: boolean; tool: TranscriptToolUse; transcriptMode?: OfficialTranscriptMode }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => officialToolRowSummary(tool), [tool]);
  // Official Zg C: diffMeta for Write/Edit when !error.
  const diffMeta = useMemo(
    () => (summary.kind === "diff" ? buildOfficialToolDiffMeta(tool) : null),
    [summary.kind, tool],
  );
  // Official Zg: j = !(todos && empty); details always available unless empty todos.
  const hasDetails = hasToolDetails(tool, summary);
  const [expanded, setExpanded] = useState(false);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const isQuestionPrompt = summary.kind === "question" && typeof tool.output !== "string" && !tool.isError;
  const isExpanded = isVerbose || expanded || isQuestionPrompt;
  const isRunning = tool.status === "running";
  const isError = tool.status === "error" || Boolean(tool.isError);
  const isAwaitingApproval = tool.status === "awaiting_approval";
  const opensSubagent = (tool.name === "Task" || tool.name === "Agent") && Boolean(actions?.openSubagent);
  const metaHref = summary.metaHref && /^https:\/\//i.test(summary.metaHref) ? summary.metaHref : undefined;
  // Official P = !inGroup — output images sit outside collapse when standalone, inside when grouped.
  const showImagesOutsideCollapse = !inGroup;
  // Official M=useRef(v): flash +N-M when the row started as running.
  const flashDiffBadgeRef = useRef(isRunning);
  if (isRunning) flashDiffBadgeRef.current = true;
  const showDiffBadge = Boolean(diffMeta) && !isRunning && ((diffMeta?.counts.additions ?? 0) > 0 || (diffMeta?.counts.deletions ?? 0) > 0);
  const toggle = () => {
    if (opensSubagent && actions?.openSubagent) {
      actions.openSubagent({ description: stringValue(tool.input.description) ?? tool.name, toolUseId: tool.id });
      return;
    }
    if (isVerbose || !hasDetails || isQuestionPrompt) return;
    setExpanded((value) => !value);
  };
  const details = hasDetails ? (
    <OfficialCollapse expanded={isExpanded}>
      <OfficialToolDetails diffMeta={diffMeta} tool={tool} />
      {inGroup ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
    </OfficialCollapse>
  ) : null;
  return (
    <div className="flex flex-col w-full">
      <div
        aria-expanded={opensSubagent || !hasDetails ? undefined : isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-g2 text-left cursor-pointer outline-none hide-focus-ring focus:ring-focus rounded-r3"
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return;
          event.preventDefault();
          toggle();
        }}
        role="button"
        tabIndex={0}
      >
        <OfficialAnimatedToolLabel
          className={`shrink-0 ${isRunning ? "text-body epitaxy-text-shine" : isError ? "text-body text-extended-pink" : "text-body text-assistant-secondary"}`}
          morphKey={isRunning ? "running" : "settled"}
        >
          {isRunning ? summary.runningVerb : summary.verb}
        </OfficialAnimatedToolLabel>
        {tool.subagentActivity?.model ? <span className="text-body text-assistant-secondary shrink-0">{tool.subagentActivity.model}</span> : null}
        {tool.subagentActivity ? (
          <span className="text-body text-assistant-secondary truncate min-w-0">
            {tool.subagentActivity.model ? "· " : ""}{tool.subagentActivity.latestToolName ?? tool.name} · {tool.subagentActivity.toolCallCount ?? 0}
          </span>
        ) : isAwaitingApproval ? <span className="text-body text-extended-yellow shrink-0">Needs approval</span> : null}
        {!tool.subagentActivity && !isAwaitingApproval && summary.meta ? (
          metaHref ? (
            <a className="text-code text-assistant-primary truncate min-w-0" href={metaHref} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} rel="noreferrer" target="_blank">{summary.meta}</a>
          ) : (
            <span className={officialToolRowMetaClassName(summary)}>{summary.meta}</span>
          )
        ) : null}
        {isRunning ? <span className="sr-only">running</span> : null}
        {/* Official Vg+Xg: settled diff counts after meta */}
        {showDiffBadge && diffMeta ? (
          <OfficialToolDiffBadge
            adds={diffMeta.counts.additions}
            dels={diffMeta.counts.deletions}
            flashOnMount={flashDiffBadgeRef.current}
          />
        ) : null}
        {hasDetails ? <ToolChevron expanded={isExpanded} /> : null}
      </div>
      {details}
      {showImagesOutsideCollapse ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
    </div>
  );
}

function OfficialCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return (
    <AnimatePresence initial={false}>
      {expanded ? (
        <motion.div
          animate={{ height: "auto", opacity: 1 }}
          className="overflow-hidden"
          exit={{ height: 0, opacity: 0 }}
          initial={{ height: 0, opacity: 0 }}
          transition={{ height: { type: "spring", duration: 0.35, bounce: 0 }, opacity: { duration: 0.2, ease: "easeOut" } }}
        >
          {children}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function OfficialAnimatedToolLabel({ children, className, mode = "popLayout", morphKey }: { children: ReactNode; className: string; mode?: "popLayout" | "sync" | "wait"; morphKey: string }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <span className={className}>{children}</span>;
  return (
    <AnimatePresence initial={false} mode={mode}>
      <motion.span
        animate={{ opacity: 1, y: 0 }}
        className={className}
        exit={{ opacity: 0, y: -3 }}
        initial={{ opacity: 0, y: 3 }}
        key={morphKey}
        transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
      >
        {children}
      </motion.span>
    </AnimatePresence>
  );
}

function useDebouncedDisplayedKey(key: string, delayMs: number) {
  const [state, setState] = useState(() => ({ displayed: key, lastSwapAt: 0 }));

  useEffect(() => {
    if (key === state.displayed) return undefined;
    const now = typeof performance !== "undefined" ? performance.now() : Date.now();
    const elapsed = now - state.lastSwapAt;
    if (elapsed >= delayMs) {
      setState({ displayed: key, lastSwapAt: now });
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const swapTime = typeof performance !== "undefined" ? performance.now() : Date.now();
      setState({ displayed: key, lastSwapAt: swapTime });
    }, delayMs - elapsed);
    return () => window.clearTimeout(timer);
  }, [delayMs, key, state.displayed, state.lastSwapAt]);

  return state.displayed;
}

const toolStatusPriority: Record<TranscriptToolUse["status"], number> = {
  awaiting_approval: 3,
  running: 2,
  error: 1,
  completed: 0,
};

function aggregateToolStatus(tools: TranscriptToolUse[]): TranscriptToolUse["status"] {
  let status: TranscriptToolUse["status"] = "completed";
  for (const tool of tools) {
    if (toolStatusPriority[tool.status] > toolStatusPriority[status]) status = tool.status;
  }
  return status;
}

/** Official c11959232 `Qg` — tool-row expand chevron (size m + --class-base-icon 14px). */
function ToolChevron({ expanded }: { expanded: boolean }) {
  return (
    <span className="shrink-0 text-assistant-secondary" style={{ "--class-base-icon": "14px" } as CSSProperties}>
      <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="m" />
    </span>
  );
}

type OfficialToolRowKind = "bash" | "diff" | "file" | "plan" | "question" | "text" | "todos";

type OfficialToolRowSummary = {
  kind: OfficialToolRowKind;
  meta?: string;
  metaHref?: string;
  metaIsCode?: boolean;
  runningVerb: string;
  verb: string;
};

type OfficialBashAction =
  | { commitKind: "amended" | "cherry-picked" | "committed"; kind: "commit"; meta?: string }
  | { kind: "push"; meta?: string }
  | { action: "merged" | "rebased"; kind: "branch"; meta?: string }
  | { action: "closed" | "commented" | "created" | "edited" | "merged" | "ready"; kind: "pr"; meta?: string; url?: string };

function officialToolRowKind(name: string): OfficialToolRowKind {
  switch (name) {
    case "Bash":
    case "BashTool":
      return "bash";
    case "Read":
      return "file";
    case "Write":
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return "diff";
    case "TodoWrite":
    case "TaskCreate":
    case "TaskUpdate":
    case "TaskGet":
    case "TaskList":
    case "TaskStop":
      return "todos";
    case "ExitPlanMode":
      return "plan";
    case "AskUserQuestion":
      return "question";
    default:
      return "text";
  }
}

function officialToolRowSummary(tool: TranscriptToolUse): OfficialToolRowSummary {
  const input = tool.input;
  const inputString = (key: string) => stringValue(input[key]);
  const kind = officialToolRowKind(tool.name);
  switch (tool.name) {
    case "Bash":
    case "BashTool": {
      const command = inputString("command");
      const recognized = command && !tool.isError ? officialRecognizedBashAction(command, tool.output) : null;
      if (recognized) {
        const verbs = officialBashActionVerbs(recognized);
        return {
          ...verbs,
          kind,
          meta: recognized.meta ?? inputString("description") ?? command,
          metaHref: recognized.kind === "pr" ? recognized.url : undefined,
          metaIsCode: recognized.meta !== undefined,
        };
      }
      return { kind, meta: inputString("description") ?? command, runningVerb: "Running", verb: "Ran" };
    }
    case "Read":
      return { kind, meta: basename(inputString("file_path")), runningVerb: "Reading", verb: "Read" };
    case "Write":
      return { kind, meta: basename(inputString("file_path")), runningVerb: "Creating", verb: "Created" };
    case "Edit":
    case "MultiEdit":
    case "NotebookEdit":
      return { kind, meta: basename(inputString("file_path") ?? inputString("notebook_path")), runningVerb: "Editing", verb: "Edited" };
    case "Grep":
    case "Glob":
      return { kind, meta: inputString("pattern"), runningVerb: "Searching", verb: "Searched" };
    case "LS":
      return { kind, meta: inputString("path"), runningVerb: "Listing", verb: "Listed" };
    case "WebFetch":
      return { kind, meta: inputString("url"), runningVerb: "Fetching", verb: "Fetched" };
    case "WebSearch":
      return { kind, meta: inputString("query"), runningVerb: "Searching web", verb: "Searched web" };
    case "Task":
    case "Agent":
      return { kind, meta: inputString("description"), runningVerb: "Running agent", verb: "Ran agent" };
    case "Skill": {
      const skill = inputString("skill");
      return { kind, meta: skill ? `/${skill}` : undefined, metaIsCode: true, runningVerb: "Running skill", verb: "Ran skill" };
    }
    case "TaskCreate":
    case "TaskUpdate":
    case "TaskGet":
    case "TaskList":
    case "TaskStop":
      return { kind, runningVerb: "Updating todos", verb: "Updated todos" };
    case "TodoWrite":
      return { kind, runningVerb: "Updating todos", verb: Array.isArray(input.todos) && input.todos.length > 0 ? "Updated todos" : "Cleared todos" };
    case "EnterPlanMode":
      return { kind, runningVerb: "Entering plan mode", verb: "Entered plan mode" };
    case "ExitPlanMode":
      return { kind, runningVerb: "Proposing plan", verb: "Proposed plan" };
    case "AskUserQuestion": {
      const questions = Array.isArray(input.questions) ? input.questions : [];
      const firstQuestion = asRecord(questions[0]);
      return { kind, meta: stringValue(firstQuestion.header) ?? (questions.length > 1 ? `${questions.length} questions` : undefined), runningVerb: "Asking", verb: "Asked" };
    }
    case "SendUserMessage":
    case "SendUserFile":
      return { kind, runningVerb: "Sending", verb: "Sent" };
    default: {
      const label = tool.name.startsWith("mcp__") ? tool.name.split("__").at(-1)?.replace(/_/g, " ") ?? tool.name : tool.name;
      return { kind, runningVerb: `Using ${label}`, verb: `Used ${label}` };
    }
  }
}

function officialToolRowMetaClassName(summary: OfficialToolRowSummary) {
  return summary.kind === "diff" || summary.kind === "file" || summary.metaIsCode
    ? "text-code text-assistant-primary truncate min-w-0"
    : "text-body text-assistant-secondary truncate min-w-0";
}

const officialGitCommitRe = officialGitCommandRe("commit");
const officialGitPushRe = officialGitCommandRe("push");
const officialGitCherryPickRe = officialGitCommandRe("cherry-pick");
const officialGitMergeRe = officialGitCommandRe("merge", "(?!-)");
const officialGitRebaseRe = officialGitCommandRe("rebase");
const officialGithubPrActions = [
  { action: "created", re: /\bgh\s+pr\s+create\b/ },
  { action: "edited", re: /\bgh\s+pr\s+edit\b/ },
  { action: "merged", re: /\bgh\s+pr\s+merge\b/ },
  { action: "commented", re: /\bgh\s+pr\s+comment\b/ },
  { action: "closed", re: /\bgh\s+pr\s+close\b/ },
  { action: "ready", re: /\bgh\s+pr\s+ready\b/ },
] as const;

function officialGitCommandRe(command: string, suffix = "") {
  return new RegExp(`\\bgit(?:\\s+-[cC]\\s+\\S+|\\s+--\\S+=\\S+)*\\s+${command}\\b${suffix}`);
}

function officialGitArgument(command: string, subcommand: string) {
  const rest = command.split(officialGitCommandRe(subcommand))[1];
  if (!rest) return undefined;
  for (const token of rest.trim().split(/\s+/)) {
    if (/^[&|;><]/.test(token)) break;
    if (!token.startsWith("-")) return token;
  }
  return undefined;
}

function officialRecognizedBashAction(command: string, output?: string): OfficialBashAction | null {
  const text = output ?? "";
  const prAction = officialGithubPrActions.find((item) => item.re.test(command))?.action;
  if (prAction) {
    const urlMatch = text.match(/https:\/\/github\.com\/[^/\s]+\/[^/\s]+\/pull\/(\d+)/);
    if (urlMatch?.[1]) return { action: prAction, kind: "pr", meta: `#${Number.parseInt(urlMatch[1], 10)}`, url: urlMatch[0] };
    const numberMatch = text.match(/[Pp]ull request (?:\S+#)?#?(\d+)/);
    return { action: prAction, kind: "pr", meta: numberMatch?.[1] ? `#${Number.parseInt(numberMatch[1], 10)}` : undefined };
  }
  const isCherryPick = officialGitCherryPickRe.test(command);
  if (officialGitCommitRe.test(command) || isCherryPick) {
    const commitMatch = text.match(/\[[\w./-]+(?: \(root-commit\))? ([0-9a-f]+)\]/);
    return { commitKind: isCherryPick ? "cherry-picked" : /--amend\b/.test(command) ? "amended" : "committed", kind: "commit", meta: commitMatch?.[1]?.slice(0, 7) };
  }
  if (officialGitPushRe.test(command)) {
    const refMatch = text.match(/^\s*[+\-*!= ]?\s*(?:\[new branch\]|\S+\.\.+\S+)\s+\S+\s*->\s*(\S+)/m);
    return { kind: "push", meta: refMatch?.[1] };
  }
  if (officialGitMergeRe.test(command)) {
    const branch = officialGitArgument(command, "merge");
    if (branch) return { action: "merged", kind: "branch", meta: output === undefined || /(Fast-forward|Merge made by)/.test(text) ? branch : undefined };
  }
  if (officialGitRebaseRe.test(command)) {
    const branch = officialGitArgument(command, "rebase");
    if (branch) return { action: "rebased", kind: "branch", meta: output === undefined || /Successfully rebased/.test(text) ? branch : undefined };
  }
  return null;
}

function officialBashActionVerbs(action: OfficialBashAction) {
  if (action.kind === "commit") {
    if (action.commitKind === "amended") return { runningVerb: "Amending commit", verb: "Amended commit" };
    if (action.commitKind === "cherry-picked") return { runningVerb: "Cherry-picking", verb: "Cherry-picked" };
    return { runningVerb: "Committing", verb: "Committed" };
  }
  if (action.kind === "push") return { runningVerb: "Pushing", verb: "Pushed" };
  if (action.kind === "branch") return action.action === "merged" ? { runningVerb: "Merging", verb: "Merged" } : { runningVerb: "Rebasing onto", verb: "Rebased onto" };
  switch (action.action) {
    case "created": return { runningVerb: "Creating PR", verb: "Created PR" };
    case "edited": return { runningVerb: "Editing PR", verb: "Edited PR" };
    case "merged": return { runningVerb: "Merging PR", verb: "Merged PR" };
    case "commented": return { runningVerb: "Commenting on PR", verb: "Commented on PR" };
    case "closed": return { runningVerb: "Closing PR", verb: "Closed PR" };
    case "ready": return { runningVerb: "Marking PR ready", verb: "Marked PR ready" };
  }
}

type ToolSummaryPiece = {
  isError?: boolean;
  meta?: string;
  verb: string;
};

function officialToolSummaryPieces(tools: TranscriptToolUse[]): ToolSummaryPiece[] {
  const order: string[] = [];
  const counts = new Map<string, number>();
  const errors = new Map<string, boolean>();
  let otherCount = 0;
  let otherError = false;
  for (const tool of tools) {
    const kind = officialToolKind(tool.name);
    if (!kind) {
      otherCount += 1;
      otherError ||= Boolean(tool.isError);
      continue;
    }
    if (!counts.has(kind)) order.push(kind);
    counts.set(kind, (counts.get(kind) ?? 0) + 1);
    errors.set(kind, errors.get(kind) || Boolean(tool.isError));
  }
  const pieces = order.flatMap((kind) => officialToolKindSummary(kind, counts.get(kind) ?? 0, errors.get(kind)));
  if (otherCount > 0) pieces.push({ isError: otherError, meta: plural(otherCount, "tool", "tools"), verb: "used" });
  return pieces.length ? pieces : [{ meta: plural(tools.length, "tool", "tools"), verb: "used" }];
}

function renderToolSummaryPiece(piece: ToolSummaryPiece, index: number) {
  const verb = index === 0 ? capitalize(piece.verb) : piece.verb;
  return (
    <span key={`${piece.verb}-${piece.meta ?? index}`}>
      {index > 0 ? <span className="text-assistant-secondary">, </span> : null}
      <span className={piece.isError ? "text-extended-pink" : "text-assistant-secondary"}>{verb}</span>
      {piece.meta ? <span className="text-assistant-secondary"> {piece.meta}</span> : null}
    </span>
  );
}

/**
 * Official index-BELzQL5P `rhe` tool-group settled labels (all tools, not just Read):
 *   read:  Read a file / Read {n} files
 *   write: Created a file / Created {n} files
 *   edit:  Edited a file / Edited {n} files
 *   bash:  Ran a command / Ran {n} commands
 *   grep:  Searched code / Searched {n} patterns
 *   glob:  Found files / Searched {n} patterns
 *   web:   Searched the web
 *   task:  Ran an agent / Ran {n} agents
 * Verb is lowercase; renderToolSummaryPiece capitalizes the first piece.
 */
function officialToolKindSummary(kind: string, count: number, isError?: boolean): ToolSummaryPiece[] {
  switch (kind) {
    case "bash":
      return [{ isError, meta: officialCountNoun(count, "command", "commands", "a"), verb: "ran" }];
    case "read":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "read" }];
    case "view":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "viewed" }];
    case "write":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "created" }];
    case "edit":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "edited" }];
    case "notebook_edit":
      return [{ isError, meta: officialCountNoun(count, "notebook", "notebooks", "a"), verb: "edited" }];
    case "delete_file":
      return [{ isError, meta: officialCountNoun(count, "file", "files", "a"), verb: "deleted" }];
    case "grep":
      // Official: 1 → "Searched code"; n → "Searched {n} patterns"
      return count === 1
        ? [{ isError, meta: "code", verb: "searched" }]
        : [{ isError, meta: `${count} patterns`, verb: "searched" }];
    case "glob":
      // Official: 1 → "Found files"; n → "Searched {n} patterns"
      return count === 1
        ? [{ isError, meta: "files", verb: "found" }]
        : [{ isError, meta: `${count} patterns`, verb: "searched" }];
    case "web":
      return [{ isError, meta: "the web", verb: "searched" }];
    case "task":
      return [{ isError, meta: officialCountNoun(count, "agent", "agents", "an"), verb: "ran" }];
    case "todo":
      return [{ isError, meta: "todos", verb: "updated" }];
    case "skill":
      return [{ isError, meta: officialCountNoun(count, "skill", "skills", "a"), verb: "ran" }];
    case "exit_plan_mode":
      return [{ isError, meta: "a plan", verb: "proposed" }];
    default:
      return [];
  }
}

function officialToolKind(name: string) {
  if (name === "Bash" || name === "BashTool") return "bash";
  if (name === "Read") return "read";
  if (name === "View") return "view";
  if (name === "Write") return "write";
  if (name === "Edit" || name === "MultiEdit") return "edit";
  if (name === "NotebookEdit") return "notebook_edit";
  if (name === "Delete" || name === "DeleteFile") return "delete_file";
  if (name === "Grep") return "grep";
  if (name === "Glob" || name === "LS") return "glob";
  if (name === "WebFetch" || name === "WebSearch") return "web";
  if (name === "Task" || name === "Agent") return "task";
  if (name === "Skill") return "skill";
  if (
    name === "TodoWrite"
    || name === "TaskCreate"
    || name === "TaskUpdate"
    || name === "TaskGet"
    || name === "TaskList"
    || name === "TaskStop"
  ) return "todo";
  if (name === "ExitPlanMode") return "exit_plan_mode";
  // MCP tools still get per-row running/settled verbs; group falls through to "used N tools".
  return undefined;
}

function hasToolDetails(tool: TranscriptToolUse, summary: OfficialToolRowSummary) {
  return !(summary.kind === "todos" && officialTodoItems(tool.input).length === 0);
}

function officialTodoItems(input: Record<string, unknown>) {
  const todos = Array.isArray(input.todos) ? input.todos : [];
  return todos.flatMap((todo) => {
    const record = asRecord(todo);
    const id = stringValue(record.id);
    const content = stringValue(record.content);
    if (!id || !content) return [];
    const rawStatus = stringValue(record.status);
    const status: "completed" | "in_progress" | "pending" =
      rawStatus === "completed" || rawStatus === "in_progress" ? rawStatus : "pending";
    return [{ content, id, status }];
  });
}

function OfficialToolDetails({ diffMeta, tool }: { diffMeta?: OfficialToolDiffMeta | null; tool: TranscriptToolUse }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summaryKind = officialToolRowKind(tool.name);
  // Official sx order: todos → plan → question → bash → diff+meta → file → error/generic.
  if (summaryKind === "todos") {
    const todos = officialTodoItems(tool.input);
    return todos.length > 0 ? <OfficialTodosToolDetails todos={todos} /> : null;
  }
  if (summaryKind === "plan") return <OfficialPlanToolDetails tool={tool} />;
  if (summaryKind === "question" && typeof tool.output !== "string" && !tool.isError) {
    return <OfficialQuestionToolDetails tool={tool} />;
  }
  if (tool.name === "Bash" || tool.name === "BashTool") return <OfficialBashToolDetails tool={tool} />;
  if (tool.name === "Read" && tool.output && !tool.isError) return <OfficialReadFileToolDetails tool={tool} />;
  // Official sx diff branch: `"diff"===s.kind&&n` → pierre File / FileDiff body.
  if (diffMeta) {
    const copyText = diffMeta.pureSide === "deletions" ? diffMeta.oldFile.contents : diffMeta.newFile.contents;
    return (
      <OfficialToolDiffDetails
        copySlot={<ToolDetailsCopyButton text={copyText} />}
        diffMeta={diffMeta}
        onOpenPath={(path) => actions?.openFile({ path })}
      />
    );
  }
  return <OfficialGenericToolDetails tool={tool} />;
}

/** Official px: checklist body for TodoWrite / Task* tools. */
function OfficialTodosToolDetails({ todos }: { todos: Array<{ content: string; id: string; status: "completed" | "in_progress" | "pending" }> }) {
  return (
    <ul className="flex flex-col gap-[var(--p5)] text-body py-p3">
      {todos.map((todo) => (
        <li
          className={`flex items-start gap-g3 ${todo.status === "completed" ? "line-through decoration-1 text-assistant-secondary" : "text-assistant-primary"}`}
          key={todo.id}
        >
          <OfficialTodoStatusIcon status={todo.status} />
          <span>{todo.content}</span>
        </li>
      ))}
    </ul>
  );
}

function OfficialTodoStatusIcon({ status }: { status: "completed" | "in_progress" | "pending" }) {
  // Official ux + dx: 14px status slot.
  const className = "flex size-[14px] shrink-0 items-center justify-center text-assistant-primary";
  if (status === "completed") {
    return (
      <span className={className}>
        <Icon name="CheckSelection" size="sm" />
        <span className="sr-only">done</span>
      </span>
    );
  }
  if (status === "in_progress") {
    return (
      <span className={className}>
        <Icon name="StatusInProgressQuarterCircle" size="sm" />
        <span className="sr-only">in progress</span>
      </span>
    );
  }
  // Official pending: empty 12px circle border, not an icon glyph.
  return (
    <span className={className}>
      <span aria-hidden className="block w-[12px] h-[12px] rounded-full border border-[var(--t5)]" />
      <span className="sr-only">not done</span>
    </span>
  );
}

/** Official mx: ExitPlanMode plan body (pending border / approved check). */
function OfficialPlanToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const plan = typeof tool.input.plan === "string" ? tool.input.plan : "";
  if (tool.status === "running" || tool.status === "awaiting_approval") {
    return plan ? (
      <div className="text-body text-assistant-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)] py-p3">
        {plan}
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-g3 py-p3">
      {tool.isError ? null : (
        <div className="flex items-center gap-g3 text-body text-extended-green">
          <Icon name="CircleCheck" size="sm" />
          <span>Plan approved</span>
        </div>
      )}
      {plan ? (
        <div className="text-body text-assistant-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)]">
          {plan}
        </div>
      ) : null}
    </div>
  );
}

/** Official hx: AskUserQuestion pending prompt body — question texts only. */
function OfficialQuestionToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const questions = useMemo(() => {
    const raw = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    return raw
      .map((item) => {
        const record = asRecord(item);
        return typeof record.question === "string" ? record.question : "";
      })
      .filter(Boolean);
  }, [tool.input.questions]);
  if (questions.length === 0) return null;
  return (
    <div className="flex flex-col gap-g3 pt-p3">
      {questions.map((question, index) => (
        <div className="text-body text-assistant-secondary [overflow-wrap:anywhere]" key={`${index}-${question.slice(0, 24)}`}>
          {question}
        </div>
      ))}
    </div>
  );
}

function OfficialBashToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const command = stringValue(tool.input.command);
  const copyText = [command ? `$ ${command}` : "", tool.output ?? ""].filter(Boolean).join("\n\n");
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 flex flex-col">
        <div className="flex items-center px-p6 py-p5">
          <span className="flex-1 text-body text-assistant-secondary">Bash</span>
          <ToolDetailsCopyButton text={copyText} />
        </div>
        <div className="flex flex-col gap-g8 px-p6 pb-p8 text-code">
          {command ? <div className="whitespace-pre-wrap">$ {command}</div> : null}
          {tool.output ? <div className={`whitespace-pre-wrap break-all ${tool.isError ? "text-extended-pink" : "text-assistant-secondary"}`}>{tool.output}</div> : null}
        </div>
      </div>
    </div>
  );
}

function OfficialReadFileToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const path = stringValue(tool.input.file_path) ?? "file";
  // Official sx: contents = wx(bx(output)); path header + copy live inside OfficialToolReadFileDetails.
  const contents = normalizeReadFileOutput(tool.output ?? "");
  return (
    <OfficialToolReadFileDetails
      contents={contents}
      // Official xx via shared ToolDetailsCopyButton (not unicode glyph).
      copySlot={<ToolDetailsCopyButton text={contents} />}
      onOpenPath={(nextPath) => actions?.openFile({ path: nextPath })}
      path={path}
    />
  );
}

/** Official c11959232 sx generic branch: only render when ox(tool) is non-empty; error output is pink. */
function OfficialGenericToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const inputKeys = Object.keys(tool.input);
  const copyText = toolCopyText(tool);
  // Official: if (t.isError && t.output) error body; else if (ox(t)) generic; else null.
  if (tool.isError && tool.output) {
    return (
      <div className="group/body relative flex flex-col w-full pt-p3">
        <div className="flex w-full">
          <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body whitespace-pre-wrap break-words">
            {inputKeys.length > 0 ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
            <div className="text-extended-pink">{tool.output}</div>
          </div>
          <ToolDetailsCopyButton text={copyText} />
        </div>
      </div>
    );
  }
  if (!copyText) return null;
  return (
    <div className="group/body relative flex flex-col w-full pt-p3">
      <div className="flex w-full">
        <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body text-assistant-secondary whitespace-pre-wrap break-words">
          {inputKeys.length > 0 ? <div className="text-assistant-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
          {tool.output ? <div>{tool.output}</div> : null}
        </div>
        <ToolDetailsCopyButton text={copyText} />
      </div>
    </div>
  );
}

/** Official gx — tool output images; placement depends on inGroup (Zg P=!inGroup). */
function OfficialToolOutputImages({ images }: { images?: TranscriptToolUse["outputImages"] }) {
  if (!images?.length) return null;
  return (
    <div className="flex flex-wrap gap-g3 pt-p3">
      {images.map((image, index) => {
        const src = image.url ?? (image.data ? `data:${image.mimeType ?? image.media_type ?? "image/png"};base64,${image.data}` : undefined);
        if (!src) return null;
        return <img alt="" className="max-h-[240px] max-w-[320px] rounded-lg" key={`${src}-${index}`} src={src} />;
      })}
    </div>
  );
}

function OfficialTextToolDetails({ label, text }: { label: string; text: string }) {
  return (
    <div className="group/body py-p6">
      <div className="bg-t1 rounded-r6 flex flex-col overflow-hidden">
        <div className="px-p6 pt-p5 pb-p3 text-body text-assistant-secondary">{label}</div>
        <pre className="m-0 px-p6 pb-p5 text-code text-t8 whitespace-pre-wrap break-words">{text}</pre>
      </div>
    </div>
  );
}

function ToolPathButton({ path }: { path: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const open = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    actions?.openFile({ path });
  };
  return (
    <button className="flex flex-1 min-w-0 text-left text-body text-assistant-secondary outline-none hide-focus-ring ring-focus hover:underline underline-offset-[3px] bg-transparent border-0 p-0 m-0 cursor-default" onClick={open} type="button">
      <span className="truncate">{basename(path) ?? path}</span>
    </button>
  );
}

// Official c11959232 `_Component28`: only file_path / notebook_path use fileRef → open side file pane.
// Generic keys like Glob/LS `path` stay plain text (often directories).
const OFFICIAL_FILE_OPEN_INPUT_KEYS = new Set(["file_path", "notebook_path"]);

function ToolInputLine({ input, inputKey }: { input: Record<string, unknown>; inputKey: string }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const raw = input[inputKey];
  const value = inputValueText(raw);
  const isOpenableFilePath = OFFICIAL_FILE_OPEN_INPUT_KEYS.has(inputKey) && typeof raw === "string";
  return (
    <div>
      {inputKey}:{" "}
      {isOpenableFilePath ? (
        <button
          className="rounded-[4px] outline-none hide-focus-ring ring-focus bg-transparent border-0 p-0 m-0 text-left cursor-default"
          onClick={(event) => {
            event.stopPropagation();
            actions?.openFile({ path: value });
          }}
          type="button"
        >
          <code className="epitaxy-code-chip">{value}</code>
        </button>
      ) : value}
    </div>
  );
}

function inputValueText(value: unknown) {
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function toolCopyText(tool: TranscriptToolUse) {
  const inputText = Object.keys(tool.input).map((key) => `${key}: ${inputValueText(tool.input[key])}`).join("\n");
  return tool.output ? [inputText, tool.output].filter(Boolean).join("\n\n") : inputText;
}

function normalizeReadFileOutput(output: string) {
  const stripped = output.replace(/\n<system-reminder>[\s\S]*$/, "").replace(/\n+$/, "");
  const lines = stripped.split("\n");
  const numberedLine = /^ *\d+(?:[:|→] ?|\t)/;
  return lines.every((line) => !line || numberedLine.test(line))
    ? lines.map((line) => line.replace(numberedLine, "")).join("\n")
    : stripped;
}

function ToolDetailsCopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  if (!text) return null;
  return (
    <div className="opacity-0 group-hover/body:opacity-100 focus-within:opacity-100 [transition:opacity_150ms_cubic-bezier(0.215,0.61,0.355,1)] motion-reduce:transition-none">
      <OfficialButton ariaLabel={copied ? "Copied" : "Copy"} icon={copied ? "CheckSelection" : "CopySquareBehind"} onClick={copy} size="small" variant="uncontained" />
    </div>
  );
}

/** Official ICU one/other for tool-group counts: one → "a file", other → "3 files". */
function officialCountNoun(count: number, singular: string, pluralValue: string, oneArticle: "a" | "an") {
  if (count === 1) return `${oneArticle} ${singular}`;
  return `${count} ${pluralValue}`;
}

function plural(count: number, singular: string, pluralValue: string, oneArticle?: string) {
  if (count === 1) return oneArticle ? `${oneArticle} ${singular}` : `1 ${singular}`;
  return `${count} ${pluralValue}`;
}

function capitalize(value: string) {
  return value ? value.charAt(0).toUpperCase() + value.slice(1) : value;
}

/** Official ib bash card (c11959232): command snippet + output panel. */
function UserBashBlock({ item }: { item: Extract<TranscriptEntryItem, { kind: "bash" }> }) {
  const command = item.command;
  return (
    <div className="relative max-w-full w-full select-text" data-official-source="c11959232-h_zsw3wI.js:ib">
      {command ? <OfficialUserBashCommand command={command} /> : null}
      <div
        className={`${command ? "mt-[var(--p4)]" : ""} rounded-r6 bg-t1 overflow-clip font-mono text-code max-h-[160px] overflow-y-auto px-[var(--p6)] py-[var(--p4)]`}
      >
        <pre className="m-0 text-assistant-secondary whitespace-pre-wrap break-all">
          {item.error ? (
            <span className="text-destructive-default">{item.error}</span>
          ) : item.output !== undefined ? (
            item.output || "(no output)"
          ) : (
            <span className="text-assistant-secondary">Running…</span>
          )}
        </pre>
      </div>
    </div>
  );
}

function normalizeToolUse(tool: unknown, index = 0): TranscriptToolUse {
  const record = asRecord(tool);
  const toolUseResult = asRecord(record.toolUseResult ?? record.tool_use_result);
  const isError = record.isError === true || record.is_error === true || toolUseResult.isError === true || toolUseResult.is_error === true;
  const output = stringValue(record.output) ?? stringValue(record.content) ?? stringValue(toolUseResult.output) ?? stringValue(toolUseResult.content);
  const subagentActivity = normalizeSubagentActivity(record.subagentActivity ?? record.subagent_activity);
  return {
    id: stringValue(record.id) ?? `tool-${index}`,
    input: asRecord(record.input),
    isError,
    name: stringValue(record.name) ?? stringValue(record.tool_name) ?? stringValue(record.kind) ?? "Tool",
    output,
    status: normalizeToolStatus(record.status, isError, output),
    ...(subagentActivity ? { subagentActivity } : {}),
  };
}

function normalizeSubagentActivity(value: unknown): TranscriptToolUse["subagentActivity"] | undefined {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return undefined;
  return {
    latestToolName: stringValue(raw.latestToolName) ?? stringValue(raw.latest_tool_name),
    model: stringValue(raw.model),
    toolCallCount: typeof raw.toolCallCount === "number" ? raw.toolCallCount : typeof raw.tool_call_count === "number" ? raw.tool_call_count : undefined,
  };
}

function normalizeToolStatus(status: unknown, isError?: boolean, output?: string) {
  if (status === "awaiting_approval") return "awaiting_approval";
  if (status === "running") return "running";
  if (status === "error" || isError) return "error";
  if (status === "completed" || output) return "completed";
  return "running";
}

function isVisibleAssistantEntryItem(
  item: TranscriptEntryItem,
): item is Exclude<TranscriptEntryItem, { kind: "file" | "image" | "peer" | "uploaded-file" }> {
  // Official Kb only switches assistant kinds; user-only Ike kinds never render here.
  return item.kind !== "uploaded-file"
    && item.kind !== "file"
    && item.kind !== "image"
    && item.kind !== "peer";
}

function ThinkingActivity() {
  return (
    <div className="flex items-center gap-4 text-t7 select-none" data-testid="epitaxy-thinking-activity">
      <div className="w-5 h-5 shrink-0">
        <OfficialThinkingSpark className="!w-5 !h-5" size={20} />
      </div>
      <span className="text-sm text-t6">Thinking...</span>
    </div>
  );
}

function OfficialThinkingSpark({ className, size = 20 }: { className?: string; size?: number }) {
  const animation = useOfficialThinkingSparkAnimation();
  const animationRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    const node = animationRef.current;
    if (!animation || !node || typeof node.animate !== "function") return undefined;
    const frames = Array.from({ length: animation.frameCount }, (_frame, index) => ({
      transform: `translateY(-${index * (100 / animation.frameCount)}%)`,
    }));
    const player = node.animate(frames, {
      duration: animation.speed * animation.frameCount,
      easing: `steps(${animation.frameCount}, jump-none)`,
      fill: "forwards",
      iterations: Infinity,
    });
    return () => player.cancel();
  }, [animation]);

  if (!animation) {
    return <Icon className={className} customSize={size} name="ExtendedThinking" style={{ color: "var(--cds-clay, #d97757)" }} />;
  }

  return (
    <span
      aria-hidden="true"
      className={`inline-block overflow-hidden select-none [@media(max-resolution:1.99dppx)]:[clip-path:inset(1px_0)] ${className ?? ""}`}
      data-cds="Spark"
      style={{ aspectRatio: animation.width / animation.height, color: "var(--cds-clay, #d97757)", width: size }}
    >
      <span
        className="block [&>svg]:block [&>svg]:w-full [&>svg]:fill-current"
        dangerouslySetInnerHTML={{ __html: animation.svg }}
        ref={animationRef}
      />
    </span>
  );
}

function useOfficialThinkingSparkAnimation() {
  const [animation, setAnimation] = useState<OfficialSparkAnimation | null>(officialThinkingSparkAnimationCache);

  useEffect(() => {
    let alive = true;
    loadOfficialThinkingSparkAnimation()
      .then((next) => {
        if (alive && next) setAnimation(next);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  return animation;
}

export function loadOfficialThinkingSparkAnimation() {
  if (officialThinkingSparkAnimationCache) return Promise.resolve(officialThinkingSparkAnimationCache);
  if (!officialThinkingSparkAnimationPromise) {
    officialThinkingSparkAnimationPromise = fetch(officialSparkBundlePath)
      .then((response) => response.ok ? response.text() : "")
      .then((source) => {
        const next = source ? parseOfficialThinkingSparkAnimation(source) : null;
        officialThinkingSparkAnimationCache = next;
        officialThinkingSparkAnimationPromise = null;
        return next;
      })
      .catch(() => {
        officialThinkingSparkAnimationPromise = null;
        return null;
      });
  }
  return officialThinkingSparkAnimationPromise;
}

function parseOfficialThinkingSparkAnimation(source: string): OfficialSparkAnimation | null {
  const match = source.match(/thinking:\{svg:'([\s\S]*?)',width:(\d+),height:(\d+),frameCount:(\d+),speed:(\d+)\}/);
  if (!match) return null;
  return {
    svg: decodeBundledString(match[1]),
    width: Number(match[2]),
    height: Number(match[3]),
    frameCount: Number(match[4]),
    speed: Number(match[5]),
  };
}

function decodeBundledString(value: string) {
  return value
    .replace(/\\'/g, "'")
    .replace(/\\"/g, "\"")
    .replace(/\\n/g, "\n")
    .replace(/\\\\/g, "\\");
}
