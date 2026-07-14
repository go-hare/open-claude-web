import { createElement, useCallback, useEffect, useMemo, useRef, type ReactNode } from "react";
import { desktopBridge, type CoworkMountedProject, type PermissionMode, type WorkspaceContext } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { coworkSessionsBridge } from "../session/coworkSessionBridge";
import { CoworkAddMenuFolderAddIcon, CoworkComposerPlusIcon } from "../newTask/CoworkAddMenuIcons";
import { createCoworkAddMenuItems, type CoworkAddMenuProject } from "../newTask/CoworkAddMenuItems";
import { useCoworkNewTaskText } from "../newTask/coworkNewTaskMessages";
import { CoworkSelectedProjectIndicators } from "../newTask/CoworkProjectContext";
import { CoworkSelectedFiles } from "../newTask/CoworkSelectedFiles";
import type { CoworkUploadedFile } from "../newTask/coworkUploadedFiles";
import { CoworkDropdownButton } from "../ui/CoworkDropdownButton";
import type { CoworkDropdownItem } from "../ui/CoworkMenuTypes";
import { CoworkDraftRiskBanner } from "./CoworkDraftRiskBanner";
import { CoworkFolderPicker } from "./CoworkFolderPicker";
import { CoworkPromptInput, type CoworkPromptInputHandle } from "./CoworkPromptInput";
import {
  coworkPermissionModeOptionsForModes,
  isCoworkUnsupervisedPermissionMode,
} from "./options";
import { useCoworkPermissionModeAvailability } from "./useCoworkPermissionModeAvailability";
import { useCoworkRecentFolders } from "./useCoworkRecentFolders";

export type CoworkPromptBoxProps = {
  busy: boolean;
  focusRequestKey?: number;
  model: string;
  onAddFiles?: () => void;
  onModelChange: (model: string) => void;
  onNavigate?: (path: string) => void;
  onPermissionModeChange: (mode: PermissionMode) => void;
  onProjectSelect?: (project: CoworkAddMenuProject) => void;
  onRemoveFile?: (filePath: string) => void;
  onRemoveProject?: (uuid: string) => void;
  onSubmit: () => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  permissionMode: PermissionMode;
  projectMenuItems?: CoworkAddMenuProject[];
  prompt: string;
  selectedFiles?: CoworkUploadedFile[];
  selectedProjects?: CoworkMountedProject[];
  setPrompt: (value: string) => void;
  workspace: WorkspaceContext;
};

const modelOptions = [
  { label: "Default model", value: "default" },
  { label: "Opus 4", value: "claude-opus-4" },
  { label: "Sonnet", value: "claude-sonnet-4" },
];
const noop = () => undefined;

/**
 * Official new-task composer stack (w6t):
 * V4t risk banner → CAt ChatInput (surface + pwt plus) → $4t chin (Akt folder / nkt mode / B4t model).
 * Sources: index-BELzQL5P.js:w6t/$4t/pwt/nkt/V4t
 */
