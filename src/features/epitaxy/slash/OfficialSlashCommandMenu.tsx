import Fuse from "fuse.js";
import { flip, hide, offset, shift, size, useFloating, autoUpdate } from "@floating-ui/react";
import { createContext, memo, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { Editor } from "@tiptap/core";
import { Icon } from "../../../shell/icons";
import type { OfficialSlashCommandItem } from "./OfficialSlashTypes";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type OfficialSlashMenuContextValue = {
  activeIndex: number;
  hasMouseMoved: boolean;
  interactionMode: "keyboard" | "mouse";
  items: OfficialSlashCommandItem[];
  onClose: () => void;
  query: string;
  setActiveIndex: (index: number) => void;
  setHasMouseMoved: (value: boolean) => void;
  setSubSubmenuActiveIndex: (index: number) => void;
  setSubSubmenuOpen: (label: string | null) => void;
  setSubmenuActiveIndex: (index: number) => void;
  setSubmenuOpen: (label: string | null) => void;
  subSubmenuActiveIndex: number;
  subSubmenuOpen: string | null;
  submenuActiveIndex: number;
  submenuOpen: string | null;
};

const OfficialSlashMenuContext = createContext<OfficialSlashMenuContextValue | undefined>(undefined);

function useOfficialSlashMenu() {
  const value = useContext(OfficialSlashMenuContext);
  if (!value) throw new Error("useSlashCommandMenu must be used within SlashCommandMenuProvider");
  return value;
}

function previousValue<T>(value: T) {
  const ref = useRef<T>(value);
  const previous = ref.current;
  useEffect(() => {
    ref.current = value;
  }, [value]);
  return previous;
}

function nextOfficialIndex(items: OfficialSlashCommandItem[], index: number) {
  let next = index + 1;
  while (next < items.length && (items[next].type === "separator" || items[next].type === "section-header")) next += 1;
  return next < items.length ? next : index;
}

function previousOfficialIndex(items: OfficialSlashCommandItem[], index: number) {
  let next = index - 1;
  while (next >= 0 && (items[next].type === "separator" || items[next].type === "section-header")) next -= 1;
  return next >= 0 ? next : index;
}

function firstOfficialIndex(items: OfficialSlashCommandItem[]) {
  const index = items.findIndex((item) => item.type !== "separator" && item.type !== "section-header");
  return index >= 0 ? index : 0;
}

export function OfficialSlashCommandMenuProvider({ children, items, onClose, resetKey }: { children: ReactNode; items: OfficialSlashCommandItem[]; onClose: () => void; resetKey?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [submenuOpen, setSubmenuOpen] = useState<string | null>(null);
  const [submenuActiveIndex, setSubmenuActiveIndex] = useState(-1);
  const [subSubmenuOpen, setSubSubmenuOpen] = useState<string | null>(null);
  const [subSubmenuActiveIndex, setSubSubmenuActiveIndex] = useState(-1);
  const [interactionMode, setInteractionMode] = useState<"keyboard" | "mouse">("keyboard");
  const [hasMouseMoved, setHasMouseMoved] = useState(false);
  const previousResetKey = previousValue(resetKey);

  useEffect(() => {
    if (resetKey !== previousResetKey) setActiveIndex(firstOfficialIndex(items));
  }, [items, previousResetKey, resetKey]);

  useEffect(() => {
    const item = items[activeIndex];
    if (item?.type === "submenu") {
      const label = item.label ?? "";
      if (submenuOpen !== label) {
        const timeout = window.setTimeout(() => {
          setSubmenuOpen(label);
          setSubmenuActiveIndex(-1);
          setSubSubmenuOpen(null);
          setSubSubmenuActiveIndex(-1);
        }, 150);
        return () => window.clearTimeout(timeout);
      }
      return undefined;
    }
    setSubmenuOpen(null);
    setSubSubmenuOpen(null);
    setSubSubmenuActiveIndex(-1);
    return undefined;
  }, [activeIndex, items, submenuOpen]);

  useEffect(() => {
    if (!submenuOpen || submenuActiveIndex < 0) {
      setSubSubmenuOpen(null);
      setSubSubmenuActiveIndex(-1);
      return undefined;
    }
    const item = items[activeIndex];
    const nested = item?.type === "submenu" ? item.items : [];
    const nestedItem = nested[submenuActiveIndex];
    if (nestedItem?.type === "submenu") {
      const label = nestedItem.label ?? "";
      if (subSubmenuOpen !== label) {
        const timeout = window.setTimeout(() => {
          setSubSubmenuOpen(label);
          setSubSubmenuActiveIndex(-1);
        }, 150);
        return () => window.clearTimeout(timeout);
      }
      return undefined;
    }
    setSubSubmenuOpen(null);
    setSubSubmenuActiveIndex(-1);
    return undefined;
  }, [activeIndex, items, submenuActiveIndex, submenuOpen, subSubmenuOpen]);

  useEffect(() => {
    const onMouseMove = () => {
      if (!hasMouseMoved) setHasMouseMoved(true);
      if (interactionMode === "keyboard") setInteractionMode("mouse");
    };
    document.addEventListener("mousemove", onMouseMove);
    return () => document.removeEventListener("mousemove", onMouseMove);
  }, [hasMouseMoved, interactionMode]);

  const onDocumentKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      onClose();
      return;
    }
    if (!["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Enter", "Tab"].includes(event.key)) return;
    const item = items[activeIndex];
    const submenuItems = item?.type === "submenu" ? item.items : [];
    const submenuItem = submenuItems[submenuActiveIndex];
    const subSubmenuItems = submenuItem?.type === "submenu" ? submenuItem.items : [];
    const depth = subSubmenuOpen && subSubmenuActiveIndex >= 0 ? 2 : submenuOpen && submenuActiveIndex >= 0 ? 1 : 0;
    if (event.key === "ArrowRight") {
      if (!(depth === 0 && item?.type === "submenu" && submenuOpen === (item.label ?? "") || depth === 1 && submenuItem?.type === "submenu" && subSubmenuOpen === (submenuItem.label ?? ""))) return;
    } else if (event.key === "ArrowLeft" && depth < 1) {
      return;
    }
    setInteractionMode("keyboard");
    setHasMouseMoved(false);
    event.preventDefault();
    event.stopImmediatePropagation();
    if (event.key === "ArrowDown") {
      if (depth === 2) setSubSubmenuActiveIndex(nextOfficialIndex(subSubmenuItems, subSubmenuActiveIndex));
      else if (depth === 1) setSubmenuActiveIndex(nextOfficialIndex(submenuItems, submenuActiveIndex));
      else setActiveIndex(nextOfficialIndex(items, activeIndex));
    } else if (event.key === "ArrowUp") {
      if (depth === 2) setSubSubmenuActiveIndex(previousOfficialIndex(subSubmenuItems, subSubmenuActiveIndex));
      else if (depth === 1) setSubmenuActiveIndex(previousOfficialIndex(submenuItems, submenuActiveIndex));
      else setActiveIndex(previousOfficialIndex(items, activeIndex));
    } else if (event.key === "ArrowRight") {
      if (depth === 1 && submenuItem?.type === "submenu" && subSubmenuOpen === (submenuItem.label ?? "")) setSubSubmenuActiveIndex(firstOfficialIndex(subSubmenuItems));
      else if (depth === 0 && item?.type === "submenu" && submenuOpen === (item.label ?? "")) setSubmenuActiveIndex(firstOfficialIndex(submenuItems));
    } else if (event.key === "ArrowLeft") {
      if (depth === 2) setSubSubmenuActiveIndex(-1);
      else if (depth === 1) setSubmenuActiveIndex(-1);
    } else if (event.key === "Tab" || event.key === "Enter") {
      if (depth === 2) {
        const selected = subSubmenuItems[subSubmenuActiveIndex];
        if (isRunnableOfficialSlashItem(selected)) selected.onAction?.();
      } else if (depth === 1) {
        const selected = submenuItems[submenuActiveIndex];
        if (selected?.type === "submenu") setSubSubmenuActiveIndex(firstOfficialIndex(selected.items));
        else if (isRunnableOfficialSlashItem(selected)) selected.onAction?.();
      } else if (item?.type === "submenu") {
        setSubmenuActiveIndex(firstOfficialIndex(item.items));
      } else if (isRunnableOfficialSlashItem(item)) {
        item.onAction?.();
      }
    }
  }, [activeIndex, items, onClose, subSubmenuActiveIndex, subSubmenuOpen, submenuActiveIndex, submenuOpen]);

  useEffect(() => {
    document.addEventListener("keydown", onDocumentKeyDown, true);
    return () => document.removeEventListener("keydown", onDocumentKeyDown, true);
  }, [onDocumentKeyDown]);

  return (
    <OfficialSlashMenuContext.Provider
      value={{
        activeIndex,
        hasMouseMoved,
        interactionMode,
        items,
        onClose,
        query: (resetKey ?? "").trim().toLowerCase(),
        setActiveIndex,
        setHasMouseMoved,
        setSubSubmenuActiveIndex,
        setSubSubmenuOpen,
        setSubmenuActiveIndex,
        setSubmenuOpen,
        subSubmenuActiveIndex,
        subSubmenuOpen,
        submenuActiveIndex,
        submenuOpen,
      }}
    >
      {children}
    </OfficialSlashMenuContext.Provider>
  );
}

