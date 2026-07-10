import type { PermissionMode } from "../../../adapters/desktopBridge";

export const coworkPermissionModeOptions: Array<{ label: string; value: PermissionMode }> = [
  { label: "Ask", value: "default" },
];

export function coworkPermissionModeLabel(value: PermissionMode) {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.label ?? "Ask";
}

export function normalizeCoworkPermissionMode(value: unknown): PermissionMode {
  return coworkPermissionModeOptions.find((option) => option.value === value)?.value ?? "default";
}
