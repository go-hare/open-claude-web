import { useDesktopPreferences } from "../../settings/useDesktopPreferences";
import type { PermissionMode } from "../../../adapters/desktopBridge";
import { permissionModeOptions } from "./options";

/**
 * Official te() residual (c3d5d2a6f):
 *   prefs.bypassPermissionsModeEnabled === true → bypass available in Mode menu.
 * SSA default is false; settings page toggle writes the pref.
 *
 * Official Sn (c119): Os.map then, if Fs && As && !_s, **push disabled bypass**
 * with hint id 9aM6b8EJG/ "Enable in Claude Code settings". Do not filter it out.
 * Main process still clamps setPermissionMode / spawn (acceptEdits fallback).
 */
export function useBypassPermissionsEnabled(): boolean {
  const [preferences] = useDesktopPreferences();
  return preferences.bypassPermissionsModeEnabled === true;
}

/** Official Sn residual: unavailable bypass is a disabled row, not omitted. */
export const BYPASS_PERMISSIONS_SETTINGS_HINT = "Enable in Claude Code settings";

export type CodePermissionModeOption = {
  disabled?: boolean;
  hint?: string;
  label: string;
  value: PermissionMode;
};

/** Official Os + disabled bypass append for Code Mode menu. */
export function useCodePermissionModeOptions(): CodePermissionModeOption[] {
  const bypassEnabled = useBypassPermissionsEnabled();
  const items: CodePermissionModeOption[] = permissionModeOptions
    .filter((option) => option.value !== "bypassPermissions")
    .map((option) => ({ label: option.label, value: option.value }));
  const bypass = permissionModeOptions.find((option) => option.value === "bypassPermissions");
  if (!bypass) return items;
  if (bypassEnabled) {
    items.push({ label: bypass.label, value: bypass.value });
  } else {
    items.push({
      disabled: true,
      hint: BYPASS_PERMISSIONS_SETTINGS_HINT,
      label: bypass.label,
      value: bypass.value,
    });
  }
  return items;
}
