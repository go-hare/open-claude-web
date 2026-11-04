/**
 * Official c887 `Ce` / `K` — Import cookies error copy.
 * `{browser}` is formatMessage values, not a raw placeholder.
 */
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";

export type OfficialChromeImportErrorChrome = {
  browsersSavedCookiesCouldntBeRead: string;
  couldntFindBrowsersSavedCookies: string;
  couldntImportThoseSites: string;
  couldntReadBrowsersData: string;
  couldntReadKeyring: string;
  ifPopupStillOpenCloseIt: string;
  importAlreadyInProgress: string;
  importCookiesFailed: string;
  macosBlockedClaude: string;
  noConfirmationWithin2Minutes: string;
  openAWebsiteFirst: string;
  popupMayBeBehind: string;
  thatTookAWhileConfirm: string;
  thatTookAWhileTouchId: string;
};

/** Official shared-75 `Ea` — Windows UA. `K` appends extra sentence when true. */
export function officialChromeImportIsWindows(userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent) {
  return /(win32|win64|windows|wince)/i.test(userAgent.toLowerCase());
}

/** Official `Ce(intl, error, browserName, touchId)`. Null = no red line (`presence_declined` / `keychain_denied`). */
export function officialChromeImportErrorCopy(
  chrome: OfficialChromeImportErrorChrome,
  error: string | null | undefined,
  browser: string,
  touchId: boolean,
  isWindows = officialChromeImportIsWindows(),
): string | null {
  if (!error) return null;
  const b = { browser };
  switch (error) {
    case "presence_declined":
    case "keychain_denied":
      return null;
    case "keychain_item_missing":
    case "no_chrome":
      return formatOfficialIcu(chrome.couldntFindBrowsersSavedCookies, b);
    case "ticket_invalid":
      return touchId ? chrome.thatTookAWhileTouchId : chrome.thatTookAWhileConfirm;
    case "read_failed":
      return formatOfficialIcu(chrome.couldntReadBrowsersData, b);
    case "access_blocked":
      return formatOfficialIcu(chrome.macosBlockedClaude, b);
    case "keyring_unavailable":
      return formatOfficialIcu(chrome.couldntReadKeyring, b);
    case "no_target":
      return chrome.openAWebsiteFirst;
    case "bad_selection":
      return chrome.couldntImportThoseSites;
    case "all_failed":
      return formatOfficialIcu(chrome.browsersSavedCookiesCouldntBeRead, b);
    case "presence_timed_out":
    case "busy": {
      const [main, extra] = error === "busy"
        ? [chrome.importAlreadyInProgress, chrome.popupMayBeBehind]
        : [chrome.noConfirmationWithin2Minutes, chrome.ifPopupStillOpenCloseIt];
      return isWindows ? `${main} ${extra}` : main;
    }
    default:
      return formatOfficialIcu(chrome.importCookiesFailed, b);
  }
}
