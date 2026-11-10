import { useMemo, useState } from "react";
import { Tabs } from "@base-ui-components/react/tabs";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialTextInput } from "../../shared/OfficialTextInput";
import { SkillsCollapsibleSection } from "../skills/SkillsCollapsibleSection";
import { SkillsListItem } from "../skills/SkillsListItem";
import { AddPluginDropdown } from "./AddPluginDropdown";
import { ObjectPuzzle } from "./ObjectPuzzle";
import type { InstalledPlugin } from "./localPluginsQuery";
import { titleCasePluginName } from "../directory/pluginMarketplace";

const OVERLAY_TAB_CLASS =
  "inline-flex h-control shrink-0 items-center justify-center px-md rounded cds-reset whitespace-nowrap select-none outline-none text-body font-medium font-control text-primary bg-fill-ghost-hover";

const PLUGINS_OVERLAY_MESSAGES = {
  plugins: { defaultMessage: "Plugins", id: "QJAllUAc2k" },
  searchSkillsAndPlugins: { defaultMessage: "Search skills and plugins", id: "n3VpmrDQYa" },
  yourPlugins: { defaultMessage: "Your plugins", id: "6qc5nEZtUh" },
  addYourFirstPlugins: { defaultMessage: "Add your first plugins", id: "zLXPyIM8X/" },
  giveClaudeRoleExpertise: {
    defaultMessage: "Give Claude role-level expertise with plugins.",
    id: "jcaOQvQtmx",
  },
  noPluginsMatch: { defaultMessage: "No plugins match your search", id: "PuWnt+KeOh" },
  personalPlugins: { defaultMessage: "Personal plugins", id: "DDvPN+i/t2" },
  organizationPlugins: { defaultMessage: "Organization plugins", id: "3WKlYlcDGA" },
} as const satisfies MessageDescriptors;

/**
 * Official overlay plugins list (c6a2a31c4) inside W (c9e81e7b9).
 *
 * Screenshot 20+21: Discover is Oe secondary **next to Add** (cd08e92dc). Click opens
 * DirectoryModal B8t (official `u({section:"plugins"})`), not in-pane xl and not a tab.
 * Toolbar is Your plugins only. $e has no first-run CTA (jcaOQvQtmx).
 */
