import { useMemo, useState, type FormEvent } from "react";
import { desktopBridge } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { RoutineHeader, ScheduledRouteShell, subtleButtonClass } from "./ScheduledPrimitives";
import { cronForSchedule, formatTime, normalizeTaskId, taskNameError, type ScheduleFrequency } from "./scheduleUtils";

type FormProps = {
  existingNames: Set<string>;
  onBack: () => void;
  onCreated: (id: string) => void;
};

type CreateTaskInput = {
  name: string;
  description: string;
  prompt: string;
  cwd: string;
  frequency: ScheduleFrequency;
  time: string;
  setError: (value: string) => void;
  setIsSaving: (value: boolean) => void;
  onCreated: (id: string) => void;
};

const frequencyLabels: Array<[ScheduleFrequency, string]> = [
  ["once", "Manual"],
  ["hourly", "Hourly"],
  ["daily", "Daily"],
  ["weekdays", "Weekdays"],
  ["weekly", "Weekly"],
];

export function ScheduledTaskForm({ existingNames, onBack, onCreated }: FormProps) {
  return (
    <ScheduledRouteShell>
      <div className="h-full min-w-0 flex flex-col pt-[8px] pl-[8px]">
        <RoutineHeader onBack={onBack} title="New local routine" />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[720px] mx-auto flex flex-col gap-[32px] px-p8 pt-[48px] pb-[32px]">
            <LocalRoutineForm existingNames={existingNames} onBack={onBack} onCreated={onCreated} />
          </div>
        </div>
      </div>
    </ScheduledRouteShell>
  );
}

function LocalRoutineForm({ existingNames, onBack, onCreated }: FormProps) {
  const form = useLocalRoutineForm(existingNames, onCreated);
  return (
    <form onSubmit={form.submit} className="flex flex-col gap-[28px]">
      <LocalAwakeBanner />
      <TextField label="名称" required value={form.name} error={form.nameError} onChange={form.setName} placeholder="daily-code-review" />
      <TextField label="Description" required value={form.description} onChange={form.setDescription} placeholder="Review yesterday's commits and flag anything concerning" />
      <InstructionsField form={form} />
      <ScheduleField frequency={form.frequency} setFrequency={form.setFrequency} time={form.time} setTime={form.setTime} />
      {form.error ? <p className="text-footnote text-danger-000">{form.error}</p> : null}
      <div className="flex justify-end gap-g4">
        <button type="button" onClick={onBack} disabled={form.isSaving} className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled busy:text-contained-busy pressed:text-contained-selected pressed:hover:text-contained-selected ring-focus h-base text-body rounded-base gap-g3 px-p6">Cancel</button>
        <button type="submit" disabled={!form.isValid || form.isSaving} className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary h-base text-body rounded-base gap-g3 px-p6">Create</button>
      </div>
    </form>
  );
}

function useLocalRoutineForm(existingNames: Set<string>, onCreated: (id: string) => void) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [cwd, setCwd] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("daily");
  const [time, setTime] = useState("09:00");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const nameError = useMemo(() => taskNameError(name, existingNames), [name, existingNames]);
  const isValid = normalizeTaskId(name).length > 0 && description.trim().length > 0 && prompt.trim().length > 0 && !!cwd && !nameError;
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!isValid || isSaving) return;
    await createTask({ name, description, prompt, cwd, frequency, time, setError, setIsSaving, onCreated });
  };
  return { name, setName, description, setDescription, prompt, setPrompt, cwd, setCwd, frequency, setFrequency, time, setTime, isSaving, error, nameError, isValid, submit };
}

async function createTask(input: CreateTaskInput) {
  input.setIsSaving(true);
  input.setError("");
  const [hour, minute] = input.time.split(":").map(Number);
  const created = await desktopBridge.CCDScheduledTasks.create?.({
    name: normalizeTaskId(input.name),
    description: input.description.trim(),
    prompt: input.prompt.trim(),
    cwd: input.cwd,
    cronExpression: cronForSchedule(input.frequency, hour, minute, 1),
    permissionMode: "default",
  });
  input.setIsSaving(false);
  if (created) input.onCreated(created.id);
  else input.setError("Scheduled task creation isn't available. Restart the desktop app to enable this feature.");
}

