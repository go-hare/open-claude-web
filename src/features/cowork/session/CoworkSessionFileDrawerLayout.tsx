/**
 * Official yUt chat+drawer shell (index-BELzQL5P.pretty.js function yUt).
 * Flex model: bUt=100; drawer open flex ~50; resize aria "Resize file viewer".
 * Children order: main | resize handle | drawer | rightSidebar.
 * Source: index-BELzQL5P.pretty.js yUt / sUt / bUt / xUt / pa.
 *
 * Official `pa` is framer-motion numeric animate. motion@12's number animate does not
 * fire onUpdate in this host shell, so we drive the same xUt spring with rAF while
 * keeping official terminal flex writes (main/drawer style.flex strings).
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useCoworkDrawerExpanded } from "./chatResource/CoworkChatResourceProvider";

/** Official xUt = { type:'spring', stiffness:1200, damping:80, mass:0.1 } */
export const COWORK_DRAWER_SPRING = { type: "spring", stiffness: 1200, damping: 80, mass: 0.1 } as const;
const COWORK_DRAWER_FLEX_TOTAL = 100;
const COWORK_DRAWER_OPEN_FLEX = 50;
const COWORK_MAIN_MIN_PX = 420;
const COWORK_DRAWER_MIN_PX = 240;

export function clampCoworkDrawerFlex(intendedDrawerFlex: number, containerWidth: number) {
  if (containerWidth <= 0) return 0;
  const maxDrawerFlex = Math.max(0, COWORK_DRAWER_FLEX_TOTAL - (COWORK_MAIN_MIN_PX / containerWidth) * COWORK_DRAWER_FLEX_TOTAL);
  return Math.min(Math.max(0, intendedDrawerFlex), maxDrawerFlex);
}

/**
 * Official yUt uses pa(from, to, xUt). Drive the same xUt spring analytically so flex
 * moves when motion number animate is inert, without Euler blow-ups (k=1200,m=0.1).
 * xUt is strongly overdamped (zeta≈3.65); closed form is stable at 60fps.
 */
export function animateCoworkDrawerSpring(
  from: number,
  to: number,
  {
    stiffness = COWORK_DRAWER_SPRING.stiffness,
    damping = COWORK_DRAWER_SPRING.damping,
    mass = COWORK_DRAWER_SPRING.mass,
    onUpdate,
    onComplete,
  }: {
    stiffness?: number;
    damping?: number;
    mass?: number;
    onUpdate: (value: number) => void;
    onComplete?: () => void;
  },
) {
  // Prefer setTimeout over rAF: Electron/CDP and background windows often starve rAF,
  // which left yUt stuck at flex 0 (Izt zero-size). setTimeout still matches xUt timing.
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const start = typeof performance !== "undefined" ? performance.now() : Date.now();
  const displacement = from - to;
  const nowMs = () => (typeof performance !== "undefined" ? performance.now() : Date.now());
  const schedule = (cb: (t: number) => void) => {
    timer = setTimeout(() => cb(nowMs()), 16);
  };
  const cancel = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };

  if (Math.abs(displacement) < 1e-4) {
    onUpdate(to);
    onComplete?.();
    return { stop() {} };
  }

  const omega0 = Math.sqrt(stiffness / mass);
  const zeta = damping / (2 * Math.sqrt(stiffness * mass));
  // Official xUt is overdamped; keep a tiny epsilon so sqrt stays real if params change.
  const zetaClamped = Math.max(zeta, 1.0001);
  const omegaD = omega0 * Math.sqrt(zetaClamped * zetaClamped - 1);
  const r1 = -zetaClamped * omega0 + omegaD;
  const r2 = -zetaClamped * omega0 - omegaD;
  // Rest initial velocity: c1 + c2 = displacement; r1*c1 + r2*c2 = 0
  const c1 = displacement * (-r2 / (r1 - r2));
  const c2 = displacement - c1;

  const sample = (tSec: number) => to + c1 * Math.exp(r1 * tSec) + c2 * Math.exp(r2 * tSec);

  const step = (now: number) => {
    if (stopped) return;
    const tSec = Math.max(0, (now - start) / 1000);
    const value = sample(tSec);
    // Settle near target (xUt is snappy; ~120ms visually complete).
    if (Math.abs(value - to) < 0.05 || tSec > 0.6) {
      onUpdate(to);
      onComplete?.();
      return;
    }
    onUpdate(value);
    schedule(step);
  };

  // First paint immediately so open never waits a full frame on a starved scheduler.
  onUpdate(sample(0));
  schedule(step);
  return {
    stop() {
      stopped = true;
      cancel();
    },
  };
}

