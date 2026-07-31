import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ConfirmDialog } from "../../../../shell/ConfirmDialog";
import { Icon } from "../../../../shell/icons";

/**
 * Official residual: index-BELzQL5P.js
 * - QZt chrome install hook (dT = globalThis["claude.web"]?.ChromeExtension)
 * - sQt ConnectorRow (clicked/connected → pointer-events-none, no re-add)
 * - aQt SuggestedConnectors + nQt content
 * - See all → DK = "/customize/connectors"
 * - sG residual official chrome landing: https://claude.com/chrome?open_in_browser=1
 *
 * Official aQt gates (do not invent):
 *   l = ud("suggested_connectors") — missing/false → hide directory suggestions
 *   se = aae().servers.length > 0 — empty directory → no Notion/Linear/Canva rows
 *   N/E/I only pushed when found in directory; Canva only when list.length < 2
 *   wae connect uses directory uuid/url OAuth — product has no cloud directory BFF
 *
 * Product 3p: default flag off + empty catalog → only Claude in Chrome (local residual).
 * Force for residual testing: localStorage/query `gb_gate_suggested_connectors=true`
 * (still needs directory servers — do not invent Notion/Linear/Canva without catalog).
 */

const dismissedKey = "suggested_connectors_dismissed_v1";
const clickedKey = "suggested_connectors_clicked_v1";
/** Official index-BELzQL5P sG residual. */
const CHROME_STORE_URL = "https://claude.com/chrome?open_in_browser=1";
const CONNECTORS_PATH = "/customize/connectors";
const CONNECTORS_DIRECTORY_PATH = "/customize/connectors?directory=true";

/** Official ud("suggested_connectors") residual — hide-on-missing. */
function readSuggestedConnectorsFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    const query =
      params.get("gb_gate_suggested_connectors") ?? params.get("suggested_connectors");
    if (query === "1" || query === "true") return true;
    if (query === "0" || query === "false") return false;
    const stored =
      window.localStorage.getItem("gb_gate_suggested_connectors")
      ?? window.localStorage.getItem("suggested_connectors");
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}

/**
 * Official aae() directory catalog residual.
 * Product 3p has no Anthropic `/api/directory/servers` / mcp-registry BFF — return [].
 * When a real catalog bridge exists, map servers here (name/uuid/url/iconUrl/isConnected).
 */
type DirectoryCatalogServer = {
  iconUrl?: string;
  isConnected?: boolean;
  name: string;
  url?: string;
  uuid: string;
};

function listMcpDirectoryCatalogServers(): DirectoryCatalogServer[] {
  // No invent: empty until product wires cloud/local directory BFF (official aae).
  return [];
}

type ChromeInstallStatus = "succeeded" | "skipped" | "error" | string;

type ChromeExtensionBridge = {
  installExtension?: () => Promise<{ status?: ChromeInstallStatus; error?: string } | null | undefined>;
  isInstalled?: () => Promise<boolean>;
  restartChrome?: () => Promise<boolean | void>;
};

type SuggestedConnector = {
  description: string;
  icon: "chromeExt" | "Connectors" | "Globe" | "Plugin";
  id: string;
  isConnected?: boolean;
  name: string;
  onClick: () => void;
  useClickedState?: boolean;
};

function chromeExtensionBridge(): ChromeExtensionBridge | undefined {
  const web = (window as Window & { "claude.web"?: { ChromeExtension?: ChromeExtensionBridge } })["claude.web"];
  return web?.ChromeExtension;
}

function isDarwinDesktop(): boolean {
  return /Mac|Macintosh/i.test(navigator.platform || navigator.userAgent);
}

