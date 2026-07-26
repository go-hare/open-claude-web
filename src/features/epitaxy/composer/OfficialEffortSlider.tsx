/**
 * Official effort slider residual (c360a9e1c `Ine` + `Nne` + `Rne` + fillShader `jne`).
 * Structure/classNames from ion-dist; no invented stylesheets.
 *
 * Product public CSS is older and only ships a subset of official arbitrary utilities
 * (no `w-[var(--misc-slider-handle-…)]`, `w-[100cqw]`, mask-image utilities, etc.).
 * Residual dimensions / mask / energy tokens are applied as inline styles so the
 * official classNames still match without adding CSS files (css 不动).
 */
import { Slider } from "@base-ui-components/react/slider";
import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  type Ref,
} from "react";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import {
  OfficialEffortEnergyFill,
  type OfficialEffortEnergyActions,
} from "./OfficialEffortEnergyFill";

const SLIDER_EASE =
  "400ms linear(0, 0.0497, 0.1647, 0.3069, 0.4517, 0.5848, 0.6991, 0.7923, 0.8647, 0.9186, 0.9571, 0.9831, 0.9996, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1)";

/** Official Rne size tokens (c360a9e1c) — classNames match residual; layout px via inline. */
const sizeTokens = {
  large: {
    control: "h-h4",
    track: "rounded-r5",
    trackBox: "my-[2px] h-[calc(100%-4px)]",
    // Residual class string (official ion CSS has these arbitrary utilities; product may not).
    thumb: "w-[var(--misc-slider-handle-width-lg)] h-[calc(var(--misc-slider-handle-height-lg)-4px)] rounded-r5",
    handleInset: "calc(var(--misc-slider-handle-width-lg) / 2)",
    // Inline fallbacks when product CSS lacks the arbitrary utilities above.
    controlHeight: 24,
    trackHeight: 20,
    thumbWidth: 16,
    thumbHeight: 19,
    handleInsetPx: 8,
  },
  small: {
    control: "h-h1",
    track: "rounded-full",
    trackBox: "h-full",
    thumb: "w-[var(--misc-slider-handle-width-sm)] h-[var(--misc-slider-handle-height-sm)] rounded-full",
    handleInset: "calc(var(--misc-slider-handle-width-sm) / 2)",
    controlHeight: 16,
    trackHeight: 16,
    thumbWidth: 12,
    thumbHeight: 12,
    handleInsetPx: 6,
  },
} as const;

/**
 * Official epitaxy-root slider tokens (c6a992d55) + .effect-slider-handle box-shadow.
 * Inlined because product public CSS is older and lacks these residual rules.
 *
 * Light residual: background z2, fill/hover/active t3.
 * (Wrong z1+t3 makes fill ≈ track — left band invisible, “左边不跟手”.)
 * Dark residual swaps to z1/t4; z/t tokens already flip under data-mode, and we
 * re-resolve on the control when dark so ui-slider-* match both blocks.
 */
const sliderTokenStyleLight = {
  ["--ui-slider-background" as string]: "var(--z2, #ebebeb)",
  ["--ui-slider-fill" as string]: "var(--t3, #0000001a)",
  ["--ui-slider-fill-hover" as string]: "var(--t3, #0000001a)",
  ["--ui-slider-fill-active" as string]: "var(--t3, #0000001a)",
  // Official light energy (c6a992d55 .epitaxy-root + @supports color-mix overrides).
  // Charged bed: near-white lavender → near-white pink (reads bright, cells sparkle).
  ["--ui-slider-fill-charged-start" as string]:
    "color-mix(in srgb, var(--accent, var(--extended-purple, #8e6bd9)) 18%, hsl(from var(--extended-purple, #8e6bd9) h calc(s * .8) calc(l * 1.15)))",
  ["--ui-slider-fill-charged-end" as string]:
    "color-mix(in srgb, var(--extended-pink, #ec4899) 15%, hsl(from var(--extended-purple, #8e6bd9) h calc(s * .85) calc(l * 1.02)))",
  ["--ui-slider-energy-hot" as string]: "color-mix(in srgb, var(--extended-pink, #ec4899) 8%, var(--core-white, #fff))",
  ["--ui-slider-energy-cool" as string]: "color-mix(in srgb, var(--extended-purple, #8e6bd9) 40%, var(--core-white, #fff))",
  ["--ui-slider-energy-tint-blue" as string]:
    "color-mix(in srgb, color-mix(in srgb, var(--accent, #3b82f6) 30%, var(--core-white, #fff)) 28%, transparent)",
  ["--ui-slider-energy-tint-pink" as string]:
    "color-mix(in srgb, color-mix(in srgb, var(--extended-pink, #ec4899) 30%, var(--core-white, #fff)) 28%, transparent)",
  ["--ui-slider-energy-reveal" as string]: "45%",
  ["--ui-slider-energy-bed-fill" as string]: "1",
  ["--ui-slider-energy-charge-max" as string]: ".92",
  ["--ui-slider-energy-charge-ramp" as string]: ".5",
  ["--ui-slider-energy-ink-floor" as string]: ".28",
  ["--ui-slider-energy-ink-ceil" as string]: "1",
  ["--ui-slider-energy-gain" as string]: "1.18",
} as CSSProperties;

