import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import type { AppRoute } from "../app/routes";
import { desktopBridge } from "../adapters/desktopBridge";
import { CoworkRecentsSection } from "../features/cowork/sidebar/CoworkRecentsSection";
import { useShellText } from "../i18n/shellMessages";
import { SIDEBAR_WIDTH_BOUNDS, type FrameStore } from "../stores/frameStore";
import { ModePill } from "./ModePill";
import { RecentsSection } from "./RecentsSection";
import { SidebarNav } from "./SidebarNav";
import { SidebarFooter } from "./SidebarFooter";
import { CustomizeSidebarDialog } from "./CustomizeSidebarDialog";
import { Icon } from "./icons";
import { primaryNavItemsForMode } from "./sidebarData";
import { sessionHomePath } from "./sessionPaths";
import { resolveTrafficLightPadding } from "./trafficLightPadding";

type FrameSidebarProps = {
  currentRoute: AppRoute;
  frame: FrameStore;
  onNavigate: (path: string) => void;
  onSearch: () => void;
};

export function FrameSidebar({ currentRoute, frame, onNavigate, onSearch }: FrameSidebarProps) {
  const customization = useSidebarCustomization(frame.mode, frame);
  const peekHandlers = useSidebarPeek(frame);

  useSidebarShortcuts(frame, onSearch, onNavigate);

  return (
    <aside
      className="dframe-sidebar"
      onMouseEnter={peekHandlers.onEnter}
      onMouseLeave={peekHandlers.onLeave}
    >
      <a
        href="#dframe-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-bg-000 focus:px-3 focus:py-1.5 focus:text-sm focus:text-text-000 focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-focus"
      >
        Skip to content
      </a>
      <SidebarResizeHandle frame={frame} />
      <SidebarCollapsedTrigger frame={frame} />
      <SidebarMacChrome frame={frame} onSearch={onSearch} />
      <SidebarContent
        currentRoute={currentRoute}
        customization={customization}
        frame={frame}
        onNavigate={onNavigate}
      />
      <CustomizeSidebarDialog
        isOpen={customization.customizeOpen}
        isPinned={customization.isPinned}
        items={customization.configurableItems}
        onClose={customization.closeCustomize}
        onToggle={customization.togglePinned}
      />
    </aside>
  );
}

function SidebarCollapsedTrigger({ frame }: { frame: FrameStore }) {
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const isPeeked = frame.sidebarHovering;

  useEffect(() => {
    if (!frame.sidebarCollapsed || !isMacDesktopFrame()) return;
    const root = triggerRef.current?.closest(".dframe-root") as HTMLElement | null;
    if (!root || !triggerRef.current) return;
    const right = Math.round(triggerRef.current.getBoundingClientRect().right);
    root.style.setProperty("--df-trigger-right", `${right}px`);
    return () => {
      root.style.removeProperty("--df-trigger-right");
    };
  }, [frame.sidebarCollapsed]);

  if (!frame.sidebarCollapsed || !isMacDesktopFrame()) return null;

  return (
    <button
      ref={triggerRef}
      type="button"
      onClick={frame.toggleSidebar}
      aria-expanded={isPeeked}
      aria-controls="frame-peek-popover"
      aria-label="Open sidebar"
      className={[
        "draggable-none flex items-center justify-center size-7 rounded-[9px] transition-colors",
        isPeeked ? "bg-bg-300" : "",
      ].join(" ")}
    >
      <span className="flex items-center justify-center text-text-300">
        {isPeeked ? <Icon name="Sidebar" customSize={16} /> : <CollapsedPeekIcon />}
      </span>
    </button>
  );
}

function CollapsedPeekIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" aria-hidden="true">
      <path d="M3 4.5h7M3 8h10M3 11.5h5" />
    </svg>
  );
}

