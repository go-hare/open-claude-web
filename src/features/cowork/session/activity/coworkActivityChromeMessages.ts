import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  type MessageDescriptors,
  useCurrentLocale,
  useI18nMessages,
} from "../../../../i18n/footerMenuMessages";

/**
 * Official Cowork activity chrome (Desktop 2.31226.1):
 * - Progress empty: c21f11e6d Nx / cKZ0dC17TM
 * - Working-folder empty: c21f Fx / p41Nenxyun
 * - Context empty: c21f zx / WXQkdiBWrh
 * - Instructions row: c21f vx / Cntk+3fYyG + literal " · CLAUDE.md"
 * - Instruction editor fy/py: dqW6sjmil4 / VOHzFFMkVd / RP0HgGFG5M / 47FYwba+bI / jvo0vs3nF0
 * - Aside aria: c21f11e6d xQt / Rv63mdeh9J (catalog may still carry dwK+dX/jlM)
 * - Toggle active aria: shared-16 gc / STsdS5DBIF
 * - Panel shown/hidden announce: shared-16 hc / KvZ/Y+kzT5 + 5H5/7BT0aA
 * - Sidebar open/close toggle: shared-16 mc / HyS0qpbEJw + +G35mRWa75
 */
export const COWORK_ACTIVITY_CHROME_MESSAGES = {
  progressEmpty: {
    defaultMessage: "Progress on longer tasks appears here.",
    id: "cKZ0dC17TM",
  },
  /** Official c21 Fx / Ix working-folder empty. spa zh catalog is still EN. */
  artifactsEmpty: {
    defaultMessage: "View and open files created during this task.",
    id: "p41Nenxyun",
  },
  /** Official c21 zx context empty. spa zh catalog is still EN. */
  contextEmpty: {
    defaultMessage: "Track tools and referenced files used in this task.",
    id: "WXQkdiBWrh",
  },
  /** Official c21 vx / working-folder row + editor textarea aria. Filename suffix stays literal CLAUDE.md. */
  instructions: {
    defaultMessage: "Instructions",
    id: "Cntk+3fYyG",
  },
  /** Official c21 fy Header title. spa zh catalog is still EN. */
  folderInstructions: {
    defaultMessage: "Folder instructions",
    id: "dqW6sjmil4",
  },
  /** Official c21 fy Header description. spa zh catalog is still EN. */
  folderInstructionsDescription: {
    defaultMessage: "Use this to give Claude instructions for working in this folder.",
    id: "VOHzFFMkVd",
  },
  /** Official c21 py textarea placeholder. spa zh catalog is still EN. */
  folderInstructionsPlaceholder: {
    defaultMessage:
      "Example:\nThis folder contains marketing campaign briefs written for external agencies\nTone: direct and professional, not chatty\nKeep deliverables and timelines in a table format",
    id: "RP0HgGFG5M",
  },
  loading: {
    defaultMessage: "Loading...",
    id: "gjBiyjshwX",
  },
  cancel: {
    defaultMessage: "Cancel",
    id: "47FYwba+bI",
  },
  save: {
    defaultMessage: "Save",
    id: "jvo0vs3nF0",
  },
  saving: {
    defaultMessage: "Saving…",
    id: "WUV28A6Pf2",
  },
  /** Official c21 aQt header. spa zh already 推荐连接器. */
  suggestedConnectors: {
    defaultMessage: "Suggested connectors",
    id: "4lWgUGlrk4",
  },
  /** Official c21 aQt dismiss aria. spa zh still EN. */
  dismissSuggestedConnectors: {
    defaultMessage: "Dismiss suggested connectors",
    id: "oTpBaPoiSn",
  },
  /** Official c21 aQt Cowork branch (`f` false) — not Code `MUONBnldPS`. */
  coworkUsesConnectors: {
    defaultMessage: "Cowork uses connectors to browse websites, manage tasks, and more.",
    id: "1m8v9zsHNC",
  },
  /** Official c21 aQt See all. spa zh already 查看全部连接器. */
  seeAllConnectors: {
    defaultMessage: "See all connectors",
    id: "7fCBPXAUhO",
  },
  /** Official c21 Xv CLAUDE.md global displayName. spa zh already 全局说明. */
  globalInstructions: {
    defaultMessage: "Global instructions",
    id: "53DiPrdI5r",
  },
  /** Official c21 aside aria (Rv63mdeh9J). Older BELz used dwK+dX/jlM for the same EN. */
  sessionActivityPanel: {
    defaultMessage: "Session activity panel",
    id: "Rv63mdeh9J",
  },
  activityPanel: {
    defaultMessage: "Activity panel",
    id: "STsdS5DBIF",
  },
  activityPanelShown: {
    defaultMessage: "Activity panel shown",
    id: "KvZ/Y+kzT5",
  },
  activityPanelHidden: {
    defaultMessage: "Activity panel hidden",
    id: "5H5/7BT0aA",
  },
  closeSidebar: {
    defaultMessage: "Close sidebar",
    id: "HyS0qpbEJw",
  },
  openSidebar: {
    defaultMessage: "Open sidebar",
    id: "+G35mRWa75",
  },
} as const satisfies MessageDescriptors;

export type CoworkActivityChromeText = Record<keyof typeof COWORK_ACTIVITY_CHROME_MESSAGES, string>;

export function buildCoworkActivityChromeText(messages: I18nMessages): CoworkActivityChromeText {
  return Object.fromEntries(
    Object.entries(COWORK_ACTIVITY_CHROME_MESSAGES).map(([key, descriptor]: [string, MessageDescriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkActivityChromeText;
}

export function useCoworkActivityChromeText(): CoworkActivityChromeText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkActivityChromeText(messages ?? {}), [messages]);
}
