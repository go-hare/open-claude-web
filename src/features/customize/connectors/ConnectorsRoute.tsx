import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AddCustomConnectorDialog } from "./AddCustomConnectorDialog";
import { ConnectorsDirectoryPanel } from "./ConnectorsDirectoryPanel";
import { ConnectorsEmptyState, ConnectorsLoadErrorState } from "./ConnectorsEmptyState";
import { ConnectorsListSidebar } from "./ConnectorsListSidebar";
import { addCustomConnector, getConnectorItems, removeConnector, subscribeConnectorItems } from "./connectorsStore";

/**
 * Official c63a78ed4 Ht:
 * loading → Gt skeleton
 * error + empty → Jt
 * empty → Kt (+ optional add modal)
 * non-empty → Rt list + detail pane
 *
 * Directory browse uses pe open("connectors"); local panel stands in until directory feed exists.
 */
export function ConnectorsRoute() {
  const items = useSyncExternalStore(subscribeConnectorItems, getConnectorItems, getConnectorItems);
  const [loadState] = useState<"ready" | "loading" | "error">("ready");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [directoryOpen, setDirectoryOpen] = useState(false);

  // Official: ?directory=true opens connectors directory once.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("directory") === "true") {
      setDirectoryOpen(true);
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

  const openBrowse = () => setDirectoryOpen(true);
  const openAdd = () => setAddOpen(true);

  if (loadState === "loading") {
    return <ConnectorsLoadingSkeleton />;
  }

  if (loadState === "error" && items.length === 0) {
    return <ConnectorsLoadErrorState onRetry={() => window.location.reload()} />;
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
        {directoryOpen ? <ConnectorsDirectoryPanel onClose={() => setDirectoryOpen(false)} /> : null}
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
              name={selected.name}
              description={selected.description}
              url={selected.url}
              onRemove={
                selected.source === "local-custom"
                  ? () => {
                      removeConnector(selected.id);
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
      {directoryOpen ? <ConnectorsDirectoryPanel onClose={() => setDirectoryOpen(false)} /> : null}
    </>
  );
}

function ConnectorDetail({
  name,
  description,
  url,
  onRemove,
}: {
  name: string;
  description?: string;
  url?: string;
  onRemove?: () => void;
}) {
  // Minimal detail shell — full Ot detail (auth, tools, etc.) needs official MCP host data.
  return (
    <div className="flex flex-col gap-4 p-8 max-w-2xl">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl text-text-000">{name}</h2>
        {description ? <p className="text-sm text-text-300">{description}</p> : null}
      </div>
      {url ? (
        <div className="rounded-xl border border-border-300 bg-bg-000 p-4">
          <div className="text-xs text-text-500 mb-1">Server URL</div>
          <div className="text-sm text-text-100 break-all">{url}</div>
        </div>
      ) : null}
      {onRemove ? (
        <div>
          <button
            type="button"
            onClick={onRemove}
            className="inline-flex h-9 items-center rounded-lg border border-border-300 px-3 text-sm text-text-100 hover:bg-bg-100"
          >
            Remove
          </button>
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
