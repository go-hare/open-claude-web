import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type ScheduledTaskSummary } from "../../../adapters/desktopBridge";

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    void desktopBridge.CCDScheduledTasks.list()
      .then((items) => {
        if (alive) setTasks(items);
      })
      .finally(() => {
        if (alive) setIsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const existingNames = useMemo(() => new Set(tasks.map((task) => task.id)), [tasks]);
  return { tasks, existingNames, isLoading };
}
