import type { EditorView } from "@tiptap/pm/view";

/**
 * Packaged / Chromium residual: on an empty ProseMirror doc the DOM is
 *   <p><br class="ProseMirror-trailingBreak"></p>
 * First insertText mutates to <p>a</p>, but domObserver.flush parses no-op and
 * reverts (~2ms). Programmatic insertContent and non-empty docs work.
 *
 * Handle empty-doc insertText/insertLineBreak/insertParagraph via transactions
 * so the first keystroke sticks. Leave composition / non-empty to PM.
 */
export function handleEmptyDocBeforeInput(view: EditorView, event: Event): boolean {
  if (!(event instanceof InputEvent)) return false;
  if (event.isComposing) return false;
  if (view.composing) return false;

  const docText = view.state.doc.textBetween(0, view.state.doc.content.size, "\n", "\n");
  if (docText.length > 0) return false;

  const { inputType, data } = event;
  if (inputType === "insertText" && typeof data === "string" && data.length > 0) {
    event.preventDefault();
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText(data, from, to).scrollIntoView());
    return true;
  }
  if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
    event.preventDefault();
    // Soft break not used in plain prompt; Enter submit is handled separately.
    // Still accept newline when Shift+Enter path reaches beforeinput.
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText("\n", from, to).scrollIntoView());
    return true;
  }
  return false;
}
