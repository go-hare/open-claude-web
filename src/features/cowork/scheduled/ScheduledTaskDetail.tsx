/**
 * Official residual cowork scheduled-task detail route (index-BELzQL5P rKt + UQt wrapper).
 * Shell: flex flex-col h-full overflow-auto → Flt narrow max-w-4xl → rKt body.
 * Edit opens residual uYt with editingTask (not Epitaxy form page).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import type { RouteViewProps } from "../../../app/routes";
import {
  desktopBridge,
  type ScheduledTaskSummary,
  type SessionSummary,
} from "../../../adapters/desktopBridge";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { Icon } from "../../../shell/icons";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { coworkSessionPath } from "../sessionPaths";
import {
  DetailActions,
  DetailHero,
  DetailHistoryColumn,
  DetailMetaColumn,
  basename,
  type LinkedSpaceInfo,
} from "./ScheduledTaskDetailBlocks";
import { ScheduledTaskCreateModal } from "./ScheduledTaskCreateModal";
import {
  SCHEDULED_DETAIL_MESSAGES,
  formatScheduledTemplate,
} from "./scheduledDetailMessages";
import { scheduledTaskIndexPath } from "./scheduledPaths";
import { taskDisplayName } from "./scheduleUtils";
import { useScheduledTasks } from "./useScheduledTasks";

const taskIdFromPath = () =>
  decodeURIComponent(window.location.pathname.split("/").filter(Boolean).at(-1) ?? "");

const compareSessionRuns = (left: SessionSummary, right: SessionSummary) => {
  const leftTime = left.createdAtMs ?? left.updatedAtMs ?? 0;
  const rightTime = right.createdAtMs ?? right.updatedAtMs ?? 0;
  return rightTime - leftTime;
};

export function ScheduledTaskDetail({ onNavigate }: RouteViewProps) {
  const { tasks, isLoading, existingNames, reload } = useScheduledTasks();
  const taskId = taskIdFromPath();
  const [directLookup, setDirectLookup] = useState<{
    id: string;
    task: ScheduledTaskSummary | null;
    loading: boolean;
  }>({ id: "", task: null, loading: false });

  useEffect(() => {
    if (!taskId) return;
    let alive = true;
    setDirectLookup({ id: taskId, task: null, loading: true });
    void desktopBridge.CoworkScheduledTasks.get(taskId)
      .then((task) => {
        if (alive) setDirectLookup({ id: taskId, task, loading: false });
      })
      .finally(() => {
        if (alive) {
          setDirectLookup((current) =>
            current.id === taskId ? { ...current, loading: false } : current,
          );
        }
      });
    return () => {
      alive = false;
    };
  }, [taskId]);

  const directTask = directLookup.id === taskId ? directLookup.task : null;
  const task = tasks.find((item) => item.id === taskId) ?? directTask;
  const waitingDirect = directLookup.id !== taskId || directLookup.loading;
  if (!isLoading && !waitingDirect && !task) {
    return <MissingTaskRedirect onNavigate={onNavigate} />;
  }
  if (!task) return <DetailLoading />;
  return (
    <ScheduledTaskDetailView
      existingNames={existingNames}
      onBack={() => onNavigate(scheduledTaskIndexPath)}
      onNavigate={onNavigate}
      onTaskMutated={() => {
        void reload?.();
        void desktopBridge.CoworkScheduledTasks.get(taskId).then((next) => {
          if (next) setDirectLookup({ id: taskId, task: next, loading: false });
        });
      }}
      task={task}
    />
  );
}

function MissingTaskRedirect({ onNavigate }: { onNavigate: (path: string) => void }) {
  useEffect(() => {
    onNavigate(scheduledTaskIndexPath);
  }, [onNavigate]);
  return <DetailLoading />;
}

function DetailLoading() {
  // Residual UQt loading: Flt + skeleton bars
  return (
    <div className="flex flex-col h-full overflow-auto" data-official-source="index-BELzQL5P.js:UQt loading">
      <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-4xl">
        <div className="space-y-4">
          <div className="h-8 w-[200px] rounded-md bg-bg-200" />
          <div className="h-6 w-[150px] rounded-md bg-bg-200" />
          <div className="h-[120px] w-full rounded-lg bg-bg-200" />
        </div>
      </main>
    </div>
  );
}

function ScheduledTaskDetailView({
  existingNames,
  onBack,
  onNavigate,
  onTaskMutated,
  task,
}: {
  existingNames: Set<string>;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onTaskMutated: () => void;
  task: ScheduledTaskSummary;
}) {
  const [enabled, setEnabled] = useState(task.enabled);
  const [isRunning, setIsRunning] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { loadRuns, runs, runsLoading } = useScheduledRuns(task.id);
  const detailText = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  const title = taskDisplayName(task);
  const { linkedSpace, spacesInitialized } = useLinkedSpace(task.spaceId);

  useEffect(() => {
    setEnabled(task.enabled);
  }, [task.enabled, task.id]);

  const toggle = async () => {
    const next = !enabled;
    setEnabled(next);
    await desktopBridge.CoworkScheduledTasks.updateStatus?.(task.id, next ? "enabled" : "disabled");
    onTaskMutated();
  };

  const runNow = async () => {
    if (isRunning || !task.prompt) return;
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
      await desktopBridge.CoworkScheduledTasks.updateStatus?.(task.id, "deleted");
      onBack();
    } finally {
      setIsDeleting(false);
    }
  };

  const unlinkSpace = async () => {
    await desktopBridge.CoworkScheduledTasks.update?.(task.id, { spaceId: "" });
    onTaskMutated();
  };

  // Residual existingNames for edit excludes current task name
  const editExistingNames = useMemo(() => {
    const next = new Set(existingNames);
    const current = task.title || task.id;
    next.delete(current);
    next.delete(task.id);
    return next;
  }, [existingNames, task.id, task.title]);

  return (
    <div
      className="flex flex-col h-full overflow-auto"
      data-official-source="index-BELzQL5P.js:rKt root"
    >
      <main
        className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-4xl flex flex-col"
        data-official-source="index-BELzQL5P.js:Flt narrow"
      >
        <button
          className="draggable-none flex items-center gap-0.5 text-sm text-text-400 hover:text-text-200 transition-colors -ml-2 mt-2 mb-6 w-fit"
          onClick={onBack}
          type="button"
        >
          <Icon name="arrowLeft" size="s" />
          <span>{detailText.allScheduledTasks}</span>
        </button>

        {/* Residual rKt: flex items-start justify-between mb-8 (no invented gap) */}
        <div className="flex items-start justify-between mb-8">
          <DetailHero enabled={enabled} onToggle={() => void toggle()} task={task} text={detailText} />
          <DetailActions
            isDeleting={isDeleting}
            isRunDisabled={!task.prompt}
            isRunning={isRunning}
            onDelete={() => setDeleteOpen(true)}
            onEdit={() => setEditOpen(true)}
            onRunNow={() => void runNow()}
          />
        </div>

        <hr className="border-border-300 border-0 border-b-0.5 mb-8" />

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-8 lg:gap-12">
          <DetailHistoryColumn
            onOpenRun={(session) => onNavigate(coworkSessionPath(session))}
            runs={runs}
            runsLoading={runsLoading}
            task={task}
            text={detailText}
          />
          <DetailMetaColumn
            linkedSpace={linkedSpace}
            onEdit={() => setEditOpen(true)}
            onOpenSpace={(spaceId) => onNavigate(`/space/${encodeURIComponent(spaceId)}`)}
            onUnlinkSpace={() => void unlinkSpace()}
            spacesInitialized={spacesInitialized}
            task={task}
            text={detailText}
          />
        </div>
      </main>

      <ConfirmDialog
        confirmText={detailText.delete}
        isOpen={deleteOpen}
        message={formatScheduledTemplate(detailText.deleteBody, { taskName: title })}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => {
          void remove();
        }}
        title={detailText.deleteTitle}
        variant="danger"
      />

      {/* Residual UQt: uYt({ isOpen, editingTask:g, existingNames }) */}
      <ScheduledTaskCreateModal
        editingTask={task}
        existingNames={editExistingNames}
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        onCreated={() => {
          setEditOpen(false);
          onTaskMutated();
        }}
        spaceFolderPaths={linkedSpace?.folders}
        spaceId={task.spaceId}
      />
    </div>
  );
}

