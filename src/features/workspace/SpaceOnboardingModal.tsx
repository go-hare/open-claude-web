/**
 * Official ukt SpaceOnboardingModal (index-BELzQL5P lG).
 * Chooser pkt + create-new wkt + existing-folder jkt.
 * Create residual bkt: createSpaceFolder → createSpace → addFolderToSpace → copyFilesToSpaceFolder.
 * File drop residual ckt; location residual xkt/fkt (Documents/Claude/Projects); memory footer Mkt.
 */
import { useCallback, useEffect, useId, useMemo, useState, type DragEvent, type ReactNode } from "react";
import { desktopBridge } from "../../adapters/desktopBridge";
import { useI18nText } from "../../i18n/footerMenuMessages";
import { Icon } from "../../shell/icons";
import { useDesktopPreferences } from "../settings/useDesktopPreferences";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialModal } from "../shared/OfficialModal";
import { OfficialTextInput } from "../shared/OfficialTextInput";
import { OfficialTooltip } from "../shared/OfficialTooltip";
import { PROJECTS_MESSAGES, type ProjectsText } from "./projectsMessages";

type OnboardingStep = "chooser" | "create-new" | "existing-folder";

export type SpaceOnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
};

export function SpaceOnboardingModal({ isOpen, onClose, onCreated }: SpaceOnboardingModalProps) {
  const text = useI18nText(PROJECTS_MESSAGES);
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
        {step === "chooser" ? <ChooserStep onSelect={setStep} text={text} /> : null}
        {step === "create-new" ? (
          <CreateNewStep onBack={() => setStep("chooser")} onClose={handleClose} onCreated={onCreated} text={text} />
        ) : null}
        {step === "existing-folder" ? (
          <ExistingFolderStep onBack={() => setStep("chooser")} onClose={handleClose} onCreated={onCreated} text={text} />
        ) : null}
      </div>
    </OfficialModal>
  );
}

function ChooserStep({
  onSelect,
  text,
}: {
  onSelect: (step: OnboardingStep) => void;
  text: ProjectsText;
}) {
  return (
    <div className="flex flex-col gap-4" data-official-source="index-BELzQL5P.js:pkt">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-semibold text-text-100">{text.createNewProjectTitle}</h2>
        <p className="text-sm text-text-400 leading-relaxed">{text.createNewProjectBody}</p>
      </div>
      <div className="flex flex-col gap-2">
        <ChooserCard
          description={text.startFromScratchDesc}
          icon={<Icon customSize={20} name="Add" />}
          onClick={() => onSelect("create-new")}
          title={text.startFromScratch}
        />
        <ChooserCard
          description={text.useExistingFolderDesc}
          icon={<Icon customSize={20} name="Folder1" />}
          onClick={() => onSelect("existing-folder")}
          title={text.useExistingFolder}
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
  icon: ReactNode;
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
      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-border-300 bg-bg-100 text-text-400">
        {icon}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-sm font-medium text-text-100">{title}</span>
        <span className="text-xs text-text-500">{description}</span>
      </div>
      <Icon className="flex-shrink-0 text-text-500 transition-colors group-hover:text-text-300" customSize={16} name="CaretRight" />
    </button>
  );
}

function StepHeader({
  description,
  goBackLabel,
  onBack,
  title,
}: {
  description?: string;
  goBackLabel: string;
  onBack: () => void;
  title: string;
}) {
  return (
    <div className="mb-4 flex flex-col gap-1" data-official-source="index-BELzQL5P.js:ykt">
      <button
        aria-label={goBackLabel}
        className="-ml-1 self-start rounded p-1 text-text-500 transition-colors hover:bg-bg-200 hover:text-text-200"
        onClick={onBack}
        type="button"
      >
        <Icon customSize={18} name="ArrowLeft" />
      </button>
      <h2 className="text-xl font-semibold text-text-100">{title}</h2>
      {description ? <p className="text-sm text-text-400">{description}</p> : null}
    </div>
  );
}

