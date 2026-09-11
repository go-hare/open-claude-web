/**
 * Official c9a932a07 `sc` / `ac` — persist name `diff-annotations`.
 * partialize: annotationsBySession + sentPrIdsBySession only.
 * Drafts / PR comments / active are RAM.
 */
import { useMemo } from "react";
import { useStore } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { createStore } from "zustand/vanilla";

export type OfficialDiffAnnotationSide = "additions" | "deletions";

export type OfficialDiffAnnotation = {
  body: string;
  createdAt: number;
  endLine: number;
  filePath: string;
  id: string;
  lang?: string;
  side: OfficialDiffAnnotationSide;
  snippet?: string;
  source?: "pr" | string;
  startLine: number;
};

export type OfficialDiffPrComment = OfficialDiffAnnotation & {
  author?: string;
  resolved?: boolean;
  source: "pr";
  url?: string;
};

export type OfficialDiffDraft = {
  body: string;
  endLine: number;
  filePath: string;
  lang?: string;
  side: OfficialDiffAnnotationSide;
  snippet?: string;
  startLine: number;
};

export type OfficialDiffActiveTarget = {
  filePath: string;
  key: string;
} | null;

/** Official `rc(side, endLine)`. */
export function officialDiffAnnotationCardKey(
  side: OfficialDiffAnnotationSide,
  endLine: number,
): string {
  return `${side}:${endLine}`;
}

function patchSessionFileMap<T>(
  map: Record<string, Record<string, T>>,
  sessionId: string,
  filePath: string,
  value: T,
): Record<string, Record<string, T>> {
  const session = map[sessionId] ?? {};
  return { ...map, [sessionId]: { ...session, [filePath]: value } };
}

type OfficialDiffAnnotationsState = {
  activeBySession: Record<string, OfficialDiffActiveTarget>;
  addAnnotation: (sessionId: string, draft: OfficialDiffDraft) => OfficialDiffAnnotation;
  annotationsBySession: Record<string, Record<string, OfficialDiffAnnotation[]>>;
  clearAnnotations: (sessionId: string) => void;
  clearDraft: (sessionId: string, filePath: string, key: string) => void;
  clearScrollTarget: (sessionId: string) => void;
  draftsBySession: Record<string, Record<string, Record<string, OfficialDiffDraft>>>;
  markPrCommentsSent: (sessionId: string, comments: OfficialDiffAnnotation[]) => void;
  prCommentsBySession: Record<string, Record<string, OfficialDiffPrComment[]>>;
  removeAnnotation: (sessionId: string, filePath: string, id: string) => void;
  scrollTargetBySession: Record<string, { filePath: string; nonce: number } | undefined>;
  scrollToAnnotation: (sessionId: string, filePath: string) => void;
  sentPrIdsBySession: Record<string, string[]>;
  setActive: (sessionId: string, target: OfficialDiffActiveTarget) => void;
  setDraft: (sessionId: string, draft: OfficialDiffDraft) => void;
  setPrComments: (sessionId: string, comments: OfficialDiffPrComment[]) => void;
  stagePrComment: (sessionId: string, comment: OfficialDiffPrComment) => void;
  syncDraftBody: (sessionId: string, filePath: string, key: string, body: string) => void;
  updateAnnotation: (sessionId: string, filePath: string, id: string, body: string) => void;
};

const EMPTY_ANNOTATIONS: OfficialDiffAnnotation[] = [];
const EMPTY_PR_COMMENTS: OfficialDiffPrComment[] = [];
const EMPTY_SENT_IDS: string[] = [];
const EMPTY_DRAFTS: Record<string, OfficialDiffDraft> = {};

