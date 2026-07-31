/**
 * Official Ace residual (index-BELzQL5P ~53018) + session avatar Et (~228013).
 * Asset: c6a992d55-D5kpo8DQ.js (thinking/writing/shimmer/waiting/…).
 * Status row g$t mounts Ace with currentAvatarState, not a CSS ring spinner.
 *
 * Tickle tooltip: official Ace wraps Xp (index export `T as Xp` ← c5f4e1303 `vC as T`).
 * Product mounts the same residual via shared OfficialTooltip (not a second inline Xp).
 * DOM order matches Ace: outer `aria-hidden` → Xp → interactive `w-8` mark (not Xp outside shell).
 */
import { useEffect, useReducer, useRef, useState, type ReactElement, type ReactNode } from "react";
import { OfficialTooltip } from "../../../shared/OfficialTooltip";

export type CoworkClaudeAvatarState =
  | "entrance"
  | "exit"
  | "orbiting"
  | "shimmer"
  | "static"
  | "thinking"
  | "tickle"
  | "waiting"
  | "writing";

/**
 * Official v$t Et residual:
 *   wt ? "thinking" : kt || Nt || (ee && l) ? "shimmer" : l ? "writing" : "static"
 * wt = streaming with empty last assistant path; kt = last block tool_use/tool_result;
 * ee = isSession (Cowork local_session path true); l = isStreaming; Nt = research pending.
 */
export function resolveCoworkSessionAvatarState(input: {
  isEmptyStream?: boolean;
  isResearchPending?: boolean;
  isSession?: boolean;
  isStreaming: boolean;
  isToolActive?: boolean;
}): CoworkClaudeAvatarState {
  const streaming = input.isStreaming;
  const isSession = input.isSession ?? true;
  const emptyStream = Boolean(streaming && input.isEmptyStream);
  const toolActive = Boolean(input.isToolActive);
  const researchPending = Boolean(input.isResearchPending);
  if (emptyStream) return "thinking";
  if (toolActive || researchPending || (isSession && streaming)) return "shimmer";
  if (streaming) return "writing";
  return "static";
}

export type CoworkPathAvatarMessage = {
  attachments?: readonly unknown[];
  content?: ReadonlyArray<{ type?: string } | null | undefined> | null;
  files?: readonly unknown[];
  files_v2?: readonly unknown[];
  sender?: string;
};

/**
 * Official v$t path-derived Et inputs (index-BELzQL5P ~227990–228016):
 *   ge = last path message
 *   Ct = isSession && path.length === 1 && ge.sender === "human"
 *   wt = streaming && (!ge || Ct || empty content/attachments/files)
 *   vt = streaming ? last content block : undefined
 *   kt = vt is tool_use | tool_result
 */
export function resolveCoworkPathAvatarState(input: {
  isResearchPending?: boolean;
  isSession?: boolean;
  isStreaming: boolean;
  pathMessages: readonly CoworkPathAvatarMessage[];
}): CoworkClaudeAvatarState {
  const streaming = input.isStreaming;
  const isSession = input.isSession ?? true;
  const path = input.pathMessages;
  const last = path.length > 0 ? path[path.length - 1] : undefined;
  const singleHumanSession =
    isSession && path.length === 1 && last?.sender === "human";
  const emptyLast =
    !last
    || (
      !last.content?.[0]
      && (last.attachments?.length ?? 0) === 0
      && (last.files_v2?.length ?? 0) === 0
      && (last.files?.length ?? 0) === 0
    );
  const emptyStream = Boolean(streaming && (!last || singleHumanSession || emptyLast));
  const lastBlock = streaming && last?.content?.length
    ? last.content[last.content.length - 1]
    : undefined;
  const toolActive = Boolean(
    lastBlock
    && (lastBlock.type === "tool_use" || lastBlock.type === "tool_result"),
  );
  return resolveCoworkSessionAvatarState({
    isEmptyStream: emptyStream,
    isResearchPending: input.isResearchPending,
    isSession,
    isStreaming: streaming,
    isToolActive: toolActive,
  });
}

type AvatarAnimation = {
  frameCount: number;
  height: number;
  speed: number;
  svg: string;
  width: number;
};

const animationModuleUrl = "/assets/v1/c6a992d55-D5kpo8DQ.js";
let officialAnimationsPromise: Promise<Record<string, AvatarAnimation>> | null = null;

