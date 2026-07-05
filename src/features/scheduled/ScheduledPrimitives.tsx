import type { ReactNode } from "react";
import { Icon } from "../../shell/icons";

type ShellProps = {
  children: ReactNode;
};

type HeaderProps = {
  title: ReactNode;
  actions?: ReactNode;
  onBack: () => void;
};

type SectionProps = {
  heading: ReactNode;
  children: ReactNode;
};

export function ScheduledRouteShell({ children }: ShellProps) {
  return (
    <div className="epitaxy-root relative isolate select-none h-full flex flex-col">
      <div className="draggable absolute inset-x-0 top-0 h-[32px] -z-[1]" aria-hidden="true" />
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}

export function RoutineHeader({ title, actions, onBack }: HeaderProps) {
  return (
    <div data-top-left className="relative flex items-center h-[32px] pl-[16px] pr-[16px]">
      <div className="draggable absolute inset-0 -z-[1]" aria-hidden="true" />
      <div className="relative z-[1] flex items-center min-w-0 draggable-none">
        <button type="button" onClick={onBack} className="-ml-[4px] inline-flex items-center gap-g4 h-base px-p3 rounded-base border-0 cursor-default select-none outline-none hide-focus-ring ring-focus min-w-0 bg-fill-uncontained-default text-t9 text-body hover:bg-fill-uncontained-hover">
          <Icon name="arrowLeft" />
          <span>Routines</span>
        </button>
        <span className="text-body text-t7 select-none shrink-0 pr-[4px]" aria-hidden="true">/</span>
        <span className="truncate text-body text-t7 select-none min-w-0">{title}</span>
      </div>
      {actions ? <div className="relative z-[1] ml-auto flex items-center gap-g8 pr-p5 shrink-0 draggable-none">{actions}</div> : null}
    </div>
  );
}

export function DetailSection({ heading, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-g5">
      <h2 className="text-body text-t6">{heading}</h2>
      {children}
    </section>
  );
}

export const chipClass = "inline-flex items-center gap-g2 px-p4 py-p2 rounded-r4 bg-t1 text-footnote text-t8";

export const subtleButtonClass = "inline-flex items-center gap-g2 px-p4 py-p2 rounded-r4 text-footnote text-t6 hover:text-t8 hover:bg-t2 hide-focus-ring ring-focus";
