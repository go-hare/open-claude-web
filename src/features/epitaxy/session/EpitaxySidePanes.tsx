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
} from "react";
import { motion, useReducedMotion } from "motion/react";
import { desktopBridge, type LocalSessionsBridge, type SessionSummary, type ChatMessage } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  OfficialDropdownButton,
  type OfficialDropdownItem,
  type OfficialViewPane,
} from "../OfficialEpitaxyComponents";
import { OfficialDiffPane, type OfficialDiffCompareMeta } from "../OfficialDiffPane";
import { OfficialFilePane, type OfficialFileViewTarget } from "./OfficialFilePane";
import { OfficialFilesBrowserPane } from "./OfficialFilesBrowserPane";
import { OfficialPlanPane } from "./OfficialPlanPane";
import { OfficialPreviewPane, type OfficialPreviewTarget } from "./OfficialPreviewPane";
import { OfficialFramebufferPane } from "./OfficialFramebufferPane";
import { OfficialRunsPane } from "./OfficialRunsPane";
import { OfficialShellPtyPane } from "./OfficialShellPtyPane";
import { OfficialTasksPane } from "./OfficialTasksPane";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import { officialShowInFolderLabel } from "./officialFilePreviewUtils";
import { parseOfficialPlan, resolvePlanOpenPath } from "./officialTasksAndPlan";
import {
  EpitaxyTranscriptActionContext,
  type EpitaxySessionRef,
  type OfficialSubagentTarget,
} from "./epitaxyTranscriptActionContext";

export const sidePaneMinWidth = 100;
const sidePaneResizeStep = 24;
const sidePaneResizeHandleSize = 12;
/** Official ur: chat flex 2 vs side flex 1 → side ≈ 1/3 until resized. */
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
 * First open (empty→single) is row with chat — not stack enter. Stack open (plan→file) marks file.
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
    // empty prev → first side open: no stack enter (matches product first-open row with chat).
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

