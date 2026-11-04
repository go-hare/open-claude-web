/**
 * Official zR / Jp tasks side-pane (c11959232).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { memo, useCallback, useEffect, useMemo, useState } from "react";
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
  officialTaskRowCanExpand,
  parseOfficialTasks,
  resolveOfficialTaskUsageParts,
  type OfficialBackgroundTask,
  type OfficialTaskStatus,
} from "./officialTasksAndPlan";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { SIDE_PANE_EMPTY_MESSAGES } from "../officialCodeChromeMessages";
import { useOfficialTaskRowExpanded } from "./officialToolGroupExpandedStore";

/** Host openSubagent callback lives on EpitaxyTranscriptActionContext in the tile. */
export type OfficialTasksPaneActions = {
  openSubagent?: (target: { description: string; toolUseId: string }) => void;
};

type EpitaxySessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

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
  const emptyText = useI18nText(SIDE_PANE_EMPTY_MESSAGES);
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
  const echoTaskStopped = useCallback((taskId: string) => {
    // Official densable Xr onSuccess → echoPending(system/task_notification stopped).
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
  }, [sessionRef.id]);

  const stopTask = useCallback(
    (taskId: string) => {
      if (!bridge.stopTask) return;
      void bridge.stopTask(sessionRef.id, taskId).then((result) => {
        const record = result && typeof result === "object" ? (result as Record<string, unknown>) : null;
        const status = typeof record?.status === "string" ? record.status : undefined;
        const error = typeof record?.error === "string" ? record.error : undefined;
        // Desktop returns { ok, status }. Missing/undefined result is NOT success
        // (bridge stub / no LocalSessions.stopTask) — do not fake-stop the row.
        // informed = CLI accepted stop. no_turn / "No task found" = registry already
        // empty (stale 362h Running row) — same end-state as official Xr close.
        const gone =
          status === "no_turn"
          || (typeof error === "string" && /no task found/i.test(error));
        const explicitOk = record?.ok === true || status === "informed" || gone;
        if (explicitOk) {
          echoTaskStopped(taskId);
          return;
        }
        const message =
          error
            ? `Couldn't stop task: ${error}`
            : record == null
              ? "Couldn't stop this task — stop is unavailable."
              : "Couldn't stop this task.";
        errors?.addError(message, { uniqueKey: `stop-task:${sessionRef.id}:${taskId}` });
      }).catch((err: unknown) => {
        const detail = err instanceof Error ? err.message : String(err ?? "unknown error");
        if (/no task found/i.test(detail)) {
          echoTaskStopped(taskId);
          return;
        }
        errors?.addError(`Couldn't stop task: ${detail}`, {
          uniqueKey: `stop-task:${sessionRef.id}:${taskId}`,
        });
      });
    },
    [bridge, echoTaskStopped, errors, sessionRef.id],
  );
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        {running.length === 0 && finished.length === 0 ? (
          <OfficialTasksEmpty />
        ) : (
          <>
            <OfficialTaskSection actions={actions} heading={emptyText.running} nowMs={nowMs} onStop={bridge.stopTask ? stopTask : undefined} sessionId={sessionRef.id} tasks={running} />
            <OfficialTaskSection actions={actions} heading={emptyText.completed} nowMs={nowMs} sessionId={sessionRef.id} tasks={finished} />
          </>
        )}
      </div>
    </div>
  );
}

function OfficialTasksEmpty() {
  const emptyText = useI18nText(SIDE_PANE_EMPTY_MESSAGES);
  return (
    <div className="flex flex-col items-center justify-center gap-g4 py-[64px] text-body text-t5">
      <Icon name="Blocks" size="lg" />
      <span>{emptyText.noTasks}</span>
    </div>
  );
}

const OfficialTaskSection = memo(function OfficialTaskSection({
  actions,
  heading,
  nowMs,
  onStop,
  sessionId,
  tasks,
}: {
  actions?: OfficialTasksPaneActions | null;
  heading: string;
  nowMs: number;
  onStop?: (taskId: string) => void;
  sessionId: string;
  tasks: OfficialBackgroundTask[];
}) {
  if (tasks.length === 0) return null;
  return (
    <section className="flex flex-col gap-g3">
      <h3 className="text-footnote text-t6">{heading}</h3>
      {tasks.map((task) => (
        <div key={task.taskId}>
          <OfficialTaskCard actions={actions} nowMs={nowMs} onStop={onStop} sessionId={sessionId} task={task} />
        </div>
      ))}
    </section>
  );
});

