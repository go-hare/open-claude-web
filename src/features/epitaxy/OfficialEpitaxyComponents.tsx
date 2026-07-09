import { Menu } from "@base-ui-components/react/menu";
import { useEffect, useMemo, useReducer, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { SessionSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";

export type OfficialSessionRef = {
  id: string;
  type: "local" | "remote" | "bridge";
};

export type OfficialDropdownItem = {
  checked?: boolean;
  closeOnClick?: boolean;
  disabled?: boolean;
  hint?: ReactNode;
  icon?: string;
  items?: OfficialDropdownItem[];
  keepOpen?: boolean;
  label: ReactNode;
  noQuickKey?: boolean;
  onSelect?: () => void;
  separatorBefore?: boolean;
  shortcut?: string | string[];
  status?: ReactNode;
  subtitle?: ReactNode;
  suffix?: ReactNode;
  submenuFooterItems?: OfficialDropdownItem[];
  tooltip?: ReactNode;
  trailing?: ReactNode;
  type?: "button" | "checkbox" | "loading" | "section-header" | "separator" | "submenu";
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
  alignOffset?: number;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  extraSections?: Array<{ header?: ReactNode; items: OfficialDropdownItem[]; triggerKey?: ReactNode | string | string[] }>;
  header?: ReactNode;
  icon?: string;
  items?: OfficialDropdownItem[];
  label?: ReactNode;
  mode?: "text" | "icon" | "chevron";
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
  popupClassName?: string;
  pressed?: boolean;
  revealChevron?: "always" | "hover" | "never";
  side?: "top" | "right" | "bottom" | "left";
  sideOffset?: number;
  size?: "small" | "base" | "large";
  triggerKey?: ReactNode | string | string[];
  variant?: "uncontained" | "contained" | "muted";
};

type OfficialModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: string;
};

export type OfficialComposerFolderRecent = {
  displayName?: string;
  path: string;
};

type OfficialComposerFolderPillProps = {
  browseDisabled?: boolean;
  folder?: string;
  isSSH?: boolean;
  onBrowse: () => void;
  onSelectFolder: (path: string) => void;
  recentFolders: OfficialComposerFolderRecent[];
};

type OfficialSearchSelectProps<T> = {
  disabled?: boolean;
  emptyMessage: ReactNode;
  icon: string;
  isLoading?: boolean;
  itemToLabel: (item: T) => string;
  items: T[];
  onQueryChange?: (query: string) => void;
  onSelect: (item: T) => void;
  placeholder: string;
  side?: "top" | "bottom";
  triggerAriaLabel?: string;
  triggerClassName: string;
  triggerLabel?: ReactNode;
  value: T | null;
};

type OfficialSessionHeaderProps = {
  activeView?: OfficialViewPane;
  dragHandle?: ReactNode;
  hasRunningTasks?: boolean;
  hideViews?: boolean;
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

export type OfficialViewPane = "preview" | "diff" | "terminal" | "tasks" | "plan" | "file" | "subagent";

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
export const officialComposerPillClass = "relative inline-flex items-center gap-g5 h-[24px] px-p5 rounded-r5 bg-fill-contained-default text-contained-default text-body effect-contained-default hover:bg-fill-contained-hover hover:text-contained-hover disabled:bg-fill-contained-disabled disabled:text-contained-disabled aria-[expanded=true]:bg-[var(--fill-contained-selected)] aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-[var(--fill-contained-selected)] aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus";
export const officialComposerSplitPillClass = "relative inline-flex items-center h-[24px] bg-transparent text-contained-default text-body hover:bg-fill-contained-hover hover:text-contained-hover disabled:text-contained-disabled aria-[expanded=true]:text-[var(--text-contained-selected)] aria-[expanded=true]:hover:bg-transparent aria-[expanded=true]:hover:text-[var(--text-contained-selected)] cursor-default select-none border-0 outline-none hide-focus-ring ring-focus rounded-[inherit]";

export function OfficialSearchSelect<T>({
  disabled,
  emptyMessage,
  icon,
  isLoading,
  itemToLabel,
  items,
  onQueryChange,
  onSelect,
  placeholder,
  side = "top",
  triggerAriaLabel,
  triggerClassName,
  triggerLabel,
  value,
}: OfficialSearchSelectProps<T>) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(() => (
    normalizedQuery
      ? items.filter((item) => itemToLabel(item).toLowerCase().includes(normalizedQuery))
      : items
  ), [itemToLabel, items, normalizedQuery]);

  const searchBox = (
    <div className="relative flex items-center gap-g5 mx-[6px] px-p6 h-h4 shrink-0 rounded-r5 bg-[var(--z0)]">
      <Icon name="Search" size="s" />
      <input
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent border-0 outline-none hide-focus-ring text-body text-t8 placeholder:text-t6"
        onChange={(event) => {
          setQuery(event.target.value);
          onQueryChange?.(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && filteredItems[0]) onSelect(filteredItems[0]);
        }}
        placeholder={placeholder}
        value={query}
      />
      {isLoading ? (
        <div role="status" className={`absolute inset-x-0 h-[2px] overflow-hidden rounded-full ${side === "top" ? "top-0" : "bottom-0"}`}>
          <div className="epitaxy-linear-sweep h-full w-[30%] bg-[var(--t6)]" />
          <span className="sr-only">Loading results</span>
        </div>
      ) : null}
    </div>
  );

  return (
    <Menu.Root onOpenChange={(open) => { if (!open) setQuery(""); }}>
      <Menu.Trigger aria-label={triggerAriaLabel} className={triggerClassName} disabled={disabled}>
        <Icon name={icon} size="s" />
        {triggerLabel ? <span className="truncate max-w-[200px]">{triggerLabel}</span> : null}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60]" side={side} sideOffset={8}>
          <Menu.Popup className={`${officialMenuPopupClass} !max-h-[min(360px,var(--available-height))]`} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            {side === "bottom" ? <>{searchBox}<div className="h-p5 shrink-0" /></> : null}
            <div className={officialMenuScrollClass}>
              {filteredItems.map((item) => {
                const label = itemToLabel(item);
                const selected = value !== null && itemToLabel(value) === label;
                return (
                  <Menu.Item
                    aria-checked={selected}
                    className={[officialMenuItemBaseClass, "group data-[selected]:before:bg-fill-uncontained-hover gap-g3"].join(" ")}
                    data-selected={selected || undefined}
                    key={label}
                    onClick={() => onSelect(item)}
                    role="menuitemradio"
                  >
                    <span className="flex-1 min-w-0 truncate">{label}</span>
                    <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
                      {selected ? <Icon name="CheckSelection" size="sm" /> : null}
                    </span>
                  </Menu.Item>
                );
              })}
            </div>
            {filteredItems.length === 0 ? <div className="px-p8 py-p5 text-body text-t6">{emptyMessage}</div> : null}
            {side === "top" ? <><div className="h-p5 shrink-0" />{searchBox}</> : null}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

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

export function OfficialModal({
  children,
  isOpen,
  onClose,
  title,
  width = "w-[640px]",
}: OfficialModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="epitaxy-root">
      <button
        aria-label="Close modal"
        className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none border-0 cursor-default"
        onClick={onClose}
        type="button"
      />
      <section
        aria-modal="true"
        className={`epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ${width} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] draggable-none outline-none`}
        role="dialog"
      >
        <div className="relative isolate rounded-r6 flex flex-col max-h-[inherit]">
          <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
          <div className="flex items-center justify-between gap-g4 px-[24px] pt-[24px]">
            <h2 className="text-heading-semibold text-t9">{title}</h2>
            <OfficialButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} size="small" variant="uncontained" />
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[24px] pt-[16px]">
            {children}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}

export function OfficialDropdownButton({
  align = "end",
  alignOffset,
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
  popupClassName,
  pressed,
  revealChevron = "always",
  side = "bottom",
  sideOffset,
  size = "base",
  triggerKey,
  variant = "uncontained",
}: OfficialDropdownButtonProps) {
  const actualMode = mode ?? (icon ? "icon" : "text");
  const hasPopup = items.length > 0 || Boolean(extraSections?.some((section) => section.items.length > 0));
  const resolvedAlignOffset = alignOffset ?? (align === "end" ? 0 : actualMode === "text" ? -6 : -8);
  const resolvedSideOffset = sideOffset ?? 8;
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
          <Menu.Positioner align={align} alignOffset={resolvedAlignOffset} className="epitaxy-root z-[60]" side={side} sideOffset={resolvedSideOffset}>
            <Menu.Popup className={`${officialMenuPopupClass} ${popupClassName ?? ""}`} data-cds="Menu">
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
                    {section.header ? <OfficialMenuHeader triggerKey={section.triggerKey}>{section.header}</OfficialMenuHeader> : null}
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
  hasRunningTasks = false,
  hideViews = false,
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
        {sessionRef && !hideViews ? <OfficialViewsButton activeView={activeView} hasRunningTasks={hasRunningTasks} onViewSelect={onViewSelect} /> : null}
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
        <div className="w-full pt-[48px] pb-[48px]">
          {children}
        </div>
      </div>
    </div>
  );
}

