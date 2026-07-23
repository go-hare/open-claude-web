/**
 * Official Response completions / Code push residual (c0db37792 ce/de):
 * when enabling push, request desktop notification authorization if not granted.
 * Bridge: claude.web.DesktopNotifications.getAuthorizationStatus / requestAuthorization.
 *
 * Preference storage (official YBe/ZBe/KBe): feature_preference.compass + completion
 * via PATCH /api/organizations/:uuid/notification/preferences — see useSettingsBootstrap.
 * RESPONSE_COMPLETIONS_KEY is a legacy local mirror only; General UI no longer uses it.
 */

export const RESPONSE_COMPLETIONS_KEY = "settings:responseCompletions";

type DesktopNotificationsBridge = {
  getAuthorizationStatus?: () => Promise<unknown>;
  requestAuthorization?: () => Promise<unknown>;
  openNotificationSettings?: () => Promise<unknown>;
};

function notificationsBridge(): DesktopNotificationsBridge | undefined {
  const web = (window as Window & { "claude.web"?: { DesktopNotifications?: DesktopNotificationsBridge } })[
    "claude.web"
  ];
  return web?.DesktopNotifications;
}

export function readResponseCompletionsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RESPONSE_COMPLETIONS_KEY) === "true";
  } catch {
    return false;
  }
}

export function writeResponseCompletionsEnabled(checked: boolean) {
  try {
    window.localStorage.setItem(RESPONSE_COMPLETIONS_KEY, checked ? "true" : "false");
  } catch {
    /* ignore quota */
  }
  window.dispatchEvent(new StorageEvent("storage", { key: RESPONSE_COMPLETIONS_KEY }));
}

export async function getDesktopNotificationPermissionStatus(): Promise<string> {
  const bridge = notificationsBridge();
  if (bridge?.getAuthorizationStatus) {
    const status = await bridge.getAuthorizationStatus().catch(() => "denied");
    return typeof status === "string" ? status : "denied";
  }
  if (typeof Notification !== "undefined") {
    return Notification.permission;
  }
  return "denied";
}

/**
 * Official: if enabling and permission !== "granted", call requestAuthorization;
 * success when resulting status is granted.
 */
export async function ensureDesktopNotificationPermission(): Promise<boolean> {
  const current = await getDesktopNotificationPermissionStatus();
  if (current === "granted") return true;

  const bridge = notificationsBridge();
  if (bridge?.requestAuthorization) {
    const next = await bridge.requestAuthorization().catch(() => "denied");
    return next === "granted" || next === true;
  }

  if (typeof Notification !== "undefined" && typeof Notification.requestPermission === "function") {
    const next = await Notification.requestPermission();
    return next === "granted";
  }

  return false;
}
