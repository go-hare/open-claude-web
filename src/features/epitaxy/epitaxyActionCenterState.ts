/**
 * Official c11959232 Pw residual (product host-loop subset).
 *
 * Official attention (non-coordinator branch):
 *   working = f.has(id)  → product SessionSummary.isRunning
 *   blocked: requires_action | pending_action | kn(status_category)
 *   local unread: ONLY bn() unreadIds set membership (r.has(id)) — NOT bare
 *     session.isUnread. Host isUnread is CodeStatusGlyph ready residual
 *     (hasCompleted && isUnread).
 *   remote unread: ccr_unread_indicator_main && type==="remote" && isUnread
 *     (product has no remote Action Center feed yet — do not invent)
 *   skip archived + starred (product: isPinned as star stand-in)
 *   PR list g: empty without PR BFF — do not invent
 *   allClear = attention empty && PR empty
 *   greetEmpty = !loading && allClear
 *
 * kn residual (product officialIsBlockedPostTurnCategory):
 *   blocked | need_input | failed
 */
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { desktopBridge } from "../../adapters/desktopBridge";
import { useOfficialEpitaxyUnreadIds } from "./session/officialEpitaxyUnreadStore";
import {
  buildEpitaxyActionCenterAttention,
  type ActionCenterSessionRow,
} from "./epitaxyActionCenterAttention";

export type { ActionCenterSessionKind, ActionCenterSessionRow };
export {
  buildEpitaxyActionCenterAttention,
  isActionCenterBlockedCategory,
  sessionTimestampMs,
} from "./epitaxyActionCenterAttention";

export type EpitaxyActionCenterState = {
  activePrEntries: never[];
  allClear: boolean;
  attentionSessions: ActionCenterSessionRow[];
  greetEmpty: boolean;
  hasClearableUnreads: boolean;
  isSessionsLoading: boolean;
};

/** Shared Pw list key — App may prefetch so Tw greets with warm allClear (official vn). */
export const EPITAXY_ACTION_CENTER_SESSIONS_QUERY_KEY = [
  "epitaxy",
  "action-center-sessions",
] as const;

/** Official Es(t, { short: true }) — compact relative for Action Center rows. */
export function formatActionCenterRelativeTime(timestampMs: number, nowMs = Date.now()): string {
  const deltaSec = Math.max(0, Math.floor((nowMs - timestampMs) / 1000));
  if (deltaSec < 60) return `${deltaSec}s`;
  const minutes = Math.floor(deltaSec / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 48) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

/**
 * Official Pw residual. Pass `enabled: false` when a parent already owns the list
 * (home Tw + _w share one fetch) so the hook stays Rules-of-Hooks-safe without
 * a second LocalSessions.list.
 *
 * Cache LocalSessions.list so remounting Code home does not flash empty body while
 * re-IPC (same spirit as official code-stats staleTime / home query keys).
 */
export function useEpitaxyActionCenterState(options?: {
  enabled?: boolean;
}): EpitaxyActionCenterState {
  const enabled = options?.enabled !== false;
  const sessionsQuery = useQuery({
    queryKey: EPITAXY_ACTION_CENTER_SESSIONS_QUERY_KEY,
    queryFn: async () => {
      try {
        return await desktopBridge.LocalSessions.list();
      } catch {
        return [] as SessionSummary[];
      }
    },
    enabled,
    staleTime: 30_000,
    gcTime: Number.POSITIVE_INFINITY,
    // Keep prior list while revalidating (official vn warm store) so Tw does not
    // flip greetEmpty→false → "Welcome back" on every remount/refetch.
    placeholderData: (previous) => previous,
  });
  const sessions = enabled ? (sessionsQuery.data ?? []) : [];
  const unreadIds = useOfficialEpitaxyUnreadIds();
  // Official Pw: isSessionsLoading = isLoadingRemote || isLoadingLocal (cold only).
  // Product: cold miss only — cached / placeholder list is not loading.
  const isSessionsLoading =
    enabled && sessionsQuery.isPending && sessionsQuery.data === undefined;

  const attentionSessions = useMemo(
    () => (enabled ? buildEpitaxyActionCenterAttention(sessions, unreadIds) : []),
    [enabled, sessions, unreadIds],
  );

  // Official PR entries require gh PR residual — empty until product wires it (no invent).
  const activePrEntries = useMemo(() => [] as never[], []);
  const allClear = attentionSessions.length === 0 && activePrEntries.length === 0;
  // Official hasClearableUnreads: unread kind ∩ local unread set.
  const hasClearableUnreads = attentionSessions.some(
    (row) => row.kind === "unread" && unreadIds.has(row.session.id),
  );

  return {
    activePrEntries,
    allClear,
    attentionSessions,
    greetEmpty: !isSessionsLoading && allClear,
    hasClearableUnreads,
    isSessionsLoading,
  };
}

/**
 * Official visible cap residual:
 *   v = +(min-h 800 ?? true) + 3 + +(900 ?? true) + +(1000 ?? false) + +(1100 ?? false)
 *   b = min(v, 5)
 */
export function useActionCenterVisibleCap(): number {
  const [cap, setCap] = useState(() => actionCenterVisibleCapFromWindow());

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return undefined;
    const queries = [
      window.matchMedia("(min-height: 800px)"),
      window.matchMedia("(min-height: 900px)"),
      window.matchMedia("(min-height: 1000px)"),
      window.matchMedia("(min-height: 1100px)"),
    ];
    const update = () => setCap(actionCenterVisibleCapFromWindow());
    update();
    for (const query of queries) {
      query.addEventListener?.("change", update);
    }
    return () => {
      for (const query of queries) {
        query.removeEventListener?.("change", update);
      }
    };
  }, []);

  return cap;
}

function actionCenterVisibleCapFromWindow(): number {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    // Official defaults when matchMedia missing: 800 true, 900 true, 1000 false, 1100 false → 5
    return 5;
  }
  let value = 3;
  if (window.matchMedia("(min-height: 800px)").matches) value += 1;
  if (window.matchMedia("(min-height: 900px)").matches) value += 1;
  if (window.matchMedia("(min-height: 1000px)").matches) value += 1;
  if (window.matchMedia("(min-height: 1100px)").matches) value += 1;
  return Math.min(value, 5);
}
