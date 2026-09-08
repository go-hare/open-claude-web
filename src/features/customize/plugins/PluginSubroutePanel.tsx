/**
 * Official c63a plugins/$pluginId/{skills,agents,hooks,connectors}.
 * Skills: ga/Wnt listSkillFiles (not list hydrate). Legacy-commands skip files query.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type MouseEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { Icon } from "../../../shell/icons";
import { CoworkAssistantMarkdown } from "../../cowork/session/transcript/CoworkAssistantMarkdown";
import { OfficialButton } from "../../shared/OfficialButton";
import { readPersistedFrameMode } from "../../../stores/frameStoreHelpers";
import { ConnectorsPageSidebar } from "../connectors/ConnectorsPageSidebar";
import { CustomizeDetailPanel, formatCustomizeDateMed } from "../CustomizeDetailPanel";
import { SKILLS_ENABLED } from "../customizeGates";
import { useCustomizeText } from "../customizeMessages";
import { SkillsListItem } from "../skills/SkillsListItem";
import { SkillDocumentIcon } from "../skills/SkillDocumentIcon";
import { parseSkillMarkdown } from "../skills/skillMd";
import { getSelectedFolder, subscribeSelectedFolder } from "../selectedFolderStore";
import { buildSkillFileTree } from "./buildSkillFileTree";
import {
  isPluginSkillUserInvocable,
  pluginSkillCustomizeHref,
  pluginSkillTryInChatHref,
} from "./pluginSkillActions";
import { PluginSkillEditButton, PluginSkillOverflow } from "./PluginSkillOverflow";
import {
  fetchPluginSkillFiles,
  pluginListContext,
  pluginSkillFilesQueryKey,
  type InstalledPlugin,
  type PluginSkill,
  type PluginSkillFile,
} from "./localPluginsQuery";
import { PluginSkillFileTree, useSkillFileExpandedFolders } from "./PluginSkillFileTree";

export type PluginSubroute = "agents" | "connectors" | "hooks" | "skills";

export function PluginSubroutePanel({
  onNavigate,
  plugin,
  selectedName,
  subroute,
}: {
  onNavigate: (path: string) => void;
  plugin: InstalledPlugin;
  selectedName?: string | null;
  subroute: PluginSubroute;
}) {
  if (subroute === "skills") {
    return (
      <PluginSkillsSubroute onNavigate={onNavigate} plugin={plugin} selectedName={selectedName} />
    );
  }
  return (
    <PluginManifestListSubroute
      plugin={plugin}
      selectedName={selectedName}
      subroute={subroute}
    />
  );
}

function PluginSkillsSubroute({
  onNavigate,
  plugin,
  selectedName,
}: {
  onNavigate: (path: string) => void;
  plugin: InstalledPlugin;
  selectedName?: string | null;
}) {
  const text = useCustomizeText();
  const isCcd = readPersistedFrameMode() === "code";
  const selectedFolder = useSyncExternalStore(subscribeSelectedFolder, getSelectedFolder, () => null);
  const context = useMemo(() => pluginListContext(isCcd, selectedFolder), [isCcd, selectedFolder]);
  const skills = useMemo(
    () =>
      [...plugin.skills].sort(
        (left, right) =>
          (left.source === "legacy-commands" ? 1 : 0) - (right.source === "legacy-commands" ? 1 : 0),
      ),
    [plugin.skills],
  );
  const [selected, setSelected] = useState(selectedName ?? skills[0]?.name ?? null);
  const [selectedFilePath, setSelectedFilePath] = useState<string | null>(null);
  const active =
    skills.find((row) => decodeSkillName(row.name) === decodeSkillName(selected ?? "")) ?? skills[0] ?? null;
  const legacy = active?.source === "legacy-commands";
  const filesQuery = useQuery({
    queryKey: pluginSkillFilesQueryKey(plugin.id, active?.name ?? "", context),
    queryFn: () => fetchPluginSkillFiles(plugin.id, active?.name ?? "", context),
    enabled: Boolean(active && !legacy),
    staleTime: 300_000,
    gcTime: 600_000,
    refetchOnWindowFocus: false,
  });
  const files = filesQuery.data?.files ?? [];
  const filesError =
    filesQuery.data && filesQuery.data.success === false
      ? (filesQuery.data.error ?? "Failed to load skill files")
      : null;

  useEffect(() => {
    setSelectedFilePath(null);
  }, [active?.name]);

  if (skills.length === 0) {
    return <div className="flex items-center justify-center h-full text-text-400">{text.pluginHasNoSkills}</div>;
  }

  return (
    <div className="flex h-full">
      <ConnectorsPageSidebar title={text.skills}>
        <div className="flex flex-col gap-px" role="listbox">
          {skills.map((skill) => {
            const selectedSkill = active?.name === skill.name;
            return (
              <PluginSkillListItem
                files={selectedSkill ? files : []}
                isLoadingFiles={Boolean(selectedSkill && filesQuery.isLoading && !legacy)}
                isSelected={selectedSkill}
                key={skill.name}
                onFileSelect={setSelectedFilePath}
                onSelect={(id) => {
                  setSelected(id);
                  setSelectedFilePath(null);
                }}
                selectedFilePath={selectedSkill ? selectedFilePath : null}
                skill={skill}
              />
            );
          })}
        </div>
      </ConnectorsPageSidebar>
      <div className="flex-1 overflow-hidden bg-bg-100">
        {active ? (
          <PluginSkillDetail
            files={files}
            filesError={legacy ? null : filesError}
            isCcd={isCcd}
            isLoadingFiles={Boolean(filesQuery.isLoading && !legacy)}
            onNavigate={onNavigate}
            plugin={plugin}
            selectedFilePath={selectedFilePath}
            skill={active}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-text-400">{text.selectSkillToView}</div>
        )}
      </div>
    </div>
  );
}

/** Official c63a Ct SkillListItem — caret + ozt/ct file tree. */
function PluginSkillListItem({
  files,
  isLoadingFiles,
  isSelected,
  onFileSelect,
  onSelect,
  selectedFilePath,
  skill,
}: {
  files: PluginSkillFile[];
  isLoadingFiles: boolean;
  isSelected: boolean;
  onFileSelect: (path: string) => void;
  onSelect: (id: string) => void;
  selectedFilePath: string | null;
  skill: PluginSkill;
}) {
  const multiFile = files.length > 1;
  const [expandedFolders, toggleFolder] = useSkillFileExpandedFolders();
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  useEffect(() => {
    if (!isSelected) setFilesCollapsed(false);
  }, [isSelected]);
  const showFileTree = isSelected && multiFile && !isLoadingFiles && !filesCollapsed;
  const fileTree = useMemo(
    () => (multiFile && files.length > 0 ? buildSkillFileTree(files) : null),
    [files, multiFile],
  );
  const onToggleList = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setFilesCollapsed((value) => !value);
  }, []);
  const caretOrSpinner =
    isSelected && isLoadingFiles ? (
      <div className="h-3.5 w-3.5 rounded-full bg-bg-300 animate-pulse" />
    ) : showFileTree || (isSelected && multiFile && filesCollapsed) ? (
      <OfficialButton
        aria-expanded={!filesCollapsed}
        aria-label="Toggle file list"
        className="-mr-1"
        onClick={onToggleList}
        size="icon_xs"
        variant="ghost"
      >
        <Icon
          className={[
            "flex-shrink-0 text-text-300 transform transition-transform",
            filesCollapsed ? "-rotate-45" : "",
          ].join(" ")}
          customSize={14}
          name="CaretRight"
        />
      </OfficialButton>
    ) : null;
  const useActionSlot = Boolean(showFileTree || (isSelected && multiFile && filesCollapsed && !isLoadingFiles));

  return (
    <div className="flex flex-col gap-px">
      <SkillsListItem
        action={useActionSlot ? caretOrSpinner : undefined}
        icon={<SkillDocumentIcon size={16} />}
        id={skill.name}
        isSelected={isSelected}
        name={displayToken(skill.name)}
        onSelect={onSelect}
        statusLabel={useActionSlot ? undefined : caretOrSpinner}
      />
      <div
        className={[
          "ml-10 overflow-y-auto transition-all duration-200 ease-in-out",
          showFileTree ? "max-h-96 opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
        inert={!showFileTree || undefined}
      >
        {fileTree ? (
          <PluginSkillFileTree
            className="w-full"
            expandedFolders={expandedFolders}
            fileTree={fileTree}
            onFileSelect={onFileSelect}
            onToggleFolder={toggleFolder}
            selectedPath={selectedFilePath}
          />
        ) : null}
      </div>
    </div>
  );
}

function PluginSkillDetail({
  files,
  filesError,
  isCcd,
  isLoadingFiles,
  onNavigate,
  plugin,
  selectedFilePath,
  skill,
}: {
  files: PluginSkillFile[];
  filesError: string | null;
  isCcd: boolean;
  isLoadingFiles: boolean;
  onNavigate: (path: string) => void;
  plugin: InstalledPlugin;
  selectedFilePath?: string | null;
  skill: PluginSkill;
}) {
  const text = useCustomizeText();
  if (isLoadingFiles) {
    return (
      <div className="flex items-center justify-center h-full">
        <Icon className="animate-spin text-text-400" customSize={20} name="Spinner" />
      </div>
    );
  }
  if (filesError) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-text-400 gap-2">
        <span>{text.couldNotLoadSkillFiles}</span>
        <span className="font-small text-text-500">{filesError}</span>
      </div>
    );
  }
  const listed =
    skill.source === "legacy-commands" && files.length === 0 && skill.content
      ? [{ path: "SKILL.md", content: skill.content }]
      : files;
  if (listed.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-text-400">{text.noFilesFoundInSkill}</div>
    );
  }
  const viewingFile = listed.length > 1 && selectedFilePath != null;
  const title = viewingFile
    ? (selectedFilePath.split("/").pop() ?? displayToken(skill.name))
    : displayToken(skill.name);
  const description = skill.description?.trim() ?? "";
  const copyContent =
    listed.find((entry) => entry.path === "SKILL.md" || entry.path.endsWith("/SKILL.md"))?.content
    ?? listed[0]?.content;
  const userInvocable = isPluginSkillUserInvocable(skill);
  const orgManaged = plugin.source === "org";
  const editDisabled = orgManaged || !SKILLS_ENABLED;
  const editTooltip = orgManaged
    ? text.pluginManagedByOrganization
    : SKILLS_ENABLED
      ? undefined
      : text.skillsMustBeEnabledToCustomize;
  const actions = viewingFile ? undefined : (
    <div className="flex items-center gap-1">
      {skill.hostFilesystemLocation ? (
        <PluginSkillEditButton
          disabled={editDisabled}
          disabledTooltip={editTooltip}
          onCustomizeWithClaude={
            SKILLS_ENABLED
              ? () => onNavigate(pluginSkillCustomizeHref(plugin.name, isCcd, displayToken(skill.name)))
              : undefined
          }
          path={skill.hostFilesystemLocation}
        />
      ) : null}
      <PluginSkillOverflow
        copyContent={copyContent}
        onTryInChat={() => onNavigate(pluginSkillTryInChatHref(skill.name, userInvocable))}
        tryInChatDisabledReason={SKILLS_ENABLED ? undefined : text.skillsDisabledByOrganization}
      />
    </div>
  );
  const panel = (
    <CustomizeDetailPanel
      actionsSlot={actions}
      addedBy={viewingFile ? undefined : "user"}
      description={
        viewingFile || !description
          ? undefined
          : { content: description, tooltip: text.skillDescriptionTooltip }
      }
      lastUpdated={viewingFile || !plugin.updatedAt ? undefined : formatCustomizeDateMed(plugin.updatedAt)}
      name={title}
      userInvocable={viewingFile ? undefined : userInvocable}
    >
      <SkillBodyPreview files={listed} isLoadingFiles={false} selectedFilePath={selectedFilePath} />
    </CustomizeDetailPanel>
  );
  if (skill.source === "legacy-commands") {
    return (
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4">
          <div className="flex w-full items-center gap-3 rounded-lg border border-border-300 bg-bg-200 px-3 py-2 text-sm text-text-100">
            <Icon className="shrink-0 text-text-400" customSize={16} name="Info" />
            <span className="min-w-0 flex-1">{text.skillPreviouslyAuthoredAsCommand}</span>
          </div>
        </div>
        <div className="flex-1 min-h-0">{panel}</div>
      </div>
    );
  }
  return panel;
}

