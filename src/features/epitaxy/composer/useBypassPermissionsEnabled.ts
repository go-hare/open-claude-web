import { useDesktopPreferences } from "../../settings/useDesktopPreferences";
import type { PermissionMode } from "../../../adapters/desktopBridge";
import { permissionModeOptions } from "./options";

/**
 * Official te() residual (c3d5d2a6f):
 *   prefs.bypassPermissionsModeEnabled === true → bypass available in Mode menu.
 * SSA default is false; settings page toggle writes the pref.
 *
 * Product: filter composer Mode items so bypass is not offered when disabled.
 * Main process also clamps setPermissionMode / spawn (acceptEdits fallback).
 */
export function useBypassPermissionsEnabled(): boolean {
  const [preferences] = useDesktopPreferences();
  return preferences.bypassPermissionsModeEnabled === true;
}

/** Official Os subset for Code Mode menu, gated by bypass pref. */
export function useCodePermissionModeOptions(): Array<{
  label: string;
  value: PermissionMode;
}> {
  const bypassEnabled = useBypassPermissionsEnabled();
  return permissionModeOptions.filter(
    (option) => option.value !== "bypassPermissions" || bypassEnabled,
  );
}
