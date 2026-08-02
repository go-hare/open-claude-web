import type { Editor } from "@tiptap/core";

/**
 * Official residual (index-BELzQL5P.js `vTt` + aYt CodeTipTapEditor):
 *
 *   onUpdate → k.current = true  (user has edited)
 *   useEffect hydrate:
 *     if (!editor || destroyed || !isEmpty || !hasHydrated || k.current) return
 *     only then setContent(parent)
 *
 * Parent state is a mirror of the editor (submit / placeholder), NOT a continuous
 * controlled setContent source. After the user types once, the only parent-driven
 * doc mutation is clear (value → "").
 *
 * Product bug this prevents: React 19 + app:// lag where parent `value` is still
 * "4" while the live doc is "45" — re-applying setContent("4") looks like
 * "first char works, cannot type further".
 */
export type ControlledTiptapEmitState = {
  lastEmittedValue: string;
  /** Official vTt `k.current` — true after first onUpdate from user typing. */
  userEdited: boolean;
};

export type SyncControlledTiptapValueArgs = {
  editor: Editor;
  value: string;
  emit: ControlledTiptapEmitState;
  /** Build TipTap JSON doc from plain text (product residual). */
  docFromPlainText: (value: string) => unknown;
};

function liveText(editor: Editor): string {
  return editor.getText({ blockSeparator: "\n" });
}

/**
 * Apply parent `value` only when residual-safe:
 * - clear when value === ""
 * - hydrate / external setText only before userEdited
 * - never setContent over live typing
 */
export function syncControlledTiptapValue({
  editor,
  value,
  emit,
  docFromPlainText,
}: SyncControlledTiptapValueArgs): ControlledTiptapEmitState {
  if (value === emit.lastEmittedValue) {
    return emit;
  }

  // Official k.current: after user typed, only honor clear.
  if (emit.userEdited) {
    if (value === "") {
      editor.commands.clearContent(false);
      return { lastEmittedValue: "", userEdited: false };
    }
    // Parent lag / non-clear external while typing — keep live doc.
    return emit;
  }

  // Not yet user-edited: external hydrate / setComposerText / draft restore.
  if (value === "") {
    editor.commands.clearContent(false);
    return { lastEmittedValue: "", userEdited: false };
  }

  const current = liveText(editor);
  if (current === value) {
    return { lastEmittedValue: value, userEdited: false };
  }

  editor.commands.setContent(docFromPlainText(value), { emitUpdate: false });
  return { lastEmittedValue: value, userEdited: false };
}

/** Mark emit state after TipTap onUpdate (official k.current = true). */
export function markControlledTiptapUserEdit(
  text: string,
): ControlledTiptapEmitState {
  return { lastEmittedValue: text, userEdited: true };
}
