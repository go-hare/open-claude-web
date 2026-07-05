import { Menu } from "@base-ui-components/react/menu";
import { useState, type CSSProperties, type ReactNode } from "react";
import type { SessionSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";

export type OfficialSessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

export type OfficialDropdownItem = {
  checked?: boolean;
  disabled?: boolean;
  icon?: string;
  keepOpen?: boolean;
  label: ReactNode;
  onSelect?: () => void;
  separatorBefore?: boolean;
  shortcut?: string;
  status?: ReactNode;
  trailing?: ReactNode;
};

type OfficialButtonProps = {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  customIcon?: ReactNode;
  disabled?: boolean;
  icon?: string;
  mode?: "text" | "icon";
  onClick?: () => void;
  pressed?: boolean;
  size?: "small" | "base" | "large";
  type?: "button" | "submit";
  variant?: "uncontained" | "contained" | "primary" | "destructive" | "toggle" | "accent" | "link" | "muted";
};

type OfficialDropdownButtonProps = {
  align?: "start" | "center" | "end";
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  extraSections?: Array<{ header?: ReactNode; items: OfficialDropdownItem[] }>;
  header?: ReactNode;
  icon?: string;
  items?: OfficialDropdownItem[];
  label?: ReactNode;
  mode?: "text" | "icon" | "chevron";
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  pressed?: boolean;
  revealChevron?: "always" | "hover" | "never";
  side?: "top" | "right" | "bottom" | "left";
  size?: "small" | "base" | "large";
  triggerKey?: ReactNode;
  variant?: "uncontained" | "contained" | "muted";
};

type OfficialSessionHeaderProps = {
  activeView?: OfficialViewPane;
  dragHandle?: ReactNode;
  hideSummary?: boolean;
  isTitleLoading?: boolean;
  isTopLeft?: boolean;
  onSessionRemoved?: () => void;
  onViewSelect?: (view: OfficialViewPane) => void;
  paneIndex?: number;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef | null;
  title: string;
};

export type OfficialViewPane = "preview" | "diff" | "terminal" | "tasks" | "plan";

type OfficialTranscriptProps = {
  children: ReactNode;
  scrollRef?: (node: HTMLDivElement | null) => void;
};

const buttonVariantClasses: Record<NonNullable<OfficialButtonProps["variant"]>, string> = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-uncontained-selected pressed:hover:text-uncontained-selected ring-focus",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled busy:text-contained-busy pressed:text-contained-selected pressed:hover:text-contained-selected ring-focus",
  primary: "text-primary-default hover:text-primary-hover disabled:text-primary-disabled disabled:hover:text-primary-disabled busy:text-primary-busy ring-focus-primary",
  destructive: "text-destructive-default hover:text-destructive-hover disabled:text-destructive-disabled disabled:hover:text-destructive-disabled busy:text-destructive-busy ring-focus-destructive",
  toggle: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy pressed:text-[var(--accent)] pressed:hover:text-[var(--accent-hover)] ring-focus",
  accent: "text-[var(--accent)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  link: "text-[var(--accent)] hover:text-[var(--accent-hover)] disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled busy:text-uncontained-busy ring-focus",
  muted: "text-t6 hover:text-t7 disabled:text-t4 disabled:hover:text-t4 busy:text-t4 pressed:text-t7 pressed:hover:text-t7 ring-focus",
};

const buttonSizeClasses: Record<NonNullable<OfficialButtonProps["size"]>, string> = {
  small: "h-small text-footnote rounded-small",
  base: "h-base text-body rounded-base",
  large: "h-large text-heading rounded-large",
};

const buttonTextPadding: Record<NonNullable<OfficialButtonProps["size"]>, string> = {
  small: "px-p5",
  base: "px-p6",
  large: "px-p7",
};

