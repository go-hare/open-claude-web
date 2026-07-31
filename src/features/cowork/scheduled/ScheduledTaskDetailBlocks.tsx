/**
 * Official residual cowork scheduled-task detail body (index-BELzQL5P function rKt + aKt + iKt).
 * Layout: back link → title/description/status + actions → hr → grid lg:[2fr_3fr]
 *   left (order-2): History
 *   right (order-1): Instructions, Project, Folder, Folders(+from project), Repeats, Always allowed
 */
import { useState } from "react";
import type { ScheduledTaskSummary, SessionSummary } from "../../../adapters/desktopBridge";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialSwitch } from "../../shared/OfficialSwitch";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import {
  CoworkEditGlyph,
  CoworkPlayGlyph,
  CoworkTrashGlyph,
} from "../ui/CoworkOfficialGlyphs";
import {
  SCHEDULED_DETAIL_MESSAGES,
  formatScheduledTemplate,
  formatWebsiteCount,
  type ScheduledDetailText,
} from "./scheduledDetailMessages";
import { formatTime, scheduleLabel, taskDisplayName } from "./scheduleUtils";

export type LinkedSpaceInfo = {
  id: string;
  name: string;
  folders: string[];
};

export function DetailActions({
  isDeleting,
  isRunDisabled,
  isRunning,
  onDelete,
  onEdit,
  onRunNow,
}: {
  isDeleting: boolean;
  isRunDisabled: boolean;
  isRunning: boolean;
  onDelete: () => void;
  onEdit: () => void;
  onRunNow: () => void;
}) {
  const text = useI18nText(SCHEDULED_DETAIL_MESSAGES);
  // Residual rKt: Dc icon ghost + ev/mC size 20 (Nx viewBox 0 0 20 20), not Anthropicons Pencil/TrashCanRound.
  return (
    <div className="flex items-center gap-1" data-official-source="index-BELzQL5P.js:rKt actions">
      <OfficialButton
        aria-label={text.edit}
        className="!min-w-0"
        onClick={onEdit}
        size="icon"
        variant="ghost"
      >
        <CoworkEditGlyph size={20} />
      </OfficialButton>
      <OfficialButton
        aria-label={text.delete}
        className="!min-w-0"
        disabled={isDeleting}
        onClick={onDelete}
        size="icon"
        variant="ghost"
      >
        <CoworkTrashGlyph size={20} />
      </OfficialButton>
      <OfficialButton
        className="ml-2"
        disabled={isRunning || isRunDisabled}
        loading={isRunning}
        onClick={onRunNow}
        prepend={isRunning ? undefined : <CoworkPlayGlyph size={20} />}
        variant="primary"
      >
        {isRunning ? text.inProgress : text.runNow}
      </OfficialButton>
    </div>
  );
}

