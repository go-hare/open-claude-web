import type { Editor } from "@tiptap/core";

/**
 * Official c119 residual: TipTap owns text while the user types.
 * Parent only drives setContent via imperative setText / clear / external
 * draft restore — never re-apply a lagging controlled `value` over the live doc.
 *
 * Packaged React 19 + app://: parent `value` can lag 1+ keystrokes behind
 * onUpdate. Re-applying that lag (e.g. value "4" while doc is "45") looks like
 * "first char works, cannot type further".
 */
export type ControlledTiptapEmitState = {
  lastEmittedValue: string;
  lastEmitAt: number;
};

export type SyncControlledTiptapValueArgs = {
  editor: Editor;
  value: string;
  emit: ControlledTiptapEmitState;
  /** Re-emit live text when parent lags behind typing. */
  onChange: (next: string) => void;
  /** Build TipTap JSON doc from plain text (product residual). */
  docFromPlainText: (value: string) => unknown;
};

function liveText(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" });
}

/**
 * Prefer the live ProseMirror doc. Heal parent when it lags.
 * Only setContent when the editor is unfocused (true external apply).
 */
export function syncControlledTiptapValue({
  editor,
  value,
  emit,
  onChange,
  docFromPlainText,
}: SyncControlledTiptapValueArgs): ControlledTiptapEmitState {
  const current = liveText(editor);

  // Live doc already matches parent.
  if (current === value) {
    return {
      lastEmittedValue: value,
      lastEmitAt: emit.lastEmitAt,
    };
  }

  // Official residual: while focused, editor is source of truth.
  // Never setContent over in-progress typing (including IME).
  if (editor.isFocused || editor.view?.hasFocus?.()) {
    if (current !== emit.lastEmittedValue) {
      onChange(current);
      return { lastEmittedValue: current, lastEmitAt: Date.now() };
    }
    // Parent lagged behind last emit (or empty wipe) — push live text up.
    onChange(current);
    return {
      lastEmittedValue: current,
      lastEmitAt: emit.lastEmitAt || Date.now(),
    };
  }

  // Parent still mirrors last emit but doc diverged while unfocused — rare.
  if (value === emit.lastEmittedValue) {
    return emit;
  }

  // Unfocused external change (reset / setComposerText residual).
  editor.commands.setContent(docFromPlainText(value), { emitUpdate: false });
  return { lastEmittedValue: value, lastEmitAt: 0 };
}
