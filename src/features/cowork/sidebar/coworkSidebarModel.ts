import type { CoworkSpaceSummary, ScheduledTaskSummary, SessionSummary } from "../../../adapters/desktopBridge";
import { isCoworkSessionPinned, orderCoworkPinnedSessions } from "./coworkSessionPinning";

export const OFFICIAL_COWORK_RECENT_LIMIT = 20;
export const COWORK_SIDEBAR_SECTION_ORDER = ["scheduled", "spaces", "pinned", "recents"] as const;

const scheduledWindowMs = 7 * 24 * 60 * 60 * 1000;

export type CoworkScheduledSidebarItem = {
  latestRun: SessionSummary;
  runs: SessionSummary[];
  task: ScheduledTaskSummary;
  unreadCount: number;
};

export type CoworkSidebarModel = {
  pinned: SessionSummary[];
  recents: SessionSummary[];
  scheduled: CoworkScheduledSidebarItem[];
  spaces: CoworkSpaceSummary[];
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
  const recents = visible
    .filter((session) => !pinnedIds.has(session.id))
    .filter((session) => !session.scheduledTaskId || !scheduledRunIds.has(session.id))
    .slice(0, OFFICIAL_COWORK_RECENT_LIMIT);

  return {
    scheduled,
    spaces: [...spaces].sort((left, right) => right.updatedAtMs - left.updatedAtMs),
    pinned,
    recents,
  };
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
