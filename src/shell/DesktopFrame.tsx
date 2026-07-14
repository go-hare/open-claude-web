import { useCallback, useEffect, useState, type CSSProperties, type ReactNode } from "react";
import type { AppRoute } from "../app/routes";
import type { RawBrowserNavigationState } from "../adapters/desktopBridge/officialBridgeAdapter";
import { readResolvedColorMode, THEME_MODE_CHANGE_EVENT } from "../features/settings/appearanceSettings";
import { useShellText } from "../i18n/shellMessages";
import { FrameContext } from "../stores/frameContext";
import { useFrameStore, type FrameStore } from "../stores/frameStore";
import { FrameSidebar } from "./FrameSidebar";
import { PaneLayout } from "./PaneLayout";
import { SearchCommandPalette } from "./SearchCommandPalette";
import { Icon } from "./icons";

type DesktopFrameProps = {
  currentRoute: AppRoute;
  children: ReactNode;
  onNavigate: (path: string) => void;
};

export function DesktopFrame({ children, currentRoute, onNavigate }: DesktopFrameProps) {
  const frame = useFrameStore();
  const [searchOpen, setSearchOpen] = useState(false);
  const colorMode = useResolvedColorMode();
  const windowsFrame = isWindowsDesktopFrame();
  const desktopFrame = isDesktopFrame();
  const openSearch = useCallback(() => setSearchOpen(true), []);

  useEffect(() => {
    const routeMode = modeFromPath(window.location.pathname);
    if (routeMode && frame.mode !== routeMode) frame.setMode(routeMode);
  }, [currentRoute.path, frame]);

  const frameStyle = {
    "--df-sidebar-width": `${frame.sidebarWidth}px`,
  } as CSSProperties;

  return (
    <div
      className="h-full"
      data-color-version="v2"
      data-theme="claude"
      data-mode={colorMode}
    >
      <div
        className="dframe-root draggable-none"
        data-collapsed={frame.sidebarCollapsed || undefined}
        data-frame-mode={frame.mode}
        data-hovering={(frame.sidebarCollapsed && frame.sidebarHovering) || undefined}
        data-peeked={frame.sidebarCollapsed || undefined}
        data-resizing={frame.sidebarResizing || undefined}
        data-system-font={frame.systemFont || undefined}
        data-darker-code={frame.darkerCode || undefined}
        data-windows={windowsFrame || undefined}
        data-web={!desktopFrame || undefined}
        style={frameStyle}
      >
        <FrameContext.Provider value={frame}>
          {windowsFrame ? <WindowsChromeBar frame={frame} onSearch={openSearch} /> : null}
          <FrameSidebar currentRoute={currentRoute} frame={frame} onNavigate={onNavigate} onSearch={openSearch} />
          <main id="dframe-main" tabIndex={-1} className="dframe-content">
            <div className="dframe-content-inner">
              <PaneLayout currentRoute={currentRoute} mode={frame.mode} onNavigate={onNavigate}>{children}</PaneLayout>
            </div>
          </main>
          <SearchCommandPalette isOpen={searchOpen} mode={frame.mode} onClose={() => setSearchOpen(false)} onNavigate={onNavigate} />
        </FrameContext.Provider>
      </div>
    </div>
  );
}

function WindowsChromeBar({ frame, onSearch }: { frame: FrameStore; onSearch: () => void }) {
  const text = useShellText();
  const showPeekIcon = frame.sidebarCollapsed && !frame.sidebarHovering;

  const onMenu = useCallback(() => {
    void window["claude.web"]?.BrowserNavigation?.requestMainMenuPopup?.();
  }, []);

  const onCollapseHoverEnter = useCallback(() => {
    if (frame.sidebarCollapsed) frame.setSidebarHovering(true);
  }, [frame]);

  const onCollapseHoverLeave = useCallback(() => {
    if (frame.sidebarCollapsed) frame.setSidebarHovering(false);
  }, [frame]);

  return (
    <div className="draggable absolute top-0 inset-x-0 h-[36px] flex items-center gap-1 px-3 z-20">
      <div className="flex items-center gap-1" onMouseEnter={onCollapseHoverEnter} onMouseLeave={onCollapseHoverLeave}>
        <TopbarButton ariaLabel="Menu" data-testid="topbar-windows-menu" onClick={onMenu}>
          <MenuLinesIcon />
        </TopbarButton>
        <TopbarButton
          ariaControls={frame.sidebarCollapsed ? "frame-peek-popover" : undefined}
          ariaExpanded={frame.sidebarCollapsed ? frame.sidebarHovering : undefined}
          ariaLabel={frame.sidebarCollapsed ? text.expandSidebar : text.collapseSidebar}
          ariaPressed={frame.sidebarCollapsed}
          onClick={frame.toggleSidebar}
        >
          {showPeekIcon ? <CollapsedPeekIcon /> : <Icon name="sidebar" customSize={16} />}
        </TopbarButton>
      </div>
      <TopbarButton ariaLabel={text.search} onClick={onSearch}>
        <Icon name="search" customSize={16} />
      </TopbarButton>
      <BrowserNavigationButtons />
      <div className="flex-1" />
      <div className="shrink-0 w-[140px]" />
    </div>
  );
}

