import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { desktopBridge, type SessionSummary } from "../adapters/desktopBridge";
import { useShellText } from "../i18n/shellMessages";
import type { FrameStore } from "../stores/frameStore";
import { BaseContextMenuPopup, ContextMenu } from "./BaseMenu";
import { buildCustomGroups, CustomGroupHeader, type RecentDisplayGroup } from "./CustomGroups";
import { ConfirmDialog } from "./ConfirmDialog";
import { GroupNameDialog } from "./GroupNameDialog";
import { OfficialSidebarStatusGlyph } from "./OfficialSidebarStatusGlyph";
import { PinnedSection, readSessionDragKey, writeSessionDragKey } from "./PinnedSection";
import { buildRecentsGroups, defaultRecentsFilter, RecentsControls, type RecentsFilterState } from "./RecentsControls";
import { isPinnedSession, orderPinnedSessions, sessionPinKey } from "./sessionPinning";
import { SessionRowActions, useSessionRowActions } from "./SessionRowActions";
import { SessionRowMenuContent, type RowAction } from "./SessionRowMenus";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { canOpenSessionInSplit, selectedSessionIdFromPath, sessionPath } from "./sessionPaths";
import {
  archiveCodeSession,
  deleteCodeSession,
  replaceAppNavigation,
  resolveDeletedCodeSessionFallback,
  subscribeCodeSessionArchived,
  subscribeCodeSessionDeleted,
} from "../features/epitaxy/session/codeSessionDeletion";
import { officialCodeSessionStore } from "../features/epitaxy/session/officialCodeSessionStore";

type RecentsSectionProps = {
  frame: FrameStore;
  onNavigate: (path: string) => void;
};

const byNewest = (left: SessionSummary, right: SessionSummary) => right.updatedAtMs - left.updatedAtMs;

