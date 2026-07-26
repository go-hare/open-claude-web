import type { MessageDescriptors } from "../../../i18n/footerMenuMessages";

/**
 * Official residual uYt create modal copy (index-BELzQL5P function uYt + Lkt/Ikt).
 * Message ids from residual defaultMessage/id pairs; zh-CN via /i18n catalog + overrides.
 */
export const SCHEDULED_CREATE_MESSAGES = {
  createTitle: { defaultMessage: "Create scheduled task", id: "dJqE3eAWkM" },
  editTitle: { defaultMessage: "Edit scheduled task", id: "6ZDt71ZCiV" },
  name: { defaultMessage: "名称", id: "HAlOn1ZsuY" },
  namePlaceholder: { defaultMessage: "daily-briefing", id: "__local.scheduledCreateNamePlaceholder" },
  description: { defaultMessage: "Description", id: "Q8Qw5BZ1VA" },
  descriptionPlaceholder: {
    defaultMessage: "Summarize my calendar and inbox for the day",
    id: "__local.scheduledCreateDescriptionPlaceholder",
  },
  prompt: { defaultMessage: "Prompt", id: "iWKE8shLIt" },
  promptPlaceholder: {
    defaultMessage:
      "Check my Google Calendar for today's meetings and summarize my unread emails. Highlight anything urgent.",
    id: "__local.scheduledCreatePromptPlaceholder",
  },
  workInProject: { defaultMessage: "Work in a project", id: "bNgYGVAxfX" },
  model: { defaultMessage: "Model", id: "rhSI1/3g21" },
  defaultModel: { defaultMessage: "Default model", id: "bV+YmcFCEb" },
  fromProject: { defaultMessage: "from project", id: "qGTwh00PBY" },
  frequency: { defaultMessage: "Frequency", id: "vAW30j/jo6" },
  manual: { defaultMessage: "Manual", id: "M59JhXXku8" },
  hourly: { defaultMessage: "Hourly", id: "Kj+LfxNZ7r" },
  daily: { defaultMessage: "Daily", id: "zxvhnETmn2" },
  weekdays: { defaultMessage: "Weekdays", id: "GQvqkI1lyL" },
  weekly: { defaultMessage: "Weekly", id: "/clOBUs/wZ" },
  time: { defaultMessage: "Time", id: "ug01MkZy2v" },
  willBeSavedAs: { defaultMessage: 'Will be saved as "{name}"', id: "4WpaS3toVT" },
  nameMustContainLetter: {
    defaultMessage: "Name must contain at least one letter or number.",
    id: "KQTtV1O1z5",
  },
  nameReserved: {
    defaultMessage: "This name is reserved. Please choose a different name.",
    id: "__local.scheduledCreateNameReserved",
  },
  nameExists: {
    defaultMessage: 'A scheduled task named "{name}" already exists.',
    id: "__local.scheduledCreateNameExists",
  },
  staggerNote: {
    defaultMessage: "Scheduled tasks use a randomized delay of several minutes for server performance.",
    id: "x9TlvXuBUX",
  },
  runAtExactTime: { defaultMessage: "Run at exact time", id: "noyr4eHzOU" },
  exactTimeHint: {
    defaultMessage: "By default, scheduled tasks use a randomized delay of several minutes for server performance.",
    id: "CbDZjKEj2c",
  },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  save: { defaultMessage: "Save", id: "jvo0vs3nF0" },
  creationUnavailable: {
    defaultMessage: "Scheduled task creation isn't available. Restart the desktop app to enable this feature.",
    id: "7igAjbKih0",
  },
  createFailed: {
    defaultMessage: "Failed to create scheduled task. You can try again.",
    id: "nLDzPb081t",
  },
  /** Residual uYt update failure (index-BELzQL5P id yv4zgUReyK). */
  editFailed: {
    defaultMessage: "Failed to update scheduled task. You can try again.",
    id: "yv4zgUReyK",
  },
  selectFolders: { defaultMessage: "Select folders", id: "7913SLzMZW" },
} satisfies MessageDescriptors;

export type ScheduledCreateText = { [K in keyof typeof SCHEDULED_CREATE_MESSAGES]: string };

export function formatScheduledCreateTemplate(
  template: string,
  values: Record<string, string | number>,
) {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, String(value));
  }
  return out;
}
