import { useCallback, type Dispatch, type SetStateAction } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { useShellText } from "../../../i18n/shellMessages";
import type { FrameStore } from "../../../stores/frameStore";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, Menu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import {
  CoworkArchiveGlyph,
  CoworkEditGlyph,
  CoworkMarkDoneGlyph,
  CoworkPinGlyph,
  CoworkTrashGlyph,
  CoworkUnpinGlyph,
} from "../ui/CoworkOfficialGlyphs";
import { isCoworkSessionPinned, pinCoworkSession, unpinCoworkSession } from "./coworkSessionPinning";

export type CoworkRowAction = "pin" | "unpin" | "rename" | "archive" | "delete" | "toggleDone";

/**
 * Row actions except delete/archive — those are owned by CoworkRecentsSection so
 * navigation fallback + sidebar meta clear can run after shared mutation success.
 */
export function useCoworkSessionRowActions(frame: FrameStore, setSessions: Dispatch<SetStateAction<SessionSummary[]>>) {
  return useCallback((session: SessionSummary, action: CoworkRowAction) => {
    if (action === "pin") {
      frame.setPinnedOrder(pinCoworkSession(session, frame.pinnedOrder));
      frame.maybeShowDragPinHint();
      updateCoworkSession(setSessions, session, { isPinned: true });
      return;
    }
    if (action === "unpin") {
      frame.setPinnedOrder(unpinCoworkSession(session, frame.pinnedOrder));
      updateCoworkSession(setSessions, session, { isPinned: false });
      return;
    }
    if (action === "rename") return;
    if (action === "toggleDone") {
      updateCoworkSession(setSessions, session, { isAgentCompleted: !session.isAgentCompleted });
      return;
    }
    // archive / delete: handled by CoworkRecentsSection (await shared command + nav/meta).
  }, [frame, setSessions]);
}

function updateCoworkSession(setSessions: Dispatch<SetStateAction<SessionSummary[]>>, session: SessionSummary, patch: Partial<SessionSummary>) {
  setSessions((current) => current.map((item) => item.id === session.id ? { ...item, ...patch } : item));
  void desktopBridge.LocalAgentModeSessions.updateSession?.(session.id, patch);
}

export function CoworkSessionRowActions({ frame, onAction, session }: { frame: FrameStore; onAction: (session: SessionSummary, action: CoworkRowAction) => void; session: SessionSummary }) {
  return (
    <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
      <Menu.Root>
        <Menu.Trigger aria-label={`More options for ${session.title}`} className="draggable-none size-[calc(var(--df-row-h)-8px)] flex items-center justify-center rounded-md text-text-300 hover:text-text-100 hover:bg-[var(--df-hover)] aria-expanded:bg-bg-400 aria-expanded:text-text-100 transition-colors hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)]" data-row-action="" onClick={(event) => event.stopPropagation()} tabIndex={-1} type="button">
          <Icon customSize={16} name="DotsHorizontal" />
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[180px]" side="right" sideOffset={4}>
          <CoworkSessionRowMenu frame={frame} onAction={onAction} session={session} />
        </BaseMenuPopup>
      </Menu.Root>
    </span>
  );
}

export function CoworkSessionRowMenu({ frame, onAction, session }: { frame: FrameStore; onAction: (session: SessionSummary, action: CoworkRowAction) => void; session: SessionSummary }) {
  const text = useShellText();
  const pinned = isCoworkSessionPinned(session, frame.pinnedOrder);
  return (
    <>
      <BaseMenuItem icon={pinned ? <CoworkUnpinGlyph size={16} /> : <CoworkPinGlyph size={16} />} onClick={() => onAction(session, pinned ? "unpin" : "pin")}>{pinned ? text.unpin : text.pin}</BaseMenuItem>
      <BaseMenuItem icon={<CoworkEditGlyph size={16} />} onClick={() => onAction(session, "rename")}>{text.rename}</BaseMenuItem>
      <BaseMenuItem icon={<CoworkMarkDoneGlyph size={16} />} onClick={() => onAction(session, "toggleDone")}>{session.isAgentCompleted ? "标记为未完成" : "标记为完成"}</BaseMenuItem>
      <BaseMenuSeparator />
      <BaseMenuItem icon={<CoworkArchiveGlyph size={16} />} onClick={() => onAction(session, "archive")}>{text.archive}</BaseMenuItem>
      <BaseMenuItem icon={<CoworkTrashGlyph size={16} />} onClick={() => onAction(session, "delete")}>{text.delete}</BaseMenuItem>
    </>
  );
}