export function RecentsSection({ frame, onNavigate }: RecentsSectionProps) {
  const text = useShellText();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [filterDraft, setFilterDraft] = useState<RecentsFilterState>(defaultRecentsFilter);
  const [renameTarget, setRenameTarget] = useState<SessionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const openSessionId = selectedSessionIdFromPath(window.location.pathname);

  const [isLoadingLocal, setIsLoadingLocal] = useState(true);

  useEffect(() => {
    let mounted = true;
    const source = desktopBridge.LocalSessions;
    // Official Pw: isLoadingLocal | isLoadingRemote — we only have LocalSessions list today.
    const loadSessions = (opts?: { silent?: boolean }) => {
      if (!opts?.silent && mounted) setIsLoadingLocal(true);
      return source.list().then((items) => {
        if (!mounted) return;
        const sorted = [...items].sort(byNewest);
        setSessions(sorted);
        setIsLoadingLocal(false);
        // Official: session meta is shared with chat buckets — seed openSession meta so
        // selecting a recent can paint title/cwd immediately from the same store as tm.
        const store = officialCodeSessionStore.getState();
        for (const session of sorted) {
          const existing = store.buckets[session.id];
          if (existing?.session && existing.messages.length > 0) continue;
          store.openSession(session.id, session);
        }
      }).catch(() => {
        if (mounted) setIsLoadingLocal(false);
      });
    };
    void loadSessions();
    const unsubscribe = source.onEvent?.(() => {
      // Event-driven refresh stays silent so the list does not flash loading chrome.
      void loadSessions({ silent: true });
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  const filter = useMemo(() => ({
    ...filterDraft,
    groupBy: frame.groupByByMode.code ?? defaultRecentsFilter.groupBy,
    sortBy: frame.sortByByMode.code ?? defaultRecentsFilter.sortBy,
  }), [filterDraft, frame.groupByByMode.code, frame.sortByByMode.code]);
  const updateFilter = useCallback((next: RecentsFilterState) => {
    if (next.groupBy !== filter.groupBy) frame.setGroupBy("code", next.groupBy);
    if (next.sortBy !== filter.sortBy) frame.setSortBy("code", next.sortBy);
    setFilterDraft({ ...next, groupBy: defaultRecentsFilter.groupBy, sortBy: defaultRecentsFilter.sortBy });
  }, [filter.groupBy, filter.sortBy, frame]);

  const pinnedKeys = useMemo(() => new Set(sessions.filter((session) => isPinnedSession(session, frame.pinnedOrder)).map(sessionPinKey)), [frame.pinnedOrder, sessions]);
  const recentsSessions = useMemo(() => sessions.filter((session) => !pinnedKeys.has(sessionPinKey(session))), [pinnedKeys, sessions]);
  const groups = useMemo(() => filter.groupBy === "custom"
    ? buildCustomGroups(recentsSessions, filter, frame, text)
    : buildRecentsGroups(recentsSessions, filter, text), [filter, frame, recentsSessions, text]);
  // Official recents sidebar is not hard-capped at 20; keep full filtered/grouped list (scroll in section).
  const rows = useMemo(() => groups.flatMap((group) => group.sessions), [groups]);
  /**
   * Official sidebar visible order for delete fallback:
   * pinned (explicit order) then filtered/grouped recents rows, de-duped.
   */
  const visibleNavigationOrder = useMemo(() => {
    const pinned = orderPinnedSessions(sessions, frame.pinnedOrder);
    const seen = new Set(pinned.map((session) => session.id));
    const rest = rows.filter((session) => {
      if (seen.has(session.id)) return false;
      seen.add(session.id);
      return true;
    });
    return [...pinned, ...rest];
  }, [frame.pinnedOrder, rows, sessions]);
  const rawActions = useSessionRowActions(frame, setSessions);
  /**
   * Official sidebar archive residual (ue):
   * await archive → de(next/prev/home) if current → KEe pane ref clear.
   * Archived rows stay in sessions with isArchived; default filter hides them.
   */
  const archiveSession = useCallback(async (session: SessionSummary) => {
    const ordered = visibleNavigationOrder;
    const fallbackPath = resolveDeletedCodeSessionFallback(ordered, session.id);
    const ok = await archiveCodeSession(session.id);
    if (!ok) return;
    setSessions((current) => current.map((item) => (
      item.id === session.id ? { ...item, isArchived: true } : item
    )));
    frame.clearSessionSidebarMeta(sessionPinKey(session));
    if (selectedSessionIdFromPath(window.location.pathname) === session.id) {
      replaceAppNavigation(fallbackPath);
    }
  }, [frame, visibleNavigationOrder]);
  const actions = useCallback((session: SessionSummary, action: RowAction) => {
    if (action === "rename") {
      setRenameTarget(session);
      return;
    }
    if (action === "delete") {
      setDeleteTarget(session);
      return;
    }
    if (action === "archive") {
      void archiveSession(session);
      return;
    }
    rawActions(session, action);
  }, [archiveSession, rawActions]);
  const confirmDelete = useCallback(async () => {
    const target = deleteTarget;
    if (!target) return;
    setDeleteTarget(null);
    // Freeze visible order before await so next/previous matches what the user saw.
    const ordered = visibleNavigationOrder;
    const fallbackPath = resolveDeletedCodeSessionFallback(ordered, target.id);
    const ok = await deleteCodeSession(target.id);
    if (!ok) return;
    setSessions((current) => current.filter((item) => item.id !== target.id));
    // Official: drop pin + custom-group assignment/order (orphan keys).
    frame.clearSessionSidebarMeta(sessionPinKey(target));
    // Only leave the route if still viewing the deleted session (race-safe).
    if (selectedSessionIdFromPath(window.location.pathname) === target.id) {
      replaceAppNavigation(fallbackPath);
    }
  }, [deleteTarget, frame, visibleNavigationOrder]);

  // Header/other-window deletes also drop the sidebar row + pin/group meta.
  useEffect(() => {
    return subscribeCodeSessionDeleted((sessionId) => {
      setSessions((current) => {
        const target = current.find((item) => item.id === sessionId);
        if (target) frame.clearSessionSidebarMeta(sessionPinKey(target));
        return current.filter((item) => item.id !== sessionId);
      });
    });
  }, [frame]);

  // Header archive: mark isArchived + clear pin/group meta (list stays, default filter hides).
  useEffect(() => {
    return subscribeCodeSessionArchived((sessionId) => {
      setSessions((current) => {
        const target = current.find((item) => item.id === sessionId);
        if (target) frame.clearSessionSidebarMeta(sessionPinKey(target));
        return current.map((item) => (
          item.id === sessionId ? { ...item, isArchived: true } : item
        ));
      });
    });
  }, [frame]);
  const createGroupForSession = useCallback((session: SessionSummary, name: string) => {
    const group = frame.addCustomGroup(name);
    frame.assignToCustomGroup(sessionPinKey(session), group.id);
    frame.setGroupBy("code", "custom");
  }, [frame]);
  const openSplit = useCallback((session: SessionSummary) => {
    window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path: sessionPath(session), title: session.title } }));
  }, []);
  const canOpenSplit = useCallback((session: SessionSummary) => canOpenSessionInSplit("code", session), []);
  const renderActions = useCallback((session: SessionSummary, onCreateGroup: () => void) => (
    <SessionRowActions frame={frame} onAction={actions} onCreateGroup={onCreateGroup} onOpenSplit={() => openSplit(session)} session={session} />
  ), [actions, frame, openSplit]);
  const renderContextMenu = useCallback((session: SessionSummary, onCreateGroup: () => void) => (
    <SessionRowMenuContent frame={frame} onAction={actions} onCreateGroup={onCreateGroup} onOpenSplit={() => openSplit(session)} session={session} />
  ), [actions, frame, openSplit]);
  const recentsCollapsed = frame.collapsedGroups.includes("recents");

  return (
    <div className="dframe-recents-by-mode contents" data-mode="code">
      <PinnedSection
        canOpenSplit={canOpenSplit}
        collapsed={frame.collapsedGroups.includes("pinned")}
        onCloseDragPinHint={frame.markDragPinHintSeen}
        onDropSessionKey={(key, beforeKey) => {
          frame.setPinnedOrder(nextPinnedOrder(frame.pinnedOrder, key, beforeKey));
          frame.markDragPinHintSeen();
        }}
        pinnedOrder={frame.pinnedOrder}
        onCreateGroup={createGroupForSession}
        onToggleCollapsed={() => frame.toggleGroupCollapsed("pinned")}
        renderActions={renderActions}
        renderContextMenu={renderContextMenu}
        sessions={sessions}
        selectedSessionId={openSessionId}
        showDragPinHint={frame.showDragPinHint}
        onNavigate={onNavigate}
      />
      {/*
        Official ca0135 recents residual:
        div.group/section.flex.flex-col.gap-px → Fo(label:recents) → ie(SidebarSectionHeader)
        Caret uses group-hover/section:opacity-100 — parent MUST be group/section.
      */}
      <section data-kind="code" className="group/section flex min-h-0 flex-1 flex-col gap-px">
        <SidebarSectionHeader
          collapsed={recentsCollapsed}
          onToggle={() => frame.toggleGroupCollapsed("recents")}
          trailing={recentsCollapsed ? undefined : <RecentsControls mode="code" sessions={sessions} value={filter} onChange={updateFilter} />}
        >
          {text.recent}
        </SidebarSectionHeader>
        <div className={recentsCollapsed ? "hidden" : "flex min-h-0 flex-1 flex-col overflow-hidden"}>
          {isLoadingLocal && sessions.length === 0
            ? <div className="px-[var(--df-row-px)] py-2 text-xs text-text-500" role="status">Loading…</div>
            : rows.length > 0
              ? <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
                  <RecentRows filter={filter} frame={frame} groups={groups} onAction={actions} renderActions={renderActions} selectedSessionId={openSessionId} onNavigate={onNavigate} rows={rows} />
                </div>
              : sessions.length > 0
                ? <div className="px-[var(--df-row-px)] py-1 text-xs text-text-500">{text.noFilteredSessions}</div>
                : null}
        </div>
      </section>
      <ConfirmDialog
        confirmText={text.delete}
        isOpen={deleteTarget !== null}
        message={<>{text.deleteSessionPrefix} “{deleteTarget?.title}”? {text.deleteSessionSuffix}</>}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { void confirmDelete(); }}
        title={text.deleteSession}
        variant="danger"
      />
      <GroupNameDialog
        initialName={renameTarget?.title ?? ""}
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        onSubmit={(name) => {
          const target = renameTarget;
          if (!target) return;
          const nextTitle = name.trim();
          if (!nextTitle || nextTitle === target.title) return;
          setSessions((current) => current.map((item) => item.id === target.id ? { ...item, title: nextTitle } : item));
          officialCodeSessionStore.getState().patchSession(target.id, { title: nextTitle });
          void desktopBridge.LocalSessions.updateSession?.(target.id, { title: nextTitle }).then((updated) => {
            if (!updated) return;
            setSessions((current) => current.map((item) => item.id === target.id ? { ...item, ...updated } : item));
            officialCodeSessionStore.getState().patchSession(target.id, updated);
          });
        }}
        placeholder={text.sessionName}
        title={text.renameSession}
      />
    </div>
  );
}