const OfficialTaskCard = memo(function OfficialTaskCard({
  actions,
  nowMs,
  onStop,
  sessionId,
  task,
}: {
  actions?: OfficialTasksPaneActions | null;
  nowMs: number;
  onStop?: (taskId: string) => void;
  sessionId: string;
  task: OfficialBackgroundTask;
}) {
  // Official cccc2cf0a QC `Vu` / `setTaskRowsOpen` — Map keyed by taskId, not per-card useState.
  const [expanded, setExpanded] = useOfficialTaskRowExpanded(sessionId, task.taskId);
  const kind = officialTaskKind(task.taskType);
  // Official zR: usage.duration_ms or bookend startedAt/completedAt (running elapsed).
  const usageParts = resolveOfficialTaskUsageParts(task, nowMs);
  const usage = usageParts.length > 0 ? usageParts.join(officialTaskSeparator) : null;
  const canOpenSubagent = kind.kind === "agent" && Boolean(task.toolUseId && actions?.openSubagent);
  // Official RC `O=!T&&(E||D)` (cccc2cf0a): bash/monitor always expand; else summary≠description.
  const canExpand = !canOpenSubagent && officialTaskRowCanExpand(task);
  const canActivate = canOpenSubagent || canExpand;
  const canStop = task.status === "running" && Boolean(onStop);
  const activate = () => {
    if (canOpenSubagent && task.toolUseId && actions?.openSubagent) {
      actions.openSubagent({ description: task.description, toolUseId: task.toolUseId });
      return;
    }
    if (canExpand) setExpanded(!expanded);
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
        <OfficialTaskExpandedBody task={task} />
      ) : null}
    </div>
  );
});

function OfficialTaskExpandedBody({ task }: { task: OfficialBackgroundTask }) {
  const isBash = task.taskType === "local_bash" || task.taskType === "monitor_mcp";
  const commandLabel = `Command for ${task.description}`;
  const outputLabel = `Output for ${task.description}`;
  const output = task.result;
  const summary = task.summary && task.summary !== task.description ? task.summary : undefined;
  const settled = task.status !== "running";
  return (
    <div className="flex flex-col gap-g4 pl-[calc(var(--p6)+20px+var(--g6))] pr-p8 pb-[16px] select-text">
      {isBash && task.prompt ? (
        <pre
          tabIndex={0}
          role="region"
          aria-label={commandLabel}
          className="rounded-lg text-code max-h-[200px] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus bg-alpha-2 px-md py-1.25 text-primary whitespace-pre-wrap break-all"
          data-official-source="cccc2cf0a-DHtZKTKW.js:_C"
        >
          {task.prompt}
        </pre>
      ) : null}
      {output ? (
        <pre
          tabIndex={0}
          role="region"
          aria-label={outputLabel}
          className="rounded-lg text-code max-h-[200px] overflow-y-auto focus-visible:outline-hidden focus-visible:shadow-focus bg-alpha-2 px-md py-1.25 text-primary whitespace-pre-wrap break-all"
        >
          {output}
        </pre>
      ) : null}
      {!output && summary ? (
        <div className="text-footnote text-t7 whitespace-pre-wrap break-words">{summary}</div>
      ) : null}
      {!output && !summary && isBash && task.outputFile ? (
        <div className="text-footnote text-muted">Output unavailable</div>
      ) : null}
      {!output && !summary && isBash && !task.outputFile && task.status === "running" ? (
        <div className="text-footnote text-muted">No output yet</div>
      ) : null}
      {!output && !summary && isBash && !task.outputFile && settled ? (
        <div className="text-footnote text-muted">No output captured.</div>
      ) : null}
      {task.workflowProgress?.length ? <OfficialWorkflowProgress progress={task.workflowProgress} /> : null}
    </div>
  );
}

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

