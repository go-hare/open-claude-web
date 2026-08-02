import type { Editor } from "@tiptap/core";

/**
 * Official c119 residual: TipTap is source of truth while typing.
 * Parent only drives setContent via imperative setText / clear / external
 * draft restore — never re-apply a lagging controlled `value` over live doc.
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
  /**
   * How long after onUpdate a lagging parent value is treated as stale
   * (heal, don't wipe). Official has no continuous controlled setContent;
   * keep a generous window for packaged IPC/render lag.
   */
  lagMs?: number;
};

export function syncControlledTiptapValue({
  editor,
  value,
  emit,
  onChange,
  docFromPlainText,
  lagMs = 500,
}: SyncControlledTiptapValueArgs): ControlledTiptapEmitState {
  // Parent still mirrors last emit — do not fight the live document.
  if (value === emit.lastEmittedValue) {
    return emit;
  }

  const current = editor.getText({ blockSeparator: "\n" });
  if (current === value) {
    return { lastEmittedValue: value, lastEmitAt: emit.lastEmitAt };
  }

  const lagging =
    current === emit.lastEmittedValue
    && current !== value
    && (
      Date.now() - emit.lastEmitAt < lagMs
      || editor.isFocused
    );

  // Parent lag (empty or older prefix) while user already typed more.
  if (lagging) {
    onChange(current);
    return emit;
  }

  // True external change (reset, suggestion, setComposerText residual).
  editor.commands.setContent(docFromPlainText(value), { emitUpdate: false });
  return { lastEmittedValue: value, lastEmitAt: 0 };
}
