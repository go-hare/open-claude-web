import { useCallback, useEffect, useRef, useState } from "react";
import { queryClient } from "../../../app/queryClient";
import { BOOTSTRAP_QUERY_KEY } from "../../settings/bootstrapQuery";

/**
 * Official c119 residual:
 *   [n,a]=fc("epitaxy-perm-mode-acks", Nm, {scope:"account"})
 * ca0135 `co` / fc account scope:
 *   a = scope==="account"
 *   l = a ? `${t}.${account.uuid}` : t
 *   storage key = `persisted.${l}`
 *   write only when !a || uuid defined
 * Ack entries remain `${workspace}:${mode}`.
 */
const ACK_BASE_KEY = "epitaxy-perm-mode-acks";
const LEGACY_ACK_KEY = "epitaxy-perm-mode-acks";

/** Official Sm(e): modes that require first-use confirm dialog. */
export function isDangerousPermissionMode(mode: string): mode is "auto" | "bypassPermissions" {
  return mode === "auto" || mode === "bypassPermissions";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Bootstrap account uuid for residual fc account scope (no invent). */
export function bootstrapAccountUuidForStorage(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    // Product App seeds BOOTSTRAP_QUERY_KEY; residual uses account context e().uuid.
    const fromQuery = queryClient.getQueryData(BOOTSTRAP_QUERY_KEY);
    const queryUuid = record(record(fromQuery).account).uuid;
    if (typeof queryUuid === "string" && queryUuid.length > 0) return queryUuid;
  } catch {
    /* ignore */
  }
  try {
    const w = window as unknown as {
      __CLAUDE_BOOTSTRAP__?: unknown;
      __bootstrap?: unknown;
    };
    for (const root of [w.__CLAUDE_BOOTSTRAP__, w.__bootstrap]) {
      const uuid = record(record(root).account).uuid;
      if (typeof uuid === "string" && uuid.length > 0) return uuid;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

/** Official `persisted.${key}.${accountUuid}` when scope is account. */
export function epitaxyPermModeAcksStorageKey(accountUuid: string | undefined): string | null {
  if (!accountUuid) return null;
  return `persisted.${ACK_BASE_KEY}.${accountUuid}`;
}

function parseAckList(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function readAcks(accountUuid: string | undefined): string[] {
  if (typeof window === "undefined") return [];
  const key = epitaxyPermModeAcksStorageKey(accountUuid);
  // Residual: account scope without uuid → no durable read/write (empty list).
  if (!key) return [];
  try {
    const scoped = parseAckList(window.localStorage.getItem(key));
    if (scoped.length > 0) return scoped;
    // One-shot migrate product legacy bare key into account-scoped key.
    const legacy = parseAckList(window.localStorage.getItem(LEGACY_ACK_KEY));
    if (legacy.length > 0) {
      window.localStorage.setItem(key, JSON.stringify(legacy));
      return legacy;
    }
    return [];
  } catch {
    return [];
  }
}

function writeAcks(accountUuid: string | undefined, next: string[]) {
  if (typeof window === "undefined") return;
  const key = epitaxyPermModeAcksStorageKey(accountUuid);
  // Residual co: if (!c) return — no write without account uuid when scope is account.
  if (!key) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // ignore quota / private mode
  }
}

function ackKey(workspace: string, mode: string) {
  return `${workspace}:${mode}`;
}

/**
 * Official c119 hook around `epitaxy-perm-mode-acks` (account-scoped list):
 * select(mode) → if Sm(mode) and workspace not acked → confirming; else commit.
 * confirm() → append `${workspace}:${mode}` ack and commit.
 */
export function usePermissionModeConfirm(
  workspace: string | null | undefined,
  commit: (mode: string) => void | Promise<void>,
) {
  const accountUuid = bootstrapAccountUuidForStorage();
  const [confirming, setConfirming] = useState<"auto" | "bypassPermissions" | null>(null);
  const [acks, setAcks] = useState<string[]>(() => readAcks(accountUuid));
  const acksRef = useRef(acks);
  const commitRef = useRef(commit);
  const accountUuidRef = useRef(accountUuid);

  useEffect(() => {
    acksRef.current = acks;
  }, [acks]);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

  // Re-load when bootstrap account identity appears/changes (residual fc key = base.uuid).
  useEffect(() => {
    accountUuidRef.current = accountUuid;
    setAcks(readAcks(accountUuid));
  }, [accountUuid]);

  const select = useCallback(
    (mode: string) => {
      const ws = workspace?.trim() ?? "";
      if (!isDangerousPermissionMode(mode) || (ws && acksRef.current.includes(ackKey(ws, mode)))) {
        void commitRef.current(mode);
        return;
      }
      setConfirming(mode);
    },
    [workspace],
  );

  const confirm = useCallback(() => {
    const mode = confirming;
    if (!mode) return;
    const ws = workspace?.trim() ?? "";
    if (ws) {
      const key = ackKey(ws, mode);
      setAcks((current) => {
        if (current.includes(key)) return current;
        const next = [...current, key];
        writeAcks(accountUuidRef.current, next);
        return next;
      });
    }
    setConfirming(null);
    void commitRef.current(mode);
  }, [confirming, workspace]);

  const cancel = useCallback(() => {
    setConfirming(null);
  }, []);

  return {
    cancel,
    confirm,
    confirming,
    select,
    workspace: workspace?.trim() || null,
  };
}
