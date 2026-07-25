import { useMemo } from "react";
import {
  type I18nMessages,
  type MessageDescriptor,
  useCurrentLocale,
  useI18nMessages,
} from "../../../i18n/footerMenuMessages";

/**
 * Official index-BELzQL5P p6t / d6t / l6t copy for /task/new active overview.
 * Residual: defaultMessage "Clear active" id 0mQ4LBF4e8 → zh-CN「清除进行中」.
 */
export const COWORK_ACTIVE_TASKS_MESSAGES = {
  inProgress: { defaultMessage: "进行中", id: "3a5wL8wo40" },
  activeTasks: { defaultMessage: "Active tasks", id: "wGcWboPWPh" },
  pinned: { defaultMessage: "已固定", id: "fWZYP5U4xZ" },
  pinnedOrActive: { defaultMessage: "Pinned or active", id: "Lv3Tf/QwaO" },
  clearActive: { defaultMessage: "Clear active", id: "0mQ4LBF4e8" },
  localTask: { defaultMessage: "Local task", id: "LX4QnxZM3M" },
  permissionsNeeded: { defaultMessage: "Permissions needed", id: "sj1qWyUHZh" },
  needsAttention: { defaultMessage: "Needs attention", id: "J8cAGGisOh" },
  unreadActivity: { defaultMessage: "Unread activity", id: "AbKYd6e6lG" },
  noNewActivity: { defaultMessage: "No new activity", id: "J4QXXuiCoV" },
  showMore: { defaultMessage: "Show more", id: "aWpBzjCXKS" },
  showLess: { defaultMessage: "Show less", id: "qyJtWyZ0yt" },
  scheduled: { defaultMessage: "定时任务", id: "cXAlMRerxW" },
  review: { defaultMessage: "Review", id: "R+J5oxt1Fc" },
} as const satisfies Record<string, MessageDescriptor>;

export type CoworkActiveTasksText = Record<keyof typeof COWORK_ACTIVE_TASKS_MESSAGES, string>;

/** Official VSe read-state bag used by p6t clear / YSe unread. */
export const COWORK_ACTIVE_READ_STATE_KEY = "cowork-active-tasks-read-state";

export type CoworkActiveReadState = {
  initializedAt: number;
  sessions: Record<string, number>;
};

export function useCoworkActiveTasksText(): CoworkActiveTasksText {
  const locale = useCurrentLocale();
  const messages = useI18nMessages(locale);
  return useMemo(() => buildCoworkActiveTasksText(messages ?? {}), [messages]);
}

export function buildCoworkActiveTasksText(messages: I18nMessages): CoworkActiveTasksText {
  return Object.fromEntries(
    Object.entries(COWORK_ACTIVE_TASKS_MESSAGES).map(([key, descriptor]) => [
      key,
      messages[descriptor.id] ?? descriptor.defaultMessage,
    ]),
  ) as CoworkActiveTasksText;
}

export function readCoworkActiveReadState(): CoworkActiveReadState {
  if (typeof window === "undefined") return { initializedAt: 0, sessions: {} };
  try {
    const raw = window.localStorage.getItem(COWORK_ACTIVE_READ_STATE_KEY);
    if (!raw) return { initializedAt: 0, sessions: {} };
    const parsed = JSON.parse(raw) as Partial<CoworkActiveReadState>;
    return {
      initializedAt: typeof parsed.initializedAt === "number" ? parsed.initializedAt : 0,
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? parsed.sessions : {},
    };
  } catch {
    return { initializedAt: 0, sessions: {} };
  }
}

export function writeCoworkActiveReadState(state: CoworkActiveReadState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(COWORK_ACTIVE_READ_STATE_KEY, JSON.stringify(state));
}

/** Official clear handler on p6t: reset readState to {sessions:{}, initializedAt:now}. */
export function clearCoworkActiveReadState(): CoworkActiveReadState {
  const next: CoworkActiveReadState = { sessions: {}, initializedAt: Date.now() };
  writeCoworkActiveReadState(next);
  return next;
}

export function markCoworkActiveSessionRead(sessionId: string): void {
  const current = readCoworkActiveReadState();
  const next: CoworkActiveReadState = {
    ...current,
    sessions: { ...current.sessions, [sessionId]: Date.now() },
  };
  writeCoworkActiveReadState(next);
}