const sliderTokenStyleDark = {
  ["--ui-slider-background" as string]: "var(--z1, #1a1a1a)",
  ["--ui-slider-fill" as string]: "var(--t4, #ffffff29)",
  ["--ui-slider-fill-hover" as string]: "var(--t4, #ffffff29)",
  ["--ui-slider-fill-active" as string]: "var(--t4, #ffffff29)",
  // Official dark energy (c6a992d55 [data-mode=dark]).
  ["--ui-slider-fill-charged-start" as string]: "#9e80eb",
  ["--ui-slider-fill-charged-end" as string]: "#594099",
  ["--ui-slider-energy-cool" as string]: "var(--core-white, #fff)",
  ["--ui-slider-energy-hot" as string]: "var(--extended-purple, #b796ff)",
  ["--ui-slider-energy-reveal" as string]: "60%",
  ["--ui-slider-energy-tint-blue" as string]: "transparent",
  ["--ui-slider-energy-tint-pink" as string]: "transparent",
  ["--ui-slider-energy-bed-fill" as string]: "0",
  ["--ui-slider-energy-charge-max" as string]: ".85",
  ["--ui-slider-energy-charge-ramp" as string]: "1.1",
  ["--ui-slider-energy-ink-floor" as string]: ".08",
  ["--ui-slider-energy-ink-ceil" as string]: ".85",
  ["--ui-slider-energy-gain" as string]: "1",
} as CSSProperties;

const sliderTokenStyle = {
  ...sliderTokenStyleLight,
  ["--ui-slider-handle" as string]: "var(--core-white, #fff)",
  ["--ui-slider-handle-hover" as string]: "var(--core-white, #fff)",
  ["--ui-slider-handle-active" as string]: "var(--core-white, #fff)",
  ["--ui-slider-handle-energized" as string]: "var(--core-white, #fff)",
  ["--misc-slider-handle-width-lg" as string]: "16px",
  ["--misc-slider-handle-height-lg" as string]: "23px",
  ["--misc-slider-handle-width-sm" as string]: "12px",
  ["--misc-slider-handle-height-sm" as string]: "12px",
  ["--slider-handle-inner-width" as string]: "0px",
  ["--slider-handle-inner-color" as string]: "var(--t0, transparent)",
  ["--slider-handle-outer-width" as string]: "1px",
  ["--slider-handle-outer-color" as string]: "var(--t1, hsla(0,0%,0%,.04))",
  ["--slider-handle-depth-y" as string]: "0px",
  ["--slider-handle-depth-blur" as string]: "12px",
  ["--slider-handle-depth-color" as string]: "var(--shadow-small, hsl(0 0% 0% / 6%))",
} as CSSProperties;

/** Official .effect-slider-handle — inline because product CSS lacks the rule. */
const effectSliderHandleStyle = {
  backgroundColor: "var(--ui-slider-handle)",
  boxShadow:
    "inset 0 0 0 var(--slider-handle-inner-width) var(--slider-handle-inner-color), 0 0 0 var(--slider-handle-outer-width) var(--slider-handle-outer-color), 0 var(--slider-handle-depth-y) var(--slider-handle-depth-blur) 0 var(--slider-handle-depth-color)",
} as CSSProperties;

/** Official Nne */
function stopDotClass(index: number, stopCount: number, fillShader: boolean) {
  return fillShader && index === stopCount - 1 ? "bg-[var(--extended-purple)]" : "bg-t5";
}

function stopDotBackground(index: number, stopCount: number, fillShader: boolean) {
  // Product public CSS lacks residual `bg-t5`; keep className + inline token fallback.
  return fillShader && index === stopCount - 1
    ? "var(--extended-purple, #8e6bd9)"
    : "var(--t5, rgba(10, 10, 10, 0.25))";
}