const buttonBgClasses: Record<NonNullable<OfficialButtonProps["variant"]>, string> = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)] group-pressed/btn:bg-[var(--fill-uncontained-selected)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/btn:bg-[var(--fill-contained-hover)] group-disabled/btn:bg-[var(--fill-contained-disabled)] group-pressed/btn:bg-[var(--fill-contained-selected)] effect-contained-default group-disabled/btn:shadow-none",
  primary: "bg-[var(--fill-primary-default)] group-hover/btn:bg-[var(--fill-primary-hover)] group-disabled/btn:bg-[var(--fill-primary-disabled)] effect-primary-default group-disabled/btn:shadow-none",
  destructive: "bg-[var(--fill-destructive-default)] group-hover/btn:bg-[var(--fill-destructive-hover)] group-disabled/btn:bg-[var(--fill-destructive-disabled)]",
  toggle: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)] group-disabled/btn:bg-[var(--fill-uncontained-disabled)]",
  accent: "bg-[var(--accent-10)] group-hover/btn:bg-[var(--accent-20)]",
  link: "bg-transparent",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/btn:bg-[var(--fill-uncontained-hover)]",
};

const dropdownVariantClasses: Record<NonNullable<OfficialDropdownButtonProps["variant"]>, string> = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)]",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled disabled:hover:text-contained-disabled aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:text-[var(--text-contained-selected)]",
  muted: "text-t6 hover:text-t7 disabled:text-t4 aria-[expanded=true]:text-t7 aria-[expanded=true]:hover:text-t7",
};

const dropdownSizeClasses: Record<NonNullable<OfficialDropdownButtonProps["size"]>, string> = {
  small: "h-small rounded-small text-footnote",
  base: "h-base rounded-base text-body",
  large: "h-large rounded-large text-body",
};

const dropdownModeClasses: Record<NonNullable<OfficialDropdownButtonProps["mode"]>, string> = {
  text: "justify-between pl-p5 pr-p2",
  icon: "justify-between pl-p3 pr-p2",
  chevron: "justify-center aspect-square",
};

const dropdownBgClasses: Record<NonNullable<OfficialDropdownButtonProps["variant"]>, string> = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)] group-disabled/dd:bg-[var(--fill-uncontained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-uncontained-selected)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/dd:bg-[var(--fill-contained-hover)] group-disabled/dd:bg-[var(--fill-contained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-contained-selected)] effect-contained-default group-disabled/dd:shadow-none",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)] group-disabled/dd:bg-[var(--fill-uncontained-disabled)] group-aria-[expanded=true]/dd:bg-[var(--fill-uncontained-selected)]",
};

const dropdownIconSize: Record<NonNullable<OfficialDropdownButtonProps["size"]>, "xs" | "sm" | "md"> = {
  small: "xs",
  base: "sm",
  large: "md",
};

const officialSessionSourceClass = "inline-flex items-center gap-g4 h-base px-p3 rounded-base border-0 cursor-default select-none outline-none hide-focus-ring ring-focus min-w-0 bg-fill-uncontained-default text-t9 text-body hover:bg-fill-uncontained-hover";
const officialSessionIconMap = {
  local: "Folder1",
  ssh: "ConsoleTerminal",
  remote: "Cloud",
  bridge: "SystemComputerLaptopMacbook",
} as const;
type OfficialSessionSourceKind = keyof typeof officialSessionIconMap;
const userMessageClass = "relative flex flex-col gap-g4 py-p6 px-p8 rounded-r7 bg-[var(--ui-user-message-background)] text-[var(--ui-user-message-primary-text)] select-text";
const officialMenuPopupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const officialMenuScrollClass = "flex-1 min-h-0 flex flex-col overflow-y-auto";
const officialMenuItemBaseClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const officialMenuIconStyle = { "--class-base-icon": "14px" } as CSSProperties;

export function OfficialButton({
  ariaLabel,
  children,
  className,
  customIcon,
  disabled,
  icon,
  mode = children ? "text" : "icon",
  onClick,
  pressed,
  size = "base",
  type = "button",
  variant = "uncontained",
}: OfficialButtonProps) {
  const modeClass = mode === "icon" ? "justify-center aspect-square px-p3" : `gap-g3 ${buttonTextPadding[size]}`;
  return (
    <button
      aria-label={ariaLabel}
      aria-pressed={pressed || undefined}
      className={[
        "group/btn relative isolate inline-flex items-center whitespace-nowrap border-0 cursor-default select-none outline-none hide-focus-ring",
        buttonVariantClasses[variant],
        buttonSizeClasses[size],
        modeClass,
        className ?? "",
      ].join(" ")}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      <span aria-hidden="true" className={`btn-squish absolute inset-0 -z-[1] rounded-[inherit] ${buttonBgClasses[variant]}`} />
      {customIcon ?? (icon ? <Icon name={icon} size={size === "small" ? "xs" : size === "large" ? "md" : "sm"} /> : null)}
      {children}
    </button>
  );
}