/** Official c4313ee9e Fe — SKILL.md (or first file) markdown body. */
function SkillBodyPreview({
  files,
  isLoadingFiles,
  selectedFilePath,
}: {
  files: PluginSkillFile[];
  isLoadingFiles: boolean;
  selectedFilePath?: string | null;
}) {
  const file = useMemo(() => {
    // Official c431 SkillFileView: files.find(e => e.path.endsWith(selectedPath))
    // because ozt strips a shared first path segment from tree node.path.
    if (selectedFilePath) {
      return files.find((entry) => entry.path.endsWith(selectedFilePath)) ?? files[0] ?? null;
    }
    return files.find((entry) => entry.path === "SKILL.md" || entry.path.endsWith("/SKILL.md")) ?? files[0] ?? null;
  }, [files, selectedFilePath]);
  if (isLoadingFiles) {
    return <div className="h-[200px] w-full rounded-md bg-bg-300 animate-pulse" />;
  }
  if (!file) return null;
  const content = file.content ?? "";
  const parsed = parseSkillMarkdown(content);
  const text = ("error" in parsed ? content : parsed.instructions).replace(/\\n/g, "\n").trim();
  if (!text) return null;
  return (
    <div className="flex-1 min-h-0 overflow-auto leading-[1.65rem]">
      <CoworkAssistantMarkdown className="font-claude-response" text={text} />
    </div>
  );
}

