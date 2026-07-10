import { autoUpdate, flip, offset, shift, size, useFloating } from "@floating-ui/react";
import type { Editor } from "@tiptap/core";
import Fuse from "fuse.js";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../../../shell/icons";
import type { CoworkSlashCommandItem } from "./CoworkSlashTypes";

export function CoworkSlashMenuSurface({ clientRect, editor, items, onClose, query = "" }: { clientRect?: (() => DOMRect | null) | null; editor: Editor; items: CoworkSlashCommandItem[]; onClose: () => void; query?: string }) {
  const filtered = useMemo(() => filterCoworkSlashItems(items, query), [items, query]);
  const [activeIndex, setActiveIndex] = useState(() => firstActionIndex(filtered));
  useEffect(() => setActiveIndex(firstActionIndex(filtered)), [filtered]);
  useCoworkSlashKeyboard(filtered, activeIndex, setActiveIndex, onClose);
  if (filtered.length === 0) return null;
  return (
    <>
      <CoworkSlashInlineFilterHint editor={editor} query={query} />
      <CoworkSlashFloating clientRect={clientRect} onClose={onClose}>
        <CoworkSlashItems activeIndex={activeIndex} items={filtered} onActiveIndex={setActiveIndex} onClose={onClose} query={query} />
      </CoworkSlashFloating>
    </>
  );
}

function useCoworkSlashKeyboard(items: CoworkSlashCommandItem[], activeIndex: number, setActiveIndex: (index: number) => void, onClose: () => void) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        onClose();
        return;
      }
      if (event.key === "ArrowDown" || event.key === "ArrowUp") {
        event.preventDefault();
        event.stopImmediatePropagation();
        setActiveIndex(nextActionIndex(items, activeIndex, event.key === "ArrowDown" ? 1 : -1));
      } else if (event.key === "Enter" || event.key === "Tab") {
        const item = items[activeIndex];
        if (!isActionItem(item)) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        item.onAction?.();
      }
    };
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, [activeIndex, items, onClose, setActiveIndex]);
}

function CoworkSlashFloating({ children, clientRect, onClose }: { children: ReactNode; clientRect?: (() => DOMRect | null) | null; onClose: () => void }) {
  const [availableHeight, setAvailableHeight] = useState<number>();
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const { floatingStyles, refs } = useFloating({
    placement: "top-start",
    middleware: [offset({ mainAxis: 10, crossAxis: -16 }), flip(), shift({ padding: 8 }), size({ padding: 8, apply: ({ availableHeight: height }) => setAvailableHeight(Math.min(height - 16, 384)) })],
    whileElementsMounted: autoUpdate,
  });
  const virtualReference = useMemo(() => ({ getBoundingClientRect: () => clientRect?.() ?? new DOMRect() }), [clientRect]);
  useLayoutEffect(() => { refs.setReference(virtualReference); }, [refs, virtualReference]);
  useEffect(() => {
    const closeOutside = (event: MouseEvent) => {
      if (event.target instanceof Node && floatingRef.current?.contains(event.target)) return;
      onClose();
    };
    document.addEventListener("mousedown", closeOutside);
    return () => document.removeEventListener("mousedown", closeOutside);
  }, [onClose]);
  return (
    <div className="z-dropdown bg-bg-000 backdrop-blur-xl rounded-xl border-0.5 border-border-200 shadow-[0px_2px_8px_0px_hsl(var(--always-black)/8%)] p-1.5 min-w-60 max-w-lg overflow-y-auto" ref={(node) => { floatingRef.current = node; refs.setFloating(node); }} role="menu" style={{ ...floatingStyles, maxHeight: availableHeight }}>
      {children}
    </div>
  );
}

