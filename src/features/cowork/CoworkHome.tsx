import { useEffect, useState } from "react";
import { desktopBridge, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { CoworkNewTaskPage } from "./newTask/CoworkNewTaskPage";

export function CoworkHome({ onNavigate }: RouteViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  useEffect(() => {
    let active = true;
    void desktopBridge.Preferences.getWorkspaceContext().then((value) => { if (active) setWorkspace(value); });
    return () => { active = false; };
  }, []);
  if (!workspace) return <CoworkHomeLoading />;
  return <CoworkNewTaskPage onNavigate={onNavigate} workspace={workspace} />;
}

function CoworkHomeLoading() {
  return (
    <div className="epitaxy-root flex h-full items-center justify-center text-t5" role="status">
      <span aria-hidden="true" className="relative inline-block size-5 shrink-0 align-middle">
        <span className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--t2)" }} />
        <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, var(--spinner-arc, var(--t6)))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), rgb(0, 0, 0) calc(100% - 1.5px))" }} />
      </span>
      <span className="sr-only">Loading Cowork</span>
    </div>
  );
}
