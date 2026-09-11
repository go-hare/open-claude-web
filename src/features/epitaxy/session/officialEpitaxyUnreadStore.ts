/**
 * Official index-BELzQL5P `D_e` / `wZ` (c119 `xn`) — persist `epitaxy-unread-v1`.
 *
 *   unreadIds: string[]
 *   markUnread / markRead / clearAll  (no-op if unchanged)
 *   z_e(id) = id !== O_e && markUnread(id)   — parent result while not focused
 *   U_e(id) = O_e = id; id && markRead(id)   — De/frame open
 *   F_e()   = Set(unreadIds) (stable empty)
 *
 * Local Action Center unread rows use this set only — not host isUnread.
 */
import { useMemo } from "react";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

type OfficialEpitaxyUnreadState = {
  clearAll: () => void;
  markRead: (sessionId: string) => void;
  markUnread: (sessionId: string) => void;
  unreadIds: string[];
};

/** Official `R_e` — stable empty set when unreadIds is empty. */
export const EMPTY_EPITAXY_UNREAD_IDS: ReadonlySet<string> = new Set();

/** Official `O_e` — currently focused Code session; z_e skips this id. */
let officialFocusedUnreadSessionId: string | null = null;

export const officialEpitaxyUnreadStore = createStore<OfficialEpitaxyUnreadState>()(
  persist(
    (set, get) => ({
      unreadIds: [],
      markUnread: (sessionId) => {
        const unreadIds = get().unreadIds;
        if (unreadIds.includes(sessionId)) return;
        set({ unreadIds: [...unreadIds, sessionId] });
      },
      markRead: (sessionId) => {
        const unreadIds = get().unreadIds;
        if (!unreadIds.includes(sessionId)) return;
        set({ unreadIds: unreadIds.filter((id) => id !== sessionId) });
      },
      clearAll: () => {
        if (get().unreadIds.length === 0) return;
        set({ unreadIds: [] });
      },
    }),
    {
      name: "epitaxy-unread-v1",
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => () => {
        // Official: O_e && D_e.getState().markRead(O_e)
        if (officialFocusedUnreadSessionId) {
          officialEpitaxyUnreadStore.getState().markRead(officialFocusedUnreadSessionId);
        }
      },
    },
  ),
);

/** Official `z_e` — parent CLI result while another session is focused. */
export function officialMarkSessionUnread(sessionId: string) {
  if (!sessionId || sessionId === officialFocusedUnreadSessionId) return;
  officialEpitaxyUnreadStore.getState().markUnread(sessionId);
}

/**
 * Official `U_e` — frame/De open: stamp O_e and markRead.
 * Pass null when leaving /code/:id.
 */
export function officialSetFocusedUnreadSession(sessionId: string | null) {
  officialFocusedUnreadSessionId = sessionId;
  if (sessionId) officialEpitaxyUnreadStore.getState().markRead(sessionId);
}

export function officialGetFocusedUnreadSession(): string | null {
  return officialFocusedUnreadSessionId;
}

/** Official `F_e` / c119 `bn()`. */
export function useOfficialEpitaxyUnreadIds(): ReadonlySet<string> {
  const unreadIds = useStore(officialEpitaxyUnreadStore, (state) => state.unreadIds);
  return useMemo(
    () => (unreadIds.length === 0 ? EMPTY_EPITAXY_UNREAD_IDS : new Set(unreadIds)),
    [unreadIds],
  );
}

export function resetOfficialEpitaxyUnreadStoreForTests() {
  officialFocusedUnreadSessionId = null;
  officialEpitaxyUnreadStore.setState({ unreadIds: [] });
}
