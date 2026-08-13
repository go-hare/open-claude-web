/**
 * Official desktop ChatsSurface residual: index-BELzQL5P.js `g4t` → `f4t` (B4 desktop).
 * Route remains `/chats` (`$os` path:"chats"), but copy branches on mode:
 *   cowork → p4t Tasks ("任务" / Filter tasks / 新任务 → /task/new)
 *   chat   → u4t Chats
 * Shell: EGt + BFe + gYt search + Active/Archived/All tabs (cowork)
 * Rows: TGt/IGt selection + X3t row (not web c1b9 DataTable / wt / Mt)
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { useShellText } from "../../i18n/shellMessages";
import { ConfirmDialog } from "../../shell/ConfirmDialog";
import { Icon } from "../../shell/icons";
import { useFrameContext } from "../../stores/frameContext";
import { OfficialButton } from "../shared/OfficialButton";
import {
  archiveCoworkSession,
  deleteCoworkSession,
  replaceAppNavigation,
} from "../cowork/session/coworkSessionDeletion";
import { coworkSessionPath } from "../cowork/sessionPaths";
import { selectedSessionIdFromPath, sessionHomePath } from "../../shell/sessionPaths";
import {
  ProjectsExpandableSearch,
  ProjectsPageShell,
} from "./ProjectsListPrimitives";

type SurfaceTab = "active" | "archived" | "all";
type ListItem = {
  uuid: string;
  type: "cowork" | "chat" | "code";
  name: string;
  session: SessionSummary;
  active: boolean;
  archived: boolean;
};

const ROW_CLASS =
  "flex items-center gap-3 -mx-3 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-[var(--df-hover)]";
const ICON_SLOT = "inline-flex w-5 justify-center text-text-500";
const TITLE_SLOT = "flex-1 min-w-0";
const META_CLASS = "text-xs text-text-500";
const SURFACE_TABS: SurfaceTab[] = ["active", "archived", "all"];
/** Official f4t `r4t` fade ladder for a4t skeleton rows while H&&B. */
const SKELETON_OPACITIES = [1, 0.7, 0.4, 0.15] as const;
/** Official `sge` light skeleton (index-BELzQL5P). */
const SKELETON_BLOCK_CLASS =
  "relative bg-bg-400 overflow-hidden after:absolute after:inset-0 after:translate-x-[-100%] after:bg-gradient-to-r after:from-bg-000/0 after:from-0% after:via-bg-000/20 after:via-50% after:to-100% after:to-bg-000/0 after:animate-[shimmer_1.5s_infinite]";

const COWORK_COPY = {
  title: "任务",
  noun: "task",
  nouns: "tasks",
  searchPlaceholder: "Filter tasks",
  noResults: "No tasks match your search.",
  empty: {
    all: "No tasks yet.",
    active: "No active tasks.",
    archived: "No archived tasks.",
  } as Record<SurfaceTab, string>,
  newLabel: "新任务",
  newHref: "/task/new",
};

const CHAT_COPY = {
  title: "Chats",
  noun: "chat",
  nouns: "chats",
  searchPlaceholder: "Filter chats",
  noResults: "No chats match your search.",
  empty: {
    all: "No chats yet.",
    active: "No chats yet.",
    archived: "No chats yet.",
  } as Record<SurfaceTab, string>,
  newLabel: "New chat",
  newHref: "/new",
};

function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/** Official gbe residual — today time / weekday / mon day. */
function formatListTime(ms: number): string {
  if (!ms) return "—";
  const now = new Date();
  const date = new Date(ms);
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date
      .toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true })
      .toLowerCase();
  }
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString("en-US", { weekday: "short" });
  }
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isSessionActive(session: SessionSummary) {
  const pending = session.pendingToolPermissions?.length ?? 0;
  return pending > 0 || Boolean(session.isRunning) || (Boolean(session.hasCompleted) && Boolean(session.isUnread));
}