/** Official residual ckt FileDropArea (index-BELzQL5P). */
function SpaceFileDropArea({
  disabled,
  dropLabel,
  filePaths,
  onFilePathsChange,
}: {
  disabled?: boolean;
  dropLabel: string;
  filePaths: string[];
  onFilePathsChange: (paths: string[]) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const addPaths = useCallback(
    (incoming: string[]) => {
      const known = new Set(filePaths);
      const next = incoming.filter((path) => path && !known.has(path));
      if (next.length > 0) onFilePathsChange([...filePaths, ...next]);
    },
    [filePaths, onFilePathsChange],
  );

  const removePath = useCallback(
    (path: string) => onFilePathsChange(filePaths.filter((item) => item !== path)),
    [filePaths, onFilePathsChange],
  );

  const browse = useCallback(async () => {
    const picked = await desktopBridge.FileSystem.browseFiles?.("Select files to add").catch(() => []);
    if (picked?.length) addPaths(picked);
  }, [addPaths]);

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (!disabled) setDragging(true);
  };
  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
  };
  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(false);
    if (disabled) return;
    // Electron File.path is residual path source; browsers may omit it.
    const paths: string[] = [];
    const files = event.dataTransfer.files;
    for (let index = 0; index < files.length; index += 1) {
      const file = files.item(index) as File & { path?: string };
      if (file?.path) paths.push(file.path);
    }
    if (paths.length > 0) addPaths(paths);
    else void browse();
  };

  return (
    <div className="flex flex-col gap-2" data-official-source="index-BELzQL5P.js:ckt">
      {filePaths.length > 0 ? (
        <div className="flex flex-col gap-1">
          {filePaths.map((filePath) => {
            const name = filePath.split(/[\\/]/).pop() ?? filePath;
            return (
              <div className="flex items-center gap-2 rounded-lg border border-border-300 bg-bg-000 px-3 py-2" key={filePath}>
                <Icon className="flex-shrink-0 text-text-400" customSize={16} name="File" />
                <span className="flex-1 truncate text-sm text-text-200">{name}</span>
                <button
                  className="flex-shrink-0 rounded p-0.5 text-text-500 transition-colors hover:bg-bg-200 hover:text-text-200"
                  disabled={disabled}
                  onClick={() => removePath(filePath)}
                  type="button"
                >
                  <Icon customSize={14} name="X" />
                </button>
              </div>
            );
          })}
        </div>
      ) : null}
      <div
        aria-disabled={disabled}
        className={[
          "flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-6 text-sm transition-colors",
          dragging ? "border-accent-100 bg-bg-200 text-text-200" : "border-border-300 bg-bg-100 text-text-500 hover:border-border-200 hover:bg-bg-200 hover:text-text-300",
          disabled ? "cursor-not-allowed opacity-50" : "",
        ]
          .filter(Boolean)
          .join(" ")}
        onClick={disabled ? undefined : () => void browse()}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onKeyDown={(event) => {
          if (disabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            void browse();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
      >
        <Icon customSize={16} name="Add" />
        <span>{dropLabel}</span>
      </div>
    </div>
  );
}

/**
 * Official residual Mkt (index-BELzQL5P):
 * hse = account.settings.enabled_cowork_memory !== false.
 * Product: preference `enabledCoworkMemory` is mirrored from account.settings
 * (useSettingsBootstrap sync + Qt toggle write) so Space status matches Settings.
 */
function SpaceMemoryStatus({ text }: { text: ProjectsText }) {
  // useDesktopPreferences returns [preferences, setPreference] tuple (not object).
  const [preferences] = useDesktopPreferences();
  const memoryOn = preferences?.enabledCoworkMemory !== false;
  return (
    <OfficialTooltip content={memoryOn ? text.memoryOnTooltip : text.memoryOffTooltip}>
      <span
        className={[
          "inline-flex cursor-default items-center gap-1.5 rounded text-xs focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-100",
          memoryOn ? "text-accent-100" : "text-text-500",
        ].join(" ")}
        data-official-source="index-BELzQL5P.js:Mkt"
        role="status"
        tabIndex={0}
      >
        <Icon aria-hidden className="flex-shrink-0" customSize={14} name="Memory" />
        {memoryOn ? text.memoryOn : text.memoryOff}
      </span>
    </OfficialTooltip>
  );
}

/**
 * Official bkt residual:
 * - create-new: createSpaceFolder(location,name) → createSpace → addFolder → copyFiles
 * - existing: createSpace → addFolder(folderPath) → copyFiles
 */
async function createSpaceWithFolder(input: {
  filePaths?: string[];
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
    if (!folderPath) return null;
  }
  if (!folderPath) return null;

  const space = await spaces.create({
    name: input.name,
    instructions: input.instructions || undefined,
  });
  if (!space) return null;

  if (spaces.addFolderToSpace) {
    await spaces.addFolderToSpace(space.id, folderPath).catch(() => undefined);
  }
  const files = (input.filePaths ?? []).filter(Boolean);
  if (files.length > 0 && spaces.copyFilesToSpaceFolder) {
    await spaces.copyFilesToSpaceFolder(space.id, files).catch(() => undefined);
  }
  return space.id;
}

function joinPath(parent: string, child: string) {
  return `${parent.replace(/[\\/]+$/, "")}/${child}`;
}

function CreateNewStep({
  onBack,
  onClose,
  onCreated,
  text,
}: {
  onBack: () => void;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
  text: ProjectsText;
}) {
  const nameId = useId();
  const instructionsId = useId();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [location, setLocation] = useState("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      // Residual fkt: bT.getSystemPath(Documents) + "/Claude/Projects"
      const documents = await desktopBridge.FileSystem.getSystemPath?.("Documents").catch(() => null);
      if (active && documents) {
        setLocation(joinPath(documents, "Claude/Projects"));
        return;
      }
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
    return trimmed ? joinPath(location, trimmed) : location;
  }, [location, name]);

  const chooseLocation = async () => {
    const picked =
      (await desktopBridge.FileSystem.browseFolder?.(text.chooseProjectFolderTitle).catch(() => null)) ??
      (await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null))?.[0] ??
      null;
    if (picked) setLocation(picked);
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
        filePaths,
      });
      if (!spaceId) {
        setError(text.createFailed);
        return;
      }
      onCreated?.(spaceId);
      onClose();
    } catch {
      setError(text.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" data-official-source="index-BELzQL5P.js:wkt">
      <StepHeader goBackLabel={text.goBack} onBack={onBack} title={text.startNewProjectTitle} />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={nameId}>
            {text.nameLabel}
            <span aria-hidden="true" className="ml-1 text-danger-000">
              *
            </span>
          </label>
          <OfficialTextInput
            autoFocus
            disabled={submitting}
            id={nameId}
            onValueChange={setName}
            placeholder={text.projectNamePlaceholder}
            required
            value={name}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300" htmlFor={instructionsId}>
            {text.instructionsLabel}
          </label>
          <textarea
            className="can-focus min-h-[86px] w-full rounded-[0.6rem] border border-border-300 bg-bg-000 px-3 py-2 text-sm leading-5 text-text-100 transition-colors placeholder:text-text-500 hover:border-border-200"
            disabled={submitting}
            id={instructionsId}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder={text.instructionsPlaceholder}
            rows={3}
            value={instructions}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium text-text-300">{text.addFiles}</span>
          <SpaceFileDropArea
            disabled={submitting}
            dropLabel={text.dropFiles}
            filePaths={filePaths}
            onFilePathsChange={setFilePaths}
          />
        </div>
        <div className="flex flex-col gap-1.5" data-official-source="index-BELzQL5P.js:xkt">
          <label className="text-xs font-medium text-text-300">{text.chooseProjectLocation}</label>
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-border-300 bg-bg-000 px-3 py-2.5 text-left text-sm text-text-300 transition-colors hover:border-border-200 disabled:opacity-50"
            disabled={submitting}
            onClick={() => void chooseLocation()}
            type="button"
          >
            <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Folder1" />
            <span className="flex-1 truncate">{previewPath || text.selectFolder}</span>
          </button>
        </div>
        {error ? <p className="text-sm text-danger-000">{error}</p> : null}
        <div className="mt-4 flex items-center justify-between">
          <SpaceMemoryStatus text={text} />
          <div className="flex items-center gap-2">
            <OfficialButton disabled={submitting} onClick={onClose} type="button" variant="secondary">
              {text.cancel}
            </OfficialButton>
            <OfficialButton disabled={!name.trim() || !location || submitting} loading={submitting} type="submit" variant="primary">
              {text.create}
            </OfficialButton>
          </div>
        </div>
      </form>
    </div>
  );
}