export function OfficialDropdownButton({
  align = "end",
  ariaLabel,
  className,
  disabled,
  extraSections,
  header,
  icon,
  items = [],
  label,
  mode,
  onOpenChange,
  open,
  pressed,
  revealChevron = "always",
  side = "bottom",
  size = "base",
  triggerKey,
  variant = "uncontained",
}: OfficialDropdownButtonProps) {
  const actualMode = mode ?? (icon ? "icon" : "text");
  const hasPopup = items.length > 0 || Boolean(extraSections?.some((section) => section.items.length > 0));
  const trigger = (
    <Menu.Trigger
      aria-label={ariaLabel}
      className={[
        "group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus",
        dropdownVariantClasses[variant],
        dropdownSizeClasses[size],
        dropdownModeClasses[actualMode],
        className ?? "",
      ].join(" ")}
      disabled={disabled}
    >
      <span aria-hidden="true" className={`absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none ${dropdownBgClasses[variant]}`} />
      {actualMode === "icon" && icon ? (
        <span className="relative inline-flex">
          <Icon name={icon} size={dropdownIconSize[size]} className={pressed ? "text-[var(--accent)]" : undefined} />
        </span>
      ) : null}
      {actualMode === "text" ? <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{label}</span> : null}
      {revealChevron !== "never" ? <Icon name="ChevronDownSmall" size="xs" className={revealChevron === "hover" ? "shrink-0 opacity-0 group-hover/dd:opacity-100 group-focus-visible/dd:opacity-100 group-aria-[expanded=true]/dd:opacity-100" : "shrink-0"} /> : null}
    </Menu.Trigger>
  );

  return (
    <Menu.Root open={open} onOpenChange={onOpenChange}>
      {trigger}
      {hasPopup ? (
        <Menu.Portal>
          <Menu.Positioner align={align} alignOffset={align === "end" ? 0 : actualMode === "text" ? -6 : -8} className="epitaxy-root z-[60]" side={side} sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                {items.length > 0 ? (
                  <Menu.Group className="flex flex-col">
                    {header ? <OfficialMenuHeader triggerKey={triggerKey}>{header}</OfficialMenuHeader> : null}
                    <OfficialMenuItems items={items} />
                  </Menu.Group>
                ) : null}
                {extraSections?.map((section, index) => section.items.length > 0 ? (
                  <Menu.Group className="flex flex-col" key={index}>
                    {(items.length > 0 || index > 0) ? <OfficialMenuSeparator /> : null}
                    {section.header ? <OfficialMenuHeader>{section.header}</OfficialMenuHeader> : null}
                    <OfficialMenuItems items={section.items} />
                  </Menu.Group>
                ) : null)}
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

export function OfficialSessionHeader({
  activeView,
  dragHandle,
  hideSummary = false,
  isTitleLoading = false,
  isTopLeft,
  onSessionRemoved,
  onViewSelect,
  paneIndex = 0,
  session,
  sessionRef,
  title,
}: OfficialSessionHeaderProps) {
  return (
    <div data-top-left={isTopLeft || undefined} className="relative flex items-center h-[32px] pl-[16px] pr-[16px]">
      <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
      <div className="relative z-[1] flex items-center min-w-0 draggable-none">
        {sessionRef ? <span className="-ml-[4px] flex min-w-0"><OfficialSessionSource session={session} sessionRef={sessionRef} /></span> : null}
        {sessionRef ? <span className="text-body text-t7 select-none shrink-0 pr-[4px]" aria-hidden="true">/</span> : null}
        {sessionRef ? (
          isTitleLoading
            ? <span aria-hidden="true" className="h-[10px] w-[128px] rounded-r3 bg-t2 animate-pulse" />
            : <OfficialSessionTitle paneIndex={paneIndex} title={title} />
        ) : null}
      </div>
      {dragHandle}
      <div className="relative z-[1] ml-auto flex items-center gap-g3 shrink-0 draggable-none">
        {sessionRef ? <OfficialTranscriptViewButton hideSummary={hideSummary} /> : null}
        {sessionRef?.type !== "local" ? <OfficialButton ariaLabel="Share" icon="ShareArrowOutOfBox" /> : null}
        {sessionRef ? <OfficialViewsButton activeView={activeView} onViewSelect={onViewSelect} /> : null}
        {onSessionRemoved ? <OfficialButton ariaLabel="Close pane" icon="XCrossCloseMedium" onClick={onSessionRemoved} /> : null}
      </div>
    </div>
  );
}

export function OfficialChatTileShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-full w-full min-w-0 relative isolate rounded-r6">
      <div aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated opacity-0 transition-opacity duration-200 [.tiles-dragging_&]:opacity-100" />
      {children}
    </div>
  );
}

export function OfficialTranscript({ children, scrollRef }: OfficialTranscriptProps) {
  return (
    <div ref={scrollRef} data-testid="epitaxy-virtual-transcript" className="h-full overflow-y-auto overflow-x-hidden [contain:strict]">
      <div className="relative epitaxy-chat-column">
        <div className="w-full">
          {children}
        </div>
      </div>
    </div>
  );
}

export function OfficialTranscriptRow({ children, last = false }: { children: ReactNode; last?: boolean }) {
  return (
    <div>
      <div className={last ? "epitaxy-chat-size" : "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0"}>
        {children}
      </div>
    </div>
  );
}

export function OfficialUserMessage({ children, createdAt, isQueued = false }: { children: ReactNode; createdAt?: string; isQueued?: boolean }) {
  return (
    <div className={"group/msg flex justify-start items-start gap-g3 w-full transition-opacity duration-200 " + (isQueued ? "opacity-50 hover:opacity-80" : "")}>
      <div className="flex flex-col items-start gap-g6 max-w-[75%] min-w-0">
        <div className={`${userMessageClass} max-w-full`}>
          {children}
        </div>
        {!isQueued && createdAt ? <OfficialMessageActions timestamp={createdAt} className="-mt-[8px]" /> : null}
      </div>
    </div>
  );
}

function OfficialMessageActions({ className = "", timestamp }: { className?: string; timestamp?: string }) {
  return (
    <div className={`flex gap-g2 pt-[4px] opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto ${className}`}>
      {timestamp ? <span className="text-footnote text-assistant-secondary tabular-nums self-center pl-p1" title={timestamp}>You · {timestamp}</span> : null}
    </div>
  );
}

export function OfficialAssistantMessage({ children, createdAt }: { children: ReactNode; createdAt?: string }) {
  return (
    <article className="group/msg flex flex-col gap-g3 w-full select-text">
      {createdAt ? <div className="text-footnote text-t6 select-none">Claude · {createdAt}</div> : null}
      <div className="epitaxy-markdown text-body text-t8 whitespace-pre-wrap [overflow-wrap:anywhere] text-pretty">{children}</div>
    </article>
  );
}

export function OfficialComposerDropdown({
  children,
  icon,
  onClick,
}: {
  children?: ReactNode;
  icon?: string;
  onClick?: () => void;
}) {
  if (icon) {
    return (
      <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p3 pr-p2 shrink-0" onClick={onClick} type="button">
        <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
        <Icon name={icon} customSize={16} />
      </button>
    );
  }

  return (
    <button className="group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled disabled:hover:text-uncontained-disabled aria-[expanded=true]:text-[var(--text-uncontained-selected)] aria-[expanded=true]:hover:text-[var(--text-uncontained-selected)] h-small rounded-small text-footnote justify-between pl-p5 pr-p2" type="button">
      <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]" />
      <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{children}</span>
    </button>
  );
}

function OfficialSessionSource({ session, sessionRef }: { session: SessionSummary | null; sessionRef: OfficialSessionRef }) {
  const cwd = normalizeLabel(session?.cwd);
  const branch = normalizeLabel(session?.repo?.branch);
  const repoNames = normalizeLabel(session?.repo?.name) ? [normalizeLabel(session?.repo?.name)!] : [];
  const repoName = normalizeLabel(repoNames.length > 1 ? `${repoNames.length} repos` : repoNames[0]) ?? normalizeLabel(basename(cwd));
  const kind = sessionSourceKind(sessionRef);

  if (repoName) {
    return <OfficialSessionSourceMenu branch={branch} cwd={cwd} kind={kind} repoName={repoName} repoNames={repoNames} />;
  }

  return <OfficialSessionSourceButton kind={kind} loading={!session} />;
}

function OfficialSessionSourceMenu({ branch, cwd, kind, repoName, repoNames }: {
  branch?: string;
  cwd?: string;
  kind: OfficialSessionSourceKind;
  repoName: string;
  repoNames: string[];
}) {
  const [open, setOpen] = useState(false);
  const detail = [repoNames.length > 1 ? repoNames.join(", ") : undefined, branch].filter(Boolean).join(" · ");
  const items: OfficialDropdownItem[] = [
    ...(cwd ? [{ label: "Copy path", onSelect: () => void navigator.clipboard?.writeText(cwd) }] : []),
    ...(branch ? [{ label: "Copy branch name", onSelect: () => void navigator.clipboard?.writeText(branch) }] : []),
  ];

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger
        className={officialSessionSourceClass}
        onContextMenu={(event) => {
          event.preventDefault();
          setOpen(true);
        }}
      >
        <OfficialSessionSourceIcon kind={kind} />
        <span className="truncate">{repoName}</span>
      </Menu.Trigger>
      {items.length > 0 || detail ? (
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="bottom" sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                {detail ? <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">{detail}</div> : null}
                <OfficialMenuItems items={items} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      ) : null}
    </Menu.Root>
  );
}

function OfficialSessionSourceButton({ kind, label, loading = false }: { kind: OfficialSessionSourceKind; label?: string; loading?: boolean }) {
  const ariaLabel = sourceAriaLabel(kind);
  if (label) {
    return (
      <span className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon kind={kind} />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  if (loading) {
    return (
      <span aria-hidden="true" className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon kind={kind} />
        <span className="h-[10px] w-[64px] rounded-r3 bg-t2 animate-pulse" />
      </span>
    );
  }
  return <OfficialButton ariaLabel={ariaLabel} className="text-t9" icon={officialSessionIconMap[kind]} />;
}

function OfficialSessionSourceIcon({ kind }: { kind: OfficialSessionSourceKind }) {
  return <Icon name={officialSessionIconMap[kind]} size="sm" />;
}

function sessionSourceKind(sessionRef: OfficialSessionRef): OfficialSessionSourceKind {
  return sessionRef.type === "bridge" ? "bridge" : sessionRef.type === "remote" ? "remote" : "local";
}

function sourceAriaLabel(kind: OfficialSessionSourceKind) {
  switch (kind) {
    case "local": return "本地";
    case "ssh": return "SSH";
    case "remote": return "Remote";
    case "bridge": return "Bridge";
  }
}

function OfficialSessionTitle({ paneIndex, title }: { paneIndex: number; title: string }) {
  const actions: OfficialDropdownItem[] = [
    { label: "Rename" },
    { label: "Archive" },
    { label: "Delete" },
  ];
  return (
    <div className="flex items-center min-w-[32px] flex-1" data-pane-index={paneIndex}>
      <button type="button" className="truncate text-left text-body text-t7 select-none bg-transparent border-0 p-0 outline-none cursor-text">
        {title}
      </button>
      <Menu.Root>
        <Menu.Trigger
          aria-label="Session actions"
          className="relative inline-flex h-small aspect-square shrink-0 items-center justify-center rounded-small text-[var(--text-uncontained-default)] hover:text-[var(--text-uncontained-hover)] hover:bg-[var(--fill-uncontained-hover)] aria-[expanded=true]:bg-[var(--fill-uncontained-selected)] aria-[expanded=true]:text-[var(--text-uncontained-selected)] outline-none hide-focus-ring ring-focus"
        >
          <Icon name="ChevronDownSmall" size="xs" />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="bottom" sideOffset={8}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <OfficialMenuItems items={actions} />
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
    </div>
  );
}

function OfficialTranscriptViewButton({ hideSummary }: { hideSummary: boolean }) {
  const items: OfficialDropdownItem[] = [
    { label: "Normal", checked: true },
    { label: "Thinking", checked: false },
    { label: "Verbose", checked: false },
    ...(hideSummary ? [] : [{ label: "Summary", checked: false } satisfies OfficialDropdownItem]),
  ];
  return <OfficialDropdownButton ariaLabel="Transcript view mode" header="Transcript view" icon="NoteSquareLines" items={items} revealChevron="never" />;
}

function OfficialViewsButton({ activeView, onViewSelect }: { activeView?: OfficialViewPane; onViewSelect?: (view: OfficialViewPane) => void }) {
  const items: OfficialDropdownItem[] = [
    { icon: "Play", label: "预览", checked: activeView === "preview", shortcut: "⇧⌘P", onSelect: () => onViewSelect?.("preview") },
    { icon: "ChangesDiffPlusMinusBox", label: "Diff", checked: activeView === "diff", shortcut: "⇧⌘D", onSelect: () => onViewSelect?.("diff") },
    { icon: "TerminalOpenCommandLine", label: "Terminal", checked: activeView === "terminal", shortcut: "⌃`", onSelect: () => onViewSelect?.("terminal") },
    { icon: "Blocks", label: "任务", checked: activeView === "tasks", onSelect: () => onViewSelect?.("tasks") },
    { icon: "CheckList", label: "Plan", checked: activeView === "plan", onSelect: () => onViewSelect?.("plan") },
  ];
  return <OfficialDropdownButton ariaLabel="Views" icon="SidebarSimpleRightSquare" items={items} />;
}

function OfficialMenuItems({ items }: { items: OfficialDropdownItem[] }) {
  const hasChecks = items.some((item) => item.checked !== undefined);
  return (
    <>
      {items.map((item, index) => (
        <MenuItemFragment hasChecks={hasChecks} item={item} key={index} />
      ))}
    </>
  );
}

function MenuItemFragment({ hasChecks, item }: { hasChecks: boolean; item: OfficialDropdownItem }) {
  const hasIcon = Boolean(item.icon);
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.Item
        aria-checked={item.checked}
        className={[officialMenuItemBaseClass, hasIcon ? "gap-g6" : "gap-g3"].join(" ")}
        closeOnClick={item.keepOpen ? false : undefined}
        disabled={item.disabled}
        onClick={item.onSelect}
        role={item.checked === undefined ? undefined : "menuitemradio"}
      >
        {item.icon ? (
          <span className={["relative flex items-center justify-center size-[14px] shrink-0", item.checked ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
            <Icon name={item.icon} size="sm" bold={item.checked} />
          </span>
        ) : null}
        <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label}</span>
        {hasChecks ? (
          <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
            {item.checked ? <Icon name="CheckSelection" size="sm" /> : null}
          </span>
        ) : null}
        {item.status}
        {item.shortcut ? <OfficialShortcut keys={item.shortcut} /> : null}
        {item.trailing}
      </Menu.Item>
    </>
  );
}

function OfficialShortcut({ keys }: { keys: string }) {
  return (
    <span className="flex items-center gap-px shrink-0 text-footnote text-t6">
      {splitShortcutKeys(keys).map((key, index) => (
        <kbd className="font-ui flex items-center justify-center h-[16px]" key={`${key}-${index}`}>{key}</kbd>
      ))}
    </span>
  );
}

function OfficialMenuHeader({ children, triggerKey }: { children: ReactNode; triggerKey?: ReactNode }) {
  return (
    <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">
      <span className="flex-1 pr-p8">{children}</span>
      {triggerKey}
    </div>
  );
}

function OfficialMenuSeparator() {
  return (
    <Menu.Separator className="relative h-h1">
      <div className="absolute left-[12px] right-[12px] top-1/2 h-px rounded-[1px] bg-t3" />
    </Menu.Separator>
  );
}

function splitShortcutKeys(keys: string) {
  return Array.from(keys);
}

function normalizeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
