import { useCallback, useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import type { RouteViewProps } from "../../app/routes";
import { accountDetailsFromBootstrap } from "../../app/useDesktopCoworkAccountSync";
import { persistDFrameState } from "../../stores/frameStoreHelpers";
import { CoworkClaudeAvatar } from "../cowork/session/transcript/CoworkClaudeAvatar";
import { primaryButtonClass, secondaryButtonClass } from "../shared/buttonClasses";

/**
 * Official ion-dist residual:
 *
 * LoginRoute (c632c9594-Bv5AdbQY.js `jn`):
 *   electronWindowControl.resize(600, 600, { center: true })
 *   on pagehide → resize(1200, 800)
 *   status && (provider || bootstrapHost) → M5t({ status })  // no hide1p
 *   else Get started / Sign In residual
 *
 * M5t (index-BELzQL5P.js):
 *   hide1p = hide1p ?? !status.enabled
 *   sVt shell + Ace static !w-12
 *   dual: Continue with {short} (N5t + E5t pill + ›) + Sign in to Anthropic (Lce)
 *   footnote under dual
 *   Sign in → relaunching interstitial → setDeploymentMode("1p")
 *   Continue 3p → setDeploymentMode("3p")
 *
 * T5t portal is separate (hide1p:true, needsAuth). Not the LoginRoute dual chooser.
 * Verify sign-in code BrowserWindow is 520×340 — different residual.
 */

export type LoginDesktop3pStatus = {
  enabled: boolean;
  provider: string | null;
  bootstrapHost: string | null;
  source?: { type?: string; remote?: boolean };
  deploymentMode?: "1p" | "3p" | "dotClaude";
  thirdPartyActivated?: boolean;
  degraded?: boolean;
  detail?: string;
  /** Product extension: ~/.claude/settings.json has usable routing env. */
  dotClaude?: {
    available: boolean;
    host: string | null;
    model?: string;
  };
};

type BridgeCustom3p = {
  getLoginDesktop3pStatus?: () => Promise<LoginDesktop3pStatus | null>;
  setDeploymentMode?: (mode: string) => Promise<unknown>;
  openSetupWindow?: () => Promise<unknown>;
  relaunchApp?: () => Promise<unknown>;
};

type WindowControlBridge = {
  resize?: (width: number, height: number, opts?: boolean | { center?: boolean }) => Promise<unknown> | unknown;
  focus?: () => Promise<unknown> | unknown;
};

function custom3pBridge(): BridgeCustom3p | undefined {
  const settings = (window as unknown as { "claude.settings"?: { Custom3pSetup?: BridgeCustom3p } })[
    "claude.settings"
  ];
  return settings?.Custom3pSetup;
}

function windowControl(): WindowControlBridge | undefined {
  return (window as unknown as { electronWindowControl?: WindowControlBridge }).electronWindowControl
    ?? (window as unknown as { "claude.web"?: { WindowControl?: WindowControlBridge } })["claude.web"]
      ?.WindowControl;
}

function providerShort(provider: string | null | undefined): string {
  switch (provider) {
    case "gateway":
      return "Gateway";
    case "vertex":
      return "Vertex";
    case "bedrock":
      return "Bedrock";
    case "foundry":
      return "Foundry";
    default:
      return provider && provider.length > 0 ? provider : "your provider";
  }
}

/** Official Lce residual (Claude starburst mark). */
function ClaudeMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden>
      <path
        className="fill-current"
        d="m19.6 66.5 19.7-11 .3-1-.3-.5h-1l-3.3-.2-11.2-.3L14 53l-9.5-.5-2.4-.5L0 49l.2-1.5 2-1.3 2.9.2 6.3.5 9.5.6 6.9.4L38 49.1h1.6l.2-.7-.5-.4-.4-.4L29 41l-10.6-7-5.6-4.1-3-2-1.5-2-.6-4.2 2.7-3 3.7.3.9.2 3.7 2.9 8 6.1L37 36l1.5 1.2.6-.4.1-.3-.7-1.1L33 25l-6-10.4-2.7-4.3-.7-2.6c-.3-1-.4-2-.4-3l3-4.2L28 0l4.2.6L33.8 2l2.6 6 4.1 9.3L47 29.9l2 3.8 1 3.4.3 1h.7v-.5l.5-7.2 1-8.7 1-11.2.3-3.2 1.6-3.8 3-2L61 2.6l2 2.9-.3 1.8-1.1 7.7L59 27.1l-1.5 8.2h.9l1-1.1 4.1-5.4 6.9-8.6 3-3.5L77 13l2.3-1.8h4.3l3.1 4.7-1.4 4.9-4.4 5.6-3.7 4.7-5.3 7.1-3.2 5.7.3.4h.7l12-2.6 6.4-1.1 7.6-1.3 3.5 1.6.4 1.6-1.4 3.4-8.2 2-9.6 2-14.3 3.3-.2.1.2.3 6.4.6 2.8.2h6.8l12.6 1 3.3 2 1.9 2.7-.3 2-5.1 2.6-6.8-1.6-16-3.8-5.4-1.3h-.8v.4l4.6 4.5 8.3 7.5L89 80.1l.5 2.4-1.3 2-1.4-.2-9.2-7-3.6-3-8-6.8h-.5v.7l1.8 2.7 9.8 14.7.5 4.5-.7 1.4-2.6 1-2.7-.6-5.8-8-6-9-4.7-8.2-.5.4-2.9 30.2-1.3 1.5-3 1.2-2.5-2-1.4-3 1.4-6.2 1.6-8 1.3-6.4 1.2-7.9.7-2.6v-.2H49L43 72l-9 12.3-7.2 7.6-1.7.7-3-1.5.3-2.8L24 86l10-12.8 6-7.9 4-4.6-.1-.5h-.3L17.2 77.4l-4.7.6-2-2 .2-3 1-1 8-5.5Z"
      />
    </svg>
  );
}

