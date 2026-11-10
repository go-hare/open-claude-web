/**
 * Official side-pane chrome (column / tile / titles / ViewPaneBody).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 * Subagent body stays in the tile (message entry components) via renderSubagent.
 */
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { desktopBridge, type LocalSessionsBridge, type SessionSummary, type ChatMessage } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import {
  OfficialButton,
  OfficialDropdownButton,
  type OfficialDropdownItem,
  type OfficialViewPane,
} from "../OfficialEpitaxyComponents";
import {
  PREVIEW_EMPTY_MESSAGES,
  SESSION_LOAD_MESSAGES,
  SHOW_IN_FOLDER_MESSAGES,
  SIDE_PANE_CHROME_MESSAGES,
  VIEWS_MENU_MESSAGES,
} from "../officialCodeChromeMessages";
import { OfficialDiffPane, type OfficialDiffCompareMeta } from "../OfficialDiffPane";
import { OfficialFilePane, type OfficialFileViewTarget } from "./OfficialFilePane";
import { OfficialFilesBrowserPane } from "./OfficialFilesBrowserPane";
import { OfficialFilesHeaderTabs } from "./OfficialFilesHeaderTabs";
import {
  OFFICIAL_FILES_TAB_SIZES,
  readOfficialFilesViewPrefs,
  writeOfficialFilesViewPref,
  type OfficialFilesViewPrefs,
} from "./officialFilesPrefs";
import { OfficialPlanPane } from "./OfficialPlanPane";
import { OfficialPreviewPane, type OfficialPreviewTarget } from "./OfficialPreviewPane";
import { isEpitaxyPopoutWindow } from "./epitaxyPopoutWindow";
import {
  OfficialPreviewAddressBar,
  OfficialPreviewGlobeMenu,
  OfficialPreviewTrailingChrome,
} from "./OfficialPreviewHeaderChrome";
import { OfficialFramebufferPane } from "./OfficialFramebufferPane";
import { OfficialRunsPane } from "./OfficialRunsPane";
import { OfficialShellPtyPane } from "./OfficialShellPtyPane";
import { OfficialTasksPane } from "./OfficialTasksPane";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import {
  officialEpitaxyTerminalTabsStore,
  officialPtyCdCommand,
  officialTerminalPtyKey,
  officialTerminalTabsForSession,
  OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
  useOfficialEpitaxyTerminalTabs,
} from "./officialEpitaxyTerminalTabsStore";
import {
  officialEpitaxyShellRunStore,
  officialFlushPendingShellCommand,
} from "./officialEpitaxyShellRunStore";
import { officialShowInFolderLabel } from "./officialFilePreviewUtils";
import { parseOfficialPlan, resolvePlanOpenPath } from "./officialTasksAndPlan";
import {
  EpitaxyTranscriptActionContext,
  type EpitaxySessionRef,
  type OfficialSubagentTarget,
} from "./epitaxyTranscriptActionContext";

export const sidePaneMinWidth = 280;
const sidePaneMinHeight = 100;
const sidePaneResizeStep = 24;
const sidePaneResizeHandleSize = 12;
/** Official ur fallback: chat flex 2 vs side flex 1. File/diff/preview first-open uses 3 (c039 `la`). */
export const sidePaneDefaultFlex = 1;
export const chatDefaultFlex = 2;

// Official tiles-handle sits in the nE.gap (12) between tiles — absolute over the gap, not a flex sibling.
const sidePaneBoundaryHandleStyle: CSSProperties = {
  position: "absolute",
  left: -sidePaneResizeHandleSize / 2 - 6,
  top: 0,
  bottom: 0,
  zIndex: 2,
  transform: "translateZ(2px)",
  padding: 0,
  outline: "none",
  border: 0,
  background: "transparent",
  touchAction: "none",
  cursor: "col-resize",
  width: sidePaneResizeHandleSize,
};

const sidePaneBoundaryAffordanceStyle: CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  borderRadius: 999,
  transform: "translate(-50%, -50%)",
  transition: "opacity 120ms ease",
  width: "var(--tile-resize-thickness)",
  height: "var(--tile-resize-length)",
};

function clampSidePaneWidth(width: number, maxWidth: number) {
  return Math.max(sidePaneMinWidth, Math.min(maxWidth, Math.round(width)));
}

function getSidePaneMaxWidth(containerWidth?: number) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  // Leave at least minTilePx for chat (official nE.minTilePx = 100).
  const usable = Math.max(sidePaneMinWidth, (containerWidth ?? viewportWidth) - sidePaneMinWidth);
  return usable;
}

function getDefaultSidePaneWidth(containerWidth?: number) {
  const viewportWidth = typeof window === "undefined" ? 1280 : window.innerWidth;
  const total = containerWidth ?? viewportWidth;
  // Official default flex share: side / (chat+side) = 1/3.
  const baseWidth = (total * sidePaneDefaultFlex) / (chatDefaultFlex + sidePaneDefaultFlex);
  return clampSidePaneWidth(baseWidth, getSidePaneMaxWidth(containerWidth));
}

function sidePaneWidthToAriaValue(width: number | undefined, containerWidth?: number) {
  // Official separator valueNow ≈ leftFlex/(left+right)*100 with default chat:2 side:1 → ~67 for chat side of handle.
  // Our handle reports side share so 33 when default.
  if (width === undefined) {
    return Math.round((sidePaneDefaultFlex / (chatDefaultFlex + sidePaneDefaultFlex)) * 100);
  }
  const maxWidth = getSidePaneMaxWidth(containerWidth);
  const range = Math.max(1, maxWidth - sidePaneMinWidth);
  return Math.max(0, Math.min(100, Math.round(((width - sidePaneMinWidth) / range) * 100)));
}

/** Official ca0135 ur column under chat row: outer width shared; tiles stack vertically. */
/** Official c119 $I — YI tile enter/exit tween. */
const officialTileEnterTransition = {
  type: "tween" as const,
  duration: 0.32,
  ease: [0.32, 0.72, 0, 1] as [number, number, number, number],
};

/**
 * Official qI enteringIds residual (c11959232): newly added tile ids animate YI enter for 320ms.
 * Critical: compute during render (official if idsKey changed → setState in render), not useEffect —
 * otherwise the new tile mounts with isEntering=false and misses YI initial flexGrow:0.
 *
 * Product split vs full KI/YI tile graph:
 * - Row open (empty→first side next to chat) is owned by EpitaxySidePaneColumn flexGrow 0→1
 *   (official YI on the side tile in [["chat",2], side]).
 * - Stack open (plan→file under existing side column) still marks the new tile entering here.
 * So empty prev → no *stack* enter (column handles row squeeze); added under non-empty → enter.
 */
