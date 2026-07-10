import { Menu } from "@base-ui-components/react/menu";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { CoworkFolderTrustDialog, type CoworkFolderConfirmation } from "./CoworkFolderTrustDialog";

export type CoworkFolderTarget = {
  displayName?: string;
  isProject?: boolean;
  path: string;
  type?: "folder" | "git";
};

const popupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const itemClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover";
const iconStyle = { "--class-base-icon": "14px" } as CSSProperties;

export function CoworkFolderPicker({ bridge, defaultTarget, disabled, onSelectedFoldersChange, placeholder = "在项目中工作", recentTargets, selectedFolders }: { bridge: LocalSessionsBridge; defaultTarget: CoworkFolderTarget | null; disabled?: boolean; onSelectedFoldersChange: (folders: string[]) => void; placeholder?: string; recentTargets: CoworkFolderTarget[]; selectedFolders: string[] }) {
  const [open, setOpen] = useState(false);
  const [confirmations, setConfirmations] = useState<CoworkFolderConfirmation[]>([]);
  const [defaultFolderPath, setDefaultFolderPath] = useState<string | null>(defaultTarget?.path ?? null);
  const targetByPath = useMemo(() => folderTargetsByPath(defaultTarget, recentTargets), [defaultTarget, recentTargets]);
  const selectedLabel = folderSelectionLabel(selectedFolders, targetByPath, placeholder);
  const actions = useFolderActions({ bridge, confirmations, onSelectedFoldersChange, selectedFolders, setConfirmations, setOpen });
  useEffect(() => setDefaultFolderPath((current) => current ?? defaultTarget?.path ?? null), [defaultTarget?.path]);
  return (
    <>
      <Menu.Root onOpenChange={setOpen} open={open}>
        <FolderPickerTrigger disabled={disabled} label={selectedLabel} selectedFolders={selectedFolders} />
        <Menu.Portal><Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
          <Menu.Popup className={popupClass} data-cds="Menu"><span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-surface-popover effect-hud" />
            <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
              {defaultTarget ? <><div className="px-p8 py-p2 text-footnote text-t6">Default</div><FolderTargetItem defaultFolderPath={defaultFolderPath} onSelect={actions.selectWithTrustCheck} onToggleDefault={setDefaultFolderPath} selectedFolders={selectedFolders} target={defaultTarget} /><MenuSeparator /></> : null}
              {recentTargets.map((target) => <FolderTargetItem defaultFolderPath={defaultFolderPath} key={target.path} onSelect={actions.selectWithTrustCheck} onToggleDefault={setDefaultFolderPath} selectedFolders={selectedFolders} target={target} />)}
              <MenuSeparator />
              <Menu.Item className={`${itemClass} gap-g3`} onClick={actions.chooseDifferentFolder}><span className="flex size-[14px] items-center justify-center" style={iconStyle}><Icon name="Folder1" size="m" /></span><span className="flex-1 truncate pr-[16px]">Choose a different folder</span></Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner></Menu.Portal>
      </Menu.Root>
      <CoworkFolderTrustDialog bridge={bridge} onAlwaysAllow={actions.alwaysAllow} onCancel={actions.clearPending} onConfirm={actions.confirm} pending={confirmations[0] ?? null} />
    </>
  );
}

function useFolderActions(input: { bridge: LocalSessionsBridge; confirmations: CoworkFolderConfirmation[]; onSelectedFoldersChange: (folders: string[]) => void; selectedFolders: string[]; setConfirmations: React.Dispatch<React.SetStateAction<CoworkFolderConfirmation[]>>; setOpen: (open: boolean) => void }) {
  const addFolder = useCallback((path: string) => input.onSelectedFoldersChange(uniqueStrings([...input.selectedFolders, path])), [input]);
  const clearPending = () => input.setConfirmations((current) => current.slice(1));
  const selectWithTrustCheck = async (path: string) => {
    if (input.selectedFolders.includes(path)) {
      input.onSelectedFoldersChange(input.selectedFolders.filter((item) => item !== path));
      return;
    }
    const wasTrusted = await input.bridge.isFolderTrusted?.(path).catch(() => false) ?? false;
    if (wasTrusted) addFolder(path);
    else input.setConfirmations((current) => [...current, { path, wasTrusted }]);
  };
  const chooseDifferentFolder = async () => {
    input.setOpen(false);
    const paths = await desktopBridge.Preferences.getDirectoryPath?.(true);
    if (paths?.length) for (const path of paths) await selectWithTrustCheck(path);
  };
  const alwaysAllow = async (path: string) => { await input.bridge.addTrustedFolder?.(path); addFolder(path); clearPending(); };
  const confirm = (path: string) => { addFolder(path); clearPending(); };
  return { alwaysAllow, chooseDifferentFolder, clearPending, confirm, selectWithTrustCheck };
}

