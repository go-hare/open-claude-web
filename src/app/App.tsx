import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { matchRoute } from "./routes";
import { isDesktopBridgeMissingInElectron } from "../adapters/desktopBridge";
import { BootstrapConnectionErrorPage } from "../features/public/AccessPages";
import { LoginDesktopT5tPortal } from "../features/public/LoginDesktop";
import { subscribeResponseCompletionEvents } from "../features/settings/responseCompletionNotify";
import { DesktopFrame } from "../shell/DesktopFrame";
import {
  accountDetailsFromBootstrap,
  bootstrapUrls,
  useDesktopCoworkAccountSync,
} from "./useDesktopCoworkAccountSync";
import { useDesktopQuickEntryRecentChatsSync } from "./useDesktopQuickEntryRecentChatsSync";
import { useDesktopQuickEntrySubmit } from "./useDesktopQuickEntrySubmit";
import { useDirectMcpStatusHydrate } from "./useDirectMcpStatusHydrate";
import { useApplyRelaunchFromSetup } from "../shell/useApplyRelaunchFromSetup";
import { desktopBridge } from "../adapters/desktopBridge";
import { queryClient } from "./queryClient";
import { BOOTSTRAP_QUERY_KEY } from "../features/settings/bootstrapQuery";
import { EPITAXY_ACTION_CENTER_SESSIONS_QUERY_KEY } from "../features/epitaxy/epitaxyActionCenterState";

const getLocation = () => window.location.pathname + window.location.search;

const subscribeLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener("app:navigation", onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("app:navigation", onChange);
  };
};

/**
 * Official ion-dist residual (index-BELzQL5P.js Pos `/`):
 *   isLoggedOut && !bootstrapFailed → navigate /login
 * Product: bootstrap account.uuid missing ⇒ logged out (1p residual).
 * Skip gate for public auth routes so /login itself is reachable.
 */
const LOGIN_GATE_EXEMPT = new Set([
  "/login",
  "/oauth/device",
  "/oauth/code/success",
  "/restricted",
  "/restricted/submit",
  "/maintenance",
  "/unauthorized",
  "/reported",
  "/no-organization",
]);

function isLoginGateExempt(pathname: string): boolean {
  if (LOGIN_GATE_EXEMPT.has(pathname)) return true;
  return pathname.startsWith("/login/");
}

