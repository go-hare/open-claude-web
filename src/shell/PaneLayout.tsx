import { useCallback, useEffect, useMemo, useRef, type CSSProperties, type ReactNode } from "react";
import type { AppRoute } from "../app/routes";
import { EpitaxySessionTile } from "../features/epitaxy/EpitaxySessionTile";
import { CoworkSessionTile } from "../features/cowork/session/CoworkSessionTile";
import type { FrameMode } from "../stores/frameStore";
import { paneRefFromPath, paneRefKey, paneStore, usePaneStoreSnapshot, type PaneSlot } from "../stores/paneStore";
import { PaneResizeHandles, useCommandHeldAttribute, usePaneDrag, usePaneKeyboard, usePaneSplitBounds } from "./PaneControls";
import { PrimaryPaneMenu } from "./PaneHeaderActions";

type PaneLayoutProps = {
  children: ReactNode;
  currentRoute: AppRoute;
  mode: FrameMode;
  onNavigate: (path: string) => void;
};

type OpenPaneEvent = CustomEvent<{ path: string; title?: string | null; slot?: PaneSlot }>;

export function PaneLayout({ children, currentRoute, mode, onNavigate }: PaneLayoutProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const snapshot = usePaneLayoutSnapshot(mode);
  const currentRef = paneRefFromPath(window.location.pathname, currentRoute.title);
  const currentKey = currentRef ? paneRefKey(currentRef) : "";
  const slots = snapshot.extraPanes.map((pane) => pane.slot);
  const slotSet = useMemo(() => new Set(slots), [slots]);
  const hasSplit = snapshot.extraPanes.length > 0;
  const focusedIndex = Math.min(snapshot.focusedIndex, snapshot.extraPanes.length);
  const showColResize = slotSet.has("tr") || (slotSet.has("bl") && slotSet.has("br"));
  const showRowResize = slotSet.has("bl") || slotSet.has("br");
  const paneStyle = useMemo(() => ({
    "--df-pane-col": String(snapshot.colSplit),
    "--df-pane-row": String(snapshot.rowSplit),
  }) as CSSProperties, [snapshot.colSplit, snapshot.rowSplit]);

  usePaneStoreEvents(mode, currentKey);
  usePaneKeyboard(mode, onNavigate);
  useCommandHeldAttribute(hostRef);
  usePaneSplitBounds(hostRef);

  const isSessionRoute = currentRoute.id === "code-session" || currentRoute.id === "cowork-session";
  const contentClassName = isSessionRoute
    ? "flex-1 min-h-0 relative flex flex-col overflow-hidden"
    : "flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto";
  const focusPane = useCallback((paneIndex: number) => paneStore.setFocusedIndex(mode, paneIndex), [mode]);
  const closePane = useCallback((paneIndex: number) => paneStore.closePane(mode, paneIndex), [mode]);
  const primaryDrag = usePaneDrag(0, mode, onNavigate);

  return (
    <div
      ref={hostRef}
      className="dframe-pane-host flex-1 min-h-0 relative isolate"
      data-first-slot={snapshot.extraPanes[0]?.slot}
      data-pane-count={1 + snapshot.extraPanes.length}
      data-slots={slots.join(" ") || undefined}
      data-split={hasSplit || undefined}
      style={paneStyle}
    >
      <section
        aria-current={hasSplit && focusedIndex === 0 ? "true" : undefined}
        aria-label="Primary pane"
        className="dframe-pane dframe-pane-primary min-w-0 relative flex flex-col"
        data-focused={(hasSplit && focusedIndex === 0) || undefined}
        onFocusCapture={() => focusPane(0)}
        onPointerDown={hasSplit ? primaryDrag.onPointerDown : undefined}
        onPointerDownCapture={() => focusPane(0)}
        role="region"
      >
        <FrameHeader currentKey={currentKey} currentRoute={currentRoute} mode={mode} />
        <div className={contentClassName}>
          {children}
        </div>
      </section>
      {snapshot.extraPanes.map((pane, index) => {
        const paneIndex = index + 1;
        return (
          <ExtraPane
            focused={focusedIndex === paneIndex}
            key={paneRefKey(pane.ref)}
            mode={mode}
            onClose={() => closePane(paneIndex)}
            onFocus={() => focusPane(paneIndex)}
            isLonePane={snapshot.extraPanes.length === 1}
            onNavigate={onNavigate}
            paneIndex={paneIndex}
            refKind={pane.ref.kind}
            refId={pane.ref.id}
            slot={pane.slot}
          />
        );
      })}
      <PaneResizeHandles hostRef={hostRef} showCol={showColResize} showRow={showRowResize} />
    </div>
  );
}

