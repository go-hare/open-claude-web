/**
 * Official c11959232-CDBo_AYC.js `Bu` / `zu` / `Ru` for Files markdown http(s) links.
 *
 * Pin dump (ion-dist `c11959232-CDBo_AYC.js`):
 *   var Fu=80,Iu=160,Lu=40;
 *   function Ru(e){return e.length<=Lu?e:e.replace(/.{16}/g,"$&​")}
 *   function zu(e){ … hostname Fu / remainder Iu / invalid slice(0,Iu) … }
 *   var Bu=p(function({url:e,onResolve:t}){
 *     … ml(!0,e) → ConfirmDialog disabled:!r
 *     title NoZlb+AuBf "Open this link in your browser?"
 *     description r9f/CaGFqO "This link is part of the previewed file. It will open in your default browser: {url}" {url:zu(e)}
 *     confirm JfG49wNHKP "Open", confirmVariant:"danger"
 *     onConfirm → t(!0); onOpenChange false → t(!1)
 *   })
 *
 * Pin `ml` imported from `cebf5596d-BjJwacsN.js` is a 500ms delay hook, not a URL
 * parser — product `shouldConfirmHttpHref` is the http(s) gate; Confirm Open is
 * `disabled` until `ml(!0, url)` returns true (`!n||i` after 500ms).
 */
import { useEffect, useState } from "react";

/** Official `Fu`. */
export const OFFICIAL_MARKDOWN_LINK_CONFIRM_HOST_MAX = 80;
/** Official `Iu`. */
export const OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX = 160;
/** Official `Lu`. */
export const OFFICIAL_MARKDOWN_LINK_CONFIRM_ZWSP_THRESHOLD = 40;
/** Official cebf5596d `ml` timeout. */
export const OFFICIAL_MARKDOWN_LINK_CONFIRM_DELAY_MS = 500;

/**
 * Official `ml(active, key)` — `!n||i` after 500ms while active.
 * Bu Confirm Open: `disabled:!r` with `r=ml(!0,e)`.
 */
export function useOfficialMarkdownLinkConfirmReady(active: boolean) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return undefined;
    }
    setElapsed(false);
    const timer = window.setTimeout(() => setElapsed(true), OFFICIAL_MARKDOWN_LINK_CONFIRM_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [active]);
  return !active || elapsed;
}

export const OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY = {
  title: {
    id: "NoZlb+AuBf",
    defaultMessage: "Open this link in your browser?",
  },
  description: {
    id: "r9f/CaGFqO",
    defaultMessage:
      "This link is part of the previewed file. It will open in your default browser: {url}",
  },
  confirm: {
    id: "JfG49wNHKP",
    defaultMessage: "Open",
  },
} as const;

/** Official `Ru` — zero-width space every 16 chars once past `Lu`. */
export function insertOfficialMarkdownLinkZwsp(value: string): string {
  return value.length <= OFFICIAL_MARKDOWN_LINK_CONFIRM_ZWSP_THRESHOLD
    ? value
    : value.replace(/.{16}/g, "$&\u200B");
}

/**
 * Official `zu(url)` — truncated display for Bu description `{url}`.
 * Invalid URL → `Ru(url.slice(0, Iu))`.
 * Long hostname → `…` + last `Fu` chars.
 * Long remainder after origin → first/last `Iu/2` with `…`.
 */
export function truncateOfficialMarkdownLinkUrl(url: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return insertOfficialMarkdownLinkZwsp(url.slice(0, OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX));
  }
  const hostname =
    parsed.hostname.length > OFFICIAL_MARKDOWN_LINK_CONFIRM_HOST_MAX
      ? `…${parsed.hostname.slice(-OFFICIAL_MARKDOWN_LINK_CONFIRM_HOST_MAX)}`
      : parsed.hostname;
  const port = parsed.port ? `:${parsed.port}` : "";
  const originDisplay = `${parsed.protocol}//${hostname}${port}`;
  const remainder = url.slice(parsed.origin.length);
  if (remainder.length <= OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX) {
    return insertOfficialMarkdownLinkZwsp(originDisplay + remainder);
  }
  const half = Math.floor(OFFICIAL_MARKDOWN_LINK_CONFIRM_PATH_MAX / 2);
  return insertOfficialMarkdownLinkZwsp(
    `${originDisplay}${remainder.slice(0, half)}…${remainder.slice(remainder.length - half)}`,
  );
}

/** Official Bu description with `zu(url)` interpolated. */
export function formatOfficialMarkdownLinkConfirmDescription(url: string): string {
  return OFFICIAL_MARKDOWN_LINK_CONFIRM_COPY.description.defaultMessage.replace(
    "{url}",
    truncateOfficialMarkdownLinkUrl(url),
  );
}

/**
 * Intercept + confirm-enabled gate for OfficialMarkdownAnchor.
 * http(s) only; local paths / mailto / fragments stay outside Bu.
 */
export function shouldConfirmHttpHref(href: string | undefined | null): boolean {
  if (!href) return false;
  try {
    const parsed = new URL(href);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
