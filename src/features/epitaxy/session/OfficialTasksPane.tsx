/**
 * Official zR / Jp tasks side-pane (c11959232).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { useErrorsOptional } from "../../settings/errorsToast";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import {
  officialCodeSessionStore,
  useOfficialCodeSessionBucket,
} from "./officialCodeSessionStore";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import {
  officialTaskKind,
  parseOfficialTasks,
  resolveOfficialTaskUsageParts,
  type OfficialBackgroundTask,
  type OfficialTaskStatus,
} from "./officialTasksAndPlan";

/** Host openSubagent callback lives on EpitaxyTranscriptActionContext in the tile. */
export type OfficialTasksPaneActions = {
  openSubagent?: (target: { description: string; toolUseId: string }) => void;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

const officialTaskLayoutTransition = { type: "spring", stiffness: 500, damping: 40 } as const;
const officialTaskSeparator = " · ";

export function OfficialTasksPane({
  actions,
  bridge,
  session,
  sessionRef,
}: {
  actions?: OfficialTasksPaneActions | null;
  bridge: LocalSessionsBridge;
  session: SessionSummary | null;
  sessionRef: EpitaxySessionRef;
}) {
  // Official Jp(sessionId) / zR: oe(sessionId) full hydrated transcript (c11959232).
  const bucket = useOfficialCodeSessionBucket(sessionRef.id);
  const errors = useErrorsOptional();
  const messages = bucket?.messages ?? session?.messages ?? [];
  const tasks = useMemo(() => parseOfficialTasks(messages), [messages]);
  const visibleTasks = useMemo(() => tasks.filter((task) => task.taskType !== "dream"), [tasks]);
  // Official zR running duration ticks while tasks are live (usage fallback uses Date.now).
  const hasRunning = useMemo(
    () => visibleTasks.some((task) => task.status === "running"),
    [visibleTasks],
  );
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!hasRunning) return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [hasRunning]);
  const running = useMemo(
    () =>
      visibleTasks
        .filter((task) => task.status === "running")
        .sort((left, right) => (left.startedAt ?? Infinity) - (right.startedAt ?? Infinity) || left.index - right.index),
    [visibleTasks],
  );
  const finished = useMemo(
    () =>
      visibleTasks
        .filter((task) => task.status !== "running")
        // Official DR: completedAt desc, then index desc (newer index first on ties).
        .sort((left, right) => (right.completedAt ?? -Infinity) - (left.completedAt ?? -Infinity) || right.index - left.index),
    [visibleTasks],
  );
  const stopTask = useCallback(
    (taskId: string) => {
      if (!bridge.stopTask) return;
      void bridge.stopTask(sessionRef.id, taskId).then((result) => {
        const record = result && typeof result === "object" ? (result as Record<string, unknown>) : null;
        const status = typeof record?.status === "string" ? record.status : undefined;
        // Desktop returns { ok, status }. Missing/undefined result is NOT success
        // (bridge stub / no LocalSessions.stopTask) — do not fake-stop the row.
        // densable Xr treats resolved mutate as success; our Host always returns a body.
        const explicitOk = record?.ok === true || status === "informed";
        const explicitFail =
          record?.ok === false
          || status === "no_turn"
          || status === "failed";
        if (explicitOk && !explicitFail) {
          // Official densable Xr onSuccess → echoPending(system/task_notification stopped).
          // Host stopTask is control_request only (no host-stop transcript invent).
          // Durable bookend: CLI dual-emit; Jp last status wins on same taskId.
          const uuid =
            typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
              ? crypto.randomUUID()
              : `xr-stop-echo-${taskId}-${Date.now()}`;
          const timestamp = new Date().toISOString();
          officialCodeSessionStore.getState().mergeMessage(sessionRef.id, {
            id: uuid,
            role: "system",
            text: "",
            createdAt: timestamp,
            raw: {
              type: "system",
              subtype: "task_notification",
              task_id: taskId,
              status: "stopped",
              output_file: "",
              summary: "",
              uuid,
              session_id: sessionRef.id,
              timestamp,
            },
          });
          return;
        }
        const error = typeof record?.error === "string" ? record.error : undefined;
        const message =
          status === "no_turn"
            ? "Can't stop this task — the session turn is no longer active."
            : error
              ? `Couldn't stop task: ${error}`
              : record == null
                ? "Couldn't stop this task — stop is unavailable."
                : "Couldn't stop this task.";
        errors?.addError(message, { uniqueKey: `stop-task:${sessionRef.id}:${taskId}` });
      }).catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err ?? "unknown error");
        errors?.addError(`Couldn't stop task: ${detail}`, {
          uniqueKey: `stop-task:${sessionRef.id}:${taskId}`,
        });
      });
    },
    [bridge, errors, sessionRef.id],
  );
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        {running.length === 0 && finished.length === 0 ? (
          <OfficialTasksEmpty />
        ) : (
          <>
            <OfficialTaskSection actions={actions} heading="Running" nowMs={nowMs} onStop={bridge.stopTask ? stopTask : undefined} tasks={running} />
            <OfficialTaskSection actions={actions} heading="Completed" nowMs={nowMs} tasks={finished} />
          </>
        )}
      </div>
    </div>
  );
}

