import type { EditorView } from "@tiptap/pm/view";

/**
 * Packaged Chromium + TipTap residual (Code / Cowork prompt composers).
 *
 * Empty ProseMirror docs render as:
 *   <p><br class="ProseMirror-trailingBreak"></p>
 * The first native insertText can stick only via a transaction; pure DOM+DOMObserver
 * often no-ops and reverts (~2ms).
 *
 * After that first transaction, subsequent *native* insertText can still mutate the
 * DOM to "ab" and then DOMObserver flushes back to PM state "a" (CDP: input event
 * shows "ab", next mutation "a"). That matches user "first char works, cannot type".
 *
 * Fix: for non-composition insertText / soft-break, always preventDefault and apply
 * via PM transaction so the view owns both state and DOM (same path as empty-doc).
 * Composition (IME) is left to the browser + PM.
 */
export function handleEmptyDocBeforeInput(view: EditorView, event: Event): boolean {
  if (!(event instanceof InputEvent)) return false;
  if (event.isComposing) return false;
  if (view.composing) return false;

  const { inputType, data } = event;

  if (inputType === "insertText" && typeof data === "string" && data.length > 0) {
    event.preventDefault();
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText(data, from, to).scrollIntoView());
    return true;
  }

  if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
    // Soft break / newline when Shift+Enter reaches beforeinput (Enter submit is
    // handled separately in capture). Always transaction-owned.
    event.preventDefault();
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText("\n", from, to).scrollIntoView());
    return true;
  }

  return false;
}