/** Official sVt residual shell. */
export function LoginDesktopShell({ children }: { children?: ReactNode }) {
  return (
    <>
      <div className="fixed inset-0 bg-bg-100 flex flex-col items-center justify-center p-8">
        {children}
      </div>
      <div className="draggable fixed top-0 inset-x-0 z-10 flex h-[36px] items-center pl-3" />
    </>
  );
}

/** Official S5t residual card button — whole card is the hit target (not title-only). */
function ChoiceCard({
  ariaLabel,
  onClick,
  children,
}: {
  ariaLabel: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      // no-drag: Electron drag regions must not swallow card clicks (top bar is .draggable only).
      className="draggable-none flex w-full cursor-pointer flex-col gap-2 rounded-2xl border border-border-300 bg-bg-000 px-5 py-4 text-left transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-100"
    >
      {children}
    </button>
  );
}

/** Official N5t residual — gateway has null icon → list glyph SVG. */
function ProviderGlyph() {
  return (
    <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <rect width="32" height="32" rx="7" className="fill-text-400" />
      <g stroke="white" strokeWidth="1.6" strokeLinecap="round">
        <line x1="9" y1="11" x2="20" y2="11" />
        <line x1="9" y1="16" x2="20" y2="16" />
        <line x1="9" y1="21" x2="20" y2="21" />
      </g>
      <g fill="white">
        <circle cx="23.5" cy="11" r="1.2" />
        <circle cx="23.5" cy="16" r="1.2" />
        <circle cx="23.5" cy="21" r="1.2" />
      </g>
    </svg>
  );
}

