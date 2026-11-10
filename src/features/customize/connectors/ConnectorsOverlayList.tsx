import { useMemo, useState } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { SegmentedControl } from "../../settings/SettingsControls";
import { ConnectorsEmptyPictogram } from "../ConnectorsEmptyPictogram";
import { AddConnectorMenu } from "./AddConnectorMenu";
import type { ConnectorListItem } from "./connectorTypes";

type StatusFilter = "all" | "connected" | "notConnected";

const CONNECTORS_OVERLAY_MESSAGES = {
  connectors: { defaultMessage: "Connectors", id: "2mMJRvsAg1" },
  searchConnectors: { defaultMessage: "Search connectors", id: "xM1SiMNUGM" },
  addYourFirstConnectors: { defaultMessage: "Add your first connectors", id: "Ep5aBa3gJK" },
  connectorsLetClaudeWork: {
    defaultMessage: "Connectors let Claude work with your team’s tools and data.",
    id: "PXiJ+nljd4",
  },
  filterByStatus: { defaultMessage: "Filter by status", id: "cDDfq0dvi1" },
  all: { defaultMessage: "All", id: "zQvVDJ+j59" },
  connected: { defaultMessage: "Connected", id: "IvjoDSPGEQ" },
  notConnected: { defaultMessage: "Not connected", id: "kldl5VlIaI" },
  nothingConnected: { defaultMessage: "Nothing connected.", id: "DBFHZXvD6L" },
  nothingToConnect: { defaultMessage: "Nothing to connect.", id: "NJcu+sLEJB" },
  noConnectorsMatch: { defaultMessage: "No connectors match your search", id: "xPuGYMU3MT" },
} as const satisfies MessageDescriptors;

/**
 * Official overlay Go (c40525e86) inside W (c9e81e7b9).
 *
 * Settings overlay is not pageLayout (`j` false) → W 3-col header
 * `@2xl:grid-cols-[1fr_minmax(0,29.5rem)_1fr]` (screenshot 18: title | wide search | right).
 * Ot false on mine → no kr tabs. $e `onBrowseShared:void 0` → no Discover button.
 * Zo `k` false → no Add on empty (screenshot 18). Non-empty: Yn/Gn table + Add.
 */
