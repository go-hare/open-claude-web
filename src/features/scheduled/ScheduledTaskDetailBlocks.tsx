import type { ScheduledTaskSummary, SessionSummary } from "../../adapters/desktopBridge";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "../epitaxy/OfficialEpitaxyComponents";
import { DetailSection, chipClass } from "./ScheduledPrimitives";
import { formatTime, scheduleApproxPrefix, scheduleLabel, taskDisplayName } from "./scheduleUtils";
import {
  SCHEDULED_DETAIL_MESSAGES,
  formatScheduledTemplate,
  formatWebsiteCount,
  type ScheduledDetailText,
} from "./scheduledDetailMessages";

export function DetailActions({ isDeleting, isRunDisabled, isRunning, onDelete, onRunNow }: { isDeleting: boolean; isRunDisabled: boolean; isRunning: boolean; onDelete: () => void; onRunNow: () => void }) {
  const text = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  return (
    <>
      <OfficialButton ariaLabel={text.delete} disabled={isDeleting} icon="TrashCanRound" onClick={onDelete} size="base" variant="uncontained" />
      <OfficialButton disabled={isRunning || isRunDisabled} onClick={onRunNow} size="small" variant="primary">
        <span className="inline-flex items-center gap-g2">
          <Icon name="Play" size="s" />
          <span>{isRunning ? text.inProgress : text.runNow}</span>
        </span>
      </OfficialButton>
    </>
  );
}

export function DetailLeftColumn({
  task,
  enabled,
  onToggle,
  onClearChromePermissions,
  onRemoveApprovedPermission,
}: {
  task: ScheduledTaskSummary;
  enabled: boolean;
  onToggle: () => void;
  onClearChromePermissions?: () => void;
  onRemoveApprovedPermission?: (toolName: string) => void;
}) {
  const text = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  const folders = folderListForTask(task);
  const repeatLabel = task.fireAt || task.cronExpression ? localizedScheduleLabel(task, text) : text.manualOnly;
  const nextRunLabel = enabled ? detailNextRunLabel(task, text) : null;
  const status = detailStatus(task, enabled);
  return (
    <div className="flex flex-col gap-g8">
      {task.description ? <DetailSection heading={text.description}><p className="text-body text-t9">{task.description}</p></DetailSection> : null}
      <DetailSection heading={text.statusHeading}>
        <div className="flex items-center gap-g4 flex-wrap">
          {status !== "completed" && task.cronExpression ? <RoutineStatusSwitch checked={enabled} onChange={onToggle} text={text} /> : null}
          <StatusBadge status={status} text={text} />
          {nextRunLabel ? <span className="text-footnote text-t6">{nextRunLabel}</span> : null}
        </div>
      </DetailSection>
      {folders.length > 0 ? <DetailSection heading={task.cwd ? text.folder : text.folders}><div className="flex flex-col gap-g3">{folders.map((folder) => <FolderPathChip key={folder} path={folder} />)}</div></DetailSection> : null}
      <DetailSection heading={text.repeats}><p className="text-body text-t9">{repeatLabel}</p></DetailSection>
      <AlwaysAllowedSection
        onClearChromePermissions={onClearChromePermissions}
        onRemoveApprovedPermission={onRemoveApprovedPermission}
        task={task}
        text={text}
      />
    </div>
  );
}

export function DetailRightColumn({ runs, runsLoading, task, onOpenRun }: { runs: SessionSummary[]; runsLoading: boolean; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void }) {
  const text = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  return (
    <div className="flex flex-col gap-g8">
      <DetailSection heading={text.instructions}>
        <div className="px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto">
          {task.prompt ? task.prompt : <span className="text-t5">{text.noPrompt}</span>}
        </div>
      </DetailSection>
      <DetailSection heading={text.history}>
        <ScheduledRunHistory runs={runs} runsLoading={runsLoading} task={task} onOpenRun={onOpenRun} text={text} />
      </DetailSection>
    </div>
  );
}