/** Official QZt: darwin + ChromeExtension bridge → install modal; else open store URL. */
function useChromeExtensionInstall(options?: {
  onInstallSuccess?: () => void;
  onRestartDone?: () => void;
}) {
  const onInstallSuccess = options?.onInstallSuccess;
  const onRestartDone = options?.onRestartDone;
  const [installOpen, setInstallOpen] = useState(false);
  const [restartOpen, setRestartOpen] = useState(false);

  const runInstall = useCallback(async () => {
    const bridge = chromeExtensionBridge();
    try {
      const result = await bridge?.installExtension?.();
      const status = result?.status;
      if (status === "succeeded" || status === "skipped") {
        setInstallOpen(false);
        // Re-probe: product "succeeded" may only open the GitHub listing.
        onInstallSuccess?.();
        // Official QZt restart prompt when install skipped/succeeded for store path.
        // Product sideload still shows it so user can relaunch Chrome after loading unpacked.
        setRestartOpen(true);
        return;
      }
      setInstallOpen(false);
      window.open(CHROME_STORE_URL, "_blank", "noopener,noreferrer");
    } catch {
      setInstallOpen(false);
      window.open(CHROME_STORE_URL, "_blank", "noopener,noreferrer");
    }
  }, [onInstallSuccess]);

  const runRestart = useCallback(async () => {
    try {
      await chromeExtensionBridge()?.restartChrome?.();
    } finally {
      setRestartOpen(false);
      onRestartDone?.();
    }
  }, [onRestartDone]);

  const triggerInstall = useCallback(() => {
    const bridge = chromeExtensionBridge();
    if (bridge && isDarwinDesktop()) {
      // Exclusive: never stack install + restart modals (QZt uses two separate flags).
      setRestartOpen(false);
      setInstallOpen(true);
      return;
    }
    window.open(CHROME_STORE_URL, "_blank", "noopener,noreferrer");
  }, []);

  const installModals = (
    <>
      <ConfirmDialog
        cancelText="Later"
        confirmText="Install and restart Chrome"
        isOpen={installOpen}
        message="Claude in Chrome lets you navigate, click buttons, and fill forms in your browser."
        onClose={() => setInstallOpen(false)}
        onConfirm={() => {
          void runInstall();
        }}
        title="Install Claude in Chrome"
      >
        <p className="mt-2 text-text-300">
          <a className="underline hover:text-text-100" href={CHROME_STORE_URL} rel="noopener noreferrer" target="_blank">
            Learn more about Claude in Chrome
          </a>
        </p>
      </ConfirmDialog>
      <ConfirmDialog
        cancelText="Later"
        confirmText="Restart now"
        isOpen={restartOpen}
        message="Chrome needs to restart for the extension to take effect. Any open Chrome tabs will be restored after restarting."
        onClose={() => {
          setRestartOpen(false);
          onRestartDone?.();
        }}
        onConfirm={() => {
          void runRestart();
        }}
        title="Chrome extension installed"
      />
    </>
  );

  return { installModals, triggerInstall };
}

export function CoworkContextEmptyStateWithConnectors({ onNavigate }: { onNavigate: (path: string) => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const emptyStateRef = useRef<HTMLDivElement | null>(null);
  const availableHeight = useAvailableConnectorHeight(rootRef, emptyStateRef);
  return (
    <div className="flex flex-col flex-1 min-h-0" ref={rootRef}>
      <div ref={emptyStateRef}><CoworkEmptyContextState /></div>
      <CoworkSuggestedConnectors availableHeight={availableHeight} onNavigate={onNavigate} />
    </div>
  );
}

function useAvailableConnectorHeight(rootRef: React.RefObject<HTMLDivElement | null>, emptyStateRef: React.RefObject<HTMLDivElement | null>) {
  const [height, setHeight] = useState<number | undefined>();
  const lastHeightRef = useRef<number | undefined>(undefined);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const emptyState = emptyStateRef.current;
    if (!root || !emptyState || typeof ResizeObserver === "undefined") return;
    // Official fQt walks first overflow-hidden parent. Nested activity sections also use
    // overflow-hidden and are content-sized, so that ancestor tracks our own height and
    // collapses into maxRows=1 cycling (visible flash every 3s). Prefer the fixed panel
    // viewport / scrollport residual instead.
    const container = findConnectorMeasureContainer(root);
    if (!container) return;
    const measure = () => {
      const available = measureAvailableConnectorHeight(container, emptyState);
      // Hysteresis: ignore sub-pixel / layout thrash that re-enters compact/cycle mode.
      const previous = lastHeightRef.current;
      if (previous !== undefined && available !== undefined && Math.abs(previous - available) < 8) return;
      if (previous === available) return;
      lastHeightRef.current = available;
      setHeight(available);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    if (container !== emptyState) observer.observe(emptyState);
    return () => observer.disconnect();
  }, [emptyStateRef, rootRef]);
  return height;
}

