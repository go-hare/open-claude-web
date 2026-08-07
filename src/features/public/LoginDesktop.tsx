import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { RouteViewProps } from "../../app/routes";
import { RelaunchInterstitialBody } from "../../shell/RelaunchInterstitial";
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
 *   x5t() = Gbe.interactiveAuthStore (needsAuth / pendingUserCode / kind)
 *   phases: idle | relaunching | sso-pending | applying
 *   needsAuth → Continue triggers b5t=triggerInteractiveAuth (not NQt("3p"))
 *   plain 3p → NQt("3p"); 1p → relaunching d2t → NQt("1p")
 *   applying d2t signed-in → relaunchApp
 *   E5t bootstrapHost only when kind==="bootstrap" (product: bootstrapOidc)
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

/**
 * Official lcA / interactiveAuth store residual (x5t).
 * null = no interactive step; else needsAuth drives SSO card path.
 */
export type InteractiveAuthState = {
  needsAuth: boolean;
  kind?: "vertex" | "bedrockSso" | "bootstrapOidc" | "bootstrap" | string | null;
  pendingUserCode?: string | null;
  error?: string | null;
  source?: "managed" | "local" | "none" | string;
} | null;

type BridgeCustom3p = {
  getLoginDesktop3pStatus?: () => Promise<LoginDesktop3pStatus | null>;
  setDeploymentMode?: (mode: string) => Promise<unknown>;
  openSetupWindow?: () => Promise<unknown>;
  relaunchApp?: () => Promise<unknown>;
};

type InteractiveAuthStore = {
  getState?: () => Promise<InteractiveAuthState> | InteractiveAuthState;
  onStateChange?: (listener: (state: InteractiveAuthState) => void) => (() => void) | void;
};