/** Official E5t residual pill. */
function SourcePill({
  managed,
  bootstrapHost,
}: {
  managed: boolean;
  bootstrapHost?: string | null;
}) {
  const label = bootstrapHost || (managed ? "Organization-managed" : "Local configuration");
  return (
    <span
      title={bootstrapHost ?? undefined}
      className="inline-flex max-w-[180px] items-center gap-1.5 rounded-full border-0.5 border-border-300 bg-bg-000 px-2 py-1 text-xs text-text-100"
    >
      <span
        aria-hidden
        className={`inline-block size-1.5 shrink-0 rounded-full ${managed ? "bg-accent-100" : "bg-success-000"}`}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}

function Chevron() {
  return (
    <span aria-hidden className="text-lg leading-none text-text-400">
      ›
    </span>
  );
}

/**
 * Official M5t residual (chooser / single org card).
 * hide1p: only third-party card (T5t portal).
 * !hide1p: dual cards including "Sign in to Anthropic".
 */
export function LoginDesktopChooser({
  status,
  hide1p,
  onChoose1p,
  onChoose3p,
  onChooseDotClaude,
  onOpenSetup,
}: {
  status: LoginDesktop3pStatus;
  hide1p?: boolean;
  onChoose1p: () => void;
  onChoose3p: () => void;
  onChooseDotClaude?: () => void;
  /** Product: open setup-desktop-3p when no configLibrary bag yet (not official M5t footer). */
  onOpenSetup?: () => void;
}) {
  const provider = status.provider ?? null;
  const short = providerShort(provider);
  // Official M5t: provider / bootstrapHost card only when bag/enterprise is active.
  // Product extension: ~/.claude may be the only local option on a fresh userData —
  // do not invent a "Continue with your provider" card without a real bag.
  const hasProviderCard = Boolean(
    status.provider || status.bootstrapHost || status.thirdPartyActivated,
  );
  const dotClaude = status.dotClaude?.available ? status.dotClaude : null;
  // Official: i = hide1p ?? !status.enabled
  // Product: detected ~/.claude is a real local choice even when chooser mode is void
  // (enabled stays false until user picks dotClaude / 3p). Keep Anthropic dual card.
  const single = hide1p ?? !(status.enabled || Boolean(dotClaude));
  const continueTitle = `Continue with ${short}`;
  const managed = status.source?.type === "managed";
  // Product: AnthropicEntry had "Configure third-party…". Entering chooser only because
  // ~/.claude was found must not remove that path — Setup still creates configLibrary bag.
  const showConfigureSetup = Boolean(onOpenSetup) && !hasProviderCard;

  return (
    <LoginDesktopShell>
      <div className="flex h-full w-full flex-col items-center">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <CoworkClaudeAvatar state="static" className="!w-12" isInteractive={false} />
          <h1 className="whitespace-nowrap font-ui-serif text-3xl font-medium tracking-tight text-text-100">
            {single ? "Sign in to continue" : "How do you want to use Claude?"}
          </h1>
          <p className="max-w-sm text-balance text-sm leading-normal text-text-400">
            {single
              ? "Your organization has configured Claude on this device."
              : "A configuration was found on this device."}
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 pb-2">
          {hasProviderCard ? (
            <ChoiceCard ariaLabel={continueTitle} onClick={onChoose3p}>
              <div className="flex items-center gap-3.5">
                <ProviderGlyph />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-text-100">{continueTitle}</span>
                  <span className="text-xs text-text-400">No Anthropic account needed</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourcePill managed={managed} bootstrapHost={null} />
                  <Chevron />
                </div>
              </div>
            </ChoiceCard>
          ) : null}
          {/* Product extension: reuse the user's existing Claude Code CLI config
              directly — zero migration for users who already run the CLI. */}
          {dotClaude && onChooseDotClaude ? (
            <ChoiceCard ariaLabel="Continue with ~/.claude" onClick={onChooseDotClaude}>
              <div className="flex items-center gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0.5 border-border-300 bg-bg-100 font-mono text-sm text-text-300">
                  &gt;_
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-text-100">Continue with ~/.claude</span>
                  <span className="text-xs text-text-400">
                    Use your existing Claude Code CLI configuration
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourcePill managed={false} bootstrapHost={dotClaude.host} />
                  <Chevron />
                </div>
              </div>
            </ChoiceCard>
          ) : null}
          {!single ? (
            <ChoiceCard ariaLabel="Sign in to Anthropic" onClick={onChoose1p}>
              <div className="flex items-center gap-3.5">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0.5 border-border-300 bg-bg-100">
                  <ClaudeMark className="size-5 shrink-0 text-accent-brand" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-text-100">Sign in to Anthropic</span>
                  <span className="text-xs text-text-400">Use your Claude account</span>
                </div>
                <Chevron />
              </div>
            </ChoiceCard>
          ) : null}
          {showConfigureSetup ? (
            <button
              type="button"
              className={`${secondaryButtonClass} h-10 w-full rounded-[0.6rem] text-sm`}
              onClick={onOpenSetup}
            >
              Configure third-party inference…
            </button>
          ) : null}
          {!single ? (
            <p className="mt-0.5 text-center text-xs text-text-400">
              You can change this later by signing out.
            </p>
          ) : null}
        </div>
      </div>
    </LoginDesktopShell>
  );
}

/** Official LoginRoute residual when no 3p provider/bootstrapHost — honest 1p entry, no OAuth invent. */
function LoginDesktopAnthropicEntry({
  onChoose1p,
  onOpenSetup,
}: {
  onChoose1p: () => void;
  onOpenSetup: () => void;
}) {
  return (
    <LoginDesktopShell>
      <div className="flex h-full w-full flex-col items-center">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <CoworkClaudeAvatar state="static" className="!w-12" isInteractive={false} />
          <h1 className="whitespace-nowrap font-ui-serif text-3xl font-medium tracking-tight text-text-100">
            Sign in to continue
          </h1>
          <p className="max-w-sm text-balance text-sm leading-normal text-text-400">
            Use your Claude account, or configure third-party inference.
          </p>
        </div>
        <div className="flex w-full max-w-md flex-col gap-3 pb-2">
          <ChoiceCard ariaLabel="Sign in to Anthropic" onClick={onChoose1p}>
            <div className="flex items-center gap-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg border-0.5 border-border-300 bg-bg-100">
                <ClaudeMark className="size-5 shrink-0 text-accent-brand" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold text-text-100">Sign in to Anthropic</span>
                <span className="text-xs text-text-400">Use your Claude account</span>
              </div>
              <Chevron />
            </div>
          </ChoiceCard>
          <button
            type="button"
            className={`${secondaryButtonClass} h-10 w-full rounded-[0.6rem] text-sm`}
            onClick={onOpenSetup}
          >
            Configure third-party inference…
          </button>
        </div>
      </div>
    </LoginDesktopShell>
  );
}

/** Official d2t-lite relaunch interstitial (signin variant copy). */
function RelaunchInterstitial({ message }: { message: string }) {
  return (
    <LoginDesktopShell>
      <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-14 text-center">
        <CoworkClaudeAvatar state="thinking" className="!w-12" isInteractive={false} />
        <p className="max-w-sm text-balance text-sm leading-normal text-text-400">{message}</p>
      </div>
    </LoginDesktopShell>
  );
}

/**
 * Official LoginRoute jn residual:
 *   electronWindowControl.resize(600, 600, { center: true })
 *   pagehide → resize(1200, 800)
 *
 * Product bug (login dual-card became 1200×800): React cleanup always called
 * restore() on unmount. App can remount LoginDesktop (gate /login exempt →
 * DesktopFrame wrap, Strict Mode, HMR) so cleanup restore races after the new
 * mount's 600 resize → stuck large while still showing chooser.
 * Also leaveLoginForShell must not pre-resize to 1200 while login UI is painted.
 */
let loginWindowSizeEpoch = 0;

function useLoginWindowSize() {
  useLayoutEffect(() => {
    const epoch = ++loginWindowSizeEpoch;
    const control = windowControl();
    // Official jn: resize(600,600,{center:true}). IPC is async — main process cloaks
    // opacity for soft center (mnr + createMainWindow opacity residual) so the SPA
    // does not paint dual-card at 1200 while bounds apply.
    void Promise.resolve(control?.resize?.(600, 600, { center: true })).then(() => {
      if (loginWindowSizeEpoch !== epoch) return;
      void control?.focus?.();
    });

    const restoreMain = () => {
      void control?.resize?.(1200, 800);
    };

    // Official: pagehide restores (full document leave). Cleanup also calls restore
    // (official jn: return () => { removeListener; e() }) — we defer + cancel on
    // remount / still-/login so product gate remounts do not blow size back to 1200.
    const onPageHide = () => {
      restoreMain();
    };
    window.addEventListener("pagehide", onPageHide);

    return () => {
      window.removeEventListener("pagehide", onPageHide);
      window.setTimeout(() => {
        if (loginWindowSizeEpoch !== epoch) return;
        const path = window.location.pathname;
        if (path === "/login" || path.startsWith("/login/")) return;
        restoreMain();
      }, 0);
    };
  }, []);
}

/** Route: /login — official LoginDesktop residual for product shell. */
export function LoginDesktopPage(_props: RouteViewProps) {
  const [status, setStatus] = useState<LoginDesktop3pStatus | null | undefined>(undefined);
  // Official M5t: only 1p uses d2t signin interstitial; plain 3p is NQt("3p") with no apply overlay.
  const [phase, setPhase] = useState<"idle" | "relaunching-1p">("idle");

  useLoginWindowSize();

  useEffect(() => {
    let cancelled = false;
    const bridge = custom3pBridge();
    if (!bridge?.getLoginDesktop3pStatus) {
      setStatus(null);
      return;
    }
    void bridge
      .getLoginDesktop3pStatus()
      .then((value) => {
        if (!cancelled) setStatus(value);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const leaveLoginForShell = useCallback(() => {
    const params = new URLSearchParams(window.location.search);
    const returnTo = params.get("returnTo");
    // Official Pos residual: uAe(home) → /task/new (Cowork), not `/` (product `/` was Code).
    // index-BELzQL5P.js Pos → N$t to uAe; uAe returns "/task/new" when past onboarding.
    const target =
      returnTo && returnTo.startsWith("/") && !returnTo.startsWith("//") && !returnTo.startsWith("/login")
        ? returnTo
        : "/task/new";
    // Align sidebar mode with official WK residual before shell mounts.
    try {
      persistDFrameState({ mode: "cowork" });
    } catch {
      /* ignore */
    }
    void (
      window as unknown as {
        "claude.settings"?: {
          AppPreferences?: { setPreference?: (key: string, value: unknown) => Promise<unknown> };
        };
      }
    )["claude.settings"]?.AppPreferences?.setPreference?.("sidebarMode", "task");
    // Soft SPA leave (not location.replace full reload) — official 3p soft path is
    // mainView.loadURL / shell remount, not a multi-second blank "Applying" page.
    // Do NOT resize(1200) while chooser is still painted; useLoginWindowSize deferred
    // unmount restore handles shell size after /login unmounts.
    if (window.location.pathname + window.location.search !== target) {
      window.history.replaceState({}, "", target);
    }
    window.dispatchEvent(new Event("app:navigation"));
  }, []);

  const setMode = useCallback(async (mode: "1p" | "3p" | "dotClaude") => {
    // Official M5t residual (index-BELzQL5P.js):
    //   whole S5t card onClick → NQt("3p") / NQt("1p") only.
    //   plain Gateway: no d2t "Applying…" (that is SSO needsAuth applying path).
    // Official NQt: await RW?.setDeploymentMode?.(e) — wait for write, then shell reload.
    // Product extension: "dotClaude" follows the 3p soft-leave flow (no relaunch).
    const bridge = custom3pBridge();

    if (mode === "3p" || mode === "dotClaude") {
      // Official M5t → NQt("3p"): await setDeploymentMode then shell remount.
      // Must finish jsA write before leave: eMA synthesizes account only when the
      // persisted chooser mode is a 3p-shell mode. Leaving early → bootstrap
      // account null → App gate paints LoginDesktop on /task/new (click "does nothing").
      try {
        await Promise.resolve(bridge?.setDeploymentMode?.(mode));
      } catch {
        /* poll bootstrap below — leave only when uuid is visible */
      }
      // Confirm synthetic account is visible before soft SPA leave (no process relaunch).
      let hasAccount = false;
      for (let i = 0; i < 12; i++) {
        try {
          const response = await fetch("app://localhost/api/bootstrap", {
            credentials: "include",
            cache: "no-store",
          });
          if (response.ok) {
            const payload = (await response.json()) as { account?: { uuid?: string } | null };
            if (payload?.account && typeof payload.account.uuid === "string" && payload.account.uuid) {
              hasAccount = true;
              break;
            }
          }
        } catch {
          /* retry */
        }
        await new Promise((resolve) => window.setTimeout(resolve, 50));
      }
      // Soft SPA must not leave /login until bootstrap has a uuid. Leaving early
      // paints /task/new while loginGate is still logged_out → chooser remount
      // (first click looks dead). Official NQt waits mode write / remount.
      if (!hasAccount) {
        window.dispatchEvent(new Event("app:deployment-mode-changed"));
        return;
      }
      // Optimistic signed-in BEFORE leave so App does not keep rendering LoginDesktop
      // while path is already /task/new.
      // Also push Account.setAccountDetails now so Cowork getAll initialize does not
      // wait waitForIdentity(5s) on sticky logged-out / missing org ("Loading Cowork").
      try {
        const boot = await fetch("app://localhost/api/bootstrap", {
          credentials: "include",
          cache: "no-store",
        });
        if (boot.ok) {
          const payload = await boot.json();
          void window["claude.web"]?.Account?.setAccountDetails?.(
            accountDetailsFromBootstrap(payload),
          );
        }
      } catch {
        /* useDesktopCoworkAccountSync will re-publish on app:auth-signed-in */
      }
      window.dispatchEvent(new Event("app:auth-signed-in"));
      window.dispatchEvent(new Event("app:deployment-mode-changed"));
      leaveLoginForShell();
      return;
    }

    setPhase("relaunching-1p");
    try {
      await bridge?.setDeploymentMode?.("1p");
    } catch {
      /* continue with soft residual below */
    }

    // 1p: main setDeploymentMode("1p") already schedules relaunch; keep interstitial while exiting.
    // If process does not exit (dev host), soft-open Anthropic host honestly (no fake OAuth).
    void bridge?.relaunchApp?.().catch(() => {});
    window.setTimeout(() => {
      window.location.assign("https://claude.ai/login");
    }, 2500);
  }, [leaveLoginForShell]);

  // If chooser already has krA==="3p" account (bootstrap uuid), do not keep dual cards —
  // official Pos would already be past /login. Covers remount after soft write without click.
  useEffect(() => {
    if (phase !== "idle") return;
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("app://localhost/api/bootstrap", {
          credentials: "include",
          cache: "no-store",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as { account?: { uuid?: string } | null };
        if (cancelled) return;
        if (payload?.account && typeof payload.account.uuid === "string" && payload.account.uuid) {
          leaveLoginForShell();
        }
      } catch {
        /* stay on chooser */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, leaveLoginForShell]);

  const openSetup = useCallback(() => {
    void custom3pBridge()?.openSetupWindow?.();
  }, []);

  if (status === undefined || phase !== "idle") {
    return (
      <RelaunchInterstitial
        message={
          phase === "relaunching-1p"
            ? "Claude is restarting to sign in."
            : "Loading…"
        }
      />
    );
  }

  // Official LoginRoute: status && (provider || bootstrapHost) → M5t dual/single
  // Product extension: detected ~/.claude alone must also enter chooser (not AnthropicEntry).
  // Prior bug: hasChooser ignored status.dotClaude → fresh package userData with a live
  // ~/.claude/settings.json still painted only "Sign in to Anthropic" + Configure.
  const hasChooser =
    Boolean(status)
    && Boolean(
      status?.provider
      || status?.bootstrapHost
      || status?.thirdPartyActivated
      || status?.enabled
      || status?.dotClaude?.available,
    );

  if (hasChooser && status) {
    return (
      <LoginDesktopChooser
        status={status}
        // Official LoginRoute passes no hide1p → M5t uses !status.enabled
        onChoose1p={() => {
          void setMode("1p");
        }}
        onChoose3p={() => {
          void setMode("3p");
        }}
        onChooseDotClaude={() => {
          void setMode("dotClaude");
        }}
        onOpenSetup={openSetup}
      />
    );
  }

  return (
    <LoginDesktopAnthropicEntry
      onChoose1p={() => {
        void setMode("1p");
      }}
      onOpenSetup={openSetup}
    />
  );
}

/** Compact pure Anthropic card (when product only wants 1p path). */
export function LoginDesktopAnthropicOnly() {
  return (
    <LoginDesktopShell>
      <div className="flex w-full max-w-md flex-col items-center gap-4 text-center">
        <CoworkClaudeAvatar state="static" className="!w-12" isInteractive={false} />
        <h1 className="font-ui-serif text-3xl font-medium tracking-tight text-text-100">
          Sign in to continue
        </h1>
        <p className="max-w-sm text-sm text-text-400">Use your Claude account</p>
        <button
          type="button"
          className={`${primaryButtonClass} h-11 w-full rounded-[0.6rem]`}
          onClick={() => window.location.assign("https://claude.ai/login")}
        >
          Sign in to Anthropic
        </button>
        <button
          type="button"
          className={`${secondaryButtonClass} h-11 w-full rounded-[0.6rem]`}
          onClick={() => void custom3pBridge()?.openSetupWindow?.()}
        >
          Configure third-party inference…
        </button>
      </div>
    </LoginDesktopShell>
  );
}
