import { useCallback, useEffect, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { GroupNameDialog } from "../../../shell/GroupNameDialog";
import { Icon } from "../../../shell/icons";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { selectedSessionIdFromPath } from "../../../shell/sessionPaths";
import {
  archiveCoworkSession,
  deleteCoworkSession,
  replaceAppNavigation,
  resolveDeletedCoworkSessionFallback,
  subscribeCoworkSessionArchived,
  subscribeCoworkSessionDeleted,
} from "../session/coworkSessionDeletion";
import { coworkSelectedSessionId } from "../sessionPaths";
import { CoworkPinnedSection } from "./CoworkPinnedSection";
import { CoworkRecentList } from "./CoworkRecentList";
import { type CoworkRowAction, useCoworkSessionRowActions } from "./CoworkSessionMenus";
import { CoworkScheduledSection } from "./CoworkScheduledSection";
import { CoworkSpacesSection } from "./CoworkSpacesSection";
import { buildCoworkSidebarModel } from "./coworkSidebarModel";
import { coworkSessionPinKey } from "./coworkSessionPinning";
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
  const model = useMemo(
    () => buildCoworkSidebarModel(data.sessions, data.scheduledTasks, data.spaces, frame.pinnedOrder),
    [data.scheduledTasks, data.sessions, data.spaces, frame.pinnedOrder],
  );
  /**
   * Official sidebar visible order for delete/archive fallback:
   * pinned then recents (capped), de-duped — freeze before await.
   */
  const visibleNavigationOrder = useMemo(() => {
    const pinned = model.pinned;
    const seen = new Set(pinned.map((session) => session.id));
    const rest = model.recents.filter((session) => {
      if (seen.has(session.id)) return false;
      seen.add(session.id);
      return true;
    });
    return [...pinned, ...rest];
  }, [model.pinned, model.recents]);

  const rawActions = useCoworkSessionRowActions(frame, data.setSessions);

  /**
   * Official sidebar archive residual:
   * await archive → next/prev/home if current → clear pin/meta; list keeps isArchived.
   */
  const archiveSession = useCallback(async (session: SessionSummary) => {
    const ordered = visibleNavigationOrder;
    const fallbackPath = resolveDeletedCoworkSessionFallback(ordered, session.id);
    const ok = await archiveCoworkSession(session.id);
    if (!ok) return;
    data.setSessions((current) => current.map((item) => (
      item.id === session.id ? { ...item, isArchived: true, isPinned: false } : item
    )));
    frame.clearSessionSidebarMeta(coworkSessionPinKey(session));
    if (selectedSessionIdFromPath(window.location.pathname) === session.id) {
      replaceAppNavigation(fallbackPath);
    }
  }, [data, frame, visibleNavigationOrder]);

  const actions = useCallback((session: SessionSummary, action: CoworkRowAction) => {
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
    const ordered = visibleNavigationOrder;
    const fallbackPath = resolveDeletedCoworkSessionFallback(ordered, target.id);
    const ok = await deleteCoworkSession(target.id);
    if (!ok) return;
    data.setSessions((current) => current.filter((item) => item.id !== target.id));
    frame.clearSessionSidebarMeta(coworkSessionPinKey(target));
    if (selectedSessionIdFromPath(window.location.pathname) === target.id) {
      replaceAppNavigation(fallbackPath);
    }
  }, [data, deleteTarget, frame, visibleNavigationOrder]);

  // Header/other-window deletes also drop the sidebar row + pin/group meta.
  useEffect(() => {
    return subscribeCoworkSessionDeleted((sessionId) => {
      data.setSessions((current) => {
        const target = current.find((item) => item.id === sessionId);
        if (target) frame.clearSessionSidebarMeta(coworkSessionPinKey(target));
        return current.filter((item) => item.id !== sessionId);
      });
    });
  }, [data, frame]);

  // Header archive: mark isArchived + clear pin/group meta.
  useEffect(() => {
    return subscribeCoworkSessionArchived((sessionId) => {
      data.setSessions((current) => {
        const target = current.find((item) => item.id === sessionId);
        if (target) frame.clearSessionSidebarMeta(coworkSessionPinKey(target));
        return current.map((item) => (
          item.id === sessionId ? { ...item, isArchived: true, isPinned: false } : item
        ));
      });
    });
  }, [data, frame]);

  return (
    <div className="dframe-recents-by-mode contents" data-mode="cowork">
      <CoworkScheduledSection frame={frame} items={model.scheduled} onNavigate={onNavigate} selectedSessionId={selectedSessionId} />
      <CoworkSpacesSection frame={frame} onNavigate={onNavigate} spaces={model.spaces} />
      <CoworkPinnedSection frame={frame} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={model.pinned} />
      <CoworkRecentSection frame={frame} onAction={actions} onNavigate={onNavigate} selectedSessionId={selectedSessionId} sessions={model.recents} />
      <CoworkSessionDialogs
        deleteTarget={deleteTarget}
        onConfirmDelete={() => { void confirmDelete(); }}
        onDeleteClose={() => setDeleteTarget(null)}
        onRenameClose={() => setRenameTarget(null)}
        renameTarget={renameTarget}
        setSessions={data.setSessions}
      />
    </div>
  );
}