/**
 * Prefer the session activity panel shell (fixed h-full overflow-hidden) or its
 * overflow-y-auto scrollport. Fall back to official first overflow-hidden ancestor.
 */
function findConnectorMeasureContainer(root: HTMLElement) {
  const panel = root.closest("[data-cowork-session-activity-panel]");
  if (panel instanceof HTMLElement) {
    const scrollport = panel.querySelector(".overflow-y-auto");
    if (scrollport instanceof HTMLElement) return scrollport;
    return panel;
  }
  let parent = root.parentElement;
  while (parent) {
    const style = parent.classList;
    if (style.contains("overflow-y-auto") || style.contains("overflow-hidden")) return parent;
    parent = parent.parentElement;
  }
  return null;
}

function measureAvailableConnectorHeight(container: HTMLElement, emptyState: HTMLElement) {
  const containerRect = container.getBoundingClientRect();
  const emptyRect = emptyState.getBoundingClientRect();
  // Remaining viewport below the empty-state illustration (not self content height).
  const available = containerRect.bottom - emptyRect.bottom - 12;
  return available > 0 ? available : undefined;
}

function CoworkSuggestedConnectors({ availableHeight, onNavigate }: { availableHeight?: number; onNavigate: (path: string) => void }) {
  const state = useSuggestedConnectorState();
  const [chromeInstalled, setChromeInstalled] = useState(false);

  const refreshChromeInstalled = useCallback(async () => {
    try {
      const installed = Boolean(await chromeExtensionBridge()?.isInstalled?.());
      setChromeInstalled(installed);
    } catch {
      /* keep previous */
    }
  }, []);

  useEffect(() => {
    void refreshChromeInstalled();
    const onVisible = () => {
      if (document.visibilityState === "visible") void refreshChromeInstalled();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [refreshChromeInstalled]);

  const { installModals, triggerInstall } = useChromeExtensionInstall({
    onInstallSuccess: () => {
      void refreshChromeInstalled();
    },
    onRestartDone: () => {
      void refreshChromeInstalled();
    },
  });

  // Official aQt: l = ud("suggested_connectors"); se = aae().servers.length > 0.
  const suggestedConnectorsEnabled = useMemo(() => readSuggestedConnectorsFlag(), []);
  const directoryServers = useMemo(() => listMcpDirectoryCatalogServers(), []);
  const directoryAvailable = directoryServers.length > 0;

  const connectors = useMemo<SuggestedConnector[]>(() => {
    const list: SuggestedConnector[] = [];
    // Official aQt: chrome when lG() && !isConnected; product hides when extension installed.
    if (!chromeInstalled) {
      list.push({
        id: "chrome-extension",
        name: "Claude in Chrome",
        description: "Navigate, click buttons, and fill forms in your browser",
        icon: "chromeExt",
        isConnected: false,
        // Official does not set useClickedState on suggested rows — re-click reopens QZt.
        onClick: triggerInstall,
      });
    }

    // Official: only when suggested_connectors flag + directory catalog non-empty.
    // Never invent Notion/Linear/Canva without aae() server entries (no fake OAuth).
    if (suggestedConnectorsEnabled && directoryAvailable) {
      const notion = directoryServers.find((s) => s.name === "Notion");
      const linear = directoryServers.find((s) => s.name === "Linear");
      const canva = directoryServers.find((s) => s.name === "Canva");
      if (notion && !notion.isConnected) {
        list.push({
          id: "notion",
          name: "Notion",
          description: "Search and update your Notion pages and databases",
          icon: "Connectors",
          isConnected: Boolean(notion.isConnected),
          // No wae cloud enable — open local connectors until directory connect is wired.
          onClick: () => onNavigate(CONNECTORS_DIRECTORY_PATH),
        });
      }
      if (linear && !linear.isConnected) {
        list.push({
          id: "linear",
          name: "Linear",
          description: "Create, update, and track issues in Linear",
          icon: "Connectors",
          isConnected: Boolean(linear.isConnected),
          onClick: () => onNavigate(CONNECTORS_DIRECTORY_PATH),
        });
      }
      // Official: Canva only when fewer than 2 other suggested rows already.
      if (list.length < 2 && canva && !canva.isConnected) {
        list.push({
          id: "canva",
          name: "Canva",
          description: "Create and edit designs in Canva",
          icon: "Plugin",
          isConnected: Boolean(canva.isConnected),
          onClick: () => onNavigate(CONNECTORS_DIRECTORY_PATH),
        });
      }
    }
    return list;
  }, [
    chromeInstalled,
    directoryAvailable,
    directoryServers,
    onNavigate,
    suggestedConnectorsEnabled,
    triggerInstall,
  ]);

  const layout = useMemo(() => connectorLayout(availableHeight, connectors.length), [availableHeight, connectors.length]);
  const isCycling = layout.maxRows === 1 && connectors.length > 1 && availableHeight !== undefined;
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    if (!isCycling) {
      setCycleIndex(0);
      return;
    }
    const timer = window.setInterval(() => setCycleIndex((value) => (value + 1) % connectors.length), 3000);
    return () => window.clearInterval(timer);
  }, [connectors.length, isCycling]);

  // Official: auto-dismiss when every visible connector is connected/clicked.
  useEffect(() => {
    if (!state.isReady || state.isDismissed || connectors.length === 0) return;
    const allDone = connectors.every((connector) => connector.isConnected || (connector.useClickedState && state.clicked.has(connector.id)));
    if (allDone) state.dismiss();
  }, [connectors, state.clicked, state.dismiss, state.isDismissed, state.isReady]);

  if (!state.isReady || state.isDismissed || layout.shouldHide || connectors.length === 0) return null;

  const visible = isCycling ? [connectors[cycleIndex]] : connectors.slice(0, layout.maxRows);

  return (
    <>
      <div className={`-mx-3 mt-auto border-t-0.5 border-border-300 transition-opacity duration-200 ${state.hasAppeared ? "opacity-100" : "opacity-0"}`}>
        {isCycling ? <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style> : null}
        <SuggestedConnectorHeader onDismiss={state.dismiss} />
        {layout.showDescription ? <p className="px-4 pt-2 pb-2 text-xs text-text-500">Cowork uses connectors to browse websites, manage tasks, and more.</p> : null}
        <div className="mx-4 mt-4 mb-1 rounded-lg border-0.5 border-border-300">
          {visible.map((connector) => (
            <div key={connector.id} style={isCycling ? { animation: "fadeIn 300ms ease-in-out" } : undefined}>
              <CoworkSuggestedConnectorRow
                connector={connector}
                isClicked={state.clicked.has(connector.id)}
                onAdd={state.markClicked}
              />
            </div>
          ))}
          <button
            className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-text-500 hover:text-text-300 transition-colors duration-150 hover:bg-bg-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
            onClick={() => onNavigate(CONNECTORS_PATH)}
            type="button"
          >
            <span>See all connectors</span>
            <Icon className="text-text-500" customSize={16} name="ArrowRight" />
          </button>
        </div>
      </div>
      {installModals}
    </>
  );
}