function useLinkedSpace(spaceId?: string) {
  const [linkedSpace, setLinkedSpace] = useState<LinkedSpaceInfo | null>(null);
  const [spacesInitialized, setSpacesInitialized] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!spaceId) {
      setLinkedSpace(null);
      setSpacesInitialized(true);
      return;
    }
    setSpacesInitialized(false);
    void desktopBridge.CoworkSpaces.getSpace?.(spaceId)
      .then((space) => {
        if (!alive) return;
        if (!space || typeof space !== "object") {
          setLinkedSpace(null);
          return;
        }
        const record = space as {
          id?: string;
          name?: string;
          folders?: Array<string | { path?: string }>;
        };
        const name = typeof record.name === "string" ? record.name : "";
        if (!name) {
          setLinkedSpace(null);
          return;
        }
        const folders = (record.folders ?? [])
          .map((entry) => {
            if (typeof entry === "string") return entry;
            if (entry && typeof entry === "object" && typeof entry.path === "string") return entry.path;
            return null;
          })
          .filter((entry): entry is string => Boolean(entry));
        setLinkedSpace({ id: spaceId, name, folders });
      })
      .catch(() => {
        if (alive) setLinkedSpace(null);
      })
      .finally(() => {
        if (alive) setSpacesInitialized(true);
      });
    return () => {
      alive = false;
    };
  }, [spaceId]);

  return { linkedSpace, spacesInitialized };
}

