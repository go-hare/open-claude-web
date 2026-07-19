/**
 * Official plan inline comments (c11959232 zk / $k / Uk / Hk).
 * Selection comments on Plan pane merge into ExitPlanMode reject feedback.
 *
 * CRITICAL: Vite HMR / dual module graphs must never create a second store.
 * KN/WN write + Wk Uk/x must share one instance or Comment never flips T
 * (card stays Reject/Revise… while plan marks still paint).
 */
import { useCallback, useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";

export type OfficialPlanComment = {
  comment: string;
  endOffset: number;
  id: string;
  selectedText: string;
  startOffset: number;
};

type OfficialPlanCommentsState = {
  bySession: Record<string, OfficialPlanComment[]>;
};

const EMPTY_COMMENTS: OfficialPlanComment[] = [];

const OFFICIAL_PLAN_COMMENTS_STORE_KEY = "__hareOfficialPlanCommentsStore__";
const OFFICIAL_APPROVED_PLANS_KEY = "__hareOfficialApprovedPlans__";
const OFFICIAL_PLAN_COMMENTS_API_KEY = "__hareOfficialPlanCommentsApi__";

type PlanCommentsStore = ReturnType<typeof createPlanCommentsStore>;

type OfficialPlanCommentsStoreGlobal = typeof globalThis & {
  [OFFICIAL_PLAN_COMMENTS_STORE_KEY]?: PlanCommentsStore;
  [OFFICIAL_APPROVED_PLANS_KEY]?: Map<string, ApprovedPlanEntry>;
  [OFFICIAL_PLAN_COMMENTS_API_KEY]?: typeof officialPlanCommentsApi;
};

function createPlanCommentsStore() {
  return createStore<OfficialPlanCommentsState>(() => ({
    bySession: {},
  }));
}

/** Always resolve through globalThis — never close over a module-local store. */
export function getOfficialPlanCommentsStore(): PlanCommentsStore {
  const g = globalThis as OfficialPlanCommentsStoreGlobal;
  return (g[OFFICIAL_PLAN_COMMENTS_STORE_KEY] ??= createPlanCommentsStore());
}

// Eager bind (same pattern as officialCodeSessionStore top-level globalThis).
export const officialPlanCommentsStore = getOfficialPlanCommentsStore();

function updateSessionComments(
  sessionId: string,
  updater: (current: OfficialPlanComment[]) => OfficialPlanComment[],
) {
  const store = getOfficialPlanCommentsStore();
  store.setState((state) => ({
    bySession: {
      ...state.bySession,
      [sessionId]: updater(state.bySession[sessionId] ?? EMPTY_COMMENTS),
    },
  }));
}

/** Official $k — every method hits globalThis singleton. */
export const officialPlanCommentsApi = {
  add(
    sessionId: string,
    comment: Omit<OfficialPlanComment, "id">,
  ): string {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
    updateSessionComments(sessionId, (current) => [...current, { ...comment, id }]);
    return id;
  },
  update(sessionId: string, commentId: string, comment: string) {
    updateSessionComments(sessionId, (current) =>
      current.map((item) => (item.id === commentId ? { ...item, comment } : item)),
    );
  },
  remove(sessionId: string, commentId: string) {
    updateSessionComments(sessionId, (current) => current.filter((item) => item.id !== commentId));
  },
  clear(sessionId: string) {
    const store = getOfficialPlanCommentsStore();
    store.setState((state) => {
      if (!(sessionId in state.bySession)) return state;
      const { [sessionId]: _removed, ...rest } = state.bySession;
      return { bySession: rest };
    });
  },
  get(sessionId: string | undefined | null): OfficialPlanComment[] {
    if (!sessionId) return EMPTY_COMMENTS;
    return getOfficialPlanCommentsStore().getState().bySession[sessionId] ?? EMPTY_COMMENTS;
  },
  rangesOverlap(sessionId: string | undefined | null, start: number, end: number): boolean {
    if (!sessionId) return false;
    return (getOfficialPlanCommentsStore().getState().bySession[sessionId] ?? EMPTY_COMMENTS).some(
      (item) => start < item.endOffset && item.startOffset < end,
    );
  },
};

// CDP / dual-graph callers
(globalThis as OfficialPlanCommentsStoreGlobal)[OFFICIAL_PLAN_COMMENTS_API_KEY] = officialPlanCommentsApi;

/**
 * Official Uk(sessionId).
 * useSyncExternalStore + getOfficialPlanCommentsStore() every subscribe/getSnapshot
 * so HMR re-eval cannot leave Wk on a dead module-local store while KN writes the new one.
 */
export function useOfficialPlanComments(sessionId: string | undefined | null): OfficialPlanComment[] {
  const subscribe = useCallback((onStoreChange: () => void) => {
    return getOfficialPlanCommentsStore().subscribe(onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => {
    if (!sessionId) return EMPTY_COMMENTS;
    return getOfficialPlanCommentsStore().getState().bySession[sessionId] ?? EMPTY_COMMENTS;
  }, [sessionId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => EMPTY_COMMENTS);
}

/** Official Wk x = comment count (length of Uk). */
export function useOfficialPlanCommentCount(sessionId: string | undefined | null): number {
  const subscribe = useCallback((onStoreChange: () => void) => {
    return getOfficialPlanCommentsStore().subscribe(onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => {
    if (!sessionId) return 0;
    return getOfficialPlanCommentsStore().getState().bySession[sessionId]?.length ?? 0;
  }, [sessionId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

/**
 * Official Hk(comments, feedback):
 * sort by startOffset; each block:
 *   On selected text:\n> line\n...\n{comment}
 * join with \n\n; append freeform feedback after \n\n\n when present.
 */
export function mergeOfficialPlanCommentFeedback(
  comments: OfficialPlanComment[],
  feedback: string | undefined | null,
): string {
  const freeform = (feedback ?? "").trim();
  if (comments.length === 0) return freeform;
  const blocks = [...comments]
    .sort((a, b) => a.startOffset - b.startOffset)
    .map((item) => {
      const quoted = item.selectedText
        .split("\n")
        .map((line) => `> ${line}`)
        .join("\n");
      return `On selected text:\n${quoted}\n${item.comment}`;
    });
  const joined = blocks.join("\n\n");
  return freeform ? `${joined}\n\n\n${freeform}` : joined;
}

/** Mfe approvedPlans seed (index-BELzQL5P setApprovedPlan) — separate from XN pane parse. */
type ApprovedPlanEntry = { approvedAt: number; plan: string; sessionId: string };

function getApprovedPlansMap(): Map<string, ApprovedPlanEntry> {
  const g = globalThis as OfficialPlanCommentsStoreGlobal;
  return (g[OFFICIAL_APPROVED_PLANS_KEY] ??= new Map<string, ApprovedPlanEntry>());
}

const approvedPlanListeners = new Set<() => void>();

function notifyApprovedPlanListeners() {
  for (const listener of approvedPlanListeners) listener();
}

export function setOfficialApprovedPlan(sessionId: string, plan: string) {
  getApprovedPlansMap().set(sessionId, {
    sessionId,
    plan,
    approvedAt: Date.now(),
  });
  notifyApprovedPlanListeners();
}

export function getOfficialApprovedPlan(sessionId: string | undefined | null): string | undefined {
  if (!sessionId) return undefined;
  return getApprovedPlansMap().get(sessionId)?.plan;
}

/** Subscribe to Mfe-style approvedPlans map changes (for rwe rehydrate consumers). */
export function subscribeOfficialApprovedPlans(onStoreChange: () => void): () => void {
  approvedPlanListeners.add(onStoreChange);
  return () => {
    approvedPlanListeners.delete(onStoreChange);
  };
}

/**
 * Official Mfe selector: approvedPlans[sessionId]?.plan with useSyncExternalStore.
 */
export function useOfficialApprovedPlan(sessionId: string | undefined | null): string | undefined {
  const subscribe = useCallback((onStoreChange: () => void) => {
    return subscribeOfficialApprovedPlans(onStoreChange);
  }, []);
  const getSnapshot = useCallback(() => getOfficialApprovedPlan(sessionId), [sessionId]);
  return useSyncExternalStore(subscribe, getSnapshot, () => undefined);
}

// ---------------------------------------------------------------------------
// Official nwe / rwe / jfe / _fe (index-BELzQL5P)
// ---------------------------------------------------------------------------

/**
 * Official nwe(messages): last ExitPlanMode tool_use with plan + whether tool_result exists.
 * Returns { lastPlan, isPending } — isPending when lastPlan exists and no tool_result for its id.
 */
export type OfficialNwePlanScan = {
  isPending: boolean;
  lastPlan?: { id: string; plan: string };
};

export function scanOfficialExitPlanModeFromMessages(
  messages: Array<{ raw?: unknown; role?: string } | Record<string, unknown>>,
): OfficialNwePlanScan {
  const resolvedToolUseIds = new Set<string>();
  let lastPlan: { id: string; plan: string } | undefined;

  for (const message of messages) {
    const outer = (message && typeof message === "object" ? message : {}) as Record<string, unknown>;
    const raw = (outer.raw && typeof outer.raw === "object" ? outer.raw : outer) as Record<string, unknown>;
    // ChatMessage.role path + official CLI envelope type path.
    const type =
      typeof raw.type === "string"
        ? raw.type
        : typeof outer.role === "string"
          ? outer.role
          : typeof raw.role === "string"
            ? raw.role
            : undefined;
    const nested = (raw.message && typeof raw.message === "object" ? raw.message : raw) as Record<string, unknown>;
    const content = nested.content ?? raw.content;

    if (type === "assistant") {
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const item = block as Record<string, unknown>;
        if (item.type !== "tool_use") continue;
        if (item.name !== "ExitPlanMode" && item.name !== "exit_plan_mode") continue;
        const input = (item.input && typeof item.input === "object" ? item.input : {}) as Record<string, unknown>;
        const plan = typeof input.plan === "string" ? input.plan : undefined;
        const id = typeof item.id === "string" ? item.id : undefined;
        if (plan && id) lastPlan = { id, plan };
      }
      continue;
    }

    if (type === "user") {
      if (!Array.isArray(content)) continue;
      for (const block of content) {
        if (!block || typeof block !== "object") continue;
        const item = block as Record<string, unknown>;
        if (item.type !== "tool_result") continue;
        const toolUseId =
          typeof item.tool_use_id === "string"
            ? item.tool_use_id
            : typeof item.toolUseId === "string"
              ? item.toolUseId
              : undefined;
        if (toolUseId) resolvedToolUseIds.add(toolUseId);
      }
    }
  }

  return {
    lastPlan,
    isPending: Boolean(lastPlan && !resolvedToolUseIds.has(lastPlan.id)),
  };
}

/**
 * Official rwe rehydrate effect body:
 *   g = !approved ? nwe(messages) : null
 *   if g?.lastPlan && !approved → setApprovedPlan(session, plan)
 * Seeds Mfe when transcript already contains ExitPlanMode + tool_result (CCR/local recovery).
 */
export function rehydrateOfficialApprovedPlanFromMessages(
  sessionId: string | undefined | null,
  messages: Array<{ raw?: unknown; role?: string } | Record<string, unknown>>,
): OfficialNwePlanScan {
  const scan = scanOfficialExitPlanModeFromMessages(messages);
  if (!sessionId) return scan;
  const already = getOfficialApprovedPlan(sessionId);
  if (already) return scan;
  // Official: only rehydrate approved plan when lastPlan exists and is NOT still pending.
  // (rwe effect uses g = nwe when !p; setApprovedPlan(g.lastPlan.plan) regardless of isPending
  // only when g is computed as (!s || p ? null : nwe). When p is false it still sets from lastPlan
  // even if pending — but modal path uses isPending separately. For local IPC Wk we seed approved
  // only after tool_result exists so "Plan approved" is correct without inventing accept.)
  if (scan.lastPlan && !scan.isPending) {
    setOfficialApprovedPlan(sessionId, scan.lastPlan.plan);
  }
  return scan;
}

/** Official vfe / Cfe / kfe / _fe / jfe — acknowledged-tool-decisions localStorage TTL 5min. */
const ACKNOWLEDGED_TOOL_DECISIONS_KEY = "acknowledged-tool-decisions";
const ACKNOWLEDGED_TOOL_DECISIONS_TTL_MS = 300_000;
const ACKNOWLEDGED_TOOL_DECISIONS_MAX_PER_SESSION = 10;

type AcknowledgedToolDecision = {
  acknowledgedAt: number;
  toolName: string;
  toolUseId: string;
};

type AcknowledgedToolDecisionsMap = Record<string, Record<string, AcknowledgedToolDecision>>;

const OFFICIAL_ACK_DECISIONS_CACHE_KEY = "__hareOfficialAcknowledgedToolDecisions__";

type AckGlobal = typeof globalThis & {
  [OFFICIAL_ACK_DECISIONS_CACHE_KEY]?: AcknowledgedToolDecisionsMap;
};

function loadAcknowledgedToolDecisions(): AcknowledgedToolDecisionsMap {
  const g = globalThis as AckGlobal;
  if (g[OFFICIAL_ACK_DECISIONS_CACHE_KEY]) return g[OFFICIAL_ACK_DECISIONS_CACHE_KEY]!;
  if (typeof window === "undefined") {
    g[OFFICIAL_ACK_DECISIONS_CACHE_KEY] = {};
    return g[OFFICIAL_ACK_DECISIONS_CACHE_KEY]!;
  }
  try {
    const raw = window.localStorage.getItem(ACKNOWLEDGED_TOOL_DECISIONS_KEY);
    if (!raw) {
      g[OFFICIAL_ACK_DECISIONS_CACHE_KEY] = {};
      return g[OFFICIAL_ACK_DECISIONS_CACHE_KEY]!;
    }
    const parsed = JSON.parse(raw) as AcknowledgedToolDecisionsMap;
    const now = Date.now();
    const next: AcknowledgedToolDecisionsMap = {};
    for (const [sessionId, byId] of Object.entries(parsed ?? {})) {
      if (!byId || typeof byId !== "object") continue;
      const kept: Record<string, AcknowledgedToolDecision> = {};
      for (const [toolUseId, entry] of Object.entries(byId)) {
        if (
          entry
          && typeof entry.acknowledgedAt === "number"
          && now - entry.acknowledgedAt < ACKNOWLEDGED_TOOL_DECISIONS_TTL_MS
        ) {
          kept[toolUseId] = entry;
        }
      }
      if (Object.keys(kept).length > 0) next[sessionId] = kept;
    }
    g[OFFICIAL_ACK_DECISIONS_CACHE_KEY] = next;
    return next;
  } catch {
    g[OFFICIAL_ACK_DECISIONS_CACHE_KEY] = {};
    return g[OFFICIAL_ACK_DECISIONS_CACHE_KEY]!;
  }
}

function persistAcknowledgedToolDecisions(map: AcknowledgedToolDecisionsMap) {
  const g = globalThis as AckGlobal;
  g[OFFICIAL_ACK_DECISIONS_CACHE_KEY] = map;
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ACKNOWLEDGED_TOOL_DECISIONS_KEY, JSON.stringify(map));
  } catch {
    // Official logs warn; ignore write failures (private mode / quota).
  }
}

/** Official _fe(sessionId, toolUseId, toolName). */
export function acknowledgeOfficialToolDecision(
  sessionId: string,
  toolUseId: string,
  toolName: string,
) {
  if (!sessionId || !toolUseId) return;
  const map = { ...loadAcknowledgedToolDecisions() };
  const sessionEntries = { ...(map[sessionId] ?? {}) };
  sessionEntries[toolUseId] = {
    toolUseId,
    toolName,
    acknowledgedAt: Date.now(),
  };
  const ranked = Object.entries(sessionEntries);
  if (ranked.length > ACKNOWLEDGED_TOOL_DECISIONS_MAX_PER_SESSION) {
    ranked.sort((a, b) => a[1].acknowledgedAt - b[1].acknowledgedAt);
    for (const [id] of ranked.slice(0, ranked.length - ACKNOWLEDGED_TOOL_DECISIONS_MAX_PER_SESSION)) {
      delete sessionEntries[id];
    }
  }
  map[sessionId] = sessionEntries;
  persistAcknowledgedToolDecisions(map);
}

/** Official jfe(sessionId, toolUseId) — true if acknowledged within TTL. */
export function isOfficialToolDecisionAcknowledged(
  sessionId: string | undefined | null,
  toolUseId: string | undefined | null,
): boolean {
  if (!sessionId || !toolUseId) return false;
  const entry = loadAcknowledgedToolDecisions()[sessionId]?.[toolUseId];
  return Boolean(entry && Date.now() - entry.acknowledgedAt < ACKNOWLEDGED_TOOL_DECISIONS_TTL_MS);
}
