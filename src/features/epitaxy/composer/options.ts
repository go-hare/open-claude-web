import type { EffortLevel, PermissionMode } from "../../../adapters/desktopBridge";

export const codeModelOptions = [
  { label: "Default", value: "default" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus", value: "opus" },
];

export const permissionModeOptions: Array<{ label: string; value: PermissionMode }> = [
  { label: "询问权限", value: "default" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "规划模式", value: "plan" },
  { label: "绕过权限", value: "bypassPermissions" },
];

export const coworkPermissionModeOptions: Array<{ label: string; value: PermissionMode }> = [
  { label: "Ask", value: "default" },
];

export const effortOptions: Array<{ label: string; value: EffortLevel }> = [
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

export function permissionModeLabel(value: PermissionMode) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function coworkPermissionModeLabel(value: PermissionMode) {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.label ?? "Ask";
}

export function effortLabel(value: EffortLevel) {
  return effortOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizePermissionMode(value: unknown): PermissionMode {
  return permissionModeOptions.find((option) => option.value === value)?.value ?? "default";
}

export function normalizeCoworkPermissionMode(value: unknown): PermissionMode {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.value ?? "default";
}

function normalizeCodeModelValue(value?: string) {
  if (!value || value === "opus-4") return "default";
  if (value === "sonnet-4") return "sonnet";
  return value;
}

function formatClaudeModelLabel(value: string) {
  const match = value.match(/^claude-([a-z]+)-(\d+)(?:-(\d+))?/i);
  if (!match) return value;
  const family = `${match[1].charAt(0).toUpperCase()}${match[1].slice(1)}`;
  return `${family} ${match[2]}${match[3] ? `.${match[3]}` : ""}`;
}