function useOfficialSideTileEnteringIds(sideTiles: readonly OfficialViewPane[]) {
  const reduceMotion = useReducedMotion();
  const idsKey = sideTiles.join("\0");
  const [state, setState] = useState(() => ({
    idsKey,
    ids: new Set(sideTiles),
    entering: new Set<OfficialViewPane>() as ReadonlySet<OfficialViewPane>,
  }));

  // Official qI: sync derived entering when membership key changes (render-phase update).
  if (idsKey !== state.idsKey) {
    const next = new Set(sideTiles);
    const added = new Set<OfficialViewPane>();
    for (const id of next) {
      if (!state.ids.has(id)) added.add(id);
    }
    // empty prev → first side open: column YI owns row squeeze; no vertical stack enter.
    const entering =
      reduceMotion || state.ids.size === 0 || added.size === 0
        ? (new Set<OfficialViewPane>() as ReadonlySet<OfficialViewPane>)
        : added;
    setState({ idsKey, ids: next, entering });
  }

  useEffect(() => {
    if (state.entering.size === 0) return;
    const timer = window.setTimeout(() => {
      setState((current) =>
        current.entering.size === 0
          ? current
          : { ...current, entering: new Set<OfficialViewPane>() },
      );
    }, reduceMotion ? 0 : officialTileEnterTransition.duration * 1000);
    return () => window.clearTimeout(timer);
  }, [reduceMotion, state.entering]);

  return state.entering;
}

/**
 * Official YI on the side tile in the chat row (c11959232):
 * first open next to chat animates flexGrow 0 → tile.flex (file=3, tasks=1) with $I tween so chat is squeezed,
 * not mounted full-width. Fixed-width (post-resize) skips flex enter.
 */
export function EpitaxySidePaneColumn({
  fileView,
  flex,
  isTopLeft,
  landingCwd,
  messages,
  onCloseAll,
  onCloseTile,
  onFileViewChange,
  onPopOut,
  onDock,
  onTogglePopoutAlwaysOnTop,
  popoutAlwaysOnTop = false,
  onSidePaneWidthChange,
  previewTarget,
  renderSubagent,
  session,
  sessionRef,
  showExpand = true,
  hideCloseButton = false,
  fileTabs,
  onFileTabsChange,
  sidePaneWidth,
  sideTiles,
  subagentView,
}: {
  fileView: OfficialFileViewTarget | null;
  /** Residual side column flex (c039 `la`: file/diff/preview = 3). */
  flex?: number;
  isTopLeft?: boolean;
  /** Official vN `landingCwd` — draft home file pane. */
  landingCwd?: string | null;
  messages: ChatMessage[];
  onCloseAll: () => void;
  onCloseTile: (view: OfficialViewPane) => void;
  /** Official cccc `Db` activateFileTab / closeFileTab. */
  onFileViewChange?: (view: OfficialFileViewTarget | null) => void;
  /** Official cccc `nT` — Files header WindowNew. */
  onPopOut?: (view: OfficialViewPane) => void;
  /** Official shared-18 `yx` — popout dock. */
  onDock?: () => void;
  /** Official shared-18 `hx` pin. */
  onTogglePopoutAlwaysOnTop?: () => void;
  popoutAlwaysOnTop?: boolean;
  onSidePaneWidthChange: (width: number) => void;
  previewTarget: OfficialPreviewTarget | null;
  renderSubagent?: (subagentView: OfficialSubagentTarget) => ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  /** Official ca5db `V` Expand — hidden in popout window. */
  showExpand?: boolean;
  /** Official c563 `hideCloseButton:!0` on popout host. */
  hideCloseButton?: boolean;
  /** Official cccc `Db` fileTabs — owned by session store / popout hydrate. */
  fileTabs?: string[];
  onFileTabsChange?: (tabs: string[]) => void;
  sidePaneWidth?: number;
  sideTiles: OfficialViewPane[];
  subagentView: OfficialSubagentTarget | null;
}) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [isResizingSidePane, setIsResizingSidePane] = useState(false);
  /** Official ca5db `R`/`V` toggleExpandedTile — Files column fills remaining row. */
  const [paneExpanded, setPaneExpanded] = useState(false);
  const columnFlex = paneExpanded ? 100 : (flex ?? sidePaneDefaultFlex);
  const enteringIds = useOfficialSideTileEnteringIds(sideTiles);
  const ariaValueNow = sidePaneWidthToAriaValue(sidePaneWidth);

  // Official c593f7513 yg + shared-18 qb: initial:!1, flexGrow in style, minTileWidthPx=280.
  const sidePaneStyle = useMemo<CSSProperties>(() => {
    if (sidePaneWidth === undefined || paneExpanded) {
      return {
        height: "100%",
        minWidth: sidePaneMinWidth,
        flexGrow: columnFlex,
        flexShrink: 1,
        flexBasis: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
        position: "relative",
        overflow: "visible",
      };
    }
    return {
      height: "100%",
      minWidth: sidePaneMinWidth,
      width: `${sidePaneWidth}px`,
      flex: "0 0 auto",
      display: "flex",
      flexDirection: "column",
      gap: 12,
      minHeight: 0,
      position: "relative",
    };
  }, [columnFlex, paneExpanded, sidePaneWidth]);

  const commitSidePaneWidth = useCallback((width: number, maxWidth?: number) => {
    onSidePaneWidthChange(clampSidePaneWidth(width, maxWidth ?? getSidePaneMaxWidth()));
  }, [onSidePaneWidthChange]);
  const readSidePaneWidth = useCallback((containerWidth?: number) => {
    return sidePaneWidth ?? columnRef.current?.getBoundingClientRect().width ?? getDefaultSidePaneWidth(containerWidth);
  }, [sidePaneWidth]);
  const stopResizeListeners = useCallback(() => {
    resizeCleanupRef.current?.();
    resizeCleanupRef.current = null;
    setIsResizingSidePane(false);
  }, []);
  const startSidePaneResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    resizeCleanupRef.current?.();
    const handle = event.currentTarget;
    const pointerId = event.pointerId;
    // Handle is absolute over nE.gap; width budget is chat+side row (column parent), not the side column alone.
    const containerWidth = columnRef.current?.parentElement?.getBoundingClientRect().width;
    const maxWidth = getSidePaneMaxWidth(containerWidth);
    const startX = event.clientX;
    const startWidth = clampSidePaneWidth(readSidePaneWidth(containerWidth), maxWidth);
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.userSelect = "none";
    try {
      handle.setPointerCapture(pointerId);
    } catch {
      // Pointer capture can fail if the pointer was already released.
    }
    const handlePointerMove = (moveEvent: PointerEvent) => {
      moveEvent.preventDefault();
      commitSidePaneWidth(startWidth - (moveEvent.clientX - startX), maxWidth);
    };
    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      document.body.style.userSelect = previousUserSelect;
      try {
        handle.releasePointerCapture(pointerId);
      } catch {
        // Ignore stale pointer capture after pointerup/cancel.
      }
      resizeCleanupRef.current = null;
      setIsResizingSidePane(false);
    };
    resizeCleanupRef.current = handlePointerUp;
    setIsResizingSidePane(true);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
  }, [commitSidePaneWidth, readSidePaneWidth]);
  const handleSidePaneResizeKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const containerWidth = columnRef.current?.parentElement?.getBoundingClientRect().width;
    const maxWidth = getSidePaneMaxWidth(containerWidth);
    const currentWidth = clampSidePaneWidth(readSidePaneWidth(containerWidth), maxWidth);
    if (event.key === "Home") {
      commitSidePaneWidth(sidePaneMinWidth, maxWidth);
      return;
    }
    if (event.key === "End") {
      commitSidePaneWidth(maxWidth, maxWidth);
      return;
    }
    commitSidePaneWidth(currentWidth + (event.key === "ArrowLeft" ? sidePaneResizeStep : -sidePaneResizeStep), maxWidth);
  }, [commitSidePaneWidth, readSidePaneWidth]);

  useEffect(() => () => stopResizeListeners(), [stopResizeListeners]);

  const tiles = sideTiles.map((tile, index) => (
    <EpitaxySidePaneTile
      key={tile}
      activeView={tile}
      fileView={fileView}
      isEntering={enteringIds.has(tile)}
      isTopLeft={isTopLeft && index === 0}
      landingCwd={landingCwd}
      messages={messages}
      onClose={() => (sideTiles.length === 1 ? onCloseAll() : onCloseTile(tile))}
      onFileViewChange={onFileViewChange}
      onPopOut={onPopOut ? () => onPopOut(tile) : undefined}
      onDock={onDock}
      onToggleExpand={showExpand && !onDock ? () => setPaneExpanded((expanded) => !expanded) : undefined}
      hideCloseButton={hideCloseButton}
      popoutAlwaysOnTop={popoutAlwaysOnTop}
      onTogglePopoutAlwaysOnTop={onTogglePopoutAlwaysOnTop}
      fileTabs={fileTabs}
      onFileTabsChange={onFileTabsChange}
      paneExpanded={paneExpanded}
      previewTarget={previewTarget}
      renderSubagent={renderSubagent}
      session={session}
      sessionRef={sessionRef}
      subagentView={subagentView}
    />
  ));

  // Outer is the flex sibling of chat (parent gap:12). Resize handle overlays the gap, official-style.
  // Official YI: motion flexGrow 0→side flex ($I) on row enter; fixed-width path is plain div.
  if (sidePaneWidth !== undefined && !paneExpanded) {
    return (
      <div ref={columnRef} className="min-w-0 min-h-0 relative" style={sidePaneStyle}>
        <div
          aria-label="Resize"
          aria-orientation="vertical"
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={ariaValueNow}
          className={`tiles-handle draggable-none hide-focus-ring ${isResizingSidePane ? "is-active" : ""}`}
          onKeyDown={handleSidePaneResizeKeyDown}
          onPointerDown={startSidePaneResize}
          role="separator"
          style={sidePaneBoundaryHandleStyle}
          tabIndex={0}
        >
          <span aria-hidden="true" className="tiles-handle-affordance" style={sidePaneBoundaryAffordanceStyle} />
        </div>
        {tiles}
      </div>
    );
  }

  return (
    <motion.div
      ref={columnRef}
      className="min-w-0 min-h-0 relative"
      initial={false}
      style={sidePaneStyle}
    >
      <div
        aria-label="Resize"
        aria-orientation="vertical"
        aria-valuemax={100}
        aria-valuemin={0}
        aria-valuenow={ariaValueNow}
        className={`tiles-handle draggable-none hide-focus-ring ${isResizingSidePane ? "is-active" : ""}`}
        onKeyDown={handleSidePaneResizeKeyDown}
        onPointerDown={startSidePaneResize}
        role="separator"
        style={sidePaneBoundaryHandleStyle}
        tabIndex={0}
      >
        <span aria-hidden="true" className="tiles-handle-affordance" style={sidePaneBoundaryAffordanceStyle} />
      </div>
      <div
        className="tiles-shell min-w-0 min-h-0 h-full w-full flex flex-col gap-[12px]"
      >
        {tiles}
      </div>
    </motion.div>
  );
}