function OfficialTasksEmpty() {
  return (
    <div className="flex flex-col items-center justify-center gap-g4 py-[64px] text-body text-t5">
      <Icon name="Blocks" size="lg" />
      <span>No tasks.</span>
    </div>
  );
}

const OfficialTaskSection = memo(function OfficialTaskSection({
  actions,
  heading,
  nowMs,
  onStop,
  tasks,
}: {
  actions?: OfficialTasksPaneActions | null;
  heading: string;
  nowMs: number;
  onStop?: (taskId: string) => void;
  tasks: OfficialBackgroundTask[];
}) {
  if (tasks.length === 0) return null;
  return (
    <motion.section className="flex flex-col gap-g3" layout="position" transition={officialTaskLayoutTransition}>
      <h3 className="text-footnote text-t6">{heading}</h3>
      {tasks.map((task) => (
        <motion.div key={task.taskId} layout="position" transition={officialTaskLayoutTransition}>
          <OfficialTaskCard actions={actions} nowMs={nowMs} onStop={onStop} task={task} />
        </motion.div>
      ))}
    </motion.section>
  );
});

const OfficialTaskCard = memo(function OfficialTaskCard({
  actions,
  nowMs,
  onStop,
  task,
}: {
  actions?: OfficialTasksPaneActions | null;
  nowMs: number;
  onStop?: (taskId: string) => void;
  task: OfficialBackgroundTask;
}) {
  const [expanded, setExpanded] = useState(false);
  const kind = officialTaskKind(task.taskType);
  // Official zR: usage.duration_ms or bookend startedAt/completedAt (running elapsed).
  const usageParts = resolveOfficialTaskUsageParts(task, nowMs);
  const usage = usageParts.length > 0 ? usageParts.join(officialTaskSeparator) : null;
  const canOpenSubagent = kind.kind === "agent" && Boolean(task.toolUseId && actions?.openSubagent);
  // Official AR: expand when not subagent/remote open — summary / workflowProgress.
  // Also allow expand for result-only residual (TaskOutput) when toolUseId missing.
  const canExpand =
    !canOpenSubagent
    && Boolean(task.summary || task.workflowProgress?.length || task.result);
  const canActivate = canOpenSubagent || canExpand;
  const canStop = task.status === "running" && Boolean(onStop);
  const activate = () => {
    if (canOpenSubagent && task.toolUseId && actions?.openSubagent) {
      actions.openSubagent({ description: task.description, toolUseId: task.toolUseId });
      return;
    }
    if (canExpand) setExpanded((value) => !value);
  };
  return (
    <div className={`group flex flex-col rounded-r6 bg-t1 ${canActivate ? "hover:bg-t2 focus-within:bg-t2" : ""}`}>
      <div className="flex items-center gap-g6 pl-p6 pr-p8 py-p6">
        <button
          type="button"
          onClick={activate}
          disabled={!canActivate}
          aria-expanded={canExpand ? expanded : undefined}
          aria-label={`Background task: ${task.description}`}
          className="flex-1 min-w-0 flex items-start gap-g6 text-left outline-none hide-focus-ring ring-focus disabled:cursor-default"
        >
          <span className="flex h-[var(--leading-body)] w-[20px] shrink-0 items-center justify-center">
            <OfficialTaskStatusIcon status={task.status} />
          </span>
          <span className="flex-1 min-w-0 flex flex-col gap-g4 pb-p2">
            <span className="min-w-0 flex items-center gap-g2 text-body text-t9">
              <span className="truncate">{task.description}</span>
              {canActivate ? <Icon name={canExpand && expanded ? "ChevronDownMedium" : "ChevronRightMedium"} size="sm" className="shrink-0 text-t6" /> : null}
            </span>
            <span className="text-footnote text-t6 truncate">
              <span className="text-t7">{kind.label}</span>
              <span>{officialTaskSeparator}</span>
              <OfficialTaskStatusLabel task={task} />
              {usage ? (
                <>
                  <span>{officialTaskSeparator}</span>
                  {usage}
                </>
              ) : null}
            </span>
          </span>
        </button>
        {canStop ? (
          <OfficialButton ariaLabel="Stop this task" className="min-w-[44px] justify-center" onClick={() => onStop?.(task.taskId)} size="small" variant="contained">
            Stop
          </OfficialButton>
        ) : null}
      </div>
      {expanded && canExpand ? (
        <div className="flex flex-col gap-g4 pl-[calc(var(--p6)+20px+var(--g6))] pr-p8 pb-[16px] select-text">
          {task.summary ? <div className="text-footnote text-t7 whitespace-pre-wrap break-words">{task.summary}</div> : null}
          {!task.summary && task.result ? (
            <div className="text-footnote text-t7 whitespace-pre-wrap break-words">{task.result}</div>
          ) : null}
          {task.workflowProgress?.length ? <OfficialWorkflowProgress progress={task.workflowProgress} /> : null}
        </div>
      ) : null}
    </div>
  );
});

