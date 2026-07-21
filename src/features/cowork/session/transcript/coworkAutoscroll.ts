/**
 * Official IYe pin-to-bottom autoscroll API (pretty ~106047 / function IYe).
 * Handle: { getScrollContainer, scrollToBottom(behavior, { onlyIfPinned }), setPinToBottom, innerRef }.
 * pinToBottomConfig: { disabled, initialValue } — conversation defaults omit config (initial false);
 * agent session path re-pins via t$t scroll button / streaming session effects.
 * Near-bottom floor: Math.floor(distance) < 8. Unpin when scrolledUp && !nearBottom && !heightShrank.
 * Source: index-BELzQL5P.pretty.js IYe / t$t.
 */

export type CoworkAutoscrollScrollBehavior = ScrollBehavior | "instant";

export type CoworkAutoscrollScrollOptions = {
  onlyIfPinned?: boolean;
};

export type CoworkPinToBottomConfig = {
  disabled?: boolean;
  initialValue?: boolean;
};

export type CoworkAutoscrollHandle = {
  getScrollContainer: () => HTMLElement | null;
  innerRef: { current: HTMLDivElement | null };
  scrollToBottom: (
    behavior?: CoworkAutoscrollScrollBehavior,
    options?: CoworkAutoscrollScrollOptions,
  ) => void;
  setPinToBottom: (pinned: boolean) => void;
};

/** Official near-bottom floor used by IYe scroll handler. */
export const COWORK_AUTOSCROLL_NEAR_BOTTOM_PX = 8;

export function isCoworkNearBottom(node: Pick<HTMLElement, "clientHeight" | "scrollHeight" | "scrollTop">): boolean {
  const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
  return Math.floor(distance) < COWORK_AUTOSCROLL_NEAR_BOTTOM_PX;
}

/**
 * Official IYe scroll listener pin update.
 * Returns next pin value (and updates previous top/height trackers via mutation of input refs).
 */
export function updateCoworkAutoscrollPin(input: {
  heightShrank: boolean;
  nearBottom: boolean;
  pinned: boolean;
  programmatic: boolean;
  scrolledUp: boolean;
}): boolean {
  if (input.programmatic) return input.pinned;
  if (!input.nearBottom && input.scrolledUp && !input.heightShrank) return false;
  return input.pinned;
}

/** Map official "instant" to browser ScrollBehavior. */
export function resolveCoworkScrollBehavior(behavior: CoworkAutoscrollScrollBehavior = "auto"): ScrollBehavior {
  return behavior === "instant" ? "auto" : behavior;
}

/**
 * Official z3t session-open gate (index-BELzQL5P.pretty.js function z3t):
 * once per sessionId when !isLoading && messages.length > 0, rAF sets
 * [data-autoscroll-container].scrollTop = scrollHeight.
 * Does not restore mid-scroll — Cowork local session entry always opens at bottom.
 */
export function shouldScrollCoworkSessionOpen(input: {
  hasMessages: boolean;
  isLoading: boolean;
  lastScrolledSessionId: string | null;
  sessionId: string;
}): boolean {
  if (input.isLoading) return false;
  if (!input.hasMessages) return false;
  if (input.lastScrolledSessionId === input.sessionId) return false;
  return true;
}

/** Official z3t rAF body: assign scrollTop = scrollHeight on the autoscroll container. */
export function scrollCoworkSessionOpenToBottom(
  container: Pick<HTMLElement, "scrollHeight" | "scrollTop"> | null | undefined,
): boolean {
  if (!container) return false;
  container.scrollTop = container.scrollHeight;
  return true;
}

/**
 * Official D1e `cu_lock_released` (index-BELzQL5P ~114004–114009):
 * if event.sessionId === current session, rAF:
 *   document.querySelector("[data-autoscroll-container]").scrollTop = scrollHeight
 * Pure body shared with z3t; schedule helper for runtime/browser.
 */
export function applyCoworkCuLockReleasedScroll(options: {
  container?: Pick<HTMLElement, "scrollHeight" | "scrollTop"> | null;
  document?: { querySelector: (sel: string) => Element | null };
  eventSessionId: string | null | undefined;
  sessionId: string;
  schedule?: (cb: () => void) => void;
}): boolean {
  if (!options.eventSessionId || options.eventSessionId !== options.sessionId) {
    return false;
  }
  const schedule = options.schedule ?? ((cb) => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(cb);
    else cb();
  });
  const resolveContainer = (): Pick<HTMLElement, "scrollHeight" | "scrollTop"> | null => {
    if (options.container) return options.container;
    const doc = options.document
      ?? (typeof document !== "undefined" ? document : null);
    if (!doc) return null;
    const el = doc.querySelector("[data-autoscroll-container]");
    return el as Pick<HTMLElement, "scrollHeight" | "scrollTop"> | null;
  };
  schedule(() => {
    scrollCoworkSessionOpenToBottom(resolveContainer());
  });
  return true;
}
