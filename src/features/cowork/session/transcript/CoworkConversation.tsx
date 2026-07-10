import { useLayoutEffect, useRef, type MutableRefObject } from "react";
import type { CoworkConversationStatusState } from "../activity/CoworkConversationStatus";
import { CoworkConversationStatus } from "../activity/CoworkConversationStatus";
import type { CoworkTranscriptEntry } from "../types";
import { CoworkAssistantEntryMessage, CoworkUserEntryMessage } from "./CoworkMessages";

export type CoworkScrollState = { showBottomFade: boolean; showScrollButton: boolean };

export function CoworkConversation({ entries, isResponding, onScrollState, pendingTurnStartedAt, scrollRef, status }: { entries: CoworkTranscriptEntry[]; isResponding: boolean; onScrollState: (state: CoworkScrollState) => void; pendingTurnStartedAt?: number | null; scrollRef: MutableRefObject<HTMLDivElement | null>; status: CoworkConversationStatusState | null }) {
  const localScrollRef = useRef<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    scrollRef.current = localScrollRef.current;
    return () => { scrollRef.current = null; };
  }, [scrollRef]);
  useConversationScrollState(localScrollRef, onScrollState);
  return (
    <div className="h-full overflow-y-auto overflow-x-hidden" data-testid="cowork-conversation-body" ref={localScrollRef}>
      <div className="epitaxy-chat-column epitaxy-chat-size flex min-h-full flex-col gap-[var(--chat-turn-gap)] py-[48px]">
        {entries.map((entry) => entry.author === "user" ? <div className="origin-right" data-epitaxy-entry={entry.id} key={entry.id}><CoworkUserEntryMessage entry={entry} /></div> : <div data-epitaxy-entry={entry.id} key={entry.id}><CoworkAssistantEntryMessage entry={entry} /></div>)}
        <CoworkConversationStatus isWorking={isResponding} startedAt={pendingTurnStartedAt} status={status} />
      </div>
    </div>
  );
}

function useConversationScrollState(scrollRef: React.RefObject<HTMLDivElement | null>, onScrollState: (state: CoworkScrollState) => void) {
  useLayoutEffect(() => {
    const node = scrollRef.current;
    if (!node) return;
    const update = () => {
      if (node.offsetParent === null) return;
      const distance = node.scrollHeight - node.scrollTop - node.clientHeight;
      onScrollState({ showScrollButton: distance > 200, showBottomFade: distance > 8 });
    };
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    update();
    return () => { node.removeEventListener("scroll", update); observer.disconnect(); onScrollState({ showScrollButton: false, showBottomFade: false }); };
  }, [onScrollState, scrollRef]);
}