export function EpitaxySidePaneColumn({
  fileView,
  isTopLeft,
  messages,
  onCloseAll,
  onCloseTile,
  onSidePaneWidthChange,
  previewTarget,
  renderSubagent,
  session,
  sessionRef,
  sidePaneWidth,
  sideTiles,
  subagentView,
}: {
  fileView: OfficialFileViewTarget | null;
  isTopLeft?: boolean;
  messages: ChatMessage[];
  onCloseAll: () => void;
  onCloseTile: (view: OfficialViewPane) => void;
  onSidePaneWidthChange: (width: number) => void;
  previewTarget: OfficialPreviewTarget | null;
  renderSubagent?: (subagentView: OfficialSubagentTarget) => ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  sidePaneWidth?: number;
  sideTiles: OfficialViewPane[];
  subagentView: OfficialSubagentTarget | null;
}) {
  const columnRef = useRef<HTMLDivElement | null>(null);
  const resizeCleanupRef = useRef<(() => void) | null>(null);
  const [isResizingSidePane, setIsResizingSidePane] = useState(false);
  const enteringIds = useOfficialSideTileEnteringIds(sideTiles);
  const ariaValueNow = sidePaneWidthToAriaValue(sidePaneWidth);
  // Official YI tile wrap: flexGrow / flexShrink:1 / flexBasis:0 until user resizes to a fixed width.
  // Column of FI tiles: official stack gap=12 between tasks/subagent (nE.gap).
  const sidePaneStyle = useMemo<CSSProperties>(() => {
    if (sidePaneWidth === undefined) {
      return {
        height: "100%",
        minWidth: sidePaneMinWidth,
        flexGrow: sidePaneDefaultFlex,
        flexShrink: 1,
        flexBasis: 0,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 0,
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
    };
  }, [sidePaneWidth]);
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

  // Outer is the flex sibling of chat (parent gap:12). Resize handle overlays the gap, official-style.
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
      {sideTiles.map((tile, index) => (
        <EpitaxySidePaneTile
          key={tile}
          activeView={tile}
          fileView={fileView}
          isEntering={enteringIds.has(tile)}
          isTopLeft={isTopLeft && index === 0}
          messages={messages}
          onClose={() => (sideTiles.length === 1 ? onCloseAll() : onCloseTile(tile))}
          previewTarget={previewTarget}
          renderSubagent={renderSubagent}
          session={session}
          sessionRef={sessionRef}
          subagentView={subagentView}
        />
      ))}
    </div>
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
  messages,
  onClose,
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
  /** Official oe(sessionId) — full hydrated transcript, not sparse session.messages. */
  messages: ChatMessage[];
  onClose: () => void;
  previewTarget: OfficialPreviewTarget | null;
  renderSubagent?: (subagentView: OfficialSubagentTarget) => ReactNode;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef | null;
  subagentView: OfficialSubagentTarget | null;
}) {
  const codeSurface = activeView === "terminal" || activeView === "diff" || activeView === "file";
  const bridge = desktopBridge.LocalSessions;
  // Official Lr (ca0135bc5): diffShowTree:!1 — tree off until user clicks Show files.
  const [diffShowTree, setDiffShowTree] = useState(false);
  // Official oN: diffCanFitTree[repoKey] ?? true — Hide/Show files only when d (canFitTree).
  const [diffCanFitTree, setDiffCanFitTree] = useState(true);
  const [diffCompareMeta, setDiffCompareMeta] = useState<OfficialDiffCompareMeta | null>(null);
  const [terminalTabs, setTerminalTabs] = useState<TerminalTabsState>(() => createDefaultTerminalTabs());
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
    setTerminalTabs(createDefaultTerminalTabs());
    setDiffCompareMeta(null);
    setDiffCanFitTree(true);
  }, [sessionRef?.id]);

  const addTerminalTab = useCallback(() => {
    setTerminalTabs((current) => {
      const id = String(current.nextId);
      const tab = { id, ordinal: current.nextId + 1 };
      return {
        activeId: id,
        nextId: current.nextId + 1,
        tabs: [...current.tabs, tab],
      };
    });
  }, []);

  const selectTerminalTab = useCallback((tabId: string) => {
    setTerminalTabs((current) => current.activeId === tabId ? current : { ...current, activeId: tabId });
  }, []);

  const closeTerminalTab = useCallback((tabId: string) => {
    if (sessionRef) void bridge.stopShellPty?.(terminalPtyKey(sessionRef.id, tabId));
    setTerminalTabs((current) => {
      const index = current.tabs.findIndex((tab) => tab.id === tabId);
      if (index < 0) return current;
      const tabs = current.tabs.filter((tab) => tab.id !== tabId);
      if (tabs.length === 0) return createDefaultTerminalTabs();
      const activeId = current.activeId === tabId ? tabs[Math.min(index, tabs.length - 1)]?.id ?? tabs[0].id : current.activeId;
      return { ...current, activeId, tabs };
    });
  }, [bridge, sessionRef]);

  const renameTerminalTab = useCallback((tabId: string, name: string) => {
    setTerminalTabs((current) => ({
      ...current,
      tabs: current.tabs.map((tab) => tab.id === tabId ? { ...tab, name: name || undefined } : tab),
    }));
  }, []);

  const activeTerminalTab = terminalTabs.tabs.find((tab) => tab.id === terminalTabs.activeId) ?? terminalTabs.tabs[0];

  // Official YI tileWrap: flexGrow motion / flexShrink:1 / flexBasis:0 / minSize; N=enter|exit → min 0.
  // isEntering: flexGrow animates 0→1 ($I); shell absolute so plan keeps column share while file grows below.
  // flexGrow lives only on motion animate (not style) so initial 0 is not clobbered by style.flexGrow:1.
  const tileWrapStyle = useMemo<CSSProperties>(() => ({
    flexShrink: 1,
    flexBasis: 0,
    minWidth: isEntering ? 0 : sidePaneMinWidth,
    minHeight: isEntering ? 0 : sidePaneMinWidth,
    position: "relative",
    overflow: "visible",
  }), [isEntering]);

  // Official YI shell while entering/exiting: absolute fill of the growing wrap (data-entering).
  // Official: top/bottom/left + translateZ(2) zIndex 2 (right open so width follows wrap growth).
  const tileShellStyle = useMemo<CSSProperties | undefined>(() => {
    if (!isEntering) return undefined;
    return {
      position: "absolute",
      top: 0,
      bottom: 0,
      left: 0,
      transform: "translateZ(2px)",
      zIndex: 2,
    };
  }, [isEntering]);

  // Official split (c119):
  // - YI tile wrap: flexGrow/Shrink/Basis (column stack sizing) — may animate enter
  // - iE shell: h-full w-full min-w-0 relative isolate rounded-r6
  // - FI (DI): "min-w-0 shrink-0 relative isolate flex flex-col rounded-r6" + optional epitaxy-code-surface
  // - Nn({elevation:"sidebar"}) ≡ bg-surface-primary-elevated effect-primary-elevated (1px ring via box-shadow)
  // CRITICAL: FI outer must NOT overflow:hidden — that clips effect-primary-elevated outer ring.
  // Only body uses overflow-hidden rounded-b-r6 (official FI).
  return (
    <motion.div
      className="min-w-0 min-h-0 relative"
      data-entering={isEntering || undefined}
      initial={reduceMotion || !isEntering ? false : { flexGrow: 0 }}
      animate={{ flexGrow: 1 }}
      transition={reduceMotion ? { duration: 0 } : officialTileEnterTransition}
      style={tileWrapStyle}
    >
      {/* Official iE renderTile shell around rE/FI — absolute while YI entering. */}
      <div
        className="tiles-shell h-full w-full min-w-0 relative isolate rounded-r6"
        data-entering={isEntering || undefined}
        style={tileShellStyle}
      >
        {/* Official FI / DI + Nn sidebar elevation */}
        <div
          className={`min-w-0 shrink-0 relative isolate flex flex-col rounded-r6 h-full${codeSurface ? " epitaxy-code-surface" : ""}`}
        >
          <div
            aria-hidden="true"
            className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
            data-surface="sidebar"
          />
          <div data-top-left={isTopLeft || undefined} className="relative flex items-center justify-between gap-g6 h-[32px] pl-[8px] pr-[4px] shrink-0">
            <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
            {renderSidePaneTitle(activeView, session, sessionRef, {
              activeTab: activeTerminalTab,
              diffCanFitTree,
              diffCompareMeta,
              diffShowTree,
              fileView,
              onDiffShowTreeChange: setDiffShowTree,
              onAddTab: addTerminalTab,
              subagentView,
              onCloseTab: closeTerminalTab,
              onRenameTab: renameTerminalTab,
              onSelectTab: selectTerminalTab,
              tabs: terminalTabs.tabs,
            })}
            <div className="relative z-[1] flex items-center gap-g1 shrink-0 draggable-none">
              {activeView === "plan" ? (
                <OfficialPlanHeaderActions
                  bridge={bridge}
                  plan={plan}
                  session={session}
                  sessionRef={sessionRef}
                />
              ) : null}
              <OfficialButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-hidden rounded-b-r6">
            <ViewPaneBody
              activeTerminalTab={activeTerminalTab}
              activeView={activeView}
              bridge={bridge}
              diffShowTree={diffShowTree}
              fileView={fileView}
              messages={messages}
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

const viewPaneConfig: Record<OfficialViewPane, { icon: string; label: string }> = {
  preview: { icon: "Play", label: "预览" },
  diff: { icon: "ChangesDiffPlusMinusBox", label: "Diff" },
  terminal: { icon: "TerminalOpenCommandLine", label: "Terminal" },
  // Official YR: Files (browser / XC), Runs (QS), Screen (framebuffer / AN).
  browser: { icon: "Folder1", label: "Files" },
  tasks: { icon: "Blocks", label: "任务" },
  plan: { icon: "CheckList", label: "Plan" },
  file: { icon: "NoteSquareLines", label: "File" },
  subagent: { icon: "Agent", label: "Agent" },
  runs: { icon: "ClockTimeslot", label: "Runs" },
  framebuffer: { icon: "SystemComputerLaptopMacbook", label: "Screen" },
};

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
  fileView?: OfficialFileViewTarget | null;
  onDiffShowTreeChange?: (showTree: boolean) => void;
  onAddTab: () => void;
  onCloseTab: (tabId: string) => void;
  onRenameTab: (tabId: string, name: string) => void;
  onSelectTab: (tabId: string) => void;
  subagentView?: OfficialSubagentTarget | null;
  tabs: TerminalTab[];
};

