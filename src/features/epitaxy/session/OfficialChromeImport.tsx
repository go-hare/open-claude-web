/**
 * Official c887 `Oe` / `J` — Preview overflow Import cookies… + modal.
 * Native: Launch.getChromeImportAvailability / listChromeImportProfiles /
 * listChromeImportSites / importChromeLogins / listImportedChromeLogins /
 * removeImportedChromeLogins. Menu items only when available===true (Oe `w`).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton, OfficialModal } from "../OfficialEpitaxyComponents";
import { OfficialCheckbox } from "../../shared/OfficialCheckbox";
import { OfficialSwitch } from "../../shared/OfficialSwitch";
import { PREVIEW_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";
import { useDesktopPreferences } from "../../settings/useDesktopPreferences";
import { officialChromeImportErrorCopy, officialChromeImportIsWindows } from "./officialChromeImportError";

type LaunchChromeImport = {
  getChromeImportAvailability?: () => Promise<{ available?: boolean; touchId?: boolean; reason?: string } | null | undefined>;
  listChromeImportProfiles?: () => Promise<
    Array<{ id: string; name: string; lastUsed?: boolean; browser?: string; browserName?: string }> | null | undefined
  >;
  listChromeImportSites?: (
    previewId: string,
    profileId?: string,
    cwd?: string,
  ) => Promise<{
    ok?: boolean;
    error?: string;
    ticket?: string;
    cap?: number;
    maxSites?: number;
    sites?: ChromeImportSite[];
    storageIsEphemeral?: boolean;
  } | null | undefined>;
  importChromeLogins?: (
    previewId: string,
    ticket: string,
    roots: string[],
    persistRequested?: boolean,
    cwd?: string,
  ) => Promise<{
    ok?: boolean;
    error?: string;
    results?: Array<{ imported?: number; failedDecrypt?: number; failedSet?: number }>;
    storageCarried?: boolean;
  } | null | undefined>;
  listImportedChromeLogins?: (previewId: string) => Promise<Array<{ root: string; importedAt?: string }> | null | undefined>;
  removeImportedChromeLogins?: (
    previewId: string,
    root?: string,
    cwd?: string,
  ) => Promise<Array<{ root: string; importedAt?: string }> | null | undefined>;
  /** Official asar `Dt` — `Launch.getChromeImportSharedOffer(previewId, anySite?)`. Product bag carries cwd/url for AOi. */
  getChromeImportSharedOffer?: (
    previewId: string | { previewId: string; cwd?: string; url?: string },
    anySite?: boolean,
  ) => Promise<{ offer?: boolean; sites?: number; site?: string; storageIsEphemeral?: boolean } | null | undefined>;
  /** Official asar `Ot`/`kt` — `Launch.acceptChromeImportSharedOffer(previewId, keepSignedIn)`. */
  acceptChromeImportSharedOffer?: (
    previewId: string | { previewId: string; cwd?: string; url?: string },
    keepSignedIn?: boolean,
  ) => Promise<{ ok?: boolean; error?: string; reloaded?: boolean } | null | undefined>;
};

const SHARED_OFFER_OPTOUT_KEY = "chrome-import-shared-offer-optout";
const SHARED_OFFER_SNOOZE_KEY = "chrome-import-shared-offer-snooze";
const IMPORT_PROMPT_SNOOZE_KEY = "chrome-import-prompt-snooze";
const IMPORT_PROMPT_SEEN_KEY = "chrome-import-prompt-card";
const SNOOZE_DAYS = [1, 3, 5];
const DAY_MS = 864e5;
/** Official c887 `Y=24e4` — auto-dismiss overlay. */
const PROMPT_TIMEOUT_MS = 240_000;

/** Official c224 `ae=g()?["firefox"]:v()?["chrome","firefox"]:["chrome","edge","firefox"]` — g=windows Ea, v=linux Da. */
function officialChromeImportPromptBrowsers() {
  if (typeof navigator === "undefined") return ["chrome", "edge", "firefox"] as const;
  const ua = navigator.userAgent.toLowerCase();
  if (officialChromeImportIsWindows()) return ["firefox"] as const;
  if (typeof window !== "undefined" && /\blinux\b/.test(ua) && !/android/.test(ua)) {
    return ["chrome", "firefox"] as const;
  }
  return ["chrome", "edge", "firefox"] as const;
}