function RecentRows({ filter, frame, groups, onAction, onNavigate, renderActions, rows, selectedSessionId }: { filter: RecentsFilterState; frame: FrameStore; groups: RecentDisplayGroup[]; onAction: (session: SessionSummary, action: RowAction) => void; onNavigate: (path: string) => void; renderActions: (session: SessionSummary, onCreateGroup: () => void) => ReactNode; rows: SessionSummary[]; selectedSessionId: string | null }) {
  if (filter.groupBy === "none") {
    return rows.map((session) => <RecentSessionRow frame={frame} key={session.id} onAction={onAction} renderActions={renderActions} selected={session.id === selectedSessionId} session={session} onNavigate={onNavigate} />);
  }
  return groups.map((group) => <RecentSessionGroup filter={filter} frame={frame} group={group} key={group.key} onAction={onAction} renderActions={renderActions} selectedSessionId={selectedSessionId} onNavigate={onNavigate} />);
}

function RecentSessionGroup({ filter, frame, group, onAction, onNavigate, renderActions, selectedSessionId }: { filter: RecentsFilterState; frame: FrameStore; group: RecentDisplayGroup; onAction: (session: SessionSummary, action: RowAction) => void; onNavigate: (path: string) => void; renderActions: (session: SessionSummary, onCreateGroup: () => void) => ReactNode; selectedSessionId: string | null }) {
  const collapsed = frame.collapsedGroups.includes(group.key);
  const customDrop = filter.groupBy === "custom" ? customGroupDropHandler(frame, group, frame.mode) : undefined;
  return (
    <div className="group/section flex flex-col gap-px rounded-lg transition-colors" onDragOver={customDrop?.onDragOver} onDrop={customDrop?.onDropEnd}>
      {group.customGroupId ? <CustomGroupHeader frame={frame} groupId={group.customGroupId} label={group.label ?? ""} /> : group.label ? <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed(group.key)}>{group.label}</SidebarSectionHeader> : null}
      <div className={collapsed ? "hidden" : "contents"}>
        {group.sessions.map((session) => (
          <RecentSessionRow
            frame={frame}
            key={session.id}
            onAction={onAction}
            onDropBefore={customDrop ? (droppedKey) => customDrop.dropBefore(droppedKey, sessionPinKey(session)) : undefined}
            renderActions={renderActions}
            selected={session.id === selectedSessionId}
            session={session}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </div>
  );
}

function RecentSessionRow({ frame, onAction, onDropBefore, renderActions, selected, session, onNavigate }: { frame: FrameStore; onAction: (session: SessionSummary, action: RowAction) => void; onDropBefore?: (droppedKey: string) => void; renderActions: (session: SessionSummary, onCreateGroup: () => void) => ReactNode; selected: boolean; session: SessionSummary; onNavigate: (path: string) => void }) {
  const [createGroupOpen, setCreateGroupOpen] = useState(false);
  const path = sessionPath(session);
  const canOpenSplit = canOpenSessionInSplit(frame.mode, session);
  const onOpenSplit = () => window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path, title: session.title } }));
  const createGroup = (name: string) => {
    const group = frame.addCustomGroup(name);
    frame.assignToCustomGroup(sessionPinKey(session), group.id);
    frame.setGroupBy(frame.mode, "custom");
  };
  const menu = <SessionRowMenuContent frame={frame} onAction={onAction} onCreateGroup={() => setCreateGroupOpen(true)} onOpenSplit={onOpenSplit} session={session} />;
  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          className={sidebarRowWrapperClassName()}
          data-row=""
          data-selected={selected ? "open" : undefined}
          data-jump-hint-row=""
          data-row-key={sessionPinKey(session)}
          onDragOver={(event) => {
            if (!onDropBefore) return;
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
          }}
          onDrop={(event) => {
            if (!onDropBefore) return;
            const droppedKey = readSessionDragKey(event);
            if (!droppedKey || droppedKey === sessionPinKey(session)) return;
            event.preventDefault();
            event.stopPropagation();
            onDropBefore(droppedKey);
          }}
        >
          <button
            className={sidebarRowButtonClassName()}
            data-row-main-button=""
            data-selected={selected ? "open" : undefined}
            draggable
            onDragStart={(event) => writeSessionDragKey(event, sessionPinKey(session))}
            onClick={(event) => {
              if ((event.metaKey || event.ctrlKey) && canOpenSplit) {
                onOpenSplit();
                return;
              }
              onNavigate(path);
            }}
            type="button"
          >
            <span className="df-leading-slot text-text-300">
              <SessionGlyph session={session} />
            </span>
            <span className="flex-1 min-w-0">
              <OfficialSidebarTitle>{session.title}</OfficialSidebarTitle>
            </span>
          </button>
          {renderActions(session, () => setCreateGroupOpen(true))}
        </ContextMenu.Trigger>
        <BaseContextMenuPopup className="min-w-[180px]">
          {menu}
        </BaseContextMenuPopup>
      </ContextMenu.Root>
      <GroupNameDialog isOpen={createGroupOpen} onClose={() => setCreateGroupOpen(false)} onSubmit={createGroup} />
    </>
  );
}

