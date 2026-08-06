import { useEffect, useRef } from "react";

/**
 * Official residual: index-BELzQL5P.js `Ase`
 *
 * When focus is NOT on an input / contenteditable / textbox, and no dialog /
 * listbox / menu is open, a printable Latin key is redirected into the composer
 * (insert + focus) instead of being swallowed by the focused control
 * (folder pill button, env pill, etc.).
 *
 * Official call sites:
 * - Code composer: `Ase(e => T.current?.getEditor()?.chain().insertContent(e).focus().run())`
 * - Plain textarea residual: append + rAF focus + setSelectionRange
 *
 * IME (中文等) host note:
 * Ase must NOT preventDefault pinyin / Process / keyCode 229 keys. Official
 * expects the Prompt contenteditable to already hold focus so composition
 * starts on the editor. Stealing bare keys with preventDefault kills IME.
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

function isTextField(active: Element | null): boolean {
  return Boolean(
    active
    && (
      active.tagName === "INPUT"
      || active.tagName === "TEXTAREA"
      || active.getAttribute("contenteditable") === "true"
      || active.getAttribute("role") === "textbox"
    ),
  );
}

function hasBlockingOverlay(): boolean {
  return Boolean(
    document.querySelector(
      '[role="dialog"], [role="listbox"], [role="menu"], [data-radix-dialog-content]',
    ),
  );
}

/** IME / dead-key / Process key — never Ase-steal (would cancel composition). */
function isImeOrProcessKey(event: KeyboardEvent): boolean {
  if (event.isComposing) return true;
  // Chrome / Electron: keyCode 229 while IME is active or starting.
  if (event.keyCode === 229 || event.which === 229) return true;
  if (event.key === "Process" || event.key === "Unidentified") return true;
  return false;
}

function focusPromptEditorDom(): void {
  const prompt = document.querySelector<HTMLElement>('[aria-label="Prompt"]');
  if (!prompt || !prompt.isContentEditable) return;
  try {
    prompt.focus({ preventScroll: true });
  } catch {
    prompt.focus();
  }
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
      if (isTextField(active)) return;
      if (hasBlockingOverlay()) return;

      // IME: move focus to Prompt without consuming the event when possible.
      // Never preventDefault — that cancels pinyin composition start.
      if (isImeOrProcessKey(event)) {
        focusPromptEditorDom();
        return;
      }

      if (event.key.length !== 1 || event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }

      // Official: space on activatable controls still activates them.
      if (event.key === " " && isSpaceActivatable(active)) {
        return;
      }

      // Latin / single-codepoint only (official Ase). CJK characters already
      // composed elsewhere should not reach here as key.length===1 often, but
      // if they do, insertContent is fine; do not treat as IME start.
      event.preventDefault();
      onTypeRef.current(event.key);
    };

    // Capture phase so chrome pills don't swallow before Ase (host desktop).
    // Official attaches on document; product uses capture for Base UI pills.
    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
    };
  }, [enabled]);
}