function FrameHeader({ currentKey, currentRoute, mode }: { currentKey: string; currentRoute: AppRoute; mode: FrameMode }) {
  const currentRef = paneRefFromPath(window.location.pathname, currentRoute.title);
  if (currentRoute.id === "code-session" || currentRoute.id === "cowork-session") return null;
  const isNewSessionHome = currentRoute.id === "code-home" || currentRoute.id === "cowork-home";
  const openSplit = () => {
    if (currentRef) paneStore.addPane(mode, currentKey, currentRef);
  };
  return (
    <header className="dframe-header h-12 shrink-0 relative isolate z-10">
      <div className="dframe-pane-header flex h-full items-center gap-2 pl-6 pr-3">
        {!isNewSessionHome ? (
          <div className="flex items-center gap-1 max-w-[480px] min-w-0">
            <div className="text-[13px] text-text-300 truncate min-w-0">{currentRoute.title}</div>
          </div>
        ) : null}
        <div id="dframe-header-slot" className="flex items-center gap-2 min-w-0" />
        <div className="draggable h-full flex-1 min-w-0" />
        {!isNewSessionHome ? (
          <div id="dframe-pane-actions" className="dframe-pane-actions flex items-center gap-2 shrink-0">
            <PrimaryPaneMenu canOpenSplit={currentRef?.kind === "code" && mode === "code"} onOpenSplit={openSplit} />
          </div>
        ) : null}
      </div>
    </header>
  );
}

function usePaneLayoutSnapshot(mode: FrameMode) {
  const state = usePaneStoreSnapshot();
  return {
    colSplit: state.colSplit,
    extraPanes: state.extraPanesByMode[mode] ?? [],
    focusedIndex: Math.min(state.focusedIndex, state.extraPanesByMode[mode]?.length ?? 0),
    rowSplit: state.rowSplit,
  };
}

function usePaneStoreEvents(mode: FrameMode, currentKey: string) {
  useEffect(() => {
    const onOpenPane = (event: Event) => {
      const detail = (event as OpenPaneEvent).detail;
      const ref = paneRefFromPath(detail.path, detail.title);
      if (ref) paneStore.addPane(mode, currentKey, ref, detail.slot);
    };
    window.addEventListener("dframe:open-pane", onOpenPane);
    return () => window.removeEventListener("dframe:open-pane", onOpenPane);
  }, [currentKey, mode]);
}

function ExtraPane({ focused, isLonePane, mode, onClose, onFocus, onNavigate, paneIndex, refId, refKind, slot }: {
  focused: boolean;
  isLonePane: boolean;
  mode: FrameMode;
  onClose: () => void;
  onFocus: () => void;
  onNavigate: (path: string) => void;
  paneIndex: number;
  refId: string;
  refKind: "code" | "cowork";
  slot: PaneSlot;
}) {
  const drag = usePaneDrag(paneIndex, mode, onNavigate);
  const SessionTile = refKind === "cowork" ? CoworkSessionTile : EpitaxySessionTile;
  return (
    <div
      aria-current={focused ? "true" : undefined}
      aria-label="Secondary pane"
      className="dframe-pane dframe-pane-extra min-w-0 relative flex flex-col"
      data-focused={focused || undefined}
      data-slot={slot}
      onFocusCapture={onFocus}
      onPointerDown={drag.onPointerDown}
      onPointerDownCapture={onFocus}
      role="region"
    >
      <SessionTile
        isLonePane={isLonePane}
        onClose={onClose}
        onMovePane={(nextSlot: PaneSlot) => paneStore.movePane(mode, paneIndex, nextSlot)}
        onNavigate={onNavigate}
        paneIndex={paneIndex}
        sessionId={refId}
        slot={slot}
      />
    </div>
  );
}
