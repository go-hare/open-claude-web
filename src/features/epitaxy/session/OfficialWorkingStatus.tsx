/**
 * Official Gv / $8 working status + spinners (cd5a31703-B4nKQMBN).
 * Extracted from EpitaxySessionTile for componentization.
 *
 * 2.31226.1: independent Fu `kind:"running-tasks"` row is gone — task counts
 * trail Gv via status-control morphKey:"running-tasks" (TnXpPR7Rl5 / qQ8tlkeZbZ).
 */
import { memo, useContext, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import {
  useOfficialCodeSessionCompactionStatus,
  useOfficialCodeSessionPermissionSuppressed,
} from "./officialCodeSessionStore";
import {
  officialGetStreamTokenEstimate,
  officialGetTurnStartedAt,
} from "./officialStreamSessionStore";
import { OFFICIAL_SPARK_MASK_IMAGE } from "./officialSparkMaskUrl";
import { EpitaxyTranscriptActionContext } from "./epitaxyTranscriptActionContext";
import type { OfficialBackgroundTask } from "./officialTasksAndPlan";
import { RUNNING_TASKS_STATUS_MESSAGES, SESSION_LOAD_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";

/** Residual c7fe8135c size map. */
const OFFICIAL_SPARK_SIZE = { s: 12, m: 16, l: 20 } as const;

export function OfficialSpinner({
  animate = true,
  className = "",
  inheritColor = false,
  size = "m",
}: {
  animate?: boolean;
  className?: string;
  inheritColor?: boolean;
  size?: "s" | "m" | "l";
}) {
  const config = size === "s" ? { box: 12, stroke: 1.5 } : size === "l" ? { box: 20, stroke: 2 } : { box: 16, stroke: 1.75 };
  const color = inheritColor ? "currentColor" : "var(--cds-text-muted, var(--t6))";
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${config.stroke}px), #000 calc(100% - ${config.stroke - 0.5}px))`;
  return (
    <span data-cds="Spinner" className={`relative inline-block shrink-0 align-middle ${className}`} style={{ height: config.box, width: config.box }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: `${config.stroke}px solid var(--cds-border, var(--t2))` }} />
      <span className={`absolute inset-0 rounded-full ${animate ? "animate-[spin_2s_linear_infinite]" : ""}`} style={{ background: `conic-gradient(transparent 40%, ${color})`, WebkitMask: mask, mask }} />
    </span>
  );
}

/**
 * Residual SparkSpinner (c7fe8135c-COEBAMcZ):
 * - A.memo — Gv re-renders every 1s for elapsed/tokens; memo keeps sprite DOM stable so
 *   residual CSS animation (transform steps) is not interrupted by inline style re-apply
 * - mask is inline data:image/webp (not /assets path)
 * - outer span overflow-hidden; inner **div** with class epitaxy-spark-working when working
 * - CSS vars --spark-frames:84 / --spark-duration:5040ms drive residual cca089 keyframes
 * - static transform translateY(-400/84%) is residual resting frame (animation overrides while working)
 */
export const OfficialSparkSpinner = memo(function OfficialSparkSpinner({
  className = "",
  isWorking = true,
  size = "m",
}: {
  className?: string;
  isWorking?: boolean;
  size?: "s" | "m" | "l";
}) {
  const box = OFFICIAL_SPARK_SIZE[size];
  return (
    <span
      className={`inline-block overflow-hidden shrink-0 ${className ?? ""}`}
      style={{ width: box, height: box, color: "var(--accent-brand)" }}
      aria-hidden="true"
    >
      <div
        className={isWorking ? "epitaxy-spark-working" : undefined}
        style={{
          width: box,
          height: 84 * box,
          background: "currentColor",
          WebkitMaskImage: OFFICIAL_SPARK_MASK_IMAGE,
          maskImage: OFFICIAL_SPARK_MASK_IMAGE,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          "--spark-frames": 84,
          "--spark-duration": "5040ms",
          transform: `translateY(-${400 / 84}%)`,
        } as CSSProperties}
      />
    </span>
  );
});

/**
 * Residual Gv/$8 (cd5a31703): tokens/elapsed polled from je/_e maps on a 1s interval.
 * Do NOT accept a stream-tick tokenEstimate prop in the interval deps — that restarts
 * the timer every PE paint and re-renders the loader row under Fu pin.
 *
 * running-tasks trailing (TnXpPR7Rl5 / qQ8tlkeZbZ) mounts beside Gv — not a Fu row.
 */