function CoworkSlashItems({ activeIndex, items, onActiveIndex, onClose, query }: { activeIndex: number; items: CoworkSlashCommandItem[]; onActiveIndex: (index: number) => void; onClose: () => void; query: string }) {
  return <div className="flex flex-col">{items.map((item, index) => {
    if (item.type === "separator") return <div className="h-[0.5px] bg-border-300 my-1.5 mx-2" key={`separator-${index}`} />;
    if (item.type === "section-header") return <div className="px-2 pt-2 pb-1 text-xs font-semibold text-text-500" key={`header-${index}`}>{item.label}</div>;
    if (item.type === "loading") return null;
    return <CoworkSlashItem active={index === activeIndex} index={index} item={item} key={`${item.type}-${"label" in item ? item.label : index}`} onActive={onActiveIndex} onClose={onClose} query={query} />;
  })}</div>;
}

function CoworkSlashItem({ active, index, item, onActive, onClose, query }: { active: boolean; index: number; item: CoworkSlashCommandItem; onActive: (index: number) => void; onClose: () => void; query: string }) {
  if (!isActionItem(item)) return null;
  const label = "label" in item ? item.label : "";
  const description = item.type === "skill" ? item.skillDescription : undefined;
  const activate = () => {
    if (item.disabled) return;
    item.onAction?.();
    onClose();
  };
  return (
    <button aria-disabled={item.disabled || undefined} className={`group flex w-full items-start gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left font-base ${item.disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer active:bg-bg-300"} ${active ? "bg-bg-200" : "hover:bg-bg-200"}`} onClick={activate} onMouseEnter={() => onActive(index)} type="button">
      {"icon" in item && item.icon ? <span className="flex size-5 items-center justify-center">{item.icon}</span> : null}
      <span className="flex min-w-0 flex-1 flex-col"><span className="truncate">{highlightText(label, query)}</span>{description ? <span className="truncate text-xs text-text-500">{description}</span> : null}</span>
      {item.type === "checkbox" && item.checked ? <Icon className="text-accent-100" name="CheckSelection" size="sm" /> : null}
    </button>
  );
}

function CoworkSlashInlineFilterHint({ editor, query }: { editor: Editor; query: string }) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    if (query !== "") return setPosition(null);
    const { from } = editor.state.selection;
    if (from < editor.state.doc.content.size - 2) return setPosition(null);
    const coords = editor.view.coordsAtPos(from);
    setPosition(coords ? { left: coords.left + 2, top: coords.top + (coords.bottom - coords.top) / 2 } : null);
  }, [editor, query]);
  if (!position || query !== "") return null;
  return createPortal(<span className="absolute -translate-y-1/2 text-text-500/75 font-large pointer-events-none select-none z-50" style={position}>Type to filter</span>, document.body);
}

export function filterCoworkSlashItems(items: CoworkSlashCommandItem[], query?: string) {
  const searchable = items.filter(isActionItem);
  const normalized = query?.trim().toLowerCase();
  if (!normalized) return items;
  const fuse = new Fuse(searchable, { threshold: 0.3, keys: ["label", "aliases", "skillDescription"] });
  return fuse.search(normalized).map((result) => result.item);
}

function isActionItem(item: CoworkSlashCommandItem | undefined): item is Extract<CoworkSlashCommandItem, { onAction?: () => void }> {
  return Boolean(item && !["separator", "section-header", "search-input", "loading", "submenu"].includes(item.type));
}

function firstActionIndex(items: CoworkSlashCommandItem[]) {
  const index = items.findIndex(isActionItem);
  return index < 0 ? 0 : index;
}

function nextActionIndex(items: CoworkSlashCommandItem[], current: number, direction: 1 | -1) {
  if (items.length === 0) return 0;
  let index = current;
  for (let count = 0; count < items.length; count += 1) {
    index = (index + direction + items.length) % items.length;
    if (isActionItem(items[index])) return index;
  }
  return current;
}

function highlightText(text: string, query: string) {
  const index = text.toLowerCase().indexOf(query.trim().toLowerCase());
  if (!query || index < 0) return text;
  return <>{text.slice(0, index)}<strong className="font-semibold text-text-100">{text.slice(index, index + query.length)}</strong>{text.slice(index + query.length)}</>;
}