/**
 * Official rE single side tile (header + QR body).
 * When stacked under tasks via ur column, each tile keeps its own chrome (title + close).
 * Official YI enter (c119): isEntering → flexGrow 0→1 ($I), shell absolute during enter so the
 * existing side tile (e.g. plan) keeps full column share while the new tile grows from below.
 */
function EpitaxySidePaneTile({
  activeView,
  fileView,
  isEntering = false,
  isTopLeft,
  landingCwd,
  messages,
  onClose,
  onFileViewChange,
  onPopOut,
  onDock,
  onToggleExpand,
  hideCloseButton = false,
  popoutAlwaysOnTop = false,
  onTogglePopoutAlwaysOnTop,
  fileTabs: fileTabsProp,
  onFileTabsChange,
  paneExpanded = false,
  previewTarget,
  renderSubagent,
  session,
  sessionRef,
  subagentView,
}: {
  activeView: OfficialViewPane;
  fileView: OfficialFileViewTarget | null;
  /** Official qI enteringIds.has(tileId) — stack open under existing side tile. */
  isEntering?: boolean;
  isTopLeft?: boolean;
  landingCwd?: string | null;
  /** Official oe(sessionId) — full hydrated transcript, not sparse session.messages. */
  messages: ChatMessage[];
  onClose: () => void;
  onFileViewChange?: (view: OfficialFileViewTarget | null) => void;
  /** Official cccc `nT` / ca5db `H` — session Files WindowNew. */
  onPopOut?: () => void;
  /** Official shared-18 `yx` — popout ArrowInSquare dock. */
  onDock?: () => void;
  /** Official ca5db `V` / `R` toggleExpandedTile. */
  onToggleExpand?: () => void;
  /** Official c563 `hideCloseButton:!0`. */
  hideCloseButton?: boolean;
  /** Official shared-18 `hx` pin. */
  popoutAlwaysOnTop?: boolean;
  onTogglePopoutAlwaysOnTop?: () => void;
  fileTabs?: string[];
  onFileTabsChange?: (tabs: string[]) => void;
  paneExpanded?: boolean;
  previewTarget: OfficialPreviewTarget | null;
  renderSubagent?: (subagentView: OfficialSubagentTarget) => ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  subagentView: OfficialSubagentTarget | null;
}) {
  const codeSurface = activeView === "terminal" || activeView === "diff" || activeView === "file";
  const bridge = desktopBridge.LocalSessions;
  const viewsText = useI18nText(VIEWS_MENU_MESSAGES);
  const chromeText = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const previewChrome = useI18nText(PREVIEW_EMPTY_MESSAGES);
  const sessionLoadText = useI18nText(SESSION_LOAD_MESSAGES);
  // Official Lr (ca0135bc5): diffShowTree:!1 — tree off until user clicks Show files.
  const [diffShowTree, setDiffShowTree] = useState(false);
  // Official oN: diffCanFitTree[repoKey] ?? true — Hide/Show files only when d (canFitTree).
  const [diffCanFitTree, setDiffCanFitTree] = useState(true);
  const [diffCompareMeta, setDiffCompareMeta] = useState<OfficialDiffCompareMeta | null>(null);
  /** Official mb tree column — session default shown. c039 `Nn` popout reads `epitaxy-popout-files-tree-shown`. */
  const [filesTreeShown, setFilesTreeShown] = useState(() => {
    if (!isEpitaxyPopoutWindow()) return true;
    try {
      return window.localStorage.getItem("epitaxy-popout-files-tree-shown") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    if (!isEpitaxyPopoutWindow()) return;
    try {
      window.localStorage.setItem("epitaxy-popout-files-tree-shown", filesTreeShown ? "true" : "false");
    } catch {
      /* ignore quota */
    }
  }, [filesTreeShown]);
  /** Official cccc `Db` `fileTabs` — session-owned when parent hydrates popout. */
  const [fileTabsLocal, setFileTabsLocal] = useState<string[]>(() => fileTabsProp ?? []);
  const fileTabs = fileTabsProp ?? fileTabsLocal;
  const setFileTabs = useCallback((next: string[] | ((current: string[]) => string[])) => {
    const resolved = typeof next === "function" ? next(fileTabs) : next;
    if (!fileTabsProp) setFileTabsLocal(resolved);
    onFileTabsChange?.(resolved);
  }, [fileTabs, fileTabsProp, onFileTabsChange]);
  /** Official cccc `jC` Files ⋯ prefs. */
  const [filesPrefs, setFilesPrefs] = useState(readOfficialFilesViewPrefs);
  const filesFilterRef = useRef<HTMLInputElement | null>(null);
  const terminalTabs = useOfficialEpitaxyTerminalTabs(sessionRef?.id);
  // Official eR/XN: plan header actions read oe(sessionId) independently of prop identity.
  const planBucket = useOfficialCodeSessionBucket(sessionRef?.id);
  const planMessages = planBucket?.messages ?? messages;
  const plan = useMemo(
    () => (activeView === "plan" ? parseOfficialPlan(planMessages) : { content: undefined, path: undefined }),
    [activeView, planMessages],
  );
  // Official YI enter: flexGrow 0→1 via motion ($I 0.32s ease [.32,.72,0,1]). Never use flex shorthand here.
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    setDiffCompareMeta(null);
    setDiffCanFitTree(true);
    if (!fileTabsProp) setFileTabsLocal([]);
  }, [sessionRef?.id, fileTabsProp]);

  useEffect(() => {
    const path = fileView?.path;
    if (!path) return;
    setFileTabs((current) => (current.includes(path) ? current : [...current, path]));
  }, [fileView?.path]);

  const activateFileTab = useCallback((path: string) => {
    onFileViewChange?.({ path, scrollNonce: Date.now() });
  }, [onFileViewChange]);

  const closeFileTab = useCallback((path: string) => {
    setFileTabs((current) => {
      const next = current.filter((item) => item !== path);
      if (fileView?.path === path) {
        const fallback = next.at(-1);
        onFileViewChange?.(fallback ? { path: fallback, scrollNonce: Date.now() } : null);
      }
      return next;
    });
  }, [fileView?.path, onFileViewChange]);

  const toggleFilesPref = useCallback((key: Exclude<keyof OfficialFilesViewPrefs, "tabSize">) => {
    setFilesPrefs((current) => {
      const nextValue = !current[key];
      writeOfficialFilesViewPref(key, nextValue);
      return { ...current, [key]: nextValue };
    });
  }, []);

  const setFilesTabSize = useCallback((tabSize: number) => {
    setFilesPrefs((current) => {
      writeOfficialFilesViewPref("tabSize", tabSize);
      return { ...current, tabSize };
    });
  }, []);

  const addTerminalTab = useCallback(() => {
    if (!sessionRef) return;
    officialEpitaxyTerminalTabsStore.getState().addTab(sessionRef.id);
  }, [sessionRef]);

  const selectTerminalTab = useCallback((tabId: string) => {
    if (!sessionRef) return;
    officialEpitaxyTerminalTabsStore.getState().setActive(sessionRef.id, tabId);
  }, [sessionRef]);

  const closeTerminalTab = useCallback((tabId: string) => {
    if (!sessionRef) return;
    officialEpitaxyTerminalTabsStore.getState().closeTab(sessionRef.id, tabId);
  }, [sessionRef]);

  const renameTerminalTab = useCallback((tabId: string, name: string) => {
    if (!sessionRef) return;
    officialEpitaxyTerminalTabsStore.getState().renameTab(sessionRef.id, tabId, name);
  }, [sessionRef]);

  const activeTerminalTab = terminalTabs.tabs.find((tab) => tab.id === terminalTabs.activeId) ?? terminalTabs.tabs[0];

  // Official c593f7513 yg tileWrap: flexGrow:1 / flexShrink:1 / flexBasis:0 / minWidth:280 / minHeight:100.
  const tileWrapStyle = useMemo<CSSProperties>(() => ({
    flexGrow: 1,
    flexShrink: 1,
    flexBasis: 0,
    minWidth: sidePaneMinWidth,
    minHeight: sidePaneMinHeight,
    position: "relative",
    overflow: "visible",
  }), []);

  return (
    <motion.div
      className="min-w-0 min-h-0 relative"
      data-entering={isEntering || undefined}
      initial={false}
      style={tileWrapStyle}
    >
      {/* Official iE renderTile shell around rE/FI. */}
      <div
        className="tiles-shell h-full w-full min-w-0 min-h-0 relative isolate rounded-r6"
        data-entering={isEntering || undefined}
        data-tile-host={activeView}
      >
        {/* Official FI / DI + Nn sidebar elevation */}
        <div
          className={`min-w-0 min-h-0 shrink-0 relative isolate flex flex-col rounded-r6 h-full${codeSurface ? " epitaxy-code-surface" : ""}`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
            data-surface="sidebar"
          />
          <div
            data-top-left={isTopLeft || undefined}
            className="relative flex items-center justify-between gap-g6 h-[32px] pl-[8px] pr-[4px] shrink-0"
          >
            <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
            <OfficialSidePaneTitle
              extraAfter={
                activeView === "preview" ? (
                  <>
                    <OfficialPreviewAddressBar />
                    <OfficialPreviewTrailingChrome
                      chrome={previewChrome}
                      paneSettings={chromeText.paneSettings.replace("{pane}", viewsText.preview)}
                    />
                  </>
                ) : null
              }
              activeView={activeView}
              session={session}
              sessionRef={sessionRef}
              terminalState={{
                activeTab: activeTerminalTab,
                diffCanFitTree,
                diffCompareMeta,
                diffShowTree,
                fileTabs,
                fileView,
                filesTreeShown,
                onActivateFileTab: activateFileTab,
                onCloseFileTab: closeFileTab,
                onDiffShowTreeChange: setDiffShowTree,
                onFocusFilesFilter: () => {
                  filesFilterRef.current?.focus();
                  filesFilterRef.current?.select();
                },
                onToggleFilesTree: () => setFilesTreeShown((shown) => !shown),
                onAddTab: addTerminalTab,
                subagentView,
                onCloseTab: closeTerminalTab,
                onRenameTab: renameTerminalTab,
                onSelectTab: selectTerminalTab,
                tabs: terminalTabs.tabs,
              }}
            />
            <div className="relative z-[1] flex items-center gap-g1 shrink-0 draggable-none">
              {activeView === "file" && sessionRef ? (
                <>
                  <OfficialButton
                    ariaLabel={chromeText.goToFileOrSearch}
                    icon="Search"
                    preferFont
                    tooltip={null}
                    onClick={() => {
                      if (!filesTreeShown) setFilesTreeShown(true);
                      const input = filesFilterRef.current;
                      if (input) {
                        input.focus();
                        input.select();
                      }
                    }}
                  />
                  <OfficialDropdownButton
                    align="end"
                    ariaLabel={chromeText.paneSettings.replace("{pane}", viewsText.files)}
                    tooltip={chromeText.paneSettings.replace("{pane}", viewsText.files)}
                    extraSections={[
                      {
                        items: [
                          { checked: filesPrefs.previewTabs, keepOpen: true, label: chromeText.previewTabs, onSelect: () => toggleFilesPref("previewTabs") },
                          { checked: filesPrefs.autoSave, keepOpen: true, label: chromeText.autoSave, onSelect: () => toggleFilesPref("autoSave") },
                          { checked: filesPrefs.tabIndents, keepOpen: true, label: chromeText.tabKeyIndents, onSelect: () => toggleFilesPref("tabIndents") },
                        ],
                      },
                      {
                        items: [
                          { checked: filesPrefs.wordWrap, keepOpen: true, label: chromeText.wordWrap, onSelect: () => toggleFilesPref("wordWrap") },
                          { checked: filesPrefs.indentGuides, keepOpen: true, label: chromeText.indentGuides, onSelect: () => toggleFilesPref("indentGuides") },
                          { checked: filesPrefs.showWhitespace, keepOpen: true, label: chromeText.showWhitespace, onSelect: () => toggleFilesPref("showWhitespace") },
                          { checked: filesPrefs.scrollPastEnd, keepOpen: true, label: chromeText.scrollPastEnd, onSelect: () => toggleFilesPref("scrollPastEnd") },
                          {
                            keepOpen: true,
                            label: chromeText.tabSize,
                            trailing: <span className="text-footnote text-t6 tabular-nums">{filesPrefs.tabSize}</span>,
                            items: OFFICIAL_FILES_TAB_SIZES.map((size) => ({
                              checked: filesPrefs.tabSize === size,
                              keepOpen: true,
                              label: String(size),
                              onSelect: () => setFilesTabSize(size),
                            })),
                          },
                        ],
                      },
                    ]}
                    icon="DotsVertical"
                    preferFont
                    items={[
                      {
                        checked: filesTreeShown,
                        keepOpen: true,
                        label: chromeText.showFileTree,
                        onSelect: () => setFilesTreeShown((shown) => !shown),
                      },
                    ]}
                    revealChevron="never"
                  />
                  {/* Session: c4db Xe WindowNew + Expand. Popout: shared-18 yx ArrowInSquare + hx Pin. */}
                  {onDock ? (
                    <OfficialButton
                      ariaLabel={chromeText.openInMainWindow}
                      icon="ArrowInSquare"
                      onClick={onDock}
                      preferFont
                      tooltipSide="bottom"
                      variant="ghost"
                    />
                  ) : onPopOut ? (
                    <OfficialButton
                      ariaLabel={chromeText.openInNewWindow}
                      icon="WindowNew"
                      onClick={onPopOut}
                      preferFont
                      tooltipSide="bottom"
                      variant="ghost"
                    />
                  ) : null}
                  {onTogglePopoutAlwaysOnTop ? (
                    <OfficialButton
                      ariaLabel={popoutAlwaysOnTop ? chromeText.stopKeepingWindowOnTop : chromeText.keepWindowOnTop}
                      icon={popoutAlwaysOnTop ? "PinFilled" : "Pin"}
                      onClick={onTogglePopoutAlwaysOnTop}
                      preferFont
                      pressed={popoutAlwaysOnTop}
                      tooltipSide="bottom"
                      variant="ghost"
                    />
                  ) : onToggleExpand ? (
                    <OfficialButton
                      ariaLabel={paneExpanded ? chromeText.collapsePane : chromeText.expandPane}
                      icon={paneExpanded ? "Collapse" : "Expand"}
                      onClick={onToggleExpand}
                      preferFont
                      pressed={paneExpanded}
                      tooltipSide="bottom"
                      variant="ghost"
                    />
                  ) : null}
                </>
              ) : null}
              {activeView === "preview" && onToggleExpand ? (
                <OfficialButton
                  ariaLabel={paneExpanded ? chromeText.collapsePane : chromeText.expandPane}
                  icon={paneExpanded ? "Collapse" : "Expand"}
                  onClick={onToggleExpand}
                  preferFont
                  pressed={paneExpanded}
                  tooltipSide="bottom"
                  variant="ghost"
                />
              ) : null}
              {activeView === "plan" ? (
                <OfficialPlanHeaderActions
                  bridge={bridge}
                  plan={plan}
                  session={session}
                  sessionRef={sessionRef}
                />
              ) : null}
              {hideCloseButton ? null : (
                <OfficialButton ariaLabel={sessionLoadText.close} icon="XCrossCloseMedium" onClick={onClose} />
              )}
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-b-r6">
            <ViewPaneBody
              activeTerminalTab={activeTerminalTab}
              activeView={activeView}
              bridge={bridge}
              diffShowTree={diffShowTree}
              fileView={fileView}
              landingCwd={landingCwd}
              filesFilterRef={filesFilterRef}
              filesTreeShown={filesTreeShown}
              filesWordWrap={filesPrefs.wordWrap}
              filesViewPrefs={filesPrefs}
              messages={messages}
              onClose={onClose}
              onDiffCanFitTreeChange={setDiffCanFitTree}
              onDiffCompareMetaChange={setDiffCompareMeta}
              previewTarget={previewTarget}
              renderSubagent={renderSubagent}
              session={session}
              sessionRef={sessionRef}
              subagentView={subagentView}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function officialViewPaneLabel(
  view: OfficialViewPane,
  text: Record<keyof typeof VIEWS_MENU_MESSAGES, string>,
) {
  if (view === "preview") return text.preview;
  if (view === "diff") return text.diff;
  if (view === "terminal") return text.terminal;
  if (view === "browser") return text.files;
  if (view === "tasks") return text.tasks;
  if (view === "plan") return text.plan;
  if (view === "file") return text.file;
  if (view === "subagent") return text.agent;
  if (view === "runs") return text.runs;
  return text.screen;
}

type TerminalTab = {
  id: string;
  name?: string;
  ordinal: number;
};

type TerminalTabsState = {
  activeId: string;
  nextId: number;
  tabs: TerminalTab[];
};

type TerminalTitleState = {
  activeTab?: TerminalTab;
  /** Official oN: Hide/Show files only when canFitTree (width >= 400). */
  diffCanFitTree?: boolean;
  /** Official oN: baseBranch → working tree / head */
  diffCompareMeta?: OfficialDiffCompareMeta | null;
  diffShowTree?: boolean;
  fileTabs?: string[];
  fileView?: OfficialFileViewTarget | null;
  /** Official mb `R` — files tree column visible. */
  filesTreeShown?: boolean;
  onActivateFileTab?: (path: string) => void;
  onCloseFileTab?: (path: string) => void;
  onDiffShowTreeChange?: (showTree: boolean) => void;
  onFocusFilesFilter?: () => void;
  onToggleFilesTree?: () => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, name: string) => void;
  onSelectTab: (tabId: string) => void;
  subagentView?: OfficialSubagentTarget | null;
  tabs: TerminalTab[];
};

export const defaultTerminalTabId = OFFICIAL_DEFAULT_TERMINAL_TAB_ID;

function terminalTabLabel(tab: TerminalTab | undefined, terminalWord: string, forceOrdinal = false) {
  if (!tab) return terminalWord;
  return tab.name ?? (forceOrdinal || tab.ordinal > 1 ? `${terminalWord} ${tab.ordinal}` : terminalWord);
}

export const terminalPtyKey = officialTerminalPtyKey;


function OfficialSidePaneTitle({
  activeView,
  extraAfter,
  session,
  sessionRef,
  terminalState,
}: {
  activeView: OfficialViewPane;
  extraAfter?: ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  terminalState?: TerminalTitleState;
}) {
  const viewsText = useI18nText(VIEWS_MENU_MESSAGES);
  const chromeText = useI18nText(SIDE_PANE_CHROME_MESSAGES);

  const previewChrome = useI18nText(PREVIEW_EMPTY_MESSAGES);

  if (activeView === "preview") {
    // Official cf580 `Ko`: one flex-1 row — Globe `jr` + address `ta` + tools `gap-1 shrink-0`.
    // FI trailing is only Close (`rbrahOGMC3`). Do not flatten Ko into the header flex.
    return (
      <div className="relative z-[1] flex min-w-0 flex-1 items-center overflow-hidden draggable-none">
        <OfficialPreviewGlobeMenu chrome={previewChrome} />
        {extraAfter}
      </div>
    );
  }

  if (activeView === "diff" && sessionRef) {
    // Official oN (c11959232): FolderOpenFront Hide/Show files only when canFitTree + base → head
    const baseLabel = terminalState?.diffCompareMeta?.base ?? "main";
    const headLabel = terminalState?.diffCompareMeta?.headLabel ?? "working tree";
    const canFitTree = terminalState?.diffCanFitTree ?? true;
    return (
      <div className="relative z-[1] flex items-center gap-g3 min-w-0 draggable-none">
        {canFitTree ? (
          <OfficialButton
            ariaLabel={terminalState?.diffShowTree ? chromeText.hideFiles : chromeText.showFiles}
            className="-ml-[4px]"
            icon="FolderOpenFront"
            onClick={() => terminalState?.onDiffShowTreeChange?.(!terminalState.diffShowTree)}
            pressed={terminalState?.diffShowTree}
          />
        ) : null}
        <span className="flex items-center gap-g3 text-body text-t6 min-w-0 -ml-[2px]">
          <span className="text-t7 truncate">{baseLabel}</span>
          <span className="text-t4">→</span>
          <span className="text-t7 truncate">{headLabel}</span>
        </span>
      </div>
    );
  }

  if (activeView === "terminal") {
    return <OfficialTerminalTitle terminalState={terminalState} />;
  }

  if (activeView === "file") {
    // Official rE VR "File" when QR is vN-only (`m||h` draft). Db tabs need session tree.
    if (!sessionRef) {
      return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{viewsText.file}</span>;
    }
    const treeShown = terminalState?.filesTreeShown !== false;
    return (
      <OfficialFilesHeaderTabs
        activePath={terminalState?.fileView?.path}
        closeFileLabel={chromeText.closeFile}
        filesLabel={viewsText.files}
        onActivate={(path) => terminalState?.onActivateFileTab?.(path)}
        onClose={(path) => terminalState?.onCloseFileTab?.(path)}
        onToggleTree={() => terminalState?.onToggleFilesTree?.()}
        tabs={terminalState?.fileTabs ?? []}
        treeShown={treeShown}
        treeTooltip={treeShown ? chromeText.hideFileTree : chromeText.showFileTree}
      />
    );
  }

  if (activeView === "subagent" && terminalState?.subagentView) {
    return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{terminalState.subagentView.description}</span>;
  }

  const label = activeView === "preview" && session?.title ? viewsText.preview : officialViewPaneLabel(activeView, viewsText);
  return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{label}</span>;
}

function OfficialTerminalTitle({ terminalState }: { terminalState?: TerminalTitleState }) {
  const viewsText = useI18nText(VIEWS_MENU_MESSAGES);
  const chromeText = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const activeTab = terminalState?.activeTab;
  const hasMultipleTabs = Boolean(terminalState && terminalState.tabs.length > 1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
  const tabWord = viewsText.terminal;
  const renameInputRef = useCallback((node: HTMLInputElement | null) => {
    if (!node) return;
    requestAnimationFrame(() => {
      node.focus();
      node.select();
    });
  }, []);
  const closeRename = useCallback(() => {
    setIsRenaming(false);
    if (terminalState && activeTab) terminalState.onRenameTab(activeTab.id, draftName.trim());
  }, [activeTab, draftName, terminalState]);
  const openRename = useCallback(() => {
    setDraftName(activeTab?.name ?? "");
    setIsRenaming(true);
  }, [activeTab?.name]);

  const tabItems: OfficialDropdownItem[] = terminalState?.tabs.map((tab) => ({
    checked: tab.id === activeTab?.id,
    label: terminalTabLabel(tab, tabWord, true),
    onSelect: () => terminalState.onSelectTab(tab.id),
    trailing: terminalState.tabs.length > 1 ? (
      <TerminalTabDeleteButton ariaLabel={chromeText.closeTerminal} onDelete={() => terminalState.onCloseTab(tab.id)} />
    ) : undefined,
  })) ?? [];
  const extraSections = terminalState ? [{
    items: [
      { label: chromeText.newTerminal, onSelect: terminalState.onAddTab },
      { label: chromeText.renameTerminal, onSelect: openRename },
    ],
  }] : undefined;

  if (isRenaming) {
    return (
      <input
        aria-label={chromeText.terminalName}
        className="h-small w-[200px] min-w-0 pl-p5 pr-p2 rounded-small bg-t1 text-footnote text-t8 outline-none ring-focus border-0"
        onBlur={closeRename}
        onChange={(event) => setDraftName(event.currentTarget.value)}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            event.preventDefault();
            closeRename();
          } else if (event.key === "Escape") {
            event.preventDefault();
            setIsRenaming(false);
          }
        }}
        ref={renameInputRef}
        value={draftName}
      />
    );
  }

  return (
    <div className="relative z-[1] flex items-center gap-g1 min-w-0 draggable-none">
      {hasMultipleTabs ? (
        <OfficialDropdownButton
          align="start"
          className="-ml-[5px]"
          extraSections={extraSections}
          header={chromeText.terminals}
          items={tabItems}
          label={terminalTabLabel(activeTab, tabWord, true)}
          mode="text"
          side="bottom"
        />
      ) : (
        <span className="text-body text-uncontained-default select-none truncate max-w-[200px] pl-[1px]">{terminalTabLabel(activeTab, tabWord)}</span>
      )}
      {hasMultipleTabs ? <span aria-hidden className="inline-block w-px h-[10px] rounded-full bg-t3 -ml-[2px] -mr-[2px]" /> : null}
      <OfficialButton ariaLabel={chromeText.newTerminal} className="w-[20px]" icon="PlusSmall" onClick={terminalState?.onAddTab} />
    </div>
  );
}