function isRunnableOfficialSlashItem(item: OfficialSlashCommandItem | undefined): item is Extract<OfficialSlashCommandItem, { onAction?: () => void }> {
  if (!item) return false;
  return item.type !== "separator" && item.type !== "section-header" && item.type !== "search-input" && item.type !== "loading" && item.type !== "submenu";
}

export function OfficialSlashCommandPositioner({ clientRect, maxHeightCap }: { clientRect?: (() => DOMRect | null) | null; maxHeightCap?: number }) {
  const { activeIndex, items, onClose } = useOfficialSlashMenu();
  if (items.length === 0) return null;
  return (
    <OfficialSlashFloating reference={clientRect ?? null} onClickOutsideHandler={onClose} disableFlip maxHeightCap={maxHeightCap}>
      <OfficialSlashCommandItems items={items} activeIndex={activeIndex} />
    </OfficialSlashFloating>
  );
}

function OfficialSlashFloating({ children, disableFlip = false, maxHeightCap, onClickOutsideHandler, placement = "top-start", reference }: { children: ReactNode; disableFlip?: boolean; maxHeightCap?: number; onClickOutsideHandler?: () => void; placement?: "top-start" | "right-start"; reference?: (() => DOMRect | null) | DOMRect | null }) {
  const [availableHeight, setAvailableHeight] = useState<number | undefined>();
  const { refs, floatingStyles, isPositioned, context } = useFloating({
    placement,
    middleware: [
      offset({ mainAxis: 10, crossAxis: -16 }),
      ...(disableFlip ? [] : [flip()]),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight }) {
          const next = availableHeight - 16;
          setAvailableHeight(maxHeightCap !== undefined ? Math.min(next, maxHeightCap) : next);
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });
  const floatingRef = useRef<HTMLDivElement | null>(null);
  const virtualReference = useMemo(() => ({
    getBoundingClientRect: () => {
      if (typeof reference === "function") return reference() ?? new DOMRect();
      return reference ?? new DOMRect();
    },
  }), [reference]);

  useLayoutEffect(() => {
    refs.setReference(virtualReference);
  }, [refs, virtualReference]);

  useEffect(() => {
    if (!onClickOutsideHandler) return undefined;
    const onMouseDown = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Node && floatingRef.current?.contains(target)) return;
      onClickOutsideHandler();
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, [onClickOutsideHandler]);

  return (
    <div
      ref={(node) => {
        floatingRef.current = node;
        refs.setFloating(node);
      }}
      role="menu"
      style={{ ...floatingStyles, maxHeight: availableHeight ? `${availableHeight}px` : undefined }}
      className="z-dropdown bg-bg-000 backdrop-blur-xl rounded-xl border-0.5 border-border-200 shadow-[0px_2px_8px_0px_hsl(var(--always-black)/8%)] dark:shadow-[0px_2px_8px_0px_hsl(var(--always-black)/24%)] p-1.5 min-w-60 max-w-lg max-h-96 overflow-y-auto"
    >
      <OfficialSlashPositionedContext.Provider value={isPositioned && !context.middlewareData.hide?.referenceHidden}>
        {children}
      </OfficialSlashPositionedContext.Provider>
    </div>
  );
}

