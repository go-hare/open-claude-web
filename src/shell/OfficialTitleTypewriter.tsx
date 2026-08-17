/**
 * Residual ca0135 So — grapheme typewriter with skipInitialReveal.
 * Used by CodeSessionRow (Ja) while sticky reveal gate is true.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

/** Residual vo — unrevealed glyph */
const vo: CSSProperties = { opacity: 0 };
/** Residual bo — mid-reveal text swap fade-out */
const bo: CSSProperties = {
  opacity: 0,
  filter: "blur(6px)",
  transition: "opacity 200ms ease-out, filter 200ms ease-out",
};

/** Residual grapheme Segmenter (en / grapheme). */
export function segmentTitleGraphemes(text: string): string[] {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });
    return Array.from(segmenter.segment(text), (part) => part.segment);
  }
  return Array.from(text);
}

/** Residual So progress: rAF, stepMs=30, overshoot length+4. */
function useTypewriterProgress(length: number, stepMs = 30, resetKey?: string) {
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    setProgress(0);
    const target = length + 4;
    let frame: number | null = null;
    let start: number | null = null;
    const tick = (now: number) => {
      if (start === null) start = now;
      const next = (now - start) / stepMs;
      if (next >= target) {
        setProgress(target);
        return;
      }
      setProgress(next);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
    };
  }, [length, stepMs, resetKey]);
  return progress;
}

export type OfficialTitleTypewriterProps = {
  text: string;
  /** Residual: true → paint plain text until first text change, then reveal. */
  skipInitialReveal?: boolean;
};

export function OfficialTitleTypewriter({
  text,
  skipInitialReveal = false,
}: OfficialTitleTypewriterProps) {
  const [displayText, setDisplayText] = useState(text);
  const [fadingOut, setFadingOut] = useState(false);
  const [hasChanged, setHasChanged] = useState(false);
  const latestTextRef = useRef(text);
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  latestTextRef.current = text;

  useEffect(() => {
    if (text === displayText || fadingOut) return;
    setHasChanged(true);
    setFadingOut(true);
    fadeTimerRef.current = setTimeout(() => {
      setDisplayText(latestTextRef.current);
      setFadingOut(false);
      fadeTimerRef.current = null;
    }, 200);
  }, [text, displayText, fadingOut]);

  useEffect(
    () => () => {
      if (fadeTimerRef.current !== null) clearTimeout(fadeTimerRef.current);
    },
    [],
  );

  const segments = useMemo(() => segmentTitleGraphemes(displayText), [displayText]);
  const progress = useTypewriterProgress(segments.length, 30, displayText);

  // Residual: skipInitialReveal && !hasChanged → plain live text (no animation).
  if (skipInitialReveal && !hasChanged) {
    return <>{text}</>;
  }

  return (
    <>
      <span className="sr-only">{text}</span>
      <span
        aria-hidden="true"
        className="inline-flex"
        style={fadingOut ? bo : undefined}
      >
        {segments.map((char, index) => {
          const t = Math.max(0, Math.min(1, (progress - index) / 3));
          const glyph = char === " " ? " " : char;
          if (t <= 0) {
            return (
              <span key={index} style={vo}>
                {glyph}
              </span>
            );
          }
          if (t >= 1) {
            return <span key={index}>{glyph}</span>;
          }
          const eased = 1 - Math.pow(1 - t, 3);
          return (
            <span
              key={index}
              style={{
                opacity: eased,
                filter: `blur(${6 * (1 - eased)}px)`,
              }}
            >
              {glyph}
            </span>
          );
        })}
      </span>
    </>
  );
}
