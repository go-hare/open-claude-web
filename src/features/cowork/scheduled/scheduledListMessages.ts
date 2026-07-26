import type { MessageDescriptors } from "../../../i18n/footerMenuMessages";

/**
 * Official residual scheduled task list copy:
 * Code list c705 Xa: title sy7vzf+1SO, subtitle k27Sp3+4kq, banner iCzbtZsjus, …
 * Cowork list ccd3: subtitle AwrXvhJa7p, banner qgksMV96yc, search wFRNQOXDcp,
 * noResults 4ml4dO3YcZ, sort hDI+JMUhFd / 3yurtFS7JU / HAlOn1ZsuY, …
 */
export const SCHEDULED_LIST_MESSAGES = {
  title: { defaultMessage: "Scheduled tasks", id: "sy7vzf+1SO" },
  /** Code residual subtitle (session wording). */
  subtitle: {
    defaultMessage:
      "Run tasks on a schedule or whenever you need them. Type /schedule in any session to set one up.",
    id: "k27Sp3+4kq",
  },
  /** Cowork residual subtitle (existing task wording, AwrXvhJa7p). */
  subtitleCowork: {
    defaultMessage:
      "Run tasks on a schedule or whenever you need them. Type /schedule in any existing task to set one up.",
    id: "AwrXvhJa7p",
  },
  bannerLocalAwake: {
    defaultMessage: "Local tasks only run while your computer is awake and online.",
    id: "iCzbtZsjus",
  },
  /** Cowork list banner residual (ccd3 / qgks). */
  bannerScheduledAwake: {
    defaultMessage: "Scheduled tasks only run while your computer is awake.",
    id: "qgksMV96yc",
  },
  emptyState: { defaultMessage: "No scheduled tasks yet.", id: "Lrl5Trz+z3" },
  noResults: {
    defaultMessage: "No scheduled tasks match your search.",
    id: "4ml4dO3YcZ",
  },
  loadingLabel: { defaultMessage: "Loading scheduled tasks", id: "/jSW/M8Eqw" },
  newTask: { defaultMessage: "New task", id: "K4O03zh0vo" },
  nextRunInline: { defaultMessage: "Next run {date}", id: "hYbuk57KUB" },
  sortBy: { defaultMessage: "Sort by", id: "hDI+JMUhFd" },
  sortNextRun: { defaultMessage: "Next run", id: "3yurtFS7JU" },
  sortName: { defaultMessage: "Name", id: "HAlOn1ZsuY" },
  searchPlaceholder: {
    defaultMessage: "Search scheduled tasks…",
    id: "wFRNQOXDcp",
  },
  searchLabel: { defaultMessage: "Search scheduled tasks", id: "4aMay989nb" },
  clearFilter: { defaultMessage: "Clear filter", id: "OhgOkHumT3" },
  oneTime: { defaultMessage: "One-time", id: "/Zj5Ed1O1a" },
  paused: { defaultMessage: "Paused", id: "C2iTEHtK//" },
  completed: { defaultMessage: "Completed", id: "95stPqCnfu" },
  hourly: { defaultMessage: "Hourly", id: "Kj+LfxNZ7r" },
  daily: { defaultMessage: "Daily", id: "zxvhnETmn2" },
  weekdays: { defaultMessage: "Weekdays", id: "GQvqkI1lyL" },
  weekly: { defaultMessage: "Weekly", id: "/clOBUs/wZ" },
  manual: { defaultMessage: "Manual", id: "M59JhXXku8" },
  ran: { defaultMessage: "Ran", id: "+CuLVSpi4n" },
} satisfies MessageDescriptors;

export type ScheduledListText = { [K in keyof typeof SCHEDULED_LIST_MESSAGES]: string };

/** Frequency / schedule label for list cards (prefer cron over host English schedule). */
export function localizedListScheduleLabel(
  task: { fireAt?: string | null; cronExpression?: string | null; schedule?: string | null },
  text: Pick<ScheduledListText, "oneTime" | "hourly" | "daily" | "weekdays" | "weekly" | "manual">,
  formatTime: (hour: number, minute: number) => string,
) {
  if (task.fireAt) return text.oneTime;
  const cron = task.cronExpression;
  if (cron) {
    const [minute, hour, , , day] = cron.split(" ");
    if (hour === "*") return text.hourly;
    if (day === "1-5") return `${text.weekdays} ${formatTime(Number(hour), Number(minute))}`;
    if (day && day !== "*") return `${text.weekly} ${formatTime(Number(hour), Number(minute))}`;
    return `${text.daily} ${formatTime(Number(hour), Number(minute))}`;
  }
  const raw = (task.schedule || "").trim().toLowerCase();
  if (!raw) return text.manual;
  if (raw === "hourly" || raw.startsWith("hourly")) return text.hourly;
  if (raw === "daily" || raw.startsWith("daily")) return text.daily;
  if (raw === "weekdays" || raw.startsWith("weekday")) return text.weekdays;
  if (raw === "weekly" || raw.startsWith("weekly")) return text.weekly;
  if (raw === "manual" || raw.includes("manual")) return text.manual;
  if (raw === "one-time" || raw === "once" || raw.includes("run once")) return text.oneTime;
  return task.schedule || text.manual;
}
