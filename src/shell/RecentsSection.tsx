import { useCallback, useEffect, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { desktopBridge, type SessionSummary } from "../adapters/desktopBridge";
import { useShellText } from "../i18n/shellMessages";
import type { FrameMode, FrameStore } from "../stores/frameStore";
import { BaseContextMenuPopup, ContextMenu } from "./BaseMenu";
import { buildCustomGroups, CustomGroupHeader, type RecentDisplayGroup } from "./CustomGroups";
import { ConfirmDialog } from "./ConfirmDialog";
import { GroupNameDialog } from "./GroupNameDialog";
import { PinnedSection, readSessionDragKey, writeSessionDragKey } from "./PinnedSection";
import { buildRecentsGroups, defaultRecentsFilter, RecentsControls, type RecentsFilterState } from "./RecentsControls";
import { isPinnedSession, sessionPinKey } from "./sessionPinning";
import { SessionRowActions, useSessionRowActions } from "./SessionRowActions";
import { SessionRowMenuContent, type RowAction } from "./SessionRowMenus";
import { SidebarSectionHeader } from "./SidebarSectionHeader";
import { selectedSessionIdFromPath, sessionPath } from "./sessionPaths";

type RecentsSectionProps = {
  frame: FrameStore;
  mode: FrameMode;
  onNavigate: (path: string) => void;
};

const byNewest = (left: SessionSummary, right: SessionSummary) => right.updatedAtMs - left.updatedAtMs;

export function RecentsSection({ frame, mode, onNavigate }: RecentsSectionProps) {
  const text = useShellText();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [filterDraft, setFilterDraft] = useState<RecentsFilterState>(defaultRecentsFilter);
  const [renameTarget, setRenameTarget] = useState<SessionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const openSessionId = selectedSessionIdFromPath(window.location.pathname);

  useEffect(() => {
    let mounted = true;
    const source = mode === "code" ? desktopBridge.LocalSessions : desktopBridge.LocalAgentModeSessions;
    const loadSessions = () => source.list().then((items) => {
      if (mounted) setSessions([...items].sort(byNewest));
    });
    void loadSessions();
    const unsubscribe = source.onEvent?.(() => {
      void loadSessions();
    });
    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, [mode]);

  const filter = useMemo(() => ({
    ...filterDraft,
    groupBy: frame.groupByByMode[mode] ?? defaultRecentsFilter.groupBy,
    sortBy: frame.sortByByMode[mode] ?? defaultRecentsFilter.sortBy,
  }), [filterDraft, frame.groupByByMode, frame.sortByByMode, mode]);
  const updateFilter = useCallback((next: RecentsFilterState) => {
    if (next.groupBy !== filter.groupBy) frame.setGroupBy(mode, next.groupBy);
    if (next.sortBy !== filter.sortBy) frame.setSortBy(mode, next.sortBy);
    setFilterDraft({ ...next, groupBy: defaultRecentsFilter.groupBy, sortBy: defaultRecentsFilter.sortBy });
  }, [filter.groupBy, filter.sortBy, frame, mode]);

  const pinnedKeys = useMemo(() => new Set(sessions.filter((session) => isPinnedSession(session, frame.pinnedOrder)).map(sessionPinKey)), [frame.pinnedOrder, sessions]);
  const recentsSessions = useMemo(() => sessions.filter((session) => !pinnedKeys.has(sessionPinKey(session))), [pinnedKeys, sessions]);
  const groups = useMemo(() => filter.groupBy === "custom"
    ? buildCustomGroups(recentsSessions, filter, frame, text)
    : buildRecentsGroups(recentsSessions, filter, text), [filter, frame, recentsSessions, text]);
  const rows = useMemo(() => groups.flatMap((group) => group.sessions).slice(0, 20), [groups]);
  const rawActions = useSessionRowActions(frame, setSessions);
  const actions = useCallback((session: SessionSummary, action: RowAction) => {
    if (action === "rename") {
      setRenameTarget(session);
      return;
    }
    if (action === "delete") {
      setDeleteTarget(session);
      return;
    }
    rawActions(session, action);
  }, [rawActions]);
  const createGroupForSession = useCallback((session: SessionSummary, name: string) => {
    const group = frame.addCustomGroup(name);
    frame.assignToCustomGroup(sessionPinKey(session), group.id);
    frame.setGroupBy("code", "custom");
  }, [frame]);
  const openSplit = useCallback((session: SessionSummary) => {
    window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path: sessionPath(session), title: session.title } }));
  }, []);
  const renderActions = useCallback((session: SessionSummary, onCreateGroup: () => void) => (
    <SessionRowActions frame={frame} onAction={actions} onCreateGroup={onCreateGroup} onOpenSplit={() => openSplit(session)} session={session} />
  ), [actions, frame, openSplit]);
  const renderContextMenu = useCallback((session: SessionSummary, onCreateGroup: () => void) => (
    <SessionRowMenuContent frame={frame} onAction={actions} onCreateGroup={onCreateGroup} onOpenSplit={() => openSplit(session)} session={session} />
  ), [actions, frame, openSplit]);
  const recentsCollapsed = frame.collapsedGroups.includes("recents");

  return (
    <div className="dframe-recents-by-mode contents" data-mode={mode}>
      <PinnedSection
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
      <section data-kind={mode} className="flex min-h-0 flex-1 flex-col gap-px">
        <div className="flex-1 min-h-[120px] overflow-hidden">
          <SidebarSectionHeader collapsed={recentsCollapsed} onToggle={() => frame.toggleGroupCollapsed("recents")} trailing={mode === "code" ? <RecentsControls mode={mode} sessions={sessions} value={filter} onChange={updateFilter} /> : undefined}>{text.recent}</SidebarSectionHeader>
          {!recentsCollapsed && (rows.length > 0 ? <RecentRows filter={filter} frame={frame} groups={groups} onAction={actions} renderActions={renderActions} selectedSessionId={openSessionId} onNavigate={onNavigate} rows={rows} /> : sessions.length > 0 ? <div className="px-[var(--df-row-px)] py-1 text-xs text-text-500">{text.noFilteredSessions}</div> : null)}
        </div>
      </section>
      <ConfirmDialog
        confirmText={text.delete}
        isOpen={deleteTarget !== null}
        message={<>{text.deleteSessionPrefix} “{deleteTarget?.title}”? {text.deleteSessionSuffix}</>}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { if (deleteTarget) rawActions(deleteTarget, "delete"); }}
        title={text.deleteSession}
        variant="danger"
      />
      <GroupNameDialog
        initialName={renameTarget?.title ?? ""}
        isOpen={renameTarget !== null}
        onClose={() => setRenameTarget(null)}
        onSubmit={(name) => {
          setSessions((current) => current.map((item) => item.id === renameTarget?.id ? { ...item, title: name } : item));
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
  const customDrop = filter.groupBy === "custom" ? customGroupDropHandler(frame, group) : undefined;
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
  const onOpenSplit = () => window.dispatchEvent(new CustomEvent("dframe:open-pane", { detail: { path, title: session.title } }));
  const createGroup = (name: string) => {
    const group = frame.addCustomGroup(name);
    frame.assignToCustomGroup(sessionPinKey(session), group.id);
    frame.setGroupBy("code", "custom");
  };
  const menu = <SessionRowMenuContent frame={frame} onAction={onAction} onCreateGroup={() => setCreateGroupOpen(true)} onOpenSplit={onOpenSplit} session={session} />;
  return (
    <>
      <ContextMenu.Root>
        <ContextMenu.Trigger
          className={sidebarRowClassName(selected)}
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
            className="flex flex-1 min-w-0 items-center gap-1.5 text-left border-0 bg-transparent p-0 text-inherit"
            data-row-main-button=""
            data-selected={selected ? "open" : undefined}
            draggable
            onDragStart={(event) => writeSessionDragKey(event, sessionPinKey(session))}
            onClick={(event) => {
              if (event.metaKey || event.ctrlKey) {
                onOpenSplit();
                return;
              }
              onNavigate(path);
            }}
            type="button"
          >
            <span className="df-leading-slot">
              <SessionGlyph session={session} />
            </span>
            <span className="min-w-0 flex-1 truncate">{session.title}</span>
            {session.isRunning ? <span className="status-dot" data-kind="ready" /> : null}
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

function sidebarRowClassName(selected: boolean) {
  const base = "group relative df-drag-shiftable flex w-full items-center gap-[var(--df-row-gap)] h-[var(--df-row-h)] px-[var(--df-row-px)] rounded-[var(--df-radius-pill)] text-[length:var(--df-row-font)]";
  return selected ? `${base} bg-bg-300 text-text-000` : `${base} text-text-300 hover:bg-bg-200`;
}

function nextPinnedOrder(pinnedOrder: string[], key: string, beforeKey?: string) {
  const without = pinnedOrder.filter((item) => item !== key);
  if (!beforeKey) return [key, ...without];
  const index = without.indexOf(beforeKey);
  if (index === -1) return [key, ...without];
  return [...without.slice(0, index), key, ...without.slice(index)];
}

function customGroupDropHandler(frame: FrameStore, group: RecentDisplayGroup) {
  const groupId = group.customGroupId ?? null;
  const keys = group.sessions.map(sessionPinKey);
  const assign = (droppedKey: string, order: string[]) => {
    frame.assignToCustomGroup(droppedKey, groupId, groupId ? order : undefined);
    if (groupId) frame.setGroupBy("code", "custom");
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
  if (session.sessionKind === "code") {
    return <span className="claude-rebuild-session-dot" aria-hidden="true" />;
  }

  return (
    <span className="claude-rebuild-logo" aria-hidden="true">
      ✳
    </span>
  );
}
