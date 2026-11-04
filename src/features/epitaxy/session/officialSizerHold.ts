/**
 * Official c4a9ee384 `ur` + `dr` (cd5a `w5` / `Uoe`+`zoe`).
 *
 * Bat `mf().trackScroller` is ca80 telemetry (`dZ`) — not ported.
 * This is the layout hold: sizer minHeight while unpinned click/key, trim on scrollend.
 */
import { useCallback, useLayoutEffect, useRef } from "react";

const OFFICIAL_SIZER_HOLD_SETTLE_MS = 150;
const OFFICIAL_HOLD_KEY = (key: string) => key === "Enter" || key === " ";
const OFFICIAL_ROWS_SELECTOR = "[data-rocksteady-sizer]";
const OFFICIAL_NOT_ROWS = "data-transcript-not-rows";

type HoldApi = {
  clear: () => void;
  contentElement: () => HTMLElement | null;
  heldExtentPx: () => number;
  hold: () => void;
  scrollElement: () => HTMLElement | null;
  settleFromLayout: () => void;
  trim: () => void;
};

function ownerView(element: HTMLElement | null): Window | null {
  if (!element) return null;
  return (element.nodeType === 9 ? element as unknown as Document : element.ownerDocument)?.defaultView ?? null;
}

function eventElement(target: EventTarget | null): HTMLElement | null {
  if (target === null || !("nodeType" in target)) return null;
  const node = target as Node;
  const element = node.nodeType === 1 ? node as HTMLElement : node.parentElement;
  if (element === null) return null;
  if (element.closest('input,textarea,select,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"]')) {
    return null;
  }
  return element;
}

/** Official `ur`. */
export function officialCreateSizerHold(options: {
  getContentElement: () => HTMLElement | null;
  getFloorElement: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | null;
}): HoldApi {
  let heldExtent = 0;
  let heldWidth = 0;
  let floor: HTMLElement | null = null;
  const formatMinHeight = (px: number) => `${px}px`;

  const clear = () => {
    if (floor) floor.style.minHeight = "";
    floor = null;
    heldExtent = 0;
    heldWidth = 0;
  };

  const apply = (scroller: HTMLElement, sizer: HTMLElement, extent: number) => {
    const extra = extent - (scroller.scrollHeight - sizer.offsetHeight);
    if (extra <= 0) {
      clear();
      return;
    }
    if (floor && floor !== sizer) floor.style.minHeight = "";
    floor = sizer;
    heldExtent = extent;
    heldWidth = scroller.clientWidth;
    const next = formatMinHeight(extra);
    if (sizer.style.minHeight !== next) sizer.style.minHeight = next;
  };

  const settle = (contentHeight: number, clientHeight: number, clientWidth: number) => {
    if (heldExtent > 0 && (clientWidth !== heldWidth || contentHeight >= heldExtent || heldExtent - contentHeight >= clientHeight)) {
      clear();
    }
  };

  return {
    clear,
    contentElement: () => options.getContentElement(),
    heldExtentPx: () => heldExtent,
    hold: () => {
      const scroller = options.getScrollElement();
      const sizer = options.getFloorElement();
      if (!scroller || !sizer || scroller.clientHeight === 0) return;
      if (scroller.scrollHeight <= scroller.clientHeight) {
        clear();
        return;
      }
      apply(scroller, sizer, Math.min(Math.ceil(scroller.scrollTop + scroller.clientHeight), scroller.scrollHeight));
    },
    scrollElement: () => options.getScrollElement(),
    settleFromLayout: () => {
      if (heldExtent === 0) return;
      const scroller = options.getScrollElement();
      const rows = options.getContentElement();
      if (!scroller || !floor || !rows) {
        clear();
        return;
      }
      const contentBottom = rows.offsetTop
        - (rows.offsetParent === floor ? 0 : floor.offsetTop)
        + rows.offsetHeight;
      settle(
        scroller.scrollHeight - floor.offsetHeight + contentBottom,
        scroller.clientHeight,
        scroller.clientWidth,
      );
    },
    trim: () => {
      const scroller = options.getScrollElement();
      const sizer = options.getFloorElement();
      if (heldExtent === 0 || !scroller || !sizer) return;
      if (scroller.clientWidth !== heldWidth) {
        clear();
        return;
      }
      const next = Math.ceil(scroller.scrollTop + scroller.clientHeight);
      if (next < heldExtent) apply(scroller, sizer, next);
    },
  };
}