function ScheduledRunHistory({ runs, runsLoading, task, onOpenRun, text }: { runs: SessionSummary[]; runsLoading: boolean; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void; text: ScheduledDetailText }) {
  if (runsLoading) return <p className="text-footnote text-t5">{text.inProgress}</p>;
  const items = historyItems(runs, task.missedRuns);
  if (items.length === 0) return <p className="text-footnote text-t5">{text.noRuns}</p>;
  return (
    <div className="flex flex-col gap-g3">
      {items.map((item) => item.type === "session"
        ? <ScheduledSessionRunRow key={item.session.id} onOpenRun={onOpenRun} run={item.session} task={task} text={text} />
        : <ScheduledMissedRunRow key={`missed-${item.time.getTime()}`} reason={item.reason} time={item.time} text={text} />)}
    </div>
  );
}

function RoutineStatusSwitch({ checked, onChange, text }: { checked: boolean; onChange: () => void; text: ScheduledDetailText }) {
  const data = checked ? { "data-checked": "" } : { "data-unchecked": "" };
  return (
    <button
      aria-checked={checked}
      aria-label={checked ? text.toggleDisable : text.toggleEnable}
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

function StatusBadge({ status, text }: { status: "active" | "completed" | "paused"; text: ScheduledDetailText }) {
  return (
    <span className="inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7">
      {status === "active" ? <Icon name="CircleCheck" size="s" className="text-extended-green" /> : null}
      {status === "active" ? text.active : status === "completed" ? text.ran : text.paused}
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

function AlwaysAllowedSection({
  onClearChromePermissions,
  onRemoveApprovedPermission,
  task,
  text,
}: {
  onClearChromePermissions?: () => void;
  onRemoveApprovedPermission?: (toolName: string) => void;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  const approvals = task.approvedPermissions ?? [];
  const hasBrowserApproval = Boolean(task.chromePermissionMode);
  const canRemoveTool = typeof onRemoveApprovedPermission === "function";
  const canClearChrome = typeof onClearChromePermissions === "function";
  return (
    <DetailSection heading={text.alwaysAllowed}>
      {hasBrowserApproval || approvals.length > 0 ? (
        <div className="flex flex-wrap gap-g3">
          {hasBrowserApproval ? (
            <span className={chipClass}>
              <Icon name="Globe" size="s" />
              <span className="inline-flex items-baseline gap-g2 min-w-0">
                <span>{text.browser}</span>
                <span className="text-t6">{task.chromePermissionMode === "SkipAllPermissionChecks" ? text.allWebsites : formatWebsiteCount(text.websiteCount, task.chromeAllowedDomains?.length ?? 0)}</span>
              </span>
              {canClearChrome ? (
                <button
                  aria-label={text.removeApproval}
                  className="ml-1 shrink-0 text-t6 hover:text-t9"
                  onClick={() => onClearChromePermissions?.()}
                  title={text.removeApproval}
                  type="button"
                >
                  <Icon name="XCrossCloseMedium" size="s" />
                </button>
              ) : null}
            </span>
          ) : null}
          {approvals.map((approval) => (
            <ApprovalChip
              key={approval.toolName}
              onRemove={canRemoveTool ? () => onRemoveApprovedPermission?.(approval.toolName) : undefined}
              removeLabel={text.removeApproval}
              toolName={approval.toolName}
            />
          ))}
        </div>
      ) : <p className="text-footnote text-t5">{text.alwaysAllowedEmpty}</p>}
    </DetailSection>
  );
}

function ApprovalChip({
  onRemove,
  removeLabel,
  toolName,
}: {
  onRemove?: () => void;
  removeLabel?: string;
  toolName: string;
}) {
  return (
    <span className={chipClass}>
      <Icon name="Tool" size="s" />
      <span className="min-w-0 truncate">{displayToolName(toolName)}</span>
      {onRemove ? (
        <button
          aria-label={removeLabel}
          className="ml-1 shrink-0 text-t6 hover:text-t9"
          onClick={onRemove}
          title={removeLabel}
          type="button"
        >
          <Icon name="XCrossCloseMedium" size="s" />
        </button>
      ) : null}
    </span>
  );
}

function ScheduledSessionRunRow({ run, task, onOpenRun, text }: { run: SessionSummary; task: ScheduledTaskSummary; onOpenRun: (session: SessionSummary) => void; text: ScheduledDetailText }) {
  return (
    <button type="button" className="group flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus" onClick={() => onOpenRun(run)}>
      <span className="shrink-0 flex items-center justify-center size-[14px]">
        {run.isRunning ? <Icon name="Spinner" size="s" /> : run.showRetryButton || run.connectionState === "error" ? <Icon name="XCrossCloseMedium" size="s" className="text-extended-pink" /> : <Icon name="CircleCheck" size="s" className="text-extended-green" />}
      </span>
      <span className="flex-1 min-w-0 text-body text-t9 truncate">{run.createdAtMs ? formatRelativeTime(new Date(run.createdAtMs)) : run.title || taskDisplayName(task)}</span>
      {run.showRetryButton || run.connectionState === "error" ? <span className="shrink-0 text-footnote text-t6">{text.error}</span> : run.isRunning ? <span className="shrink-0 text-footnote text-t6">{text.running}</span> : null}
    </button>
  );
}

function ScheduledMissedRunRow({ reason, time, text }: { reason?: string; time: Date; text: ScheduledDetailText }) {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1">
      <span aria-hidden="true" className="shrink-0 flex items-center justify-center size-[14px]">
        <span className="size-[6px] rounded-full border border-[var(--t5)]" />
      </span>
      <span className="flex-1 min-w-0 text-body text-t9 truncate">{formatRelativeTime(time)}</span>
      <span tabIndex={0} title={missedRunReasonLabel(reason, text)} className="shrink-0 text-footnote text-t6 rounded-r4 outline-none hide-focus-ring ring-focus">{text.skipped}</span>
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

function detailNextRunLabel(task: ScheduledTaskSummary, text: ScheduledDetailText) {
  if (task.fireAt && !task.lastRunAt) return formatScheduledTemplate(text.runsAt, { date: formatDateTime(task.fireAt) });
  if (task.nextRunAt) return formatScheduledTemplate(text.nextRun, { date: formatDateTime(task.nextRunAt) });
  return null;
}

function detailStatus(task: ScheduledTaskSummary, enabled: boolean): "active" | "completed" | "paused" {
  if (enabled) return "active";
  if (task.fireAt && task.lastRunAt) return "completed";
  return "paused";
}

function localizedScheduleLabel(task: ScheduledTaskSummary, text: ScheduledDetailText) {
  const cron = task.cronExpression;
  if (task.fireAt) return text.manual;
  if (!cron) return text.manualOnly;
  // Official HNe: ~ when Math.round((jitterSeconds ?? 0) / 60) > 0 and not disableJitter.
  const approx = scheduleApproxPrefix(task);
  const [minute, hour, , , day] = cron.split(" ");
  if (hour === "*") {
    if (approx) {
      const m = Number(minute);
      return `Hourly at ${approx}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`;
    }
    return text.hourly;
  }
  const time = `${approx}${formatTime(Number(hour), Number(minute))}`;
  if (day === "1-5") return `${text.weekdays} ${time}`;
  if (day && day !== "*") return `${text.weekly} ${time}`;
  if (hour !== undefined && minute !== undefined) return `${text.daily} ${time}`;
  return scheduleLabel(task);
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
  if (abs < 2_592_000_000) return formatter.format(Math.round(diffMs / 86_400_000), "day");
  return formatter.format(Math.round(diffMs / 2_592_000_000), "month");
}

function displayToolName(toolName: string) {
  return toolName.replace(/^mcp__/i, "").replace(/__/g, " · ");
}

function missedRunReasonLabel(reason: string | undefined, text: ScheduledDetailText) {
  if (reason === "asleep" || reason === "offline") return text.skippedAsleep;
  if (reason === "per_task" || reason === "in_progress") return text.skippedPerTask;
  if (reason === "global") return text.skippedGlobal;
  return text.skipped;
}
