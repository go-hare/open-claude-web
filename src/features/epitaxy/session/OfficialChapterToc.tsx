/**
 * Residual c11959232 Qw + Xw + Gw — Code session left chapter TOC rail.
 * Mount when !Vn (not summary) with sessionId / entries / scrollRef / scrollKey / scrollToEntry.
 * No invent restoreKey; no chapter-jump telemetry (遥测不要).
 */
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
} from "react";
import {
  BaseContextMenuItem,
  BaseContextMenuPopup,
  ContextMenu,
} from "../../../shell/BaseMenu";
import {
  officialChapterDomId,
  officialEpitaxyChaptersStore,
  useOfficialSessionChaptersBag,
  type OfficialCodeUserChapter,
} from "./officialEpitaxyChaptersStore";
import type { TranscriptEntry } from "./officialTranscriptParse";

export type OfficialTocChapter = {
  entryId: string;
  id: string;
  source: "claude" | "user";
  summary?: string;
  title: string;
};

/** Residual Gw — query chapter node by Lm(id) inside scroll root. */
function queryChapterNode(scrollRoot: HTMLElement, chapter: Pick<OfficialTocChapter, "id">) {
  return scrollRoot.querySelector(`#${CSS.escape(officialChapterDomId(chapter.id))}`);
}

/** Residual qm — group userChapters by afterId. */
function groupUserChaptersByAfterId(chapters: OfficialCodeUserChapter[]) {
  if (chapters.length === 0) return undefined;
  const grouped = new Map<string, OfficialCodeUserChapter[]>();
  for (const chapter of chapters) {
    const existing = grouped.get(chapter.afterId);
    if (existing) existing.push(chapter);
    else grouped.set(chapter.afterId, [chapter]);
  }
  return grouped;
}

/**
 * Residual Qw chapter list builder:
 * user chapters via qm + assistant chapter items (minus hidden) with renames.
 */
function buildOfficialTocChapters(
  entries: TranscriptEntry[],
  bag: { hidden: string[]; renames: Record<string, string>; userChapters: OfficialCodeUserChapter[] },
): OfficialTocChapter[] {
  const renames = bag.renames;
  const hidden = bag.hidden;
  const byAfterId = groupUserChaptersByAfterId(bag.userChapters);
  const list: OfficialTocChapter[] = [];

  const pushUserChapters = (afterId: string, entryId: string) => {
    // Residual: a?.get(afterId) then push { id, title, source:"user", entryId }.
    const pinned = byAfterId?.get(afterId);
    if (!pinned) return;
    for (const chapter of pinned) {
      list.push({
        id: chapter.id,
        title: chapter.title,
        source: "user",
        entryId,
      });
    }
  };

  // Residual r(null, s[0]?.id ?? "") — product afterId is always string item id; no null pins.
  for (const entry of entries) {
    if (entry.author !== "assistant") continue;
    for (const item of entry.items) {
      pushUserChapters(item.id, entry.id);
      if (item.kind !== "chapter") continue;
      if (hidden.includes(item.id)) continue;
      list.push({
        id: item.id,
        title: renames[item.id] ?? item.title,
        summary: item.summary,
        source: "claude",
        entryId: entry.id,
      });
    }
  }

  return list;
}

type OfficialChapterTocProps = {
  entries: TranscriptEntry[];
  scrollKey: string;
  scrollRef: MutableRefObject<HTMLDivElement | null>;
  scrollToEntry?: (entryId: string) => void;
  sessionId?: string;
};

/**
 * Residual Qw memo — left ticks + expand popover list.
 * Returns null when chapter list empty.
 */