function useSuggestedConnectorState() {
  const [isReady, setReady] = useState(false);
  const [isDismissed, setDismissed] = useState(false);
  const [clicked, setClicked] = useState<Set<string>>(() => new Set());
  const [hasAppeared, setAppeared] = useState(false);

  useEffect(() => loadConnectorState(setDismissed, setClicked, setReady), []);
  useEffect(() => {
    if (!isReady || hasAppeared) return;
    const frame = requestAnimationFrame(() => setAppeared(true));
    return () => cancelAnimationFrame(frame);
  }, [hasAppeared, isReady]);

  const dismiss = useCallback(() => {
    localStorage.setItem(dismissedKey, "true");
    setDismissed(true);
  }, []);
  const markClicked = useCallback((id: string) => {
    setClicked((previous) => persistClicked(previous, id));
  }, []);

  return { clicked, dismiss, hasAppeared, isDismissed, isReady, markClicked };
}

function loadConnectorState(setDismissed: (value: boolean) => void, setClicked: (value: Set<string>) => void, setReady: (value: boolean) => void) {
  setDismissed(localStorage.getItem(dismissedKey) === "true");
  try {
    const parsed = JSON.parse(localStorage.getItem(clickedKey) ?? "[]");
    setClicked(new Set(Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : []));
  } catch {
    setClicked(new Set());
  }
  setReady(true);
}

function persistClicked(previous: Set<string>, id: string) {
  const next = new Set(previous).add(id);
  localStorage.setItem(clickedKey, JSON.stringify([...next]));
  return next;
}

