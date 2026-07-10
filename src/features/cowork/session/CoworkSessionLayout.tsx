import type { CSSProperties, ReactNode } from "react";

const tileVars = { "--tile-container-border": "transparent", "--tile-container-bg": "transparent" } as CSSProperties;

export function CoworkSessionLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative h-full w-full" style={tileVars}>
      <div className="flex h-full w-full overflow-clip"><div className="relative flex h-full w-full flex-col items-stretch pb-2"><div className="relative flex min-h-0 min-w-0 flex-1"><div className="tiles-shell relative h-full min-h-0 min-w-0 flex-1" style={{ transform: "translateZ(1px)", zIndex: 1 }}>{children}</div></div></div></div>
    </div>
  );
}