export function CoworkPromptBox(props: CoworkPromptBoxProps) {
  const inputRef = useRef<CoworkPromptInputHandle | null>(null);
  const state = useCoworkPromptBoxState(props);
  useEffect(() => {
    if (props.focusRequestKey && props.focusRequestKey > 0) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [props.focusRequestKey]);
  return (
    <div data-official-source="index-BELzQL5P.js:w6t/$4t CAt onpage">
      <CoworkDraftRiskBanner visible={state.permissionAvailable && isCoworkUnsupervisedPermissionMode(props.permissionMode)} />
      <CoworkPromptSurface inputRef={inputRef} props={props} toolbarItems={state.addMenuItems} />
      <CoworkPromptChin
        busy={props.busy}
        modelItems={state.modelItems}
        modelLabel={state.modelLabel}
        permissionAvailable={state.permissionAvailable}
        permissionItems={state.permissionItems}
        permissionLabel={state.permissionLabel}
        recentFolders={state.recentFolders}
        selectedFolders={state.selectedFolders}
        updateFolders={state.updateFolders}
        workspace={props.workspace}
      />
    </div>
  );
}

function useCoworkPromptBoxState(props: CoworkPromptBoxProps) {
  const recentFolders = useCoworkRecentFolders();
  const selectedFolders = props.workspace.folders ?? [];
  // Official skt: isAvailable from OZe; modes from Ewt("cowork", {auto,bypass}).
  const permissionAvailability = useCoworkPermissionModeAvailability();
  // Official skt effect: when OZe null, draftPermissionMode resets to default.
  useEffect(() => {
    if (!permissionAvailability.isAvailable && isCoworkUnsupervisedPermissionMode(props.permissionMode)) {
      props.onPermissionModeChange("default");
    }
  }, [permissionAvailability.isAvailable, props.onPermissionModeChange, props.permissionMode]);
  const updateFolders = useCallback(
    (folders: string[]) => props.onWorkspaceChange({ ...props.workspace, folders: [...new Set(folders.filter(Boolean))] }),
    [props],
  );
  const addFolder = useCallback(async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(true);
    if (paths?.length) updateFolders([...selectedFolders, ...paths]);
  }, [selectedFolders, updateFolders]);
  // Official cwt on /task/new: isAgentNewRoute && considerEnabledForNonUI → hide project/Drive/GitHub + modes.
  const addMenuItems = useMemo(
    () =>
      props.onAddFiles
        ? createCoworkAddMenuItems({
            isAgentRoute: true,
            includeAddFolder: true,
            onAddFiles: props.onAddFiles,
            onAddFolder: addFolder,
            onNavigate: props.onNavigate,
            onSelectProject: props.onProjectSelect,
            projects: props.projectMenuItems,
          })
        : [{ icon: createElement(CoworkAddMenuFolderAddIcon, { size: 14 }), label: "Add folder", onSelect: addFolder }],
    [addFolder, props],
  );
  const modelItems = modelOptions.map((item, index) => ({
    checked: item.value === props.model,
    label: item.label,
    noQuickKey: index === 0,
    onSelect: () => props.onModelChange(item.value),
  }));
  // Official nkt → Kwt only when isAvailable; otherwise null (no Ask UI).
  const permissionOptions = useMemo(
    () => coworkPermissionModeOptionsForModes(permissionAvailability.modes),
    [permissionAvailability.modes],
  );
  const permissionItems = permissionOptions.map((item) => ({
    checked: item.value === props.permissionMode,
    icon: item.icon,
    label: item.menuLabel ?? item.label,
    onSelect: () => props.onPermissionModeChange(item.value),
    subtitle: item.description,
  }));
  const permissionLabel = permissionOptions.find((item) => item.value === props.permissionMode)?.label ?? "Ask";
  return {
    addMenuItems,
    modelItems,
    modelLabel: modelOptions.find((item) => item.value === props.model)?.label ?? "Default model",
    permissionAvailable: permissionAvailability.isAvailable,
    permissionItems,
    permissionLabel,
    recentFolders,
    selectedFolders,
    updateFolders,
  };
}

function CoworkPromptSurface({
  inputRef,
  props,
  toolbarItems,
}: {
  inputRef: React.RefObject<CoworkPromptInputHandle | null>;
  props: CoworkPromptBoxProps;
  toolbarItems: CoworkDropdownItem[];
}) {
  // Official CAt: yYe static + yAt rotating He = [XLcM6WHfQR, jGTFVKPV2+]
  const text = useCoworkNewTaskText();
  const rotatingPlaceholders = useMemo(
    () => [text.composerPlaceholder, text.composerPlaceholderSkills],
    [text.composerPlaceholder, text.composerPlaceholderSkills],
  );
  return (
    <fieldset className="flex w-full min-w-0 flex-col">
      <input aria-hidden="true" className="absolute -z-10 h-0 w-0 opacity-0" data-testid="file-upload" tabIndex={-1} type="file" />
      <div className="relative">
        <div
          className="!box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px] cursor-text border border-transparent md:w-full shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)] hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]"
          onClick={(event) => {
            if (!(event.target instanceof HTMLElement && event.target.closest("button"))) inputRef.current?.focus();
          }}
        >
          <div className="flex flex-col m-3.5 gap-3">
            <div className="relative font-large">
              <CoworkPromptInput
                disabled={props.busy}
                onChange={props.setPrompt}
                onSubmit={props.onSubmit}
                placeholder={text.composerPlaceholder}
                ref={inputRef}
                rotatingPlaceholders={rotatingPlaceholders}
                slashCwd={props.workspace.cwd}
                value={props.prompt}
              />
            </div>
            <CoworkSelectedFiles files={props.selectedFiles ?? []} onRemove={props.onRemoveFile ?? noop} />
            <CoworkSelectedProjectIndicators onRemove={props.onRemoveProject ?? noop} projects={props.selectedProjects ?? []} />
            <CoworkPromptToolbar busy={props.busy} items={toolbarItems} onSubmit={props.onSubmit} prompt={props.prompt} />
          </div>
        </div>
      </div>
    </fieldset>
  );
}