async function canStartScheduledRun(task: ScheduledTaskSummary) {
  if (!task.prompt) return false;
  const cwd = task.cwd ?? task.userSelectedFolders?.[0];
  if (!cwd) return true;
  const trust = await desktopBridge.LocalAgentModeSessions.checkTrust?.(cwd).catch(() => ({
    trusted: true,
  }));
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
    // Official scheduled-task detail (~250349): reload on session_updated | archived only.
    const unsubscribe = desktopBridge.LocalAgentModeSessions.onEvent?.((event) => {
      const raw = event && typeof event === "object" ? (event as Record<string, unknown>) : null;
      const type = raw && typeof raw.type === "string" ? raw.type : "";
      if (type === "session_updated" || type === "archived") void loadRuns();
    });
    window.addEventListener("focus", loadRuns);
    return () => {
      unsubscribe?.();
      window.removeEventListener("focus", loadRuns);
    };
  }, [loadRuns]);

  return { loadRuns, runs, runsLoading };
}

async function startScheduledRun(task: ScheduledTaskSummary, title: string) {
  // Residual rKt onRunNow → LocalAgentModeSessions.start (cowork/epitaxy path).
  // Bridge toStartPayload flattens workspace.cwd; kind must be epitaxy for CoworkSessionsBridge.
  const folders =
    task.userSelectedFolders && task.userSelectedFolders.length > 0
      ? task.userSelectedFolders
      : task.cwd
        ? [task.cwd]
        : [];
  const cwd = folders[0] ?? task.cwd;
  const prompt = task.prompt ?? title;
  await desktopBridge.LocalAgentModeSessions.start({
    kind: "epitaxy",
    message: prompt,
    model: task.model,
    permissionMode: task.permissionMode,
    prompt,
    scheduledTaskId: task.id,
    spaceId: task.spaceId,
    title,
    userSelectedFolders: folders.length > 0 ? folders : undefined,
    workspace: {
      mode: "local",
      projectName: basename(cwd) ?? "local",
      branchName: "main",
      hasWorktree: false,
      cwd,
    },
  });
}

export { basename };