export const defaultTerminalTabId = "0";

export function createDefaultTerminalTabs(): TerminalTabsState {
  return { activeId: defaultTerminalTabId, nextId: 1, tabs: [{ id: defaultTerminalTabId, ordinal: 1 }] };
}

function terminalTabLabel(tab: TerminalTab | undefined, forceOrdinal = false) {
  if (!tab) return "Terminal";
  return tab.name ?? (forceOrdinal || tab.ordinal > 1 ? `Terminal ${tab.ordinal}` : "Terminal");
}

export function terminalPtyKey(sessionId: string, tabId: string) {
  return tabId === defaultTerminalTabId ? sessionId : `${sessionId}::${tabId}`;
}

function renderSidePaneTitle(activeView: OfficialViewPane, session: SessionSummary | null, sessionRef: EpitaxySessionRef | null, terminalState?: TerminalTitleState) {
  if (activeView === "preview" && sessionRef?.type === "local") {
    return (
      <div className="relative z-[1] flex items-center gap-g3 min-w-0 draggable-none">
        <OfficialDropdownButton
          align="start"
          className="-ml-[5px]"
          header="Servers"
          label="预览"
          mode="text"
          side="bottom"
        />
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
            ariaLabel={terminalState?.diffShowTree ? "Hide files" : "Show files"}
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
    // Official rE title for file: VR(m,"file") → formatMessage "File" (not basename + icon).
    // Path lives in vN epitaxy-pane-subheader, not the 32px tile chrome.
    return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">File</span>;
  }

  if (activeView === "subagent" && terminalState?.subagentView) {
    return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{terminalState.subagentView.description}</span>;
  }

  const label = activeView === "preview" && session?.title ? "预览" : viewPaneConfig[activeView].label;
  return <span className="text-body text-t7 select-none truncate draggable-none pl-[1px] relative z-[1]">{label}</span>;
}

function OfficialTerminalTitle({ terminalState }: { terminalState?: TerminalTitleState }) {
  const activeTab = terminalState?.activeTab;
  const hasMultipleTabs = Boolean(terminalState && terminalState.tabs.length > 1);
  const [isRenaming, setIsRenaming] = useState(false);
  const [draftName, setDraftName] = useState("");
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
    label: terminalTabLabel(tab, true),
    onSelect: () => terminalState.onSelectTab(tab.id),
    trailing: terminalState.tabs.length > 1 ? (
      <TerminalTabDeleteButton ariaLabel={`Close ${terminalTabLabel(tab, true)}`} onDelete={() => terminalState.onCloseTab(tab.id)} />
    ) : undefined,
  })) ?? [];
  const extraSections = terminalState ? [{
    items: [
      { label: "New terminal", onSelect: terminalState.onAddTab },
      { label: "Rename terminal", onSelect: openRename },
    ],
  }] : undefined;

  if (isRenaming) {
    return (
      <input
        aria-label="Terminal name"
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
          header="Terminals"
          items={tabItems}
          label={terminalTabLabel(activeTab, true)}
          mode="text"
          side="bottom"
        />
      ) : (
        <span className="text-body text-uncontained-default select-none truncate max-w-[200px] pl-[1px]">{terminalTabLabel(activeTab)}</span>
      )}
      {hasMultipleTabs ? <span aria-hidden className="inline-block w-px h-[10px] rounded-full bg-t3 -ml-[2px] -mr-[2px]" /> : null}
      <OfficialButton ariaLabel="New terminal" className="w-[20px]" icon="PlusSmall" onClick={terminalState?.onAddTab} />
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
          label: officialShowInFolderLabel(),
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

function ViewPaneBody({
  activeTerminalTab,
  activeView,
  bridge,
  diffShowTree,
  fileView,
  messages,
  onDiffCanFitTreeChange,
  onDiffCompareMetaChange,
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
  /** Official oe(sessionId) message list for CR/Jp/plan. */
  messages: ChatMessage[];
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
      return <OfficialPreviewPane bridge={bridge} previewTarget={previewTarget} session={session} sessionRef={sessionRef} />;
    case "file":
      return <OfficialFilePane bridge={bridge} fileView={fileView} sessionRef={sessionRef} />;
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
      return <OfficialFramebufferPane session={session} sessionRef={sessionRef} />;
  }
}
