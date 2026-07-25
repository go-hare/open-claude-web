import { useEffect } from "react";
import type { RawAccountDetails } from "../adapters/desktopBridge";

export type DesktopCoworkAccountDetails = RawAccountDetails;

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function accountDetailsFromBootstrap(
  value: unknown,
): DesktopCoworkAccountDetails {
  const root = record(value);
  const account = record(root.account);
  const accountUuid = string(account.uuid);
  return {
    accountTaggedId: string(account.tagged_id),
    accountUuid,
    displayName: string(account.display_name),
    emailAddress: string(account.email_address),
    fullName: string(account.full_name),
    hasWiggle: account.has_wiggle === true,
    isLoggedOut: !accountUuid,
    isRaven: account.is_raven === true,
  };
}

/**
 * Official residual: bootstrap lives on app://localhost/api/bootstrap (custom3p
 * handler). accountSettingsApi.tryUrls uses the same order.
 * Dev Vite on http://localhost:5176 has no /api/* — relative fetch returns SPA
 * HTML and must not be treated as a successful bootstrap payload.
 */
export function bootstrapUrls(path = "/api/bootstrap"): string[] {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return [`app://localhost${normalized}`, normalized];
}

async function fetchBootstrapJson(
  urls: string[] = bootstrapUrls(),
): Promise<unknown> {
  let lastError: unknown;
  for (const url of urls) {
    try {
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        lastError = new Error(`Bootstrap failed with ${response.status} for ${url}`);
        continue;
      }
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("json")) {
        return await response.json();
      }
      const text = await response.text();
      if (text.startsWith("{") || text.startsWith("[")) {
        return JSON.parse(text) as unknown;
      }
      // SPA HTML / non-JSON — try next URL (do not invent logout).
      lastError = new Error(`Bootstrap non-JSON from ${url}`);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("Bootstrap unavailable");
}

async function loadBootstrapAccount(): Promise<DesktopCoworkAccountDetails> {
  return accountDetailsFromBootstrap(await fetchBootstrapJson());
}

export async function syncDesktopCoworkAccount(
  setAccountDetails: (details: DesktopCoworkAccountDetails) => Promise<unknown> | unknown,
  signal: AbortSignal,
  loadAccount: () => Promise<DesktopCoworkAccountDetails> = loadBootstrapAccount,
): Promise<void> {
  try {
    const details = await loadAccount();
    if (!signal.aborted) await setAccountDetails(details);
  } catch {
    // The official renderer only publishes resolved auth state. A bootstrap
    // transport failure is not a logout event; Desktop performs its own wait
    // and bootstrap recovery before initializing Cowork sessions.
  }
}

export function useDesktopCoworkAccountSync(): void {
  useEffect(() => {
    const bridge = window["claude.web"]?.Account;
    if (!bridge?.setAccountDetails) return;

    let controller = new AbortController();
    const run = () => {
      controller.abort();
      controller = new AbortController();
      void syncDesktopCoworkAccount(
        (details) => bridge.setAccountDetails?.(details),
        controller.signal,
      );
    };

    // Official gbA residual: publish account when bootstrap resolves.
    // Soft SPA: re-publish after clear / 3p write so CoworkSessionRepository
    // waitForIdentity does not sit on sticky isLoggedOut for 5s ("Loading Cowork").
    run();
    window.addEventListener("app:auth-signed-in", run);
    window.addEventListener("app:auth-logged-out", run);
    window.addEventListener("app:deployment-mode-changed", run);
    return () => {
      controller.abort();
      window.removeEventListener("app:auth-signed-in", run);
      window.removeEventListener("app:auth-logged-out", run);
      window.removeEventListener("app:deployment-mode-changed", run);
    };
  }, []);
}
