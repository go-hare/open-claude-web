import { Dialog } from "@base-ui-components/react/dialog";
import { Menu } from "@base-ui-components/react/menu";
import type { Editor } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { desktopBridge, type CoworkMountedProject, type PermissionMode, type WorkspaceContext } from "../../adapters/desktopBridge";
import type { CoworkSessionsBridge, SessionSummary } from "../../adapters/desktopBridge/types";
import { OfficialButton, type OfficialDropdownItem } from "./OfficialEpitaxyComponents";
import { Icon } from "../../shell/icons";
import { createCoworkAddMenuItems, type CoworkAddMenuProject } from "./cowork/CoworkAddMenuItems";
import { CoworkSelectedProjectIndicators } from "./cowork/CoworkProjectContext";
import { CoworkSelectedFiles } from "./cowork/CoworkSelectedFiles";
import type { CoworkUploadedFile } from "./cowork/coworkUploadedFiles";
import { OfficialEpitaxySlashCommandMenu } from "./slash/OfficialEpitaxySlashCommandMenu";
import { OfficialSkillChip } from "./slash/OfficialSkillChip";
import { OfficialSlashCommandSuggestion } from "./slash/OfficialSlashCommandSuggestion";
import type { OfficialSlashCommandMenuProps } from "./slash/OfficialSlashTypes";

