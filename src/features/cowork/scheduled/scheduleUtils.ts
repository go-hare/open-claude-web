import type { ScheduledTaskSummary } from "../../../adapters/desktopBridge";

/** Official uYt frequency values (txe options; custom/fireAt only when editing). */
export type ScheduleFrequency = "once" | "hourly" | "daily" | "weekdays" | "weekly" | "custom" | "fireAt";

/** Official LNe: weekday long names from locale */
export const WEEKDAY_LABELS = Array.from({ length: 7 }, (_, index) =>
  new Date(2024, 0, 7 + index).toLocaleDateString([], { weekday: "long" }),
);

const DAYS = WEEKDAY_LABELS;

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

/** Official $Ne — once/fireAt omit cron; custom kept by caller. */
export const cronForSchedule = (frequency: ScheduleFrequency, hour: number, minute: number, dayOfWeek: number) => {
  if (frequency === "once" || frequency === "fireAt" || frequency === "custom") return undefined;
  if (frequency === "hourly") return `${minute} * * * *`;
  if (frequency === "daily") return `${minute} ${hour} * * *`;
  if (frequency === "weekdays") return `${minute} ${hour} * * 1-5`;
  return `${minute} ${hour} * * ${dayOfWeek}`;
};

export const scheduleLabel = (task: ScheduledTaskSummary) => {
  if (task.fireAt) return "Run once";
  if (task.schedule && task.schedule !== task.cronExpression) return task.schedule;
  return labelFromCron(task.cronExpression);
};

export const labelFromCron = (cron?: string) => {
  if (!cron) return "Manual";
  const [minute, hour, , , day] = cron.split(" ");
  if (hour === "*") return "Hourly";
  if (day === "1-5") return `Weekdays at ${formatTime(Number(hour), Number(minute))}`;
  if (day && day !== "*") return `Weekly on ${DAYS[Number(day)] ?? "Monday"} at ${formatTime(Number(hour), Number(minute))}`;
  return `Daily at ${formatTime(Number(hour), Number(minute))}`;
};

export const formatTime = (hour: number, minute: number) => {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
};
