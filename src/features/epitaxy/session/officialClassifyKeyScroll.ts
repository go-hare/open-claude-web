/**
 * Official ca80fca8d `NZ` (cd5a `Zd`) key-scroll classifier for Lse.
 *
 * Local subset: jZ remap, nested `[data-testid=epitaxy-virtual-transcript]`,
 * overflow-Y parent walk, cZ. Find/toast `ln`/`Cl` and unresolved Gf/Qf
 * (shared-21 Ft/Pt are not functions in this pin) stay skipped — no invent.
 */
const OFFICIAL_TRANSCRIPT_TESTID = "epitaxy-virtual-transcript";

export type OfficialKeyScrollDirection = "up" | "down" | "none";

/** Official `jZ`. Alt-as-page (`Rr()`) omitted — local has no that remap. */
export function officialKeyScrollLogicalKey(event: KeyboardEvent): string | null {
  if (event.ctrlKey && !event.metaKey && !event.altKey && !event.shiftKey
    && (event.key === "Home" || event.key === "End")) {
    return event.key;
  }
  if (event.ctrlKey || event.metaKey || event.altKey) return null;
  return event.key;
}

function isOverflowYScrollable(element: Element, view: Window | null) {
  const node = element as HTMLElement;
  return node.scrollTop > 0
    && node.scrollHeight > node.clientHeight
    && ["auto", "scroll"].includes(view?.getComputedStyle(node).overflowY ?? "");
}

/** Official `cZ`. */
export function officialKeyScrollOutsideOverflow(
  target: EventTarget | null,
  scroller: HTMLElement,
): boolean {
  if (!(target instanceof Element) || scroller.contains(target)) return false;
  const doc = target.ownerDocument;
  for (
    let node: Element | null = target;
    node !== null && node !== doc.body && node !== doc.documentElement;
    node = node.parentElement
  ) {
    if (node.contains(scroller)) return false;
    const overflowY = node.ownerDocument.defaultView?.getComputedStyle(node).overflowY;
    if (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") return true;
  }
  return false;
}

export function officialClassifyKeyScroll(
  event: KeyboardEvent,
  scroller: HTMLElement,
): OfficialKeyScrollDirection {
  const key = officialKeyScrollLogicalKey(event);
  if (key === null || (event.shiftKey && (key === "Home" || key === "End"))) return "none";
  const shiftTab = key === "Tab" && event.shiftKey;
  const target = event.target;
  const nested = target instanceof Element
    ? target.closest(`[data-testid="${OFFICIAL_TRANSCRIPT_TESTID}"]`)
    : null;
  if (
    key === "ArrowDown" || key === "PageDown" || key === "End"
    || (key === " " && !event.shiftKey && target instanceof Node && scroller.contains(target))
  ) {
    if (nested && nested !== scroller) return "none";
    return "down";
  }
  const goingUp = key === "ArrowUp" || key === "PageUp"
    || ((key === "Home" || (key === " " && event.shiftKey)) && target instanceof Node && scroller.contains(target));
  if (!shiftTab && !goingUp) return "none";
  if (nested && nested !== scroller) return "none";
  if (shiftTab) return "up";
  if (
    target instanceof Element
    && typeof target.matches === "function"
    && key === " "
    && target.matches("button,[role=button],[role=switch],[role=checkbox],summary")
  ) {
    return "none";
  }
  const view = scroller.ownerDocument.defaultView;
  const tabbableOverflow = target instanceof HTMLElement
    && target.tabIndex >= 0
    && target.scrollHeight > target.clientHeight;
  if (
    key === "Home" || (key === " " && event.shiftKey)
    || ((key === "ArrowUp" || key === "PageUp")
      && (tabbableOverflow || officialKeyScrollOutsideOverflow(target, scroller)))
  ) {
    if (!(target instanceof Node) || !scroller.contains(target)) return "none";
    let node: Element | null = target instanceof Element ? target : target.parentElement;
    while (view && node && node !== scroller && node.nodeType === 1) {
      if (isOverflowYScrollable(node, view)) return "none";
      node = node.parentElement;
    }
  }
  return "up";
}
