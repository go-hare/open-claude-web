import { useCallback, useEffect, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { Icon } from "../../../shell/icons";
import { CdsButton, SettingsRow, SettingsSection, Switch, sectionBodyClass } from "../SettingsShell";
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

/**
 * Official Extensions overview (c71860c77-CrCPjj7D):
 * header Extensions + Browse; list/empty; Advanced settings; Drag .MCPB or .DXT files here to install.
 * Install/list via claude.settings.Extensions residual.
 * Copy via EXTENSIONS_SETTINGS_MESSAGES (official message ids).
 */
export function ExtensionsOverview({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [extensions, setExtensions] = useState<InstalledExtensionState[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState("");

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

  // Official j(): pe open("connectors", { connectorTypeFilter: ["desktop"] }).
  // Local residual: Customize connectors directory with desktop filter (not dxt install dialog).
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
          setStatus(
            formatExtensionsTemplate(text.failedToHandleFile, { error: file.name }),
          );
          continue;
        }
        if (!abs) {
          setStatus(
            formatExtensionsTemplate(text.failedToHandleFile, { error: file.name }),
          );
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

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const bridge = extensionsSettingsBridge();
      try {
        await bridge?.setExtensionSettings?.(id, { isEnabled: enabled });
        await reload();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : text.failedToLoadExtensionSettings);
      }
    },
    [reload, text.failedToLoadExtensionSettings],
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
                <ul className="flex flex-col pb-4">
                  {extensions.map((ext) => {
                    const name =
                      ext.displayName
                      || (typeof ext.manifest?.display_name === "string"
                        ? ext.manifest.display_name
                        : null)
                      || ext.manifest?.name
                      || ext.id;
                    const description =
                      typeof ext.manifest?.description === "string" ? ext.manifest.description : "";
                    const enabled = ext.settings?.isEnabled !== false;
                    const blocked =
                      typeof ext.settings?.orgBlockedReason === "string"
                        ? ext.settings.orgBlockedReason
                        : "";
                    // Official W (c71860c77): flex items-center gap-3 mb-3 min-h-[42px] + LJ size 42
                    return (
                      <li
                        key={ext.id}
                        className={`flex items-center gap-3 mb-3 min-h-[42px] ${
                          blocked ? "opacity-50" : ""
                        }`}
                      >
                        <ExtensionIcon extension={ext} size={42} />
                        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                          <p className="truncate text-sm text-text-100">{name}</p>
                          {description ? (
                            <p className="truncate text-xs text-text-400">{description}</p>
                          ) : null}
                          {blocked ? (
                            <p className="text-xs text-danger-000">{text.notAllowedInOrg}</p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Switch
                            checked={enabled && !blocked}
                            disabled={!!blocked}
                            onCheckedChange={(checked) => {
                              void setEnabled(ext.id, checked);
                            }}
                          />
                          <CdsButton
                            onClick={() => {
                              void uninstall(ext.id);
                            }}
                          >
                            {text.uninstall}
                          </CdsButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center justify-center py-8">
                  {/* Official empty G: e.jsx(R,{}) 96 SVG illustration */}
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
                {/* Official: LightbulbIcon size 14 + text-text-500 */}
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

export function ExtensionsAdvanced({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const [status, setStatus] = useState("");
  const [runtimeLines, setRuntimeLines] = useState<
    Array<{ name: string; versions: string; builtIn?: string }>
  >([]);

  useEffect(() => {
    const bridge = extensionsSettingsBridge();
    // Detected tools residual: available runtimes from bridge when present.
    void (async () => {
      try {
        const raw = await (
          bridge as ExtensionsSettingsBridgeWithRuntimes | undefined
        )?.getAvailableExtensionRuntimes?.();
        if (!Array.isArray(raw)) {
          setRuntimeLines([]);
          return;
        }
        setRuntimeLines(
          raw
            .map((item) => {
              if (!item || typeof item !== "object") return null;
              const rec = item as {
                name?: string;
                builtInVersion?: string | null;
                versions?: string[];
              };
              const name = typeof rec.name === "string" ? rec.name : "";
              if (!name) return null;
              const versions = Array.isArray(rec.versions)
                ? rec.versions.filter((v): v is string => typeof v === "string")
                : [];
              const builtIn =
                typeof rec.builtInVersion === "string" ? rec.builtInVersion : undefined;
              return {
                name,
                versions: versions.join(", "),
                builtIn,
              };
            })
            .filter((row): row is { name: string; versions: string; builtIn?: string } => !!row),
        );
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
    <main className="flex flex-col h-full">
      <div className="px-6">
        <div className="extensions-header">
          {/* Official fs residual (cf4f70727): icon size 16 + span both onClick → /settings/desktop/extensions */}
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
                    // Official installDxtUnpacked needs a folder path from FilePickers.
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

type ExtensionsSettingsBridgeWithRuntimes = {
  getAvailableExtensionRuntimes?: () => Promise<unknown[]>;
};

export function ExtensionsDirectory({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  const text = useExtensionsSettingsText();
  const [query, setQuery] = useState("");
  return (
    <main className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        {/* Official directory residual: icon + BYTC25E9Co both onClick */}
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
 * flex items-center gap-1 mb-4;
 * Phosphor arrow size 16 onClick + span onClick → r.push("/settings/desktop/extensions").
 * Both icon and label must navigate (arrow alone was a dead hit target before).
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
