/**
 * Official cd5a31703 `prt` / `drt` / `frt` / `lrt` — bottomAnchorGapPx only.
 * `onUnsettled` / cycle-cap telemetry omitted (htt). No silhouette `s5`.
 *
 * nextGap = anchored ? max(0, viewportHeight - (totalSize - gapPx)) : 0
 * If current gap is 0, next would be >0, and the scroller is already
 * scrollable (`frt`), official zeros the gap.
 */
import { useLayoutEffect, useRef } from "react";

/** Official `S5`. */
export const OFFICIAL_ANCHOR_GAP_EPS = 0.001;

export function officialAnchorDrt(viewportHeightPx: number, contentSizePx: number) {
  const delta = viewportHeightPx - contentSizePx;
  return delta < OFFICIAL_ANCHOR_GAP_EPS ? 0 : delta;
}

export function officialAnchorLrt(currentPx: number, nextPx: number) {
  return Math.abs(nextPx - currentPx) < OFFICIAL_ANCHOR_GAP_EPS;
}

export function officialAnchorFrt(node: HTMLElement | null) {
  return node !== null && node.scrollHeight > 0 && node.scrollHeight - node.clientHeight > 1;
}

export function officialNextAnchorGapPx({
  failed,
  gapPx,
  getScrollElement,
  hasOlder,
  loading,
  totalSizePx,
  viewportHeightPx,
}: {
  failed: boolean;
  gapPx: number;
  getScrollElement: () => HTMLElement | null;
  hasOlder: boolean;
  loading: boolean;
  totalSizePx: number;
  viewportHeightPx: number;
}) {
  if (!(viewportHeightPx > 0)) return gapPx;
  const contentSizePx = totalSizePx - gapPx;
  const anchored = hasOlder && (loading || !failed);
  let next = anchored ? officialAnchorDrt(viewportHeightPx, contentSizePx) : 0;
  if (gapPx === 0 && next > 0 && officialAnchorFrt(getScrollElement())) next = 0;
  return officialAnchorLrt(gapPx, next) ? gapPx : next;
}

export function useOfficialAnchorGap({
  failed,
  gapPx,
  getScrollElement,
  getViewportHeight,
  hasOlder,
  loading,
  onGapChange,
  totalSizePx,
}: {
  failed: boolean;
  gapPx: number;
  getScrollElement: () => HTMLElement | null;
  getViewportHeight: () => number | undefined;
  hasOlder: boolean;
  loading: boolean;
  onGapChange: (px: number) => void;
  totalSizePx: number;
}) {
  const enabled = hasOlder || gapPx > 0;
  const writesRef = useRef(0);
  const computeRef = useRef(() => {});
  computeRef.current = () => {
    const viewportHeightPx = getViewportHeight();
    if (viewportHeightPx === undefined || viewportHeightPx <= 0) return;
    if (writesRef.current >= 16) return;
    const next = officialNextAnchorGapPx({
      failed,
      gapPx,
      getScrollElement,
      hasOlder,
      loading,
      totalSizePx,
      viewportHeightPx,
    });
    if (next !== gapPx) {
      writesRef.current += 1;
      onGapChange(next);
    }
  };

  useLayoutEffect(() => {
    computeRef.current();
  }, [failed, gapPx, hasOlder, loading, totalSizePx]);

  useLayoutEffect(() => {
    if (!enabled) return undefined;
    const node = getScrollElement();
    if (!node) return undefined;
    const ResizeObserverCtor = node.ownerDocument?.defaultView?.ResizeObserver ?? globalThis.ResizeObserver;
    if (typeof ResizeObserverCtor !== "function") return undefined;
    const observer = new ResizeObserverCtor(() => computeRef.current());
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, getScrollElement]);
}
