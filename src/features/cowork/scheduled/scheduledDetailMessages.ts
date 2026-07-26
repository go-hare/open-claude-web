import type { MessageDescriptors } from "../../../i18n/footerMenuMessages";

/**
 * Official residual cowork scheduled-task detail copy (index-BELzQL5P function rKt):
 * back QnVP0todrs, Run now +ZAG46kixX, status pill 3a5wL8wo40 / +CuLVSpi4n / C2iTEHtK//,
 * next qeLO6CTuEV, Instructions sV2v5LjRpX, Repeats H0RbcUK573, Always allowed xqCjQKdyAK,
 * Delete scheduled task IYLPrk/B9n, body 3TwpgrVm36, Project k36uSwr4q5, …
 * NOT EpitaxyLocalRoutineDetail (cfc18e0f4) — that is /code/scheduled path.
 */
export const SCHEDULED_DETAIL_MESSAGES = {
  allScheduledTasks: { defaultMessage: "All scheduled tasks", id: "QnVP0todrs" },
  runNow: { defaultMessage: "Run now", id: "+ZAG46kixX" },
  inProgress: { defaultMessage: "In progress", id: "q1WWIreT3a" },
  edit: { defaultMessage: "Edit", id: "wEQDC6sehY" },
  delete: { defaultMessage: "Delete", id: "K3r6DQyxAQ" },
  deleteTitle: { defaultMessage: "Delete scheduled task", id: "IYLPrk/B9n" },
  deleteBody: {
    defaultMessage: 'Delete "{taskName}"? Any sessions from this task will be archived.',
    id: "3TwpgrVm36",
  },
  enableSchedule: { defaultMessage: "Enable schedule", id: "iU9U2cwW9G" },
  active: { defaultMessage: "进行中", id: "3a5wL8wo40" },
  paused: { defaultMessage: "Paused", id: "C2iTEHtK//" },
  ran: { defaultMessage: "Ran", id: "+CuLVSpi4n" },
  nextRun: { defaultMessage: "Next run: {date}", id: "qeLO6CTuEV" },
  runsAt: { defaultMessage: "Runs at: {date}", id: "/b6aMD/Bvp" },
  instructions: { defaultMessage: "Instructions", id: "sV2v5LjRpX" },
  noPrompt: {
    defaultMessage: "Task file not found or has unexpected format.",
    id: "DrWmuvNLrm",
  },
  project: { defaultMessage: "Project", id: "k36uSwr4q5" },
  projectMissing: {
    defaultMessage: "This task was linked to a project that no longer exists.",
    id: "Y6y565x/bX",
  },
  unlink: { defaultMessage: "Unlink", id: "4PKxPsFLC3" },
  folder: { defaultMessage: "Folder", id: "ukQpDs7M+0" },
  folders: { defaultMessage: "Folders", id: "8ILyTUAKTa" },
  fromProject: {
    defaultMessage: '(from project "{spaceName}")',
    id: "iJuCvdH/LC",
  },
  repeats: { defaultMessage: "Repeats", id: "H0RbcUK573" },
  runs: { defaultMessage: "Runs", id: "W1Qs5OAf+0" },
  manualOnly: { defaultMessage: "Manual only", id: "Bzy/54I5zQ" },
  alwaysAllowed: { defaultMessage: "Always allowed", id: "xqCjQKdyAK" },
  alwaysAllowedEmpty: {
    defaultMessage: "Approvals you grant during a run appear here.",
    id: "Q8Ygr2drci",
  },
  unsupervised: { defaultMessage: "Act without asking", id: "LStwu4n1yT" },
  browser: { defaultMessage: "Browser", id: "E3oB+tM0Ou" },
  allWebsites: { defaultMessage: "All websites", id: "mKYq32tOvI" },
  websiteCount: {
    defaultMessage: "{count, plural, one {# website} other {# websites}}",
    id: "k7vlia6NBl",
  },
  removeApproval: { defaultMessage: "Remove approval", id: "H6MofyWVUA" },
  history: { defaultMessage: "History", id: "djJp6cHQ6H" },
  showMore: { defaultMessage: "Show more", id: "aWpBzjCXKS" },
  running: { defaultMessage: "Running", id: "nDyaq/M7Oj" },
  error: { defaultMessage: "Error", id: "KN7zKn8z4F" },
  skipped: { defaultMessage: "Skipped", id: "djZCU5enGS" },
  skippedAsleep: {
    defaultMessage: "Scheduled tasks only run while your computer is awake.",
    id: "qgksMV96yc",
  },
  skippedPerTask: {
    defaultMessage: "The previous run was still in progress.",
    id: "t/jcuCN7Eo",
  },
  skippedGlobal: {
    defaultMessage: "Other scheduled tasks were already running.",
    id: "M1iTRmjP6a",
  },
  /** Frequency labels for HNe-style schedule text (shared with form residual). */
  hourly: { defaultMessage: "Hourly", id: "Kj+LfxNZ7r" },
  daily: { defaultMessage: "Daily", id: "zxvhnETmn2" },
  weekdays: { defaultMessage: "Weekdays", id: "GQvqkI1lyL" },
  weekly: { defaultMessage: "Weekly", id: "/clOBUs/wZ" },
  manual: { defaultMessage: "Manual", id: "M59JhXXku8" },
} satisfies MessageDescriptors;

export type ScheduledDetailText = { [K in keyof typeof SCHEDULED_DETAIL_MESSAGES]: string };

/** Simple residual brace fill (settings formatExtensionsTemplate pattern). */
export function formatScheduledTemplate(template: string, values: Record<string, string>) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

/** Minimal plural for residual k7vlia6NBl without full ICU. */
export function formatWebsiteCount(template: string, count: number) {
  const one = template.match(/one\s*\{([^}]*)\}/)?.[1];
  const other = template.match(/other\s*\{([^}]*)\}/)?.[1];
  const picked = (count === 1 ? one : other) ?? other ?? template;
  return picked.replaceAll("#", String(count));
}
