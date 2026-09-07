import { useCallback, useState } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import type { ConnectorListItem } from "./connectorTypes";
import { ConnectorToolPermissions } from "./ConnectorToolPermissions";

/**
 * Official c63a78ed4 Ot / ConnectorDetailPanel.
 * Connected remote: header + Disconnect + Et URL copy + me tools.
 * Not connected: centered copy + Ft connect. No invent Server-URL card / Remove.
 */
export function ConnectorDetailPanel({
  actionBusy,
  actionError,
  item,
  onAuthorize,
  onDisconnect,
}: {
  actionBusy: boolean;
  actionError: string | null;
  item: ConnectorListItem;
  onAuthorize: () => void;
  onDisconnect: () => void;
}) {
  const isLocal = item.source === "local-custom";
  const tools = item.tools ?? [];
  const hasTools = tools.length > 0;
  const toolsLoading = item.isConnected && item.toolsLoaded === false;

  if (!item.isConnected) {
    return (
      <div className="relative flex flex-col items-center justify-center h-full gap-4">
        <ConnectorGlyph item={item} />
        <ConnectorUrlCopy className="max-w-[80%] justify-center" url={item.url} />
        <div className="text-center flex flex-col gap-2 px-6">
          {item.error ? (
            <div className="flex items-center justify-center gap-1.5 text-warning-100">
              <Icon customSize={16} name="Warning" />
              <span className="font-large-bold">Connection issue</span>
            </div>
          ) : null}
          <p className="font-large text-text-500">{`You are not connected to ${item.name} yet.`}</p>
        </div>
        {actionError ? <p className="font-base text-text-400 px-6 text-center">{actionError}</p> : null}
        <OfficialButton disabled={actionBusy} loading={actionBusy} onClick={onAuthorize} variant="primary">
          Connect
        </OfficialButton>
      </div>
    );
  }

  return (
    <div className="px-6 pb-6">
      <div className="flex items-center justify-between mb-6 min-h-14 py-3">
        <div className="flex items-center gap-3">
          <ConnectorGlyph item={item} compact />
          <h2 className="font-large-bold text-text-100">{item.name}</h2>
        </div>
        <div className="flex items-center gap-2">
          {!isLocal ? (
            <OfficialButton disabled={actionBusy} onClick={onDisconnect} variant="secondary">
              Disconnect
            </OfficialButton>
          ) : null}
        </div>
      </div>
      {item.description && item.description !== item.url ? (
        <p className="font-base text-text-300 leading-normal mb-4">{item.description}</p>
      ) : null}
      <ConnectorUrlCopy url={item.url} />
      {actionError ? <p className="font-base text-text-400 mt-4">{actionError}</p> : null}
      {hasTools ? (
        <div className="relative mt-6">
          <ConnectorToolPermissions item={item} />
        </div>
      ) : toolsLoading ? (
        <div className="mt-6 flex min-h-24 items-center justify-center">
          <span
            aria-hidden
            className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-80"
          />
        </div>
      ) : item.error ? (
        <p className="mt-6 font-base text-text-400">{item.error}</p>
      ) : (
        <p className="font-base text-text-400 mt-6">This connector has no tools available.</p>
      )}
    </div>
  );
}

/** Official zt / re icon slot — MCP remotes use connectors glyph. */
function ConnectorGlyph({ compact, item }: { compact?: boolean; item: ConnectorListItem }) {
  const size = compact ? 24 : 56;
  return (
    <span
      className="flex-shrink-0 flex items-center justify-center text-text-300"
      style={{ width: size, height: size }}
    >
      <Icon customSize={compact ? 16 : 40} name="connectors" />
    </span>
  );
}

/** Official Et — copy server URL, not a Server URL card. */
function ConnectorUrlCopy({ className, url }: { className?: string; url?: string }) {
  const [didCopy, setDidCopy] = useState(false);
  const onCopy = useCallback(() => {
    if (!url || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(url).then(() => {
      setDidCopy(true);
      window.setTimeout(() => setDidCopy(false), 1500);
    });
  }, [url]);

  if (!url) return null;

  return (
    <button
      aria-label="Copy server URL"
      className={`inline-flex max-w-full items-center gap-1.5 text-left font-small text-text-400 transition-colors hover:text-text-200 ${className ?? ""}`}
      onClick={onCopy}
      type="button"
    >
      <span className="truncate">{url}</span>
      <Icon className="shrink-0" customSize={14} name={didCopy ? "Check" : "Copy"} />
    </button>
  );
}