type OfficialCoworkPromptBoxProps = {
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

type OfficialCoworkFolderTarget = {
  displayName?: string;
  id?: string;
  isProject?: boolean;
  path: string;
  type?: "folder" | "git";
};

type PendingFolderConfirmation = {
  path: string;
  wasTrusted: boolean;
};

type OfficialCoworkPromptInputHandle = {
  focus: () => void;
  getEditor: () => Editor | null;
  insertSlashCommand: () => void;
};

const noop = () => undefined;
const officialMenuPopupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const officialMenuScrollClass = "flex-1 min-h-0 flex flex-col overflow-y-auto";
const officialMenuItemBaseClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const officialMenuIconStyle = { "--class-base-icon": "14px" } as CSSProperties;
const coworkModelItems = [
  { label: "Default model", value: "default" },
  { label: "Opus 4", value: "claude-opus-4" },
  { label: "Sonnet", value: "claude-sonnet-4" },
];

const coworkPermissionItems: Array<{ icon: string; label: string; value: PermissionMode }> = [
  { icon: "Hand4FingerStop", label: "Ask", value: "default" },
  { icon: "Warning", label: "Act", value: "auto" },
];

type OfficialCoworkComposerBridge = Pick<CoworkSessionsBridge,
  | "addTrustedFolder" | "clearSession" | "forkSession" | "getSupportedCommands"
  | "isFolderTrusted" | "launchUltrareview" | "rewind" | "setMcpServers" | "submitFeedback"
>;

export function OfficialCoworkPromptBox({
  busy,
  focusRequestKey = 0,
  model,
  onAddFiles,
  onModelChange,
  onNavigate,
  onPermissionModeChange,
  onProjectSelect,
  onRemoveFile,
  onRemoveProject,
  onSubmit,
  onWorkspaceChange,
  permissionMode,
  projectMenuItems = [],
  prompt,
  selectedFiles = [],
  selectedProjects = [],
  setPrompt,
  workspace,
}: OfficialCoworkPromptBoxProps) {
  const inputRef = useRef<OfficialCoworkPromptInputHandle | null>(null);
  const recentFolders = useOfficialCoworkRecentFolders();
  const selectedFolders = workspace.folders ?? [];
  const modelItems: OfficialDropdownItem[] = coworkModelItems.map((item, index) => ({
    checked: item.value === model,
    label: item.label,
    noQuickKey: index === 0,
    onSelect: () => onModelChange(item.value),
  }));
  const modelLabel = coworkModelItems.find((item) => item.value === model)?.label ?? "Default model";
  const permissionItems: OfficialDropdownItem[] = coworkPermissionItems.map((item) => ({
    checked: item.value === permissionMode,
    icon: item.icon,
    label: item.label,
    onSelect: () => onPermissionModeChange(item.value),
  }));
  const permissionLabel = coworkPermissionItems.find((item) => item.value === permissionMode)?.label ?? "Ask";

  const updateSelectedFolders = useCallback((folders: string[]) => {
    onWorkspaceChange({ ...workspace, folders: uniqueStrings(folders) });
  }, [onWorkspaceChange, workspace]);

  const addFolder = useCallback(async () => {
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(true);
    if (paths?.length) updateSelectedFolders([...selectedFolders, ...paths]);
  }, [selectedFolders, updateSelectedFolders]);

  const addMenuItems: OfficialDropdownItem[] = useMemo(() => (onAddFiles
    ? createCoworkAddMenuItems({ includeAddFolder: true, onAddFiles, onAddFolder: addFolder, onNavigate, onSelectProject: onProjectSelect, projects: projectMenuItems })
    : [{ icon: "Folder1", label: "Add folder", onSelect: addFolder }]), [addFolder, onAddFiles, onNavigate, onProjectSelect, projectMenuItems]);

  useEffect(() => {
    if (focusRequestKey > 0) window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [focusRequestKey]);

  return (
    <div>
      <fieldset className="flex w-full min-w-0 flex-col">
        <input aria-hidden="true" className="absolute -z-10 h-0 w-0 overflow-hidden opacity-0 select-none" data-testid="file-upload" tabIndex={-1} type="file" />
        <div className="relative">
          <div
            className="!box-content flex flex-col bg-bg-000 mx-2 md:mx-0 items-stretch transition-all duration-200 relative z-10 rounded-[20px] cursor-text relative z-[1] border border-transparent md:w-full shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-300)/0.15)] hover:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/3.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)] hover:focus-within:shadow-[0_0.25rem_1.25rem_hsl(var(--always-black)/7.5%),0_0_0_0.5px_hsla(var(--border-200)/0.3)]"
            onClick={(event) => {
              if (event.target instanceof HTMLElement && event.target.closest("button")) return;
              inputRef.current?.focus();
            }}
          >
            <div className="flex flex-col m-3.5 gap-3">
              <div className="relative font-large">
                <OfficialCoworkPromptInput
                  bridge={desktopBridge.LocalAgentModeSessions}
                  disabled={busy}
                  onChange={setPrompt}
                  onSubmit={onSubmit}
                  placeholder="今天我可以帮助你做什么？"
                  ref={inputRef}
                  slashCwd={workspace.cwd}
                  value={prompt}
                />
              </div>
              <CoworkSelectedFiles files={selectedFiles} onRemove={onRemoveFile ?? noop} />
              <CoworkSelectedProjectIndicators onRemove={onRemoveProject ?? noop} projects={selectedProjects} />
              <OfficialCoworkToolbar
                addMenuItems={addMenuItems}
                busy={busy}
                onSubmit={onSubmit}
                prompt={prompt}
              />
            </div>
          </div>
        </div>
      </fieldset>
      <OfficialCoworkChin
        busy={busy}
        modelItems={modelItems}
        modelLabel={modelLabel}
        permissionItems={permissionItems}
        permissionLabel={permissionLabel}
        recentFolders={recentFolders}
        selectedFolders={selectedFolders}
        updateSelectedFolders={updateSelectedFolders}
        workspace={workspace}
      />
    </div>
  );
}

function OfficialCoworkToolbar({
  addMenuItems,
  busy,
  onSubmit,
  prompt,
}: {
  addMenuItems: OfficialDropdownItem[];
  busy: boolean;
  onSubmit: () => void;
  prompt: string;
}) {
  const hasDraftContent = prompt.trim().length > 0;
  return (
    <div className="relative flex gap-2 w-full items-center">
      <div className="relative flex-1 flex items-center shrink min-w-0 gap-1">
        <div>
          <OfficialCoworkAddMenu items={addMenuItems} disabled={busy} />
        </div>
      </div>
      <div className={`shrink-0 flex items-center ${hasDraftContent ? "w-8 z-10 justify-end" : ""}`}>
        <OfficialCoworkSendButton
          disabled={busy || !hasDraftContent}
          isNewAgentModeChat
          onSend={onSubmit}
        />
      </div>
    </div>
  );
}

function OfficialCoworkChin({
  busy,
  modelItems,
  modelLabel,
  permissionItems,
  permissionLabel,
  recentFolders,
  selectedFolders,
  updateSelectedFolders,
  workspace,
}: {
  busy: boolean;
  modelItems: OfficialDropdownItem[];
  modelLabel: ReactNode;
  permissionItems: OfficialDropdownItem[];
  permissionLabel: ReactNode;
  recentFolders: OfficialCoworkFolderTarget[];
  selectedFolders: string[];
  updateSelectedFolders: (folders: string[]) => void;
  workspace: WorkspaceContext;
}) {
  return (
    <div className="relative z-0 !box-content mx-2 -mt-5 rounded-b-[20px] border border-transparent bg-always-black/[0.01] shadow-[inset_0_0_0_0.5px_hsl(var(--bg-000)/0.8),0_0_0_0.5px_hsl(var(--border-300)/0.18)] backdrop-blur-[2px] md:mx-0 md:w-full">
      <div className="flex items-center gap-1 px-2 pb-2 pt-7">
        <div className="min-w-0">
          <OfficialCoworkFolderPicker
            bridge={desktopBridge.LocalAgentModeSessions}
            defaultTarget={workspace.cwd ? { path: workspace.cwd, displayName: basename(workspace.cwd), type: "folder" } : null}
            disabled={busy}
            onSelectedFoldersChange={updateSelectedFolders}
            placeholder="在项目中工作"
            recentTargets={recentFolders}
            selectedFolders={selectedFolders}
          />
        </div>
        <OfficialCoworkPermissionModeSelector
          disabled={busy}
          items={permissionItems}
          label={permissionLabel}
        />
        <div className="ml-auto flex items-center gap-1">
          <OfficialCoworkModelSelector
            disabled={busy}
            items={modelItems}
            label={modelLabel}
            triggerClassName="!rounded-xl !h-9"
          />
        </div>
      </div>
    </div>
  );
}

function OfficialCoworkAddMenu({ disabled, items }: { disabled?: boolean; items: OfficialDropdownItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        aria-label="Add files, connectors, and more"
        className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled ring-focus !rounded-lg hover:!bg-bg-200 aria-expanded:!bg-bg-300 active:!scale-100 ml-[2px] h-8 w-8 justify-center"
        disabled={disabled}
      >
        <Icon name="PlusSmall" customSize={16} />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" alignOffset={-10} className="epitaxy-root z-[60]" side="bottom" sideOffset={4}>
          <Menu.Popup className={`${officialMenuPopupClass} max-h-[min(var(--available-height),24rem)]`} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                {items.map((item) => (
                  <Menu.Item
                    className={[officialMenuItemBaseClass, "gap-g3"].join(" ")}
                    key={String(item.label)}
                    onClick={() => {
                      item.onSelect?.();
                      setOpen(false);
                    }}
                  >
                    {item.icon ? (
                      <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
                        <Icon name={item.icon} size="m" />
                      </span>
                    ) : null}
                    <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label}</span>
                  </Menu.Item>
                ))}
              </Menu.Group>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function OfficialCoworkModelSelector({
  disabled,
  items,
  label,
  triggerClassName,
}: {
  disabled?: boolean;
  items: OfficialDropdownItem[];
  label: ReactNode;
  triggerClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Menu.Root open={!disabled && open} onOpenChange={(nextOpen) => {
      if (!disabled) setOpen(nextOpen);
    }}>
      <div className="overflow-hidden shrink-0 p-1 -m-1">
        <Menu.Trigger
          aria-label={`Model: ${typeof label === "string" ? label : "selected"}`}
          className={[
            "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus h-small rounded-small text-footnote justify-between pl-p5 pr-p2 text-text-300 hover:!bg-bg-200",
            open ? "!bg-bg-200 !text-text-100" : "",
            triggerClassName ?? "",
          ].join(" ")}
          data-testid="model-selector-dropdown"
          disabled={disabled}
        >
          <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{label}</span>
          <Icon name="ChevronDownSmall" size="xs" className="shrink-0 opacity-75" />
        </Menu.Trigger>
      </div>
      <Menu.Portal>
        <Menu.Positioner align="end" className="epitaxy-root z-[60] text-text-300" side="top" sideOffset={4}>
          <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                {items.map((item) => (
                  <Menu.Item
                    className={[officialMenuItemBaseClass, "gap-g3 pr-p6"].join(" ")}
                    data-checked={item.checked || undefined}
                    key={String(item.label)}
                    onClick={() => {
                      item.onSelect?.();
                      setOpen(false);
                    }}
                  >
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    {item.checked ? <Icon name="CheckSelection" size="sm" className="text-accent-100 mr-1.5" /> : null}
                  </Menu.Item>
                ))}
              </Menu.Group>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function OfficialCoworkPermissionModeSelector({
  disabled,
  items,
  label,
}: {
  disabled?: boolean;
  items: OfficialDropdownItem[];
  label: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const selectedItem = items.find((item) => item.checked);
  return (
    <Menu.Root open={!disabled && open} onOpenChange={(nextOpen) => {
      if (!disabled) setOpen(nextOpen);
    }}>
      <Menu.Trigger
        aria-label={`Mode: ${typeof label === "string" ? label : "selected"}`}
        className={[
          "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-body hover:!bg-bg-200 !text-text-300 !px-2 !h-9 !min-w-0 !rounded-xl bg-transparent transition-colors active:!scale-100 disabled:text-uncontained-disabled",
          open ? "!bg-bg-200 !text-text-100" : "",
        ].join(" ")}
        disabled={disabled}
      >
        {selectedItem?.icon ? <span className="text-text-300 mr-0.5"><Icon name={selectedItem.icon} customSize={16} /></span> : null}
        <span className="text-text-300 truncate">{label}</span>
        <Icon name="ChevronDownSmall" customSize={12} className="text-text-500" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60] text-text-300" side="bottom" sideOffset={4}>
          <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                {items.map((item) => (
                  <Menu.Item
                    className={[officialMenuItemBaseClass, "gap-g3 pr-p6"].join(" ")}
                    data-checked={item.checked || undefined}
                    key={String(item.label)}
                    onClick={() => {
                      item.onSelect?.();
                      setOpen(false);
                    }}
                  >
                    {item.icon ? (
                      <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
                        <Icon name={item.icon} size="m" />
                      </span>
                    ) : null}
                    <span className="flex-1 min-w-0 truncate">{item.label}</span>
                    {item.checked ? <Icon name="CheckSelection" size="sm" className="text-accent-100 mr-1.5" /> : null}
                  </Menu.Item>
                ))}
              </Menu.Group>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function OfficialCoworkSendButton({
  disabled,
  isNewAgentModeChat = false,
  onSend,
}: {
  disabled?: boolean;
  isNewAgentModeChat?: boolean;
  onSend: () => void;
}) {
  return (
    <div>
      <button
        aria-label={isNewAgentModeChat ? "Start task" : "Send message"}
        className="group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring text-primary-default disabled:text-primary-disabled !rounded-lg !h-8 !w-8 disabled:cursor-default justify-center"
        disabled={disabled}
        onClick={onSend}
        type="button"
      >
        <span aria-hidden="true" className="btn-squish absolute inset-0 -z-[1] rounded-[inherit]" style={{ backgroundColor: "#e6b5a6" }} />
        <Icon name="ArrowUp" customSize={16} bold />
      </button>
    </div>
  );
}

const OfficialCoworkPromptInput = forwardRef<OfficialCoworkPromptInputHandle, {
  bridge: OfficialCoworkComposerBridge;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  placeholder: string;
  slashCwd?: string;
  value: string;
}>(function OfficialCoworkPromptInput({
  bridge,
  disabled = false,
  onChange,
  onSubmit,
  placeholder,
  slashCwd,
  value,
}, ref) {
  const editorRef = useRef<Editor | null>(null);
  const submitRef = useRef(onSubmit);
  const disabledRef = useRef(disabled);
  const slashMenuStateRef = useRef({ bridge, slashCwd });
  submitRef.current = onSubmit;
  disabledRef.current = disabled;
  slashMenuStateRef.current = { bridge, slashCwd };

  const slashMenuComponent = useMemo(() => function OfficialCoworkSlashCommandMenuRenderer(props: OfficialSlashCommandMenuProps) {
    const state = slashMenuStateRef.current;
    const draftSession = state.slashCwd ? {
      id: "__cowork_draft__",
      title: "Draft",
      createdAtMs: 0,
      updatedAt: "",
      updatedAtMs: 0,
      kind: "epitaxy",
      sessionKind: "cowork",
      cwd: state.slashCwd,
    } satisfies SessionSummary : null;
    return <OfficialEpitaxySlashCommandMenu {...props} bridge={state.bridge} session={draftSession} sessionRef={null} />;
  }, []);

  const editor = useEditor({
    content: tiptapDocFromPlainText(value),
    editable: !disabled,
    editorProps: {
      attributes: {
        "aria-label": "Prompt",
        class: "tiptap",
        "data-placeholder": placeholder,
      },
      handleKeyDown: (_view, event) => {
        const slashStorage = (editorRef.current?.storage as unknown as Record<string, unknown> | undefined)?.["slash-command-suggestion"] as { hasVisibleItems?: boolean; isActive?: boolean } | undefined;
        const hasSlashMenu = Boolean(slashStorage?.isActive && slashStorage?.hasVisibleItems);
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey) && !hasSlashMenu) {
          event.preventDefault();
          if (!disabledRef.current) submitRef.current();
          return true;
        }
        return false;
      },
    },
    extensions: [
      StarterKit.configure({
        blockquote: false,
        bulletList: false,
        code: false,
        heading: false,
        horizontalRule: false,
        listItem: false,
        orderedList: false,
      }),
      OfficialSkillChip,
      OfficialSlashCommandSuggestion.configure({ placement: "onpage", menuComponent: slashMenuComponent }),
    ],
    onCreate: ({ editor }) => {
      editorRef.current = editor;
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getText({ blockSeparator: "\n" }));
    },
  }, [slashMenuComponent]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    getEditor: () => editor ?? null,
    insertSlashCommand: () => editor?.chain().focus("start").insertContent("/").run(),
  }), [editor]);

  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [disabled, editor]);

  useEffect(() => {
    if (!editor) return;
    const current = editor.getText({ blockSeparator: "\n" });
    if (current !== value) editor.commands.setContent(tiptapDocFromPlainText(value), { emitUpdate: false });
  }, [editor, value]);

  const isEmpty = value.trim().length === 0;
  return (
    <>
      <EditorContent
        className={`block [outline:none!important] resize-none w-full bg-transparent text-text-100 placeholder:text-text-400 border-0 [&_.tiptap]:min-h-[48px] [&_.tiptap]:max-h-[218px] [&_.tiptap]:overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap]:border-0 [&_.tiptap]:p-0 [&_.tiptap_p]:m-0 ${isEmpty ? "[&_.is-editor-empty]:before:!content-['']" : ""}`}
        editor={editor}
      />
      {isEmpty ? <p aria-hidden="true" className="self-start absolute pointer-events-none inset-0 text-text-500 line-clamp-2">{placeholder}</p> : null}
    </>
  );
});

function OfficialCoworkFolderPicker({
  bridge,
  defaultTarget,
  disabled,
  onSelectedFoldersChange,
  placeholder = "在项目中工作",
  recentTargets,
  selectedFolders,
}: {
  bridge: OfficialCoworkComposerBridge;
  defaultTarget: OfficialCoworkFolderTarget | null;
  disabled?: boolean;
  onSelectedFoldersChange: (folders: string[]) => void;
  placeholder?: string;
  recentTargets: OfficialCoworkFolderTarget[];
  selectedFolders: string[];
}) {
  const [open, setOpen] = useState(false);
  const [pendingConfirmations, setPendingConfirmations] = useState<PendingFolderConfirmation[]>([]);
  const [defaultFolderPath, setDefaultFolderPath] = useState<string | null>(defaultTarget?.path ?? null);
  const pending = pendingConfirmations[0] ?? null;
  const targetByPath = useMemo(() => {
    const map = new Map<string, OfficialCoworkFolderTarget>();
    if (defaultTarget) map.set(defaultTarget.path, defaultTarget);
    for (const target of recentTargets) if (!map.has(target.path)) map.set(target.path, target);
    return map;
  }, [defaultTarget, recentTargets]);
  const selectedLabel = useMemo(() => {
    if (selectedFolders.length === 0) return placeholder;
    const first = selectedFolders[0];
    const firstLabel = targetByPath.get(first)?.displayName ?? basename(first) ?? first;
    return selectedFolders.length === 1 ? firstLabel : `${firstLabel} +${selectedFolders.length - 1}`;
  }, [placeholder, selectedFolders, targetByPath]);
  const hasPopup = Boolean(defaultTarget || recentTargets.length > 0);

  useEffect(() => {
    setDefaultFolderPath((current) => current ?? defaultTarget?.path ?? null);
  }, [defaultTarget?.path]);

  const toggleSelectedFolder = useCallback((path: string) => {
    onSelectedFoldersChange(togglePath(selectedFolders, path));
  }, [onSelectedFoldersChange, selectedFolders]);

  const addTrustedFolder = useCallback((path: string) => {
    onSelectedFoldersChange(uniqueStrings([...selectedFolders, path]));
  }, [onSelectedFoldersChange, selectedFolders]);

  const selectWithTrustCheck = useCallback(async (path: string) => {
    if (selectedFolders.includes(path)) {
      toggleSelectedFolder(path);
      return;
    }
    const wasTrusted = await bridge.isFolderTrusted?.(path).catch(() => false) ?? false;
    if (wasTrusted) {
      toggleSelectedFolder(path);
      return;
    }
    setPendingConfirmations((current) => [...current, { path, wasTrusted }]);
  }, [bridge, selectedFolders, toggleSelectedFolder]);

  const addWithTrustCheck = useCallback(async (paths: string[]) => {
    const uniquePaths = uniqueStrings(paths).filter((path) => !selectedFolders.includes(path));
    if (uniquePaths.length === 0) return;
    const trusted: string[] = [];
    const confirmations: PendingFolderConfirmation[] = [];
    for (const path of uniquePaths) {
      const wasTrusted = await bridge.isFolderTrusted?.(path).catch(() => false) ?? false;
      if (wasTrusted) trusted.push(path);
      else confirmations.push({ path, wasTrusted });
    }
    if (trusted.length > 0) onSelectedFoldersChange(uniqueStrings([...selectedFolders, ...trusted]));
    if (confirmations.length > 0) setPendingConfirmations((current) => [...current, ...confirmations]);
  }, [bridge, onSelectedFoldersChange, selectedFolders]);

  const chooseDifferentFolder = useCallback(async () => {
    setOpen(false);
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(true);
    if (paths?.length) await addWithTrustCheck(paths);
  }, [addWithTrustCheck]);

  const clearPending = useCallback(() => {
    setPendingConfirmations((current) => current.slice(1));
  }, []);

  const toggleDefaultFolder = useCallback((path: string) => {
    setDefaultFolderPath((current) => current === path ? null : path);
  }, []);

  const trigger = (
    <Menu.Trigger
      className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus w-full text-body justify-between !pl-3 !pr-2 !h-9 !rounded-xl bg-transparent hover:!bg-bg-200 transition-colors text-text-300 active:!scale-100 disabled:text-uncontained-disabled"
      disabled={disabled}
      title={selectedFolders.join(", ")}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <Icon name="Folder1" customSize={16} />
        <span className="truncate w-full">{selectedLabel}</span>
      </div>
      {hasPopup ? <Icon name="ChevronDownSmall" size="xs" className="ml-1 mr-1 text-text-400" /> : null}
    </Menu.Trigger>
  );

  return (
    <>
      <Menu.Root open={open} onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
      }}>
        {hasPopup ? trigger : (
          <button
            className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus w-full text-body justify-between !pl-3 !pr-2 !h-9 !rounded-xl bg-transparent hover:!bg-bg-200 transition-colors text-text-300 active:!scale-100"
            disabled={disabled}
            onClick={chooseDifferentFolder}
            type="button"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon name="Folder1" customSize={16} />
              <span className="truncate w-full">{selectedLabel}</span>
            </div>
          </button>
        )}
        {hasPopup ? (
          <Menu.Portal>
            <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
              <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
                <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
                <div className={officialMenuScrollClass}>
                  {defaultTarget ? (
                    <Menu.Group className="flex flex-col">
                      <OfficialCoworkMenuHeader>Default</OfficialCoworkMenuHeader>
                      <OfficialCoworkFolderItem
                        isDefault={defaultFolderPath === defaultTarget.path}
                        isSelected={selectedFolders.includes(defaultTarget.path)}
                        onToggleDefault={toggleDefaultFolder}
                        onSelect={() => {
                          setOpen(false);
                          void selectWithTrustCheck(defaultTarget.path);
                        }}
                        target={defaultTarget}
                      />
                      {recentTargets.length > 0 ? <OfficialCoworkMenuSeparator /> : null}
                    </Menu.Group>
                  ) : null}
                  {recentTargets.length > 0 ? (
                    <Menu.Group className="flex flex-col">
                      {recentTargets.map((target) => (
                        <OfficialCoworkFolderItem
                          isDefault={defaultFolderPath === target.path}
                          isSelected={selectedFolders.includes(target.path)}
                          key={target.path}
                          onToggleDefault={toggleDefaultFolder}
                          onSelect={() => {
                            setOpen(false);
                            void selectWithTrustCheck(target.path);
                          }}
                          target={target}
                        />
                      ))}
                    </Menu.Group>
                  ) : null}
                  <OfficialCoworkMenuSeparator />
                  <Menu.Item className={[officialMenuItemBaseClass, "gap-g3"].join(" ")} onClick={chooseDifferentFolder}>
                    <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
                      <Icon name="Folder1" size="m" />
                    </span>
                    <span className="flex-1 min-w-0 truncate pr-[16px]">Choose a different folder</span>
                  </Menu.Item>
                </div>
              </Menu.Popup>
            </Menu.Positioner>
          </Menu.Portal>
        ) : null}
      </Menu.Root>
      <OfficialCoworkFolderTrustDialog
        bridge={bridge}
        onAlwaysAllow={async (path) => {
          await bridge.addTrustedFolder?.(path);
          addTrustedFolder(path);
          clearPending();
        }}
        onCancel={clearPending}
        onConfirm={(path) => {
          addTrustedFolder(path);
          clearPending();
        }}
        pending={pending}
      />
    </>
  );
}

