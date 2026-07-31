import { COWORK_FEEDBACK_URL } from "../../newTask/coworkNewTaskMessages";

/**
 * Official index-BELzQL5P xT residual:
 * xT = globalThis["claude.web"]?.AgentModeFeedback
 * openFeedbackWindow({ url: NAt, source, prefillErrorText?, meta? })
 * Fallback window.open(NAt) when bridge absent (header residual).
 */
export type AgentModeFeedbackBridge = {
  openFeedbackWindow?: (payload: {
    meta?: Record<string, unknown>;
    prefillErrorText?: string;
    source: string;
    url: string;
  }) => Promise<unknown> | unknown;
};

export function getAgentModeFeedbackBridge(): AgentModeFeedbackBridge | undefined {
  return (window["claude.web"] as { AgentModeFeedback?: AgentModeFeedbackBridge } | undefined)
    ?.AgentModeFeedback;
}

export function canOpenCoworkAgentFeedback(): boolean {
  return Boolean(getAgentModeFeedbackBridge()?.openFeedbackWindow);
}

export function openCoworkAgentFeedback(options?: {
  errorMessage?: string;
  hostLoopMode?: boolean | null;
  meta?: Record<string, unknown>;
  sessionId?: string | null;
  source: string;
}): void {
  const bridge = getAgentModeFeedbackBridge();
  const url = COWORK_FEEDBACK_URL;
  if (bridge?.openFeedbackWindow) {
    void bridge.openFeedbackWindow({
      url,
      source: options?.source ?? "claude_chat",
      prefillErrorText: options?.errorMessage,
      meta: {
        ...options?.meta,
        ...(options?.errorMessage || options?.sessionId || options?.hostLoopMode != null
          ? {
              errorBanner: {
                errorMessage: options?.errorMessage,
                sessionId: options?.sessionId ?? undefined,
                hostLoopMode: options?.hostLoopMode ?? undefined,
                timestamp: new Date().toISOString(),
              },
            }
          : {}),
      },
    });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
