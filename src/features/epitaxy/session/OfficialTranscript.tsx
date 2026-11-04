/**
 * Official transcript render (Gb/R, Hb/Kb, tool rows, thinking spark) — c11959232.
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import {
  Fragment,
  cloneElement,
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
  useSyncExternalStore,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type MutableRefObject,
  type ReactElement,
  type ReactNode,
  type Ref,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "motion/react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  ContextMenu,
} from "../../../shell/BaseMenu";
import { sessionHomePath, sessionPath } from "../../../shell/sessionPaths";
import {
  canResetRateLimitsFromBootstrap,
  fetchBootstrapPayload,
  organizationUuidFromBootstrap,
  postOrganizationResetRateLimits,
} from "../../settings/accountSettingsApi";
import { useErrorsOptional } from "../../settings/errorsToast";
import { applyCoworkRateLimitToStore } from "../../cowork/session/rateLimit/coworkRateLimitStore";
import { isOfficialMermaidMarkdownLanguage, OfficialMermaidDiagramCard } from "../OfficialMermaidDiagramCard";
import { OfficialSearchTree, officialSearchTreeLanguage } from "../OfficialSearchTree";
import {
  officialChapterDomId,
  officialEpitaxyChaptersStore,
  useOfficialChapterHidden,
  useOfficialChapterRenamedTitle,
  useOfficialSessionUserChapters,
  type OfficialCodeUserChapter,
} from "./officialEpitaxyChaptersStore";
import {
  OfficialAssistantMessage,
  OfficialButton,
  OfficialMessageActions,
  officialUserBubbleProseClass,
  officialUserBubbleTextClass,
  officialUserMessageClass,
  type OfficialTranscriptMode,
} from "../OfficialEpitaxyComponents";
import { copyOfficialMessagePlain } from "./officialMessageClipboard";
import {
  officialEpitaxyEditorPrefsStore,
  type EditorSize,
} from "../diff/officialEpitaxyEditorPrefs";
import {
  officialTranscriptModeExpandsDetails,
  officialTranscriptModeShowsThinking,
} from "./officialTranscriptMode";
import { estimateOfficialTranscriptRowSize } from "./officialTranscriptRowEstimate";
import {
  OFFICIAL_WINDOW_ROW_STYLE,
  OFFICIAL_WINDOW_SCROLLER_CLASS,
  OFFICIAL_WINDOW_SIZER_CLASS,
  useOfficialTranscriptFu,
} from "./officialTranscriptFu";
import { OfficialOlderStatusChrome } from "./OfficialOlderStatusChrome";
import { useOfficialCodeSessionHasOlder } from "./officialCodeSessionStore";
import { useOfficialTranscriptScrollState } from "./officialTranscriptScrollState";
import {
  OFFICIAL_PERF_REGION_TRANSCRIPT,
  officialTranscriptRowPerf,
} from "./officialTranscriptPerf";
import { MESSAGE_ACTION_MESSAGES, SESSION_LOAD_MESSAGES, TOOL_GROUP_SUMMARY_MESSAGES, TRANSCRIPT_FEED_MESSAGES, TRANSCRIPT_SURFACE_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";
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
  OfficialSpinner,
  OfficialWorkingStatus,
} from "./OfficialWorkingStatus";
import {
  EpitaxyTranscriptActionContext,
} from "./epitaxyTranscriptActionContext";
import {
  type OfficialBackgroundTask as OfficialBackgroundTaskImported,
} from "./officialTasksAndPlan";
import { OfficialArtifactSurfaceCard } from "./OfficialArtifactSurfaceCard";
import {
  extractOfficialArtifactSurface,
  isOfficialArtifactSurfaceInput,
  isOfficialArtifactTool,
  officialArtifactFilePath,
  officialArtifactPublishedVerb,
} from "./officialArtifactSurface";
import { OfficialKbNoticeCard } from "./OfficialKbNoticeCards";
import { isOfficialKbNoticeItem } from "./officialKbNoticeKinds";
import { OfficialSendUserFileCard } from "./OfficialSendUserFileCard";
import { isOfficialSendUserFileTool, parseOfficialSendUserFileCard } from "./officialSendUserFile";
import { OfficialSendUserMessageWords } from "./OfficialSendUserMessageWords";
import { isOfficialSendUserMessageAsWords } from "./officialSendUserMessage";
import { OfficialAskUserTranscriptCard } from "./OfficialAskUserTranscriptCard";
import { officialAskUserTranscriptPairs } from "./officialAskUserQuestionModel";
import { OfficialWorkflowSurfaceCard } from "./OfficialWorkflowSurfaceCard";
import { officialWorkflowT1 } from "./officialWorkflowSurface";
import { OfficialIbeStandaloneCard } from "./OfficialIbeStandaloneCard";
import { officialIbeStandaloneKind } from "./officialIbeStandalone";
import { officialEvEmptyBody, officialEvShowsLine } from "./officialEvEmptyBody";
import {
  officialToolGroupDefaultExpanded,
  useOfficialToolGroupExpanded,
} from "./officialToolGroupExpandedStore";
import {
  formatOfficialCompactTokens,
  formatOfficialHookNoticeMessage,
  type OfficialHookNotice,
  type OfficialToolGroupTaskEvent,
  type TranscriptEntry,
  type TranscriptEntryItem,
  type TranscriptToolUse,
} from "./officialTranscriptParse";
import {
  officialTaskEventChipDetail,
  officialTaskEventChipVerb,
  officialTaskEventRunParts,
  officialTaskEventRunsByFirstId,
  type OfficialTaskEventItem,
} from "./officialTaskEventRun";
import { officialGetTurnStartedAt } from "./officialStreamSessionStore";
import {
  OfficialTurnLiveProvider,
  officialNmMark,
  officialQj,
  useOfficialTurnLive,
  useOfficialZjFace,
} from "./officialTurnLiveStore";
import { OfficialTurnStatusStep } from "./OfficialTurnStatusStep";
import {
  OFFICIAL_HANG_BUSY_BODY_MIN_MS,
  officialHangBusyLine,
  officialHangFaceKey,
  useOfficialHangFace,
} from "./officialHangFace";
import { SessionError, SessionNotFound, basename } from "./useEpitaxySessionData";
import { classifyOfficialMemoryOp, isOfficialMemoryTool } from "./officialMemoryPath";
import { officialRendersBareRow } from "./officialToolRunBareRow";
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

export type { OfficialTranscriptScrollState } from "./officialTranscriptScrollState";

/** Residual Gb scrollToBottom body (no 450ms hard-snap invent). */
export function scrollElementToBottom(node: HTMLElement, behavior?: OfficialTranscriptScrollBehavior) {
  node.scrollTo({
    top: Math.max(0, node.scrollHeight - node.clientHeight),
    behavior: (behavior ?? "instant") as ScrollBehavior,
  });
}

let officialThinkingSparkAnimationCache: OfficialSparkAnimation | null = null;
let officialThinkingSparkAnimationPromise: Promise<OfficialSparkAnimation | null> | null = null;
type OfficialBackgroundTask = OfficialBackgroundTaskImported;


export function renderTranscriptBody({ entries, error, initialSessionId, isLoading, isResponding, isSessionNotFound, landingBody, onNavigate, onScrollState, ref, reload, scrollRef, session, sessionType, spawnLabel, tasks, transcriptMode }: {
  entries: TranscriptEntry[];
  error: Error | null;
  initialSessionId?: string;
  isLoading: boolean;
  isResponding: boolean;
  isSessionNotFound: boolean;
  landingBody?: ReactNode;
  /** Official CC "Start a new session" navigates home (Rs / sessionHomePath). */
  onNavigate?: (path: string) => void;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  ref: Ref<OfficialTranscriptHandle>;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  session: SessionSummary | null;
  /** Official remote tR uses Connecting empty; local Ja uses delayed Loading spark. */
  sessionType?: "local" | "remote" | "bridge" | "pool" | "ssh";
  spawnLabel?: string;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
}) {
  if (isSessionNotFound) {
    return (
      <SessionNotFound
        onStartNewSession={() => {
          onNavigate?.(sessionHomePath("code"));
        }}
      />
    );
  }
  if (error && entries.length === 0) return <SessionError error={error} />;
  if (!initialSessionId) return <div className="h-full overflow-y-auto overflow-x-hidden">{landingBody ?? null}</div>;
  // Residual c119 shell (before Fu/Xb):
  //   Z? not-found
  //   : Ja? (Za? Loading spark : null)     // Ja = D && Ya.length===0 && (B||J) — NOT gated by !H
  //   : li? (D? "No messages yet." : landing)
  //   : oi? init chrome | Vn? yC | Xb
  // Product invent: `entries.length===0 && !isResponding` wrapped Ja → busy empty missed Loading and
  // could flash "No messages" / skip Za. Match residual order: Ja first, then li, then Xb.
  // Vn→yC is mounted by EpitaxyChatPanel (avoids OfficialTranscript ↔ OfficialSummary circular import).
  if (isLoading) {
    if (sessionType === "remote" || sessionType === "pool" || sessionType === "bridge") {
      return <OfficialConnectingToSession />;
    }
    return <OfficialConversationLoading />;
  }
  // Residual li = 0===Ya.length && !oi && !H && "spawning"!==Os
  if (entries.length === 0 && !isResponding) {
    return <OfficialNoMessagesYet />;
  }
  // Residual c119 Xb mount (third jsx arg is React key):
  //   Gn = `${D ?? "draft"}:${Kn}`  // Kn = transcriptMode
  //   c.jsx(Xb, { sessionId:D, entries:Ya, ... }, Gn)
  // Warm A→B remounts Fu. Official Code Gb Fu: no restoreKey.
  return (
    <Transcript
      entries={entries}
      isAwaitingReply={officialIsAwaitingReply(session, isResponding)}
      isResponding={isResponding}
      key={`${initialSessionId}:${transcriptMode}`}
      onScrollState={onScrollState}
      ref={ref}
      scrollRef={scrollRef}
      sessionId={initialSessionId}
      spawnLabel={spawnLabel}
      tasks={tasks}
      transcriptMode={transcriptMode}
    />
  );
}

/** Official remote tR empty pending: residual jd Spinner size m + "Connecting to session…" (NOT Ed Spark). */
function OfficialConnectingToSession() {
  const text = useI18nText(SESSION_LOAD_MESSAGES);
  return (
    <div className="h-full flex flex-col items-center justify-center gap-g4 text-body text-t5">
      <OfficialSpinner size="m" />
      <span data-intl-id="L2r8A2+O5x">{text.connectingToSession}</span>
    </div>
  );
}

function OfficialNoMessagesYet() {
  const text = useI18nText(SESSION_LOAD_MESSAGES);
  return (
    <div className="h-full flex items-center justify-center text-body text-t5">
      <span data-intl-id="xc7r0SA6rC">{text.noMessagesYet}</span>
    </div>
  );
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
  | { id: string; kind: "loader" };

type TranscriptProps = {
  entries: TranscriptEntry[];
  isAwaitingReply: boolean;
  isResponding: boolean;
  onScrollState: (state: OfficialTranscriptScrollState) => void;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  sessionId?: string;
  spawnLabel?: string;
  tasks: OfficialBackgroundTask[];
  transcriptMode: OfficialTranscriptMode;
};

const emptyCodeUserChaptersByAfterId = new Map<string, OfficialCodeUserChapter[]>();

/** Official shared-2 `AU` / `WI`: s→sm, m→undefined (base), l→lg. */
function officialCdsTextSize(size: EditorSize): "sm" | "lg" | undefined {
  if (size === "s") return "sm";
  if (size === "l") return "lg";
  return undefined;
}

/** Official shared-2 `OW=100`, collapseThreshold default 300. */
const OFFICIAL_USER_COLLAPSE_THRESHOLD = 300;
const OFFICIAL_USER_OVERFLOW_PAD = 100;

/** Official c119 Gb scroller — fade is parent Ka `epitaxy-*-scrim`, not Fu. */

function OfficialUserMessageCollapsibleBody({
  children,
  expandPrompts = false,
}: {
  children: ReactNode;
  /** Official c4a9 `collapsible:f!==!0` — verbose `Tm()` / `expandPrompts`. */
  expandPrompts?: boolean;
}) {
  const bodyRef = useRef<HTMLDivElement>(null);
  const [overflows, setOverflows] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useLayoutEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = () => {
      setOverflows(el.scrollHeight > OFFICIAL_USER_COLLAPSE_THRESHOLD);
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    observer?.observe(el);
    return () => observer?.disconnect();
  }, [children]);
  const collapsed = !expandPrompts && overflows && !expanded;
  const maxHeight = Math.max(OFFICIAL_USER_COLLAPSE_THRESHOLD - OFFICIAL_USER_OVERFLOW_PAD, 60);
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      <div
        className={collapsed ? "overflow-hidden [mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)]" : undefined}
        data-find-omitted={collapsed ? "" : undefined}
        style={collapsed ? { maxHeight } : undefined}
      >
        <div className="cds-user-message-body flex flex-col gap-g4" ref={bodyRef}>
          {children}
        </div>
      </div>
      {!expandPrompts && overflows ? (
        <button
          aria-expanded={expanded}
          className="self-start text-footnote text-muted"
          data-official-source="cd5a31703-B4nKQMBN.js:Rs aWpBzjCXKS"
          onClick={() => setExpanded((value) => !value)}
          type="button"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      ) : null}
    </span>
  );
}