export function OfficialTranscriptRows({ children }: { children: ReactNode }) {
  return (
    <div className="w-full">
      {children}
    </div>
  );
}

export function OfficialTranscriptRow({ children }: { children: ReactNode; last?: boolean }) {
  return (
    <div className="epitaxy-chat-size pb-[var(--chat-turn-gap)] last:pb-0 empty:pb-0 [content-visibility:auto] [contain-intrinsic-size:auto_400px] empty:hidden">
      {children}
    </div>
  );
}

export function OfficialUserMessage({
  children,
  copyText,
  createdAt,
  isQueued = false,
  onFork,
  onRewind,
  rewindAriaLabel,
  rewindIcon,
}: {
  children: ReactNode;
  copyText?: string;
  createdAt?: string;
  isQueued?: boolean;
  onFork?: () => void;
  onRewind?: () => void;
  rewindAriaLabel?: string;
  rewindIcon?: string;
}) {
  return (
    <div className={`group/msg flex justify-start items-start gap-g3 w-full transition-opacity duration-200 ${isQueued ? "opacity-50 hover:opacity-80" : ""}`}>
      <div className="flex flex-col items-start gap-g6 max-w-[75%] min-w-0">
        <div className={`${userMessageClass} max-w-full`}>
          {children}
        </div>
        {!isQueued && (copyText !== undefined || createdAt || onFork || onRewind) ? (
          <OfficialMessageActions buttonVariant="link" copyText={copyText} onFork={onFork} onRewind={onRewind} rewindAriaLabel={rewindAriaLabel} rewindIcon={rewindIcon} timestamp={createdAt} className="-mt-[8px]" />
        ) : null}
      </div>
    </div>
  );
}