function ExistingFolderStep({
  onBack,
  onClose,
  onCreated,
  text,
}: {
  onBack: () => void;
  onClose: () => void;
  onCreated?: (spaceId: string) => void;
  text: ProjectsText;
}) {
  const nameId = useId();
  const instructionsId = useId();
  const [name, setName] = useState("");
  const [instructions, setInstructions] = useState("");
  const [folderPath, setFolderPath] = useState("");
  const [filePaths, setFilePaths] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseFolder = async () => {
    const picked =
      (await desktopBridge.FileSystem.browseFolder?.(text.chooseExistingFolderDialog).catch(() => null)) ??
      (await desktopBridge.Preferences.getDirectoryPath?.(false).catch(() => null))?.[0] ??
      null;
    if (!picked) return;
    setFolderPath(picked);
    if (!name.trim()) {
      const base = picked.split(/[\\/]/).filter(Boolean).pop() ?? "";
      if (base) setName(base);
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
        filePaths,
      });
      if (!spaceId) {
        setError(text.createFailed);
        return;
      }
      onCreated?.(spaceId);
      onClose();
    } catch {
      setError(text.createFailed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col" data-official-source="index-BELzQL5P.js:jkt">
      <StepHeader
        description={text.existingFolderStepBody}
        goBackLabel={text.goBack}
        onBack={onBack}
        title={text.useExistingFolder}
      />
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-text-300">{text.chooseFolder}</label>
          <button
            className="flex w-full items-center gap-2 rounded-lg border border-border-300 bg-bg-000 px-3 py-2.5 text-left text-sm text-text-300 transition-colors hover:border-border-200 disabled:opacity-50"
            disabled={submitting}
            onClick={() => void chooseFolder()}
            type="button"
          >
            <Icon className="flex-shrink-0 text-text-400" customSize={16} name="Folder1" />
            <span className="flex-1 truncate text-text-300">{folderPath || text.selectFolder}</span>
          </button>
        </div>
        <div className={folderPath ? "contents" : "hidden"}>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-300" htmlFor={nameId}>
              {text.nameLabel}
              <span aria-hidden="true" className="ml-1 text-danger-000">
                *
              </span>
            </label>
            <OfficialTextInput
              disabled={submitting}
              id={nameId}
              onValueChange={setName}
              placeholder={text.projectNamePlaceholder}
              required
              value={name}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-text-300" htmlFor={instructionsId}>
              {text.instructionsLabel}
            </label>
            <textarea
              className="can-focus min-h-[86px] w-full rounded-[0.6rem] border border-border-300 bg-bg-000 px-3 py-2 text-sm leading-5 text-text-100 transition-colors placeholder:text-text-500 hover:border-border-200"
              disabled={submitting}
              id={instructionsId}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder={text.instructionsPlaceholder}
              rows={3}
              value={instructions}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs font-medium text-text-300">{text.addFiles}</span>
            <SpaceFileDropArea
              disabled={submitting}
              dropLabel={text.dropFiles}
              filePaths={filePaths}
              onFilePathsChange={setFilePaths}
            />
          </div>
        </div>
        {error ? <p className="text-sm text-danger-000">{error}</p> : null}
        <div className="mt-4 flex items-center justify-between">
          <SpaceMemoryStatus text={text} />
          <div className="flex items-center gap-2">
            <OfficialButton disabled={submitting} onClick={onClose} type="button" variant="secondary">
              {text.cancel}
            </OfficialButton>
            <OfficialButton disabled={!name.trim() || !folderPath || submitting} loading={submitting} type="submit" variant="primary">
              {text.create}
            </OfficialButton>
          </div>
        </div>
      </form>
    </div>
  );
}
