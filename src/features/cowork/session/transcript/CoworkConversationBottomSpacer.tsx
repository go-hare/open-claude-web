/**
 * Official bottom spacer (pretty LUt ~221587).
 * height = max(container - lastHuman - lastAssistant - extras - chatInput - pubsecBanner - buffer, 0)
 * buffer = (additionalBuffer || 98) + (hasDesktopTopBar ? Qg : 0)
 * Qg = 45 (vendor c5f4e1303 Gd); ALt pubsec banner = 2.25rem when TUt enabled.
 *
 * Official LUt API:
 * - measures lastAssistant / lastHuman / chatInput / extras refs only
 * - container = parentContainerRef?.clientHeight || window.innerHeight
 * - RO deps official `[scrollRefs, m, messageCount]`; no observeEpoch in ion
 * - does NOT setPin / restick — pin is IYe RO + t$t only
 * Source: index-BELzQL5P.js LUt ~221588–221678.
 *
 * Desktop-shell residuals (keep; do not delete as “approx”):
 * 1) parentContainerRef — LUt accepts it, but official v$t call site omits it → window.
 *    Product IYe lives in a flex min-h-0 dframe column shorter than window; pass scrollport.
 * 2) observeEpoch — official rebinds RO only on messageCount; product path hydrates /
 *    streams in-place (uuid list length stable) so Cat lastAssistant can attach late.
 * 3) sync updateHeight() after RO rebind — official relies on async RO delivery only;
 *    product sync m() prevents A=0 → spacer≈viewport mid stick.
 */
import { useCallback, useLayoutEffect, useRef, type MutableRefObject, type RefObject } from "react";
import type { CoworkAutoscrollHandle } from "./coworkAutoscroll";

/** Official Qg — DesktopTopBar grid row height (c5f4e1303 `Gd = 45`). */
export const COWORK_DESKTOP_TOP_BAR_HEIGHT_PX = 45;
/** Official default buffer when additionalBuffer is 0/undefined. */
export const COWORK_SPACER_DEFAULT_BUFFER_PX = 98;
/** Official ALt pubsec banner height string. */
export const COWORK_PUBSEC_BANNER_HEIGHT = "2.25rem";
/** Official LUt additionalBuffer when Je.show (onboarding banner); agent ZBt hard-false. */
export const COWORK_ONBOARDING_SPACER_ADDITIONAL_BUFFER_PX = 220;

export type CoworkBottomSpacerMetrics = {
  additionalBuffer?: number;
  assistantHeight: number;
  chatInputHeight: number;
  containerHeight: number;
  extrasHeight: number;
  hasDesktopTopBar?: boolean;
  hasPubsecBanner?: boolean;
  humanHeight: number;
  rootFontSizePx?: number;
};

export type CoworkConversationBottomSpacerProps = {
  additionalBuffer?: number;
  autoScrollRef?: MutableRefObject<CoworkAutoscrollHandle | null>;
  composerRef: RefObject<HTMLDivElement | null>;
  disableInitialScrollToBottom?: boolean;
  disablePinToTop?: boolean;
  extrasRef: RefObject<HTMLDivElement | null>;
  /** Official A5() — desktopTopBar capability. */
  hasDesktopTopBar?: boolean;
  /** Official TUt()/IUt().enabled — currently always false in official; kept for parity. */
  hasPubsecBanner?: boolean;
  lastAssistantMessageRef: RefObject<HTMLDivElement | null>;
  initialPrevMessageCount?: number;
  lastHumanMessageRef: RefObject<HTMLDivElement | null>;
  messageCount: number;
  /**
   * Product residual: rebind LUt ResizeObserver when painted last chain / stream id changes
   * without messageCount changing (official path rows update in-place; Cat ref targets move).
   * Official LUt RO deps [scrollRefs, m, messageCount] — observeEpoch extends that honestly.
   */
  observeEpoch?: string;
  parentContainerRef?: RefObject<HTMLElement | null>;
  scrollRef: RefObject<HTMLDivElement | null>;
};

export function computeCoworkBottomSpacerHeight(metrics: CoworkBottomSpacerMetrics): number {
  const bannerPx = metrics.hasPubsecBanner
    ? parseFloat(COWORK_PUBSEC_BANNER_HEIGHT) * (metrics.rootFontSizePx ?? 16)
    : 0;
  const buffer =
    (metrics.additionalBuffer || COWORK_SPACER_DEFAULT_BUFFER_PX) +
    (metrics.hasDesktopTopBar ? COWORK_DESKTOP_TOP_BAR_HEIGHT_PX : 0);
  return Math.max(
    metrics.containerHeight -
      metrics.humanHeight -
      metrics.assistantHeight -
      metrics.extrasHeight -
      metrics.chatInputHeight -
      bannerPx -
      buffer,
    0,
  );
}