const OfficialSlashPositionedContext = createContext(true);

function OfficialSlashCommandItems({ activeIndex, depth = 0, items, title }: { activeIndex: number; depth?: number; items: OfficialSlashCommandItem[]; title?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-col">
      {title ? <div className="px-2 pt-2 pb-1 text-xs font-semibold text-text-500">{title}</div> : null}
      {items.map((item, index) => {
        if (item.type === "separator") return <OfficialSlashSeparator key={`separator:${item.label}:${index}`} />;
        if (item.type === "section-header") return <div className="px-2 pt-2 pb-1 text-xs font-semibold text-text-500" key={`section-header:${item.label}:${index}`}>{item.label}</div>;
        if (item.type === "loading") return null;
        const key = item.type === "skill" ? `skill:${item.skillId}:${index}` : `${item.type}:${"label" in item ? item.label : "item"}:${index}`;
        return <OfficialSlashCommandMenuItem depth={depth} index={index} isActive={index === activeIndex} item={item} key={key} />;
      })}
    </div>
  );
}

function OfficialSlashSeparator() {
  return <div className="h-[0.5px] bg-border-300 my-1.5 mx-2" />;
}

const OfficialSlashCommandMenuItem = memo(function OfficialSlashCommandMenuItem({ depth = 0, index, isActive, item }: { depth?: number; index: number; isActive: boolean; item: OfficialSlashCommandItem }) {
  const {
    hasMouseMoved,
    interactionMode,
    onClose,
    query,
    setActiveIndex,
    setHasMouseMoved,
    setSubSubmenuActiveIndex,
    setSubmenuActiveIndex,
    subSubmenuActiveIndex,
    subSubmenuOpen,
    submenuActiveIndex,
    submenuOpen,
  } = useOfficialSlashMenu();
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const label = item.type !== "search-input" && "label" in item ? item.label ?? "" : "";
  const checked = (item.type === "checkbox" || item.type === "toggle") && item.checked;
  const closeOnClick = item.type !== "checkbox" && item.type !== "toggle" || (item.closeOnClick ?? true);
  const selected = checked;
  const mouseMode = hasMouseMoved && interactionMode === "mouse";
  const nestedOpen = (depth === 0 ? submenuOpen : depth === 1 ? subSubmenuOpen : null) === label;
  const nestedActiveIndex = depth === 0 ? submenuActiveIndex : depth === 1 ? subSubmenuActiveIndex : -1;
  const nestedVisible = nestedOpen && nestedActiveIndex >= 0;

  useEffect(() => {
    if (isActive && interactionMode === "keyboard") anchorRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [isActive, interactionMode]);

  if (item.type === "search-input") return null;

  const activate = () => {
    if (item.type !== "submenu") {
      if ("onAction" in item) item.onAction?.();
      if ((item.type === "button" || item.type === "skill" || item.type === "connector-tool" || (item.type === "checkbox" || item.type === "toggle") && closeOnClick) && onClose) onClose();
    }
  };
  const moveActive = () => {
    if (interactionMode !== "keyboard" || hasMouseMoved) {
      if (!hasMouseMoved) setHasMouseMoved(true);
      if (depth === 0) setActiveIndex(index);
      else if (depth === 1) setSubmenuActiveIndex(index);
      else setSubSubmenuActiveIndex(index);
    }
  };
  const stopMouseDown = (event: React.MouseEvent) => event.stopPropagation();

  if (item.type === "skill" || item.type === "connector-tool") {
    const hasDescription = item.type === "skill" && Boolean(item.skillDescription || item.sourcePluginName);
    return (
      <>
        <div
          ref={anchorRef}
          role="menuitem"
          tabIndex={-1}
          aria-disabled={item.disabled || undefined}
          onMouseEnter={moveActive}
          onMouseDown={stopMouseDown}
          className={cx(
            "group flex items-center gap-2 overflow-clip pl-2 pr-1.5 py-1.5 rounded-lg font-base select-none",
            item.disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer active:bg-bg-300",
            isActive && "bg-bg-200",
            mouseMode && "hover:bg-bg-200",
            "text-text-300",
          )}
          onClick={item.disabled ? undefined : activate}
        >
          {item.icon ? <div className="size-5 flex items-center justify-center opacity-50">{item.icon}</div> : null}
          <span className="truncate"><OfficialSlashHighlightedText text={item.label} query={query} /></span>
        </div>
        {isActive && hasDescription && item.type === "skill" ? <OfficialSlashDescriptionTooltip anchorRef={anchorRef} description={item.skillDescription} sourcePluginName={item.sourcePluginName} query={query} /> : null}
      </>
    );
  }

  return (
    <>
      <div
        ref={anchorRef}
        role="menuitem"
        tabIndex={-1}
        onMouseEnter={moveActive}
        onMouseDown={stopMouseDown}
        className={cx(
          "group flex items-start gap-2 overflow-clip pl-2 pr-1.5 py-1.5 rounded-lg font-base cursor-pointer select-none",
          isActive && selected && "bg-accent-100/10",
          isActive && !selected && !nestedVisible && "bg-bg-200",
          isActive && !selected && nestedVisible && "bg-bg-100",
          isActive && !selected && mouseMode && "hover:bg-bg-200",
          selected ? "text-accent-100" : "text-text-300",
          mouseMode && selected && "hover:bg-accent-100/10",
          mouseMode && !selected && "hover:bg-bg-200",
          isActive && selected && "active:bg-accent-100/20",
          isActive && !selected && "active:bg-bg-300",
        )}
        onClick={activate}
      >
        {"icon" in item && item.icon ? <div className="size-5 flex items-center justify-center">{item.icon}</div> : null}
        <div className="flex-1 flex flex-col">
          <span><OfficialSlashHighlightedText text={"label" in item ? item.label : ""} query={query} /></span>
          {"subtitle" in item && item.subtitle ? <span className={cx("font-small", selected ? "text-accent-200/75" : "text-text-500")}>{item.subtitle}</span> : null}
        </div>
        {item.type === "button" && item.suffix ? <div className="flex items-center h-5 text-text-500 font-small">{item.suffix}</div> : null}
        {(item.type === "checkbox" || item.type === "toggle") && !closeOnClick ? <div className="flex items-center h-5"><span aria-label={item.label} className={cx("inline-block size-4 rounded border", item.checked ? "bg-accent-100 border-accent-100" : "border-border-300")} /></div> : null}
        {item.type === "checkbox" && closeOnClick && item.checked ? <Icon name="CheckSelection" size="sm" className="text-accent-100" /> : null}
        {item.type === "submenu" ? <div className="h-5 flex items-center"><Icon name="ChevronRightMedium" size="xs" className="text-text-500" /></div> : null}
      </div>
      {item.type === "submenu" && nestedOpen ? (
        <OfficialSlashFloating reference={anchorRef.current ? anchorRef.current.getBoundingClientRect() : null} placement="right-start" maxHeightCap={384}>
          <OfficialSlashCommandItems items={item.items} activeIndex={nestedActiveIndex} depth={depth + 1} title={item.submenuTitle} />
        </OfficialSlashFloating>
      ) : null}
    </>
  );
});

function OfficialSlashHighlightedText({ text, query, highlightClassName = "font-semibold text-text-100" }: { text?: string; query?: string; highlightClassName?: string }) {
  if (!text) return <></>;
  const ranges = query ? officialHighlightRanges(text, query) : undefined;
  if (!ranges || ranges.length === 0) return <>{text}</>;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  ranges.forEach((range, index) => {
    if (range.start > cursor) nodes.push(<span key={`t-${index}`}>{text.slice(cursor, range.start)}</span>);
    nodes.push(<span className={highlightClassName} key={`h-${index}`}>{text.slice(range.start, range.end)}</span>);
    cursor = range.end;
  });
  if (cursor < text.length) nodes.push(<span key="tail">{text.slice(cursor)}</span>);
  return <>{nodes}</>;
}

function officialHighlightRanges(text: string, query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const index = text.toLowerCase().indexOf(normalized);
  return index >= 0 ? [{ start: index, end: index + normalized.length }] : [];
}

function OfficialSlashDescriptionTooltip({ anchorRef, description, query = "", sourcePluginName }: { anchorRef: RefObject<HTMLElement | null>; description?: string; query?: string; sourcePluginName?: string }) {
  const { refs, floatingStyles, isPositioned, middlewareData } = useFloating({
    placement: "right-start",
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 }), hide()],
    whileElementsMounted: autoUpdate,
  });
  const menuPositioned = useContext(OfficialSlashPositionedContext);
  useLayoutEffect(() => {
    if (menuPositioned && anchorRef.current) refs.setReference(anchorRef.current);
  }, [anchorRef, menuPositioned, refs]);
  const hidden = middlewareData.hide?.referenceHidden ?? false;
  return createPortal(
    <div
      ref={refs.setFloating}
      style={{ ...floatingStyles, zIndex: 9999, visibility: isPositioned && !hidden ? "visible" : "hidden" }}
      className="px-2 py-1 text-xs font-normal font-ui leading-tight rounded-md shadow-md text-always-white bg-always-black/80 backdrop-blur break-words max-w-[min(26rem,calc(100vw-4rem))] text-pretty pointer-events-none"
    >
      {description ? <div className="line-clamp-[10]"><OfficialSlashHighlightedText text={description} query={query} highlightClassName="font-semibold" /></div> : null}
      {sourcePluginName ? <div className={cx("text-always-white/60", description && "mt-1")}>{sourcePluginName} plugin</div> : null}
    </div>,
    document.body,
  );
}

