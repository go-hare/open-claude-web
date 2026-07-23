/**
 * Response completions delivery residual honesty:
 *
 * Official chat completion UI push is FCM / service-worker path
 * (SHOW_COMPLETION_NOTIFICATION → new Notification(title, {body})), not
 * DesktopNotifications.showNotification (that residual is VM-ready g6t only).
 *
 * Desktop 3P has no Firebase SW in this shell. Bridge delivery uses the same
 * permission + feature_preference.compass/completion enable_push gate as
 * General ce/YBe, then:
 *   1. claude.web.DesktopNotifications.showNotification(title, body, id?) when present
 *   2. else window Notification when permission === "granted"
 *
 * Only fires when the app is not visible / not focused (user is away), matching
 * the practical purpose of "get notified when Claude has finished a response".
 *
 * Pref mirror: settings:responseCompletions (written when user toggles Response
 * completions) — avoids inventing a second prefs store for the stream path.
 */

import {
  ensureDesktopNotificationPermission,
  getDesktopNotificationPermissionStatus,
  RESPONSE_COMPLETIONS_KEY,
  writeResponseCompletionsEnabled,
} from "./desktopNotificationPermission";

const COMPLETION_EVENT = "claude:response-completion";
const NOTIFY_DEBOUNCE_MS = 1500;
let lastNotifyAt = 0;

type DesktopNotificationsBridge = {
  getAuthorizationStatus?: () => Promise<unknown>;
  requestAuthorization?: () => Promise<unknown>;
  showNotification?: (...args: unknown[]) => Promise<unknown>;
};

function notificationsBridge(): DesktopNotificationsBridge | undefined {
  const web = (window as Window & { "claude.web"?: { DesktopNotifications?: DesktopNotificationsBridge } })[
    "claude.web"
  ];
  return web?.DesktopNotifications;
}

export function syncResponseCompletionsPrefMirror(enabled: boolean) {
  writeResponseCompletionsEnabled(enabled);
}

export function readResponseCompletionsPrefMirror(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RESPONSE_COMPLETIONS_KEY) === "true";
  } catch {
    return false;
  }
}

function appIsAway(): boolean {
  if (typeof document === "undefined") return false;
  if (document.hidden) return true;
  if (typeof document.hasFocus === "function" && !document.hasFocus()) return true;
  return false;
}

/**
 * Call when a long-running turn settles (code session isRunning false / cowork settle).
 * No-op if prefs off, permission denied, or user is focused on the app.
 */
export async function notifyResponseCompletion(input?: {
  body?: string;
  force?: boolean;
  title?: string;
}): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!readResponseCompletionsPrefMirror()) return false;
  if (!input?.force && !appIsAway()) return false;

  const now = Date.now();
  if (now - lastNotifyAt < NOTIFY_DEBOUNCE_MS) return false;
  lastNotifyAt = now;

  const status = await getDesktopNotificationPermissionStatus();
  if (status !== "granted") {
    // Do not re-prompt mid-stream; user enabled via settings which already requested.
    return false;
  }

  const title = input?.title ?? "Claude";
  const body = input?.body ?? "Response complete";
  const id = `completion-${now}`;

  const bridge = notificationsBridge();
  if (bridge?.showNotification) {
    try {
      // Official g6t: showNotification(title, body, id)
      await bridge.showNotification(title, body, id);
      return true;
    } catch {
      /* fall through to Notification API */
    }
  }

  if (typeof Notification !== "undefined" && Notification.permission === "granted") {
    try {
      const notification = new Notification(title, {
        body,
        icon: "/favicon.svg",
        badge: "/favicon.svg",
        tag: id,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
      };
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

/** Emit settle event for App-level listener (keeps stores free of bridge imports if preferred). */
export function emitResponseCompletion(detail?: { body?: string; title?: string }) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COMPLETION_EVENT, { detail }));
}

/** Mount once under App — listens for settle events. */
export function subscribeResponseCompletionEvents(): () => void {
  if (typeof window === "undefined") return () => {};
  const onEvent = (event: Event) => {
    const detail = (event as CustomEvent<{ body?: string; title?: string }>).detail;
    void notifyResponseCompletion(detail);
  };
  window.addEventListener(COMPLETION_EVENT, onEvent);
  return () => window.removeEventListener(COMPLETION_EVENT, onEvent);
}

/** Settings toggle: request permission when enabling (official ce). */
export async function enableResponseCompletionsWithPermission(): Promise<boolean> {
  const granted = await ensureDesktopNotificationPermission();
  if (!granted) return false;
  syncResponseCompletionsPrefMirror(true);
  return true;
}
