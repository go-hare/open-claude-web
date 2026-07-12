export type CoworkRewindPromptMode = "prefill" | "send";

export type CoworkSessionComposerActions = {
  prefillPrompt: (prompt: string) => void;
  sendPrompt: (prompt: string) => Promise<void>;
};

const actionsBySessionId = new Map<string, CoworkSessionComposerActions>();

export function registerCoworkSessionComposerActions(
  sessionId: string,
  actions: CoworkSessionComposerActions,
) {
  actionsBySessionId.set(sessionId, actions);
  return () => {
    if (actionsBySessionId.get(sessionId) === actions) actionsBySessionId.delete(sessionId);
  };
}

export function applyCoworkRewindPrompt(
  sessionId: string,
  prompt: string,
  mode: CoworkRewindPromptMode,
) {
  const actions = actionsBySessionId.get(sessionId);
  if (!actions) return mode === "send" ? Promise.resolve(false) : false;
  const normalizedPrompt = normalizeCoworkRewindPrompt(prompt);
  if (mode === "prefill") {
    actions.prefillPrompt(normalizedPrompt);
    return true;
  }
  return actions.sendPrompt(normalizedPrompt).then(() => true);
}

export function hasCoworkSessionComposerActions(sessionId: string) {
  return actionsBySessionId.has(sessionId);
}

export function normalizeCoworkRewindPrompt(prompt: string) {
  return prompt
    .replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "")
    .replace(/\s*<cu_window_hints>[\s\S]*?<\/cu_window_hints>/g, "")
    .replace(/\s*<widget_context_hint>[\s\S]*?<\/widget_context_hint>/g, "")
    .replace(/\s*<system-reminder>[\s\S]*?<\/system-reminder>\s*/g, "");
}