function SuggestedConnectorHeader({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="flex items-center justify-between px-4 pt-4 pb-0">
      <span className="font-medium text-sm text-text-100">Suggested connectors</span>
      <button aria-label="Dismiss suggested connectors" className="p-1 rounded-md transition-colors duration-150 text-text-300 hover:text-text-100 hover:bg-bg-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100" onClick={onDismiss} type="button">
        <Icon customSize={14} name="X" />
      </button>
    </div>
  );
}

/** Official sQt ConnectorRow. */
function CoworkSuggestedConnectorRow({
  connector,
  isClicked,
  onAdd,
}: {
  connector: SuggestedConnector;
  isClicked: boolean;
  onAdd: (id: string) => void;
}) {
  const clickedVisual = Boolean(connector.useClickedState && isClicked);
  const locked = Boolean(connector.isConnected || clickedVisual);
  const onClick = () => {
    if (connector.isConnected || clickedVisual) return;
    if (connector.useClickedState) onAdd(connector.id);
    connector.onClick();
  };
  const rowClassName = [
    "w-full flex items-center justify-between gap-3 px-3 py-3",
    "border-b-0.5 border-border-300 first:rounded-t-lg",
    "transition-colors duration-150",
    locked
      ? "cursor-default pointer-events-none"
      : "hover:bg-bg-200 active:bg-bg-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100",
  ].join(" ");

  return (
    <button className={rowClassName} disabled={locked} onClick={onClick} title={connector.description} type="button">
      <span className="flex items-center gap-3">
        {clickedVisual || connector.isConnected ? <ClickedCheckIcon /> : <ConnectorIconBox connector={connector} />}
        <span className={`text-xs ${locked ? "text-text-500" : "text-text-200"}`}>{connector.name}</span>
      </span>
      {!clickedVisual && !connector.isConnected ? <Icon className="text-text-300 flex-shrink-0" customSize={20} name="Add" /> : null}
    </button>
  );
}

function ClickedCheckIcon() {
  return (
    <span className="w-7 h-7 rounded-full bg-bg-200 flex items-center justify-center">
      <Icon className="text-text-300" customSize={14} name="Check" />
    </span>
  );
}

function ConnectorIconBox({ connector }: { connector: SuggestedConnector }) {
  const [chromeImageFailed, setChromeImageFailed] = useState(false);
  if (connector.icon === "chromeExt" && !chromeImageFailed) {
    return (
      <span className="w-7 h-7 rounded-lg bg-bg-100 border-0.5 border-border-300 flex items-center justify-center overflow-hidden">
        {/* Official sQt: /images/crochet/browser.png */}
        <img
          alt="Claude in Chrome"
          className="object-contain"
          height={22}
          onError={() => setChromeImageFailed(true)}
          src="/images/crochet/browser.png"
          width={22}
        />
      </span>
    );
  }
  return (
    <span className="w-7 h-7 rounded-lg bg-bg-100 border-0.5 border-border-300 flex items-center justify-center overflow-hidden">
      <Icon
        className="text-text-300"
        customSize={18}
        name={connector.icon === "Plugin" ? "Plugin" : connector.icon === "Connectors" ? "Connectors" : "Globe"}
      />
    </span>
  );
}

function CoworkEmptyContextState() {
  return (
    <div className="flex flex-col gap-3">
      <img alt="" className="dark:hidden" draggable={false} height={56} src="/images/illustrations/session-context.svg" width={114} />
      <img alt="" className="hidden dark:block" draggable={false} height={56} src="/images/illustrations/session-context-dark.svg" width={114} />
      <p className="text-text-500 font-small">Track tools and referenced files used in this task.</p>
    </div>
  );
}

function connectorLayout(availableHeight: number | undefined, count: number) {
  if (availableHeight === undefined) return { maxRows: count, shouldHide: false, showDescription: true };
  const detailedRows = Math.floor((availableHeight - 172) / 44);
  if (detailedRows >= 1) return { maxRows: Math.min(detailedRows, count), shouldHide: false, showDescription: true };
  const compactRows = Math.floor((availableHeight - 136) / 44);
  if (compactRows >= 1) return { maxRows: Math.min(compactRows, count), shouldHide: false, showDescription: false };
  return { maxRows: 0, shouldHide: true, showDescription: false };
}
