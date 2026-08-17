/**
 * Global LocalSessions session_updated → durable bucket isRunning/meta.
 * Tile onEvent only runs while the session route is mounted; without this,
 * leaving a running session freezes isRunning and re-entry paints idle chrome
 * until the next stream tick (static spark + Send for ~2s).
 *
 * Official residual: host formatSessionForEvent isRunning is shared meta —
 * list/getSession/session_updated all carry it. Patch existing buckets only
 * (do not invent openSession for every id).
 */
import { useEffect } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { officialCodeSessionStore } from "./officialCodeSessionStore";

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function useOfficialCodeSessionMetaSync() {
  useEffect(() => {
    const off = desktopBridge.LocalSessions.onEvent?.((event) => {
      const raw = asRecord(event);
      const type = stringValue(raw.type);
      if (type !== "session_updated" && type !== "completed" && type !== "stopped") {
        return;
      }
      const sessionRaw = asRecord(raw.session ?? asRecord(raw.payload).session);
      const sessionId =
        stringValue(sessionRaw.id)
        ?? stringValue(sessionRaw.sessionId)
        ?? stringValue(raw.sessionId);
      if (!sessionId) return;
      const existing = officialCodeSessionStore.getState().buckets[sessionId];
      if (!existing?.session) return;
      // Host completed/stopped often ship sessionId only (no session body). Still must
      // patch isRunning=false so leftover pendingTurn settles while tile unsubscribed.
      // session_updated carries full meta; merge as before.
      if (type === "completed" || type === "stopped") {
        officialCodeSessionStore.getState().patchSession(sessionId, {
          ...existing.session,
          ...sessionRaw,
          id: sessionId,
          isRunning: false,
        } as SessionSummary);
        return;
      }
      // Metadata only — same as tile session_updated path without Va settle (no mount).
      officialCodeSessionStore.getState().patchSession(sessionId, sessionRaw as SessionSummary);
    });
    return () => {
      off?.();
    };
  }, []);
}
