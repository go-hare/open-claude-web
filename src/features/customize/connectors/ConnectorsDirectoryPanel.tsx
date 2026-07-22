import { useEffect, useMemo, useState } from "react";
import {
  addCustomConnector,
  getConnectorItems,
  subscribeConnectorItems,
} from "./connectorsStore";
import type { ConnectorListItem } from "./connectorTypes";

type DirectoryEntry = {
  id: string;
  name: string;
  description?: string;
  url?: string;
  connectorType?: string;
  source?: string;
  version?: string;
};

/**
 * Official pe(e=>e.open)("connectors") directory surface.
 * Product residual (3P): merge local inventory without inventing Anthropic cloud catalog:
 * 1. local custom connectors store
 * 2. GET /api/organizations/local/dxt/extensions (installed dxt + MCP configs)
 * 3. plugins/list-plugins when available
 * Desktop Extensions "Browse extensions" opens with connectorTypeFilter=desktop
 * (c71860c77-CrCPjj7D j → open("connectors", { connectorTypeFilter: ["desktop"] })).
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function normalizeExtension(raw: unknown): DirectoryEntry | null {
  const item = asRecord(raw);
  const id =
    typeof item.id === "string" && item.id
      ? item.id
      : typeof item.name === "string"
        ? item.name
        : "";
  if (!id) return null;
  const name =
    (typeof item.display_name === "string" && item.display_name)
    || (typeof item.name === "string" && item.name)
    || id;
  const description =
    typeof item.description === "string"
      ? item.description
      : typeof item.url === "string"
        ? item.url
        : undefined;
  const url = typeof item.url === "string" ? item.url : undefined;
  const connectorType =
    typeof item.connector_type === "string"
      ? item.connector_type
      : typeof item.source === "string" && item.source.includes("desktop")
        ? "desktop"
        : typeof item.source === "string" && item.source.includes("mcp")
          ? "mcp"
          : "mcp";
  return {
    id: String(id),
    name: String(name),
    description,
    url,
    connectorType,
    source: typeof item.source === "string" ? item.source : undefined,
    version: typeof item.version === "string" ? item.version : undefined,
  };
}

async function fetchDirectoryEntries(): Promise<DirectoryEntry[]> {
  const entries: DirectoryEntry[] = [];
  const seen = new Set<string>();

  const push = (entry: DirectoryEntry | null) => {
    if (!entry || seen.has(entry.id)) return;
    seen.add(entry.id);
    entries.push(entry);
  };

  // Local custom connectors already in store.
  for (const item of getConnectorItems()) {
    push({
      id: item.id,
      name: item.name,
      description: item.description,
      url: item.url,
      connectorType: item.source === "extension" ? "desktop" : "mcp",
      source: item.source,
    });
  }

  try {
    const response = await fetch("/api/organizations/local/dxt/extensions", {
      credentials: "include",
    });
    if (response.ok) {
      const body = asRecord(await response.json());
      const list = Array.isArray(body.extensions) ? body.extensions : [];
      for (const raw of list) push(normalizeExtension(raw));
    }
  } catch {
    /* offline / protocol residual */
  }

  try {
    const response = await fetch("/api/organizations/local/plugins/list-plugins", {
      credentials: "include",
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    if (response.ok) {
      const body = asRecord(await response.json());
      const list = Array.isArray(body.plugins) ? body.plugins : [];
      for (const raw of list) {
        const item = asRecord(raw);
        push({
          id: String(item.id ?? item.name ?? ""),
          name: String(item.name ?? item.id ?? "Plugin"),
          description:
            typeof item.description === "string"
              ? item.description
              : typeof item.marketplaceName === "string"
                ? `From ${item.marketplaceName}`
                : undefined,
          connectorType: "desktop",
          source: typeof item.source === "string" ? item.source : "marketplace",
          version: typeof item.version === "string" ? item.version : undefined,
        });
      }
    }
  } catch {
    /* optional residual */
  }

  return entries.filter((entry) => entry.id);
}

export function ConnectorsDirectoryPanel({
  onClose,
  connectorTypeFilter,
  onAdded,
}: {
  onClose: () => void;
  /** Official connectorTypeFilter residual; "desktop" is Extensions Browse. */
  connectorTypeFilter?: string | null;
  onAdded?: (item: ConnectorListItem) => void;
}) {
  const desktopOnly =
    connectorTypeFilter === "desktop"
    || connectorTypeFilter === '["desktop"]'
    || (typeof connectorTypeFilter === "string"
      && connectorTypeFilter.includes("desktop"));
  const [loading, setLoading] = useState(true);
  const [entries, setEntries] = useState<DirectoryEntry[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void fetchDirectoryEntries()
      .then((list) => {
        if (alive) setEntries(list);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    const unsub = subscribeConnectorItems(() => {
      void fetchDirectoryEntries().then((list) => {
        if (alive) setEntries(list);
      });
    });
    return () => {
      alive = false;
      unsub();
    };
  }, []);

  const visible = useMemo(() => {
    if (!desktopOnly) return entries;
    return entries.filter(
      (entry) =>
        entry.connectorType === "desktop"
        || entry.source === "local-install"
        || entry.source === "extension"
        || entry.source === "marketplace"
        || entry.source === "local-upload",
    );
  }, [desktopOnly, entries]);

  const addEntry = (entry: DirectoryEntry) => {
    // Add into local customize store so Configure path works.
    const existing = getConnectorItems().find((item) => item.id === entry.id);
    if (existing) {
      setStatus(`${entry.name} is already in your connectors.`);
      return;
    }
    if (entry.url || entry.source === "local-mcp" || entry.connectorType === "mcp") {
      const created = addCustomConnector({
        name: entry.name,
        url: entry.url ?? entry.id,
      });
      onAdded?.(created);
      setStatus(`Added ${entry.name}.`);
      return;
    }
    // Desktop extension / plugin — already installed on disk; deep-link to settings.
    setStatus(
      entry.connectorType === "desktop"
        ? `${entry.name} is available from desktop extensions / local marketplace.`
        : `Added reference for ${entry.name}.`,
    );
    if (!getConnectorItems().some((item) => item.id === entry.id)) {
      const created = addCustomConnector({
        name: entry.name,
        url: entry.url ?? `desktop://${entry.id}`,
      });
      onAdded?.(created);
    }
  };

  return (
    <div
      className="fixed inset-0 z-popover flex justify-end bg-[hsl(var(--always-black)/15%)]"
      role="dialog"
      aria-label="Browse connectors"
    >
      <div className="flex h-full w-[min(520px,100vw)] flex-col border-l border-border-300 bg-bg-000 shadow-panel">
        <div className="flex items-center justify-between px-6 py-3 min-h-14">
          <h2 className="font-large-bold truncate">
            {desktopOnly ? "Browse desktop extensions" : "Browse connectors"}
          </h2>
          <button
            type="button"
            aria-label="关闭"
            onClick={onClose}
            className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
          >
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col overflow-hidden bg-bg-100">
          {loading ? (
            <div className="flex flex-1 items-center justify-center px-6 py-8 text-text-400">
              Loading directory…
            </div>
          ) : visible.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-8 text-center">
              <span className="font-base text-text-300">No connectors found</span>
              <span className="font-small text-text-500">
                {desktopOnly
                  ? "Install a .dxt / .mcpb extension or add a local marketplace plugin — they will appear here."
                  : "Add a custom connector or install a desktop extension to populate this directory."}
              </span>
            </div>
          ) : (
            <ul className="flex flex-1 flex-col overflow-y-auto divide-y divide-border-300">
              {visible.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 px-6 py-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-base text-text-100">{entry.name}</p>
                    {entry.description ? (
                      <p className="mt-0.5 line-clamp-2 font-small text-text-400">
                        {entry.description}
                      </p>
                    ) : null}
                    {entry.version ? (
                      <p className="mt-1 font-small text-text-500">v{entry.version}</p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className="cds-reset shrink-0 rounded-lg bg-bg-300 px-3 py-1.5 text-sm text-text-100 hover:bg-bg-400"
                    onClick={() => addEntry(entry)}
                  >
                    Add
                  </button>
                </li>
              ))}
            </ul>
          )}
          {status ? (
            <p className="border-t border-border-300 px-6 py-2 text-footnote text-secondary" role="status">
              {status}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
