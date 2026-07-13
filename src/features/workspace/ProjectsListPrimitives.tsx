/**
 * Official projects list primitives from index-BELzQL5P:
 * - EGt shell (lB)
 * - NGt grid (lC)
 * - SGt/MGt/jGt card (lD)
 * - gYt expandable search (lF)
 */
import { Menu } from "@base-ui-components/react/menu";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Icon } from "../../shell/icons";
import { OfficialButton } from "../shared/OfficialButton";
import { OfficialTextInput } from "../shared/OfficialTextInput";
import { OfficialTooltip } from "../shared/OfficialTooltip";

/** Official jGt card surface (index-BELzQL5P SGt). */
export const PROJECT_CARD_CLASS =
  "from-bg-100 to-bg-100/30 border-0.5 border-border-300 hover:from-bg-000 hover:to-bg-000/80 hover:border-border-200 relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-gradient-to-b p-4 transition-all ease-in-out hover:shadow-sm active:scale-[0.98] h-full w-full text-left no-underline";

export function ProjectsPageShell({
  action,
  children,
  tabsEnd,
  title = "项目",
}: {
  action?: ReactNode;
  children?: ReactNode;
  tabsEnd?: ReactNode;
  title?: ReactNode;
}) {
  const toolbar = tabsEnd || action ? (
    <div className="flex items-center gap-3">
      {tabsEnd}
      {action}
    </div>
  ) : null;

  return (
    <div className="flex flex-col h-full" data-official-source="index-BELzQL5P.js:EGt">
      <header
        className="flex w-full bg-bg-100 h-12 mx-auto md:h-24 md:items-end max-w-4xl shrink-0 md:!h-14 md:!items-center [&_h1]:font-normal [&>div]:md:!px-8"
        data-official-source="index-BELzQL5P.js:BFe"
        data-testid="page-header"
      >
        <div className="flex w-full items-center justify-between gap-4 pl-11 lg:px-8 px-4 md:px-8">
          <h1 className="text-text-100 flex items-center gap-2 text-center max-md:hidden min-w-0 font-heading text-2xl">
            <span className="truncate">{title}</span>
          </h1>
          <div />
          {toolbar}
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="mx-auto w-full max-w-4xl px-4 md:!px-8 mt-2 md:mt-4 pb-8">{children}</div>
      </div>
    </div>
  );
}

export function ProjectsCardGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 md:gap-4 grid-cols-1 auto-rows-fr mb-3 md:mb-6"
      data-official-source="index-BELzQL5P.js:NGt"
    >
      {children}
    </div>
  );
}

export function ProjectCard({
  className,
  description,
  footer,
  href,
  onClick,
  title,
}: {
  className?: string;
  description?: ReactNode;
  footer?: ReactNode;
  href?: string;
  onClick?: () => void;
  title: ReactNode;
}) {
  const cardClass = [PROJECT_CARD_CLASS, href ? "cursor-default" : "", className]
    .filter(Boolean)
    .join(" ");
  const body = (
    <div className="flex flex-col flex-grow gap-1.5" data-official-source="index-BELzQL5P.js:MGt">
      <div className="flex items-center overflow-hidden pr-10">
        <div className="font-base-bold text-text-100 truncate">{title}</div>
      </div>
      {description ? <div className="font-small text-text-400 line-clamp-2">{description}</div> : null}
      {footer ? <div className="font-small text-text-500 mt-auto pt-2 flex justify-between">{footer}</div> : null}
    </div>
  );

  if (href) {
    return (
      <div className="relative group h-full">
        <a
          className={cardClass}
          data-official-source="index-BELzQL5P.js:SGt/jGt"
          href={href}
          onClick={(event) => {
            if (onClick) {
              event.preventDefault();
              onClick();
            }
          }}
        >
          {body}
        </a>
      </div>
    );
  }

  return (
    <div className="relative group h-full">
      <button className={cardClass} data-official-source="index-BELzQL5P.js:SGt/jGt" onClick={onClick} type="button">
        {body}
      </button>
    </div>
  );
}

