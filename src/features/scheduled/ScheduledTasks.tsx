import type { RouteViewProps } from "../../app/routes";
import type { ScheduledTaskSummary } from "../../adapters/desktopBridge";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { OfficialButton } from "../epitaxy/OfficialEpitaxyComponents";
import { Icon } from "../../shell/icons";
import { ScheduledRouteShell } from "./ScheduledPrimitives";
import { formatTime, taskDisplayName } from "./scheduleUtils";
import { scheduledTaskDetailPath, scheduledTaskNewPath } from "./scheduledPaths";
import { useScheduledTasks } from "./useScheduledTasks";
import { SCHEDULED_LIST_MESSAGES, type ScheduledListText } from "./scheduledListMessages";
import { formatScheduledTemplate } from "./scheduledDetailMessages";

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
  const text = useI18nText(SCHEDULED_LIST_MESSAGES);
  const hasTasks = tasks.length > 0;
  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-[720px] mx-auto flex flex-col gap-g8 px-p8 py-[48px]">
        <ScheduledTasksHeader onCreate={onCreate} text={text} />
        {hasTasks ? <LocalAwakeBanner text={text} /> : null}
        <TaskListState isLoading={isLoading} tasks={tasks} onSelect={onSelect} text={text} />
      </div>
    </div>
  );
}

function ScheduledTasksHeader({ onCreate, text }: { onCreate: () => void; text: ScheduledListText }) {
  return (
    <div className="flex items-start justify-between gap-g6">
      <div className="flex flex-col gap-g3">
        <h1 className="text-heading text-t9">{text.title}</h1>
        <p className="text-body text-t6">{text.subtitle}</p>
      </div>
      <OfficialButton onClick={onCreate} size="base" variant="primary">{text.newTask}</OfficialButton>
    </div>
  );
}

function LocalAwakeBanner({ text }: { text: ScheduledListText }) {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p5 rounded-r6 bg-t1 text-body text-t7">
      <Icon name="ShieldCheck" size="md" className="shrink-0 text-t6" />
      <span>{text.bannerLocalAwake}</span>
    </div>
  );
}

function TaskListState({ isLoading, tasks, onSelect, text }: Omit<ContentProps, "onCreate"> & { text: ScheduledListText }) {
  if (isLoading && tasks.length === 0) {
    return (
      <div role="status" className="flex items-center justify-center py-[64px] text-t5">
        <span className="sr-only">{text.loadingLabel}</span>
      </div>
    );
  }
  if (tasks.length === 0) return <EmptyScheduledTasks text={text} />;
  return <div className="flex flex-col gap-g3">{tasks.map((task) => <TaskCard key={task.id} task={task} onSelect={onSelect} text={text} />)}</div>;
}

function EmptyScheduledTasks({ text }: { text: ScheduledListText }) {
  return (
    <div className="flex flex-col items-center justify-center gap-g4 py-[64px] text-body text-t5">
      <Icon name="ClockTimeslot" size="lg" />
      <span>{text.emptyState}</span>
    </div>
  );
}

function TaskCard({ task, onSelect, text }: { task: ScheduledTaskSummary; onSelect: (id: string) => void; text: ScheduledListText }) {
  const label = localizedScheduleLabel(task, text);
  const nextRun = task.enabled && task.nextRunAt ? formatNextRun(task.nextRunAt) : null;
  return (
    <button type="button" onClick={() => onSelect(task.id)} className="flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus">
      <div className="flex-1 min-w-0 flex flex-col gap-g1">
        <div className="text-body text-t9 truncate">{taskDisplayName(task)}</div>
        <div className="text-footnote text-t6 truncate">
          {label}
          {nextRun ? <> · {formatScheduledTemplate(text.nextRunInline, { date: nextRun })}</> : null}
        </div>
      </div>
      {task.fireAt ? (
        <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
          <Icon name="ArrowRight" size="sm" />
          {text.oneTime}
        </span>
      ) : null}
      {!task.enabled ? (
        <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
          <Icon name="Stop" size="sm" />
          {text.paused}
        </span>
      ) : null}
    </button>
  );
}

function localizedScheduleLabel(task: ScheduledTaskSummary, text: ScheduledListText) {
  if (task.fireAt) return text.oneTime;
  const cron = task.cronExpression;
  if (cron) {
    const [minute, hour, , , day] = cron.split(" ");
    if (hour === "*") return text.hourly;
    if (day === "1-5") return `${text.weekdays} ${formatTime(Number(hour), Number(minute))}`;
    if (day && day !== "*") return `${text.weekly} ${formatTime(Number(hour), Number(minute))}`;
    return `${text.daily} ${formatTime(Number(hour), Number(minute))}`;
  }
  // Host may prefill English schedule strings — map residual frequency labels.
  const raw = (task.schedule || "").trim().toLowerCase();
  if (!raw) return text.manual;
  if (raw === "hourly" || raw.startsWith("hourly")) return text.hourly;
  if (raw === "daily" || raw.startsWith("daily")) return text.daily;
  if (raw === "weekdays" || raw.startsWith("weekday")) return text.weekdays;
  if (raw === "weekly" || raw.startsWith("weekly")) return text.weekly;
  if (raw === "manual" || raw.includes("manual")) return text.manual;
  if (raw === "one-time" || raw === "once" || raw.includes("run once")) return text.oneTime;
  return task.schedule || text.manual;
}

function formatNextRun(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, { day: "numeric", hour: "numeric", minute: "2-digit", month: "short" });
}
