/**
 * Official create/edit scheduled task modal (index-BELzQL5P function uYt).
 * Tm modalSize xl hasCloseButton autoCloseOnFocusOut false;
 * body grid gap-4 mt-4 + compact grid-cols-6 when (max-height: 680px) and (min-width: 900px);
 * name/description vIe; prompt shell + aYt; toolbar Lkt/Kwt/txe; frequency txe; Yfe exact time; Dc footer.
 */
import { useEffect, useMemo, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialCheckbox } from "../../shared/OfficialCheckbox";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialSelect } from "../../shared/OfficialSelect";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { ScheduledPromptEditor } from "./ScheduledPromptEditor";
import {
  formatScheduledCreateTemplate,
  SCHEDULED_CREATE_MESSAGES,
  type ScheduledCreateText,
} from "./scheduledCreateMessages";
import type { ScheduledTaskSummary } from "../../../adapters/desktopBridge";
import {
  cronForSchedule,
  formatTime,
  normalizeTaskId,
  scheduleFromCron,
  taskNameError,
  WEEKDAY_LABELS,
  type ScheduleFrequency,
} from "./scheduleUtils";

type CreateModalProps = {
  existingNames: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  /** Residual uYt editingTask — when set, modal seeds fields and calls update. */
  editingTask?: ScheduledTaskSummary | null;
  /** Residual ms / uYt spaceId when creating from project settings Qa. */
  spaceId?: string;
  /**
   * Residual uYt `_` = zSe(spaceId)?.folders.map(path).
   * Shown as read-only "from project" rows; also Lkt excludeFolders.
   */
  spaceFolderPaths?: string[];
};

/** Official uYt compact media: zb("(max-height: 680px) and (min-width: 900px)") */
function useCompactCreateLayout() {
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(max-height: 680px) and (min-width: 900px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener?.("change", sync);
    return () => media.removeEventListener?.("change", sync);
  }, []);
  return compact;
}

function folderBasename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}

/**
 * Official Lkt → Ikt collapsed/no-recent path for scheduled create:
 * Dc ghost default, !rounded-xl, Folder + truncate label + optional chevron when menu available.
 * Here we use browseFolder/getDirectoryPath (Ikt onBrowse) as the primary local action.
 */
function ScheduledTaskFolderControl({
  excludeFolders = [],
  folders,
  onFoldersChange,
  selectFoldersLabel,
  workInProjectLabel,
}: {
  /** Residual Lkt excludeFolders: frecent list hides project folders already granted via space. */
  excludeFolders?: string[];
  folders: string[];
  onFoldersChange: (folders: string[]) => void;
  selectFoldersLabel: string;
  workInProjectLabel: string;
}) {
  const exclude = useMemo(() => new Set(excludeFolders), [excludeFolders]);
  const label = folders[0] ? folderBasename(folders[0]) : workInProjectLabel;
  const chooseFolder = async () => {
    // Residual Lkt/Ikt onBrowse: pick extra folders; do not auto-fallback to workspace.cwd
    // (that was seeding non-project dirs when creating from space Qa).
    const paths =
      (await desktopBridge.FileSystem.browseFolder?.(selectFoldersLabel).catch(() => null)) ??
      (await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null));
    const picked = Array.isArray(paths) ? paths[0] : typeof paths === "string" ? paths : null;
    if (!picked) return;
    if (exclude.has(picked)) return;
    onFoldersChange([picked]);
  };

  // Official Ikt non-collapsed trigger: Dc ghost default + !rounded-xl + Folder + truncate
  return (
    <OfficialButton
      aria-label={label}
      className="!min-w-0 w-full flex items-center justify-between !pl-3 !pr-2 !rounded-xl bg-transparent hover:!bg-bg-200 transition-colors text-text-300 active:!scale-100"
      data-official-source="index-BELzQL5P.js:Lkt/Ikt"
      onClick={() => void chooseFolder()}
      size="default"
      title={folders[0] ?? undefined}
      variant="ghost"
    >
      <span className="flex items-center gap-1.5 min-w-0">
        <Icon name="Folder1" size="sm" />
        <span className="truncate w-full">{label}</span>
      </span>
    </OfficialButton>
  );
}

