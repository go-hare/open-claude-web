import { useCallback, useEffect, useLayoutEffect, useRef, type PointerEvent as ReactPointerEvent, type RefObject } from "react";
import type { FrameMode } from "../stores/frameStore";
import { paneStore, PANE_SPLIT_BOUNDS, type PaneSlot } from "../stores/paneStore";

const adjacentSlots: Record<"tl" | PaneSlot, Partial<Record<string, Array<"tl" | PaneSlot>>>> = {
  tl: { ArrowRight: ["tr", "br"], ArrowDown: ["bl", "br"] },
  tr: { ArrowLeft: ["tl", "bl"], ArrowDown: ["br", "bl"] },
  bl: { ArrowUp: ["tl", "tr"], ArrowRight: ["br", "tr"] },
  br: { ArrowUp: ["tr", "tl"], ArrowLeft: ["bl", "tl"] },
};

export function usePaneKeyboard(mode: FrameMode, onNavigate: (path: string) => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.shiftKey) return;
      const macPaneChord = event.metaKey && event.ctrlKey && !event.altKey;
      const altPaneChord = event.ctrlKey && event.altKey && !event.metaKey;
      const closeChord = (event.metaKey || event.ctrlKey) && event.code === "Backslash";
      if (!macPaneChord && !altPaneChord && !closeChord) return;

      const state = paneStore.getState();
      const panes = state.extraPanesByMode[mode] ?? [];
      if (panes.length === 0) return;
      const focusedIndex = Math.min(state.focusedIndex, panes.length);
      if (event.code === "KeyW" || closeChord) {
        event.preventDefault();
        focusedIndex === 0 ? onNavigate("/epitaxy") : paneStore.closePane(mode, focusedIndex);
        return;
      }
      if (!event.code.startsWith("Arrow")) return;
      const focusedSlot = focusedIndex === 0 ? "tl" : panes[focusedIndex - 1].slot;
      const visibleSlots = new Set<"tl" | PaneSlot>(["tl", ...panes.map((pane) => pane.slot)]);
      const nextSlot = adjacentSlots[focusedSlot]?.[event.code]?.find((slot) => visibleSlots.has(slot));
      if (!nextSlot || nextSlot === focusedSlot) return;
      event.preventDefault();
      if (nextSlot === "tl") {
        paneStore.setFocusedIndex(mode, 0);
        return;
      }
      const nextIndex = panes.findIndex((pane) => pane.slot === nextSlot);
      if (nextIndex !== -1) paneStore.setFocusedIndex(mode, nextIndex + 1);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mode, onNavigate]);
}

export function useCommandHeldAttribute(hostRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey) host.setAttribute("data-cmd-held", "");
    };
    const onKeyUp = (event: KeyboardEvent) => {
      if (!event.metaKey && !event.ctrlKey) host.removeAttribute("data-cmd-held");
    };
    const onBlur = () => host.removeAttribute("data-cmd-held");
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
      host.removeAttribute("data-cmd-held");
    };
  }, [hostRef]);
}

export function usePaneSplitBounds(hostRef: RefObject<HTMLDivElement | null>) {
  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const rect = host.getBoundingClientRect();
    const state = paneStore.getState();
    const col = clampForPixels(state.colSplit, rect.width);
    const row = clampForPixels(state.rowSplit, rect.height);
    host.style.setProperty("--df-pane-col", String(col));
    host.style.setProperty("--df-pane-row", String(row));
    if (col !== state.colSplit) paneStore.setSplit("col", col);
    if (row !== state.rowSplit) paneStore.setSplit("row", row);
  }, [hostRef]);
}

function clampForPixels(split: number, size: number) {
  const min = PANE_SPLIT_BOUNDS.MIN_PX / Math.max(1, size);
  return min >= 0.5 ? 0.5 : Math.min(1 - min, Math.max(min, split));
}

export function PaneResizeHandles({ hostRef, showCol, showRow }: { hostRef: RefObject<HTMLDivElement | null>; showCol: boolean; showRow: boolean }) {
  if (!showCol && !showRow) return null;
  return (
    <>
      {showCol ? <PaneResizeHandle axis="col" hostRef={hostRef} /> : null}
      {showRow ? <PaneResizeHandle axis="row" hostRef={hostRef} /> : null}
    </>
  );
}