function OfficialCoworkFolderItem({
  isDefault,
  isSelected,
  onToggleDefault,
  onSelect,
  target,
  withSeparator,
}: {
  isDefault?: boolean;
  isSelected: boolean;
  onToggleDefault?: (path: string) => void;
  onSelect: () => void;
  target: OfficialCoworkFolderTarget;
  withSeparator?: boolean;
}) {
  const label = target.displayName ?? basename(target.path) ?? target.path;
  const iconName = target.isProject ? "Projects" : target.type === "git" ? "GitBranch" : "Folder1";
  const defaultLabel = isDefault ? "Remove default" : "Set as default";
  return (
    <>
      {withSeparator ? <OfficialCoworkMenuSeparator /> : null}
      <Menu.Item aria-checked={isSelected} className={[officialMenuItemBaseClass, "group gap-g3"].join(" ")} onClick={onSelect} role="menuitemradio" title={target.path}>
        <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
          <Icon name={iconName} size="m" />
        </span>
        <span className="flex flex-col min-w-0 flex-1 py-p2 pr-[16px]">
          <span className="truncate">{label}</span>
          <span className="truncate text-footnote text-t6">{target.path}</span>
        </span>
        <span className="flex items-center gap-1 shrink-0 ml-[6px]">
          {onToggleDefault ? (
            <button
              aria-label={defaultLabel}
              className={`p-0.5 rounded transition-colors ${isDefault ? "text-accent-100" : "text-text-500 opacity-0 group-hover:opacity-100 hover:text-text-300"}`}
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                onToggleDefault(target.path);
              }}
              type="button"
            >
              <Icon name={isDefault ? "StarFilled" : "Star"} customSize={14} />
            </button>
          ) : null}
          {isSelected ? <Icon name="CheckSelection" size="sm" className="text-accent-100" /> : null}
        </span>
      </Menu.Item>
    </>
  );
}