function SidebarMacChrome({ frame, onSearch }: { frame: FrameStore; onSearch: () => void }) {
  const text = useShellText();
  const trafficLightPadding = useTrafficLightPadding();
  // Official FrameSidebar zt tooltips (cbc59a8af ~2233–2251):
  // collapse tooltipKeyboardShortcut: "cmd+b"; search: Fe("command_palette") → cmd+k.
  const isMac = isMacDesktopFrame();
  const collapseShortcut = isMac ? "⌘B" : "Ctrl+B";
  const searchShortcut = isMac ? "⌘K" : "Ctrl+K";

  // Official FrameSidebar (cbc59a8af ~2197–2258): Mac expanded only; Windows uses top bar.
  if (!isMac || frame.sidebarCollapsed) return null;

  // Official desktop button wrappers: draggable-none -mt-[10px] (+ ml-0.5 on collapse).
  const buttonLiftClass = "draggable-none -mt-[10px]";

  return (
    <div className="draggable h-11 shrink-0 flex items-center px-2">
      {trafficLightPadding.needsPadding ? (
        <div className="shrink-0" style={{ width: trafficLightPadding.spacerWidth }} />
      ) : null}
      <div className={`${buttonLiftClass} ml-0.5`}>
        <SidebarChromeButton
          ariaLabel={text.collapseSidebar}
          keyboardShortcut={collapseShortcut}
          onClick={frame.toggleSidebar}
          tooltip={text.collapseSidebar}
        >
          <Icon name="Sidebar" customSize={16} />
        </SidebarChromeButton>
      </div>
      <div className={buttonLiftClass}>
        <SidebarChromeButton
          ariaLabel={text.search}
          keyboardShortcut={searchShortcut}
          onClick={onSearch}
          tooltip={text.search}
        >
          <Icon name="Search" customSize={16} />
        </SidebarChromeButton>
      </div>
    </div>
  );
}

/**
 * Official FrameSidebar chrome control (zt): df-chrome-btn + bottom tooltip + keyboardShortcut.
 * Icons use pointer-events-none so Electron drag hit-tests land on the no-drag button.
 */