function OfficialTaskStatusIcon({ status }: { status: OfficialTaskStatus }) {
  if (status === "completed") return <Icon name="CircleCheck" size="md" className="text-t6" />;
  if (status === "failed") return <Icon name="XCrossCloseMedium" size="md" className="text-extended-pink" />;
  if (status === "stopped") return <Icon name="Hand4FingerStop" size="md" className="text-t6" />;
  return <OfficialSpinner />;
}

function OfficialTaskStatusLabel({ task }: { task: OfficialBackgroundTask }) {
  if (task.status === "running") return <>{task.lastToolName ? `Running ${task.lastToolName}` : "Running"}</>;
  if (task.status === "completed") return <>Completed</>;
  if (task.status === "failed") return <>Failed</>;
  return <>Stopped</>;
}

function OfficialWorkflowProgress({ progress }: { progress: NonNullable<OfficialBackgroundTask["workflowProgress"]> }) {
  return (
    <ul className="flex flex-col gap-g2">
      {progress.map((item) =>
        item.type === "workflow_phase" ? (
          <li className="text-footnote text-t7 pt-p6 pb-p2 first:pt-0" key={`phase-${item.index}`}>
            {item.title}
          </li>
        ) : (
          <li className="-ml-[calc(12px+var(--g3))] flex items-center gap-g3 text-footnote text-t6" key={`agent-${item.index}`}>
            <span className="flex w-[12px] shrink-0 translate-y-px justify-center">
              {item.state === "done" ? (
                <Icon name="CircleCheck" size="xs" />
              ) : item.state === "error" ? (
                <Icon name="XCrossCloseMedium" size="xs" className="text-extended-pink" />
              ) : (
                <OfficialSpinner animate={item.state !== "start"} size="m" />
              )}
            </span>
            <span className="truncate">{item.label}</span>
          </li>
        ),
      )}
    </ul>
  );
}

