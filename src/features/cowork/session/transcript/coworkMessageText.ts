const removableTags = [
  "system-reminder", "task-notification", "slack_context", "uploaded_files", "available-deferred-tools",
  "new-diagnostics", "critical_user_preferences_reminder", "persisted-output", "local-command-caveat", "tick",
  "goal", "mcp-resource", "mcp-resource-update", "mcp-polling-update", "teammate-message", "channel-message",
  "launch-selected-element", "connected_office_files", "thinking", "ide_opened_file", "ide_selection",
  "ide_diagnostics", "browser_instruction", "cell", "cell_type", "language", "command-message", "command-args",
  "no-action-needed", "comprehensive-mode-instructions", "cu_window_hints", "widget_context_hint",
  "preview-annotation-context",
].sort((left, right) => right.length - left.length);

const taggedContentPattern = new RegExp(`<(${removableTags.join("|")})[^>]*>[\\s\\S]*?</\\1>\\s*`, "g");
const fullTranscriptPattern = /Full transcript available at:.*$/gm;
const outputFilePattern = /^\s*Read the output file to retrieve the result:.*$/gm;

export function officialCoworkMessageText(value: string) {
  taggedContentPattern.lastIndex = 0;
  let text = value.replace(/<\/?tool_use_error>/g, "").replace(taggedContentPattern, "");
  if (text !== value) {
    fullTranscriptPattern.lastIndex = 0;
    text = text.replace(fullTranscriptPattern, "");
  }
  outputFilePattern.lastIndex = 0;
  return text.replace(outputFilePattern, "").trim();
}