function SidebarChromeButton({
  ariaLabel,
  children,
  keyboardShortcut,
  onClick,
  tooltip,
}: {
  ariaLabel: string;
  children: ReactNode;
  keyboardShortcut?: string;
  onClick: () => void;
  tooltip: string;
}) {
  return (
    <Tooltip.Root disableHoverablePopup>
      <Tooltip.Trigger
        delay={400}
        render={
          <button
            aria-label={ariaLabel}
            className="df-chrome-btn opacity-80 draggable-none flex items-center justify-center size-7 rounded-[9px] border-0 bg-transparent transition-colors"
            onClick={onClick}
            type="button"
          >
            <span className="pointer-events-none inline-flex items-center justify-center">{children}</span>
          </button>
        }
      />
      <Tooltip.Portal>
        <Tooltip.Positioner className="z-[100]" side="bottom" sideOffset={6}>
          <Tooltip.Popup className="px-2 py-1 text-xs font-ui leading-tight rounded-md shadow-md text-always-white bg-always-black/80 backdrop-blur pointer-events-none whitespace-nowrap">
            {tooltip}
            {keyboardShortcut ? <span className="ml-1.5 opacity-70">{keyboardShortcut}</span> : null}
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

/**
 * Official qWt + dframe FrameSidebar Le():
 * needsTrafficLightPadding = isMac && !isFullscreen
 * trafficLightSpacerWidth = round(74 / min(zoom, 1))
 * Subscribes to WindowState fullscreen/zoom changes (not a one-shot read).
 */
function useTrafficLightPadding() {
  const [state, setState] = useState({ isFullscreen: false, zoomFactor: 1 });

  useEffect(() => {
    if (!isMacDesktopFrame()) return;

    let disposed = false;
    const applyFullscreen = (isFullscreen: boolean) => {
      if (disposed) return;
      setState((prev) => (prev.isFullscreen === isFullscreen ? prev : { ...prev, isFullscreen }));
    };
    const applyZoom = (zoomFactor: number) => {
      if (disposed) return;
      const next = Number.isFinite(zoomFactor) && zoomFactor > 0 ? zoomFactor : 1;
      setState((prev) => (prev.zoomFactor === next ? prev : { ...prev, zoomFactor: next }));
    };

    void desktopBridge.Window.getFullscreen()
      .then((value) => applyFullscreen(value === true))
      .catch(() => applyFullscreen(false));
    void desktopBridge.Window.getZoomFactor()
      .then(applyZoom)
      .catch(() => applyZoom(1));

    const unsubscribeFullscreen = desktopBridge.Window.onFullscreenChanged?.(applyFullscreen);
    const unsubscribeZoom = desktopBridge.Window.onZoomFactorChanged?.(applyZoom);

    return () => {
      disposed = true;
      unsubscribeFullscreen?.();
      unsubscribeZoom?.();
    };
  }, []);

  return resolveTrafficLightPadding(state.isFullscreen, state.zoomFactor);
}

function isMacDesktopFrame() {
  if (typeof navigator === "undefined") return false;
  const isMac = /\bMacintosh\b|\bMac OS\b/.test(navigator.userAgent);
  const isDesktop = Boolean(window["claude.web"]) || /\bElectron\//.test(navigator.userAgent);
  const isWindows = /\bWindows\b/.test(navigator.userAgent);
  return isMac && isDesktop && !isWindows;
}

function SidebarResizeHandle({ frame }: { frame: FrameStore }) {
  const text = useShellText();
  const handleRef = useRef<HTMLDivElement | null>(null);
  const hintRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLElement | null>(null);
  const startClientXRef = useRef(0);
  const startWidthRef = useRef(0);
  const pendingWidthRef = useRef(frame.sidebarWidth);
  const didDragRef = useRef(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  const hideHint = useCallback(() => {
    const hint = hintRef.current;
    if (!hint) return;
    hint.style.transitionDelay = "0ms";
    hint.style.opacity = "0";
  }, []);

  const cleanupDrag = useCallback(() => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  }, []);

  const finishResize = useCallback(() => {
    cleanupDrag();
    frame.setSidebarResizing(false);
    if (!rootRef.current) return;
    if (didDragRef.current) {
      frame.commitSidebarWidth(pendingWidthRef.current);
    } else {
      frame.toggleSidebar();
    }
    rootRef.current = null;
  }, [cleanupDrag, frame]);

  const startResize = useCallback((event: ReactMouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    hideHint();
    const root = handleRef.current?.closest(".dframe-root") as HTMLElement | null;
    if (!root) return;
    rootRef.current = root;
    startClientXRef.current = event.clientX;
    const computedWidth = parseFloat(getComputedStyle(root).getPropertyValue("--df-sidebar-width"));
    const startWidth = Number.isFinite(computedWidth) ? computedWidth : frame.sidebarWidth;
    startWidthRef.current = startWidth;
    pendingWidthRef.current = startWidth;
    didDragRef.current = false;
    frame.setSidebarResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startClientXRef.current;
      if (Math.abs(delta) > 3) {
        didDragRef.current = true;
      }
      const nextWidth = Math.min(
        SIDEBAR_WIDTH_BOUNDS.MAX,
        Math.max(SIDEBAR_WIDTH_BOUNDS.MIN, startWidthRef.current + delta),
      );
      pendingWidthRef.current = nextWidth;
      root.style.setProperty("--df-sidebar-width", `${nextWidth}px`);
    };

    const onMouseUp = () => finishResize();
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    cleanupRef.current = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, [finishResize, frame, hideHint]);

  const onKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 32 : 8;
    let delta = 0;
    if (event.key === "ArrowLeft") {
      delta = -step;
    } else if (event.key === "ArrowRight") {
      delta = step;
    }
    if (delta === 0) return;
    event.preventDefault();
    frame.commitSidebarWidth(frame.sidebarWidth + delta);
  }, [frame]);

  const positionHint = useCallback((clientY: number) => {
    const handle = handleRef.current;
    const hint = hintRef.current;
    if (!handle || !hint || frame.sidebarResizing) return;
    const rect = handle.getBoundingClientRect();
    hint.style.left = `${rect.right + 6}px`;
    hint.style.top = `${clientY}px`;
    hint.style.transitionDelay = "200ms";
    hint.style.opacity = "1";
  }, [frame.sidebarResizing]);

  useEffect(() => cleanupDrag, [cleanupDrag]);

  return (
    <>
      <div
        ref={handleRef}
        className="dframe-resize-handle"
        onMouseEnter={(event) => positionHint(event.clientY)}
        onMouseMove={(event) => positionHint(event.clientY)}
        onMouseLeave={hideHint}
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={text.dragToResize}
          aria-valuenow={frame.sidebarWidth}
          tabIndex={0}
          className="group/resize relative outline-none w-3 h-full cursor-col-resize absolute inset-0 w-full"
          onMouseDown={startResize}
          onKeyDown={onKeyDown}
        >
          <div
            className={[
              "absolute rounded-full transition-[opacity,background-color]",
              frame.sidebarResizing
                ? "opacity-100 bg-text-200 duration-100"
                : "opacity-0 bg-text-400 duration-200 delay-200 group-hover/resize:opacity-100",
              "group-focus-visible/resize:opacity-100 group-focus-visible/resize:bg-accent-brand group-focus-visible/resize:delay-0",
              "left-1/2 -translate-x-1/2 w-[3px] h-full max-h-12 top-1/2 -translate-y-1/2",
            ].join(" ")}
          />
        </div>
      </div>
      <div
        ref={hintRef}
        className="fixed -translate-y-1/2 px-2 py-1 text-xs font-ui leading-tight rounded-md shadow-md text-always-white bg-always-black/80 backdrop-blur z-tooltip pointer-events-none opacity-0 transition-opacity duration-150"
      >
        <div className="whitespace-nowrap">
          {text.collapseSidebar}
          <span className="ml-1.5 opacity-70">⌘B</span>
        </div>
        <div className="whitespace-nowrap">{text.dragToResize}</div>
      </div>
    </>
  );
}