export function OfficialSlashInlineFilterHint({ editor, query }: { editor: Editor; query: string }) {
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  const [visible, setVisible] = useState(false);
  const [fontStyle, setFontStyle] = useState<Pick<CSSStyleDeclaration, "fontSize" | "fontFamily" | "lineHeight"> | undefined>();
  const hintRef = useRef<HTMLSpanElement | null>(null);
  useLayoutEffect(() => {
    if (!editor || !hintRef.current) {
      setVisible(false);
      return;
    }
    const style = getComputedStyle(editor.view.dom);
    setFontStyle({ fontSize: style.fontSize, fontFamily: style.fontFamily, lineHeight: style.lineHeight });
    const { from } = editor.state.selection;
    if (from < editor.state.doc.content.size - 2) {
      setPosition(null);
      setVisible(false);
      return;
    }
    const coords = editor.view.coordsAtPos(from);
    if (!coords) {
      setVisible(false);
      return;
    }
    const left = coords.left + 2;
    setPosition({ top: coords.top + (coords.bottom - coords.top) / 2, left });
    const parent = editor.view.dom.parentElement;
    if (parent) {
      const parentRect = parent.getBoundingClientRect();
      const width = hintRef.current.offsetWidth;
      setVisible(parentRect.right - left >= width + 8);
    } else {
      setVisible(false);
    }
  }, [editor, query]);
  if (query !== "") return null;
  return createPortal(
    <span
      ref={hintRef}
      className="absolute -translate-y-1/2 text-text-500/75 font-large pointer-events-none select-none z-50"
      style={{ top: position?.top ?? 0, left: position?.left ?? 0, fontSize: fontStyle?.fontSize, fontFamily: fontStyle?.fontFamily, lineHeight: fontStyle?.lineHeight, visibility: position && visible ? "visible" : "hidden" }}
    >
      Type to filter
    </span>,
    document.body,
  );
}

