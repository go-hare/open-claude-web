/**
 * Official desktop scheduled tasks list: index-BELzQL5P zQt → CYt (B4 path).
 * Create opens uYt modal (not /new full page).
 * Action: Dc size sm; tabsEnd: Ide sort + gYt filter.
 */
import { useMemo, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import { desktopBridge, type ScheduledTaskSummary } from "../../../adapters/desktopBridge";
import { OfficialButton } from "../../shared/OfficialButton";
import {
  ScheduledLocalAwakeBanner,
  ScheduledTaskCard,
  ScheduledTaskCardGrid,
  ScheduledTaskStatusPill,
  ScheduledTasksEmptyState,
  ScheduledTasksFilterControl,
  ScheduledTasksPageShell,
  ScheduledTasksSortControl,
} from "./ScheduledListPrimitives";
import { ScheduledTaskCreateModal } from "./ScheduledTaskCreateModal";
import { scheduleLabel, taskDisplayName } from "./scheduleUtils";
import { scheduledTaskDetailPath } from "./scheduledPaths";
import { useScheduledTasks } from "./useScheduledTasks";

export function ScheduledTasks({ onNavigate }: RouteViewProps) {
  const { tasks, existingNames, isLoading } = useScheduledTasks();
  const [createOpen, setCreateOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [sortBy, setSortBy] = useState<"nextRun" | "name">("nextRun");

  const filteredTasks = useMemo(() => {
    let next = tasks;
    const query = filter.trim().toLowerCase();
    if (query) {
      next = next.filter((task) => {
        const title = taskDisplayName(task).toLowerCase();
        const description = (task.description ?? "").toLowerCase();
        return title.includes(query) || description.includes(query);
      });
    }
    return [...next].sort((left, right) => {
      if (sortBy === "name") {
        return taskDisplayName(left).localeCompare(taskDisplayName(right));
      }
      // Official CYt nextRun sort: enabled fireAt timestamp, else Infinity.
      const leftTime = left.enabled && left.fireAt ? new Date(left.fireAt).getTime() : Number.POSITIVE_INFINITY;
      const rightTime = right.enabled && right.fireAt ? new Date(right.fireAt).getTime() : Number.POSITIVE_INFINITY;
      return leftTime - rightTime;
    });
  }, [filter, sortBy, tasks]);

  const hasFilter = filter.trim().length > 0;
  // Official CYt: r?.createScheduledTask
  const canCreate =
    typeof desktopBridge.CoworkScheduledTasks.create === "function" ||
    typeof desktopBridge.CCDScheduledTasks.create === "function";

  return (
    <div className="h-full" data-official-source="index-BELzQL5P.js:CYt">
      <ScheduledTasksPageShell
        action={
          canCreate ? (
            <OfficialButton onClick={() => setCreateOpen(true)} size="sm" variant="primary">
              新任务
            </OfficialButton>
          ) : undefined
        }
        subheader={
          <p className="text-sm text-text-500">
            Run tasks on a schedule or whenever you need them. Type /schedule in any existing task to set one up.
          </p>
        }
        tabsEnd={
          <>
            <ScheduledTasksSortControl onChange={setSortBy} value={sortBy} />
            <ScheduledTasksFilterControl
              onChange={setFilter}
              placeholder="Filter scheduled tasks"
              value={filter}
            />
          </>
        }
        title="Scheduled tasks"
      >
        <ScheduledLocalAwakeBanner />
        {!isLoading && filteredTasks.length === 0 ? (
          hasFilter ? (
            <div className="text-sm text-text-500 mt-4">No scheduled tasks match your search.</div>
          ) : (
            <ScheduledTasksEmptyState />
          )
        ) : null}
        {filteredTasks.length > 0 ? (
          <ScheduledTaskCardGrid>
            {filteredTasks.map((task) => (
              <ScheduledTaskListCard
                key={task.id}
                onSelect={() => onNavigate(scheduledTaskDetailPath(task.id))}
                task={task}
              />
            ))}
          </ScheduledTaskCardGrid>
        ) : null}
      </ScheduledTasksPageShell>

      <ScheduledTaskCreateModal
        existingNames={existingNames}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => onNavigate(scheduledTaskDetailPath(id))}
      />
    </div>
  );
}

function ScheduledTaskListCard({
  onSelect,
  task,
}: {
  onSelect: () => void;
  task: ScheduledTaskSummary;
}) {
  const completed = !task.enabled && Boolean(task.fireAt) && Boolean(task.lastRunAt);
  const statusLabel = task.enabled ? scheduleLabel(task) : null;
  return (
    <ScheduledTaskCard
      description={task.description}
      footer={<ScheduledTaskStatusPill completed={completed} enabled={task.enabled} label={statusLabel} />}
      href={scheduledTaskDetailPath(task.id)}
      onClick={onSelect}
      title={taskDisplayName(task)}
    />
  );
}
