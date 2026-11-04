/**
 * Official c4bf `U` residual for local Code:
 *   subscribe(id, cb) → onOnEvent filtered by sessionId
 *   immediately t({kind:"connection",state:"connected"})
 *   fetchTranscript(id) → LocalSessions.getTranscript only
 *
 * Product LocalSessions.onEvent is the same IPC as official onOnEvent.
 * Do not invent fetchTail (official local U has none).
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { ChatMessage } from "../../../adapters/desktopBridge/types";
import { isOfficialCodeSessionEventForId } from "./officialCodeSessionEventFilter";
/** Bind he `r(s,e)` when this module loads — De always imports createOfficialCodeLocalTransport. */
import "./officialCodeSessionHostApply";

export type OfficialCodeSessionSub = {
  unsubscribe: () => void;
  wake: () => void;
  reclaim?: () => void;
};

export type OfficialTranscriptPage = {
  messages: ChatMessage[];
  hasMore: boolean;
  cursor?: string;
};

export type OfficialCodeSessionTransport = {
  subscribe: (sessionId: string, onEvent: (event: unknown) => void) => OfficialCodeSessionSub;
  /**
   * Official Ae / U.fetchTranscript — LocalSessions.getTranscript (full jsonl).
   * Newest-200 paging invents an empty-looking transcript when the latest page
   * is tool_result-only (eke skips Hb). fetchEarlierTranscript still pages.
   */
  fetchTranscript: (sessionId: string) => Promise<ChatMessage[] | OfficialTranscriptPage>;
  fetchEarlierTranscript?: (
    sessionId: string,
    beforeUuid: string,
  ) => Promise<OfficialTranscriptPage>;
};

export { isOfficialCodeSessionEventForId };

export function createOfficialCodeLocalTransport(): OfficialCodeSessionTransport {
  return {
    async fetchTranscript(sessionId) {
      // Official local U: getTranscript only — not getTranscriptPage(limit 200).
      const getTranscript = desktopBridge.LocalSessions.getTranscript;
      if (getTranscript) {
        const transcript = await getTranscript(sessionId);
        return Array.isArray(transcript) ? transcript : [];
      }
      const getPage = desktopBridge.LocalSessions.getTranscriptPage;
      if (typeof getPage === "function") {
        const page = await getPage(sessionId, "", 200);
        return {
          messages: Array.isArray(page?.messages) ? page.messages : [],
          hasMore: page?.hasMore === true,
          cursor: page?.cursor,
        };
      }
      return [];
    },
    async fetchEarlierTranscript(sessionId, beforeUuid) {
      const getPage = desktopBridge.LocalSessions.getTranscriptPage;
      if (typeof getPage !== "function" || !beforeUuid) {
        return { messages: [], hasMore: false };
      }
      const page = await getPage(sessionId, beforeUuid, 200);
      return {
        messages: Array.isArray(page?.messages) ? page.messages : [],
        hasMore: page?.hasMore === true,
        cursor: page?.cursor,
      };
    },
    subscribe(sessionId, onEvent) {
      const subscribe = desktopBridge.LocalSessions.onEvent;
      if (!subscribe) {
        return { unsubscribe: () => undefined, wake: () => undefined };
      }
      // Official U.subscribe: immediately t({kind:"connection",state:"connected"}).
      onEvent({ type: "connection", state: "connected" });
      const unsubscribe = subscribe((event) => {
        if (!isOfficialCodeSessionEventForId(event, sessionId)) return;
        onEvent(event);
      });
      return {
        unsubscribe,
        wake: () => undefined,
      };
    },
  };
}

/** Official local U — De openSession and Ae fetchTranscript share one transport. */
export const officialCodeLocalTransport = createOfficialCodeLocalTransport();
