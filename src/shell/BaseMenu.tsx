import { Menu } from "@base-ui-components/react/menu";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import type { CSSProperties, ReactNode } from "react";
import { Icon } from "./icons";

const popupClassName = "cds-root cds-reset flex flex-col min-w-[128px] max-w-[320px] max-h-[var(--available-height)] rounded-card bg-surface-3 backdrop-blur-[12px] shadow-panel data-[starting-style]:opacity-0 text-body text-primary outline-none";
const popupScrollClassName = "min-h-0 overflow-y-auto rounded-[inherit] p-1";
const itemClassName = "cds-reset flex w-full items-center gap-xs px-md py-[calc((var(--cds-h-control)-var(--cds-leading-body))/2)] rounded text-body select-none outline-none data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-primary data-[highlighted]:bg-fill-ghost-hover";
const submenuTriggerClassName = `${itemClassName} justify-between data-[popup-open]:bg-fill-ghost-hover`;
const separatorClassName = "mx-pad-md my-1 h-px bg-border";

type Side = "top" | "right" | "bottom" | "left" | "inline-end" | "inline-start";
type Align = "start" | "center" | "end";

export { ContextMenu, Menu };

export function BaseMenuPopup({ align, children, className, side, sideOffset, style }: { align?: Align; children: ReactNode; className?: string; side?: Side; sideOffset?: number; style?: CSSProperties }) {
  return (
    <Menu.Portal>
      <Menu.Positioner align={align} className="z-popover" side={side} sideOffset={sideOffset}>
        <Menu.Popup className={`${popupClassName} ${className ?? ""}`} data-cds="Menu" style={style}>
          <div className={popupScrollClassName}>{children}</div>
        </Menu.Popup>
      </Menu.Positioner>
    </Menu.Portal>
  );
}

export function BaseContextMenuPopup({ align, children, className, side, sideOffset, style }: { align?: Align; children: ReactNode; className?: string; side?: Side; sideOffset?: number; style?: CSSProperties }) {
  return (
    <ContextMenu.Portal>
      <ContextMenu.Positioner align={align} className="z-popover" side={side} sideOffset={sideOffset}>
        <ContextMenu.Popup className={`${popupClassName} ${className ?? ""}`} data-cds="Menu" style={style}>
          <div className={popupScrollClassName}>{children}</div>
        </ContextMenu.Popup>
      </ContextMenu.Positioner>
    </ContextMenu.Portal>
  );
}

export function BaseMenuItem({ children, checked, checkedRole = "checkbox", className, icon, keepOpen, lang, onClick, trailing }: { children: ReactNode; checked?: boolean; checkedRole?: "checkbox" | "radio"; className?: string; icon?: string; keepOpen?: boolean; lang?: string; onClick?: () => void; trailing?: ReactNode }) {
  const checkedProps = checked === undefined ? {} : { "aria-checked": checked, role: checkedRole === "radio" ? "menuitemradio" : "menuitemcheckbox" };
  return (
    <Menu.Item {...checkedProps} className={`${itemClassName} ${className ?? ""}`} closeOnClick={keepOpen ? false : undefined} lang={lang} onClick={onClick}>
      {icon ? <span className="flex size-icon shrink-0 items-center justify-center"><Icon name={icon} /></span> : null}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
      {checked !== undefined ? <span className="flex size-icon shrink-0 items-center justify-center ml-xs" style={{ color: "var(--cds-fill-accent)" }}>{checked ? <Icon name="check" /> : null}</span> : null}
    </Menu.Item>
  );
}

/** Official Cd.Item path for ContextMenu (not Menu.Item). */
export function BaseContextMenuItem({ children, className, onClick }: { children: ReactNode; className?: string; onClick?: () => void }) {
  return (
    <ContextMenu.Item className={`${itemClassName} ${className ?? ""}`} onClick={onClick}>
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </ContextMenu.Item>
  );
}

export function BaseContextMenuSeparator() {
  return <ContextMenu.Separator className={separatorClassName} />;
}

export function BaseMenuSeparator() {
  return <Menu.Separator className={separatorClassName} />;
}

export function BaseMenuGroupLabel({ children }: { children: ReactNode }) {
  return <Menu.GroupLabel className="px-md py-1 text-footnote font-medium text-muted">{children}</Menu.GroupLabel>;
}

export function BaseMenuHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={`px-md py-1 text-footnote font-medium text-muted ${className ?? ""}`} role="presentation">{children}</div>;
}

export function BaseSubmenu({
  children,
  icon,
  label,
  popupAlign,
  popupClassName,
  popupSide,
  popupSideOffset,
  summary,
  summaryClassName,
  trigger,
}: {
  children: ReactNode;
  icon?: string;
  label?: ReactNode;
  popupAlign?: Align;
  popupClassName?: string;
  popupSide?: Side;
  popupSideOffset?: number;
  summary?: ReactNode;
  summaryClassName?: string;
  trigger?: ReactNode;
}) {
  return (
    <Menu.SubmenuRoot>
      <Menu.SubmenuTrigger className={submenuTriggerClassName}>
        {icon ? <span className="flex size-icon shrink-0 items-center justify-center"><Icon name={icon} /></span> : null}
        <span className="min-w-0 flex-1 truncate">
          {trigger ?? (
            summary ? (
              <span className="flex w-full items-center gap-sm">
                <span className="flex-1 truncate">{label}</span>
                <span className={summaryClassName ?? "shrink-0 text-footnote text-muted"}>{summary}</span>
              </span>
            ) : label
          )}
        </span>
        <Icon name="CaretRight" size="sm" className="shrink-0 text-muted" />
      </Menu.SubmenuTrigger>
      <BaseMenuPopup align={popupAlign} className={popupClassName} side={popupSide} sideOffset={popupSideOffset}>{children}</BaseMenuPopup>
    </Menu.SubmenuRoot>
  );
}
