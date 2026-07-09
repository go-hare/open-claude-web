import type { RouteViewProps } from "../../app/routes";
import { ScheduledTaskForm } from "./ScheduledTaskForm";
import { useScheduledTasks } from "./useScheduledTasks";

export function ScheduledTaskEditor({ onNavigate }: RouteViewProps) {
  const { existingNames } = useScheduledTasks();
  return (
    <ScheduledTaskForm
      existingNames={existingNames}
      onBack={() => onNavigate("/epitaxy/scheduled")}
      onCreated={(id) => onNavigate(`/epitaxy/scheduled/${encodeURIComponent(id)}`)}
    />
  );
}
