/**
 * Official cd5a31703 Gat `l9` + `keepMountedRef`.
 *
 * Focus / selection indices stay mounted while the virtual window moves.
 * Channel-editing `z` and hold-registry `_t` are omitted (no channel surface).
 * Span fill: two selection anchors < 32 rows → mount the closed range (Gat).
 */
import { useCallback, useLayoutEffect, useRef, useState, type FocusEvent } from "react";

const OFFICIAL_KEEP_SELECTION_SPAN = 32;

export type OfficialKeepMountedPin = {
  index: number;
  key: string;
};

export function officialTranscriptIndexFromNode(
  node: EventTarget | Node | null,
  rowsEl: HTMLElement | null,
  items: ReadonlyArray<{ id?: string } | string>,
  getKey: (item: unknown, index: number) => string,
): OfficialKeepMountedPin | null {
  if (node === null || rowsEl === null || !("nodeType" in node)) return null;
  let current: Element | null = node.nodeType === 1 ? (node as Element) : (node as Node).parentElement;
  const lastRowControls = current?.closest("[data-transcript-last-row-controls]");
  if (lastRowControls && rowsEl.parentElement?.contains(lastRowControls)) {
    const last = items.length - 1;
    return last < 0 ? null : { index: last, key: getKey(items[last], last) };
  }
  while (current !== null) {
    const indexed = current.closest("[data-index]");
    if (indexed === null) return null;
    if (indexed.parentElement === rowsEl) {
      const index = Number(indexed.getAttribute("data-index"));
      const item = items[index];
      if (item === undefined || !Number.isFinite(index)) return null;
      return { index, key: getKey(item, index) };
    }
    current = indexed.parentElement;
  }
  return null;
}

function resolvePin(
  pin: OfficialKeepMountedPin | null,
  items: ReadonlyArray<{ id?: string } | string>,
  getKey: (item: unknown, index: number) => string,
): OfficialKeepMountedPin | null {
  if (pin === null) return null;
  const item = items[pin.index];
  if (item !== undefined && getKey(item, pin.index) === pin.key) return pin;
  const index = items.findIndex((candidate, candidateIndex) => getKey(candidate, candidateIndex) === pin.key);
  return index < 0 ? null : { index, key: pin.key };
}

export function useOfficialTranscriptKeepMounted<TItem>({
  getKey,
  items,
  rowsElRef,
}: {
  getKey: (item: TItem, index: number) => string;
  items: TItem[];
  rowsElRef: { current: HTMLElement | null };
}) {
  const keepMountedRef = useRef<Set<number> | null>(null);
  const focusPinRef = useRef<OfficialKeepMountedPin | null>(null);
  const selectionPinsRef = useRef<OfficialKeepMountedPin[]>([]);
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const getKeyRef = useRef(getKey);
  getKeyRef.current = getKey;
  const [, bump] = useState(0);

  const publish = useCallback(() => {
    const list = itemsRef.current;
    const keyOf = getKeyRef.current;
    const indices: number[] = [];
    const focus = resolvePin(focusPinRef.current, list, keyOf as (item: unknown, index: number) => string);
    focusPinRef.current = focus;
    if (focus) indices.push(focus.index);

    const resolved: OfficialKeepMountedPin[] = [];
    let selectionMoved = false;
    for (const pin of selectionPinsRef.current) {
      const next = resolvePin(pin, list, keyOf as (item: unknown, index: number) => string);
      selectionMoved ||= next !== pin;
      if (next) resolved.push(next);
    }
    if (selectionMoved || resolved.length !== selectionPinsRef.current.length) {
      selectionPinsRef.current = resolved.length === 0 ? [] : resolved;
    }
    if (resolved.length === 2) {
      const [left, right] = resolved[0].index < resolved[1].index
        ? [resolved[0].index, resolved[1].index]
        : [resolved[1].index, resolved[0].index];
      if (right - left < OFFICIAL_KEEP_SELECTION_SPAN) {
        for (let index = left; index <= right; index += 1) indices.push(index);
      }
    } else if (resolved.length === 1) {
      indices.push(resolved[0].index);
    }

    const rowsEl = rowsElRef.current;
    const active = rowsEl?.ownerDocument.activeElement ?? null;
    if (active instanceof Node && rowsEl?.contains(active)) {
      const live = officialTranscriptIndexFromNode(
        active,
        rowsEl,
        list,
        keyOf as (item: unknown, index: number) => string,
      );
      if (live) {
        focusPinRef.current = live;
        indices.push(live.index);
      }
    }

    const unique = [...new Set(indices)].sort((a, b) => a - b);
    const next = unique.length === 0 ? null : new Set(unique);
    const prev = keepMountedRef.current;
    const same = prev === null && next === null
      || (prev !== null && next !== null && prev.size === next.size && [...prev].every((index) => next.has(index)));
    keepMountedRef.current = next;
    if (!same) bump((value) => value + 1);
  }, []);

  useLayoutEffect(() => {
    publish();
  }, [items, publish]);

  useLayoutEffect(() => {
    const onSelectionChange = () => {
      const rowsEl = rowsElRef.current;
      const doc = rowsEl?.ownerDocument;
      if (!doc) return;
      const selection = doc.getSelection();
      if (selection === null || selection.isCollapsed || selection.rangeCount === 0) {
        selectionPinsRef.current = [];
        publish();
        return;
      }
      const range = selection.getRangeAt(0);
      const start = officialTranscriptIndexFromNode(range.startContainer, rowsEl, itemsRef.current, getKeyRef.current as (item: unknown, index: number) => string);
      const end = officialTranscriptIndexFromNode(range.endContainer, rowsEl, itemsRef.current, getKeyRef.current as (item: unknown, index: number) => string);
      selectionPinsRef.current = start === null && end === null
        ? []
        : start === null
          ? [end!]
          : end === null || end.index === start.index
            ? [start]
            : [start, end];
      publish();
    };
    const doc = rowsElRef.current?.ownerDocument ?? (typeof document === "undefined" ? null : document);
    if (!doc) return undefined;
    doc.addEventListener("selectionchange", onSelectionChange);
    return () => doc.removeEventListener("selectionchange", onSelectionChange);
  }, [publish, rowsElRef]);

  const onFocus = useCallback((event: FocusEvent<HTMLElement>) => {
    const pin = officialTranscriptIndexFromNode(
      event.target,
      rowsElRef.current,
      itemsRef.current,
      getKeyRef.current as (item: unknown, index: number) => string,
    );
    focusPinRef.current = pin;
    publish();
  }, [publish, rowsElRef]);

  const onBlur = useCallback((event: FocusEvent<HTMLElement>) => {
    const related = event.relatedTarget;
    if (related instanceof Node && event.currentTarget.contains(related)) return;
    focusPinRef.current = null;
    publish();
  }, [publish]);

  return { keepMountedRef, onBlur, onFocus };
}
