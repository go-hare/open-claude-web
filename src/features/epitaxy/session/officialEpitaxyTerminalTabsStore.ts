/**
 * Official ca0135 `Ms` — persist `epitaxy.terminalTabs.v1`.
 *
 *   bySession[sessionId] = { tabs, activeId, nextId }
 *   addTab(sessionId, pendingCd?, name?) → tabId
 *   setActive / renameTab / closeTab / clearPendingCd / evictSession
 *   js(sessionId, tabId) = tabId === "0" ? sessionId : `${sessionId}::${tabId}`
 *   partialize strips pendingCd (Cs)
 *
 * Files `ku` Open in terminal: addTab(sessionId, absPath, basename) then setSidePane("terminal").
 * BR writes `cd` via writeShellPty once PTY is ready, then clearPendingCd.
 */
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export const OFFICIAL_EPITAXY_TERMINAL_TABS_KEY = "epitaxy.terminalTabs.v1";
export const OFFICIAL_DEFAULT_TERMINAL_TAB_ID = "0";

export type OfficialTerminalTab = {
  id: string;
  name?: string;
  ordinal: number;
  pendingCd?: string;
};

export type OfficialTerminalTabsSession = {
  activeId: string;
  nextId: number;
  tabs: OfficialTerminalTab[];
};

type OfficialEpitaxyTerminalTabsState = {
  addTab: (sessionId: string, pendingCd?: string, name?: string) => string;
  bySession: Record<string, OfficialTerminalTabsSession>;
  clearPendingCd: (sessionId: string, tabId: string) => void;
  closeTab: (sessionId: string, tabId: string) => void;
  evictSession: (sessionId: string) => void;
  renameTab: (sessionId: string, tabId: string, name: string) => void;
  setActive: (sessionId: string, tabId: string) => void;
};

/** Mutable seed for addTab when the session has never been stored. */
export function officialDefaultTerminalTabs(): OfficialTerminalTabsSession {
  return {
    activeId: OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
    nextId: 1,
    tabs: [{ id: OFFICIAL_DEFAULT_TERMINAL_TAB_ID, ordinal: 1 }],
  };
}

/**
 * Stable empty snapshot for zustand selectors.
 * Returning a fresh officialDefaultTerminalTabs() every select tick
 * forceStoreRerenders EpitaxySidePaneTile → Ho Maximum update depth.
 */
export const OFFICIAL_EMPTY_TERMINAL_TABS: OfficialTerminalTabsSession = {
  activeId: OFFICIAL_DEFAULT_TERMINAL_TAB_ID,
  nextId: 1,
  tabs: [{ id: OFFICIAL_DEFAULT_TERMINAL_TAB_ID, ordinal: 1 }],
};

/** Official js(e,t). */
export function officialTerminalPtyKey(sessionId: string, tabId: string) {
  return tabId === OFFICIAL_DEFAULT_TERMINAL_TAB_ID ? sessionId : `${sessionId}::${tabId}`;
}

/** Official BR pendingCd write (Wl Windows vs posix). */
export function officialPtyCdCommand(cwd: string): string {
  if (typeof navigator !== "undefined" && /\bWindows\b/.test(navigator.userAgent)) {
    return `Set-Location -LiteralPath '${cwd.replace(/'/g, "''")}'\r`;
  }
  return `cd '${cwd.replace(/'/g, "'\\''")}'\r`;
}

function persistableBySession(
  bySession: Record<string, OfficialTerminalTabsSession>,
): Record<string, OfficialTerminalTabsSession> {
  const next: Record<string, OfficialTerminalTabsSession> = {};
  for (const [sessionId, session] of Object.entries(bySession)) {
    if (!session) continue;
    next[sessionId] = {
      ...session,
      tabs: session.tabs.map(({ pendingCd: _pendingCd, ...tab }) => tab),
    };
  }
  return next;
}

function stopOfficialTerminalPty(sessionId: string, tabId: string) {
  // Official closeTab/evictSession call host stopShellPty. Do not import desktopBridge
  // at module top — vitest node has no window (officialBridgeAdapter reads window["claude.web"]).
  if (typeof window === "undefined") return;
  void import("../../../adapters/desktopBridge").then(({ desktopBridge }) => {
    void desktopBridge.LocalSessions.stopShellPty?.(officialTerminalPtyKey(sessionId, tabId));
  }).catch(() => undefined);
}

