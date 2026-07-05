import { useCallback, useMemo, useSyncExternalStore } from "react";
import { matchRoute } from "./routes";
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

  return (
    <DesktopFrame currentRoute={route} onNavigate={navigate}>
      <route.Component route={route} onNavigate={navigate} />
    </DesktopFrame>
  );
}
