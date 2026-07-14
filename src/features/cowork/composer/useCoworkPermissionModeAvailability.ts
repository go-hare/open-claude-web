import { useMemo } from "react";
import type { PermissionMode } from "../../../adapters/desktopBridge";
import {
  coworkPermissionModesForUnsupervised,
  resolveCoworkUnsupervisedModeAvailability,
  type CoworkUnsupervisedMode,
} from "./options";

/**
 * Official skt/OZe/RZe (index-BELzQL5P ~131863 / ~218684):
 * nkt chin selector only mounts when isAvailable === true.
 * isAvailable = Boolean(OZe()) for new-task (setPermissionMode always present on draft).
 * OZe: RZe feature arm (auto|bypassPermissions|null) AND org skip_approvals_enabled.
 * Without GrowthBook arms or skip_approvals, official returns null → nkt returns null.
 */
export function useCoworkPermissionModeAvailability() {
  const unsupervised = useMemo(() => resolveCoworkUnsupervisedModeAvailability(), []);
  const modes = useMemo(
    () => coworkPermissionModesForUnsupervised(unsupervised),
    [unsupervised],
  );
  return {
    isAvailable: unsupervised !== null,
    modes,
    unsupervisedMode: unsupervised as CoworkUnsupervisedMode | null,
  };
}

export function filterCoworkPermissionModeOptions(modes: PermissionMode[]) {
  return modes;
}
