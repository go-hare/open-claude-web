/**
 * Official zR / Jp tasks side-pane (c11959232).
 * Extracted from EpitaxySessionTile — behavior unchanged.
 */
import { memo, useCallback, useMemo, useState } from "react";
import { motion } from "motion/react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { useOfficialCodeSessionBucket } from "./officialCodeSessionStore";
import { OfficialSpinner } from "./OfficialWorkingStatus";
import {
  formatDuration,
  formatTokens,
  officialTaskKind,
  parseOfficialTasks,
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
  const messages = bucket?.messages ?? session?.messages ?? [];
  const tasks = useMemo(() => parseOfficialTasks(messages), [messages]);
  const visibleTasks = useMemo(() => tasks.filter((task) => task.taskType !== "dream"), [tasks]);
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
        .sort((left, right) => (right.completedAt ?? -Infinity) - (left.completedAt ?? -Infinity) || left.index - right.index),
    [visibleTasks],
  );
  const stopTask = useCallback(
    (taskId: string) => {
      void bridge.stopTask?.(sessionRef.id, taskId);
    },
    [bridge, sessionRef.id],
  );
  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        {running.length === 0 && finished.length === 0 ? (
          <OfficialTasksEmpty />
        ) : (
          <>
            <OfficialTaskSection actions={actions} heading="Running" onStop={bridge.stopTask ? stopTask : undefined} tasks={running} />
            <OfficialTaskSection actions={actions} heading="Completed" tasks={finished} />
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
  onStop,
  tasks,
}: {
  actions?: OfficialTasksPaneActions | null;
  heading: string;
  onStop?: (taskId: string) => void;
  tasks: OfficialBackgroundTask[];
}) {
  if (tasks.length === 0) return null;
  return (
    <motion.section className="flex flex-col gap-g3" layout="position" transition={officialTaskLayoutTransition}>
      <h3 className="text-footnote text-t6">{heading}</h3>
      {tasks.map((task) => (
        <motion.div key={task.taskId} layout="position" transition={officialTaskLayoutTransition}>
          <OfficialTaskCard actions={actions} onStop={onStop} task={task} />
        </motion.div>
      ))}
    </motion.section>
  );
});

const OfficialTaskCard = memo(function OfficialTaskCard({
  actions,
  onStop,
  task,
}: {
  actions?: OfficialTasksPaneActions | null;
  onStop?: (taskId: string) => void;
  task: OfficialBackgroundTask;
}) {
  const [expanded, setExpanded] = useState(false);
  const kind = officialTaskKind(task.taskType);
  const usage = task.usage
    ? [formatDuration(task.usage.durationMs), formatTokens(task.usage.totalTokens), `${task.usage.toolUses} ${task.usage.toolUses === 1 ? "tool use" : "tool uses"}`].join(
        officialTaskSeparator,
      )
    : null;
  const canOpenSubagent = kind.kind === "agent" && Boolean(task.toolUseId && actions?.openSubagent);
  const canExpand = !canOpenSubagent && Boolean(task.summary || task.workflowProgress?.length);
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

