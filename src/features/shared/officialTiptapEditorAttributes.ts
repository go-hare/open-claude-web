/**
 * Official TipTap createView (`@tiptap/core` Editor.ts):
 *   attributes: { role: "textbox", ...editorProps?.attributes }
 *
 * Official Qj extraEditorAttributes (c11959232) / vTt (index-BELzQL5P):
 *   { enterkeyhint: "enter", "aria-label": formatMessage(Prompt) }
 *   — does NOT set role; relies on TipTap's createView default.
 *
 * Product `@tiptap/react` EditorContent.init() calls `editor.setOptions({ element })`.
 * TipTap `setOptions` then does `view.setProps(this.options.editorProps)` without
 * re-merging `role: "textbox"`. Live ProseMirror therefore loses the attribute.
 *
 * Official EYe (`index-BELzQL5P`) skips `closest("button, a, input, select, textarea, [role]")`.
 * Without role, in-text clicks fall through to focus("end") and snap the caret.
 *
 * Persist TipTap's own default in editorProps.attributes so setProps keeps the
 * official DOM contract. Same merge order as createView: role first, extras may override.
 */
export function officialTiptapEditorAttributes(
  extra: Record<string, string> = {},
): Record<string, string> {
  return {
    role: "textbox",
    ...extra,
  };
}
