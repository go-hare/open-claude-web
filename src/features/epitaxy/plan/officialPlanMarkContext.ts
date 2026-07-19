/**
 * Official qN: mark hover/click context for BN plan comment marks.
 * Split from OfficialPlanMarkdown so KN/Wk don't pull the full markdown pipeline.
 */
import { createContext } from "react";

export type OfficialPlanMarkContextValue = {
  hoveredId: string | null;
  onMarkClick: (id: string, el: HTMLElement) => void;
  onMarkHover: (id: string | null) => void;
};

export const OfficialPlanMarkContext = createContext<OfficialPlanMarkContextValue | null>(null);
