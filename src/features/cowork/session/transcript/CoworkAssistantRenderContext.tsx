import { createContext, useContext, type ReactNode } from "react";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";

export type CoworkAssistantRenderContextValue = {
  blocks: CoworkContentBlock[];
  isStreaming: boolean;
  isThisMessageStreaming: boolean;
  message: CoworkChatMessage;
};

const CoworkAssistantRenderContext = createContext<CoworkAssistantRenderContextValue | null>(null);

export function CoworkAssistantRenderProvider({ children, value }: { children: ReactNode; value: CoworkAssistantRenderContextValue }) {
  return <CoworkAssistantRenderContext.Provider value={value}>{children}</CoworkAssistantRenderContext.Provider>;
}

export function useCoworkAssistantRenderContext() {
  const context = useContext(CoworkAssistantRenderContext);
  if (!context) throw new Error("useCoworkAssistantRenderContext must be used within CoworkAssistantRenderProvider");
  return context;
}