export function CoworkClaudeAvatar({ className, isInteractive = true, state = "static" }: {
  className?: string;
  isInteractive?: boolean;
  state?: CoworkClaudeAvatarState;
}) {
  const [animations, setAnimations] = useState<Record<string, AvatarAnimation>>();
  const [displayState, setDisplayState] = useState(state);
  const previousStateRef = useRef(state);
  const animationRef = useRef<HTMLDivElement | null>(null);
  const [tickleCount, bumpTickleCount] = useReducer((value) => value + 1, 0);
  const reducedMotion = useReducedMotion();

  useEffect(() => { setDisplayState(state); }, [state]);
  useEffect(() => {
    let active = true;
    void loadOfficialAnimations().then((value) => {
      if (active) setAnimations(value);
    });
    return () => { active = false; };
  }, []);
  useAvatarAnimation(animationRef, animations?.[displayState], displayState, previousStateRef, reducedMotion, setDisplayState);

  const tickle = () => {
    // Official Ace: block tickle while writing/thinking/tickle (shimmer may tickle).
    if (!isInteractive || ["thinking", "tickle", "writing"].includes(displayState)) return;
    setDisplayState("tickle");
    bumpTickleCount();
  };
  // Official Ace: hide tooltip while non-interactive or writing/thinking (opacity-0 on Xp, not unmount).
  const hideTooltip = !isInteractive || displayState === "writing" || displayState === "thinking";
  const tooltipContent = resolveCoworkAceTickleTooltip(tickleCount);
  if (displayState === "static" || reducedMotion || !animations?.[displayState]) {
    return (
      <div aria-hidden="true">
        <AceTooltip hide={hideTooltip} tooltipContent={tooltipContent}>
          <div
            className={classes(className, "w-8 text-accent-brand inline-block select-none")}
            onMouseDown={tickle}
          >
            <ClaudeMark className="w-full fill-current" />
          </div>
        </AceTooltip>
      </div>
    );
  }
  const animation = animations[displayState];
  return (
    <div aria-hidden="true">
      <AceTooltip hide={hideTooltip} tooltipContent={tooltipContent}>
        <div
          className={classes(
            className,
            "w-8 text-accent-brand inline-block select-none overflow-hidden [@media(max-resolution:1.99dppx)]:[clip-path:inset(1px_0)]",
          )}
          onMouseDown={tickle}
          style={{ aspectRatio: animation.width / animation.height }}
        >
          <div
            className="[&>svg]:block [&>svg]:w-full [&>svg]:fill-current"
            dangerouslySetInnerHTML={{ __html: animation.svg }}
            ref={animationRef}
          />
        </div>
      </AceTooltip>
    </div>
  );
}

/**
 * Official Ace tickle copy ladder (index-BELzQL5P ~53054):
 * default → (>5) → (>12) → (>18) → (>24)
 */
export function resolveCoworkAceTickleTooltip(tickleCount: number): string {
  if (tickleCount < 32 && tickleCount > 24) return "Ugh, well you can’t do that forever";
  if (tickleCount <= 24 && tickleCount > 18) return "Alright, alright, you have my attention!";
  if (tickleCount <= 18 && tickleCount > 12) return "Are you still doing that?";
  if (tickleCount <= 12 && tickleCount > 5) return "Yes, yes. What can I do for you?";
  return "Hi, I’m Claude. How can I help you today?";
}

function AceTooltip({
  children,
  hide,
  tooltipContent,
}: {
  children: ReactElement;
  hide: boolean;
  tooltipContent: ReactNode;
}) {
  // Official Ace → Xp (c5f4e1303 vC): className font-claude-response max-w-none italic,
  // side:"right", hide via opacity-0 (not showTooltip:false). Shared OfficialTooltip is Xp residual.
  return (
    <OfficialTooltip
      className={classes("font-claude-response max-w-none italic", hide && "opacity-0")}
      side="right"
      tooltipContent={tooltipContent}
    >
      {children}
    </OfficialTooltip>
  );
}

function loadOfficialAnimations() {
  officialAnimationsPromise ??= fetch(animationModuleUrl)
    .then((response) => {
      if (!response.ok) throw new Error(`Unable to load Claude avatar animations: ${response.status}`);
      return response.text();
    })
    .then(parseOfficialAnimations);
  return officialAnimationsPromise;
}

function parseOfficialAnimations(source: string) {
  const animations: Record<string, AvatarAnimation> = {};
  const pattern = /([A-Za-z_]+):\{svg:'([\s\S]*?)',width:(\d+),height:(\d+),frameCount:(\d+),speed:(\d+)\}/g;
  for (const match of source.matchAll(pattern)) {
    const [, name, svg, width, height, frameCount, speed] = match;
    if (!name || !svg || !width || !height || !frameCount || !speed) continue;
    animations[name] = {
      frameCount: Number(frameCount),
      height: Number(height),
      speed: Number(speed),
      svg,
      width: Number(width),
    };
  }
  if (Object.keys(animations).length === 0) throw new Error("Claude avatar animation asset is empty");
  return animations;
}

function useAvatarAnimation(
  ref: React.RefObject<HTMLDivElement | null>,
  definition: AvatarAnimation | undefined,
  state: CoworkClaudeAvatarState,
  previousStateRef: React.MutableRefObject<CoworkClaudeAvatarState>,
  reducedMotion: boolean,
  setState: (state: CoworkClaudeAvatarState) => void,
) {
  useEffect(() => {
    if (reducedMotion || state === "static" || !definition || !ref.current?.animate) return;
    const frames = Array.from({ length: definition.frameCount }, (_, index) => ({ transform: `translateY(-${index * (100 / definition.frameCount)}%)` }));
    const animation = ref.current.animate(frames, { duration: definition.speed * frames.length, easing: `steps(${frames.length}, jump-none)`, iterations: state === "tickle" ? 1 : Infinity });
    const restore = () => setState(previousStateRef.current);
    if (state === "tickle") animation.addEventListener("finish", restore);
    else previousStateRef.current = state;
    return () => {
      animation.removeEventListener("finish", restore);
      animation.cancel();
    };
  }, [definition, previousStateRef, reducedMotion, ref, setState, state]);
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

function ClaudeMark(props: React.SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" {...props}><path d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z" /></svg>;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
