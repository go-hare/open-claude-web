/**
 * Official cd5a `Zj` = `kSe` (`cc5c5e22c`) + c2719 `kg`/`faceOf`.
 * Default face `qe` = `{kind:"native"}`. Tree only after engine `draw` of a Spinner tree.
 * Host-loop has no desktop Spinner engine → native. Publisher still matches kSe.
 */
import { useEffect, useId, useSyncExternalStore } from "react";

export type OfficialZjFace =
  | { kind: "native" }
  | { kind: "rewritten"; label: string }
  | { kind: "tree"; label: string; words: string };

const NATIVE: OfficialZjFace = { kind: "native" };

type Facts = { message: string | null; mode: string; word: string };

const factsById = new Map<string, Facts>();
const listeners = new Set<() => void>();
let owned: { facts: Facts; id: string } | null = null;
let drawn: { face: OfficialZjFace; id: string | null } = { face: NATIVE, id: null };

function sameFacts(a: Facts, b: Facts) {
  return a.word === b.word && a.message === b.message && a.mode === b.mode;
}

function emit() {
  for (const listener of listeners) listener();
}

function reconcileOwned() {
  const last = [...factsById.entries()].at(-1);
  const next = last === undefined ? null : { id: last[0], facts: last[1] };
  if (next === null ? owned === null : owned !== null && owned.id === next.id && sameFacts(owned.facts, next.facts)) {
    return;
  }
  owned = next;
  emit();
}

export function officialZjPublish(id: string, facts: Facts | null) {
  const prev = factsById.get(id);
  if (facts === null) {
    if (prev !== undefined) {
      factsById.delete(id);
      queueMicrotask(reconcileOwned);
    }
    return;
  }
  if (prev === undefined || !sameFacts(prev, facts)) {
    factsById.set(id, facts);
    reconcileOwned();
  }
}

export function officialZjDraw(id: string | null, face: OfficialZjFace) {
  if (drawn.id === id && drawn.face === face) return;
  drawn = { face, id };
  emit();
}

export function officialZjFaceOf(id: string): OfficialZjFace {
  return drawn.id === id ? drawn.face : NATIVE;
}

export function officialZjSubscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Official `Qj`. */
export function officialQj(label: string) {
  return label.replace(/(…|\.\.\.)$/, "").trimEnd();
}

/**
 * Official `Eg`: `e===void 0||r===null||t===null||!i` → `qe` native.
 * Tree only `Ea(i)&&mo(i.tree)`. Host-loop has no Spinner mount → always `qe`.
 */
export function officialZjFace(word: string | null): OfficialZjFace {
  void word;
  return NATIVE;
}

/** Official `Dg`: owned facts → Eg face → `t.draw(i, r)`. */
export function officialZjReconcileDraw() {
  const owner = owned;
  const id = owner?.id ?? null;
  const word = owner?.facts.word ?? null;
  officialZjDraw(id, officialZjFace(word));
}

/** Official kSe: publish this row's word; Dg draws faceOf(id). */
export function useOfficialZjFace(word: string | null, mode = "tool-use"): OfficialZjFace {
  const id = useId();
  useEffect(() => {
    officialZjPublish(id, word ? { message: null, mode, word } : null);
    officialZjReconcileDraw();
    return () => {
      officialZjPublish(id, null);
      officialZjReconcileDraw();
    };
  }, [id, mode, word]);
  return useSyncExternalStore(officialZjSubscribe, () => officialZjFaceOf(id), () => NATIVE);
}
