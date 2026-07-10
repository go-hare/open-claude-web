import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type CoworkTimelineStatusVisibilityValue = {
  isVisible: boolean;
  setIsVisible: (visible: boolean) => void;
};

const CoworkTimelineStatusVisibilityContext = createContext<CoworkTimelineStatusVisibilityValue | null>(null);

export function CoworkTimelineStatusVisibilityProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false);
  const value = useMemo(() => ({ isVisible, setIsVisible }), [isVisible]);
  return <CoworkTimelineStatusVisibilityContext.Provider value={value}>{children}</CoworkTimelineStatusVisibilityContext.Provider>;
}

export function useCoworkTimelineStatusVisibility() {
  const context = useContext(CoworkTimelineStatusVisibilityContext);
  if (!context) throw new Error("useCoworkTimelineStatusVisibility must be used within CoworkTimelineStatusVisibilityProvider");
  return context;
}
