import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { GroupNameDialog } from "../../../shell/GroupNameDialog";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { coworkSelectedSessionId } from "../sessionPaths";
import { CoworkPinnedSection } from "./CoworkPinnedSection";
import { CoworkRecentList } from "./CoworkRecentList";
import { buildCoworkRecentGroups } from "./coworkRecentGroups";
import { type CoworkRowAction, useCoworkSessionRowActions } from "./CoworkSessionMenus";
import { coworkSessionPinKey, isCoworkSessionPinned } from "./coworkSessionPinning";

type CoworkRecentsSectionProps = {
  frame: FrameStore;
  onNavigate: (path: string) => void;
};

export function CoworkRecentsSection({ frame, onNavigate }: CoworkRecentsSectionProps) {
  const text = useShellText();
  const [sessions, setSessions] = useCoworkSessions();
  const [renameTarget, setRenameTarget] = useState<SessionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const selectedSessionId = coworkSelectedSessionId(window.location.pathname);
  const pinnedKeys = useMemo(() => new Set(sessions.filter((session) => isCoworkSessionPinned(session, frame.pinnedOrder)).map(coworkSessionPinKey)), [frame.pinnedOrder, sessions]);
  const recentSessions = useMemo(() => sessions.filter((session) => !pinnedKeys.has(coworkSessionPinKey(session))), [pinnedKeys, sessions]);
  const groups = useMemo(() => buildCoworkRecentGroups(recentSessions, frame, text), [frame, recentSessions, text]);
  const rawActions = useCoworkSessionRowActions(frame, setSessions);
  const actions = useCoworkActions(rawActions, setRenameTarget, setDeleteTarget);
  return (
    <div className="dframe-recents-by-mode contents" data-mode="cowork">
      <CoworkPinnedSection frame={frame} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={sessions} />
      <CoworkRecentSection frame={frame} groups={groups} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessionCount={sessions.length} />
      <CoworkSessionDialogs deleteTarget={deleteTarget} onDelete={rawActions} onDeleteClose={() => setDeleteTarget(null)} onRenameClose={() => setRenameTarget(null)} renameTarget={renameTarget} setSessions={setSessions} />
    </div>
  );
}

function useCoworkSessions() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  useEffect(() => {
    let mounted = true;
    const load = () => desktopBridge.LocalAgentModeSessions.list().then((items) => { if (mounted) setSessions([...items].sort((left, right) => right.updatedAtMs - left.updatedAtMs)); });
    void load();
    const unsubscribe = desktopBridge.LocalAgentModeSessions.onEvent?.(() => { void load(); });
    return () => { mounted = false; unsubscribe?.(); };
  }, []);
  return [sessions, setSessions] as const;
}

function useCoworkActions(rawActions: (session: SessionSummary, action: CoworkRowAction) => void, setRenameTarget: (session: SessionSummary) => void, setDeleteTarget: (session: SessionSummary) => void) {
  return useCallback((session: SessionSummary, action: CoworkRowAction) => {
    if (action === "rename") return setRenameTarget(session);
    if (action === "delete") return setDeleteTarget(session);
    rawActions(session, action);
  }, [rawActions, setDeleteTarget, setRenameTarget]);
}

function CoworkRecentSection({ frame, groups, onAction, onNavigate, selectedSessionId, sessionCount }: Omit<Parameters<typeof CoworkRecentList>[0], "groups"> & { groups: ReturnType<typeof buildCoworkRecentGroups>; sessionCount: number }) {
  const text = useShellText();
  const collapsed = frame.collapsedGroups.includes("recents");
  const visibleCount = groups.reduce((count, group) => count + group.sessions.length, 0);
  return (
    <section className="flex min-h-0 flex-1 flex-col gap-px" data-kind="cowork">
      <div className="flex-1 min-h-[120px] overflow-hidden">
        <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed("recents")}>{text.recent}</SidebarSectionHeader>
        {!collapsed && visibleCount > 0 ? <CoworkRecentList frame={frame} groups={groups} onAction={onAction} onNavigate={onNavigate} selectedSessionId={selectedSessionId} /> : !collapsed && sessionCount > 0 ? <div className="px-[var(--df-row-px)] py-1 text-xs text-text-500">{text.noFilteredSessions}</div> : null}
      </div>
    </section>
  );
}

function CoworkSessionDialogs({ deleteTarget, onDelete, onDeleteClose, onRenameClose, renameTarget, setSessions }: { deleteTarget: SessionSummary | null; onDelete: (session: SessionSummary, action: CoworkRowAction) => void; onDeleteClose: () => void; onRenameClose: () => void; renameTarget: SessionSummary | null; setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>> }) {
  const text = useShellText();
  return (
    <>
      <ConfirmDialog confirmText={text.delete} isOpen={deleteTarget !== null} message={<>{text.deleteSessionPrefix} “{deleteTarget?.title}”? {text.deleteSessionSuffix}</>} onClose={onDeleteClose} onConfirm={() => { if (deleteTarget) onDelete(deleteTarget, "delete"); }} title={text.deleteSession} variant="danger" />
      <GroupNameDialog initialName={renameTarget?.title ?? ""} isOpen={renameTarget !== null} onClose={onRenameClose} onSubmit={(name) => setSessions((current) => current.map((item) => item.id === renameTarget?.id ? { ...item, title: name } : item))} placeholder={text.sessionName} title={text.renameSession} />
    </>
  );
}