/** Official gYt expandable filter (Cmd/Ctrl+F). */
export function ProjectsExpandableSearch({
  onChange,
  onExpandChange,
  placeholder = "Search projects",
  value,
}: {
  onChange: (value: string) => void;
  onExpandChange?: (expanded: boolean) => void;
  placeholder?: string;
  value: string;
}) {
  const [expanded, setExpanded] = useState(value !== "");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    onExpandChange?.(expanded);
  }, [expanded, onExpandChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        setExpanded(true);
        requestAnimationFrame(() => inputRef.current?.focus());
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
            <Icon customSize={12} name="X" />
          </button>
        }
        aria-label={placeholder}
        className="w-[200px]"
        data-official-source="index-BELzQL5P.js:gYt"
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.nativeEvent.isComposing) return;
          if (event.key === "Escape") {
            event.preventDefault();
            if (value) onChange("");
            else setExpanded(false);
          }
        }}
        onBlur={() => {
          if (!value) setExpanded(false);
        }}
        placeholder={placeholder}
        prepend={<Icon customSize={14} name="Search" />}
        ref={inputRef}
        size="sm"
        value={value}
      />
    );
  }

  return (
    <OfficialTooltip keyboardShortcut="cmd+f" side="top" tooltipContent={placeholder}>
      <OfficialButton
        aria-label={placeholder}
        data-official-source="index-BELzQL5P.js:gYt"
        onClick={() => {
          setExpanded(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        size="icon_sm"
        variant="ghost"
      >
        <Icon customSize={16} name="Search" />
      </OfficialButton>
    </OfficialTooltip>
  );
}

export type ProjectSortBy = "recent" | "created" | "alphabetical";

const SORT_LABELS: Record<ProjectSortBy, string> = {
  recent: "Recent",
  created: "Created",
  alphabetical: "Alphabetical",
};

export function ProjectsSortMenu({
  onChange,
  value,
}: {
  onChange: (value: ProjectSortBy) => void;
  value: ProjectSortBy;
}) {
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label="Sort by"
        className="inline-flex h-8 w-8 items-center justify-center rounded-md border-0 bg-transparent text-text-300 hover:bg-bg-200"
        data-official-source="index-BELzQL5P.js:_Component32 sort"
        type="button"
      >
        <Icon customSize={16} name="Sort" />
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Positioner align="end" className="z-popover" sideOffset={6}>
          <Menu.Popup className="min-w-[10rem] rounded-xl border border-border-300 bg-bg-000 p-1 shadow-lg outline-none">
            {(Object.keys(SORT_LABELS) as ProjectSortBy[]).map((option) => (
              <Menu.Item
                className="flex cursor-default items-center rounded-lg px-3 py-2 text-sm text-text-200 outline-none data-[highlighted]:bg-bg-200"
                key={option}
                onClick={() => onChange(option)}
              >
                <span className="flex-1">{SORT_LABELS[option]}</span>
                {value === option ? <Icon className="text-accent-100" customSize={14} name="Check" /> : null}
              </Menu.Item>
            ))}
          </Menu.Popup>
        </Menu.Positioner>
      </Menu.Portal>
    </Menu.Root>
  );
}

export function formatProjectRelativeTime(ms: number, locale = "en"): string {
  if (!ms || Number.isNaN(ms)) return "";
  const deltaSec = Math.round((ms - Date.now()) / 1000);
  const abs = Math.abs(deltaSec);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (abs < 60) return rtf.format(Math.round(deltaSec), "second");
  if (abs < 3600) return rtf.format(Math.round(deltaSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(deltaSec / 3600), "hour");
  if (abs < 86400 * 30) return rtf.format(Math.round(deltaSec / 86400), "day");
  if (abs < 86400 * 365) return rtf.format(Math.round(deltaSec / (86400 * 30)), "month");
  return rtf.format(Math.round(deltaSec / (86400 * 365)), "year");
}
