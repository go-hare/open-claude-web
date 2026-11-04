/**
 * Official cb6930 `_o` / `ko` / cd5a `av` — turnLive + liveRunningToolIds for aM/nM.
 * Lite: session-level turnLive from isResponding; live ids from running tools on the last assistant row.
 * parked = shared-11 `CO`: pending permission requests for the marked session (`id(marked?sessionId)`).
 * showsBlocked ≈ parked (`Jj` Kj context default false).
 */
import { createContext, createElement, useContext, useMemo, type ReactNode } from "react";
import { useOfficialCodeSessionPermissionSuppressed } from "./officialCodeSessionStore";
import type { TranscriptEntry, TranscriptToolUse } from "./officialTranscriptParse";

export type OfficialTurnLiveValue = {
  liveRunningToolIds: Set<string> | undefined;
  permissionPending: boolean;
  sessionId: string | undefined;
  turnLive: boolean | undefined;
};

const OfficialTurnLiveContext = createContext<OfficialTurnLiveValue>({
  liveRunningToolIds: undefined,
  permissionPending: false,
  sessionId: undefined,
  turnLive: undefined,
});

export function OfficialTurnLiveProvider({
  children,
  entries,
  isResponding,
  sessionId,
}: {
  children: ReactNode;
  entries: TranscriptEntry[];
  isResponding: boolean;
  sessionId?: string;
}) {
  const permissionPending = useOfficialCodeSessionPermissionSuppressed(sessionId);
  const value = useMemo<OfficialTurnLiveValue>(() => {
    const ids = new Set<string>();
    if (isResponding) {
      const last = [...entries].reverse().find((entry) => entry.author === "assistant");
      for (const item of last?.items ?? []) {
        if (item.kind !== "tools") continue;
        for (const tool of item.tools) {
          if (tool.status === "running") ids.add(tool.id);
        }
      }
    }
    return {
      liveRunningToolIds: ids.size > 0 ? ids : undefined,
      permissionPending,
      sessionId,
      turnLive: isResponding || undefined,
    };
  }, [entries, isResponding, permissionPending, sessionId]);
  return createElement(OfficialTurnLiveContext.Provider, { value }, children);
}

/** Official `av()` / `ko()`. */
export function useOfficialTurnLive() {
  return useContext(OfficialTurnLiveContext);
}

export type OfficialAmCandidate = {
  key: string;
  live?: boolean;
  toolIds: string[];
  wireRunning: boolean;
};

/**
 * Official nM:
 * marked = candidateLive || (tail && turnLive)
 * tailHeld = marked && !candidateLive
 * parked = CO(marked ? sessionId) → permissionPending
 * showsBlocked = parked && !Jj()  (Jj default false)
 */
export function officialNmMark(
  live: OfficialTurnLiveValue,
  candidate: OfficialAmCandidate | undefined,
  hasTail: boolean,
) {
  const ids = live.liveRunningToolIds;
  const candidateLive = candidate !== undefined && (
    candidate.live
    ?? candidate.toolIds.some((id) => ids?.has(id) ?? false)
  );
  const marked = Boolean(candidateLive || (hasTail && live.turnLive === true));
  const parked = Boolean(marked && live.permissionPending);
  return {
    marked,
    parked,
    sessionId: live.sessionId,
    showsBlocked: parked,
    tailHeld: marked && !candidateLive,
  };
}

export { officialQj, officialZjFace, useOfficialZjFace } from "./officialZjFace";

export function officialAmCandidateFromTools(tools: TranscriptToolUse[]): OfficialAmCandidate | undefined {
  const head = tools[0];
  if (!head) return undefined;
  const running = tools.some((tool) => tool.status === "running");
  if (!running) return undefined;
  return {
    key: head.id,
    toolIds: tools.map((tool) => tool.id),
    wireRunning: head.status === "running",
  };
}
