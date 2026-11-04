/**
 * Official shared-4 `gw` (cd5a D9 `Ene`) — jump/fade from end-sentinel IO, not scrollHeight math.
 *
 * Fade IO rootMargin `0px 0px ${8-overlay}px 0px`.
 * Jump IO rootMargin `0px 0px ${200-overlay}px 0px`.
 * `showJumpControl` / `showBottomFade` are false while pinned or unmounting.
 * Local Code does not pass bottomOverlay → overlayPx 0.
 */
import { useLayoutEffect, useRef } from "react";

export type OfficialTranscriptScrollState = {
  showBottomFade: boolean;
  showScrollButton: boolean;
};

export const OFFICIAL_SCROLL_FADE_PX = 8;
export const OFFICIAL_SCROLL_JUMP_PX = 200;

function ownerView(node: HTMLElement | null): Window | null {
  if (!node) return null;
  const doc = node.nodeType === 9 ? node as unknown as Document : node.ownerDocument;
  return doc?.defaultView ?? null;
}

export function useOfficialTranscriptScrollState({
  getBottomOverlay,
  getContentEnd,
  getScrollElement,
  isPinned,
  onChange,
  subscribePin,
}: {
  getBottomOverlay?: () => HTMLElement | null;
  getContentEnd: () => HTMLElement | null;
  getScrollElement: () => HTMLElement | null;
  isPinned: () => boolean;
  onChange: (state: OfficialTranscriptScrollState) => void;
  subscribePin: (listener: (pinned: boolean) => void) => () => void;
}) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useLayoutEffect(() => {
    const scroller = getScrollElement();
    const end = getContentEnd();
    if (!scroller || !end) return undefined;
    const view = ownerView(scroller);
    if (!view?.IntersectionObserver) return undefined;

    let fadeIntersecting = true;
    let jumpIntersecting = true;
    let detached = false;
    const emit = () => {
      const pinned = isPinned();
      const held = pinned || detached;
      onChangeRef.current({
        showBottomFade: !held && !fadeIntersecting,
        showScrollButton: !held && !jumpIntersecting,
      });
    };

    const observe = (marginPx: number, overlayPx: number, setHit: (hit: boolean) => void) => {
      const observer = new view.IntersectionObserver((entries) => {
        setHit(entries[entries.length - 1]?.isIntersecting ?? true);
        emit();
      }, {
        root: scroller,
        rootMargin: `0px 0px ${marginPx - overlayPx}px 0px`,
      });
      observer.observe(end);
      return observer;
    };

    let fadeObserver: IntersectionObserver | undefined;
    let jumpObserver: IntersectionObserver | undefined;
    const bind = (overlayPx: number) => {
      fadeObserver?.disconnect();
      jumpObserver?.disconnect();
      fadeObserver = observe(OFFICIAL_SCROLL_FADE_PX, overlayPx, (hit) => {
        fadeIntersecting = hit;
      });
      jumpObserver = observe(OFFICIAL_SCROLL_JUMP_PX, overlayPx, (hit) => {
        jumpIntersecting = hit;
      });
    };

    const overlayNode = getBottomOverlay?.() ?? null;
    let overlayObserver: ResizeObserver | undefined;
    let raf = 0;
    if (overlayNode && typeof view.ResizeObserver === "function") {
      overlayObserver = new view.ResizeObserver(() => {
        bind(overlayNode.getBoundingClientRect().height);
      });
      overlayObserver.observe(overlayNode);
      raf = view.requestAnimationFrame(() => {
        raf = view.requestAnimationFrame(() => {
          if (!fadeObserver) bind(overlayNode.getBoundingClientRect().height);
        });
      });
    } else {
      bind(0);
    }

    const unsubscribePin = subscribePin(() => emit());
    return () => {
      unsubscribePin();
      if (raf) view.cancelAnimationFrame(raf);
      overlayObserver?.disconnect();
      fadeObserver?.disconnect();
      jumpObserver?.disconnect();
      detached = true;
      emit();
    };
  }, [getBottomOverlay, getContentEnd, getScrollElement, isPinned, subscribePin]);
}
