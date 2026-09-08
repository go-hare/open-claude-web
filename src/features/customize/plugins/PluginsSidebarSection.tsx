import { useMemo, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu } from "@base-ui-components/react/menu";
import { BaseMenuItem, BaseMenuPopup, BaseSubmenu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { useCustomizeText } from "../customizeMessages";
import { PLUGINS_AWARENESS_EMPTY_CTA } from "../customizeGates";
import { titleCasePluginName } from "../directory/pluginMarketplace";
import { getSelectedFolder, subscribeSelectedFolder } from "../selectedFolderStore";
import {
  fetchLocalPlugins,
  localPluginsHostVisible,
  localPluginsQueryKey,
  pluginListContext,
  type InstalledPlugin,
} from "./localPluginsQuery";
import { UnifiedPluginNavItem } from "./UnifiedPluginNavItem";

/**
 * Official o7t / PluginsSidebarSection (index-BELzQL5P).
 * OX() → personal (c7t) + org (l7t). Empty: isGlobalEmpty && DT() → awareness CTA.
 * c7t project block: KK() && selectedFolder && projectPlugins.length.
 */
export function PluginsSidebarSection({
  onBrowsePlugins,
  onCreateWithClaude,
  onNavigate,
  onUploadPlugin,
  pathname,
}: {
  onBrowsePlugins: () => void;
  onCreateWithClaude?: () => void;
  onNavigate: (path: string) => void;
  onUploadPlugin?: () => void;
  pathname: string;
}) {
  const text = useCustomizeText();
  const isCcd = readPersistedFrameMode() === "code";
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);
  const context = useMemo(() => pluginListContext(isCcd, selectedFolder), [isCcd, selectedFolder]);
  const localPluginsVisible = localPluginsHostVisible();
  const query = useQuery({
    queryKey: localPluginsQueryKey(context),
    queryFn: () => fetchLocalPlugins(context),
    enabled: localPluginsVisible,
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
  const plugins = query.data ?? [];

  const displayNames = useMemo(() => pluginDisplayNames(plugins), [plugins]);
  const { personal, org } = useMemo(() => {
    const nextPersonal: InstalledPlugin[] = [];
    const nextOrg: InstalledPlugin[] = [];
    for (const plugin of plugins) {
      if (plugin.source === "org" || plugin.installedBy === "auto") nextOrg.push(plugin);
      else nextPersonal.push(plugin);
    }
    return { personal: nextPersonal, org: nextOrg };
  }, [plugins]);

  const isGlobalEmpty = plugins.length === 0;
  const { projectPlugins, userPlugins } = useMemo(() => {
    const nextProject: InstalledPlugin[] = [];
    const nextUser: InstalledPlugin[] = [];
    for (const plugin of personal) {
      if (plugin.scope === "project" || plugin.scope === "local") nextProject.push(plugin);
      else nextUser.push(plugin);
    }
    return { projectPlugins: nextProject, userPlugins: nextUser };
  }, [personal]);

  const folderName = selectedFolder ? selectedFolder.replace(/\\/g, "/").split("/").pop() : null;
  const showProject = isCcd && Boolean(selectedFolder) && projectPlugins.length > 0;

  return (
    <div className="flex flex-col gap-px">
      <hr className="border-t border-border-300 my-2 mx-2" />
      {showProject ? (
        <>
          <div className="flex items-center gap-1.5 pb-1 px-3">
            <OfficialTooltip tooltipContent={selectedFolder} side="right">
              <span className="text-text-500 font-small truncate max-w-[180px]">{folderName}</span>
            </OfficialTooltip>
            <OfficialTooltip tooltipContent={text.projectPluginsTooltip} side="right">
              <button
                type="button"
                className="flex items-center"
                aria-label={text.projectPluginsInfo}
              >
                <Icon name="Info" customSize={14} className="text-text-500" />
              </button>
            </OfficialTooltip>
          </div>
          {projectPlugins.map((plugin) => (
            <UnifiedPluginNavItem
              key={plugin.id}
              displayName={displayNames.get(plugin.id)}
              onNavigate={onNavigate}
              pathname={pathname}
              plugin={plugin}
            />
          ))}
          <hr className="border-t border-border-300 my-2 mx-2" />
        </>
      ) : null}
      <div className="flex items-center justify-between gap-1.5 pb-1 px-3">
        <span className="text-text-500 font-small">{text.personalPlugins}</span>
        <Menu.Root>
          <Menu.Trigger
            aria-label={text.addPlugin}
            title={text.addPlugin}
            className="cds-reset inline-flex size-5 items-center justify-center rounded-md text-text-500 hover:bg-bg-300 hover:text-text-100 focus-visible:shadow-focus"
          >
            <Icon name="plusSmall" />
          </Menu.Trigger>
          <BaseMenuPopup align="start" side="bottom" sideOffset={4}>
            <BaseMenuItem icon="plugin" onClick={onBrowsePlugins}>
              {text.browsePlugins}
            </BaseMenuItem>
            {localPluginsVisible ? (
              <BaseSubmenu
                icon="plusSmall"
                label={text.createPlugin}
                popupAlign="start"
                popupSide="right"
              >
                <BaseMenuItem
                  icon="ArrowInSquare"
                  onClick={() => {
                    onUploadPlugin?.();
                  }}
                >
                  {text.uploadPlugin}
                </BaseMenuItem>
                <BaseMenuItem
                  icon="spark"
                  onClick={() => {
                    onCreateWithClaude?.();
                  }}
                >
                  {text.createWithClaude}
                </BaseMenuItem>
              </BaseSubmenu>
            ) : null}
          </BaseMenuPopup>
        </Menu.Root>
      </div>

      {userPlugins.length === 0 ? (
        isGlobalEmpty && PLUGINS_AWARENESS_EMPTY_CTA ? (
          <div className="flex flex-col gap-3 mt-2 mb-4 px-4 items-center text-center">
            <p className="text-text-500 text-xs">{text.pluginsAwarenessCta}</p>
            <button
              type="button"
              onClick={onBrowsePlugins}
              className="cds-reset inline-flex h-8 items-center justify-center rounded-lg border border-border-300 bg-bg-000 px-3 text-sm text-text-100 shadow-sm hover:bg-bg-100 focus-visible:shadow-focus"
            >
              {text.browsePlugins}
            </button>
          </div>
        ) : (
          <p className="text-text-500 text-xs mt-2 mb-4 px-3">{text.pluginsEmpty}</p>
        )
      ) : (
        <div className="flex flex-col gap-px">
          {userPlugins.map((plugin) => (
            <UnifiedPluginNavItem
              key={plugin.id}
              displayName={displayNames.get(plugin.id)}
              onNavigate={onNavigate}
              pathname={pathname}
              plugin={plugin}
            />
          ))}
        </div>
      )}

      {org.length > 0 ? (
        <>
          <hr className="border-t border-border-300 my-2 mx-2" />
          <div className="flex items-center justify-between gap-1.5 pb-1 px-3">
            <span className="text-text-500 font-small">{text.organizationPlugins}</span>
          </div>
          {org.map((plugin) => (
            <UnifiedPluginNavItem
              key={plugin.id}
              displayName={displayNames.get(plugin.id)}
              onNavigate={onNavigate}
              pathname={pathname}
              plugin={plugin}
            />
          ))}
        </>
      ) : null}
    </div>
  );
}

/** Official o7t display-name map: unique title-case, else suffix marketplace. */
function pluginDisplayNames(
  plugins: InstalledPlugin[],
): Map<string, { name: string; suffix?: string }> {
  const grouped = new Map<string, InstalledPlugin[]>();
  for (const plugin of plugins) {
    const label = titleCasePluginName(plugin.name);
    const list = grouped.get(label) ?? [];
    list.push(plugin);
    grouped.set(label, list);
  }
  const out = new Map<string, { name: string; suffix?: string }>();
  for (const [label, list] of grouped) {
    if (list.length === 1) {
      out.set(list[0]!.id, { name: label });
      continue;
    }
    for (const plugin of list) {
      const suffix = plugin.marketplaceName ? `(${plugin.marketplaceName})` : undefined;
      out.set(plugin.id, { name: label, suffix });
    }
  }
  return out;
}
