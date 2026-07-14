import type { PermissionMode } from "../../../adapters/desktopBridge";

/**
 * Official Nwt.cowork + Ewt (index-BELzQL5P ~217984):
 * cowork base modes = ["default"]; auto/bypass appended when feature-enabled.
 * Awt(sessionType: "cowork"): triggerLabel Ask/Act, icons hv/rm.
 *
 * Official OZe/RZe (~131863): chin nkt only when unsupervised arm is available
 * AND org skip_approvals_enabled. Without flags, nkt returns null (no Ask UI).
 */
export type CoworkPermissionModeOption = {
  description: string;
  icon: string;
  /** Compact chin label (official triggerLabel). */
  label: string;
  /** Full menu label when different from trigger. */
  menuLabel?: string;
  value: PermissionMode;
  isWarning?: boolean;
};

export type CoworkUnsupervisedMode = "auto" | "bypassPermissions";

/** Official Nwt.cowork base. */
export const COWORK_BASE_PERMISSION_MODES: PermissionMode[] = ["default"];

export const coworkPermissionModeOptions: CoworkPermissionModeOption[] = [
  {
    description: "Always ask before making changes",
    icon: "Hand4FingerStop",
    label: "Ask",
    menuLabel: "Ask permissions",
    value: "default",
  },
  {
    description: "Claude works without pausing for approval",
    icon: "Warning",
    isWarning: true,
    label: "Act",
    menuLabel: "Act without asking",
    value: "auto",
  },
  {
    description: "Claude works without pausing for approval",
    icon: "Warning",
    isWarning: true,
    label: "Act",
    menuLabel: "Act without asking",
    value: "bypassPermissions",
  },
];

/**
 * Official RZe: GrowthBook arms cowork_auto_permission_mode / cowork_bypass_permissions_mode.
 * Local bridge has no GB client yet — read query + localStorage force overrides (official gb_gate_* / Force GrowthBook panel).
 * Default (no override): null → Ask chin hidden (matches official nkt when flags off).
 */
export function resolveCoworkUnsupervisedModeFeature(): CoworkUnsupervisedMode | null {
  if (typeof window === "undefined") return null;
  const auto = readFeatureGate("cowork_auto_permission_mode");
  const bypass = readFeatureGate("cowork_bypass_permissions_mode");
  if (auto) return "auto";
  if (bypass) return "bypassPermissions";
  return null;
}

/**
 * Official OZe org gate: skip_approvals_enabled from YT account settings.
 * Without a settings bridge, treat missing override as false when a feature arm is forced on via query only if
 * skip_approvals is also enabled (query gb_gate_skip_approvals_enabled / localStorage).
 * When no feature arm, returns null regardless.
 */
export function resolveCoworkUnsupervisedModeAvailability(): CoworkUnsupervisedMode | null {
  const arm = resolveCoworkUnsupervisedModeFeature();
  if (arm === null) return null;
  if (!readSkipApprovalsEnabled()) return null;
  return arm;
}

/** Official Ewt("cowork", { auto, bypass }). */
export function coworkPermissionModesForUnsupervised(unsupervised: CoworkUnsupervisedMode | null): PermissionMode[] {
  const modes: PermissionMode[] = [...COWORK_BASE_PERMISSION_MODES];
  if (unsupervised === "auto") modes.push("auto");
  if (unsupervised === "bypassPermissions") modes.push("bypassPermissions");
  return modes;
}

export function coworkPermissionModeOptionsForModes(modes: PermissionMode[]) {
  const byValue = new Map(coworkPermissionModeOptions.map((option) => [option.value, option]));
  return modes.flatMap((mode) => {
    const option = byValue.get(mode);
    return option ? [option] : [];
  });
}

export function coworkPermissionModeLabel(value: PermissionMode) {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.label ?? "Ask";
}

export function coworkPermissionModeOption(value: PermissionMode) {
  return coworkPermissionModeOptions.find((option) => option.value === value) ?? coworkPermissionModeOptions[0];
}

/** Official oKt / DZe: auto | bypassPermissions → show risk banner. */
export function isCoworkUnsupervisedPermissionMode(value: PermissionMode | undefined) {
  return value === "auto" || value === "bypassPermissions" || value === "bypass";
}

export function normalizeCoworkPermissionMode(value: unknown): PermissionMode {
  if (value === "bypass") return "bypassPermissions";
  if (value === "acceptEdits" || value === "plan") return "default";
  if (value === "auto" || value === "bypassPermissions" || value === "default") return value;
  return "default";
}

function readFeatureGate(key: string): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get(`gb_gate_${key}`) ?? params.get(key);
    if (query === "1" || query === "true") return true;
    if (query === "0" || query === "false") return false;
    const stored = window.localStorage.getItem(`gb_gate_${key}`) ?? window.localStorage.getItem(key);
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}

function readSkipApprovalsEnabled(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    const query = params.get("gb_gate_skip_approvals_enabled") ?? params.get("skip_approvals_enabled");
    if (query === "1" || query === "true") return true;
    if (query === "0" || query === "false") return false;
    const stored =
      window.localStorage.getItem("gb_gate_skip_approvals_enabled") ??
      window.localStorage.getItem("skip_approvals_enabled");
    return stored === "1" || stored === "true";
  } catch {
    return false;
  }
}
