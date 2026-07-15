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