type SharedOffer = { site: string; sites: number; storageIsEphemeral: boolean };

function readFlag(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? "true" : "false");
  } catch {
    /* ignore */
  }
}

function readSnooze(key: string): { snoozed: boolean; count: number } {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key) ?? "null") as { count?: number; until?: number } | null;
    const count = Number.isInteger(raw?.count) ? Math.min(Math.max(raw?.count ?? 0, 0), SNOOZE_DAYS.length) : 0;
    const until = Number.isFinite(raw?.until) ? Number(raw?.until) : 0;
    return { snoozed: Date.now() < until, count };
  } catch {
    return { snoozed: false, count: 0 };
  }
}

function writeSnooze(key: string, count: number): boolean {
  const days = SNOOZE_DAYS[count];
  if (days === undefined) return false;
  try {
    window.localStorage.setItem(key, JSON.stringify({ count: count + 1, until: Date.now() + days * DAY_MS }));
    return true;
  } catch {
    return false;
  }
}

export type ChromeImportSite = {
  root: string;
  cookieCount?: number;
  hostCount?: number;
  lastAccess?: number;
  sensitive?: "identity" | "email" | "financial" | null;
  suggested?: boolean;
};

export type ChromeImportProfile = {
  id: string;
  name: string;
  lastUsed?: boolean;
  browser?: string;
  browserName?: string;
};

const SITE_CAP = 50;

function launchChromeImport(): LaunchChromeImport | null {
  const web = (window as Window & { "claude.web"?: { Launch?: LaunchChromeImport } })["claude.web"];
  return web?.Launch ?? null;
}

type ModalKind =
  | { kind: "setup"; busy: boolean }
  | {
      kind: "pick";
      ticket: string | null;
      declined: number;
      browserName: string;
      profileName: string;
      storageIsEphemeral: boolean;
      cap: number;
      sites: ChromeImportSite[];
      selected: Set<string>;
      filter: string;
      busy: boolean;
    }
  | { kind: "manage"; busyRoot: string | null };

const SETUP: ModalKind = { kind: "setup", busy: false };

