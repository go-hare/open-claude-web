/**
 * Official cf580 Preview header chrome — Globe `jr`, address `ta`, trailing `Ko`, overflow `Q`.
 * Shared between OfficialPreviewPane (owner) and EpitaxySidePanes header (consumer).
 */
import { useSyncExternalStore } from "react";

export type OfficialPreviewServerRow = {
  id: string;
  label: string;
  detail?: string;
  running: boolean;
  starting: boolean;
};

/** Official TI Globe `$` htmlFiles rows (c11959232). */
export type OfficialPreviewHtmlFileItem = {
  hint?: string;
  label: string;
  path: string;
  selected: boolean;
};

export type OfficialPreviewViewport = {
  width: number;
  height: number;
};

export type OfficialPreviewColorScheme = "light" | "dark" | "system";

export type OfficialPreviewChromeState = {
  browseId: string;
  canGoBack: boolean;
  canGoForward: boolean;
  /** Official cf580 `ze` — html-preview hides `ko` back/forward. */
  isHtmlPreview: boolean;
  canReload: boolean;
  canSelect: boolean;
  canOpenExternal: boolean;
  canCopyUrl: boolean;
  canScreenshot: boolean;
  canAnnotate: boolean;
  canOpenHtml: boolean;
  /** Official TI `$` — Nr htmlFiles minus current html-preview selection. */
  htmlFileItems: OfficialPreviewHtmlFileItem[];
  onOpenHtmlFile: (path: string) => void;
  canManageAllowedSites: boolean;
  canAutoVerify: boolean;
  /** Official Ir `onAddServer` — `_e` (canReadLocalDisk) + submitToChat(ca80 `Oq`). */
  canAddServer: boolean;
  /** Official c224 `B` `onExport` — gated on `Launch.exportPreview`. */
  canExport: boolean;
  /** Official `_t` logs row — gated on `Launch.getLogs`. */
  canToggleLogs: boolean;
  logsExpanded: boolean;
  /** Official `_t` `dyp4qWSjux` — gated on `Launch.openExternalLinkInPreview`. */
  canSetLinkDestination: boolean;
  /** Official Kv `epitaxy-transcript-links-in-preview` (c224 checkbox). */
  linksInPreview: boolean;
  /** Official c7c40 `launchPreviewStorage` none|shared|session. */
  previewStorage: "none" | "shared" | "session";
  canSetPreviewStorage: boolean;
  canClearBrowsingData: boolean;
  canExportHtml: boolean;
  /** Official c224 `B` `onImportChromeLogins` — only when c887 `Oe` `w`. */
  canImportChromeLogins: boolean;
  canUseImportedCookies: boolean;
  hasPage: boolean;
  pageUrl: string;
  servers: OfficialPreviewServerRow[];
  viewport: OfficialPreviewViewport | null;
  colorScheme: OfficialPreviewColorScheme;
  autoVerify: boolean;
  onBack: () => void;
  onForward: () => void;
  onReload: () => void;
  onSelect: () => void;
  onOpenExternal: () => void;
  onCopyUrl: () => void;
  onScreenshot: () => void;
  onOpenHtml: () => void;
  onAnnotate: () => void;
  onViewport: (preset: OfficialPreviewViewport | null) => void;
  onColorScheme: (scheme: OfficialPreviewColorScheme) => void;
  onAllowedSites: () => void;
  onAutoVerify: () => void;
  onAddServer: () => void;
  onExport: () => void;
  onToggleLogs: () => void;
  onSetLinkDestination: () => void;
  onToggleLinksInPreview: () => void;
  onPreviewStorage: (value: "none" | "shared" | "session") => void;
  onClearBrowsingData: () => void;
  onExportHtml: () => void;
  onImportChromeLogins: () => void;
  onUseImportedCookies: () => void;
  onNavigate: (url: string) => void;
  onRunServer: (name: string) => void;
  onStopServer: (serverId: string) => void;
  onDetect: () => void;
  selectionOn: boolean;
};

const noop = () => undefined;

