import type { ScheduledTaskSummary } from "../../adapters/desktopBridge";

export type ScheduleFrequency = "once" | "hourly" | "daily" | "weekdays" | "weekly";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const RESERVED_TASK_IDS = new Set(["new", "new-local"]);

export const taskDisplayName = (task: ScheduledTaskSummary) => {
  return task.title || task.id;
};

export const normalizeTaskId = (name: string) => {
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/^[-_]+|[-_]+$/g, "");
};

export const taskNameError = (name: string, existingNames: Set<string>) => {
  if (!name.trim()) return undefined;
  const normalized = normalizeTaskId(name);
  if (!normalized) return "Name must contain at least one letter or number.";
  if (RESERVED_TASK_IDS.has(normalized) || normalized.startsWith("trig_")) {
    return "This name is reserved. Please choose a different name.";
  }
  if (existingNames.has(normalized)) {
    return `A scheduled task named "${normalized}" already exists.`;
  }
  return undefined;
};

export const cronForSchedule = (frequency: ScheduleFrequency, hour: number, minute: number, dayOfWeek: number) => {
  if (frequency === "once") return undefined;
  if (frequency === "hourly") return `${minute} * * * *`;
  if (frequency === "daily") return `${minute} ${hour} * * *`;
  if (frequency === "weekdays") return `${minute} ${hour} * * 1-5`;
  return `${minute} ${hour} * * ${dayOfWeek}`;
};

/** Official HNe approx when jitterSeconds > 0 minutes. */
export function scheduleApproxPrefix(
  task: Pick<ScheduledTaskSummary, "jitterSeconds" | "disableJitter">,
): string {
  if (task.disableJitter) return "";
  return Math.round((task.jitterSeconds ?? 0) / 60) > 0 ? "~" : "";
}

export const scheduleLabel = (task: ScheduledTaskSummary) => {
  if (task.fireAt) return "Run once";
  const approx = scheduleApproxPrefix(task);
  if (task.schedule && task.schedule !== task.cronExpression) {
    if (approx && !task.schedule.startsWith("~")) return `${approx}${task.schedule}`;
    return task.schedule;
  }
  return labelFromCron(task.cronExpression, approx);
};

export const labelFromCron = (cron?: string, approx = "") => {
  if (!cron) return "Manual";
  const [minute, hour, , , day] = cron.split(" ");
  if (hour === "*") {
    const m = Number(minute);
    if ((Number.isFinite(m) && m > 0) || approx) {
      return `Hourly at ${approx}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`;
    }
    return "Hourly";
  }
  const time = `${approx}${formatTime(Number(hour), Number(minute))}`;
  if (day === "1-5") return `Weekdays at ${time}`;
  if (day && day !== "*") return `Weekly on ${DAYS[Number(day)] ?? "Monday"} at ${time}`;
  return `Daily at ${time}`;
};

export const formatTime = (hour: number, minute: number) => {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
