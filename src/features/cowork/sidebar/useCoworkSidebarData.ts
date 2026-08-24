import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type CoworkSpaceSummary, type ScheduledTaskSummary, type SessionSummary } from "../../../adapters/desktopBridge";
import {
  applyOfficialCoworkRecentsListEvent,
  toCoworkListRow,
} from "./officialCoworkRecentsList";

type CoworkSidebarData = {
  scheduledTasks: ScheduledTaskSummary[];
  sessions: SessionSummary[];
  spaces: CoworkSpaceSummary[];
};

const emptyData: CoworkSidebarData = { scheduledTasks: [], sessions: [], spaces: [] };

export function useCoworkSidebarData() {
  const [data, setData] = useState<CoworkSidebarData>(emptyData);

  const setSessions = useCallback((updater: React.SetStateAction<SessionSummary[]>) => {
    setData((current) => ({
      ...current,
      sessions: typeof updater === "function" ? updater(current.sessions) : updater,
    }));
  }, []);

  /**
   * Official t6 (index-BELzQL5P ~45495): hT.getAll → set sessions.
   * catch only sets isInitialized — do not wipe previous sessions.
   */
  const reloadSessions = useCallback(async () => {
    const sessions = await desktopBridge.LocalAgentModeSessions.list().catch(() => null);
    if (sessions) {
      setData((current) => ({ ...current, sessions }));
    }
  }, []);

  /**
   * Official RecentsForKind ScheduledSection reads Ke scheduled store independently
   * of Q5. Product: CoworkScheduledTasks.onEvent → list() that store only.
   */
  const reloadScheduled = useCallback(async () => {
    const scheduledTasks = await desktopBridge.CoworkScheduledTasks?.list().catch(() => []);
    setData((current) => ({ ...current, scheduledTasks }));
  }, []);

  const reloadSpaces = useCallback(async () => {
    const spaces = await desktopBridge.CoworkSpaces?.list().catch(() => []);
    setData((current) => ({ ...current, spaces }));
  }, []);

  const reload = useCallback(async () => {
    await Promise.all([reloadSessions(), reloadScheduled(), reloadSpaces()]);
  }, [reloadScheduled, reloadSessions, reloadSpaces]);

  useEffect(() => {
    let active = true;
    void reload();
    const unsubscribers = [
      desktopBridge.LocalAgentModeSessions.onEvent?.((event) => {
        if (!active) return;
        applyOfficialCoworkRecentsListEvent(
          event,
          (updater) => {
            if (!active) return;
            setSessions(updater);
          },
          async (sessionId) => {
            try {
              const snapshot = await desktopBridge.LocalAgentModeSessions.getSession(sessionId);
              return snapshot ? toCoworkListRow(snapshot) : null;
            } catch {
              return null;
            }
          },
          () => {
            if (active) void reloadSessions();
          },
        );
      }),
      desktopBridge.CoworkScheduledTasks?.onEvent?.(() => {
        if (active) void reloadScheduled();
      }),
      desktopBridge.CoworkSpaces?.onEvent?.(() => {
        if (active) void reloadSpaces();
      }),
    ];
    return () => {
      active = false;
      for (const unsubscribe of unsubscribers) unsubscribe?.();
    };
  }, [reload, reloadScheduled, reloadSessions, reloadSpaces, setSessions]);

  return { ...data, reload, setSessions };
}
