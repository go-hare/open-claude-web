/**
 * Official zl PluginDetailPanel (c63a78ed4-M1yh4U9h.js).
 * Header: title + enable switch + Pl overflow (Uninstall).
 * Fl metadata: Source / Version. Description. Ml skills/agents chips.
 */
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { BaseMenuItem, BaseMenuPopup } from "../../../shell/BaseMenu";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";
import { Icon } from "../../../shell/icons";
import { officialButtonClass } from "../../shared/buttonClasses";
import { OfficialSwitch } from "../../shared/OfficialSwitch";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { useErrorsOptional } from "../../settings/errorsToast";
import { useCustomizeText } from "../customizeMessages";
import { DirectoryChip, DirectoryChipRow } from "../directory/DirectoryChips";
import { officialDirectoryStore } from "../directory/officialDirectoryStore";
import { asRecord, formatI18n, getLocalPlugins, titleCasePluginName } from "../directory/pluginMarketplace";
import {
  invalidateLocalPlugins,
  isLocalUploadPlugin,
  type InstalledPlugin,
  type PluginAgent,
  type PluginSkill,
} from "./localPluginsQuery";

export function PluginDetailPanel({
  onNavigate,
  plugin,
}: {
  onNavigate: (path: string) => void;
  plugin: InstalledPlugin;
}) {
  const text = useCustomizeText();
  const errors = useErrorsOptional();
  const [uninstallOpen, setUninstallOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const encodedId = encodeURIComponent(plugin.id);
  const isLocalUpload = isLocalUploadPlugin(plugin);
  const title = titleCasePluginName(plugin.name);

  const toggleEnabled = useCallback(async () => {
    const setEnabled = getLocalPlugins()?.setPluginEnabled;
    if (!setEnabled) return;
    try {
      await setEnabled(plugin.id, !plugin.enabled);
      invalidateLocalPlugins();
    } catch (error) {
      errors?.addError(text.failedToUpdatePluginState, { error });
    }
  }, [errors, plugin.enabled, plugin.id, text.failedToUpdatePluginState]);

  const uninstall = useCallback(async () => {
    const deletePlugin = getLocalPlugins()?.deletePlugin;
    if (!deletePlugin) return;
    setPending(true);
    try {
      const raw = await deletePlugin(plugin.id);
      const result = asRecord(raw);
      if (raw === false || result.success === false) {
        throw new Error(typeof result.error === "string" ? result.error : text.failedToUninstallPlugin);
      }
      invalidateLocalPlugins();
      errors?.addSuccess(text.pluginUninstalledShort);
      onNavigate("/customize");
    } catch (error) {
      errors?.addError(text.failedToUninstallPlugin, { error });
    } finally {
      setPending(false);
      setUninstallOpen(false);
    }
  }, [errors, onNavigate, plugin.id, text.failedToUninstallPlugin, text.pluginUninstalledShort]);

  const reveal = useCallback(() => {
    if (!plugin.installPath) return;
    void desktopBridge.FileSystem.showInFolder?.(plugin.installPath);
  }, [plugin.installPath]);

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <h2 className="font-large-bold text-text-100 truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <OfficialTooltip tooltipContent={plugin.enabled ? text.disablePlugin : text.enablePlugin} side="bottom">
            <span className="inline-flex">
              <OfficialSwitch
                aria-label={text.enablePlugin}
                checked={plugin.enabled}
                onCheckedChange={() => {
                  void toggleEnabled();
                }}
                size="sm"
              />
            </span>
          </OfficialTooltip>
          <PluginActionsDropdown
            hideUninstall={false}
            label={title}
            onRevealInFinder={plugin.installPath ? reveal : undefined}
            onUninstall={() => setUninstallOpen(true)}
          />
        </div>
      </div>

      <div className="flex gap-[60px] px-6 py-3">
        {isLocalUpload ? (
          <MetadataColumn label={text.source} value={text.uploadedFromFile} />
        ) : plugin.marketplaceName ? (
          <MetadataColumn
            label={text.source}
            value={
              <>
                {text.marketplaceSource.split("{link}")[0]}
                <button
                  type="button"
                  className="cursor-pointer text-accent-000 no-underline"
                  onClick={() => officialDirectoryStore.getState().open("plugins")}
                >
                  {plugin.marketplaceName}
                </button>
                {text.marketplaceSource.split("{link}")[1]}
              </>
            }
          />
        ) : null}
        {plugin.version ? <MetadataColumn label={text.version} value={plugin.version} /> : null}
      </div>

      {plugin.description ? (
        <div className="flex flex-col gap-2 px-6 py-4">
          <span className="font-small text-text-500">{text.description}</span>
          <p className="font-base text-text-300">{plugin.description}</p>
        </div>
      ) : null}

      <PluginItemCardGrid
        agents={plugin.agents}
        encodedPluginId={encodedId}
        onNavigate={onNavigate}
        skills={plugin.skills}
      />

      <ConfirmDialog
        cancelText={text.cancel}
        confirmText={text.uninstall}
        isOpen={uninstallOpen}
        message={isLocalUpload ? text.uninstallCannotBeUndone : text.uninstallPluginDeletesSkills}
        onClose={() => setUninstallOpen(false)}
        onConfirm={() => {
          void uninstall();
        }}
        title={text.uninstallPluginQuestion}
        variant="danger"
        disabled={pending}
      />
    </div>
  );
}