type SearchableOfficialSlashItem = {
  aliases: string[];
  description: string[];
  item: OfficialSlashCommandItem;
  label: string;
  parts: string[];
  qualified: string;
  source: string;
};

let cachedFuse: { fuse: Fuse<SearchableOfficialSlashItem>; source: OfficialSlashCommandItem[] } | null = null;

function officialSlashSearchableItem(item: OfficialSlashCommandItem): SearchableOfficialSlashItem {
  const label = "label" in item ? String(item.label ?? "").toLowerCase() : "";
  const source = item.type === "skill" ? item.sourcePluginName ?? "" : item.type === "connector-tool" ? item.connectorName ?? "" : "";
  const lowerSource = source.toLowerCase();
  const parts = label.split(/[:_-]/g).filter(Boolean);
  const aliases = item.type === "skill" && item.aliases ? item.aliases.map((alias) => alias.toLowerCase()) : [];
  const description = item.type === "skill" && item.skillDescription ? item.skillDescription.toLowerCase().split(/\W+/).filter(Boolean) : [];
  return {
    aliases,
    description,
    item,
    label,
    parts: parts.length > 1 ? parts : [],
    qualified: lowerSource ? `${lowerSource}:${label}` : label,
    source: lowerSource,
  };
}

function flattenOfficialSlashItems(items: OfficialSlashCommandItem[]) {
  const flattened: OfficialSlashCommandItem[] = [];
  const visit = (source: OfficialSlashCommandItem[]) => {
    for (const item of source) {
      if (item.type === "submenu") visit(item.items);
      else if (!isNonSearchableSlashItem(item)) flattened.push(item);
    }
  };
  visit(items);
  return flattened;
}