export function useOfficialChromeImport(previewId: string | null, cwd?: string, pageUrl?: string) {
  const [available, setAvailable] = useState(false);
  const [touchId, setTouchId] = useState(false);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"import" | "manage">("import");
  const [preferences, setPreference, prefsHydrated] = useDesktopPreferences();
  const promptState = preferences.launchChromeImportPrompt ?? "pending";
  const [pageOffer, setPageOffer] = useState<SharedOffer | null>(null);
  const [anyOffer, setAnyOffer] = useState<SharedOffer | null>(null);
  const [menuSharedOpen, setMenuSharedOpen] = useState(false);
  const menuSharedOpenRef = useRef(false);
  menuSharedOpenRef.current = menuSharedOpen;
  const [acceptedShared, setAcceptedShared] = useState(false);
  /** Official c887 `x`/`S` — timeout or import started this session hides D, not shared `_e`. */
  const [sessionPromptHandled, setSessionPromptHandled] = useState(false);
  const [optOut, setOptOut] = useState(() => readFlag(SHARED_OFFER_OPTOUT_KEY));
  const [promptSnoozed, setPromptSnoozed] = useState(() => readSnooze(IMPORT_PROMPT_SNOOZE_KEY).snoozed);
  const [sharedSnoozed, setSharedSnoozed] = useState(() => readSnooze(SHARED_OFFER_SNOOZE_KEY).snoozed);
  const restoredDismissed = useRef(false);

  useEffect(() => {
    if (restoredDismissed.current) return;
    restoredDismissed.current = true;
    try {
      const seen = window.localStorage.getItem(IMPORT_PROMPT_SEEN_KEY) !== null;
      window.localStorage.setItem(IMPORT_PROMPT_SEEN_KEY, "1");
      if (!seen && promptState === "dismissed") {
        void setPreference("launchChromeImportPrompt", "pending");
      }
    } catch {
      /* ignore */
    }
  }, [promptState, setPreference]);

  useEffect(() => {
    if (!previewId) {
      setAvailable(false);
      return;
    }
    let alive = true;
    void launchChromeImport()
      ?.getChromeImportAvailability?.()
      .then((result) => {
        if (!alive) return;
        setAvailable(result?.available === true);
        setTouchId(result?.touchId === true);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [previewId]);

  const pageKey = pageUrl && pageUrl.length > 0 ? pageUrl : null;
  const canQueryShared = Boolean(available && previewId && pageKey && !open && !acceptedShared);

  useEffect(() => {
    if (!canQueryShared || promptState !== "done" || optOut || sharedSnoozed || !previewId) {
      setPageOffer(null);
      return;
    }
    let alive = true;
    void launchChromeImport()
      ?.getChromeImportSharedOffer?.({ previewId, cwd, url: pageKey ?? undefined }, false)
      .then((result) => {
        if (!alive) return;
        if (result?.offer === true && result.site) {
          setPageOffer({
            site: result.site,
            sites: result.sites ?? 1,
            storageIsEphemeral: result.storageIsEphemeral === true,
          });
        } else {
          setPageOffer(null);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [canQueryShared, cwd, optOut, previewId, promptState, sharedSnoozed, pageKey]);

  useEffect(() => {
    if (!canQueryShared || promptState !== "done" || !previewId) {
      setAnyOffer(null);
      return;
    }
    let alive = true;
    void launchChromeImport()
      ?.getChromeImportSharedOffer?.({ previewId, cwd, url: pageKey ?? undefined }, true)
      .then((result) => {
        if (!alive) return;
        if (result?.offer === true && result.site) {
          setAnyOffer({
            site: result.site,
            sites: result.sites ?? 1,
            storageIsEphemeral: result.storageIsEphemeral === true,
          });
        } else if (result && result.offer !== true) {
          setAnyOffer(null);
        }
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [canQueryShared, cwd, previewId, promptState, pageKey]);

  useEffect(() => {
    if (menuSharedOpen && !anyOffer) setMenuSharedOpen(false);
  }, [anyOffer, menuSharedOpen]);

  const onMenuImport =
    available && previewId
      ? () => {
          setMode("import");
          setOpen(true);
        }
      : undefined;

  const onMenuUseImported = anyOffer
    ? () => {
        setMenuSharedOpen(true);
      }
    : undefined;

  const activeShared = menuSharedOpen ? anyOffer : pageOffer;
  const sharedPrompt = activeShared
    ? {
        variant: "shared" as const,
        sharedSite: activeShared.site,
        sharedOtherSites: Math.max(0, activeShared.sites - 1),
        storageIsEphemeral: activeShared.storageIsEphemeral,
        onImport: (keepSignedIn = true) => {
          if (!previewId) return;
          void launchChromeImport()
            ?.acceptChromeImportSharedOffer?.({ previewId, cwd, url: pageKey ?? undefined }, keepSignedIn)
            .catch(() => undefined)
            .then(() => {
              void setPreference("launchChromeImportPrompt", "done");
              setAcceptedShared(true);
              setMenuSharedOpen(false);
            });
        },
        onNotNow: () => {
          void setPreference("launchChromeImportPrompt", "done");
          const fromMenu = menuSharedOpenRef.current;
          setMenuSharedOpen(false);
          if (!fromMenu) {
            const current = readSnooze(SHARED_OFFER_SNOOZE_KEY);
            if (!writeSnooze(SHARED_OFFER_SNOOZE_KEY, current.count)) {
              writeFlag(SHARED_OFFER_OPTOUT_KEY, true);
              setOptOut(true);
            } else {
              setSharedSnoozed(true);
            }
          }
        },
        onNever: () => {
          void setPreference("launchChromeImportPrompt", "done");
          setMenuSharedOpen(false);
          writeFlag(SHARED_OFFER_OPTOUT_KEY, true);
          setOptOut(true);
        },
      }
    : null;

  const importPrompt =
    prefsHydrated
    && available
    && previewId
    && promptState === "pending"
    && !promptSnoozed
    && !open
    && !sessionPromptHandled
      ? {
          variant: "import" as const,
          sharedSite: "",
          sharedOtherSites: 0,
          storageIsEphemeral: false,
          onImport: () => {
            setSessionPromptHandled(true);
            setMode("import");
            setOpen(true);
          },
          onNotNow: () => {
            const current = readSnooze(IMPORT_PROMPT_SNOOZE_KEY);
            if (!writeSnooze(IMPORT_PROMPT_SNOOZE_KEY, current.count)) {
              void setPreference("launchChromeImportPrompt", "dismissed");
            } else {
              setPromptSnoozed(true);
            }
          },
          onNever: () => {
            void setPreference("launchChromeImportPrompt", "dismissed");
          },
        }
      : null;

  const promptModel = (menuSharedOpen ? sharedPrompt : null) ?? importPrompt ?? sharedPrompt;
  const promptVisible = promptModel !== null;

  useEffect(() => {
    if (!promptVisible) return;
    const timer = window.setTimeout(() => {
      setSessionPromptHandled(true);
      setMenuSharedOpen(false);
    }, PROMPT_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [promptVisible, menuSharedOpen]);

  return {
    available,
    modal: previewId ? (
      <OfficialChromeImportModal
        cwd={cwd}
        onClose={(reason) => {
          setOpen(false);
          if (reason === "imported") {
            void setPreference("launchChromeImportPrompt", "done");
            setAcceptedShared(true);
          }
        }}
        open={open}
        previewId={previewId}
        startManage={mode === "manage"}
        touchId={touchId}
      />
    ) : null,
    onMenuImport,
    onMenuUseImported,
    prompt: promptModel ? <OfficialChromeImportPrompt {...promptModel} /> : null,
  };
}

function OfficialChromeImportPrompt({
  onImport,
  onNever,
  onNotNow,
  sharedOtherSites = 0,
  sharedSite = "",
  storageIsEphemeral = false,
  variant = "import",
}: {
  onImport: (keepSignedIn?: boolean) => void;
  onNever: () => void;
  onNotNow: () => void;
  sharedOtherSites?: number;
  sharedSite?: string;
  storageIsEphemeral?: boolean;
  variant?: "import" | "shared";
}) {
  const chrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const shared = variant === "shared";
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [busy, setBusy] = useState(false);
  const regionRef = useRef<HTMLDivElement | null>(null);
  const titleId = "chrome-import-prompt-title";

  useEffect(() => {
    regionRef.current?.focus();
  }, []);

  const body = shared
    ? sharedOtherSites > 0
      ? formatOfficialIcu(chrome.importedCookiesForSiteAndOthers, { site: sharedSite, others: sharedOtherSites })
      : chrome.importedCookiesForSite.replace("{site}", sharedSite)
    : chrome.importCookiesSoSitesOpen;

  const accept = () => {
    if (busy) return;
    setBusy(true);
    onImport(shared ? !storageIsEphemeral || keepSignedIn : undefined);
  };

  return (
    <div
      className="absolute inset-0 flex items-center justify-center bg-backdrop p-lg draggable-none"
      data-pane-editor=""
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (!busy) onNotNow();
          return;
        }
        if (event.key !== "Tab") return;
        const nodes = regionRef.current?.querySelectorAll("button, [href], [tabindex]:not([tabindex='-1'])");
        const first = nodes?.[0];
        const last = nodes?.[nodes.length - 1];
        if (!(first instanceof HTMLElement) || !(last instanceof HTMLElement)) return;
        if (event.shiftKey && (event.target === first || event.target === regionRef.current)) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && event.target === last) {
          event.preventDefault();
          first.focus();
        }
      }}
      role="presentation"
    >
      <div
        aria-labelledby={titleId}
        className="flex w-full max-w-[30rem] flex-col gap-lg rounded-card bg-surface-popover p-xl text-body text-primary shadow-panel-lg outline-none"
        ref={regionRef}
        role="region"
        tabIndex={-1}
      >
        {shared ? null : (
          <div className="flex items-center justify-center gap-sm" data-official-source="c224804cc-Cihs1Tbi.js:ae">
            {officialChromeImportPromptBrowsers().map((browser) => (
              <img alt="" className="size-7" key={browser} src={`/images/browser-logos/${browser}.svg`} />
            ))}
          </div>
        )}
        <div className="flex flex-col gap-xs text-center">
          <h2 className="m-0 text-title font-semibold" id={titleId}>
            {shared ? chrome.useImportedCookiesTitle : chrome.staySignedInToYourSites}
          </h2>
          <p className="m-0 text-body text-secondary">{body}</p>
        </div>
        {shared && storageIsEphemeral ? (
          <div className="overflow-clip rounded-card bg-alpha-1 text-start">
            <div className="flex min-h-[40px] items-center gap-sm px-lg py-md">
              <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body text-primary">{chrome.keepMeSignedIn}</span>
                <span className="text-footnote text-muted">
                  {keepSignedIn ? chrome.setsKeepCookiesToShared : chrome.keepsYouSignedInUntilQuit}
                </span>
              </label>
              <OfficialSwitch checked={keepSignedIn} disabled={busy} onCheckedChange={setKeepSignedIn} />
            </div>
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-sm p-0 text-body text-secondary" role="list">
          {shared ? (
            storageIsEphemeral ? (
              <li className="flex items-start gap-sm">
                <Icon className="mt-0.5 shrink-0 text-secondary" name="CheckCircle" size="sm" />
                {chrome.youCanChangeKeepCookiesLater}
              </li>
            ) : null
          ) : (
            <>
              <li className="flex items-start gap-sm">
                <Icon className="mt-0.5 shrink-0 text-secondary" name="CheckCircle" size="sm" />
                {chrome.cookiesAndSiteDataOnly}
              </li>
              <li className="flex items-start gap-sm">
                <Icon className="mt-0.5 shrink-0 text-secondary" name="CheckCircle" size="sm" />
                {chrome.youChooseTheSites}
              </li>
            </>
          )}
          <li className="flex items-start gap-sm">
            <Icon className="mt-0.5 shrink-0 text-secondary" name="CheckCircle" size="sm" />
            {chrome.nothingLeavesThisComputer}
          </li>
        </ul>
        <div className="flex items-center justify-between gap-sm">
          <button
            className="text-footnote text-muted cursor-pointer bg-transparent border-0 p-0 m-0"
            data-cds="TextLink"
            disabled={busy}
            onClick={() => {
              if (!busy) onNever();
            }}
            type="button"
          >
            {chrome.dontShowAgain}
          </button>
          <span className="flex items-center gap-sm">
            <OfficialButton disabled={busy} onClick={onNotNow} size="small" variant="uncontained">
              {chrome.notNow}
            </OfficialButton>
            <OfficialButton disabled={busy} onClick={accept} size="small" variant="primary">
              {shared ? chrome.useCookiesHere : chrome.importCookiesPrimary}
            </OfficialButton>
          </span>
        </div>
      </div>
    </div>
  );
}

/** Official c887 `Te` — asking copy; Windows `Ea` appends DdO9T4OTtK. */
function OfficialChromeImportPresenceTe({
  chrome,
  presence,
  touchId,
}: {
  chrome: { lookForAPopup: string; waitingForConfirm: string; waitingForTouchId: string };
  presence: "idle" | "asking";
  touchId: boolean;
}) {
  if (presence !== "asking") return null;
  return (
    <div className="contents" data-official-source="c887e9f0f-CLUwu5T9.js:Te" role="status">
      <p className="m-0 text-footnote text-muted" data-presence="asking">
        {touchId ? chrome.waitingForTouchId : chrome.waitingForConfirm}
        {officialChromeImportIsWindows() ? ` ${chrome.lookForAPopup}` : null}
      </p>
    </div>
  );
}

function OfficialChromeImportModal({
  cwd,
  onClose,
  open,
  previewId,
  startManage,
  touchId,
}: {
  cwd?: string;
  onClose: (reason?: "imported") => void;
  open: boolean;
  previewId: string;
  startManage: boolean;
  touchId: boolean;
}) {
  const chrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const [preferences, setPreference] = useDesktopPreferences();
  const persist = preferences.launchPreviewStorage !== "none";
  const [state, setState] = useState<ModalKind>(startManage ? { kind: "manage", busyRoot: null } : SETUP);
  const [profiles, setProfiles] = useState<ChromeImportProfile[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [keepSignedIn, setKeepSignedIn] = useState(persist);
  const [presence, setPresence] = useState<"idle" | "asking">("idle");
  const [error, setError] = useState<string | null>(null);
  const [imported, setImported] = useState<Array<{ root: string }>>([]);
  const gen = useRef(0);

  useEffect(() => {
    if (!open) {
      setState(SETUP);
      setError(null);
      setPresence("idle");
      return;
    }
    setState(startManage ? { kind: "manage", busyRoot: null } : SETUP);
    let alive = true;
    void launchChromeImport()
      ?.listChromeImportProfiles?.()
      .then((rows) => {
        if (!alive) return;
        const list = Array.isArray(rows) ? rows : [];
        setProfiles(list);
        setProfileId(list.find((row) => row.lastUsed)?.id ?? list[0]?.id ?? null);
      })
      .catch(() => undefined);
    void launchChromeImport()
      ?.listImportedChromeLogins?.(previewId)
      .then((rows) => {
        if (!alive) return;
        setImported(Array.isArray(rows) ? rows : []);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [open, previewId, startManage]);

  const profile = profiles.find((row) => row.id === profileId) ?? profiles[0] ?? null;
  const browserName = profile?.browserName ?? "Chrome";

  const listSites = useCallback(async () => {
    const token = ++gen.current;
    setState({ kind: "setup", busy: true });
    setError(null);
    setPresence("asking");
    try {
      const result = await launchChromeImport()?.listChromeImportSites?.(previewId, profileId ?? undefined, cwd);
      if (token !== gen.current) return;
      setPresence("idle");
      if (!result?.ok || !result.ticket || !result.sites) {
        setError(result?.error ?? "read_failed");
        setState(SETUP);
        return;
      }
      const cap = result.maxSites ?? result.cap ?? SITE_CAP;
      const selected = new Set(
        result.sites
          .filter((site) => site.suggested)
          .slice(0, cap)
          .map((site) => site.root),
      );
      if (selected.size === 0) {
        for (const site of result.sites.slice(0, Math.min(cap, result.sites.length))) selected.add(site.root);
      }
      setState({
        kind: "pick",
        ticket: result.ticket,
        declined: 0,
        browserName,
        profileName: profile?.name ?? "Default",
        storageIsEphemeral: result.storageIsEphemeral ?? !persist,
        cap,
        sites: result.sites,
        selected,
        filter: "",
        busy: false,
      });
    } catch {
      if (token !== gen.current) return;
      setPresence("idle");
      setError("ipc_error");
      setState(SETUP);
    }
  }, [browserName, cwd, persist, previewId, profile?.name, profileId]);

  const runImport = useCallback(async () => {
    if (state.kind !== "pick" || !state.ticket) {
      await listSites();
      return;
    }
    const token = ++gen.current;
    setState({ ...state, busy: true });
    try {
      const result = await launchChromeImport()?.importChromeLogins?.(
        previewId,
        state.ticket,
        [...state.selected],
        keepSignedIn && state.storageIsEphemeral,
        cwd,
      );
      if (token !== gen.current) return;
      if (!result?.ok || !result.results) {
        if (result?.error === "keychain_denied" || result?.error === "presence_declined") {
          setState({ ...state, ticket: null, declined: state.declined + 1, busy: false });
          return;
        }
        if (result?.error === "ticket_invalid") {
          setState({ ...state, ticket: null, busy: false });
          return;
        }
        setError(result?.error ?? "import_failed");
        setState(SETUP);
        return;
      }
      const importedCount = result.results.reduce((sum, row) => sum + (row.imported ?? 0), 0);
      const failedCount = result.results.reduce(
        (sum, row) => sum + (row.failedDecrypt ?? 0) + (row.failedSet ?? 0),
        0,
      );
      // Official c887 Re: s===0 && c>0 → Ce all_failed, stay on setup (M(H)).
      if (importedCount === 0 && failedCount > 0) {
        setError("all_failed");
        setState(SETUP);
        return;
      }
      if (keepSignedIn && !persist) {
        await setPreference("launchPreviewStorage", "shared");
      }
      await setPreference("launchChromeImportPrompt", "done");
      onClose("imported");
    } catch {
      if (token !== gen.current) return;
      setError("ipc_error");
      setState({ ...state, busy: false });
    }
  }, [cwd, keepSignedIn, listSites, onClose, persist, previewId, setPreference, state]);

  const filtered =
    state.kind === "pick"
      ? state.sites.filter((site) => (state.filter ? site.root.includes(state.filter.toLowerCase()) : true))
      : [];

  const title =
    state.kind === "pick"
      ? chrome.chooseSitesToBringOver
      : state.kind === "manage"
        ? chrome.manageImportedCookies
        : chrome.importCookiesFromBrowser;

  const toggleAllVisible = (roots: string[], add: boolean, room: number) => {
    if (state.kind !== "pick") return;
    const next = new Set(state.selected);
    for (const root of roots) {
      if (add) {
        if (next.size < Math.min(room, state.cap)) next.add(root);
      } else {
        next.delete(root);
      }
    }
    setState({ ...state, selected: next });
  };

  const errorCopy = officialChromeImportErrorCopy(chrome, error, browserName, touchId);

  return (
    <OfficialModal isOpen={open} onClose={() => onClose()} title={title} width="w-[520px]">
      {errorCopy ? (
        <p className="m-0 mb-sm text-body text-danger" data-official-source="c887e9f0f-CLUwu5T9.js:Ce">
          {errorCopy}
        </p>
      ) : null}
      {state.kind === "setup" ? (
        <div className="flex flex-col gap-md">
          <label className="flex items-center gap-sm">
            <span className="shrink-0 text-body text-primary">{chrome.from}</span>
            <select
              className="min-w-0 flex-1 rounded-r2 bg-alpha-1 px-sm py-xs text-body text-primary"
              disabled={state.busy || profiles.length === 0}
              onChange={(event) => setProfileId(event.target.value)}
              value={profileId ?? ""}
            >
              {profiles.map((row) => (
                <option key={row.id} value={row.id}>
                  {row.browserName ?? "Chrome"} {row.name}
                </option>
              ))}
            </select>
          </label>
          <div className="flex flex-col divide-y divide-alpha-2 overflow-clip rounded-card bg-alpha-1">
            <div className="flex min-h-[40px] items-center gap-sm px-lg py-md">
              <label className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-body text-primary">{chrome.keepMeSignedIn}</span>
                <span className="text-footnote text-muted">
                  {persist ? chrome.keepCookiesAlreadyOn : chrome.setsKeepCookiesToShared}
                </span>
              </label>
              <OfficialSwitch
                checked={keepSignedIn}
                disabled={state.busy || persist}
                onCheckedChange={setKeepSignedIn}
              />
            </div>
          </div>
          <p className="m-0 text-footnote text-muted">
            {touchId ? chrome.youllConfirmTouchId : chrome.youllConfirmThenPick}
          </p>
          <OfficialChromeImportPresenceTe chrome={chrome} presence={presence} touchId={touchId} />
          <div className="flex items-center gap-xs">
            {imported.length > 0 ? (
              <OfficialButton
                disabled={state.busy}
                onClick={() => setState({ kind: "manage", busyRoot: null })}
                size="small"
                variant="ghost"
              >
                {chrome.manageImportedCookies}
              </OfficialButton>
            ) : null}
            <div className="ml-auto flex items-center gap-xs">
              <OfficialButton disabled={state.busy} onClick={onClose} size="small" variant="uncontained">
                {chrome.cancel}
              </OfficialButton>
              <OfficialButton
                disabled={state.busy || profiles.length === 0}
                onClick={() => void listSites()}
                size="small"
                variant="primary"
              >
                {chrome.import}
              </OfficialButton>
            </div>
          </div>
        </div>
      ) : null}
      {state.kind === "pick" ? (
        <div className="flex flex-col gap-sm" data-official-source="c887e9f0f-CLUwu5T9.js:J pick">
          <p className="m-0 text-footnote text-muted">
            {formatOfficialIcu(chrome.sitesWithCookiesInProfile, { browser: state.browserName, profile: state.profileName })}
          </p>
          <input
            aria-label={chrome.filterSites}
            className="rounded-r2 bg-alpha-1 px-sm py-xs text-body text-primary"
            disabled={state.busy}
            onChange={(event) => setState({ ...state, filter: event.target.value })}
            placeholder={chrome.filterSites}
            value={state.filter}
          />
          {state.sites.length > 0 ? (
            <OfficialChromeImportSelectAll
              cap={state.cap}
              disabled={state.busy}
              filteredRoots={filtered.map((site) => site.root)}
              label={chrome.selectAll}
              onToggleAll={toggleAllVisible}
              selected={state.selected}
            />
          ) : null}
          <div className="-mx-sm h-[45vh] overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="mx-sm py-sm text-body italic text-muted">
                {state.sites.length === 0 ? formatOfficialIcu(chrome.noSavedCookies, { browser: state.browserName }) : chrome.noSitesMatch}
              </p>
            ) : (
              <ul className="flex flex-col" role="list">
                {filtered.map((site) => (
                  <li className="flex items-center gap-xs rounded px-sm py-xs hover:bg-fill-ghost-hover" key={site.root}>
                    <OfficialCheckbox
                      checked={state.selected.has(site.root)}
                      className="min-w-0 flex-1"
                      disabled={state.busy}
                      label={<span className="text-body text-primary">{site.root}</span>}
                      onCheckedChange={(checked) => {
                        const next = new Set(state.selected);
                        if (checked) next.add(site.root);
                        else next.delete(site.root);
                        setState({ ...state, selected: next });
                      }}
                    />
                    {site.sensitive ? (
                      <span className="text-footnote text-muted">{site.sensitive}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <OfficialChromeImportPresenceTe chrome={chrome} presence={presence} touchId={touchId} />
          {state.declined > 0 ? (
            <p className="m-0 text-body text-warning" role="status">
              {formatOfficialIcu(chrome.cookiesStillLocked, { browser: state.browserName })}
            </p>
          ) : null}
          <div className="flex items-center gap-xs">
            <span className={state.selected.size > state.cap ? "text-footnote text-warning" : "text-footnote text-muted"}>
              {formatOfficialIcu(chrome.selectedOfTotal, { count: state.selected.size, total: state.sites.length })}
              {state.selected.size > state.cap
                ? ` · ${formatOfficialIcu(chrome.atMost, { cap: state.cap })}`
                : ""}
            </span>
            <div className="ml-auto flex items-center gap-xs">
              <OfficialButton disabled={state.busy} onClick={() => setState(SETUP)} size="small" variant="uncontained">
                {chrome.back}
              </OfficialButton>
              <OfficialButton
                disabled={state.busy || state.selected.size === 0 || state.selected.size > state.cap}
                onClick={() => void runImport()}
                size="small"
                variant="primary"
              >
                {state.declined > 0 ? chrome.tryAgain : chrome.import}
              </OfficialButton>
            </div>
          </div>
        </div>
      ) : null}
      {state.kind === "manage" ? (
        <div className="flex flex-col gap-sm">
          {imported.length === 0 ? (
            <p className="m-0 text-body text-muted">{chrome.noSavedCookies.replace("{browser}", browserName)}</p>
          ) : (
            <ul className="flex flex-col" role="list">
              {imported.map((row) => (
                <li className="flex items-center gap-sm py-xs" key={row.root}>
                  <span className="min-w-0 flex-1 truncate text-body text-primary">{row.root}</span>
                  <OfficialButton
                    disabled={state.busyRoot !== null}
                    onClick={() => {
                      setState({ kind: "manage", busyRoot: row.root });
                      void launchChromeImport()
                        ?.removeImportedChromeLogins?.(previewId, row.root, cwd)
                        .then((next) => {
                          const list = Array.isArray(next) ? next : [];
                          setImported(list);
                          setState(list.length === 0 ? SETUP : { kind: "manage", busyRoot: null });
                        })
                        .catch(() => setState({ kind: "manage", busyRoot: null }));
                    }}
                    size="small"
                    variant="uncontained"
                  >
                    {chrome.remove}
                  </OfficialButton>
                </li>
              ))}
            </ul>
          )}
          <div className="flex justify-end">
            <OfficialButton onClick={onClose} size="small" variant="primary">
              {chrome.done}
            </OfficialButton>
          </div>
        </div>
      ) : null}
    </OfficialModal>
  );
}

/** Official c887 `De`. */
function OfficialChromeImportSelectAll({
  cap,
  disabled,
  filteredRoots,
  label,
  onToggleAll,
  selected,
}: {
  cap: number;
  disabled: boolean;
  filteredRoots: string[];
  label: string;
  onToggleAll: (roots: string[], add: boolean, room: number) => void;
  selected: Set<string>;
}) {
  const selectedVisible = filteredRoots.filter((root) => selected.has(root)).length;
  const room = Math.max(0, Math.min(filteredRoots.length - selectedVisible, cap - selected.size));
  const noneCanAdd = selectedVisible > 0 && room === 0;
  const allVisible = selectedVisible > 0 && selectedVisible === filteredRoots.length;
  return (
    <div className="-mx-sm flex items-center gap-xs border-b px-sm py-xs" data-official-source="c887e9f0f-CLUwu5T9.js:De">
      <OfficialCheckbox
        checked={allVisible}
        className="min-w-0 flex-1"
        disabled={disabled || (selectedVisible === 0 && room === 0)}
        indeterminate={selectedVisible > 0 && !allVisible}
        label={<span className="text-body font-medium text-primary">{label}</span>}
        onCheckedChange={() => onToggleAll(filteredRoots, !noneCanAdd, selected.size + room)}
      />
    </div>
  );
}

