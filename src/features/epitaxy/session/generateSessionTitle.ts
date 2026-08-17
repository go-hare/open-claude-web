/**
 * Official residual (BELz eme + c4bf H / cowork create):
 * POST /api/organizations/:org/dust/generate_session_title
 * body: { first_session_message }
 * → { title }
 *
 * Gates (create path): prompt.trim().length >= 10.
 * Fail soft — caller keeps placeholder title.
 */
import {
  fetchBootstrapPayload,
  organizationUuidFromBootstrap,
} from "../../settings/accountSettingsApi";

const JSON_HEADERS = { Accept: "application/json", "Content-Type": "application/json" };

function apiPaths(path: string): string[] {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return [`app://localhost${normalized}`, normalized];
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

/** Official create-path gate: $ = !k && z.trim().length >= 10 && !o */
export const OFFICIAL_AUTO_TITLE_MIN_LENGTH = 10;

/** Official first_session_message body slice residual (chapter path uses 250). */
export const OFFICIAL_AUTO_TITLE_MESSAGE_MAX = 250;

export function shouldGenerateAutoSessionTitle(message: string | null | undefined): boolean {
  return Boolean(message && message.trim().length >= OFFICIAL_AUTO_TITLE_MIN_LENGTH);
}

export async function resolveOrganizationUuidForTitle(): Promise<string | null> {
  const bootstrap = await fetchBootstrapPayload();
  return organizationUuidFromBootstrap(bootstrap);
}

/**
 * Official eme mutateAsync({ first_session_message }) → { title? }.
 * Returns null on missing org / network / empty title (fail soft).
 */
export async function generateSessionTitleFromFirstMessage(
  firstSessionMessage: string,
  options?: { orgUuid?: string | null; signal?: AbortSignal },
): Promise<string | null> {
  const message = firstSessionMessage.trim().slice(0, OFFICIAL_AUTO_TITLE_MESSAGE_MAX);
  if (!message) return null;
  // Explicit orgUuid:null skips bootstrap (tests / offline fail-soft).
  const orgUuid = options && "orgUuid" in options
    ? options.orgUuid
    : await resolveOrganizationUuidForTitle();
  if (!orgUuid) return null;
  const path = `/api/organizations/${orgUuid}/dust/generate_session_title`;
  for (const url of apiPaths(path)) {
    try {
      const response = await fetch(url, {
        credentials: "include",
        signal: options?.signal,
        headers: JSON_HEADERS,
        method: "POST",
        body: JSON.stringify({ first_session_message: message }),
      });
      if (!response.ok) continue;
      const json: unknown = await response.json();
      const title = stringValue(asRecord(json).title);
      if (title) return title;
    } catch {
      if (options?.signal?.aborted) return null;
    }
  }
  return null;
}
