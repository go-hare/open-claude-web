import { useCallback, useEffect, useState } from "react";
import { CdsButton, sectionBodyClass, secondaryButtonClass } from "../SettingsShell";
import {
  mcpSettingsBridge,
  type McpServerStatusEntry,
} from "../settingsDesktopBridge";

/**
 * Official Local MCP servers R/D (cadc35a07):
 * title + description; list or empty "No servers added";
 * Edit Config → claude.settings.MCP.revealConfig (showItemInFolder mcp-servers.json);
 * Developer docs → modelcontextprotocol.io/quickstart.
 */
export function DesktopDeveloper() {
  const [servers, setServers] = useState<Array<{ name: string; entry: McpServerStatusEntry }>>([]);
  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    const bridge = mcpSettingsBridge();
    try {
      const withStatus = await bridge?.getMcpServersConfigWithStatus?.();
      if (withStatus && typeof withStatus === "object") {
        setServers(
          Object.entries(withStatus).map(([name, entry]) => ({
            name,
            entry: entry && typeof entry === "object" ? entry : {},
          })),
        );
      } else {
        const config = await bridge?.getMcpServersConfig?.();
        if (config && typeof config === "object") {
          setServers(
            Object.entries(config).map(([name, value]) => ({
              name,
              entry: { config: value },
            })),
          );
        } else {
          setServers([]);
        }
      }
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP server configurations");
      setServers([]);
    } finally {
      setReady(true);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    void reload().then(() => {
      if (!alive) return;
    });
    const bridge = mcpSettingsBridge();
    const unsubConfig = bridge?.onMcpConfigChange?.(() => {
      void reload();
    });
    const unsubStatus = bridge?.onMcpStatusChanged?.(() => {
      void reload();
    });
    return () => {
      alive = false;
      unsubConfig?.();
      unsubStatus?.();
    };
  }, [reload]);

  const editConfig = useCallback(async () => {
    setStatus("");
    const bridge = mcpSettingsBridge();
    if (!bridge?.revealConfig) {
      setStatus("Edit Config is unavailable (MCP bridge not connected).");
      return;
    }
    try {
      await bridge.revealConfig();
      setStatus("");
    } catch (err) {
      setStatus(err instanceof Error ? err.message : "Failed to open config");
    }
  }, []);

  const editButton = (
    <CdsButton primary onClick={() => void editConfig()}>
      Edit Config
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
      <span className="inline-flex items-center gap-1 ">Developer docs</span>
    </a>
  );

  return (
    <main className="flex flex-col gap-8 h-full">
      <section className="mb-xl last:mb-0 ">
        <div className="mb-md flex items-start justify-between gap-lg">
          <div className="flex min-w-0 flex-col gap-1">
            <h3 className="text-heading-semibold text-primary">
              Local MCP servers
              <span className="block pt-xs text-footnote font-normal text-secondary">
                Add and manage MCP servers that you’re working on.{" "}
              </span>
            </h3>
          </div>
          {servers.length > 0 ? (
            <div className="flex shrink-0 items-center gap-2">
              {editButton}
              {docsLink}
            </div>
          ) : null}
        </div>
        <div className={sectionBodyClass}>
          {!ready ? (
            <p className="py-md text-footnote text-secondary">Loading…</p>
          ) : error ? (
            <p className="py-md text-footnote text-danger-000" role="status">
              {error}
            </p>
          ) : servers.length > 0 ? (
            <ul className="flex flex-col divide-y divide-alpha-1">
              {servers.map(({ name, entry }) => {
                const command =
                  entry.config && typeof entry.config === "object"
                    ? String((entry.config as Record<string, unknown>).command ?? "")
                    : "";
                const statusLabel =
                  typeof entry.status === "string" && entry.status.length > 0
                    ? entry.status
                    : typeof entry.error === "string" && entry.error
                      ? "error"
                      : "configured";
                return (
                  <li key={name} className="flex items-center justify-between gap-4 py-md">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body text-primary">{name}</p>
                      {command ? (
                        <p className="truncate text-footnote text-secondary font-mono">{command}</p>
                      ) : null}
                      {typeof entry.error === "string" && entry.error ? (
                        <p className="text-footnote text-danger-000">{entry.error}</p>
                      ) : (
                        <p className="text-footnote text-secondary">{statusLabel}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex h-[180px] flex-col pt-md">
              <div className="flex h-full min-h-0 min-w-0 flex-1 overflow-hidden">
                <div className="flex flex-1 flex-col items-center justify-center gap-3 gap-4 text-center">
                  <div className="h-[72px] w-[72px]" aria-hidden="true" />
                  <p className="max-w-[60%] text-text-300">No servers added</p>
                  <div className="inline-flex gap-3">
                    {editButton}
                    {docsLink}
                  </div>
                </div>
              </div>
            </div>
          )}
          {status ? (
            <p className="py-sm text-footnote text-text-400" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
