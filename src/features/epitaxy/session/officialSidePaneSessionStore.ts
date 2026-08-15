/**
 * Residual ca0135bc5 `Nr` session-switch + tileLayout tree.
 *
 * Official:
 * - Nr(e) factory → per-pane store (kI sidePanePersistKey)
 * - Primary: epitaxy.sidePaneStore.v1
 * - Secondary: epitaxy.sidePaneStore.v1.{tr|br|bl}
 * - Ar registry + Dr register; Kr(sessionId) evicts every live store + localStorage maps
 * - Live: tileLayout, sidePane, transcriptMode, Lr views, previewServerId
 * - tileLayoutBySession / transcriptModeBySession / previewServerIdBySession
 * - setSidePane / toggleSidePane / closeSidePane via residual ur/Zs/ir
 * - reset(sessionId): same-session strip preview+framebuffer; cross: xr save live tree, strip restore
 * - partialize: tileLayout + bySession maps + currentSessionId + live views + previewServerId
 *
 * Multi-pane ownership: each chat panel uses its own Nr instance (not one shared singleton).
 * Persist v2 migrates legacy sideTilesBySession[] → tileLayoutBySession via residualLayoutFromSideTiles.
 */
import {
  createContext,
  createElement,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore, type StoreApi } from "zustand/vanilla";
import type { OfficialTranscriptMode, OfficialViewPane } from "../OfficialEpitaxyComponents";
import type { OfficialFileViewTarget } from "./OfficialFilePane";
import type { OfficialSubagentTarget } from "./epitaxyTranscriptActionContext";
import {
  residualChatOnlyLayout,
  residualIr,
  residualLayoutFromSideTiles,
  residualNonChatTileIds,
  residualSameSessionStripTileLayout,
  residualStripRestoredTileLayout,
  residualUr,
  residualZs,
  type ResidualTileLayout,
} from "./officialTileLayout";

/** Residual mr / EPITAXY_SIDE_PANE_PERSIST_KEY. */
export const EPITAXY_SIDE_PANE_PERSIST_KEY = "epitaxy.sidePaneStore.v1";

/** Residual yr — primary + secondary slot persist keys. */
export const EPITAXY_SIDE_PANE_PERSIST_KEYS = [
  EPITAXY_SIDE_PANE_PERSIST_KEY,
  `${EPITAXY_SIDE_PANE_PERSIST_KEY}.tr`,
  `${EPITAXY_SIDE_PANE_PERSIST_KEY}.br`,
  `${EPITAXY_SIDE_PANE_PERSIST_KEY}.bl`,
] as const;

/** Residual xr — upsert key and keep at most `max` most-recent keys. */
export function residualMapUpsert<T>(
  map: Record<string, T>,
  key: string,
  value: T | undefined,
  max: number,
): Record<string, T> {
  const { [key]: _removed, ...rest } = map;
  const next = value === undefined ? rest : { ...rest, [key]: value };
  const keys = Object.keys(next);
  if (keys.length <= max) return next;
  const kept: Record<string, T> = {};
  for (const k of keys.slice(keys.length - max)) kept[k] = next[k]!;
  return kept;
}

const BY_SESSION_CAP = 100;
const TRANSCRIPT_MODE_KEY = "epitaxy.transcriptMode";
/** Residual Is / Ps — temporary html file preview ids are not session-persisted. */
const TEMP_PREVIEW_PREFIX = "html-preview-";

const OFFICIAL_VIEW_PANES = new Set<string>([
  "preview",
  "diff",
  "terminal",
  "browser",
  "tasks",
  "plan",
  "file",
  "subagent",
  "runs",
  "framebuffer",
]);

