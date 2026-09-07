import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { officialDirectoryStore } from "../directory/officialDirectoryStore";
import { AddCustomConnectorDialog } from "./AddCustomConnectorDialog";
import { ConnectorDetailPanel } from "./ConnectorDetailPanel";
import { ConnectorsEmptyState, ConnectorsLoadErrorState } from "./ConnectorsEmptyState";
import { ConnectorsListSidebar } from "./ConnectorsListSidebar";
import {
  addCustomConnector,
  authorizeConnector,
  disconnectConnector,
  ensureDirectMcpHydrated,
  getConnectorItems,
  isDirectMcpHydrated,
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
 * Rt header Bt: Browse + Add custom. Browse → pe("connectors") → $T plugins.
 * Detail is Ot, not a homemade URL/Remove card.
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
            <ConnectorDetailPanel
              actionBusy={actionBusy}
              actionError={actionError}
              item={selected}
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
