import type { CoworkSpaceSummary, ScheduledTaskSummary, SessionSummary } from "../../../adapters/desktopBridge";
import { isCoworkSessionPinned, orderCoworkPinnedSessions } from "./coworkSessionPinning";

export const OFFICIAL_COWORK_RECENT_LIMIT = 20;
export const COWORK_SIDEBAR_SECTION_ORDER = ["scheduled", "pinned", "recents"] as const;

const scheduledWindowMs = 7 * 24 * 60 * 60 * 1000;

export type CoworkScheduledSidebarItem = {
  latestRun: SessionSummary;
  runs: SessionSummary[];
  task: ScheduledTaskSummary;
  unreadCount: number;
};

/**
 * Official Il `$` mix (ca0135 ~7538): cowork sessions + cowork-space rows,
 * then Gi pin-split, then Cl slice(0, cap) with cap=20 for cowork.
 * Spaces are Recents rows (Xa), not a sidebar 「项目」 heading (nav already has 项目).
 */
export type CoworkRecentItem =
  | { entryKind: "session"; session: SessionSummary }
  | { entryKind: "space"; space: CoworkSpaceSummary };

export type CoworkSidebarModel = {
  pinned: SessionSummary[];
  recents: CoworkRecentItem[];
  scheduled: CoworkScheduledSidebarItem[];
};

export function buildCoworkSidebarModel(
  sessions: SessionSummary[],
  scheduledTasks: ScheduledTaskSummary[],
  spaces: CoworkSpaceSummary[],
  pinnedOrder: string[],
  now = Date.now(),
): CoworkSidebarModel {
  const visible = sessions
    .filter((session) => !session.isArchived && session.sessionType !== "dispatch_child")
    .sort(compareUpdated);
  const pinned = orderCoworkPinnedSessions(visible, pinnedOrder);
  const pinnedIds = new Set(pinned.map((session) => session.id));
  const scheduled = buildScheduledItems(visible, scheduledTasks, pinnedOrder, now);
  const scheduledRunIds = new Set(scheduled.flatMap((item) => item.runs.map((run) => run.id)));
  const recentsSessions = visible
    .filter((session) => !pinnedIds.has(session.id))
    .filter((session) => !session.scheduledTaskId || !scheduledRunIds.has(session.id));
  const recents = mixCoworkRecents(recentsSessions, spaces).slice(0, OFFICIAL_COWORK_RECENT_LIMIT);

  return {
    scheduled,
    pinned,
    recents,
  };
}

export function coworkRecentSessions(items: CoworkRecentItem[]): SessionSummary[] {
  return items.flatMap((item) => (item.entryKind === "session" ? [item.session] : []));
}

function mixCoworkRecents(sessions: SessionSummary[], spaces: CoworkSpaceSummary[]): CoworkRecentItem[] {
  const mixed: Array<CoworkRecentItem & { updatedAtMs: number }> = [
    ...sessions.map((session) => ({ entryKind: "session" as const, session, updatedAtMs: session.updatedAtMs })),
    ...spaces.map((space) => ({ entryKind: "space" as const, space, updatedAtMs: space.updatedAtMs })),
  ];
  mixed.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
  return mixed.map(({ updatedAtMs: _updatedAtMs, ...item }) => item);
}

function buildScheduledItems(sessions: SessionSummary[], tasks: ScheduledTaskSummary[], pinnedOrder: string[], now: number) {
  const tasksById = new Map(tasks.filter((task) => task.enabled).map((task) => [task.id, task]));
  const runsByTask = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    if (!session.scheduledTaskId || isCoworkSessionPinned(session, pinnedOrder)) continue;
    if (now - session.updatedAtMs > scheduledWindowMs) continue;
    const runs = runsByTask.get(session.scheduledTaskId) ?? [];
    runs.push(session);
    runsByTask.set(session.scheduledTaskId, runs);
  }
  const items: CoworkScheduledSidebarItem[] = [];
  for (const [taskId, runs] of runsByTask) {
    const task = tasksById.get(taskId);
    if (!task) continue;
    runs.sort(compareUpdated);
    items.push({
      latestRun: runs[0],
      runs,
      task,
      unreadCount: runs.filter((run) => run.isUnread).length,
    });
  }
  return items.sort((left, right) => right.latestRun.updatedAtMs - left.latestRun.updatedAtMs);
}

function compareUpdated(left: SessionSummary, right: SessionSummary) {
  return right.updatedAtMs - left.updatedAtMs;
}
