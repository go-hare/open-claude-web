import { Menu } from "@base-ui-components/react/menu";
import { ContextMenu } from "@base-ui-components/react/context-menu";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "./icons";
import {
  readResolvedColorMode,
  THEME_MODE_CHANGE_EVENT,
} from "../features/settings/appearanceSettings";

/**
 * Official menu popup chrome (c43c5949a Surface popover + shadow-panel).
 * Portal re-roots tokens via le-style cds-root + data-mode/density/platform
 * (bare cds-root without data-mode re-applies light --cds-ring-* defaults).
 */
const popupClassName =
  "cds-reset flex flex-col min-w-[128px] max-w-[320px] max-h-[var(--available-height)] rounded-card bg-surface-3 backdrop-blur-[12px] shadow-panel data-[starting-style]:opacity-0 text-body text-primary outline-none";
const popupScrollClassName = "min-h-0 overflow-y-auto rounded-[inherit] p-1";
const itemClassName = "cds-reset flex w-full items-center gap-xs px-md py-[calc((var(--cds-h-control)-var(--cds-leading-body))/2)] rounded text-body select-none outline-none data-[disabled]:opacity-50 data-[disabled]:pointer-events-none text-primary data-[highlighted]:bg-fill-ghost-hover";
const submenuTriggerClassName = `${itemClassName} justify-between data-[popup-open]:bg-fill-ghost-hover`;
const separatorClassName = "mx-pad-md my-1 h-px bg-border";

type Side = "top" | "right" | "bottom" | "left" | "inline-end" | "inline-start";
type Align = "start" | "center" | "end";

export { ContextMenu, Menu };

/** Official le portal root — same token re-root as GhostSelect CdsPortalRoot. */
function CdsPortalRoot({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return (
    <div
      className="cds-root"
      data-cds-portal=""
      data-density="default"
      data-mode={mode}
      data-platform="desktop"
    >
      {children}
    </div>
  );
}

export function BaseMenuPopup({ align, children, className, side, sideOffset, style }: { align?: Align; children: ReactNode; className?: string; side?: Side; sideOffset?: number; style?: CSSProperties }) {
  return (
    <Menu.Portal>
      <CdsPortalRoot>
        <Menu.Positioner align={align} className="z-popover" side={side} sideOffset={sideOffset}>
          <Menu.Popup className={`${popupClassName} ${className ?? ""}`} data-cds="Menu" style={style}>
            <div className={popupScrollClassName}>{children}</div>
          </Menu.Popup>
        </Menu.Positioner>
      </CdsPortalRoot>
    </Menu.Portal>
  );
}

export function BaseContextMenuPopup({ align, children, className, side, sideOffset, style }: { align?: Align; children: ReactNode; className?: string; side?: Side; sideOffset?: number; style?: CSSProperties }) {
  return (
    <ContextMenu.Portal>
      <CdsPortalRoot>
        <ContextMenu.Positioner align={align} className="z-popover" side={side} sideOffset={sideOffset}>
          <ContextMenu.Popup className={`${popupClassName} ${className ?? ""}`} data-cds="Menu" style={style}>
            <div className={popupScrollClassName}>{children}</div>
          </ContextMenu.Popup>
        </ContextMenu.Positioner>
      </CdsPortalRoot>
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
