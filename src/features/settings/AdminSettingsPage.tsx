import type { RouteViewProps } from "../../app/routes";
import { CdsButton, SettingsDFrame, navLinkClass, sectionBodyClass } from "./SettingsShell";

const adminLinks = [
  { href: "/admin-settings/organization", label: "Organization" },
  { href: "/admin-settings/members", label: "Members" },
  { href: "/admin-settings/data-privacy-controls", label: "数据与隐私" },
  { href: "/admin-settings/capabilities", label: "功能" },
  { href: "/admin-settings/claude-code", label: "Claude Code" },
];

export function AdminSettingsPage({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  return (
    <SettingsDFrame title="Organization settings" onNavigate={onNavigate} trailing={<AdminBell />} withRoot={false}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl !mt-0 lg:!mt-0">
          <div className="cds-root text-primary grid grid-cols-1 md:grid-cols-[220px_minmax(0px,_1fr)] gap-x-8 w-full my-4 md:my-8" data-density="comfortable" data-mode="light" data-platform="desktop">
            <AdminNav onNavigate={onNavigate} pathname={pathname} />
            <div className="outline-none pt-1.5" tabIndex={-1}>{renderAdminContent(pathname)}</div>
          </div>
        </main>
      </div>
    </SettingsDFrame>
  );
}


function renderAdminContent(pathname: string) {
  if (pathname === "/admin-settings/members") return <MembersContent />;
  if (pathname === "/admin-settings/organization") return <OrganizationContent />;
  return <p>Not Found</p>;
}

function MembersContent() {
  return (
    <section className="mb-xl last:mb-0 ">
      <div className="mb-md flex items-start justify-between gap-lg">
        <div className="flex min-w-0 flex-col gap-1"><h3 className="text-heading-semibold text-primary">Members</h3></div>
        <CdsButton primary>Add member</CdsButton>
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="cds-reset inline-flex rounded-lg bg-bg-200 p-0.5">
            <button className="cds-reset relative z-[1] inline-flex items-center justify-center gap-1.5 px-md select-none border-0 rounded-md bg-bg-000 h-7" type="button">进行中</button>
            <button className="cds-reset relative z-[1] inline-flex items-center justify-center gap-1.5 px-md select-none border-0 rounded-md h-7" type="button">Pending</button>
          </div>
          <button className="cds-reset flex min-w-0 items-center gap-1.5 self-stretch pl-sm text-left border-0 bg-transparent rounded-lg px-3 h-8" type="button">Role&nbsp;&nbsp;全部 </button>
        </div>
        <div className="cds-reset group/cbx inline-flex min-w-0 items-center gap-1.5 h-control rounded-lg text-body text-primary bg-bg-000 border border-border-300 px-3 w-full max-w-[220px] ml-auto">
          <input aria-label="Search members" className="cds-input cds-reset min-w-0 flex-1 h-full bg-transparent border-0 p-0 outline-none text-body text-primary" />
        </div>
        <p className="text-body text-secondary">Failed to load members. <button className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] text-accent" type="button">Retry.</button></p>
      </div>
    </section>
  );
}
function AdminBell() {
  return (
    <span className="relative inline-flex">
      <button aria-label="No admin notifications" className="cds-reset group/btn relative isolate inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap select-none border-0 outline-none rounded h-control text-body font-medium [&:disabled:not([aria-busy])]:opacity-50 disabled:pointer-events-none transition-shadow duration-fast focus-visible:shadow-focus text-primary aria-pressed:text-accent aspect-square w-control px-0  " data-base-ui-click-trigger="" data-cds="Button" type="button">
        <span className="absolute inset-0 -z-[1] rounded-[inherit] transition-colors duration-fast group-focus-visible/btn:shadow-[inset_0_0_0_1px_var(--cds-page-bg)] bg-transparent group-hover/btn:bg-fill-ghost-hover group-aria-pressed/btn:bg-accent group-hover/btn:group-aria-pressed/btn:bg-accent cds-btn-squish" />
        <span className="inline-flex items-center gap-1 "></span>
      </button>
    </span>
  );
}