/** Map residual tile ids → product OfficialViewPane (drops chat / unknown / diff:*). */
export function residualOfficialViewPanes(layout: ResidualTileLayout): OfficialViewPane[] {
  const out: OfficialViewPane[] = [];
  for (const id of residualNonChatTileIds(layout)) {
    if (OFFICIAL_VIEW_PANES.has(id)) out.push(id as OfficialViewPane);
    else if (id.startsWith("diff:")) out.push("diff");
  }
  // de-dupe while preserving order (diff:* collapse)
  const seen = new Set<string>();
  return out.filter((id) => {
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

/** Residual Ps(e) — true when id is temporary html preview. */
export function residualIsTempPreviewServerId(serverId: string | null | undefined): boolean {
  return Boolean(serverId?.startsWith(TEMP_PREVIEW_PREFIX));
}

/** Residual: only durable (non-Ps) server ids enter previewServerIdBySession. */
export function residualDurablePreviewServerId(
  serverId: string | null | undefined,
): string | undefined {
  if (!serverId || residualIsTempPreviewServerId(serverId)) return undefined;
  return serverId;
}

/** Residual kr() — default transcript mode from localStorage. */
export function residualDefaultTranscriptMode(): OfficialTranscriptMode {
  if (typeof window === "undefined") return "normal";
  try {
    const raw = window.localStorage.getItem(TRANSCRIPT_MODE_KEY);
    if (raw === "verbose" || raw === "summary" || raw === "thinking" || raw === "normal") return raw;
  } catch {
    /* ignore */
  }
  return "normal";
}

/**
 * @deprecated Prefer residualStripRestoredTileLayout on tree.
 * Kept for flat-array tests / legacy call sites.
 */
export function residualStripRestoredSideTiles(
  tiles: readonly OfficialViewPane[],
  keepPreview: boolean,
): OfficialViewPane[] {
  return residualOfficialViewPanes(
    residualStripRestoredTileLayout(residualLayoutFromSideTiles(tiles), keepPreview),
  );
}

export type OfficialSidePane = OfficialViewPane | "none";

export type OfficialSidePaneSessionSnapshot = {
  /** Derived openViews (non-chat OfficialViewPane ids). */
  sideTiles: OfficialViewPane[];
  transcriptMode: OfficialTranscriptMode;
  tileLayout: ResidualTileLayout;
  sidePane: OfficialSidePane;
};

export type OfficialSidePaneResetResult = OfficialSidePaneSessionSnapshot & {
  /** Residual restored previewServerId for target session (undefined when stripped). */
  previewServerId: string | undefined;
  /**
   * Residual live views after reset:
   * - same-session: keep store fileView/subagentView (Lr not spread)
   * - cross-session: Lr clears → undefined
   */
  fileView: OfficialFileViewTarget | undefined;
  subagentView: OfficialSubagentTarget | undefined;
};

export type OfficialSidePaneSessionState = {
  currentSessionId: string | undefined;
  /** Residual live tileLayout (_r default). */
  tileLayout: ResidualTileLayout;
  /** Residual focused sidePane kind ("none" | view). */
  sidePane: OfficialSidePane;
  /** Residual live transcriptMode. */
  transcriptMode: OfficialTranscriptMode;
  /** Residual live previewServerId for current session (Lr.previewServerId). */
  previewServerId: string | undefined;
  /** Residual Lr.fileView / subagentView — live (partialize). */
  fileView: OfficialFileViewTarget | undefined;
  subagentView: OfficialSubagentTarget | undefined;
  tileLayoutBySession: Record<string, ResidualTileLayout>;
  transcriptModeBySession: Record<string, OfficialTranscriptMode>;
  previewServerIdBySession: Record<string, string>;
  /**
   * Residual Nr.reset(e):
   * - same id: strip preview(no server)+framebuffer on live tileLayout only
   * - else: save prev live into bySession (xr 100), restore stripped target, sidePane none + Lr clears views
   */
  reset: (sessionId: string | undefined) => OfficialSidePaneResetResult;
  /**
   * Product unmount bridge: push live transcriptMode into bySession.
   * tileLayout already lives in store (residual); still upsert for safety when leaving shell.
   */
  saveLive: (sessionId: string | undefined) => void;
  /** Residual setSidePane(e): focus if open; else ur insert. "none" only clears focus. */
  setSidePane: (view: OfficialSidePane) => void;
  /** Residual toggleSidePane(e): Zs if present else ur; sidePane focus. */
  toggleSidePane: (view: OfficialViewPane) => void;
  /** Residual closeSidePane(e): Zs + clear sidePane/focused if matched. */
  closeSidePane: (view: OfficialViewPane | string) => void;
  /** Product close-all: chat-only layout + sidePane none (last-tile close path). */
  closeAllSidePanes: () => void;
  /** Residual setTranscriptMode + localStorage epitaxy.transcriptMode. */
  setTranscriptMode: (mode: OfficialTranscriptMode) => void;
  /** Residual setFileView / setSubagentView. */
  setFileView: (view: OfficialFileViewTarget | undefined) => void;
  setSubagentView: (view: OfficialSubagentTarget | undefined) => void;
  /** Residual bindPreviewServer(e) → previewServerId:e (+ bySession if durable). */
  bindPreviewServer: (serverId: string) => void;
  /** Residual unbindPreviewServer(e) when matches live. */
  unbindPreviewServer: (serverId: string) => void;
  /** Residual store.evictSession. */
  evictSession: (sessionId: string) => void;
};

export type OfficialSidePaneStore = StoreApi<OfficialSidePaneSessionState>;

function savePreviewMapForSession(
  map: Record<string, string>,
  sessionId: string | undefined,
  liveServerId: string | undefined,
): Record<string, string> {
  if (!sessionId) return map;
  const durable = residualDurablePreviewServerId(liveServerId);
  return residualMapUpsert(map, sessionId, durable, BY_SESSION_CAP);
}

function snapshotFromState(state: OfficialSidePaneSessionState): OfficialSidePaneSessionSnapshot {
  return {
    sideTiles: residualOfficialViewPanes(state.tileLayout),
    transcriptMode: state.transcriptMode,
    tileLayout: state.tileLayout,
    sidePane: state.sidePane,
  };
}

function createSidePaneState(
  set: (
    partial:
      | Partial<OfficialSidePaneSessionState>
      | ((state: OfficialSidePaneSessionState) => Partial<OfficialSidePaneSessionState> | OfficialSidePaneSessionState),
  ) => void,
  get: () => OfficialSidePaneSessionState,
): OfficialSidePaneSessionState {
  return {
    currentSessionId: undefined,
    tileLayout: residualChatOnlyLayout(),
    sidePane: "none",
    transcriptMode: residualDefaultTranscriptMode(),
    previewServerId: undefined,
    fileView: undefined,
    subagentView: undefined,
    tileLayoutBySession: {},
    transcriptModeBySession: {},
    previewServerIdBySession: {},

    reset: (sessionId) => {
      const state = get();
      const prevId = state.currentSessionId;

      // Residual same-session re-reset: ONLY strip preview(without server) + framebuffer.
      // Lr not spread → fileView/subagentView keep; sidePane keep.
      if (prevId === sessionId && sessionId !== undefined) {
        // Residual Nr same-session: keep preview when live previewServerId !== undefined
        // (includes temp html-preview-*). Durable filter is only for bySession save/restore.
        const hasServer = state.previewServerId !== undefined;
        const nextLayout = residualSameSessionStripTileLayout(state.tileLayout, hasServer);
        if (nextLayout !== state.tileLayout) {
          // residualSameSessionStrip always returns new object when Zs applied; compare ids
          const same =
            residualNonChatTileIds(nextLayout).join("\0")
            === residualNonChatTileIds(state.tileLayout).join("\0");
          if (!same) {
            set({ tileLayout: nextLayout });
          }
        }
        const live = get();
        return {
          ...snapshotFromState(live),
          previewServerId: live.previewServerId,
          fileView: live.fileView,
          subagentView: live.subagentView,
        };
      }

      // Save prev live layout/mode/server (residual xr cap 100; Ps ids not saved).
      const tileLayoutBySession = prevId
        ? residualMapUpsert(state.tileLayoutBySession, prevId, state.tileLayout, BY_SESSION_CAP)
        : state.tileLayoutBySession;
      const transcriptModeBySession = prevId
        ? residualMapUpsert(
          state.transcriptModeBySession,
          prevId,
          state.transcriptMode,
          BY_SESSION_CAP,
        )
        : state.transcriptModeBySession;
      const previewServerIdBySession = prevId
        ? savePreviewMapForSession(state.previewServerIdBySession, prevId, state.previewServerId)
        : state.previewServerIdBySession;

      // Residual: target missing + live has runs → ur(_r(),"runs")
      const carryRuns =
        Boolean(sessionId)
        && tileLayoutBySession[sessionId!] === undefined
        && residualIr(state.tileLayout).has("runs");

      const rawTarget = sessionId
        ? (tileLayoutBySession[sessionId]
          ?? (carryRuns ? residualUr(residualChatOnlyLayout(), "runs") : residualChatOnlyLayout()))
        : residualChatOnlyLayout();
      const restoredServer = sessionId
        ? residualDurablePreviewServerId(previewServerIdBySession[sessionId])
        : undefined;
      const tileLayout = sessionId
        ? residualStripRestoredTileLayout(rawTarget, Boolean(restoredServer))
        : residualChatOnlyLayout();
      const transcriptMode = sessionId
        ? (transcriptModeBySession[sessionId] ?? residualDefaultTranscriptMode())
        : residualDefaultTranscriptMode();

      // Residual return { ...Lr, ... } — clears fileView/subagentView/sessionView; sidePane none.
      set({
        currentSessionId: sessionId,
        previewServerId: restoredServer,
        fileView: undefined,
        subagentView: undefined,
        tileLayout,
        sidePane: "none",
        transcriptMode,
        tileLayoutBySession,
        transcriptModeBySession,
        previewServerIdBySession,
      });

      return {
        sideTiles: residualOfficialViewPanes(tileLayout),
        transcriptMode,
        tileLayout,
        sidePane: "none",
        previewServerId: restoredServer,
        fileView: undefined,
        subagentView: undefined,
      };
    },

    saveLive: (sessionId) => {
      if (!sessionId) return;
      set((state) => ({
        tileLayoutBySession: residualMapUpsert(
          state.tileLayoutBySession,
          sessionId,
          state.tileLayout,
          BY_SESSION_CAP,
        ),
        transcriptModeBySession: residualMapUpsert(
          state.transcriptModeBySession,
          sessionId,
          state.transcriptMode,
          BY_SESSION_CAP,
        ),
        previewServerIdBySession: savePreviewMapForSession(
          state.previewServerIdBySession,
          sessionId,
          state.previewServerId,
        ),
      }));
    },

    // Residual setSidePane:e=>t(t=>{ if none → focus only; if ir has e → sidePane e; else ur })
    setSidePane: (view) => {
      set((state) => {
        if (view === "none") {
          return state.sidePane === "none" ? state : { sidePane: "none" };
        }
        const ids = residualIr(state.tileLayout);
        if (ids.has(view)) {
          return state.sidePane === view ? state : { sidePane: view };
        }
        return {
          sidePane: view,
          tileLayout: residualUr(state.tileLayout, view),
        };
      });
    },

    // Residual toggleSidePane (product header selectView; diff:* collapse not product-primary)
    toggleSidePane: (view) => {
      set((state) => {
        if (view === ("none" as OfficialViewPane)) return state;
        if (view === "diff") {
          // Residual: close all Sr(diff*) tiles; product uses single "diff" id.
          if (residualIr(state.tileLayout).has("diff")) {
            return {
              sidePane: "none",
              tileLayout: residualZs(state.tileLayout, "diff"),
            };
          }
          // also strip residual-style diff: ids if present
          let next = state.tileLayout;
          let closed = false;
          for (const id of residualIr(next)) {
            if (id.startsWith("diff:")) {
              next = residualZs(next, id);
              closed = true;
            }
          }
          if (closed) {
            return { sidePane: "none", tileLayout: next };
          }
        }
        const open = residualIr(state.tileLayout).has(view);
        return {
          sidePane: open ? "none" : view,
          tileLayout: open ? residualZs(state.tileLayout, view) : residualUr(state.tileLayout, view),
        };
      });
    },

    // Residual closeSidePane:e=>t(t=>({sidePane:===e?none, tileLayout:Zs}))
    closeSidePane: (view) => {
      set((state) => {
        const nextLayout = residualZs(state.tileLayout, view);
        const sidePane =
          state.sidePane === view
          || (view === "diff" && state.sidePane === "diff")
            ? "none"
            : state.sidePane;
        // if closed focused tile id matched sidePane string
        const focusedCleared =
          state.sidePane !== "none" && state.sidePane === view ? "none" : sidePane;
        return {
          sidePane: focusedCleared,
          tileLayout: nextLayout,
        };
      });
    },

    closeAllSidePanes: () => {
      set({
        tileLayout: residualChatOnlyLayout(),
        sidePane: "none",
      });
    },

    setTranscriptMode: (mode) => {
      set({ transcriptMode: mode });
      try {
        if (typeof window !== "undefined") {
          window.localStorage.setItem(TRANSCRIPT_MODE_KEY, mode);
        }
      } catch {
        /* ignore */
      }
    },

    // Residual setFileView:e=>t({fileView:e})
    setFileView: (view) => set({ fileView: view }),
    setSubagentView: (view) => set({ subagentView: view }),

    // Residual bindPreviewServer:e=>t({previewServerId:e})
    bindPreviewServer: (serverId) => {
      set((state) => {
        const sessionId = state.currentSessionId;
        const durable = residualDurablePreviewServerId(serverId);
        return {
          previewServerId: serverId,
          previewServerIdBySession: sessionId && durable
            ? residualMapUpsert(state.previewServerIdBySession, sessionId, durable, BY_SESSION_CAP)
            : state.previewServerIdBySession,
        };
      });
    },

    // Residual unbindPreviewServer:e=>t(t=>t.previewServerId===e?{previewServerId:void 0}:t)
    unbindPreviewServer: (serverId) => {
      set((state) => {
        if (state.previewServerId !== serverId) return state;
        const sessionId = state.currentSessionId;
        return {
          previewServerId: undefined,
          previewServerIdBySession: sessionId
            ? residualMapUpsert(state.previewServerIdBySession, sessionId, undefined, BY_SESSION_CAP)
            : state.previewServerIdBySession,
        };
      });
    },

    evictSession: (sessionId) => {
      set((state) => {
        if (!(sessionId in state.tileLayoutBySession)
          && !(sessionId in state.transcriptModeBySession)
          && !(sessionId in state.previewServerIdBySession)
          && state.currentSessionId !== sessionId) {
          return state;
        }
        const { [sessionId]: _t, ...tileLayoutBySession } = state.tileLayoutBySession;
        const { [sessionId]: _m, ...transcriptModeBySession } = state.transcriptModeBySession;
        const { [sessionId]: _p, ...previewServerIdBySession } = state.previewServerIdBySession;
        const isCurrent = state.currentSessionId === sessionId;
        return {
          tileLayoutBySession,
          transcriptModeBySession,
          previewServerIdBySession,
          currentSessionId: isCurrent ? undefined : state.currentSessionId,
          previewServerId: isCurrent ? undefined : state.previewServerId,
          fileView: isCurrent ? undefined : state.fileView,
          subagentView: isCurrent ? undefined : state.subagentView,
          tileLayout: isCurrent ? residualChatOnlyLayout() : state.tileLayout,
          sidePane: isCurrent ? "none" : state.sidePane,
          transcriptMode: isCurrent ? residualDefaultTranscriptMode() : state.transcriptMode,
        };
      });
    },
  };
}

type PersistedSidePaneV1 = {
  currentSessionId?: string;
  previewServerId?: string;
  fileView?: OfficialFileViewTarget;
  subagentView?: OfficialSubagentTarget;
  /** Legacy flat arrays. */
  sideTilesBySession?: Record<string, OfficialViewPane[]>;
  tileLayoutBySession?: Record<string, ResidualTileLayout>;
  transcriptModeBySession?: Record<string, OfficialTranscriptMode>;
  previewServerIdBySession?: Record<string, string>;
  tileLayout?: ResidualTileLayout;
};

function migratePersistedSidePaneState(persisted: PersistedSidePaneV1, version: number): PersistedSidePaneV1 {
  if (version >= 2) return persisted;
  const tileLayoutBySession: Record<string, ResidualTileLayout> = {
    ...(persisted.tileLayoutBySession ?? {}),
  };
  if (persisted.sideTilesBySession) {
    for (const [sessionId, tiles] of Object.entries(persisted.sideTilesBySession)) {
      if (!tileLayoutBySession[sessionId] && Array.isArray(tiles)) {
        tileLayoutBySession[sessionId] = residualLayoutFromSideTiles(tiles);
      }
    }
  }
  const { sideTilesBySession: _legacy, ...rest } = persisted;
  return {
    ...rest,
    tileLayoutBySession,
    tileLayout: persisted.tileLayout ?? residualChatOnlyLayout(),
  };
}

/** Residual Nr(e) — factory; optional persistKey enables persist middleware. */
export function createOfficialSidePaneSessionStore(
  options?: { persistKey?: string },
): OfficialSidePaneStore {
  const persistKey = options?.persistKey;
  if (!persistKey) {
    return createStore<OfficialSidePaneSessionState>()((set, get) => createSidePaneState(set, get));
  }
  return createStore<OfficialSidePaneSessionState>()(
    persist(
      (set, get) => createSidePaneState(set, get),
      {
        name: persistKey,
        version: 2,
        storage: createJSONStorage(() => localStorage),
        migrate: (persisted, version) =>
          migratePersistedSidePaneState((persisted ?? {}) as PersistedSidePaneV1, version),
        // Residual partialize: tileLayout + bySession + currentSessionId + live views + previewServerId.
        partialize: (state) => ({
          currentSessionId: state.currentSessionId,
          previewServerId: residualDurablePreviewServerId(state.previewServerId),
          fileView: state.fileView,
          subagentView: state.subagentView,
          tileLayout: state.tileLayout,
          tileLayoutBySession: state.tileLayoutBySession,
          transcriptModeBySession: state.transcriptModeBySession,
          previewServerIdBySession: state.previewServerIdBySession,
        }),
      },
    ),
  );
}

/** Residual $r = Nr() — default store when no provider (tests / legacy). */
export const officialSidePaneSessionStore = createOfficialSidePaneSessionStore({
  persistKey: EPITAXY_SIDE_PANE_PERSIST_KEY,
});

/** Residual Ar — live pane stores for Kr / chatTextSize fan-out. */
const liveSidePaneStores = new Set<OfficialSidePaneStore>();
const storeByPersistKey = new Map<string, OfficialSidePaneStore>();

/** Residual Dr(e) — register store; returns unregister. */
export function registerOfficialSidePaneStore(store: OfficialSidePaneStore): () => void {
  liveSidePaneStores.add(store);
  return () => {
    liveSidePaneStores.delete(store);
  };
}

export function getOrCreateOfficialSidePaneStore(persistKey: string): OfficialSidePaneStore {
  const existing = storeByPersistKey.get(persistKey);
  if (existing) return existing;
  const created =
    persistKey === EPITAXY_SIDE_PANE_PERSIST_KEY
      ? officialSidePaneSessionStore
      : createOfficialSidePaneSessionStore({ persistKey });
  storeByPersistKey.set(persistKey, created);
  return created;
}

function scrubPersistedSessionMaps(sessionId: string) {
  if (typeof window === "undefined") return;
  for (const key of EPITAXY_SIDE_PANE_PERSIST_KEYS) {
    let raw: string | null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      continue;
    }
    if (!raw) continue;
    let parsed: { state?: Record<string, unknown> } | null = null;
    try {
      parsed = JSON.parse(raw) as { state?: Record<string, unknown> };
    } catch {
      continue;
    }
    const state = parsed?.state;
    if (!state) continue;
    const tileLayoutBySession = (state.tileLayoutBySession ?? state.sideTilesBySession ?? {}) as Record<
      string,
      unknown
    >;
    const transcriptModeBySession = (state.transcriptModeBySession ?? {}) as Record<string, unknown>;
    const previewServerIdBySession = (state.previewServerIdBySession ?? {}) as Record<string, unknown>;
    if (
      !(sessionId in tileLayoutBySession)
      && !(sessionId in transcriptModeBySession)
      && !(sessionId in previewServerIdBySession)
    ) {
      continue;
    }
    const { [sessionId]: _t, ...nextLayouts } = tileLayoutBySession;
    const { [sessionId]: _m, ...nextModes } = transcriptModeBySession;
    const { [sessionId]: _p, ...nextServers } = previewServerIdBySession;
    try {
      window.localStorage.setItem(
        key,
        JSON.stringify({
          ...parsed,
          state: {
            ...state,
            tileLayoutBySession: nextLayouts,
            // drop legacy map entry if present
            sideTilesBySession: undefined,
            transcriptModeBySession: nextModes,
            previewServerIdBySession: nextServers,
          },
        }),
      );
    } catch {
      /* ignore */
    }
  }
}

/**
 * Residual Kr(e): for (const t of Ar) t.getState().evictSession(e)
 * + scrub yr localStorage keys.
 */
export function officialEvictSidePaneSession(sessionId: string): void {
  const targets = new Set<OfficialSidePaneStore>(liveSidePaneStores);
  targets.add(officialSidePaneSessionStore);
  for (const store of storeByPersistKey.values()) targets.add(store);
  for (const store of targets) store.getState().evictSession(sessionId);
  scrubPersistedSessionMaps(sessionId);
}

const OfficialSidePaneStoreContext = createContext<OfficialSidePaneStore | null>(null);

/**
 * Residual kI({ sidePanePersistKey }) — one Nr instance per pane shell.
 * Primary: EPITAXY_SIDE_PANE_PERSIST_KEY; secondary: `${key}.${slot}`.
 */
export function OfficialSidePaneStoreProvider({
  children,
  persistKey,
}: {
  children: ReactNode;
  persistKey: string;
}) {
  const [store] = useState(() => getOrCreateOfficialSidePaneStore(persistKey));
  useEffect(() => registerOfficialSidePaneStore(store), [store]);
  return createElement(OfficialSidePaneStoreContext.Provider, { value: store }, children);
}

/** Residual Ur / zr — store for current pane (falls back to primary $r). */
export function useOfficialSidePaneStoreApi(): OfficialSidePaneStore {
  return useContext(OfficialSidePaneStoreContext) ?? officialSidePaneSessionStore;
}

export function useOfficialSidePaneSessionStore<T>(
  selector: (state: OfficialSidePaneSessionState) => T,
): T {
  const store = useOfficialSidePaneStoreApi();
  return useStore(store, selector);
}

/** Read restored durable preview server for a session (OfficialPreviewPane reattach). */
export function officialPeekPreviewServerId(
  sessionId: string | undefined,
  store: OfficialSidePaneStore = officialSidePaneSessionStore,
): string | undefined {
  if (!sessionId) return undefined;
  const state = store.getState();
  if (state.currentSessionId === sessionId) {
    return residualDurablePreviewServerId(state.previewServerId)
      ?? residualDurablePreviewServerId(state.previewServerIdBySession[sessionId]);
  }
  return residualDurablePreviewServerId(state.previewServerIdBySession[sessionId]);
}

/** Residual secondary persist key: `${EPITAXY_SIDE_PANE_PERSIST_KEY}.${slot}`. */
export function residualSecondarySidePanePersistKey(slot: "tr" | "br" | "bl"): string {
  return `${EPITAXY_SIDE_PANE_PERSIST_KEY}.${slot}`;
}
