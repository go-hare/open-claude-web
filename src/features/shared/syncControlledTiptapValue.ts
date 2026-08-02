import type { Editor } from "@tiptap/core";

/**
 * Official residual (index-BELzQL5P.js `vTt` + aYt CodeTipTapEditor + c119 Ye):
 *
 *   onUpdate → k.current = true  (user has edited)
 *   hydrate setContent only while !k.current && empty editor
 *   setText / clear are imperative — NOT continuous parent value→setContent
 *
 * Product: parent `value` is a submit/placeholder mirror. After the user types
 * once, the only parent-driven doc mutation is clear (value → "").
 *
 * Non-empty parent while userEdited is ignored (never wipe "ab" with lagging "a").
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
    return emit;
  }

  // Not yet user-edited: external hydrate / setComposerText / draft restore.
  if (value === "") {
    if (emit.lastEmittedValue !== "") {
      editor.commands.clearContent(false);
    }
    return { lastEmittedValue: "", userEdited: false };
  }

  const current = editor.getText({ blockSeparator: "\n" });
  if (current === value) {
    return { lastEmittedValue: value, userEdited: false };
  }

  // Official vTt: only hydrate into an empty editor before first user edit.
  if (!editor.isEmpty && current.length > 0) {
    return emit;
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