function BrowserNavigationButtons() {
  const text = useShellText();
  const navState = useBrowserNavigationState();
  const canGoBack = navState.state === "ready" && Boolean(navState.result.canGoBack);
  const canGoForward = navState.state === "ready" && Boolean(navState.result.canGoForward);

  const onBack = useCallback(() => {
    void window["claude.web"]?.BrowserNavigation?.goBack?.();
  }, []);

  const onForward = useCallback(() => {
    void window["claude.web"]?.BrowserNavigation?.goForward?.();
  }, []);

  return (
    <div className="flex items-center gap-0.5 draggable-none">
      <TopbarButton ariaLabel="Back" disabled={!canGoBack} onClick={onBack}>
        <Icon name="ArrowLeft" customSize={16} className="text-text-400" />
      </TopbarButton>
      <TopbarButton ariaLabel="Forward" disabled={!canGoForward} onClick={onForward}>
        <Icon name="ArrowRight" customSize={16} className="text-text-400" />
      </TopbarButton>
    </div>
  );
}

function TopbarButton({ ariaControls, ariaExpanded, ariaLabel, ariaPressed, children, disabled, onClick, ...rest }: {
  "data-testid"?: string;
  ariaControls?: string;
  ariaExpanded?: boolean;
  ariaLabel: string;
  ariaPressed?: boolean;
  children: ReactNode;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      {...rest}
      aria-controls={ariaControls}
      aria-expanded={ariaExpanded}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      className="inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none disabled:drop-shadow-none border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 w-8 rounded-md draggable-none bg-transparent text-text-400 hover:bg-bg-200 hover:text-text-100"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

function MenuLinesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g stroke="currentColor">
        <path d="M4 18L20 18" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 12L20 12" strokeWidth="2" strokeLinecap="round" />
        <path d="M4 6L20 6" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function CollapsedPeekIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <path d="M3 4.5h7M3 8h10M3 11.5h5" />
    </svg>
  );
}

type BrowserNavigationLoadState =
  | { state: "loading" | "missing" | "error"; error?: Error }
  | { state: "ready"; result: RawBrowserNavigationState };

function useBrowserNavigationState(): BrowserNavigationLoadState {
  const [state, setState] = useState<BrowserNavigationLoadState>(() => (
    window["claude.web"]?.BrowserNavigation?.navigationStateStore ? { state: "loading" } : { state: "missing" }
  ));

  useEffect(() => {
    const store = window["claude.web"]?.BrowserNavigation?.navigationStateStore;
    if (!store) {
      setState({ state: "missing" });
      return;
    }

    let disposed = false;
    store.getState?.()
      .then((result) => {
        if (!disposed) setState({ state: "ready", result });
      })
      .catch((error: unknown) => {
        if (!disposed) setState({ state: "error", error: error instanceof Error ? error : new Error(String(error)) });
      });
    const unsubscribe = store.onStateChange?.((result) => {
      if (!disposed) setState({ state: "ready", result });
    });

    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, []);

  return state;
}

/** Official ThemeProvider resolved mode for data-theme=claude wrapper (not hard-coded light). */
function useResolvedColorMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return mode;
}

function isWindowsDesktopFrame() {
  if (typeof navigator === "undefined") return false;
  const isWindows = /\bWindows\b/.test(navigator.userAgent);
  return isWindows && isDesktopFrame();
}

function isDesktopFrame() {
  if (typeof navigator === "undefined") return false;
  return Boolean(window["claude.web"]) || /\bElectron\//.test(navigator.userAgent);
}

function modeFromPath(pathname: string) {
  if (
    pathname === "/new" ||
    pathname.startsWith("/chat/") ||
    pathname === "/task" ||
    pathname.startsWith("/task/") ||
    pathname.startsWith("/local_sessions") ||
    pathname === "/space" ||
    pathname.startsWith("/space/") ||
    pathname.startsWith("/cowork-artifact") ||
    pathname.startsWith("/scheduled-task") ||
    pathname.startsWith("/cowork/agent")
  ) return "cowork";
  if (
    pathname === "/" ||
    pathname === "/code" ||
    pathname.startsWith("/code/") ||
    pathname.startsWith("/claude-code-desktop")
  ) return "code";
  return undefined;
}
