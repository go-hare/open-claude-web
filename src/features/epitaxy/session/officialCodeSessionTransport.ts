/**
 * Official c4bf `U.subscribe` residual for local Code:
 *   subscribe(id, cb) → onOnEvent filtered by sessionId
 *
 * Product LocalSessions.onEvent is the same IPC as official onOnEvent.
 * Cold transcript load stays loadEpitaxySession (getSession + getTranscript) — not U.fetchTranscript.
 * Do not invent fetchTail (official local U has no fetchTail).
 */
import { desktopBridge } from "../../../adapters/desktopBridge";
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
};

export { isOfficialCodeSessionEventForId };

export function createOfficialCodeLocalTransport(): OfficialCodeSessionTransport {
  return {
    subscribe(sessionId, onEvent) {
      const subscribe = desktopBridge.LocalSessions.onEvent;
      if (!subscribe) {
        return { unsubscribe: () => undefined, wake: () => undefined };
      }
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
