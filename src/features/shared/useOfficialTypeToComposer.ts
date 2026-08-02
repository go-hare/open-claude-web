import { useEffect, useRef } from "react";

/**
 * Official residual: index-BELzQL5P.js `Ase`
 *
 * When focus is NOT on an input / contenteditable / textbox, and no dialog /
 * listbox / menu is open, a printable key is redirected into the composer
 * (insert + focus) instead of being swallowed by the focused control
 * (folder pill button, env pill, etc.).
 *
 * Official call sites:
 * - Code composer: `Ase(e => T.current?.getEditor()?.chain().insertContent(e).focus().run())`
 * - Plain textarea residual: append + rAF focus + setSelectionRange
 */
function isSpaceActivatable(el: Element | null): boolean {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "BUTTON" || tag === "SUMMARY" || tag === "SELECT") return true;
  if (tag === "INPUT") {
    const type = (el as HTMLInputElement).type;
    return ["button", "submit", "reset", "checkbox", "radio"].includes(type);
  }
  const role = el.getAttribute("role");
  return [
    "button",
    "checkbox",
    "radio",
    "switch",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
    "option",
  ].includes(role || "");
}

export function useOfficialTypeToComposer(
  onType: (key: string) => void,
  enabled = true,
): void {
  const onTypeRef = useRef(onType);
  onTypeRef.current = onType;

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const active = document.activeElement;
      const isTextField =
        active
        && (
          active.tagName === "INPUT"
          || active.tagName === "TEXTAREA"
          || active.getAttribute("contenteditable") === "true"
          || active.getAttribute("role") === "textbox"
        );
      if (isTextField) return;

      if (
        document.querySelector(
          '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-dialog-content]',
        )
      ) {
        return;
      }

      if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Official: space on activatable controls still activates them.
      if (event.key === " " && isSpaceActivatable(active)) {
        return;
      }

      event.preventDefault();
      onTypeRef.current(event.key);
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [enabled]);
}
