import { useEffect } from "react";

type CoworkPermissionKeyboardOptions = {
  enabled: boolean;
  ignoreEditableTarget?: boolean;
  modifiedOnly?: boolean;
  onDeny: () => void;
  onEnter?: () => void;
  onModifiedEnter?: () => void;
};

export function useCoworkPermissionKeyboard(options: CoworkPermissionKeyboardOptions) {
  useEffect(() => {
    if (!options.enabled) return;
    const onKeyDown = (event: KeyboardEvent) => handlePermissionKey(event, options);
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [options]);
}

function handlePermissionKey(event: KeyboardEvent, options: CoworkPermissionKeyboardOptions) {
  if (event.defaultPrevented) return;
  if (options.ignoreEditableTarget && isEditableTarget(event.target)) return;
  const modified = event.metaKey || event.ctrlKey;
  if (options.modifiedOnly && !modified) return;
  if (event.key === "Escape" || modified && event.key === ".") {
    event.preventDefault();
    event.stopPropagation();
    options.onDeny();
    return;
  }
  if (event.key !== "Enter") return;
  const callback = modified ? options.onModifiedEnter ?? options.onEnter : options.onEnter;
  if (!callback) return;
  event.preventDefault();
  event.stopPropagation();
  callback();
}

function isEditableTarget(target: EventTarget | null) {
  return target instanceof HTMLTextAreaElement
    || target instanceof HTMLInputElement
    || target instanceof HTMLElement && target.isContentEditable;
}
