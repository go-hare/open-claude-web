import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { desktopBridge, type SessionSummary } from "../adapters/desktopBridge";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import type { FrameMode } from "../stores/frameStore";
import { Icon } from "./icons";
import { sessionPath } from "./sessionPaths";

type SearchCommandPaletteProps = {
  isOpen: boolean;
  mode: FrameMode;
  onClose: () => void;
  onNavigate: (path: string) => void;
};

type SearchItem = SessionSummary & { sourceLabel: string };

const byNewest = (left: SearchItem, right: SearchItem) => right.updatedAtMs - left.updatedAtMs;
const overlayClassName = "fixed z-modal inset-0 grid justify-items-center bg-always-black overflow-y-auto md:p-10 p-4 [background-color:hsl(var(--always-black)/var(--modal-overlay-opacity,0.5))] backdrop-blur-[2px] data-[state=\"open\"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:fade_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] !items-start pt-4 sm:pt-[15vh] lg:pt-[25vh] [--cp-top:1rem] sm:[--cp-top:15vh] lg:[--cp-top:25vh] ![background-color:rgba(0,0,0,0.05)] ![backdrop-filter:none] data-[state=open]:![animation:fade_50ms_ease-out_forwards]";
const paletteClassName = "flex flex-col focus:outline-none relative text-text-100 text-left align-middle min-w-0 w-full max-w-2xl bg-bg-000 rounded-xl border-0.5 border-border-200 shadow-2xl overflow-hidden data-[state=open]:[animation:zoom_50ms_ease-out_forwards]";
const modalVars = {
  "--modal-animation-duration": "50ms",
  "--modal-close-duration": "25ms",
  "--modal-overlay-opacity": 0.05,
} as CSSProperties;

export function SearchCommandPalette({ isOpen, mode, onClose, onNavigate }: SearchCommandPaletteProps) {
  const text = useShellText();
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<SearchItem[]>([]);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setQuery("");
    void loadSearchItems(mode, text).then(setItems);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [isOpen, mode, text]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  const results = useMemo(() => filterItems(items, query), [items, query]);
  if (!isOpen) return null;

  const openItem = (item: SearchItem) => {
    onClose();
    onNavigate(sessionPath(item));
  };

  const openFirst = () => {
    if (results[0]) openItem(results[0]);
  };

  return createPortal(
    <div className="epitaxy-root">
      <div className={overlayClassName} data-state="open" onMouseDown={onClose} role="presentation" style={modalVars}>
      <section aria-label={text.search} aria-modal="true" className={paletteClassName} data-state="open" onMouseDown={(event) => event.stopPropagation()} role="dialog" style={modalVars}>
        <div className="relative">
          <div className="flex flex-col">
            <div className="flex-shrink-0 transition-shadow duration-100 relative z-10">
              <div className="flex items-center gap-2 pl-[1.5rem] pt-[1.1rem] pb-[0.9rem] pr-2.5">
                <span aria-label="Search mode" className="flex items-center flex-shrink-0 -ml-1 mr-1"><Icon name="Search" size="sm" className="text-text-400" /></span>
                <textarea
                  ref={inputRef}
                  aria-autocomplete="list"
                  aria-controls="command-palette-results"
                  aria-expanded="true"
                  aria-label={text.searchChatsAndProjects}
                  className="flex-1 bg-transparent border-none font-base text-text-000 placeholder-text-500/80 !outline-none !ring-0 !shadow-none resize-none overflow-y-auto"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      openFirst();
                    }
                  }}
                  placeholder={text.searchChatsAndProjects}
                  role="combobox"
                  rows={1}
                  style={{ outline: "none", boxShadow: "none", maxHeight: "6rem" }}
                  value={query}
                />
                <button aria-label="Close" className="inline-flex size-8 items-center justify-center rounded-lg border-0 bg-transparent text-text-500 hover:bg-bg-200 hover:text-text-300" onClick={onClose} type="button"><Icon name="X" size="sm" /></button>
              </div>
              <div className="h-[0.5px] bg-border-300 w-full" />
            </div>
            <div className="p-2.5 overflow-y-auto transition-all duration-150 ease-out" style={{ maxHeight: "min(440px, calc(100vh - var(--cp-top) - 7.5rem))" }}>
              <div className="flex flex-col gap-1" id="command-palette-results" role="listbox" aria-label={text.searchResults}>
                <div role="group" aria-label={text.searchResults}>
                  <div className="px-3.5 pt-3 pb-2 font-small text-text-500 flex gap-2 items-center"><span>{text.searchResults}</span></div>
                  {results.length > 0 ? results.map((item) => <SearchResultItem item={item} key={`${item.kind}:${item.id}`} onOpen={openItem} />) : <div className="px-2 py-6 text-center text-sm text-text-500">{text.noSearchResults}</div>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>
    </div>,
    document.body,
  );
}

