import { useCallback, type Dispatch, type SetStateAction } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, BaseSubmenu, Menu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { coworkSessionPinKey, isCoworkSessionPinned, pinCoworkSession, unpinCoworkSession } from "./coworkSessionPinning";

export type CoworkRowAction = "pin" | "unpin" | "rename" | "archive" | "delete";

export function useCoworkSessionRowActions(frame: FrameStore, setSessions: Dispatch<SetStateAction<SessionSummary[]>>) {
  return useCallback((session: SessionSummary, action: CoworkRowAction) => {
    if (action === "pin") {
      frame.setPinnedOrder(pinCoworkSession(session, frame.pinnedOrder));
      frame.maybeShowDragPinHint();
      return;
    }
    if (action === "unpin") {
      frame.setPinnedOrder(unpinCoworkSession(session, frame.pinnedOrder));
      return;
    }
    if (action === "rename") return;
    if (action === "archive") {
      setSessions((current) => current.map((item) => item.id === session.id ? { ...item, isArchived: true } : item));
      void desktopBridge.LocalAgentModeSessions.archive(session.id);
      return;
    }
    setSessions((current) => current.filter((item) => item.id !== session.id));
    frame.removeFromPinnedOrder(coworkSessionPinKey(session));
    void desktopBridge.LocalAgentModeSessions.delete(session.id);
  }, [frame, setSessions]);
}

export function CoworkSessionRowActions({ frame, onAction, onCreateGroup, session }: { frame: FrameStore; onAction: (session: SessionSummary, action: CoworkRowAction) => void; onCreateGroup: () => void; session: SessionSummary }) {
  return (
    <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
      <Menu.Root>
        <Menu.Trigger aria-label={`More options for ${session.title}`} className="draggable-none size-[calc(var(--df-row-h)-8px)] flex items-center justify-center rounded-md text-text-300 hover:text-text-100 hover:bg-[var(--df-hover)] aria-expanded:bg-bg-400 aria-expanded:text-text-100 transition-colors hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)]" data-row-action="" onClick={(event) => event.stopPropagation()} tabIndex={-1} type="button">
          <Icon customSize={16} name="DotsHorizontal" />
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[180px]" side="right" sideOffset={4}>
          <CoworkSessionRowMenu frame={frame} onAction={onAction} onCreateGroup={onCreateGroup} session={session} />
        </BaseMenuPopup>
      </Menu.Root>
    </span>
  );
}

export function CoworkSessionRowMenu({ frame, onAction, onCreateGroup, session }: { frame: FrameStore; onAction: (session: SessionSummary, action: CoworkRowAction) => void; onCreateGroup: () => void; session: SessionSummary }) {
  const text = useShellText();
  const pinned = isCoworkSessionPinned(session, frame.pinnedOrder);
  return (
    <>
      <BaseMenuItem icon={pinned ? "PinSlash" : "Pin"} onClick={() => onAction(session, pinned ? "unpin" : "pin")}>{pinned ? text.unpin : text.pin}</BaseMenuItem>
      <BaseMenuItem icon="Edit" onClick={() => onAction(session, "rename")}>{text.rename}</BaseMenuItem>
      <CoworkGroupSubmenu frame={frame} onCreateGroup={onCreateGroup} session={session} />
      <BaseMenuSeparator />
      <BaseMenuItem icon="Archive" onClick={() => onAction(session, "archive")}>{text.archive}</BaseMenuItem>
      <BaseMenuItem icon="Trash" onClick={() => onAction(session, "delete")}>{text.delete}</BaseMenuItem>
    </>
  );
}

function CoworkGroupSubmenu({ frame, onCreateGroup, session }: { frame: FrameStore; onCreateGroup: () => void; session: SessionSummary }) {
  const text = useShellText();
  const sessionKey = coworkSessionPinKey(session);
  const currentGroupId = frame.customGroupAssignments[sessionKey] ?? null;
  const currentGroup = frame.customGroups.find((group) => group.id === currentGroupId);
  const assign = (groupId: string | null) => {
    frame.assignToCustomGroup(sessionKey, groupId);
    if (groupId !== null) frame.setGroupBy("cowork", "custom");
  };
  return (
    <BaseSubmenu icon="Folder" label={text.group} summary={currentGroup?.name ?? text.ungrouped}>
      <BaseMenuItem checked={currentGroupId === null} checkedRole="radio" onClick={() => assign(null)}>{text.ungrouped}</BaseMenuItem>
      {frame.customGroups.map((group) => <BaseMenuItem checked={group.id === currentGroupId} checkedRole="radio" key={group.id} onClick={() => assign(group.id)}>{group.name}</BaseMenuItem>)}
      <BaseMenuSeparator />
      <BaseMenuItem icon="Add" keepOpen onClick={onCreateGroup}>{text.newGroup}</BaseMenuItem>
    </BaseSubmenu>
  );
}
