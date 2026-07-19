import { useCallback, useEffect, useRef, useState } from "react";

const ACK_STORAGE_KEY = "epitaxy-perm-mode-acks";

/** Official Sm(e): modes that require first-use confirm dialog. */
export function isDangerousPermissionMode(mode: string): mode is "auto" | "bypassPermissions" {
  return mode === "auto" || mode === "bypassPermissions";
}

function readAcks(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(ACK_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function writeAcks(next: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACK_STORAGE_KEY, JSON.stringify(next));
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
  const [confirming, setConfirming] = useState<"auto" | "bypassPermissions" | null>(null);
  const [acks, setAcks] = useState<string[]>(() => readAcks());
  const acksRef = useRef(acks);
  const commitRef = useRef(commit);

  useEffect(() => {
    acksRef.current = acks;
  }, [acks]);

  useEffect(() => {
    commitRef.current = commit;
  }, [commit]);

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
        writeAcks(next);
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