export const officialEpitaxyTerminalTabsStore = createStore<OfficialEpitaxyTerminalTabsState>()(
  persist(
    (set, get) => ({
      bySession: {},
      setActive: (sessionId, tabId) => {
        set((state) => {
          const session = state.bySession[sessionId] ?? officialDefaultTerminalTabs();
          if (session.activeId === tabId) return state;
          return {
            bySession: {
              ...state.bySession,
              [sessionId]: { ...session, activeId: tabId },
            },
          };
        });
      },
      addTab: (sessionId, pendingCd, name) => {
        let tabId = "";
        set((state) => {
          const session = state.bySession[sessionId] ?? officialDefaultTerminalTabs();
          tabId = String(session.nextId);
          const tab: OfficialTerminalTab = {
            id: tabId,
            ordinal: session.nextId + 1,
            name,
            pendingCd,
          };
          return {
            bySession: {
              ...state.bySession,
              [sessionId]: {
                tabs: [...session.tabs, tab],
                activeId: tabId,
                nextId: session.nextId + 1,
              },
            },
          };
        });
        return tabId;
      },
      evictSession: (sessionId) => {
        const session = get().bySession[sessionId];
        if (!session) return;
        for (const tab of session.tabs) stopOfficialTerminalPty(sessionId, tab.id);
        set((state) => {
          const { [sessionId]: _removed, ...rest } = state.bySession;
          return { bySession: rest };
        });
      },
      renameTab: (sessionId, tabId, name) => {
        set((state) => {
          const session = state.bySession[sessionId] ?? officialDefaultTerminalTabs();
          const nextName = name || undefined;
          if (session.tabs.find((tab) => tab.id === tabId)?.name === nextName) return state;
          return {
            bySession: {
              ...state.bySession,
              [sessionId]: {
                ...session,
                tabs: session.tabs.map((tab) => (tab.id === tabId ? { ...tab, name: nextName } : tab)),
              },
            },
          };
        });
      },
      closeTab: (sessionId, tabId) => {
        set((state) => {
          const session = state.bySession[sessionId];
          if (!session) return state;
          const index = session.tabs.findIndex((tab) => tab.id === tabId);
          if (index < 0) return state;
          stopOfficialTerminalPty(sessionId, tabId);
          const tabs = session.tabs.filter((tab) => tab.id !== tabId);
          if (tabs.length === 0) {
            return {
              bySession: {
                ...state.bySession,
                [sessionId]: officialDefaultTerminalTabs(),
              },
            };
          }
          const activeId = session.activeId === tabId
            ? tabs[Math.min(index, tabs.length - 1)]?.id ?? tabs[0]!.id
            : session.activeId;
          return {
            bySession: {
              ...state.bySession,
              [sessionId]: { ...session, tabs, activeId },
            },
          };
        });
      },
      clearPendingCd: (sessionId, tabId) => {
        set((state) => {
          const session = state.bySession[sessionId];
          if (!session) return state;
          const tab = session.tabs.find((item) => item.id === tabId);
          if (!tab?.pendingCd) return state;
          return {
            bySession: {
              ...state.bySession,
              [sessionId]: {
                ...session,
                tabs: session.tabs.map((item) => (item.id === tabId ? { ...item, pendingCd: undefined } : item)),
              },
            },
          };
        });
      },
    }),
    {
      name: OFFICIAL_EPITAXY_TERMINAL_TABS_KEY,
      version: 1,
      storage: createJSONStorage(() => {
        if (typeof localStorage !== "undefined") return localStorage;
        const map = new Map<string, string>();
        return {
          getItem: (name: string) => map.get(name) ?? null,
          removeItem: (name: string) => {
            map.delete(name);
          },
          setItem: (name: string, value: string) => {
            map.set(name, value);
          },
        };
      }),
      partialize: (state) => ({ bySession: persistableBySession(state.bySession) }),
    },
  ),
);

export function officialTerminalTabsForSession(sessionId: string | undefined): OfficialTerminalTabsSession {
  if (!sessionId) return OFFICIAL_EMPTY_TERMINAL_TABS;
  return officialEpitaxyTerminalTabsStore.getState().bySession[sessionId] ?? OFFICIAL_EMPTY_TERMINAL_TABS;
}

export function useOfficialEpitaxyTerminalTabs(sessionId: string | undefined): OfficialTerminalTabsSession {
  return useStore(officialEpitaxyTerminalTabsStore, (state) => {
    if (!sessionId) return OFFICIAL_EMPTY_TERMINAL_TABS;
    return state.bySession[sessionId] ?? OFFICIAL_EMPTY_TERMINAL_TABS;
  });
}

export function resetOfficialEpitaxyTerminalTabsStoreForTests() {
  officialEpitaxyTerminalTabsStore.setState({ bySession: {} });
}
