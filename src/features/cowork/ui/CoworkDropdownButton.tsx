import { Menu } from "@base-ui-components/react/menu";
import { isValidElement, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import type { CoworkDropdownItem } from "./CoworkMenuTypes";

type CoworkDropdownButtonProps = {
  align?: "start" | "center" | "end";
  alignOffset?: number;
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  header?: ReactNode;
  icon?: string;
  items?: CoworkDropdownItem[];
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
  variant?: "uncontained" | "contained" | "muted";
};

const popupClass = "epitaxy-popup relative isolate min-w-[130px] max-w-[320px] max-h-[var(--available-height)] flex flex-col py-p5 rounded-r6 outline-none";
const itemClass = "relative isolate flex items-center min-h-[var(--h4)] shrink-0 px-p8 text-body select-none cursor-default outline-none hide-focus-ring before:content-[''] before:absolute before:-z-[1] before:inset-y-0 before:left-[6px] before:right-[6px] before:rounded-r5 data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-[var(--menu-item-color,var(--t8))] data-[highlighted]:before:bg-fill-uncontained-hover hover:before:bg-fill-uncontained-hover focus-visible:before:bg-fill-uncontained-hover";
const iconStyle = { "--class-base-icon": "14px" } as CSSProperties;
const sizeClass = { small: "h-small rounded-small text-footnote", base: "h-base rounded-base text-body", large: "h-large rounded-large text-heading" };
const variantClass = {
  uncontained: "text-uncontained-default hover:text-uncontained-hover disabled:text-uncontained-disabled",
  contained: "text-contained-default hover:text-contained-hover disabled:text-contained-disabled",
  muted: "text-t6 hover:text-t7 disabled:text-t4",
};
const backgroundClass = {
  uncontained: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]",
  contained: "bg-[var(--fill-contained-default)] group-hover/dd:bg-[var(--fill-contained-hover)] effect-contained-default",
  muted: "bg-[var(--fill-uncontained-default)] group-hover/dd:bg-[var(--fill-uncontained-hover)]",
};

export function CoworkDropdownButton({ align = "end", alignOffset, ariaLabel, className, disabled, header, icon, items = [], label, mode, onOpenChange, open, popupClassName, pressed, revealChevron = "always", side = "bottom", sideOffset = 8, size = "base", variant = "uncontained" }: CoworkDropdownButtonProps) {
  const actualMode = mode ?? (icon ? "icon" : "text");
  const offset = alignOffset ?? (align === "end" ? 0 : actualMode === "text" ? -6 : -8);
  return (
    <Menu.Root onOpenChange={onOpenChange} open={open}>
      <Menu.Trigger aria-label={ariaLabel} className={["group/dd relative isolate inline-flex items-center min-w-0 border-0 cursor-default select-none outline-none hide-focus-ring ring-focus", variantClass[variant], sizeClass[size], actualModeClass(actualMode), className ?? ""].join(" ")} disabled={disabled}>
        <span aria-hidden="true" className={`absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none ${backgroundClass[variant]}`} />
        {actualMode === "icon" && icon ? <span className="relative inline-flex"><Icon className={pressed ? "text-[var(--accent)]" : undefined} name={icon} size={size === "large" ? "md" : size === "base" ? "sm" : "xs"} /></span> : null}
        {actualMode === "text" ? <span className="min-w-0 overflow-x-clip text-ellipsis whitespace-nowrap">{label}</span> : null}
        {revealChevron !== "never" ? <Icon className={revealChevron === "hover" ? "shrink-0 opacity-0 group-hover/dd:opacity-100 group-aria-[expanded=true]/dd:opacity-100" : "shrink-0"} name="ChevronDownSmall" size="xs" /> : null}
      </Menu.Trigger>
      {items.length > 0 ? <CoworkDropdownPopup align={align} alignOffset={offset} header={header} items={items} popupClassName={popupClassName} side={side} sideOffset={sideOffset} /> : null}
    </Menu.Root>
  );
}

function CoworkDropdownPopup({ align, alignOffset, header, items, popupClassName, side, sideOffset }: { align: "start" | "center" | "end"; alignOffset: number; header?: ReactNode; items: CoworkDropdownItem[]; popupClassName?: string; side: "top" | "right" | "bottom" | "left"; sideOffset: number }) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} alignOffset={alignOffset} className="epitaxy-root z-[60]" side={side} sideOffset={sideOffset}>
        <Menu.Popup className={`${popupClass} ${popupClassName ?? ""}`} data-cds="Menu">
          <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
          <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
            {header ? <div className="flex items-center gap-g3 px-p8 py-p2 min-h-[20px] text-footnote text-t6" role="presentation">{header}</div> : null}
            <CoworkMenuItems items={items} />
          </div>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