export function animateCoworkScrollToBottom(container: HTMLElement, duration: number) {
  const start = container.scrollTop;
  const distance = container.scrollHeight - container.clientHeight - start;
  if (distance <= 0) return;
  const startedAt = performance.now();
  const step = (time: number) => {
    const progress = Math.min((time - startedAt) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    container.scrollTop = start + distance * eased;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/**
 * Official LUt container: parentContainerRef?.clientHeight || window.innerHeight.
 * Product conversation passes IYe scrollport as parent (dframe column shorter than window).
 * Reject content-sized parent (client ≫ window) so unbounded flex cannot oversize spacer.
 */
export function resolveCoworkBottomSpacerContainerHeight(input: {
  parentHeight?: number | null;
  scrollClientHeight?: number | null;
  scrollScrollHeight?: number | null;
  /** @deprecated alias of scrollClientHeight */
  scrollHeight?: number | null;
  windowHeight?: number;
}): number {
  const win =
    input.windowHeight
    ?? (typeof window !== "undefined" ? window.innerHeight : 0);
  const parent = positiveHeight(input.parentHeight);
  // Official: parent?.clientHeight || window.innerHeight
  if (parent && (!win || parent <= win + 1)) return parent;
  // Product dframe: if parent missing, prefer bounded IYe clientHeight when provided.
  const client = positiveHeight(input.scrollClientHeight ?? input.scrollHeight);
  if (client && (!win || client <= win + 1)) return client;
  if (win > 0) return win;
  return parent ?? client ?? 0;
}

function positiveHeight(value?: number | null): number | null {
  return typeof value === "number" && value > 0 ? value : null;
}

/**
 * Official LUt: e.chatInput?.current?.clientHeight || 0.
 * No DOM query fallback — composerRef must be attached (data-chat-input-container residual).
 */
export function resolveCoworkChatInputHeight(input: {
  composerRef?: RefObject<HTMLDivElement | null> | { current: HTMLDivElement | null };
  scrollRoot?: HTMLElement | null;
}): number {
  return input.composerRef?.current?.clientHeight ?? 0;
}

/**
 * Official LUt: lastHuman/lastAssistant ref clientHeights only.
 * Cat always mounts the ref shell (official wat/Cat); no painted-cell max() patch.
 */
export function resolveCoworkLastMessageHeights(input: {
  assistantRef?: RefObject<HTMLDivElement | null> | { current: HTMLDivElement | null };
  humanRef?: RefObject<HTMLDivElement | null> | { current: HTMLDivElement | null };
  scrollRoot?: HTMLElement | null;
}): { assistantHeight: number; humanHeight: number } {
  return {
    assistantHeight: input.assistantRef?.current?.clientHeight ?? 0,
    humanHeight: input.humanRef?.current?.clientHeight ?? 0,
  };
}

export function CoworkConversationBottomSpacer(props: CoworkConversationBottomSpacerProps) {
  const extraSpaceRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCount = useRef(props.initialPrevMessageCount ?? props.messageCount);
  // Official A5() when measuring against window.innerHeight. When parent/scrollport is
  // the IYe container, chrome is already outside — do not add Qg a second time.
  const measuredAgainstScrollport = Boolean(props.parentContainerRef || props.scrollRef);
  const hasDesktopTopBar = props.hasDesktopTopBar ?? !measuredAgainstScrollport;
  const hasPubsecBanner = props.hasPubsecBanner ?? false;

  // Official m(): assign style.height only. Pin/restick is IYe + t$t, not LUt.
  const updateHeight = useCallback(() => {
    const target = extraSpaceRef.current;
    if (!target) return;
    const rootFontSizePx =
      typeof document !== "undefined"
        ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        : 16;
    const measured = resolveCoworkLastMessageHeights({
      assistantRef: props.lastAssistantMessageRef,
      humanRef: props.lastHumanMessageRef,
    });
    const chatInputHeight = resolveCoworkChatInputHeight({
      composerRef: props.composerRef,
    });
    const height = computeCoworkBottomSpacerHeight({
      additionalBuffer: props.additionalBuffer,
      assistantHeight: measured.assistantHeight,
      chatInputHeight,
      containerHeight: resolveCoworkBottomSpacerContainerHeight({
        parentHeight: props.parentContainerRef?.current?.clientHeight,
        scrollClientHeight: props.scrollRef.current?.clientHeight,
        scrollScrollHeight: props.scrollRef.current?.scrollHeight,
        windowHeight: typeof window !== "undefined" ? window.innerHeight : 0,
      }),
      extrasHeight: props.extrasRef.current?.clientHeight ?? 0,
      hasDesktopTopBar,
      hasPubsecBanner,
      humanHeight: measured.humanHeight,
      rootFontSizePx,
    });
    target.style.height = `${height}px`;
  }, [
    hasDesktopTopBar,
    hasPubsecBanner,
    props.additionalBuffer,
    props.composerRef,
    props.extrasRef,
    props.lastAssistantMessageRef,
    props.lastHumanMessageRef,
    props.parentContainerRef,
    props.scrollRef,
  ]);

  // Official LUt effect order (index-BELzQL5P LUt):
  // (1) messageCount > prev → m() + optional scroll
  // (2) RO observe lastAssistant/lastHuman/chatInput/extras + resize (no sync m on mount)
  // (3) initial scrollToBottom("instant") unless disableInitial / initialPrev set
  // Product keeps a sync m() immediately before initial scroll so short sessions include
  // the LUt band in scrollHeight in the same commit (official RO m() is async-only).
  useLayoutEffect(() => {
    if (props.messageCount > previousMessageCount.current) {
      updateHeight();
      if (!props.disablePinToTop) {
        const firstPaint = previousMessageCount.current === 0 && props.messageCount > 0;
        if (firstPaint && props.initialPrevMessageCount !== undefined) {
          requestAnimationFrame(() => {
            const container = props.autoScrollRef?.current?.getScrollContainer();
            if (container) animateCoworkScrollToBottom(container, 600);
          });
        } else if (props.autoScrollRef?.current) {
          props.autoScrollRef.current.scrollToBottom(firstPaint ? "instant" : "smooth");
        } else if (firstPaint) {
          requestAnimationFrame(() => props.autoScrollRef?.current?.scrollToBottom("instant"));
        }
      }
    }
    previousMessageCount.current = props.messageCount;
  }, [props.autoScrollRef, props.disablePinToTop, props.initialPrevMessageCount, props.messageCount, updateHeight]);

  // Official LUt RO: observe lastAssistant, lastHuman, chatInput, extras (+ window resize).
  // messageCount + observeEpoch rebind when path length OR painted last chain changes so
  // late-attached Cat refs are actually observed (live stream A≠0).
  useLayoutEffect(() => {
    const observer = new ResizeObserver(() => {
      updateHeight();
    });
    const targets = [
      props.lastAssistantMessageRef.current,
      props.lastHumanMessageRef.current,
      props.composerRef.current,
      props.extrasRef.current,
    ];
    targets.forEach((target) => {
      if (target) observer.observe(target);
    });
    window.addEventListener("resize", updateHeight);
    // Sync m() after rebind — official relies on RO delivery; product path can attach
    // lastAssistant after the previous observe pass saw null (A stuck at 0 → spacer ~viewport).
    updateHeight();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateHeight);
    };
  }, [
    props.composerRef,
    props.extrasRef,
    props.lastAssistantMessageRef,
    props.lastHumanMessageRef,
    props.messageCount,
    props.observeEpoch,
    updateHeight,
  ]);

  // Official third layout effect deps: [autoScrollRef, disableInitial, initialPrev].
  // Measure once then scroll — handle must already be assigned (IYe imperative timing).
  useLayoutEffect(() => {
    if (props.disableInitialScrollToBottom || props.initialPrevMessageCount !== undefined) return;
    updateHeight();
    if (props.autoScrollRef?.current) {
      props.autoScrollRef.current.scrollToBottom("instant");
    } else {
      requestAnimationFrame(() => props.autoScrollRef?.current?.scrollToBottom("instant"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- official deps omit m(); updateHeight is stable enough per measure refs
  }, [props.autoScrollRef, props.disableInitialScrollToBottom, props.initialPrevMessageCount]);

  return <div aria-hidden="true" data-testid="cowork-bottom-spacer" ref={extraSpaceRef} />;
}
