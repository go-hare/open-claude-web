import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { matchRoute } from "./routes";
import { isDesktopBridgeMissingInElectron } from "../adapters/desktopBridge";
import { subscribeResponseCompletionEvents } from "../features/settings/responseCompletionNotify";
import { DesktopFrame } from "../shell/DesktopFrame";
import { useDesktopCoworkAccountSync } from "./useDesktopCoworkAccountSync";
import { useDesktopQuickEntryRecentChatsSync } from "./useDesktopQuickEntryRecentChatsSync";

const getLocation = () => window.location.pathname + window.location.search;

const subscribeLocation = (onChange: () => void) => {
  window.addEventListener("popstate", onChange);
  window.addEventListener("app:navigation", onChange);

  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("app:navigation", onChange);
  };
};

export function App() {
  useDesktopCoworkAccountSync();
  // Official ion-dist residual: feed Quick Entry bottom recent-chat list (setRecentChats).
  useDesktopQuickEntryRecentChatsSync();
  useEffect(() => subscribeResponseCompletionEvents(), []);
  const locationKey = useSyncExternalStore(subscribeLocation, getLocation);
  const route = useMemo(() => matchRoute(window.location.pathname), [locationKey]);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("app:navigation"));
  }, []);

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
    return <route.Component route={route} onNavigate={navigate} />;
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

  return (
    <DesktopFrame currentRoute={route} onNavigate={navigate}>
      <route.Component route={route} onNavigate={navigate} />
    </DesktopFrame>
  );
}
