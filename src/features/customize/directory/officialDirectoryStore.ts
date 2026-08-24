/**
 * Official HT directory overlay store (index-BELzQL5P.js).
 *
 * `$T`: skills | connectors → plugins in this ion-dist (PT/EI compiled out).
 * `open` / `openItem` / `navigate` / `close` match HT action shapes.
 */
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";
import type { DirectoryPluginSeed } from "./pluginMarketplace";

export const DIRECTORY_SECTIONS = ["skills", "connectors", "plugins"] as const;
export type DirectorySection = (typeof DIRECTORY_SECTIONS)[number];

/** Official qT / BT. */
export function isDirectorySection(value: string | null | undefined): value is DirectorySection {
  return value != null && (DIRECTORY_SECTIONS as readonly string[]).includes(value);
}

/** Official $T. */
export function remapDirectorySection(section: string | undefined): DirectorySection {
  if (section === "skills" || section === "connectors") return "plugins";
  if (isDirectorySection(section)) return section;
  return "plugins";
}

/** Official WT. */
export function isDirectoryPath(pathname: string): boolean {
  return pathname === "/directory" || pathname.startsWith("/directory/");
}

/** Official GT. */
export function directoryPathFor(section: DirectorySection, itemId?: string | null): string {
  return itemId ? `/directory/${section}/${encodeURIComponent(itemId)}` : `/directory/${section}`;
}

/** Official VT — walk out of nested menus to the labelled trigger. */
function captureTriggerElement(): HTMLElement | null {
  if (typeof document === "undefined") return null;
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return null;
  let element: HTMLElement = active;
  let menu = element.closest('[role="menu"]');
  while (menu) {
    const labelledBy = menu.getAttribute("aria-labelledby");
    const trigger = labelledBy ? document.getElementById(labelledBy) : null;
    if (!trigger) break;
    element = trigger;
    const parentMenu = trigger.closest('[role="menu"]');
    if (parentMenu === menu) break;
    menu = parentMenu;
  }
  return element;
}

export type DirectoryOpenOptions = {
  connectorAdminMode?: unknown | null;
  connectorTypeFilter?: unknown | null;
  pluginSeed?: DirectoryPluginSeed | null;
};

type OfficialDirectoryState = {
  close: () => void;
  connectorAdminMode: unknown | null;
  connectorTypeFilter: unknown | null;
  isOpen: boolean;
  itemId: string | null;
  navigate: (section: string, itemId: string | null) => void;
  open: (section?: string, opts?: DirectoryOpenOptions) => void;
  openCount: number;
  openItem: (section: string, itemId: string | null, opts?: DirectoryOpenOptions) => void;
  pluginSeed: DirectoryPluginSeed | null;
  section: DirectorySection;
  triggerElement: HTMLElement | null;
};

export const officialDirectoryStore = createStore<OfficialDirectoryState>((set) => ({
  isOpen: false,
  section: "plugins",
  itemId: null,
  pluginSeed: null,
  connectorAdminMode: null,
  connectorTypeFilter: null,
  openCount: 0,
  triggerElement: null,
  open: (section = "plugins", opts) =>
    set((state) => ({
      isOpen: true,
      section: remapDirectorySection(section),
      itemId: null,
      pluginSeed: opts?.pluginSeed ?? null,
      connectorAdminMode: opts?.connectorAdminMode ?? null,
      connectorTypeFilter: opts?.connectorTypeFilter ?? null,
      openCount: state.openCount + 1,
      triggerElement: captureTriggerElement(),
    })),
  openItem: (section, itemId, opts) =>
    set((state) => ({
      isOpen: true,
      section: remapDirectorySection(section),
      itemId,
      pluginSeed: null,
      connectorAdminMode: opts?.connectorAdminMode ?? null,
      connectorTypeFilter: null,
      openCount: state.openCount + 1,
      triggerElement: captureTriggerElement(),
    })),
  navigate: (section, itemId) =>
    set({
      section: remapDirectorySection(section),
      itemId,
    }),
  close: () =>
    set({
      isOpen: false,
      pluginSeed: null,
      connectorAdminMode: null,
      connectorTypeFilter: null,
    }),
}));

export function useOfficialDirectoryStore<T>(selector: (state: OfficialDirectoryState) => T): T {
  return useStore(officialDirectoryStore, selector);
}