function AdminNav({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  return (
    <nav className="min-w-0 w-full -ml-3 self-start md:sticky md:top-4 md:overflow-y-auto md:overflow-x-hidden md:px-1 md:pt-1 md:pb-4 max-md:relative z-10 mb-4 md:mb-0 md:max-h-[calc(100vh-5rem-var(--df-chrome-bar-height,0px))]">
      <div className="min-w-0 p-1 -m-1">
        <div className="overflow-x-auto overflow-y-hidden min-w-0 p-1 -m-1">
          <ul className="flex gap-1 md:flex-col mb-0">
            {adminLinks.map((link) => <AdminLink active={pathname === link.href} key={link.href} link={link} onNavigate={onNavigate} />)}
          </ul>
          <h2 className="text-text-400 font-small mx-3 mt-8 mb-1 break-all line-clamp-1">Libraries</h2>
          <ul className="flex gap-1 md:flex-col mb-0">
            <AdminLink active={pathname === "/admin-settings/connectors"} link={{ href: "/admin-settings/connectors", label: "连接器" }} onNavigate={onNavigate} />
          </ul>
          <ul className="mt-8">
            <AdminLink active={false} link={{ href: "/settings", label: "Personal settings" }} onNavigate={onNavigate} />
          </ul>
        </div>
      </div>
    </nav>
  );
}

function AdminLink({ active, link, onNavigate }: Pick<RouteViewProps, "onNavigate"> & { active: boolean; link: { href: string; label: string } }) {
  return (
    <li>
      <a
        aria-current={active ? "page" : undefined}
        className={`${navLinkClass} ${active ? "bg-bg-300" : "hover:bg-bg-200"}`}
        href={link.href}
        onClick={(event) => {
          event.preventDefault();
          onNavigate(link.href);
        }}
      >
        <span className="min-w-0 truncate">{link.label}</span>
      </a>
    </li>
  );
}

function OrganizationContent() {
  return (
    <main>
      <AdminSection title="Team overview">
        <AdminRow control={<CdsButton>Update</CdsButton>} label="Team name" value={<span>Workbench Org</span>} />
        <div className="grid grid-cols-2 gap-lg py-md md:grid-cols-3">
          <AdminMetric action={<InlineLink href="/admin-settings/identity">Update</InlineLink>} label="Allowed email domains" value={<span className="block truncate">-</span>} />
          <AdminMetric action={<InlineButton>Manage</InlineButton>} label="Total seats" value={<LoadingSkeleton />} />
          <AdminMetric action={<InlineButton>View details</InlineButton>} label="Total members" value={<LoadingSkeleton />} />
        </div>
      </AdminSection>
      <AdminSection title="Organization">
        <AdminRow control={<OrgIdChip />} label="Organization ID" />
        <div className="flex items-center justify-between gap-lg py-md" role="group">
          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <div className="text-body text-primary">Delete organization</div>
            <div className="text-body text-muted">To delete your organization, <InlineLink href="/settings/billing">cancel your subscription</InlineLink> first.</div>
          </div>
        </div>
      </AdminSection>
    </main>
  );
}

function AdminSection({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <section className="mb-xl last:mb-0 ">
      <div className="mb-md flex items-start justify-between gap-lg">
        <div className="flex min-w-0 flex-col gap-1"><h3 className="text-heading-semibold text-primary">{title}</h3></div>
      </div>
      <div className={sectionBodyClass}>{children}</div>
    </section>
  );
}

function AdminRow({ control, label, value }: { control?: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-lg py-md  " role="group">
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
        <div className="text-body text-primary">{label}</div>
        {value ? <div className="text-body text-muted">{value}</div> : null}
      </div>
      {control ? <div className="flex shrink-0 items-center">{control}</div> : null}
    </div>
  );
}

function AdminMetric({ action, label, value }: { action: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-xs">
      <span className="truncate text-body text-primary">{value}</span>
      <span className="text-footnote text-secondary">{label}</span>
      <span className="text-footnote">{action}</span>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <>
      <div className="relative overflow-hidden rounded bg-skeleton-base after:absolute after:inset-0 after:-translate-x-full after:animate-[cds-shimmer_1.5s_infinite] after:bg-[linear-gradient(90deg,transparent,var(--cds-skeleton-sheen),transparent)] h-[14px] w-[120px]" />
      <span className="sr-only">Loading</span>
    </>
  );
}

function OrgIdChip() {
  return (
    <button aria-label="Copy organization ID" className="cds-reset group block rounded-chip focus-visible:shadow-focus" type="button">
      <span className="inline-flex items-center align-middle h-control-nested rounded-chip px-sm text-caption font-medium leading-tight shrink-0 bg-neutral-chip text-secondary relative overflow-hidden whitespace-nowrap font-mono transition-colors hover:bg-neutral-chip-hover">
        <span className="whitespace-nowrap group-hover:[mask-image:linear-gradient(to_left,transparent,transparent_1.25rem,black_2.5rem)] group-data-[copied=true]:[mask-image:linear-gradient(to_left,transparent,transparent_1.25rem,black_2.5rem)]">org_workbench</span>
        <span className="absolute right-0.5 top-1/2 -translate-y-1/2 text-secondary opacity-0 group-hover:opacity-100"></span>
      </span>
    </button>
  );
}

function InlineLink({ children, href }: { children: React.ReactNode; href: string }) {
  return <a className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer  " href={href}>{children}</a>;
}

function InlineButton({ children }: { children: React.ReactNode }) {
  return <button className="cds-reset inline underline underline-offset-[3px] decoration-[color-mix(in_srgb,currentColor,transparent_60%)] transition duration-fast text-accent outline-none hover:decoration-current focus-visible:decoration-current focus-visible:shadow-focus rounded-[2px] cursor-pointer " type="button">{children}</button>;
}
