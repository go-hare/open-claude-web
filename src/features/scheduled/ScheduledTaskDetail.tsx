import { useCallback, useEffect, useState } from "react";
import type { RouteViewProps } from "../../app/routes";
import { desktopBridge, type ScheduledTaskSummary, type SessionSummary } from "../../adapters/desktopBridge";
import { useWorkspaceTrustGate } from "../epitaxy/trust/useWorkspaceTrustGate";
import { ConfirmDialog } from "../../shell/ConfirmDialog";
import { sessionPath } from "../../shell/sessionPaths";
import { DetailActions, DetailLeftColumn, DetailRightColumn, basename } from "./ScheduledTaskDetailBlocks";
import { RoutineHeader, ScheduledRouteShell } from "./ScheduledPrimitives";
import { taskDisplayName } from "./scheduleUtils";
import { SCHEDULED_DETAIL_MESSAGES, formatScheduledTemplate } from "./scheduledDetailMessages";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { resolveScheduledTaskRunMessage } from "../cowork/scheduled/scheduledTaskPromptWrap";
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

function ScheduledTaskDetailView({ task: initialTask, onBack, onNavigate }: { task: ScheduledTaskSummary; onBack: () => void; onNavigate: (path: string) => void }) {
  const [task, setTask] = useState(initialTask);
  const [enabled, setEnabled] = useState(initialTask.enabled);
  const [isRunning, setIsRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { loadRuns, runs, runsLoading } = useScheduledRuns(task.id);
  // Official c705 D run-now: checkTrust(cwd); if untrusted show skip/toast. Product uses OfficialTrustModal
  // (same residual gate as new Code session) so Run now can proceed after accept instead of silent no-op.
  const { ensureTrusted, modal: trustModal } = useWorkspaceTrustGate(task.cwd ?? undefined);
  const detailText = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  const title = taskDisplayName(task);

  useEffect(() => {
    setTask(initialTask);
    setEnabled(initialTask.enabled);
  }, [initialTask]);

  const refreshTask = useCallback(async () => {
    const next = await desktopBridge.CCDScheduledTasks.get(task.id);
    if (next) setTask(next);
  }, [task.id]);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await desktopBridge.CCDScheduledTasks.updateStatus?.(task.id, next ? "enabled" : "disabled");
  };

  // Residual jT removeApprovedPermission / clearChromePermissions (code CCD channel).
  const removeApprovedPermission = async (toolName: string) => {
    await desktopBridge.CCDScheduledTasks.removeApprovedPermission?.(task.id, toolName);
    await refreshTask();
  };
  const clearChromePermissions = async () => {
    await desktopBridge.CCDScheduledTasks.clearChromePermissions?.(task.id);
    await refreshTask();
  };
  const executeRunNow = useCallback(async () => {
    if (isRunning || !task.cwd || !task.prompt) return;
    setIsRunning(true);
    try {
      // Residual qt.start({ cwd, message, scheduledTaskId, ... }) — bridge toStartPayload flattens workspace.cwd.
      await startScheduledRun(task, title);
      await loadRuns();
    } finally {
      setIsRunning(false);
    }
  }, [isRunning, loadRuns, task, title]);
  const runNow = async () => {
    if (isRunning || !task.cwd) return;
    if (!task.prompt) return;
    await ensureTrusted(task.cwd, () => {
      void executeRunNow();
    });
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
              <DetailLeftColumn
                enabled={enabled}
                onClearChromePermissions={() => void clearChromePermissions()}
                onRemoveApprovedPermission={(toolName) => void removeApprovedPermission(toolName)}
                onToggle={toggle}
                task={task}
              />
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
          confirmText={detailText.delete}
          isOpen={deleteOpen}
          message={formatScheduledTemplate(detailText.deleteBody, { taskName: title })}
          onClose={() => setDeleteOpen(false)}
          onConfirm={() => { void remove(); }}
          title={detailText.deleteTitle}
          variant="danger"
        />
        {trustModal}
      </div>
    </ScheduledRouteShell>
  );
}

function useScheduledRuns(taskId: string) {
  const [runs, setRuns] = useState<SessionSummary[]>([]);
  const [runsLoading, setRunsLoading] = useState(true);
  const loadRuns = useCallback(async () => {
    if (!desktopBridge.LocalSessions.getSessionsForScheduledTask) {
      setRuns([]);
      setRunsLoading(false);
      return;
    }
    setRunsLoading(true);
    try {
      const items = await desktopBridge.LocalSessions.getSessionsForScheduledTask(taskId);
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
  // Residual pYt body: file → Uwe → Lwe wrap (not raw prompt alone).
  // Empty after Uwe → residual no-op (do not start with bare title/prompt).
  const fileContent =
    (await desktopBridge.CCDScheduledTasks.getFileContent?.(task.id).catch(() => "")) ?? "";
  const prompt = resolveScheduledTaskRunMessage({
    taskId: task.id,
    fileContent,
    prompt: task.prompt,
  });
  if (!prompt) return;
  await desktopBridge.LocalSessions.start({
    kind: "code",
    title,
    prompt,
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
