import { useEffect, useState } from "react";
import type { RouteViewProps } from "../../app/routes";
import { desktopBridge, type ScheduledTaskSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { DetailSection, RoutineHeader, ScheduledRouteShell, chipClass } from "./ScheduledPrimitives";
import { ScheduledTaskForm } from "./ScheduledTaskForm";
import { scheduleLabel, taskDisplayName } from "./scheduleUtils";
import { useScheduledTasks } from "./useScheduledTasks";

const taskIdFromPath = () => decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");

export function ScheduledTaskDetail({ onNavigate }: RouteViewProps) {
  const { tasks, existingNames, isLoading } = useScheduledTasks();
  const taskId = taskIdFromPath();
  const [directLookup, setDirectLookup] = useState<{ id: string; task: ScheduledTaskSummary | null; loading: boolean }>({
    id: "",
    task: null,
    loading: false,
  });

  useEffect(() => {
    if (!taskId || taskId === "new-local") return;
    let alive = true;
    setDirectLookup({ id: taskId, task: null, loading: true });
    void desktopBridge.CCDScheduledTasks.get(taskId)
      .then((task) => {
        if (alive) setDirectLookup({ id: taskId, task, loading: false });
      })
      .finally(() => {
        if (alive) setDirectLookup((current) => current.id === taskId ? { ...current, loading: false } : current);
      });
    return () => {
      alive = false;
    };
  }, [taskId]);

  if (taskId === "new-local") {
    return <ScheduledTaskForm existingNames={existingNames} onBack={() => onNavigate("/epitaxy/scheduled")} onCreated={(id) => onNavigate(`/epitaxy/scheduled/${encodeURIComponent(id)}`)} />;
  }

  const directTask = directLookup.id === taskId ? directLookup.task : null;
  const task = tasks.find((item) => item.id === taskId) ?? directTask;
  const waitingDirect = directLookup.id !== taskId || directLookup.loading;
  if (!isLoading && !waitingDirect && !task) return <MissingTaskRedirect onNavigate={onNavigate} />;
  if (!task) return <DetailLoading />;
  return <ScheduledTaskDetailView task={task} onBack={() => onNavigate("/epitaxy/scheduled")} />;
}

function MissingTaskRedirect({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(() => {
    onNavigate("/epitaxy/scheduled");
  }, [onNavigate]);
  return <DetailLoading />;
}

function DetailLoading() {
  return (
    <ScheduledRouteShell>
      <div role="status" className="h-full flex items-center justify-center text-t5">
        <span className="sr-only">Loading scheduled tasks</span>
      </div>
    </ScheduledRouteShell>
  );
}

function ScheduledTaskDetailView({ task, onBack }: { task: ScheduledTaskSummary; onBack: () => void }) {
  const [enabled, setEnabled] = useState(task.enabled);
  const title = taskDisplayName(task);
  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await desktopBridge.CCDScheduledTasks.updateStatus?.(task.id, next ? "enabled" : "disabled");
  };
  const remove = async () => {
    await desktopBridge.CCDScheduledTasks.updateStatus?.(task.id, "deleted");
    onBack();
  };

  return (
    <ScheduledRouteShell>
      <div className="h-full min-w-0 flex flex-col pt-[8px] pl-[8px]">
        <RoutineHeader title={title} onBack={onBack} actions={<DetailActions onDelete={remove} />} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8">
              <DetailLeftColumn task={task} enabled={enabled} onToggle={toggle} />
              <DetailRightColumn task={task} />
            </div>
          </div>
        </div>
      </div>
    </ScheduledRouteShell>
  );
}

function DetailActions({ onDelete }: { onDelete: () => void }) {
  return (
    <>
      <button type="button" className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary h-base text-body rounded-base gap-g3 px-p6">
        <Icon name="spark" />
        <span>Run now</span>
      </button>
      <button type="button" onClick={onDelete} aria-label="Delete" className="inline-flex items-center gap-g2 px-p4 py-p2 rounded-r4 text-footnote text-t6 hover:text-t8 hover:bg-t2 hide-focus-ring ring-focus">
        Delete
      </button>
    </>
  );
}

function DetailLeftColumn({ task, enabled, onToggle }: { task: ScheduledTaskSummary; enabled: boolean; onToggle: () => void }) {
  return (
    <div className="flex flex-col gap-g8">
      {task.description ? <DetailSection heading="Description"><p className="text-body text-t9">{task.description}</p></DetailSection> : null}
      <DetailSection heading="Status">
        <div className="flex items-center gap-g4 flex-wrap">
          <button type="button" onClick={onToggle} role="switch" aria-checked={enabled} className={chipClass}>{enabled ? "Active" : "Paused"}</button>
        </div>
      </DetailSection>
      {task.cwd ? <DetailSection heading="Folder"><span className={chipClass}><Icon name="project" />{task.cwd}</span></DetailSection> : null}
      <DetailSection heading="Repeats"><p className="text-body text-t9">{scheduleLabel(task)}</p></DetailSection>
      <DetailSection heading="Always allowed"><p className="text-footnote text-t5">Approvals you grant during a run appear here.</p></DetailSection>
    </div>
  );
}

function DetailRightColumn({ task }: { task: ScheduledTaskSummary }) {
  return (
    <div className="flex flex-col gap-g8">
      <DetailSection heading="Instructions">
        <div className="px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto">
          {task.prompt ? task.prompt : <span className="text-t5">Task file not found or has unexpected format.</span>}
        </div>
      </DetailSection>
      <DetailSection heading="History"><p className="text-footnote text-t5">No runs yet.</p></DetailSection>
    </div>
  );
}
