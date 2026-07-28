/**
 * Official qy residual (c11959232):
 *   pending: Record<sessionId, items[]>
 *   push(sessionId, { name, dataUrl, contextNote? })
 *   take(sessionId, n) → first n items, remove from pending
 *
 * Preview Annotate "Add to chat" only pushes here; ExistingSessionComposer
 * drains into staged images (not immediate sendMessage).
 */
import { useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";

export type PreviewAnnotationItem = {
  name: string;
  dataUrl: string;
  contextNote?: string;
};

type PreviewAnnotationState = {
  pending: Record<string, PreviewAnnotationItem[]>;
  push: (sessionId: string, item: PreviewAnnotationItem) => void;
  take: (sessionId: string, n: number) => PreviewAnnotationItem[];
  clearSession: (sessionId: string) => void;
};

export const previewAnnotationQueue = createStore<PreviewAnnotationState>((set, get) => ({
  pending: {},
  push: (sessionId, item) => {
    if (!sessionId || !item?.dataUrl) return;
    set((state) => ({
      pending: {
        ...state.pending,
        [sessionId]: [...(state.pending[sessionId] ?? []), item],
      },
    }));
  },
  take: (sessionId, n) => {
    if (!sessionId || n <= 0) return [];
    const list = get().pending[sessionId];
    if (!list || list.length === 0) return [];
    const taken = list.slice(0, n);
    const rest = list.slice(n);
    set((state) => {
      if (rest.length > 0) {
        return {
          pending: {
            ...state.pending,
            [sessionId]: rest,
          },
        };
      }
      const { [sessionId]: _removed, ...remaining } = state.pending;
      return { pending: remaining };
    });
    return taken;
  },
  clearSession: (sessionId) => {
    if (!sessionId) return;
    set((state) => {
      if (!state.pending[sessionId]) return state;
      const { [sessionId]: _removed, ...remaining } = state.pending;
      return { pending: remaining };
    });
  },
}));

/** Official Mn residual — pending[sessionId].length for drain effect. */
export function usePreviewAnnotationPendingCount(sessionId: string | null | undefined): number {
  return useSyncExternalStore(
    (onStoreChange) => previewAnnotationQueue.subscribe(onStoreChange),
    () => {
      if (!sessionId) return 0;
      return previewAnnotationQueue.getState().pending[sessionId]?.length ?? 0;
    },
    () => 0,
  );
}
