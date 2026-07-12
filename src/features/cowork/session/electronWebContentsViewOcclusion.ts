import { useEffect, useSyncExternalStore } from "react";

export const ELECTRON_WCV_OCCLUSION_SELECTOR =
  '[role="dialog"], [role="alertdialog"], [role="menu"], [role="listbox"], [data-occludes-electron-wcv]';

let occlusionCount = 0;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function occludeElectronWebContentsView(): () => void {
  let released = false;
  occlusionCount += 1;
  emit();
  return () => {
    if (released) return;
    released = true;
    occlusionCount = Math.max(0, occlusionCount - 1);
    emit();
  };
}

export function electronWebContentsViewOcclusionCount(): number {
  return occlusionCount;
}

export function observeElectronWebContentsViewOcclusion(body: HTMLElement): () => void {
  const initialChildren = new Set(Array.from(body.children));
  const occludingChildren = new Map<Element, () => void>();
  const isOccluding = (element: Element) =>
    !initialChildren.has(element) &&
    (element.matches(ELECTRON_WCV_OCCLUSION_SELECTOR) ||
      Boolean(element.querySelector(ELECTRON_WCV_OCCLUSION_SELECTOR)));
  const update = () => {
    const current = new Set(Array.from(body.children).filter(isOccluding));
    for (const element of current) {
      if (!occludingChildren.has(element)) {
        occludingChildren.set(element, occludeElectronWebContentsView());
      }
    }
    for (const [element, release] of occludingChildren) {
      if (!current.has(element)) {
        release();
        occludingChildren.delete(element);
      }
    }
  };
  const observer = new MutationObserver(update);
  observer.observe(body, { childList: true });
  return () => {
    observer.disconnect();
    for (const release of occludingChildren.values()) release();
    occludingChildren.clear();
  };
}

export function useElectronWebContentsViewOccluded(): boolean {
  useEffect(() => {
    if (typeof document === "undefined" || !document.body) return;
    return observeElectronWebContentsViewOcclusion(document.body);
  }, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => occlusionCount > 0,
    () => false,
  );
}
