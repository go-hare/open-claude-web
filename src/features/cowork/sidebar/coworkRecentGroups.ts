import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { ShellText } from "../../../i18n/shellMessages";
import type { DFrameGroupBy, DFrameSortBy, FrameStore } from "../../../stores/frameStore";
import { coworkSessionPinKey } from "./coworkSessionPinning";

export type CoworkRecentGroup = {
  customGroupId?: string | null;
  key: string;
  label?: string;
  sessions: SessionSummary[];
};

export function buildCoworkRecentGroups(sessions: SessionSummary[], frame: FrameStore, text: ShellText) {
  const visible = sessions.filter((session) => !session.isArchived);
  const sortBy = frame.sortByByMode.cowork ?? "recency";
  const sorted = [...visible].sort(coworkSessionSorter(sortBy));
  const groupBy = frame.groupByByMode.cowork ?? "none";
  if (groupBy === "none") return [{ key: "all", sessions: sorted }];
  if (groupBy === "custom") return buildCoworkCustomGroups(sorted, frame, text);
  return groupCoworkSessions(sorted, groupBy, text);
}

function buildCoworkCustomGroups(sessions: SessionSummary[], frame: FrameStore, text: ShellText) {
  const byGroup = new Map<string, SessionSummary[]>();
  for (const session of sessions) {
    const assigned = frame.customGroupAssignments[coworkSessionPinKey(session)];
    const groupId = assigned && frame.customGroups.some((group) => group.id === assigned) ? assigned : "cowork-ungrouped";
    byGroup.set(groupId, [...(byGroup.get(groupId) ?? []), session]);
  }
  const groups = frame.customGroups.map((group) => ({
    customGroupId: group.id,
    key: `custom-${group.id}`,
    label: group.name,
    sessions: orderCoworkCustomGroup(byGroup.get(group.id) ?? [], frame.customGroupOrder[group.id]),
  }));
  return [...groups, { customGroupId: null, key: "cowork-ungrouped", label: text.ungrouped, sessions: byGroup.get("cowork-ungrouped") ?? [] }];
}

function orderCoworkCustomGroup(sessions: SessionSummary[], order: string[] = []) {
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...sessions].sort((left, right) => {
    const leftRank = rank.get(coworkSessionPinKey(left)) ?? Infinity;
    const rightRank = rank.get(coworkSessionPinKey(right)) ?? Infinity;
    return leftRank === rightRank ? right.updatedAtMs - left.updatedAtMs : leftRank - rightRank;
  });
}

function groupCoworkSessions(sessions: SessionSummary[], groupBy: Exclude<DFrameGroupBy, "none" | "custom">, text: ShellText) {
  const groups = new Map<string, CoworkRecentGroup>();
  for (const session of sessions) {
    const label = coworkGroupLabel(session, groupBy, text);
    const group = groups.get(label) ?? { key: label, label, sessions: [] };
    group.sessions.push(session);
    groups.set(label, group);
  }
  return [...groups.values()];
}

function coworkGroupLabel(session: SessionSummary, groupBy: Exclude<DFrameGroupBy, "none" | "custom">, text: ShellText) {
  if (groupBy === "project" || groupBy === "homespace") return session.repo?.name || session.cwd?.split("/").filter(Boolean).at(-1) || text.other;
  if (groupBy === "environment") return session.cwd ? text.local : text.cloud;
  if (groupBy === "state") return session.isArchived ? text.archived : text.active;
  return coworkDateLabel(session.updatedAtMs, text);
}

function coworkDateLabel(updatedAtMs: number, text: ShellText) {
  const age = Date.now() - updatedAtMs;
  if (age < 24 * 60 * 60 * 1000) return text.today;
  if (age < 48 * 60 * 60 * 1000) return text.yesterday;
  return text.older;
}

function coworkSessionSorter(sortBy: DFrameSortBy) {
  if (sortBy === "alpha") return (left: SessionSummary, right: SessionSummary) => left.title.localeCompare(right.title, "zh-CN");
  if (sortBy === "created") return (left: SessionSummary, right: SessionSummary) => (right.createdAtMs ?? right.updatedAtMs) - (left.createdAtMs ?? left.updatedAtMs);
  return (left: SessionSummary, right: SessionSummary) => right.updatedAtMs - left.updatedAtMs;
}
