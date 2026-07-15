/**
 * Official personal-settings account surface (c0db37792 H / X, cc989143e _t):
 * - PUT /api/account → full_name / display_name (profile X → b())
 * - PUT|PATCH /api/account_profile → avatar / work_function / conversation_preferences (v())
 * - GET|PATCH /api/account/settings → flat account.settings (Claude Code ccr_* keys via J())
 * - GET|PATCH /api/organizations/:uuid/notification/preferences → feature_preference (F/L)
 */

export type AccountIdentity = {
  display_name: string;
  full_name: string;
};

export type AccountProfile = {
  avatar?: number;
  conversation_preferences?: string;
  locale?: string | null;
  work_function?: string | null;
};

export type NotificationFeaturePreference = {
  bogosort?: { enable_email?: boolean; enable_push?: boolean };
  code_requires_action?: { enable_push?: boolean };
  code_security_scan?: { enable_email?: boolean };
  dispatch?: { enable_push?: boolean };
  [key: string]: unknown;
};

export type NotificationPreferencesPayload = {
  account_id?: number;
  organization_id?: number;
  preferences: {
    feature_preference?: NotificationFeaturePreference;
    [key: string]: unknown;
  };
};

const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

async function tryUrls<T>(paths: string[], init?: RequestInit): Promise<T | null> {
  for (const path of paths) {
    try {
      const response = await fetch(path, { credentials: "include", ...init });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("json") || contentType.includes("javascript")) {
        return (await response.json()) as T;
      }
      const text = await response.text();
      if (text.startsWith("{") || text.startsWith("[")) return JSON.parse(text) as T;
    } catch {
      // try next
    }
  }
  return null;
}

function apiPaths(path: string): string[] {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return [`app://localhost${normalized}`, normalized];
}

export async function fetchBootstrapPayload(): Promise<Record<string, unknown> | null> {
  return tryUrls<Record<string, unknown>>(apiPaths("/api/bootstrap"));
}

/**
 * Official epitaxy Dh (c11959232): POST /api/organizations/:uuid/reset_rate_limits
 * when GrowthBook/feature `can_reset_rate_limits` is on. custom3p may expose the
 * flag under feature_flags / account flags; if absent we still attempt when org
 * uuid is known (gate fails closed on non-OK response).
 */
export async function postOrganizationResetRateLimits(orgUuid: string): Promise<{ ok: boolean; error?: string }> {
  if (!orgUuid) return { ok: false, error: "missing_org" };
  const path = `/api/organizations/${orgUuid}/reset_rate_limits`;
  for (const url of apiPaths(path)) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        headers: JSON_HEADERS,
        method: "POST",
        body: "{}",
      });
      if (response.ok) return { ok: true };
      if (response.status === 403 || response.status === 404) {
        return { ok: false, error: `reset_rate_limits_${response.status}` };
      }
    } catch {
      // try next origin
    }
  }
  return { ok: false, error: "reset_rate_limits_failed" };
}

/** Best-effort org uuid from bootstrap payload shapes used by custom3p / official. */
export function organizationUuidFromBootstrap(bootstrap: Record<string, unknown> | null | undefined): string | null {
  if (!bootstrap) return null;
  const account = asRecord(bootstrap.account);
  const org = asRecord(bootstrap.organization) ?? asRecord(bootstrap.org) ?? asRecord(account.organization);
  return stringField(org, "uuid") ?? stringField(org, "id") ?? stringField(account, "organization_uuid") ?? null;
}

export function canResetRateLimitsFromBootstrap(bootstrap: Record<string, unknown> | null | undefined): boolean {
  if (!bootstrap) return false;
  const flags = asRecord(bootstrap.feature_flags) ?? asRecord(bootstrap.featureFlags) ?? asRecord(bootstrap.flags);
  if (flags.can_reset_rate_limits === true || flags.canResetRateLimits === true) return true;
  const account = asRecord(bootstrap.account);
  const settings = asRecord(account.settings);
  if (settings.can_reset_rate_limits === true) return true;
  // Official GrowthBook key; when unknown, allow attempt if org uuid present (server enforces).
  return Boolean(organizationUuidFromBootstrap(bootstrap));
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function stringField(record: Record<string, unknown> | null, key: string): string | null {
  if (!record) return null;
  const value = record[key];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export async function fetchAccountProfile(): Promise<AccountProfile> {
  const data = await tryUrls<AccountProfile>(apiPaths("/api/account_profile"));
  return data ?? {};
}

export async function fetchAccountSettings(): Promise<Record<string, unknown>> {
  const data = await tryUrls<Record<string, unknown>>(apiPaths("/api/account/settings"));
  return data ?? {};
}

export async function putAccountIdentity(patch: Partial<AccountIdentity>): Promise<Record<string, unknown> | null> {
  return tryUrls<Record<string, unknown>>(apiPaths("/api/account"), {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
}

export async function putAccountProfile(patch: Partial<AccountProfile>): Promise<Record<string, unknown> | null> {
  return tryUrls<Record<string, unknown>>(apiPaths("/api/account_profile"), {
    method: "PUT",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
}

export async function patchAccountSettings(patch: Record<string, unknown>): Promise<boolean> {
  const result = await tryUrls<Record<string, unknown>>(apiPaths("/api/account/settings"), {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify(patch),
  });
  return result !== null;
}

export async function fetchNotificationPreferences(orgUuid: string): Promise<NotificationPreferencesPayload> {
  const path = `/api/organizations/${orgUuid}/notification/preferences`;
  const data = await tryUrls<NotificationPreferencesPayload>(apiPaths(path));
  return data ?? { preferences: {} };
}

export async function patchNotificationPreferences(
  orgUuid: string,
  preferences: NotificationPreferencesPayload["preferences"],
): Promise<NotificationPreferencesPayload | null> {
  const path = `/api/organizations/${orgUuid}/notification/preferences`;
  return tryUrls<NotificationPreferencesPayload>(apiPaths(path), {
    method: "PATCH",
    headers: JSON_HEADERS,
    body: JSON.stringify({ preferences }),
  });
}

/** Official pp (c5f4e1303) work-function enum used by General profile X. */
export const WORK_FUNCTION_VALUES = [
  "Product Management",
  "Engineering",
  "Human Resources",
  "Finance",
  "Marketing",
  "Sales",
  "Operations",
  "Data Science",
  "Design",
  "Legal",
  "Other",
] as const;

export const WORK_FUNCTION_LABELS: Record<(typeof WORK_FUNCTION_VALUES)[number], string> = {
  "Product Management": "产品管理",
  Engineering: "工程",
  "Human Resources": "人力资源",
  Finance: "财务",
  Marketing: "市场",
  Sales: "销售",
  Operations: "运营",
  "Data Science": "数据科学",
  Design: "设计",
  Legal: "法务",
  Other: "其他",
};

export const WORK_FUNCTION_OPTIONS = WORK_FUNCTION_VALUES.map((value) => ({
  value,
  label: WORK_FUNCTION_LABELS[value],
}));