/** Official `dr`. */
export function officialBindSizerHold(
  hold: HoldApi,
  options: { rowsSelector: string; shouldHold: () => boolean },
): () => void {
  const scroller = hold.scrollElement();
  if (!scroller) return () => undefined;
  const view = ownerView(scroller);
  const scrollEnd = view !== null && "onscrollend" in view ? "scrollend" : "scroll";
  let listening = false;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let observer: ResizeObserver | null = null;

  const finish = () => {
    hold.trim();
    if (observer !== null) hold.settleFromLayout();
    if (hold.heldExtentPx() === 0) {
      stopScroll();
      stopObserver();
    }
  };

  const onScroll = () => {
    if (scrollEnd === "scrollend" || hold.heldExtentPx() === 0) {
      finish();
      return;
    }
    if (timer !== null) clearTimeout(timer);
    timer = setTimeout(finish, OFFICIAL_SIZER_HOLD_SETTLE_MS);
  };

  const startScroll = () => {
    if (listening) return;
    listening = true;
    scroller.addEventListener(scrollEnd, onScroll, { passive: true });
  };

  const stopScroll = () => {
    if (listening) {
      listening = false;
      scroller.removeEventListener(scrollEnd, onScroll);
    }
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  const stopObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  const startObserver = () => {
    const content = hold.contentElement();
    const RO = view?.ResizeObserver;
    if (observer !== null || content === null || RO === undefined) return;
    observer = new RO(() => {
      hold.settleFromLayout();
      if (hold.heldExtentPx() === 0) {
        stopScroll();
        stopObserver();
      } else if (hold.contentElement() !== content) {
        stopObserver();
        startObserver();
      }
    });
    observer.observe(content);
    observer.observe(scroller);
  };

  const maybeHold = (event: Event) => {
    if (event.type === "pointerdown" && "pointerType" in event && (event as PointerEvent).pointerType === "touch") {
      return;
    }
    const from = eventElement(event.target);
    const hit = from?.closest(`${options.rowsSelector},[${OFFICIAL_NOT_ROWS}]`);
    if (!hit || hit.hasAttribute("data-transcript-not-rows") || !options.shouldHold()) return;
    const wasEmpty = hold.heldExtentPx() === 0;
    hold.hold();
    if (hold.heldExtentPx() > 0) {
      startScroll();
      if (wasEmpty) stopObserver();
      startObserver();
    }
  };

  const onKey = (event: KeyboardEvent) => {
    if (OFFICIAL_HOLD_KEY(event.key) && !event.repeat) maybeHold(event);
  };

  const onPrint = () => hold.clear();
  scroller.addEventListener("pointerdown", maybeHold, true);
  scroller.addEventListener("click", maybeHold, true);
  scroller.addEventListener("keydown", onKey, true);
  view?.addEventListener("beforeprint", onPrint);
  return () => {
    scroller.removeEventListener("pointerdown", maybeHold, true);
    scroller.removeEventListener("click", maybeHold, true);
    scroller.removeEventListener("keydown", onKey, true);
    view?.removeEventListener("beforeprint", onPrint);
    stopScroll();
    stopObserver();
  };
}

/** Official `w5`. */
export function useOfficialTranscriptSizerHold({
  epochKey,
  getRowsElement,
  getSizerElement,
  isFollowing,
}: {
  epochKey?: string;
  getRowsElement: () => HTMLElement | null;
  getSizerElement: () => HTMLElement | null;
  isFollowing: () => boolean;
}) {
  const gettersRef = useRef({ getRowsElement, getSizerElement, isFollowing });
  gettersRef.current = { getRowsElement, getSizerElement, isFollowing };
  const holdRef = useRef<HoldApi | null>(null);
  const unbindRef = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    holdRef.current?.clear();
  }, [epochKey]);

  return useCallback((scroller: HTMLElement | null) => {
    unbindRef.current?.();
    unbindRef.current = null;
    holdRef.current?.clear();
    holdRef.current = null;
    if (scroller === null) return;
    const hold = officialCreateSizerHold({
      getContentElement: () => gettersRef.current.getRowsElement(),
      getFloorElement: () => gettersRef.current.getSizerElement(),
      getScrollElement: () => scroller,
    });
    holdRef.current = hold;
    unbindRef.current = officialBindSizerHold(hold, {
      rowsSelector: OFFICIAL_ROWS_SELECTOR,
      shouldHold: () => !gettersRef.current.isFollowing(),
    });
  }, []);
}
