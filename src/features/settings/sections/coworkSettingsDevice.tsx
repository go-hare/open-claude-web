/**
 * Official desktop Cowork settings device rows (Tt onThisDevice):
 *   nt P  Cowork files          cfea69990-CM15Jz3C  ciLKOe5nmN
 *   Xe ht Trusted Cowork folders cabd7b1c1-D72drLhz  5UZ7woP+0X
 *   Je ct Preferred browser      cabd7b1c1            cGSF0vB/eU
 *   et f  Open links             cdc95db1a-CyFMIiPA   LgkdiZ92a8
 *
 * Honesty hide: Dispatch rt, cowork-backend G, guest pass q.
 * Allowed sites tt mounts when Launch.getPreviewAllowedOrigins exists (asar by()).
 * Global instructions stay on General (9QOsx1rUjR).
 */
import { Dialog } from "@base-ui-components/react/dialog";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { CdsDialogBackdrop } from "../CdsDialog";
import { GhostSelect } from "../SettingsControls";
import {
  CdsButton,
  SettingsRow,
  Switch,
  primaryButtonClass,
  secondaryButtonClass,
} from "../SettingsShell";
import {
  readTranscriptLinksInPreview,
  writeTranscriptLinksInPreview,
} from "../coworkTranscriptLinks";
import { useErrorsOptional } from "../errorsToast";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useCoworkSettingsText } from "../settingsMessages";

type CoworkUserFilesInfo = {
  currentRoot: string;
  homeRoot: string;
  isLegacyDocumentsRoot: boolean;
  managedRoot?: string;
};

type CoworkUserFilesBridge = {
  getInfo?: () => Promise<CoworkUserFilesInfo | null | undefined>;
  pickTarget?: () => Promise<{ path: string } | null | undefined>;
  migrate?: (targetRoot: string) => Promise<{
    ok?: boolean;
    errorCode?: string;
    newRoot?: string;
  } | null | undefined>;
  reveal?: () => Promise<unknown>;
};

type LocalAgentSessionsBridge = {
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  browseAndAddTrustedFolder?: () => Promise<unknown>;
  removeTrustedFolder?: (folder: string) => Promise<unknown>;
};

type ChromeExtensionBridge = {
  isInstalled?: () => Promise<boolean>;
};

type PreviewAllowedOriginEntry = {
  builtin?: boolean;
  origin: string;
};

type LaunchBridge = {
  openExternalLinkInPreview?: (...args: unknown[]) => Promise<unknown> | unknown;
  getPreviewAllowedOrigins?: () => Promise<PreviewAllowedOriginEntry[] | null | undefined>;
  addPreviewAllowedOrigin?: (
    origin: string,
    schemeless?: boolean,
  ) => Promise<string | null | undefined>;
  removePreviewAllowedOrigin?: (origin: string) => Promise<unknown>;
  clearPreviewAllowedOrigins?: () => Promise<unknown>;
  navigatePreview?: (...args: unknown[]) => Promise<unknown> | unknown;
};

const MIGRATE_ERROR_IDS: Record<string, keyof ReturnType<typeof useCoworkSettingsText>> = {
  "sessions-running": "coworkFilesSessionsRunning",
  "target-invalid": "coworkFilesTargetInvalid",
  "target-unc": "coworkFilesTargetUnc",
  "target-inside-current": "coworkFilesTargetInsideCurrent",
  "target-not-writable": "coworkFilesTargetNotWritable",
  "copy-failed": "coworkFilesCopyFailed",
  "state-write-failed": "coworkFilesStateWriteFailed",
};

function coworkUserFilesBridge(): CoworkUserFilesBridge | undefined {
  const web = window["claude.web"] as { CoworkUserFiles?: CoworkUserFilesBridge } | undefined;
  return web?.CoworkUserFiles;
}

function localAgentSessionsBridge(): LocalAgentSessionsBridge | undefined {
  const web = window["claude.web"] as {
    LocalAgentModeSessions?: LocalAgentSessionsBridge;
  } | undefined;
  return web?.LocalAgentModeSessions;
}

