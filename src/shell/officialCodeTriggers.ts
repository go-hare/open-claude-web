/**
 * Official shared-1 `yM` / `vM` / `LN` / `IN` queryFn residual:
 *   GET `/v1/code/triggers?…` with `anthropic-beta: ccr-triggers-2026-01-30`.
 * Official `w2` (shared-21): `Ln({enabled:r, excludeTags:[On]})` where `On`/`gM` =
 *   `"cowork-scheduled"`, then `e.enabled && !on(e)` (`on` = `aN`).
 *
 * 3p has no Anthropic session — GET 401/404/abort → empty `data` (CCD half still
 * drives Routines). Do not invent OAuth, fake catalog rows, or LocalPlugins.
 */

/** Official `gM`. */
export const OFFICIAL_COWORK_SCHEDULED_TRIGGER_TAG = "cowork-scheduled";

/** Official `_M`. */
export const OFFICIAL_CODE_TRIGGERS_STALE_MS = 10_000;

/** Official queryFn page cap. */
export const OFFICIAL_CODE_TRIGGERS_MAX_PAGES = 50;

export type OfficialCodeTrigger = {
  enabled?: boolean;
  ended_reason?: unknown;
  job_config?: {
    ccr?: {
      environment_id?: unknown;
      self_hosted_runner_pool_id?: unknown;
    };
  };
  persistent_session_id?: unknown;
  run_once_at?: unknown;
};

export type OfficialCodeTriggersPage = {
  data?: OfficialCodeTrigger[];
  has_more?: boolean;
  next_cursor?: string;
};

export type OfficialCodeTriggersList = {
  data: OfficialCodeTrigger[];
  has_more: boolean;
};

export type OfficialCodeTriggersQuery = {
  agentId?: string;
  excludeTags?: string[];
  includeSessionBoundOneShots?: boolean;
  onlyRunnable?: boolean;
  orgUuid?: string | null;
  persistentSessionId?: string;
  signal?: AbortSignal;
};

/** Official `vM`. */
export function officialCodeTriggersHeaders(orgUuid?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    "anthropic-version": "2023-06-01",
    "anthropic-beta": "ccr-triggers-2026-01-30",
  };
  if (orgUuid) headers["x-organization-uuid"] = orgUuid;
  return headers;
}

/**
 * Official `yM(e, t={})` → `/v1/code/triggers?${params}`.
 * Default: exclude_session_bound_one_shots=true unless includeSessionBoundOneShots.
 */
export function officialCodeTriggersPath(query: OfficialCodeTriggersQuery = {}, page: {
  cursor?: string;
  offset?: number;
} = {}): string {
  const params = new URLSearchParams({ limit: "100" });
  if (query.persistentSessionId) {
    params.set("persistent_session_id", query.persistentSessionId);
  } else if (query.includeSessionBoundOneShots !== true) {
    params.set("exclude_session_bound_one_shots", "true");
  }
  if (query.onlyRunnable === true) params.set("enabled", "true");
  if (query.agentId) params.set("agent_id", query.agentId);
  for (const tag of query.excludeTags ?? []) params.append("exclude_tags", tag);
  if (page.cursor) params.set("cursor", page.cursor);
  else if (page.offset) params.set("offset", String(page.offset));
  return `/v1/code/triggers?${params.toString()}`;
}

export function officialW2CodeTriggersPath(orgUuid?: string | null): string {
  void orgUuid;
  return officialCodeTriggersPath({
    excludeTags: [OFFICIAL_COWORK_SCHEDULED_TRIGGER_TAG],
  });
}

function triggerOrigins(pathWithQuery: string): string[] {
  const path = pathWithQuery.startsWith("/") ? pathWithQuery : `/${pathWithQuery}`;
  return [`app://localhost${path}`, path];
}

export function parseOfficialCodeTriggersPage(value: unknown): OfficialCodeTriggersPage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as Record<string, unknown>;
  const data = Array.isArray(record.data) ? record.data.filter((row) => row && typeof row === "object") as OfficialCodeTrigger[] : undefined;
  const next =
    typeof record.next_cursor === "string" && record.next_cursor.length > 0
      ? record.next_cursor
      : undefined;
  const hasMore = typeof record.has_more === "boolean" ? record.has_more : undefined;
  return { data, next_cursor: next, has_more: hasMore };
}

async function getJsonPage(
  pathWithQuery: string,
  headers: Record<string, string>,
  signal?: AbortSignal,
): Promise<OfficialCodeTriggersPage | null> {
  for (const url of triggerOrigins(pathWithQuery)) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        headers,
        method: "GET",
        signal,
      });
      if (!response.ok) continue;
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("json") || contentType.includes("javascript")) {
        return parseOfficialCodeTriggersPage(await response.json());
      }
      const text = await response.text();
      if (text.startsWith("{") || text.startsWith("[")) {
        return parseOfficialCodeTriggersPage(JSON.parse(text) as unknown);
      }
    } catch {
      // try next origin — 3p abort / CORS / 404
    }
  }
  return null;
}

/**
 * Official IN queryFn: up to 50 pages, cursor then offset, `{ data, has_more }`.
 * Missing org (`IN` `enabled: !!org`) or failed GET → empty list (do not invent rows).
 */
export async function fetchOfficialCodeTriggersList(
  query: OfficialCodeTriggersQuery = {},
): Promise<OfficialCodeTriggersList> {
  const empty: OfficialCodeTriggersList = { data: [], has_more: false };
  if (!query.orgUuid) return empty;
  const headers = officialCodeTriggersHeaders(query.orgUuid);
  const collected: OfficialCodeTrigger[] = [];
  let cursor: string | undefined;
  let offset = 0;
  let complete = false;
  for (let page = 0; page < OFFICIAL_CODE_TRIGGERS_MAX_PAGES; page += 1) {
    const path = officialCodeTriggersPath(query, { cursor, offset });
    const json = await getJsonPage(path, headers, query.signal);
    if (!json) return empty;
    const rows = json.data ?? [];
    collected.push(...rows);
    offset += rows.length;
    if (json.next_cursor) {
      cursor = json.next_cursor;
      continue;
    }
    if (json.has_more === true && rows.length > 0) {
      cursor = undefined;
      continue;
    }
    complete = json.has_more !== true;
    break;
  }
  return { data: collected, has_more: !complete };
}
