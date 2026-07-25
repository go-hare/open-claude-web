import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react";
import {
  desktopBridge,
  type ScheduledTaskSummary,
  type SessionSummary,
} from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialSpinner } from "../session/activity/CoworkActivitySpinner";
import { scheduledTaskDetailPath } from "../scheduled/scheduledPaths";
import { coworkSessionPath } from "../sessionPaths";
import {
  clearCoworkActiveReadState,
  markCoworkActiveSessionRead,
  readCoworkActiveReadState,
  useCoworkActiveTasksText,
  type CoworkActiveReadState,
  type CoworkActiveTasksText,
} from "./coworkActiveTasksMessages";

const ACTIVE_PREVIEW_LIMIT = 5;
const SCHEDULED_PREVIEW_LIMIT = 3;

type ActiveOverviewSession = SessionSummary & {
  /** Derived from residual YSe / isUnread / pending permissions. */
  overviewUnread: boolean;
  overviewPending: boolean;
};

/**
 * Official p6t task overview on /task/new:
 * active/pinned sessions (d6t rows + l6t status) + scheduled section.
 * Residual: index-BELzQL5P.js p6t / d6t / l6t (~6211905+).
 */
export function CoworkActiveTasksSection({
  firstTaskRef,
  onNavigate,
}: {
  firstTaskRef?: RefObject<HTMLDivElement | null>;
  onNavigate: (path: string) => void;
}) {
  const text = useCoworkActiveTasksText();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [scheduledTasks, setScheduledTasks] = useState<ScheduledTaskSummary[]>([]);
  const [readState, setReadState] = useState<CoworkActiveReadState>(() => readCoworkActiveReadState());
  const [expandedActive, setExpandedActive] = useState(false);
  const [expandedScheduled, setExpandedScheduled] = useState(false);
  // Official p6t keeps sticky membership in a ref (x.current), not React state.
  const stickyIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let active = true;
    const load = async () => {
      const [nextSessions, nextScheduled] = await Promise.all([
        desktopBridge.LocalAgentModeSessions.list().catch(() => []),
        desktopBridge.CoworkScheduledTasks?.list().catch(() => []) ?? Promise.resolve([]),
      ]);
      if (!active) return;
      setSessions(nextSessions);
      setScheduledTasks(nextScheduled);
    };
    void load();
    const unsubscribers = [
      desktopBridge.LocalAgentModeSessions.onEvent?.(() => {
        void load();
      }),
      desktopBridge.CoworkScheduledTasks?.onEvent?.(() => {
        void load();
      }),
    ];
    return () => {
      active = false;
      for (const unsubscribe of unsubscribers) unsubscribe?.();
    };
  }, []);

  const pendingSessionIds = useMemo(() => {
    const ids = new Set<string>();
    for (const session of sessions) {
      if ((session.pendingToolPermissions?.length ?? 0) > 0) ids.add(session.id);
    }
    return ids;
  }, [sessions]);

  const activeSessions = useMemo(() => {
    const filtered = filterActiveOverviewSessions(sessions, readState, stickyIdsRef.current, pendingSessionIds);
    const sorted = sortActiveOverviewSessions(filtered, readState, pendingSessionIds);
    return sorted.map((session) => toOverviewSession(session, readState, pendingSessionIds));
  }, [pendingSessionIds, readState, sessions]);

  useEffect(() => {
    stickyIdsRef.current = new Set(activeSessions.map((session) => session.id));
  }, [activeSessions]);

  const scheduled = useMemo(
    () =>
      scheduledTasks
        .filter((task) => Boolean(task.cronExpression))
        .sort((left, right) => {
          if (left.enabled !== right.enabled) return left.enabled ? -1 : 1;
          const leftNext = left.nextRunAt ? new Date(left.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
          const rightNext = right.nextRunAt ? new Date(right.nextRunAt).getTime() : Number.POSITIVE_INFINITY;
          return leftNext - rightNext;
        }),
    [scheduledTasks],
  );

  const hasUnread = useMemo(() => activeSessions.some((session) => session.overviewUnread), [activeSessions]);
  const hasPinned = useMemo(() => activeSessions.some((session) => Boolean(session.isPinned)), [activeSessions]);
  const hasRunningOrPending = useMemo(
    () => activeSessions.some((session) => session.isRunning || session.overviewPending),
    [activeSessions],
  );

  const clearActive = useCallback(() => {
    stickyIdsRef.current = new Set();
    setReadState(clearCoworkActiveReadState());
  }, []);

  const openSession = useCallback(
    (session: SessionSummary) => {
      markCoworkActiveSessionRead(session.id);
      setReadState(readCoworkActiveReadState());
      onNavigate(coworkSessionPath(session));
    },
    [onNavigate],
  );

  if (activeSessions.length === 0 && scheduled.length === 0) return null;

  const visibleActive = expandedActive ? activeSessions : activeSessions.slice(0, ACTIVE_PREVIEW_LIMIT);
  const canExpandActive = activeSessions.length > ACTIVE_PREVIEW_LIMIT;
  const visibleScheduled = expandedScheduled ? scheduled : scheduled.slice(0, SCHEDULED_PREVIEW_LIMIT);
  const canExpandScheduled = scheduled.length > SCHEDULED_PREVIEW_LIMIT;
  const sectionTitle = resolveActiveSectionTitle(text, {
    hasPinned,
    hasRunningOrPending,
  });

  return (
    <div
      className="w-full max-w-2xl mt-4 space-y-8"
      data-official-source="index-BELzQL5P.js:p6t task overview"
    >
      {activeSessions.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-2 px-2">
            <h3 className="font-small text-text-500">{sectionTitle}</h3>
            {hasUnread ? (
              <button
                className="text-xs text-text-500 hover:text-text-200 transition-colors border-0 bg-transparent p-0 cursor-default"
                onClick={clearActive}
                type="button"
              >
                {text.clearActive}
              </button>
            ) : null}
          </div>
          <div className="flex flex-col [&>*:hover+hr]:opacity-0 [&>hr:has(+*:hover)]:opacity-0">
            {visibleActive.map((session, index) => (
              <div key={session.id}>
                <TaskOverviewRow
                  containerRef={index === 0 ? firstTaskRef : undefined}
                  onOpen={openSession}
                  session={session}
                  text={text}
                />
                {index < visibleActive.length - 1 ? (
                  <hr className="border-t-0.5 border-border-300 mx-2 transition-opacity" />
                ) : null}
              </div>
            ))}
          </div>
          {canExpandActive ? (
            <button
              className="px-2 pt-2 pb-4 text-xs text-text-500/80 hover:text-text-100 transition border-0 bg-transparent cursor-default"
              onClick={() => setExpandedActive((value) => !value)}
              type="button"
            >
              {expandedActive ? text.showLess : text.showMore}
            </button>
          ) : null}
        </section>
      ) : null}

      {scheduled.length > 0 ? (
        <section>
          <div className="flex items-center gap-2 mb-2 px-2">
            <h3 className="font-small font-medium text-text-200">{text.scheduled}</h3>
          </div>
          <div className="flex flex-col [&>*:hover+hr]:opacity-0 [&>hr:has(+*:hover)]:opacity-0">
            {visibleScheduled.map((task, index) => (
              <div key={task.id}>
                <ScheduledOverviewRow onNavigate={onNavigate} task={task} />
                {index < visibleScheduled.length - 1 ? (
                  <hr className="border-t-0.5 border-border-300 mx-2 transition-opacity" />
                ) : null}
              </div>
            ))}
          </div>
          {canExpandScheduled ? (
            <button
              className="px-2 pt-2 pb-4 text-xs text-text-500/80 hover:text-text-100 transition border-0 bg-transparent cursor-default"
              onClick={() => setExpandedScheduled((value) => !value)}
              type="button"
            >
              {expandedScheduled ? text.showLess : text.showMore}
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

function TaskOverviewRow({
  containerRef,
  onOpen,
  session,
  text,
}: {
  containerRef?: RefObject<HTMLDivElement | null>;
  onOpen: (session: SessionSummary) => void;
  session: ActiveOverviewSession;
  text: CoworkActiveTasksText;
}) {
  const title = session.title?.trim() || text.localTask;
  const relativeSeconds = useMemo(() => {
    const stamp = session.updatedAtMs || session.createdAtMs || 0;
    return stamp ? Math.round((stamp - Date.now()) / 1000) : 0;
  }, [session.createdAtMs, session.updatedAtMs]);
  const statusLabel = session.overviewPending
    ? text.permissionsNeeded
    : session.overviewUnread
      ? null
      : null;

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-3 px-2 py-3 transition-colors hover:bg-bg-200 hover:rounded-lg group"
      data-official-source="index-BELzQL5P.js:d6t TaskOverviewRow"
    >
      <button
        aria-label={title}
        className="absolute inset-0 rounded-lg border-0 bg-transparent p-0 cursor-default"
        onClick={() => onOpen(session)}
        type="button"
      />
      <div className="flex items-center gap-3 flex-1 min-w-0 pointer-events-none">
        <div className="flex-shrink-0 w-7 flex justify-center">
          <SessionStatusIcon
            hasPendingPermissions={session.overviewPending}
            isRunning={Boolean(session.isRunning)}
            isUnread={session.overviewUnread}
            text={text}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <span className={["min-w-0 truncate text-sm", session.overviewUnread ? "text-text-100" : "text-text-200"].join(" ")}>
              {title}
            </span>
            {session.isPinned ? <Icon className="flex-shrink-0 text-text-400" customSize={12} name="Star" /> : null}
            {session.scheduledTaskId ? <Icon className="flex-shrink-0 text-text-400" customSize={12} name="Clock" /> : null}
          </div>
          <span className="text-xs text-text-400">
            {statusLabel ? <span>{statusLabel}</span> : null}
            <span className={["first-letter:capitalize", statusLabel ? "before:content-['·'] before:mx-1 before:text-text-500/50" : ""].filter(Boolean).join(" ")}>
              {formatRelativeSeconds(relativeSeconds)}
            </span>
          </span>
        </div>
      </div>
      {session.overviewPending ? (
        <span className="relative z-10 pointer-events-none text-xs text-text-400 px-2 py-1 rounded-md bg-bg-300">
          {text.review}
        </span>
      ) : (
        <Icon className="hidden group-hover:block flex-shrink-0 text-text-500 pointer-events-none" customSize={16} name="CaretRight" />
      )}
    </div>
  );
}

/** Official l6t SessionStatusIcon. */
function SessionStatusIcon({
  hasPendingPermissions,
  isRunning,
  isUnread,
  text,
}: {
  hasPendingPermissions: boolean;
  isRunning: boolean;
  isUnread: boolean;
  text: CoworkActiveTasksText;
}) {
  if (hasPendingPermissions) {
    return (
      <div
        aria-label={text.permissionsNeeded}
        className="w-7 h-7 rounded-full bg-accent-100 flex items-center justify-center"
        role="status"
      >
        <Icon className="text-oncolor-100" customSize={20} name="Warning" />
      </div>
    );
  }
  if (isRunning) {
    return (
      <div className="w-7 h-7 flex items-center justify-center">
        <OfficialSpinner className="h-6 w-6" size="l" />
      </div>
    );
  }
  if (isUnread) {
    return (
      <div
        aria-label={text.unreadActivity}
        className="w-7 h-7 rounded-full bg-accent-900 flex items-center justify-center"
        role="status"
      >
        <Icon className="text-accent-100" customSize={20} name="Chat" />
      </div>
    );
  }
  return (
    <div
      aria-label={text.noNewActivity}
      className="w-7 h-7 rounded-full bg-bg-300 flex items-center justify-center"
      role="status"
    >
      <Icon className="text-text-500" customSize={20} name="Chat" />
    </div>
  );
}

function ScheduledOverviewRow({
  onNavigate,
  task,
}: {
  onNavigate: (path: string) => void;
  task: ScheduledTaskSummary;
}) {
  return (
    <button
      className="w-full flex items-center gap-3 px-2 py-3 transition-colors hover:bg-bg-200 hover:rounded-lg group text-left border-0 bg-transparent"
      onClick={() => onNavigate(scheduledTaskDetailPath(task.id))}
      type="button"
    >
      <div className="flex-shrink-0 w-7 flex justify-center">
        <div className="w-7 h-7 rounded-full bg-bg-300 flex items-center justify-center">
          <Icon className="text-text-500" customSize={20} name={task.enabled ? "Clock" : "Clock"} />
        </div>
      </div>
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <span className="min-w-0 truncate text-sm text-text-200">{task.title || task.id}</span>
        {task.nextRunAt ? (
          <span className="text-xs text-text-400">{formatScheduledNextRun(task.nextRunAt)}</span>
        ) : null}
      </div>
      <Icon className="hidden group-hover:block flex-shrink-0 text-text-500" customSize={16} name="CaretRight" />
    </button>
  );
}

/**
 * Official filter:
 * starred OR pending permissions OR activity after initializedAt AND (unread | running | sticky).
 */
function filterActiveOverviewSessions(
  sessions: SessionSummary[],
  readState: CoworkActiveReadState,
  stickyIds: Set<string>,
  pendingSessionIds: Set<string>,
): SessionSummary[] {
  const initializedAt = readState.initializedAt ?? 0;
  return sessions.filter((session) => {
    if (session.isArchived) return false;
    if (session.sessionType === "dispatch_child") return false;
    if (session.isPinned) return true;
    if (pendingSessionIds.has(session.id)) return true;
    const activityAt = session.updatedAtMs || session.createdAtMs || 0;
    if (activityAt <= initializedAt) return false;
    return isSessionUnread(session, readState) || Boolean(session.isRunning) || stickyIds.has(session.id);
  });
}

/** Official sort: pending → unread done → rest. */
function sortActiveOverviewSessions(
  sessions: SessionSummary[],
  readState: CoworkActiveReadState,
  pendingSessionIds: Set<string>,
): SessionSummary[] {
  const rank = (session: SessionSummary) => {
    if (pendingSessionIds.has(session.id)) return 0;
    if (!session.isRunning && isSessionUnread(session, readState)) return 1;
    return 2;
  };
  return [...sessions].sort((left, right) => {
    const delta = rank(left) - rank(right);
    if (delta !== 0) return delta;
    return (right.updatedAtMs || 0) - (left.updatedAtMs || 0);
  });
}

function toOverviewSession(
  session: SessionSummary,
  readState: CoworkActiveReadState,
  pendingSessionIds: Set<string>,
): ActiveOverviewSession {
  return {
    ...session,
    overviewPending: pendingSessionIds.has(session.id),
    overviewUnread: isSessionUnread(session, readState),
  };
}

/** Residual YSe-ish: bridge isUnread OR activity after last local read. */
function isSessionUnread(session: SessionSummary, readState: CoworkActiveReadState): boolean {
  if (session.isUnread) return true;
  if (session.isRunning) return false;
  const activityAt = session.updatedAtMs || session.createdAtMs || 0;
  if (!activityAt) return false;
  const readAt = readState.sessions[session.id] ?? 0;
  return activityAt > Math.max(readAt, readState.initializedAt ?? 0);
}

function resolveActiveSectionTitle(
  text: CoworkActiveTasksText,
  flags: { hasPinned: boolean; hasRunningOrPending: boolean },
): string {
  // Residual branch when local+feature: pinned-only / running-only / mixed.
  if (flags.hasPinned && !flags.hasRunningOrPending) return text.pinned;
  if (!flags.hasPinned && flags.hasRunningOrPending) return text.inProgress;
  if (flags.hasPinned && flags.hasRunningOrPending) return text.pinnedOrActive;
  return text.inProgress;
}

function formatRelativeSeconds(secondsFromNow: number): string {
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
  const abs = Math.abs(secondsFromNow);
  if (abs < 60) return formatter.format(secondsFromNow, "second");
  if (abs < 3600) return formatter.format(Math.round(secondsFromNow / 60), "minute");
  if (abs < 86400) return formatter.format(Math.round(secondsFromNow / 3600), "hour");
  if (abs < 86400 * 30) return formatter.format(Math.round(secondsFromNow / 86400), "day");
  if (abs < 86400 * 365) return formatter.format(Math.round(secondsFromNow / (86400 * 30)), "month");
  return formatter.format(Math.round(secondsFromNow / (86400 * 365)), "year");
}

function formatScheduledNextRun(dateStr: string): string {
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return dateStr;
  const now = new Date();
  const time = date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  ) {
    return `Today at ${time}`;
  }
  const day = date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  return `${day} at ${time}`;
}