function CoworkRecentSection({ frame, onAction, onNavigate, selectedSessionId, sessions }: Parameters<typeof CoworkRecentList>[0]) {
  const text = useShellText();
  const collapsed = frame.collapsedGroups.includes("recents");
  if (sessions.length === 0) return null;
  /**
   * Official ca0135 residual:
   *   Ml wraps recents in `div.flex-1.min-h-[120px]` (no overflow-hidden)
   *   Cl: `group/section flex flex-col gap-px` (NOT min-h-0 flex-1)
   *     header ie + list in `contents` | `hidden`
   * Parent `.dframe-nav-scroll` (FrameSidebar overflow-y-auto) scrolls the full stack.
   * Product had invent `overflow-hidden` + section `min-h-0 flex-1` → list clipped,
   * scrollHeight===clientHeight, wheel no-op.
   * Cap already applied in buildCoworkSidebarModel (R=20 for cowork).
   */
  return (
    <div className="flex-1 min-h-[120px]" data-cowork-sidebar-section="recents">
      <section className="group/section flex flex-col gap-px" data-kind="cowork">
        <SidebarSectionHeader
          collapsed={collapsed}
          onToggle={() => frame.toggleGroupCollapsed("recents")}
          trailing={collapsed ? undefined : <CoworkRecentsViewAll onNavigate={onNavigate} />}
        >
          {text.recent}
        </SidebarSectionHeader>
        <div className={collapsed ? "hidden" : "contents"}>
          <CoworkRecentList
            frame={frame}
            onAction={onAction}
            onNavigate={onNavigate}
            selectedSessionId={selectedSessionId}
            sessions={sessions}
          />
        </div>
      </section>
    </div>
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

function CoworkSessionDialogs({
  deleteTarget,
  onConfirmDelete,
  onDeleteClose,
  onRenameClose,
  renameTarget,
  setSessions,
}: {
  deleteTarget: SessionSummary | null;
  onConfirmDelete: () => void;
  onDeleteClose: () => void;
  onRenameClose: () => void;
  renameTarget: SessionSummary | null;
  setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>>;
}) {
  const text = useShellText();
  const rename = (name: string) => {
    if (!renameTarget) return;
    setSessions((current) => current.map((item) => item.id === renameTarget.id ? { ...item, title: name } : item));
    void desktopBridge.LocalAgentModeSessions.updateSession?.(renameTarget.id, { title: name });
    onRenameClose();
  };
  return (
    <>
      <ConfirmDialog
        confirmText={text.delete}
        isOpen={deleteTarget !== null}
        message={<>{text.deleteSessionPrefix} “{deleteTarget?.title}”? {text.deleteSessionSuffix}</>}
        onClose={onDeleteClose}
        onConfirm={onConfirmDelete}
        title={text.deleteSession}
        variant="danger"
      />
      <GroupNameDialog
        initialName={renameTarget?.title ?? ""}
        isOpen={renameTarget !== null}
        onClose={onRenameClose}
        onSubmit={rename}
        placeholder={text.sessionName}
        title={text.renameSession}
      />
    </>
  );
}
