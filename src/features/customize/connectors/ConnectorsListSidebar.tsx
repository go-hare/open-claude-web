import { useMemo, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import type { ConnectorListItem } from "./connectorTypes";
import { ConnectorsPageSidebar } from "./ConnectorsPageSidebar";
import { ConnectorsEmptyState } from "./ConnectorsEmptyState";

/**
 * Official c63a78ed4 Rt — list sidebar with search + Web / Desktop / Not connected.
 * Host currently only stores local-custom items (all Not connected).
 */
export function ConnectorsListSidebar({
  items,
  selectedId,
  onSelect,
  onBrowseConnectors,
  onAddCustomConnector,
}: {
  items: ConnectorListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onBrowseConnectors: () => void;
  onAddCustomConnector: () => void;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return items;
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.searchTerms?.some((term) => term.toLowerCase().includes(q)) ||
        item.description?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q),
    );
  }, [items, query]);

  const connectedWeb = filtered.filter((item) => item.isConnected && item.source !== "extension" && item.source !== "local-custom");
  const connectedDesktop = filtered.filter((item) => item.isConnected && (item.source === "extension" || item.source === "local-custom"));
  // Local custom entries are not connected until host MCP wires them; official groups them under Not connected.
  const notConnected = filtered.filter((item) => !item.isConnected);
  const hasAny = connectedWeb.length > 0 || connectedDesktop.length > 0 || notConnected.length > 0;
  const searching = query.trim().length > 0;

  const title = searchOpen ? (
    <input
      ref={inputRef}
      value={query}
      onChange={(event) => setQuery(event.target.value)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setSearchOpen(false);
          setQuery("");
        }
      }}
      placeholder="搜索"
      className="flex-1 h-8 min-w-0 rounded-md border border-border-300 bg-bg-100 px-2 text-sm outline-none focus:shadow-focus"
      autoFocus
    />
  ) : (
    "Connectors"
  );

  const headerAction = searchOpen ? (
    <button
      type="button"
      aria-label="Close search"
      onClick={() => {
        setSearchOpen(false);
        setQuery("");
      }}
      className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
    >
      <Icon name="x" />
    </button>
  ) : (
    <div className="flex items-center gap-1">
      <button
        type="button"
        aria-label="Search connectors"
        onClick={() => setSearchOpen(true)}
        className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
      >
        <Icon name="Search" />
      </button>
      <button
        type="button"
        aria-label="Add connector"
        onClick={onBrowseConnectors}
        className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200"
      >
        <Icon name="Add" />
      </button>
    </div>
  );

  return (
    <ConnectorsPageSidebar title={title} headerAction={headerAction}>
      {hasAny ? (
        <div className="flex flex-col">
          {connectedWeb.length > 0 ? (
            <Section title="Web">
              {connectedWeb.map((item) => (
                <ConnectorRow key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
              ))}
            </Section>
          ) : null}
          {connectedDesktop.length > 0 ? (
            <Section title="Desktop">
              {connectedDesktop.map((item) => (
                <ConnectorRow key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
              ))}
            </Section>
          ) : null}
          {notConnected.length > 0 ? (
            <Section title="Not connected" showDivider={connectedWeb.length + connectedDesktop.length > 0}>
              {notConnected.map((item) => (
                <ConnectorRow key={item.id} item={item} selected={item.id === selectedId} onSelect={onSelect} />
              ))}
            </Section>
          ) : null}
        </div>
      ) : searching ? (
        <div className="flex flex-col items-center gap-4 px-6 py-8">
          <p className="text-sm text-text-300 text-center">No connectors found</p>
          <div className="flex flex-col gap-2 items-center">
            <button type="button" onClick={onBrowseConnectors} className="inline-flex h-8 items-center rounded-lg bg-text-000 px-3 text-sm text-bg-000">
              Browse connectors
            </button>
            <button type="button" onClick={onAddCustomConnector} className="inline-flex h-8 items-center rounded-lg border border-border-300 px-3 text-sm text-text-100">
              Add custom connector
            </button>
          </div>
        </div>
      ) : (
        <ConnectorsEmptyState onBrowseConnectors={onBrowseConnectors} onAddCustomConnector={onAddCustomConnector} />
      )}
    </ConnectorsPageSidebar>
  );
}

function Section({ title, children, showDivider }: { title: string; children: ReactNode; showDivider?: boolean }) {
  return (
    <>
      {showDivider ? <div className="h-px bg-border-300 my-3 mx-3" /> : null}
      <div className="flex flex-col gap-1 py-1">
        <div className="px-3 py-1 text-xs font-medium text-text-500">{title}</div>
        <div className="flex flex-col gap-px">{children}</div>
      </div>
    </>
  );
}

function ConnectorRow({
  item,
  selected,
  onSelect,
}: {
  item: ConnectorListItem;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      type="button"
      aria-current={selected ? "true" : undefined}
      onClick={() => onSelect(item.id)}
      className={[
        "rounded-lg text-sm transition-colors w-full flex items-center gap-3 px-3 py-2 text-left",
        selected ? "bg-bg-300 font-semibold text-text-100" : "hover:bg-bg-200 text-text-100",
        item.isConnected ? "" : "text-text-100",
      ].join(" ")}
    >
      <span className="flex-shrink-0 flex items-center justify-center size-6 text-text-300">
        <Icon name="connectors" />
      </span>
      <div className="flex flex-col flex-1 min-w-0">
        <span className={`truncate ${selected ? "font-semibold" : ""}`}>{item.name}</span>
        {item.description ? <span className="font-small text-text-400 truncate">{item.description}</span> : null}
      </div>
    </button>
  );
}
