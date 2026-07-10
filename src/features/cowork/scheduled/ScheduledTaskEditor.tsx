import type { RouteViewProps } from "../../../app/routes";
import { ScheduledTaskForm } from "./ScheduledTaskForm";
import { scheduledTaskDetailPath, scheduledTaskIndexPath } from "./scheduledPaths";
import { useScheduledTasks } from "./useScheduledTasks";

export function ScheduledTaskEditor({ onNavigate }: RouteViewProps) {
  const { existingNames } = useScheduledTasks();
  return (
    <ScheduledTaskForm
      existingNames={existingNames}
      onBack={() => onNavigate(scheduledTaskIndexPath)}
      onCreated={(id) => onNavigate(scheduledTaskDetailPath(id))}
    />
  );
}
