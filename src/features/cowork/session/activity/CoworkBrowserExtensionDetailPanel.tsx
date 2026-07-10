import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge, type ConnectedBrowser } from "../../../../adapters/desktopBridge";
import { Icon } from "../../../../shell/icons";
import { useCoworkBrowserSwitching } from "./CoworkBrowserPickerButton";
import { isCoworkChromeMcpServer, type CoworkResourceActivity } from "./coworkResourceActivity";

type BrowserExtensionToolCall = {
  displayName?: string;
  id: string;
  input?: Record<string, unknown>;
  timestamp?: number;
  toolName?: string;
};

export function CoworkBrowserExtensionDetailPanel({ highlightId, onClose, resources }: { highlightId?: string; onClose: () => void; resources: CoworkResourceActivity[] }) {
  const isSwitching = useCoworkBrowserSwitching();
  const toolCalls = useMemo(() => browserExtensionToolCalls(resources), [resources]);
  return (
    <div className="flex h-full flex-col pb-1 pl-5 pt-3" data-official-source="index-BELzQL5P.js:RRt BrowserExtensionActivityDetailWrapper">
      <div className="sticky flex items-center gap-2 pr-5">
        <div className="flex-shrink-0 w-6 h-6 flex items-center justify-center bg-bg-000 rounded-md border border-border-300 text-text-400">
          <Icon name="Globe" customSize={16} />
        </div>
        <h2 className="font-ui truncate text-lg font-medium leading-tight">Claude in Chrome</h2>
        {isSwitching ? <span className="text-sm text-text-400 truncate leading-tight flex-shrink min-w-0">Open Chrome and click Connect</span> : null}
        <div className="flex-1" />
        <button aria-label="Close panel" className="-mr-2 inline-flex size-8 items-center justify-center rounded text-text-400 hover:bg-bg-200 hover:text-text-200" onClick={onClose} type="button">
          <Icon name="Add" className="rotate-45" customSize={20} />
        </button>
      </div>
      <div className="mb-1 flex flex-col pb-3 pr-5 min-h-0 flex-1">
        <CoworkConnectedBrowsersSummary interactive />
        <div className="text-xs text-text-400 uppercase tracking-wide py-2">{toolCalls.length === 1 ? "1 tool call" : `${toolCalls.length} tool calls`}</div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          {toolCalls.length > 0 ? <CoworkBrowserExtensionToolList highlightId={highlightId} toolCalls={toolCalls} /> : <div className="text-sm text-text-400 py-4 text-center">No browser extension activity yet</div>}
        </div>
      </div>
    </div>
  );
}

function CoworkConnectedBrowsersSummary({ interactive }: { interactive?: boolean }) {
  const [browsers, setBrowsers] = useState<ConnectedBrowser[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(desktopBridge.BrowserUse.listConnectedBrowsers));
  const [selectedBrowserId, setSelectedBrowserId] = useState<string | null>(null);
  const isSupported = Boolean(desktopBridge.BrowserUse.listConnectedBrowsers);
  const refresh = useCallback(async () => {
    if (!desktopBridge.BrowserUse.listConnectedBrowsers) return;
    setIsLoading(true);
    try {
      const [nextBrowsers, nextSelectedBrowserId] = await Promise.all([
        desktopBridge.BrowserUse.listConnectedBrowsers(),
        desktopBridge.BrowserUse.getSelectedBrowserId?.() ?? Promise.resolve(null),
      ]);
      setBrowsers(nextBrowsers);
      setSelectedBrowserId(nextSelectedBrowserId);
    } finally {
      setIsLoading(false);
    }
  }, []);
  useEffect(() => { if (isSupported) void refresh(); }, [isSupported, refresh]);
  if (!isSupported) return null;
  const countLabel = isLoading && browsers.length === 0 ? "Checking connected browsers…" : browserCountLabel(browsers.length);
  return (
    <div className="flex flex-col gap-2" data-official-source="index-BELzQL5P.js:ERt ConnectedBrowsersSummary">
      <div className="text-sm text-text-200">Connected browsers</div>
      <div className="text-sm text-text-400">Chrome instances signed in to your account that Claude can automate.</div>
      <div className="rounded-lg border border-border-300 bg-bg-100">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border-300">
          <div className="text-sm text-text-200">{countLabel}</div>
          <button aria-label="Recheck connection" className="inline-flex h-7 items-center gap-1.5 rounded px-2 text-xs text-text-300 hover:bg-bg-200" disabled={isLoading} onClick={() => void refresh()} type="button">
            <Icon name={isLoading ? "Spinner" : "Reload"} customSize={14} />
            <span>Recheck</span>
          </button>
        </div>
        {interactive && desktopBridge.BrowserUse.switchBrowser ? <div className="mx-3 my-2 rounded-md bg-bg-200 px-3 py-2 text-sm text-text-400">{browserSwitchHint}</div> : null}
        {browsers.length === 0 ? <div className="px-3 py-3 text-sm text-text-400">No Chrome instances are connected. Open Chrome with the Claude extension and sign in.</div> : (
          <ol className="divide-y divide-border-300">
            {browsers.map((browser, index) => <CoworkConnectedBrowserRow browser={browser} index={index} isSelected={browser.deviceId === selectedBrowserId} key={browser.deviceId} />)}
          </ol>
        )}
      </div>
    </div>
  );
}

