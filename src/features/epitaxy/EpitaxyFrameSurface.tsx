import type { CSSProperties, ReactNode } from "react";
import { primaryButtonClass } from "../shared/buttonClasses";

const tileVars = {
  "--tile-container-border": "transparent",
  "--tile-container-bg": "transparent",
  "--tile-indicator-color": "var(--accent)",
  "--tile-indicator-thickness": "3px",
  "--tile-resize-color": "var(--t4)",
  "--tile-resize-color-active": "var(--t9)",
  "--tile-resize-color-focus": "var(--accent)",
  "--tile-resize-color-disabled": "var(--t2)",
  "--tile-resize-thickness": "3px",
  "--tile-resize-length": "56px",
  "--tile-drag-color": "var(--t4)",
  "--tile-drag-color-active": "var(--t9)",
  "--tile-drag-color-focus": "var(--accent)",
} as CSSProperties;

const viewportStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  overflow: "clip",
};

// Official nE (c119): { gap:12, padding:8, minTilePx:100, dragLift:24 }
// KI applies padding on the tile container so Nn sidebar effect-primary-elevated
// 1px outer ring is not clipped by the viewport's overflow:clip.
// Official iE only zeroes paddingRight when chat is the rightmost tile (rd/E).
// Our chat is left / side right → keep full 8px padding including right.
const tileContainerStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  border: "1px solid var(--tile-container-border)",
  background: "var(--tile-container-bg)",
  display: "flex",
  flexDirection: "column",
  position: "relative",
  alignItems: "stretch",
  padding: 8,
  transformStyle: "preserve-3d",
};

const rowStyle: CSSProperties = {
  display: "flex",
  position: "relative",
  transformStyle: "preserve-3d",
  minWidth: 0,
  minHeight: 0,
  overflow: "visible",
  flexDirection: "row",
  flex: "1 1 0px",
};

const tileWrapStyle: CSSProperties = {
  position: "relative",
  transformStyle: "preserve-3d",
  minWidth: 100,
  minHeight: 100,
  overflow: "visible",
  flexGrow: 1,
  flexShrink: 1,
  flexBasis: 0,
};

const tileShellStyle: CSSProperties = {
  width: "100%",
  height: "100%",
  transformStyle: "preserve-3d",
  transform: "translateZ(1px)",
  zIndex: 1,
};

export function EpitaxyTileLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full" style={tileVars}>
      <div style={viewportStyle}>
        <div style={tileContainerStyle}>
          <div style={rowStyle}>
            <div style={tileWrapStyle}>
              <div className="tiles-shell" style={tileShellStyle}>
                {children}
              </div>
            </div>
          </div>
          <span className="sr-only">Arrow keys move the tile. Perpendicular arrows preview a split; press Enter to commit or Escape to cancel.</span>
          <span role="status" className="sr-only" />
        </div>
      </div>
    </div>
  );
}

export function EpitaxyRouteFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex-1 min-h-0 relative flex flex-col overflow-x-clip overflow-y-auto">
      <div className="epitaxy-root select-none h-full w-full flex flex-col">
        <div className="flex-1 min-h-0">
          <EpitaxyTileLayout>{children}</EpitaxyTileLayout>
        </div>
      </div>
    </div>
  );
}

function TileBackdrop() {
  return <div className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated opacity-0 transition-opacity duration-200 [.tiles-dragging_&]:opacity-100" />;
}

export function EpitaxyLandingError({ onBack }: { onBack: () => void }) {
  return (
    <EpitaxyRouteFrame>
      <div className="h-full w-full min-w-0 relative isolate rounded-r6">
        <TileBackdrop />
        <div className="min-h-screen flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-md">
            <div className="text-danger-000 mb-6 text-lg font-medium">Something went wrong loading this session.</div>
            <button className={primaryButtonClass} type="button" onClick={onBack}>
              <span className="mr-2 inline-flex h-5 w-5 items-center justify-center" aria-hidden="true" />
              Back to landing page
            </button>
          </div>
        </div>
      </div>
    </EpitaxyRouteFrame>
  );
}

// Dead invent EpitaxySessionLoading / HeaderSkeleton / PromptBox skeleton removed 2026-08-16:
// never imported on live /code/:id (cold ring is OfficialConversationLoading in OfficialTranscript).