function ownerWindow(node: Element | null) {
  return node?.ownerDocument?.defaultView ?? window;
}

/**
 * Official stop-dot transition (Ine/Nne). Product CSS has motion-safe:transition-opacity
 * but lacks motion-safe:[transition-delay:var(--dot-stagger)] and the
 * [[data-top-stop]:not([data-dragging])_&]:opacity-0 rule from c6a992d55 residual.
 * Inline delay + top-stop opacity keep residual behavior without shipping CSS.
 */
function stopDotMotionStyle(
  index: number,
  stopCount: number,
  fillShader: boolean,
): CSSProperties {
  return {
    width: 3,
    height: 3,
    borderRadius: 9999,
    background: stopDotBackground(index, stopCount, fillShader),
    ["--dot-stagger" as string]: `${35 * (stopCount - 1 - index)}ms`,
    // Residual motion-safe:transition-opacity + duration-300 + stagger delay.
    // Top-stop hide is residual CSS [[data-top-stop]:not([data-dragging])_&]:opacity-0;
    // product CSS lacks it — applied via DOM in syncStopTopOpacity (no React remount).
    transitionProperty: "opacity",
    transitionDuration: "300ms",
    transitionTimingFunction: "cubic-bezier(0.4, 0, 0.2, 1)",
    transitionDelay: "var(--dot-stagger)",
  };
}

/**
 * Official Ine stop row (Nne + Fk/Pw).
 * Isolated + memo so Slider value commits do not re-render / remount dots (Image #31 flash).
 * Labels resolved via getAriaValueTextRef so parent callback identity is irrelevant.
 */
const OfficialEffortStops = memo(function OfficialEffortStops({
  fillShader,
  getAriaValueTextRef,
  min,
  step,
  stopCount,
  stopRowRef,
  stopTooltipsEnabled,
}: {
  fillShader: boolean;
  getAriaValueTextRef: { current?: ((value: number) => string) | undefined };
  min: number;
  step: number;
  stopCount: number;
  stopRowRef: Ref<HTMLSpanElement | null>;
  stopTooltipsEnabled: boolean;
}) {
  const readLabel = (index: number, stopValue: number) =>
    getAriaValueTextRef.current?.(stopValue) ?? `Level ${index + 1}`;
  const nodes = Array.from({ length: stopCount }, (_, index) => {
    const stopValue = min + index * step;
    const label = readLabel(index, stopValue);
    const className = [
      stopTooltipsEnabled
        ? "pointer-events-auto relative flex size-[3px] items-center justify-center rounded-full"
        : "size-[3px] rounded-full",
      "motion-safe:transition-opacity motion-safe:duration-300",
      "motion-safe:[transition-delay:var(--dot-stagger)]",
      stopTooltipsEnabled
        ? "group-data-[dragging]/slider:pointer-events-none [[data-top-stop]_&]:pointer-events-none [[data-top-stop]:not([data-dragging])_&]:opacity-0"
        : "[[data-top-stop]:not([data-dragging])_&]:opacity-0",
      stopDotClass(index, stopCount, fillShader),
    ].join(" ");
    const style = stopDotMotionStyle(index, stopCount, fillShader);
    if (stopTooltipsEnabled) {
      return (
        <OfficialTooltip key={index} delayDuration={400} side="top" tooltipContent={label}>
          <span className={className} style={style} data-stop-dot="">
            <span className="absolute -inset-x-[8px] -inset-y-[10px]" />
          </span>
        </OfficialTooltip>
      );
    }
    return <span key={index} className={className} style={style} data-stop-dot="" />;
  });
  return (
    <span
      ref={stopRowRef}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 flex items-center justify-between px-p7"
      style={{ paddingLeft: 10, paddingRight: 10 }}
    >
      {/* Official Pw (shared-15 Ma): Tooltip.Provider delay group. */}
      {stopTooltipsEnabled ? (
        <Tooltip.Provider delay={600} closeDelay={200}>
          {nodes}
        </Tooltip.Provider>
      ) : (
        nodes
      )}
    </span>
  );
});

