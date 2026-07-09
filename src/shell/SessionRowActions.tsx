import { useCallback, type Dispatch, type SetStateAction } from "react";
import { desktopBridge, type SessionSummary } from "../adapters/desktopBridge";
import type { FrameStore } from "../stores/frameStore";
import { BaseMenuPopup, Menu } from "./BaseMenu";
import { Icon } from "./icons";
import { isPinnedSession, pinSession, sessionPinKey, unpinSession } from "./sessionPinning";
import { SessionRowMenuContent, type RowAction } from "./SessionRowMenus";

export function useSessionRowActions(frame: FrameStore, setSessions: Dispatch<SetStateAction<SessionSummary[]>>) {
  return useCallback((session: SessionSummary, action: RowAction) => {
    if (action === "pin") {
      frame.setPinnedOrder(pinSession(session, frame.pinnedOrder));
      frame.maybeShowDragPinHint();
      return;
    }
    if (action === "unpin") {
      frame.setPinnedOrder(unpinSession(session, frame.pinnedOrder));
      return;
    }
    if (action === "rename") return;
    if (action === "archive") {
      setSessions((current) => current.map((item) => item.id === session.id ? { ...item, isArchived: true } : item));
      void sessionSource(session).archive(session.id);
      return;
    }
    if (action === "delete") {
      setSessions((current) => current.filter((item) => item.id !== session.id));
      frame.removeFromPinnedOrder(sessionPinKey(session));
      void sessionSource(session).delete(session.id);
    }
  }, [frame, setSessions]);
}

export function SessionRowActions({ frame, onAction, onCreateGroup, onOpenSplit, session }: {
  frame: FrameStore;
  onAction: (session: SessionSummary, action: RowAction) => void;
  onCreateGroup: () => void;
  onOpenSplit: () => void;
  session: SessionSummary;
}) {
  return (
    <span className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto">
      <Menu.Root>
        <Menu.Trigger
          aria-label={`More options for ${session.title}`}
          className="draggable-none size-[calc(var(--df-row-h)-8px)] flex items-center justify-center rounded-md text-text-300 hover:text-text-100 hover:bg-[var(--df-hover)] aria-expanded:bg-bg-400 aria-expanded:text-text-100 transition-colors hide-focus-ring focus-visible:shadow-[inset_0_0_0_1px_hsl(var(--accent-100)),0_0_6px_0_hsl(var(--accent-100)/0.2)]"
          data-row-action=""
          onClick={(event) => event.stopPropagation()}
          tabIndex={-1}
          type="button"
        >
          <Icon name="DotsHorizontal" customSize={16} />
        </Menu.Trigger>
        <BaseMenuPopup align="end" className="min-w-[180px]" side="right" sideOffset={4}>
          <SessionRowMenuContent frame={frame} onAction={onAction} onCreateGroup={onCreateGroup} onOpenSplit={onOpenSplit} session={session} />
        </BaseMenuPopup>
      </Menu.Root>
    </span>
  );
}

function sessionSource(session: SessionSummary) {
  return session.kind === "code" ? desktopBridge.LocalSessions : desktopBridge.LocalAgentModeSessions;
}
