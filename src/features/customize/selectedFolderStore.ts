/**
 * Official vK selectedFolder store (index-BELzQL5P ~30705).
 * E7t Code/epitaxy customize sidebar reads selectedFolder for V6t FolderPill.
 * Minimal local subset: selectedFolder + setSelectedFolder (no multi-host map yet).
 */

const STORAGE_KEY = "hare-customize-selected-folder";

type Listener = () => void;

let selectedFolder: string | null = readStored();
const listeners = new Set<Listener>();

function readStored(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value && value.length > 0 ? value : null;
  } catch {
    return null;
  }
}

function writeStored(path: string | null) {
  if (typeof window === "undefined") return;
  try {
    if (path) window.localStorage.setItem(STORAGE_KEY, path);
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore quota */
  }
}

function emit() {
  for (const listener of listeners) listener();
}

export function getSelectedFolder(): string | null {
  return selectedFolder;
}

export function setSelectedFolder(path: string | null) {
  selectedFolder = path;
  writeStored(path);
  emit();
}

export function subscribeSelectedFolder(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