function officialSlashFuse(items: OfficialSlashCommandItem[]) {
  if (cachedFuse?.source === items) return cachedFuse.fuse;
  const fuse = new Fuse(flattenOfficialSlashItems(items).map(officialSlashSearchableItem), {
    includeScore: true,
    threshold: 0.3,
    location: 0,
    distance: 100,
    keys: [
      { name: "label", weight: 3 },
      { name: "qualified", weight: 3 },
      { name: "aliases", weight: 3 },
      { name: "parts", weight: 2 },
      { name: "source", weight: 2 },
      { name: "description", weight: 0.5 },
    ],
  });
  cachedFuse = { source: items, fuse };
  return fuse;
}

function isNonSearchableSlashItem(item: OfficialSlashCommandItem) {
  return item.type === "separator" || item.type === "section-header" || item.type === "search-input" || item.type === "loading";
}

function officialSlashUsageScore(_qualified: string) {
  return 0;
}

export function filterOfficialSlashCommandItems(items: OfficialSlashCommandItem[], query?: string) {
  if (!query) return items.filter((item) => item.type !== "submenu" || item.items.length > 0);
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const results = officialSlashFuse(items).search(normalized);
  return results.sort((left, right) => {
    const leftLabel = left.item.label;
    const rightLabel = right.item.label;
    const leftExact = leftLabel === normalized;
    const rightExact = rightLabel === normalized;
    if (leftExact !== rightExact) return leftExact ? -1 : 1;
    const leftStarts = leftLabel.startsWith(normalized);
    const rightStarts = rightLabel.startsWith(normalized);
    if (leftStarts !== rightStarts) return leftStarts ? -1 : 1;
    if (leftStarts && rightStarts && leftLabel.length !== rightLabel.length) return leftLabel.length - rightLabel.length;
    const leftQualified = left.item.qualified.startsWith(normalized);
    const rightQualified = right.item.qualified.startsWith(normalized);
    if (leftQualified !== rightQualified) return leftQualified ? -1 : 1;
    if (leftQualified && rightQualified && left.item.qualified.length !== right.item.qualified.length) return left.item.qualified.length - right.item.qualified.length;
    const leftScore = Math.floor(10 * (left.score ?? 0));
    const rightScore = Math.floor(10 * (right.score ?? 0));
    if (leftScore !== rightScore) return leftScore - rightScore;
    return officialSlashUsageScore(right.item.qualified) - officialSlashUsageScore(left.item.qualified);
  }).map((result) => result.item.item);
}