function CoworkPromptToolbar({
  busy,
  items,
  onSubmit,
  prompt,
}: {
  busy: boolean;
  items: CoworkDropdownItem[];
  onSubmit: () => void;
  prompt: string;
}) {
  // Official pwt: Xp tooltip "Add files, connectors, and more" + keyboardShortcut="/"
  // Official send (agent new): Dc variant="claude" size="icon_sm" aria-label Start task
  const canSubmit = !busy && Boolean(prompt.trim());
  return (
    <div className="relative flex gap-2 w-full items-center">
      <div className="relative flex-1 flex items-center min-w-0">
        <OfficialTooltip delayDuration={0} keyboardShortcut="/" side="bottom" tooltipContent="Add files, connectors, and more">
          <span className="inline-flex">
            <CoworkDropdownButton
              align="start"
              alignOffset={-10}
              ariaLabel="Add files, connectors, and more"
              className="!rounded-lg hover:!bg-bg-200 aria-expanded:!bg-bg-300 ml-[2px] h-8 w-8"
              disabled={busy}
              icon={<CoworkComposerPlusIcon size={20} />}
              items={items}
              popupClassName="max-h-[min(var(--available-height),24rem)]"
              revealChevron="never"
              side="bottom"
              sideOffset={4}
              size="small"
            />
          </span>
        </OfficialTooltip>
      </div>
      <OfficialTooltip tooltipContent="Start task">
        <OfficialButton
          aria-label="Start task"
          className="!rounded-lg !h-8 !w-8 disabled:cursor-default"
          disabled={!canSubmit}
          onClick={onSubmit}
          size="icon_sm"
          variant="claude"
        >
          {busy ? <Icon className="animate-spin" customSize={16} name="Spinner" /> : <Icon bold customSize={16} name="ArrowUp" />}
        </OfficialButton>
      </OfficialTooltip>
    </div>
  );
}

function CoworkPromptChin({
  busy,
  modelItems,
  modelLabel,
  permissionAvailable,
  permissionItems,
  permissionLabel,
  recentFolders,
  selectedFolders,
  updateFolders,
  workspace,
}: {
  busy: boolean;
  modelItems: CoworkDropdownItem[];
  modelLabel: ReactNode;
  /** Official nkt isAvailable — when false, omit Ask/Act entirely. */
  permissionAvailable: boolean;
  permissionItems: CoworkDropdownItem[];
  permissionLabel: ReactNode;
  recentFolders: ReturnType<typeof useCoworkRecentFolders>;
  selectedFolders: string[];
  updateFolders: (folders: string[]) => void;
  workspace: WorkspaceContext;
}) {
  // Official $4t chin: Akt + nkt(variant new-task, placement chin) + B4t model
  // Official nkt: if (!isAvailable) return null
  return (
    <div
      className="relative z-0 !box-content mx-2 -mt-5 rounded-b-[20px] border border-transparent bg-always-black/[0.01] shadow-[inset_0_0_0_0.5px_hsl(var(--bg-000)/0.8),0_0_0_0.5px_hsl(var(--border-300)/0.18)] backdrop-blur-[2px] md:mx-0 md:w-full"
      data-official-source="index-BELzQL5P.js:$4t chin"
    >
      <div className="flex items-center gap-1 px-2 pb-2 pt-7">
        <div className="min-w-0">
          <CoworkFolderPicker
            bridge={coworkSessionsBridge}
            defaultTarget={workspace.cwd ? { path: workspace.cwd, displayName: basename(workspace.cwd), type: "folder" } : null}
            disabled={busy}
            onSelectedFoldersChange={updateFolders}
            placeholder="Work in a project"
            recentTargets={recentFolders}
            selectedFolders={selectedFolders}
          />
        </div>
        {permissionAvailable ? (
          <CoworkDropdownButton
            align="start"
            ariaLabel={`Mode: ${String(permissionLabel)}`}
            className="!px-2 !h-9 !rounded-xl bg-transparent hover:!bg-bg-200 !text-text-300"
            disabled={busy}
            items={permissionItems}
            label={permissionLabel}
            mode="text"
            side="bottom"
            sideOffset={4}
          />
        ) : null}
        <div className="ml-auto flex items-center gap-1">
          <CoworkDropdownButton
            ariaLabel={`Model: ${String(modelLabel)}`}
            className="!rounded-xl !h-9"
            disabled={busy}
            items={modelItems}
            label={modelLabel}
            mode="text"
            side="top"
            sideOffset={4}
          />
        </div>
      </div>
    </div>
  );
}

function basename(value: string) {
  return value.split(/[\\/]/).filter(Boolean).at(-1);
}