export function CoworkSessionFileDrawerLayout({
  drawer,
  isDrawerOpen,
  main,
  rightSidebar,
}: {
  drawer: ReactNode;
  isDrawerOpen: boolean;
  main: ReactNode;
  rightSidebar?: ReactNode;
}) {
  const { setIsDrawerExpanded } = useCoworkDrawerExpanded();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mainRef = useRef<HTMLDivElement | null>(null);
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const intendedDrawerFlexRef = useRef(0);
  const interactedRef = useRef(false);
  const resizeOriginRef = useRef({ containerPx: 1, leftPx: 0 });
  const [isResizing, setIsResizing] = useState(false);

  const applyFlex = useCallback((drawerFlex: number) => {
    const mainNode = mainRef.current;
    const drawerNode = drawerRef.current;
    if (!mainNode || !drawerNode) return;
    const clamped = Math.max(0, Math.min(COWORK_DRAWER_FLEX_TOTAL, drawerFlex));
    // Official yUt mutates flex via refs only. Never put flex in React style props —
    // re-renders would overwrite the spring terminal value back to the JSX initial 0.
    mainNode.style.flex = String(COWORK_DRAWER_FLEX_TOTAL - clamped);
    drawerNode.style.flex = String(clamped);
    intendedDrawerFlexRef.current = clamped;
  }, []);

  // Seed official first-paint flex: main 100 / drawer 0 (style { flex: "100 0" } / { flex: "0 0" }).
  useEffect(() => {
    applyFlex(0);
  }, [applyFlex]);

  useEffect(() => {
    const mainNode = mainRef.current;
    const drawerNode = drawerRef.current;
    if (!mainNode || !drawerNode) return;
    const target = isDrawerOpen ? COWORK_DRAWER_OPEN_FLEX : 0;
    if (isDrawerOpen) interactedRef.current = true;
    else if (!interactedRef.current) return;
    // Official: parseFloat(drawer.style.flexGrow, open ? sidebarReserve : 50)
    const parsed = Number.parseFloat(drawerNode.style.flexGrow);
    const current = Number.isFinite(parsed)
      ? parsed
      : isDrawerOpen
        ? 0
        : COWORK_DRAWER_OPEN_FLEX;
    // Safety: if open and current is already terminal, still re-assert flex so a prior
    // clamp/reset cannot leave the drawer at 0 while isDrawerOpen is true.
    if (isDrawerOpen && Math.abs(current - target) < 0.5 && (drawerNode.getBoundingClientRect().width || 0) < 8) {
      applyFlex(target);
      return;
    }
    const controls = animateCoworkDrawerSpring(current, target, {
      ...COWORK_DRAWER_SPRING,
      onUpdate: (value) => {
        mainNode.style.flex = String(COWORK_DRAWER_FLEX_TOTAL - value);
        drawerNode.style.flex = String(value);
        // Keep intended in sync so ResizeObserver clamp cannot snap back to 0 mid-spring.
        intendedDrawerFlexRef.current = value;
      },
      onComplete: () => applyFlex(target),
    });
    // Hard guarantee: if scheduler stalls, snap to official terminal flex.
    const failSafe = setTimeout(() => {
      if (Math.abs(intendedDrawerFlexRef.current - target) > 0.5) applyFlex(target);
    }, 700);
    return () => {
      controls.stop();
      clearTimeout(failSafe);
    };
  }, [applyFlex, isDrawerOpen]);

  useEffect(() => {
    const containerNode = containerRef.current;
    const mainNode = mainRef.current;
    const drawerNode = drawerRef.current;
    if (!containerNode || !mainNode || !drawerNode) return;
    const applyClamp = () => {
      if (window.innerWidth < 768) return;
      const width = containerNode.getBoundingClientRect().width;
      if (!width) return;
      const drawerFlex = clampCoworkDrawerFlex(intendedDrawerFlexRef.current, width);
      mainNode.style.flex = String(COWORK_DRAWER_FLEX_TOTAL - drawerFlex);
      drawerNode.style.flex = String(drawerFlex);
    };
    let frame: number | undefined;
    const scheduleClamp = () => {
      if (frame !== undefined) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        frame = undefined;
        applyClamp();
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(scheduleClamp);
    observer?.observe(containerNode);
    applyClamp();
    return () => {
      observer?.disconnect();
      if (frame !== undefined) cancelAnimationFrame(frame);
    };
  }, []);

  const onResizeStart = useCallback(() => {
    const mainNode = mainRef.current;
    const containerNode = containerRef.current;
    if (!mainNode || !containerNode) return;
    resizeOriginRef.current = {
      containerPx: containerNode.getBoundingClientRect().width || 1,
      leftPx: mainNode.getBoundingClientRect().width,
    };
    setIsResizing(true);
  }, []);

  const onResize = useCallback((deltaPx: number) => {
    const { containerPx, leftPx } = resizeOriginRef.current;
    const nextLeft = Math.min(Math.max(leftPx + deltaPx, COWORK_MAIN_MIN_PX), containerPx - COWORK_DRAWER_MIN_PX);
    const mainFlex = (nextLeft / containerPx) * COWORK_DRAWER_FLEX_TOTAL;
    applyFlex(COWORK_DRAWER_FLEX_TOTAL - mainFlex);
  }, [applyFlex]);

  const onResizeEnd = useCallback(() => {
    setIsResizing(false);
  }, []);

  return (
    <div
      className={`flex flex-1 h-full w-full overflow-hidden max-md:relative md:-mt-[var(--df-header-h,0px)] md:h-[calc(100%+var(--df-header-h,0px))]${isResizing ? " select-none" : ""}`}
      data-official-source="index-BELzQL5P.js:yUt outer flex shell"
      ref={containerRef}
    >
      <div
        className="h-full flex flex-col overflow-hidden md:pt-[var(--df-header-h,0px)]"
        data-official-source="index-BELzQL5P.js:yUt main column"
        ref={mainRef}
      >
        {main}
      </div>
      <CoworkFileViewerResizeHandle
        hidden={!isDrawerOpen}
        onResize={onResize}
        onResizeEnd={onResizeEnd}
        onResizeStart={onResizeStart}
      />
      <div
        aria-hidden={!isDrawerOpen}
        className={`max-md:absolute top-0 right-0 bottom-0 left-0 z-20 draggable-none md:flex-grow-0 md:flex-shrink-0 md:basis-0 overflow-hidden h-full md:pt-[var(--df-header-h,0px)]${isDrawerOpen ? " max-md:flex-1" : " max-md:hidden"}${isResizing ? " pointer-events-none" : ""}`}
        data-official-source="index-BELzQL5P.js:yUt drawer column"
        inert={!isDrawerOpen || undefined}
        ref={drawerRef}
      >
        <div className="flex flex-col h-full">
          <div
            className="h-12 md:hidden bg-bg-000/30 backdrop-blur border-b-0.5 border-border-300"
            onClick={() => setIsDrawerExpanded(false)}
          />
          <div className="flex-1 overflow-hidden h-full bg-bg-100" data-official-source="index-BELzQL5P.js:yUt drawer bg-bg-100">
            {drawer}
          </div>
        </div>
      </div>
      {rightSidebar}
    </div>
  );
}

/** Official sUt vertical resize handle (desktop B4 path). */
function CoworkFileViewerResizeHandle({
  hidden,
  onResize,
  onResizeEnd,
  onResizeStart,
}: {
  hidden: boolean;
  onResize: (deltaPx: number) => void;
  onResizeEnd: (didMove?: boolean) => void;
  onResizeStart: () => void;
}) {
  const [active, setActive] = useState(false);
  const originXRef = useRef(0);
  const movedRef = useRef(false);
  const onResizeRef = useRef(onResize);
  const onResizeEndRef = useRef(onResizeEnd);
  const onResizeStartRef = useRef(onResizeStart);
  onResizeRef.current = onResize;
  onResizeEndRef.current = onResizeEnd;
  onResizeStartRef.current = onResizeStart;

  useEffect(() => {
    if (!active) return;
    const onMove = (event: MouseEvent) => {
      const delta = event.clientX - originXRef.current;
      if (Math.abs(delta) > 3) movedRef.current = true;
      onResizeRef.current(delta);
    };
    const onUp = () => {
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      setActive(false);
      onResizeEndRef.current(movedRef.current);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [active]);

  return (
    <div
      aria-label="Resize file viewer"
      aria-orientation="vertical"
      className={`group/resize relative outline-none w-3 h-full cursor-col-resize max-md:hidden -mr-1.5 z-30${hidden ? " hidden" : ""}`}
      data-official-source="index-BELzQL5P.js:sUt Resize file viewer"
      onKeyDown={(event) => {
        const step = event.shiftKey ? 32 : 8;
        let delta = 0;
        if (event.key === "ArrowLeft") delta = -step;
        if (event.key === "ArrowRight") delta = step;
        if (!delta) return;
        event.preventDefault();
        onResizeStartRef.current();
        onResizeRef.current(delta);
        onResizeEndRef.current(true);
      }}
      onMouseDown={(event) => {
        event.preventDefault();
        originXRef.current = event.clientX;
        movedRef.current = false;
        setActive(true);
        document.body.style.cursor = "col-resize";
        document.body.style.userSelect = "none";
        onResizeStartRef.current();
      }}
      role="separator"
      tabIndex={0}
    >
      <div
        className={`absolute rounded-full transition-[opacity,background-color] left-1/2 -translate-x-1/2 w-[3px] h-full max-h-12 top-1/2 -translate-y-1/2${
          active
            ? " opacity-100 bg-text-200 duration-100"
            : " opacity-0 bg-text-400 duration-200 delay-200 group-hover/resize:opacity-100"
        } group-focus-visible/resize:opacity-100 group-focus-visible/resize:bg-accent-brand group-focus-visible/resize:delay-0`}
      />
    </div>
  );
}