function sidebarRowWrapperClassName() {
  return "group relative df-drag-shiftable rounded-[var(--df-radius-pill)] hover:bg-[var(--df-hover)] focus-within:bg-[var(--df-hover)] data-[selected=focused]:bg-bg-200 data-[selected=focused]:text-text-000 data-[selected=open]:bg-bg-200 data-[menu-open=true]:bg-[var(--df-hover)]";
}

function sidebarRowButtonClassName() {
  return "w-full shrink-0 border-none text-left text-[length:var(--df-row-font)] text-text-300 flex items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)] rounded-[var(--df-radius-pill)] data-[selected=focused]:text-text-000";
}

function OfficialSidebarTitle({ children }: { children: string }) {
  return (
    <span className="block w-full min-w-0 whitespace-nowrap overflow-hidden [mask-image:linear-gradient(to_right,hsl(var(--always-black))_85%,transparent_99%)] group-hover:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-focus-within:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)] group-data-[menu-open=true]:[mask-image:linear-gradient(to_right,hsl(var(--always-black))_60%,transparent_78%)]">
      {children}
    </span>
  );
}

function nextPinnedOrder(pinnedOrder: string[], key: string, beforeKey?: string) {
  const without = pinnedOrder.filter((item) => item !== key);
  if (!beforeKey) return [key, ...without];
  const index = without.indexOf(beforeKey);
  if (index === -1) return [key, ...without];
  return [...without.slice(0, index), key, ...without.slice(index)];
}