const empty: OfficialPreviewChromeState = {
  browseId: "",
  canGoBack: false,
  canGoForward: false,
  isHtmlPreview: false,
  canReload: false,
  canSelect: false,
  canOpenExternal: false,
  canCopyUrl: false,
  canScreenshot: false,
  canAnnotate: false,
  canOpenHtml: false,
  htmlFileItems: [],
  onOpenHtmlFile: noop,
  canManageAllowedSites: false,
  canAutoVerify: false,
  canAddServer: false,
  canExport: false,
  canToggleLogs: false,
  logsExpanded: false,
  canSetLinkDestination: false,
  linksInPreview: true,
  previewStorage: "none",
  canSetPreviewStorage: false,
  canClearBrowsingData: false,
  canExportHtml: false,
  canImportChromeLogins: false,
  canUseImportedCookies: false,
  hasPage: false,
  pageUrl: "",
  servers: [],
  viewport: null,
  colorScheme: "system",
  autoVerify: true,
  onBack: noop,
  onForward: noop,
  onReload: noop,
  onSelect: noop,
  onOpenExternal: noop,
  onCopyUrl: noop,
  onScreenshot: noop,
  onOpenHtml: noop,
  onAnnotate: noop,
  onViewport: noop,
  onColorScheme: noop,
  onAllowedSites: noop,
  onAutoVerify: noop,
  onAddServer: noop,
  onExport: noop,
  onToggleLogs: noop,
  onSetLinkDestination: noop,
  onToggleLinksInPreview: noop,
  onPreviewStorage: noop,
  onClearBrowsingData: noop,
  onExportHtml: noop,
  onImportChromeLogins: noop,
  onUseImportedCookies: noop,
  onNavigate: noop,
  onRunServer: noop,
  onStopServer: noop,
  onDetect: noop,
  selectionOn: false,
};

let current = empty;
const listeners = new Set<() => void>();

export function publishOfficialPreviewChrome(next: OfficialPreviewChromeState | null): void {
  current = next ?? empty;
  listeners.forEach((listener) => listener());
}

export function useOfficialPreviewChrome(): OfficialPreviewChromeState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => empty,
  );
}

/**
 * Official c224 `he`/`pe` (cf580 `Qn`): empty → stay; localhost / host:port → http;
 * dotted host → https (not google-search `Q`; that needs a live page).
 */
export function officialPreviewNavigateUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value || /\s/.test(value)) return null;
  if (/^https?:\/\//i.test(value)) return value;
  if (
    /^localhost(:\d+)?(\/|$)/i.test(value)
    || /^127\.0\.0\.1(:\d+)?(\/|$)/.test(value)
    || /^\[::1\](:\d+)?(\/|$)/i.test(value)
  ) {
    return `http://${value}`;
  }
  if (/^[a-z0-9.-]+:\d+/i.test(value)) return `http://${value}`;
  if (value.includes(".")) return `https://${value.replace(/^\//, "")}`;
  return null;
}

/**
 * Official asar `_Oi` returns boolean. Product Launch IPC wraps
 * `{ ok, url, navigated }`. Host overlay (`showPreview`) must not paint
 * until navigate actually loaded — otherwise titlebar Preview is an empty
 * host rect (no `data-launch-preview-host`).
 */
export function officialNavigatePreviewSucceeded(result: unknown, hostOwned: boolean): boolean {
  if (result === true) return true;
  if (result === false) return false;
  if (result && typeof result === "object") {
    const navigated = (result as { navigated?: unknown }).navigated;
    if (navigated === false) return false;
    if (navigated === true) return true;
  }
  return !hostOwned;
}

/** Official Mi / ja — Copy URL and Open in default browser only for http(s). */
export function officialPreviewIsHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Official cf580 `Fn` `eligible: M && !ze && !Be && ie?.type==="local"`.
 * `ze` = bound id starts with `html-preview-`.
 * `Be` = shared-75 `ES` = bound id starts with `design-preview-`.
 * `M` is `DF()` Preview-available — this pane is that surface.
 * Empty Globe is still eligible; overlay needs `previewId` separately (`i??null`).
 */
export function officialChromeImportFnEligible(input: {
  sessionType?: string | null;
  previewId?: string | null;
}): boolean {
  if (input.sessionType !== "local") return false;
  const id = input.previewId ?? "";
  if (id.startsWith("html-preview-") || id.startsWith("design-preview-")) return false;
  return true;
}

/**
 * Official cf580 `Fn` `previewId: i??null`.
 * Empty Globe has no bound server — overlay must not fire.
 * A live http(s) page without a Launch server id uses the browse_* host id.
 */
export function officialChromeImportPreviewId(input: {
  eligible: boolean;
  liveServerId?: string | null;
  browseId: string;
  httpPage: boolean;
}): string | null {
  if (!input.eligible) return null;
  if (input.liveServerId) return input.liveServerId;
  if (input.httpPage) return input.browseId;
  return null;
}