function CoworkConnectedBrowserRow({ browser, index, isSelected }: { browser: ConnectedBrowser; index: number; isSelected: boolean }) {
  return (
    <li className={`flex items-center gap-3 px-3 py-2 ${isSelected ? "bg-bg-200" : ""}`}>
      <div className="w-5 flex-shrink-0 text-center text-xs tabular-nums text-text-400">{index + 1}</div>
      <div className="w-4 flex-shrink-0 text-text-300">{isSelected ? <Icon name="Check" customSize={14} /> : null}</div>
      <div className="flex-1 min-w-0">
        <div className="text-sm text-text-200 truncate">{browser.name || `Browser ${index + 1}`}</div>
        <div className="text-xs text-text-400">{browser.osPlatform}</div>
      </div>
      <div className="text-xs text-text-400 font-mono flex-shrink-0">Device ID: {browser.deviceId.slice(0, 8)}</div>
    </li>
  );
}

function CoworkBrowserExtensionToolList({ highlightId, toolCalls }: { highlightId?: string; toolCalls: BrowserExtensionToolCall[] }) {
  return <div className="flex flex-col gap-4">{toolCalls.map((toolCall) => <CoworkBrowserExtensionToolRow isHighlighted={toolCall.id === highlightId} key={toolCall.id} toolCall={toolCall} />)}</div>;
}

function CoworkBrowserExtensionToolRow({ isHighlighted, toolCall }: { isHighlighted: boolean; toolCall: BrowserExtensionToolCall }) {
  const display = browserToolDisplay(toolCall);
  return (
    <div className={`rounded-lg border border-border-300 overflow-hidden transition-colors ${isHighlighted ? "ring-2 ring-brand-100 ring-offset-1" : ""}`} data-browser-extension-tool-call={toolCall.toolName}>
      <details open={false}>
        <summary className="flex cursor-pointer select-none items-center gap-3 px-3 py-2 text-sm text-text-200">
          <Icon name={display.icon} customSize={16} className="text-text-500" />
          <span className="min-w-0 flex-1 truncate">{display.text}</span>
          {toolCall.timestamp ? <span className="text-xs text-text-500">{relativeTimestamp(toolCall.timestamp)}</span> : null}
        </summary>
        <pre className="mx-3 mb-3 max-h-[180px] overflow-auto rounded-md bg-bg-100 p-2 text-xs text-text-300">{JSON.stringify(toolCall.input ?? {}, null, 2)}</pre>
      </details>
      {display.hint ? <div className="mx-3 mb-3 rounded-md bg-bg-100 px-3 py-2 text-sm text-text-400">{display.hint}</div> : null}
    </div>
  );
}

function browserExtensionToolCalls(resources: CoworkResourceActivity[]): BrowserExtensionToolCall[] {
  return resources
    .filter((resource) => resource.operation === "mcp_tool" && isCoworkChromeMcpServer({ uuid: resource.mcpServerUuid, name: resource.mcpServer?.name }))
    .map((resource) => ({
      displayName: resource.mcpToolDisplayName,
      id: resource.latestId,
      input: resource.mcpToolInput,
      timestamp: resource.timestamp,
      toolName: resource.mcpToolName,
    }))
    .sort((left, right) => (right.timestamp ?? 0) - (left.timestamp ?? 0));
}

function browserToolDisplay(toolCall: BrowserExtensionToolCall): { icon: "Globe" | "Shuffle" | "Computer"; hint?: string; text: string } {
  switch (toolCall.toolName) {
    case "switch_browser":
      return { text: "Waiting for you to choose a browser", icon: "Shuffle", hint: browserSwitchHint };
    case "select_browser":
      return { text: "Connecting to browser", icon: "Shuffle" };
    case "list_connected_browsers":
      return { text: "Checking connected browsers", icon: "Shuffle" };
    default:
      return { text: titleizeToolName(toolCall.displayName || toolCall.toolName || "Browser tool"), icon: "Computer" };
  }
}

function browserCountLabel(count: number) {
  if (count === 0) return "No browsers connected";
  if (count === 1) return "1 browser connected";
  return `${count} browsers connected`;
}

function relativeTimestamp(timestamp: number) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours} hour${hours === 1 ? "" : "s"} ago`;
}

function titleizeToolName(value: string) {
  return value.replace(/_/g, " ").replace(/^\w/, (first) => first.toUpperCase());
}

const browserSwitchHint = "Switch to the Chrome window you want Claude to use. You'll see a “Claude Desktop wants to connect” prompt in the side panel, give the browser a name and click Connect.";
