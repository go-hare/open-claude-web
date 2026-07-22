/**
 * Official pe(e=>e.open)("connectors") directory surface.
 * Host has no published MCP directory feed yet — same shell as official panel
 * with empty directory body (not a freestyle invent of browse UX).
 * Desktop Extensions "Browse extensions" opens this with connectorTypeFilter=desktop
 * (c71860c77-CrCPjj7D j → open("connectors", { connectorTypeFilter: ["desktop"] })).
 */
export function ConnectorsDirectoryPanel({
  onClose,
  connectorTypeFilter,
}: {
  onClose: () => void;
  /** Official connectorTypeFilter residual; "desktop" is Extensions Browse. */
  connectorTypeFilter?: string | null;
}) {
  const desktopOnly = connectorTypeFilter === "desktop";
  return (
    <div className="fixed inset-0 z-popover flex justify-end bg-[hsl(var(--always-black)/15%)]" role="dialog" aria-label="Browse connectors">
      <div className="flex h-full w-[min(520px,100vw)] flex-col border-l border-border-300 bg-bg-000 shadow-panel">
        <div className="flex items-center justify-between px-6 py-3 min-h-14">
          <h2 className="font-large-bold truncate">
            {desktopOnly ? "Browse desktop extensions" : "Browse connectors"}
          </h2>
          <button type="button" aria-label="关闭" onClick={onClose} className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200">
            ×
          </button>
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg-100 px-6 py-8 text-center">
          <span className="font-base text-text-300">No connectors found</span>
          <span className="font-small text-text-500">
            {desktopOnly
              ? "Desktop MCP extensions from the directory will appear here when available."
              : "Connect apps Claude can read and write to."}
          </span>
        </div>
      </div>
    </div>
  );
}
