/**
 * Official c63a plugins/$pluginId/{skills,agents,hooks,connectors} list+detail.
 * Empty copy from c63a78ed4; missing plugin redirects in CustomizePage.
 */
import { useMemo, useState } from "react";
import { Icon } from "../../../shell/icons";
import { useCustomizeText } from "../customizeMessages";
import { SkillsListItem } from "../skills/SkillsListItem";
import { SkillDocumentIcon } from "../skills/SkillDocumentIcon";
import type { InstalledPlugin } from "./localPluginsQuery";

export type PluginSubroute = "agents" | "connectors" | "hooks" | "skills";

export function PluginSubroutePanel({
  plugin,
  selectedName,
  subroute,
}: {
  plugin: InstalledPlugin;
  selectedName?: string | null;
  subroute: PluginSubroute;
}) {
  const text = useCustomizeText();
  const items = useMemo(() => {
    if (subroute === "skills") return plugin.skills.map((row) => ({ description: row.description, name: row.name }));
    if (subroute === "agents") return plugin.agents.map((row) => ({ description: row.description, name: row.name }));
    if (subroute === "hooks") {
      return plugin.hooks.map((row, index) => ({
        description: row.matcher ?? "",
        name: row.event || `hook-${index}`,
      }));
    }
    return plugin.mcpServers.map((row) => ({ description: row.type ?? "", name: row.name }));
  }, [plugin.agents, plugin.hooks, plugin.mcpServers, plugin.skills, subroute]);

  const [selected, setSelected] = useState(selectedName ?? items[0]?.name ?? null);
  const active = items.find((item) => item.name === selected) ?? items[0] ?? null;
  const title =
    subroute === "skills"
      ? text.skills
      : subroute === "agents"
        ? text.agents
        : subroute === "hooks"
          ? text.hooks
          : text.connectors;
  const empty =
    subroute === "skills"
      ? text.pluginHasNoSkills
      : subroute === "agents"
        ? text.pluginHasNoAgents
        : subroute === "hooks"
          ? text.pluginHasNoHooks
          : text.pluginHasNoConnectors;
  const selectPrompt =
    subroute === "skills"
      ? text.selectSkillToView
      : subroute === "agents"
        ? text.selectAgentToView
        : text.selectHookToView;

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-full text-text-400">{empty}</div>;
  }

  return (
    <div className="flex h-full">
      <div className="w-[256px] shrink-0 overflow-y-auto border-r border-border-300 py-2">
        <div className="px-3 pb-2 font-small text-text-500">{title}</div>
        <div className="flex flex-col gap-px" role="listbox">
          {items.map((item) => (
            <SkillsListItem
              icon={subrouteIcon(subroute)}
              id={item.name}
              isSelected={active?.name === item.name}
              key={item.name}
              name={displayToken(item.name)}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto bg-bg-100 px-6 py-4">
        {active ? (
          <div className="flex flex-col gap-2">
            <h2 className="font-large-bold text-text-100 truncate">{displayToken(active.name)}</h2>
            {active.description ? <p className="font-base text-text-300 whitespace-pre-wrap">{active.description}</p> : null}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-text-400">{selectPrompt}</div>
        )}
      </div>
    </div>
  );
}

function displayToken(name: string): string {
  const at = name.indexOf(":");
  return at >= 0 ? name.slice(at + 1) : name;
}

function subrouteIcon(subroute: PluginSubroute) {
  if (subroute === "skills") return <SkillDocumentIcon size={16} />;
  if (subroute === "agents") return <Icon customSize={16} name="Agent" />;
  if (subroute === "hooks") return <Icon customSize={16} name="Lightning" />;
  return <Icon customSize={16} name="connectors" />;
}
