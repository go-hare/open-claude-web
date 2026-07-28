import { useCallback, useEffect, useMemo, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { BaseMenuPopup, Menu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import {
  CdsButton,
  SettingsRow,
  SettingsSection,
  Switch,
  secondaryButtonClass,
  sectionBodyClass,
} from "../SettingsShell";
import {
  formatExtensionsTemplate,
  useExtensionsSettingsText,
} from "../settingsMessages";
import { useDesktopPreferences } from "../useDesktopPreferences";
import {
  extensionsSettingsBridge,
  fileSystemPath,
  type InstalledExtensionState,
} from "../settingsDesktopBridge";
import { ExtensionIcon } from "./ExtensionIcon";
import { ExtensionsEmptyGlyph } from "./ExtensionsEmptyGlyph";

const DXT_NUX_DISMISS_KEY = "dxt-nux-hint-dismissed";
/** Official z(): hide NUX after 2025-09-01 or localStorage dismiss. */
const DXT_NUX_CUTOFF = new Date("2025-09-01T00:00:00");
const DESKTOP_EXTENSIONS_LEARN_MORE =
  "https://anthropic.com/engineering/desktop-extensions";

/**
 * Official Extensions overview (c71860c77-CrCPjj7D):
 * header Extensions + Browse; list W (Configure + More→Details/Uninstall);
 * NUX z; Advanced; Drag .MCPB or .DXT.
 * Enable toggle lives on detail (B8t Pe), not list row.
 */
export function ExtensionsOverview({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [extensions, setExtensions] = useState<InstalledExtensionState[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");
  const [nuxVisible, setNuxVisible] = useState(false);

  const reload = useCallback(async () => {
    const bridge = extensionsSettingsBridge();
    try {
      const list = await bridge?.getInstalledExtensionsWithState?.();
      setExtensions(Array.isArray(list) ? list : []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.errorLoadingExtensions);
      setExtensions([]);
    } finally {
      setReady(true);
    }
  }, [text.errorLoadingExtensions]);

  useEffect(() => {
    let alive = true;
    void reload();
    const unsub = extensionsSettingsBridge()?.onExtensionsChanged?.(() => {
      if (alive) void reload();
    });
    return () => {
      alive = false;
      unsub?.();
    };
  }, [reload]);

  useEffect(() => {
    // Official z residual: after cutoff or dismissed → hide.
    try {
      const dismissed = localStorage.getItem(DXT_NUX_DISMISS_KEY) === "true";
      const pastCutoff = Date.now() > DXT_NUX_CUTOFF.getTime();
      setNuxVisible(!dismissed && !pastCutoff);
    } catch {
      setNuxVisible(false);
    }
  }, []);

  const dismissNux = useCallback(() => {
    try {
      localStorage.setItem(DXT_NUX_DISMISS_KEY, "true");
    } catch {
      /* ignore */
    }
    setNuxVisible(false);
  }, []);

  // Official j(): pe open("connectors", { connectorTypeFilter: ["desktop"] }).
  const browseExtensions = useCallback(() => {
    setStatus("");
    onNavigate("/customize/connectors?directory=true&connectorTypeFilter=desktop");
  }, [onNavigate]);

  const handleDroppedFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      const bridge = extensionsSettingsBridge();
      setStatus("");
      for (const file of Array.from(files)) {
        const abs = fileSystemPath(file);
        const lower = file.name.toLowerCase();
        if (!lower.endsWith(".dxt") && !lower.endsWith(".mcpb") && !lower.endsWith(".zip")) {
          setStatus(formatExtensionsTemplate(text.failedToHandleFile, { error: file.name }));
          continue;
        }
        if (!abs) {
          setStatus(formatExtensionsTemplate(text.failedToHandleFile, { error: file.name }));
          continue;
        }
        try {
          if (bridge?.handleDxtFile) {
            await bridge.handleDxtFile(abs);
          } else if (bridge?.installDxt) {
            await bridge.installDxt(null, abs);
          } else {
            setStatus(text.failedToLoadExtensionSettings);
            return;
          }
        } catch (err) {
          const detail = err instanceof Error ? err.message : file.name;
          setStatus(formatExtensionsTemplate(text.failedToHandleFile, { error: detail }));
        }
      }
      await reload();
    },
    [reload, text.failedToHandleFile, text.failedToLoadExtensionSettings],
  );

  const uninstall = useCallback(
    async (id: string) => {
      const bridge = extensionsSettingsBridge();
      try {
        await bridge?.deleteExtension?.(id);
        await reload();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : text.uninstall);
      }
    },
    [reload, text.uninstall],
  );

  const catalog = useMemo(() => partitionExtensions(extensions), [extensions]);

  return (
    <main className="flex h-full flex-col gap-7">
      <section className="mb-xl last:mb-0 ">
        <div className={sectionBodyClass}>
          <div className="flex items-center justify-between gap-lg py-md  " role="group">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <div className="text-body text-primary">
                <span className="text-heading-semibold">{text.extensions}</span>
              </div>
              <div className="text-body text-muted">{text.extensionsDescription}</div>
            </div>
            <div className="flex shrink-0 items-center">
              <CdsButton onClick={browseExtensions}>{text.browseExtensions}</CdsButton>
            </div>
          </div>
          <div className="pt-md">
            <div className="extensions-overview flex h-full flex-col overflow-y-auto">
              {!ready ? (
                <p className="py-8 text-center text-text-400">{text.loadingExtensions}</p>
              ) : error ? (
                <p className="py-8 text-center text-danger-000">{error}</p>
              ) : extensions.length > 0 ? (
                <div className="flex flex-col pb-4">
                  {nuxVisible ? (
                    <DxtNuxBanner
                      learnMore={text.learnMore}
                      message={text.wantToBuildExtension}
                      onDismiss={dismissNux}
                    />
                  ) : null}
                  <h1 className="mb-[15px] font-medium">{text.installedOnYourComputer}</h1>
                  <ul className="flex flex-col">
                    {catalog.standard.map((ext) => (
                      <ExtensionListRow
                        key={ext.id}
                        custom={false}
                        extension={ext}
                        onConfigure={() =>
                          onNavigate(
                            `/settings/desktop/extensions/${encodeURIComponent(ext.id)}`,
                          )
                        }
                        onDetails={() =>
                          onNavigate(
                            `/settings/desktop/extensions/${encodeURIComponent(ext.id)}`,
                          )
                        }
                        onUninstall={() => void uninstall(ext.id)}
                        text={text}
                      />
                    ))}
                  </ul>
                  {catalog.custom.length > 0 ? (
                    <div className={catalog.standard.length > 0 ? "mt-4" : undefined}>
                      {catalog.standard.length > 0 ? (
                        <hr className="col-span-2 my-4 border-0 border-b-0.5 border-border-300" />
                      ) : null}
                      <ul className="flex flex-col">
                        {catalog.custom.map((ext) => (
                          <ExtensionListRow
                            key={ext.id}
                            custom
                            extension={ext}
                            onConfigure={() =>
                              onNavigate(
                                `/settings/desktop/extensions/${encodeURIComponent(ext.id)}`,
                              )
                            }
                            onDetails={() =>
                              onNavigate(
                                `/settings/desktop/extensions/${encodeURIComponent(ext.id)}`,
                              )
                            }
                            onUninstall={() => void uninstall(ext.id)}
                            text={text}
                          />
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <ExtensionsEmptyGlyph />
                </div>
              )}
              <hr className="col-span-2 my-6 border-0 border-b-0.5 border-border-300" />
              <div className="mb-4 flex flex-row gap-2">
                <CdsButton onClick={() => onNavigate("/settings/desktop/extensions/advanced")}>
                  {text.advancedSettings}
                </CdsButton>
              </div>
              <div
                className={dragOver ? "rounded-lg bg-bg-100" : undefined}
                onDragEnter={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragOver(false);
                  void handleDroppedFiles(event.dataTransfer.files);
                }}
              >
                <p className="mb-0 mt-0 flex items-center gap-2">
                  <Icon name="Lightbulb" customSize={14} className="text-text-500" />
                  <span className="text-text-500">{text.dragInstallHint}</span>
                </p>
              </div>
              {status ? (
                <p className="mt-3 text-footnote text-text-400" role="status">
                  {status}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

/**
 * Official W row (c71860c77): icon 42 · name + CUSTOM/DISABLED · Configure · More menu.
 * No list-level enable Switch (enable is Pe on detail).
 */
function ExtensionListRow({
  custom,
  extension,
  onConfigure,
  onDetails,
  onUninstall,
  text,
}: {
  custom: boolean;
  extension: InstalledExtensionState;
  onConfigure: () => void;
  onDetails: () => void;
  onUninstall: () => void;
  text: ReturnType<typeof useExtensionsSettingsText>;
}) {
  const name = extensionDisplayName(extension);
  const blocked =
    typeof extension.settings?.orgBlockedReason === "string"
      ? extension.settings.orgBlockedReason
      : "";
  return (
    <li
      className={`mb-3 flex min-h-[42px] items-center gap-3 ${blocked ? "opacity-50" : ""}`}
    >
      <ExtensionIcon extension={extension} size={42} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm text-text-100">{name}</span>
          {custom ? (
            <span className="rounded bg-bg-300 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-text-300">
              {text.customBadge}
            </span>
          ) : null}
          {blocked ? (
            <span className="rounded bg-danger-900 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-danger-000">
              {text.disabledBadge}
            </span>
          ) : null}
        </div>
        {blocked ? (
          <span className="text-xs text-text-500">{text.notAllowedInOrg}</span>
        ) : null}
      </div>
      {!blocked ? (
        <button
          type="button"
          className={`${secondaryButtonClass} h-7 px-3 text-xs`}
          onClick={onConfigure}
        >
          <span className="absolute inset-0 -z-[1] rounded-[inherit] bg-fill-secondary shadow-field transition-colors duration-fast group-hover/btn:bg-fill-secondary-hover cds-btn-squish" />
          <span className="inline-flex items-center gap-1">{text.configure}</span>
        </button>
      ) : null}
      <Menu.Root>
        <Menu.Trigger
          type="button"
          aria-label={text.moreOptions}
          className={`${secondaryButtonClass} h-7 w-7 px-0`}
        >
          <span className="absolute inset-0 -z-[1] rounded-[inherit] bg-fill-secondary shadow-field transition-colors duration-fast group-hover/btn:bg-fill-secondary-hover cds-btn-squish" />
          <span className="inline-flex items-center justify-center">
            <Icon name="DotsHorizontal" customSize={16} />
          </span>
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[10rem]" side="bottom" sideOffset={4}>
          {!custom && !blocked ? (
            <Menu.Item
              className="cds-reset flex w-full cursor-pointer items-center gap-xs rounded px-md py-[calc((var(--cds-h-control)-var(--cds-leading-body))/2)] text-body text-primary outline-none data-[highlighted]:bg-fill-ghost-hover"
              onClick={onDetails}
            >
              {text.details}
            </Menu.Item>
          ) : null}
          <Menu.Item
            className="cds-reset flex w-full cursor-pointer items-center gap-xs rounded px-md py-[calc((var(--cds-h-control)-var(--cds-leading-body))/2)] text-body text-danger-000 outline-none data-[highlighted]:bg-danger-900"
            onClick={onUninstall}
          >
            {text.uninstall}
          </Menu.Item>
        </BaseMenuPopup>
      </Menu.Root>
    </li>
  );
}

function DxtNuxBanner({
  learnMore,
  message,
  onDismiss,
}: {
  learnMore: string;
  message: string;
  onDismiss: () => void;
}) {
  return (
    <div
      className="mb-6 flex w-full items-start gap-3 rounded-lg bg-bg-200 px-4 py-3 text-sm text-text-300"
      role="status"
    >
      <Icon name="Lightbulb" customSize={16} className="mt-0.5 shrink-0 text-text-400" />
      <p className="min-w-0 flex-1">
        {message}{" "}
        <a
          className="text-accent-000 underline-offset-2 hover:underline"
          href={DESKTOP_EXTENSIONS_LEARN_MORE}
          rel="noopener noreferrer"
          target="_blank"
        >
          {learnMore}
        </a>
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        className="cds-reset shrink-0 rounded p-1 text-text-400 hover:bg-bg-300 hover:text-text-100"
        onClick={onDismiss}
      >
        <Icon name="X" customSize={14} />
      </button>
    </div>
  );
}

/**
 * Official xs/cf4f + B8t detail residual (minimal product arm):
 * back · header · Oe enable+uninstall · description.
 * Full user_config form stays residual-only when manifest.user_config present later.
 */
export function ExtensionDetail({
  extensionId,
  onNavigate,
}: Pick<RouteViewProps, "onNavigate"> & { extensionId: string }) {
  const text = useExtensionsSettingsText();
  const [extension, setExtension] = useState<InstalledExtensionState | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const reload = useCallback(async () => {
    const bridge = extensionsSettingsBridge();
    try {
      const list = await bridge?.getInstalledExtensionsWithState?.();
      const found = Array.isArray(list)
        ? list.find((item) => item.id === extensionId) ?? null
        : null;
      setExtension(found);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failedToLoadExtensionSettings);
      setExtension(null);
    } finally {
      setReady(true);
    }
  }, [extensionId, text.failedToLoadExtensionSettings]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const setEnabled = useCallback(
    async (enabled: boolean) => {
      if (!extension) return;
      const bridge = extensionsSettingsBridge();
      try {
        await bridge?.setExtensionSettings?.(extension.id, { isEnabled: enabled });
        await reload();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : text.failedToLoadExtensionSettings);
      }
    },
    [extension, reload, text.failedToLoadExtensionSettings],
  );

  const uninstall = useCallback(async () => {
    if (!extension) return;
    const bridge = extensionsSettingsBridge();
    try {
      await bridge?.deleteExtension?.(extension.id);
      onNavigate("/settings/desktop/extensions");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : text.uninstall);
    }
  }, [extension, onNavigate, text.uninstall]);

  if (!ready) {
    return (
      <main className="flex h-full flex-col p-6">
        <BackToExtensions onNavigate={onNavigate}>{text.allExtensions}</BackToExtensions>
        <p className="text-text-300">{text.loadingExtensions}</p>
      </main>
    );
  }

  if (error || !extension) {
    return <ExtensionNotFound onNavigate={onNavigate} />;
  }

  const name = extensionDisplayName(extension);
  const description =
    typeof extension.manifest?.description === "string" ? extension.manifest.description : "";
  const enabled = extension.settings?.isEnabled !== false;
  const blocked =
    typeof extension.settings?.orgBlockedReason === "string"
      ? extension.settings.orgBlockedReason
      : "";

  return (
    <main className="flex h-full flex-col gap-5">
      <nav>
        <BackToExtensions onNavigate={onNavigate}>{text.allExtensions}</BackToExtensions>
      </nav>
      <header className="flex items-center gap-3">
        <ExtensionIcon extension={extension} size={48} />
        <h1 className="text-xl font-medium">{name}</h1>
      </header>
      <div className="flex items-center justify-between rounded-lg border-0.5 border-border-300 bg-bg-300 px-5 py-4">
        <label
          aria-label={text.desktopExtensionEnabledToggle}
          className="flex cursor-pointer items-center gap-2 text-sm font-medium"
        >
          <Switch
            checked={enabled && !blocked}
            disabled={!!blocked}
            onCheckedChange={(checked) => {
              void setEnabled(checked);
            }}
          />
          <span>{enabled && !blocked ? text.extensionEnabled : text.extensionDisabled}</span>
        </label>
        <CdsButton
          onClick={() => {
            void uninstall();
          }}
        >
          {text.uninstall}
        </CdsButton>
      </div>
      {blocked ? <p className="text-sm text-danger-000">{text.notAllowedInOrg}</p> : null}
      {description ? <p className="text-sm text-text-400">{description}</p> : null}
      {status ? (
        <p className="text-footnote text-text-400" role="status">
          {status}
        </p>
      ) : null}
    </main>
  );
}

export function ExtensionsAdvanced({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const [status, setStatus] = useState("");
  const [runtimeLines, setRuntimeLines] = useState<
    Array<{ name: string; versions: string; builtIn?: string }>
  >([]);

  useEffect(() => {
    // Official cf4f: ie.getAvailableExtensionRuntimes (typed on settingsDesktopBridge).
    const bridge = extensionsSettingsBridge();
    void (async () => {
      try {
        const raw = await bridge?.getAvailableExtensionRuntimes?.();
        if (!Array.isArray(raw)) {
          setRuntimeLines([]);
          return;
        }
        const lines: Array<{ name: string; versions: string; builtIn?: string }> = [];
        for (const item of raw) {
          if (!item || typeof item !== "object") continue;
          const rec = item as {
            name?: string;
            builtInVersion?: string | null;
            versions?: string[];
          };
          const name = typeof rec.name === "string" ? rec.name : "";
          if (!name) continue;
          const versions = Array.isArray(rec.versions)
            ? rec.versions.filter((v): v is string => typeof v === "string")
            : [];
          const line: { name: string; versions: string; builtIn?: string } = {
            name,
            versions: versions.join(", "),
          };
          if (typeof rec.builtInVersion === "string") {
            line.builtIn = rec.builtInVersion;
          }
          lines.push(line);
        }
        setRuntimeLines(lines);
      } catch {
        setRuntimeLines([]);
      }
    })();
  }, []);

  const run = useCallback(async (label: string, work: () => Promise<unknown>) => {
    setStatus("");
    try {
      await work();
      setStatus(label);
    } catch (err) {
      setStatus(err instanceof Error ? err.message : label);
    }
  }, []);

  return (
    <main className="flex h-full flex-col">
      <div className="px-6">
        <div className="extensions-header">
          <BackToExtensions onNavigate={onNavigate}>{text.allExtensions}</BackToExtensions>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-auto px-6">
        <SettingsSection title={text.extensionSettings}>
          <SettingsRow
            label={text.enableAutoUpdates}
            description={text.enableAutoUpdatesDescription}
            control={
              <Switch
                checked={!!preferences.autoUpdateExtensions}
                onCheckedChange={(checked) => setPreference("autoUpdateExtensions", checked)}
              />
            }
          />
          <SettingsRow
            label={text.useBuiltInNode}
            description={text.useBuiltInNodeDescription}
            control={
              <Switch
                checked={!!preferences.useBuiltInNodeForMcp}
                onCheckedChange={(checked) => setPreference("useBuiltInNodeForMcp", checked)}
              />
            }
          />
          <div className="py-md">
            <p className="mb-3 text-body text-primary">{text.detectedTools}</p>
            {runtimeLines.length > 0 ? (
              <div>
                {runtimeLines.map((row) => (
                  <div key={row.name} className="mb-2">
                    <span className="text-text-300">{row.name}:</span>{" "}
                    <span className="text-text-100">
                      {row.versions || text.notFound}
                      {row.builtIn ? (
                        <span className="text-text-200">
                          {" "}
                          {formatExtensionsTemplate(text.builtInVersion, {
                            version: row.builtIn,
                          })}
                        </span>
                      ) : null}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </SettingsSection>
        <SettingsSection title={text.extensionDeveloper}>
          <div className="flex flex-col gap-6 py-md">
            <div className="w-full rounded-lg border border-danger-300 bg-bg-000 p-4 text-sm text-text-300">
              {text.developerToolsWarning}
            </div>
            <div className="flex flex-wrap gap-3">
              <CdsButton
                primary
                onClick={() =>
                  void run(text.installExtension, async () => {
                    await extensionsSettingsBridge()?.showInstallDxtDialog?.();
                  })
                }
              >
                {text.installExtension}
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run(text.installUnpackedExtension, async () => {
                    const settings = window as Window & {
                      "claude.settings"?: {
                        FilePickers?: {
                          getDirectoryPath?: (options?: unknown) => Promise<string[]>;
                        };
                      };
                    };
                    const dirs = await settings["claude.settings"]?.FilePickers?.getDirectoryPath?.();
                    const folder = Array.isArray(dirs) ? dirs[0] : undefined;
                    if (!folder) return;
                    await extensionsSettingsBridge()?.installDxtUnpacked?.(folder);
                  })
                }
              >
                {text.installUnpackedExtension}
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run(text.openExtensionsFolder, async () => {
                    await extensionsSettingsBridge()?.openExtensionsFolder?.();
                  })
                }
              >
                {text.openExtensionsFolder}
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run(text.openExtensionSettingsFolder, async () => {
                    await extensionsSettingsBridge()?.openExtensionSettingsFolder?.();
                  })
                }
              >
                {text.openExtensionSettingsFolder}
              </CdsButton>
            </div>
            {status ? (
              <p className="text-footnote text-text-400" role="status">
                {status}
              </p>
            ) : null}
          </div>
        </SettingsSection>
      </div>
    </main>
  );
}

export function ExtensionsDirectory({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [query, setQuery] = useState("");
  return (
    <main className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <BackToExtensions onNavigate={onNavigate}>{text.allExtensions}</BackToExtensions>
        <h1 className="text-lg font-medium">{text.manageDirectoryTitle}</h1>
        <p className="text-sm text-text-300">{text.manageDirectoryDescription}</p>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border-300 bg-bg-000 px-4 py-2 text-text-100 placeholder:text-text-400 focus:border-border-200 focus:outline-none focus:ring-0"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder={text.searchExtensions}
          value={query}
        />
      </div>
      <div className="min-h-0 h-full">
        <div className="flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto pb-8 pt-2">
          <div className="flex flex-1 flex-col">
            <button
              className="group/card flex cursor-pointer flex-col gap-3 rounded-2xl border-0.5 border-dashed border-border-300 bg-bg-000 px-4 py-3 shadow-sm transition-all hover:border-border-200 hover:bg-bg-100 hover:shadow-[0_4px_20px_0_hsl(var(--always-black)/4%)] disabled:cursor-not-allowed disabled:opacity-50"
              type="button"
              onClick={() => {
                // Residual-safe: reuse Advanced install dialog (no invent directory feed).
                void extensionsSettingsBridge()?.showInstallDxtDialog?.();
              }}
            >
              <div className="flex flex-row items-center gap-3">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-bg-200"
                  aria-hidden="true"
                />
                <div className="font-ui flex min-h-[4rem] grow flex-col justify-center">
                  <p className="text-sm font-medium text-text-100">{text.uploadNewExtension}</p>
                  <p className="text-xs text-text-400">{text.uploadNewExtensionDescription}</p>
                </div>
              </div>
            </button>
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-text-300">{text.noExtensionsFound}</p>
                <p className="text-sm text-text-400">{text.noExtensionsInDirectory}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ExtensionNotFound({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  return (
    <main className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-6">
        <BackToExtensions onNavigate={onNavigate}>{text.allExtensions}</BackToExtensions>
        <p className="text-text-300">{text.extensionNotFound}</p>
      </div>
    </main>
  );
}

/**
 * Official advanced/directory back row (cf4f70727):
 * flex items-center gap-1 mb-4; both icon + label navigate.
 */
function BackToExtensions({
  children,
  onNavigate,
}: Pick<RouteViewProps, "onNavigate"> & {
  children: string;
}) {
  const goBack = () => {
    onNavigate("/settings/desktop/extensions");
  };
  return (
    <div className="mb-4 flex items-center gap-1">
      <button
        type="button"
        aria-label={children}
        onClick={goBack}
        className="cds-reset flex cursor-pointer items-center gap-1 rounded-sm text-sm text-primary outline-none focus-visible:shadow-focus"
      >
        <Icon name="ArrowLeft" customSize={16} className="text-text-400" />
        <span>{children}</span>
      </button>
    </div>
  );
}

function extensionDisplayName(ext: InstalledExtensionState): string {
  return (
    ext.displayName
    || (typeof ext.manifest?.display_name === "string" ? ext.manifest.display_name : null)
    || (typeof ext.manifest?.name === "string" ? ext.manifest.name : null)
    || ext.id
  );
}

/**
 * Official kC/dG (index-BELzQL5P → CrCPjj7D p):
 *   id.startsWith("local.dxt") || id.startsWith("local.unpacked")
 * Residual also uses local.mcpb for .mcpb packages (same CUSTOM treatment).
 * CUSTOM badge + hide Details only for those ids. Directory/catalog ids stay non-custom.
 */
function isCustomExtension(ext: InstalledExtensionState): boolean {
  const id = typeof ext.id === "string" ? ext.id : "";
  if (
    id.startsWith("local.dxt")
    || id.startsWith("local.unpacked")
    || id.startsWith("local.mcpb")
  ) {
    return true;
  }
  if (ext.settings && typeof ext.settings === "object") {
    const rec = ext.settings as Record<string, unknown>;
    if (rec.isCustom === true || rec.custom === true) return true;
  }
  return false;
}

function partitionExtensions(list: InstalledExtensionState[]): {
  custom: InstalledExtensionState[];
  standard: InstalledExtensionState[];
} {
  const custom: InstalledExtensionState[] = [];
  const standard: InstalledExtensionState[] = [];
  for (const ext of list) {
    if (isCustomExtension(ext)) custom.push(ext);
    else standard.push(ext);
  }
  return { custom, standard };
}
