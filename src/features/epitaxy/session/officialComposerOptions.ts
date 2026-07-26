/**
 * Official code permission / effort options (c11959232).
 * Model list is NOT hardcoded Sonnet/Opus — use useCodeModelOptions() Ye("ccr_model")
 * from bag bootstrap (userData/configLibrary inferenceModels).
 */

import {
  formatCoworkModelDisplayName,
  normalizeSelectorModelValue,
} from "../../cowork/composer/useCoworkModelOptions";

/** @deprecated Prefer useCodeModelOptions().items — kept as Default-only fallback. */
export const codeModelOptions = [
  { label: "Default", value: "default" },
];

export const permissionModeOptions = [
  { label: "询问权限", value: "default" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "规划模式", value: "plan" },
  { label: "绕过权限", value: "bypassPermissions" },
];

/**
 * Official Os → planExitTrustMode / planExitAcceptOptions (c11959232 composer).
 * trust: auto if available else acceptEdits else default.
 * acceptOptions: acceptEdits / auto / bypassPermissions present in Os (not default/plan).
 */
export function officialAvailablePermissionModes(): string[] {
  return permissionModeOptions.map((option) => option.value);
}

export function officialPlanExitTrustMode(availableModes: string[] = officialAvailablePermissionModes()): string {
  if (availableModes.includes("auto")) return "auto";
  if (availableModes.includes("acceptEdits")) return "acceptEdits";
  return "default";
}

export function officialPlanExitAcceptOptions(availableModes: string[] = officialAvailablePermissionModes()): string[] {
  // Official ln: only modes present in Os — empty array is valid (Wk qk default only when prop undefined).
  const options: string[] = [];
  if (availableModes.includes("acceptEdits")) options.push("acceptEdits");
  if (availableModes.includes("auto")) options.push("auto");
  if (availableModes.includes("bypassPermissions")) options.push("bypassPermissions");
  return options;
}

/** Official Pk / bR effort ladder (c360a9e1c). Ultracode is session flag + xhigh, not a level id. */
export const effortLevelOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
] as const;

export type OfficialEffortLevel = (typeof effortLevelOptions)[number]["value"];

/** Official Ultracode help residual (ufa5QA7ilZ / txnCFU+qli). */
export const ULTRACODE_HELP = {
  title: "Ultracode",
  body: "Ultracode is xhigh effort plus workflows. Most thorough, slowest, and heaviest on your limits. Applies to this chat only. New chats start without it.",
} as const;

export type OfficialEffortMenuItem = {
  accent?: boolean;
  checked: boolean;
  help?: { title: string; body: string };
  label: string;
  onSelect: () => void;
  value: string;
};

export function buildOfficialEffortMenuItems(options: {
  current: string;
  onSelect: (level: OfficialEffortLevel, ultracode: boolean) => void;
  ultracode: boolean;
  /** Official $ gate — show Ultracode stop when workflows + xhigh path available. */
  showUltracode?: boolean;
  /**
   * Official get_settings.applied.effortLevels (CLI 2.7.16+): per-model catalog ladder
   * (e.g. deepseek-v4-pro → ["high","max"]). When provided, only those stops render —
   * no invented low/medium for models that don't support them.
   */
  effortLevels?: readonly string[] | null;
}): OfficialEffortMenuItem[] {
  const showUltracode = options.showUltracode !== false;
  const allowed = options.effortLevels && options.effortLevels.length > 0
    ? new Set(options.effortLevels)
    : null;
  const ladder = allowed ? effortLevelOptions.filter((o) => allowed.has(o.value)) : [...effortLevelOptions];
  // Explicit OfficialEffortMenuItem[] — Ultracode is residual value "ultra" (not a ladder id).
  const items: OfficialEffortMenuItem[] = ladder.map((option) => ({
    label: option.label,
    value: option.value,
    checked: !options.ultracode && option.value === options.current,
    onSelect: () => options.onSelect(option.value, false),
  }));
  if (showUltracode) {
    items.push({
      label: "Ultracode",
      value: "ultra",
      accent: true,
      help: { title: ULTRACODE_HELP.title, body: ULTRACODE_HELP.body },
      checked: options.ultracode,
      // Ultracode = catalog top effort + workflows; the CLI resolves the top from
      // the same catalog it reports via effortLevels.
      onSelect: () => options.onSelect("xhigh", true),
    });
  }
  return items;
}

export function modelLabel(value: string, allowedValues: string[] = []) {
  const normalized = normalizeCodeModelValue(value, allowedValues);
  if (normalized === "default") return "Default";
  return formatCoworkModelDisplayName(normalized);
}

export function normalizeCodeModelValue(value?: string, allowedValues: string[] = []) {
  return normalizeSelectorModelValue(value, allowedValues);
}

export function formatClaudeModelLabel(value: string) {
  return formatCoworkModelDisplayName(value);
}

export function permissionModeLabel(value: string) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizeEffortValue(value?: string) {
  if (value === "ultracode") return "xhigh";
  return effortLevelOptions.some((option) => option.value === value) ? value! : "medium";
}

export function effortLevelLabel(value: string) {
  return effortLevelOptions.find((option) => option.value === value)?.label ?? value;
}