function TerminalTabDeleteButton({ ariaLabel, onDelete }: { ariaLabel: string; onDelete: () => void }) {
  return (
    <button
      aria-label={ariaLabel}
      className="ml-auto flex items-center justify-center size-[20px] shrink-0 rounded-r3 bg-transparent border-0 outline-none ring-focus text-t5 hover:text-[var(--core-red)] hover:bg-t2"
      onClick={(event) => {
        event.stopPropagation();
        onDelete();
      }}
      type="button"
    >
      <Icon name="TrashCanRound" size="sm" />
    </button>
  );
}

/**
 * Official eR (c11959232): plan side-pane header actions.
 * - yu(path) when Vf(local session): editorItems + extraItems (Show in Finder/Explorer)
 * - Ou Folder1Open "Open in…" when either list non-empty
 * - yd Copy plan / Copied
 */
function OfficialPlanHeaderActions({
  bridge,
  plan,
  session,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  plan: { content?: string; path?: string };
  session: SessionSummary | null;
  sessionRef?: EpitaxySessionRef | null;
}) {
  const [copied, setCopied] = useState(false);
  const folderText = useI18nText(SHOW_IN_FOLDER_MESSAGES);
  // Official Vf(sessionRef): only local sessions expose filesystem open path.
  const isLocal = sessionRef?.type === "local" || session?.kind === "code";
  const openPath = isLocal && plan.path ? resolvePlanOpenPath(plan.path, session) : undefined;
  const canOpenInEditor = Boolean(openPath && bridge.openInEditor);
  const canShowInFolder = Boolean(openPath && desktopBridge.FileSystem.showInFolder);
  // Official yu: editorItems under header "Open in…"; showInFolder as extraItems.
  const editorItems: OfficialDropdownItem[] = canOpenInEditor
    ? [
        {
          icon: "Folder1Open",
          label: "Default editor",
          onSelect: () => {
            if (openPath) void bridge.openInEditor?.(openPath);
          },
        },
      ]
    : [];
  const extraItems: OfficialDropdownItem[] = canShowInFolder
    ? [
        {
          label: officialShowInFolderLabel(folderText),
          onSelect: () => {
            if (openPath) void desktopBridge.FileSystem.showInFolder?.(openPath);
          },
        },
      ]
    : [];
  const hasOpenIn = editorItems.length > 0 || extraItems.length > 0;
  const openInHeader = editorItems.length > 0 ? "Open in…" : undefined;

  if (!plan.content) return null;
  return (
    <>
      {hasOpenIn ? (
        <OfficialDropdownButton
          align="end"
          ariaLabel="Open in…"
          extraSections={extraItems.length > 0 ? [{ items: extraItems }] : undefined}
          header={openInHeader}
          icon="Folder1Open"
          items={editorItems}
          revealChevron="never"
        />
      ) : null}
      <OfficialButton
        ariaLabel={copied ? "Copied" : "Copy plan"}
        icon={copied ? "CheckSelection" : "CopySquareBehind"}
        onClick={() => {
          void navigator.clipboard.writeText(plan.content ?? "").then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1600);
          }).catch(() => {});
        }}
      />
    </>
  );
}