function useSidebarCustomization(mode: FrameStore["mode"], frame: FrameStore) {
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const configurableItems = useMemo(() => primaryNavItemsForMode(mode), [mode]);
  const isPinned = useCallback((key: string) => frame.navPinnedIds === null || frame.navPinnedIds.includes(key), [frame.navPinnedIds]);
  const hiddenKeys = useMemo(() => new Set(configurableItems.filter((item) => !isPinned(item.key)).map((item) => item.key)), [configurableItems, isPinned]);
  const togglePinned = (key: string) => {
    const allKeys = configurableItems.map((item) => item.key);
    const current = frame.navPinnedIds ?? allKeys;
    const next = current.includes(key) ? current.filter((item) => item !== key) : [...current, key];
    const normalized = allKeys.filter((item) => next.includes(item));
    frame.setNavPinnedIds(normalized.length === allKeys.length ? null : normalized);
  };

  return {
    closeCustomize: () => setCustomizeOpen(false),
    configurableItems,
    customizeOpen,
    hiddenKeys,
    isPinned,
    openCustomize: () => setCustomizeOpen(true),
    togglePinned,
  };
}

type SidebarCustomization = ReturnType<typeof useSidebarCustomization>;

function useSidebarPeek(frame: FrameStore) {
  const closeTimerRef = useRef<number | null>(null);
  const frameRef = useRef(frame);

  useEffect(() => {
    frameRef.current = frame;
  }, [frame]);

  const clearTimer = useCallback(() => {
    if (closeTimerRef.current !== null) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const onEnter = useCallback((event: ReactMouseEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.target as Node)) return;
    clearTimer();
    if (frame.sidebarCollapsed) {
      frame.setSidebarHovering(true);
    }
  }, [clearTimer, frame]);

  const onLeave = useCallback(() => {
    clearTimer();
    if (!frameRef.current.sidebarCollapsed) return;
    const closeWhenMenuSettles = () => {
      const current = frameRef.current;
      if (current.moreOpen) {
        closeTimerRef.current = window.setTimeout(closeWhenMenuSettles, 180);
        return;
      }
      current.setSidebarHovering(false);
      closeTimerRef.current = null;
    };
    closeTimerRef.current = window.setTimeout(closeWhenMenuSettles, 180);
  }, [clearTimer]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && frame.sidebarCollapsed && frame.sidebarHovering && !frame.moreOpen) {
        frame.setSidebarHovering(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimer();
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [clearTimer, frame]);

  return { onEnter, onLeave };
}

function useSidebarShortcuts(frame: FrameStore, onSearch: () => void, onNavigate: (path: string) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "b") {
        event.preventDefault();
        frame.toggleSidebar();
      }
      if ((event.metaKey || event.ctrlKey) && key === "k") {
        event.preventDefault();
        onSearch();
      }
      // Sidebar new-session shortcut for code (sidebarData ⌘N) → session home.
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && key === "n") {
        event.preventDefault();
        onNavigate(sessionHomePath(frame.mode));
      }
      if ((event.metaKey || event.ctrlKey) && !event.altKey && !event.shiftKey && (key === "1" || key === "2")) {
        event.preventDefault();
        const nextMode = key === "1" ? "cowork" : "code";
        frame.setMode(nextMode);
        onNavigate(sessionHomePath(nextMode));
      }
      const rowDirection = sidebarRowDirection(event);
      if (rowDirection !== 0) {
        event.preventDefault();
        focusAdjacentSidebarRow(frame.mode, rowDirection, onNavigate);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [frame, onNavigate, onSearch]);
}