export const OfficialChapterToc = memo(function OfficialChapterToc({
  entries,
  scrollKey,
  scrollRef,
  scrollToEntry,
  sessionId,
}: OfficialChapterTocProps) {
  const bag = useOfficialSessionChaptersBag(sessionId);
  const chapters = useMemo(
    () => buildOfficialTocChapters(entries, bag),
    [entries, bag],
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const editingLockRef = useRef(false);
  const setEditing = useCallback((id: string | null) => {
    editingLockRef.current = id !== null;
    setEditingId(id);
  }, []);

  const chaptersRef = useRef(chapters);
  useEffect(() => {
    chaptersRef.current = chapters;
  }, [chapters]);

  const entryIndexById = useMemo(
    () => new Map(entries.map((entry, index) => [entry.id, index])),
    [entries],
  );
  const entryIndexRef = useRef(entryIndexById);
  useEffect(() => {
    entryIndexRef.current = entryIndexById;
  }, [entryIndexById]);

  // Residual Qw scroll spy — top + 64, data-epitaxy-entry virtual first row, Gw node tops.
  useEffect(() => {
    const root = scrollRef.current;
    if (!root || chapters.length === 0) return;
    let raf = 0;
    const update = () => {
      raf = 0;
      const threshold = root.getBoundingClientRect().top + 64;
      const firstEntryNode = root.querySelector("[data-epitaxy-entry]");
      const firstVisibleEntryIndex = firstEntryNode
        ? (entryIndexRef.current.get(firstEntryNode.getAttribute("data-epitaxy-entry") ?? "") ?? -1)
        : -1;
      let nextActive: string | null = null;
      for (const chapter of chaptersRef.current) {
        const node = queryChapterNode(root, chapter);
        if (!node) {
          const entryIndex = entryIndexRef.current.get(chapter.entryId) ?? -1;
          if (firstVisibleEntryIndex >= 0 && entryIndex >= 0 && entryIndex < firstVisibleEntryIndex) {
            nextActive = chapter.id;
          }
          continue;
        }
        if (!(node.getBoundingClientRect().top <= threshold)) break;
        nextActive = chapter.id;
      }
      setActiveId((prev) => (prev === nextActive ? prev : nextActive));
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };
    root.addEventListener("scroll", onScroll, { passive: true });
    update();
    return () => {
      root.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [scrollRef, scrollKey, chapters.length]);

  const onJump = useCallback(
    (chapter: OfficialTocChapter) => {
      const root = scrollRef.current;
      if (!root) return;
      // Residual M.trackChapterJumped omitted (遥测不要).
      // Residual: Gw hit → scrollIntoView({ behavior:"smooth", block:"start" });
      // miss → scrollToEntry + rAF×2 + scrollIntoView({ block:"start" }).
      // Product delta: Fu virtual scroller + [contain:strict] no-ops CSS smooth here
      // (live: smooth stays put; block:"start" lands). Prefer residual miss path shape
      // so jump always lands when the chapter node is mounted.
      const node = queryChapterNode(root, chapter);
      if (node) {
        node.scrollIntoView({ block: "start" });
        return;
      }
      scrollToEntry?.(chapter.entryId);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          queryChapterNode(root, chapter)?.scrollIntoView({ block: "start" });
        });
      });
    },
    [scrollRef, scrollToEntry],
  );

  const contextMenuOpenRef = useRef(false);
  const navRef = useRef<HTMLElement | null>(null);
  const expand = useCallback(() => setExpanded(true), []);
  const collapse = useCallback(() => {
    if (contextMenuOpenRef.current || editingLockRef.current) return;
    setExpanded(false);
    setEditing(null);
  }, [setEditing]);
  const onContextMenuOpenChange = useCallback(
    (open: boolean) => {
      contextMenuOpenRef.current = open;
      if (!open) {
        requestAnimationFrame(() => {
          if (navRef.current && !navRef.current.matches(":hover")) collapse();
        });
      }
    },
    [collapse],
  );

  const onCommitRename = useCallback((sid: string, chapterId: string, title: string) => {
    officialEpitaxyChaptersStore.getState().rename(sid, chapterId, title);
  }, []);
  const onHide = useCallback((sid: string, chapterId: string, hidden: boolean) => {
    officialEpitaxyChaptersStore.getState().setHidden(sid, chapterId, hidden);
  }, []);
  const onRemove = useCallback((sid: string, chapterId: string) => {
    officialEpitaxyChaptersStore.getState().removeUserChapter(sid, chapterId);
  }, []);

  if (chapters.length === 0) return null;

  return (
    <div
      className="absolute top-[20px] bottom-[32px] left-[16px] z-[11] pointer-events-none epitaxy-toc-fade-in"
      data-official-source="c11959232-h_zsw3wI.js:Qw"
    >
      <nav
        ref={navRef}
        aria-label="Session chapters"
        tabIndex={0}
        onMouseLeave={collapse}
        onFocus={expand}
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) collapse();
        }}
        className="relative h-full w-[18px] outline-none ring-focus"
      >
        <ol
          aria-hidden
          onMouseEnter={expand}
          className="max-h-full flex flex-col gap-g2 py-p4 overflow-hidden pointer-events-auto"
        >
          {chapters.map((chapter) => (
            <li key={chapter.id} className="h-[12px] flex items-center">
              <span
                className={
                  "block h-[2px] rounded-full transition-all duration-200 "
                  + (chapter.id === activeId ? "w-[14px] bg-t8" : "w-[9px] bg-t4")
                }
              />
            </li>
          ))}
        </ol>
        <div
          className={
            "absolute left-0 top-0 isolate rounded-r6 w-[232px] max-h-full flex flex-col py-p5 transition-[opacity,transform,visibility] duration-150 ease-out "
            + (expanded
              ? "visible opacity-100 pointer-events-auto"
              : "invisible opacity-0 -translate-x-1")
          }
        >
          {/* Residual Nn elevation:"popover" */}
          <span
            aria-hidden
            className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-stroke-shadow"
            data-surface="popover"
          />
          <ol role="list" className="flex-1 min-h-0 flex flex-col gap-g2 overflow-y-auto px-p3">
            {chapters.map((chapter) => (
              <OfficialChapterTocRow
                key={chapter.id}
                chapter={chapter}
                sessionId={sessionId}
                isActive={chapter.id === activeId}
                isEditing={chapter.id === editingId}
                onJump={onJump}
                onStartRename={setEditing}
                onCommitRename={onCommitRename}
                onHide={onHide}
                onRemove={onRemove}
                onContextMenuOpenChange={onContextMenuOpenChange}
              />
            ))}
          </ol>
        </div>
      </nav>
    </div>
  );
});

