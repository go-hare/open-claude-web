import { useEffect, useMemo, useState } from "react";
import type { PermissionMode, WorkspaceContext } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialDropdownButton, type OfficialDropdownItem } from "../OfficialEpitaxyComponents";
import { coworkModelLabel, coworkModelOptions, coworkPermissionModeLabel, coworkPermissionModeOptions, normalizeCoworkPermissionMode } from "./coworkOptions";
import { pickCoworkWorkspace } from "./coworkWorkspaceSelection";

type OpenCoworkChinMenu = "folder" | "mode" | "model" | null;

type CoworkExternalChinProps = {
  busy: boolean;
  model: string;
  onModelChange: (value: string) => void;
  onPermissionModeChange: (value: PermissionMode) => void;
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  permissionMode: PermissionMode;
  workspace: WorkspaceContext;
};

export function CoworkExternalChin({
  busy,
  model,
  onModelChange,
  onPermissionModeChange,
  onWorkspaceChange,
  permissionMode,
  workspace,
}: CoworkExternalChinProps) {
  const [openMenu, setOpenMenu] = useState<OpenCoworkChinMenu>(null);
  const [isChoosingFolder, setIsChoosingFolder] = useState(false);
  const folderItems = useFolderItems({ onWorkspaceChange, setIsChoosingFolder, workspace });
  const permissionItems = usePermissionItems(permissionMode, onPermissionModeChange, openMenu);
  const modelItems = useModelItems(model, onModelChange, openMenu);
  useComposerMenuShortcuts({ modelItems, openMenu, permissionItems, setOpenMenu });

  return (
    <div className="relative z-0 !box-content mx-2 -mt-5 rounded-b-[20px] border border-transparent bg-always-black/[0.01] shadow-[inset_0_0_0_0.5px_hsl(var(--bg-000)/0.8),0_0_0_0.5px_hsl(var(--border-300)/0.18)] backdrop-blur-[2px] md:mx-0 md:w-full">
      <div className="flex items-center gap-1 px-2 pb-2 pt-7">
        <CoworkFolderTargetButton busy={busy || isChoosingFolder} folderItems={folderItems} onMenuOpen={setOpenMenu} open={openMenu === "folder"} workspace={workspace} />
        <CoworkPermissionButton busy={busy || isChoosingFolder} onMenuOpen={setOpenMenu} open={openMenu === "mode"} permissionItems={permissionItems} permissionMode={permissionMode} />
        <div className="ml-auto flex items-center gap-1">
          <CoworkModelButton busy={busy || isChoosingFolder} model={model} modelItems={modelItems} onMenuOpen={setOpenMenu} open={openMenu === "model"} />
        </div>
      </div>
    </div>
  );
}

function CoworkFolderTargetButton({
  busy,
  folderItems,
  onMenuOpen,
  open,
  workspace,
}: {
  busy: boolean;
  folderItems: OfficialDropdownItem[];
  onMenuOpen: (menu: OpenCoworkChinMenu) => void;
  open: boolean;
  workspace: WorkspaceContext;
}) {
  return (
    <OfficialDropdownButton
      align="start"
      ariaLabel="工作文件夹"
      disabled={busy}
      header="Folders"
      items={folderItems}
      label={<FolderLabel workspace={workspace} />}
      mode="text"
      onOpenChange={(nextOpen) => onMenuOpen(nextOpen ? "folder" : null)}
      open={open}
      revealChevron="never"
      side="bottom"
      size="small"
      variant="uncontained"
    />
  );
}

function CoworkPermissionButton({
  busy,
  onMenuOpen,
  open,
  permissionItems,
  permissionMode,
}: {
  busy: boolean;
  onMenuOpen: (menu: OpenCoworkChinMenu) => void;
  open: boolean;
  permissionItems: OfficialDropdownItem[];
  permissionMode: PermissionMode;
}) {
  return (
    <OfficialDropdownButton
      align="start"
      ariaLabel="权限模式"
      disabled={busy}
      header="模式"
      items={permissionItems}
      label={<span className={permissionMode === "bypassPermissions" ? "text-extended-yellow" : undefined}>{coworkPermissionModeLabel(permissionMode)}</span>}
      mode="text"
      onOpenChange={(nextOpen) => onMenuOpen(nextOpen ? "mode" : null)}
      open={open}
      revealChevron="never"
      side="bottom"
      size="small"
      triggerKey="cmd+shift+m"
      variant="uncontained"
    />
  );
}

