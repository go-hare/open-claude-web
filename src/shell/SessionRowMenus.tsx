import type { SessionSummary } from "../adapters/desktopBridge";
import { useShellText } from "../i18n/shellMessages";
import type { FrameStore } from "../stores/frameStore";
import { BaseMenuItem, BaseMenuSeparator } from "./BaseMenu";
import { GroupSubmenu } from "./CustomGroups";
import { isPinnedSession } from "./sessionPinning";

export type RowAction = "pin" | "unpin" | "rename" | "archive" | "delete";

type SessionRowMenuContentProps = {
  frame: FrameStore;
  onAction: (session: SessionSummary, action: RowAction) => void;
  onCreateGroup: () => void;
  onOpenSplit: () => void;
  session: SessionSummary;
};

export function SessionRowMenuContent({ frame, onAction, onCreateGroup, onOpenSplit, session }: SessionRowMenuContentProps) {
  const text = useShellText();
  const pinned = isPinnedSession(session, frame.pinnedOrder);
  return (
    <>
      <BaseMenuItem icon="ArrowSplitRight" onClick={onOpenSplit}>{text.openInSplitView}</BaseMenuItem>
      <BaseMenuSeparator />
      <BaseMenuItem icon={pinned ? "PinSlash" : "Pin"} onClick={() => onAction(session, pinned ? "unpin" : "pin")}>{pinned ? text.unpin : text.pin}</BaseMenuItem>
      <BaseMenuItem icon="Edit" onClick={() => onAction(session, "rename")}>{text.rename}</BaseMenuItem>
      <GroupSubmenu frame={frame} onCreateGroup={onCreateGroup} session={session} />
      <BaseMenuSeparator />
      <BaseMenuItem icon="Archive" onClick={() => onAction(session, "archive")}>{text.archive}</BaseMenuItem>
      <BaseMenuItem icon="Trash" onClick={() => onAction(session, "delete")}>{text.delete}</BaseMenuItem>
    </>
  );
}
