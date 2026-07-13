/**
 * Official ukt SpaceOnboardingModal (index-BELzQL5P lG).
 * Chooser pkt + create-new wkt + existing-folder jkt (minimal 1:1 structure).
 * Create path: createSpaceFolder → createSpace → addFolderToSpace.
 */
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import { desktopBridge } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialModal } from "../shared/OfficialModal";
import { OfficialTextInput } from "../shared/OfficialTextInput";

type OnboardingStep = "chooser" | "create-new" | "existing-folder";

export type SpaceOnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
};

export function SpaceOnboardingModal({ isOpen, onClose, onCreated }: SpaceOnboardingModalProps) {
  const [step, setStep] = useState<OnboardingStep>("chooser");

  useEffect(() => {
    if (!isOpen) setStep("chooser");
  }, [isOpen]);

  const handleClose = useCallback(() => {
    setStep("chooser");
    onClose();
  }, [onClose]);

  return (
    <OfficialModal hasCloseButton={false} isOpen={isOpen} modalSize="md" onClose={handleClose} title="">
      <div data-official-source="index-BELzQL5P.js:ukt">
        {step === "chooser" ? <ChooserStep onSelect={setStep} /> : null}
        {step === "create-new" ? (
          <CreateNewStep onBack={() => setStep("chooser")} onClose={handleClose} onCreated={onCreated} />
        ) : null}
        {step === "existing-folder" ? (
          <ExistingFolderStep onBack={() => setStep("chooser")} onClose={handleClose} onCreated={onCreated} />
        ) : null}
      </div>
    </OfficialModal>
  );
}

function ChooserStep({ onSelect }: { onSelect: (step: OnboardingStep) => void }) {
  return (
    <div className="flex flex-col gap-4" data-official-source="index-BELzQL5P.js:pkt">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-text-100">Create a new project</h2>
        <p className="text-sm text-text-400 leading-relaxed">
          A dedicated place for ongoing work, where context builds over time. Files and instructions stay in a folder on your computer.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <ChooserCard
          description="Set up a new folder with instructions and files."
          icon={<Icon customSize={20} name="Add" />}
          onClick={() => onSelect("create-new")}
          title="Start from scratch"
        />
        <ChooserCard
          description="Give Claude a folder you already work from."
          icon={<Icon customSize={20} name="Folder1" />}
          onClick={() => onSelect("existing-folder")}
          title="Use an existing folder"
        />
      </div>
    </div>
  );
}

function ChooserCard({
  description,
  icon,
  onClick,
  title,
}: {
  description: string;
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      className="flex items-center gap-3 rounded-xl border border-border-300 bg-bg-000 px-4 py-3.5 text-left transition-colors hover:border-border-200 hover:bg-bg-100 group"
      data-official-source="index-BELzQL5P.js:mkt"
      onClick={onClick}
      type="button"
    >
      <div className="flex items-center justify-center w-10 h-10 rounded-lg border border-border-300 bg-bg-100 text-text-400 flex-shrink-0">{icon}</div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium text-text-100">{title}</span>
        <span className="text-xs text-text-500">{description}</span>
      </div>
      <Icon className="text-text-500 group-hover:text-text-300 flex-shrink-0 transition-colors" customSize={16} name="CaretRight" />
    </button>
  );
}

function StepHeader({ onBack, title }: { onBack: () => void; title: string }) {
  return (
    <div className="flex flex-col gap-1 mb-4" data-official-source="index-BELzQL5P.js:ykt">
      <button
        aria-label="Go back"
        className="self-start -ml-1 rounded p-1 text-text-500 hover:text-text-200 hover:bg-bg-200 transition-colors"
        onClick={onBack}
        type="button"
      >
        <Icon customSize={18} name="ArrowLeft" />
      </button>
      <h2 className="text-xl font-semibold text-text-100">{title}</h2>
    </div>
  );
}

async function createSpaceWithFolder(input: {
  folderPath?: string;
  instructions?: string;
  location?: string;
  name: string;
}) {
  const spaces = desktopBridge.CoworkSpaces;
  if (!spaces?.create) return null;

  let folderPath = input.folderPath ?? null;
  if (!folderPath && input.location) {
    folderPath = (await spaces.createSpaceFolder?.(input.location, input.name)) ?? null;
    if (!folderPath) {
      // Bridge may not expose createSpaceFolder; still create the space metadata.
      folderPath = `${input.location.replace(/[\\/]+$/, "")}/${input.name}`;
    }
  }

  const space = await spaces.create({
    name: input.name,
    instructions: input.instructions || undefined,
  });
  if (!space) return null;

  if (folderPath && spaces.addFolderToSpace) {
    await spaces.addFolderToSpace(space.id, folderPath).catch(() => undefined);
  }
  return space.id;
}

