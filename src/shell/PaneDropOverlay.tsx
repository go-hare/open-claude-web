/**
 * Official shared-23 `qQ` — last child of `.dframe-pane-host`.
 *
 * Product host is `1fr 0%` until split. Auto-placed overlay lands in the 0%
 * track. Span `1 / -1` so `inset:0` + `GQ()` % are the full host.
 * Do **not** portal to `html` — that paints *behind* `.dframe-root`.
 */
import { useLayoutEffect, useSyncExternalStore, type CSSProperties, type RefObject } from "react";
import { useShellText } from "../i18n/shellMessages";
import type { FrameMode } from "../stores/frameStore";
import { PANE_SPLIT_BOUNDS, paneStore, type PaneSlot } from "../stores/paneStore";
import {
  dropCellForSlot,
  dropColumnWeights,
  getSessionDragSnapshot,
  officialDropBadgeStyle,
  paneDropIntentFromPoint,
  paneRefFromSessionKey,
  setSessionDragPaneOver,
  subscribeSessionDragging,
} from "./sessionPaneDrag";

export function PaneDropOverlay({
  hostRef,
  mode,
  currentKey,
  extraSlots,
}: {
  hostRef: RefObject<HTMLElement | null>;
  mode: FrameMode;
  currentKey: string;
  extraSlots: PaneSlot[];
}) {
  const text = useShellText();
  const snap = useSyncExternalStore(subscribeSessionDragging, getSessionDragSnapshot, getSessionDragSnapshot);
  const hasSplit = extraSlots.length > 0;
  const host = hostRef.current;
  const intent = snap.dragging && host
    ? paneDropIntentFromPoint(host, snap.cursor.x, snap.cursor.y, hasSplit)
    : null;

  useLayoutEffect(() => {
    setSessionDragPaneOver(Boolean(intent?.over));
  }, [intent?.over]);

  useLayoutEffect(() => {
    const paneHost = hostRef.current;
    if (!paneHost) return;
    const onEnd = (event: Event) => {
      const detail = (event as CustomEvent<{ key: string; x: number; y: number }>).detail;
      const next = paneDropIntentFromPoint(paneHost, detail.x, detail.y, hasSplit);
      const ref = paneRefFromSessionKey(detail.key);
      if (!next?.over || !ref || ref.kind !== mode) return;
      if (extraSlots.includes(next.slot)) {
        const panes = paneStore.getState().extraPanesByMode[mode] ?? [];
        const paneIndex = panes.findIndex((pane) => pane.slot === next.slot) + 1;
        if (paneIndex > 0) paneStore.openInPane(mode, currentKey, paneIndex, ref);
        return;
      }
      paneStore.addPane(mode, currentKey, ref, next.slot);
    };
    window.addEventListener("dframe:session-drag-end", onEnd);
    return () => window.removeEventListener("dframe:session-drag-end", onEnd);
  }, [currentKey, extraSlots, hasSplit, hostRef, mode]);

  if (!snap.dragging) return null;

  /**
   * Official qQ: overlay mounts while dragging (`if(!t)return null`);
   * badge is omitted when drop cell is null and pointer is in the sidebar (`!u`).
   */
  if (!intent) {
    return (
      <div
        aria-hidden="true"
        className="dframe-drop-overlay"
        data-official-source="shared-23-CuGEZNcW.js:qQ"
      />
    );
  }

  const slot = intent.slot;
  const over = intent.over;
  const occupied = extraSlots.includes(slot);
  const label = occupied ? text.openHere : text.splitView;
  const parsedCol = host
    ? parseFloat(getComputedStyle(host).getPropertyValue("--df-pane-col"))
    : PANE_SPLIT_BOUNDS.DEFAULT;
  const colSplit = Number.isFinite(parsedCol) ? parsedCol : PANE_SPLIT_BOUNDS.DEFAULT;
  const splitColumn = slot === "tr" ? extraSlots.includes("br") : extraSlots.includes("bl");
  const badgeStyle = {
    position: "absolute",
    ...officialDropBadgeStyle(
      dropCellForSlot(slot, hasSplit),
      dropColumnWeights(hasSplit, colSplit),
      splitColumn,
    ),
  } as CSSProperties;

  return (
    <div
      aria-hidden="true"
      className="dframe-drop-overlay"
      data-official-source="shared-23-CuGEZNcW.js:qQ"
    >
      <span
        className="dframe-drop-overlay-badge"
        data-hint={over ? undefined : ""}
        data-over={over || undefined}
        style={badgeStyle}
      >
        <span className="dframe-drop-overlay-label">{label}</span>
      </span>
    </div>
  );
}
