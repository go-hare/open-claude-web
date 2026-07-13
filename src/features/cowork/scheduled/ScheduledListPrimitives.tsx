/**
 * Official scheduled-task list primitives from index-BELzQL5P:
 * EGt page shell, BFe header (desktop large/narrow), NGt grid, SGt/MGt cards, jGt card chrome,
 * gYt filter (vIe + Dc ghost icon_sm), Ide sort, Kfe/Gfe banner, yYt/bYt status pill.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { KeepAwakeControl } from "./KeepAwakeControl";
import { ScheduledTasksEmptyPictogram } from "./ScheduledTasksEmptyPictogram";

/** Official jGt card chrome */
const officialCardChrome =
  "from-bg-100 to-bg-100/30 border-0.5 border-border-300 hover:from-bg-000 hover:to-bg-000/80 hover:border-border-200 relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-gradient-to-b p-4 transition-all ease-in-out hover:shadow-sm active:scale-[0.98] h-full w-full text-left no-underline";

/** Official bYt status pill chrome */
const statusPillChrome =
  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-medium border-0.5 w-fit";

/** Official Gfe main banner base (variant main = bg-bg-200) */
const bannerMainChrome =
  "flex w-fit rounded-xl p-3 gap-3 items-start text-sm border-0.5 border-border-200 bg-bg-200";

export function ScheduledTasksPageShell({
  action,
  children,
  subheader,
  tabsEnd,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  subheader?: ReactNode;
  tabsEnd?: ReactNode;
  title: ReactNode;
}) {
  // Official EGt: tabs || tabsEnd || action → flex items-center gap-3
  const headerEnd = tabsEnd || action ? (
    <div className="flex items-center gap-3">
      {tabsEnd}
      {action}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full" data-official-source="index-BELzQL5P.js:EGt">
      <header
        className="flex w-full bg-bg-100 h-12 mx-auto md:h-24 md:items-end max-w-4xl shrink-0 md:!h-14 md:!items-center [&_h1]:font-normal [&>div]:md:!px-8"
        data-official-source="index-BELzQL5P.js:BFe large narrow"
        data-testid="page-header"
      >
        <div className="flex w-full items-center justify-between gap-4 pl-11 lg:px-8 px-4 md:px-8">
          <h1 className="text-text-100 flex items-center gap-2 text-center max-md:hidden min-w-0 font-heading text-2xl">
            <span className="truncate">{title}</span>
          </h1>
          <div />
          {headerEnd}
        </div>
      </header>
      {subheader ? (
        <div className="shrink-0 mx-auto w-full max-w-4xl px-4 md:!px-8 -mt-1 pb-3">{subheader}</div>
      ) : null}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 md:!px-8 mt-2 md:mt-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

export function ScheduledTaskCardGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4 grid-cols-1 auto-rows-fr mb-3 md:mb-6"
      data-official-source="index-BELzQL5P.js:NGt"
    >
      {children}
    </div>
  );
}

export function ScheduledTaskCard({
  description,
  footer,
  href,
  onClick,
  overlay,
  title,
}: {
  description?: ReactNode;
  footer?: ReactNode;
  href?: string;
  onClick?: () => void;
  overlay?: ReactNode;
  title: ReactNode;
}) {
  // Official MGt body
  const body = (
    <div className="flex flex-col flex-grow gap-1.5" data-official-source="index-BELzQL5P.js:MGt">
      <div className={`flex items-center overflow-hidden ${overlay ? "pr-28" : "pr-10"}`}>
        <div className="font-base-bold text-text-100 truncate">{title}</div>
      </div>
      {description ? <div className="font-small text-text-400 line-clamp-2">{description}</div> : null}
      {footer ? <div className="font-small text-text-500 mt-auto pt-2 flex justify-between">{footer}</div> : null}
    </div>
  );

  // Official SGt surface: jGt + cursor-default when href
  const surface = href ? (
    <a
      className={`${officialCardChrome} cursor-default`}
      href={href}
      onClick={(event) => {
        if (!onClick) return;
        event.preventDefault();
        onClick();
      }}
    >
      {body}
    </a>
  ) : (
    <button className={officialCardChrome} onClick={onClick} type="button">
      {body}
    </button>
  );

  return (
    <div className="relative group h-full" data-official-source="index-BELzQL5P.js:SGt">
      {surface}
      {overlay ? (
        <div className="absolute top-3 right-3 z-10 transition-opacity pointer-events-none">{overlay}</div>
      ) : null}
    </div>
  );
}

export function ScheduledTaskStatusPill({
  completed,
  enabled,
  label,
}: {
  completed?: boolean;
  enabled: boolean;
  label?: string | null;
}) {
  // Official yYt
  if (enabled && label) {
    return (
      <span
        className={`${statusPillChrome} bg-success-900/50 border-success-000/40 text-success-000`}
        data-official-source="index-BELzQL5P.js:yYt"
      >
        <Icon name="ClockTimeslot" size="xs" />
        {label}
      </span>
    );
  }
  if (!enabled) {
    return (
      <span
        className={`${statusPillChrome} bg-bg-200 border-border-300 text-text-400`}
        data-official-source="index-BELzQL5P.js:yYt paused"
      >
        <Icon name={completed ? "check" : "Stop"} size="xs" />
        {completed ? "Completed" : "Paused"}
      </span>
    );
  }
  return null;
}