function CreateNewStep({
  onBack,
  onClose,
  onCreated,
}: {
  onBack: () => void;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
}) {
  const nameId = useId();
  const instructionsId = useId();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [location, setLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Prefer a single directory pick default; official uses Documents/Claude/Projects.
      const paths = await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null);
      if (active && paths?.[0]) setLocation(paths[0]);
    })();
    return () => {
      active = false;
    };
  }, []);

  const previewPath = useMemo(() => {
    if (!location) return "";
    const trimmed = name.trim();
    return trimmed ? `${location.replace(/[\\/]+$/, "")}/${trimmed}` : location;
  }, [location, name]);

  const chooseLocation = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    if (paths?.[0]) setLocation(paths[0]);
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !location || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const spaceId = await createSpaceWithFolder({
        name: trimmed,
        instructions: instructions.trim() || undefined,
        location,
      });
      if (!spaceId) {
        setError("Failed to create project. You can try again.");
        return;
      }
      onCreated?.(spaceId);
      onClose();
    } catch {
      setError("Failed to create project. You can try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" data-official-source="index-BELzQL5P.js:wkt">
      <StepHeader onBack={onBack} title="Start a new project" />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={nameId}>
            名称<span aria-hidden="true" className="text-danger-000 ml-1">*</span>
          </label>
          <OfficialTextInput
            autoFocus
            disabled={submitting}
            id={nameId}
            onValueChange={setName}
            placeholder="Project name"
            required
            value={name}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={instructionsId}>
            Instructions
          </label>
          <textarea
            className="bg-bg-000 border border-border-300 hover:border-border-200 transition-colors placeholder:text-text-500 can-focus text-text-100 rounded-[0.6rem] px-3 py-2 w-full min-h-[86px] text-sm leading-5"
            disabled={submitting}
            id={instructionsId}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Tell Claude how to work in this project (optional)"
            rows={3}
            value={instructions}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300">Choose project location</label>
          <button
            className="flex items-center gap-2 w-full rounded-lg border border-border-300 bg-bg-000 px-3 py-2.5 text-sm text-text-300 text-left hover:border-border-200 transition-colors disabled:opacity-50"
            disabled={submitting}
            onClick={() => void chooseLocation()}
            type="button"
          >
            <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Folder1" />
            <span className="truncate flex-1">{previewPath || "Select a folder..."}</span>
          </button>
        </div>
        {error ? <p className="text-sm text-danger-000">{error}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <OfficialButton disabled={submitting} onClick={onClose} type="button" variant="secondary">
            Cancel
          </OfficialButton>
          <OfficialButton disabled={!name.trim() || !location || submitting} loading={submitting} type="submit" variant="primary">
            Create project
          </OfficialButton>
        </div>
      </form>
    </div>
  );
}

function ExistingFolderStep({
  onBack,
  onClose,
  onCreated,
}: {
  onBack: () => void;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
}) {
  const nameId = useId();
  const instructionsId = useId();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseFolder = async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(false);
    if (paths?.[0]) {
      setFolderPath(paths[0]);
      if (!name.trim()) {
        const base = paths[0].split(/[\\/]/).filter(Boolean).pop() ?? "";
        if (base) setName(base);
      }
    }
  };

  const submit = async () => {
    const trimmed = name.trim();
    if (!trimmed || !folderPath || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const spaceId = await createSpaceWithFolder({
        name: trimmed,
        instructions: instructions.trim() || undefined,
        folderPath,
      });
      if (!spaceId) {
        setError("Failed to create project. You can try again.");
        return;
      }
      onCreated?.(spaceId);
      onClose();
    } catch {
      setError("Failed to create project. You can try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" data-official-source="index-BELzQL5P.js:jkt">
      <StepHeader onBack={onBack} title="Use an existing folder" />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300">Folder</label>
          <button
            className="flex items-center gap-2 w-full rounded-lg border border-border-300 bg-bg-000 px-3 py-2.5 text-sm text-text-300 text-left hover:border-border-200 transition-colors disabled:opacity-50"
            disabled={submitting}
            onClick={() => void chooseFolder()}
            type="button"
          >
            <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Folder1" />
            <span className="truncate flex-1">{folderPath || "Select a folder..."}</span>
          </button>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={nameId}>
            名称<span aria-hidden="true" className="text-danger-000 ml-1">*</span>
          </label>
          <OfficialTextInput disabled={submitting} id={nameId} onValueChange={setName} placeholder="Project name" required value={name} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={instructionsId}>
            Instructions
          </label>
          <textarea
            className="bg-bg-000 border border-border-300 hover:border-border-200 transition-colors placeholder:text-text-500 can-focus text-text-100 rounded-[0.6rem] px-3 py-2 w-full min-h-[86px] text-sm leading-5"
            disabled={submitting}
            id={instructionsId}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Tell Claude how to work in this project (optional)"
            rows={3}
            value={instructions}
          />
        </div>
        {error ? <p className="text-sm text-danger-000">{error}</p> : null}
        <div className="mt-4 flex items-center justify-end gap-2">
          <OfficialButton disabled={submitting} onClick={onClose} type="button" variant="secondary">
            Cancel
          </OfficialButton>
          <OfficialButton disabled={!name.trim() || !folderPath || submitting} loading={submitting} type="submit" variant="primary">
            Create project
          </OfficialButton>
        </div>
      </form>
    </div>
  );
}