type OfficialMessageRating = "negative" | "positive";

function OfficialMessageActions({
  buttonVariant = "muted",
  className = "",
  copyText,
  isPinned = false,
  onFork,
  onPinChapter,
  onRateMessage,
  onRewind,
  rateMessageUuid,
  rating,
  rewindAriaLabel = "Rewind to here",
  rewindIcon = "ArrowUndoUp",
  showBranchActions = false,
  showPinAction = false,
  timestamp,
}: {
  buttonVariant?: "link" | "muted";
  className?: string;
  copyText?: string;
  isPinned?: boolean;
  onFork?: () => void;
  onPinChapter?: () => void;
  onRateMessage?: (messageUuid: string, rating: OfficialMessageRating) => void;
  onRewind?: () => void;
  rateMessageUuid?: string;
  rating?: OfficialMessageRating;
  rewindAriaLabel?: string;
  rewindIcon?: string;
  showBranchActions?: boolean;
  showPinAction?: boolean;
  timestamp?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [localPinned, setLocalPinned] = useState(isPinned);
  const [localRating, setLocalRating] = useState<OfficialMessageRating | undefined>(rating);
  const pinned = onPinChapter ? isPinned : localPinned;
  const currentRating = rating ?? localRating;
  const copyMessage = () => {
    if (copyText === undefined) return;
    void navigator.clipboard?.writeText(copyText).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    });
  };
  const pinMessage = () => {
    if (onPinChapter) {
      onPinChapter();
      return;
    }
    setLocalPinned((value) => !value);
  };
  const rateMessage = (nextRating: OfficialMessageRating) => {
    if (rateMessageUuid && onRateMessage) {
      onRateMessage(rateMessageUuid, nextRating);
      setLocalRating(nextRating);
      return;
    }
    setLocalRating((value) => value === nextRating ? undefined : nextRating);
  };
  const shouldShowRewind = Boolean(onRewind) || showBranchActions;
  const shouldShowFork = Boolean(onFork) || showBranchActions;
  const shouldShowRating = Boolean(rateMessageUuid && onRateMessage);
  return (
    <div className={`flex gap-g2 pt-[4px] opacity-0 pointer-events-none group-hover/msg:opacity-100 group-hover/msg:pointer-events-auto focus-within:opacity-100 focus-within:pointer-events-auto ${className}`}>
      {copyText !== undefined ? <OfficialButton ariaLabel={copied ? "Copied" : "Copy message"} icon={copied ? "CheckSelection" : "CopySquareBehind"} onClick={copyMessage} size="small" variant={buttonVariant} /> : null}
      {showPinAction ? <OfficialButton ariaLabel={pinned ? "Unpin chapter" : "Pin as chapter"} icon={pinned ? "Unpin" : "Pin"} onClick={pinMessage} pressed={pinned} size="small" variant={buttonVariant} /> : null}
      {shouldShowRewind ? <OfficialButton ariaLabel={rewindAriaLabel} icon={rewindIcon} onClick={onRewind} size="small" variant={buttonVariant} /> : null}
      {shouldShowFork ? <OfficialButton ariaLabel="Fork from here" icon="GitBranch" onClick={onFork} size="small" variant={buttonVariant} /> : null}
      {shouldShowRating ? (
        <>
          <OfficialButton ariaLabel="Good response" customIcon={<ThumbFeedbackIcon direction="up" />} onClick={() => rateMessage("positive")} pressed={currentRating === "positive"} size="small" variant={buttonVariant} />
          <OfficialButton ariaLabel="Bad response" customIcon={<ThumbFeedbackIcon direction="down" />} onClick={() => rateMessage("negative")} pressed={currentRating === "negative"} size="small" variant={buttonVariant} />
        </>
      ) : null}
      {timestamp ? <OfficialRelativeTimestamp timestamp={timestamp} /> : null}
    </div>
  );
}

