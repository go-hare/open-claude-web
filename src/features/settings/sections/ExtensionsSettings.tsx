import { useCallback, useEffect, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { CdsButton, SettingsRow, SettingsSection, Switch, sectionBodyClass } from "../SettingsShell";
import { useDesktopPreferences } from "../useDesktopPreferences";
import {
  extensionsSettingsBridge,
  fileSystemPath,
  type InstalledExtensionState,
} from "../settingsDesktopBridge";

/**
 * Official Extensions overview (c71860c77-CrCPjj7D):
 * header Extensions + Browse; list/empty; Advanced settings; Drag .MCPB or .DXT files here to install.
 * Install/list via claude.settings.Extensions residual.
 */
export function ExtensionsOverview({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
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
      setError(err instanceof Error ? err.message : "Error loading extensions");
      setExtensions([]);
    } finally {
      setReady(true);
    }
  }, []);

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
          setStatus(`Unsupported file: ${file.name}`);
          continue;
        }
        if (!abs) {
          setStatus("Drop install needs a desktop file path (open Install Extension instead).");
          continue;
        }
        try {
          if (bridge?.handleDxtFile) {
            await bridge.handleDxtFile(abs);
          } else if (bridge?.installDxt) {
            await bridge.installDxt(null, abs);
          } else {
            setStatus("Install is unavailable (Extensions bridge not connected).");
            return;
          }
        } catch (err) {
          setStatus(err instanceof Error ? err.message : `Failed to handle file: ${file.name}`);
        }
      }
      await reload();
    },
    [reload],
  );

  const setEnabled = useCallback(
    async (id: string, enabled: boolean) => {
      const bridge = extensionsSettingsBridge();
      try {
        await bridge?.setExtensionSettings?.(id, { isEnabled: enabled });
        await reload();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to update extension");
      }
    },
    [reload],
  );

  const uninstall = useCallback(
    async (id: string) => {
      const bridge = extensionsSettingsBridge();
      try {
        await bridge?.deleteExtension?.(id);
        await reload();
      } catch (err) {
        setStatus(err instanceof Error ? err.message : "Failed to uninstall");
      }
    },
    [reload],
  );

  return (
    <main className="flex h-full flex-col gap-7">
      <section className="mb-xl last:mb-0 ">
        <div className={sectionBodyClass}>
          <div className="flex items-center justify-between gap-lg py-md  " role="group">
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              <div className="text-body text-primary">
                <span className="text-heading-semibold">Extensions</span>
              </div>
              <div className="text-body text-muted">
                Allow Claude to directly interact with apps, data, and tools on your computer.
              </div>
            </div>
            <div className="flex shrink-0 items-center">
              <CdsButton onClick={browseExtensions}>Browse extensions</CdsButton>
            </div>
          </div>
          <div className="pt-md">
            <div className="extensions-overview flex h-full flex-col overflow-y-auto">
              {!ready ? (
                <p className="py-8 text-center text-text-400">Loading extensions...</p>
              ) : error ? (
                <p className="py-8 text-center text-danger-000">{error}</p>
              ) : extensions.length > 0 ? (
                <ul className="flex flex-col gap-2 pb-4">
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
                    return (
                      <li
                        key={ext.id}
                        className="flex items-center justify-between gap-4 rounded-lg border border-border-300 bg-bg-000 px-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-100">{name}</p>
                          {description ? (
                            <p className="truncate text-xs text-text-400">{description}</p>
                          ) : (
                            <p className="text-xs text-text-400">Installed on your computer</p>
                          )}
                          {blocked ? (
                            <p className="text-xs text-danger-000">
                              Not allowed in your current organization.
                            </p>
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
                            Uninstall
                          </CdsButton>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="h-24" aria-hidden="true" />
                </div>
              )}
              <hr className="col-span-2 my-6 border-0 border-b-0.5 border-border-300" />
              <div className="mb-4 flex flex-row gap-2">
                <CdsButton onClick={() => onNavigate("/settings/desktop/extensions/advanced")}>
                  Advanced settings
                </CdsButton>
              </div>
              <div
                className={`rounded-lg border border-dashed px-4 py-6 transition-colors ${
                  dragOver ? "border-accent bg-bg-100" : "border-border-300"
                }`}
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
                  <span className="text-text-500">Drag .MCPB or .DXT files here to install</span>
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
  const [preferences, setPreference] = useDesktopPreferences();
  const [status, setStatus] = useState("");
  const [runtimes, setRuntimes] = useState<string>("");

  useEffect(() => {
    const bridge = extensionsSettingsBridge();
    // Detected tools residual: available runtimes from bridge when present.
    void (async () => {
      try {
        const raw = await (
          bridge as ExtensionsSettingsBridgeWithRuntimes | undefined
        )?.getAvailableExtensionRuntimes?.();
        if (Array.isArray(raw)) {
          setRuntimes(
            raw
              .map((item) => {
                if (!item || typeof item !== "object") return "";
                const rec = item as { name?: string; builtInVersion?: string | null; versions?: string[] };
                const ver = rec.builtInVersion || rec.versions?.[0];
                return ver ? `${rec.name ?? "runtime"} ${ver}` : String(rec.name ?? "");
              })
              .filter(Boolean)
              .join(" · "),
          );
        }
      } catch {
        setRuntimes("");
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
          <div className="mb-4 flex items-center gap-1">
            <span aria-hidden="true" className="inline-block w-4" />
            <BackToExtensions onNavigate={onNavigate} variant="span">
              All extensions
            </BackToExtensions>
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-6 overflow-auto px-6">
        <SettingsSection title="Extension Settings">
          <SettingsRow
            label="Enable auto-updates for extensions"
            description="Automatically update extensions when a new version is available. When off, updates must be installed manually."
            control={
              <Switch
                checked={!!preferences.autoUpdateExtensions}
                onCheckedChange={(checked) => setPreference("autoUpdateExtensions", checked)}
              />
            }
          />
          <SettingsRow
            label="Use Built-in Node.js for MCP"
            description="If enabled, Claude will never use the system Node.js for extension MCP servers. This happens automatically when system’s Node.js is missing or outdated. "
            control={
              <Switch
                checked={!!preferences.useBuiltInNodeForMcp}
                onCheckedChange={(checked) => setPreference("useBuiltInNodeForMcp", checked)}
              />
            }
          />
          <div>
            <p className="mb-3 text-body text-primary">Detected tools</p>
            <p className="text-footnote text-secondary">{runtimes || "No tools detected yet."}</p>
          </div>
        </SettingsSection>
        <SettingsSection title="Extension developer">
          <div className="flex flex-col gap-6 py-md">
            <div className="w-full rounded-lg border border-danger-300 bg-bg-000 p-4 text-sm text-text-300">
              <div className="mb-1 font-medium">Developer tools warning</div>
              These tools are for extension developers only. Incorrect use can break extensions or
              affect system security.
            </div>
            <div className="flex flex-wrap gap-3">
              <CdsButton
                primary
                onClick={() =>
                  void run("Install Extension", async () => {
                    await extensionsSettingsBridge()?.showInstallDxtDialog?.();
                  })
                }
              >
                Install Extension
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run("Install Unpacked Extension", async () => {
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
                Install Unpacked Extension
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run("Open extensions folder", async () => {
                    await extensionsSettingsBridge()?.openExtensionsFolder?.();
                  })
                }
              >
                Open extensions folder
              </CdsButton>
              <CdsButton
                onClick={() =>
                  void run("Open extension settings folder", async () => {
                    await extensionsSettingsBridge()?.openExtensionSettingsFolder?.();
                  })
                }
              >
                Open extension settings folder
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
  const [query, setQuery] = useState("");
  return (
    <main className="flex h-full flex-col gap-4">
      <div className="flex flex-col gap-2">
        <div className="mb-4 flex items-center gap-1">
          <span aria-hidden="true" className="inline-block w-4" />
          <BackToExtensions onNavigate={onNavigate} variant="span">
            All extensions
          </BackToExtensions>
        </div>
        <h1 className="text-lg font-medium">[ANT ONLY] Manage global extension directory</h1>
        <p className="text-sm text-text-300">
          Upload, update, delete, and manage extensions in the directory
        </p>
      </div>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-lg border border-border-300 bg-bg-000 px-4 py-2 text-text-100 placeholder:text-text-400 focus:border-border-200 focus:outline-none focus:ring-0"
          onChange={(event) => setQuery(event.currentTarget.value)}
          placeholder="Search extensions..."
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
                  <p className="text-sm font-medium text-text-100">Upload new extension</p>
                  <p className="text-xs text-text-400">Add a new extension to the directory</p>
                </div>
              </div>
            </button>
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <p className="mb-2 text-text-300">No extensions found</p>
                <p className="text-sm text-text-400">
                  No extensions are available in the directory
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

export function ExtensionNotFound({ onNavigate }: Pick<RouteViewProps, "onNavigate">) {
  return (
    <main className="flex h-full flex-col">
      <div className="flex flex-col gap-4 p-6">
        <BackToExtensions onNavigate={onNavigate}>All extensions</BackToExtensions>
        <p className="text-text-300">Extension not found</p>
      </div>
    </main>
  );
}

function BackToExtensions({
  children,
  onNavigate,
  variant = "button",
}: Pick<RouteViewProps, "onNavigate"> & {
  children: string;
  variant?: "button" | "span";
}) {
  if (variant === "span") {
    return (
      <span className="cursor-pointer" onClick={() => onNavigate("/settings/desktop/extensions")}>
        {children}
      </span>
    );
  }
  return (
    <button
      aria-label="Back"
      className="inline-flex w-max items-center gap-1.5 rounded-sm pe-1 text-sm"
      onClick={() => onNavigate("/settings/desktop/extensions")}
      type="button"
    >
      {children}
    </button>
  );
}
