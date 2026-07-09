import type { RouteViewProps } from "../../app/routes";
import type { ScheduledTaskSummary } from "../../adapters/desktopBridge";
import { OfficialButton } from "../epitaxy/OfficialEpitaxyComponents";
import { Icon } from "../../shell/icons";
import { ScheduledRouteShell } from "./ScheduledPrimitives";
import { scheduleLabel, taskDisplayName } from "./scheduleUtils";
import { scheduledTaskDetailPath, scheduledTaskNewPath } from "./scheduledPaths";
import { useScheduledTasks } from "./useScheduledTasks";

type ContentProps = {
  tasks: ScheduledTaskSummary[];
  isLoading: boolean;
  onCreate: () => void;
  onSelect: (id: string) => void;
};

export function ScheduledTasks({ onNavigate }: RouteViewProps) {
  const { tasks, isLoading } = useScheduledTasks();
  return (
    <ScheduledRouteShell>
      <ScheduledTasksContent
        isLoading={isLoading}
        tasks={tasks}
        onCreate={() => onNavigate(scheduledTaskNewPath())}
        onSelect={(id) => onNavigate(scheduledTaskDetailPath(id))}
      />
    </ScheduledRouteShell>
  );
}

export function ScheduledTasksContent({ tasks, isLoading, onCreate, onSelect }: ContentProps) {
  const hasTasks = tasks.length > 0;
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[720px] mx-auto flex flex-col gap-g8 px-p8 py-[48px]">
        <ScheduledTasksHeader onCreate={onCreate} />
        {hasTasks ? <LocalAwakeBanner /> : null}
        <TaskListState isLoading={isLoading} tasks={tasks} onSelect={onSelect} />
      </div>
    </div>
  );
}

function ScheduledTasksHeader({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="flex items-start justify-between gap-g6">
      <div className="flex flex-col gap-g3">
        <h1 className="text-heading text-t9">Scheduled tasks</h1>
        <p className="text-body text-t6">Run tasks on a schedule or whenever you need them. Type /schedule in any session to set one up.</p>
      </div>
      <OfficialButton onClick={onCreate} size="base" variant="primary">新任务</OfficialButton>
    </div>
  );
}

function LocalAwakeBanner() {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p5 rounded-r6 bg-t1 text-body text-t7">
      <Icon name="ShieldCheck" size="md" className="shrink-0 text-t6" />
      <span>Local tasks only run while your computer is awake.</span>
    </div>
  );
}

function TaskListState({ isLoading, tasks, onSelect }: Omit<ContentProps, "onCreate">) {
  if (isLoading && tasks.length === 0) {
    return (
      <div role="status" className="flex items-center justify-center py-[64px] text-t5">
        <span className="sr-only">Loading scheduled tasks</span>
      </div>
    );
  }
  if (tasks.length === 0) return <EmptyScheduledTasks />;
  return <div className="flex flex-col gap-g3">{tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelect} />)}</div>;
}

function EmptyScheduledTasks() {
  return (
    <div className="flex flex-col items-center justify-center gap-g4 py-[64px] text-body text-t5">
      <Icon name="ClockTimeslot" size="lg" />
      <span>No scheduled tasks yet.</span>
    </div>
  );
}

function TaskCard({ task, onSelect }: { task: ScheduledTaskSummary; onSelect: (id: string) => void }) {
  const label = scheduleLabel(task);
  const nextRun = task.enabled && task.nextRunAt ? formatNextRun(task.nextRunAt) : null;
  return (
    <button type="button" onClick={() => onSelect(task.id)} className="flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus">
      <div className="flex-1 min-w-0 flex flex-col gap-g1">
        <div className="text-body text-t9 truncate">{taskDisplayName(task)}</div>
        <div className="text-footnote text-t6 truncate">
          {label}
          {nextRun ? <> · Next run {nextRun}</> : null}
        </div>
      </div>
      {task.fireAt ? (
        <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
          <Icon name="ArrowRight" size="sm" />
          Run once
        </span>
      ) : null}
      {!task.enabled ? (
        <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
          <Icon name="Stop" size="sm" />
          Paused
        </span>
      ) : null}
    </button>
  );
}

function formatNextRun(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" });
}
