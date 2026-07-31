/**
 * Official nue CTA matrix residual (pure, testable).
 * data-official-source: index-BELzQL5P:nue
 */

export type CoworkGenericPermissionCtaMode =
  | "write-this-task-split"
  | "write-this-task-solo"
  | "scheduled-always-split"
  | "always-split"
  | "allow-once";

export function resolveCoworkGenericPermissionCtaMode(input: {
  allowAlways: boolean;
  coworkWriteToolWarning: boolean;
  isScheduledTask: boolean;
}): CoworkGenericPermissionCtaMode {
  if (input.coworkWriteToolWarning && !input.isScheduledTask) {
    return input.allowAlways ? "write-this-task-split" : "write-this-task-solo";
  }
  if (input.isScheduledTask && input.allowAlways) return "scheduled-always-split";
  if (input.allowAlways) return "always-split";
  return "allow-once";
}

/** Official primary Enter decision residual. */
export function resolveCoworkGenericPermissionPrimaryDecision(input: {
  allowAlways: boolean;
  coworkWriteToolWarning: boolean;
  isScheduledTask: boolean;
}): "always" | "once" {
  if (input.coworkWriteToolWarning && !input.isScheduledTask) return "once";
  return input.allowAlways ? "always" : "once";
}
