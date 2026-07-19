/**
 * Official Gv working status + spinners (c11959232).
 * Extracted from EpitaxySessionTile for componentization — behavior unchanged.
 */
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import {
  officialGetStreamTokenEstimate,
  officialGetTurnStartedAt,
  officialMarkTurnStarted,
} from "./officialStreamSessionStore";

const officialSparkMaskPath = "/assets/v1/epitaxy-spark-mask.webp";

export function OfficialSpinner({
  animate = true,
  className = "",
  inheritColor = false,
  size = "m",
}: {
  animate?: boolean;
  className?: string;
  inheritColor?: boolean;
  size?: "s" | "m" | "l";
}) {
  const config = size === "s" ? { box: 12, stroke: 1.5 } : size === "l" ? { box: 20, stroke: 2 } : { box: 16, stroke: 1.75 };
  const color = inheritColor ? "currentColor" : "var(--cds-text-muted, var(--t6))";
  const mask = `radial-gradient(farthest-side, transparent calc(100% - ${config.stroke}px), #000 calc(100% - ${config.stroke - 0.5}px))`;
  return (
    <span data-cds="Spinner" className={`relative inline-block shrink-0 align-middle ${className}`} style={{ height: config.box, width: config.box }} aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: `${config.stroke}px solid var(--cds-border, var(--t2))` }} />
      <span className={`absolute inset-0 rounded-full ${animate ? "animate-[spin_2s_linear_infinite]" : ""}`} style={{ background: `conic-gradient(transparent 40%, ${color})`, WebkitMask: mask, mask }} />
    </span>
  );
}

export function OfficialSparkSpinner({
  className = "",
  isWorking = true,
  size = "m",
}: {
  className?: string;
  isWorking?: boolean;
  size?: "s" | "m" | "l";
}) {
  const box = size === "s" ? 12 : size === "l" ? 20 : 16;
  return (
    <span className={`inline-block overflow-hidden shrink-0 ${className}`} style={{ width: box, height: box, color: "var(--accent-brand)" }} aria-hidden="true">
      <span
        className={`block ${isWorking ? "epitaxy-spark-working" : ""}`}
        style={{
          width: box,
          height: 84 * box,
          background: "currentColor",
          WebkitMaskImage: `url("${officialSparkMaskPath}")`,
          maskImage: `url("${officialSparkMaskPath}")`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
          "--spark-frames": 84,
          "--spark-duration": "5040ms",
          transform: `translateY(-${400 / 84}%)`,
        } as CSSProperties}
      />
    </span>
  );
}

/**
 * Official Gv (c11959232):
 * - elapsed/tokens from session-level maps (je / _e), NOT props that reset every stream tick
 * - compactionStatus from store d_e(sessionId); compacting → "Compacting conversation" · elapsed
 * - spawnLabel prop wins over compacting / elapsed+tokens meta
 * - l = isWorking && !suppressed; meta opacity when (spawnLabel || elapsed>=2 || compacting) && l
 * - spark stays mounted; meta uses opacity transition (does not unmount on brief content updates)
 */
export function OfficialWorkingStatus({
  isWorking,
  sessionId,
  spawnLabel,
  tokenEstimate = 0,
}: {
  isWorking: boolean;
  sessionId?: string;
  spawnLabel?: string;
  startedAt?: number | null;
  tokenEstimate?: number;
}) {
  // Official d_e(t): bucket.compactionStatus for this session.
  const compactionStatus = useOfficialCodeSessionBucket(sessionId)?.compactionStatus ?? null;
  // Official je(t): stable turn start for this sessionId.
  const startedAt = sessionId
    ? (officialGetTurnStartedAt(sessionId) ?? (isWorking ? officialMarkTurnStarted(sessionId) : null))
    : null;
  const [elapsedSeconds, setElapsedSeconds] = useState(() => (
    startedAt ? Math.max(0, Math.floor((Date.now() - startedAt) / 1000)) : 0
  ));
  const [tokens, setTokens] = useState(tokenEstimate);

  useEffect(() => {
    // Official je(t): only zero when there is no turn-start timestamp for the session.
    // Do NOT clear elapsed merely because isWorking briefly flickers when text appears.
    if (startedAt == null || !sessionId) {
      setElapsedSeconds(0);
      return undefined;
    }
    const update = () => {
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - startedAt) / 1000)));
      setTokens(officialGetStreamTokenEstimate(sessionId) || tokenEstimate);
    };
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [sessionId, startedAt, tokenEstimate]);

  // Official Gv: l = isWorking && !suppressed; d=elapsed>=2; f=compacting; p=n||d||f; opacity = p && l
  const sparkWorking = isWorking; // suppress not wired locally (js(sessionId) always false for now)
  const showElapsedGate = elapsedSeconds >= 2;
  const showTokens = showElapsedGate && tokens > 0;
  const compacting = compactionStatus === "compacting";
  const metaShouldShow = Boolean(spawnLabel) || showElapsedGate || compacting;
  const metaVisible = metaShouldShow && sparkWorking;

  let metaContent: ReactNode = null;
  if (spawnLabel) {
    metaContent = spawnLabel;
  } else if (compacting) {
    metaContent = (
      <>
        Compacting conversation
        {showElapsedGate ? <>{" · "}{formatElapsedSeconds(elapsedSeconds)}</> : null}
      </>
    );
  } else {
    metaContent = (
      <>
        {formatElapsedSeconds(elapsedSeconds)}
        {showTokens ? (
          <>
            {" · "}
            <Icon name="ArrowDown" size="s" />
            {formatGeneratedTokenCount(tokens)} tokens
          </>
        ) : null}
      </>
    );
  }

  return (
    <div className="flex items-center gap-[16px] h-h3">
      <OfficialSparkSpinner isWorking={sparkWorking} size="m" />
      <div className={`flex items-center text-footnote text-assistant-secondary tabular-nums shrink-0 transition-opacity ${metaVisible ? "opacity-100" : "opacity-0"}`}>
        {metaContent}
      </div>
    </div>
  );
}

/** Official Ph (c11959232) — always include seconds; hour branch when >= 1h. */
export function formatElapsedSeconds(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
  if (minutes > 0) return `${minutes}m ${secs}s`;
  return `${secs}s`;
}

export function formatGeneratedTokenCount(tokens: number) {
  return tokens >= 1000 ? `${(tokens / 1000).toFixed(1)}k` : String(tokens);
}

/** Official c11959232: Za = delayed(Ja, 20) before showing Loading conversation spinner. */
export function useOfficialDelayedFlag(active: boolean, delayMs: number) {
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (!active) {
      setElapsed(false);
      return undefined;
    }
    const timer = window.setTimeout(() => setElapsed(true), delayMs);
    return () => window.clearTimeout(timer);
  }, [active, delayMs]);
  return active && elapsed;
}

/** Official Ja/Za loading branch — must be a component so the delayed flag is a valid hook. */
export function OfficialConversationLoading() {
  const showSpinner = useOfficialDelayedFlag(true, 20);
  if (!showSpinner) return null;
  return (
    <div role="status" className="h-full flex items-center justify-center text-t5">
      <OfficialSparkSpinner isWorking size="l" />
      <span className="sr-only">Loading conversation</span>
    </div>
  );
}
