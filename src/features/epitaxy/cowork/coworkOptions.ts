import type { PermissionMode } from "../../../adapters/desktopBridge";

export const coworkModelOptions = [
  { label: "Default", value: "default" },
  { label: "Sonnet", value: "sonnet" },
  { label: "Opus", value: "opus" },
];

export const coworkPermissionModeOptions: Array<{ label: string; value: PermissionMode }> = [
  { label: "Ask", value: "default" },
];

export function coworkModelLabel(value: string) {
  return coworkModelOptions.find((option) => option.value === value)?.label ?? value;
}

export function coworkPermissionModeLabel(value: PermissionMode) {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.label ?? "Ask";
}

export function normalizeCoworkPermissionMode(value: unknown): PermissionMode {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.value ?? "default";
}
