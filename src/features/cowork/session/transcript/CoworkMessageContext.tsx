import { createContext, useContext, type ReactNode } from "react";
import type { CoworkPermissionDecision, CoworkPermissionRequest } from "../coworkPermissionTypes";
import type { CoworkChatMessage, CoworkContentBlock } from "./coworkMessageTypes";

/**
 * Official c2e/l2e ChatMessageContext residual subset:
 * - toolPermissionRequests / onToolDecision
 * - optional renderToolUseCell inject (O5e → tct)
 *
 * Full official also has mcqAnswers; product keeps that outside this bag.
 */
export type CoworkRenderToolUseCellProps = {
  block: CoworkContentBlock;
  isFirstBlockOfMessage?: boolean;
  isFirstItem: boolean;
  isLastBlockOfMessage?: boolean;
  isLastItem: boolean;
  isStreaming: boolean;
  message: CoworkChatMessage;
  /** Content/rich path vs timeline (product dual path residual of O5e vs gst). */
  standalone?: boolean;
  toolResult?: CoworkContentBlock;
  /** Normalized tool name (product ahe-like). */
  normalizedName: string;
};

export type CoworkRenderToolUseCell = (props: CoworkRenderToolUseCellProps) => ReactNode;

type CoworkMessageContextValue = {
  onRetry?: () => Promise<void> | void;
  onToolDecision?: (
    requestId: string,
    toolUseId: string,
    input: Record<string, unknown>,
    decision: CoworkPermissionDecision,
  ) => void;
  /**
   * Official renderToolUseCell inject (tct). When omitted, O5e shell uses residual default table.
   */
  renderToolUseCell?: CoworkRenderToolUseCell;
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

/**
 * Official O5e permission-null residual:
 * pending toolUseId AND toolName does NOT include AskUserQuestion → hide tool cell.
 * AskUserQuestion stays visible so the widget can render while permission chrome is separate.
 */
export function hasPendingCoworkToolPermission(requests: CoworkPermissionRequest[], toolUseId?: string) {
  if (!toolUseId) return false;
  return requests.some((request) => request.toolUseId === toolUseId && !request.toolName.includes("AskUserQuestion"));
}