function PaneResizeHandle({ axis, hostRef }: { axis: "col" | "row"; hostRef: RefObject<HTMLDivElement | null> }) {
  const startSplitRef = useRef<number>(PANE_SPLIT_BOUNDS.DEFAULT);
  const startSizeRef = useRef<number>(1);
  const pendingSplitRef = useRef<number>(PANE_SPLIT_BOUNDS.DEFAULT);
  const boundsRef = useRef<{ min: number; max: number }>({ min: PANE_SPLIT_BOUNDS.MIN, max: PANE_SPLIT_BOUNDS.MAX });
  const isColumn = axis === "col";
  const cssVar = isColumn ? "--df-pane-col" : "--df-pane-row";
  const beginResize = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const host = hostRef.current;
    if (!host) return;
    event.preventDefault();
    const rect = host.getBoundingClientRect();
    const size = Math.max(1, isColumn ? rect.width : rect.height);
    const min = Math.max(PANE_SPLIT_BOUNDS.MIN, PANE_SPLIT_BOUNDS.MIN_PX / size);
    boundsRef.current = min < 0.5 ? { min, max: 1 - min } : { min: 0.5, max: 0.5 };
    const current = parseFloat(getComputedStyle(host).getPropertyValue(cssVar));
    startSplitRef.current = Number.isFinite(current) ? current : PANE_SPLIT_BOUNDS.DEFAULT;
    pendingSplitRef.current = startSplitRef.current;
    startSizeRef.current = size;
    host.setAttribute("data-resizing", "");
    const startClient = isColumn ? event.clientX : event.clientY;
    const onPointerMove = (moveEvent: PointerEvent) => {
      const delta = (isColumn ? moveEvent.clientX : moveEvent.clientY) - startClient;
      const { min, max } = boundsRef.current;
      pendingSplitRef.current = Math.min(max, Math.max(min, startSplitRef.current + delta / startSizeRef.current));
      host.style.setProperty(cssVar, String(pendingSplitRef.current));
    };
    const finish = (commit: boolean) => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("pointercancel", onPointerCancel);
      host.removeAttribute("data-resizing");
      if (commit) paneStore.setSplit(axis, pendingSplitRef.current);
    };
    const onPointerUp = () => finish(true);
    const onPointerCancel = () => finish(false);
    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("pointercancel", onPointerCancel);
  }, [axis, cssVar, hostRef, isColumn]);

  return (
    <div className={isColumn ? "dframe-pane-resize-col" : "dframe-pane-resize-row"}>
      <div
        aria-label={isColumn ? "Resize pane columns" : "Resize pane rows"}
        aria-orientation={isColumn ? "vertical" : "horizontal"}
        className="group/resize relative flex h-full w-full cursor-col-resize items-center justify-center outline-none"
        onDoubleClick={() => resetSplit(hostRef, cssVar, axis)}
        onPointerDown={beginResize}
        role="separator"
        tabIndex={0}
      >
        <div className="rounded-full bg-text-400 opacity-0 transition-opacity duration-150 group-hover/resize:opacity-100 group-focus-visible/resize:opacity-100" style={isColumn ? { width: 3, height: 56 } : { height: 3, width: 56 }} />
      </div>
    </div>
  );
}

function resetSplit(hostRef: RefObject<HTMLDivElement | null>, cssVar: string, axis: "col" | "row") {
  hostRef.current?.style.setProperty(cssVar, String(PANE_SPLIT_BOUNDS.DEFAULT));
  paneStore.setSplit(axis, PANE_SPLIT_BOUNDS.DEFAULT);
}

export function usePaneDrag(paneIndex: number, mode: FrameMode, onNavigate: (path: string) => void) {
  const cleanupRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cleanupRef.current?.(), []);
  return {
    onPointerDown: useCallback((event: ReactPointerEvent<HTMLElement>) => {
      if (event.button !== 0 || !(event.metaKey || event.ctrlKey)) return;
      if ((event.target as HTMLElement).closest("a,input,textarea,button,[role='button'],[contenteditable='true']")) return;
      const host = event.currentTarget.closest(".dframe-pane-host") as HTMLElement | null;
      if (!host) return;
      const start = { x: event.clientX, y: event.clientY };
      let dragging = false;
      let intent: "tl" | PaneSlot | null = null;
      const cleanup = () => {
        document.removeEventListener("pointermove", onPointerMove);
        document.removeEventListener("pointerup", onPointerUp);
        document.removeEventListener("pointercancel", onPointerCancel);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        host.removeAttribute("data-pane-dragging");
        host.removeAttribute("data-pane-drag-intent");
        cleanupRef.current = null;
      };
      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - start.x;
        const dy = moveEvent.clientY - start.y;
        if (!dragging) {
          if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
          dragging = true;
          host.setAttribute("data-pane-dragging", String(paneIndex));
          document.body.style.cursor = "grabbing";
          document.body.style.userSelect = "none";
        }
        intent = paneIntentFromPoint(host, moveEvent.clientX, moveEvent.clientY);
        host.setAttribute("data-pane-drag-intent", intent);
      };
      const onPointerUp = () => {
        const didDrag = dragging;
        cleanup();
        if (!didDrag || !intent) return;
        if (paneIndex === 0) {
          if (intent === "tl") return;
          const slotIndex = (paneStore.getState().extraPanesByMode[mode] ?? []).findIndex((pane) => pane.slot === intent);
          if (slotIndex !== -1) paneStore.setFocusedIndex(mode, slotIndex + 1);
          return;
        }
        if (intent === "tl") {
          const pane = (paneStore.getState().extraPanesByMode[mode] ?? [])[paneIndex - 1];
          if (pane) onNavigate(`/epitaxy/${encodeURIComponent(pane.ref.id)}`);
        } else {
          paneStore.movePane(mode, paneIndex, intent);
        }
      };
      const onPointerCancel = () => cleanup();
      document.addEventListener("pointermove", onPointerMove);
      document.addEventListener("pointerup", onPointerUp);
      document.addEventListener("pointercancel", onPointerCancel);
      cleanupRef.current = cleanup;
    }, [mode, onNavigate, paneIndex]),
  };
}

function paneIntentFromPoint(host: HTMLElement, clientX: number, clientY: number): "tl" | PaneSlot {
  const rect = host.getBoundingClientRect();
  const col = parseFloat(getComputedStyle(host).getPropertyValue("--df-pane-col"));
  const row = parseFloat(getComputedStyle(host).getPropertyValue("--df-pane-row"));
  const colSplit = Number.isFinite(col) ? col : PANE_SPLIT_BOUNDS.DEFAULT;
  const rowSplit = Number.isFinite(row) ? row : PANE_SPLIT_BOUNDS.DEFAULT;
  const right = clientX > rect.left + rect.width * colSplit;
  const bottom = clientY > rect.top + rect.height * rowSplit;
  if (right && bottom) return "br";
  if (right) return "tr";
  if (bottom) return "bl";
  return "tl";
}