export const officialDiffAnnotationsStore = createStore<OfficialDiffAnnotationsState>()(
  persist(
    (set) => ({
      annotationsBySession: {},
      prCommentsBySession: {},
      sentPrIdsBySession: {},
      draftsBySession: {},
      activeBySession: {},
      scrollTargetBySession: {},
      addAnnotation: (sessionId, draft) => {
        const annotation: OfficialDiffAnnotation = {
          ...draft,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        };
        set((state) => ({
          annotationsBySession: patchSessionFileMap(
            state.annotationsBySession,
            sessionId,
            draft.filePath,
            [...(state.annotationsBySession[sessionId]?.[draft.filePath] ?? []), annotation],
          ),
        }));
        return annotation;
      },
      setPrComments: (sessionId, comments) => {
        set((state) => {
          const byFile: Record<string, OfficialDiffPrComment[]> = {};
          const byId = new Map<string, OfficialDiffPrComment>();
          for (const comment of comments) {
            (byFile[comment.filePath] ??= []).push(comment);
            byId.set(comment.id, comment);
          }
          let annotations = state.annotationsBySession;
          const sessionAnnotations = annotations[sessionId];
          if (sessionAnnotations) {
            const nextFiles: Record<string, OfficialDiffAnnotation[]> = {};
            let changed = false;
            for (const [filePath, list] of Object.entries(sessionAnnotations)) {
              const next = list.flatMap((item) => {
                if (item.source !== "pr") return [item];
                const fresh = byId.get(item.id);
                if (!fresh) {
                  changed = true;
                  return [];
                }
                if (fresh.body !== item.body) {
                  changed = true;
                  return [{ ...item, body: fresh.body }];
                }
                return [item];
              });
              nextFiles[filePath] = next;
            }
            if (changed) annotations = { ...annotations, [sessionId]: nextFiles };
          }
          return {
            prCommentsBySession: { ...state.prCommentsBySession, [sessionId]: byFile },
            annotationsBySession: annotations,
          };
        });
      },
      markPrCommentsSent: (sessionId, comments) => {
        set((state) => {
          const ids = comments.filter((item) => item.source === "pr").map((item) => item.id);
          if (ids.length === 0) return state;
          const sent = new Set(state.sentPrIdsBySession[sessionId] ?? []);
          for (const id of ids) sent.add(id);
          return {
            sentPrIdsBySession: { ...state.sentPrIdsBySession, [sessionId]: [...sent] },
          };
        });
      },
      stagePrComment: (sessionId, comment) => {
        set((state) => {
          const list = state.annotationsBySession[sessionId]?.[comment.filePath] ?? [];
          if (list.some((item) => item.id === comment.id)) return state;
          return {
            annotationsBySession: patchSessionFileMap(
              state.annotationsBySession,
              sessionId,
              comment.filePath,
              [...list, comment],
            ),
          };
        });
      },
      updateAnnotation: (sessionId, filePath, id, body) => {
        set((state) => {
          const list = state.annotationsBySession[sessionId]?.[filePath];
          if (!list) return state;
          return {
            annotationsBySession: patchSessionFileMap(
              state.annotationsBySession,
              sessionId,
              filePath,
              list.map((item) => (item.id === id ? { ...item, body } : item)),
            ),
          };
        });
      },
      removeAnnotation: (sessionId, filePath, id) => {
        set((state) => {
          const list = state.annotationsBySession[sessionId]?.[filePath];
          if (!list) return state;
          return {
            annotationsBySession: patchSessionFileMap(
              state.annotationsBySession,
              sessionId,
              filePath,
              list.filter((item) => item.id !== id),
            ),
          };
        });
      },
      clearAnnotations: (sessionId) => {
        set((state) => {
          const sessionAnnotations = state.annotationsBySession[sessionId];
          if (!sessionAnnotations) return state;
          const { [sessionId]: _drop, ...rest } = state.annotationsBySession;
          const { [sessionId]: _scroll, ...scrollRest } = state.scrollTargetBySession;
          const sent = new Set(state.sentPrIdsBySession[sessionId] ?? []);
          for (const list of Object.values(sessionAnnotations)) {
            for (const item of list) {
              if (item.source === "pr") sent.add(item.id);
            }
          }
          return {
            annotationsBySession: rest,
            scrollTargetBySession: scrollRest,
            sentPrIdsBySession: { ...state.sentPrIdsBySession, [sessionId]: [...sent] },
          };
        });
      },
      setDraft: (sessionId, draft) => {
        const key = officialDiffAnnotationCardKey(draft.side, draft.endLine);
        set((state) => ({
          draftsBySession: patchSessionFileMap(
            state.draftsBySession,
            sessionId,
            draft.filePath,
            { ...(state.draftsBySession[sessionId]?.[draft.filePath] ?? {}), [key]: draft },
          ),
          activeBySession: {
            ...state.activeBySession,
            [sessionId]: { filePath: draft.filePath, key },
          },
        }));
      },
      syncDraftBody: (sessionId, filePath, key, body) => {
        set((state) => {
          const drafts = state.draftsBySession[sessionId]?.[filePath];
          const draft = drafts?.[key];
          if (!draft || draft.body === body) return state;
          return {
            draftsBySession: patchSessionFileMap(
              state.draftsBySession,
              sessionId,
              filePath,
              { ...drafts, [key]: { ...draft, body } },
            ),
          };
        });
      },
      clearDraft: (sessionId, filePath, key) => {
        set((state) => {
          const drafts = state.draftsBySession[sessionId]?.[filePath];
          if (!drafts?.[key]) return state;
          const { [key]: _drop, ...rest } = drafts;
          const active = state.activeBySession[sessionId];
          const clearingActive = active?.filePath === filePath && active.key === key;
          return {
            draftsBySession: patchSessionFileMap(state.draftsBySession, sessionId, filePath, rest),
            activeBySession: clearingActive
              ? { ...state.activeBySession, [sessionId]: null }
              : state.activeBySession,
          };
        });
      },
      setActive: (sessionId, target) => {
        set((state) => {
          const current = state.activeBySession[sessionId];
          if (current === target) return state;
          if (
            current
            && target
            && current.filePath === target.filePath
            && current.key === target.key
          ) {
            return state;
          }
          return { activeBySession: { ...state.activeBySession, [sessionId]: target } };
        });
      },
      scrollToAnnotation: (sessionId, filePath) => {
        set((state) => ({
          scrollTargetBySession: {
            ...state.scrollTargetBySession,
            [sessionId]: {
              filePath,
              nonce: (state.scrollTargetBySession[sessionId]?.nonce ?? 0) + 1,
            },
          },
        }));
      },
      clearScrollTarget: (sessionId) => {
        set((state) => {
          if (!state.scrollTargetBySession[sessionId]) return state;
          const { [sessionId]: _drop, ...rest } = state.scrollTargetBySession;
          return { scrollTargetBySession: rest };
        });
      },
    }),
    {
      name: "diff-annotations",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        annotationsBySession: state.annotationsBySession,
        sentPrIdsBySession: state.sentPrIdsBySession,
      }),
    },
  ),
);

