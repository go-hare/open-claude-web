import type { ReactNode } from "react";
import { Icon } from "./icons";

type SidebarSectionHeaderProps = {
  children: ReactNode;
  collapsed?: boolean;
  className?: string;
  onToggle?: () => void;
  trailing?: ReactNode;
};

const headerClassName = "group/labelrow flex w-full items-center gap-[var(--df-row-gap)] pt-[var(--df-group-pt)] pr-[var(--df-row-px)] pb-1 text-xs text-text-400/80 pl-[calc(var(--df-row-px)+(var(--df-leading-slot)-var(--df-icon-size))/2)]";

export function SidebarSectionHeader({ children, className, collapsed, onToggle, trailing }: SidebarSectionHeaderProps) {
  const classes = `${headerClassName} ${className ?? ""}`;
  if (!onToggle) {
    return (
      <div className={classes}>
        <span className="flex-1 truncate">{children}</span>
        {trailing}
      </div>
    );
  }
  return (
    <div className={classes}>
      <button
        aria-expanded={!collapsed}
        className="group/label flex min-w-0 flex-1 items-center gap-1 text-left hover:text-text-300 transition-colors duration-150"
        onClick={onToggle}
        type="button"
      >
        <span className="min-w-0 truncate">{children}</span>
        <Icon
          name="CaretRight"
          customSize={12}
          className={`shrink-0 opacity-0 transition-[opacity,transform] duration-150 group-hover/section:opacity-100 group-focus-visible/label:opacity-100 ${collapsed ? "" : "rotate-90"}`}
        />
      </button>
      {trailing}
    </div>
  );
}
