import { Menu } from "@base-ui-components/react/menu";
import type { ReactNode } from "react";

const dropdownContentClassName = "p-1.5 z-dropdown bg-bg-000 border-0.5 border-border-200 backdrop-blur-xl rounded-xl min-w-[8rem] text-text-300 outline-none shadow-[0px_2px_8px_0px_hsl(var(--always-black)/8%)] dark:shadow-[0px_2px_8px_0px_hsl(var(--always-black)/24%)] max-h-[min(var(--radix-select-content-available-height,var(--radix-dropdown-menu-content-available-height)),var(--dropdown-max-height,24rem))] overflow-y-auto overflow-x-hidden";
const dropdownItemClassName = "font-base min-h-8 px-2 py-1.5 rounded-lg cursor-pointer whitespace-nowrap overflow-hidden text-ellipsis grid grid-cols-[minmax(0,_1fr)_auto] gap-2 items-center outline-none select-none [&[data-highlighted]]:bg-bg-300 [&[data-highlighted]]:text-text-000";
const dropdownSeparatorClassName = "h-[0.5px] bg-border-300 my-1.5 mx-2";

type DropdownSide = "top" | "right" | "bottom" | "left" | "inline-end" | "inline-start";
type DropdownAlign = "start" | "center" | "end";

export { Menu as LegacyDropdownMenu };

export function LegacyDropdownPopup({
  align = "end",
  alignOffset,
  children,
  className,
  collisionPadding,
  onMouseEnter,
  onMouseLeave,
  side,
  sideOffset = 4,
  ...dataProps
}: {
  align?: DropdownAlign;
  alignOffset?: number;
  children: ReactNode;
  className?: string;
  collisionPadding?: number;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  side?: DropdownSide;
  sideOffset?: number;
  [key: `data-${string}`]: string | undefined;
}) {
  return (
    <Menu.Portal>
      <div className="epitaxy-root">
        <Menu.Positioner align={align} alignOffset={alignOffset} collisionPadding={collisionPadding} side={side} sideOffset={sideOffset}>
          <Menu.Popup
            className={`${dropdownContentClassName} ${className ?? ""}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            {...dataProps}
          >
            {children}
          </Menu.Popup>
        </Menu.Positioner>
      </div>
    </Menu.Portal>
  );
}

export function LegacyDropdownItem({ children, className, icon, onSelect, trailing }: { children: ReactNode; className?: string; icon?: ReactNode; onSelect?: () => void; trailing?: ReactNode }) {
  const content = icon || trailing ? (
    <div className="flex items-center gap-2 w-full font-base group">
      {icon}
      <span className="flex-1 truncate">{children}</span>
      {trailing ? <div className="flex items-center flex-shrink-0 -mr-2">{trailing}</div> : null}
    </div>
  ) : children;

  return <Menu.Item className={`${dropdownItemClassName} ${className ?? ""}`} onClick={onSelect}>{content}</Menu.Item>;
}

export function LegacyDropdownSeparator({ className }: { className?: string }) {
  return <Menu.Separator className={`${dropdownSeparatorClassName} ${className ?? ""}`} />;
}