export function PluginsOverlayList({
  plugins,
  listReady = true,
  selectedId,
  onSelect,
  onUpload,
  onCreateWithClaude,
  onDiscover,
  canUpload,
}: {
  plugins: InstalledPlugin[];
  listReady?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onUpload?: () => void;
  onCreateWithClaude?: () => void;
  /** Official Oe onBrowse → HT open plugins DirectoryModal. */
  onDiscover?: () => void;
  canUpload: boolean;
}) {
  const text = useI18nText(PLUGINS_OVERLAY_MESSAGES);
  const [query, setQuery] = useState("");
  const searching = query.trim().length > 0;
  const q = query.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!q) return plugins;
    return plugins.filter((plugin) => {
      const label = titleCasePluginName(plugin.name).toLowerCase();
      return (
        label.includes(q) ||
        plugin.name.toLowerCase().includes(q) ||
        plugin.description?.toLowerCase().includes(q) ||
        plugin.marketplaceName?.toLowerCase().includes(q)
      );
    });
  }, [plugins, q]);

  const personal = useMemo(
    () => filtered.filter((plugin) => plugin.source !== "org" && plugin.installedBy !== "auto"),
    [filtered],
  );
  const org = useMemo(
    () => filtered.filter((plugin) => plugin.source === "org" || plugin.installedBy === "auto"),
    [filtered],
  );

  const firstRun = listReady && plugins.length === 0 && !searching;

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col pt-1" data-official-source="c6a2a31c4:W plugins overlay">
      <header className="flex min-w-0 shrink-0 items-center gap-x-sm">
        <div className="flex min-w-0 flex-1 items-center">
          <h2 className="min-w-0 truncate text-title font-semibold text-primary">{text.plugins}</h2>
        </div>
        <div className="flex w-full max-w-md shrink-0 justify-center px-md">
          <OfficialTextInput
            aria-label={text.searchSkillsAndPlugins}
            className="w-full"
            data-testid="customize-header-search"
            onValueChange={setQuery}
            placeholder={text.searchSkillsAndPlugins}
            prepend={<Icon className="text-muted" customSize={16} name="Search" />}
            size="sm"
            type="search"
            value={query}
          />
        </div>
        <div className="flex shrink-0 items-center justify-end">
          <AddPluginDropdown
            canUpload={canUpload}
            onCreateWithClaude={onCreateWithClaude}
            onDiscover={onDiscover}
            onUpload={onUpload}
          />
        </div>
      </header>
      <div aria-hidden="true" className="h-4 shrink-0" />
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-sm">
        <Tabs.Root value="mine">
          <Tabs.List aria-label={text.plugins} className="flex items-center font-sans">
            <Tabs.Tab
              className={OVERLAY_TAB_CLASS}
              data-testid="plugins-tabbed-list-tab-mine"
              value="mine"
            >
              {text.yourPlugins}
            </Tabs.Tab>
          </Tabs.List>
        </Tabs.Root>
      </div>
      <div className="relative -mt-1 flex min-h-0 flex-1 flex-col overflow-y-auto pb-lg pt-1">
        {firstRun ? (
          <PluginsOverlayFirstRun />
        ) : searching && filtered.length === 0 ? (
          <p className="py-lg text-center text-body text-secondary">{text.noPluginsMatch}</p>
        ) : (
          <div className="flex flex-col gap-px">
            {personal.length > 0 ? (
              <SkillsCollapsibleSection forceExpanded={searching} title={text.personalPlugins}>
                <div className="flex flex-col gap-px">
                  {personal.map((plugin) => (
                    <SkillsListItem
                      key={plugin.id}
                      icon={<Icon customSize={16} name="plugin" />}
                      id={plugin.id}
                      isEnabled={plugin.enabled}
                      isSelected={plugin.id === selectedId}
                      name={titleCasePluginName(plugin.name)}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            ) : null}
            {org.length > 0 ? (
              <SkillsCollapsibleSection forceExpanded={searching} title={text.organizationPlugins}>
                <div className="flex flex-col gap-px">
                  {org.map((plugin) => (
                    <SkillsListItem
                      key={plugin.id}
                      icon={<Icon customSize={16} name="plugin" />}
                      id={plugin.id}
                      isEnabled={plugin.enabled}
                      isSelected={plugin.id === selectedId}
                      name={titleCasePluginName(plugin.name)}
                      onSelect={onSelect}
                    />
                  ))}
                </div>
              </SkillsCollapsibleSection>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function PluginsOverlayFirstRun() {
  const text = useI18nText(PLUGINS_OVERLAY_MESSAGES);
  return (
    <div
      className="group/card relative isolate flex shrink-0 flex-col rounded-card after:pointer-events-none after:absolute after:inset-0 after:rounded-[inherit] after:shadow-card-ring after:content-['']"
      data-cds="Card"
      data-official-source="c6a2a31c4:$e zLXPyIM8X/"
      data-testid="tabbed-list-first-run"
    >
      <span aria-hidden="true" className="cds-card-fill pointer-events-none absolute inset-0 -z-[1] m-0 rounded-[inherit] bg-neutral" />
      <div className="cds-card-body flex min-h-0 flex-1 flex-col self-stretch rounded-[inherit] p-lg" data-cds-card-body="">
        <div className="flex items-center gap-lg">
          <div className="flex min-w-0 flex-1 flex-col items-start gap-md">
            <div className="flex flex-col gap-xs">
              <h3 className="m-0 text-heading-semibold text-primary">{text.addYourFirstPlugins}</h3>
              <p className="m-0 text-body text-secondary">{text.giveClaudeRoleExpertise}</p>
            </div>
          </div>
          <div aria-hidden="true" className="hidden shrink-0 pr-6 text-primary sm:block">
            <ObjectPuzzle />
          </div>
        </div>
      </div>
    </div>
  );
}
