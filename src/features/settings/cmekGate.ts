/**
 * Official LBt residual (index-BELzQL5P):
 *   (account.memberships ?? []).some(m => (m.organization.capabilities ?? []).includes("taint:cmek"))
 *
 * Used by General Profile X Instructions field (c0db37792 k=c()/LBt):
 * tooltip D4CuWTj4f5 + opacity-50 + disabled textarea when true.
 */

export function orgHasCmekTaint(capabilities: string[] | null | undefined): boolean {
  return (capabilities ?? []).includes("taint:cmek");
}

/** Scan bootstrap account.memberships (official LBt) + current org.capabilities fallback. */
export function hasCmekLockFromBootstrap(
  bootstrapPayload: Record<string, unknown> | null | undefined,
  currentOrgCapabilities?: string[] | null,
): boolean {
  if (orgHasCmekTaint(currentOrgCapabilities)) return true;
  if (!bootstrapPayload) return false;
  const account = record(bootstrapPayload.account);
  const memberships = Array.isArray(account.memberships) ? account.memberships : [];
  return memberships.some((membership) => {
    const org = record(record(membership).organization);
    const caps = Array.isArray(org.capabilities)
      ? org.capabilities.filter((item): item is string => typeof item === "string")
      : [];
    return orgHasCmekTaint(caps);
  });
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
