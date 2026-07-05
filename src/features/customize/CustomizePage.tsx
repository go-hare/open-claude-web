import { type CSSProperties, type ReactNode, useEffect, useMemo, useState } from "react";
import type { RouteViewProps } from "../../app/routes";
import { Icon } from "../../shell/icons";
import { CustomizeSideNav } from "./CustomizeSideNav";

type EmptyAction = {
  label: string;
  variant: "primary" | "secondary";
  onClick?: () => void;
};

const SKILLS_ENABLED = false;

export function CustomizePage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  const [pluginBrowserOpen, setPluginBrowserOpen] = useState(false);
  const [pluginWarningDismissed, setPluginWarningDismissed] = useState(false);

  useEffect(() => {
    const replaceCustomize = () => {
      window.history.replaceState({}, "", "/customize");
      window.dispatchEvent(new Event("app:navigation"));
    };

    if (pathname === "/customize/skills" && !SKILLS_ENABLED) {
      replaceCustomize();
      return;
    }

    // c63a78ed4:2210-2255: /plugins/new 无 marketplace 参数时 redirect(/customize)。
    if (pathname === "/customize/plugins/new") {
      const params = new URLSearchParams(window.location.search);
      if (!params.get("marketplace")) {
        replaceCustomize();
        return;
      }
      setPluginBrowserOpen(true);
    }

    // c63a78ed4:2905-2928 / 2931-3276: pluginId 数据缺失时 redirect(/customize)。
    // 当前本地壳子还没有真实 plugin 数据源，所以不伪造 detail/subroute。
    if (/^\/customize\/plugins\/[^/]+/.test(pathname) && pathname !== "/customize/plugins/new") {
      replaceCustomize();
    }
  }, [pathname]);

  const route = useMemo(() => getCustomizeRoute(pathname), [pathname]);
  const content = (() => {
    switch (route.kind) {
      case "connectors":
        return <ConnectorsRoute onBrowsePlugins={() => setPluginBrowserOpen(true)} />;
      case "skills":
        return <SkillsRoute onBrowseSkills={() => setPluginBrowserOpen(true)} />;
      case "pluginAgents":
      case "pluginConnectors":
      case "pluginHooks":
      case "pluginSkills":
      case "pluginDetail":
      case "pluginNew":
        return null;
      case "plugins":
        return <NotFoundRoute />;
      case "index":
      default:
        return <CustomizeIndex onNavigate={onNavigate} onBrowsePlugins={() => setPluginBrowserOpen(true)} />;
    }
  })();

  const showPluginWarning = pathname.startsWith("/customize/plugins") && !SKILLS_ENABLED && !pluginWarningDismissed;

  // c63a78ed4:905-907: layout 为 flex h-full w-full flex-col / flex-1 min-h-0，
  // route 内容容器为 flex-1 overflow-y-auto bg-bg-100；_Component22 为 standalone 左侧 nav。
  return (
    <div className="flex h-full w-full flex-col">
      <div className="flex flex-1 min-h-0">
        <CustomizeSideNav activePath={pathname} onNavigate={onNavigate} onBrowsePlugins={() => setPluginBrowserOpen(true)} />
        <div className="flex-1 overflow-y-auto bg-bg-100">
          {showPluginWarning ? <PluginSkillsWarning onClose={() => setPluginWarningDismissed(true)} onNavigate={onNavigate} /> : null}
          {content}
        </div>
      </div>
      {pluginBrowserOpen ? <PluginBrowserPanel onClose={() => setPluginBrowserOpen(false)} /> : null}
    </div>
  );
}

function CustomizeIndex({ onNavigate, onBrowsePlugins }: { onNavigate: (path: string) => void; onBrowsePlugins: () => void }) {
  // c63a78ed4:959-981: index centered stack + option card classes/text；
  // 5175 当前特性开关 fs() 为 false，所以不展示 Create new skills 卡。
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full flex-col items-center gap-10" style={{ maxWidth: 530 }}>
        <div className="flex flex-col items-center gap-4">
          <span className="text-text-100" style={{ "--df-icon-size": "64px" } as CSSProperties}>
            <Icon name="briefcase" />
          </span>
          <h1 className="font-heading text-center text-2xl text-text-000">Customize Claude</h1>
          <p className="text-center text-sm text-text-300">Skills, connectors, and plugins shape how Claude works with you.</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <CustomizeOptionCard icon="connectors" title="Connect your apps" description="Let Claude read and write to the tools you already use." onClick={() => onNavigate("/customize/connectors")} />
          <CustomizeOptionCard icon="plugin" title="Browse plugins" description="Add pre-built knowledge for your field." onClick={onBrowsePlugins} />
        </div>
      </div>
    </div>
  );
}

function ConnectorsRoute({ onBrowsePlugins }: { onBrowsePlugins: () => void }) {
  // c63a78ed4:829-836 + 839-857: 无数据时只渲染全页 empty state，不渲染列表 sidebar。
  // 5175 当前权限/能力态下 u=false，所以没有“浏览连接器/添加自定义连接器”按钮。
  void onBrowsePlugins;
  return (
    <EmptyState
      icon="connectors"
      message="Unlock more with Claude when you connect your team's tools. Learn more"
    />
  );
}

function SkillsRoute({ onBrowseSkills }: { onBrowseSkills: () => void }) {
  // c63a78ed4:2815-2818 + 2860-2868: 无 skill 时只渲染全页 empty state。
  return (
    <EmptyState
      icon="spark"
      message="Add skills to extend Claude's capabilities. Learn more"
      actions={[{ label: "添加 Skill", variant: "primary", onClick: onBrowseSkills }]}
    />
  );
}

