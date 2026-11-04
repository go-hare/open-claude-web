/**
 * Official O5 settings modal store (index-BELzQL5P.js).
 * P5 = open(); D5 = mounted. Desktop Gns: xe=D5() → P5(fe) instead of /settings route.
 */
import { create } from "zustand";
import { parseSettingsPath } from "./settingsPath";

export type SettingsModalStore = {
  section: string | null;
  subpath: string | undefined;
  mounted: boolean;
  openedFromRoute: boolean;
  open: (section?: string, subpath?: string) => void;
  openFromRoute: (section: string, subpath?: string) => void;
  close: () => void;
  setMounted: (mounted: boolean) => void;
};

export const settingsModalStore = create<SettingsModalStore>((set) => ({
  section: null,
  subpath: undefined,
  mounted: false,
  openedFromRoute: false,
  open: (section = "general", subpath) =>
    set({ section, subpath, openedFromRoute: false }),
  openFromRoute: (section, subpath) =>
    set({ section, subpath, openedFromRoute: true }),
  close: () => set({ section: null, subpath: undefined, openedFromRoute: false }),
  setMounted: (mounted) => set({ mounted }),
}));

/** Official P5. */
export function openSettingsModal(section?: string, subpath?: string): void {
  settingsModalStore.getState().open(section, subpath);
}

/** Official B0t: `/settings…` while modal mounted → P5(section) in place. */
export function tryOpenSettingsModalFromPath(path: string): boolean {
  const { mounted, open } = settingsModalStore.getState();
  if (!mounted) return false;
  const pathname = path.split("?")[0]?.split("#")[0] ?? path;
  const parsed = parseSettingsPath(pathname);
  if (!parsed) return false;
  open(parsed.section, parsed.subpath);
  return true;
}
