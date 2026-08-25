/**
 * Official residual index-BELzQL5P `EYe` — clickToFocusProps.
 *
 * Official:
 *   function EYe(e) {
 *     return {
 *       clickToFocusProps: {
 *         onClick: n.useCallback(t => {
 *           const s = t.target;
 *           const n = t.currentTarget;
 *           if (!n.contains(s)) return;
 *           const a = s.closest("button, a, input, select, textarea, [role]");
 *           if (!a || a === n || !n.contains(a)) e();
 *         }, [e])
 *       }
 *     };
 *   }
 *
 * ChatInput: EYe(focusInput) where focusInput = promptInputRef.current?.focus()
 * (aYt / Qj Pe = commands.focus("end")).
 * TipTap ProseMirror is role="textbox", so clicking editor text skips the callback.
 * Padding / empty chrome around the editor still focuses end (official).
 *
 * Product must persist role in editorProps.attributes (`officialTiptapEditorAttributes`):
 * `@tiptap/react` EditorContent.init → setOptions → view.setProps(editorProps)
 * drops createView's `{ role: "textbox", ...attributes }` merge.
 *
 * Code Qj wrapper has onPaste only — no onClick. Do not attach this helper there.
 */

export const OFFICIAL_CLICK_TO_FOCUS_SKIP_SELECTOR =
  "button, a, input, select, textarea, [role]";

type ClickElement = {
  closest: (selector: string) => ClickElement | null;
  contains: (other: ClickElement | null) => boolean;
  parentElement?: ClickElement | null;
};

function asClickElement(value: EventTarget | null): ClickElement | null {
  if (!value || typeof value !== "object") return null;
  const node = value as ClickElement;
  if (typeof node.closest === "function" && typeof node.contains === "function") {
    return node;
  }
  const parent = (value as { parentElement?: ClickElement | null }).parentElement ?? null;
  if (parent && typeof parent.closest === "function" && typeof parent.contains === "function") {
    return parent;
  }
  return null;
}

export function shouldOfficialClickToFocus(event: {
  currentTarget: EventTarget | null;
  target: EventTarget | null;
}): boolean {
  const currentTarget = asClickElement(event.currentTarget);
  const origin = asClickElement(event.target);
  if (!currentTarget || !origin || !currentTarget.contains(origin)) return false;
  const interactive = origin.closest(OFFICIAL_CLICK_TO_FOCUS_SKIP_SELECTOR);
  return !interactive || interactive === currentTarget || !currentTarget.contains(interactive);
}
