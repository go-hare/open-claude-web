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
  scheduled: { defaultMessage: "Scheduled tasks", id: "cXAlMRerxW" },
  review: { defaultMessage: "Review", id: "R+J5oxt1Fc" },
} as const satisfies Record<string, MessageDescriptor>;

export type CoworkActiveTasksText = Record<keyof typeof COWORK_ACTIVE_TASKS_MESSAGES, string>;

/**
 * Official residual `$Se` in index-BELzQL5P.js:
 *   const $Se = "cowork-read-state"
 * GSe seeds `{ sessions: {}, initializedAt: Date.now() }` on first load so the
 * p6t filter does not treat every historical cowork session as "in progress".
 *
 * Product previously used `cowork-active-tasks-read-state` with initializedAt:0,
 * which made activityAt > 0 always pass — flooding /task/new with old recents
 * (looks like a second "cowork" list next to suggestions).
 */
export const COWORK_ACTIVE_READ_STATE_KEY = "cowork-read-state";

/** Pre-fix product key — migrate once into official residual key. */
export const COWORK_ACTIVE_READ_STATE_LEGACY_KEY = "cowork-active-tasks-read-state";

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

function seedFreshReadState(now = Date.now()): CoworkActiveReadState {
  return { initializedAt: now, sessions: {} };
}

function parseReadStateJson(raw: string | null): CoworkActiveReadState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CoworkActiveReadState>;
    // Official GSe: only accept when initializedAt is a positive number.
    // Product bug left initializedAt:0 which admits every historical session.
    if (typeof parsed.initializedAt !== "number" || !(parsed.initializedAt > 0)) {
      return null;
    }
    return {
      initializedAt: parsed.initializedAt,
      sessions:
        parsed.sessions && typeof parsed.sessions === "object" && !Array.isArray(parsed.sessions)
          ? Object.fromEntries(
              Object.entries(parsed.sessions).filter(
                (entry): entry is [string, number] => typeof entry[1] === "number",
              ),
            )
          : {},
    };
  } catch {
    return null;
  }
}

/**
 * Official GSe residual: load `cowork-read-state`, or seed initializedAt=now.
 * Also migrates the product legacy key when the official key is absent.
 */
export function readCoworkActiveReadState(): CoworkActiveReadState {
  if (typeof window === "undefined") return seedFreshReadState(0);

  const fromOfficial = parseReadStateJson(window.localStorage.getItem(COWORK_ACTIVE_READ_STATE_KEY));
  if (fromOfficial) return fromOfficial;

  const fromLegacy = parseReadStateJson(
    window.localStorage.getItem(COWORK_ACTIVE_READ_STATE_LEGACY_KEY),
  );
  if (fromLegacy) {
    writeCoworkActiveReadState(fromLegacy);
    try {
      window.localStorage.removeItem(COWORK_ACTIVE_READ_STATE_LEGACY_KEY);
    } catch {
      // ignore quota / private mode
    }
    return fromLegacy;
  }

  // Official GSe first-run: persist watermark so old sessions stay out of p6t.
  const fresh = seedFreshReadState();
  writeCoworkActiveReadState(fresh);
  return fresh;
}

export function writeCoworkActiveReadState(state: CoworkActiveReadState): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(COWORK_ACTIVE_READ_STATE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota / private mode
  }
}

/** Official clear handler on p6t: reset readState to {sessions:{}, initializedAt:now}. */
export function clearCoworkActiveReadState(): CoworkActiveReadState {
  const next = seedFreshReadState();
  writeCoworkActiveReadState(next);
  return next;
}

/** Official KSe residual — mark one session read at now. */
export function markCoworkActiveSessionRead(sessionId: string): void {
  const current = readCoworkActiveReadState();
  const next: CoworkActiveReadState = {
    ...current,
    sessions: { ...current.sessions, [sessionId]: Date.now() },
  };
  writeCoworkActiveReadState(next);
}

/**
 * Official YSe residual:
 *   unread if lastActivity > per-session read watermark, else > initializedAt.
 * (Does not short-circuit on bridge isUnread / isRunning — those gate the filter.)
 */
export function isCoworkSessionUnreadForOverview(
  session: { id: string; updatedAtMs?: number; createdAtMs?: number },
  readState: CoworkActiveReadState,
): boolean {
  const activityAt = session.updatedAtMs || session.createdAtMs || 0;
  if (!activityAt) return false;
  const readAt = readState.sessions[session.id];
  if (readAt === undefined) return activityAt > (readState.initializedAt ?? 0);
  return activityAt > readAt;
}
