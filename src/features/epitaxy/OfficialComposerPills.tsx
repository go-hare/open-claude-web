import { Menu } from "@base-ui-components/react/menu";
import { Tooltip } from "@base-ui-components/react/tooltip";
import { isValidElement, useMemo, useState, type CSSProperties, type ReactElement, type ReactNode } from "react";
import { Icon } from "../../shell/icons";
import { officialComposerPillClass, officialComposerSplitPillClass } from "./OfficialEpitaxyComponents";

type OfficialComposerEnvironmentPillProps = {
  envLabel: ReactNode;
  envType: "local" | "ssh" | "bridge" | "remote" | "pool";
  localEnvAvailable?: boolean;
  onOpenLocalEnvSettings?: () => void;
  onSelectLocalEnv?: () => void;
};

const officialMenuPopupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const officialMenuScrollClass = "flex-1 min-h-0 flex flex-col overflow-y-auto";
const officialMenuItemBaseClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const officialMenuIconStyle = { "--class-base-icon": "14px" } as CSSProperties;
const officialTooltipClass = "epitaxy-popup inline-flex items-center whitespace-nowrap h-h4 rounded-r5 gap-g5 px-p6 bg-[var(--ui-tooltip-fill)] text-[var(--ui-tooltip-text)] text-body font-ui effect-shadow-large";
const officialComposerEnvironmentIconMap = {
  local: "SystemComputerLaptopMacbook",
  ssh: "ConsoleTerminal",
  bridge: "Cursor",
  remote: "Cloud",
  pool: "Cloud",
} as const;