function customGroupDropHandler(frame: FrameStore, group: RecentDisplayGroup, mode: FrameStore["mode"]) {
  const groupId = group.customGroupId ?? null;
  const keys = group.sessions.map(sessionPinKey);
  const assign = (droppedKey: string, order: string[]) => {
    frame.assignToCustomGroup(droppedKey, groupId, groupId ? order : undefined);
    if (groupId) frame.setGroupBy(mode, "custom");
  };
  return {
    dropBefore: (droppedKey: string, beforeKey: string) => {
      if (droppedKey === beforeKey) return;
      assign(droppedKey, insertBefore(keys, droppedKey, beforeKey));
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
    },
    onDropEnd: (event: DragEvent<HTMLElement>) => {
      const droppedKey = readSessionDragKey(event);
      if (!droppedKey) return;
      event.preventDefault();
      assign(droppedKey, [...keys.filter((key) => key !== droppedKey), droppedKey]);
    },
  };
}

function insertBefore(keys: string[], droppedKey: string, beforeKey: string) {
  const without = keys.filter((key) => key !== droppedKey);
  const index = without.indexOf(beforeKey);
  if (index < 0) return [droppedKey, ...without];
  return [...without.slice(0, index), droppedKey, ...without.slice(index)];
}

function SessionGlyph({ session }: { session: SessionSummary }) {
  return <OfficialSidebarStatusGlyph session={session} />;
}