function CoworkMenuItems({ items }: { items: CoworkDropdownItem[] }) {
  const hasChecks = items.some((item) => item.checked !== undefined);
  return <>{items.map((item, index) => <CoworkMenuItem hasChecks={hasChecks} item={item} key={index} />)}</>;
}

function CoworkMenuItemIcon({ checked, icon }: { checked?: boolean; icon?: ReactNode }) {
  if (!icon) return null;
  return (
    <span className={`relative flex items-center justify-center size-[14px] shrink-0 ${checked ? "text-[var(--accent)]" : ""}`} style={iconStyle}>
      {typeof icon === "string" ? <Icon bold={Boolean(checked)} name={icon} size="sm" /> : isValidElement(icon) ? icon : null}
    </span>
  );
}

function CoworkMenuItem({ hasChecks, item }: { hasChecks: boolean; item: CoworkDropdownItem }) {
  if (item.type === "separator") return <CoworkMenuSeparator />;
  if (item.type === "section-header") return <div className="flex items-center px-p8 py-p2 min-h-[20px] text-footnote text-t6">{item.label}</div>;
  if (item.items?.length || item.type === "submenu") return <CoworkSubmenu hasChecks={hasChecks} item={item} />;
  return (
    <>
      {item.separatorBefore ? <CoworkMenuSeparator /> : null}
      <Menu.Item aria-checked={item.checked} className={[itemClass, item.icon ? "gap-g6" : "gap-g3"].join(" ")} closeOnClick={item.keepOpen || item.closeOnClick === false ? false : undefined} disabled={item.disabled} onClick={item.onSelect} role={item.checked === undefined ? undefined : "menuitemradio"}>
        <CoworkMenuItemIcon checked={item.checked} icon={item.icon} />
        <CoworkMenuItemLabel item={item} />
        {hasChecks ? <span className="flex items-center justify-center size-[16px] shrink-0 ml-[6px] text-[var(--accent)]" style={iconStyle}>{item.checked ? <Icon name="CheckSelection" size="sm" /> : null}</span> : null}
        {item.status === true ? <span aria-hidden="true" className="size-[6px] shrink-0 rounded-full bg-[var(--accent)]" /> : item.status || null}
        {item.shortcut ? <span className="shrink-0 pl-p2 text-body text-t6">{Array.isArray(item.shortcut) ? item.shortcut.join(" ") : item.shortcut}</span> : null}
        {item.suffix}{item.trailing}
      </Menu.Item>
    </>
  );
}

function CoworkSubmenu({ hasChecks, item }: { hasChecks: boolean; item: CoworkDropdownItem }) {
  const [open, setOpen] = useState(false);
  return (
    <Menu.SubmenuRoot onOpenChange={setOpen} open={open}>
      <Menu.SubmenuTrigger className={[itemClass, item.icon ? "gap-g6" : "gap-g3"].join(" ")} disabled={item.disabled} onClick={() => setOpen(true)} openOnHover>
        <CoworkMenuItemIcon icon={item.icon} />
        <CoworkMenuItemLabel item={item} />{hasChecks ? <span className="size-[16px] shrink-0 ml-[6px]" /> : null}<Icon name="ChevronRightMedium" size="sm" />
      </Menu.SubmenuTrigger>
      <Menu.Portal><Menu.Positioner align="start" className="epitaxy-root z-[70]" side="right" sideOffset={4}><Menu.Popup className={popupClass}><span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-surface-popover effect-hud" /><CoworkMenuItems items={item.items ?? []} /></Menu.Popup></Menu.Positioner></Menu.Portal>
    </Menu.SubmenuRoot>
  );
}

function CoworkMenuItemLabel({ item }: { item: CoworkDropdownItem }) {
  if (!item.subtitle) return <span className="flex-1 min-w-0 truncate pr-[16px]">{item.label}</span>;
  return <span className="flex flex-1 min-w-0 flex-col pr-[16px]"><span className="truncate">{item.label}</span><span className="truncate text-footnote text-t6">{item.subtitle}</span></span>;
}

function CoworkMenuSeparator() {
  return <Menu.Separator className="relative h-h1"><div className="absolute left-[12px] right-[12px] top-1/2 h-px rounded-[1px] bg-t3" /></Menu.Separator>;
}

function actualModeClass(mode: "text" | "icon" | "chevron") {
  if (mode === "icon") return "justify-center aspect-square px-p3";
  if (mode === "chevron") return "justify-center px-p2";
  return "justify-between gap-g2 pl-p5 pr-p2";
}