async function loadSearchItems(mode: FrameMode, text: ShellText): Promise<SearchItem[]> {
  const [code, cowork] = await Promise.all([
    desktopBridge.LocalSessions.list(),
    desktopBridge.LocalAgentModeSessions.list(),
  ]);
  const primary = mode === "code" ? code : cowork;
  const secondary = mode === "code" ? cowork : code;
  return [...tagItems(primary, text), ...tagItems(secondary, text)].sort(byNewest);
}

function tagItems(items: SessionSummary[], text: ShellText): SearchItem[] {
  return items.map((item) => ({
    ...item,
    sourceLabel: item.sessionKind === "code" ? text.code : text.cowork,
  }));
}

function filterItems(items: SearchItem[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return items.slice(0, 12);
  return items.filter((item) => searchableText(item).includes(needle)).slice(0, 12);
}

function searchableText(item: SearchItem) {
  return [item.title, item.cwd, item.repo?.name, item.repo?.branch, item.sourceLabel]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function SearchResultItem({ item, onOpen }: { item: SearchItem; onOpen: (item: SearchItem) => void }) {
  return (
    <button className="w-full text-left px-3 py-2 rounded-lg flex items-center justify-between gap-3 cursor-pointer truncate font-base hover:bg-bg-100 text-text-200" onClick={() => onOpen(item)} role="option" type="button">
      <span className="flex items-center gap-2 flex-1 min-w-0">
        <SessionGlyph item={item} />
        <span className="flex flex-col min-w-0 flex-1">
          <span className="truncate text-text-000">{item.title}</span>
          <span className="text-xs text-text-400 line-clamp-2 break-words whitespace-normal">{item.repo?.name ?? item.cwd ?? item.sourceLabel}</span>
        </span>
      </span>
      <span className="text-xs text-text-500 shrink-0">{item.updatedAt}</span>
    </button>
  );
}

function SessionGlyph({ item }: { item: SearchItem }) {
  if (item.sessionKind === "code") return <CodeStatusGlyph session={item} />;
  return <span className="claude-rebuild-logo shrink-0" aria-hidden="true">✳</span>;
}

function CodeStatusGlyph({ session }: { session: SearchItem }) {
  if ((session.pendingToolPermissions?.length ?? 0) > 0) {
    return <span className="status-dot shrink-0" data-kind="awaiting" />;
  }
  if (session.isRunning) {
    return (
      <span className="inline-flex size-3 shrink-0 items-center justify-center gap-[2px] leading-none" aria-hidden="true">
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  }
  if (session.isUnread) {
    return <span className="status-dot shrink-0" data-kind="ready" />;
  }
  if (session.isArchived) {
    return <Icon name="Archive" size="sm" className="shrink-0 text-text-500 opacity-80" />;
  }
  return <span aria-hidden="true" className="block size-[6px] shrink-0 border border-text-400 opacity-50 rounded-full" />;
}