type LocalAgentModeSessionsBridge = {
  interactiveAuthStore?: InteractiveAuthStore;
  triggerInteractiveAuth?: () => Promise<{ ok: boolean; error?: string } | unknown>;
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

function localAgentSessionsBridge(): LocalAgentModeSessionsBridge | undefined {
  return (window as unknown as { "claude.web"?: { LocalAgentModeSessions?: LocalAgentModeSessionsBridge } })[
    "claude.web"
  ]?.LocalAgentModeSessions;
}

function windowControl(): WindowControlBridge | undefined {
  return (window as unknown as { electronWindowControl?: WindowControlBridge }).electronWindowControl
    ?? (window as unknown as { "claude.web"?: { WindowControl?: WindowControlBridge } })["claude.web"]
      ?.WindowControl;
}

/**
 * Official x5t residual: subscribe Gbe.interactiveAuthStore.
 * Returns undefined while loading (M5t shows empty sVt); null when ready and no auth needed.
 */
function useInteractiveAuthState(): InteractiveAuthState | undefined {
  const [state, setState] = useState<InteractiveAuthState | undefined>(undefined);

  useEffect(() => {
    const store = localAgentSessionsBridge()?.interactiveAuthStore;
    if (!store?.getState) {
      // No store (web-only / missing preload) — treat as ready with no interactive auth.
      setState(null);
      return;
    }
    let cancelled = false;
    void Promise.resolve(store.getState())
      .then((value) => {
        if (!cancelled) setState(value ?? null);
      })
      .catch(() => {
        if (!cancelled) setState(null);
      });
    const unsub = store.onStateChange?.((next) => {
      if (!cancelled) setState(next ?? null);
    });
    return () => {
      cancelled = true;
      if (typeof unsub === "function") unsub();
    };
  }, []);

  return state;
}

async function triggerInteractiveAuthResidual(): Promise<{ ok: boolean; error?: string }> {
  const bridge = localAgentSessionsBridge();
  try {
    const result = await Promise.resolve(bridge?.triggerInteractiveAuth?.());
    if (result && typeof result === "object" && "ok" in result) {
      const bag = result as { ok: boolean; error?: string };
      return { ok: Boolean(bag.ok), error: typeof bag.error === "string" ? bag.error : undefined };
    }
    // Missing IPC — honest fail (official b5t fallback string).
    return { ok: false, error: "Interactive sign-in is not available in this app version" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Sign-in failed unexpectedly. Try again.",
    };
  }
}

/** Official E5t: show bootstrapHost only for bootstrap kind. */
function isBootstrapAuthKind(kind: string | null | undefined): boolean {
  return kind === "bootstrap" || kind === "bootstrapOidc";
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
    case "openai":
      return "OpenAI";
    case "gemini":
      return "Gemini";
    case "grok":
      return "Grok";
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

type M5tPhase = "idle" | "relaunching" | "sso-pending" | "applying";

/**
 * Official M5t residual (chooser / single org card + SSO phases).
 * hide1p: only third-party card (T5t portal).
 * !hide1p: dual cards including "Sign in to Anthropic".
 *
 * Interactive auth (x5t / b5t):
 *   needsAuth → Continue runs triggerInteractiveAuth, not NQt("3p")
 *   pendingUserCode → sso-pending device-code UI
 *   applying → d2t signed-in → relaunchApp
 */
export function LoginDesktopChooser({
  status,
  hide1p,
  onChoose1p,
  onChoose3p,
  onChooseDotClaude,
  onOpenSetup,
  interactiveAuth,
  onRelaunchApp,
}: {
  status: LoginDesktop3pStatus;
  hide1p?: boolean;
  onChoose1p: () => void;
  onChoose3p: () => void;
  onChooseDotClaude?: () => void;
  /** Product: open setup-desktop-3p when no configLibrary bag yet (not official M5t footer). */
  onOpenSetup?: () => void;
  /** Official x5t result; undefined = still loading store. */
  interactiveAuth?: InteractiveAuthState | undefined;
  /** Official applying onDone → RW.relaunchApp. */
  onRelaunchApp?: () => void;
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
  const managed = status.source?.type === "managed";
  // Product: AnthropicEntry had "Configure third-party…". Entering chooser only because
  // ~/.claude was found must not remove that path — Setup still creates configLibrary bag.
  const showConfigureSetup = Boolean(onOpenSetup) && !hasProviderCard;

  // Official M5t local phase machine (d / u).
  const [phase, setPhase] = useState<M5tPhase>("idle");
  const [ssoError, setSsoError] = useState<string | undefined>(undefined);
  const requestGen = useRef(0);
  const userBackedOut = useRef(false);
  const ssoInFlight = useRef(false);

  const pendingUserCode =
    interactiveAuth && typeof interactiveAuth === "object"
      ? interactiveAuth.pendingUserCode ?? null
      : null;
  const needsAuth = Boolean(
    interactiveAuth && typeof interactiveAuth === "object" && interactiveAuth.needsAuth,
  );
  const authKind =
    interactiveAuth && typeof interactiveAuth === "object" ? interactiveAuth.kind ?? null : null;
  const isBootstrap = isBootstrapAuthKind(authKind);
  // Official E5t: bootstrapHost only when kind === "bootstrap".
  const pillBootstrapHost = isBootstrap ? status.bootstrapHost : null;
  const continueTitle = isBootstrap
    ? "Sign in to your organization"
    : `Continue with ${short}`;
  // Official S: needsAuth → ssoSub (or last error); else noAccount.
  const continueSub = needsAuth
    ? ssoError ?? "Sign in with your work account"
    : "No Anthropic account needed";
  const continueSubClass = ssoError ? "text-xs text-brand-000" : "text-xs text-text-400";

  // Official: pendingUserCode drives sso-pending; clearing it while in sso-pending → applying
  // (unless user backed out or trigger still in flight).
  useEffect(() => {
    if (!pendingUserCode) {
      userBackedOut.current = false;
      if (phase === "sso-pending" && !ssoInFlight.current) {
        setPhase("applying");
      }
      return;
    }
    if (phase === "idle" && !userBackedOut.current) {
      setPhase("sso-pending");
    }
  }, [pendingUserCode, phase]);

  const startSso = useCallback(async () => {
    // Official w: gen++, clear error, sso-pending, trigger b5t.
    const gen = ++requestGen.current;
    setSsoError(undefined);
    setPhase("sso-pending");
    ssoInFlight.current = true;
    let result: { ok: boolean; error?: string };
    try {
      result = await triggerInteractiveAuthResidual();
    } catch {
      result = { ok: false, error: "Sign-in failed unexpectedly. Try again." };
    } finally {
      ssoInFlight.current = false;
    }
    if (gen !== requestGen.current) return;
    if (result.ok) {
      setPhase("applying");
    } else {
      setSsoError(result.error ?? "Sign-in failed unexpectedly. Try again.");
      setPhase("idle");
    }
  }, []);

  const onSsoBack = useCallback(() => {
    // Official k: gen++, g=true, idle.
    requestGen.current += 1;
    userBackedOut.current = true;
    setPhase("idle");
  }, []);

  const onApplyingDone = useCallback(() => {
    // Official _: RW.relaunchApp — not NQt (session already authorized).
    onRelaunchApp?.();
  }, [onRelaunchApp]);

  const onApplyingCancel = useCallback(() => {
    setPhase("idle");
  }, []);

  // Official: void 0 === r → empty sVt while interactiveAuth store still loading.
  if (interactiveAuth === undefined) {
    return (
      <LoginDesktopShell>
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-14 text-center">
          <CoworkClaudeAvatar state="thinking" className="!w-12" isInteractive={false} />
        </div>
      </LoginDesktopShell>
    );
  }

  // Official: "relaunching" | "applying" → d2t (signin | signed-in).
  if (phase === "relaunching") {
    return (
      <LoginDesktopShell>
        <RelaunchInterstitialBody
          variant="signin"
          onDone={onChoose1p}
          onCancel={() => setPhase("idle")}
        />
      </LoginDesktopShell>
    );
  }
  if (phase === "applying") {
    return (
      <LoginDesktopShell>
        <RelaunchInterstitialBody
          variant="signed-in"
          onDone={onApplyingDone}
          onCancel={onApplyingCancel}
        />
      </LoginDesktopShell>
    );
  }

  // Official sso-pending: device code / browser approve UI.
  if (phase === "sso-pending") {
    return (
      <LoginDesktopShell>
        <div className="flex h-full w-full flex-col items-center justify-center gap-4 text-center">
          <CoworkClaudeAvatar state="thinking" className="!w-12" isInteractive={false} />
          <h1 className="font-ui-serif text-2xl font-medium tracking-tight text-text-100">
            Opening your browser to sign in…
          </h1>
          {pendingUserCode ? (
            <>
              <div
                aria-describedby="sso-code-hint"
                className="rounded-lg border-0.5 border-border-300 bg-bg-000 px-4 py-2 font-mono text-2xl tracking-[0.3em] text-text-100"
              >
                {pendingUserCode}
              </div>
              <p
                id="sso-code-hint"
                className="max-w-sm text-balance text-sm leading-normal text-text-400"
              >
                Confirm this code matches the one shown in your browser.
              </p>
            </>
          ) : (
            <p className="max-w-sm text-balance text-sm leading-normal text-text-400">
              Approve the request in your browser, then return here.
            </p>
          )}
          <button
            type="button"
            onClick={onSsoBack}
            className="mt-2 text-xs text-text-400 underline underline-offset-2 hover:text-text-100"
          >
            Back
          </button>
        </div>
      </LoginDesktopShell>
    );
  }

  // Official M5t idle dual/single cards.
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
            <ChoiceCard
              ariaLabel={continueTitle}
              onClick={() => {
                // Official M = needsAuth ? w : v (SSO vs NQt("3p")).
                if (needsAuth) {
                  void startSso();
                } else {
                  onChoose3p();
                }
              }}
            >
              <div className="flex items-center gap-3.5">
                <ProviderGlyph />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-semibold text-text-100">{continueTitle}</span>
                  <span className={continueSubClass}>{continueSub}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <SourcePill managed={managed} bootstrapHost={pillBootstrapHost} />
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
            <ChoiceCard
              ariaLabel="Sign in to Anthropic"
              onClick={() => {
                // Official: Sign in card only sets phase relaunching (d2t), NQt onDone.
                setPhase("relaunching");
              }}
            >
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

/**
 * Official LoginRoute pure-1p residual (`c632c9594` `pn`):
 *   Avatar !w-16, "Claude for Windows/Mac", "The fastest way to talk with Claude",
 *   primary CTA **Get started** (`/aBLH2Kytu`) → onNext (Sign In step).
 * Product: honest 1p (no OAuth invent) + secondary Configure third-party (product extension).
 */
function LoginDesktopAnthropicEntry({
  onChoose1p,
  onOpenSetup,
}: {
  onChoose1p: () => void;
  onOpenSetup: () => void;
}) {
  const platformLabel =
    typeof navigator !== "undefined" && /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent)
      ? "Mac"
      : "Windows";
  return (
    <LoginDesktopShell>
      <div className="relative flex h-full w-full flex-col items-center">
        <div className="flex w-full flex-1 flex-col items-center justify-center gap-3.5 text-center">
          <CoworkClaudeAvatar state="static" className="!w-16 mb-14" isInteractive={false} />
          <h1 className="text-center justify-start text-text-100 text-3xl font-medium font-ui-serif">
            Claude <em className="italic">for</em> {platformLabel}
          </h1>
          <p className="text-text-400 text-lg pt-4">The fastest way to talk with Claude</p>
        </div>
        <div className="absolute bottom-12 left-20 right-20 flex flex-col gap-3">
          <button
            type="button"
            className={`${primaryButtonClass} h-11 w-full !rounded-xl text-sm`}
            onClick={onChoose1p}
          >
            Get started
          </button>
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

/**
 * Official LoginRoute jn residual (c632c9594-Bv5AdbQY.js):
 *   electronWindowControl.resize(600, 600, { center: true })
 *   pagehide + cleanup → resize(1200, 800)
 *
 * Official 3p leave is mainView.loadURL (got soft path) → full document tear-down →
 * pagehide fires restore. Product soft SPA history.replace must NOT leave /login
 * without loadURL — that paints DesktopFrame at 600 and flashes.
 *
 * Product gate remounts: defer cleanup restore and cancel if still on /login so
 * Strict Mode / gate remounts do not blow size back to 1200 while chooser is up.
 */
let loginWindowSizeEpoch = 0;

function useLoginWindowSize() {
  useLayoutEffect(() => {
    const epoch = ++loginWindowSizeEpoch;
    const control = windowControl();
    // Official jn: resize(600,600,{center:true}).
    void Promise.resolve(control?.resize?.(600, 600, { center: true })).then(() => {
      if (loginWindowSizeEpoch !== epoch) return;
      void control?.focus?.();
    });

    const restoreMain = () => {
      void control?.resize?.(1200, 800);
    };

    // Official: pagehide restores (full document leave via loadURL/relaunch).
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
  // AnthropicEntry-only 1p path still uses page-level d2t (chooser owns its own phase).
  const [phase, setPhase] = useState<"idle" | "relaunching-1p">("idle");
  // Official x5t — M5t needsAuth / sso-pending / applying.
  const interactiveAuth = useInteractiveAuthState();

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

  /**
   * Official NQt(mode) — only writes deployment mode.
   * 3p/dotClaude: soft loadURL. 1p: clear session + relaunch (after d2t onDone).
   */
  const setMode = useCallback(async (mode: "1p" | "3p" | "dotClaude") => {
    const bridge = custom3pBridge();
    try {
      await Promise.resolve(bridge?.setDeploymentMode?.(mode));
    } catch {
      /* main may still loadURL/relaunch; keep current UI if write fails */
    }
  }, []);

  /** Official M5t applying onDone: RW.relaunchApp (not NQt). */
  const onRelaunchApp = useCallback(() => {
    void Promise.resolve(custom3pBridge()?.relaunchApp?.());
  }, []);

  /**
   * AnthropicEntry path only: Sign in → page-level d2t → NQt("1p") onDone.
   * Chooser path handles relaunching internally; onChoose1p is already NQt("1p").
   */
  const onAnthropicEntryChoose1p = useCallback(() => {
    setPhase("relaunching-1p");
  }, []);

  const onSignInRelaunchDone = useCallback(() => {
    void setMode("1p");
  }, [setMode]);

  const onSignInRelaunchCancel = useCallback(() => {
    setPhase("idle");
  }, []);

  // If bootstrap already has a 3p-shell account, official Pos is past /login.
  // Re-invoke NQt so main got soft loadURL remounts shell (no renderer soft SPA).
  useEffect(() => {
    if (phase !== "idle" || !status) return;
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
        if (!(payload?.account && typeof payload.account.uuid === "string" && payload.account.uuid)) {
          return;
        }
        const mode: "3p" | "dotClaude" =
          status.deploymentMode === "dotClaude" || status.dotClaude?.available
            ? "dotClaude"
            : "3p";
        try {
          await Promise.resolve(custom3pBridge()?.setDeploymentMode?.(mode));
        } catch {
          /* stay on chooser */
        }
      } catch {
        /* stay on chooser */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [phase, status]);

  const openSetup = useCallback(() => {
    void custom3pBridge()?.openSetupWindow?.();
  }, []);

  if (status === undefined) {
    return (
      <LoginDesktopShell>
        <div className="flex h-full w-full flex-col items-center justify-center gap-5 px-14 text-center">
          <CoworkClaudeAvatar state="thinking" className="!w-12" isInteractive={false} />
          <p className="max-w-sm text-balance text-sm leading-normal text-text-400">Loading…</p>
        </div>
      </LoginDesktopShell>
    );
  }

  // AnthropicEntry-only path: page-level d2t (chooser owns its own relaunching phase).
  if (phase === "relaunching-1p") {
    return (
      <LoginDesktopShell>
        <RelaunchInterstitialBody
          variant="signin"
          onDone={onSignInRelaunchDone}
          onCancel={onSignInRelaunchCancel}
        />
      </LoginDesktopShell>
    );
  }

  // Official LoginRoute: status && (provider || bootstrapHost) → M5t dual/single
  // Product extension: detected ~/.claude alone must also enter chooser (not AnthropicEntry).
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
        interactiveAuth={interactiveAuth}
        // Official LoginRoute passes no hide1p → M5t uses !status.enabled
        // onChoose1p = NQt("1p") after chooser-internal d2t onDone.
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
        onRelaunchApp={onRelaunchApp}
      />
    );
  }

  return (
    <LoginDesktopAnthropicEntry
      onChoose1p={onAnthropicEntryChoose1p}
      onOpenSetup={openSetup}
    />
  );
}

/**
 * Official T5t residual (index-BELzQL5P.js):
 *   Mount when shell is up and interactiveAuth.needsAuth (parent gate).
 *   EQt status truthy → #root.inert + createPortal z-overlay → M5t({status, hide1p:true}).
 * Not the LoginRoute dual chooser.
 */
export function LoginDesktopT5tPortal() {
  const [status, setStatus] = useState<LoginDesktop3pStatus | null | undefined>(undefined);
  const interactiveAuth = useInteractiveAuthState();

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
        if (!cancelled) setStatus(value ?? null);
      })
      .catch(() => {
        if (!cancelled) setStatus(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const needsAuth = Boolean(
    interactiveAuth && typeof interactiveAuth === "object" && interactiveAuth.needsAuth,
  );
  // Official: T5t only when EQt status truthy AND parent needsAuth.
  const open = Boolean(status) && needsAuth;

  useEffect(() => {
    if (!open) return;
    const root = document.getElementById("root");
    if (!root) return;
    root.inert = true;
    return () => {
      root.inert = false;
    };
  }, [open]);

  const setMode = useCallback(async (mode: "1p" | "3p" | "dotClaude") => {
    try {
      await Promise.resolve(custom3pBridge()?.setDeploymentMode?.(mode));
    } catch {
      /* main may still loadURL */
    }
  }, []);

  const onRelaunchApp = useCallback(() => {
    void Promise.resolve(custom3pBridge()?.relaunchApp?.());
  }, []);

  if (!open || !status) return null;

  // Portal to body like residual T5t createPortal(..., document.body).
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Sign in to your organization"
      className="fixed inset-0 z-overlay"
      data-official-source="index-BELzQL5P:T5t"
    >
      <LoginDesktopChooser
        status={status}
        hide1p
        interactiveAuth={interactiveAuth}
        onChoose1p={() => {
          void setMode("1p");
        }}
        onChoose3p={() => {
          void setMode("3p");
        }}
        onChooseDotClaude={() => {
          void setMode("dotClaude");
        }}
        onOpenSetup={() => {
          void custom3pBridge()?.openSetupWindow?.();
        }}
        onRelaunchApp={onRelaunchApp}
      />
    </div>,
    document.body,
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