function TextField({ label, required, value, error, onChange, placeholder }: { label: string; required?: boolean; value: string; error?: string; placeholder: string; onChange: (value: string) => void }) {
  return (
    <label className="flex flex-col gap-g4">
      <span className="text-body text-t6">{label}{required ? <span className="text-danger-000"> *</span> : null}</span>
      <div className="rounded-r4 bg-fill-contained-default effect-contrast-stroke">
        <input type="text" value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="epitaxy-input w-full !bg-transparent !shadow-none" />
      </div>
      {error ? <span className="text-footnote text-danger-000">{error}</span> : null}
    </label>
  );
}

function InstructionsField({ form }: { form: ReturnType<typeof useLocalRoutineForm> }) {
  const chooseFolder = async () => {
    const workspace = await desktopBridge.Preferences.getWorkspaceContext();
    form.setCwd(workspace.cwd ?? "");
  };
  return (
    <div className="flex flex-col gap-g3">
      <span className="text-footnote text-t6">Instructions</span>
      <div className="flex flex-col rounded-r6 bg-fill-contained-default effect-contrast-stroke overflow-hidden">
        <textarea value={form.prompt} onChange={(event) => form.setPrompt(event.target.value)} placeholder="Look at the commits from the last 24 hours. Summarize what changed, call out any risky patterns or missing tests, and note anything worth following up on." rows={5} className="epitaxy-textarea w-full min-h-[120px] !bg-transparent !shadow-none" />
        <div className="flex items-center gap-g2 px-p5 pb-p3">
          <button type="button" className={subtleButtonClass}><Icon name="check" />询问权限</button>
          <div className="flex-1" />
          <button type="button" className={subtleButtonClass}>Default<Icon name="caretDown" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-g3 px-p5 py-p4 bg-t1">
          <button type="button" onClick={chooseFolder} className={subtleButtonClass}><Icon name="project" />{form.cwd || "选择文件夹"}</button>
          <div className="flex-1" />
          <button type="button" role="checkbox" aria-checked="false" className="group/cb inline-flex items-center border-0 outline-none hide-focus-ring ring-focus cursor-default text-footnote text-t6">Worktree</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleField({ frequency, setFrequency, time, setTime }: { frequency: ScheduleFrequency; setFrequency: (value: ScheduleFrequency) => void; time: string; setTime: (value: string) => void }) {
  return (
    <div className="flex flex-col gap-g4">
      <span className="text-body text-t6">Schedule</span>
      <div className="flex flex-col gap-g4">
        <div className="flex gap-g2 p-p1 rounded-r6 bg-t1 self-start">
          {frequencyLabels.map(([value, label]) => <button key={value} type="button" onClick={() => setFrequency(value)} className={`px-p4 py-p2 rounded-r4 text-footnote ${frequency === value ? "bg-t2 text-t9" : "text-t6 hover:text-t8 hover:bg-t2"}`}>{label}</button>)}
        </div>
        {frequency !== "once" ? <TimeRow time={time} setTime={setTime} /> : null}
        {frequency !== "once" ? <p className="text-footnote text-t5">Scheduled tasks use a randomized delay of several minutes for server performance.</p> : null}
      </div>
    </div>
  );
}

function TimeRow({ time, setTime }: { time: string; setTime: (value: string) => void }) {
  const [hour, minute] = time.split(":").map(Number);
  return (
    <div className="flex items-center gap-g4 text-body text-t7">
      <span>At</span>
      <input type="time" value={formatTime(hour, minute)} onChange={(event) => setTime(event.target.value)} className="epitaxy-input w-[140px]" />
    </div>
  );
}

function LocalAwakeBanner() {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p5 rounded-r6 bg-t1 text-body text-t7">
      <Icon name="check" />
      <span>Local routines only run while your computer is awake.</span>
    </div>
  );
}
