import { createContext, useContext, type ReactNode } from "react";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../coworkPermissionTypes";

type CoworkMessageContextValue = {
  onRetry?: () => Promise<void> | void;
  onToolDecision?: (
    requestId: string,
    toolUseId: string,
    input: Record<string, unknown>,
    decision: CoworkPermissionDecision,
  ) => void;
  toolPermissionRequests: CoworkPermissionRequest[];
};

const CoworkMessageContext = createContext<CoworkMessageContextValue | null>(null);

export function CoworkMessageContextProvider({ children, value }: {
  children: ReactNode;
  value: CoworkMessageContextValue;
}) {
  return <CoworkMessageContext.Provider value={value}>{children}</CoworkMessageContext.Provider>;
}

export function useCoworkMessageContext() {
  const context = useContext(CoworkMessageContext);
  if (!context) throw new Error("useCoworkMessageContext must be used within CoworkMessageContextProvider");
  return context;
}

export function hasPendingCoworkToolPermission(requests: CoworkPermissionRequest[], toolUseId?: string) {
  if (!toolUseId) return false;
  return requests.some((request) => request.toolUseId === toolUseId && !request.toolName.includes("AskUserQuestion"));
}