function sessionListType(session: SessionSummary): ListItem["type"] {
  if (session.sessionKind === "cowork" || session.kind === "epitaxy") return "cowork";
  if (session.sessionKind === "code" || session.kind === "code") return "code";
  return "chat";
}

export function ChatsPage({ onNavigate }: RouteViewProps) {
  const text = useShellText();
  const frame = useFrameContext();
  const isCowork = (frame?.mode ?? "cowork") === "cowork";
  const copy = isCowork ? COWORK_COPY : CHAT_COPY;

  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [tab, setTab] = useState<SurfaceTab>("active");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveIds, setArchiveIds] = useState<string[]>([]);

  const reload = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) setLoading(true);
    try {
      // Official t6 catch: keep previous recents when getAll throws.
      const items = await desktopBridge.LocalAgentModeSessions.list().catch(() => null);
      if (items) setSessions([...items].sort((a, b) => b.updatedAtMs - a.updatedAtMs));
    } finally {
      if (!opts?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      if (!active) return;
      await reload();
    })();
    const unsubscribe = desktopBridge.LocalAgentModeSessions.onEvent?.(() => {
      void reload({ silent: true });
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [reload]);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  const items = useMemo(() => {
    let list = sessions.filter((session) => {
      const type = sessionListType(session);
      // f4t cowork surface filters ref.kind === mode; product local list is cowork/code sessions
      if (isCowork) return type === "cowork" || type === "code";
      return type === "chat" || type === "cowork" || type === "code";
    });
    if (isCowork && tab !== "all") {
      const wantArchived = tab === "archived";
      list = list.filter((session) => Boolean(session.isArchived) === wantArchived);
    }
    // Official f4t filters by raw `s` immediately; debounced `c` is only for remote chat search.
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((session) => (session.title || "").toLowerCase().includes(q));
    }
    const mapped: ListItem[] = list.map((session) => ({
      uuid: session.id,
      type: sessionListType(session),
      name: session.title?.trim() || "Untitled",
      session,
      active: isSessionActive(session),
      archived: Boolean(session.isArchived),
    }));
    return mapped.sort((a, b) => Number(b.active) - Number(a.active));
  }, [isCowork, query, sessions, tab]);

  const selectedIds = useMemo(() => Object.keys(selected).filter((id) => selected[id]), [selected]);
  const selectedCount = selectedIds.length;
  // Official f4t: H = raw query non-empty; B = isInitialLoading || (s.trim()!==c debounce lag)
  const hasRawQuery = query.trim().length > 0;
  const queryPending = query.trim() !== debouncedQuery;
  const isSurfaceBusy = loading || queryPending;
  const emptyLabel = hasRawQuery ? copy.noResults : isCowork ? copy.empty[tab] : copy.empty.all;
  // Official: H&&B&&0===items → a4t skeleton (r4t); !B&&empty → noResults/empty copy
  // (no skeleton on initial load without query — residual only gates on H)
  const showSearchSkeleton = hasRawQuery && isSurfaceBusy && items.length === 0;
  const showEmpty = !isSurfaceBusy && items.length === 0;

  const exitSelection = useCallback(() => {
    setSelectionMode(false);
    setSelected({});
  }, []);

  const toggleSelected = useCallback((id: string, shiftKey = false) => {
    setSelectionMode(true);
    setSelected((current) => {
      if (!shiftKey) return { ...current, [id]: !current[id] };
      // Shift-range selection (Att residual): extend from last selected
      const keys = items.map((item) => item.uuid);
      const last = Object.keys(current).filter((key) => current[key]).at(-1);
      if (!last) return { ...current, [id]: true };
      const a = keys.indexOf(last);
      const b = keys.indexOf(id);
      if (a < 0 || b < 0) return { ...current, [id]: true };
      const [lo, hi] = a < b ? [a, b] : [b, a];
      const next = { ...current };
      for (let i = lo; i <= hi; i += 1) next[keys[i]] = true;
      return next;
    });
  }, [items]);

  const selectAll = useCallback(() => {
    if (selectedCount === items.length) {
      setSelected({});
      return;
    }
    const next: Record<string, boolean> = {};
    for (const item of items) next[item.uuid] = true;
    setSelected(next);
  }, [items, selectedCount]);

  const openItem = useCallback(
    (item: ListItem, event?: ReactMouseEvent | ReactKeyboardEvent) => {
      if (selectionMode) {
        const shift = event && "shiftKey" in event ? event.shiftKey : false;
        toggleSelected(item.uuid, shift);
        return;
      }
      onNavigate(coworkSessionPath(item.session));
    },
    [onNavigate, selectionMode, toggleSelected],
  );

  const confirmDelete = useCallback(async () => {
    const ids = deleteIds;
    setDeleteOpen(false);
    setDeleteIds([]);
    if (ids.length === 0) return;
    const results = await Promise.all(ids.map((id) => deleteCoworkSession(id)));
    const removed = new Set(ids.filter((_, index) => results[index]));
    if (removed.size === 0) return;
    setSessions((current) => current.filter((session) => !removed.has(session.id)));
    const openId = selectedSessionIdFromPath(window.location.pathname);
    if (openId && removed.has(openId)) {
      replaceAppNavigation(sessionHomePath("cowork"));
    }
    exitSelection();
  }, [deleteIds, exitSelection]);

  const confirmArchive = useCallback(async () => {
    const ids = archiveIds;
    setArchiveOpen(false);
    setArchiveIds([]);
    if (ids.length === 0) return;
    const results = await Promise.all(ids.map((id) => archiveCoworkSession(id)));
    const archived = new Set(ids.filter((_, index) => results[index]));
    if (archived.size === 0) return;
    setSessions((current) =>
      current.map((session) => (archived.has(session.id) ? { ...session, isArchived: true } : session)),
    );
    const openId = selectedSessionIdFromPath(window.location.pathname);
    if (openId && archived.has(openId)) {
      replaceAppNavigation(sessionHomePath("cowork"));
    }
    exitSelection();
  }, [archiveIds, exitSelection]);

  const openBulkDelete = useCallback(() => {
    // f4t cowork without delete flag archives non-archived; product exposes delete API → hard delete
    const ids = selectedIds.filter((id) => {
      const session = sessions.find((item) => item.id === id);
      return session && !session.isArchived;
    });
    setDeleteIds(ids.length > 0 ? ids : selectedIds);
    setDeleteOpen(true);
  }, [selectedIds, sessions]);

  const openBulkArchive = useCallback(() => {
    const ids = selectedIds.filter((id) => {
      const session = sessions.find((item) => item.id === id);
      return session && !session.isArchived;
    });
    if (ids.length === 0) return;
    setArchiveIds(ids);
    setArchiveOpen(true);
  }, [selectedIds, sessions]);

  const tablist = isCowork ? (
    <div className="flex items-center gap-1" role="tablist">
      {SURFACE_TABS.map((value) => (
        <button
          aria-selected={tab === value}
          className={cn(
            "rounded-md px-2 py-1 text-xs transition-colors",
            tab === value
              ? "bg-bg-300 text-text-100"
              : "text-text-500 hover:bg-bg-200 hover:text-text-300",
          )}
          key={value}
          onClick={() => setTab(value)}
          role="tab"
          type="button"
        >
          {value === "all" ? text.all : value === "active" ? text.active : text.archived}
        </button>
      ))}
    </div>
  ) : null;

  return (
    <ProjectsPageShell
      action={
        selectionMode ? null : (
          <OfficialButton onClick={() => onNavigate(copy.newHref)} size="sm" variant="primary">
            {copy.newLabel}
          </OfficialButton>
        )
      }
      subheader={tablist}
      tabsEnd={
        selectionMode ? null : (
          <ProjectsExpandableSearch
            onChange={setQuery}
            placeholder={copy.searchPlaceholder}
            value={query}
          />
        )
      }
      title={copy.title}
    >
      <div data-official-source="index-BELzQL5P.js:f4t g4t">
        {selectionMode ? (
          <div className="flex items-center h-12 my-1 -ml-[calc(1.5rem+0.5rem)]">
            <div className="group/menu flex items-center rounded-lg w-full gap-2.5">
              <button
                aria-label="Select all"
                className={cn(
                  "inline-flex h-4 w-4 items-center justify-center rounded border transition-colors",
                  selectedCount > 0
                    ? "border-accent-100 bg-accent-100 text-oncolor-100"
                    : "border-border-200 bg-bg-000 hover:border-border-100",
                )}
                onClick={selectAll}
                type="button"
              >
                {selectedCount > 0 ? <Icon customSize={10} name="Check" /> : null}
              </button>
              <div className="font-base text-text-400 ml-3">
                <span className="tabular-nums">{selectedCount}</span> selected
              </div>
              <div className="mr-auto flex gap-1">
                {isCowork ? (
                  <OfficialButton
                    aria-label="Archive selected"
                    disabled={selectedCount === 0}
                    onClick={openBulkArchive}
                    size="icon_sm"
                    variant="ghost"
                  >
                    <Icon name="Archive" size="sm" />
                  </OfficialButton>
                ) : null}
                <OfficialButton
                  aria-label="Delete selected"
                  disabled={selectedCount === 0}
                  onClick={openBulkDelete}
                  size="icon_sm"
                  variant="ghost"
                >
                  <Icon name="Trash" size="sm" />
                </OfficialButton>
              </div>
              <OfficialButton aria-label={text.cancel} onClick={exitSelection} size="icon_sm" variant="ghost">
                <Icon name="X" size="sm" />
              </OfficialButton>
            </div>
          </div>
        ) : null}

        {showSearchSkeleton ? (
          <div className="flex flex-col" data-official-source="index-BELzQL5P.js:a4t r4t">
            {SKELETON_OPACITIES.map((opacity, index) => (
              <SkeletonRow key={index} opacity={opacity} />
            ))}
          </div>
        ) : showEmpty ? (
          <div className="text-sm text-text-500 mt-4">{emptyLabel}</div>
        ) : (
          <div className="flex flex-col" data-official-source="index-BELzQL5P.js:TGt">
            {items.map((item, index) => {
              const prev = items[index - 1];
              const showActiveHeader =
                !isCowork && item.active && !(prev?.active);
              // Official: renderSectionHeader for chat surface only when item.active and prev not active
              // For cowork A, section header is null.
              return (
                <div key={`${item.type}:${item.uuid}`}>
                  {showActiveHeader ? (
                    <div className="text-xs text-text-500 mt-4 mb-2">Active</div>
                  ) : null}
                  <TasksListRow
                    isSelected={Boolean(selected[item.uuid])}
                    item={item}
                    selectionMode={selectionMode}
                    onOpen={openItem}
                    onToggleSelected={toggleSelected}
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        confirmText={text.delete}
        isOpen={deleteOpen}
        message={
          deleteIds.length === 1
            ? `This ${copy.noun} will be permanently deleted from your computer and Anthropic's servers, and can't be undone.`
            : `These ${copy.nouns} will be permanently deleted from your computer and Anthropic's servers, and can't be undone.`
        }
        onClose={() => {
          setDeleteOpen(false);
          setDeleteIds([]);
        }}
        onConfirm={() => {
          void confirmDelete();
        }}
        title={
          deleteIds.length === 1
            ? `Delete ${copy.noun}?`
            : `Delete ${deleteIds.length} ${copy.nouns}?`
        }
        variant="danger"
      />
      <ConfirmDialog
        confirmText={text.archive}
        isOpen={archiveOpen}
        message={`Archive ${archiveIds.length} ${archiveIds.length === 1 ? copy.noun : copy.nouns}? You can find ${archiveIds.length === 1 ? "it" : "them"} in the Archived tab.`}
        onClose={() => {
          setArchiveOpen(false);
          setArchiveIds([]);
        }}
        onConfirm={() => {
          void confirmArchive();
        }}
        title="Archive selected"
        variant="default"
      />
    </ProjectsPageShell>
  );
}

function TasksListRow({
  isSelected,
  item,
  onOpen,
  onToggleSelected,
  selectionMode,
}: {
  isSelected: boolean;
  item: ListItem;
  onOpen: (item: ListItem, event?: ReactMouseEvent | ReactKeyboardEvent) => void;
  onToggleSelected: (id: string, shiftKey?: boolean) => void;
  selectionMode: boolean;
}) {
  const pending = item.session.pendingToolPermissions?.length ?? 0;
  const timeLabel = formatListTime(item.session.updatedAtMs);
  const iconName = item.type === "code" ? "Code" : item.type === "chat" ? "Chat" : "Tasks";

  return (
    <div className="relative group/row" data-official-source="index-BELzQL5P.js:IGt TGt">
      {/* Official IGt hover checkbox left of row */}
      <div
        className={cn(
          "p-1 absolute z-10 top-1/2 -translate-y-1/2 -translate-x-1/2 left-[-1.5rem] transition duration-100",
          !selectionMode &&
            "opacity-0 scale-75 group-has-[:focus-visible]/row:opacity-100 group-has-[:focus-visible]/row:scale-100 group-hover/row:opacity-100 group-hover/row:scale-100",
        )}
      >
        <button
          aria-checked={isSelected}
          aria-label={`Select ${item.name}`}
          className={cn(
            "inline-flex h-4 w-4 items-center justify-center rounded border transition-colors",
            isSelected
              ? "border-accent-100 bg-accent-100 text-oncolor-100"
              : "border-border-200 bg-bg-000 hover:border-border-100",
          )}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSelected(item.uuid, event.shiftKey);
          }}
          role="checkbox"
          type="button"
        >
          {isSelected ? <Icon customSize={10} name="Check" /> : null}
        </button>
      </div>

      <div
        className={cn(ROW_CLASS, "group/row", isSelected && "bg-[var(--df-hover)]")}
        onClick={(event) => onOpen(item, event)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpen(item, event);
          }
        }}
        role="button"
        tabIndex={0}
      >
        <span className={ICON_SLOT}>
          <Icon name={iconName} size="sm" />
        </span>
        <div className={TITLE_SLOT}>
          <div className={cn("text-sm text-text-100 truncate", item.archived && "!text-text-500")}>
            {item.name}
          </div>
        </div>
        {pending > 0 ? (
          <span className={META_CLASS}>
            {pending} {pending === 1 ? "permission" : "permissions"}
          </span>
        ) : null}
        <span className={META_CLASS}>{timeLabel}</span>
        {/* Official f4t: dUt menu only when source.kind === chat; local cowork rows have no trailing dots */}
      </div>
    </div>
  );
}

/** Official a4t skeleton row — X3t layout + sge blocks (icon 16, title 20 random 180–380, meta 40). */
function SkeletonRow({ opacity }: { opacity: number }) {
  const titleWidth = useMemo(() => Math.round(Math.random() * (380 - 180)) + 180, []);
  return (
    <div
      aria-hidden
      className={cn(ROW_CLASS, "pointer-events-none")}
      data-official-source="index-BELzQL5P.js:a4t"
      style={{ opacity }}
    >
      <span className={ICON_SLOT}>
        <SkeletonBlock height={16} rounded="sm" width={16} />
      </span>
      <div className={TITLE_SLOT}>
        <SkeletonBlock height={20} width={titleWidth} />
      </div>
      <SkeletonBlock height={16} width={40} />
      <span className="size-6" />
    </div>
  );
}

function SkeletonBlock({
  height,
  rounded = "md",
  width,
}: {
  height: number;
  rounded?: "sm" | "md";
  width: number;
}) {
  return (
    <div
      className={cn(SKELETON_BLOCK_CLASS, rounded === "sm" ? "rounded-sm" : "rounded-md")}
      data-official-source="index-BELzQL5P.js:sge"
      style={{ height, width, maxWidth: "100%" }}
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
}
