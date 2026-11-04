/**
 * Official cd5a31703 Gat wiring of `wse` (`cr`) + `Lse` (`T`) for local Code.
 *
 * Local does not pass restoreKey / initialSizes / holdPlaceOnWidthChange
 * (`rp`/`wild_spring` is not resident). Overscan is Q7=600px (`B=!1`, not `$7`).
 * Padding is w9 (empty local → 48/48; hasOlder → +awe 40). Key classify is ca80 NZ subset.
 * Sizer hold is c4a9 `ur`/`dr` (w5). Bat `mf().trackScroller` is telemetry — not ported.
 * `onAnchorCompensation` is reply-paging (oce) — omitted without sendModel=seat.
 * Older pager is cd5a `cwe`/`Tw` — no silhouette `s5`.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useOfficialAnchorGap } from "./officialAnchorGap";
import { useOfficialOlderPager } from "./officialOlderPager";
import {
  officialWindowOverscanPx,
  officialWindowReleaseGate,
  useOfficialWindowEngine,
} from "./officialWindowEngine";
import { officialClassifyKeyScroll } from "./officialClassifyKeyScroll";
import { useOfficialTranscriptKeepMounted } from "./officialTranscriptKeepMounted";
import { useOfficialTranscriptPin } from "./officialTranscriptPin";
import { useOfficialTranscriptSizerHold } from "./officialSizerHold";
import { officialWindowPadding } from "./officialWindowPadding";

export {
  OFFICIAL_WINDOW_KEEP_ALL_OVERSCAN_PX,
  OFFICIAL_WINDOW_KEEP_ALL_ROWS_MOUNTED,
  OFFICIAL_WINDOW_OVERSCAN_PX,
  OFFICIAL_WINDOW_ROW_STYLE,
  OFFICIAL_WINDOW_SCROLLER_CLASS,
  OFFICIAL_WINDOW_SIZER_CLASS,
  officialWindowOverscanPx,
} from "./officialWindowEngine";

const overscanPx = officialWindowOverscanPx();

type PinEngineRef = {
  markProgrammatic: (ms?: number) => void;
  setScrollTop: (offset: number) => void;
};

export function useOfficialTranscriptFu<TItem>({
  estimate,
  getKey,
  hasOlder = false,
  items,
  sessionId,
}: {
  estimate: (item: TItem, index: number) => number;
  getKey: (item: TItem, index: number) => string;
  hasOlder?: boolean;
  items: TItem[];
  sessionId?: string;
}) {
  const [gapPx, setGapPx] = useState(0);
  const pad = useMemo(
    () => officialWindowPadding({ bottomAnchorGapPx: gapPx, hasOlder }),
    [gapPx, hasOlder],
  );
  const paddingBottom = pad.paddingBottom;
  const paddingTop = pad.paddingTop;
  const scrollElRef = useRef<HTMLDivElement | null>(null);
  const sizerElRef = useRef<HTMLDivElement | null>(null);
  const rowsElRef = useRef<HTMLDivElement | null>(null);
  const adjustmentAtRef = useRef(0);
  const engineRef = useRef<PinEngineRef | null>(null);
  const getScrollElement = useCallback(() => scrollElRef.current, []);
  const getSizerElement = useCallback(() => sizerElRef.current, []);
  const getRowsElement = useCallback(() => rowsElRef.current, []);
  const keepMounted = useOfficialTranscriptKeepMounted({
    getKey,
    items,
    rowsElRef,
  });

  const pin = useOfficialTranscriptPin({
    adjustmentAtRef,
    classifyKeyScroll: officialClassifyKeyScroll,
    engineRef,
    getScrollElement,
    initialPinned: true,
  });
  const attachSizerHold = useOfficialTranscriptSizerHold({
    getRowsElement,
    getSizerElement,
    isFollowing: pin.isPinned,
  });

  const win = useOfficialWindowEngine({
    adjustmentAtRef,
    estimate,
    firstRowChangesAtTop: false,
    getKey,
    holdPlaceOnWidthChange: undefined,
    initialWindow: {
      bottomInset: 0,
      overscanBottom: overscanPx,
      overscanTop: 0,
      release: { afterPresentedFrames: 2, gate: officialWindowReleaseGate },
    },
    items,
    keepMountedRef: keepMounted.keepMountedRef,
    overscanBottom: overscanPx,
    overscanTop: overscanPx,
    paddingBottom,
    paddingTop,
    pinnedRef: pin.pinnedRef,
    retainOverscan: true,
    skipNoopRenders: true,
  });

  useLayoutEffect(() => {
    const bound: PinEngineRef = {
      markProgrammatic: win.markProgrammatic,
      setScrollTop: win.setScrollTop,
    };
    engineRef.current = bound;
    return () => {
      if (engineRef.current === bound) engineRef.current = null;
    };
  }, [win.markProgrammatic, win.setScrollTop]);

  useLayoutEffect(() => {
    win.totalSize;
    pin.resnap();
  }, [pin.resnap, win.totalSize]);

  const older = useOfficialOlderPager({
    contentSizePx: win.totalSize as number,
    getScrollElement,
    hasOlder,
    isPinned: pin.isPinned,
    loadedCount: items.length,
    sessionId,
    subscribePin: pin.subscribe,
    viewportUnfilled: gapPx > 0,
  });
  const getViewportHeight = useCallback(() => {
    const viewport = (win as { getViewport?: () => { height: number } | null }).getViewport?.();
    return viewport?.height;
  }, [win]);
  useOfficialAnchorGap({
    failed: older.failed,
    gapPx,
    getScrollElement,
    getViewportHeight,
    hasOlder,
    loading: older.loading,
    onGapChange: setGapPx,
    totalSizePx: win.totalSize as number,
  });

  const attachScroller = useCallback(
    (node: HTMLDivElement | null) => {
      scrollElRef.current = node;
      win.scrollerRef(node);
      pin.attach(node);
      attachSizerHold(node);
    },
    [attachSizerHold, pin.attach, win.scrollerRef],
  );

  const attachSizer = useCallback(
    (node: HTMLDivElement | null) => {
      sizerElRef.current = node;
      win.sizerRef(node);
      pin.attachContent(node);
    },
    [pin.attachContent, win.sizerRef],
  );

  const attachRows = useCallback((node: HTMLDivElement | null) => {
    rowsElRef.current = node;
  }, []);

  return {
    attachRows,
    attachScroller,
    attachSizer,
    bottomAnchorGapPx: gapPx,
    getScrollElement,
    loadOlder: older.loadOlder,
    olderStatus: older.status,
    paddingTop,
    subscribePin: pin.subscribe,
    holdProps: pin.holdProps,
    keepMountedBlur: keepMounted.onBlur,
    keepMountedFocus: keepMounted.onFocus,
    isPinned: pin.isPinned,
    rowRef: win.rowRef,
    rows: win.rows as Array<{
      index: number;
      key: string | number;
      measured: boolean;
      size: number;
      start: number;
    }>,
    scrollElRef,
    scrollToBottom: pin.scrollToBottom,
    scrollToIndex: win.scrollToIndex,
    setPinned: pin.setPinned,
    spacerBottom: win.spacerBottom as number,
    spacerTop: win.spacerTop as number,
    totalSize: win.totalSize as number,
  };
}
