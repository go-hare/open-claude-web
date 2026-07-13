import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type ScheduledTaskSummary } from "../../../adapters/desktopBridge";

export function useScheduledTasks() {
  const [tasks, setTasks] = useState<ScheduledTaskSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let alive = true;

    const reload = async () => {
      try {
        const items = await desktopBridge.CoworkScheduledTasks.list();
        if (alive) setTasks(items);
      } finally {
        if (alive) setIsLoading(false);
      }
    };

    void reload();

    const unsubscribe =
      desktopBridge.CoworkScheduledTasks.onEvent?.(() => {
        void reload();
      }) ??
      desktopBridge.CCDScheduledTasks.onEvent?.(() => {
        void reload();
      });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  // Official CYt/uYt existingNames: displayName ?? id (we map title → displayName)
  // Also index normalized forms so uYt re duplicate check matches saved name ids.
  const existingNames = useMemo(() => {
    const names = new Set<string>();
    for (const task of tasks) {
      const display = task.title || task.id;
      names.add(display);
      names.add(task.id);
      const normalized = display
        .trim()
        .toLowerCase()
        .replace(/\s+/g, "-")
        .replace(/[^a-z0-9_-]/g, "")
        .replace(/^[-_]+|[-_]+$/g, "");
      if (normalized) names.add(normalized);
    }
    return names;
  }, [tasks]);

  return { tasks, existingNames, isLoading };
}
