import type { EffortLevel, PermissionMode } from "../../../adapters/desktopBridge";
import {
  formatCoworkModelDisplayName,
  normalizeSelectorModelValue,
} from "../../cowork/composer/useCoworkModelOptions";

/**
 * @deprecated Hardcoded Sonnet/Opus invent — use useCodeModelOptions() (Ye("ccr_model")).
 * Kept empty-safe helpers for permission/effort only.
 */
export const codeModelOptions: Array<{ label: string; value: string }> = [
  { label: "Default", value: "default" },
];

export const permissionModeOptions: Array<{ label: string; value: PermissionMode }> = [
  { label: "询问权限", value: "default" },
  { label: "接受编辑", value: "acceptEdits" },
  { label: "规划模式", value: "plan" },
  { label: "绕过权限", value: "bypassPermissions" },
];

export const effortOptions: Array<{ label: string; value: EffortLevel }> = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Extra high", value: "xhigh" },
  { label: "Max", value: "max" },
];

/** Official Ultracode residual — session-only, maps to xhigh + workflows. */
export const ULTRACODE_OPTION = {
  label: "Ultracode",
  value: "ultra" as const,
  accent: true as const,
  help: {
    title: "Ultracode",
    body: "Ultracode is xhigh effort plus workflows. Most thorough, slowest, and heaviest on your limits. Applies to this chat only. New chats start without it.",
  },
};

export function modelLabel(value: string, allowedValues: string[] = []) {
  const normalized = normalizeSelectorModelValue(value, allowedValues);
  if (normalized === "default") return "Default";
  return formatCoworkModelDisplayName(normalized);
}

export function permissionModeLabel(value: PermissionMode) {
  return permissionModeOptions.find((option) => option.value === value)?.label ?? value;
}

export function effortLabel(value: EffortLevel) {
  return effortOptions.find((option) => option.value === value)?.label ?? value;
}

export function normalizePermissionMode(value: unknown): PermissionMode {
  return permissionModeOptions.find((option) => option.value === value)?.value ?? "default";
}

export function normalizeCodeModelValue(value?: string, allowedValues: string[] = []) {
  return normalizeSelectorModelValue(value, allowedValues);
}
