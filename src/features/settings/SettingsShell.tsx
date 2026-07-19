import { useEffect, useId, useState, type ReactNode } from "react";
import type { RouteViewProps } from "../../app/routes";
import { Icon } from "../../shell/icons";
import { readResolvedColorMode, THEME_MODE_CHANGE_EVENT } from "./appearanceSettings";

export type NavSection = {
  id: string;
  href: string;
  label: string;
  exactMatch?: boolean;
};

export type NavGroup = {
  title?: string;
  sections: NavSection[];
};

const headerButtonClass = `inline-flex
  items-center
  justify-center
  relative
  isolate
  shrink-0
  can-focus
  select-none
  disabled:pointer-events-none
  disabled:opacity-50
  disabled:shadow-none
  disabled:drop-shadow-none border-transparent
          transition
          font-base
          duration-300
          ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 w-8 rounded-md _fill_10ocf_9 _ghost_10ocf_96`;

export const navLinkClass = "font-base block whitespace-nowrap transition-colors ease-in-out rounded-lg px-3 h-9 line-clamp-1 flex gap-3 items-center";
export const sectionBodyClass = "divide-y divide-alpha-1 [&>:not([role=group])]:py-md";
export const secondaryButtonClass = "cds-reset group/btn relative isolate inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none border-0 outline-none rounded h-control text-body font-medium [&:disabled:not([aria-busy])]:opacity-50 disabled:pointer-events-none transition-shadow duration-fast focus-visible:shadow-focus text-primary backdrop-blur-sm aria-pressed:text-accent px-md  ";
export const primaryButtonClass = "cds-reset group/btn relative isolate inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none border-0 outline-none rounded h-control text-body font-medium [&:disabled:not([aria-busy])]:opacity-50 disabled:pointer-events-none transition-shadow duration-fast focus-visible:shadow-focus text-on-primary px-md  ";

export function isNavActive(section: NavSection, pathname: string) {
  if (section.exactMatch) return pathname === section.href;
  return pathname === section.href || pathname.startsWith(`${section.href}/`);
}

function useResolvedColorMode(): "light" | "dark" {
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
  return mode;
}

export function SettingsDFrame({
  children,
  onNavigate,
  title,
  trailing,
  withRoot = true,
}: Pick<RouteViewProps, "onNavigate"> & {
  children: ReactNode;
  title: string;
  trailing?: ReactNode;
  withRoot?: boolean;
}) {
  // Official cds-root data-mode follows ThemeProvider resolved mode (not hard-coded light).
  const colorMode = useResolvedColorMode();
  const content = (
    <div className="flex flex-col overflow-hidden bg-bg-100 h-full">
      <header className="flex h-12 shrink-0 items-center gap-1 pr-4 border-b-[0.5px] border-border-200 draggable pl-24">
        <button
          aria-label="Back to Claude"
          className={headerButtonClass}
          onClick={() => onNavigate("/code")}
          type="button"
        >
          <Icon name="arrowLeft" />
        </button>
        <span className="select-none text-sm text-text-300">{title}</span>
        {trailing ? <div className="draggable-none flex items-center gap-2 shrink-0 ml-auto">{trailing}</div> : null}
      </header>
      {children}
    </div>
  );

  return (
    <div style={{ height: "100%" }}>
      <div className="root" style={{ height: "100%" }}>
        <div className="grid w-full overflow-hidden" style={{ height: "100%" }}>
          <div className="flex min-h-0 min-w-0 w-full overflow-x-clip relative overflow-y-clip" style={{ height: "100%" }}>
            <div className="pointer-events-none absolute inset-0 bg-bg-100 [background-image:linear-gradient(to_right,hsl(var(--bg-200))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--bg-200))_1px,transparent_1px)] [background-size:32px_32px]" />
            <div className="dframe-root draggable-none" data-experiment="true" data-frame-mode="code">
              <main className="dframe-content">
                <div className="dframe-content-inner">
                  <div className="flex-1 min-h-0 flex flex-col relative isolate">
                    {withRoot ? (
                      <div className="cds-root text-primary h-full" data-density="comfortable" data-mode={colorMode} data-platform="desktop">
                        {content}
                      </div>
                    ) : content}
                  </div>
                </div>
              </main>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PersonalSettingsLayout({
  children,
  groups,
  onNavigate,
  pathname,
}: Pick<RouteViewProps, "onNavigate"> & {
  children?: ReactNode;
  groups: NavGroup[];
  pathname: string;
}) {
  return (
    <SettingsDFrame title="设置" onNavigate={onNavigate}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl !mt-0 lg:!mt-0">
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0px,_1fr)] gap-x-8 w-full pt-6">
            <SettingsNav groups={groups} onNavigate={onNavigate} pathname={pathname} />
            <div className="outline-none" tabIndex={-1}>{children}</div>
          </div>
        </main>
      </div>
    </SettingsDFrame>
  );
}