function CoworkModelButton({
  busy,
  model,
  modelItems,
  onMenuOpen,
  open,
}: {
  busy: boolean;
  model: string;
  modelItems: OfficialDropdownItem[];
  onMenuOpen: (menu: OpenCoworkChinMenu) => void;
  open: boolean;
}) {
  return (
    <OfficialDropdownButton
      align="end"
      ariaLabel="模型"
      disabled={busy}
      header="Models"
      items={modelItems}
      label={coworkModelLabel(model)}
      mode="text"
      onOpenChange={(nextOpen) => onMenuOpen(nextOpen ? "model" : null)}
      open={open}
      revealChevron="never"
      side="bottom"
      size="small"
      triggerKey="cmd+shift+i"
      variant="uncontained"
    />
  );
}

function FolderLabel({ workspace }: { workspace: WorkspaceContext }) {
  return (
    <span className="flex min-w-0 items-center gap-1">
      <Icon name="Folder1" customSize={16} />
      <span className="min-w-0 truncate">{folderDisplayName(workspace)}</span>
    </span>
  );
}

function useFolderItems({
  onWorkspaceChange,
  setIsChoosingFolder,
  workspace,
}: {
  onWorkspaceChange: (workspace: WorkspaceContext) => void;
  setIsChoosingFolder: (value: boolean) => void;
  workspace: WorkspaceContext;
}): OfficialDropdownItem[] {
  return useMemo(() => [
    { checked: true, icon: "Folder1", label: folderDisplayName(workspace) },
    {
      icon: "FolderOpen",
      label: "Choose a different folder",
      onSelect: () => void chooseCoworkFolder(onWorkspaceChange, setIsChoosingFolder),
      separatorBefore: true,
    },
  ], [onWorkspaceChange, setIsChoosingFolder, workspace]);
}

function usePermissionItems(permissionMode: PermissionMode, onChange: (value: PermissionMode) => void, openMenu: OpenCoworkChinMenu) {
  return useMemo(() => {
    const normalizedMode = normalizeCoworkPermissionMode(permissionMode);
    const items = coworkPermissionModeOptions.map((option) => ({
      checked: option.value === normalizedMode,
      label: option.label,
      onSelect: () => onChange(option.value),
    }));
    return openMenu === "mode" ? numberMenuItems(items) : items;
  }, [onChange, openMenu, permissionMode]);
}

function useModelItems(model: string, onChange: (value: string) => void, openMenu: OpenCoworkChinMenu) {
  return useMemo(() => {
    const items = coworkModelOptions.map((option) => ({ checked: option.value === model, label: option.label, onSelect: () => onChange(option.value) }));
    return openMenu === "model" ? numberMenuItems(items) : items;
  }, [model, onChange, openMenu]);
}

function useComposerMenuShortcuts({
  modelItems,
  openMenu,
  permissionItems,
  setOpenMenu,
}: {
  modelItems: OfficialDropdownItem[];
  openMenu: OpenCoworkChinMenu;
  permissionItems: OfficialDropdownItem[];
  setOpenMenu: (menu: OpenCoworkChinMenu) => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (handleNumberShortcut(event, openMenu === "mode" ? permissionItems : modelItems)) setOpenMenu(null);
      if (!event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key === "Escape") setOpenMenu(null);
      if (!isCommandShiftShortcut(event)) return;
      if (event.code === "KeyM") setOpenMenu("mode");
      if (event.code === "KeyI") setOpenMenu("model");
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [modelItems, openMenu, permissionItems, setOpenMenu]);
}

function handleNumberShortcut(event: KeyboardEvent, items: OfficialDropdownItem[]) {
  const hasOnlyDigit = !(event.metaKey || event.ctrlKey || event.altKey || event.shiftKey);
  if (!hasOnlyDigit || !event.code.startsWith("Digit")) return false;
  const item = items[Number(event.code.slice(5)) - 1];
  if (!item?.onSelect || item.disabled) return false;
  event.preventDefault();
  event.stopPropagation();
  item.onSelect();
  return true;
}

function numberMenuItems(items: OfficialDropdownItem[]): OfficialDropdownItem[] {
  let index = 0;
  return items.map((item) => {
    if (item.disabled || item.noQuickKey || index >= 9) return item;
    index += 1;
    return { ...item, shortcut: String(index) };
  });
}

function folderDisplayName(workspace: WorkspaceContext) {
  return workspace.projectName || workspace.cwd?.split("/").filter(Boolean).at(-1) || "当前文件夹";
}

async function chooseCoworkFolder(
  onWorkspaceChange: (workspace: WorkspaceContext) => void,
  setIsChoosingFolder: (value: boolean) => void,
) {
  setIsChoosingFolder(true);
  try {
    const selectedWorkspace = await pickCoworkWorkspace();
    if (selectedWorkspace) onWorkspaceChange(selectedWorkspace);
  } finally {
    setIsChoosingFolder(false);
  }
}

function isCommandShiftShortcut(event: KeyboardEvent) {
  return (event.metaKey || event.ctrlKey) && event.shiftKey && !event.altKey;
}