function PluginManifestListSubroute({
  plugin,
  selectedName,
  subroute,
}: {
  plugin: InstalledPlugin;
  selectedName?: string | null;
  subroute: Exclude<PluginSubroute, "skills">;
}) {
  const text = useCustomizeText();
  const items = useMemo(() => {
    if (subroute === "agents") return plugin.agents.map((row) => ({ description: row.description, name: row.name }));
    if (subroute === "hooks") {
      return plugin.hooks.map((row, index) => ({
        description: row.matcher ?? "",
        name: row.event || `hook-${index}`,
      }));
    }
    return plugin.mcpServers.map((row) => ({ description: row.type ?? "", name: row.name }));
  }, [plugin.agents, plugin.hooks, plugin.mcpServers, subroute]);
  const [selected, setSelected] = useState(selectedName ?? items[0]?.name ?? null);
  const active = items.find((item) => item.name === selected) ?? items[0] ?? null;
  const title = subroute === "agents" ? text.agents : subroute === "hooks" ? text.hooks : text.connectors;
  const empty =
    subroute === "agents"
      ? text.pluginHasNoAgents
      : subroute === "hooks"
        ? text.pluginHasNoHooks
        : text.pluginHasNoConnectors;
  const selectPrompt = subroute === "agents" ? text.selectAgentToView : text.selectHookToView;

  if (items.length === 0) {
    return <div className="flex items-center justify-center h-full text-text-400">{empty}</div>;
  }

  return (
    <div className="flex h-full">
      <ConnectorsPageSidebar title={title}>
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
      </ConnectorsPageSidebar>
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

/** Official vs() — decodeURIComponent both sides of skill selected compare. */
function decodeSkillName(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function subrouteIcon(subroute: Exclude<PluginSubroute, "skills">) {
  if (subroute === "agents") return <Icon customSize={16} name="Agent" />;
  if (subroute === "hooks") return <Icon customSize={16} name="Lightning" />;
  return <Icon customSize={16} name="connectors" />;
}