export function SettingsNav({
  groups,
  onNavigate,
  pathname,
}: Pick<RouteViewProps, "onNavigate"> & {
  groups: NavGroup[];
  pathname: string;
}) {
  return (
    <nav aria-label="设置" className="min-w-0 w-full -ml-3 self-start md:sticky max-md:relative z-10 mb-4 md:mb-0 md:top-6">
      <div className="min-w-0 p-1 -m-1">
        <div className="overflow-x-auto overflow-y-hidden min-w-0 p-1 -m-1">
          {groups.map((group, index) => (
            <NavGroupView group={group} key={group.title ?? index} onNavigate={onNavigate} pathname={pathname} />
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavGroupView({ group, onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { group: NavGroup; pathname: string }) {
  return (
    <>
      {group.title ? <h2 className="text-text-400 font-small mx-3 mt-8 mb-1 break-all line-clamp-1">{group.title}</h2> : null}
      <ul className="flex gap-1 md:flex-col mb-0">
        {group.sections.map((section) => {
          const active = isNavActive(section, pathname);
          return (
            <li key={section.id}>
              <a
                aria-current={active ? "page" : undefined}
                className={`${navLinkClass} ${active ? "bg-bg-300" : "hover:bg-bg-200"}`}
                href={section.href}
                onClick={(event) => {
                  event.preventDefault();
                  onNavigate(section.href);
                }}
              >
                <span className="min-w-0 truncate">{section.label}</span>
              </a>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function SettingsSection({
  action,
  children,
  className,
  description,
  id,
  title,
}: {
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  description?: ReactNode;
  id?: string;
  title?: ReactNode;
}) {
  const hasHeader = Boolean(title || description || action);
  return (
    <section className={`mb-xl last:mb-0 ${className ?? ""}`} id={id}>
      {hasHeader ? (
        <div className="mb-md flex items-start justify-between gap-lg">
          <div className="flex min-w-0 flex-col gap-1">
            {title ? <h3 className="text-heading-semibold text-primary">{title}</h3> : null}
            {description ? <p className="text-footnote text-secondary">{description}</p> : null}
          </div>
          {action ? <div className="flex shrink-0 items-center gap-sm">{action}</div> : null}
        </div>
      ) : null}
      <div className={sectionBodyClass}>{children}</div>
    </section>
  );
}

export function SettingsRow({
  className,
  control,
  description,
  htmlFor,
  label,
}: {
  className?: string;
  control?: ReactNode;
  description?: ReactNode;
  htmlFor?: string;
  label: ReactNode;
}) {
  const labelId = useId();
  const descriptionId = useId();
  return (
    <div
      aria-describedby={description ? descriptionId : undefined}
      aria-labelledby={labelId}
      className={`flex items-center justify-between gap-lg py-md ${className ?? ""}`}
      role="group"
    >
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        {htmlFor ? <label className="text-body text-primary" htmlFor={htmlFor} id={labelId}>{label}</label> : <div className="text-body text-primary" id={labelId}>{label}</div>}
        {description ? <div className="text-body text-muted" id={descriptionId}>{description}</div> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center">{control}</div> : null}
    </div>
  );
}

export function Switch({ checked = false, disabled = false, onCheckedChange }: { checked?: boolean; disabled?: boolean; onCheckedChange?: (checked: boolean) => void }) {
  const data = checked ? { "data-checked": "" } : { "data-unchecked": "" };
  return (
    <>
      <button
        aria-checked={checked}
        className="cds-reset relative inline-flex shrink-0 rounded-full border-0 outline-none bg-switch-track hover:bg-switch-track-hover data-[checked]:bg-fill-accent data-[checked]:hover:bg-fill-accent-hover disabled:opacity-50 disabled:hover:bg-switch-track focus-visible:shadow-focus h-switch w-[calc(var(--cds-switch-h,20px)*1.8)] p-[2px] "
        data-cds="Switch"
        disabled={disabled}
        onClick={() => onCheckedChange?.(!checked)}
        role="switch"
        type="button"
        {...data}
      >
        <span className="block rounded-full bg-switch-knob shadow-sm transition-transform duration-snap ease-overshoot motion-reduce:transition-none size-[calc(var(--cds-switch-h,20px)-4px)] data-[checked]:translate-x-[calc(var(--cds-switch-h,20px)*0.8)]" {...data} />
      </button>
      <input aria-hidden="true" checked={checked} readOnly style={{ height: 1, left: -1, position: "absolute", top: -1, width: 1 }} type="checkbox" />
    </>
  );
}


export function CdsButton({
  children,
  disabled = false,
  onClick,
  primary = false,
}: {
  children: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  primary?: boolean;
}) {
  return (
    <button
      className={primary ? primaryButtonClass : secondaryButtonClass}
      data-cds="Button"
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span className={`absolute inset-0 -z-[1] rounded-[inherit] transition-colors duration-fast group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)] ${primary ? "bg-fill-primary group-hover/btn:bg-fill-primary-hover" : "bg-fill-secondary group-hover/btn:bg-fill-secondary-hover group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent cds-btn-squish shadow-field"}`} />
      <span className="inline-flex items-center gap-1 ">{children}</span>
    </button>
  );
}