/** Official ca80 `ES.DEFAULT` tree width; cccc `lb = _o.DEFAULT+160` can-fit. */
const OFFICIAL_FILES_TREE_WIDTH = 240;
const OFFICIAL_FILES_TREE_CAN_FIT = OFFICIAL_FILES_TREE_WIDTH + 160;

function OfficialFilesSplitBody({
  bridge,
  fileView,
  filesFilterRef,
  filesTreeShown,
  filesWordWrap,
  filesViewPrefs,
  session,
  sessionRef,
}: {
  bridge: LocalSessionsBridge;
  fileView: OfficialFileViewTarget | null;
  filesFilterRef?: Ref<HTMLInputElement>;
  filesTreeShown: boolean;
  filesWordWrap: boolean;
  filesViewPrefs?: OfficialFilesViewPrefs;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  const chromeText = useI18nText(SIDE_PANE_CHROME_MESSAGES);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [filesTreeCanFit, setFilesTreeCanFit] = useState(true);
  const hasOpenFile = Boolean(fileView?.path);
  // Official mb: L = canFit && (no file || keep-tab). Empty+canFit → `db` 240 + Fl Od. Empty+!canFit → tree flex-1.
  const treeFixed = filesTreeShown && filesTreeCanFit;
  const showEmptyPane = !hasOpenFile && (!filesTreeShown || filesTreeCanFit);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    const measure = (width: number) => {
      if (width <= 0) return;
      setFilesTreeCanFit(width >= OFFICIAL_FILES_TREE_CAN_FIT);
    };
    measure(el.clientWidth);
    const observer = new ResizeObserver((entries) => {
      measure(entries[0]?.contentRect.width ?? 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={bodyRef} className="@container/files-body flex h-full min-h-0 flex-1">
      {filesTreeShown ? (
        <div
          className={treeFixed
            ? hasOpenFile
              ? "relative flex min-h-0 shrink-0 flex-col border-r @max-[400px]/files-body:hidden"
              : "relative flex min-h-0 shrink-0 flex-col border-r"
            : "relative flex min-h-0 min-w-0 flex-1 flex-col"}
          data-files-tree=""
          data-pane-line=""
          style={treeFixed ? { width: OFFICIAL_FILES_TREE_WIDTH, minWidth: 160, maxWidth: "50%" } : undefined}
        >
          <OfficialFilesBrowserPane
            filterInputRef={filesFilterRef}
            onOpenFile={(target) => actions?.openFile(target)}
            session={session}
            sessionRef={sessionRef}
          />
        </div>
      ) : null}
      {hasOpenFile || showEmptyPane ? (
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {fileView?.path ? (
          <OfficialFilePane
            bridge={bridge}
            fileView={fileView}
            sessionRef={sessionRef}
            viewPrefs={filesViewPrefs}
            wordWrap={filesWordWrap}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-md px-lg py-lg text-center">
            <Icon name="Folder" className="!size-7 text-muted" size="lg" />
            <div className="flex flex-col items-center gap-1">
              <p className="max-w-[36ch] text-pretty break-words text-body text-primary">{chromeText.openFilesAppearHere}</p>
              <p className="max-w-[36ch] text-pretty break-words text-footnote text-muted">
                {filesTreeShown ? chromeText.pickFileInTree : chromeText.clickFilePathInConversation}
              </p>
            </div>
          </div>
        )}
      </div>
      ) : null}
    </div>
  );
}

function ViewPaneBody({
  activeTerminalTab,
  activeView,
  bridge,
  diffShowTree,
  fileView,
  landingCwd,
  filesFilterRef,
  filesTreeShown = true,
  filesWordWrap = true,
  filesViewPrefs,
  messages,
  onDiffCanFitTreeChange,
  onDiffCompareMetaChange,
  onClose,
  previewTarget,
  renderSubagent,
  session,
  sessionRef,
  subagentView,
}: {
  activeTerminalTab?: TerminalTab;
  activeView: OfficialViewPane;
  bridge: LocalSessionsBridge;
  diffShowTree: boolean;
  fileView: OfficialFileViewTarget | null;
  landingCwd?: string | null;
  filesFilterRef?: Ref<HTMLInputElement>;
  filesTreeShown?: boolean;
  filesWordWrap?: boolean;
  filesViewPrefs?: OfficialFilesViewPrefs;
  /** Official oe(sessionId) message list for CR/Jp/plan. */
  messages: ChatMessage[];
  onClose?: () => void;
  onDiffCanFitTreeChange?: (canFit: boolean) => void;
  onDiffCompareMetaChange?: (meta: OfficialDiffCompareMeta) => void;
  previewTarget: OfficialPreviewTarget | null;
  renderSubagent?: (subagentView: OfficialSubagentTarget) => ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  subagentView: OfficialSubagentTarget | null;
}) {
  const actions = useContext(EpitaxyTranscriptActionContext);
  switch (activeView) {
    case "preview":
      return <OfficialPreviewPane bridge={bridge} landingCwd={landingCwd} previewTarget={previewTarget} session={session} sessionRef={sessionRef} />;
    case "file":
      // Official QR: "file"===e&&u&&(m||h) → vN({sessionRef:m,landingCwd:h}). Draft has no tree.
      if (!sessionRef) {
        return fileView ? (
          <OfficialFilePane
            bridge={bridge}
            fileView={fileView}
            landingCwd={landingCwd}
            sessionRef={null}
            viewPrefs={filesViewPrefs}
            wordWrap={filesWordWrap}
          />
        ) : null;
      }
      return (
        <OfficialFilesSplitBody
          bridge={bridge}
          fileView={fileView}
          filesFilterRef={filesFilterRef}
          filesTreeShown={filesTreeShown}
          filesWordWrap={filesWordWrap}
          filesViewPrefs={filesViewPrefs}
          session={session}
          sessionRef={sessionRef}
        />
      );
    case "diff":
      return sessionRef ? (
        <OfficialDiffPane
          bridge={bridge}
          onCanFitTreeChange={onDiffCanFitTreeChange}
          onCompareMetaChange={onDiffCompareMetaChange}
          session={session}
          sessionRef={sessionRef}
          showTree={diffShowTree}
        />
      ) : null;
    case "terminal":
      // Official ShellTerminal onTerminalSelection → Ask about this → attachAsContext.
      return sessionRef ? (
        <OfficialShellPtyPane
          bridge={bridge}
          onTerminalSelection={actions?.attachAsContext}
          onPtyReady={() => {
            // Official BR: read Ms.getState() here — ViewPaneBody must not close over
            // the parent `terminalTabs` binding (that identifier is tile-local).
            const tabId = activeTerminalTab?.id ?? defaultTerminalTabId;
            const pendingCd = officialTerminalTabsForSession(sessionRef.id).tabs
              .find((tab) => tab.id === tabId)?.pendingCd;
            if (pendingCd) {
              void bridge.writeShellPty?.(
                terminalPtyKey(sessionRef.id, tabId),
                officialPtyCdCommand(pendingCd),
              );
              officialEpitaxyTerminalTabsStore.getState().clearPendingCd(sessionRef.id, tabId);
            }
            if (tabId === defaultTerminalTabId) {
              officialEpitaxyShellRunStore.getState().markDefaultTabReady(sessionRef.id);
              officialFlushPendingShellCommand(sessionRef.id, (ptyKey, data) => {
                void bridge.writeShellPty?.(ptyKey, data);
              });
            }
          }}
          ptyKey={terminalPtyKey(sessionRef.id, activeTerminalTab?.id ?? defaultTerminalTabId)}
          sessionRef={sessionRef}
        />
      ) : null;
    case "browser":
      // Official XC Files browser — open file via host setFileView + sidePane("file").
      return sessionRef ? (
        <OfficialFilesBrowserPane
          onOpenFile={(target) => actions?.openFile(target)}
          session={session}
          sessionRef={sessionRef}
        />
      ) : null;
    case "tasks":
      // Official zR({sessionRef}) → Jp(sessionId) over oe(sessionId), not a messages prop.
      return sessionRef ? (
        <OfficialTasksPane
          actions={actions}
          bridge={bridge}
          session={session}
          sessionRef={sessionRef}
        />
      ) : null;
    case "plan":
      // Official ZN({sessionRef}) → XN(sessionRef) over oe(sessionId).
      return sessionRef ? <OfficialPlanPane session={session} sessionRef={sessionRef} /> : null;
    case "subagent":
      // Official CR({sessionRef, toolUseId}): n=oe(sessionId) full list, not session.messages.
      // Host (tile) renders OfficialSubagentPane — message entry components still live there.
      return sessionRef && subagentView ? (renderSubagent?.(subagentView) ?? null) : null;
    case "runs":
      // Official QS: remote → PS, local → DS.
      return sessionRef ? (
        <OfficialRunsPane
          onNavigate={actions?.onNavigate}
          session={session}
          sessionRef={sessionRef}
        />
      ) : null;
    case "framebuffer":
      // Official AN EpitaxyFramebufferPane.
      return <OfficialFramebufferPane landingCwd={landingCwd} session={session} sessionRef={sessionRef} />;
  }
}
