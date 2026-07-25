import { useCallback, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { GroupNameDialog } from "../../../shell/GroupNameDialog";
import { Icon } from "../../../shell/icons";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { coworkSelectedSessionId } from "../sessionPaths";
import { CoworkPinnedSection } from "./CoworkPinnedSection";
import { CoworkRecentList } from "./CoworkRecentList";
import { type CoworkRowAction, useCoworkSessionRowActions } from "./CoworkSessionMenus";
import { CoworkScheduledSection } from "./CoworkScheduledSection";
import { CoworkSpacesSection } from "./CoworkSpacesSection";
import { buildCoworkSidebarModel } from "./coworkSidebarModel";
import { useCoworkSidebarData } from "./useCoworkSidebarData";

/**
 * Official ca0135 Ba residual:
 *   Ba = { chat: "/chats", cowork: "/chats", code: Me, home: "/chats" }
 * Cowork "查看全部" navigates to /chats (not code-only /recents list chrome).
 */
const OFFICIAL_COWORK_VIEW_ALL_HREF = "/chats";

type CoworkRecentsSectionProps = {
  frame: FrameStore;
  onNavigate: (path: string) => void;
};

export function CoworkRecentsSection({ frame, onNavigate }: CoworkRecentsSectionProps) {
  const data = useCoworkSidebarData();
  const [renameTarget, setRenameTarget] = useState<SessionSummary | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SessionSummary | null>(null);
  const selectedSessionId = coworkSelectedSessionId(window.location.pathname);
  const model = useMemo(() => buildCoworkSidebarModel(data.sessions, data.scheduledTasks, data.spaces, frame.pinnedOrder), [data.scheduledTasks, data.sessions, data.spaces, frame.pinnedOrder]);
  const rawActions = useCoworkSessionRowActions(frame, data.setSessions);
  const actions = useCoworkActions(rawActions, setRenameTarget, setDeleteTarget);
  return (
    <div className="dframe-recents-by-mode contents" data-mode="cowork">
      <CoworkScheduledSection frame={frame} items={model.scheduled} onNavigate={onNavigate} selectedSessionId={selectedSessionId} />
      <CoworkSpacesSection frame={frame} onNavigate={onNavigate} spaces={model.spaces} />
      <CoworkPinnedSection frame={frame} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={model.pinned} />
      <CoworkRecentSection frame={frame} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={model.recents} />
      <CoworkSessionDialogs deleteTarget={deleteTarget} onDelete={rawActions} onDeleteClose={() => setDeleteTarget(null)} onRenameClose={() => setRenameTarget(null)} renameTarget={renameTarget} setSessions={data.setSessions} />
    </div>
  );
}

function useCoworkActions(rawActions: (session: SessionSummary, action: CoworkRowAction) => void, setRenameTarget: (session: SessionSummary) => void, setDeleteTarget: (session: SessionSummary) => void) {
  return useCallback((session: SessionSummary, action: CoworkRowAction) => {
    if (action === "rename") return setRenameTarget(session);
    if (action === "delete") return setDeleteTarget(session);
    rawActions(session, action);
  }, [rawActions, setDeleteTarget, setRenameTarget]);
}

function CoworkRecentSection({ frame, onAction, onNavigate, selectedSessionId, sessions }: Parameters<typeof CoworkRecentList>[0]) {
  const text = useShellText();
  const collapsed = frame.collapsedGroups.includes("recents");
  if (sessions.length === 0) return null;
  // Official ca0135 Cl residual for non-code kinds:
  //   group/section → ie(SidebarSectionHeader) trailing = Na("查看全部") when !collapsed && onViewAll
  // Cap already applied in buildCoworkSidebarModel (R=20 for cowork).
  return (
    <section className="group/section flex min-h-0 flex-1 flex-col gap-px" data-cowork-sidebar-section="recents" data-kind="cowork">
      <div className="flex-1 min-h-[120px] overflow-hidden">
        <SidebarSectionHeader
          collapsed={collapsed}
          onToggle={() => frame.toggleGroupCollapsed("recents")}
          trailing={collapsed ? undefined : <CoworkRecentsViewAll onNavigate={onNavigate} />}
        >
          {text.recent}
        </SidebarSectionHeader>
        {!collapsed ? <CoworkRecentList frame={frame} onAction={onAction} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={sessions} /> : null}
      </div>
    </section>
  );
}

/** Official ca0135 Na residual — hover-revealed "查看全部" with CaretRight xsmall. */
function CoworkRecentsViewAll({ onNavigate }: { onNavigate: (path: string) => void }) {
  const text = useShellText();
  return (
    <button
      type="button"
      onClick={() => onNavigate(OFFICIAL_COWORK_VIEW_ALL_HREF)}
      className="flex items-center gap-0.5 text-xs text-text-400 hover:text-text-200 opacity-0 group-hover/section:opacity-60 hover:!opacity-100 focus-visible:opacity-100 transition-opacity duration-150"
    >
      {text.viewAll}
      <Icon name="CaretRight" size="xs" />
    </button>
  );
}

function CoworkSessionDialogs({ deleteTarget, onDelete, onDeleteClose, onRenameClose, renameTarget, setSessions }: { deleteTarget: SessionSummary | null; onDelete: (session: SessionSummary, action: CoworkRowAction) => void; onDeleteClose: () => void; onRenameClose: () => void; renameTarget: SessionSummary | null; setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>> }) {
  const text = useShellText();
  const rename = (name: string) => {
    if (!renameTarget) return;
    setSessions((current) => current.map((item) => item.id === renameTarget.id ? { ...item, title: name } : item));
    void desktopBridge.LocalAgentModeSessions.updateSession?.(renameTarget.id, { title: name });
    onRenameClose();
  };
  return (
    <>
      <ConfirmDialog confirmText={text.delete} isOpen={deleteTarget !== null} message={<>{text.deleteSessionPrefix} “{deleteTarget?.title}”? {text.deleteSessionSuffix}</>} onClose={onDeleteClose} onConfirm={() => { if (deleteTarget) onDelete(deleteTarget, "delete"); }} title={text.deleteSession} variant="danger" />
      <GroupNameDialog initialName={renameTarget?.title ?? ""} isOpen={renameTarget !== null} onClose={onRenameClose} onSubmit={rename} placeholder={text.sessionName} title={text.renameSession} />
    </>
  );
}
