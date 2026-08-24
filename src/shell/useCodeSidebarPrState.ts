/**
 * Official Code sidebar PR glyph data plane (index-BELzQL5P yje → u_e pr branch).
 *
 * Prefer session.prs (host AutoArchive / getPrState cache); else lazy
 * LocalSessions.getPrStateForBranch — same residual as branch rows.
 */
import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../adapters/desktopBridge";
import type { OfficialCodePrState } from "./OfficialSidebarStatusGlyph";
import {
  aggregateOfficialCodePrState,
  officialCodePrStateFromLocal,
} from "./codeSidebarPrState";

export {
  aggregateOfficialCodePrState,
  officialCodePrStateFromLocal,
  type SessionPrRef,
} from "./codeSidebarPrState";

const prStateCache = new Map<string, OfficialCodePrState>();
const prStateInflight = new Map<string, Promise<OfficialCodePrState>>();

function cacheKey(session: Pick<SessionSummary, "id" | "repo" | "cwd">): string {
  const branch = session.repo?.branch ?? "";
  return `${session.id}::${branch}`;
}

function isCodeSession(session: SessionSummary): boolean {
  return session.kind === "code" || session.sessionKind === "code";
}

async function fetchOfficialCodePrState(session: SessionSummary): Promise<OfficialCodePrState> {
  const key = cacheKey(session);
  const cached = prStateCache.get(key);
  if (cached) return cached;
  const inflight = prStateInflight.get(key);
  if (inflight) return inflight;

  const run = (async () => {
    try {
      const getPr = desktopBridge.LocalSessions.getPrStateForBranch;
      if (!getPr) {
        prStateCache.set(key, "none");
        return "none" as OfficialCodePrState;
      }
      const branch = session.repo?.branch;
      const pr = await getPr(session.id, branch);
      const state = officialCodePrStateFromLocal(pr);
      prStateCache.set(key, state);
      return state;
    } catch {
      prStateCache.set(key, "none");
      return "none" as OfficialCodePrState;
    } finally {
      prStateInflight.delete(key);
    }
  })();
  prStateInflight.set(key, run);
  return run;
}

/**
 * Official yje prState for sidebar CodeStatusGlyph.
 * Prefer session.prs; else lazy branch PR lookup.
 */
export function useCodeSidebarPrState(session: SessionSummary): OfficialCodePrState | undefined {
  const fromPrs = useMemo(() => {
    if (!isCodeSession(session)) return undefined;
    const prs = session.prs;
    if (!Array.isArray(prs) || prs.length === 0) return undefined;
    return aggregateOfficialCodePrState(prs.map((pr) => officialCodePrStateFromLocal(pr)));
  }, [session]);

  const [fetched, setFetched] = useState<OfficialCodePrState | undefined>(() => {
    if (!isCodeSession(session)) return undefined;
    return prStateCache.get(cacheKey(session));
  });

  useEffect(() => {
    if (!isCodeSession(session)) {
      setFetched(undefined);
      return;
    }
    if (fromPrs && fromPrs !== "none") {
      prStateCache.set(cacheKey(session), fromPrs);
      setFetched(fromPrs);
      return;
    }
    let cancelled = false;
    void fetchOfficialCodePrState(session).then((state) => {
      if (!cancelled) setFetched(state);
    });
    return () => {
      cancelled = true;
    };
  }, [session, fromPrs]);

  if (!isCodeSession(session)) return undefined;
  if (fromPrs && fromPrs !== "none") return fromPrs;
  return fetched;
}

/** Test helper — clear module cache between unit tests. */
export function clearCodeSidebarPrStateCache() {
  prStateCache.clear();
  prStateInflight.clear();
}

/**
 * Official H5.removePrsForSession residual for sidebar glyph cache:
 * drop keys equal to sessionId or starting with `${sessionId}:` / `${sessionId}::`.
 */
export function removeCodeSidebarPrStateForSession(sessionId: string) {
  if (!sessionId) return;
  for (const key of [...prStateCache.keys()]) {
    if (key === sessionId || key.startsWith(`${sessionId}:`) || key.startsWith(`${sessionId}::`)) {
      prStateCache.delete(key);
    }
  }
  for (const key of [...prStateInflight.keys()]) {
    if (key === sessionId || key.startsWith(`${sessionId}:`) || key.startsWith(`${sessionId}::`)) {
      prStateInflight.delete(key);
    }
  }
}
