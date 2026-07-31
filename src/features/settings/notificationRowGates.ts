/**
 * Official General Notifications row gates (c0db37792 ie + index-BELzQL5P exports):
 *
 *   ie():
 *     Response completions          — always
 *     e && Code notifications       — aA = ud("bad_moon_rising") && nA(claude_code)
 *     e && Code permission requests — aA parent + GBe inside fe
 *     e && Code emails              — aA
 *     t && Security scan emails     — bas = gA("claude_code_security").isAvailable
 *     n && Dispatch messages        — VBe = ud("ccr_client_presence_enabled")
 *   fe() also requires GBe = ud("ccr_code_requires_action_category_enabled")
 *
 * Official GrowthBook / capability residual is hide-on-missing / hide-unless-true
 * (same family as Qp === true for Claude Code arms). Product 3P bootstrap does not
 * invent Anthropic cloud flags — missing → hide. Only Response completions stays
 * always visible in GeneralSettings.
 *
 * Delivery honesty for hidden arms:
 *   Code emails / Security scan emails — no 3P mail channel
 *   Dispatch messages — product Dispatch UI already hidden; no phone FCM
 *   Code push arms — require official cloud entitlement flags when present
 */

export type NotificationRowGates = {
  /** Official aA residual — Code notifications + Code emails parent. */
  codeSession: boolean;
  /** Official aA && GBe residual. */
  codePermissionRequests: boolean;
  /** Official bas residual. */
  securityScanEmails: boolean;
  /** Official VBe residual. */
  dispatchMessages: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Read a boolean-ish GrowthBook / feature_flags key.
 * Returns undefined when the key is not present.
 */
export function readBootstrapFeatureFlag(
  bootstrap: Record<string, unknown> | null | undefined,
  key: string,
): boolean | undefined {
  if (!bootstrap) return undefined;

  const roots: Array<Record<string, unknown> | null> = [
    asRecord(bootstrap.feature_flags),
    asRecord(bootstrap.featureFlags),
    asRecord(bootstrap.flags),
    asRecord(asRecord(bootstrap.growthbook)?.features),
    asRecord(asRecord(bootstrap.growthbook)?.feature_flags),
    asRecord(asRecord(bootstrap.statsig)?.values),
  ];

  for (const root of roots) {
    if (!root || !(key in root)) continue;
    const raw = root[key];
    if (typeof raw === "boolean") return raw;
    if (raw === 1 || raw === "true" || raw === "on" || raw === "enabled") return true;
    if (raw === 0 || raw === "false" || raw === "off" || raw === "disabled") return false;
    // GrowthBook-style { defaultValue: boolean }
    const nested = asRecord(raw);
    if (nested && "defaultValue" in nested) {
      const dv = nested.defaultValue;
      if (typeof dv === "boolean") return dv;
    }
    // Org feature availability-style { isAvailable: boolean }
    if (nested && typeof nested.isAvailable === "boolean") return nested.isAvailable;
  }

  return undefined;
}

function orgCapabilities(
  bootstrap: Record<string, unknown> | null | undefined,
  explicit?: string[] | null,
): string[] {
  if (Array.isArray(explicit)) {
    return explicit.filter((item): item is string => typeof item === "string");
  }
  if (!bootstrap) return [];
  const account = asRecord(bootstrap.account);
  const memberships = Array.isArray(account?.memberships) ? account.memberships : [];
  const membership = asRecord(memberships[0]);
  const organization =
    asRecord(membership?.organization)
    ?? asRecord(bootstrap.organization)
    ?? asRecord(bootstrap.org);
  const caps = organization?.capabilities;
  return Array.isArray(caps) ? caps.filter((item): item is string => typeof item === "string") : [];
}

/**
 * Official hide-on-missing residual: only explicit true shows the row.
 */
function residualGateOn(value: boolean | undefined): boolean {
  return value === true;
}

/**
 * Official nA residual for claude_code entitlement.
 * Explicit GB/feature flag wins; positive capability match → true;
 * incomplete 3P caps without code entitlement → false (hide, do not invent).
 */
function claudeCodeAvailable(
  bootstrap: Record<string, unknown> | null | undefined,
  capabilities: string[],
): boolean {
  const fromFlag =
    readBootstrapFeatureFlag(bootstrap, "claude_code")
    ?? readBootstrapFeatureFlag(bootstrap, "claude_code_desktop");
  if (fromFlag !== undefined) return fromFlag === true;

  return (
    capabilities.includes("claude_code")
    || capabilities.includes("claude_code_desktop")
    || capabilities.includes("claude_code_web")
  );
}

function claudeCodeSecurityAvailable(
  bootstrap: Record<string, unknown> | null | undefined,
  capabilities: string[],
): boolean {
  // Official bas: gA("claude_code_security").isAvailable; client gate worn_elbow_patch || Ed(...)
  const fromFlag =
    readBootstrapFeatureFlag(bootstrap, "claude_code_security")
    ?? readBootstrapFeatureFlag(bootstrap, "worn_elbow_patch");
  if (fromFlag !== undefined) return fromFlag === true;
  return capabilities.includes("claude_code_security");
}

/**
 * Compute which Notifications rows to render.
 * Pass either raw bootstrap payload and/or already-parsed org capabilities.
 */
export function notificationRowGatesFromBootstrap(
  bootstrap: Record<string, unknown> | null | undefined,
  options?: { capabilities?: string[] | null },
): NotificationRowGates {
  const caps = orgCapabilities(bootstrap, options?.capabilities);
  const badMoon = readBootstrapFeatureFlag(bootstrap, "bad_moon_rising");
  const codeOk = claudeCodeAvailable(bootstrap, caps);
  // Official aA = ud("bad_moon_rising") && nA() — both must be true.
  const aA = residualGateOn(badMoon) && codeOk;

  const gBe = readBootstrapFeatureFlag(bootstrap, "ccr_code_requires_action_category_enabled");
  const vBe = readBootstrapFeatureFlag(bootstrap, "ccr_client_presence_enabled");
  const bas = claudeCodeSecurityAvailable(bootstrap, caps);

  return {
    codeSession: aA,
    codePermissionRequests: aA && residualGateOn(gBe),
    securityScanEmails: bas,
    dispatchMessages: residualGateOn(vBe),
  };
}

/**
 * Default before bootstrap loads / 3P without Anthropic entitlement flags:
 * hide all gated arms (Response completions stays unconditional in UI).
 */
export const DEFAULT_NOTIFICATION_ROW_GATES: NotificationRowGates = {
  codeSession: false,
  codePermissionRequests: false,
  securityScanEmails: false,
  dispatchMessages: false,
};
