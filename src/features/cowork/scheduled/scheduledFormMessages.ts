import type { MessageDescriptors } from "../../../i18n/footerMenuMessages";

/**
 * Official residual local routine create/edit form copy (c0243d234 G / z / F):
 * createTitle klYQCm25/j, banner 4aL/3wWUgg, fields HAlOn1ZsuY…, schedule M59JhXXku8…,
 * folder K3Z1XCYM9J, worktree tUTlFfqj3E, default model lKv8ex1Pyg, create error 7igAjbKih0.
 * List/header: Routines Dbc6XaCcol.
 */
export const SCHEDULED_FORM_MESSAGES = {
  createTitle: { defaultMessage: "New local routine", id: "klYQCm25/j" },
  editTitle: { defaultMessage: "Edit routine", id: "3nfBCdhJjV" },
  routines: { defaultMessage: "Routines", id: "Dbc6XaCcol" },
  bannerLocalAwake: {
    defaultMessage: "Local routines only run while your computer is awake.",
    id: "4aL/3wWUgg",
  },
  name: { defaultMessage: "名称", id: "HAlOn1ZsuY" },
  namePlaceholder: { defaultMessage: "daily-code-review", id: "2uv2pR+wD2" },
  description: { defaultMessage: "Description", id: "Q8Qw5BZ1VA" },
  descriptionPlaceholder: {
    defaultMessage: "Review yesterday's commits and flag anything concerning",
    id: "lFK6J0RHv9",
  },
  instructions: { defaultMessage: "Instructions", id: "sZIXrBDCDG" },
  promptPlaceholder: {
    defaultMessage:
      "Look at the commits from the last 24 hours. Summarize what changed, call out any risky patterns or missing tests, and note anything worth following up on.",
    id: "qG/0dfQrsm",
  },
  schedule: { defaultMessage: "Schedule", id: "hGQqkUBDZ1" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  create: { defaultMessage: "Create", id: "VzzYJkHnLP" },
  save: { defaultMessage: "Save", id: "jvo0vs3nF0" },
  manual: { defaultMessage: "Manual", id: "M59JhXXku8" },
  hourly: { defaultMessage: "Hourly", id: "Kj+LfxNZ7r" },
  daily: { defaultMessage: "Daily", id: "zxvhnETmn2" },
  weekdays: { defaultMessage: "Weekdays", id: "GQvqkI1lyL" },
  weekly: { defaultMessage: "Weekly", id: "/clOBUs/wZ" },
  atTime: { defaultMessage: "At", id: "QM9R8noxhT" },
  staggerNote: {
    defaultMessage: "Scheduled tasks use a randomized delay of several minutes for server performance.",
    id: "x9TlvXuBUX",
  },
  /** Residual exact-time (disableJitter) — same ids as uYt / SCHEDULED_CREATE_MESSAGES. */
  runAtExactTime: { defaultMessage: "Run at exact time", id: "noyr4eHzOU" },
  exactTimeHint: {
    defaultMessage: "By default, scheduled tasks use a randomized delay of several minutes for server performance.",
    id: "CbDZjKEj2c",
  },
  selectFolder: { defaultMessage: "Select folder", id: "K3Z1XCYM9J" },
  worktree: { defaultMessage: "Worktree", id: "tUTlFfqj3E" },
  defaultModel: { defaultMessage: "Default", id: "lKv8ex1Pyg" },
  askPermissions: { defaultMessage: "询问权限", id: "Z/DKbn2gfH" },
  creationUnavailable: {
    defaultMessage: "Scheduled task creation isn't available. Restart the desktop app to enable this feature.",
    id: "7igAjbKih0",
  },
} satisfies MessageDescriptors;

export type ScheduledFormText = { [K in keyof typeof SCHEDULED_FORM_MESSAGES]: string };
