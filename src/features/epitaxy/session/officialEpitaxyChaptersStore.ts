/**
 * Residual c11959232 `Um` (epitaxy-chapters-v2) — session-keyed user chapters.
 * Vb: Um(t => bySession[sessionId]?.userChapters); pin via addUserChapter / removeUserChapter.
 * Not local Transcript useState — full→full A→B re-subscribes by sessionId without invent clear.
 */
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export type OfficialCodeUserChapter = {
  afterId: string;
  id: string;
  title: string;
};

type SessionChapters = {
  hidden: string[];
  renames: Record<string, string>;
  userChapters: OfficialCodeUserChapter[];
};

const EMPTY_SESSION_CHAPTERS: SessionChapters = {
  hidden: [],
  renames: {},
  userChapters: [],
};

/** Residual Hm — stable empty list when session has no chapters. */
export const EMPTY_USER_CHAPTERS: OfficialCodeUserChapter[] = [];

type OfficialEpitaxyChaptersState = {
  addUserChapter: (sessionId: string, afterId: string, title: string) => string | null;
  bySession: Record<string, SessionChapters>;
  removeUserChapter: (sessionId: string, chapterId: string) => void;
  rename: (sessionId: string, chapterOrMessageId: string, title: string) => void;
  setHidden: (sessionId: string, id: string, hidden: boolean) => void;
};

function patchSession(
  state: OfficialEpitaxyChaptersState,
  sessionId: string,
  update: (current: SessionChapters) => SessionChapters,
): Pick<OfficialEpitaxyChaptersState, "bySession"> {
  const current = state.bySession[sessionId] ?? EMPTY_SESSION_CHAPTERS;
  return {
    bySession: {
      ...state.bySession,
      [sessionId]: update(current),
    },
  };
}

export const officialEpitaxyChaptersStore = createStore<OfficialEpitaxyChaptersState>()(
  persist(
    (set) => ({
      bySession: {},
      // Residual addUserChapter: skip if afterId already pinned; id = `uch-${crypto.randomUUID()}`.
      addUserChapter: (sessionId, afterId, title) => {
        let createdId: string | null = null;
        set((state) => {
          const current = state.bySession[sessionId] ?? EMPTY_SESSION_CHAPTERS;
          if (current.userChapters.some((chapter) => chapter.afterId === afterId)) {
            return state;
          }
          createdId = `uch-${crypto.randomUUID()}`;
          return patchSession(state, sessionId, (session) => ({
            ...session,
            userChapters: [
              ...session.userChapters,
              { afterId, id: createdId as string, title },
            ],
          }));
        });
        return createdId;
      },
      removeUserChapter: (sessionId, chapterId) => {
        set((state) => patchSession(state, sessionId, (session) => ({
          ...session,
          userChapters: session.userChapters.filter((chapter) => chapter.id !== chapterId),
        })));
      },
      rename: (sessionId, chapterOrMessageId, title) => {
        set((state) => patchSession(state, sessionId, (session) => {
          if (session.userChapters.some((chapter) => chapter.id === chapterOrMessageId)) {
            return {
              ...session,
              userChapters: session.userChapters.map((chapter) => (
                chapter.id === chapterOrMessageId ? { ...chapter, title } : chapter
              )),
            };
          }
          return {
            ...session,
            renames: { ...session.renames, [chapterOrMessageId]: title },
          };
        }));
      },
      setHidden: (sessionId, id, hidden) => {
        set((state) => patchSession(state, sessionId, (session) => {
          const nextHidden = session.hidden.filter((item) => item !== id);
          if (hidden) nextHidden.push(id);
          return { ...session, hidden: nextHidden };
        }));
      },
    }),
    {
      name: "epitaxy-chapters-v2",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

/** Residual Vb: Um(t => sessionId ? bySession[sessionId]?.userChapters ?? Hm : Hm). */
export function useOfficialSessionUserChapters(sessionId?: string): OfficialCodeUserChapter[] {
  return useStore(
    officialEpitaxyChaptersStore,
    (state) => (sessionId ? state.bySession[sessionId]?.userChapters ?? EMPTY_USER_CHAPTERS : EMPTY_USER_CHAPTERS),
  );
}
