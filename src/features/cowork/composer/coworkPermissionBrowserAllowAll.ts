/**
 * Official BrowserToolApproval Dfe residual (index-BELzQL5P ~60750):
 *   Dfe = () => { const { activeOrganization: e } = hc(); const t = Yc(); return !!e && !t; }
 * Yc residual in product settings path is raven org (wk("raven") / account.is_raven).
 * Show "Allow all browser actions" strip only when org present and not raven.
 * 3p honesty: never invent enterprise OAuth; local bootstrap residual only.
 */
export function canShowCoworkBrowserAllowAll(input: {
  hasActiveOrganization: boolean;
  isRavenOrg: boolean;
}): boolean {
  return input.hasActiveOrganization && !input.isRavenOrg;
}

export function readCoworkBrowserAllowAllBootstrap(bootstrap: Record<string, unknown> | null | undefined): {
  hasActiveOrganization: boolean;
  isRavenOrg: boolean;
} {
  if (!bootstrap) return { hasActiveOrganization: false, isRavenOrg: false };
  const account = asRecord(bootstrap.account);
  const organization = asRecord(bootstrap.organization) ?? asRecord(bootstrap.activeOrganization);
  const orgUuid = stringValue(organization?.uuid) ?? stringValue(asRecord(bootstrap.org)?.uuid);
  const isRaven =
    account?.is_raven === true
    || account?.isRaven === true
    || organization?.is_raven === true
    || organization?.isRaven === true
    || bootstrap.is_raven === true
    || bootstrap.isRaven === true;
  return {
    hasActiveOrganization: Boolean(orgUuid),
    isRavenOrg: isRaven,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}
