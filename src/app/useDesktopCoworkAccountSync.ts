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

async function loadBootstrapAccount(): Promise<DesktopCoworkAccountDetails> {
  const response = await fetch("/api/bootstrap", { credentials: "include" });
  if (!response.ok) throw new Error(`Bootstrap failed with ${response.status}`);
  return accountDetailsFromBootstrap(await response.json());
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
    const controller = new AbortController();
    void syncDesktopCoworkAccount(
      (details) => bridge.setAccountDetails?.(details),
      controller.signal,
    );
    return () => controller.abort();
  }, []);
}
