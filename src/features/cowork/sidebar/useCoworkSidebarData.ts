import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type CoworkSpaceSummary, type ScheduledTaskSummary, type SessionSummary } from "../../../adapters/desktopBridge";

type CoworkSidebarData = {
  scheduledTasks: ScheduledTaskSummary[];
  sessions: SessionSummary[];
  spaces: CoworkSpaceSummary[];
};

const emptyData: CoworkSidebarData = { scheduledTasks: [], sessions: [], spaces: [] };

export function useCoworkSidebarData() {
  const [data, setData] = useState<CoworkSidebarData>(emptyData);
  const reload = useCallback(async () => {
    const [sessions, scheduledTasks, spaces] = await Promise.all([
      desktopBridge.LocalAgentModeSessions.list().catch(() => []),
      desktopBridge.CoworkScheduledTasks?.list().catch(() => []),
      desktopBridge.CoworkSpaces?.list().catch(() => []),
    ]);
    setData({ sessions, scheduledTasks, spaces });
  }, []);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (active) await reload();
    };
    void load();
    const unsubscribers = [
      desktopBridge.LocalAgentModeSessions.onEvent?.(() => { void load(); }),
      desktopBridge.CoworkScheduledTasks?.onEvent?.(() => { void load(); }),
      desktopBridge.CoworkSpaces?.onEvent?.(() => { void load(); }),
    ];
    return () => {
      active = false;
      for (const unsubscribe of unsubscribers) unsubscribe?.();
    };
  }, [reload]);

  return { ...data, reload, setSessions: (updater: React.SetStateAction<SessionSummary[]>) => setData((current) => ({ ...current, sessions: typeof updater === "function" ? updater(current.sessions) : updater })) };
}
