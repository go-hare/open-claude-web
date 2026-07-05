import { useEffect } from "react";
import type { ReactNode } from "react";
import type { RouteViewProps } from "../../app/routes";
import { SettingsDFrame, navLinkClass } from "../settings/SettingsShell";

const navGroups = [
  { items: [{ href: "/analytics/activity", label: "All activity" }] },
  { title: "Apps", items: [{ href: "/analytics/usage", label: "Claude.ai" }, { href: "/analytics/claude-code", label: "Claude Code" }] },
  { title: "Analytics API", items: [{ href: "/analytics/api-keys", label: "API keys" }] },
];

export function AnalyticsPage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  useEffect(() => {
    if (pathname === "/analytics") onNavigate("/analytics/activity");
  }, [onNavigate, pathname]);
  if (pathname === "/analytics") return null;
  return (
    <SettingsDFrame title="Analytics" onNavigate={onNavigate} withRoot={false}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <main className="mx-auto mt-4 w-full flex-1 px-4 md:px-8 lg:mt-6 max-w-7xl !mt-0 lg:!mt-0">
          <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0px,_1fr)] gap-x-8 w-full max-w-6xl my-4">
            <AnalyticsNav onNavigate={onNavigate} pathname={pathname} />
            <div className="pb-10 pt-1.5">{renderAnalyticsContent(pathname)}</div>
          </div>
        </main>
      </div>
    </SettingsDFrame>
  );
}

function AnalyticsNav({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  return (
    <nav className="min-w-0 w-full -ml-3 self-start md:sticky md:top-4 max-md:relative z-10 mb-4 md:mb-0">
      <div className="min-w-0 p-1 -m-1">
        <div className="overflow-x-auto overflow-y-hidden min-w-0 p-1 -m-1">
          {navGroups.map((group, index) => (
            <div key={group.title ?? index}>
              {group.title ? <h2 className="text-text-400 font-small mx-3 mt-8 mb-1 break-all line-clamp-1">{group.title}</h2> : null}
              <ul className="flex gap-1 md:flex-col mb-0">{group.items.map((item) => <NavItem active={pathname === item.href} item={item} key={item.href} onNavigate={onNavigate} />)}</ul>
            </div>
          ))}
        </div>
      </div>
    </nav>
  );
}

function NavItem({ active, item, onNavigate }: Pick<RouteViewProps, "onNavigate"> & { active: boolean; item: { href: string; label: string } }) {
  return (
    <li><a aria-current={active ? "page" : undefined} className={`${navLinkClass} ${active ? "bg-bg-300" : "hover:bg-bg-200"}`} href={item.href} onClick={(event) => { event.preventDefault(); onNavigate(item.href); }}><span className="min-w-0 truncate">{item.label}</span></a></li>
  );
}

function renderAnalyticsContent(pathname: string) {
  if (pathname === "/analytics/usage") return <ClaudeUsage />;
  if (pathname === "/analytics/api-keys") return <ApiKeys />;
  if (pathname === "/analytics/claude-code") return <ClaudeCodeAnalytics />;
  return <AllActivity />;
}

function HeaderBlock({ title }: { title: string }) {
  return <div className="space-y-1"><h2 className="text-heading text-primary">{title}</h2><p className="text-body text-secondary">View usage and activity metrics for your organization</p><UtcNote /></div>;
}

function UtcNote() {
  return <div className="flex items-center gap-1.5 text-body text-secondary"><span>Data in UTC · Updated daily</span><button className="inline-flex items-center" type="button"></button></div>;
}

function AllActivity() {
  return <main className="flex flex-col gap-10 pb-10"><HeaderBlock title="All activity" /><section className="space-y-4"><h2 className="text-heading text-primary">Usage</h2><p className="text-body text-secondary">Unable to load activity data. Try again later.</p></section><ErrorCard>Unable to load chart data. Try again later.</ErrorCard><ErrorCard>无法加载连接器数据。请稍后重试。</ErrorCard></main>;
}

function ClaudeUsage() {
  return (
    <main className="flex flex-col gap-10 pb-10"><HeaderBlock title="Claude.ai" /><MetricSection title="Chats" labelA="Chats per day" labelB="Users with 1 or more chat" ranking="Chats" /><MetricSection title="项目" labelA="Projects created" labelB="Users with 1 or more project" ranking="Top 10 users by projects used" /><MetricSection title="Artifacts" labelA="Artifacts created" labelB="Users with 1 or more artifact" ranking="Top 10 users by artifacts used" /></main>
  );
}

function MetricSection({ labelA, labelB, ranking, title }: { labelA: string; labelB: string; ranking: string; title: string }) {
  return (
    <section className="flex flex-col gap-6"><h2 className="text-heading text-primary">{title}</h2><div className="grid grid-cols-1 gap-4 md:grid-cols-2"><Metric label={labelA} value="0" /><Metric label={labelB} value="0%" /></div><div className="rounded-card border p-4 space-y-3"><div className="flex items-center justify-between"><p className="text-body text-primary">{ranking}</p><PeriodTabs /></div><NoData /></div></section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-card border p-4"><div className="text-2xl text-primary">{value}</div><div className="text-body text-secondary">{label}</div></div>;
}

function PeriodTabs() {
  return <div className="flex gap-1">{["MTD", "QTD", "YTD", "1Y"].map((tab, index) => <button className={`rounded-md px-3 transition-colors py-1 text-xs ${index === 0 ? "bg-bg-300 font-medium text-text-000" : "text-text-400 hover:bg-bg-200 hover:text-text-200"}`} key={tab} type="button">{tab}</button>)}</div>;
}

function NoData() {
  return <div className="flex flex-col items-center justify-center text-center" style={{ height: 300 }}><div className="mb-4 opacity-50" aria-hidden="true" /><p className="text-sm text-text-300">No data available for the selected period</p></div>;
}

function ErrorCard({ children }: { children: ReactNode }) {
  return <div className="border rounded-xl p-4"><div className="text-body text-secondary">{children}</div></div>;
}

function ApiKeys() {
  return <main className="flex flex-col gap-10 pb-10"><section className="mb-xl last:mb-0"><div className="mb-md flex items-start justify-between gap-lg"><div className="flex min-w-0 flex-col gap-1"><h3 className="text-heading-semibold text-primary">Analytics API keys</h3><p className="text-body text-secondary">Analytics access keys are owned by the organization and remain active even after the creator is removed.</p></div></div><p className="text-body text-secondary">No service keys have been created yet.</p></section></main>;
}

function ClaudeCodeAnalytics() {
  return <main className="flex flex-col gap-7"><div className="flex items-center justify-between mb-4"><div className="flex flex-col gap-1"><h2 className="flex items-center gap-2 text-xl font-medium text-text-100">Claude Code<span className="inline-flex items-center rounded-md bg-bg-300 px-1.5 py-0.5 text-xs text-text-400">Beta</span></h2><p className="text-sm text-text-500">See how Claude Code fits into your team's workflow. Learn more</p></div></div><div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch"><Metric label="PRs with Claude Code" value="0" /><Metric label="LOC with Claude Code" value="0" /><Metric label="PRs with Claude Code" value="0%" /></div><NoData /></main>;
}
