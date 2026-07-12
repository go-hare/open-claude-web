/**
 * Official AYe layout surface (subset): chatInputTopToViewportBottom measure.
 * Writer: composer container ResizeObserver → innerHeight − top (pretty ~202618).
 * Readers: sparse in official; store kept for parity / future consumers.
 * Source: index-BELzQL5P.pretty.js AYe ~106152.
 */
import { createStore, type StoreApi } from "zustand/vanilla";

export type CoworkChatLayoutState = {
  chatInputTopToViewportBottom: number;
  setChatInputTopToViewportBottom: (value: number) => void;
};

export type CoworkChatLayoutStore = StoreApi<CoworkChatLayoutState>;

export const coworkChatLayoutStore = createStore<CoworkChatLayoutState>((set) => ({
  chatInputTopToViewportBottom: 0,
  setChatInputTopToViewportBottom: (value) => set({ chatInputTopToViewportBottom: value }),
}));

/** Official measure: window.innerHeight − getBoundingClientRect().top (rAF-coalesced). */
export function measureCoworkChatInputTopToViewportBottom(node: HTMLElement): number {
  const rect = node.getBoundingClientRect();
  return window.innerHeight - rect.top;
}

/**
 * Official composer effect: observe node + window scroll/resize; rAF coalesce.
 * Returns dispose.
 */
export function bindCoworkChatInputTopMeasure(
  node: HTMLElement | null | undefined,
  setValue: (value: number) => void = (value) =>
    coworkChatLayoutStore.getState().setChatInputTopToViewportBottom(value),
): () => void {
  if (!node || typeof window === "undefined") return () => undefined;
  let frame = 0;
  const measure = () => {
    frame = 0;
    setValue(measureCoworkChatInputTopToViewportBottom(node));
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(measure);
  };
  const observer = new ResizeObserver(schedule);
  observer.observe(node);
  window.addEventListener("scroll", schedule, true);
  window.addEventListener("resize", schedule);
  measure();
  return () => {
    if (frame) cancelAnimationFrame(frame);
    observer.disconnect();
    window.removeEventListener("scroll", schedule, true);
    window.removeEventListener("resize", schedule);
  };
}
