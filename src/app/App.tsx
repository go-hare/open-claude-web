import { useCallback, useMemo, useSyncExternalStore } from "react";
import { matchRoute } from "./routes";
import { isDesktopBridgeMissingInElectron } from "../adapters/desktopBridge";
import { DesktopFrame } from "../shell/DesktopFrame";

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
  const locationKey = useSyncExternalStore(subscribeLocation, getLocation);
  const route = useMemo(() => matchRoute(window.location.pathname), [locationKey]);

  const navigate = useCallback((path: string) => {
    if (path === window.location.pathname) return;
    window.history.pushState({}, "", path);
    window.dispatchEvent(new Event("app:navigation"));
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