export function App() {
  useDesktopCoworkAccountSync();
  // Official ion-dist residual: feed Quick Entry bottom recent-chat list (setRecentChats).
  useDesktopQuickEntryRecentChatsSync();
  // Official B0t residual: KI.onOnQuickEntrySubmit → q0t process payload.
  useDesktopQuickEntrySubmit();
  // Residual Rrs: Direct MCP status subscribe + initial getDirectMcpServerStatuses.
  useDirectMcpStatusHydrate();
  // Setup Apply → close small window → main SPA apply countdown → process relaunch.
  const { overlay: applyRelaunchOverlay } = useApplyRelaunchFromSetup();
  useEffect(() => subscribeResponseCompletionEvents(), []);
  const locationKey = useSyncExternalStore(subscribeLocation, getLocation);
  const route = useMemo(() => matchRoute(window.location.pathname), [locationKey]);
  const [loginGate, setLoginGate] = useState<"pending" | "logged_out" | "signed_in" | "unknown">(
    "pending",
  );
  // While revalidating bootstrap after soft leave/sign-out, keep prior UI mounted.
  // Forcing gate→pending painted a blank frame (user-visible flash).
  const [bootstrapInFlight, setBootstrapInFlight] = useState(true);

  const navigate = useCallback((path: string) => {
    // Official Ac push accepts pathname + search (e.g. /customize/connectors?directory=true).
    const current = `${window.location.pathname}${window.location.search}`;
    if (path === current) return;
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("app:navigation"));
  }, []);

  // Re-resolve on locationKey and after setDeploymentMode (clear/3p) soft path.
  // Official process relaunch reloads bootstrap; product SPA must re-fetch or
  // shell stays signed_in with account null (clear) / bounce login (3p early leave).
  // Do NOT wipe loginGate to pending on every nav — blank flash. Hold prior UI.
  const [authEpoch, setAuthEpoch] = useState(0);
  useEffect(() => {
    const bump = () => setAuthEpoch((n) => n + 1);
    window.addEventListener("app:deployment-mode-changed", bump);
    // LoginDesktop 3p leave: mark signed_in immediately so /task/new is not
    // still painted as LoginDesktop while bootstrap revalidate is in flight.
    const onSignedIn = () => {
      setLoginGate("signed_in");
      setBootstrapInFlight(false);
      setAuthEpoch((n) => n + 1);
    };
    // Sign-out / clear: force logged_out so shell cannot stick with account null.
    const onLoggedOut = () => {
      queryClient.removeQueries({ queryKey: BOOTSTRAP_QUERY_KEY });
      setLoginGate("logged_out");
      setBootstrapInFlight(false);
      setAuthEpoch((n) => n + 1);
    };
    window.addEventListener("app:auth-signed-in", onSignedIn);
    window.addEventListener("app:auth-logged-out", onLoggedOut);
    // Official Custom3pSetup bootstrapState store push after pot/jsA write.
    const setup = window["claude.settings"]?.Custom3pSetup as
      | { onBootstrapState_$store$_update?: (cb: () => void) => (() => void) | void }
      | undefined;
    const unsub = setup?.onBootstrapState_$store$_update?.(bump);
    return () => {
      window.removeEventListener("app:deployment-mode-changed", bump);
      window.removeEventListener("app:auth-signed-in", onSignedIn);
      window.removeEventListener("app:auth-logged-out", onLoggedOut);
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setBootstrapInFlight(true);
    // Official vn sessions load in parallel with account (Go) — warm Pw list before
    // Code Tw first paint so greetEmpty is not forced false on hard reload.
    void queryClient.prefetchQuery({
      queryKey: EPITAXY_ACTION_CENTER_SESSIONS_QUERY_KEY,
      queryFn: async () => {
        try {
          return await desktopBridge.LocalSessions.list();
        } catch {
          return [];
        }
      },
      staleTime: 30_000,
    });
    void (async () => {
      try {
        let payload: unknown = null;
        for (const url of bootstrapUrls()) {
          try {
            const response = await fetch(url, {
              credentials: "include",
              signal: controller.signal,
              cache: "no-store",
            });
            if (!response.ok) continue;
            const contentType = response.headers.get("content-type") || "";
            if (contentType.includes("json")) {
              payload = await response.json();
              break;
            }
            const text = await response.text();
            if (text.startsWith("{") || text.startsWith("[")) {
              payload = JSON.parse(text) as unknown;
              break;
            }
          } catch {
            /* try next */
          }
        }
        if (controller.signal.aborted) return;
        if (!payload) {
          setLoginGate("unknown");
          setBootstrapInFlight(false);
          return;
        }
        // Seed shared bootstrap cache so Code Tw (Go residual) reads account.display_name
        // synchronously after login-gate fetch — no second CodeGreeting-only effect.
        if (payload && typeof payload === "object") {
          queryClient.setQueryData(BOOTSTRAP_QUERY_KEY, payload as Record<string, unknown>);
        }
        const details = accountDetailsFromBootstrap(payload);
        setLoginGate(details.isLoggedOut ? "logged_out" : "signed_in");
        setBootstrapInFlight(false);
      } catch {
        if (!controller.signal.aborted) {
          setLoginGate("unknown");
          setBootstrapInFlight(false);
        }
      }
    })();
    return () => controller.abort();
  }, [locationKey, authEpoch]);

  useEffect(() => {
    // Official soft leave: wait for bootstrap result before bouncing /task/new → /login.
    if (bootstrapInFlight) return;
    if (loginGate !== "logged_out") return;
    const pathname = window.location.pathname;
    if (isLoginGateExempt(pathname)) return;
    const returnTo = `${pathname}${window.location.search}`;
    const target =
      returnTo && returnTo !== "/" && returnTo !== "/login"
        ? `/login?returnTo=${encodeURIComponent(returnTo)}`
        : "/login";
    if (window.location.pathname === "/login") return;
    window.history.replaceState({}, "", target);
    window.dispatchEvent(new Event("app:navigation"));
  }, [loginGate, locationKey, bootstrapInFlight]);

  /**
   * Official ion-dist `B0t` residual:
   * QI?.onNavigate?.(path => {
   *   if path === "/submit_quick_entry" → quick-entry submit residual
   *   if path.startsWith("/settings") && settings modal mounted → P5(section)
   *   else router.push(path)
   * })
   * Our settings are full routes (not O5 modal), so always navigate(path).
   * Main menu Settings: asar XC.dispatchNavigate only → this event (no softNavigate).
   */
  useEffect(() => {
    const navigation = window["claude.web"]?.Navigation as
      | {
          onNavigate?: (cb: (path: string) => void) => (() => void) | void;
          navigate?: (cb: (path: string) => void) => (() => void) | void;
        }
      | undefined;
    if (!navigation?.onNavigate && !navigation?.navigate) return;

    const onNav = (path: string) => {
      // Official B0t: /submit_quick_entry is not a router push.
      if (!path || path === "/submit_quick_entry") return;
      // Official: if settings modal already mounted, open section in-place (O5/P5).
      // We use route-based settings — no O5 store; fall through to push.
      navigate(path);
    };
    const subscribe = navigation.onNavigate ?? navigation.navigate;
    return subscribe?.(onNav) ?? undefined;
  }, [navigate]);

  /**
   * Official ion-dist `iXt` residual:
   * `MenuEvents.onCloseWindow` → cancelable `claude:close-window`, else WindowControl.close.
   * Windows File → Close Window (asar `dst` → MenuEvents.closeWindow).
   */
  useEffect(() => {
    const menuEvents = window["claude.web"]?.MenuEvents as
      | {
          onCloseWindow?: (cb: () => void) => (() => void) | void;
          closeWindow?: (cb: () => void) => (() => void) | void;
        }
      | undefined;
    if (!menuEvents?.onCloseWindow && !menuEvents?.closeWindow) return;

    const onClose = () => {
      const event = new CustomEvent("claude:close-window", { cancelable: true });
      window.dispatchEvent(event);
      if (event.defaultPrevented) return;
      void window["claude.web"]?.WindowControl?.close?.();
    };
    const subscribe = menuEvents.onCloseWindow ?? menuEvents.closeWindow;
    return subscribe?.(onClose) ?? undefined;
  }, []);

  if (route.frame === "standalone") {
    return (
      <>
        <route.Component route={route} onNavigate={navigate} />
        {applyRelaunchOverlay}
      </>
    );
  }

  if (isDesktopBridgeMissingInElectron) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg-000 px-6 text-text-100">
        <section className="max-w-[520px] rounded-r6 bg-bg-100 p-6 shadow-[var(--df-shadow-card)]">
          <h1 className="text-title text-t9">桌面通信桥未加载</h1>
          <p className="mt-3 text-body text-t7">
            当前页面运行在 Electron 内，但没有检测到官方 preload 暴露的 claude.web / claude.settings。请先构建 preload，再重启桌面客户端。
          </p>
        </section>
      </main>
    );
  }

  // Official Pos residual (index-BELzQL5P): only after bootstrap knows isLoggedOut → /login.
  // Do not mount DesktopFrame with a null account. While history catches up, render
  // LoginDesktop directly (same end state as replaceState → /login).
  if (loginGate === "logged_out" && !isLoginGateExempt(window.location.pathname)) {
    const loginRoute = matchRoute("/login");
    return (
      <>
        <loginRoute.Component route={loginRoute} onNavigate={navigate} />
        {applyRelaunchOverlay}
      </>
    );
  }

  // Official does NOT paint LoginDesktop while auth is still pending.
  // Product bug: pending → LoginDesktop on shell routes (/task/new etc.) forced
  // useLoginWindowSize 600×600, then bootstrap signed_in (3p synthetic account)
  // remounted DesktopFrame + resize 1200×800 → "login window then flash to main".
  // Pending here is brief null over createMainWindow backgroundColor (I8) — residual-like.
  if (loginGate === "pending") {
    // Still mount apply overlay so Setup→Relaunch can paint over blank shell if needed.
    return <>{applyRelaunchOverlay}</>;
  }

  // Official Vis/Pos bootstrapFailed → Yrs connection error (not main shell).
  // Product loginGate "unknown": /api/bootstrap returned no usable JSON.
  // Never mount DesktopFrame without a resolved identity.
  if (loginGate === "unknown") {
    return (
      <>
        <BootstrapConnectionErrorPage />
        {applyRelaunchOverlay}
      </>
    );
  }

  return (
    <>
      <DesktopFrame currentRoute={route} onNavigate={navigate}>
        <route.Component route={route} onNavigate={navigate} />
      </DesktopFrame>
      {/* Official T5t: org force-login overlay when interactiveAuth.needsAuth (hide1p). */}
      <LoginDesktopT5tPortal />
      {applyRelaunchOverlay}
    </>
  );
}
