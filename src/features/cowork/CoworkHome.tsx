import { useEffect, useState } from "react";
import { desktopBridge, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { CoworkNewTaskPage } from "./newTask/CoworkNewTaskPage";

/**
 * Official residual (index-BELzQL5P.js):
 *   path:"task/new" → Zb()? null : S6t
 *   Zb = account isLoading || onboarding gate
 *   _6t (inside S6t path): "loading"===e.kind || void 0===h → null
 *
 * Product must NOT invent a full-page dual-ring spinner (CoworkHomeLoading /
 * OfficialSpinner conic) while getWorkspaceContext resolves — that painted the
 * cold-start gray ring on #fdfdfc. Match residual: paint nothing until ready.
 */
export function CoworkHome({ onNavigate }: RouteViewProps) {
  const [workspace, setWorkspace] = useState<WorkspaceContext | null>(null);
  useEffect(() => {
    let active = true;
    void desktopBridge.Preferences.getWorkspaceContext().then((value) => {
      if (active) setWorkspace(value);
    });
    return () => {
      active = false;
    };
  }, []);
  // Residual Zb / _6t loading: null (empty content), not invent spinner logo.
  if (!workspace) return null;
  return <CoworkNewTaskPage onNavigate={onNavigate} workspace={workspace} />;
}
