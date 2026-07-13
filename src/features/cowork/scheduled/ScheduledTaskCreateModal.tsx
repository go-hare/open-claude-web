/**
 * Official create/edit scheduled task modal (index-BELzQL5P function uYt).
 * Tm modalSize xl hasCloseButton autoCloseOnFocusOut false;
 * body grid gap-4 mt-4 + compact grid-cols-6 when (max-height: 680px) and (min-width: 900px);
 * name/description vIe; prompt shell + aYt; toolbar Lkt/Kwt/txe; frequency txe; Yfe exact time; Dc footer.
 */
import { useEffect, useMemo, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialCheckbox } from "../../shared/OfficialCheckbox";
import { OfficialModal } from "../../shared/OfficialModal";
import { OfficialSelect } from "../../shared/OfficialSelect";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { ScheduledPromptEditor } from "./ScheduledPromptEditor";
import {
  cronForSchedule,
  formatTime,
  normalizeTaskId,
  taskNameError,
  WEEKDAY_LABELS,
  type ScheduleFrequency,
} from "./scheduleUtils";

type CreateModalProps = {
  existingNames: Set<string>;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
};

const frequencyOptions: Array<{ label: string; value: ScheduleFrequency }> = [
  { value: "once", label: "Manual" },
  { value: "hourly", label: "Hourly" },
  { value: "daily", label: "Daily" },
  { value: "weekdays", label: "Weekdays" },
  { value: "weekly", label: "Weekly" },
];

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
  folders,
  onFoldersChange,
}: {
  folders: string[];
  onFoldersChange: (folders: string[]) => void;
}) {
  const label = folders[0] ? folderBasename(folders[0]) : "Work in a project";
  const chooseFolder = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null);
    if (paths?.[0]) {
      onFoldersChange([paths[0]]);
      return;
    }
    const workspace = await desktopBridge.Preferences.getWorkspaceContext().catch(() => null);
    if (workspace?.cwd) onFoldersChange([workspace.cwd]);
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

export function ScheduledTaskCreateModal({ existingNames, isOpen, onClose, onCreated }: CreateModalProps) {
  const compact = useCompactCreateLayout();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("once");
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [folders, setFolders] = useState<string[]>([]);
  const [model, setModel] = useState<string | undefined>(undefined);
  const [disableJitter, setDisableJitter] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  // Official cYt().showScheduledTaskExactTimeOption — no yukon flag bridge yet; keep false (jitter note path).
  const showExactTimeOption = false;

  useEffect(() => {
    if (!isOpen) return;
    setName("");
    setDescription("");
    setPrompt("");
    setFrequency("once");
    setHour(9);
    setMinute(0);
    setDayOfWeek(1);
    setFolders([]);
    setModel(undefined);
    setDisableJitter(false);
    setIsSaving(false);
    setError("");
  }, [isOpen]);

  const normalizedName = normalizeTaskId(name);
  const nameError = useMemo(() => taskNameError(name, existingNames), [existingNames, name]);
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
      // Official uYt create payload: name, prompt, description, cronExpression, model,
      // userSelectedFolders, spaceId, disableJitter, permissionMode?, chromePermissionMode?
      const created = await desktopBridge.CoworkScheduledTasks.create?.({
        name: normalizedName,
        description: description.trim(),
        prompt: prompt.trim(),
        cwd: folders[0],
        userSelectedFolders: folders.length > 0 ? folders : undefined,
        cronExpression: cronForSchedule(frequency, hour, minute, dayOfWeek),
        model,
        disableJitter,
        permissionMode: "default",
      });
      if (!created) {
        setError("Scheduled task creation isn't available. Restart the desktop app to enable this feature.");
        return;
      }
      onCreated(created.id);
      onClose();
    } catch {
      setError("Failed to create scheduled task. You can try again.");
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
      title="Create scheduled task"
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
                名称
                <span aria-hidden="true" className="text-danger-000 ml-1">
                  *
                </span>
              </>
            }
            onValueChange={setName}
            placeholder="daily-briefing"
            value={name}
          />
          {nameError ? (
            <p className="text-danger-000 text-sm mt-1">{nameError}</p>
          ) : normalizedName && normalizedName !== name.trim() ? (
            <p className="text-text-500 text-sm mt-1">Will be saved as &quot;{normalizedName}&quot;</p>
          ) : null}
        </div>

        <div className={["min-w-0", compact ? "col-span-3" : ""].filter(Boolean).join(" ")}>
          <OfficialTextInput
            className="w-full"
            id="scheduled-task-description"
            label={
              <>
                Description
                <span aria-hidden="true" className="text-danger-000 ml-1">
                  *
                </span>
              </>
            }
            onValueChange={setDescription}
            placeholder="Summarize my calendar and inbox for the day"
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
                compact={compact}
                onUpdate={setPrompt}
                resetKey="new"
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
                <ScheduledTaskFolderControl folders={folders} onFoldersChange={setFolders} />
              </div>
              <div className="ml-auto">
                <label className="sr-only" htmlFor="scheduled-task-model">
                  Model
                </label>
                <OfficialSelect
                  className="!w-auto !rounded-xl text-sm !text-text-300 hover:!bg-bg-200"
                  displayValue={model ? model : "Default model"}
                  id="scheduled-task-model"
                  onValueChange={(next) => setModel(next === "default" ? undefined : next)}
                  options={[{ value: "default", label: "Default model" }]}
                  value={model ?? "default"}
                  variant="ghost"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={["min-w-0", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
          <span className="text-text-300 block text-sm font-medium mb-1">Frequency</span>
          <div className="flex flex-wrap items-end gap-3">
            <OfficialSelect
              className="!w-auto min-w-[140px]"
              onValueChange={(next) => setFrequency(next as ScheduleFrequency)}
              options={frequencyOptions}
              value={frequency}
            />
            {showTimeInput ? (
              <input
                aria-label="Time"
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
            <p className="text-text-500 text-xs mt-1">
              Scheduled tasks use a randomized delay of several minutes for server performance.
            </p>
          ) : null}
        </div>

        {showExactTime ? (
          <div className={["min-w-0", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
            <OfficialCheckbox
              checked={disableJitter}
              label="Run at exact time"
              labelClassName="text-sm"
              onCheckedChange={setDisableJitter}
            />
            <p className="text-text-500 text-xs mt-1 ml-7">
              By default, scheduled tasks use a randomized delay of several minutes for server performance.
            </p>
          </div>
        ) : null}

        {error ? <p className="text-danger-000 text-sm">{error}</p> : null}

        <div className={["flex justify-end gap-2 mt-2", compact ? "col-span-6" : ""].filter(Boolean).join(" ")}>
          <OfficialButton onClick={onClose} variant="secondary">
            Cancel
          </OfficialButton>
          <OfficialButton disabled={!canSave} loading={isSaving} onClick={() => void save()} variant="primary">
            Save
          </OfficialButton>
        </div>
      </div>
    </OfficialModal>
  );
}
