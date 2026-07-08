import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { Icon } from "../../../shell/icons";

type CoworkActivitySectionProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  headerClassName?: string;
  isExpanded: boolean;
  maxContentHeight?: string;
  onToggle: () => void;
  title: ReactNode;
};

export function CoworkActivitySection({ children, className, contentClassName, headerClassName, isExpanded, maxContentHeight, onToggle, title }: CoworkActivitySectionProps) {
  return (
    <div className={`rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm overflow-hidden shrink-0 ${className ?? ""}`}>
      <CoworkActivitySectionHeader className={headerClassName} isExpanded={isExpanded} title={title} onToggle={onToggle} />
      <CoworkActivitySectionContent contentClassName={contentClassName} isExpanded={isExpanded} maxContentHeight={maxContentHeight}>{children}</CoworkActivitySectionContent>
    </div>
  );
}

function CoworkActivitySectionHeader({ className, isExpanded, onToggle, title }: { className?: string; isExpanded: boolean; onToggle: () => void; title: ReactNode }) {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onToggle();
  };
  return (
    <div aria-expanded={isExpanded} className={`can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer ${className ?? ""}`} onClick={onToggle} onKeyDown={onKeyDown} role="button" tabIndex={0}>
      <span className="font-medium text-sm text-text-100">{title}</span>
      <span className={`inline-flex h-5 w-5 items-center justify-center text-text-500 transition-transform duration-200 ease-[cubic-bezier(0,0,0.2,1)] ${isExpanded ? "rotate-90" : ""}`}>
        <Icon name="CaretRight" size="sm" />
      </span>
    </div>
  );
}

function CoworkActivitySectionContent({ children, contentClassName, isExpanded, maxContentHeight }: { children: ReactNode; contentClassName?: string; isExpanded: boolean; maxContentHeight?: string }) {
  return (
    <div className="grid transition-[grid-template-rows] duration-200" inert={!isExpanded || undefined} style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}>
      <div className="overflow-hidden">
        <div className={`px-3 pb-3 ${maxContentHeight ? "overflow-y-auto" : ""} ${contentClassName ?? ""}`} style={maxContentHeight ? { maxHeight: maxContentHeight } : undefined}>
          {children}
        </div>
      </div>
    </div>
  );
}