export function ScheduledTasksFilterControl({
  onChange,
  placeholder,
  value,
}: {
  onChange: (value: string) => void;
  placeholder: string;
  value: string;
}) {
  // Official gYt: collapsed Dc ghost icon_sm; expanded vIe size sm w-[200px]
  const [expanded, setExpanded] = useState(value !== "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  const expand = () => {
    setExpanded(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "f") {
        event.preventDefault();
        expand();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  if (expanded) {
    return (
      <OfficialTextInput
        append={
          <button
            aria-label="Clear filter"
            className="p-0.5 rounded hover:bg-bg-300 text-text-400 hover:text-text-200"
            onClick={() => {
              onChange("");
              setExpanded(false);
            }}
            type="button"
          >
            <Icon name="X" size="xs" />
          </button>
        }
        aria-label={placeholder}
        className="w-[200px]"
        data-official-source="index-BELzQL5P.js:gYt expanded vIe"
        onBlur={() => {
          if (!value) setExpanded(false);
        }}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key !== "Escape") return;
          event.preventDefault();
          if (value) onChange("");
          else setExpanded(false);
        }}
        placeholder={placeholder}
        prepend={<Icon className="text-text-400" name="search" size="sm" />}
        ref={inputRef}
        size="sm"
        type="text"
        value={value}
      />
    );
  }

  // Official gYt collapsed: Xp tooltipContent=placeholder keyboardShortcut="cmd+f" side="top" → Dc ghost icon_sm
  return (
    <OfficialTooltip keyboardShortcut="cmd+f" side="top" tooltipContent={placeholder}>
      <OfficialButton
        aria-label={placeholder}
        data-official-source="index-BELzQL5P.js:gYt collapsed Dc"
        onClick={expand}
        size="icon_sm"
        variant="ghost"
      >
        <Icon name="search" size="sm" />
      </OfficialButton>
    </OfficialTooltip>
  );
}

export function ScheduledTasksSortControl({
  onChange,
  value,
}: {
  onChange: (value: "nextRun" | "name") => void;
  value: "nextRun" | "name";
}) {
  // Official CYt: Ide trigger = Dc ghost icon_sm + Sort icon; menu items Next run / Name
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  return (
    <div className="relative" data-official-source="index-BELzQL5P.js:CYt sort Ide" ref={rootRef}>
      {/* Official Ide trigger is Dc ghost icon_sm aria-label Sort by; hover description via Xp-style tooltip */}
      <OfficialTooltip side="top" tooltipContent="Sort by">
        <OfficialButton
          aria-label="Sort by"
          onClick={() => setOpen((current) => !current)}
          size="icon_sm"
          variant="ghost"
        >
          <Icon name="Sort" size="sm" />
        </OfficialButton>
      </OfficialTooltip>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[9rem] rounded-lg border-0.5 border-border-300 bg-bg-100 p-1 shadow-md">
          {(
            [
              ["nextRun", "Next run"],
              ["name", "Name"],
            ] as const
          ).map(([option, label]) => (
            <button
              className={`flex w-full items-center rounded-md px-2 py-1.5 text-left text-sm ${value === option ? "bg-bg-200 text-text-100" : "text-text-300 hover:bg-bg-200 hover:text-text-100"}`}
              key={option}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              type="button"
            >
              {label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function ScheduledLocalAwakeBanner({ action }: { action?: ReactNode }) {
  // Official CYt: Kfe variant main + className !w-full inside w-full mb-6 wrapper
  // customAction = <div className="flex items-center h-8"><hYt size="md" context="scheduled-task"/></div>
  const resolvedAction = action ?? <KeepAwakeControl size="md" />;
  return (
    <div className="w-full mb-6" data-official-source="index-BELzQL5P.js:CYt awake wrapper">
      <div
        className={`${bannerMainChrome} !w-full`}
        data-color-context="main"
        data-official-source="index-BELzQL5P.js:Kfe/Gfe main"
      >
        <div className="h-8 ml-1 flex items-center text-text-300">
          <Icon name="LockShield" size="md" />
        </div>
        <div className="flex flex-wrap items-start gap-y-1 gap-x-3 flex-1">
          <div className="my-[0.35rem] flex-1 min-w-[min(20ch,100%)] text-text-300">
            Scheduled tasks only run while your computer is awake.
          </div>
          <div className="flex items-center h-8">{resolvedAction}</div>
        </div>
      </div>
    </div>
  );
}

export function ScheduledTasksEmptyState() {
  // Official CYt empty: xB size medium + "No scheduled tasks yet."
  return (
    <div
      className="flex flex-col items-center justify-center py-16 gap-4 text-text-500 font-base"
      data-official-source="index-BELzQL5P.js:CYt empty"
    >
      <ScheduledTasksEmptyPictogram size="medium" />
      No scheduled tasks yet.
    </div>
  );
}