export function ConnectorsOverlayList({
  items,
  listReady = true,
  onSelect,
  onBrowseConnectors,
  onAddCustomConnector,
}: {
  items: ConnectorListItem[];
  /** Official Me skeleton while rows loading — hide $e until list settled. */
  listReady?: boolean;
  onSelect: (id: string) => void;
  onBrowseConnectors: () => void;
  onAddCustomConnector: () => void;
}) {
  const text = useI18nText(CONNECTORS_OVERLAY_MESSAGES);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    return items.filter((item) => {
      if (status === "connected" && !item.isConnected) return false;
      if (status === "notConnected" && item.isConnected) return false;
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.searchTerms?.some((term) => term.toLowerCase().includes(q)) ||
        item.description?.toLowerCase().includes(q) ||
        item.url?.toLowerCase().includes(q)
      );
    });
  }, [items, query, status]);

  const searching = query.trim().length > 0;
  const showTable = filtered.length > 0;
  const firstRun = listReady && items.length === 0 && !searching && status === "all";
  const showFilter = items.length > 0 && !firstRun;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col pt-1" data-official-source="c40525e86:Go W">
      <header className="flex min-w-0 shrink-0 items-center gap-x-sm">
        <div className="flex min-w-0 flex-1 items-center">
          <h2 className="min-w-0 truncate text-title font-semibold text-primary">{text.connectors}</h2>
        </div>
        <div className="flex w-full max-w-md shrink-0 justify-center px-md">
          <OfficialTextInput
            aria-label={text.searchConnectors}
            className="w-full"
            data-testid="customize-header-search"
            onValueChange={setQuery}
            placeholder={text.searchConnectors}
            prepend={<Icon className="text-muted" customSize={16} name="Search" />}
            size="sm"
            type="search"
            value={query}
          />
        </div>
        <div className="flex min-w-0 flex-1 items-center justify-end">
          {firstRun ? null : (
            <AddConnectorMenu onAddCustom={onAddCustomConnector} onBrowse={onBrowseConnectors} variant="overlay" />
          )}
        </div>
      </header>
      <div aria-hidden="true" className="h-4 shrink-0" />
      <div className="relative -mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto pb-lg pt-1">
        <div className="flex flex-1 flex-col gap-lg">
          {firstRun ? <ConnectorsOverlayFirstRun /> : null}
          <div className="flex shrink-0 flex-col gap-sm empty:hidden">
            {showFilter ? (
              <div className="shrink-0 self-start">
                <SegmentedControl
                  ariaLabel={text.filterByStatus}
                  onChange={(value) => setStatus(value as StatusFilter)}
                  options={[
                    { value: "all", label: text.all },
                    { value: "connected", label: text.connected },
                    { value: "notConnected", label: text.notConnected },
                  ]}
                  value={status}
                  variant="ghost"
                />
              </div>
            ) : null}
            {showTable ? <ConnectorsOverlayTable items={filtered} onSelect={onSelect} /> : null}
            {!showTable && status !== "all" && !searching && !firstRun ? (
              <p className="py-lg text-center text-body text-muted">
                {status === "connected" ? text.nothingConnected : text.nothingToConnect}
              </p>
            ) : null}
          </div>
          {!showTable && searching ? (
            <p className="py-lg text-center text-body text-secondary">{text.noConnectorsMatch}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ConnectorsOverlayFirstRun() {
  const text = useI18nText(CONNECTORS_OVERLAY_MESSAGES);
  return (
    <div
      className="group/card relative isolate flex shrink-0 flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-['']"
      data-cds="Card"
      data-official-source="c40525e86:$e"
      data-testid="tabbed-list-first-run"
    >
      <span aria-hidden="true" className="cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit] bg-neutral" />
      <div className="cds-card-body flex min-h-0 flex-1 flex-col self-stretch rounded-[inherit] p-lg" data-cds-card-body="">
        <div className="flex items-center gap-lg">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-md">
            <div className="flex flex-col gap-xs">
              <h3 className="m-0 text-heading-semibold text-primary">{text.addYourFirstConnectors}</h3>
              <p className="m-0 text-body text-secondary">{text.connectorsLetClaudeWork}</p>
            </div>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 pr-6 text-primary sm:block">
            <ConnectorsEmptyPictogram size="small" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ConnectorsOverlayTable({
  items,
  onSelect,
}: {
  items: ConnectorListItem[];
  onSelect: (id: string) => void;
}) {
  return (
    <div className="shrink-0">
      <div
        className="-mx-pad-lg -mb-2 overflow-x-auto px-lg pb-2 scroll-fade-y scroll-fade-size-6 [scrollbar-gutter:stable]"
        data-official-source="c9e81e7b9:Yn c51c45b79:Gn"
      >
        <div className="mx-outset w-stretch" style={{ ["--cds-outset-x" as string]: "var(--cds-pad-md)" }}>
          <table
            className="w-full min-w-xl table-fixed border-separate border-spacing-0 whitespace-nowrap font-sans text-body font-normal text-primary sm:min-w-xl"
            data-cds="Table"
          >
            <thead className="text-left first:border-t-0">
              <tr className="relative [transform:translate(0,0)] text-body font-normal text-primary">
                <th className="h-control truncate px-md text-footnote font-medium text-secondary" scope="col">
                  Connector
                </th>
                <th className="h-control w-40 truncate px-md text-footnote font-medium text-secondary" scope="col">
                  Type
                </th>
                <th className="h-control w-40 truncate px-md text-footnote font-medium text-secondary" scope="col">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <ConnectorsOverlayRow key={item.id} item={item} onSelect={onSelect} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function isDesktopConnector(item: ConnectorListItem): boolean {
  return item.source === "extension" || item.source === "local-custom" || item.source === "direct-mcp";
}

function ConnectorsOverlayRow({
  item,
  onSelect,
}: {
  item: ConnectorListItem;
  onSelect: (id: string) => void;
}) {
  const desktop = isDesktopConnector(item);
  return (
    <tr
      className="group/cdsrow relative [transform:translate(0,0)] cursor-[var(--cds-cursor-interactive)] text-body font-normal text-primary"
      data-clickable=""
      data-hoverable=""
      onClick={() => onSelect(item.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(item.id);
        }
      }}
      tabIndex={0}
    >
      <td className="h-7 box-content border-b border-alpha-1 bg-clip-padding px-md py-sm group-hover/cdsrow:bg-fill-ghost-hover group-hover/cdsrow:first:rounded-l">
        <div className="flex min-w-0 items-center gap-sm">
          <span className="flex size-6 shrink-0 items-center justify-center text-text-300">
            <Icon customSize={16} name="connectors" />
          </span>
          <span className="truncate text-primary">{item.name}</span>
        </div>
      </td>
      <td className="h-7 box-content border-b border-alpha-1 bg-clip-padding px-md py-sm text-secondary group-hover/cdsrow:bg-fill-ghost-hover">
        <div className="flex min-w-0 items-center gap-xs overflow-hidden">
          <span>{desktop ? "Desktop" : "Web"}</span>
          {item.source === "local-custom" ? (
            <span
              className="inline-flex h-control-nested shrink-0 items-center rounded-chip bg-fill-ghost-hover px-sm font-sans text-caption font-medium text-secondary"
              data-cds="Badge"
            >
              Custom
            </span>
          ) : null}
        </div>
      </td>
      <td className="h-7 box-content border-b border-alpha-1 bg-clip-padding px-md py-sm text-secondary group-hover/cdsrow:last:rounded-r group-hover/cdsrow:bg-fill-ghost-hover">
        <div className="flex items-center">
          {item.isConnected ? (
            <>
              <span aria-hidden="true">
                <Icon name="Check" size="sm" />
              </span>
              <span className="sr-only">Connected</span>
            </>
          ) : (
            <span
              className="inline-flex h-control-nested shrink-0 items-center rounded-chip bg-fill-ghost-hover px-sm font-sans text-caption font-medium text-secondary"
              data-cds="Badge"
            >
              Not connected
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
