/**
 * Official cd5a31703 `cR` / `KX` / `UX` / `eQe` / `tQe` task-event runs.
 *
 * Consecutive `task_event` items in one assistant turn paint as one chip:
 * `{count} background {noun} {status}, {n} completed, …` (`hEJp1hFtWd`).
 * A single event still uses `Background {noun} {status}` (`m3qXDI92OE`).
 */
import type { OfficialTaskStatus } from "./officialTasksAndPlan";
import type { TranscriptEntryItem } from "./officialTranscriptParse";

export type OfficialTaskEventItem = Extract<TranscriptEntryItem, { kind: "task_event" }>;

export type OfficialTaskNoun = "agent" | "monitor" | "shell" | "task" | "workflow";

export type OfficialTaskRunPart = {
  count: number;
  danger: boolean;
  key: OfficialTaskStatus;
  text: string;
};

/** Official Zz. */
export function officialTaskEventNounKind(taskType?: string): OfficialTaskNoun {
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
    case "monitor_ws":
      return "monitor";
    default:
      return "task";
  }
}

/** Official Qz. */
export function officialTaskEventNounSingular(kind: OfficialTaskNoun) {
  switch (kind) {
    case "shell":
      return "command";
    case "agent":
      return "agent";
    case "workflow":
      return "workflow";
    case "monitor":
      return "monitor";
    case "task":
      return "task";
  }
}

/** Official $z. */
export function officialTaskEventNounPlural(kind: OfficialTaskNoun) {
  switch (kind) {
    case "shell":
      return "commands";
    case "agent":
      return "agents";
    case "workflow":
      return "workflows";
    case "monitor":
      return "monitors";
    case "task":
      return "tasks";
  }
}

/** Official eB. */
export function officialTaskEventStatusWord(status: OfficialTaskStatus) {
  switch (status) {
    case "running":
      return "started";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "stopped":
      return "stopped";
  }
}

/** Official QZe: running bucket says "running", others use eB. */
export function officialTaskEventRunStatusWord(status: OfficialTaskStatus) {
  return status === "running" ? "running" : officialTaskEventStatusWord(status);
}

/** Official OIe. */
export function officialTaskEventStatusCounts(events: OfficialTaskEventItem[]) {
  const counts = { completed: 0, failed: 0, running: 0, stopped: 0 };
  for (const event of events) counts[event.status] += 1;
  return counts;
}

/** Official DIe: shared noun, else "task". */
export function officialTaskEventRunNoun(events: OfficialTaskEventItem[]): OfficialTaskNoun {
  const first = officialTaskEventNounKind(events[0]?.taskType);
  return events.every((event) => officialTaskEventNounKind(event.taskType) === first) ? first : "task";
}

/** Official eQe order: completed, failed, stopped, running. */
export function officialTaskEventRunParts(events: OfficialTaskEventItem[]): OfficialTaskRunPart[] {
  const counts = officialTaskEventStatusCounts(events);
  const noun = officialTaskEventRunNoun(events);
  const parts: OfficialTaskRunPart[] = [];
  const push = (key: OfficialTaskStatus, count: number, text: string) => {
    if (count > 0) parts.push({ count, danger: key === "failed", key, text });
  };
  push("completed", counts.completed, `${counts.completed} completed`);
  push("failed", counts.failed, `${counts.failed} failed`);
  push("stopped", counts.stopped, `${counts.stopped} stopped`);
  push("running", counts.running, `${counts.running} running`);
  if (parts.length === 0) return parts;
  const lead = parts[0]!;
  const leadNoun = lead.count === 1 ? officialTaskEventNounSingular(noun) : officialTaskEventNounPlural(noun);
  parts[0] = {
    ...lead,
    text: `${lead.count} background ${leadNoun} ${officialTaskEventRunStatusWord(lead.key)}`,
  };
  return parts;
}

/** Official $Ze. */
export function officialTaskEventRunLabel(events: OfficialTaskEventItem[]) {
  return officialTaskEventRunParts(events).map((part) => part.text).join(", ");
}

/** Official tQe verb: `Background {noun} {status}` (`m3qXDI92OE`). */
export function officialTaskEventChipVerb(event: OfficialTaskEventItem) {
  const noun = officialTaskEventNounSingular(officialTaskEventNounKind(event.taskType));
  return `Background ${noun} ${officialTaskEventStatusWord(event.status)}`;
}

export function officialTaskEventChipDetail(event: OfficialTaskEventItem) {
  return event.description ?? event.summary;
}

/**
 * Official cR: consecutive task_event items in one turn's item list share a run.
 * Product paints the run on the first id; later ids in the streak are skipped.
 */
export function officialTaskEventRunsByFirstId(items: TranscriptEntryItem[]) {
  const runs = new Map<string, OfficialTaskEventItem[]>();
  let streak: OfficialTaskEventItem[] = [];
  const flush = () => {
    if (streak.length === 0) return;
    runs.set(streak[0]!.id, streak);
    streak = [];
  };
  for (const item of items) {
    if (item.kind === "task_event") {
      streak.push(item);
    } else {
      flush();
    }
  }
  flush();
  return runs;
}