function OfficialRelativeTimestamp({ timestamp }: { timestamp: string }) {
  const [, forceUpdate] = useReducer((value: number) => value + 1, 0);

  useEffect(() => {
    const tick = () => {
      if (typeof document === "undefined" || !document.hidden) forceUpdate();
    };
    const timer = window.setInterval(tick, 30_000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  return (
    <span className="text-footnote text-assistant-secondary tabular-nums self-center pl-p1" title={formatTranscriptTimestampTitle(timestamp)}>
      {formatTranscriptTimestamp(timestamp)}
    </span>
  );
}

function ThumbFeedbackIcon({ direction }: { direction: "down" | "up" }) {
  return <Icon name={direction === "up" ? "ThumbsUp" : "ThumbsDown"} customSize={12} />;
}

export function OfficialAssistantMessage({
  children,
  copyText,
  createdAt,
  onFork,
  onRateMessage,
  onRewind,
  rateMessageUuid,
  rating,
  showPinAction = true,
}: {
  children: ReactNode;
  copyText?: string;
  createdAt?: string;
  onFork?: () => void;
  onRateMessage?: (messageUuid: string, rating: OfficialMessageRating) => void;
  onRewind?: () => void;
  rateMessageUuid?: string;
  rating?: OfficialMessageRating;
  showPinAction?: boolean;
}) {
  return (
    <article className="group/msg relative flex flex-col w-full">
      <div className="flex flex-col gap-[var(--chat-item-gap)] select-text">
        {children}
      </div>
      {(copyText !== undefined || createdAt || showPinAction || onFork || onRewind || (rateMessageUuid && onRateMessage)) ? (
        <OfficialMessageActions copyText={copyText} onFork={onFork} onRateMessage={onRateMessage} onRewind={onRewind} rateMessageUuid={rateMessageUuid} rating={rating} showPinAction={showPinAction} timestamp={createdAt} />
      ) : null}
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

export function OfficialComposerPill({
  ariaLabel,
  children,
  className = "",
  icon,
  onClick,
  title,
}: {
  ariaLabel?: string;
  children?: ReactNode;
  className?: string;
  icon?: string;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button aria-label={ariaLabel} className={`${officialComposerPillClass} ${className}`} onClick={onClick} title={title} type="button">
      {icon ? <Icon name={icon} size="s" /> : null}
      {children}
    </button>
  );
}

export function OfficialComposerPillPulse({
  children,
  pulseNonce,
}: {
  children: ReactNode;
  pulseNonce?: unknown;
}) {
  const [isPulsing, setIsPulsing] = useState(false);

  useEffect(() => {
    if (pulseNonce === undefined) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setIsPulsing(true);
  }, [pulseNonce]);

  return (
    <span
      className={isPulsing ? "inline-flex epitaxy-pill-pulse" : "inline-flex"}
      onAnimationEnd={(event) => {
        if (event.animationName === "epitaxy-pill-pulse") setIsPulsing(false);
      }}
    >
      {children}
    </span>
  );
}

export function OfficialComposerFolderPill({
  browseDisabled = false,
  folder,
  isSSH = false,
  onBrowse,
  onSelectFolder,
  recentFolders,
}: OfficialComposerFolderPillProps) {
  const [open, setOpen] = useState(false);
  const duplicateBasenames = useMemoizedDuplicateBasenames(recentFolders);
  const triggerChildren = (
    <>
      <Icon name="Folder1" size="s" />
      <span className="truncate max-w-[160px]">{folder ? basename(folder) : "Select folder…"}</span>
    </>
  );

  if (recentFolders.length === 0) {
    const button = (
      <button className={officialComposerPillClass} disabled={browseDisabled} onClick={onBrowse} title={folder} type="button">
        {triggerChildren}
      </button>
    );
    return browseDisabled ? <span className="inline-flex">{button}</span> : button;
  }

  return (
    <Menu.Root open={open} onOpenChange={setOpen}>
      <Menu.Trigger className={officialComposerPillClass} title={folder}>
        {triggerChildren}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="start" className="epitaxy-root z-[60]" side="top" sideOffset={8}>
          <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <div className={officialMenuScrollClass}>
              <Menu.Group className="flex flex-col">
                <OfficialMenuHeader>Recent</OfficialMenuHeader>
                {recentFolders.map((recent) => {
                  const label = recent.displayName ?? basename(recent.path) ?? recent.path;
                  const parent = parentPath(recent.path);
                  const needsParent = !recent.displayName && parent && duplicateBasenames.has(label);
                  return (
                    <Menu.Item
                      aria-checked={recent.path === folder}
                      className={[officialMenuItemBaseClass, "gap-g3"].join(" ")}
                      key={recent.path}
                      onClick={() => onSelectFolder(recent.path)}
                      role="menuitemradio"
                      title={recent.path}
                    >
                      {needsParent ? (
                        <span className="flex min-w-0 items-baseline">
                          <span className="shrink-0">{label}</span>
                          <span className="ml-[var(--g6)] truncate text-footnote text-t6">{parent}</span>
                        </span>
                      ) : (
                        <span className="flex-1 min-w-0 truncate pr-[16px]">{label}</span>
                      )}
                      <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
                        {recent.path === folder ? <Icon name="CheckSelection" size="sm" /> : null}
                      </span>
                    </Menu.Item>
                  );
                })}
              </Menu.Group>
              <OfficialMenuSeparator />
              <Menu.Item className={[officialMenuItemBaseClass, "gap-g3"].join(" ")} disabled={browseDisabled} onClick={onBrowse}>
                <span className="flex-1 min-w-0 truncate pr-[16px]">{isSSH ? "Browse remote folder…" : "Open folder…"}</span>
              </Menu.Item>
            </div>
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function OfficialComposerSplitPill({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <button className={`${officialComposerSplitPillClass} ${className}`} onClick={onClick} type="button">
      {children}
    </button>
  );
}

export function OfficialSessionSource({ ariaLabel, session, sessionRef }: { ariaLabel?: string; session: SessionSummary | null; sessionRef: OfficialSessionRef }) {
  const cwd = normalizeLabel(session?.cwd);
  const branch = normalizeLabel(session?.repo?.branch);
  const repoNames = normalizeLabel(session?.repo?.name) ? [normalizeLabel(session?.repo?.name)!] : [];
  const repoName = normalizeLabel(repoNames.length > 1 ? `${repoNames.length} repos` : repoNames[0]) ?? normalizeLabel(basename(cwd));
  const kind = sessionSourceKind(sessionRef);

  if (repoName) {
    return <OfficialSessionSourceMenu ariaLabel={ariaLabel} branch={branch} cwd={cwd} kind={kind} repoName={repoName} repoNames={repoNames} />;
  }

  return <OfficialSessionSourceButton ariaLabel={ariaLabel} kind={kind} loading={!session} />;
}

function OfficialSessionSourceMenu({ ariaLabel, branch, cwd, kind, repoName, repoNames }: {
  ariaLabel?: string;
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
        aria-label={ariaLabel ?? sourceAriaLabel(kind)}
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

function OfficialSessionSourceButton({ ariaLabel, kind, label, loading = false }: { ariaLabel?: string; kind: OfficialSessionSourceKind; label?: string; loading?: boolean }) {
  const resolvedAriaLabel = ariaLabel ?? sourceAriaLabel(kind);
  if (label) {
    return (
      <span aria-label={resolvedAriaLabel} className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon kind={kind} />
        <span className="truncate">{label}</span>
      </span>
    );
  }
  if (loading) {
    return (
      <span aria-label={resolvedAriaLabel} className={officialSessionSourceClass}>
        <OfficialSessionSourceIcon kind={kind} />
        <span className="h-[10px] w-[64px] rounded-r3 bg-t2 animate-pulse" />
      </span>
    );
  }
  return <OfficialButton ariaLabel={resolvedAriaLabel} className="text-t9" icon={officialSessionIconMap[kind]} />;
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

function formatTranscriptTimestamp(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  const diffSeconds = Math.max(0, Math.round((Date.now() - time) / 1000));
  if (diffSeconds < 60) return "just now";
  const diffMinutes = Math.round(diffSeconds / 60);
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 30) return `${diffDays}d ago`;
  const diffMonths = Math.round(diffDays / 30);
  if (diffMonths < 12) return `${diffMonths}mo ago`;
  return `${Math.round(diffMonths / 12)}y ago`;
}

function formatTranscriptTimestampTitle(value: string) {
  const time = Date.parse(value);
  if (Number.isNaN(time)) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(time));
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
  const [textSize, setTextSize] = useState<"s" | "m" | "l">("m");
  useEffect(() => {
    document.documentElement.dataset.chatTextSize = textSize;
    return () => {
      delete document.documentElement.dataset.chatTextSize;
    };
  }, [textSize]);

  const items: OfficialDropdownItem[] = [
    { label: "Normal", checked: true },
    { label: "Thinking", checked: false },
    { label: "Verbose", checked: false },
    ...(hideSummary ? [] : [{ label: "Summary", checked: false } satisfies OfficialDropdownItem]),
    {
      keepOpen: true,
      label: null,
      trailing: (
        <div role="group" aria-label="Text size" className="flex items-stretch gap-g3 pt-p6 pb-p2 -ml-[2px] -mr-[2px]">
          {(["s", "m", "l"] as const).map((size) => (
            <OfficialButton
              ariaLabel={size === "s" ? "Small text" : size === "m" ? "Medium text" : "Large text"}
              className="flex-1 aspect-auto"
              customIcon={<Icon name="TitleCaseFontSize" size={size === "s" ? "xs" : size === "m" ? "sm" : "md"} />}
              key={size}
              onClick={() => setTextSize(size)}
              pressed={textSize === size}
              variant="contained"
            />
          ))}
        </div>
      ),
    },
  ];
  return <OfficialDropdownButton ariaLabel="Transcript view mode" header="Transcript view" icon="NoteSquareLines" items={items} revealChevron="never" />;
}

function OfficialViewsButton({ activeView, hasRunningTasks = false, onViewSelect }: { activeView?: OfficialViewPane; hasRunningTasks?: boolean; onViewSelect?: (view: OfficialViewPane) => void }) {
  const items: OfficialDropdownItem[] = [
    { icon: "Play", label: "预览", checked: activeView === "preview", shortcut: "⇧⌘P", onSelect: () => onViewSelect?.("preview") },
    { icon: "ChangesDiffPlusMinusBox", label: "Diff", checked: activeView === "diff", shortcut: "⇧⌘D", onSelect: () => onViewSelect?.("diff") },
    { icon: "TerminalOpenCommandLine", label: "Terminal", checked: activeView === "terminal", shortcut: "⌃`", onSelect: () => onViewSelect?.("terminal") },
    { icon: "Blocks", label: "任务", checked: activeView === "tasks", status: hasRunningTasks && activeView !== "tasks", onSelect: () => onViewSelect?.("tasks") },
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
  if (item.type === "separator") return <OfficialMenuSeparator />;
  if (item.type === "section-header") return <OfficialMenuHeader>{item.label}</OfficialMenuHeader>;
  if (item.type === "loading") return <OfficialLoadingMenuItem item={item} />;
  if (item.items?.length || item.type === "submenu") return <OfficialSubmenuItem hasChecks={hasChecks} item={item} />;

  const hasIcon = Boolean(item.icon);
  const checkProps = item.checked === undefined
    ? {}
    : { "aria-checked": item.checked, role: "menuitemradio" as const };
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.Item
        className={[officialMenuItemBaseClass, hasIcon ? "gap-g6" : "gap-g3"].join(" ")}
        disabled={item.disabled}
        onClick={item.onSelect}
        closeOnClick={item.keepOpen || item.closeOnClick === false ? false : undefined}
        {...checkProps}
      >
        {item.icon ? (
          <span className={["relative flex items-center justify-center size-[14px] shrink-0", item.checked ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
            <Icon name={item.icon} size="sm" bold={item.checked} />
          </span>
        ) : null}
        <OfficialMenuItemLabel item={item} />
        {hasChecks ? (
          <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={officialMenuIconStyle}>
            {item.checked ? <Icon name="CheckSelection" size="sm" /> : null}
          </span>
        ) : null}
        {renderMenuItemStatus(item.status)}
        {item.shortcut ? <OfficialShortcut keys={item.shortcut} /> : null}
        {item.suffix}
        {item.trailing}
      </Menu.Item>
    </>
  );
}

function OfficialSubmenuItem({ hasChecks, item }: { hasChecks: boolean; item: OfficialDropdownItem }) {
  const hasIcon = Boolean(item.icon);
  const [open, setOpen] = useState(false);
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.SubmenuRoot open={open} onOpenChange={(nextOpen) => setOpen(nextOpen)}>
        <Menu.SubmenuTrigger
          className={[officialMenuItemBaseClass, hasIcon ? "gap-g6" : "gap-g3"].join(" ")}
          delay={0}
          disabled={item.disabled}
          onClick={() => setOpen(true)}
          onPointerEnter={() => setOpen(true)}
          openOnHover
        >
          {item.icon ? (
            <span className={["relative flex items-center justify-center size-[14px] shrink-0", item.checked ? "text-[var(--accent)]" : ""].join(" ")} style={officialMenuIconStyle}>
              <Icon name={item.icon} size="sm" bold={item.checked} />
            </span>
          ) : null}
          <OfficialMenuItemLabel item={item} />
          {hasChecks ? <span className="size-[16px] shrink-0 ml-[6px]" /> : null}
          {renderMenuItemStatus(item.status)}
          {item.shortcut ? <OfficialShortcut keys={item.shortcut} /> : null}
          {item.suffix}
          {item.trailing}
          <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-t6" style={officialMenuIconStyle}>
            <Icon name="ChevronRightMedium" size="sm" />
          </span>
        </Menu.SubmenuTrigger>
        <Menu.Portal>
          <Menu.Positioner align="start" className="epitaxy-root z-[70]" side="right" sideOffset={4}>
            <Menu.Popup className={officialMenuPopupClass} data-cds="Menu">
              <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
              <div className={officialMenuScrollClass}>
                <Menu.Group className="flex flex-col">
                  <OfficialMenuItems items={item.items ?? []} />
                  {item.submenuFooterItems?.length ? (
                    <>
                      <OfficialMenuSeparator />
                      <OfficialMenuItems items={item.submenuFooterItems} />
                    </>
                  ) : null}
                </Menu.Group>
              </div>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.SubmenuRoot>
    </>
  );
}

function OfficialLoadingMenuItem({ item }: { item: OfficialDropdownItem }) {
  return (
    <>
      {item.separatorBefore ? <OfficialMenuSeparator /> : null}
      <Menu.Item className={[officialMenuItemBaseClass, "gap-g6"].join(" ")} disabled>
        <span className="relative flex items-center justify-center size-[14px] shrink-0" style={officialMenuIconStyle}>
          <Icon name={item.icon ?? "Spinner"} size="sm" />
        </span>
        <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label || "Loading…"}</span>
      </Menu.Item>
    </>
  );
}

function OfficialMenuItemLabel({ item }: { item: OfficialDropdownItem }) {
  if (!item.subtitle) return <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label}</span>;
  return (
    <span className="flex flex-1 min-w-0 flex-col pr-[16px]">
      <span className="truncate">{item.label}</span>
      <span className="truncate text-footnote text-t6">{item.subtitle}</span>
    </span>
  );
}

function renderMenuItemStatus(status: ReactNode | boolean) {
  if (status === true) {
    return <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-[var(--accent)]" />;
  }
  return status || null;
}

function OfficialShortcut({ keys }: { keys: string | string[] }) {
  const normalizedKeys = Array.isArray(keys) ? keys.join(" ") : keys;
  if (/^[1-9]$/.test(normalizedKeys)) {
    return <span className="shrink-0 pl-p2 text-body text-t6 tabular-nums">{normalizedKeys}</span>;
  }

  return (
    <span className="flex items-center gap-px shrink-0 text-footnote text-t6">
      {splitShortcutKeys(normalizedKeys).map((key, index) => (
        <kbd className="font-ui flex items-center justify-center h-[16px]" key={`${key}-${index}`}>{key}</kbd>
      ))}
    </span>
  );
}

function OfficialMenuHeader({ children, triggerKey }: { children: ReactNode; triggerKey?: ReactNode | string | string[] }) {
  return (
    <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">
      <span className="flex-1 pr-p8">{children}</span>
      {typeof triggerKey === "string" || Array.isArray(triggerKey) ? <OfficialTriggerShortcut keys={triggerKey} /> : triggerKey}
    </div>
  );
}

function OfficialTriggerShortcut({ keys }: { keys: string | string[] }) {
  const normalizedKeys = Array.isArray(keys) ? keys.join(" ") : keys;
  return (
    <span className="inline-flex items-center gap-g3">
      {shortcutChordGroups(normalizedKeys).map((group, groupIndex) => (
        <span className="contents" key={`${group.join("-")}-${groupIndex}`}>
          {groupIndex > 0 ? <span className="text-footnote opacity-60">then</span> : null}
          {group.map((key, keyIndex) => (
            <kbd className="inline-flex items-center justify-center h-h3 min-w-[var(--h3)] px-p3 rounded-r3 bg-t1 border border-[var(--border-default)] text-caption" key={`${key}-${keyIndex}`}>
              {key}
            </kbd>
          ))}
        </span>
      ))}
    </span>
  );
}

function shortcutChordGroups(keys: string) {
  return keys.trim().split(/\s+/).filter(Boolean).map(shortcutChordParts);
}

function shortcutChordParts(chord: string) {
  if (!chord.includes("+")) return Array.from(chord);

  const rawParts = chord.toLowerCase().split("+").filter(Boolean);
  const keyPart = rawParts.find((part) => !["alt", "cmd", "ctrl", "shift"].includes(part));
  const mac = isMacLikePlatform();
  const modifierOrder = mac ? ["shift", "alt", "cmd", "ctrl"] : ["cmd", "ctrl", "shift", "alt"];
  const modifierLabels: Record<string, string> = mac
    ? { alt: "⌥", cmd: "⌘", ctrl: "⌃", shift: "⇧" }
    : { alt: "Alt", cmd: "Ctrl", ctrl: "Ctrl", shift: "Shift" };
  const parts = modifierOrder
    .filter((part) => rawParts.includes(part))
    .map((part) => modifierLabels[part]);
  if (keyPart) parts.push(keyPart.toUpperCase());
  return parts;
}

function isMacLikePlatform() {
  if (typeof navigator === "undefined") return true;
  return /Mac|iPhone|iPad|iPod/.test(navigator.platform);
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

function useMemoizedDuplicateBasenames(recentFolders: OfficialComposerFolderRecent[]) {
  return useMemo(() => {
    const counts = new Map<string, number>();
    for (const recent of recentFolders) {
      const label = basename(recent.path);
      if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
    }
    return new Set([...counts].filter(([, count]) => count > 1).map(([label]) => label));
  }, [recentFolders]);
}

function parentPath(value: string): string | null {
  const index = Math.max(value.lastIndexOf("/"), value.lastIndexOf("\\"));
  return index > 0 ? value.slice(0, index) : null;
}

function normalizeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function basename(value?: string): string | undefined {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
