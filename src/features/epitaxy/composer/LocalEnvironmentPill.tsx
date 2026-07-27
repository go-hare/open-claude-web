import { useEffect, useState, type CSSProperties, type FormEvent, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { desktopBridge, type WorkspaceContext, type WorkspaceSshConfig } from "../../../adapters/desktopBridge";
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
const menuHeaderClass = "px-p8 py-p2 min-h-[20px] text-footnote text-t6 select-none";

/**
 * Official env pill residual (ion c119 `tC`):
 * envType local | ssh | bridge | remote, sshEnvItems from getSSHConfigs.
 * Product: local + SSH hosts only (no invented bridge/pool UI).
 */
export function LocalEnvironmentPill({
  disabled,
  onSelectLocal,
  onSelectSsh,
  workspace,
}: {
  disabled?: boolean;
  onSelectLocal?: () => void;
  onSelectSsh?: (config: WorkspaceSshConfig) => void;
  workspace?: WorkspaceContext;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sshConfigs, setSshConfigs] = useState<WorkspaceSshConfig[]>([]);

  useEffect(() => {
    let alive = true;
    void desktopBridge.LocalSessions.getSSHConfigs?.()
      .then((configs) => {
        if (!alive) return;
        const list = Array.isArray(configs) ? configs : [];
        setSshConfigs(
          list
            .map((item) => normalizeWorkspaceSshConfig(item))
            .filter((item): item is WorkspaceSshConfig => Boolean(item)),
        );
      })
      .catch(() => {
        if (alive) setSshConfigs([]);
      });
    return () => {
      alive = false;
    };
  }, [menuOpen]);

  const isSsh = workspace?.mode === "ssh" && Boolean(workspace.sshConfig);
  const envLabel = isSsh
    ? (workspace.sshConfig?.name || workspace.sshConfig?.host || workspace.sshConfig?.sshHost || "SSH")
    : "本地";
  const envIcon = isSsh ? "ConsoleTerminal" : "SystemComputerLaptopMacbook";

  return (
    <>
      <Menu.Root open={menuOpen} onOpenChange={setMenuOpen}>
        <Menu.Trigger aria-label="Where Claude runs" className={officialComposerPillClass} disabled={disabled}>
          <Icon name={envIcon} size="s" />
          <span className="truncate max-w-[200px]">{envLabel}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
            <Menu.Popup className={`${menuPopupClass} !min-w-[200px]`} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={menuScrollClass}>
                <LocalEnvironmentMenuItem
                  checked={!isSsh}
                  onOpenSettings={() => openLocalEnvironmentSettings(setMenuOpen, setSettingsOpen)}
                  onSelect={() => {
                    setMenuOpen(false);
                    onSelectLocal?.();
                  }}
                />
                {sshConfigs.length > 0 ? (
                  <>
                    <div className={menuHeaderClass} role="presentation">SSH</div>
                    {sshConfigs.map((config) => {
                      const key = config.id || config.host || config.sshHost || config.name || "";
                      const label = config.name || config.host || config.sshHost || "SSH";
                      const checked =
                        isSsh &&
                        (workspace?.sshConfig?.host === config.host ||
                          workspace?.sshConfig?.sshHost === config.sshHost ||
                          workspace?.sshConfig?.id === config.id);
                      return (
                        <Menu.Item
                          aria-checked={checked}
                          className={`${menuItemClass} gap-g6`}
                          key={key}
                          onClick={() => {
                            setMenuOpen(false);
                            onSelectSsh?.(config);
                          }}
                          role="menuitemradio"
                        >
                          <Icon name="ConsoleTerminal" size="s" />
                          <span className="flex-1 min-w-0 truncate pr-[16px]">{label}</span>
                          <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={menuIconStyle}>
                            {checked ? <Icon name="CheckSelection" size="sm" /> : null}
                          </span>
                        </Menu.Item>
                      );
                    })}
                  </>
                ) : null}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <LocalEnvironmentSettingsDialog isOpen={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  );
}

function normalizeWorkspaceSshConfig(value: unknown): WorkspaceSshConfig | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const host =
    (typeof raw.host === "string" && raw.host) ||
    (typeof raw.sshHost === "string" && raw.sshHost) ||
    (typeof raw.hostName === "string" && raw.hostName) ||
    (typeof raw.name === "string" && raw.name) ||
    "";
  if (!host) return null;
  return {
    host,
    hostName: typeof raw.hostName === "string" ? raw.hostName : host,
    user: typeof raw.user === "string" ? raw.user : undefined,
    port: (raw.port ?? raw.sshPort) as number | string | undefined,
    identityFile:
      (typeof raw.identityFile === "string" && raw.identityFile) ||
      (typeof raw.sshIdentityFile === "string" && raw.sshIdentityFile) ||
      undefined,
    proxyJump: typeof raw.proxyJump === "string" ? raw.proxyJump : undefined,
    remoteCwd:
      (typeof raw.remoteCwd === "string" && raw.remoteCwd) ||
      (typeof raw.cwd === "string" && raw.cwd) ||
      undefined,
    sshHost: typeof raw.sshHost === "string" ? raw.sshHost : host,
    sshPort: (raw.sshPort ?? raw.port) as number | string | undefined,
    sshIdentityFile:
      (typeof raw.sshIdentityFile === "string" && raw.sshIdentityFile) ||
      (typeof raw.identityFile === "string" && raw.identityFile) ||
      undefined,
    name: typeof raw.name === "string" ? raw.name : undefined,
    id: typeof raw.id === "string" ? raw.id : undefined,
  };
}

function LocalEnvironmentMenuItem({
  checked = true,
  onOpenSettings,
  onSelect,
}: {
  checked?: boolean;
  onOpenSettings: () => void;
  onSelect?: () => void;
}) {
  return (
    <Menu.Item
      aria-checked={checked}
      className={`${menuItemClass} gap-g6`}
      onClick={onSelect}
      onKeyDown={(event) => onLocalEnvironmentMenuKeyDown(event, onOpenSettings)}
      role="menuitemradio"
    >
      <Icon name="SystemComputerLaptopMacbook" size="s" />
      <span className="flex-1 min-w-0 truncate pr-[16px]">本地<span className="sr-only">，环境设置，右箭头</span></span>
      <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={menuIconStyle}>
        {checked ? <Icon name="CheckSelection" size="sm" /> : null}
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
