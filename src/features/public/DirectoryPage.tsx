import { useEffect } from "react";
import type { RouteViewProps } from "../../app/routes";
import { CoworkHome } from "../cowork/CoworkHome";
import {
  isDirectorySection,
  officialDirectoryStore,
} from "../customize/directory/officialDirectoryStore";

/**
 * Official gos directory / directory/$ (index-BELzQL5P.js als/rls):
 *   /directory → /directory/plugins
 *   splat opens HT.openItem / navigate; unmount HT.close
 *   body is KWt (new chat) with globally mounted $8t overlay
 * Product: keep CoworkHome under the modal (KWt residual). Do not invent
 * a framed Directory chrome that collides with Windows titleBarOverlay.
 */
export function DirectoryPage({ onNavigate, route }: RouteViewProps) {
  const pathname = window.location.pathname;

  useEffect(() => {
    if (pathname === "/directory") {
      window.history.replaceState({}, "", "/directory/plugins");
      window.dispatchEvent(new Event("app:navigation"));
      return;
    }
    const rest = pathname.replace(/^\/directory\/?/, "");
    const [sectionRaw, itemId] = rest.split("/").filter(Boolean);
    if (sectionRaw && !isDirectorySection(sectionRaw)) {
      window.history.replaceState(
        {},
        "",
        itemId ? `/directory/plugins/${encodeURIComponent(itemId)}` : "/directory/plugins",
      );
      window.dispatchEvent(new Event("app:navigation"));
      return;
    }
    const section = isDirectorySection(sectionRaw) ? sectionRaw : "plugins";
    const state = officialDirectoryStore.getState();
    if (state.isOpen) state.navigate(section, itemId ?? null);
    else state.openItem(section, itemId ?? null);
  }, [pathname]);

  useEffect(() => () => officialDirectoryStore.getState().close(), []);

  return <CoworkHome onNavigate={onNavigate} route={route} />;
}
