import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CoworkClaudeAvatar } from "../features/cowork/session/transcript/CoworkClaudeAvatar";

/**
 * Official ion-dist residual (index-BELzQL5P.js):
 *   c2t messages + d2t countdown UI + m2t/h2t fullscreen Zh overlay
 *
 * Sign out (Gns):
 *   m2t({ variant: "signed-out", onDone: () => NQt("clear") })
 *   → 3s "Relaunching in {n}" + signedOutSub, Cancel
 *   → onDone only after countdown (or not cancelled)
 *
 * Product: mount as fixed inset-0 portal over DesktopFrame. Do NOT resize the
 * main window during this overlay — official keeps 1200 shell until process
 * relaunch; LoginRoute jn resize(600,{center}) runs on the new process.
 */

export type RelaunchInterstitialVariant =
  | "signed-out"
  | "signin"
  | "signed-in"
  | "chooser"
  | "apply";

const CIRCUMFERENCE = 276.46; // official l2t residual (2π·44)

const COPY: Record<
  RelaunchInterstitialVariant,
  { sub: string; id: string }
> = {
  "signed-out": {
    sub: "Signing out. Returning to your sign-in options…",
    id: "ic/AiMeJ55",
  },
  signin: {
    sub: "Claude is restarting to sign in.",
    id: "vh5i9/kCBY",
  },
  "signed-in": {
    sub: "Signed in. Applying your organization's settings…",
    id: "WKR57Cw9V+",
  },
  chooser: {
    sub: "Returning to your sign-in options.",
    id: "mO5j0pw6eJ",
  },
  apply: {
    sub: "Applying your configuration…",
    id: "5jgiF/w3we",
  },
};

function RelaunchKeyframes() {
  // Official u2t residual styles.
  return (
    <style>{`
      @keyframes lf-enter {
        from { opacity: 0; transform: translateY(6px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes lf-drain {
        from { stroke-dashoffset: 0; }
        to { stroke-dashoffset: -${CIRCUMFERENCE}; }
      }
      @keyframes lf-tick {
        0% { opacity: 0; transform: translateY(-6px); }
        30%, 100% { opacity: 1; transform: none; }
      }
    `}</style>
  );
}

type RelaunchInterstitialBodyProps = {
  variant: RelaunchInterstitialVariant;
  onDone: () => void;
  onCancel: () => void;
  handleEscape?: boolean;
};

/** Official d2t residual body (countdown + Ace + cancel). */
export function RelaunchInterstitialBody({
  variant,
  onDone,
  onCancel,
  handleEscape = true,
}: RelaunchInterstitialBodyProps) {
  const [seconds, setSeconds] = useState(3);
  const sub = COPY[variant]?.sub ?? COPY.apply.sub;
  // Product: prevent double onDone when parent recreates callback identity after
  // seconds hit 0 (effect deps re-fire). Official d2t also calls t() once at 0.
  // Cancel must win over a late/hanging onDone (stuck "Relaunching in 1").
  const finishedRef = useRef(false);
  const onDoneRef = useRef(onDone);
  const onCancelRef = useRef(onCancel);
  onDoneRef.current = onDone;
  onCancelRef.current = onCancel;

  const finishCancel = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onCancelRef.current();
  };

  const finishDone = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    onDoneRef.current();
  };

  useEffect(() => {
    if (!handleEscape) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") finishCancel();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
    // finishCancel is stable over mount (refs); only handleEscape gates the listener.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional once-per-mount cancel path
  }, [handleEscape]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (seconds <= 0) {
      finishDone();
      return;
    }
    const timer = window.setTimeout(() => setSeconds((n) => n - 1), 1000);
    return () => window.clearTimeout(timer);
    // Do not depend on onDone identity — use ref so countdown cannot re-arm after 0.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- seconds-only tick residual
  }, [seconds]);

  const display = Math.max(seconds, 1);

  return (
    <>
      <RelaunchKeyframes />
      <div
        className="flex h-full w-full flex-col items-center justify-center gap-5 px-14 text-center"
        style={{ animation: "lf-enter 280ms ease-out" }}
      >
        <div className="relative grid size-[6.5rem] place-items-center">
          <svg
            width="104"
            height="104"
            viewBox="0 0 104 104"
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx="52"
              cy="52"
              r="44"
              fill="none"
              className="stroke-text-000/[0.08]"
              strokeWidth="4"
            />
            <circle
              cx="52"
              cy="52"
              r="44"
              fill="none"
              className="stroke-accent-brand"
              strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={0}
              style={{ animation: "lf-drain 3s linear forwards" }}
            />
          </svg>
          {/* Official Ace state:"waiting" className:"!w-14" */}
          <CoworkClaudeAvatar state="waiting" isInteractive={false} className="!w-14" />
        </div>
        <h1 aria-live="polite" className="font-heading tracking-tight text-text-100">
          Relaunching in{" "}
          <span
            key={display}
            className="inline-block min-w-[0.8ch] tabular-nums"
            style={{ animation: "lf-tick 1s ease-out" }}
          >
            {display}
          </span>
        </h1>
        <p className="mt-1.5 max-w-xs text-balance text-sm text-text-400">{sub}</p>
        <button
          type="button"
          onClick={finishCancel}
          autoFocus
          className="mt-1 rounded-md px-2.5 py-1.5 text-sm text-text-400 hover:text-text-100"
        >
          Cancel
        </button>
      </div>
    </>
  );
}

type RelaunchInterstitialOverlayProps = {
  open: boolean;
  variant: RelaunchInterstitialVariant;
  onDone: () => void;
  onCancel: () => void;
};

/**
 * Official h2t residual shell:
 *   Zh isOpen fixed inset-0 z-50 bg-bg-100, animationDuration:0
 *   title "Relaunching" (a11y), children d2t with handleEscape:false (Zh owns close)
 */
export function RelaunchInterstitialOverlay({
  open,
  variant,
  onDone,
  onCancel,
}: RelaunchInterstitialOverlayProps) {
  if (!open || typeof document === "undefined") return null;

  const node: ReactNode = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Relaunching"
      className="fixed inset-0 z-50 bg-bg-100 draggable-none focus:outline-none"
    >
      <RelaunchInterstitialBody
        variant={variant}
        onDone={onDone}
        onCancel={onCancel}
        handleEscape={false}
      />
    </div>
  );

  return createPortal(node, document.body);
}
