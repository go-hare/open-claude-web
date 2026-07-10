export type CoworkPermissionRequest = {
  alwaysAllowScope?: string;
  description?: string;
  hasAlwaysAllow?: boolean;
  input: Record<string, unknown>;
  requestId: string;
  sessionId: string;
  toolName: string;
  toolUseId?: string;
};

export type CoworkPermissionDecision = "always" | "deny" | "once";
