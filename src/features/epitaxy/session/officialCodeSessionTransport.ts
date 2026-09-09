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

export type OfficialCodeSessionTransport = {
  subscribe: (sessionId: string, onEvent: (event: unknown) => void) => OfficialCodeSessionSub;
  /** Official U.fetchTranscript — getTranscript only, never fetchTail. */
  fetchTranscript: (sessionId: string) => Promise<ChatMessage[]>;
};

export { isOfficialCodeSessionEventForId };

export function createOfficialCodeLocalTransport(): OfficialCodeSessionTransport {
  return {
    async fetchTranscript(sessionId) {
      const getTranscript = desktopBridge.LocalSessions.getTranscript;
      if (!getTranscript) return [];
      const transcript = await getTranscript(sessionId);
      return Array.isArray(transcript) ? transcript : [];
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