/**
 * Official Gb/R transcript (cd5a31703 Gat):
 *   wse/cr window + Lse/T pin. DOM: scroller > sizer[data-rocksteady-sizer] >
 *   rows > spacerTop + flow-root rows (data-rs-index) + spacerBottom.
 *   scrollToBottom: Lse.scrollToBottom (writes settledBottom, browser clamps).
 */
// Residual Xb = memo(Gb) — skip re-render when only parent noise changes.
const Transcript = memo(forwardRef<OfficialTranscriptHandle, TranscriptProps>(function Transcript({ entries, isAwaitingReply, isResponding, onScrollState, scrollRef, sessionId, spawnLabel, tasks, transcriptMode }, ref) {
  const rowsRef = useRef<TranscriptRow[]>([]);
  const initialCount = useRef(entries.length);
  const chatTextSize = useSyncExternalStore(
    officialEpitaxyEditorPrefsStore.subscribe,
    () => officialEpitaxyEditorPrefsStore.getState().chatTextSize,
    () => "m" as EditorSize,
  );
  const cdsTextSize = officialCdsTextSize(chatTextSize);
  const feedText = useI18nText(TRANSCRIPT_FEED_MESSAGES);
  const expandPrompts = officialTranscriptModeExpandsDetails(transcriptMode);
  // Residual Vb: Um(sessionId) store — not local useState + invent clear on sessionId.
  const userChapters = useOfficialSessionUserChapters(sessionId);
  const rows = useMemo(() => buildTranscriptRows(entries), [entries]);
  const userChaptersByAfterId = useMemo(() => groupCodeUserChaptersByAfterId(userChapters), [userChapters]);
  const lastEntryIdx = entries.length - 1;

  // Official cd5a Gat: wse({items, getKey:t9, estimate, overscan Q7=600,
  // paddingTop/Bottom 48, skipNoopRenders, retainOverscan, no restoreKey).
  // Estimate is pin `$it` (not coarse Wb 400) so a live tool row is ~Y5.
  const estimateSize = useCallback((row: TranscriptRow) => estimateOfficialTranscriptRowSize(row, {
    chatTextSize,
    showThinking: officialTranscriptModeShowsThinking(transcriptMode),
    verboseToolBodies: expandPrompts,
  }), [chatTextSize, expandPrompts, transcriptMode]);
  const getRowKey = useCallback((row: TranscriptRow) => row.id, []);
  const hasOlder = useOfficialCodeSessionHasOlder(sessionId);
  const officialFu = useOfficialTranscriptFu({
    estimate: estimateSize,
    getKey: getRowKey,
    hasOlder,
    items: rows,
    sessionId,
  });
  const windowRows = officialFu.rows;
  const sizerRef = useRef<HTMLDivElement | null>(null);
  const endSentinelRef = useRef<HTMLDivElement | null>(null);
  const getContentEnd = useCallback(() => endSentinelRef.current, []);

  useLayoutEffect(() => {
    rowsRef.current = rows;
  }, [rows]);

  // Residual initialCount is mount-once (x.current) — do not reseed invent.
  // Residual chapters: Um re-subscribe by sessionId; no invent setUserChapters([]) on swap.

  useLayoutEffect(() => {
    scrollRef.current = officialFu.scrollElRef.current;
    return () => {
      scrollRef.current = null;
    };
  }, [officialFu.scrollElRef, scrollRef, windowRows]);

  // Official D9 `Ene` / shared-4 `gw`: IO on transcript-end-sentinel, not scrollHeight math.
  useOfficialTranscriptScrollState({
    getContentEnd,
    getScrollElement: officialFu.getScrollElement,
    isPinned: officialFu.isPinned,
    onChange: onScrollState,
    subscribePin: officialFu.subscribePin,
  });

  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior) => {
      officialFu.scrollToBottom(behavior === "smooth" ? "smooth" : "instant");
    },
    scrollToEntry: (entryId) => {
      const index = rowsRef.current.findIndex((row) => (row.kind === "user" || row.kind === "assistant") && row.entry.id === entryId);
      if (index >= 0) officialFu.scrollToIndex(index, { align: "start" });
    },
  }), [officialFu]);

  const attachSizer = useCallback((node: HTMLDivElement | null) => {
    sizerRef.current = node;
    officialFu.attachSizer(node);
  }, [officialFu.attachSizer]);
  // Residual Vb pinUserChapter / unpinUserChapter → Um.addUserChapter / removeUserChapter(chapterId).
  const pinUserChapter = useCallback((afterId: string, text: string) => {
    if (!sessionId) return;
    officialEpitaxyChaptersStore.getState().addUserChapter(
      sessionId,
      afterId,
      officialChapterTitleFromText(text),
    );
  }, [sessionId]);
  const unpinUserChapter = useCallback((chapterId: string) => {
    if (!sessionId) return;
    officialEpitaxyChaptersStore.getState().removeUserChapter(sessionId, chapterId);
  }, [sessionId]);

  // Official Gat DOM: scroller (HD) > sizer[data-rocksteady-sizer] > rows
  // spacerTop + flow-root data-rs-index rows + spacerBottom. No translateY window.
  return (
    <OfficialTurnLiveProvider entries={entries} isResponding={isResponding} sessionId={sessionId}>
    <div
      {...OFFICIAL_PERF_REGION_TRANSCRIPT}
      aria-busy={isResponding}
      aria-label={feedText.chatMessages}
      className={OFFICIAL_WINDOW_SCROLLER_CLASS}
      data-autoscroll-container=""
      data-intl-id="SCYmnElliz"
      data-testid="epitaxy-virtual-transcript"
      ref={officialFu.attachScroller}
      role="feed"
    >
      <div
        className={OFFICIAL_WINDOW_SIZER_CLASS}
        data-rocksteady-sizer=""
        data-testid="transcript-sizer"
        ref={attachSizer}
      >
        <div
          aria-hidden="true"
          className="absolute bottom-0 left-0 h-px w-full pointer-events-none"
          data-testid="transcript-end-sentinel"
          ref={endSentinelRef}
        />
        {officialFu.olderStatus ? (
          <OfficialOlderStatusChrome
            onRetry={() => {
              void officialFu.loadOlder("retry");
            }}
            status={officialFu.olderStatus}
            topPx={officialFu.bottomAnchorGapPx}
          />
        ) : null}
        <div
          data-testid="transcript-rows"
          onBlur={officialFu.keepMountedBlur}
          onFocus={officialFu.keepMountedFocus}
          onKeyDownCapture={officialFu.holdProps.onKeyDownCapture}
          onPointerDownCapture={officialFu.holdProps.onPointerDownCapture}
          ref={officialFu.attachRows}
        >
          <div aria-hidden data-testid="transcript-spacer" style={{ height: officialFu.spacerTop }} />
          {windowRows.flatMap((virtualRow, mountedIndex) => {
            const row = rows[virtualRow.index];
            if (!row) return [];
            const previous = mountedIndex > 0 ? windowRows[mountedIndex - 1] : undefined;
            const gap = previous !== undefined && virtualRow.index !== previous.index + 1
              ? Math.max(0, virtualRow.start - (previous.start + previous.size))
              : 0;
            const node = (
              <div
                data-index={virtualRow.index}
                data-rs-index={virtualRow.index}
                data-testid="transcript-row"
                {...officialTranscriptRowPerf(
                  row.kind,
                  rows.length - 1 - virtualRow.index,
                  isResponding
                    && row.kind !== "loader"
                    && "entryIdx" in row
                    && row.entryIdx === lastEntryIdx,
                )}
                {...(row.kind === "loader" ? { "data-transcript-keeps-pin": "" } : {})}
                key={virtualRow.key}
                ref={officialFu.rowRef}
                style={OFFICIAL_WINDOW_ROW_STYLE}
              >
                <div
                  className={virtualRow.index < rows.length - 1 ? "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0" : "epitaxy-chat-size"}
                >
                  <TranscriptRowContent
                    cdsTextSize={cdsTextSize}
                    expandPrompts={expandPrompts}
                    initialCount={initialCount.current}
                    isAwaitingReply={isAwaitingReply}
                    isResponding={isResponding}
                    lastEntryIdx={lastEntryIdx}
                    onPinChapter={pinUserChapter}
                    onUnpinChapter={unpinUserChapter}
                    row={row}
                    sessionId={sessionId}
                    spawnLabel={spawnLabel}
                    tasks={tasks}
                    transcriptMode={transcriptMode}
                    userChaptersByAfterId={userChaptersByAfterId}
                  />
                </div>
              </div>
            );
            return gap > 0
              ? [
                <div aria-hidden data-testid="transcript-spacer" key={`${String(virtualRow.key)}:gap`} style={{ height: gap }} />,
                node,
              ]
              : [node];
          })}
          <div aria-hidden data-testid="transcript-spacer" style={{ height: officialFu.spacerBottom }} />
        </div>
      </div>
    </div>
    </OfficialTurnLiveProvider>
  );
}));

/** Residual qm — group Um userChapters by afterId. */
function groupCodeUserChaptersByAfterId(chapters: OfficialCodeUserChapter[]) {
  const grouped = new Map<string, OfficialCodeUserChapter[]>();
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
  // cd5a: only kind:"loader" trailing — running-tasks morph lives on OfficialWorkingStatus.
  rows.push({ id: "loader", kind: "loader" });
  return rows;
}