/** Official `ac` — action facade over `sc.getState()`. */
export const officialDiffAnnotationsApi = {
  addAnnotation: officialDiffAnnotationsStore.getState().addAnnotation,
  clearAnnotations: officialDiffAnnotationsStore.getState().clearAnnotations,
  clearDraft: officialDiffAnnotationsStore.getState().clearDraft,
  clearScrollTarget: officialDiffAnnotationsStore.getState().clearScrollTarget,
  markPrCommentsSent: officialDiffAnnotationsStore.getState().markPrCommentsSent,
  removeAnnotation: officialDiffAnnotationsStore.getState().removeAnnotation,
  scrollToAnnotation: officialDiffAnnotationsStore.getState().scrollToAnnotation,
  setActive: officialDiffAnnotationsStore.getState().setActive,
  setDraft: officialDiffAnnotationsStore.getState().setDraft,
  setPrComments: officialDiffAnnotationsStore.getState().setPrComments,
  stagePrComment: officialDiffAnnotationsStore.getState().stagePrComment,
  syncDraftBody: officialDiffAnnotationsStore.getState().syncDraftBody,
  updateAnnotation: officialDiffAnnotationsStore.getState().updateAnnotation,
};

export function useOfficialDiffFileAnnotations(sessionId: string, filePath: string) {
  return useStore(
    officialDiffAnnotationsStore,
    (state) => state.annotationsBySession[sessionId]?.[filePath] ?? EMPTY_ANNOTATIONS,
  );
}

