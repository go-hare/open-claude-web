import { useMemo, useState, type FormEvent } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { OfficialButton } from "../../epitaxy/OfficialEpitaxyComponents";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { RoutineHeader, ScheduledRouteShell, subtleButtonClass } from "./ScheduledPrimitives";
import { SCHEDULED_FORM_MESSAGES, type ScheduledFormText } from "./scheduledFormMessages";
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
  creationUnavailable: string;
};

const FREQUENCY_KEYS: Array<[ScheduleFrequency, keyof ScheduledFormText]> = [
  ["once", "manual"],
  ["hourly", "hourly"],
  ["daily", "daily"],
  ["weekdays", "weekdays"],
  ["weekly", "weekly"],
];

export function ScheduledTaskForm({ existingNames, onBack, onCreated }: FormProps) {
  const text = useI18nText(SCHEDULED_FORM_MESSAGES);
  return (
    <ScheduledRouteShell>
      <div className="h-full min-w-0 flex flex-col pt-[8px] pl-[8px]">
        <RoutineHeader onBack={onBack} title={text.createTitle} />
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="max-w-[720px] mx-auto flex flex-col gap-[32px] px-p8 pt-[48px] pb-[32px]">
            <LocalRoutineForm existingNames={existingNames} onBack={onBack} onCreated={onCreated} text={text} />
          </div>
        </div>
      </div>
    </ScheduledRouteShell>
  );
}

function LocalRoutineForm({ existingNames, onBack, onCreated, text }: FormProps & { text: ScheduledFormText }) {
  const form = useLocalRoutineForm(existingNames, onCreated, text.creationUnavailable);
  return (
    <form onSubmit={form.submit} className="flex flex-col gap-[28px]">
      <LocalAwakeBanner label={text.bannerLocalAwake} />
      <TextField label={text.name} required value={form.name} error={form.nameError} onChange={form.setName} placeholder={text.namePlaceholder} />
      <TextField label={text.description} required value={form.description} onChange={form.setDescription} placeholder={text.descriptionPlaceholder} />
      <InstructionsField form={form} text={text} />
      <ScheduleField frequency={form.frequency} setFrequency={form.setFrequency} time={form.time} setTime={form.setTime} text={text} />
      {form.error ? <p className="text-footnote text-danger-000">{form.error}</p> : null}
      {/* Official c024 footer: Button variant contained + primary with btn-squish fill layer (c87b). */}
      <div className="flex justify-end gap-g4">
        <OfficialButton disabled={form.isSaving} onClick={onBack} type="button" variant="contained">
          {text.cancel}
        </OfficialButton>
        <OfficialButton disabled={!form.isValid || form.isSaving} type="submit" variant="primary">
          {text.create}
        </OfficialButton>
      </div>
    </form>
  );
}

function useLocalRoutineForm(existingNames: Set<string>, onCreated: (id: string) => void, creationUnavailable: string) {
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
    await createTask({ name, description, prompt, cwd, frequency, time, setError, setIsSaving, onCreated, creationUnavailable });
  };
  return { name, setName, description, setDescription, prompt, setPrompt, cwd, setCwd, frequency, setFrequency, time, setTime, isSaving, error, nameError, isValid, submit };
}

async function createTask(input: CreateTaskInput) {
  input.setIsSaving(true);
  input.setError("");
  const [hour, minute] = input.time.split(":").map(Number);
  const created = await desktopBridge.CoworkScheduledTasks.create?.({
    name: normalizeTaskId(input.name),
    description: input.description.trim(),
    prompt: input.prompt.trim(),
    cwd: input.cwd,
    userSelectedFolders: [input.cwd],
    cronExpression: cronForSchedule(input.frequency, hour, minute, 1),
    permissionMode: "default",
  });
  input.setIsSaving(false);
  if (created) input.onCreated(created.id);
  else input.setError(input.creationUnavailable);
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

function InstructionsField({ form, text }: { form: ReturnType<typeof useLocalRoutineForm>; text: ScheduledFormText }) {
  const chooseFolder = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null);
    if (paths?.[0]) {
      form.setCwd(paths[0]);
      return;
    }
    const workspace = await desktopBridge.Preferences.getWorkspaceContext();
    form.setCwd(workspace.cwd ?? "");
  };
  return (
    <div className="flex flex-col gap-g3">
      <span className="text-footnote text-t6">{text.instructions}</span>
      <div className="flex flex-col rounded-r6 bg-fill-contained-default effect-contrast-stroke overflow-hidden">
        <textarea value={form.prompt} onChange={(event) => form.setPrompt(event.target.value)} placeholder={text.promptPlaceholder} rows={5} className="epitaxy-textarea w-full min-h-[120px] !bg-transparent !shadow-none" />
        <div className="flex items-center gap-g2 px-p5 pb-p3">
          <button type="button" className={subtleButtonClass}><Icon name="check" />{text.askPermissions}</button>
          <div className="flex-1" />
          <button type="button" className={subtleButtonClass}>{text.defaultModel}<Icon name="caretDown" /></button>
        </div>
        <div className="flex flex-wrap items-center gap-g3 px-p5 py-p4 bg-t1">
          <button type="button" onClick={chooseFolder} className={subtleButtonClass}><Icon name="project" />{form.cwd || text.selectFolder}</button>
          <div className="flex-1" />
          <button type="button" role="checkbox" aria-checked="false" className="group/cb inline-flex items-center border-0 outline-none hide-focus-ring ring-focus cursor-default text-footnote text-t6">{text.worktree}</button>
        </div>
      </div>
    </div>
  );
}

function ScheduleField({ frequency, setFrequency, time, setTime, text }: { frequency: ScheduleFrequency; setFrequency: (value: ScheduleFrequency) => void; time: string; setTime: (value: string) => void; text: ScheduledFormText }) {
  return (
    <div className="flex flex-col gap-g4">
      <span className="text-body text-t6">{text.schedule}</span>
      <div className="flex flex-col gap-g4">
        <div className="flex gap-g2 p-p1 rounded-r6 bg-t1 self-start">
          {FREQUENCY_KEYS.map(([value, key]) => (
            <button key={value} type="button" onClick={() => setFrequency(value)} className={`px-p4 py-p2 rounded-r4 text-footnote ${frequency === value ? "bg-t2 text-t9" : "text-t6 hover:text-t8 hover:bg-t2"}`}>
              {text[key]}
            </button>
          ))}
        </div>
        {frequency !== "once" ? <TimeRow time={time} setTime={setTime} atLabel={text.atTime} /> : null}
        {frequency !== "once" ? <p className="text-footnote text-t5">{text.staggerNote}</p> : null}
      </div>
    </div>
  );
}

function TimeRow({ time, setTime, atLabel }: { time: string; setTime: (value: string) => void; atLabel: string }) {
  const [hour, minute] = time.split(":").map(Number);
  return (
    <div className="flex items-center gap-g4 text-body text-t7">
      <span>{atLabel}</span>
      <input type="time" value={formatTime(hour, minute)} onChange={(event) => setTime(event.target.value)} className="epitaxy-input w-[140px]" />
    </div>
  );
}

function LocalAwakeBanner({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-g4 px-p6 py-p5 rounded-r6 bg-t1 text-body text-t7">
      <Icon name="check" />
      <span>{label}</span>
    </div>
  );
}
