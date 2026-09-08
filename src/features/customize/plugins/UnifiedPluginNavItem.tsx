/**
 * Official i7t UnifiedPluginNavItem (index-BELzQL5P).
 * Link to /customize/plugins/:id; nested Skills/Connectors/Agents/Hooks when selected.
 */
import type { ReactNode } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { useCustomizeText } from "../customizeMessages";
import { titleCasePluginName } from "../directory/pluginMarketplace";
import { SkillDocumentIcon } from "../skills/SkillDocumentIcon";
import type { InstalledPlugin } from "./localPluginsQuery";

export function UnifiedPluginNavItem({
  displayName,
  onNavigate,
  pathname,
  plugin,
}: {
  displayName?: { name: string; suffix?: string };
  onNavigate: (path: string) => void;
  pathname: string;
  plugin: InstalledPlugin;
}) {
  const text = useCustomizeText();
  const href = `/customize/plugins/${encodeURIComponent(plugin.id)}`;
  const decoded = decodeURIComponent(pathname);
  const rawHref = `/customize/plugins/${plugin.id}`;
  const selected = decoded === rawHref;
  const expanded = decoded === rawHref || decoded.startsWith(`${rawHref}/`);
  const enabled = plugin.enabled;
  const hasConnectors = plugin.mcpServers.length > 0 || (plugin.clis?.length ?? 0) > 0;
  const label = displayName?.name ?? titleCasePluginName(plugin.name);

  const className = [
    "flex items-center gap-3 px-4 py-1.5 rounded-lg text-sm transition-all",
    selected ? "bg-bg-300 text-text-100" : enabled ? "text-text-100 hover:bg-bg-300" : "text-text-500 hover:bg-bg-200",
  ].join(" ");

  return (
    <div className="flex flex-col">
      <OfficialTooltip tooltipContent={label} side="bottom">
        <a
          href={href}
          data-selected={selected || undefined}
          className={className}
          onClick={(event) => {
            if (event.defaultPrevented) return;
            if (event.button !== 0) return;
            if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
            event.preventDefault();
            onNavigate(href);
          }}
        >
          <span className={["flex items-center justify-center shrink-0 size-5", !enabled ? "opacity-50" : ""].join(" ")}>
            <Icon name="plugin" customSize={16} />
          </span>
          <span className={["truncate flex-1", selected || expanded ? "font-semibold" : ""].join(" ")}>
            {label}
            {displayName?.suffix ? <span className="text-text-500"> {displayName.suffix}</span> : null}
          </span>
          {!enabled ? (
            <span className="inline-flex items-center align-middle leading-tight flex-shrink-0 bg-bg-500/40 text-text-200 h-4 px-1 rounded text-[0.625rem]">
              {text.disabled}
            </span>
          ) : null}
        </a>
      </OfficialTooltip>
      <div
        className={[
          "ml-5 flex flex-col gap-px overflow-hidden transition-all duration-200 ease-in-out",
          expanded ? "mt-1 max-h-60 opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
        inert={!expanded || undefined}
      >
        {plugin.skills.length > 0 ? (
          <PluginSubNav href={`${href}/skills`} icon={<SkillDocumentIcon size={16} />} onNavigate={onNavigate} pathname={pathname}>
            {text.skills}
          </PluginSubNav>
        ) : null}
        {hasConnectors ? (
          <PluginSubNav href={`${href}/connectors`} icon={<Icon name="connectors" customSize={16} />} onNavigate={onNavigate} pathname={pathname}>
            {text.connectors}
          </PluginSubNav>
        ) : null}
        {plugin.agents.length > 0 ? (
          <PluginSubNav href={`${href}/agents`} icon={<Icon name="Agent" customSize={16} />} onNavigate={onNavigate} pathname={pathname}>
            {text.agents}
          </PluginSubNav>
        ) : null}
        {plugin.hooks.length > 0 ? (
          <PluginSubNav href={`${href}/hooks`} icon={<Icon name="Lightning" customSize={16} />} onNavigate={onNavigate} pathname={pathname}>
            {text.hooks}
          </PluginSubNav>
        ) : null}
      </div>
    </div>
  );
}

function PluginSubNav({
  children,
  href,
  icon,
  onNavigate,
  pathname,
}: {
  children: ReactNode;
  href: string;
  icon: ReactNode;
  onNavigate: (path: string) => void;
  pathname: string;
}) {
  const selected = decodeURIComponent(pathname) === decodeURIComponent(href);
  return (
    <a
      href={href}
      data-selected={selected || undefined}
      className={[
        "flex items-center gap-3 pl-7 pr-3 py-1.5 rounded-lg text-sm transition-all",
        selected ? "bg-bg-300 text-text-100 font-semibold" : "text-text-100 hover:bg-bg-300",
      ].join(" ")}
      onClick={(event) => {
        if (event.defaultPrevented) return;
        if (event.button !== 0) return;
        if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        onNavigate(href);
      }}
    >
      {icon}
      {children}
    </a>
  );
}
