import type { ScheduledTaskSummary, SessionSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "../epitaxy/OfficialEpitaxyComponents";
import { DetailSection, chipClass } from "./ScheduledPrimitives";
import { scheduleLabel, taskDisplayName } from "./scheduleUtils";

export function DetailActions({ isDeleting, isRunDisabled, isRunning, onDelete, onRunNow }: { isDeleting: boolean; isRunDisabled: boolean; isRunning: boolean; onDelete: () => void; onRunNow: () => void }) {
  return (
    <>
      <OfficialButton ariaLabel="Delete" disabled={isDeleting} icon="TrashCanRound" onClick={onDelete} size="base" variant="uncontained" />
      <OfficialButton disabled={isRunning || isRunDisabled} onClick={onRunNow} size="small" variant="primary">
        <span className="inline-flex items-center gap-g2">
          <Icon name="Play" size="s" />
          <span>{isRunning ? "In progress" : "Run now"}</span>
        </span>
      </OfficialButton>
    </>
  );
}

export function DetailLeftColumn({ task, enabled, onToggle }: { task: ScheduledTaskSummary; enabled: boolean; onToggle: () => void }) {
  const folders = folderListForTask(task);
  const repeatLabel = task.fireAt || task.cronExpression ? scheduleLabel(task) : "Manual only";
  const nextRunLabel = enabled ? detailNextRunLabel(task) : null;
  const status = detailStatus(task, enabled);
  return (
    <div className="flex flex-col gap-g8">
      {task.description ? <DetailSection heading="Description"><p className="text-body text-t9">{task.description}</p></DetailSection> : null}
      <DetailSection heading="Status">
        <div className="flex items-center gap-g4 flex-wrap">
          {status !== "completed" && task.cronExpression ? <RoutineStatusSwitch checked={enabled} onChange={onToggle} /> : null}
          <StatusBadge status={status} />
          {nextRunLabel ? <span className="text-footnote text-t6">{nextRunLabel}</span> : null}
        </div>
      </DetailSection>
      {folders.length > 0 ? <DetailSection heading={task.cwd ? "Folder" : "Folders"}><div className="flex flex-col gap-g3">{folders.map((folder) => <FolderPathChip key={folder} path={folder} />)}</div></DetailSection> : null}
      <DetailSection heading="Repeats"><p className="text-body text-t9">{repeatLabel}</p></DetailSection>
      <AlwaysAllowedSection task={task} />
    </div>
  );
}

export function DetailRightColumn({ runs, runsLoading, task, onOpenRun }: { runs: SessionSummary[]; runsLoading: boolean; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void }) {
  return (
    <div className="flex flex-col gap-g8">
      <DetailSection heading="Instructions">
        <div className="px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto">
          {task.prompt ? task.prompt : <span className="text-t5">Task file not found or has unexpected format.</span>}
        </div>
      </DetailSection>
      <DetailSection heading="History">
        <ScheduledRunHistory runs={runs} runsLoading={runsLoading} task={task} onOpenRun={onOpenRun} />
      </DetailSection>
    </div>
  );
}

function ScheduledRunHistory({ runs, runsLoading, task, onOpenRun }: { runs: SessionSummary[]; runsLoading: boolean; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void }) {
  if (runsLoading) return <p className="text-footnote text-t5">Loading runs…</p>;
  const items = historyItems(runs, task.missedRuns);
  if (items.length === 0) return <p className="text-footnote text-t5">No runs yet.</p>;
  return (
    <div className="flex flex-col gap-g3">
      {items.map((item) => item.type === "session"
        ? <ScheduledSessionRunRow key={item.session.id} onOpenRun={onOpenRun} run={item.session} task={task} />
        : <ScheduledMissedRunRow key={`missed-${item.time.getTime()}`} reason={item.reason} time={item.time} />)}
    </div>
  );
}

function RoutineStatusSwitch({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  const data = checked ? { "data-checked": "" } : { "data-unchecked": "" };
  return (
    <button
      aria-checked={checked}
      aria-label={checked ? "Pause routine" : "Enable routine"}
      className="cds-reset relative inline-flex shrink-0 rounded-full border-0 outline-none bg-switch-track hover:bg-switch-track-hover data-[checked]:bg-fill-accent data-[checked]:hover:bg-fill-accent-hover disabled:opacity-50 disabled:hover:bg-switch-track focus-visible:shadow-focus h-switch w-[calc(var(--cds-switch-h,20px)*1.8)] p-[2px]"
      data-cds="Switch"
      onClick={onChange}
      role="switch"
      type="button"
      {...data}
    >
      <span className="block rounded-full bg-switch-knob shadow-sm transition-transform duration-snap ease-overshoot motion-reduce:transition-none size-[calc(var(--cds-switch-h,20px)-4px)] data-[checked]:translate-x-[calc(var(--cds-switch-h,20px)*0.8)]" {...data} />
    </button>
  );
}

function StatusBadge({ status }: { status: "active" | "completed" | "paused" }) {
  return (
    <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
      {status === "active" ? <Icon name="CircleCheck" size="s" className="text-extended-green" /> : null}
      {status === "active" ? "Active" : status === "completed" ? "Ran" : "Paused"}
    </span>
  );
}

function FolderPathChip({ path }: { path: string }) {
  const label = basename(path) ?? path;
  return (
    <span className={chipClass} title={path}>
      <Icon name="Folder1" size="s" />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  );
}

function AlwaysAllowedSection({ task }: { task: ScheduledTaskSummary }) {
  const approvals = task.approvedPermissions ?? [];
  const hasBrowserApproval = Boolean(task.chromePermissionMode);
  return (
    <DetailSection heading="Always allowed">
      {hasBrowserApproval || approvals.length > 0 ? (
        <div className="flex flex-wrap gap-g3">
          {hasBrowserApproval ? (
            <span className={chipClass}>
              <Icon name="Globe" size="s" />
              <span className="inline-flex items-baseline gap-g2">
                <span>Browser</span>
                <span className="text-t6">{task.chromePermissionMode === "SkipAllPermissionChecks" ? "All websites" : websiteCountLabel(task.chromeAllowedDomains?.length ?? 0)}</span>
              </span>
            </span>
          ) : null}
          {approvals.map((approval) => <ApprovalChip key={approval.toolName} toolName={approval.toolName} />)}
        </div>
      ) : <p className="text-footnote text-t5">Approvals you grant during a run appear here.</p>}
    </DetailSection>
  );
}

function ApprovalChip({ toolName }: { toolName: string }) {
  return (
    <span className={chipClass}>
      <Icon name="Tool" size="s" />
      <span className="min-w-0 truncate">{displayToolName(toolName)}</span>
    </span>
  );
}

function ScheduledSessionRunRow({ run, task, onOpenRun }: { run: SessionSummary; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void }) {
  return (
    <button type="button" className="group flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus" onClick={() => onOpenRun(run)}>
      <span className="shrink-0 flex items-center justify-center size-[14px]">
        {run.isRunning ? <Icon name="Spinner" size="s" /> : run.showRetryButton || run.connectionState === "error" ? <Icon name="XCrossCloseMedium" size="s" className="text-extended-pink" /> : <Icon name="CircleCheck" size="s" className="text-extended-green" />}
      </span>
      <span className="flex-1 min-w-0 text-body text-t9 truncate">{run.createdAtMs ? formatRelativeTime(new Date(run.createdAtMs)) : run.title || taskDisplayName(task)}</span>
      {run.showRetryButton || run.connectionState === "error" ? <span className="shrink-0 text-footnote text-t6">Error</span> : run.isRunning ? <span className="shrink-0 text-footnote text-t6">Running</span> : null}
    </button>
  );
}

function ScheduledMissedRunRow({ reason, time }: { reason?: string; time: Date }) {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1">
      <span aria-hidden="true" className="shrink-0 flex items-center justify-center size-[14px]">
        <span className="size-[6px] rounded-full border border-[var(--t5)]" />
      </span>
      <span className="flex-1 min-w-0 text-body text-t9 truncate">{formatRelativeTime(time)}</span>
      <span tabIndex={0} title={missedRunReasonLabel(reason)} className="shrink-0 text-footnote text-t6 rounded-r4 outline-none hide-focus-ring ring-focus">Skipped</span>
    </div>
  );
}

type HistoryItem =
  | { type: "session"; session: SessionSummary; time: number }
  | { type: "missed"; time: Date; reason?: string };

function historyItems(runs: SessionSummary[], missedRuns?: ScheduledTaskSummary["missedRuns"]): HistoryItem[] {
  const items: HistoryItem[] = runs.map((session) => ({
    type: "session",
    session,
    time: session.createdAtMs ?? session.updatedAtMs ?? 0,
  }));
  for (const missed of missedRuns ?? []) {
    const time = new Date(typeof missed === "string" ? missed : missed.time);
    if (!Number.isNaN(time.getTime())) items.push({ type: "missed", time, reason: typeof missed === "string" ? undefined : missed.reason });
  }
  return items.sort((left, right) => historyTime(right) - historyTime(left));
}

function historyTime(item: HistoryItem) {
  return item.type === "session" ? item.time : item.time.getTime();
}

export function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

function folderListForTask(task: ScheduledTaskSummary) {
  const folders = new Set<string>();
  if (task.cwd) folders.add(task.cwd);
  for (const folder of task.userSelectedFolders ?? []) folders.add(folder);
  return [...folders];
}

function detailNextRunLabel(task: ScheduledTaskSummary) {
  if (task.fireAt && !task.lastRunAt) return `Runs at: ${formatDateTime(task.fireAt)}`;
  if (task.nextRunAt) return `Next run: ${formatDateTime(task.nextRunAt)}`;
  return null;
}

function detailStatus(task: ScheduledTaskSummary, enabled: boolean): "active" | "completed" | "paused" {
  if (enabled) return "active";
  if (task.fireAt && task.lastRunAt) return "completed";
  return "paused";
}

function formatDateTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function formatRelativeTime(date: Date) {
  if (Number.isNaN(date.getTime())) return "";
  const diffMs = date.getTime() - Date.now();
  const abs = Math.abs(diffMs);
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto", style: "narrow" });
  if (abs < 60_000) return formatter.format(Math.round(diffMs / 1000), "second");
  if (abs < 3_600_000) return formatter.format(Math.round(diffMs / 60_000), "minute");
  if (abs < 86_400_000) return formatter.format(Math.round(diffMs / 3_600_000), "hour");
  if (abs < 604_800_000) return formatter.format(Math.round(diffMs / 86_400_000), "day");
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

function missedRunReasonLabel(reason?: string) {
  if (reason === "PerTaskLimit" || reason === "per_task_limit") return "The previous run was still in progress.";
  if (reason === "GlobalLimit" || reason === "global_limit") return "Other scheduled tasks were already running.";
  return "Scheduled tasks only run while your computer is awake.";
}

function displayToolName(toolName: string) {
  return toolName.split("__").filter(Boolean).at(-1) ?? toolName;
}

function websiteCountLabel(count: number) {
  return count === 1 ? "1 website" : `${count} websites`;
}
