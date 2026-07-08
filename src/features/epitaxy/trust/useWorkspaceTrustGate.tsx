import { useCallback, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { desktopBridge, type WorkspaceTrustResult } from "../../../adapters/desktopBridge";
import { OfficialTrustModal } from "./OfficialTrustModal";

type PendingTrust = {
  afterAccept: () => void;
  cwd: string;
  sources: string[];
};

const staleTime = 300_000;

function workspaceTrustKey(cwd: string, sshHost?: string) {
  return ["epitaxy", "workspace-trust", sshHost ?? "local", cwd] as const;
}

export function useWorkspaceTrustGate(cwd?: string) {
  const queryClient = useQueryClient();
  const [pendingTrust, setPendingTrust] = useState<PendingTrust | null>(null);

  const checkTrust = useCallback((targetCwd: string) => queryClient.fetchQuery({
    queryKey: workspaceTrustKey(targetCwd),
    queryFn: async () => normalizeTrustResult(await desktopBridge.LocalSessions.checkTrust?.(targetCwd)),
    staleTime,
    meta: { noToast: true, silent: true },
  }), [queryClient]);

  const prefetchTrust = useCallback((targetCwd: string) => queryClient.prefetchQuery({
    queryKey: workspaceTrustKey(targetCwd),
    queryFn: async () => normalizeTrustResult(await desktopBridge.LocalSessions.checkTrust?.(targetCwd)),
    staleTime,
    meta: { noToast: true, silent: true },
  }), [queryClient]);

  const saveTrust = useCallback(async (targetCwd: string) => {
    await desktopBridge.LocalSessions.saveTrust?.(targetCwd);
    queryClient.setQueryData(workspaceTrustKey(targetCwd), { trusted: true, sources: [] } satisfies WorkspaceTrustResult);
  }, [queryClient]);

  useEffect(() => {
    if (!cwd) return;
    void prefetchTrust(cwd);
  }, [cwd, prefetchTrust]);

  const ensureTrusted = useCallback(async (targetCwd: string | undefined, afterAccept: () => void) => {
    if (!targetCwd) {
      afterAccept();
      return true;
    }

    const trust = await checkTrust(targetCwd);
    if (trust.trusted) {
      afterAccept();
      return true;
    }

    setPendingTrust({ afterAccept, cwd: targetCwd, sources: trust.sources });
    return false;
  }, [checkTrust]);

  const acceptTrust = useCallback(() => {
    const pending = pendingTrust;
    if (!pending) return;
    void saveTrust(pending.cwd).then(() => {
      setPendingTrust(null);
      pending.afterAccept();
    });
  }, [pendingTrust, saveTrust]);

  const declineTrust = useCallback(() => setPendingTrust(null), []);

  const modal = (
    <OfficialTrustModal
      isOpen={pendingTrust !== null}
      onAccept={acceptTrust}
      onDecline={declineTrust}
      sources={pendingTrust?.sources ?? []}
      workspace={pendingTrust?.cwd ?? ""}
    />
  );

  return { ensureTrusted, modal, prefetchTrust, saveTrust };
}

function normalizeTrustResult(value: unknown): WorkspaceTrustResult {
  if (!value || typeof value !== "object") return { trusted: true, sources: [] };
  const raw = value as { sources?: unknown; trusted?: unknown };
  return {
    sources: Array.isArray(raw.sources) ? raw.sources.filter((source): source is string => typeof source === "string") : [],
    trusted: raw.trusted !== false,
  };
}