function PluginSkillsWarning({ onClose, onNavigate }: { onClose: () => void; onNavigate: (path: string) => void }) {
  // c63a78ed4:865-875: plugins path 顶部渲染 danger alert，按钮指向 /admin-settings/skills。
  return (
    <div className="p-4">
      <div className="flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-sm" style={{ background: "var(--cds-bg-danger, #fad6d6)", borderColor: "var(--cds-border-danger, #f09595)", color: "var(--cds-text-danger, #8e2626)" }}>
        <span className="flex size-5 shrink-0 items-center justify-center"><Icon name="help" /></span>
        <span className="min-w-0 flex-1">使用插件前必须在设置中启用 Skills。</span>
        <button
          type="button"
          className="cds-reset inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-xs font-medium"
          style={{ borderColor: "var(--cds-border-danger, #f09595)" }}
          onClick={() => onNavigate("/admin-settings/skills")}
        >
          Skills 设置
        </button>
        <button type="button" aria-label="关闭" onClick={onClose} className="cds-reset inline-flex size-7 shrink-0 items-center justify-center rounded-md bg-transparent opacity-70 hover:opacity-100">
          <Icon name="x" />
        </button>
      </div>
    </div>
  );
}

function NotFoundRoute() {
  // /customize/plugins 在 c63a78ed4 route map 没有匹配项；5175 实测显示 layout 内 Not Found。
  return <div className="px-0 text-sm font-medium text-text-100">Not Found</div>;
}

function CustomizeOptionCard({ icon, title, description, onClick }: { icon: string; title: ReactNode; description: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl border border-border-300 bg-bg-000 p-5 text-left shadow-sm transition-colors hover:bg-bg-100">
      <div className="flex shrink-0 items-center rounded-full bg-bg-300 p-1.5"><Icon name={icon} /></div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-base-bold text-text-100">{title}</span>
        <span className="text-sm text-text-300">{description}</span>
      </div>
    </button>
  );
}

function EmptyState({ icon, message, actions }: { icon: string; message: ReactNode; actions?: EmptyAction[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <div className="flex size-10 items-center justify-center rounded-full bg-bg-300 text-text-300"><Icon name={icon} /></div>
        <p className="text-sm text-text-300 text-center px-6 text-pretty max-w-[300px]">{message}</p>
        {actions && actions.length > 0 ? (
          <div className="flex flex-col gap-3 w-full max-w-[200px] items-center">
            {actions.map((action) => <Button key={action.label} variant={action.variant} onClick={action.onClick}>{action.label}</Button>)}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function PluginBrowserPanel({ onClose }: { onClose: () => void }) {
  // 原 Browse plugins 通过 pe(e=>e.open)("plugins") 打开全局面板；这里先以同一文案/菜单结构承接。
  return (
    <div className="fixed inset-0 z-popover flex justify-end bg-[hsl(var(--always-black)/15%)]" role="dialog" aria-label="Browse plugins">
      <div className="flex h-full w-[min(520px,100vw)] flex-col border-l border-border-300 bg-bg-000 shadow-panel">
        <div className="flex items-center justify-between px-6 py-3 min-h-14">
          <h2 className="font-large-bold truncate">Browse plugins</h2>
          <IconButton ariaLabel="关闭" icon="x" onClick={onClose} />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 bg-bg-100 px-6 py-8 text-center">
          <span className="font-base text-text-300">No plugins found</span>
          <span className="font-small text-text-500">Add pre-built knowledge for your field.</span>
        </div>
      </div>
    </div>
  );
}

function Button({ children, onClick, variant, size }: { children: ReactNode; onClick?: () => void; variant: "primary" | "secondary"; size?: "sm" }) {
  const classes = variant === "primary"
    ? "bg-text-000 text-bg-000 hover:opacity-90"
    : "border border-border-300 bg-bg-000 text-text-100 hover:bg-bg-100";
  return <button type="button" onClick={onClick} className={`inline-flex items-center justify-center rounded-lg px-3 ${size === "sm" ? "h-8 text-sm" : "h-9 text-sm"} ${classes}`}>{children}</button>;
}

function IconButton({ ariaLabel, icon, onClick }: { ariaLabel: string; icon: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={ariaLabel} onClick={onClick} className="inline-flex size-8 items-center justify-center rounded-lg border-0 bg-transparent text-text-300 hover:bg-bg-200 hover:text-text-100">
      <Icon name={icon} />
    </button>
  );
}

function getCustomizeRoute(pathname: string) {
  if (pathname === "/customize/connectors") return { kind: "connectors" as const };
  if (pathname === "/customize/skills") return SKILLS_ENABLED ? { kind: "skills" as const } : { kind: "index" as const };
  if (pathname === "/customize/plugins") return { kind: "plugins" as const };
  if (pathname === "/customize/plugins/new") return { kind: "pluginNew" as const };

  const pluginMatch = pathname.match(/^\/customize\/plugins\/([^/]+)(?:\/(agents|connectors|hooks|skills))?$/);
  if (pluginMatch) {
    const [, pluginId, subroute] = pluginMatch;
    if (subroute === "agents") return { kind: "pluginAgents" as const, pluginId };
    if (subroute === "connectors") return { kind: "pluginConnectors" as const, pluginId };
    if (subroute === "hooks") return { kind: "pluginHooks" as const, pluginId };
    if (subroute === "skills") return { kind: "pluginSkills" as const, pluginId };
    return { kind: "pluginDetail" as const, pluginId };
  }

  return { kind: "index" as const };
}