export function useOfficialDiffFileDrafts(sessionId: string, filePath: string) {
  return useStore(
    officialDiffAnnotationsStore,
    (state) => state.draftsBySession[sessionId]?.[filePath] ?? EMPTY_DRAFTS,
  );
}

export function useOfficialDiffFileActiveKey(sessionId: string, filePath: string) {
  return useStore(officialDiffAnnotationsStore, (state) => {
    const active = state.activeBySession[sessionId];
    return active?.filePath === filePath ? active.key : null;
  });
}

export function useOfficialDiffFilePrComments(sessionId: string, filePath: string) {
  return useStore(
    officialDiffAnnotationsStore,
    (state) => state.prCommentsBySession[sessionId]?.[filePath] ?? EMPTY_PR_COMMENTS,
  );
}

export function useOfficialDiffSentPrIds(sessionId: string) {
  return useStore(
    officialDiffAnnotationsStore,
    (state) => state.sentPrIdsBySession[sessionId] ?? EMPTY_SENT_IDS,
  );
}

export function useOfficialDiffLineAnnotations(
  sessionId: string,
  filePath: string,
) {
  const saved = useOfficialDiffFileAnnotations(sessionId, filePath);
  const drafts = useOfficialDiffFileDrafts(sessionId, filePath);
  const prComments = useOfficialDiffFilePrComments(sessionId, filePath);
  const sentIds = useOfficialDiffSentPrIds(sessionId);
  const activeKey = useOfficialDiffFileActiveKey(sessionId, filePath);
  return useMemo(() => {
    const rows: OfficialDiffLineAnnotation[] = [];
    const stagedIds = new Set(saved.filter((item) => item.source === "pr").map((item) => item.id));
    const sent = new Set(sentIds);
    for (const comment of prComments) {
      rows.push({
        lineNumber: comment.endLine,
        side: comment.side,
        metadata: {
          kind: "pr",
          comment,
          isSent: sent.has(comment.id),
          isStaged: stagedIds.has(comment.id),
        },
      });
    }
    for (const annotation of saved) {
      if (annotation.source === "pr") continue;
      const key = officialDiffAnnotationCardKey(annotation.side, annotation.endLine);
      rows.push({
        lineNumber: annotation.endLine,
        side: annotation.side,
        metadata: {
          annotation,
          isActive: activeKey === key,
          key,
          kind: "saved",
        },
      });
    }
    for (const [key, draft] of Object.entries(drafts)) {
      rows.push({
        lineNumber: draft.endLine,
        side: draft.side,
        metadata: {
          draft,
          isActive: activeKey === key,
          key,
          kind: "draft",
        },
      });
    }
    return rows;
  }, [activeKey, drafts, prComments, saved, sentIds]);
}

export type OfficialDiffLineAnnotation = {
  lineNumber: number;
  metadata:
    | {
        annotation: OfficialDiffAnnotation;
        isActive: boolean;
        key: string;
        kind: "saved";
      }
    | {
        comment: OfficialDiffPrComment;
        isSent: boolean;
        isStaged: boolean;
        kind: "pr";
      }
    | {
        draft: OfficialDiffDraft;
        isActive: boolean;
        key: string;
        kind: "draft";
      };
  side: OfficialDiffAnnotationSide;
};

export function resetOfficialDiffAnnotationsStoreForTests() {
  officialDiffAnnotationsStore.setState({
    activeBySession: {},
    annotationsBySession: {},
    draftsBySession: {},
    prCommentsBySession: {},
    scrollTargetBySession: {},
    sentPrIdsBySession: {},
  });
}
