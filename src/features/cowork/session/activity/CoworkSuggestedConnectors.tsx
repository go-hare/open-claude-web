import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Icon } from "../../../../shell/icons";

const dismissedKey = "suggested_connectors_dismissed_v1";
const clickedKey = "suggested_connectors_clicked_v1";
const connectors: CoworkSuggestedConnector[] = [
  { description: "Navigate, click buttons, and fill forms in your browser", icon: "Globe", id: "chrome-extension", name: "Claude in Chrome", path: "/chrome" },
  { description: "Search and update your Notion pages and databases", icon: "Connectors", id: "notion", name: "Notion", path: "/customize/connectors" },
  { description: "Create, update, and track issues in Linear", icon: "Connectors", id: "linear", name: "Linear", path: "/customize/connectors" },
  { description: "Create and edit designs in Canva", icon: "Plugin", id: "canva", name: "Canva", path: "/customize/connectors" },
];

type CoworkSuggestedConnector = {
  description: string;
  icon: "Connectors" | "Globe" | "Plugin";
  id: string;
  name: string;
  path: string;
};

// Official: index-BELzQL5P.js fQt/nQt/sQt and connector storage keys.
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
  useLayoutEffect(() => {
    const root = rootRef.current;
    const emptyState = emptyStateRef.current;
    if (!root || !emptyState || typeof ResizeObserver === "undefined") return;
    const container = findOverflowContainer(root);
    if (!container) return;
    const measure = () => {
      const available = container.getBoundingClientRect().height - emptyState.getBoundingClientRect().height - 12;
      setHeight(available > 0 ? available : undefined);
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [emptyStateRef, rootRef]);
  return height;
}

function findOverflowContainer(root: HTMLElement) {
  let parent = root.parentElement;
  while (parent && !parent.classList.contains("overflow-hidden")) parent = parent.parentElement;
  return parent;
}

function CoworkSuggestedConnectors({ availableHeight, onNavigate }: { availableHeight?: number; onNavigate: (path: string) => void }) {
  const state = useSuggestedConnectorState(availableHeight);
  if (!state.isReady || state.isDismissed || state.layout.shouldHide) return null;
  const visible = state.isCycling ? [connectors[state.cycleIndex]] : connectors.slice(0, state.layout.maxRows);
  const openConnector = (connector: CoworkSuggestedConnector) => {
    state.markClicked(connector.id);
    onNavigate(connector.path);
  };
  return (
    <div className={`-mx-3 mt-auto border-t-0.5 border-border-300 transition-opacity duration-200 ${state.hasAppeared ? "opacity-100" : "opacity-0"}`}>
      {state.isCycling ? <style>{`@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }`}</style> : null}
      <SuggestedConnectorHeader onDismiss={state.dismiss} />
      {state.layout.showDescription ? <p className="px-4 pt-2 pb-2 text-xs text-text-500">Cowork uses connectors to browse websites, manage tasks, and more.</p> : null}
      <div className="mx-4 mt-4 mb-1 rounded-lg border-0.5 border-border-300">
        {visible.map((connector) => (
          <div key={connector.id} style={state.isCycling ? { animation: "fadeIn 300ms ease-in-out" } : undefined}>
            <CoworkSuggestedConnectorRow connector={connector} isClicked={state.clicked.has(connector.id)} onOpen={openConnector} />
          </div>
        ))}
        <button className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-text-500 hover:text-text-300 transition-colors duration-150 hover:bg-bg-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100" onClick={() => onNavigate("/customize/connectors")} type="button">
          <span>See all connectors</span><Icon className="text-text-500" customSize={16} name="ArrowRight" />
        </button>
      </div>
    </div>
  );
}

function useSuggestedConnectorState(availableHeight?: number) {
  const [isReady, setReady] = useState(false);
  const [isDismissed, setDismissed] = useState(false);
  const [clicked, setClicked] = useState<Set<string>>(() => new Set());
  const [hasAppeared, setAppeared] = useState(false);
  const [cycleIndex, setCycleIndex] = useState(0);
  const layout = useMemo(() => connectorLayout(availableHeight, connectors.length), [availableHeight]);
  const isCycling = layout.maxRows === 1 && connectors.length > 1 && availableHeight !== undefined;
  useEffect(() => loadConnectorState(setDismissed, setClicked, setReady), []);
  useEffect(() => {
    if (!isReady || hasAppeared) return;
    const frame = requestAnimationFrame(() => setAppeared(true));
    return () => cancelAnimationFrame(frame);
  }, [hasAppeared, isReady]);
  useEffect(() => {
    if (!isCycling) {
      setCycleIndex(0);
      return;
    }
    const timer = window.setInterval(() => setCycleIndex((value) => (value + 1) % connectors.length), 3000);
    return () => window.clearInterval(timer);
  }, [isCycling]);
  const dismiss = () => { localStorage.setItem(dismissedKey, "true"); setDismissed(true); };
  const markClicked = (id: string) => setClicked((previous) => persistClicked(previous, id));
  return { clicked, cycleIndex, dismiss, hasAppeared, isCycling, isDismissed, isReady, layout, markClicked };
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

function CoworkSuggestedConnectorRow({ connector, isClicked, onOpen }: { connector: CoworkSuggestedConnector; isClicked: boolean; onOpen: (connector: CoworkSuggestedConnector) => void }) {
  return (
    <button className="w-full flex items-center justify-between gap-3 px-3 py-3 border-b-0.5 border-border-300 first:rounded-t-lg transition-colors duration-150 hover:bg-bg-200 active:bg-bg-300 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100" onClick={() => onOpen(connector)} title={connector.description} type="button">
      <span className="flex items-center gap-3"><ConnectorIcon clicked={isClicked} icon={connector.icon} /><span className="text-xs text-text-200">{connector.name}</span></span>
      <Icon className="text-text-300 flex-shrink-0" customSize={20} name="Add" />
    </button>
  );
}

function ConnectorIcon({ clicked, icon }: { clicked: boolean; icon: CoworkSuggestedConnector["icon"] }) {
  return clicked
    ? <span className="w-7 h-7 rounded-full bg-bg-200 flex items-center justify-center"><Icon className="text-text-300" customSize={14} name="Check" /></span>
    : <span className="w-7 h-7 rounded-lg bg-bg-100 border-0.5 border-border-300 flex items-center justify-center overflow-hidden"><Icon className="text-text-300" customSize={18} name={icon} /></span>;
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
