/**
 * Global LocalSessions session_updated / completed / stopped → durable bucket meta.
 *
 * Official he binds events on bucket.sub (De + pendingClose). This listener is only
 * for buckets that never got openSessionTransport (Recents attachSession meta-only).
 * Do not invent openSession for every id.
 *
 * completed/stopped often ship sessionId only — still patch isRunning=false so Recents
 * chrome is not frozen. session_updated with an active sub is hostApply's job.
 */
import { useEffect } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { SessionSummary } from "../../../adapters/desktopBridge/types";
import { officialCodeSessionStore } from "./officialCodeSessionStore";
import "./officialCodeSessionHostApply";

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
      // De / pendingClose already owns session_updated via bucket.sub.
      if (type === "session_updated" && existing.sub) return;
      // Host completed/stopped often ship sessionId only (no session body). Still must
      // patch isRunning=false on Recents-only buckets (no sub).
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
