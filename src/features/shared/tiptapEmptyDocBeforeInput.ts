import type { EditorView } from "@tiptap/pm/view";

/**
 * Packaged Chromium + TipTap (Code / Cowork prompt composers).
 *
 * Official residual (c119 Qj / index aYt / vTt) does not ship an app-layer
 * empty-doc beforeinput invent — TipTap/PM owns input. On product packaged
 * app:// Chromium, empty docs render as:
 *   <p><br class="ProseMirror-trailingBreak"></p>
 * and native insertText / delete can stick only via a transaction (DOMObserver
 * otherwise reverts ab→a or refuses Backspace). Proven by packaged CDP
 * (d5f261d / 537c015) + 2026-08-06 delete regression.
 *
 * Host Chromium adaptation only — not a UI residual fork.
 *
 * IME (中文等):
 * - NEVER intercept composition inputTypes / event.isComposing (PM + browser).
 * - If PM `view.composing` is stuck true after an aborted composition, clear
 *   the flag so the next non-composing insert/delete can be transaction-owned.
 *
 * Delete: only preventDefault when a transaction actually applies. Blocking
 * native delete without a successful tr leaves the doc stuck (CDP: def=true,
 * text unchanged when joinBackward path no-ops).
 */
type ProseMirrorInputState = {
  composing?: boolean;
  compositionNode?: unknown;
  composingTimeout?: ReturnType<typeof setTimeout> | null;
  compositionEndedAt?: number;
  compositionPendingChanges?: number;
};

function forceEndStuckComposition(view: EditorView): void {
  const input = (view as unknown as { input?: ProseMirrorInputState }).input;
  if (!input) return;
  if (input.composingTimeout) {
    clearTimeout(input.composingTimeout);
    input.composingTimeout = null;
  }
  input.composing = false;
  input.compositionNode = null;
  input.compositionEndedAt = Date.now();
  input.compositionPendingChanges = 0;
}

/** Delete current selection, or one position unit in `direction` when empty. */
function deleteSelectionOrUnit(view: EditorView, direction: "backward" | "forward"): boolean {
  const { state } = view;
  const { from, to, empty, $from } = state.selection;

  if (!empty) {
    view.dispatch(state.tr.delete(from, to).scrollIntoView());
    return true;
  }

  if (direction === "backward") {
    // At start of doc / block: nothing to delete.
    if (from <= 1) return false;
    // Prefer text offset inside parent (handles marks / code points via PM mapping).
    if ($from.parentOffset > 0) {
      view.dispatch(state.tr.delete(from - 1, from).scrollIntoView());
      return true;
    }
    // At start of non-first block: join with previous by deleting the gap.
    if (from > 1) {
      view.dispatch(state.tr.delete(from - 1, from).scrollIntoView());
      return true;
    }
    return false;
  }

  // forward
  const max = state.doc.content.size;
  if (to >= max - 1) return false;
  view.dispatch(state.tr.delete(to, to + 1).scrollIntoView());
  return true;
}

/**
 * Word/line delete: use InputEvent targetRanges when Chromium provides them,
 * else fall back to single-unit delete.
 */
function deleteByInputType(
  view: EditorView,
  event: InputEvent,
  direction: "backward" | "forward",
): boolean {
  const { state } = view;
  if (!state.selection.empty) {
    view.dispatch(state.tr.delete(state.selection.from, state.selection.to).scrollIntoView());
    return true;
  }

  try {
    const ranges = typeof event.getTargetRanges === "function" ? event.getTargetRanges() : [];
    if (ranges.length > 0) {
      const range = ranges[0]!;
      const from = view.posAtDOM(range.startContainer, range.startOffset);
      const to = view.posAtDOM(range.endContainer, range.endOffset);
      if (typeof from === "number" && typeof to === "number" && from !== to) {
        const a = Math.min(from, to);
        const b = Math.max(from, to);
        // Guard against invalid positions (trailingBreak / outside doc).
        if (a >= 0 && b <= state.doc.content.size && a < b) {
          view.dispatch(state.tr.delete(a, b).scrollIntoView());
          return true;
        }
      }
    }
  } catch {
    // posAtDOM can throw on trailingBreak; fall through.
  }

  return deleteSelectionOrUnit(view, direction);
}

export function handleEmptyDocBeforeInput(view: EditorView, event: Event): boolean {
  if (!(event instanceof InputEvent)) return false;

  const { inputType, data } = event;

  // Active browser composition — leave entirely to PM/browser.
  if (event.isComposing) return false;
  if (typeof inputType === "string" && /composition/i.test(inputType)) {
    return false;
  }

  // Stuck PM composing flag (compositionend never landed) would mute insert/delete.
  if (view.composing) {
    forceEndStuckComposition(view);
  }

  if (inputType === "insertText" && typeof data === "string" && data.length > 0) {
    event.preventDefault();
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText(data, from, to).scrollIntoView());
    return true;
  }

  if (inputType === "insertLineBreak" || inputType === "insertParagraph") {
    event.preventDefault();
    const { from, to } = view.state.selection;
    view.dispatch(view.state.tr.insertText("\n", from, to).scrollIntoView());
    return true;
  }

  // Delete family — same DOMObserver-revert class as insertText on packaged app://.
  // Only preventDefault when the transaction applies (never block native with a no-op).
  if (inputType === "deleteContentBackward" || inputType === "deleteContent") {
    if (!deleteSelectionOrUnit(view, "backward")) return false;
    event.preventDefault();
    return true;
  }
  if (inputType === "deleteContentForward") {
    if (!deleteSelectionOrUnit(view, "forward")) return false;
    event.preventDefault();
    return true;
  }
  if (
    inputType === "deleteWordBackward"
    || inputType === "deleteSoftLineBackward"
    || inputType === "deleteHardLineBackward"
    || inputType === "deleteEntireSoftLine"
  ) {
    if (!deleteByInputType(view, event, "backward")) return false;
    event.preventDefault();
    return true;
  }
  if (
    inputType === "deleteWordForward"
    || inputType === "deleteSoftLineForward"
    || inputType === "deleteHardLineForward"
  ) {
    if (!deleteByInputType(view, event, "forward")) return false;
    event.preventDefault();
    return true;
  }
  if (inputType === "deleteByCut") {
    if (view.state.selection.empty) return false;
    view.dispatch(
      view.state.tr.delete(view.state.selection.from, view.state.selection.to).scrollIntoView(),
    );
    event.preventDefault();
    return true;
  }

  return false;
}
