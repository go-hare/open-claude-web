import { useCallback, useEffect, useState } from "react";
import type { RouteViewProps } from "../../app/routes";
import { desktopBridge, type ScheduledTaskSummary, type SessionSummary } from "../../adapters/desktopBridge";
import { ConfirmDialog } from "../../shell/ConfirmDialog";
import { sessionPath } from "../../shell/sessionPaths";
import { DetailActions, DetailLeftColumn, DetailRightColumn, basename } from "./ScheduledTaskDetailBlocks";
import { RoutineHeader, ScheduledRouteShell } from "./ScheduledPrimitives";
import { taskDisplayName } from "./scheduleUtils";
import { scheduledTaskIndexPath } from "./scheduledPaths";
import { useScheduledTasks } from "./useScheduledTasks";

const taskIdFromPath = () => decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");
const compareSessionRuns = (left: SessionSummary, right: SessionSummary) => {
  const leftTime = left.createdAtMs ?? left.updatedAtMs ?? 0;
  const rightTime = right.createdAtMs ?? right.updatedAtMs ?? 0;
  return rightTime - leftTime;
};

export function ScheduledTaskDetail({ onNavigate }: RouteViewProps) {
  const { tasks, isLoading } = useScheduledTasks();
  const taskId = taskIdFromPath();
  const [directLookup, setDirectLookup] = useState<{ id: string; task: ScheduledTaskSummary | null; loading: boolean }>({
    id: "",
    task: null,
    loading: false,
  });

  useEffect(() => {
    if (!taskId) return;
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


  const directTask = directLookup.id === taskId ? directLookup.task : null;
  const task = tasks.find((item) => item.id === taskId) ?? directTask;
  const waitingDirect = directLookup.id !== taskId || directLookup.loading;
  if (!isLoading && !waitingDirect && !task) return <MissingTaskRedirect onNavigate={onNavigate} />;
  if (!task) return <DetailLoading />;
  return <ScheduledTaskDetailView task={task} onBack={() => onNavigate(scheduledTaskIndexPath)} onNavigate={onNavigate} />;
}

function MissingTaskRedirect({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(() => {
    onNavigate(scheduledTaskIndexPath);
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

function ScheduledTaskDetailView({ task, onBack, onNavigate }: { task: ScheduledTaskSummary; onBack: () => void; onNavigate: (path: string) => void }) {
  const [enabled, setEnabled] = useState(task.enabled);
  const [isRunning, setIsRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { loadRuns, runs, runsLoading } = useScheduledRuns(task.id);
  const title = taskDisplayName(task);
  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await desktopBridge.CCDScheduledTasks.updateStatus?.(task.id, next ? "enabled" : "disabled");
  };
  const runNow = async () => {
    if (isRunning || !task.cwd) return;
    if (!(await canStartScheduledRun(task))) return;
    setIsRunning(true);
    try {
      await startScheduledRun(task, title);
      await loadRuns();
    } finally {
      setIsRunning(false);
    }
  };
  const remove = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await desktopBridge.CCDScheduledTasks.updateStatus?.(task.id, "deleted");
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <ScheduledRouteShell>
      <div className="h-full min-w-0 flex flex-col pt-[8px] pl-[8px]">
        <RoutineHeader
          title={title}
          onBack={onBack}
          actions={<DetailActions isDeleting={isDeleting} isRunDisabled={!task.cwd || !task.prompt} isRunning={isRunning} onDelete={() => setDeleteOpen(true)} onRunNow={runNow} />}
        />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8">
              <DetailLeftColumn task={task} enabled={enabled} onToggle={toggle} />
              <DetailRightColumn
                runs={runs}
                runsLoading={runsLoading}
                task={task}
                onOpenRun={(session) => onNavigate(sessionPath(session))}
              />
            </div>
          </div>
        </div>
        <ConfirmDialog
          confirmText="Delete"
          isOpen={deleteOpen}
          message={`Delete "${title}"? Any sessions from this task will be archived.`}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => { void remove(); }}
          title="Delete routine"
          variant="danger"
        />
      </div>
    </ScheduledRouteShell>
  );
}

async function canStartScheduledRun(task: ScheduledTaskSummary) {
  if (!task.cwd || !task.prompt) return false;
  const trust = await desktopBridge.LocalAgentModeSessions.checkTrust?.(task.cwd).catch(() => ({ trusted: true }));
  return trust?.trusted !== false;
}

function useScheduledRuns(taskId: string) {
  const [runs, setRuns] = useState<SessionSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const loadRuns = useCallback(async () => {
    if (!desktopBridge.LocalAgentModeSessions.getSessionsForScheduledTask) {
      setRuns([]);
      setRunsLoading(false);
      return;
    }
    setRunsLoading(true);
    try {
      const items = await desktopBridge.LocalAgentModeSessions.getSessionsForScheduledTask(taskId);
      setRuns([...items].sort(compareSessionRuns));
    } finally {
      setRunsLoading(false);
    }
  }, [taskId]);

  useEffect(() => {
    void loadRuns();
    window.addEventListener("focus", loadRuns);
    return () => window.removeEventListener("focus", loadRuns);
  }, [loadRuns]);

  return { loadRuns, runs, runsLoading };
}

async function startScheduledRun(task: ScheduledTaskSummary, title: string) {
  await desktopBridge.LocalAgentModeSessions.start({
    kind: "epitaxy",
    title,
    prompt: task.prompt ?? title,
    scheduledTaskId: task.id,
    origin: "scheduled",
    workspace: {
      mode: "local",
      projectName: basename(task.cwd) ?? "local",
      branchName: task.sourceBranch ?? "main",
      hasWorktree: Boolean(task.useWorktree),
      cwd: task.cwd,
    },
    model: task.model,
    sourceBranch: task.sourceBranch,
    useWorktree: task.useWorktree,
    permissionMode: task.permissionMode,
  });
}
