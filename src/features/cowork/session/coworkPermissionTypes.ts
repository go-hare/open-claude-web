/**
 * Official tool annotations residual used by getToolApprovalState:
 *   coworkWriteToolWarning = mode === "cowork" && annotations.readOnlyHint !== true
 */
export type CoworkToolAnnotations = {
  destructiveHint?: boolean;
  readOnlyHint?: boolean;
};

export type CoworkPermissionRequest = {
  alwaysAllowScope?: string;
  /** Official tool annotations (readOnlyHint / destructiveHint). */
  annotations?: CoworkToolAnnotations;
  description?: string;
  hasAlwaysAllow?: boolean;
  input: Record<string, unknown>;
  /** Convenience residual when host flattens annotations.readOnlyHint. */
  readOnlyHint?: boolean;
  requestId: string;
  sessionId: string;
  suggestions?: unknown;
  toolName: string;
  toolUseId?: string;
};

export type CoworkPermissionDecision = "always" | "deny" | "once";
