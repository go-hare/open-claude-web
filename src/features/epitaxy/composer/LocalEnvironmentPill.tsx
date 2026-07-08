import { useEffect, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import {
  OfficialButton,
  OfficialModal,
  officialComposerPillClass,
} from "../OfficialEpitaxyComponents";
import {
  formatLocalEnvironmentEnv,
  LOCAL_ENV_PLACEHOLDER,
  parseLocalEnvironmentInput,
  validateLocalEnvironmentInput,
} from "./localEnvironment";

const menuPopupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const menuScrollClass = "flex-1 min-h-0 flex flex-col overflow-y-auto";
const menuItemClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const menuIconStyle = { "--class-base-icon": "14px" } as CSSProperties;

export function LocalEnvironmentPill({ disabled }: { disabled?: boolean }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  return (
    <>
      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Menu.Trigger className={officialComposerPillClass} disabled={disabled}>
          <Icon name="SystemComputerLaptopMacbook" size="s" />
          <span className="truncate max-w-[200px]">本地</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
            <Menu.Popup className={`${menuPopupClass} !min-w-[200px]`} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={menuScrollClass}>
                <LocalEnvironmentMenuItem onOpenSettings={() => openLocalEnvironmentSettings(setMenuOpen, setSettingsOpen)} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <LocalEnvironmentSettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function LocalEnvironmentMenuItem({ onOpenSettings }: { onOpenSettings: () => void }) {
  return (
    <Menu.Item aria-checked className={`${menuItemClass} gap-g6`} onKeyDown={(event) => onLocalEnvironmentMenuKeyDown(event, onOpenSettings)} role="menuitemradio">
      <Icon name="SystemComputerLaptopMacbook" size="s" />
      <span className="flex-1 min-w-0 truncate pr-[16px]">本地<span className="sr-only">，环境设置，右箭头</span></span>
      <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={menuIconStyle}>
        <Icon name="CheckSelection" size="sm" />
      </span>
      <button aria-hidden="true" className="flex items-center justify-center size-[18px] shrink-0 rounded-r2 text-t6 hover:text-t8 hover:bg-t2 border-0 bg-transparent p-0 outline-none hide-focus-ring" onClick={stopAndRun(onOpenSettings)} tabIndex={-1} type="button">
        <Icon name="GearSettings" size="s" />
      </button>
    </Menu.Item>
  );
}

function LocalEnvironmentSettingsDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [envInput, setEnvInput] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | undefined>();

  useEffect(() => loadLocalEnvironment({ isOpen, setEnvInput, setIsLoaded, setLoadError }), [isOpen]);

  const validationError = validateLocalEnvironmentInput(envInput);
  const submitDisabled = Boolean(validationError) || isSaving;
  const save = async () => saveLocalEnvironment({ disabled: submitDisabled, envInput, onClose, setIsSaving, setLoadError });

  if (!isOpen || !isLoaded) return null;

  return (
    <OfficialModal isOpen={isOpen} onClose={onClose} title="Update local environment" width="w-[640px]">
      <form className="flex flex-col gap-[28px]" onSubmit={(event) => submitLocalEnvironmentForm(event, save)}>
        <LocalEnvironmentField error={validationError ?? loadError}>
          <textarea autoComplete="off" className="epitaxy-textarea w-full !bg-transparent !shadow-none font-mono text-code" data-1p-ignore="true" data-lpignore="true" disabled={isSaving} onChange={(event) => setEnvInput(event.target.value)} placeholder={LOCAL_ENV_PLACEHOLDER} rows={8} value={envInput} />
        </LocalEnvironmentField>
        <button aria-hidden="true" disabled={isSaving} hidden tabIndex={-1} type="submit" />
        <div className="flex justify-end gap-g4">
          <OfficialButton disabled={isSaving} onClick={onClose} variant="contained">Cancel</OfficialButton>
          <OfficialButton disabled={submitDisabled} onClick={() => void save()} variant="primary">Save changes</OfficialButton>
        </div>
      </form>
    </OfficialModal>
  );
}

function LocalEnvironmentField({ children, error }: { children: ReactNode; error?: string }) {
  return (
    <label className="flex flex-col gap-g4">
      <span className="flex flex-col gap-g1">
        <span className="text-body text-t8">Environment variables</span>
        <span className="text-footnote text-t6">In <a className="underline underline-offset-2" href="https://code.claude.com/docs/en/desktop#environment-configuration" rel="noreferrer" target="_blank">.env format</a>. These are stored securely and passed to Claude sessions.</span>
      </span>
      <div className="rounded-r4 bg-fill-contained-default effect-contrast-stroke">{children}</div>
      {error ? <span className="text-footnote text-danger-000">{error}</span> : null}
    </label>
  );
}

function openLocalEnvironmentSettings(setMenuOpen: (open: boolean) => void, setSettingsOpen: (open: boolean) => void) {
  setMenuOpen(false);
  setSettingsOpen(true);
}

function onLocalEnvironmentMenuKeyDown(event: ReactKeyboardEvent, onOpenSettings: () => void) {
  if (event.key !== "ArrowRight") return;
  event.preventDefault();
  onOpenSettings();
}

function stopAndRun(action: () => void) {
  return (event: ReactMouseEvent) => {
    event.stopPropagation();
    action();
  };
}

type LocalEnvironmentLoadArgs = {
  isOpen: boolean;
  setEnvInput: (value: string) => void;
  setIsLoaded: (value: boolean) => void;
  setLoadError: (value: string | undefined) => void;
};

type LocalEnvironmentSaveArgs = {
  disabled: boolean;
  envInput: string;
  onClose: () => void;
  setIsSaving: (value: boolean) => void;
  setLoadError: (value: string | undefined) => void;
};

function loadLocalEnvironment({ isOpen, setEnvInput, setIsLoaded, setLoadError }: LocalEnvironmentLoadArgs) {
  if (!isOpen) return;
  let alive = true;
  setIsLoaded(false);
  setLoadError(undefined);
  void desktopBridge.LocalSessionEnvironment.get().then((env) => {
    if (!alive) return;
    setEnvInput(formatLocalEnvironmentEnv(env));
    setIsLoaded(true);
  }).catch(() => {
    if (!alive) return;
    setEnvInput("");
    setLoadError("Failed to load environment variables.");
    setIsLoaded(true);
  });
  return () => {
    alive = false;
  };
}

async function saveLocalEnvironment({ disabled, envInput, onClose, setIsSaving, setLoadError }: LocalEnvironmentSaveArgs) {
  if (disabled) return;
  setIsSaving(true);
  setLoadError(undefined);
  try {
    await desktopBridge.LocalSessionEnvironment.save(parseLocalEnvironmentInput(envInput));
    onClose();
  } catch {
    setLoadError("Failed to save environment variables.");
  } finally {
    setIsSaving(false);
  }
}

function submitLocalEnvironmentForm(event: FormEvent, save: () => Promise<void>) {
  event.preventDefault();
  void save();
}