function OfficialCoworkFolderTrustDialog({
  bridge,
  onAlwaysAllow,
  onCancel,
  onConfirm,
  pending,
}: {
  bridge: Pick<OfficialCoworkComposerBridge, "addTrustedFolder">;
  onAlwaysAllow: (path: string) => void | Promise<void>;
  onCancel: () => void;
  onConfirm: (path: string) => void;
  pending: PendingFolderConfirmation | null;
}) {
  const directory = basename(pending?.path) ?? pending?.path ?? "";
  const title = pending?.wasTrusted
    ? `You've allowed this folder before. Continue to add "${directory}"?`
    : `Allow Claude to change files in "${directory}"?`;
  const description = pending?.wasTrusted
    ? "You've allowed this folder before. Continue to add it to this session."
    : "This includes all files and subfolders. Claude will be able to read, edit, and permanently delete—and may share file contents with third-party tools it connects to. Be careful about exposing sensitive information.";

  return (
    <Dialog.Root open={pending !== null} onOpenChange={(open) => {
      if (!open) onCancel();
    }}>
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none" />
        <Dialog.Popup className="epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-2rem)] draggable-none outline-none">
          <div className="relative isolate rounded-r6 flex flex-col">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className="flex items-center justify-between gap-g4 px-[24px] pt-[24px]">
              <Dialog.Title className="text-heading-semibold text-t9">{title}</Dialog.Title>
            </div>
            <div className="px-[24px] pb-[24px] pt-[12px]">
              <div className="mt-1 mb-2">
                <div className="text-text-300 whitespace-pre-line">{description}</div>
                {pending?.path ? <div className="bg-bg-100 text-text-200 mt-3 break-all rounded px-2 py-1 font-mono text-xs">{pending.path}</div> : null}
              </div>
              <div className="flex justify-end gap-g4 pt-[12px]">
                <OfficialButton onClick={onCancel} variant="contained">Cancel</OfficialButton>
                {pending?.wasTrusted || !bridge.addTrustedFolder ? null : <OfficialButton onClick={() => pending && void onAlwaysAllow(pending.path)} variant="contained">Always allow</OfficialButton>}
                <OfficialButton onClick={() => pending && onConfirm(pending.path)} variant="primary">{pending?.wasTrusted ? "Continue" : "Allow"}</OfficialButton>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function OfficialCoworkMenuHeader({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">
      <span className="flex-1 pr-p8">{children}</span>
    </div>
  );
}

function OfficialCoworkMenuSeparator() {
  return (
    <Menu.Separator className="relative h-h1">
      <div className="absolute left-[12px] right-[12px] top-1/2 h-px rounded-[1px] bg-t3" />
    </Menu.Separator>
  );
}

function useOfficialCoworkRecentFolders() {
  const [targets, setTargets] = useState<OfficialCoworkFolderTarget[]>([]);

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.LocalAgentModeSessions.list().catch(() => []),
      desktopBridge.LocalSessions.list().catch(() => []),
    ]).then(([agentSessions, codeSessions]) => {
      if (!alive) return;
      setTargets(buildOfficialCoworkFolderTargets([...agentSessions, ...codeSessions]));
    });
    return () => {
      alive = false;
    };
  }, []);

  return targets;
}

function buildOfficialCoworkFolderTargets(sessions: SessionSummary[]): OfficialCoworkFolderTarget[] {
  const seen = new Set<string>();
  const targets: OfficialCoworkFolderTarget[] = [];
  for (const session of sessions.sort((a, b) => (b.updatedAtMs ?? 0) - (a.updatedAtMs ?? 0))) {
    for (const path of [session.cwd, ...(session.folders ?? [])]) {
      if (!path || seen.has(path)) continue;
      seen.add(path);
      targets.push({
        displayName: basename(path),
        path,
        type: session.repo?.branch ? "git" : "folder",
      });
      if (targets.length >= 10) return targets;
    }
  }
  return targets;
}

function togglePath(paths: string[], path: string) {
  return paths.includes(path) ? paths.filter((item) => item !== path) : [...paths, path];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.filter((value) => value.length > 0))];
}

function tiptapDocFromPlainText(value: string) {
  const lines = value.split("\n");
  return {
    type: "doc",
    content: (lines.length ? lines : [""]).map((line) => ({
      type: "paragraph",
      content: line ? [{ type: "text", text: line }] : undefined,
    })),
  };
}

function basename(value?: string | null): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