export type OfficialEffortSliderProps = {
  "aria-label"?: string;
  className?: string;
  disabled?: boolean;
  fillShader?: boolean;
  getAriaValueText?: (value: number) => string;
  inputRef?: Ref<HTMLInputElement | null>;
  max?: number;
  min?: number;
  onValueChange?: (value: number) => void;
  onValueCommitted?: (value: number) => void;
  showStops?: boolean;
  size?: keyof typeof sizeTokens;
  step?: number;
  stopTooltips?: boolean;
  value: number;
};

type DragState = {
  catchUp: { fromFraction: number; startTime: number } | null;
  downClientX: number;
  grabOffsetX: number;
  lastClientX: number;
  moved: boolean;
  rafId: number;
  rafWindow: Window | null;
  railRect: DOMRect;
};

export function OfficialEffortSlider({
  "aria-label": ariaLabel,
  className,
  disabled = false,
  fillShader = false,
  getAriaValueText,
  inputRef,
  max = 100,
  min = 0,
  onValueChange,
  onValueCommitted,
  showStops = false,
  size = "large",
  step = 1,
  stopTooltips = false,
  value,
}: OfficialEffortSliderProps) {
  const stopCount = showStops ? Math.floor((max - min) / step) + 1 : 0;
  const tokens = sizeTokens[size];
  const rootRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLSpanElement | null>(null);
  const fillRef = useRef<HTMLSpanElement | null>(null);
  const thumbRef = useRef<HTMLSpanElement | null>(null);
  const energyHostRef = useRef<HTMLSpanElement | null>(null);
  const dragRef = useRef<DragState | null>(null);
  const transitionEndRef = useRef<((event?: TransitionEvent) => void) | null>(null);
  const tickRef = useRef<(() => void) | null>(null);
  const energyRef = useRef<OfficialEffortEnergyActions | null>(null);
  const topStopRef = useRef(false);
  /** Tracks whether the energy press is currently armed (residual `pressed`). */
  const energyPressedRef = useRef(false);
  const stopRowRef = useRef<HTMLSpanElement | null>(null);
  const interactiveStops = showStops && stopCount > 1 && !disabled;
  const energyActive = fillShader && interactiveStops;
  const restPct = max > min ? ((value - min) / (max - min)) * 100 : 0;
  const valueRef = useRef(value);
  valueRef.current = value;
  // Keep tooltip labels fresh without remounting stop DOM when parent recreates getAriaValueText.
  const getAriaValueTextRef = useRef(getAriaValueText);
  getAriaValueTextRef.current = getAriaValueText;

  /**
   * Residual c6a992d55:
   *   [data-top-stop]:not([data-dragging]) … opacity:0
   * Product public CSS lacks this rule. Drive opacity on existing stop nodes via DOM so
   * attribute changes never remount the stop tree (remount = Image #31 flash).
   */
  const syncStopTopOpacity = useCallback(() => {
    const root = rootRef.current;
    const row = stopRowRef.current;
    if (!row) return;
    const hide = !!root?.hasAttribute("data-top-stop") && !root.hasAttribute("data-dragging");
    row.querySelectorAll<HTMLElement>("[data-stop-dot]").forEach((el) => {
      el.style.opacity = hide ? "0" : "1";
      if ((el.className || "").includes("pointer-events-auto")) {
        el.style.pointerEvents = hide ? "none" : "auto";
      }
    });
  }, []);

  // Official c6a992d55: light z2/t3, dark z1/t4 on .epitaxy-root.
  const [darkSliderTokens, setDarkSliderTokens] = useState(false);
  useLayoutEffect(() => {
    const root = rootRef.current;
    const doc = root?.ownerDocument ?? document;
    const read = () => {
      const modeEl = root?.closest("[data-mode]") ?? doc.documentElement;
      const mode = modeEl?.getAttribute("data-mode") ?? "";
      setDarkSliderTokens(mode === "dark" || (!mode && doc.documentElement.classList.contains("dark")));
    };
    read();
    const mo = new MutationObserver(read);
    mo.observe(doc.documentElement, { attributes: true, attributeFilter: ["data-mode", "class"] });
    const body = doc.body;
    if (body) mo.observe(body, { attributes: true, attributeFilter: ["data-mode", "class"] });
    return () => mo.disconnect();
  }, []);

  const setTopStop = useCallback((on: boolean) => {
    if (!fillShader || topStopRef.current === on) return;
    topStopRef.current = on;
    rootRef.current?.toggleAttribute("data-top-stop", on);
    syncStopTopOpacity();
    // Official Ine: pressStart(1) / pressEnd(1) only at top stop.
    energyPressedRef.current = on;
    if (on) energyRef.current?.pressStart(1);
    else energyRef.current?.pressEnd(1);
  }, [fillShader, syncStopTopOpacity]);

  // Base UI sets data-dragging on Control; residual shows stops again while dragging at top.
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const sync = () => syncStopTopOpacity();
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(root, { attributes: true, attributeFilter: ["data-dragging", "data-top-stop"] });
    return () => mo.disconnect();
  }, [energyActive, interactiveStops, syncStopTopOpacity]);

  useLayoutEffect(() => {
    topStopRef.current = false;
    rootRef.current?.removeAttribute("data-top-stop");
    syncStopTopOpacity();
    const drag = dragRef.current;
    if (drag) {
      if (drag.rafId !== 0) (drag.rafWindow ?? ownerWindow(rootRef.current)).cancelAnimationFrame(drag.rafId);
      dragRef.current = null;
    }
    if (transitionEndRef.current && thumbRef.current) {
      thumbRef.current.removeEventListener("transitionend", transitionEndRef.current);
      transitionEndRef.current = null;
    }
    rootRef.current?.style.removeProperty("--slider-drag-pos");
    if (fillRef.current) fillRef.current.style.transition = "";
    if (thumbRef.current) thumbRef.current.style.transition = "";
  }, [energyActive, syncStopTopOpacity]);

  useLayoutEffect(() => {
    if (!energyActive) return;
    if (dragRef.current?.moved) return;
    // Official Ine: re-fire only on a real top-stop change (click/keyboard), not on
    // every parent commit — but DO re-fire when reopening the popover at Ultracode.
    if (!topStopRef.current || !energyPressedRef.current) {
      setTopStop((max > min ? (value - min) / (max - min) : 0) >= 0.999);
    }
  }, [energyActive, max, min, setTopStop, value]);

  useEffect(() => {
    if (dragRef.current === null) rootRef.current?.style.removeProperty("--slider-drag-pos");
  }, [value]);

  useEffect(() => {
    if (energyActive && topStopRef.current) energyRef.current?.pressStart(1);
  }, [energyActive]);

  // Keep energy host opacity/mask in sync with --slider-drag-pos / rest (product CSS lacks residual opacity/mask utilities).
  useLayoutEffect(() => {
    const host = energyHostRef.current;
    if (!host || !energyActive) return;
    const maskPos = `var(--slider-drag-pos, var(--slider-rest-pos))`;
    host.style.opacity = darkSliderTokens
      ? `clamp(0%, calc((${maskPos} - 25%) * 0.86), 65%)`
      : `clamp(0%, calc((${maskPos} - 25%) * 1.33), 100%)`;
    host.style.maskImage = `linear-gradient(to right, transparent 0%, black var(--ui-slider-energy-reveal, 70%))`;
    host.style.webkitMaskImage = `linear-gradient(to right, transparent 0%, black var(--ui-slider-energy-reveal, 70%))`;
    host.style.maskRepeat = "no-repeat";
    host.style.webkitMaskRepeat = "no-repeat";
    host.style.maskSize = `max(calc(${maskPos} - ${tokens.handleInset}), 0px) 100%`;
    host.style.webkitMaskSize = `max(calc(${maskPos} - ${tokens.handleInset}), 0px) 100%`;
  }, [darkSliderTokens, energyActive, restPct, tokens.handleInset, value]);

  useEffect(() => () => {
    const drag = dragRef.current;
    if (drag?.rafId) (drag.rafWindow ?? ownerWindow(rootRef.current)).cancelAnimationFrame(drag.rafId);
    dragRef.current = null;
  }, []);

  const fractionFromDrag = useCallback((drag: DragState) => {
    return Math.min(Math.max((drag.lastClientX - drag.grabOffsetX - drag.railRect.left) / (drag.railRect.width || 1), 0), 1);
  }, []);

  const tickDrag = useCallback(() => {
    const drag = dragRef.current;
    const root = rootRef.current;
    const rail = railRef.current;
    if (!drag || !root || !rail) return;
    drag.rafId = 0;
    drag.railRect = rail.getBoundingClientRect();
    const steps = stopCount - 1;
    if (steps < 1) return;
    let frac = fractionFromDrag(drag);
    if (drag.catchUp) {
      const t = Math.min((performance.now() - drag.catchUp.startTime) / 100, 1);
      if (t >= 1) drag.catchUp = null;
      else {
        const ease = 1 - (1 - t) ** 3;
        frac = drag.catchUp.fromFraction + (frac - drag.catchUp.fromFraction) * ease;
      }
    }
    const snapped = Math.round(frac * steps) / steps;
    root.style.setProperty("--slider-drag-pos", `${100 * frac}%`);
    // Refresh energy mask against live drag pos (dark opacity ramp matches residual).
    const host = energyHostRef.current;
    if (host && energyActive) {
      const dragMaskPos = `var(--slider-drag-pos, var(--slider-rest-pos))`;
      host.style.opacity = darkSliderTokens
        ? `clamp(0%, calc((${dragMaskPos} - 25%) * 0.86), 65%)`
        : `clamp(0%, calc((${dragMaskPos} - 25%) * 1.33), 100%)`;
      host.style.maskSize = `max(calc(${dragMaskPos} - ${tokens.handleInset}), 0px) 100%`;
      host.style.webkitMaskSize = host.style.maskSize;
    }
    setTopStop(snapped >= 0.999);
    if (drag.catchUp && drag.rafId === 0) {
      drag.rafWindow = ownerWindow(rootRef.current);
      drag.rafId = drag.rafWindow.requestAnimationFrame(() => tickRef.current?.());
    }
  }, [darkSliderTokens, energyActive, fractionFromDrag, setTopStop, stopCount, tokens.handleInset]);

  useEffect(() => {
    tickRef.current = tickDrag;
  }, [tickDrag]);

  const endDrag = useCallback(() => {
    const drag = dragRef.current;
    const root = rootRef.current;
    const fill = fillRef.current;
    const thumb = thumbRef.current;
    dragRef.current = null;
    if (!(drag && root && fill && thumb)) return;
    if (drag.rafId !== 0) (drag.rafWindow ?? ownerWindow(rootRef.current)).cancelAnimationFrame(drag.rafId);
    const width = drag.railRect.width || 1;
    const frac = fractionFromDrag(drag);
    if (stopCount - 1 < 1) {
      setTopStop(false);
      root.style.removeProperty("--slider-drag-pos");
      fill.style.transition = "";
      thumb.style.transition = "";
      return;
    }
    const committed = max > min ? (valueRef.current - min) / (max - min) : 0;
    setTopStop(committed >= 0.999);
    if (!drag.moved) {
      root.style.removeProperty("--slider-drag-pos");
      const onEnd = (event?: TransitionEvent) => {
        if (event && event.propertyName !== "left") return;
        transitionEndRef.current = null;
        thumb.removeEventListener("transitionend", onEnd);
        fill.style.transition = "";
        thumb.style.transition = "";
      };
      if (thumb.getAnimations().length > 0) {
        transitionEndRef.current = onEnd;
        thumb.addEventListener("transitionend", onEnd);
      } else onEnd();
      return;
    }
    if (Math.abs(frac - committed) * width < 0.5 || ownerWindow(root).matchMedia("(prefers-reduced-motion: reduce)").matches) {
      root.style.removeProperty("--slider-drag-pos");
      return;
    }
    const onEnd = (event?: TransitionEvent) => {
      if (event && event.propertyName !== "left") return;
      transitionEndRef.current = null;
      thumb.removeEventListener("transitionend", onEnd);
      fill.style.transition = "";
      thumb.style.transition = "";
      root.style.removeProperty("--slider-drag-pos");
    };
    fill.style.transition = `width ${SLIDER_EASE}`;
    thumb.style.transition = `left ${SLIDER_EASE}, background-color 300ms`;
    root.style.setProperty("--slider-drag-pos", `${100 * committed}%`);
    transitionEndRef.current = onEnd;
    thumb.addEventListener("transitionend", onEnd);
  }, [fractionFromDrag, max, min, setTopStop, stopCount]);

  const onPointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const root = rootRef.current;
    const rail = railRef.current;
    const fill = fillRef.current;
    const thumb = thumbRef.current;
    if (!interactiveStops || event.button !== 0 || event.defaultPrevented || !root || !rail || !fill || !thumb) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // ignore
    }
    if (transitionEndRef.current) {
      thumb.removeEventListener("transitionend", transitionEndRef.current);
      transitionEndRef.current = null;
    }
    const reduce = ownerWindow(root).matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      fill.style.transition = "";
      thumb.style.transition = "";
    } else {
      fill.style.transition = `width ${SLIDER_EASE}`;
      thumb.style.transition = `left ${SLIDER_EASE}, background-color 300ms`;
    }
    root.style.removeProperty("--slider-drag-pos");
    const thumbRect = thumb.getBoundingClientRect();
    const target = event.target;
    const onThumb = target !== null && typeof (target as Node).nodeType === "number" && thumb.contains(target as Node);
    dragRef.current = {
      railRect: rail.getBoundingClientRect(),
      grabOffsetX: onThumb ? event.clientX - (thumbRect.left + thumbRect.width / 2) : 0,
      downClientX: event.clientX,
      lastClientX: event.clientX,
      rafId: 0,
      rafWindow: null,
      moved: false,
      catchUp: null,
    };
  }, [interactiveStops]);

  const onPointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    drag.lastClientX = event.clientX;
    if (event.buttons === 0) {
      endDrag();
      return;
    }
    if (!drag.moved) {
      if (Math.abs(event.clientX - drag.downClientX) < 3) return;
      drag.moved = true;
      const root = rootRef.current;
      const fill = fillRef.current;
      const thumb = thumbRef.current;
      if (root && fill && thumb) {
        // Official Ine: clear width/left transitions once drag is intentional so
        // fill + thumb track --slider-drag-pos 1:1 (no lag = “左边不跟手”).
        fill.style.transition = "none";
        thumb.style.transition = "none";
        // Cancel in-flight WAAPI from prior click seek.
        try {
          fill.getAnimations().forEach((a) => a.cancel());
          thumb.getAnimations().forEach((a) => a.cancel());
        } catch {
          // ignore
        }
        const width = root.getBoundingClientRect().width;
        if (width > 0 && !ownerWindow(root).matchMedia("(prefers-reduced-motion: reduce)").matches) {
          const from = Math.min(Math.max(fill.getBoundingClientRect().width / width, 0), 1);
          root.style.setProperty("--slider-drag-pos", `${100 * from}%`);
          drag.catchUp = { fromFraction: from, startTime: performance.now() };
        }
      }
    }
    if (drag.rafId === 0) {
      drag.rafWindow = ownerWindow(rootRef.current);
      drag.rafId = drag.rafWindow.requestAnimationFrame(() => tickRef.current?.());
    }
  }, [endDrag]);

  const handleValueChange = useCallback((next: number | readonly number[]) => {
    const n = Array.isArray(next) ? next[0] : next;
    if (typeof n !== "number" || Number.isNaN(n)) return;
    onValueChange?.(n);
  }, [onValueChange]);

  const handleValueCommitted = useCallback((next: number | readonly number[]) => {
    const n = Array.isArray(next) ? next[0] : next;
    if (typeof n !== "number" || Number.isNaN(n)) return;
    if (fillRef.current) fillRef.current.style.transition = `width ${SLIDER_EASE}`;
    if (thumbRef.current) thumbRef.current.style.transition = `left ${SLIDER_EASE}, background-color 300ms`;
    onValueCommitted?.(n);
  }, [onValueCommitted]);

  const fillWidthStyle = {
    // Official Ine: fill width tracks --slider-drag-pos with w-[var(...)] — a CSS
    // transition on this width property, so the energy mask (same var) animates
    // right→left over 400ms Sne on commit ( Ultracode 从右边慢慢往左 ).
    transition: `width ${SLIDER_EASE}`,
    width: "var(--slider-drag-pos, var(--slider-rest-pos))",
  } as CSSProperties;

  const thumbLayoutStyle = {
    ...effectSliderHandleStyle,
    transition: `left ${SLIDER_EASE}, background-color 300ms`,
    width: tokens.thumbWidth,
    height: tokens.thumbHeight,
    left: "var(--slider-drag-pos, var(--slider-rest-pos))",
  } as CSSProperties;

  // Residual tooltips gate is `d&&!o&&f`, but product must not rebuild stop DOM when
  // parent briefly toggles disabled (configBusy). Keep tooltip structure stable once
  // labels exist; disabled only greys the slider root.
  const stopTooltipsEnabled = Boolean(stopTooltips && getAriaValueText);
  const stops: ReactNode =
    stopCount > 1 ? (
      <OfficialEffortStops
        fillShader={fillShader}
        getAriaValueTextRef={getAriaValueTextRef}
        min={min}
        step={step}
        stopCount={stopCount}
        stopRowRef={stopRowRef}
        stopTooltipsEnabled={stopTooltipsEnabled}
      />
    ) : null;

  return (
    <Slider.Root
      className={`group/slider flex w-full items-center ${disabled ? "opacity-50" : ""} ${className ?? ""}`}
      disabled={disabled}
      max={max}
      min={min}
      onValueChange={handleValueChange}
      onValueCommitted={handleValueCommitted}
      step={step}
      style={{
        ...sliderTokenStyle,
        ...(darkSliderTokens ? sliderTokenStyleDark : sliderTokenStyleLight),
      }}
      value={value}
    >
      <Slider.Control
        className={`relative flex ${tokens.control} w-full touch-none select-none items-center data-[dragging]:cursor-ew-resize`}
        ref={rootRef}
        style={{
          ["--slider-rest-pos" as string]: `${restPct}%`,
          height: tokens.controlHeight,
          width: "100%",
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onLostPointerCapture={endDrag}
      >
        <Slider.Track
          className={`relative w-full overflow-hidden ${tokens.trackBox} ${tokens.track} bg-[var(--ui-slider-background)]`}
          style={{
            width: "100%",
            height: tokens.trackHeight,
            marginBlock: size === "large" ? 2 : 0,
            borderRadius: size === "large" ? "var(--r5, 6px)" : 9999,
            background: "var(--ui-slider-background)",
            containerType: "inline-size",
            overflow: "hidden",
            position: "relative",
          }}
        >
          <span
            ref={fillRef}
            className="absolute inset-y-0 left-0 overflow-hidden bg-[var(--ui-slider-fill)] group-hover/slider:bg-[var(--ui-slider-fill-hover)] group-data-[dragging]/slider:bg-[var(--ui-slider-fill-active)] group-hover/slider:group-data-[dragging]/slider:bg-[var(--ui-slider-fill-active)]"
            style={{
              ...fillWidthStyle,
              top: 0,
              bottom: 0,
              left: 0,
              overflow: "hidden",
              background: "var(--ui-slider-fill)",
            }}
          >
            {energyActive ? (
              <span
                ref={energyHostRef}
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-0 [[data-mode=dark]_&]:mix-blend-plus-lighter"
                style={{
                  top: 0,
                  bottom: 0,
                  left: 0,
                  // Official w-[100cqw] — full track width in container query px; 100% of track via cqw fallback.
                  width: "100cqw",
                  minWidth: "100%",
                  pointerEvents: "none",
                  position: "absolute",
                }}
              >
                <OfficialEffortEnergyFill actionsRef={energyRef} />
              </span>
            ) : null}
          </span>
        </Slider.Track>
        {stops}
        <span
          ref={railRef}
          className="pointer-events-none absolute inset-y-0"
          style={{ left: tokens.handleInsetPx, right: tokens.handleInsetPx, top: 0, bottom: 0 }}
        >
          <span
            ref={thumbRef}
            aria-hidden="true"
            className={`${tokens.thumb} pointer-events-auto absolute top-1/2 -translate-x-1/2 -translate-y-1/2 motion-safe:transition-[background-color] motion-safe:duration-300 ${disabled ? "" : "cursor-ew-resize"} bg-[var(--ui-slider-handle)] group-hover/slider:bg-[var(--ui-slider-handle-hover)] group-data-[dragging]/slider:bg-[var(--ui-slider-handle-active)] group-hover/slider:group-data-[dragging]/slider:bg-[var(--ui-slider-handle-active)] [[data-top-stop]_&]:[--ui-slider-handle:var(--ui-slider-handle-energized)] [[data-top-stop]_&]:[--ui-slider-handle-active:var(--ui-slider-handle-energized)] [[data-top-stop]_&]:[--ui-slider-handle-hover:var(--ui-slider-handle-energized)] effect-slider-handle`}
            style={{
              ...thumbLayoutStyle,
              position: "absolute",
              top: "50%",
              transform: "translate(-50%, -50%)",
              borderRadius: size === "large" ? "var(--r5, 6px)" : 9999,
              pointerEvents: "auto",
              cursor: disabled ? undefined : "ew-resize",
            }}
          />
          <Slider.Thumb
            className={`${tokens.thumb} pointer-events-none outline-none opacity-0`}
            style={{ width: tokens.thumbWidth, height: tokens.thumbHeight, opacity: 0 }}
            getAriaLabel={ariaLabel ? () => ariaLabel : undefined}
            getAriaValueText={getAriaValueText ? (_formatted, raw) => getAriaValueText(raw) : undefined}
            inputRef={inputRef}
          />
        </span>
      </Slider.Control>
    </Slider.Root>
  );
}