function FolderPickerTrigger({ disabled, label, selectedFolders }: { disabled?: boolean; label: string; selectedFolders: string[] }) {
  return <Menu.Trigger className="group/dd relative isolate inline-flex items-center min-w-0 w-full border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-body justify-between !pl-3 !pr-2 !h-9 !rounded-xl bg-transparent hover:!bg-bg-200 transition-colors text-text-300 active:!scale-100" disabled={disabled} title={selectedFolders.join(", ")}><span className="flex min-w-0 items-center gap-1.5"><Icon customSize={16} name="Folder1" /><span className="truncate">{label}</span></span><Icon className="ml-1 mr-1 text-text-400" name="ChevronDownSmall" size="xs" /></Menu.Trigger>;
}

function FolderTargetItem({ defaultFolderPath, onSelect, onToggleDefault, selectedFolders, target }: { defaultFolderPath: string | null; onSelect: (path: string) => void; onToggleDefault: (path: string | null) => void; selectedFolders: string[]; target: CoworkFolderTarget }) {
  const selected = selectedFolders.includes(target.path);
  const isDefault = defaultFolderPath === target.path;
  return <Menu.Item aria-checked={selected} className={`${itemClass} group gap-g3`} onClick={() => void onSelect(target.path)} role="menuitemradio" title={target.path}><span className="flex size-[14px] items-center justify-center" style={iconStyle}><Icon name={target.isProject ? "Projects" : target.type === "git" ? "GitBranch" : "Folder1"} size="m" /></span><span className="flex min-w-0 flex-1 flex-col py-p2 pr-[16px]"><span className="truncate">{target.displayName ?? basename(target.path)}</span><span className="truncate text-footnote text-t6">{target.path}</span></span><button aria-label={isDefault ? "Remove default" : "Set as default"} className={`p-0.5 ${isDefault ? "text-accent-100" : "text-text-500 opacity-0 group-hover:opacity-100"}`} onClick={(event) => { event.preventDefault(); event.stopPropagation(); onToggleDefault(isDefault ? null : target.path); }} type="button"><Icon customSize={14} name={isDefault ? "StarFilled" : "Star"} /></button>{selected ? <Icon className="text-accent-100" name="CheckSelection" size="sm" /> : null}</Menu.Item>;
}

function folderTargetsByPath(defaultTarget: CoworkFolderTarget | null, recentTargets: CoworkFolderTarget[]) {
  const map = new Map<string, CoworkFolderTarget>();
  if (defaultTarget) map.set(defaultTarget.path, defaultTarget);
  recentTargets.forEach((target) => { if (!map.has(target.path)) map.set(target.path, target); });
  return map;
}

function folderSelectionLabel(selected: string[], targets: Map<string, CoworkFolderTarget>, placeholder: string) {
  if (selected.length === 0) return placeholder;
  const first = targets.get(selected[0])?.displayName ?? basename(selected[0]);
  return selected.length === 1 ? first : `${first} +${selected.length - 1}`;
}

function MenuSeparator() { return <Menu.Separator className="relative h-h1"><div className="absolute left-[12px] right-[12px] top-1/2 h-px bg-t3" /></Menu.Separator>; }
function uniqueStrings(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function basename(value: string) { return value.split(/[\\/]/).filter(Boolean).at(-1) ?? value; }
