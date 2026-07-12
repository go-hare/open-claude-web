/**
 * Official IYe pin-to-bottom controller as a hook (pretty function IYe).
 * Owns pin ref + ResizeObserver re-stick + imperative handle surface.
 * Source: index-BELzQL5P.pretty.js IYe.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, type RefObject } from "react";
import {
  isCoworkNearBottom,
  resolveCoworkScrollBehavior,
  updateCoworkAutoscrollPin,
  type CoworkAutoscrollHandle,
  type CoworkAutoscrollScrollBehavior,
  type CoworkAutoscrollScrollOptions,
  type CoworkPinToBottomConfig,
} from "./coworkAutoscroll";

const DEFAULT_PIN_CONFIG: Required<CoworkPinToBottomConfig> = {
  disabled: false,
  initialValue: false,
};

export function useCoworkAutoscroll(
  scrollRef: RefObject<HTMLDivElement | null>,
  innerRef: RefObject<HTMLDivElement | null>,
  pinToBottomConfig?: CoworkPinToBottomConfig,
): CoworkAutoscrollHandle {
  const config = {
    disabled: pinToBottomConfig?.disabled ?? DEFAULT_PIN_CONFIG.disabled,
    initialValue: pinToBottomConfig?.initialValue ?? DEFAULT_PIN_CONFIG.initialValue,
  };
  const pinnedRef = useRef(config.initialValue);
  const programmaticRef = useRef(false);
  const previousTopRef = useRef(0);
  const previousHeightRef = useRef(0);
  const programmaticTimerRef = useRef<number | null>(null);

  // Keep pin seed in sync if config.initialValue changes across remounts of the same hook instance.
  const initialValueRef = useRef(config.initialValue);
  if (initialValueRef.current !== config.initialValue) {
    initialValueRef.current = config.initialValue;
    pinnedRef.current = config.initialValue;
  }

  const getScrollContainer = useCallback(() => scrollRef.current, [scrollRef]);

  const setPinToBottom = useCallback((pinned: boolean) => {
    pinnedRef.current = pinned;
  }, []);

  const scrollToBottom = useCallback((
    behavior: CoworkAutoscrollScrollBehavior = "auto",
    options?: CoworkAutoscrollScrollOptions,
  ) => {
    const node = scrollRef.current;
    if (!node) return;
    if (options?.onlyIfPinned && !pinnedRef.current) return;
    const { scrollHeight, scrollTop, clientHeight } = node;
    if (scrollTop > scrollHeight - clientHeight) return;
    programmaticRef.current = true;
    node.scrollTo({ behavior: resolveCoworkScrollBehavior(behavior), top: node.scrollHeight });
    if (programmaticTimerRef.current != null) window.clearTimeout(programmaticTimerRef.current);
    programmaticTimerRef.current = window.setTimeout(() => {
      programmaticRef.current = false;
      programmaticTimerRef.current = null;
    }, 0);
  }, [scrollRef]);

  useLayoutEffect(() => {
    const node = scrollRef.current;
    const inner = innerRef.current;
    if (!node || !inner || config.disabled) return;

    const onScroll = () => {
      const scrolledUp = node.scrollTop < previousTopRef.current;
      const heightShrank = node.scrollHeight < previousHeightRef.current;
      previousTopRef.current = node.scrollTop;
      previousHeightRef.current = node.scrollHeight;
      pinnedRef.current = updateCoworkAutoscrollPin({
        heightShrank,
        nearBottom: isCoworkNearBottom(node),
        pinned: pinnedRef.current,
        programmatic: programmaticRef.current,
        scrolledUp,
      });
    };

    const stickIfPinned = () => {
      if (!pinnedRef.current) return;
      scrollToBottom("auto");
    };

    const observer = new ResizeObserver(stickIfPinned);
    node.addEventListener("scroll", onScroll, { passive: true });
    observer.observe(inner);
    observer.observe(node);
    stickIfPinned();

    return () => {
      node.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (programmaticTimerRef.current != null) {
        window.clearTimeout(programmaticTimerRef.current);
        programmaticTimerRef.current = null;
      }
    };
  }, [config.disabled, innerRef, scrollRef, scrollToBottom]);

  return useMemo(() => ({
    getScrollContainer,
    innerRef,
    scrollToBottom,
    setPinToBottom,
  }), [getScrollContainer, innerRef, scrollToBottom, setPinToBottom]);
}
