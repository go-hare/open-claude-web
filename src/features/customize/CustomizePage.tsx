import { type ReactNode, useEffect, useMemo, useState } from "react";
import { desktopBridge } from "../../adapters/desktopBridge";
import type { RouteViewProps } from "../../app/routes";
import { Icon } from "../../shell/icons";
import { readPersistedFrameMode } from "../../stores/frameStoreHelpers";
import { ConnectorsRoute } from "./connectors/ConnectorsRoute";
import { BROWSE_PLUGINS_CARD_VISIBLE, SKILLS_ENABLED } from "./customizeGates";
import { CustomizeIndexPictogram } from "./CustomizeIndexPictogram";
import { CustomizeSideNav } from "./CustomizeSideNav";
import { SkillDocumentIcon } from "./skills/SkillDocumentIcon";
import { SkillsRoute } from "./skills/SkillsRoute";

type EmptyAction = {
  label: string;
  variant: "primary" | "secondary";
  onClick?: () => void;
};

export function CustomizePage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  const needsTrafficLightPadding = useCustomizeTrafficLightPadding();
  // Official H6t: mode-aware back target (cowork → /task/new, code → /code).
  const backHref = useMemo(() => (readPersistedFrameMode() === "cowork" ? "/task/new" : "/code"), []);
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
        // Official c63a78ed4 Ht — empty Kt / list Rt + detail / directory pe("connectors").
        return <ConnectorsRoute />;
      case "skills":
        return (
          <SkillsRoute
            onBrowseSkills={() => setPluginBrowserOpen(true)}
            onCreateWithClaude={() => {
              // Official de: /new?q= skill-creator prompt; local shell uses cowork new task.
              onNavigate(
                "/task/new?q=" +
                  encodeURIComponent(
                    "Let's create a skill together using your skill-creator skill. First ask me what the skill should do.",
                  ),
              );
            }}
            onWriteInstructions={() => setPluginBrowserOpen(true)}
            onUpload={() => setPluginBrowserOpen(true)}
            onTryInCowork={(skillName) => {
              onNavigate("/task/new?q=" + encodeURIComponent(`/${skillName}`));
            }}
          />
        );
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
      {needsTrafficLightPadding ? <div aria-hidden="true" className="h-10 shrink-0" data-testid="customize-traffic-light-spacer" /> : null}
      <div className="flex flex-1 min-h-0">
        <CustomizeSideNav
          activePath={pathname}
          backHref={backHref}
          onNavigate={onNavigate}
          onBrowsePlugins={() => setPluginBrowserOpen(true)}
          onUploadPlugin={() => setPluginBrowserOpen(true)}
          onCreateWithClaude={() => {
            // Official E7t K: code → /code?q=… plugin, cowork → /task/new?q=… plugin.
            const isCode = readPersistedFrameMode() === "code";
            const q = isCode
              ? "Help me create a new Claude Code plugin"
              : "Help me create a new Cowork plugin";
            onNavigate((isCode ? "/code" : "/task/new") + "?q=" + encodeURIComponent(q));
          }}
        />
        <div className="flex-1 overflow-y-auto bg-bg-100">
          {showPluginWarning ? <PluginSkillsWarning onClose={() => setPluginWarningDismissed(true)} onNavigate={onNavigate} /> : null}
          {content}
        </div>
      </div>
      {pluginBrowserOpen ? <PluginBrowserPanel onClose={() => setPluginBrowserOpen(false)} /> : null}
    </div>
  );
}

function useCustomizeTrafficLightPadding() {
  const isMacDesktop = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    const isMac = /\bMacintosh\b|\bMac OS\b/.test(navigator.userAgent);
    const isDesktop = Boolean(window["claude.web"]) || /\bElectron\//.test(navigator.userAgent);
    return isMac && isDesktop && !/\bWindows\b/.test(navigator.userAgent);
  }, []);
  const [isFullscreen, setFullscreen] = useState(false);
  useEffect(() => {
    if (!isMacDesktop) return;
    let disposed = false;
    const apply = (value: boolean) => {
      if (!disposed) setFullscreen(value === true);
    };
    void desktopBridge.Window.getFullscreen()
      .then(apply)
      .catch(() => apply(false));
    const unsubscribe = desktopBridge.Window.onFullscreenChanged?.(apply);
    return () => {
      disposed = true;
      unsubscribe?.();
    };
  }, [isMacDesktop]);
  return isMacDesktop && !isFullscreen;
}

function CustomizeIndex({ onNavigate, onBrowsePlugins }: { onNavigate: (path: string) => void; onBrowsePlugins: () => void }) {
  // Official c63a78ed4 el: centered stack maxWidth 530 + Va pictogram + option cards.
  // Order: Connect tools → Create new skills (fs/QZ) → Browse plugins (!modeAwarenessChat).
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex w-full flex-col items-center gap-10" style={{ maxWidth: 530 }}>
        <div className="flex flex-col items-center gap-4">
          <CustomizeIndexPictogram size="medium" />
          <h1 className="font-heading text-center text-2xl text-text-000">Customize Claude</h1>
          <p className="text-center text-sm text-text-300">Skills, connectors, and plugins shape how Claude works with you.</p>
        </div>
        <div className="flex w-full flex-col gap-3">
          <CustomizeOptionCard
            icon={<Icon name="connectors" customSize={20} />}
            title="Connect your apps"
            description="Let Claude read and write to the tools you already use."
            onClick={() => onNavigate("/customize/connectors")}
          />
          {SKILLS_ENABLED ? (
            <CustomizeOptionCard
              icon={<SkillDocumentIcon size={20} />}
              title="Create new skills"
              description="Teach Claude your processes, team norms, and expertise."
              onClick={() => onNavigate("/customize/skills")}
            />
          ) : null}
          {BROWSE_PLUGINS_CARD_VISIBLE ? (
            <CustomizeOptionCard
              icon={<Icon name="plugin" customSize={20} />}
              title="Browse plugins"
              description="Add pre-built knowledge for your field."
              onClick={onBrowsePlugins}
            />
          ) : null}
        </div>
      </div>
    </div>
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

/** Official c63a78ed4 sl option card — icon is ReactNode (Vv size 20 for skills, not spark). */
function CustomizeOptionCard({ icon, title, description, onClick }: { icon: ReactNode; title: ReactNode; description: ReactNode; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-full items-center gap-4 rounded-3xl border border-border-300 bg-bg-000 p-5 text-left shadow-sm transition-colors hover:bg-bg-100">
      <div className="flex shrink-0 items-center rounded-full bg-bg-300 p-1.5">{icon}</div>
      <div className="flex flex-1 flex-col gap-0.5">
        <span className="font-base-bold text-text-100">{title}</span>
        <span className="text-sm text-text-300">{description}</span>
      </div>
    </button>
  );
}

function EmptyState({ icon, pictogram, message, actions }: { icon?: string; pictogram?: ReactNode; message: ReactNode; actions?: EmptyAction[] }) {
  return (
    <div className="flex h-full w-full items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        {pictogram ?? (
          <div className="flex size-10 items-center justify-center rounded-full bg-bg-300 text-text-300">
            <Icon name={icon ?? "connectors"} />
          </div>
        )}
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
