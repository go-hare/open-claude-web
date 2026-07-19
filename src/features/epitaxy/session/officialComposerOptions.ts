/**
 * Official code model / permission mode / effort options (c11959232 Os).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */

export const codeModelOptions = [
  { label: "Default", value: "default" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus", value: "opus" },
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

export const effortLevelOptions = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
];

export function modelLabel(value: string) {
  const normalized = normalizeCodeModelValue(value);
  return codeModelOptions.find((option) => option.value === normalized)?.label ?? formatClaudeModelLabel(value);
}

export function normalizeCodeModelValue(value?: string) {
  if (!value || value === "opus-4") return "default";
  if (value === "sonnet-4") return "sonnet";
  return value;
}

export function formatClaudeModelLabel(value: string) {
  const match = value.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/i);
  if (!match) return value;
  const family = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
  return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}

export function permissionModeLabel(value: string) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizeEffortValue(value?: string) {
  return effortLevelOptions.some((option) => option.value === value) ? value! : "medium";
}

export function effortLevelLabel(value: string) {
  return effortLevelOptions.find((option) => option.value === value)?.label ?? value;
}

