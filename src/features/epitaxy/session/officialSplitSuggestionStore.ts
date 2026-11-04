/**
 * Official c11959232 `yd` / `vd` / `bd` / `xd` / `wd` / `Td` (CDBo_AYC).
 *
 * Persist name `epitaxy-split-suggestion`, partialize:
 *   shownCount, accepted, dismissCount, lastDismissedAt
 *
 * RAM: partner, pairKeys, shownThisRun, impressionSpent.
 *
 * Trigger `vd`: last 4 recents keys alternate A B A B within 30s; partner = n[n.length-2].ref.
 * Skip: extra code panes, shownCount>=3, accepted, shownThisRun, cooldown `hd=[0,1d,7d]`.
 * Accept: `addPane(..., "suggestion_card")` then `accepted:true`.
 */
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";
import { paneRefFromPath, paneRefKey, paneStore, type PaneRef } from "../../../stores/paneStore";

export const OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY = "epitaxy-split-suggestion";

/** Official `md`. */
const DAY_MS = 864e5;
/** Official `hd=[0,md,7*md]`. */
export const OFFICIAL_SPLIT_SUGGESTION_COOLDOWN_MS = [0, DAY_MS, 7 * DAY_MS] as const;
/** Official `gd=8`. */
const VISIT_CAP = 8;
/** Official `vd` window: `t-r.at>3e4`. */
const ALTERNATE_WINDOW_MS = 3e4;
const MAX_SHOWS = 3;

export type OfficialSplitSuggestionVisit = {
  at: number;
  key: string;
  ref: PaneRef;
};

type OfficialSplitSuggestionState = {
  accept: () => void;
  accepted: boolean;
  dismiss: () => void;
  dismissCount: number;
  impressionSpent: boolean;
  lastDismissedAt: number;
  pairKeys: [string, string] | null;
  partner: PaneRef | null;
  repoint: (partner: PaneRef) => void;
  retract: () => void;
  shown: () => void;
  shownCount: number;
  shownThisRun: boolean;
  trigger: (partner: PaneRef, currentKey: string) => void;
};

let visitRing: OfficialSplitSuggestionVisit[] = [];

const memoryPersist = new Map<string, string>();
const memoryStorage: Storage = {
  getItem: (name) => memoryPersist.get(name) ?? null,
  setItem: (name, value) => {
    memoryPersist.set(name, value);
  },
  removeItem: (name) => {
    memoryPersist.delete(name);
  },
  clear: () => {
    memoryPersist.clear();
  },
  key: (index) => [...memoryPersist.keys()][index] ?? null,
  get length() {
    return memoryPersist.size;
  },
};

function officialSplitSuggestionStorage(): Storage {
  return typeof localStorage !== "undefined" ? localStorage : memoryStorage;
}

export const officialSplitSuggestionStore = createStore<OfficialSplitSuggestionState>()(
  persist(
    (set) => ({
      shownCount: 0,
      accepted: false,
      dismissCount: 0,
      lastDismissedAt: 0,
      partner: null,
      pairKeys: null,
      shownThisRun: false,
      impressionSpent: false,
      trigger: (partner, currentKey) =>
        set({
          partner,
          pairKeys: [currentKey, paneRefKey(partner)],
          shownThisRun: true,
          impressionSpent: false,
        }),
      shown: () =>
        set((state) => (state.impressionSpent ? state : { shownCount: state.shownCount + 1, impressionSpent: true })),
      repoint: (partner) => set({ partner }),
      dismiss: () =>
        set((state) => ({
          partner: null,
          pairKeys: null,
          dismissCount: state.dismissCount + 1,
          lastDismissedAt: Date.now(),
        })),
      accept: () => set({ partner: null, pairKeys: null, accepted: true }),
      retract: () => set({ partner: null, pairKeys: null }),
    }),
    {
      name: OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY,
      storage: createJSONStorage(() => officialSplitSuggestionStorage()),
      partialize: (state) => ({
        shownCount: state.shownCount,
        accepted: state.accepted,
        dismissCount: state.dismissCount,
        lastDismissedAt: state.lastDismissedAt,
      }),
    },
  ),
);

/** Official `vd`. */
export function officialSplitSuggestionPartnerFromVisits(
  visits: readonly OfficialSplitSuggestionVisit[],
  now: number,
): PaneRef | null {
  if (visits.length < 4) return null;
  const lastFour = visits.slice(-4);
  const first = lastFour[0];
  if (first === undefined || now - first.at > ALTERNATE_WINDOW_MS) return null;
  for (let i = 0; i < lastFour.length - 1; i += 1) {
    if (lastFour[i]?.key === lastFour[i + 1]?.key) return null;
  }
  for (let i = 0; i < lastFour.length - 2; i += 1) {
    if (lastFour[i]?.key !== lastFour[i + 2]?.key) return null;
  }
  return lastFour[lastFour.length - 2]?.ref ?? null;
}

/** Official `ba` / shared-11 `ts` — CLI local ids are not recents-split candidates. */
export function isOfficialCliLocalSessionId(sessionId: string) {
  return sessionId.startsWith("local_cli_");
}

