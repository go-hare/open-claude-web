import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { officialDirectoryStore } from "../directory/officialDirectoryStore";
import { AddCustomConnectorDialog } from "./AddCustomConnectorDialog";
import { ConnectorsEmptyState, ConnectorsLoadErrorState } from "./ConnectorsEmptyState";
import { ConnectorsListSidebar } from "./ConnectorsListSidebar";
import type { ConnectorListItem } from "./connectorTypes";
import {
  addCustomConnector,
  authorizeConnector,
  disconnectConnector,
  ensureDirectMcpHydrated,
  getConnectorItems,
  isDirectMcpHydrated,
  removeConnector,
  subscribeConnectorItems,
} from "./connectorsStore";

/**
 * Official c63a78ed4 Ht:
 * loading → Gt skeleton
 * error + empty → Jt
 * empty → Kt (+ optional add modal)
 * non-empty → Rt list + detail pane
 *
 * Residual Direct MCP (ion Rrs/mQe/hQe): hydrate statuses + authorize/disconnect by name.
 * Directory browse uses official HT.open("connectors") → $8t ($T remaps to plugins).
 */
export function ConnectorsRoute() {
  const items = useSyncExternalStore(subscribeConnectorItems, getConnectorItems, getConnectorItems);
  // Official Je()/remoteStream: remounting Ht does not reset f to loading when data exists.
  // Product ConnectorsRoute remounts on Skills ↔ Connectors — keep ready if App already hydrated.
  const [loadState, setLoadState] = useState<"ready" | "loading" | "error">(() =>
    isDirectMcpHydrated() ? "ready" : "loading",
  );
  // Official h starts null then an effect picks F/T/first; remount with cached E
  // would paint "Select a connector" for one frame. Seed from current list.
  const [selectedId, setSelectedId] = useState<string | null>(
    () => getConnectorItems()[0]?.id ?? null,
  );
  const [addOpen, setAddOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionBusy, setActionBusy] = useState(false);

  // Residual Rrs: subscribe + initial getDirectMcpServerStatuses.
  useEffect(() => {
    let cancelled = false;
    if (!isDirectMcpHydrated()) setLoadState("loading");
    void ensureDirectMcpHydrated()
      .then(() => {
        if (!cancelled) setLoadState("ready");
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Official: ?directory=true → pe open("connectors").
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("directory") === "true") {
      const filter = params.get("connectorTypeFilter");
      officialDirectoryStore.getState().open("connectors", {
        connectorTypeFilter: filter ?? null,
      });
    }
    if (params.get("add-custom-connector") === "true" || params.get("connectorUrl") || params.get("connectorName")) {
      setAddOpen(true);
    }
  }, []);

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !items.some((item) => item.id === selectedId)) {
      setSelectedId(items[0]?.id ?? null);
    }
  }, [items, selectedId]);

  const selected = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);

  const openBrowse = () => officialDirectoryStore.getState().open("connectors");
  const openAdd = () => setAddOpen(true);

  if (loadState === "loading" && items.length === 0) {
    return <ConnectorsLoadingSkeleton />;
  }

  if (loadState === "error" && items.length === 0) {
    return (
      <ConnectorsLoadErrorState
        onRetry={() => {
          setLoadState("loading");
          void ensureDirectMcpHydrated()
            .then(() => setLoadState("ready"))
            .catch(() => setLoadState("error"));
        }}
      />
    );
  }

  if (items.length === 0) {
    return (
      <>
        <div className="flex h-full">
          <ConnectorsEmptyState onBrowseConnectors={openBrowse} onAddCustomConnector={openAdd} />
        </div>
        {addOpen ? (
          <AddCustomConnectorDialog
            initialName={new URLSearchParams(window.location.search).get("connectorName") ?? ""}
            initialUrl={new URLSearchParams(window.location.search).get("connectorUrl") ?? ""}
            onClose={() => setAddOpen(false)}
            onSubmit={(value) => {
              const created = addCustomConnector(value);
              setSelectedId(created.id);
              setAddOpen(false);
            }}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div className="flex h-full">
        <ConnectorsListSidebar
          items={items}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onBrowseConnectors={openBrowse}
          onAddCustomConnector={openAdd}
        />
        <div className="flex-1 overflow-y-auto bg-bg-100 flex flex-col">
          {selected ? (
            <ConnectorDetail
              item={selected}
              actionError={actionError}
              actionBusy={actionBusy}
              onAuthorize={async () => {
                setActionError(null);
                setActionBusy(true);
                try {
                  const result = await authorizeConnector(selected.id);
                  if (!result.ok && !result.cancelled) {
                    setActionError(result.error ?? "Failed to authorize connector");
                  }
                } finally {
                  setActionBusy(false);
                }
              }}
              onDisconnect={async () => {
                setActionError(null);
                setActionBusy(true);
                try {
                  const ok = await disconnectConnector(selected.id);
                  if (!ok) setActionError("Failed to disconnect from server");
                } finally {
                  setActionBusy(false);
                }
              }}
              onRemove={
                selected.source === "local-custom" || selected.source === "direct-mcp"
                  ? async () => {
                      setActionError(null);
                      setActionBusy(true);
                      try {
                        await removeConnector(selected.id);
                      } finally {
                        setActionBusy(false);
                      }
                    }
                  : undefined
              }
            />
          ) : (
            <div className="flex items-center justify-center h-full text-text-400">Select a connector to view details</div>
          )}
        </div>
      </div>
      {addOpen ? (
        <AddCustomConnectorDialog
          onClose={() => setAddOpen(false)}
          onSubmit={(value) => {
            const created = addCustomConnector(value);
            setSelectedId(created.id);
            setAddOpen(false);
          }}
        />
      ) : null}
    </>
  );
}

function ConnectorDetail({
  item,
  actionError,
  actionBusy,
  onAuthorize,
  onDisconnect,
  onRemove,
}: {
  item: ConnectorListItem;
  actionError: string | null;
  actionBusy: boolean;
  onAuthorize: () => void;
  onDisconnect: () => void;
  onRemove?: () => void;
}) {
  // Residual-aligned detail: status + authorize (hQe) + disconnect + tools list.
  const statusLabel = item.isConnected
    ? "Connected"
    : item.needsAuth
      ? "Authorization required"
      : item.error
        ? "Error"
        : "Not connected";

  return (
    <div className="flex flex-col gap-4 p-8 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl text-text-000">{item.name}</h2>
        {item.description ? <p className="text-sm text-text-300">{item.description}</p> : null}
        <p className="text-xs text-text-500">{statusLabel}</p>
      </div>
      {item.url ? (
        <div className="rounded-xl border border-border-300 bg-bg-000 p-4">
          <div className="text-xs text-text-500 mb-1">Server URL</div>
          <div className="text-sm text-text-100 break-all">{item.url}</div>
        </div>
      ) : null}
      {item.error ? (
        <div className="rounded-xl border border-border-300 bg-bg-000 p-4 text-sm text-text-300">
          {item.error}
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-xl border border-border-300 bg-bg-000 p-4 text-sm text-text-300">
          {actionError}
        </div>
      ) : null}
      <div className="flex flex-wrap gap-2">
        {item.needsAuth ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={onAuthorize}
            className="inline-flex h-9 items-center rounded-lg bg-text-000 px-3 text-sm text-bg-000 disabled:opacity-50"
          >
            {actionBusy ? "Authorizing…" : "Authorize"}
          </button>
        ) : null}
        {item.isConnected ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={onDisconnect}
            className="inline-flex h-9 items-center rounded-lg border border-border-300 px-3 text-sm text-text-100 hover:bg-bg-100 disabled:opacity-50"
          >
            Disconnect
          </button>
        ) : null}
        {onRemove ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={onRemove}
            className="inline-flex h-9 items-center rounded-lg border border-border-300 px-3 text-sm text-text-100 hover:bg-bg-100 disabled:opacity-50"
          >
            Remove
          </button>
        ) : null}
      </div>
      {item.tools && item.tools.length > 0 ? (
        <div className="rounded-xl border border-border-300 bg-bg-000 p-4">
          <div className="text-xs text-text-500 mb-2">Tools</div>
          <ul className="flex flex-col gap-2">
            {item.tools.map((tool) => (
              <li key={tool.name} className="text-sm text-text-100">
                <div className="font-medium">{tool.displayName || tool.name}</div>
                {tool.description ? (
                  <div className="text-xs text-text-400">{tool.description}</div>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function ConnectorsLoadingSkeleton() {
  // Official wt pulse list column
  return (
    <div className="flex h-full animate-pulse">
      <div className="border-r border-border-300 w-[280px] min-w-[280px] xl:w-[360px] xl:min-w-[360px]">
        <div className="flex items-center px-6 py-3 min-h-14">
          <div className="h-5 bg-bg-300 rounded w-24" />
        </div>
        <div className="px-4 space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-10 bg-bg-300 rounded-lg" />
          ))}
        </div>
      </div>
      <div className="flex-1 bg-bg-100" />
    </div>
  );
}