export function ScheduledTaskCreateModal({
  editingTask = null,
  existingNames,
  isOpen,
  onClose,
  onCreated,
  spaceFolderPaths = [],
  spaceId,
}: CreateModalProps) {
  const text = useI18nText(SCHEDULED_CREATE_MESSAGES) as ScheduledCreateText;
  const compact = useCompactCreateLayout();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("once");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  // Residual uYt `q`: extra userSelectedFolders only (not project folders — those come from space via `_`).
  const [folders, setFolders] = useState<string[]>([]);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [disableJitter, setDisableJitter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  // Official cYt().showScheduledTaskExactTimeOption — no yukon flag bridge yet; keep false (jitter note path).
  const showExactTimeOption = false;
  const isEditing = Boolean(editingTask);
  // Residual C = spaceId ?? editing.spaceId; w = !!C; _ = space folders.
  const effectiveSpaceId = spaceId || editingTask?.spaceId;
  const projectFolders = useMemo(
    () => spaceFolderPaths.filter((path) => typeof path === "string" && path.length > 0),
    [spaceFolderPaths],
  );
  const linkedToSpace = Boolean(effectiveSpaceId && effectiveSpaceId.length > 0);

  const frequencyOptions = useMemo(
    () => [
      { value: "once" as const, label: text.manual },
      { value: "hourly" as const, label: text.hourly },
      { value: "daily" as const, label: text.daily },
      { value: "weekdays" as const, label: text.weekdays },
      { value: "weekly" as const, label: text.weekly },
    ],
    [text.daily, text.hourly, text.manual, text.weekdays, text.weekly],
  );

  useEffect(() => {
    if (!isOpen) return;
    if (editingTask) {
      // Residual uYt edit seed from r
      setName(editingTask.title || editingTask.id);
      setDescription(editingTask.description ?? "");
      setPrompt(editingTask.prompt ?? "");
      if (editingTask.fireAt) {
        setFrequency("fireAt");
        setHour(9);
        setMinute(0);
        setDayOfWeek(1);
      } else {
        const parsed = scheduleFromCron(editingTask.cronExpression);
        setFrequency(parsed.frequency);
        setHour(parsed.hour);
        setMinute(parsed.minute);
        setDayOfWeek(parsed.dayOfWeek);
      }
      setFolders(editingTask.userSelectedFolders ?? (editingTask.cwd ? [editingTask.cwd] : []));
      setModel(editingTask.model);
      setDisableJitter(false);
    } else {
      setName("");
      setDescription("");
      setPrompt("");
      setFrequency("once");
      setHour(9);
      setMinute(0);
      setDayOfWeek(1);
      // Residual create branch: B([]) — extra folders start empty; project folders shown via `_` only.
      setFolders([]);
      setModel(undefined);
      setDisableJitter(false);
    }
    setIsSaving(false);
    setError("");
  }, [editingTask, isOpen]);

  const normalizedName = normalizeTaskId(name);
  const nameError = useMemo(
    () =>
      taskNameError(name, existingNames, {
        nameMustContainLetter: text.nameMustContainLetter,
        nameReserved: text.nameReserved,
        nameExists: text.nameExists,
      }),
    [existingNames, name, text.nameExists, text.nameMustContainLetter, text.nameReserved],
  );
  // Official ce: re && description (local) && prompt && !ie
  const canSave =
    normalizedName.length > 0 &&
    description.trim().length > 0 &&
    prompt.trim().length > 0 &&
    !nameError &&
    !isSaving;

  const save = async () => {
    if (!canSave) return;
    setIsSaving(true);
    setError("");
    try {
      const cronExpression = cronForSchedule(frequency, hour, minute, dayOfWeek);
      if (isEditing && editingTask) {
        // Residual uYt update path: updateScheduledTask with bag fields
        const updated = await desktopBridge.CoworkScheduledTasks.update?.(editingTask.id, {
          name: normalizedName,
          title: normalizedName,
          description: description.trim(),
          prompt: prompt.trim(),
          cwd: folders[0],
          userSelectedFolders: folders.length > 0 ? folders : [],
          cronExpression: cronExpression ?? null,
          model,
          spaceId: effectiveSpaceId && effectiveSpaceId.length > 0 ? effectiveSpaceId : undefined,
        });
        if (!updated && updated !== null) {
          // Some hosts return void on success
        }
        onCreated(editingTask.id);
        onClose();
        return;
      }
      // Official uYt create payload: name, prompt, description, cronExpression, model,
      // userSelectedFolders, spaceId, disableJitter, permissionMode?, chromePermissionMode?
      const created = await desktopBridge.CoworkScheduledTasks.create?.({
        name: normalizedName,
        description: description.trim(),
        prompt: prompt.trim(),
        cwd: folders[0],
        userSelectedFolders: folders.length > 0 ? folders : undefined,
        cronExpression,
        model,
        disableJitter,
        permissionMode: "default",
        spaceId: effectiveSpaceId && effectiveSpaceId.length > 0 ? effectiveSpaceId : undefined,
      });
      if (!created) {
        setError(text.creationUnavailable);
        return;
      }
      onCreated(created.id);
      onClose();
    } catch {
      setError(isEditing ? text.editFailed : text.createFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const showTimeInput = frequency !== "once" && frequency !== "hourly" && frequency !== "custom" && frequency !== "fireAt";
  const showJitterNote = !showExactTimeOption && frequency !== "once" && frequency !== "fireAt";
  const showExactTime = showExactTimeOption && frequency !== "once" && frequency !== "fireAt";

  return (
    <OfficialModal
      autoCloseOnFocusOut={false}
      hasCloseButton
      isOpen={isOpen}
      modalSize="xl"
      onClose={onClose}
      title={isEditing ? text.editTitle : text.createTitle}
    >
      <div
        className={["grid gap-4 mt-4", compact ? "grid-cols-6 gap-x-6" : "grid-cols-1"].join(" ")}
        data-official-source="index-BELzQL5P.js:uYt"
      >
        <div className={["min-w-0", compact ? "col-span-3" : ""].filter(Boolean).join(" ")}>
          <OfficialTextInput
            className="w-full"
            error={Boolean(nameError)}
            id="scheduled-task-name"
            label={
              <>
                {text.name}
                <span aria-hidden="true" className="text-danger-000 ml-1">
                  *
                </span>
              </>
            }
            onValueChange={setName}
            placeholder={text.namePlaceholder}
            value={name}
          />
          {nameError ? (
            <p className="text-danger-000 text-sm mt-1">{nameError}</p>
          ) : normalizedName && normalizedName !== name.trim() ? (
            <p className="text-text-500 text-sm mt-1">
              {formatScheduledCreateTemplate(text.willBeSavedAs, { name: normalizedName })}
            </p>
          ) : null}
        </div>

        <div className={["min-w-0", compact ? "col-span-3" : ""].filter(Boolean).join(" ")}>
          <OfficialTextInput
            className="w-full"
            id="scheduled-task-description"
            label={
              <>
                {text.description}
                <span aria-hidden="true" className="text-danger-000 ml-1">
                  *
                </span>
              </>
            }
            onValueChange={setDescription}
            placeholder={text.descriptionPlaceholder}
            value={description}
          />
        </div>

        <div className={["min-w-0", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
          <div
            className="relative z-10 rounded-[20px] border-0.5 border-border-300 bg-bg-000 focus-within:shadow-sm transition-all"
            data-official-source="index-BELzQL5P.js:uYt prompt shell"
          >
            {/* Official aYt CodeTipTapEditor (index-BELzQL5P aYt); remount on open like key "new" */}
            {isOpen ? (
              <ScheduledPromptEditor
                ariaLabel={text.prompt}
                compact={compact}
                onUpdate={setPrompt}
                placeholder={text.promptPlaceholder}
                resetKey={editingTask?.id ?? "new"}
                value={prompt}
              />
            ) : null}
          </div>
          <div
            className="relative z-0 -mt-5 rounded-b-[20px] border border-transparent bg-always-black/[0.01] shadow-[inset_0_0_0_0.5px_hsl(var(--bg-000)/0.8),0_0_0_0.5px_hsl(var(--border-300)/0.18)] backdrop-blur-[2px]"
            data-official-source="index-BELzQL5P.js:uYt prompt toolbar"
          >
            <div className="flex items-center gap-1 px-2 pb-2 pt-7">
              <div className="min-w-0 max-w-[220px]">
                <ScheduledTaskFolderControl
                  excludeFolders={projectFolders}
                  folders={folders}
                  onFoldersChange={setFolders}
                  selectFoldersLabel={text.selectFolders}
                  workInProjectLabel={text.workInProject}
                />
              </div>
              <div className="ml-auto">
                <label className="sr-only" htmlFor="scheduled-task-model">
                  {text.model}
                </label>
                <OfficialSelect
                  className="!w-auto !rounded-xl text-sm !text-text-300 hover:!bg-bg-200"
                  displayValue={model ? model : text.defaultModel}
                  id="scheduled-task-model"
                  onValueChange={(next) => setModel(next === "default" ? undefined : next)}
                  options={[{ value: "default", label: text.defaultModel }]}
                  value={model ?? "default"}
                  variant="ghost"
                />
              </div>
            </div>
          </div>
          {/* Residual uYt: w && _.length>0 → project folder chips with "from project" (not in q). */}
          {linkedToSpace && projectFolders.length > 0 ? (
            <div className="mt-2 flex flex-col gap-1" data-official-source="index-BELzQL5P.js:uYt from project">
              {projectFolders.map((folderPath) => (
                <div
                  className="flex items-center gap-2 rounded-lg border border-border-300 bg-bg-100 px-3 py-2"
                  key={folderPath}
                >
                  <Icon className="flex-shrink-0 text-text-400" name="Folder1" size="sm" />
                  <span className="min-w-0 flex-1 truncate text-sm text-text-300" title={folderPath}>
                    {folderBasename(folderPath)}
                  </span>
                  <span className="flex-shrink-0 text-xs text-text-500">{text.fromProject}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div className={["min-w-0", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
          <span className="text-text-300 block text-sm font-medium mb-1">{text.frequency}</span>
          <div className="flex flex-wrap items-end gap-3">
            <OfficialSelect
              className="!w-auto min-w-[140px]"
              onValueChange={(next) => setFrequency(next as ScheduleFrequency)}
              options={frequencyOptions}
              value={frequency}
            />
            {showTimeInput ? (
              <input
                aria-label={text.time}
                className="h-9 rounded-lg border border-border-300 bg-bg-000 px-2.5 text-sm text-text-100 focus:outline-none focus:ring-1 focus:ring-brand-100 [&::-webkit-calendar-picker-indicator]:hidden"
                onChange={(event) => {
                  const [nextHour, nextMinute] = event.target.value.split(":").map(Number);
                  if (Number.isFinite(nextHour)) setHour(nextHour);
                  if (Number.isFinite(nextMinute)) setMinute(nextMinute);
                }}
                type="time"
                value={formatTime(hour, minute)}
              />
            ) : null}
            {frequency === "weekly" ? (
              <OfficialSelect
                className="!w-auto min-w-[140px]"
                onValueChange={(next) => setDayOfWeek(Number(next))}
                options={WEEKDAY_LABELS.map((label, index) => ({
                  value: String(index),
                  label,
                }))}
                value={String(dayOfWeek)}
              />
            ) : null}
          </div>
          {showJitterNote ? (
            <p className="text-text-500 text-xs mt-1">{text.staggerNote}</p>
          ) : null}
        </div>

        {showExactTime ? (
          <div className={["min-w-0", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
            <OfficialCheckbox
              checked={disableJitter}
              label={text.runAtExactTime}
              labelClassName="text-sm"
              onCheckedChange={setDisableJitter}
            />
            <p className="text-text-500 text-xs mt-1 ml-7">{text.exactTimeHint}</p>
          </div>
        ) : null}

        {error ? <p className="text-danger-000 text-sm">{error}</p> : null}

        <div className={["flex justify-end gap-2 mt-2", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
          <OfficialButton onClick={onClose} variant="secondary">
            {text.cancel}
          </OfficialButton>
          <OfficialButton disabled={!canSave} loading={isSaving} onClick={() => void save()} variant="primary">
            {text.save}
          </OfficialButton>
        </div>
      </div>
    </OfficialModal>
  );
}
