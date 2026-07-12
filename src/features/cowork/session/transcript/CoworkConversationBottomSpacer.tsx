/**
 * Official bottom spacer (pretty LUt).
 * height = max(container - lastHuman - lastAssistant - extras - chatInput - pubsecBanner - buffer, 0)
 * buffer = (additionalBuffer || 98) + (hasDesktopTopBar ? Qg : 0)
 * Qg = 45 (vendor c5f4e1303 Gd); ALt pubsec banner = 2.25rem when TUt enabled.
 * Source: index-BELzQL5P.js LUt ~221588–221678.
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
  /** Official A5() — desktopTopBar capability. Cowork desktop shell defaults true. */
  hasDesktopTopBar?: boolean;
  /** Official TUt()/IUt().enabled — currently always false in official; kept for parity. */
  hasPubsecBanner?: boolean;
  lastAssistantMessageRef: RefObject<HTMLDivElement | null>;
  initialPrevMessageCount?: number;
  lastHumanMessageRef: RefObject<HTMLDivElement | null>;
  messageCount: number;
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

export function CoworkConversationBottomSpacer(props: CoworkConversationBottomSpacerProps) {
  const extraSpaceRef = useRef<HTMLDivElement | null>(null);
  const previousMessageCount = useRef(props.initialPrevMessageCount ?? props.messageCount);
  // Official A5 default for this desktop Cowork surface.
  const hasDesktopTopBar = props.hasDesktopTopBar ?? true;
  const hasPubsecBanner = props.hasPubsecBanner ?? false;

  const updateHeight = useCallback(() => {
    const target = extraSpaceRef.current;
    if (!target) return;
    const rootFontSizePx =
      typeof document !== "undefined"
        ? parseFloat(getComputedStyle(document.documentElement).fontSize) || 16
        : 16;
    const height = computeCoworkBottomSpacerHeight({
      additionalBuffer: props.additionalBuffer,
      assistantHeight: props.lastAssistantMessageRef.current?.clientHeight ?? 0,
      chatInputHeight: props.composerRef.current?.clientHeight ?? 0,
      containerHeight: props.parentContainerRef?.current?.clientHeight || window.innerHeight,
      extrasHeight: props.extrasRef.current?.clientHeight ?? 0,
      hasDesktopTopBar,
      hasPubsecBanner,
      humanHeight: props.lastHumanMessageRef.current?.clientHeight ?? 0,
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
  ]);

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

  useLayoutEffect(() => {
    if (props.disableInitialScrollToBottom || props.initialPrevMessageCount !== undefined) return;
    if (props.autoScrollRef?.current) props.autoScrollRef.current.scrollToBottom("instant");
    else requestAnimationFrame(() => props.autoScrollRef?.current?.scrollToBottom("instant"));
  }, [props.autoScrollRef, props.disableInitialScrollToBottom, props.initialPrevMessageCount]);

  useLayoutEffect(() => {
    // Official observes lastAssistant, lastHuman, chatInput, extras only (+ window resize).
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
    updateHeight,
  ]);

  return <div aria-hidden="true" data-testid="cowork-bottom-spacer" ref={extraSpaceRef} />;
}