export function OfficialComposerEnvironmentPill({
  envLabel,
  envType,
  localEnvAvailable = true,
  onOpenLocalEnvSettings,
  onSelectLocalEnv,
}: OfficialComposerEnvironmentPillProps) {
  const [open, setOpen] = useState(false);
  const icon = officialComposerEnvironmentIconMap[envType];
  const showLocalEnvSettings = Boolean(onOpenLocalEnvSettings);
  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <OfficialTooltip label="Where Claude runs">
        <Menu.Trigger className={officialComposerPillClass}>
          <Icon name={icon} size="s" />
          <span className="truncate max-w-[200px]">{envLabel}</span>
        </Menu.Trigger>
      </OfficialTooltip>
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
          <Menu.Popup className={`${officialMenuPopupClass} !min-w-[200px]`} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                <Menu.Item
                  aria-checked={envType === "local"}
                  className={[officialMenuItemBaseClass, "gap-g6"].join(" ")}
                  disabled={!localEnvAvailable}
                  onClick={() => {
                    onSelectLocalEnv?.();
                    setOpen(false);
                  }}
                  onKeyDown={showLocalEnvSettings ? (event) => {
                    if (event.key !== "ArrowRight") return;
                    event.preventDefault();
                    setOpen(false);
                    onOpenLocalEnvSettings?.();
                  } : undefined}
                  role="menuitemradio"
                >
                  <span className={["relative flex items-center justify-center size-[14px] shrink-0", envType === "local" ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
                    <Icon name="SystemComputerLaptopMacbook" size="m" bold={envType === "local"} />
                  </span>
                  <span className="flex-1 min-w-0 truncate pr-[16px]">
                    <span className="flex-1">本地</span>
                    {showLocalEnvSettings ? <span className="sr-only">, environment settings, right arrow</span> : null}
                    {!localEnvAvailable ? <span className="text-footnote text-t6 ml-[var(--g6)]">Desktop only</span> : null}
                  </span>
                  {showLocalEnvSettings ? (
                    <button
                      aria-hidden="true"
                      className="flex items-center justify-center size-[18px] shrink-0 rounded-r2 text-t6 hover:text-t8 hover:bg-t2"
                      onClick={(event) => {
                        event.stopPropagation();
                        setOpen(false);
                        onOpenLocalEnvSettings?.();
                      }}
                      tabIndex={-1}
                      type="button"
                    >
                      <Icon name="GearSettings" size="s" />
                    </button>
                  ) : null}
                  <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px]">
                    {envType === "local" ? <Icon name="CheckSelection" size="m" /> : null}
                  </span>
                </Menu.Item>
              </Menu.Group>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

function OfficialTooltip({ children, label }: { children: ReactElement | ReactNode; label: ReactNode }) {
  return (
    <Tooltip.Root disableHoverablePopup>
      {isValidElement(children) ? (
        <Tooltip.Trigger delay={400} render={children as ReactElement<Record<string, unknown>>} />
      ) : (
        <Tooltip.Trigger delay={400} render={(props) => <span {...props} className="inline-flex">{children}</span>} />
      )}
      <Tooltip.Portal>
        <Tooltip.Positioner className="epitaxy-root z-[100]" collisionPadding={{ top: 48 }} side="top" sideOffset={4}>
          <Tooltip.Popup className={officialTooltipClass}>
            <span>{label}</span>
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}

export function OfficialComposerAdditionalFolderPill({ folder, onRemove }: { folder: string; onRemove: (folder: string) => void }) {
  const label = basename(folder) ?? folder;
  return (
    <span className={`${officialComposerPillClass} !pr-p4`} title={folder}>
      <Icon name="Folder1" size="s" />
      <span className="truncate max-w-[160px]">{label}</span>
      <button
        aria-label={`Remove ${label}`}
        className="inline-flex items-center justify-center rounded-r2 p-[2px] hover:bg-fill-contained-hover"
        onClick={() => onRemove(folder)}
        type="button"
      >
        <Icon name="XCrossCloseMedium" size="s" />
      </button>
    </span>
  );
}

export function OfficialComposerAddFolderButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      aria-label="Add another folder"
      className={officialComposerPillClass}
      onClick={onClick}
      type="button"
    >
      <Icon name="FolderAddRight" size="s" />
    </button>
  );
}

export function OfficialComposerBranchGroup({
  branch,
  branches,
  branchPickerDisabled,
  onSelectBranch,
  onWorktreeChange,
  worktree,
  worktreeSupported,
}: {
  branch?: string;
  branches: string[];
  branchPickerDisabled?: boolean;
  onSelectBranch: (branch: string) => void;
  onWorktreeChange: (worktree: boolean) => void;
  worktree?: boolean;
  worktreeSupported?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const value = branch || "—";
  const filteredBranches = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return normalized ? branches.filter((item) => item.toLowerCase().includes(normalized)) : branches;
  }, [branches, query]);

  if (!branch && branches.length === 0 && !worktreeSupported) return null;

  return (
    <div className="group/split inline-flex rounded-r5 bg-fill-contained-default effect-contained-default has-[[aria-expanded=true]]:bg-[var(--fill-contained-selected)]">
      <Menu.Root open={open} onOpenChange={setOpen}>
        <Menu.Trigger
          className={`${officialComposerSplitPillClass} gap-g5 px-p5`}
          disabled={branchPickerDisabled}
          title="Branch to start from"
        >
          <Icon name="GitBranch" size="s" />
          <span className="truncate">{value}</span>
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
            <Menu.Popup className={`${officialMenuPopupClass} !max-h-[min(360px,var(--available-height))]`} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <Menu.Group className="flex flex-col">
                  {filteredBranches.length > 0 ? filteredBranches.map((item) => (
                    <Menu.Item
                      aria-checked={item === branch}
                      className={[officialMenuItemBaseClass, "gap-g6"].join(" ")}
                      key={item}
                      onClick={() => {
                        onSelectBranch(item);
                        setOpen(false);
                      }}
                      role="menuitemradio"
                    >
                      <span className={["relative flex items-center justify-center size-[14px] shrink-0", item === branch ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
                        <Icon name="GitBranch" size="m" bold={item === branch} />
                      </span>
                      <span className="flex-1 min-w-0 truncate pr-[16px]">{item}</span>
                      <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px]">
                        {item === branch ? <Icon name="CheckSelection" size="m" /> : null}
                      </span>
                    </Menu.Item>
                  )) : (
                    <div className="px-p8 py-p4 text-body text-t6">No branches match.</div>
                  )}
                </Menu.Group>
              </div>
              <div className="h-p5 shrink-0" />
              <div className="relative flex items-center gap-g5 mx-[6px] px-p6 h-h4 shrink-0 rounded-r5 bg-[var(--z0)]">
                <Icon name="Search" size="s" />
                <input
                  autoFocus
                  aria-label="Search branches…"
                  className="flex-1 min-w-0 bg-transparent border-0 outline-none hide-focus-ring text-body text-t8 placeholder:text-t6"
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && query.trim() !== "" && filteredBranches[0]) {
                      onSelectBranch(filteredBranches[0]);
                      setOpen(false);
                    }
                  }}
                  placeholder="Search branches…"
                  value={query}
                />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      {worktreeSupported ? <span aria-hidden="true" className="w-px my-[7px] bg-t3 transition-opacity group-hover/split:opacity-0 group-focus-within/split:opacity-0" /> : null}
      {worktreeSupported ? (
        <button
          aria-checked={worktree}
          className={`${officialComposerSplitPillClass} group/cb gap-g2 pl-p4 pr-p5`}
          onClick={() => onWorktreeChange(!worktree)}
          role="checkbox"
          type="button"
        >
          <span className="inline-flex items-center justify-center size-[16px] shrink-0 p-[2.4px]">
            <span className="flex items-center justify-center size-full rounded-[2.4px] bg-[var(--ui-switch-off-background)] group-aria-[checked=true]/cb:bg-[var(--accent)]">
              <span className={worktree ? "flex items-center justify-center" : "hidden"}>
                <svg width="6" height="5" viewBox="0 0 5.875 5.375" fill="none" aria-hidden="true" className="text-[var(--core-white)]">
                  <path d="M0.500014 2.75004L2.25001 4.87504L5.37501 0.500039" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </span>
          </span>
          <span>worktree</span>
        </button>
      ) : null}
    </div>
  );
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