/** Residual Xw — rename input or jump button + Rename/Delete context menu. */
const OfficialChapterTocRow = memo(function OfficialChapterTocRow({
  chapter,
  sessionId,
  isActive,
  isEditing,
  onJump,
  onStartRename,
  onCommitRename,
  onHide,
  onRemove,
  onContextMenuOpenChange,
}: {
  chapter: OfficialTocChapter;
  sessionId?: string;
  isActive: boolean;
  isEditing: boolean;
  onJump: (chapter: OfficialTocChapter) => void;
  onStartRename: (id: string | null) => void;
  onCommitRename: (sessionId: string, chapterId: string, title: string) => void;
  onHide: (sessionId: string, chapterId: string, hidden: boolean) => void;
  onRemove: (sessionId: string, chapterId: string) => void;
  onContextMenuOpenChange: (open: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const committedRef = useRef(false);

  useEffect(() => {
    if (isEditing) {
      committedRef.current = false;
      inputRef.current?.select();
    }
  }, [isEditing]);

  const jump = useCallback(() => onJump(chapter), [onJump, chapter]);
  const commit = useCallback(() => {
    if (committedRef.current) return;
    committedRef.current = true;
    const next = inputRef.current?.value.trim();
    if (sessionId && next && next !== chapter.title) {
      onCommitRename(sessionId, chapter.id, next);
    }
    onStartRename(null);
  }, [sessionId, chapter.id, chapter.title, onCommitRename, onStartRename]);

  const onKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        committedRef.current = true;
        onStartRename(null);
      }
    },
    [commit, onStartRename],
  );

  if (isEditing) {
    return (
      <li className="flex items-center gap-g6 px-p4 h-h4 rounded-r4">
        <span aria-hidden className="block h-[2px] w-[10px] rounded-full bg-t8 shrink-0" />
        <input
          ref={inputRef}
          defaultValue={chapter.title}
          onBlur={commit}
          onKeyDown={onKeyDown}
          aria-label="Chapter title"
          className="flex-1 min-w-0 bg-transparent text-body text-t9 outline-none ring-focus"
        />
      </li>
    );
  }

  return (
    <li>
      <ContextMenu.Root onOpenChange={onContextMenuOpenChange}>
        {/* Residual Xw: Cd.Trigger render=button with onClick jump; merge trigger props so left-click still jumps. */}
        <ContextMenu.Trigger
          render={(triggerProps) => (
            <button
              {...triggerProps}
              type="button"
              onClick={(event) => {
                triggerProps.onClick?.(event as never);
                jump();
              }}
              onDoubleClick={() => onStartRename(chapter.id)}
              aria-current={isActive ? "true" : undefined}
              title={chapter.summary}
              className={
                "group/ch w-full flex items-center gap-g6 px-p4 h-h4 rounded-r4 text-left hover:bg-fill-uncontained-hover "
                + (isActive ? "text-t9" : "text-t7 hover:text-t9")
              }
            >
              <span
                aria-hidden
                className={
                  "block h-[2px] rounded-full shrink-0 transition-all duration-150 "
                  + (isActive
                    ? "w-[14px] bg-t8"
                    : "w-[9px] bg-t4 group-hover/ch:bg-t6")
                }
              />
              {/* Residual Fh typewriter — static title is enough for TOC row (no invent reveal). */}
              <span className="flex-1 min-w-0 truncate text-body">{chapter.title}</span>
            </button>
          )}
        />
        <BaseContextMenuPopup>
          <BaseContextMenuItem onClick={() => onStartRename(chapter.id)}>Rename</BaseContextMenuItem>
          <BaseContextMenuItem
            className="!text-danger-000 [&[data-highlighted]]:bg-danger-900"
            onClick={() => {
              if (!sessionId) return;
              if (chapter.source === "user") onRemove(sessionId, chapter.id);
              else onHide(sessionId, chapter.id, true);
            }}
          >
            Delete
          </BaseContextMenuItem>
        </BaseContextMenuPopup>
      </ContextMenu.Root>
    </li>
  );
});