function chromeExtensionBridge(): ChromeExtensionBridge | undefined {
  const web = window["claude.web"] as { ChromeExtension?: ChromeExtensionBridge } | undefined;
  return web?.ChromeExtension;
}

function launchBridge(): LaunchBridge | undefined {
  const web = window["claude.web"] as { Launch?: LaunchBridge } | undefined;
  return web?.Launch;
}

export function CoworkDeviceSettingsRows() {
  return (
    <>
      <CoworkFilesRow />
      <TrustedCoworkFoldersRow />
      <PreferredBrowserRow />
      <OpenLinksInBuiltInBrowserRow />
      <CoworkAllowedSitesRow />
    </>
  );
}

function CoworkFilesRow() {
  const text = useCoworkSettingsText();
  const errors = useErrorsOptional();
  const [info, setInfo] = useState<CoworkUserFilesInfo | null>(null);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const bridge = coworkUserFilesBridge();
    if (!bridge?.getInfo) return;
    let alive = true;
    void bridge.getInfo().then((next) => {
      if (alive && next) setInfo(next);
    });
    return () => {
      alive = false;
    };
  }, []);

  const shownPath = info?.managedRoot ?? info?.currentRoot;
  if (!coworkUserFilesBridge()?.getInfo || !info || !shownPath) return null;

  const pathButton = (
    <button
      className="font-mono text-body text-primary underline decoration-1 underline-offset-2 decoration-current/40 hover:decoration-current"
      onClick={() => {
        void coworkUserFilesBridge()?.reveal?.();
      }}
      type="button"
    >
      {shownPath}
    </button>
  );

  const description = formatStoredAt(text.coworkFilesDescription, pathButton);

  const runMigrate = async (target: string) => {
    const bridge = coworkUserFilesBridge();
    if (!bridge?.migrate) return;
    setBusy(true);
    try {
      const result = await bridge.migrate(target);
      if (result && result.ok === false) {
        const key = MIGRATE_ERROR_IDS[result.errorCode ?? ""] ?? "coworkFilesFallback";
        errors?.addError(text[key], {
          messageForLogging: "coworkUserFiles migrate failed",
        });
        return;
      }
      setPendingPath(null);
    } catch (error) {
      errors?.addError(text.coworkFilesFallback, {
        error,
        messageForLogging: "coworkUserFiles migrate threw",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <SettingsRow
        label={text.coworkFiles}
        description={description}
        control={
          <div className="flex items-center gap-sm">
            {info.isLegacyDocumentsRoot ? (
              <CdsButton
                disabled={busy}
                onClick={() => setPendingPath(info.homeRoot)}
              >
                <Icon className="text-warning" name="Warning" size="sm" />
                {text.useRecommended}
              </CdsButton>
            ) : null}
            <CdsButton
              disabled={busy}
              onClick={() => {
                void (async () => {
                  const picked = await coworkUserFilesBridge()?.pickTarget?.();
                  if (picked?.path) setPendingPath(picked.path);
                })();
              }}
            >
              <Icon name="Folder" size="sm" />
              {busy ? text.working : text.change}
            </CdsButton>
          </div>
        }
      />
      <Dialog.Root
        open={pendingPath !== null}
        onOpenChange={(open) => {
          if (!open) setPendingPath(null);
        }}
      >
        <Dialog.Portal>
          <div className="cds-root" data-density="comfortable" data-platform="desktop">
            <CdsDialogBackdrop />
            <Dialog.Popup
              className="fixed inset-0 m-auto flex h-fit max-h-[min(32rem,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[28rem] flex-col overflow-hidden rounded-card bg-surface-2 shadow-panel-sm outline-none z-modal"
              data-cds="Dialog"
            >
              <div className="flex flex-col gap-md p-lg">
                <Dialog.Title className="text-heading-semibold text-primary">
                  {text.changeCoworkFilesLocation}
                </Dialog.Title>
                <Dialog.Description className="text-body text-secondary">
                  {formatCopyRestart(
                    text.copyFilesAndRestart,
                    pendingPath ?? "",
                    info.currentRoot,
                  )}
                </Dialog.Description>
                <div className="flex justify-end gap-sm">
                  <Dialog.Close
                    className={secondaryButtonClass}
                    data-cds="Button"
                    type="button"
                  >
                    {text.cancel}
                  </Dialog.Close>
                  <button
                    className={primaryButtonClass}
                    data-cds="Button"
                    disabled={busy || !pendingPath}
                    onClick={() => {
                      if (pendingPath) void runMigrate(pendingPath);
                    }}
                    type="button"
                  >
                    {text.copyAndRestart}
                  </button>
                </div>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function TrustedCoworkFoldersRow() {
  const text = useCoworkSettingsText();
  const [preferences] = useDesktopPreferences();
  const [open, setOpen] = useState(false);
  const sessions = localAgentSessionsBridge();
  const canManage =
    typeof sessions?.addTrustedFolder === "function"
    && typeof sessions?.removeTrustedFolder === "function";
  if (!canManage) return null;

  const trusted = Array.isArray(preferences.localAgentModeTrustedFolders)
    ? preferences.localAgentModeTrustedFolders.filter((item): item is string => typeof item === "string")
    : [];
  const remembered = (preferences.remoteFolderConsentMemory ?? []).filter(
    (item): item is string => typeof item === "string" && !trusted.includes(item),
  );
  const folders = [...trusted, ...remembered];
  const rememberedSet = new Set(remembered);

  return (
    <>
      <SettingsRow
        label={text.trustedCoworkFolders}
        description={text.trustedCoworkFoldersDescription}
        control={
          <CdsButton onClick={() => setOpen(true)}>{text.manage}</CdsButton>
        }
      />
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <div className="cds-root" data-density="comfortable" data-platform="desktop">
            <CdsDialogBackdrop />
            <Dialog.Popup
              className="fixed inset-0 m-auto flex h-fit max-h-[min(40rem,calc(100vh-2rem))] w-[calc(100vw-2rem)] max-w-[36rem] flex-col overflow-hidden rounded-card bg-surface-2 shadow-panel-sm outline-none z-modal"
              data-cds="Dialog"
            >
              <div className="flex flex-col gap-md p-lg">
                <Dialog.Title className="text-heading-semibold text-primary">
                  {text.trustedCoworkFolders}
                </Dialog.Title>
                <Dialog.Description className="text-body text-secondary">
                  {text.trustedCoworkFoldersDescription}
                </Dialog.Description>
                {folders.length === 0 ? (
                  <p className="text-body text-muted">{text.noTrustedFoldersYet}</p>
                ) : (
                  <ul className="scroll-fade-y flex max-h-80 flex-col gap-1 overflow-y-auto">
                    {folders.map((folder) => (
                      <li
                        className="group flex items-center gap-2 rounded-md border-0.5 border-strong bg-alpha-1 px-2.5 py-1.5 text-body text-secondary"
                        key={folder}
                      >
                        <Icon className="shrink-0 text-muted" name="Folder" size="sm" />
                        <span className="flex-1 truncate" title={folder}>
                          {folder}
                        </span>
                        {rememberedSet.has(folder) ? (
                          <span className="shrink-0 text-footnote text-muted">
                            {text.remembered}
                          </span>
                        ) : null}
                        <button
                          aria-label={text.remove}
                          className="inline-flex items-center justify-center rounded p-1 text-muted hover:bg-fill-ghost-hover"
                          onClick={() => {
                            void sessions?.removeTrustedFolder?.(folder);
                          }}
                          type="button"
                        >
                          <Icon customSize={14} name="X" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="flex items-center justify-between">
                  <CdsButton
                    onClick={() => {
                      void (async () => {
                        if (sessions?.browseAndAddTrustedFolder) {
                          const result = await sessions.browseAndAddTrustedFolder().catch(() => "disabled");
                          if (String(result) !== "disabled") return;
                        }
                        const picked = await desktopBridge.Preferences.getDirectoryPath?.(false);
                        const folder = Array.isArray(picked) ? picked[0] : undefined;
                        if (folder) void sessions?.addTrustedFolder?.(folder);
                      })();
                    }}
                  >
                    <Icon name="Add" size="sm" />
                    {text.addFolder}
                  </CdsButton>
                  <button
                    className={primaryButtonClass}
                    data-cds="Button"
                    onClick={() => setOpen(false)}
                    type="button"
                  >
                    {text.done}
                  </button>
                </div>
              </div>
            </Dialog.Popup>
          </div>
        </Dialog.Portal>
      </Dialog.Root>
    </>
  );
}

function PreferredBrowserRow() {
  const text = useCoworkSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const [chromeInstalled, setChromeInstalled] = useState<boolean | null>(null);
  const value =
    preferences.coworkPreferredBrowser === "chrome" ? "chrome" : "built_in";
  // Official sy(): supported = "coworkPreferredBrowser" in getPreferences().
  // Client SSA default is built_in; host bag may lag until Electron restart.
  const supported =
    typeof desktopBridge.Preferences.setPreference === "function"
    || preferences.coworkPreferredBrowser !== undefined;

  useEffect(() => {
    const chrome = chromeExtensionBridge();
    if (!chrome?.isInstalled) return;
    let alive = true;
    void chrome.isInstalled().then((installed) => {
      if (alive) setChromeInstalled(installed === true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const options = useMemo(
    () => [
      { value: "built_in", label: text.builtInBrowser },
      { value: "chrome", label: text.chromeClaudeInChrome },
    ],
    [text.builtInBrowser, text.chromeClaudeInChrome],
  );

  if (!supported) return null;
  const warnChrome = value === "chrome" && chromeInstalled === false;

  return (
    <SettingsRow
      label={text.preferredBrowser}
      description={text.preferredBrowserDescription}
      control={
        <div className="flex items-center gap-2">
          {warnChrome ? (
            <span
              className="text-warning"
              title={text.turnOnClaudeInChrome}
            >
              <Icon name="Warning" size="sm" />
            </span>
          ) : null}
          <div className="w-[260px]">
            <GhostSelect
              align="end"
              aria-label={text.preferredBrowser}
              fullWidth
              onChange={(next) => {
                if (next === "built_in" || next === "chrome") {
                  setPreference("coworkPreferredBrowser", next);
                }
              }}
              options={options}
              searchable={false}
              value={value}
              variant="outline"
            />
          </div>
        </div>
      }
    />
  );
}

/** Official Un (cdc95db1a) — reused by Cowork et and Claude Code Kr Gr. */
export function OpenLinksInBuiltInBrowserRow() {
  const text = useCoworkSettingsText();
  const [checked, setChecked] = useState(() => readTranscriptLinksInPreview());
  const launch = launchBridge();
  // Official yy(): desktop && preferred-browser supported && Launch.openExternalLinkInPreview.
  // Current Electron may only have navigatePreview until restart — still mount the row.
  const supported =
    typeof launch?.openExternalLinkInPreview === "function"
    || typeof launch?.navigatePreview === "function";

  const onCheckedChange = useCallback((next: boolean) => {
    setChecked(next);
    writeTranscriptLinksInPreview(next);
  }, []);

  if (!supported) return null;

  return (
    <SettingsRow
      label={text.openLinksInBuiltInBrowser}
      description={text.openLinksInBuiltInBrowserDescription}
      control={(ids) => (
        <Switch
          aria-labelledby={ids.labelId}
          checked={checked}
          onCheckedChange={onCheckedChange}
        />
      )}
    />
  );
}

export function AllowedSitesRow({
  description,
  label,
  manageLabel,
}: {
  description: string;
  label: string;
  manageLabel: string;
}) {
  const [open, setOpen] = useState(false);
  const launch = launchBridge();
  // Official by() / Kr m: desktop && Launch.getPreviewAllowedOrigins.
  if (typeof launch?.getPreviewAllowedOrigins !== "function") return null;

  return (
    <>
      <SettingsRow
        label={label}
        description={description}
        control={
          <CdsButton onClick={() => setOpen(true)}>{manageLabel}</CdsButton>
        }
      />
      <AllowedSitesModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}

function CoworkAllowedSitesRow() {
  const text = useCoworkSettingsText();
  return (
    <AllowedSitesRow
      description={text.allowedSitesDescription}
      label={text.allowedSites}
      manageLabel={text.allowedSitesManage}
    />
  );
}

function addOriginErrorMessage(
  text: ReturnType<typeof useCoworkSettingsText>,
  result: string | null | undefined,
): string | null {
  switch (result) {
    case "ok":
    case "declined":
      return null;
    case "invalid":
      return text.enterValidWebAddress;
    case "loopback":
      return text.localhostAlwaysAllowed;
    case "exists":
      return text.siteAlreadyAllowed;
    case "blocked":
      return text.siteBlockedSafety;
    case "org-blocked":
      return text.siteBlockedOrg;
    case "unavailable":
    default:
      return text.couldntVerifySite;
  }
}

function originHostLabel(origin: string): string {
  try {
    return new URL(origin).host.replace(/^%2A\./i, "*.");
  } catch {
    return origin;
  }
}

export function AllowedSitesModal({
  open,
  onClose,
}: {
  onClose: () => void;
  open: boolean;
}) {
  const text = useCoworkSettingsText();
  const [entries, setEntries] = useState<PreviewAllowedOriginEntry[]>([]);
  const [draft, setDraft] = useState("");
  const [draftError, setDraftError] = useState<string | null>(null);
  const [addPending, setAddPending] = useState(false);
  const [pendingOrigin, setPendingOrigin] = useState<string | null>(null);
  const [clearPending, setClearPending] = useState(false);

  const reload = useCallback(async () => {
    const list = await launchBridge()?.getPreviewAllowedOrigins?.();
    setEntries(Array.isArray(list) ? list : []);
  }, []);

  useEffect(() => {
    if (!open) return;
    setDraft("");
    setDraftError(null);
    setAddPending(false);
    setPendingOrigin(null);
    void reload();
  }, [open, reload]);

  const userEntries = entries.filter((entry) => !entry.builtin);
  const canAdd = typeof launchBridge()?.addPreviewAllowedOrigin === "function";

  const onAdd = async () => {
    const raw = draft.trim();
    if (!raw || addPending) return;
    setAddPending(true);
    setDraftError(null);
    const schemeless = !raw.includes("://");
    const origin = schemeless ? `https://${raw}` : raw;
    const result = await launchBridge()?.addPreviewAllowedOrigin?.(origin, schemeless);
    setAddPending(false);
    if (result === "ok") {
      setDraft("");
      await reload();
      return;
    }
    if (result !== "declined") setDraftError(addOriginErrorMessage(text, result));
  };

  const onRemove = async (origin: string) => {
    setPendingOrigin(origin);
    try {
      await launchBridge()?.removePreviewAllowedOrigin?.(origin);
      await reload();
    } finally {
      setPendingOrigin((current) => (current === origin ? null : current));
    }
  };

  const onClearAll = async () => {
    setClearPending(true);
    try {
      await launchBridge()?.clearPreviewAllowedOrigins?.();
      await reload();
    } finally {
      setClearPending(false);
    }
  };

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
    >
      <Dialog.Portal>
        <div className="cds-root" data-density="comfortable" data-platform="desktop">
          <CdsDialogBackdrop />
          <Dialog.Popup
            className="fixed left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col max-w-[calc(100vw-2rem)] w-[400px] rounded-card bg-surface-2 shadow-panel-sm outline-none draggable-none z-modal"
            data-cds="Dialog"
          >
            <div className="flex min-h-0 w-full flex-col gap-[20px] p-[16px] font-normal">
              <div className="flex shrink-0 items-start gap-[4px]">
                <div className="flex min-w-0 flex-1 flex-col gap-[4px]">
                  <Dialog.Title className="m-0 text-heading-semibold text-primary">
                    {text.allowedSites}
                  </Dialog.Title>
                  <Dialog.Description className="m-0 text-body text-secondary">
                    {text.allowedSitesModalDescription}
                  </Dialog.Description>
                </div>
                <button
                  aria-label={text.close}
                  className="inline-flex shrink-0 items-center justify-center rounded p-1 text-muted hover:bg-fill-ghost-hover"
                  disabled={clearPending}
                  onClick={onClose}
                  type="button"
                >
                  <Icon name="X" size="sm" />
                </button>
              </div>
              {canAdd ? (
                <div className="flex w-full shrink-0 flex-col gap-[4px]">
                  <label className="px-[6px] text-footnote text-muted" htmlFor="cowork-allowed-site-url">
                    {text.addUrl}
                  </label>
                  <div className="flex h-7 w-full items-center gap-[4px] rounded-[6px] border pl-[6px] pr-[3px] has-[input:focus-visible]:shadow-focus">
                    <input
                      className="h-full min-w-0 flex-1 border-0 bg-transparent p-0 text-footnote text-primary outline-none hide-focus-ring placeholder:text-muted"
                      id="cowork-allowed-site-url"
                      onChange={(event) => {
                        setDraft(event.target.value);
                        setDraftError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.nativeEvent.isComposing || event.keyCode === 229) return;
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void onAdd();
                      }}
                      placeholder={text.exampleCom}
                      spellCheck={false}
                      type="text"
                      value={draft}
                    />
                    <button
                      aria-label={text.add}
                      className="inline-flex shrink-0 items-center justify-center rounded p-1 text-primary hover:bg-fill-ghost-hover disabled:opacity-50"
                      disabled={draft.trim() === "" || addPending}
                      onClick={() => void onAdd()}
                      type="button"
                    >
                      <Icon name="Add" size="sm" />
                    </button>
                  </div>
                  {draftError ? (
                    <div className="px-[6px] text-caption text-danger" role="alert">
                      {draftError}
                    </div>
                  ) : null}
                </div>
              ) : null}
              {entries.length === 0 ? (
                <div className="px-[6px] text-body text-muted">{text.noAllowedSitesYet}</div>
              ) : (
                <div className="scroll-fade-y flex max-h-[40vh] min-h-0 flex-col gap-[4px] overflow-y-auto">
                  {entries.map((entry) => {
                    const label = originHostLabel(entry.origin);
                    return (
                      <div
                        className={`flex h-7 w-full min-w-0 items-center gap-[6px] rounded-[6px] bg-alpha-1 pl-[6px] ${entry.builtin ? "pr-[8px]" : "pr-[2px]"}`}
                        key={entry.origin}
                      >
                        <span className="min-w-0 flex-1 truncate text-body text-secondary">
                          {label}
                        </span>
                        {entry.builtin ? (
                          <span className="shrink-0 text-footnote text-muted">{text.builtin}</span>
                        ) : (
                          <button
                            aria-label={text.remove}
                            className="inline-flex shrink-0 items-center justify-center rounded p-1 text-muted hover:bg-fill-ghost-hover disabled:opacity-50"
                            disabled={pendingOrigin !== null && pendingOrigin !== entry.origin}
                            onClick={() => void onRemove(entry.origin)}
                            type="button"
                          >
                            <Icon name="Trash" size="sm" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex shrink-0 items-center justify-between">
                <button
                  className={secondaryButtonClass}
                  data-cds="Button"
                  disabled={userEntries.length === 0 || clearPending}
                  onClick={() => void onClearAll()}
                  type="button"
                >
                  {text.clearAll}
                </button>
                <button
                  className={primaryButtonClass}
                  data-cds="Button"
                  disabled={clearPending}
                  onClick={onClose}
                  type="button"
                >
                  {text.done}
                </button>
              </div>
            </div>
          </Dialog.Popup>
        </div>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function formatStoredAt(template: string, pathNode: ReactNode) {
  const parts = template.split("{path}");
  if (parts.length === 1) return template;
  return (
    <>
      {parts[0]}
      {pathNode}
      {parts[1]}
    </>
  );
}

function formatCopyRestart(template: string, location: string, previous: string): ReactNode {
  const withLocation = template.split("{location}");
  if (withLocation.length < 2) return template;
  const after = (withLocation[1] ?? "").split("{previousLocation}");
  return (
    <>
      {withLocation[0]}
      <code>{location}</code>
      {after[0]}
      {after.length > 1 ? (
        <>
          <code>{previous}</code>
          {after[1]}
        </>
      ) : null}
    </>
  );
}
