/**
 * Official c11959232 Pw residual (product host-loop subset).
 *
 * Official attention (non-coordinator branch):
 *   working = f.has(id)  → product SessionSummary.isRunning
 *   CONDITION = working || (status !== requires_action && !pending_action && !kn(category))
 *     true  → maybe unread if !working && unread && status !== running
 *     false → blocked
 *   So pure "running" alone does NOT enter attention; blocked needs requires_action /
 *   pending_action / kn(status_category); unread is separate.
 *   skip archived + starred (product: isPinned as star stand-in)
 *   PR list g: empty without PR BFF — do not invent
 *   allClear = attention empty && PR empty
 *   greetEmpty = !loading && allClear
 *
 * kn residual (product officialIsBlockedPostTurnCategory):
 *   blocked | need_input | failed
 */
import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";

export type ActionCenterSessionKind = "blocked" | "review" | "unread" | "routine";

export type ActionCenterSessionRow = {
  kind: ActionCenterSessionKind;
  session: SessionSummary;
};

export type EpitaxyActionCenterState = {
  activePrEntries: never[];
  allClear: boolean;
  attentionSessions: ActionCenterSessionRow[];
  greetEmpty: boolean;
  hasClearableUnreads: boolean;
  isSessionsLoading: boolean;
};

/** Official kn(status_category) for Action Center attention. */
export function isActionCenterBlockedCategory(category?: string | null): boolean {
  return category === "blocked" || category === "need_input" || category === "failed";
}

/**
 * Map LocalSessions list → attention rows (Pw non-coordinator path).
 * No remote PR / triggerSessions / coordinator jn — those need residual data we do not invent.
 */
export function buildEpitaxyActionCenterAttention(
  sessions: SessionSummary[],
): ActionCenterSessionRow[] {
  const blocked: ActionCenterSessionRow[] = [];
  const unread: ActionCenterSessionRow[] = [];

  for (const session of sessions) {
    if (session.isArchived) continue;
    // Official skips starredIds; product pins are the pin-key stand-in.
    if (session.isPinned) continue;
    // Code Action Center is epitaxy/code local sessions only.
    if (session.kind !== "epitaxy" && session.kind !== "code") continue;
    if (session.sessionKind === "cowork") continue;

    const working = Boolean(session.isRunning);
    const needsAction = Boolean(session.postTurnSummary?.needsAction?.trim());
    const blockedCategory = isActionCenterBlockedCategory(session.postTurnSummary?.statusCategory);
    // Official non-coordinator blocked: requires_action | pending_action | kn(status_category)
    // (working alone does not land in blocked — CONDITION short-circuits to unread branch which then no-ops).
    const isBlocked = needsAction || blockedCategory;

    if (isBlocked) {
      blocked.push({ session, kind: "blocked" });
      continue;
    }

    // Official unread: !working && unread && status !== "running"
    if (!working && session.isUnread) {
      unread.push({ session, kind: "unread" });
    }
  }

  const byTimeDesc = (left: ActionCenterSessionRow, right: ActionCenterSessionRow) =>
    sessionTimestampMs(right.session) - sessionTimestampMs(left.session);

  return [...blocked.sort(byTimeDesc), ...unread.sort(byTimeDesc)];
}

export function sessionTimestampMs(session: SessionSummary): number {
  if (typeof session.updatedAtMs === "number" && Number.isFinite(session.updatedAtMs)) {
    return session.updatedAtMs;
  }
  if (typeof session.createdAtMs === "number" && Number.isFinite(session.createdAtMs)) {
    return session.createdAtMs;
  }
  const parsed = Date.parse(session.updatedAt);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
 */
export function useEpitaxyActionCenterState(options?: {
  enabled?: boolean;
}): EpitaxyActionCenterState {
  const enabled = options?.enabled !== false;
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [isSessionsLoading, setSessionsLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setSessions([]);
      setSessionsLoading(false);
      return undefined;
    }
    let alive = true;
    setSessionsLoading(true);
    void desktopBridge.LocalSessions.list()
      .then((items) => {
        if (!alive) return;
        setSessions(items);
      })
      .catch(() => {
        if (!alive) return;
        setSessions([]);
      })
      .finally(() => {
        if (alive) setSessionsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [enabled]);

  const attentionSessions = useMemo(
    () => (enabled ? buildEpitaxyActionCenterAttention(sessions) : []),
    [enabled, sessions],
  );

  // Official PR entries require gh PR residual — empty until product wires it (no invent).
  const activePrEntries = useMemo(() => [] as never[], []);
  const allClear = attentionSessions.length === 0 && activePrEntries.length === 0;
  // Official hasClearableUnreads: unread kind in local unread set. Product has no clearAll store → false.
  const hasClearableUnreads = false;

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
