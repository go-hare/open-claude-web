import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  type MessageDescriptors,
  useCurrentLocale,
  useI18nMessages,
} from "../../../i18n/footerMenuMessages";

/**
 * Official Cowork chrome residual (c62135ccf / shared-8 / shared-16):
 * CAt send, stop/queue, scroll, title menu, folder picker, Default model, add-menu labels.
 * Wave 1 retargets Add+/folder chin ids; Wave 2 retargets Stop/Schedule.
 */
export const COWORK_CHROME_MESSAGES = {
  startTask: { defaultMessage: "Start task", id: "6Jb0AX1uQx" },
  sendMessage: { defaultMessage: "Send message", id: "Xx0WZVz8QS" },
  /** Official shared-8 OnsnuZtVJO. */
  addFilesConnectorsMore: { defaultMessage: "Add files, connectors, and more", id: "OnsnuZtVJO" },
  /** Official shared-8 Stop aria (9PawskFnw4). */
  stopResponse: { defaultMessage: "Stop response", id: "9PawskFnw4" },
  stopClaudeResponse: { defaultMessage: "Stop Claude response", id: "BonFmr6O3r" },
  /** Official visible+aria Queue (4YDNPC1W1k) — residual no longer has UcgUidrDGx "Queue message". */
  queue: { defaultMessage: "Queue", id: "4YDNPC1W1k" },
  scrollToBottom: { defaultMessage: "Scroll to bottom", id: "p4l9m92DsT" },
  /** Official c752 Qa / vVSGqeakjA. */
  addFilesOrPhotos: { defaultMessage: "Add files or photos", id: "vVSGqeakjA" },
  addFolder: { defaultMessage: "Add folder", id: "lhYeghbH/7" },
  addConnectors: { defaultMessage: "Add connectors", id: "2dXigF1Pil" },
  /** Official shared-5 / c752 u8sCx7LYvW (no ellipsis). */
  addPlugins: { defaultMessage: "Add plugins", id: "u8sCx7LYvW" },
  plugins: { defaultMessage: "Plugins", id: "QJAllUAc2k" },
  skills: { defaultMessage: "Skills", id: "EJSVsOA19u" },
  connectors: { defaultMessage: "Connectors", id: "2mMJRvsAg1" },
  /** Official shared-8 eTP2WIUJLu chin / project picker. */
  workInProject: { defaultMessage: "Work in a project or folder", id: "eTP2WIUJLu" },
  chooseDifferentFolder: { defaultMessage: "Choose a different folder", id: "pUw3V25bbE" },
  folderDefault: { defaultMessage: "Default", id: "lKv8exH0MR" },
  defaultModel: { defaultMessage: "Default model", id: "bV+YmcFCEb" },
  model: { defaultMessage: "Model", id: "rhSI1/3g21" },
  /** Official shared-16 Schedule menu (1rQBje0k5s). */
  schedule: { defaultMessage: "Schedule", id: "1rQBje0k5s" },
  turnIntoSkill: { defaultMessage: "Turn into skill", id: "ufQmUah9fM" },
  deleteTaskTitle: { defaultMessage: "Delete task?", id: "eUpNsKBsYx" },
  deleteTaskMessage: {
    defaultMessage: "This task will be permanently deleted from your computer and Anthropic's servers, and can't be undone.",
    id: "SxY4rjRzn8",
  },
  renameSession: { defaultMessage: "Rename session", id: "o96GILnoRP" },
  sessionName: { defaultMessage: "Session name", id: "mvdlXjfNEZ" },
  untitled: { defaultMessage: "Untitled", id: "3kbIhS7KZS" },
  renameSessionAria: { defaultMessage: "{name}, rename session", id: "Z444Es4IIr" },
  moreOptionsFor: { defaultMessage: "More options for {label}", id: "rKQPgfPvWS" },
  moreOptions: { defaultMessage: "More options", id: "IzCVhGdYVc" },
  /** Official shared-7 session placeholder (CI9xffp7fP). */
  writeMessage: { defaultMessage: "Write a message…", id: "CI9xffp7fP" },
  orReplyDirectly: { defaultMessage: "Or reply directly…", id: "NwUAfHUQN1" },
  continueWithoutAnswering: { defaultMessage: "Continue without answering", id: "/e1WqvRJdO" },
} as const satisfies MessageDescriptors;

export type CoworkChromeText = Record<keyof typeof COWORK_CHROME_MESSAGES, string>;

export function buildCoworkChromeText(messages: I18nMessages): CoworkChromeText {
  return Object.fromEntries(
    Object.entries(COWORK_CHROME_MESSAGES).map(([key, descriptor]: [string, MessageDescriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkChromeText;
}

export function useCoworkChromeText(): CoworkChromeText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkChromeText(messages ?? {}), [messages]);
}

export function interpolateCoworkChrome(template: string, values: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? "");
}