export function DetailHero({
  enabled,
  onToggle,
  task,
  text,
}: {
  enabled: boolean;
  onToggle: () => void;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  const title = taskDisplayName(task);
  const nextRunLabel = enabled ? detailNextRunLabel(task, text) : null;
  return (
    <div data-official-source="index-BELzQL5P.js:rKt hero">
      <h1 className="font-heading font-bold text-text-100">{title}</h1>
      {task.description ? <p className="text-text-300 mt-2">{task.description}</p> : null}
      {/* Residual rKt hero status row: flex items-center gap-2 mt-4 */}
      <div className="flex items-center gap-2 mt-4">
        {task.cronExpression ? (
          <label className="cursor-pointer">
            <OfficialSwitch
              aria-label={text.enableSchedule}
              checked={enabled}
              onCheckedChange={() => onToggle()}
            />
          </label>
        ) : null}
        <StatusBadge enabled={enabled} task={task} text={text} />
        {nextRunLabel ? <span className="text-text-400 text-sm">{nextRunLabel}</span> : null}
      </div>
    </div>
  );
}

export function DetailMetaColumn({
  linkedSpace,
  onClearChromePermissions,
  onEdit,
  onOpenSpace,
  onRemoveApprovedPermission,
  onUnlinkSpace,
  spacesInitialized,
  task,
  text,
}: {
  linkedSpace: LinkedSpaceInfo | null;
  /** Residual rKt q → jT.clearChromePermissions(taskId). */
  onClearChromePermissions?: () => void;
  onEdit: () => void;
  onOpenSpace?: (spaceId: string) => void;
  /** Residual rKt F/w → jT.removeApprovedPermission(taskId, toolName). */
  onRemoveApprovedPermission?: (toolName: string) => void;
  onUnlinkSpace?: () => void;
  spacesInitialized: boolean;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  const repeatLabel =
    task.fireAt || task.cronExpression ? localizedScheduleLabel(task, text) : text.manualOnly;
  // Residual O = void 0!==w||void 0!==k — section mounts when permission mutators exist.
  // Product always surfaces empty-state copy so users know approvals land here.
  const showAlwaysAllowed = true;
  return (
    <div
      className="flex flex-col gap-8 min-w-0 order-1 lg:order-2"
      data-official-source="index-BELzQL5P.js:rKt meta column"
    >
      <section>
        <h2 className="font-base text-text-500 mb-3">{text.instructions}</h2>
        {task.prompt ? (
          <div className="font-claude-response-small text-text-300 whitespace-pre-wrap break-words">
            {task.prompt}
          </div>
        ) : (
          <p className="text-sm text-text-400 italic">{text.noPrompt}</p>
        )}
      </section>

      {task.spaceId && spacesInitialized ? (
        <section>
          <h2 className="font-base text-text-500 mb-2">{text.project}</h2>
          {linkedSpace ? (
            <button
              className="text-sm text-brand-100 hover:underline text-left"
              onClick={() => onOpenSpace?.(linkedSpace.id)}
              type="button"
            >
              {linkedSpace.name}
            </button>
          ) : (
            <div className="text-sm text-text-400">
              <p className="italic mb-2">{text.projectMissing}</p>
              {onUnlinkSpace ? (
                <OfficialButton onClick={onUnlinkSpace} size="sm" variant="secondary">
                  {text.unlink}
                </OfficialButton>
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      {task.cwd ? (
        <section>
          <h2 className="font-base text-text-500 mb-2">{text.folder}</h2>
          <div className="flex items-center gap-2 text-sm text-text-300">
            <Icon className="text-text-400 flex-shrink-0" name="Folder1" size="s" />
            <span className="truncate" title={task.cwd}>
              {basename(task.cwd) ?? task.cwd}
            </span>
          </div>
        </section>
      ) : null}

      <FoldersSection
        linkedSpace={linkedSpace}
        onOpenSpace={onOpenSpace}
        task={task}
        text={text}
      />

      <section>
        <h2 className="font-base text-text-500 mb-3">
          {task.fireAt ? text.runs : text.repeats}
        </h2>
        <span className="text-sm text-text-100">{repeatLabel}</span>
      </section>

      {showAlwaysAllowed ? (
        <AlwaysAllowedSection
          onClearChromePermissions={onClearChromePermissions}
          onEdit={onEdit}
          onRemoveApprovedPermission={onRemoveApprovedPermission}
          task={task}
          text={text}
        />
      ) : null}
    </div>
  );
}

export function DetailHistoryColumn({
  onOpenRun,
  runs,
  runsLoading,
  task,
  text,
}: {
  onOpenRun: (session: SessionSummary) => void;
  runs: SessionSummary[];
  runsLoading: boolean;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  // Residual rKt: A=useState(100); R.slice(0,A); Show more +=100
  const [visibleCount, setVisibleCount] = useState(100);
  const items = historyItems(runs, task.missedRuns);
  if (runsLoading) {
    return (
      <div className="flex flex-col gap-8 min-w-0 order-2 lg:order-1">
        <p className="text-sm text-text-400">{text.inProgress}</p>
      </div>
    );
  }
  // Residual rKt: History section only rendered when R.length > 0
  if (items.length === 0) {
    return <div className="flex flex-col gap-8 min-w-0 order-2 lg:order-1" />;
  }
  const visible = items.slice(0, visibleCount);
  return (
    <div
      className="flex flex-col gap-8 min-w-0 order-2 lg:order-1"
      data-official-source="index-BELzQL5P.js:rKt history"
    >
      <section>
        <h2 className="font-base text-text-500">{text.history}</h2>
        <ul>
          {visible.map((item) =>
            item.type === "session" ? (
              <HistorySessionRow
                key={item.session.id}
                onOpenRun={onOpenRun}
                run={item.session}
                text={text}
              />
            ) : (
              <HistoryMissedRow
                key={`missed-${item.time.getTime()}`}
                reason={item.reason}
                text={text}
                time={item.time}
              />
            ),
          )}
        </ul>
        {items.length > visibleCount ? (
          <OfficialButton
            className="w-full mt-2"
            onClick={() => setVisibleCount((current) => current + 100)}
            variant="secondary"
          >
            {text.showMore}
          </OfficialButton>
        ) : null}
      </section>
    </div>
  );
}

function FoldersSection({
  linkedSpace,
  onOpenSpace,
  task,
  text,
}: {
  linkedSpace: LinkedSpaceInfo | null;
  onOpenSpace?: (spaceId: string) => void;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  // Residual iKt: taskFolders = userSelectedFolders, space folders merged, from-project qc link
  const taskFolders = task.userSelectedFolders ?? [];
  const spaceFolders = linkedSpace?.folders ?? [];
  const all = [...new Set([...taskFolders, ...spaceFolders])];
  const spaceSet = new Set(spaceFolders);
  if (all.length === 0) return null;
  return (
    <section data-official-source="index-BELzQL5P.js:iKt">
      <h2 className="font-base text-text-500 mb-2">{text.folders}</h2>
      <div className="flex flex-col gap-1">
        {all.map((folderPath) => (
          <div className="flex items-center gap-2 text-sm text-text-300" key={folderPath}>
            <Icon className="text-text-400 flex-shrink-0" name="Folder1" size="s" />
            <span className="truncate" title={folderPath}>
              {basename(folderPath) ?? folderPath}
            </span>
            {spaceSet.has(folderPath) && linkedSpace ? (
              <button
                className="text-xs text-text-500 hover:text-brand-100 flex-shrink-0 transition-colors"
                onClick={() => onOpenSpace?.(linkedSpace.id)}
                type="button"
              >
                {formatScheduledTemplate(text.fromProject, { spaceName: linkedSpace.name })}
              </button>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function AlwaysAllowedSection({
  onClearChromePermissions,
  onEdit,
  onRemoveApprovedPermission,
  task,
  text,
}: {
  onClearChromePermissions?: () => void;
  onEdit: () => void;
  onRemoveApprovedPermission?: (toolName: string) => void;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  const unsupervised = isUnsupervisedMode(task.permissionMode);
  const approvals = task.approvedPermissions ?? [];
  const hasBrowser = Boolean(task.chromePermissionMode);
  const hasAny = approvals.length > 0 || hasBrowser;
  // Residual: remove buttons only when mutators exist (w / k).
  const canRemoveTool = typeof onRemoveApprovedPermission === "function";
  const canClearChrome = typeof onClearChromePermissions === "function";
  return (
    <section data-official-source="index-BELzQL5P.js:rKt always allowed">
      <h2 className="flex items-center gap-1.5 font-base text-text-500 mb-3">
        <span>{text.alwaysAllowed}</span>
      </h2>
      {unsupervised ? (
        <button
          className="w-full flex items-center gap-2.5 px-3 py-2 bg-bg-200 hover:bg-bg-300 rounded-lg text-left transition-colors"
          onClick={onEdit}
          type="button"
        >
          <Icon className="text-text-400 flex-shrink-0" name="WarningShield" size="s" />
          <span className="text-sm font-medium text-text-200">{text.unsupervised}</span>
        </button>
      ) : hasAny ? (
        <div className="bg-bg-200 rounded-lg divide-y divide-border-300">
          {hasBrowser ? (
            <div className="flex items-center justify-between px-3 py-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className="text-text-400 flex-shrink-0" name="Globe" size="s" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium text-text-200 flex-shrink-0">
                      {text.browser}
                    </span>
                    <span className="text-sm text-text-400 truncate">
                      {task.chromePermissionMode === "SkipAllPermissionChecks" ||
                      task.chromePermissionMode === "skip_all_permission_checks"
                        ? text.allWebsites
                        : formatWebsiteCount(text.websiteCount, task.chromeAllowedDomains?.length ?? 0)}
                    </span>
                  </div>
                  {task.chromePermissionMode === "follow_a_plan" &&
                  (task.chromeAllowedDomains?.length ?? 0) > 0 ? (
                    <p className="text-xs text-text-400 font-mono truncate">
                      {task.chromeAllowedDomains!.join(", ")}
                    </p>
                  ) : null}
                </div>
              </div>
              {canClearChrome ? (
                <div className="ml-2 flex-shrink-0">
                  <OfficialTooltip side="top" tooltipContent={text.removeApproval}>
                    <OfficialButton
                      aria-label={text.removeApproval}
                      className="p-1 !min-w-0 [--button-text:hsl(var(--text-400))]"
                      onClick={() => onClearChromePermissions?.()}
                      size="icon_fit"
                      type="button"
                      variant="ghost"
                    >
                      <Icon name="XCrossCloseMedium" size="s" />
                    </OfficialButton>
                  </OfficialTooltip>
                </div>
              ) : null}
            </div>
          ) : null}
          {approvals.map((approval) => (
            <div className="flex items-center justify-between px-3 py-2" key={approval.toolName}>
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-sm text-text-400 truncate">
                  {displayToolName(approval.toolName)}
                </span>
              </div>
              {canRemoveTool ? (
                <div className="ml-2 flex-shrink-0">
                  <OfficialTooltip side="top" tooltipContent={text.removeApproval}>
                    <OfficialButton
                      aria-label={text.removeApproval}
                      className="p-1 !min-w-0 [--button-text:hsl(var(--text-400))]"
                      onClick={() => onRemoveApprovedPermission?.(approval.toolName)}
                      size="icon_fit"
                      type="button"
                      variant="ghost"
                    >
                      <Icon name="XCrossCloseMedium" size="s" />
                    </OfficialButton>
                  </OfficialTooltip>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-text-400">{text.alwaysAllowedEmpty}</p>
      )}
    </section>
  );
}

function StatusBadge({
  enabled,
  task,
  text,
}: {
  enabled: boolean;
  task: ScheduledTaskSummary;
  text: ScheduledDetailText;
}) {
  // Residual aKt: enabled → 进行中 success pill; else completed(fireAt+lastRun) Ran / Paused
  if (enabled) {
    return (
      <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-xs font-medium border-0.5 border-success-000/40 text-success-000 bg-success-900">
        <Icon className="text-success-000" name="CheckCircle" size="s" />
        {text.active}
      </span>
    );
  }
  const completed = Boolean(task.fireAt && task.lastRunAt);
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md text-xs font-medium border-0.5 border-border-300 text-text-400 bg-bg-200">
      {completed ? (
        <Icon name="CheckCircle" size="s" />
      ) : (
        <Icon name="Pause" size="s" />
      )}
      {completed ? text.ran : text.paused}
    </span>
  );
}

function HistorySessionRow({
  onOpenRun,
  run,
  text,
}: {
  onOpenRun: (session: SessionSummary) => void;
  run: SessionSummary;
  text: ScheduledDetailText;
}) {
  return (
    <li className="border-b-0.5 border-border-300 last:border-b-0 hover:border-transparent transition-colors">
      <button
        className="flex w-full items-center justify-between py-3 px-2 -mx-2 rounded-lg hover:bg-bg-200 transition-colors text-left"
        onClick={() => onOpenRun(run)}
        type="button"
      >
        <span className="text-sm text-text-100">
          {run.createdAtMs ? formatRelativeTime(new Date(run.createdAtMs)) : run.title ?? ""}
        </span>
        {run.showRetryButton || run.connectionState === "error" ? (
          <span className="flex items-center gap-1 text-xs text-text-400">
            <Icon name="XCrossCloseMedium" size="s" />
            {text.error}
          </span>
        ) : run.isRunning ? (
          <span className="flex items-center gap-1 text-xs text-text-400">
            <Icon name="Spinner" size="s" />
            {text.running}
          </span>
        ) : null}
      </button>
    </li>
  );
}

function HistoryMissedRow({
  reason,
  text,
  time,
}: {
  reason?: string;
  text: ScheduledDetailText;
  time: Date;
}) {
  const tip = missedRunReasonLabel(reason, text);
  return (
    <li className="border-b-0.5 border-border-300 last:border-b-0">
      <div className="flex items-center justify-between py-3 px-2 -mx-2">
        <span className="text-sm text-text-100">{formatRelativeTime(time)}</span>
        <OfficialTooltip tooltipContent={tip}>
          <span className="flex items-center gap-1 text-xs text-text-400" tabIndex={0}>
            <Icon name="Clock" size="s" />
            {text.skipped}
          </span>
        </OfficialTooltip>
      </div>
    </li>
  );
}

type HistoryItem =
  | { type: "session"; session: SessionSummary; time: number }
  | { type: "missed"; time: Date; reason?: string };

function historyItems(
  runs: SessionSummary[],
  missedRuns?: ScheduledTaskSummary["missedRuns"],
): HistoryItem[] {
  const items: HistoryItem[] = runs.map((session) => ({
    type: "session",
    session,
    time: session.createdAtMs ?? session.updatedAtMs ?? 0,
  }));
  for (const missed of missedRuns ?? []) {
    const time = new Date(typeof missed === "string" ? missed : missed.time);
    if (!Number.isNaN(time.getTime())) {
      items.push({
        type: "missed",
        time,
        reason: typeof missed === "string" ? undefined : missed.reason,
      });
    }
  }
  return items.sort((left, right) => historyTime(right) - historyTime(left));
}

function historyTime(item: HistoryItem) {
  return item.type === "session" ? item.time : item.time.getTime();
}

export function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}

function detailNextRunLabel(task: ScheduledTaskSummary, text: ScheduledDetailText) {
  if (task.fireAt && !task.lastRunAt) {
    return formatScheduledTemplate(text.runsAt, { date: formatDateTime(task.fireAt) });
  }
  if (task.nextRunAt) {
    return formatScheduledTemplate(text.nextRun, { date: formatDateTime(task.nextRunAt) });
  }
  return null;
}

function localizedScheduleLabel(task: ScheduledTaskSummary, text: ScheduledDetailText) {
  const cron = task.cronExpression;
  if (task.fireAt) return text.manual;
  if (!cron) return text.manualOnly;
  const [minute, hour, , , day] = cron.split(" ");
  if (hour === "*") return text.hourly;
  if (day === "1-5") return `${text.weekdays} ${formatTime(Number(hour), Number(minute))}`;
  if (day && day !== "*") return `${text.weekly} ${formatTime(Number(hour), Number(minute))}`;
  if (hour !== undefined && minute !== undefined) {
    return `${text.daily} ${formatTime(Number(hour), Number(minute))}`;
  }
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

function isUnsupervisedMode(mode?: ScheduledTaskSummary["permissionMode"]) {
  // Residual oKt / DZe: auto | bypassPermissions
  return mode === "auto" || mode === "bypassPermissions";
}

function missedRunReasonLabel(reason: string | undefined, text: ScheduledDetailText) {
  if (reason === "PerTaskLimit" || reason === "per_task_limit") return text.skippedPerTask;
  if (reason === "GlobalLimit" || reason === "global_limit") return text.skippedGlobal;
  return text.skippedAsleep;
}
