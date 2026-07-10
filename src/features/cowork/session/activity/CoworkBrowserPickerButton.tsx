import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore, useState, type MouseEvent as ReactMouseEvent } from "react";
import { desktopBridge, type ConnectedBrowser } from "../../../../adapters/desktopBridge";
import { Icon } from "../../../../shell/icons";

type TooltipSide = "bottom" | "top";

type BrowserSwitchListener = () => void;

let browserSwitching = false;
const browserSwitchListeners = new Set<BrowserSwitchListener>();

const browserPickerRootClass = "relative inline-flex";
const browserPickerTriggerClass = "inline-flex !size-5 flex-shrink-0 items-center justify-center rounded-small text-text-400 transition-colors hover:bg-bg-200 hover:text-text-200 disabled:opacity-50";
const browserPickerPopupClass = "!p-1 min-w-[240px] rounded-lg border border-border-300 bg-bg-000 shadow-xl";
const browserPickerRowClass = "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left transition-colors";

export function useCoworkBrowserSwitching() {
  return useSyncExternalStore(subscribeBrowserSwitching, () => browserSwitching, () => false);
}

function subscribeBrowserSwitching(listener: BrowserSwitchListener) {
  browserSwitchListeners.add(listener);
  return () => browserSwitchListeners.delete(listener);
}

function setBrowserSwitching(value: boolean) {
  if (browserSwitching === value) return;
  browserSwitching = value;
  browserSwitchListeners.forEach((listener) => listener());
}

export function CoworkBrowserPickerButton({ tooltipSide = "top" }: { tooltipSide?: TooltipSide }) {
  const rootRef = useRef<HTMLSpanElement | null>(null);
  const [browsers, setBrowsers] = useState<ConnectedBrowser[]>([]);
  const [isLoading, setIsLoading] = useState(Boolean(desktopBridge.BrowserUse?.listConnectedBrowsers));
  const [isOpen, setIsOpen] = useState(false);
  const [selectedBrowserId, setSelectedBrowserId] = useState<string | null>(null);
  const isSwitching = useCoworkBrowserSwitching();
  const isSupported = Boolean(desktopBridge.BrowserUse?.listConnectedBrowsers);
  const canBroadcast = Boolean(desktopBridge.BrowserUse?.switchBrowser);
  const popupPositionClass = tooltipSide === "bottom" ? "absolute right-0 top-full z-50 mt-1" : "absolute bottom-full right-0 z-50 mb-1";

  const refresh = useCallback(async () => {
    if (!desktopBridge.BrowserUse?.listConnectedBrowsers) return;
    setIsLoading(true);
    try {
      const [nextBrowsers, nextSelectedBrowserId] = await Promise.all([
        desktopBridge.BrowserUse.listConnectedBrowsers(),
        desktopBridge.BrowserUse.getSelectedBrowserId?.() ?? Promise.resolve(null),
      ]);
      setBrowsers(nextBrowsers);
      setSelectedBrowserId(nextSelectedBrowserId);
    } catch {
      setBrowsers([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && isSupported) void refresh();
  }, [isOpen, isSupported, refresh]);

  useEffect(() => {
    if (!isOpen) return;
    const closeFromOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setIsOpen(false);
    };
    const closeFromEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", closeFromOutside);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      document.removeEventListener("mousedown", closeFromOutside);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [isOpen]);

  const openPicker = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen((value) => !value);
  };

  const selectBrowser = async (browser: ConnectedBrowser, event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    await desktopBridge.BrowserUse?.selectBrowser?.(browser.deviceId);
    setSelectedBrowserId(browser.deviceId);
    setIsOpen(false);
  };

  const broadcastSwitchRequest = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen(false);
    setBrowserSwitching(true);
    try {
      await desktopBridge.BrowserUse?.switchBrowser?.();
    } finally {
      setBrowserSwitching(false);
    }
  };

  return (
    <span ref={rootRef} className={browserPickerRootClass} data-official-source="index-BELzQL5P.js:PZt BrowserPickerButton">
      <button
        aria-busy={isSwitching || undefined}
        aria-expanded={isOpen}
        aria-label="Switch browser"
        className={browserPickerTriggerClass}
        data-tooltip-side={tooltipSide}
        disabled={isSwitching}
        onClick={openPicker}
        title="Switch browser"
        type="button"
      >
        <Icon name={isSwitching ? "Spinner" : "Shuffle"} customSize={14} />
      </button>
      {isOpen ? (
        <div className={`${popupPositionClass} ${browserPickerPopupClass}`} onClick={(event) => event.stopPropagation()} role="menu">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs text-text-400 uppercase tracking-wide">Connected browsers</span>
            <button
              aria-label="Refresh browser list"
              className="inline-flex !size-5 items-center justify-center rounded-small text-text-400 hover:bg-bg-200 hover:text-text-200 disabled:opacity-50"
              disabled={!isSupported || isLoading}
              onClick={(event) => {
                event.stopPropagation();
                void refresh();
              }}
              type="button"
            >
              <Icon name={isLoading ? "Spinner" : "Reload"} customSize={14} />
            </button>
          </div>
          <CoworkBrowserPickerList browsers={browsers} isLoading={isLoading} isSupported={isSupported} onSelect={selectBrowser} selectedBrowserId={selectedBrowserId} />
          {canBroadcast ? (
            <>
              <div className="h-px bg-border-300 my-1" />
              <button className={`${browserPickerRowClass} hover:bg-bg-200`} onClick={broadcastSwitchRequest} type="button">
                <div className="w-4 flex-shrink-0" />
                <span className="text-sm text-text-300">Broadcast connection request…</span>
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </span>
  );
}

function CoworkBrowserPickerList({
  browsers,
  isLoading,
  isSupported,
  onSelect,
  selectedBrowserId,
}: {
  browsers: ConnectedBrowser[];
  isLoading: boolean;
  isSupported: boolean;
  onSelect: (browser: ConnectedBrowser, event: ReactMouseEvent<HTMLButtonElement>) => void;
  selectedBrowserId: string | null;
}) {
  const rows = useMemo(() => browsers, [browsers]);
  if (!isSupported) return <div className="px-2 py-2 text-xs text-text-400">Browser listing requires a newer version of the desktop app.</div>;
  if (rows.length === 0 && !isLoading) return <div className="px-2 py-2 text-xs text-text-400">No browsers connected</div>;
  return (
    <>
      {rows.map((browser, index) => {
        const label = browser.name || `Browser ${index + 1}`;
        const isSelected = browser.deviceId === selectedBrowserId;
        return (
          <button
            aria-current={isSelected || undefined}
            className={`${browserPickerRowClass} ${isSelected ? "bg-bg-300 hover:bg-bg-300" : "hover:bg-bg-200"}`}
            key={browser.deviceId}
            onClick={(event) => void onSelect(browser, event)}
            type="button"
          >
            <div className="w-4 flex-shrink-0 text-text-300">{isSelected ? <Icon name="Check" customSize={14} /> : null}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-text-200 truncate">{label}</div>
              <div className="text-xs text-text-400 truncate">{browser.osPlatform}</div>
            </div>
            <div className="text-xs text-text-400 font-mono flex-shrink-0">{browser.deviceId.slice(0, 8)}</div>
          </button>
        );
      })}
      {isLoading && rows.length === 0 ? <div className="px-2 py-2 text-xs text-text-400">Checking connected browsers…</div> : null}
    </>
  );
}