function sidebarRowDirection(event: KeyboardEvent) {
  if (event.altKey) return 0;
  if (event.key === "Tab" && event.ctrlKey && !event.metaKey) {
    return event.shiftKey ? -1 : 1;
  }
  const primaryModifier = event.metaKey || event.ctrlKey;
  if (!primaryModifier || !event.shiftKey) return 0;
  if (event.code === "BracketRight") return 1;
  if (event.code === "BracketLeft") return -1;
  return 0;
}

function focusAdjacentSidebarRow(mode: FrameStore["mode"], direction: number, onNavigate: (path: string) => void) {
  const section = document.querySelector(`[data-kind="${mode}"]`);
  if (!section) return;
  const rows = Array.from(section.querySelectorAll<HTMLElement>("[data-row-main-button]"));
  if (rows.length === 0) return;
  let selectedIndex = rows.findIndex((row) => row.getAttribute("data-selected") === "focused");
  if (selectedIndex === -1) {
    selectedIndex = rows.findIndex((row) => row.getAttribute("data-selected") === "open");
  }
  const nextIndex = (selectedIndex + 1 + direction + rows.length + 1) % (rows.length + 1);
  if (nextIndex === 0) {
    onNavigate(sessionHomePath(mode));
    return;
  }
  rows[nextIndex - 1]?.scrollIntoView({ block: "nearest" });
  rows[nextIndex - 1]?.click();
}

function SidebarContent({ currentRoute, customization, frame, onNavigate }: Omit<FrameSidebarProps, "onSearch"> & { customization: SidebarCustomization }) {
  const handleModeChange = useCallback((mode: FrameStore["mode"]) => {
    frame.setMode(mode);
    onNavigate(sessionHomePath(mode));
  }, [frame, onNavigate]);

  const bodyClass = [
    "dframe-sidebar-body flex flex-col flex-1 min-h-0 gap-3 px-2 pt-2 pb-1.5",
    frame.sidebarCollapsed ? "bg-[hsl(var(--df-surface-primary))] border-0.5 border-border-300" : "",
  ].join(" ");

  return (
    <div id="frame-peek-popover" className={bodyClass}>
      <ModePill mode={frame.mode} onModeChange={handleModeChange} />
      <div className="flex flex-col flex-1 min-h-0">
        <div className="shrink-0">
          <SidebarNav
            currentRoute={currentRoute}
            hiddenKeys={customization.hiddenKeys}
            mode={frame.mode}
            moreOpen={frame.moreOpen}
            onCustomizeSidebar={customization.openCustomize}
            onMoreOpenChange={frame.setMoreOpen}
            onNavigate={onNavigate}
          />
        </div>
        <div className="dframe-nav-scroll relative flex flex-col flex-1 min-h-0 overflow-y-auto px-1 pt-1 pb-3 -mx-1 -mt-1">
          {frame.mode === "cowork" ? <CoworkRecentsSection frame={frame} onNavigate={onNavigate} /> : <RecentsSection frame={frame} onNavigate={onNavigate} />}
        </div>
      </div>
      <SidebarFooter frame={frame} mode={frame.mode} onNavigate={onNavigate} />
    </div>
  );
}
