import { useEffect, type CSSProperties, type ReactNode } from "react";
import type { AppRoute } from "../app/routes";
import { FrameContext } from "../stores/frameContext";
import { useFrameStore } from "../stores/frameStore";
import { FrameSidebar } from "./FrameSidebar";
import { PaneLayout } from "./PaneLayout";

type DesktopFrameProps = {
  currentRoute: AppRoute;
  children: ReactNode;
  onNavigate: (path: string) => void;
};

export function DesktopFrame({ children, currentRoute, onNavigate }: DesktopFrameProps) {
  const frame = useFrameStore();

  useEffect(() => {
    const routeMode = currentRoute.id === "cowork-home" ? "cowork" : currentRoute.id === "epitaxy-home" || currentRoute.id === "epitaxy-session" ? "code" : undefined;
    if (routeMode && frame.mode !== routeMode) frame.setMode(routeMode);
  }, [currentRoute.id, frame]);

  const frameStyle = {
    "--df-sidebar-width": `${frame.sidebarWidth}px`,
  } as CSSProperties;

  return (
    <div
      className="h-full"
      data-color-version="v2"
      data-theme="claude"
      data-mode="light"
    >
      <div
        className="dframe-root draggable-none"
        data-collapsed={frame.sidebarCollapsed || undefined}
        data-frame-mode={frame.mode}
        data-hovering={(frame.sidebarCollapsed && frame.sidebarHovering) || undefined}
        data-peeked={frame.sidebarCollapsed || undefined}
        data-resizing={frame.sidebarResizing || undefined}
        data-system-font={frame.systemFont || undefined}
        data-darker-code={frame.darkerCode || undefined}
        data-web="true"
        style={frameStyle}
      >
        <FrameContext.Provider value={frame}>
          <FrameSidebar currentRoute={currentRoute} frame={frame} onNavigate={onNavigate} />
          <main id="dframe-main" tabIndex={-1} className="dframe-content">
            <div className="dframe-content-inner">
              <PaneLayout currentRoute={currentRoute} mode={frame.mode} onNavigate={onNavigate}>{children}</PaneLayout>
            </div>
          </main>
        </FrameContext.Provider>
      </div>
    </div>
  );
}