/** Official `bd`. */
export function maybeTriggerOfficialSplitSuggestion(now = Date.now()) {
  const state = officialSplitSuggestionStore.getState();
  if (state.partner !== null || state.shownThisRun || state.accepted || state.shownCount >= MAX_SHOWS) return;
  const cooldown = OFFICIAL_SPLIT_SUGGESTION_COOLDOWN_MS[
    Math.min(state.dismissCount, OFFICIAL_SPLIT_SUGGESTION_COOLDOWN_MS.length - 1)
  ];
  let lastDismissedAt = state.lastDismissedAt;
  if (lastDismissedAt > now) {
    lastDismissedAt = now;
    officialSplitSuggestionStore.setState({ lastDismissedAt: now });
  }
  if (cooldown !== undefined && now - lastDismissedAt < cooldown) return;
  if ((paneStore.getState().extraPanesByMode.code ?? []).length > 0) return;
  const partner = officialSplitSuggestionPartnerFromVisits(visitRing, now);
  const last = visitRing[visitRing.length - 1];
  if (partner !== null && last !== undefined) state.trigger(partner, last.key);
}

export function retractOfficialSplitSuggestion() {
  const state = officialSplitSuggestionStore.getState();
  if (state.pairKeys !== null) state.retract();
}

/** Official `xd`. */
export function officialNoteSplitSuggestionPath(pathname: string) {
  const ref = paneRefFromPath(pathname);
  if (ref === null || ref.kind !== "code") {
    retractOfficialSplitSuggestion();
    return;
  }
  officialNoteSplitSuggestionRef(ref);
}

/** Official `wd`. */
export function officialNoteSplitSuggestionRef(ref: PaneRef) {
  if (ref.kind !== "code" || isOfficialCliLocalSessionId(ref.id)) {
    retractOfficialSplitSuggestion();
    return;
  }
  const key = paneRefKey(ref);
  const state = officialSplitSuggestionStore.getState();
  const last = visitRing[visitRing.length - 1];
  if (state.pairKeys !== null) {
    if (state.pairKeys.includes(key)) {
      if (state.partner !== null && key === paneRefKey(state.partner) && last !== undefined && last.key !== key) {
        state.repoint(last.ref);
      }
    } else {
      state.retract();
    }
  }
  if (last !== undefined && last.key === key) return;
  const at = Date.now();
  visitRing.push({ key, ref, at });
  if (visitRing.length > VISIT_CAP) visitRing.shift();
  maybeTriggerOfficialSplitSuggestion(at);
}

/**
 * Official `Ed` accept: `f(l, mt(), a, void 0, "suggestion_card")` then `p()`.
 * Product `addPane` already exists — via is telemetry-only in official `qr`.
 */
export function acceptOfficialSplitSuggestion(currentKey: string) {
  const partner = officialSplitSuggestionStore.getState().partner;
  if (partner === null) return;
  paneStore.addPane("code", currentKey, partner, undefined, "suggestion_card");
  officialSplitSuggestionStore.getState().accept();
}

export function officialSplitSuggestionCurrentKey(pathname: string, sessionRef?: PaneRef | { id: string } | null) {
  if (sessionRef?.id) {
    return paneRefKey({ kind: "code", id: sessionRef.id });
  }
  const fromPath = paneRefFromPath(pathname);
  return fromPath ? paneRefKey(fromPath) : "";
}

/** Official `Td` — pathname + extraPanes subscribe. Cleanup unsubscribes only. */
export function bindOfficialSplitSuggestion(options: {
  enabled: boolean;
  pathname?: string;
  sessionRef?: PaneRef | { id: string } | null;
}): () => void {
  if (!options.enabled) {
    retractOfficialSplitSuggestion();
    return () => {};
  }

  const readPath = () => options.pathname ?? (typeof window === "undefined" ? "" : window.location.pathname);

  if (options.sessionRef !== undefined) {
    if (options.sessionRef?.id) {
      officialNoteSplitSuggestionRef({ kind: "code", id: options.sessionRef.id });
    } else {
      retractOfficialSplitSuggestion();
    }
  } else {
    officialNoteSplitSuggestionPath(readPath());
  }

  const extraPanes = paneStore.getState().extraPanesByMode.code ?? [];
  if (extraPanes.length > 0) retractOfficialSplitSuggestion();

  const unsubPanes = paneStore.subscribe(() => {
    if ((paneStore.getState().extraPanesByMode.code ?? []).length > 0) {
      retractOfficialSplitSuggestion();
    }
  });

  const onNav = () => {
    if (options.sessionRef !== undefined || options.pathname !== undefined) return;
    officialNoteSplitSuggestionPath(window.location.pathname);
  };
  if (typeof window !== "undefined") {
    window.addEventListener("app:navigation", onNav);
    window.addEventListener("popstate", onNav);
  }

  return () => {
    unsubPanes();
    if (typeof window !== "undefined") {
      window.removeEventListener("app:navigation", onNav);
      window.removeEventListener("popstate", onNav);
    }
  };
}

export function resetOfficialSplitSuggestionForTests() {
  visitRing = [];
  officialSplitSuggestionStore.persist.clearStorage();
  officialSplitSuggestionStore.setState({
    shownCount: 0,
    accepted: false,
    dismissCount: 0,
    lastDismissedAt: 0,
    partner: null,
    pairKeys: null,
    shownThisRun: false,
    impressionSpent: false,
  });
}

export function officialSplitSuggestionVisitsForTests() {
  return visitRing.slice();
}

export function officialSplitSuggestionPersistRawForTests() {
  try {
    return officialSplitSuggestionStorage().getItem(OFFICIAL_SPLIT_SUGGESTION_PERSIST_KEY);
  } catch {
    return null;
  }
}