function TranscriptRowContent({
  cdsTextSize,
  expandPrompts = false,
  initialCount,
  isAwaitingReply,
  isResponding,
  lastEntryIdx,
  onPinChapter,
  onUnpinChapter,
  row,
  sessionId,
  spawnLabel,
  tasks,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  cdsTextSize?: "sm" | "lg";
  expandPrompts?: boolean;
  initialCount: number;
  isAwaitingReply: boolean;
  isResponding: boolean;
  lastEntryIdx: number;
  onPinChapter: (afterId: string, text: string) => void;
  onUnpinChapter: (chapterId: string) => void;
  row: TranscriptRow;
  sessionId?: string;
  spawnLabel?: string;
  tasks: OfficialBackgroundTask[];
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId: Map<string, OfficialCodeUserChapter[]>;
}) {
  if (row.kind === "loader") {
    // Residual Gv/$8: sessionId + isWorking + spawnLabel; tasks trail via morphKey running-tasks.
    return (
      <OfficialWorkingStatus
        isWorking={isResponding}
        sessionId={sessionId}
        spawnLabel={spawnLabel}
        tasks={tasks}
      />
    );
  }

  const isNewUserEntry = row.kind === "user" && row.entryIdx >= initialCount;
  const isStreaming = row.kind === "assistant" && isResponding && row.entryIdx === lastEntryIdx;
  const showCodeAwaitingDot = row.kind === "assistant" && isAwaitingReply && row.entryIdx === lastEntryIdx;
  const content = row.kind === "user"
    ? <CodeUserEntryMessage cdsTextSize={cdsTextSize} entry={row.entry} expandPrompts={expandPrompts} isQueued={row.entry.isQueued === true} />
    : (
      <CodeAssistantEntryMessage
        cdsTextSize={cdsTextSize}
        entry={row.entry}
        isLastEntry={row.entryIdx === lastEntryIdx}
        isStreaming={isStreaming}
        onPinChapter={onPinChapter}
        onUnpinChapter={onUnpinChapter}
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

/**
 * Official Hb user entry (cd5a31703-B4nKQMBN):
 * filters file/image/text/event/bash/peer, then branch layouts
 * (bash-only / peer-only / event-only / default bubble).
 * Text segments via Eb/Pb/Tb; inline via zb; durable Ub gates fork/rewind.
 */
export function CodeUserEntryMessage({
  cdsTextSize,
  entry,
  expandPrompts = false,
  isQueued = false,
  onCancelQueued,
}: {
  cdsTextSize?: "sm" | "lg";
  entry: TranscriptEntry;
  expandPrompts?: boolean;
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
  const errors = useErrorsOptional();
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const rewindToHere = useCallback(async () => {
    // Official $a: local-only fe.rewind; null → "Can't rewind"; else xt(prompt||text)+focus.
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    if (actions.sessionRef && actions.sessionRef.type !== "local") return;
    const prompt = await actions.bridge.rewind(actions.sessionId, entry.id);
    if (prompt === null) {
      errors?.addError(sessionLoadText.cantRewindToThisMessage, {
        messageForLogging: "epitaxy-rewind-not-possible",
      });
      return;
    }
    await actions.reload({ silent: true });
    const prefill =
      typeof prompt === "string" && prompt.length > 0 ? prompt : copyText;
    actions.setComposerText?.(prefill);
  }, [actions, copyText, entry.id, errors, sessionLoadText.cantRewindToThisMessage]);
  // Official: n && y ? () => n(t.id, b) : void 0 — only durable UUIDs enable fork/rewind.
  // Official onRewindToMessage: !ue || H || xn ? void 0 : $a (local + !responding).
  const canRewind =
    durableId
    && Boolean(actions?.bridge.rewind)
    && !actions?.isResponding
    && (actions?.sessionRef?.type ?? "local") === "local";
  const onFork = durableId && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = canRewind ? () => { void rewindToHere(); } : undefined;
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
      <div className="flex flex-col gap-g6 w-full" data-official-source="cd5a31703-B4nKQMBN.js:Hb bash-only">
        {attachmentStrip}
        {bashItems.map((item) => <UserBashBlock item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb code-attachment (M && no images): Ob cards + per-segment text bubbles.
  if (hasCodeAttachment && imageItems.length === 0) {
    return (
      <div
        className="epitaxy-user-turn group/message-row group/msg flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end"
        data-author="self"
        data-cds="UserMessage"
        data-official-source="cd5a31703-B4nKQMBN.js:Hb code-attachment"
        data-state={isQueued ? "pending" : undefined}
        data-testid="user-message"
        data-text-size={cdsTextSize}
        data-turn-key={entry.id}
      >
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
                <div className={officialUserBubbleProseClass}>
                  <p className={officialUserBubbleTextClass}>
                    {renderOfficialUserInlineText(segment.text, false, openPath)}
                  </p>
                </div>
              </div>
            </OfficialTranscriptItemMenu>
          );
        })}
        <OfficialMessageActions
          copyText={copyText || undefined}
          layout="pretty"
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
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="cd5a31703-B4nKQMBN.js:Hb peer-only">
        {attachmentStrip}
        {peerItems.map((item) => <OfficialUserPeerCard item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb event-only.
  if (eventItems.length > 0 && imageItems.length === 0 && textItems.length === 0) {
    return (
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="cd5a31703-B4nKQMBN.js:Hb event-only">
        {attachmentStrip}
        {eventItems.map((item) => <OfficialUserEventCard item={item} key={item.id} />)}
      </div>
    );
  }

  // Official Hb default bubble — shared-2 RW collapsible overflow (threshold 300, pad 100).
  const bubbleBody = textItems.length > 0 ? (
    <OfficialTranscriptItemMenu
      onAttachAsContext={onAttachAsContext}
      onFork={onFork}
      onRewind={onRewind}
      text={copyText}
    >
      <div className={`${officialUserMessageClass} max-w-full`}>
        <div className={officialUserBubbleProseClass}>
          <OfficialUserMessageCollapsibleBody expandPrompts={expandPrompts}>
            {textSegments.map((segment) => (
              segment.kind === "code" ? (
                <OfficialUserCodeAttachment
                  key={segment.key}
                  lang={segment.lang}
                  text={segment.text}
                />
              ) : (
                <p className={officialUserBubbleTextClass} key={segment.key}>
                  {renderOfficialUserInlineText(segment.text, false, openPath)}
                </p>
              )
            ))}
          </OfficialUserMessageCollapsibleBody>
        </div>
      </div>
    </OfficialTranscriptItemMenu>
  ) : null;

  return (
    <div
      className={`epitaxy-user-turn group/message-row group/msg flex w-full min-w-0 flex-col gap-xs font-sans ms-auto items-end transition-opacity duration-200 ${isQueued ? "opacity-50 hover:opacity-80" : ""}`}
      data-author="self"
      data-cds="UserMessage"
      data-official-source="cd5a31703-B4nKQMBN.js:Hb default"
      data-state={isQueued ? "pending" : undefined}
      data-testid="user-message"
      data-text-size={cdsTextSize}
      data-turn-key={entry.id}
    >
      {isQueued ? (
        <span className="sr-only" data-intl-id="QIwl3NMza9">Queued. Claude will read this after the current turn.</span>
      ) : null}
      <div className="flex flex-col items-end gap-g6 max-w-[85%] min-w-0">
        {attachmentStrip}
        {bubbleBody}
        {textItems.length > 0 && !isQueued ? (
          <OfficialMessageActions
            copyText={copyText || undefined}
            layout="pretty"
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
          className="self-center opacity-0 group-hover/message-row:opacity-100 group-hover/msg:opacity-100 focus-visible:opacity-100 transition-opacity"
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
  const surfaceText = useI18nText(TRANSCRIPT_SURFACE_MESSAGES);
  const fileChips = [
    ...files.map((file) => ({ id: file.id, fileName: file.fileName, path: undefined as string | undefined })),
    ...uploaded.map((item) => ({ id: item.id, fileName: item.file.fileName, path: item.file.path })),
  ];
  if (fileChips.length === 0 && images.length === 0) return null;
  return (
    <>
      {fileChips.length > 0 ? (
        <ul
          aria-label={surfaceText.attachedFiles}
          className="flex flex-wrap items-end gap-g4 max-w-full"
          data-official-source="cd5a31703-B4nKQMBN.js:Sv files"
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
      {images.length > 0 ? <OfficialUserImageGallery images={images} /> : null}
    </>
  );
}

/**
 * Official Sv image strip (c11959232): og context wrapper (Copy/Save image) +
 * Rg multi-image lightbox. Thumb click opens Rg at that index; Rg portals to body,
 * locks scroll, restores focus, and supports Arrow/Home/End/Escape navigation.
 */
function OfficialUserImageGallery({
  images,
}: {
  images: Array<Extract<TranscriptEntryItem, { kind: "image" }>>;
}) {
  // Official: a = selected lightbox index (null = closed); i(t) opens at index / closes on null.
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  return (
    <>
      <div className="flex flex-wrap items-end gap-g6 max-w-full p-[1px]" data-official-source="cd5a31703-B4nKQMBN.js:Sv images">
        {images.map((image, index) => (
          <OfficialImageContextMenu key={image.id} src={`data:${image.mimeType};base64,${image.data}`}>
            <button
              aria-label={`View attached image ${index + 1}`}
              className="shrink-0 cursor-zoom-in outline-none hide-focus-ring focus-visible:ring-focus rounded-r3"
              onClick={() => setLightboxIndex(index)}
              type="button"
            >
              <img
                alt=""
                className="block max-w-[120px] max-h-[120px] rounded-r3 effect-contrast-stroke"
                src={`data:${image.mimeType};base64,${image.data}`}
              />
            </button>
          </OfficialImageContextMenu>
        ))}
      </div>
      {lightboxIndex !== null ? (
        <OfficialImageLightbox
          initialIndex={lightboxIndex}
          items={images.map((image) => ({
            alt: "Attached image",
            id: image.id,
            url: `data:${image.mimeType};base64,${image.data}`,
          }))}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}

/**
 * Official og (c11959232): right-click context menu on an image — Copy image / Save image.
 * Cd.Root + Cd.Trigger(render=cloned child) + Cd.Popup with two items.
 */
function OfficialImageContextMenu({
  children,
  fileName,
  src,
}: {
  children: ReactElement<{ onContextMenu?: (event: ReactMouseEvent) => void; style?: CSSProperties; tabIndex?: number }>;
  fileName?: string;
  src: string;
}) {
  const copyImage = useCallback(() => {
    void (async () => {
      const blob = await (await fetch(src)).blob();
      const type = blob.type || "image/png";
      await navigator.clipboard.write([new ClipboardItem({ [type]: blob })]);
    })().catch(() => undefined);
  }, [src]);
  const saveImage = useCallback(() => {
    void (async () => {
      const blob = await (await fetch(src)).blob();
      const ext = (() => {
        const t = blob.type.toLowerCase();
        if (t.includes("png")) return "png";
        if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
        if (t.includes("gif")) return "gif";
        if (t.includes("webp")) return "webp";
        if (t.includes("svg")) return "svg";
        if (t.includes("avif")) return "avif";
        if (t.includes("heic")) return "heic";
        if (t.includes("bmp")) return "bmp";
        return "png";
      })();
      const fallback = `image-${Date.now()}.${ext}`;
      const name = fileName ?? fallback;
      const file = /\.[a-z0-9]+$/i.test(name) ? name : `${name}.${ext}`;
      const url = URL.createObjectURL(blob);
      try {
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = file;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    })().catch(() => undefined);
  }, [fileName, src]);

  const childOnContextMenu = children.props.onContextMenu;
  const childStyle = children.props.style;
  const trigger = cloneElement(children, {
    onContextMenu: (event: ReactMouseEvent) => {
      event.stopPropagation();
      childOnContextMenu?.(event);
    },
    style: { outline: "none", ...childStyle },
    tabIndex: children.props.tabIndex ?? -1,
  });

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger render={trigger as ReactElement<Record<string, unknown>>} />
      <BaseContextMenuPopup>
        <BaseContextMenuItem onClick={copyImage}>Copy image</BaseContextMenuItem>
        <BaseContextMenuItem onClick={saveImage}>Save image</BaseContextMenuItem>
      </BaseContextMenuPopup>
    </ContextMenu.Root>
  );
}

/**
 * Official Rg (c11959232): multi-image lightbox. Portal to body, dialog role,
 * body overflow lock + focus restore, Escape/ArrowLeft/ArrowRight/Home/End,
 * horizontal slide track (75vw panels, 32px gap), prev/next + "n of total" pager.
 */
function OfficialImageLightbox({
  initialIndex,
  items,
  onClose,
}: {
  initialIndex: number;
  items: Array<{ alt: string; id: string; url: string }>;
  onClose: () => void;
}) {
  const surfaceText = useI18nText(TRANSCRIPT_SURFACE_MESSAGES);
  const loadText = useI18nText(SESSION_LOAD_MESSAGES);
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = useRef<Element | null>(null);
  const previous = useCallback(() => setIndex((value) => (value > 0 ? value - 1 : value)), []);
  const next = useCallback(() => setIndex((value) => (value < items.length - 1 ? value + 1 : value)), [items.length]);

  useEffect(() => {
    restoreFocusRef.current = document.activeElement;
    dialogRef.current?.focus();
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      const previous2 = restoreFocusRef.current;
      if (previous2 instanceof HTMLElement) previous2.focus();
    };
  }, []);

  const current = items[index];
  if (!current) return null;

  return createPortal(
    <div
      aria-label={surfaceText.imagePreview}
      aria-modal="true"
      className="epitaxy-lightbox fixed inset-0 z-50 bg-always-black/80 backdrop-blur-[40px] flex flex-col overflow-hidden draggable-none outline-none"
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.defaultPrevented) return;
        if (event.key === "Escape") { event.stopPropagation(); onClose(); }
        else if (event.key === "ArrowLeft") { event.preventDefault(); previous(); }
        else if (event.key === "ArrowRight") { event.preventDefault(); next(); }
        else if (event.key === "Home") { event.preventDefault(); setIndex(0); }
        else if (event.key === "End") { event.preventDefault(); setIndex(items.length - 1); }
      }}
      ref={dialogRef}
      role="dialog"
      tabIndex={-1}
    >
      <div className="relative flex items-center justify-end p-4 z-10">
        <button
          aria-label={loadText.close}
          className="size-8 rounded-full flex items-center justify-center text-always-white/70 hover:text-always-white hover:bg-always-white/10"
          onClick={(event) => { event.stopPropagation(); onClose(); }}
          type="button"
        >
          <Icon customSize={16} name="XCrossCloseMedium" />
        </button>
      </div>
      <div className="flex-1 relative overflow-clip">
        <div
          className="flex h-full items-center motion-safe:transition-transform motion-safe:duration-300 motion-safe:ease-out"
          style={{ gap: "32px", transform: `translateX(calc(12.5vw - ${75 * index}vw - ${32 * index}px))` }}
        >
          {items.map((item, itemIndex) => (
            <div
              className="h-full flex-shrink-0 flex items-center justify-center"
              key={item.id}
              onClick={(event) => { if (itemIndex !== index) { event.stopPropagation(); setIndex(itemIndex); } }}
              style={{ width: "75vw" }}
            >
              <OfficialImageContextMenu src={item.url}>
                <img
                  alt={item.alt}
                  className={`max-h-[70vh] max-w-full object-contain rounded-2xl motion-safe:transition-opacity motion-safe:duration-300 ${itemIndex === index ? "opacity-100" : "opacity-40 hover:opacity-70 cursor-pointer"}`}
                  onClick={itemIndex === index ? (event) => event.stopPropagation() : undefined}
                  src={item.url}
                />
              </OfficialImageContextMenu>
            </div>
          ))}
        </div>
        {items.length > 1 ? (
          <div
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              aria-label={surfaceText.previousImage}
              className="p-2 rounded-lg text-always-white disabled:text-always-white/30 enabled:hover:bg-always-white/10"
              disabled={index === 0}
              onClick={(event) => { event.stopPropagation(); previous(); }}
              type="button"
            >
              <Icon customSize={20} name="CaretLeft" />
            </button>
            <span aria-live="polite" className="px-2 text-always-white/80 text-sm tabular-nums pointer-events-none select-none">
              {formatOfficialIcu(surfaceText.currentOfTotal, { current: index + 1, total: items.length })}
            </span>
            <button
              aria-label={surfaceText.nextImage}
              className="p-2 rounded-lg text-always-white disabled:text-always-white/30 enabled:hover:bg-always-white/10"
              disabled={index === items.length - 1}
              onClick={(event) => { event.stopPropagation(); next(); }}
              type="button"
            >
              <Icon customSize={20} name="CaretRight" />
            </button>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
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
    <div className="flex w-full flex-col gap-1 rounded-lg border border-alpha-2 bg-alpha-1 p-sm" data-official-source="cd5a31703-B4nKQMBN.js:wz">
      <div className="flex items-center gap-0.75 text-body text-secondary">
        <Icon name="ChatBubble" size="xs" />
        <span className="truncate">{title}</span>
      </div>
      <p className="text-body text-primary whitespace-pre-wrap [overflow-wrap:anywhere] select-text m-0">
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
    <div className="flex flex-col w-full" data-official-source="cd5a31703-B4nKQMBN.js:Rb">
      <button
        aria-expanded={expanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-0.75 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm border-0 bg-transparent p-0 m-0 cursor-default"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className="text-body">{label}</span>
        <Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="xs" />
      </button>
      {expanded ? (
        <div className="pl-p6 pt-p3 text-code text-secondary whitespace-pre-wrap break-all select-text">
          {item.content}
        </div>
      ) : null}
    </div>
  );
}

export function CodeAssistantEntryMessage({
  cdsTextSize,
  entry,
  isLastEntry = false,
  isStreaming = false,
  onPinChapter,
  onUnpinChapter,
  showAwaitingDot = false,
  transcriptMode = "normal",
  userChaptersByAfterId,
}: {
  cdsTextSize?: "sm" | "lg";
  entry: TranscriptEntry;
  /** Official LX vs PX: last assistant entry paints the live prompt_blocked card. */
  isLastEntry?: boolean;
  isStreaming?: boolean;
  /** Residual Kb onPinChapter(afterId, titleText). */
  onPinChapter?: (afterId: string, text: string) => void;
  /** Residual Kb onUnpinChapter(chapterId) — removeUserChapter by id, not afterId. */
  onUnpinChapter?: (chapterId: string) => void;
  showAwaitingDot?: boolean;
  transcriptMode?: OfficialTranscriptMode;
  userChaptersByAfterId?: Map<string, OfficialCodeUserChapter[]>;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const chaptersByAfterId = userChaptersByAfterId ?? emptyCodeUserChaptersByAfterId;
  const visibleItems = entry.items.filter(isVisibleAssistantEntryItem);
  const taskEventRuns = officialTaskEventRunsByFirstId(visibleItems);
  const copyText = visibleItems.flatMap((item) => item.kind === "text" ? [item.text] : []).join("\n\n") || undefined;
  const firstVisibleItem = visibleItems[0];
  const hasErrorItem = visibleItems.some((item) => item.kind === "error");
  // Residual Kb: pinned → s.forEach(e => o(e.id)); unpinned → r(afterId, title).
  const pinHandlersForItem = useCallback((itemId: string, textForTitle: () => string) => {
    const pinned = chaptersByAfterId.get(itemId);
    if (pinned?.length) {
      return {
        isPinned: true as const,
        onPinChapter: onUnpinChapter
          ? () => { for (const chapter of pinned) onUnpinChapter(chapter.id); }
          : undefined,
      };
    }
    return {
      isPinned: false as const,
      onPinChapter: onPinChapter
        ? () => onPinChapter(itemId, textForTitle())
        : undefined,
    };
  }, [chaptersByAfterId, onPinChapter, onUnpinChapter]);
  const firstPin = firstVisibleItem
    ? pinHandlersForItem(firstVisibleItem.id, () => copyText ?? "")
    : { isPinned: false as boolean };
  const forkFromHere = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.forkSession) return;
    const forked = await actions.bridge.forkSession(actions.sessionId, entry.id);
    if (forked?.id) actions.onNavigate(sessionPath(forked));
  }, [actions, entry.id]);
  const errors = useErrorsOptional();
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  const rewindToHere = useCallback(async () => {
    // Official $a local-only + composer prefill (same as Hb path).
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    if (actions.sessionRef && actions.sessionRef.type !== "local") return;
    const prompt = await actions.bridge.rewind(actions.sessionId, entry.id);
    if (prompt === null) {
      errors?.addError(sessionLoadText.cantRewindToThisMessage, {
        messageForLogging: "epitaxy-rewind-not-possible",
      });
      return;
    }
    await actions.reload({ silent: true });
    const prefill =
      typeof prompt === "string" && prompt.length > 0
        ? prompt
        : (copyText ?? "");
    actions.setComposerText?.(prefill);
  }, [actions, copyText, entry.id, errors, sessionLoadText.cantRewindToThisMessage]);
  const retryLastTurn = useCallback(async () => {
    if (!actions?.sessionId || !actions.bridge.rewind) return;
    await actions.bridge.rewind(actions.sessionId, entry.id);
    await actions.reload({ silent: true });
  }, [actions, entry.id]);
  // Official r2 → HI (cd5a): hover bar Copy/Fork/thumbs + trailing timestamp; rewind stays on Uv / item menu.
  const canRewind =
    !isStreaming
    && Boolean(actions?.bridge.rewind)
    && !actions?.isResponding
    && (actions?.sessionRef?.type ?? "local") === "local";
  const onFork = !isStreaming && actions?.bridge.forkSession ? () => { void forkFromHere(); } : undefined;
  const onRewind = canRewind ? () => { void rewindToHere(); } : undefined;
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

  // Official r2/i2 (cd5a): shell + per-item Uv + HI/Vv (copy/pin/fork/thumbs/timestamp).
  return (
    <OfficialAssistantMessage
      copyText={copyText}
      createdAt={isStreaming ? undefined : entry.timestamp}
      isPinned={Boolean(firstPin.isPinned)}
      onFork={onFork}
      onPinChapter={"onPinChapter" in firstPin ? firstPin.onPinChapter : undefined}
      onRateMessage={onRateMessage}
      rateMessageUuid={entry.id}
      showAwaitingDot={showAwaitingDot}
      textSize={cdsTextSize}
    >
      {visibleItems.map((item, index) => (
        <Fragment key={item.id}>
          {chaptersByAfterId.get(item.id)?.map((chapter) => <CodeChapterTitle chapter={chapter} key={chapter.id} />)}
          {/* Official Kb: hide turn_error when same entry already has error items (x). */}
          {item.kind === "task_event" && !taskEventRuns.has(item.id)
            ? null
            : item.kind === "turn_error" && hasErrorItem
            ? null
            : renderCodeAssistantEntryItem(item, {
              isLastEntry,
              isLastTools: item.kind === "tools" && !visibleItems.slice(index + 1).some((next) => next.kind === "tools"),
              isStreaming,
              onAttachAsContext: actions?.attachAsContext,
              onFork,
              onRetry: hasErrorItem ? undefined : onRetry,
              onRewind,
              pin: pinHandlersForItem,
              sessionId: actions?.sessionId,
              taskEventRun: item.kind === "task_event" ? taskEventRuns.get(item.id) : undefined,
              transcriptMode,
            })}
        </Fragment>
      ))}
    </OfficialAssistantMessage>
  );
}

function officialHookNoticeHasWarning(notices: OfficialHookNotice[]) {
  return notices.some((notice) => notice.level === "warning");
}

/** Official RM — collapsible hook_notice. `s=n||(o??r)`: verbose always open; warning default open. */
function OfficialRmHookNotice({
  item,
  transcriptMode = "normal",
}: {
  item: Extract<TranscriptEntryItem, { kind: "hook_notice" }>;
  transcriptMode?: OfficialTranscriptMode;
}) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const verbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const warning = officialHookNoticeHasWarning(item.notices);
  const [expanded, setExpanded] = useState(warning);
  const open = verbose || expanded;
  if (item.plugin !== undefined) {
    const first = item.notices[0];
    if (!first) return null;
    return (
      <div className="flex w-full items-baseline gap-xs ps-[var(--cds-assistant-message-text-inset,0px)]" data-official-source="cd5a31703-B4nKQMBN.js:zM" data-plugin-log={item.plugin}>
        <span className="shrink-0 text-caption text-muted">{item.plugin}</span>
        <div className="min-w-0 text-body text-muted whitespace-pre-wrap [overflow-wrap:anywhere]">{formatOfficialHookNoticeMessage(first)}</div>
      </div>
    );
  }
  return (
    <div
      className="flex w-full flex-col ps-[var(--cds-assistant-message-text-inset,0px)]"
      data-official-source="cd5a31703-B4nKQMBN.js:Jz RM hook_notice"
    >
      <button
        aria-expanded={open}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-1 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm"
        onClick={() => {
          if (!verbose) setExpanded((value) => !value);
        }}
        type="button"
      >
        {warning ? <Icon className="shrink-0 text-extended-yellow" name="Warning" size="sm" /> : null}
        <span className={`min-w-0 truncate text-body ${warning ? "text-muted group-hover/tool:text-secondary" : "text-secondary group-hover/tool:text-primary"}`}>
          {formatOfficialIcu(actionsText.claudeCodeNotice, { count: item.notices.length })}
        </span>
        <ToolChevron colorClassName={warning ? "text-muted group-hover/tool:text-secondary" : "text-secondary group-hover/tool:text-primary"} expanded={open} />
      </button>
      <OfficialCollapse expanded={open}>
        <div className="flex flex-col gap-1 pl-md pt-xs">
          {item.notices.map((notice) => (
            <div className="flex items-start gap-1 select-text" key={notice.id}>
              {item.notices.length > 1 && notice.level === "warning" ? (
                <span className="text-body flex h-[1lh] shrink-0 items-center">
                  <Icon className="shrink-0 text-extended-yellow" name="Warning" size="sm" />
                </span>
              ) : null}
              <div className="text-body text-muted whitespace-pre-wrap [overflow-wrap:anywhere]">{formatOfficialHookNoticeMessage(notice)}</div>
            </div>
          ))}
        </div>
      </OfficialCollapse>
    </div>
  );
}

function OfficialJzNotice({
  item,
  transcriptMode = "normal",
}: {
  item: Extract<TranscriptEntryItem, { kind: "event" }>;
  transcriptMode?: OfficialTranscriptMode;
}) {
  if (item.eventType === "hook") {
    return (
      <OfficialRmHookNotice
        item={{
          id: item.id,
          kind: "hook_notice",
          notices: [{ id: item.id, level: "notice", message: item.content }],
        }}
        transcriptMode={transcriptMode}
      />
    );
  }
  return <OfficialUserEventCard item={item} />;
}

/** Official Yj / c93058 `f`: elapsedSeconds when ≥ 2s while aM holds the busy mark. */
function OfficialAmElapsedSeconds() {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const startedAt = officialGetTurnStartedAt(actions?.sessionId);
  const [elapsed, setElapsed] = useState(() => (
    startedAt != null ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0
  ));
  useEffect(() => {
    if (startedAt == null) {
      setElapsed(0);
      return undefined;
    }
    const tick = () => setElapsed(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  if (elapsed < 2) return null;
  return (
    <span className="text-body text-muted tabular-nums shrink-0" data-official-source="cd5a31703-B4nKQMBN.js:Yj">
      {elapsed}s
    </span>
  );
}

/** Official Nj / c80ec Le — compact_boundary ap.Step label. */
function OfficialNjCompacted({ item }: { item: Extract<TranscriptEntryItem, { kind: "compacted" }> }) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const saved = item.preTokens !== undefined && item.postTokens !== undefined && item.preTokens > item.postTokens
    ? formatOfficialCompactTokens(item.preTokens - item.postTokens)
    : undefined;
  const from = item.preTokens !== undefined && item.preTokens > 0
    ? formatOfficialCompactTokens(item.preTokens)
    : undefined;
  const label = saved
    ? actionsText.compactedSessionSaved.replace("{tokens}", saved)
    : from
      ? actionsText.compactedSessionFrom.replace("{tokens}", from)
      : actionsText.compactedSession;
  return (
    <OfficialTurnStatusStep
      findOmitted
      label={label}
      source="cd5a31703-B4nKQMBN.js:Nj"
      state="done"
    />
  );
}

/** Official Mj — catalog 4Zkm5mSVWS / FnKhqMbHN5 / k0/cAE4jdO (Wo ids not in en-US.json). */
function OfficialMjModelFallback({ item }: { item: Extract<TranscriptEntryItem, { kind: "model_fallback" }> }) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const explanation = item.apiRefusalExplanation?.trim();
  const label = item.trigger
    ? actionsText.modelFallbackUnavailable.replace("{fallbackModel}", item.fallbackModel)
    : explanation
      ? actionsText.modelFallbackSafeguardOriginal
        .replace("{fallback}", item.fallbackModel)
        .replace("{original}", item.originalModel)
      : actionsText.modelFallbackSafeguard.replace("{fallback}", item.fallbackModel);
  return (
    <OfficialTurnStatusStep
      label={label}
      source="cd5a31703-B4nKQMBN.js:Mj"
      state="done"
    >
      {explanation ?? undefined}
    </OfficialTurnStatusStep>
  );
}

function renderCodeAssistantEntryItem(
  item: Exclude<TranscriptEntryItem, { kind: "file" | "image" | "peer" | "uploaded-file" }>,
  options: {
    isLastEntry?: boolean;
    isLastTools?: boolean;
    isStreaming: boolean;
    onAttachAsContext?: (text: string) => void;
    onFork?: () => void;
    onRetry?: () => void;
    onRewind?: () => void;
    pin: (itemId: string, textForTitle: () => string) => { isPinned?: boolean; onPinChapter?: () => void };
    sessionId?: string;
    taskEventRun?: OfficialTaskEventItem[];
    transcriptMode: OfficialTranscriptMode;
  },
) {
  if (item.kind === "thinking") return <CodeThinkingBlock expansionKey={item.id} text={item.text} transcriptMode={options.transcriptMode} />;
  if (item.kind === "event") return <OfficialJzNotice item={item} transcriptMode={options.transcriptMode} />;
  if (item.kind === "hook_notice") return <OfficialRmHookNotice item={item} transcriptMode={options.transcriptMode} />;
  if (item.kind === "compacted") return <OfficialNjCompacted item={item} />;
  if (item.kind === "model_fallback") return <OfficialMjModelFallback item={item} />;
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
          <AssistantToolsBlock
            item={item}
            liveTail={Boolean(options.isStreaming && options.isLastTools)}
            transcriptMode={options.transcriptMode}
          />
        </div>
      </OfficialTranscriptItemMenu>
    );
  }
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
          <OfficialCodeMarkdown isStreaming={options.isStreaming} sessionId={options.sessionId} text={item.text} />
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
  // Official Kb: task_event → i4e(KX/tQe). Consecutive events share a cR run.
  if (item.kind === "task_event") {
    return <CodeTaskEventRun events={options.taskEventRun ?? [item]} />;
  }
  // Official Kb: chapter → Lh
  if (item.kind === "chapter") {
    return <CodeOfficialChapterItem item={item} sessionId={options.sessionId} />;
  }
  // Official Kb: context → Ku; stats → $x
  if (item.kind === "context") {
    return (
      <div className="max-w-[520px]" data-official-source="cd5a31703-B4nKQMBN.js:Ku + index dCe">
        <OfficialContextWindowUsage usage={item.usage} />
      </div>
    );
  }
  if (item.kind === "stats") {
    return <CodeStatsCard stats={item.stats} />;
  }
  if (isOfficialKbNoticeItem(item)) {
    return (
      <OfficialKbNoticeCard
        isLastEntry={options.isLastEntry}
        item={item}
        sessionId={options.sessionId}
      />
    );
  }
  if (item.kind === "bash") return <UserBashBlock item={item} />;
  return null;
}

/**
 * Official Bb API Error card (c11959232) + Dh reset_rate_limits when gated.
 * Dh residual: button children always "Reset limits"; busy:isPending;
 * onSuccess → messageLimits within_limit + toast "Rate limits reset".
 */
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
  const [isPending, setIsPending] = useState(false);
  const [canReset, setCanReset] = useState(false);
  const [orgUuid, setOrgUuid] = useState<string | null>(null);
  const errors = useErrorsOptional();

  useEffect(() => {
    if (!isRateLimit) return undefined;
    let alive = true;
    void fetchBootstrapPayload().then((bootstrap) => {
      if (!alive) return;
      const uuid = organizationUuidFromBootstrap(bootstrap);
      setOrgUuid(uuid);
      // Official: el("can_reset_rate_limits") && org uuid — no soft-open.
      setCanReset(Boolean(uuid) && canResetRateLimitsFromBootstrap(bootstrap));
    });
    return () => {
      alive = false;
    };
  }, [isRateLimit]);

  const resetLimits = async () => {
    if (!orgUuid || isPending) return;
    setIsPending(true);
    try {
      const result = await postOrganizationResetRateLimits(orgUuid);
      if (result.ok) {
        // Official Dh onSuccess: i({type:"within_limit"}, orgUuid, "") + toast.
        applyCoworkRateLimitToStore({ type: "within_limit" }, { orgUuid });
        errors?.addSuccess("Rate limits reset");
      } else {
        errors?.addError("Failed to reset rate limits", {
          uniqueKey: "epitaxy.resetRateLimits",
        });
      }
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="cd5a31703-B4nKQMBN.js:Bb+Dh">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote flex items-center justify-between gap-0.75">
        <span>API Error</span>
        {isRateLimit && canReset ? (
          <OfficialButton
            // Official Dh: busy:isPending; OfficialButton residual uses disabled for pending.
            disabled={isPending}
            onClick={() => void resetLimits()}
            size="small"
            variant="uncontained"
          >
            Reset limits
          </OfficialButton>
        ) : null}
      </div>
      <div className="px-p3 py-p2">
        <code className="text-code break-words whitespace-pre-wrap">{text}</code>
      </div>
      {onRetry && !isRateLimit ? (
        <div className="flex flex-wrap items-center gap-0.75 px-p3 pb-p3">
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
    <div className="rounded-lg border border-[var(--fill-destructive-default)] overflow-hidden" data-official-source="cd5a31703-B4nKQMBN.js:rv">
      <div className="px-p3 py-p2 bg-[var(--fill-destructive-default)] text-destructive-default text-footnote">{title}</div>
      <div className="flex flex-col gap-0.75 px-p3 py-p3">
        <p className={`text-body ${mutedGuidance ? "text-secondary" : "text-primary"}`}>{guidance}</p>
        {showDetailToggle && detailsOpen ? (
          <code className="rounded-sm bg-t1 px-p3 py-p2 text-code text-t7 break-words whitespace-pre-wrap">{detailText}</code>
        ) : null}
        <div className="flex flex-wrap items-center gap-0.75">
          {preferRewind && onRewind ? (
            <OfficialButton onClick={onRewind} size="small" variant="contained">Rewind</OfficialButton>
          ) : null}
          {showRetry && onRetry ? (
            <OfficialButton onClick={onRetry} size="small" variant="contained">Try again</OfficialButton>
          ) : null}
          {showDetailToggle ? (
            <button
              aria-expanded={detailsOpen}
              className="flex items-center gap-0.5 text-footnote text-secondary hover:text-primary hide-focus-ring focus-visible:shadow-focus rounded-sm border-0 bg-transparent cursor-pointer p-0"
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

/** Official GX: click opens Tasks pane to this task. */
function CodeTaskEventHost({
  asCard,
  children,
}: {
  asCard: boolean;
  children: ReactNode;
  finished: boolean;
  taskId: string;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const surfaceText = useI18nText(TRANSCRIPT_SURFACE_MESSAGES);
  if (actions?.openTasks) {
    return (
      <button
        aria-label={surfaceText.viewBackgroundTask}
        className={
          asCard
            ? "group/tool my-[6px] flex max-w-full items-center gap-1 rounded-lg border-0 bg-transparent p-0 text-left cursor-pointer"
            : "group/tool flex flex-col gap-1 py-0 max-w-full items-start text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm border-0 bg-transparent p-0 cursor-pointer"
        }
        data-official-source="cd5a31703-B4nKQMBN.js:GX"
        onClick={() => actions.openTasks?.()}
        type="button"
      >
        {asCard ? <Icon className="shrink-0 self-center text-muted" name="AgentsSimple" size="sm" /> : null}
        {children}
      </button>
    );
  }
  return (
    <div className="flex flex-col gap-1 py-0 max-w-full items-start" data-official-source="cd5a31703-B4nKQMBN.js:GX">
      {children}
    </div>
  );
}

/** Official tQe: one Background {noun} {status} · description. Verb is shrink-0. */
function CodeTaskEventChip({ inGroup = false, item }: { inGroup?: boolean; item: OfficialTaskEventItem }) {
  const failed = item.status === "failed";
  const running = item.status === "running";
  const verb = officialTaskEventChipVerb(item);
  const detail = officialTaskEventChipDetail(item);
  const asCard = !inGroup && running;
  return (
    <CodeTaskEventHost asCard={asCard} finished={!running} taskId={item.taskId}>
      <span className="flex min-w-0 items-center gap-1 max-w-full">
        <span className={`text-body shrink-0 ${failed ? "text-danger" : asCard ? "text-primary" : "text-secondary group-hover/tool:text-primary"}`} data-official-source="cd5a31703-B4nKQMBN.js:tQe m3qXDI92OE">
          {verb}
        </span>
        {detail ? (
          <span className="text-body text-secondary group-hover/tool:text-primary min-w-0 truncate">
            {detail}
          </span>
        ) : null}
      </span>
    </CodeTaskEventHost>
  );
}

/** Official KX: consecutive task_event → UX count line (`hEJp1hFtWd`). */
function CodeTaskEventRun({ events, inGroup = false }: { events: OfficialTaskEventItem[]; inGroup?: boolean }) {
  if (events.length === 0) return null;
  if (events.length === 1) return <CodeTaskEventChip inGroup={inGroup} item={events[0]!} />;
  const parts = officialTaskEventRunParts(events);
  const anyRunning = events.some((event) => event.status === "running");
  const anySettled = events.some((event) => event.status !== "running");
  const tint = inGroup || !anyRunning;
  const asCard = !inGroup && anyRunning;
  return (
    <CodeTaskEventHost asCard={asCard} finished={anySettled && !anyRunning} taskId={events[0]!.taskId}>
      <span className={`flex min-w-0 items-center gap-1 max-w-full ${asCard ? "text-body text-primary tabular-nums" : "text-body text-secondary group-hover/tool:text-primary"} min-w-0 break-words`} data-official-source="cd5a31703-B4nKQMBN.js:KX hEJp1hFtWd">
        {parts.map((part, index) => (
          <Fragment key={part.key}>
            {index > 0 ? <span>, </span> : null}
            <span className={`${index > 0 ? "whitespace-nowrap" : ""} ${tint && part.danger ? "text-danger" : ""}`}>
              {part.text}
            </span>
          </Fragment>
        ))}
      </span>
    </CodeTaskEventHost>
  );
}

function officialToolsCopyText(tools: TranscriptToolUse[]) {
  const tool = tools[0];
  if (!tool) return "";
  const inputString = (key: string) => stringValue(tool.input[key]);
  return inputString("description") ?? inputString("command") ?? inputString("file_path") ?? inputString("pattern") ?? inputString("prompt") ?? tool.name;
}

/** Residual zh — user chapter title; DOM id Lm(id) for Gw jump. */
function CodeChapterTitle({ chapter }: { chapter: OfficialCodeUserChapter }) {
  return (
    <div
      id={officialChapterDomId(chapter.id)}
      className="text-body-semibold text-primary select-text scroll-mt-[56px]"
      data-official-source="cd5a31703-B4nKQMBN.js:zh"
    >
      {chapter.title}
    </div>
  );
}

/** Residual Lh + zh — claude chapter from nke / mark_chapter; hide/rename via Um. */
function CodeOfficialChapterItem({
  item,
  sessionId,
}: {
  item: Extract<TranscriptEntryItem, { kind: "chapter" }>;
  sessionId?: string;
}) {
  const hidden = useOfficialChapterHidden(sessionId, item.id);
  const renamedTitle = useOfficialChapterRenamedTitle(sessionId, item.id);
  if (hidden) return null;
  const title = (renamedTitle ?? item.title) || "Chapter";
  return (
    <div
      className="text-body-semibold text-primary select-text scroll-mt-[56px]"
      data-official-source="cd5a31703-B4nKQMBN.js:Lh + zh"
      id={officialChapterDomId(item.id)}
    >
      {title}
      {item.summary ? (
        <div className="text-body text-secondary font-normal mt-p2">{item.summary}</div>
      ) : null}
    </div>
  );
}

function officialThinkingQuoteMarkdown(text: string) {
  return `> **Thinking** (~${Math.round(text.length / 4)} tok)\n>\n${text.split("\n").map((line) => (line.length > 0 ? `> ${line}` : ">")).join("\n")}`;
}

function OfficialThinkingCopyQuote({
  placement = "hover",
  text,
}: {
  placement?: "action" | "hover";
  text: string;
}) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void copyOfficialMessagePlain(officialThinkingQuoteMarkdown(text)).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  const button = (
    <OfficialButton
      ariaLabel={copied ? actionsText.copied : actionsText.copyAsQuote}
      icon={copied ? "Check" : "Copy"}
      onClick={copy}
      preferFont
      size="base"
      variant="ghost"
    />
  );
  if (placement === "action") {
    return (
      <div
        aria-label={actionsText.thinkingActions}
        className="flex h-[1lh] shrink-0 items-center"
        data-official-source="cd5a31703-B4nKQMBN.js:YX"
        role="toolbar"
      >
        {button}
      </div>
    );
  }
  return (
    <div
      aria-label={actionsText.thinkingActions}
      className="absolute right-0 top-0 opacity-0 pointer-events-none group-hover/thinking:opacity-100 group-hover/thinking:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto"
      data-official-source="cd5a31703-B4nKQMBN.js:nQe"
      role="toolbar"
    >
      {button}
    </div>
  );
}

function OfficialY1ThinkingLines({ lines }: { lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <div className="flex flex-col gap-0.75" data-find-omitted="" data-official-source="cd5a31703-B4nKQMBN.js:Y1">
      {lines.map((line, index) => (
        <div className="text-body text-muted italic whitespace-pre-wrap break-words" key={index}>
          {line}
        </div>
      ))}
    </div>
  );
}

/** Official XX / ap.Step — thinking-mode collapsible Thought process + YX Copy as quote in the panel. */
function OfficialThoughtProcessStep({
  expansionKey,
  forceOpen = false,
  text,
}: {
  expansionKey: string;
  forceOpen?: boolean;
  text: string;
}) {
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const [open, setOpen] = useState(true);
  if (text.trim() === "") return null;
  const expanded = forceOpen || open;
  return (
    <div data-expansion-key={expansionKey}>
      <OfficialTurnStatusStep
        actions={<OfficialThinkingCopyQuote placement="action" text={text} />}
        actionsLabel={actionsText.thinkingActions}
        defaultOpen
        findOmitted
        label={actionsText.thoughtProcess}
        onOpenChange={forceOpen ? undefined : setOpen}
        open={expanded}
        source="cd5a31703-B4nKQMBN.js:XX"
        state="done"
      >
        {text}
      </OfficialTurnStatusStep>
    </div>
  );
}

/** Official ZX verbose: italic body + nQe hover Copy (not Y1; Y1 is precedingThinking). */
function OfficialZxVerboseThinking({ text }: { text: string }) {
  if (text.trim() === "") return null;
  return (
    <div className="group/thinking relative" data-official-source="cd5a31703-B4nKQMBN.js:ZX">
      <div className="text-body text-muted italic whitespace-pre-wrap break-words pr-[calc(var(--cds-h-control)+var(--cds-pad-xs))]">
        {text}
      </div>
      <OfficialThinkingCopyQuote text={text} />
    </div>
  );
}

/** Official ZX: thinking mode → XX Step; verbose → italic + nQe. */
const CodeThinkingBlock = memo(function CodeThinkingBlock({
  expansionKey,
  text,
  transcriptMode,
}: {
  expansionKey?: string;
  text: string;
  transcriptMode: OfficialTranscriptMode;
}) {
  if (!officialTranscriptModeShowsThinking(transcriptMode)) return null;
  if (transcriptMode === "thinking") {
    return <OfficialThoughtProcessStep expansionKey={expansionKey ?? "thinking"} forceOpen={false} text={text} />;
  }
  return <OfficialZxVerboseThinking text={text} />;
});

/** Official X1({tools}) vs Y1({lines}) for precedingThinking. */
function OfficialPrecedingThinkingLines({
  expansionKey,
  lines,
  transcriptMode = "normal",
}: {
  expansionKey?: string;
  lines: string[];
  transcriptMode?: OfficialTranscriptMode;
}) {
  if (lines.length === 0) return null;
  if (transcriptMode === "thinking") {
    return (
      <div className="contents" data-official-source="cd5a31703-B4nKQMBN.js:X1">
        {lines.map((line, index) => (
          <OfficialThoughtProcessStep
            expansionKey={`${expansionKey ?? "thinking"}:thinking:${index}`}
            key={index}
            text={line}
          />
        ))}
      </div>
    );
  }
  return <OfficialY1ThinkingLines lines={lines} />;
}

// Mode helpers live in officialTranscriptMode.ts (residual pr/xc; unit-tested).
export {
  officialTranscriptModeExpandsDetails,
  officialTranscriptModeShowsThinking,
} from "./officialTranscriptMode";

/** Official DX: completed Artifact publish/open with surface input → kX instead of Zg. */
function officialDxArtifactSurface(tool: TranscriptToolUse) {
  if (!isOfficialArtifactTool(tool.name) || tool.status !== "completed" || tool.isError) return false;
  const extracted = extractOfficialArtifactSurface(tool);
  return Boolean(extracted?.isSurfaceInput && extracted.filePath);
}

function OfficialStandaloneArtifactSurface({ tool }: { tool: TranscriptToolUse }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  return (
    <OfficialArtifactSurfaceCard
      onOpenPath={actions ? (path: string) => actions.openFile({ path }) : undefined}
      tool={tool}
    />
  );
}

function OfficialStandaloneWorkflowSurface({ tool }: { tool: TranscriptToolUse }) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  return <OfficialWorkflowSurfaceCard onOpenTasks={actions?.openTasks} tool={tool} />;
}

/**
 * Official t2e specials that replace Zg for a 1-tool standalone run.
 * kQe AskUser TIe · TH SendUserMessage as-words · DX Artifact kX · E1 Workflow · IBe leftovers.
 */
function officialStandaloneSpecialCard(tool: TranscriptToolUse): ReactNode | null {
  if (officialDxArtifactSurface(tool)) return <OfficialStandaloneArtifactSurface tool={tool} />;
  if (isOfficialSendUserMessageAsWords(tool)) return <OfficialSendUserMessageWords tool={tool} />;
  if (officialAskUserTranscriptPairs(tool)) return <OfficialAskUserTranscriptCard tool={tool} />;
  if (officialWorkflowT1(tool)) return <OfficialStandaloneWorkflowSurface tool={tool} />;
  const ibe = officialIbeStandaloneKind(tool);
  if (ibe && ibe !== "push_notification") return <OfficialIbeStandaloneCard tool={tool} />;
  return null;
}

function wrapStandaloneToolWithPrecedingThinking(
  tools: TranscriptToolUse[],
  transcriptMode: OfficialTranscriptMode,
  key?: string,
  liveTail = false,
) {
  const head = tools[0];
  if (!head) return null;
  const showThinking = officialTranscriptModeShowsThinking(transcriptMode);
  const thinking = showThinking ? head.precedingThinking : undefined;
  const rowKey = key ?? `${head.id}:zg`;
  const coalescedRun = tools.length > 1 ? tools : undefined;
  const stripped = thinking ? { ...head, precedingThinking: undefined } : head;
  const special = tools.length === 1 ? officialStandaloneSpecialCard(stripped) : null;
  const row = special
    ? <div className="contents" key={rowKey}>{special}</div>
    : (
      <OfficialToolRow
        coalescedRun={coalescedRun}
        inGroup={tools.length > 1}
        key={rowKey}
        liveTail={liveTail}
        tool={stripped}
        transcriptMode={transcriptMode}
      />
    );
  if (!thinking?.length) return row;
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" key={rowKey}>
      <OfficialPrecedingThinkingLines expansionKey={head.id} lines={thinking} transcriptMode={transcriptMode} />
      {row}
    </div>
  );
}

function AssistantToolsBlock({
  item,
  liveTail = false,
  transcriptMode = "normal",
}: {
  item: Extract<TranscriptEntryItem, { kind: "tools" }>;
  liveTail?: boolean;
  transcriptMode?: OfficialTranscriptMode;
}) {
  const showThinking = officialTranscriptModeShowsThinking(transcriptMode);
  const runs = groupOfficialToolRuns(item.tools, item.taskEvents);
  const lastIndex = runs.length - 1;
  const paintRun = (run: OfficialToolRunGroup, index: number) => {
    const runLiveTail = liveTail && index === lastIndex;
    // Official B1/HC: 1 tool or same-file coalesce → t2e/Zg; else o2e.
    // Live 1→N remounts Zg→o2e (official).
    const bare = officialRendersBareRow({
      memoryOps: run.memoryOps,
      showThinking,
      taskEvents: run.taskEvents,
      tools: run.tools,
    });
    return bare
      ? wrapStandaloneToolWithPrecedingThinking(run.tools, transcriptMode, runs.length === 1 ? undefined : run.id, runLiveTail)
      : (
        <OfficialToolGroup
          key={run.tools[0]?.id ?? run.id}
          liveTail={runLiveTail}
          memoryOps={run.memoryOps}
          taskEvents={run.taskEvents}
          tools={run.tools}
          transcriptMode={transcriptMode}
        />
      );
  };
  if (runs.length === 1) return paintRun(runs[0]!, 0);
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full">
      {runs.map((run, index) => paintRun(run, index))}
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
  "Artifact",
  "Workflow",
  "ReportFindings",
  "ClaudeDesign",
  "PushNotification",
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

type OfficialToolGroupSummaryText = Record<keyof typeof TOOL_GROUP_SUMMARY_MESSAGES, string>;

function officialMemorySummaryPieces(ops: OfficialMemoryOps, text: OfficialToolGroupSummaryText): ToolSummaryPiece[] {
  // Official ca80 `dR`: verb FyGldNBVoJ/dxFzERrTJq + meta iezAjNRKVQ `{n, plural, one {a memory} other {# memories}}`.
  const pieces: ToolSummaryPiece[] = [];
  const recalled = ops.read + ops.search;
  if (recalled > 0) pieces.push({ meta: formatOfficialIcu(text.memories, { n: recalled }), verb: text.recalled });
  if (ops.write > 0) pieces.push({ meta: formatOfficialIcu(text.memories, { n: ops.write }), verb: text.saved });
  return pieces.length ? pieces : [{ meta: "memories", verb: "used" }];
}

function OfficialToolGroup({
  liveTail = false,
  memoryOps,
  taskEvents,
  tools,
  transcriptMode = "normal",
}: {
  liveTail?: boolean;
  memoryOps?: OfficialMemoryOps;
  taskEvents?: OfficialToolGroupTaskEvent[];
  tools: TranscriptToolUse[];
  transcriptMode?: OfficialTranscriptMode;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const text = useI18nText(TOOL_GROUP_SUMMARY_MESSAGES);
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const showThinking = officialTranscriptModeShowsThinking(transcriptMode);
  // Official cc6e9624e `_` / cd5a `dS(Te)` — Te = first tool id. Live append must not reset.
  const groupKey = tools[0]?.id ?? "";
  const defaultExpanded = officialToolGroupDefaultExpanded(tools);
  const [expanded, setExpanded] = useOfficialToolGroupExpanded(actions?.sessionId, groupKey, defaultExpanded);

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

  const summary = memoryOps ? officialMemorySummaryPieces(memoryOps, text) : officialToolSummaryPieces(tools, text);
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
    setExpanded(!expanded);
  };

  // Official early return: thinking runs replace the single iv card.
  if (thinkingRuns) {
    return (
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="cd5a31703-B4nKQMBN.js:iv thinking runs">
        {thinkingRuns.map((run) => (
          <Fragment key={run.tools[0]?.id ?? `thinking-run-${run.start}`}>
            {run.thinking?.length ? (
              <OfficialPrecedingThinkingLines
                expansionKey={run.tools[0]?.id}
                lines={run.thinking}
                transcriptMode={transcriptMode}
              />
            ) : null}
            <OfficialToolGroup
              key={run.tools[0]?.id ?? `thinking-run-${run.start}`}
              liveTail={liveTail}
              taskEvents={run.taskEvents}
              tools={run.tools}
              transcriptMode={transcriptMode}
            />
          </Fragment>
        ))}
      </div>
    );
  }

  // Official B1/HC: same-file coalesce or a single tool → t2e/Zg, not the iv group card.
  if (officialRendersBareRow({ memoryOps, showThinking, taskEvents, tools })) {
    return wrapStandaloneToolWithPrecedingThinking(tools, transcriptMode, undefined, liveTail);
  }

  const groupCard = (
    <div className="flex flex-col w-full" data-official-source="cd5a31703-B4nKQMBN.js:o2e">
      <button
        aria-expanded={isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-0.5 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm"
        onClick={toggle}
        type="button"
      >
        {isRunning ? <span className="sr-only">running</span> : null}
        <OfficialAnimatedToolLabel
          className={`inline-flex items-center gap-1 min-w-0 ${isRunning ? "" : isAwaitingApproval ? "text-secondary group-hover/tool:text-primary" : officialSettledToolVerbClass}`}
          mode="wait"
          morphKey={runningSummary ? "busy" : "settled"}
        >
          {runningSummary ? (
            <>
              <OfficialTextShine className="text-body epitaxy-text-shine shrink-0">{runningSummary.runningVerb}</OfficialTextShine>
              {runningSummary.meta ? <span className="text-body truncate min-w-0">{runningSummary.meta}</span> : null}
            </>
          ) : (
            <>
              <span className="text-body truncate min-w-0" data-testid="counted-line-names">{summary.map(renderToolSummaryPiece)}</span>
              {isAwaitingApproval ? <span className="text-body text-warning shrink-0">Needs approval</span> : null}
            </>
          )}
        </OfficialAnimatedToolLabel>
        <ToolChevron colorClassName={officialSettledToolVerbClass} expanded={isExpanded} />
      </button>
      <OfficialCollapse expanded={isExpanded}>
        <div className="flex flex-col epitaxy-card-outline-layer rounded-lg overflow-clip mt-pad-md divide-y [&>*]:px-2.5 [&>*]:py-md">
          {tools.map((tool, index) => (
            <Fragment key={tool.id}>
              {taskEventsByIndex?.get(index)?.length
                ? <CodeTaskEventRun events={taskEventsByIndex.get(index)!} inGroup key={`ev-${index}`} />
                : null}
              <OfficialToolRow
                inGroup
                key={`${tool.id}:zg`}
                liveTail={liveTail && index === tools.length - 1}
                tool={tool}
                transcriptMode={transcriptMode}
              />
            </Fragment>
          ))}
          {taskEventsByIndex?.get(tools.length)?.length
            ? <CodeTaskEventRun events={taskEventsByIndex.get(tools.length)!} inGroup />
            : null}
        </div>
      </OfficialCollapse>
    </div>
  );

  if (memoryPrecedingThinking?.length) {
    return (
      <div className="flex flex-col gap-[var(--chat-item-gap)] w-full" data-official-source="cd5a31703-B4nKQMBN.js:iv memory precedingThinking">
        <OfficialPrecedingThinkingLines expansionKey={tools[0]?.id} lines={memoryPrecedingThinking} transcriptMode={transcriptMode} />
        {groupCard}
      </div>
    );
  }
  return groupCard;
}

function OfficialToolRow({
  coalescedRun,
  inGroup = false,
  liveTail = false,
  tool,
  transcriptMode = "normal",
}: {
  coalescedRun?: TranscriptToolUse[];
  inGroup?: boolean;
  liveTail?: boolean;
  tool: TranscriptToolUse;
  transcriptMode?: OfficialTranscriptMode;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const summary = useMemo(() => officialToolRowSummary(tool), [tool]);
  // Official Zg C: diffMeta for Write/Edit when !error.
  const diffMeta = useMemo(
    () => (summary.kind === "diff" ? buildOfficialToolDiffMeta(tool) : null),
    [summary.kind, tool],
  );
  const isVerbose = officialTranscriptModeExpandsDetails(transcriptMode);
  const hasDetails = hasToolDetails(tool, summary, !inGroup, !isVerbose);
  const isQuestionPrompt = summary.kind === "question" && typeof tool.output !== "string" && !tool.isError;
  // Official Zg: `[d,u]=e.useState(!1)` then `f=o||d||l` (verbose || local || question).
  const [rowExpanded, setRowExpanded] = useState(false);
  const isExpanded = isVerbose || rowExpanded || isQuestionPrompt;
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
    setRowExpanded(!rowExpanded);
  };
  const coalescedTools = coalescedRun && coalescedRun.length > 1 ? coalescedRun : undefined;
  const turnLive = useOfficialTurnLive();
  const actionsText = useI18nText(MESSAGE_ACTION_MESSAGES);
  const toolsForMark = coalescedTools ?? [tool];
  const nm = officialNmMark(
    turnLive,
    isRunning
      ? { key: tool.id, toolIds: toolsForMark.map((entry) => entry.id), wireRunning: true }
      : undefined,
    liveTail && tool.status === "completed" && !isError,
  );
  const tailHeld = nm.tailHeld;
  const blocked = nm.showsBlocked;
  const busyLabel = blocked
    ? actionsText.needsYourInput
    : isRunning
      ? summary.runningVerb
      : isError && summary.failedVerb
        ? summary.failedVerb
        : summary.verb;
  const zjWord = nm.marked && !blocked && typeof busyLabel === "string" ? officialQj(busyLabel) : null;
  const zj = useOfficialZjFace(zjWord);
  const tree = zj.kind === "tree";
  /**
   * Official c734 `ye` line: `St(w)` when `w` (busyStepKeys) is passed,
   * else `xt(E)` sibling busy keys. Tool row hang uses this tool's id.
   */
  const hangVisual = blocked ? "blocked" : isRunning || tailHeld ? "busy" : "done";
  const hangEmptyBody = !hasDetails;
  const hangFace = useOfficialHangFace(hangVisual, officialHangFaceKey(hangVisual, busyLabel), {
    hangMark: nm.marked,
    line: hangVisual === "busy" && !hangEmptyBody ? officialHangBusyLine(toolsForMark.map((entry) => entry.id)) : undefined,
    minMs: (current) => (current === "busy" && hangVisual === "busy" ? (hangEmptyBody ? undefined : OFFICIAL_HANG_BUSY_BODY_MIN_MS) : 0),
    restretch: hangVisual === "busy" || hangVisual === "blocked" || nm.marked,
    settleMs: nm.marked || hangVisual === "busy" || hangVisual === "blocked" ? 250 : 0,
  });
  const hangBusy = hangFace.value === "busy";
  /**
   * Official aM: shine only while `nM.marked` (`l`). Unmounting aM drops busy
   * paint immediately — Qk restretch must not keep `epitaxy-text-shine` on Ran.
   */
  const shineBusy = Boolean(nm.marked && !blocked && !tree && hangBusy);
  const hang = (nm.marked && (hangBusy || blocked)) || hangFace.hang;
  const details = hasDetails ? (
    <OfficialCollapse expanded={isExpanded}>
      {coalescedTools ? (
        <div className="flex flex-col gap-0.75" data-official-source="cd5a31703-B4nKQMBN.js:vB coalescedRun">
          {coalescedTools.map((entry) => (
            <OfficialToolDetails
              diffMeta={entry.id === tool.id ? diffMeta : (officialToolRowKind(entry.name) === "diff" ? buildOfficialToolDiffMeta(entry) : null)}
              key={entry.id}
              tool={entry}
            />
          ))}
        </div>
      ) : (
        <OfficialToolDetails diffMeta={diffMeta} tool={tool} />
      )}
      {inGroup ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
    </OfficialCollapse>
  ) : null;
  return (
    <div
      className="flex flex-col w-full"
      data-hang={hang ? "" : undefined}
      data-live-tail={tailHeld ? "" : undefined}
      data-official-source={tailHeld ? "cd5a31703-B4nKQMBN.js:aM" : undefined}
      data-parked={nm.parked ? "" : undefined}
      data-zj={zj.kind}
    >
      <div
        aria-expanded={opensSubagent || !hasDetails ? undefined : isExpanded}
        className="relative group/tool flex self-start max-w-full items-center py-0 gap-0.75 text-left focus-visible:outline-hidden hide-focus-ring focus-visible:shadow-focus rounded-sm"
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
          className={`shrink-0 ${shineBusy ? "text-body epitaxy-text-shine" : blocked ? "text-body text-muted" : isError ? "text-body text-danger" : `text-body ${officialSettledToolVerbClass}`}`}
          morphKey={blocked ? "blocked" : shineBusy ? "busy" : "settled"}
        >
          {zj.kind === "rewritten" ? zj.label : tree && zj.kind === "tree" ? zj.label : busyLabel}
        </OfficialAnimatedToolLabel>
        {tool.subagentActivity?.model ? <span className="text-body text-secondary shrink-0">{tool.subagentActivity.model}</span> : null}
        {tool.subagentActivity ? (
          <span className="text-body text-secondary truncate min-w-0">
            {tool.subagentActivity.model ? "· " : ""}{tool.subagentActivity.latestToolName ?? tool.name} · {tool.subagentActivity.toolCallCount ?? 0}
          </span>
        ) : isAwaitingApproval && !blocked ? <span className="text-body text-warning shrink-0">Needs approval</span> : null}
        {!tool.subagentActivity && !isAwaitingApproval && summary.meta ? (
          metaHref ? (
            <a className="text-body text-primary truncate min-w-0" href={metaHref} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()} rel="noreferrer" target="_blank">{summary.meta}</a>
          ) : (
            <span className={officialToolRowMetaClassName(summary)}>{summary.meta}</span>
          )
        ) : null}
        {shineBusy ? <span className="sr-only">running</span> : null}
        {tree ? <OfficialThinkingSpark className="shrink-0" size={14} /> : null}
        {/* Official qIe inner o2e rows (inGroup): no Yj. Elapsed is Gv / aM turnRow only.
            Inserting `{n}s` here shifts chevrons when a new Running row lands. */}
        {!inGroup && nm.marked && !nm.parked && !tree ? <OfficialAmElapsedSeconds /> : null}
        {/* Official Vg+Xg: settled diff counts after meta. aM busy trailing omits diff. */}
        {showDiffBadge && diffMeta && !tailHeld ? (
          <OfficialToolDiffBadge
            adds={diffMeta.counts.additions}
            dels={diffMeta.counts.deletions}
            flashOnMount={flashDiffBadgeRef.current}
          />
        ) : null}
        {hasDetails ? <ToolChevron colorClassName={isError ? "text-danger" : officialSettledToolVerbClass} expanded={isExpanded} /> : null}
      </div>
      {details}
      {showImagesOutsideCollapse ? <OfficialToolOutputImages images={tool.outputImages} /> : null}
    </div>
  );
}

/**
 * Official c425 `F` (`_y`): keep the body after first expand, toggle `hidden`.
 * Class is `epitaxy-expanding-body` (+ `flow-root` while open). No motion spring —
 * Fu ResizeObserver must not restretch the sizer for 350ms on every tool collapse.
 */
function OfficialCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const [mounted, setMounted] = useState(expanded);
  if (expanded && !mounted) setMounted(true);
  if (!mounted) return null;
  return (
    <div
      className={expanded ? "epitaxy-expanding-body flow-root" : "epitaxy-expanding-body"}
      data-official-source="c425fb3cf-C8q5-d1_.js:F"
      hidden={!expanded}
    >
      {children}
    </div>
  );
}

/**
 * Residual cca089 epitaxy-text-shine is pure CSS. After leave/return or compositor
 * freeze, infinite CSS animation can stick while WAAPI spark re-arms — re-kick the
 * residual animation without inventing a second shimmer class.
 */
function useResidualTextShineKick(active: boolean) {
  const ref = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (!active) return undefined;
    const kick = () => {
      const node = ref.current;
      if (!node) return;
      const prev = node.style.animation;
      node.style.animation = "none";
      void node.offsetWidth;
      node.style.animation = prev;
    };
    kick();
    const onVis = () => {
      if (document.visibilityState === "visible") kick();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", kick);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", kick);
    };
  }, [active]);
  return ref;
}

/** Residual plain shine span (grouped running verb / waiting tasks). */
function OfficialTextShine({ children, className }: { children: ReactNode; className: string }) {
  const shine = className.includes("epitaxy-text-shine");
  const ref = useResidualTextShineKick(shine);
  return (
    <span className={className} ref={ref as RefObject<HTMLSpanElement>}>
      {children}
    </span>
  );
}

/**
 * Official shared-frame `Jk` / cd5a `cv`: stacked morph (`inline-grid` +
 * `col-start-1 row-start-1`). Leaving face is frozen (`Kk`) and aria-hidden.
 * AnimatePresence popLayout laid verbs side-by-side → live `RanRan`.
 */
function OfficialAnimatedToolLabel({ children, className, morphKey }: { children: ReactNode; className: string; mode?: "popLayout" | "sync" | "wait"; morphKey: string }) {
  const reducedMotion = useReducedMotion();
  const [shown, setShown] = useState(morphKey);
  const [leaving, setLeaving] = useState<string[]>([]);
  const frozen = useRef(new Map<string, { children: ReactNode; className: string }>());
  frozen.current.set(morphKey, { children, className });
  let stacked = leaving;
  if (shown !== morphKey) {
    stacked = reducedMotion
      ? []
      : [...leaving.filter((key) => key !== morphKey && key !== shown), shown].slice(-2);
    setShown(morphKey);
    setLeaving(stacked);
  }
  const shineRef = useResidualTextShineKick(className.includes("epitaxy-text-shine") && !reducedMotion);
  const keys = reducedMotion ? [morphKey] : [...stacked.filter((key) => key !== morphKey), morphKey];
  return (
    <span className="group/morph inline-grid min-w-0 items-center justify-items-start" data-official-source="shared-frame-DVFSKIcx.js:Jk">
      {keys.map((key) => {
        const face = frozen.current.get(key);
        if (!face) return null;
        const current = key === morphKey;
        return (
          <motion.span
            animate={current ? { opacity: 1, y: 0 } : { opacity: 0, y: -3 }}
            aria-hidden={current ? undefined : true}
            className={`col-start-1 row-start-1 flex min-w-0 max-w-full items-center ${face.className}${current ? "" : " w-0 overflow-hidden invisible"}`}
            data-morph-key={key}
            initial={current && stacked.length > 0 && !reducedMotion ? { opacity: 0, y: 3 } : false}
            key={key}
            onAnimationComplete={() => {
              if (current) return;
              setLeaving((keys) => keys.filter((entry) => entry !== key));
            }}
            ref={current ? shineRef as never : undefined}
            transition={{ duration: 0.18, ease: [0.2, 0, 0, 1] }}
          >
            {face.children}
          </motion.span>
        );
      })}
    </span>
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

/** Official c425 `Q`/`jy` — CaretRight 14, rotate when open; color is yy/Ly not assistant-secondary. */
const officialSettledToolVerbClass =
  "text-muted group-hover/tool:text-secondary group-focus-visible/tool:text-secondary group-has-[:focus-visible]/tool:text-secondary";

function ToolChevron({
  colorClassName = officialSettledToolVerbClass,
  expanded,
}: {
  colorClassName?: string;
  expanded: boolean;
}) {
  return (
    <span className={`shrink-0 ${colorClassName}`}>
      <Icon
        className={`transition-transform duration-fast motion-reduce:transition-none ${expanded ? "rotate-90" : ""}`}
        customSize={14}
        name="CaretRight"
      />
    </span>
  );
}

type OfficialToolRowKind = "bash" | "diff" | "file" | "plan" | "question" | "text" | "todos";

type OfficialToolRowSummary = {
  failedVerb?: string;
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
  const ran = "Ran";
  const read = "Read";
  const running = "Running";
  const reading = "Reading";
  switch (tool.name) {
    case "Bash":
    case "BashTool": {
      const command = inputString("command");
      const recognized = command && !tool.isError ? officialRecognizedBashAction(command, tool.output) : null;
      if (recognized) {
        const recognizedVerbs = officialBashActionVerbs(recognized);
        return {
          ...recognizedVerbs,
          kind,
          meta: recognized.meta ?? inputString("description") ?? command,
          metaHref: recognized.kind === "pr" ? recognized.url : undefined,
          metaIsCode: recognized.meta !== undefined,
        };
      }
      return { kind, meta: inputString("description") ?? command, runningVerb: running, verb: ran };
    }
    case "Read":
      return { kind, meta: basename(inputString("file_path")), runningVerb: reading, verb: read };
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
      // Official c52b02f3f: verb qha/thgxcv, running lYgHzdY14t, failed BOOK2kUerX.
      return { failedVerb: "Failed to start planning", kind, runningVerb: "Making a plan", verb: "Started planning" };
    case "ExitPlanMode":
      // Official c52b02f3f: verb OOujErWXBR, running WZ2fCj8VUf, failed TBvKNM6xbZ.
      return { failedVerb: "Failed to propose plan", kind, runningVerb: "Proposing plan", verb: "Proposed plan" };
    case "AskUserQuestion": {
      const questions = Array.isArray(input.questions) ? input.questions : [];
      const firstQuestion = asRecord(questions[0]);
      return { kind, meta: stringValue(firstQuestion.header) ?? (questions.length > 1 ? `${questions.length} questions` : undefined), runningVerb: "Asking", verb: "Asked" };
    }
    case "SendUserMessage":
    case "SendUserFile":
      return { kind, runningVerb: "Sending", verb: "Sent" };
    case "Workflow":
      return { failedVerb: "Failed to run workflow", kind, runningVerb: "Running workflow", verb: "Ran workflow" };
    case "ReportFindings":
      return { failedVerb: "Failed to report review findings", kind, runningVerb: "Reporting review findings", verb: "Reported review findings" };
    case "ClaudeDesign":
      return { failedVerb: "Failed to use Claude Design", kind, runningVerb: "Using Claude Design", verb: "Used Claude Design" };
    case "PushNotification": {
      const unsent = typeof tool.output === "string" && /not sent/i.test(tool.output);
      return {
        failedVerb: "Failed to send notification",
        kind,
        meta: inputString("message"),
        runningVerb: "Sending notification",
        verb: unsent ? "Notification not sent" : "Sent notification",
      };
    }
    case "Artifact": {
      const published = officialArtifactPublishedVerb(tool.status, tool.isError);
      const filePath = officialArtifactFilePath(input, tool.output);
      if (isOfficialArtifactSurfaceInput(input)) {
        return {
          failedVerb: "Failed to publish artifact",
          kind,
          meta: filePath,
          metaIsCode: true,
          runningVerb: "Publishing artifact",
          verb: published.text,
        };
      }
      const action = inputString("action");
      if (action === "list") {
        return { failedVerb: "Failed to list artifacts", kind, runningVerb: "Listing artifacts", verb: "Listed artifacts" };
      }
      if (action === "pin") {
        return { failedVerb: "Failed to pin artifact", kind, runningVerb: "Pinning artifact", verb: "Pinned artifact" };
      }
      if (action === "unpin") {
        return { failedVerb: "Failed to unpin artifact", kind, runningVerb: "Unpinning artifact", verb: "Unpinned artifact" };
      }
      return { kind, meta: filePath, metaIsCode: true, runningVerb: published.text, verb: published.text };
    }
    default: {
      const label = tool.name.startsWith("mcp__") ? tool.name.split("__").at(-1)?.replace(/_/g, " ") ?? tool.name : tool.name;
      return { kind, runningVerb: `Using ${label}`, verb: `Used ${label}` };
    }
  }
}

function officialToolRowMetaClassName(summary: OfficialToolRowSummary) {
  return summary.kind === "diff" || summary.kind === "file" || summary.metaIsCode
    ? "text-body text-primary truncate min-w-0"
    : "text-body text-secondary truncate min-w-0";
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

function officialToolSummaryPieces(tools: TranscriptToolUse[], text: OfficialToolGroupSummaryText): ToolSummaryPiece[] {
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
  const pieces = order.flatMap((kind) => officialToolKindSummary(kind, counts.get(kind) ?? 0, errors.get(kind), text));
  // Official c05b unknown-tool group — full sentence in verb (BRG8o6gNdU / JtrYJ8F4gT), no invent `used 1 tool`.
  if (otherCount > 0) {
    pieces.push({
      isError: otherError,
      verb: otherCount === 1 ? text.usedATool : formatOfficialIcu(text.usedCountTools, { count: otherCount }),
    });
  }
  return pieces.length
    ? pieces
    : [{
        verb: tools.length === 1
          ? text.usedATool
          : formatOfficialIcu(text.usedCountTools, { count: tools.length }),
      }];
}

function renderToolSummaryPiece(piece: ToolSummaryPiece, index: number) {
  const verb = index === 0 ? capitalize(piece.verb) : piece.verb;
  return (
    <span key={`${piece.verb}-${piece.meta ?? index}`}>
      {index > 0 ? <span>, </span> : null}
      <span className={piece.isError ? "text-body text-danger" : "text-body"} data-failed={piece.isError || undefined}>{verb}</span>
      {piece.meta ? (
        <span className="data-[tone=danger]:text-danger" data-tone={piece.isError ? "danger" : undefined}> {piece.meta}</span>
      ) : null}
    </span>
  );
}

/**
 * Official shared-125 `Zg` tool-group settled labels (full sentence in verb, no meta):
 *   bash:  cv9VNYMHXY / LVG1dX6B8u
 *   task:  WSkLyhVgSu / X9Z2S33opa
 *   read/view: MVQTRBWYud / cPnivFkT6E
 *   write: tTVI3GQeyu / 14+jcDS33B
 *   edit:  wT63jkA9qK / y5DX5NCmrm
 *   delete_file: MM7OHMBA9j / 242T21lCRb
 *   glob:  8XsqEcZQPV (no count)
 *   grep:  ZdOS6uyq8n (no count)
 *   web:   4+310Bnuvz
 *   skill: 0AQGELjf8F / QE4MKdaawu
 *   todo:  sdr9aWC1S/
 * unknown: BRG8o6gNdU / JtrYJ8F4gT (officialToolSummaryPieces, not a kind)
 * notebook_edit leftover did not name a catalog id — leave verb+meta as-is.
 */
function officialToolKindSummary(kind: string, count: number, isError: boolean | undefined, text: OfficialToolGroupSummaryText): ToolSummaryPiece[] {
  switch (kind) {
    case "bash":
      return [{
        isError,
        verb: count === 1 ? text.ranACommand : formatOfficialIcu(text.ranCountCommands, { count }),
      }];
    case "read":
    case "view":
      return [{
        isError,
        verb: count === 1 ? text.readAFile : formatOfficialIcu(text.readCountFiles, { count }),
      }];
    case "write":
      return [{
        isError,
        verb: count === 1 ? text.createdAFile : formatOfficialIcu(text.createdCountFiles, { count }),
      }];
    case "edit":
      return [{
        isError,
        verb: count === 1 ? text.editedAFile : formatOfficialIcu(text.editedCountFiles, { count }),
      }];
    case "notebook_edit":
      return [{ isError, meta: officialCountNoun(count, "notebook", "notebooks", "a"), verb: "edited" }];
    case "delete_file":
      return [{
        isError,
        verb: count === 1 ? text.deletedAFile : formatOfficialIcu(text.deletedCountFiles, { count }),
      }];
    case "grep":
      return [{ isError, verb: text.searchedFiles }];
    case "glob":
      return [{ isError, verb: text.lookedForFiles }];
    case "web":
      return [{ isError, verb: text.searchedTheWeb }];
    case "task":
      return [{
        isError,
        verb: count === 1 ? text.ranAnAgent : formatOfficialIcu(text.ranCountAgents, { count }),
      }];
    case "todo":
      return [{ isError, verb: text.updatedTasks }];
    case "skill":
      return [{
        isError,
        verb: count === 1 ? text.loadedASkill : formatOfficialIcu(text.loadedCountSkills, { count }),
      }];
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

function hasToolDetails(
  tool: TranscriptToolUse,
  summary: OfficialToolRowSummary,
  hoistImages = true,
  shortToolBodies = true,
) {
  // Official qIe `pe` / c52b02f3f `xn` oy: running+empty input has no body.
  // cb6930 `ll` Ev: shortToolBodies default on (`Zt=!verbose && be()`); empty-says catalog.
  if ((tool.status === "running" || tool.status === "awaiting_approval") && Object.keys(tool.input).length === 0) {
    return false;
  }
  if (officialEvEmptyBody(tool, hoistImages, shortToolBodies)) return false;
  if (summary.kind === "todos") return officialTodoItems(tool.input).length > 0;
  if (summary.kind === "plan") return typeof tool.input.plan === "string" && tool.input.plan.length > 0;
  if (summary.kind === "question") {
    const raw = Array.isArray(tool.input.questions) ? tool.input.questions : [];
    return raw.some((item) => {
      const question = asRecord(item).question;
      return typeof question === "string" && question.length > 0;
    });
  }
  if (summary.kind === "diff") return true;
  if (tool.name === "Bash" || tool.name === "BashTool") {
    return Boolean(stringValue(tool.input.command) || tool.output);
  }
  if (tool.name === "Read" && tool.output && !tool.isError) return true;
  if (isOfficialSendUserFileTool(tool.name) && parseOfficialSendUserFileCard(tool)) return true;
  return officialSxGenericKeys(tool.input).length > 0 || Boolean(tool.output);
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
  const showsLine = officialEvShowsLine(tool, true);
  if (showsLine !== undefined) {
    return showsLine
      ? <div className="text-body text-secondary whitespace-pre-wrap break-words pt-p3" data-official-source="cb6930dae-Q_S3-FcC.js:sl">{showsLine}</div>
      : null;
  }
  // Official sx order: todos → plan → question → bash → diff+meta → file → SendUserFile tile → error/generic.
  // Artifact publish/open completed is DX/kX (wrapStandalone), not this Zg body.
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
  if (isOfficialSendUserFileTool(tool.name) && parseOfficialSendUserFileCard(tool)) {
    return (
      <OfficialSendUserFileCard
        onOpenPath={actions ? (path: string) => actions.openFile({ path }) : undefined}
        tool={tool}
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
          className={`flex items-start gap-0.75 ${todo.status === "completed" ? "line-through decoration-1 text-secondary" : "text-primary"}`}
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
  const className = "flex size-[14px] shrink-0 items-center justify-center text-primary";
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
      <div className="text-body text-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)] py-p3">
        {plan}
      </div>
    ) : null;
  }
  return (
    <div className="flex flex-col gap-0.75 py-p3">
      {tool.isError ? null : (
        <div className="flex items-center gap-0.75 text-body text-extended-green">
          <Icon name="CircleCheck" size="sm" />
          <span>Plan approved</span>
        </div>
      )}
      {plan ? (
        <div className="text-body text-secondary whitespace-pre-wrap break-words pl-p6 border-l-2 border-[var(--border-default)]">
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
    <div className="flex flex-col gap-0.75 pt-p3">
      {questions.map((question, index) => (
        <div className="text-body text-secondary [overflow-wrap:anywhere]" key={`${index}-${question.slice(0, 24)}`}>
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
          <span className="flex-1 text-body text-secondary">Bash</span>
          <ToolDetailsCopyButton text={copyText} />
        </div>
        <div className="flex flex-col gap-g8 px-p6 pb-p8 text-code">
          {command ? <div className="whitespace-pre-wrap">$ {command}</div> : null}
          {tool.output ? <div className={`whitespace-pre-wrap break-all ${tool.isError ? "text-danger" : "text-secondary"}`}>{tool.output}</div> : null}
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

const OFFICIAL_SX_GENERIC_SKIP_KEYS = new Set([
  "description",
  "file_path",
  "notebook_path",
  "command",
  "pattern",
  "path",
  "plan",
  "prompt",
  "questions",
  "todos",
]);

function officialSxGenericKeys(input: Record<string, unknown>) {
  return Object.keys(input).filter((key) => {
    if (OFFICIAL_SX_GENERIC_SKIP_KEYS.has(key)) return false;
    const value = input[key];
    if (value == null || value === "") return false;
    return true;
  });
}

/** Official sx generic catalog: skip named-kind fields; dump remaining key:value + output. */
function OfficialGenericToolDetails({ tool }: { tool: TranscriptToolUse }) {
  const inputKeys = officialSxGenericKeys(tool.input);
  const copyText = [
    ...inputKeys.map((key) => `${key}: ${inputValueText(tool.input[key])}`),
    tool.output ?? "",
  ].filter(Boolean).join("\n\n");
  if (tool.isError && tool.output) {
    return (
      <div className="group/body relative flex flex-col w-full pt-p3">
        <div className="flex w-full">
          <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body whitespace-pre-wrap break-words">
            {inputKeys.length > 0 ? <div className="text-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
            <div className="text-danger">{tool.output}</div>
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
        <div className="flex-1 min-w-0 flex flex-col gap-g4 text-body text-secondary whitespace-pre-wrap break-words">
          {inputKeys.length > 0 ? <div className="text-secondary">{inputKeys.map((key) => <ToolInputLine input={tool.input} inputKey={key} key={key} />)}</div> : null}
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
    <div className="flex flex-wrap gap-0.75 pt-p3">
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
        <div className="px-p6 pt-p5 pb-p3 text-body text-secondary">{label}</div>
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
    <button className="flex flex-1 min-w-0 text-left text-body text-secondary outline-none hide-focus-ring ring-focus hover:underline underline-offset-[3px] bg-transparent border-0 p-0 m-0 cursor-default" onClick={open} type="button">
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
      <OfficialButton ariaLabel={copied ? "Copied" : "Copy"} icon={copied ? "Check" : "Copy"} onClick={copy} preferFont size="base" variant="ghost" />
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
    <div className="relative max-w-full w-full select-text" data-official-source="cd5a31703-B4nKQMBN.js:ib">
      {command ? <OfficialUserBashCommand command={command} /> : null}
      <div
        className={`${command ? "mt-[var(--p4)]" : ""} rounded-r6 bg-t1 overflow-clip font-mono text-code max-h-[160px] overflow-y-auto px-[var(--p6)] py-[var(--p4)]`}
      >
        <pre className="m-0 text-secondary whitespace-pre-wrap break-all">
          {item.error ? (
            <span className="text-destructive-default">{item.error}</span>
          ) : item.output !== undefined ? (
            item.output || "(no output)"
          ) : (
            <span className="text-secondary">Running…</span>
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