function MetadataColumn({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-small text-text-500">{label}</span>
      <span className="font-base text-text-300">{value}</span>
    </div>
  );
}

function PluginActionsDropdown({
  hideUninstall,
  label,
  onRevealInFinder,
  onUninstall,
}: {
  hideUninstall: boolean;
  label: string;
  onRevealInFinder?: () => void;
  onUninstall: () => void;
}) {
  const text = useCustomizeText();
  if (hideUninstall && !onRevealInFinder) return null;
  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={formatI18n(text.moreOptionsFor, { label })}
        className={officialButtonClass({ variant: "ghost", size: "icon_sm" })}
      >
        <Icon customSize={20} name="DotsVertical" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {onRevealInFinder ? (
          <BaseMenuItem icon="Folder" onClick={onRevealInFinder}>
            {text.showInFolder}
          </BaseMenuItem>
        ) : null}
        {!hideUninstall ? (
          <BaseMenuItem danger icon="Trash" onClick={onUninstall}>
            {text.uninstall}
          </BaseMenuItem>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  );
}

function PluginItemCardGrid({
  agents,
  encodedPluginId,
  onNavigate,
  skills,
}: {
  agents: PluginAgent[];
  encodedPluginId: string;
  onNavigate: (path: string) => void;
  skills: PluginSkill[];
}) {
  const text = useCustomizeText();
  const empty = skills.length === 0 && agents.length === 0;
  const [tab, setTab] = useState<"skills" | "agents">(skills.length > 0 || empty ? "skills" : "agents");
  const [seeAll, setSeeAll] = useState(false);

  const tabs = useMemo(() => {
    const next: Array<{
      basePath: string;
      description: string;
      items: Array<{ description: string; name: string }>;
      key: "agents" | "skills";
      label: string;
    }> = [];
    if (empty || skills.length > 0) {
      next.push({
        key: "skills",
        label: text.skills,
        description: text.pluginSkillsBlurb,
        items: skills.map((skill) => ({ name: skill.name, description: skill.description })),
        basePath: `/customize/plugins/${encodedPluginId}/skills`,
      });
    }
    if (empty || agents.length > 0) {
      next.push({
        key: "agents",
        label: text.agents,
        description: text.pluginAgentsBlurb,
        items: agents.map((agent) => ({ name: agent.name, description: agent.description })),
        basePath: `/customize/plugins/${encodedPluginId}/agents`,
      });
    }
    return next;
  }, [agents, empty, encodedPluginId, skills, text.agents, text.pluginAgentsBlurb, text.pluginSkillsBlurb, text.skills]);

  const active = tabs.find((entry) => entry.key === tab) ?? tabs[0];
  const visible = active ? (seeAll || active.items.length <= 6 ? active.items : active.items.slice(0, 6)) : [];
  const overflow = active ? active.items.length - visible.length : 0;

  return (
    <div className="flex flex-col gap-3 px-6 py-4">
      <div className="flex items-center gap-3 justify-between">
        <DirectoryChipRow>
          {tabs.map((entry) => (
            <DirectoryChip
              disabled={empty}
              isActive={tab === entry.key}
              key={entry.key}
              onClick={() => {
                setTab(entry.key);
                setSeeAll(false);
              }}
            >
              {entry.label}
            </DirectoryChip>
          ))}
        </DirectoryChipRow>
        {overflow > 0 ? (
          <button
            className="cds-reset inline-flex h-8 items-center px-2 text-sm text-text-100 hover:bg-bg-200 rounded-lg"
            onClick={() => setSeeAll(true)}
            type="button"
          >
            {text.seeAll}
          </button>
        ) : null}
      </div>
      {!empty && active ? (
        <>
          <p className="font-small text-text-500">{active.description}</p>
          <div className="flex flex-wrap gap-2.5">
            {visible.map((item) => (
              <button
                className="cds-reset inline-flex h-8 items-center rounded-full border border-border-300 bg-bg-000 px-3 text-sm text-text-100 hover:bg-bg-100"
                key={item.name}
                onClick={() => {
                  const params = new URLSearchParams({ selected: item.name });
                  onNavigate(`${active.basePath}?${params.toString()}`);
                }}
                type="button"
              >
                {item.name.includes(":") ? item.name.slice(item.name.indexOf(":") + 1) : item.name}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="font-base text-text-300">{text.pluginHasNoSkillsOrAgents}</span>
        </div>
      )}
    </div>
  );
}