export function OfficialWorkingStatus({
  isWorking,
  sessionId,
  spawnLabel,
  tasks = [],
}: {
  isWorking: boolean;
  sessionId?: string;
  spawnLabel?: string;
  tasks?: OfficialBackgroundTask[];
}) {
  // Residual Gv: r=ws(t) compactionStatus; o=js(t) permission pending — not full bucket.
  // Full-bucket subscribe re-rendered loader on every stream tick under Fu pin.
  const compactionStatus = useOfficialCodeSessionCompactionStatus(sessionId);
  // Official je(t): stable turn start for this sessionId — set by beginPendingTurn / stream
  // message_start (officialMarkTurnStarted), cleared on settle. Gv only READs je.
  // Product invent: mark when isWorking without je → sticky elapsed after idle and
  // poisoned isResponding when callers OR'd je into busy (empty session "43s" spark).
  const startedAt = sessionId ? officialGetTurnStartedAt(sessionId) : null;
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0
  ));
  const [tokens, setTokens] = useState(0);
  const actionContext = useContext(EpitaxyTranscriptActionContext);

  useEffect(() => {
    // Official je(t): only zero when there is no turn-start timestamp for the session.
    // Do NOT clear elapsed merely because isWorking briefly flickers when text appears.
    if (startedAt == null || !sessionId) {
      setElapsedSeconds(0);
      setTokens(0);
      return undefined;
    }
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      // Residual Gv: r(Math.round(_e.get(t)/4)) — no prop fallback that restarts the interval.
      setTokens(officialGetStreamTokenEstimate(sessionId));
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, startedAt]);

  // Official Gv: o = js(sessionId) = Jve/Efe — true while any tool permission is pending
  // (index Efe: requestsBySession[id] has status==="pending"). Product stores the pending
  // queue on session.pendingToolPermissions (resolved items are removed).
  // l = isWorking && !suppressed; d=elapsed>=2; f=compacting; p=n||d||f; opacity = p && l
  const permissionSuppressed = useOfficialCodeSessionPermissionSuppressed(sessionId);
  const sparkWorking = isWorking && !permissionSuppressed;
  const showElapsedGate = elapsedSeconds >= 2;
  const showTokens = showElapsedGate && tokens > 0;
  const compacting = compactionStatus === "compacting";
  const metaShouldShow = Boolean(spawnLabel) || showElapsedGate || compacting;
  const metaVisible = metaShouldShow && sparkWorking;

  let metaContent: ReactNode = null;
  if (spawnLabel) {
    metaContent = spawnLabel;
  } else if (compacting) {
    metaContent = (
      <span data-morph-key="compacting" data-official-source="cd5a31703-B4nKQMBN.js:Gv compacting FIEdqIul1I">
        Compacting session…
        {showElapsedGate ? <>{" · "}{formatElapsedSeconds(elapsedSeconds)}</> : null}
      </span>
    );
  } else {
    metaContent = (
      <>
        {formatElapsedSeconds(elapsedSeconds)}
        {showTokens ? (
          <>
            {" · "}
            <Icon name="ArrowDown" size="s" />
            {formatGeneratedTokenCount(tokens)} tokens
          </>
        ) : null}
      </>
    );
  }

  const taskCounts = useMemo(() => summarizeOfficialTaskCounts(tasks), [tasks]);
  const tasksTrailing = taskCounts ? (
    <OfficialRunningTasksStatusControl
      finishedCount={taskCounts.finishedCount}
      onOpenTasks={actionContext?.openTasks}
      runningCount={taskCounts.runningCount}
    />
  ) : null;

  return (
    <div className="flex items-center gap-[16px] h-h3" data-official-source="cd5a31703-B4nKQMBN.js:$8/e5 Gv">
      <OfficialSparkSpinner isWorking={sparkWorking} size="m" />
      <div className={`flex items-center text-footnote text-muted tabular-nums shrink-0 transition-opacity ${metaVisible ? "opacity-100" : "opacity-0"}`}>
        {metaContent}
      </div>
      {tasksTrailing}
    </div>
  );
}

/** Official cd5a status-control trailing — morphKey:"running-tasks" (TnXpPR7Rl5 / qQ8tlkeZbZ). */
function OfficialRunningTasksStatusControl({
  finishedCount,
  onOpenTasks,
  runningCount,
}: {
  finishedCount: number;
  onOpenTasks?: () => void;
  runningCount: number;
}) {
  const text = useI18nText(RUNNING_TASKS_STATUS_MESSAGES);
  const label =
    runningCount > 0
      ? formatOfficialIcu(text.runningTasks, { count: runningCount })
      : formatOfficialIcu(text.tasksFinished, { count: finishedCount });
  const body = (
    <span className="text-footnote text-muted tabular-nums whitespace-nowrap">{label}</span>
  );
  const shellClass =
    "epitaxy-status-control inline-flex items-center text-inherit hover:text-accent relative before:content-[''] before:absolute before:inset-x-0 before:-inset-y-[10px]";
  if (!onOpenTasks) {
    return (
      <span className={shellClass} data-official-source="cd5a31703-B4nKQMBN.js:morphKey running-tasks" data-morph-key="running-tasks">
        {body}
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onOpenTasks}
      className={`${shellClass} outline-none hide-focus-ring focus-visible:shadow-focus`}
      data-official-source="cd5a31703-B4nKQMBN.js:morphKey running-tasks TnXpPR7Rl5"
      data-morph-key="running-tasks"
    >
      {body}
    </button>
  );
}

function summarizeOfficialTaskCounts(tasks: OfficialBackgroundTask[]) {
  const runningCount = tasks.filter((task) => task.status === "running").length;
  const finishedCount = tasks.filter(
    (task) => task.status === "completed" || task.status === "failed" || task.status === "stopped",
  ).length;
  if (runningCount === 0 && finishedCount === 0) return null;
  return { runningCount, finishedCount };
}

/** Official Ph (c11959232) — always include seconds; hour branch when >= 1h. */
export function formatElapsedSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatGeneratedTokenCount(tokens: number) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

/** Official c11959232: Za = delayed(Ja, 20) before showing Loading conversation spinner. */
export function useOfficialDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active && elapsed;
}

/** Official Ja/Za loading branch — residual jd Spinner size l (NOT Ed Spark; Spark is Gv only).
 * Pin 2.31226.1: role=status + sr-only ujDQnooCch "Loading conversation"; Za delays 20ms then null.
 * Np IY7S4mLrkm lives on OfficialPendingNavFrame, not Ja.
 */
export function OfficialConversationLoading() {
  const text = useI18nText(SESSION_LOAD_MESSAGES);
  const showSpinner = useOfficialDelayedFlag(true, 20);
  if (!showSpinner) return null;
  return (
    <div role="status" className="h-full flex items-center justify-center text-t5">
      <OfficialSpinner size="l" />
      <span className="sr-only" data-intl-id="ujDQnooCch">{text.loadingConversation}</span>
    </div>
  );
}
