import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../shell/icons";
import { CdsButton, secondaryButtonClass } from "../SettingsShell";
import {
  formatExtensionsTemplate,
  useDeveloperSettingsText,
} from "../settingsMessages";
import {
  mcpSettingsBridge,
  type McpServerStatusEntry,
} from "../settingsDesktopBridge";
import { DeveloperEmptyGlyph } from "./DeveloperEmptyGlyph";

type ServerConfig = {
  args?: string[];
  command?: string;
  env?: Record<string, string>;
  error?: string;
  extensionId?: string;
  status?: string;
};

/**
 * Official Local MCP servers D (cadc35a07-DqmNVATl):
 * - Header title/description; Edit Config + Developer docs when list non-empty
 * - Empty: glyph _ + TrS+kwadjI + primary Edit + secondary docs
 * - Non-empty: left w-48 list + right detail F (status badge, Command, Args, Error, View Logs, Advanced env)
 * - Delete via setMcpServerConfigs after confirm E4wAMW5Ily
 * - Gates: isLocalDevMcpEnabled + isDxtEnabled warnings (when bridge reports false)
 */
export function DesktopDeveloper() {
  const text = useDeveloperSettingsText();
  const [servers, setServers] = useState<Record<string, ServerConfig>>({});
  const [selected, setSelected] = useState("");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [localDevEnabled, setLocalDevEnabled] = useState(true);
  const [dxtEnabled, setDxtEnabled] = useState(true);
  const [newKeys, setNewKeys] = useState<Set<string>>(new Set());
  const listRef = useRef<HTMLUListElement | null>(null);
  const selectedRef = useRef(selected);
  selectedRef.current = selected;

  const keys = useMemo(() => Object.keys(servers), [servers]);

  const reload = useCallback(async () => {
    const bridge = mcpSettingsBridge();
    try {
      const withStatus = await bridge?.getMcpServersConfigWithStatus?.();
      if (withStatus && typeof withStatus === "object") {
        const next = normalizeServerMap(withStatus);
        setServers(next);
        setSelected((prev) => prev || Object.keys(next)[0] || "");
      } else {
        const config = await bridge?.getMcpServersConfig?.();
        if (config && typeof config === "object") {
          const next = normalizeServerMap(config as Record<string, unknown>);
          setServers(next);
          setSelected((prev) => prev || Object.keys(next)[0] || "");
        } else {
          setServers({});
        }
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : text.failedToLoadConfigs);
      setServers({});
    } finally {
      setReady(true);
    }
  }, [text.failedToLoadConfigs]);

  useEffect(() => {
    let alive = true;
    void reload().then(() => {
      if (!alive) return;
    });
    const bridge = mcpSettingsBridge();
    const unsubConfig = bridge?.onMcpConfigChange?.((config) => {
      if (!config) {
        setServers({});
        return;
      }
      setServers((prev) => {
        const added = new Set<string>();
        for (const key of Object.keys(config)) {
          if (!Object.hasOwn(prev, key)) added.add(key);
        }
        setNewKeys(added);
        return normalizeServerMap(config as Record<string, unknown>);
      });
      if (selectedRef.current && !Object.hasOwn(config, selectedRef.current)) {
        setSelected("");
      }
    });
    const unsubStatus = bridge?.onMcpStatusChanged?.((name, serverStatus, serverError) => {
      setServers((prev) => ({
        ...prev,
        [name]: {
          ...prev[name],
          status: serverStatus,
          error: serverError ?? undefined,
        },
      }));
    });
    return () => {
      alive = false;
      unsubConfig?.();
      unsubStatus?.();
    };
  }, [reload]);

  useEffect(() => {
    const bridge = mcpSettingsBridge();
    void bridge?.isLocalDevMcpEnabled?.().then((value) => {
      setLocalDevEnabled(value !== false);
    });
    // Official: r?.getAppConfig?.().then(e => isDxtEnabled ?? true)
    void (async () => {
      try {
        const settings = window as Window & {
          "claude.settings"?: {
            getAppConfig?: () => Promise<{ features?: { isDxtEnabled?: boolean } }>;
          };
          "claude.app"?: {
            getAppConfig?: () => Promise<{ features?: { isDxtEnabled?: boolean } }>;
          };
        };
        const cfg =
          (await settings["claude.settings"]?.getAppConfig?.())
          ?? (await settings["claude.app"]?.getAppConfig?.());
        if (cfg?.features && "isDxtEnabled" in cfg.features) {
          setDxtEnabled(cfg.features.isDxtEnabled !== false);
        }
      } catch {
        /* keep default true — official residual when bridge absent */
      }
    })();
  }, []);

  useEffect(() => {
    if (newKeys.size < 1) return;
    const root = listRef.current;
    if (!root) return;
    let minTop = Number.POSITIVE_INFINITY;
    for (const key of newKeys) {
      const el = root.querySelector(`[data-config-key="${key}"]`);
      if (el instanceof HTMLElement) minTop = Math.min(el.offsetTop, minTop);
    }
    if (minTop < Number.POSITIVE_INFINITY) {
      root.scrollTo({ top: minTop - root.offsetTop, behavior: "smooth" });
    }
  }, [newKeys]);

  const editConfig = useCallback(async () => {
    setStatus("");
    const bridge = mcpSettingsBridge();
    if (!bridge?.revealConfig) {
      setStatus(text.failedToLoadConfigs);
      return;
    }
    try {
      await bridge.revealConfig();
    } catch (err) {
      setStatus(err instanceof Error ? err.message : text.failedToLoadConfigs);
    }
  }, [text.failedToLoadConfigs]);

  const deleteServer = useCallback(
    (serverKey: string) => {
      const confirmMsg = formatExtensionsTemplate(text.confirmDeleteServer, {
        serverKey,
      });
      if (!window.confirm(confirmMsg)) return;
      const bridge = mcpSettingsBridge();
      const next: Record<string, unknown> = { ...servers };
      delete next[serverKey];
      void bridge?.setMcpServerConfigs?.(next);
      setServers((prev) => {
        const copy = { ...prev };
        delete copy[serverKey];
        return copy;
      });
      setSelected((prev) => (prev === serverKey ? "" : prev));
    },
    [servers, text.confirmDeleteServer],
  );

  const editButton = (variant: "primary" | "secondary" = "secondary") => (
    <CdsButton primary={variant === "primary"} onClick={() => void editConfig()}>
      {text.editConfig}
    </CdsButton>
  );

  const docsLink = (
    <a
      className={secondaryButtonClass}
      href="https://modelcontextprotocol.io/quickstart"
      rel="noopener noreferrer"
      target="_blank"
    >
      <span className="absolute inset-0 -z-[1] rounded-[inherit] bg-fill-secondary shadow-field transition-colors duration-fast group-hover/btn:bg-fill-secondary-hover group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)] group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent cds-btn-squish" />
      <span className="inline-flex items-center gap-1">
        {text.developerDocs}
        <Icon name="ArrowUpRight" customSize={16} />
      </span>
    </a>
  );

  // Official residual: l = dxtEnabled, C = localDevEnabled; show main when l||C.
  // Both false → title only + IeexSlMkuP (no empty glyph / list).
  const showMain = localDevEnabled || dxtEnabled;

  return (
    <main className="flex h-full flex-col gap-8">
      <section className="mb-xl last:mb-0 ">
        {!showMain ? (
          <>
            <div className="mb-md flex min-w-0 flex-col gap-1">
              <h3 className="text-heading-semibold text-primary">{text.localMcpServers}</h3>
            </div>
            <div className="m-0 rounded-lg bg-bg-200 px-4 py-3 text-sm text-text-300">
              {text.bothDisabled}
            </div>
          </>
        ) : (
          <>
            <div className="mb-md flex min-w-0 flex-col gap-1">
              <h3 className="text-heading-semibold text-primary">
                {text.localMcpServers}
                <span className="block pt-xs text-footnote font-normal text-secondary">
                  {text.localMcpServersDescription}
                </span>
              </h3>
            </div>
            <div className="flex h-full flex-col pt-md">
              {/* Official: separate banners when only one arm is off */}
              {!dxtEnabled ? (
                <div className="my-4 rounded-lg bg-bg-200 px-4 py-3 text-sm text-text-300">
                  {text.desktopExtensionsDisabled}
                </div>
              ) : null}
              {!localDevEnabled ? (
                <div className="my-4 rounded-lg bg-bg-200 px-4 py-3 text-sm text-text-300">
                  {text.developerMcpDisabled}
                </div>
              ) : null}
              {/* Official: when list non-empty, Edit Config sits above the split pane */}
              {keys.length > 0 ? <div className="pb-4">{editButton()}</div> : null}
              <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                {!ready ? (
                  <p className="py-md text-footnote text-secondary">…</p>
                ) : error ? (
                  <p className="py-md text-footnote text-danger-000" role="status">
                    {error}
                  </p>
                ) : keys.length > 0 ? (
                  <div className="flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden rounded-lg border border-border-300 py-2">
                    <div className="flex w-48 flex-shrink-0 flex-col border-r border-border-300">
                      <ul className="min-h-0 flex-1 overflow-y-auto py-0.5" ref={listRef}>
                        {keys.map((key) => {
                          const entry = servers[key];
                          const active = selected === key;
                          return (
                            <li
                              key={key}
                              data-config-key={key}
                              className={[
                                "mx-2 my-1 cursor-pointer rounded-lg px-3 py-2 text-sm transition-all ease-in-out active:scale-95",
                                active ? "bg-bg-300 font-medium" : "hover:bg-bg-200",
                                newKeys.has(key) ? "animate-pulse bg-brand-100" : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => setSelected(key)}
                            >
                              <div className="flex w-full items-center justify-between pr-2">
                                <span className="min-w-0 truncate">{key}</span>
                                {entry?.status === "failed" ? (
                                  <Icon
                                    name="WarningCircle"
                                    customSize={16}
                                    className="flex-shrink-0 text-danger-100"
                                  />
                                ) : null}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    {selected && servers[selected] ? (
                      <ServerDetail
                        configKey={selected}
                        config={servers[selected]}
                        onDelete={() => deleteServer(selected)}
                        text={text}
                      />
                    ) : (
                      <div className="flex-1 bg-bg-100" />
                    )}
                  </div>
                ) : (
                  <div className="flex flex-1 flex-col items-center justify-center gap-3 gap-4 text-center">
                    <DeveloperEmptyGlyph />
                    <p className="max-w-[60%] text-text-300">{text.noServersAdded}</p>
                    <div className="inline-flex gap-3">
                      {editButton("primary")}
                      {docsLink}
                    </div>
                  </div>
                )}
              </div>
              {status ? (
                <p className="py-sm text-footnote text-text-400" role="status">
                  {status}
                </p>
              ) : null}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function ServerDetail({
  config,
  configKey,
  onDelete,
  text,
}: {
  config: ServerConfig;
  configKey: string;
  onDelete: () => void;
  text: ReturnType<typeof useDeveloperSettingsText>;
}) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const argsText = config.args?.join(" ") || undefined;
  const envKeys = config.env ? Object.keys(config.env) : [];
  const hasEnv = envKeys.length > 0;
  const managed = !!config.extensionId;
  const status = config.status ?? "";
  const badgeClass =
    status === "running"
      ? "bg-accent-200 text-text-000"
      : status === "failed"
        ? "bg-danger-200 text-text-000"
        : "bg-brand-200 text-text-000";

  return (
    <div className="h-full min-w-0 flex-1 overflow-auto break-words bg-bg-100 px-5 py-2">
      <header className="mb-0 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">{configKey}</h2>
          {status ? (
            <div className={`rounded px-2 py-0.5 text-xs ${badgeClass}`}>{status}</div>
          ) : null}
        </div>
        {!managed ? (
          <button
            type="button"
            onClick={onDelete}
            className="appearance-none rounded border-0 bg-transparent p-2 transition-colors hover:bg-bg-200"
            title={text.delete}
            aria-label={text.delete}
          >
            <Icon name="Trash" className="text-text-300 hover:text-danger-100" customSize={16} />
          </button>
        ) : null}
      </header>
      {managed ? (
        <p className="text-sm text-text-500">{text.managedByExtension}</p>
      ) : null}
      <section className="mt-4">
        <h3 className="text-sm font-medium">{text.command}</h3>
        <p className="mt-1 text-sm text-text-500">{config.command ?? ""}</p>
      </section>
      {argsText ? (
        <section className="mt-4">
          <h3 className="text-sm font-medium">{text.arguments}</h3>
          <p className="mt-1 text-sm text-text-500">{argsText}</p>
        </section>
      ) : null}
      {config.error ? (
        <section className="mt-4">
          <h3 className="text-sm font-medium text-danger-100">{text.error}</h3>
          <p className="mt-1 text-sm text-danger-100">{config.error}</p>
        </section>
      ) : null}
      <section className="mt-4">
        <CdsButton
          onClick={() => {
            void mcpSettingsBridge()?.revealServerLog?.(configKey);
          }}
        >
          {text.viewLogs}
        </CdsButton>
      </section>
      {hasEnv ? (
        <>
          <button
            type="button"
            className="mt-4 flex items-center gap-1 text-text-500 hover:text-text-100"
            onClick={() => setAdvancedOpen((value) => !value)}
          >
            <Icon
              name="CaretRight"
              customSize={14}
              className={`transition-transform ${advancedOpen ? "rotate-90" : ""}`}
            />
            {text.advancedOptions}
          </button>
          {advancedOpen ? (
            <section className="mt-4">
              <h3 className="text-sm font-medium">{text.environmentVariables}</h3>
              {envKeys.map((key) => (
                <p key={key} className="mt-1 text-sm text-text-500">
                  {key}={config.env?.[key]}
                </p>
              ))}
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function normalizeServerMap(raw: Record<string, unknown>): Record<string, ServerConfig> {
  const out: Record<string, ServerConfig> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!value || typeof value !== "object") {
      out[key] = {};
      continue;
    }
    const rec = value as McpServerStatusEntry;
    // Nested `{ config }` bridge shape
    const nested =
      rec.config && typeof rec.config === "object"
        ? (rec.config as Record<string, unknown>)
        : null;
    const base = nested ?? (rec as Record<string, unknown>);
    out[key] = {
      command: typeof base.command === "string" ? base.command : undefined,
      args: Array.isArray(base.args)
        ? base.args.filter((item): item is string => typeof item === "string")
        : undefined,
      env:
        base.env && typeof base.env === "object"
          ? Object.fromEntries(
              Object.entries(base.env as Record<string, unknown>).filter(
                (entry): entry is [string, string] => typeof entry[1] === "string",
              ),
            )
          : undefined,
      extensionId:
        typeof base.extensionId === "string"
          ? base.extensionId
          : typeof rec.extensionId === "string"
            ? rec.extensionId
            : undefined,
      status: typeof rec.status === "string" ? rec.status : typeof base.status === "string" ? base.status : undefined,
      error: typeof rec.error === "string" ? rec.error : typeof base.error === "string" ? base.error : undefined,
    };
  }
  return out;
}
