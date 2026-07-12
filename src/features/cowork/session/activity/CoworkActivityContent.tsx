import { useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import { desktopBridge } from "../../../../adapters/desktopBridge";
import { scheduledTaskDetailPath } from "../../scheduled/scheduledPaths";
import { Icon } from "../../../../shell/icons";
import { CoworkInstructionEditorModal } from "./CoworkInstructionEditorModal";
import { CoworkBrowserPickerButton, useCoworkBrowserSwitching } from "./CoworkBrowserPickerButton";
import { CoworkContextEmptyStateWithConnectors } from "./CoworkSuggestedConnectors";
import { CoworkContextProjects } from "./CoworkContextProjects";
import { CoworkResourceIcon } from "./CoworkResourceRows";
import { CoworkScratchpadSection, CoworkWorkingFolderResources } from "./CoworkWorkingFolderResources";
import { normalizeCoworkPath } from "./coworkResourcePaths";
import { coworkResourceOperationLabel, isCoworkChromeMcpServer, type CoworkResourceActivity, type CoworkResourceCategory, type CoworkResourceOperation } from "./coworkResourceActivity";
import type { CoworkOpenFileTarget } from "./coworkActivityTypes";
import type { CoworkMountedProject } from "../../../../adapters/desktopBridge";

export function CoworkWorkingFolderContent({ folders, hasConnectedOfficeFiles = false, instructionFolder, onOpenFile, resources, scratchpadResources, sessionId }: { folders: string[]; hasConnectedOfficeFiles?: boolean; instructionFolder?: string; onOpenFile: (target: CoworkOpenFileTarget) => void; resources: CoworkResourceActivity[]; scratchpadResources: CoworkResourceActivity[]; sessionId: string }) {
  const [instructionsOpen, setInstructionsOpen] = useState(false);
  const canEditInstructions = Boolean(instructionFolder && desktopBridge.FileSystem.writeLocalFile);
  const instructionRow = canEditInstructions && instructionFolder ? <CoworkFolderInstructionsRow onOpen={() => setInstructionsOpen(true)} /> : null;
  if (folders.length === 0 && resources.length === 0 && scratchpadResources.length === 0) return hasConnectedOfficeFiles ? null : <CoworkEmptyArtifactsState />;
  return (
    <>
      <div className="flex flex-col gap-2">
        {folders.length <= 1 ? instructionRow : null}
        <CoworkWorkingFolderResources folders={folders} instructionRow={folders.length > 1 ? instructionRow : null} onOpenFile={onOpenFile} resources={resources} sessionId={sessionId} />
        <CoworkScratchpadSection onOpenFile={onOpenFile} resources={scratchpadResources} sessionId={sessionId} />
      </div>
      {canEditInstructions && instructionFolder ? <CoworkInstructionEditorModal folderPath={instructionFolder} isOpen={instructionsOpen} onClose={() => setInstructionsOpen(false)} sessionId={sessionId} /> : null}
    </>
  );
}

export type CoworkContextResourceOpenTarget = {
  filePath: string;
  fileName: string;
  isBrowserExtension?: boolean;
  isMcpServer?: boolean;
  isSkillInvocation?: boolean;
  isWebSearch?: boolean;
  latestId: string;
  pluginName?: string;
  mcpServer?: { iconSrc?: string; iconType?: string; name?: string; uuid?: string };
  mcpServerUuid?: string;
};

export function CoworkContextContent({
  mountedProjects,
  onNavigate,
  onOpenContextResource,
  resources,
  scheduledTaskId,
  selectedPath,
  userSelectedFolders,
}: {
  mountedProjects: CoworkMountedProject[];
  onNavigate: (path: string) => void;
  /** Official activity Re (~249116): SELECT_* / SELECT_FILE into cFt drawer. */
  onOpenContextResource: (group: CoworkContextResourceOpenTarget) => void;
  resources: CoworkResourceActivity[];
  scheduledTaskId?: string;
  selectedPath?: string;
  userSelectedFolders: string[];
}) {
  const groups = useMemo(() => buildCoworkContextGroups(resources, userSelectedFolders), [resources, userSelectedFolders]);
  if (groups.length === 0 && mountedProjects.length === 0 && !scheduledTaskId) return <CoworkContextEmptyStateWithConnectors onNavigate={onNavigate} />;
  return (
    <div className="flex flex-col -my-1">
      <CoworkContextProjects projects={mountedProjects} />
      {scheduledTaskId ? <CoworkScheduledTaskContextRow onNavigate={onNavigate} scheduledTaskId={scheduledTaskId} /> : null}
      {contextCategoryOrder.map((category) => {
        const categoryGroups = groups.filter((group) => group.categoryKey === category);
        return categoryGroups.length > 0 ? (
          <CoworkContextCategorySection
            categoryKey={category}
            groups={categoryGroups}
            key={category}
            onOpenContextResource={onOpenContextResource}
            selectedPath={selectedPath}
          />
        ) : null;
      })}
    </div>
  );
}

function CoworkScheduledTaskContextRow({ onNavigate, scheduledTaskId }: { onNavigate: (path: string) => void; scheduledTaskId: string }) {
  return (
    <button
      className="flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 hover:bg-bg-200 transition-colors text-left"
      onClick={() => onNavigate(scheduledTaskDetailPath(scheduledTaskId))}
      type="button"
    >
      <div className="flex-shrink-0 w-7 h-7 flex items-center justify-center bg-alpha-1 rounded-md text-text-500">
        <Icon name="Calendar" customSize={14} />
      </div>
      <span className="flex-1 min-w-0 truncate text-sm text-text-200">{scheduledTaskDisplayName(scheduledTaskId)}</span>
      <Icon name="ArrowOutSquare" customSize={14} className="flex-shrink-0 text-text-500" />
    </button>
  );
}

function CoworkFolderInstructionsRow({ onOpen }: { onOpen: () => void }) {
  return (
    <button className="flex w-full cursor-pointer items-center gap-2.5 rounded px-1 py-1.5 -mx-1 text-left hover:bg-bg-200" onClick={onOpen} type="button">
      <CoworkResourceIcon name="BookText" />
      <span className="flex-1 truncate text-sm text-text-200">
        Instructions <span className="text-text-500">· CLAUDE.md</span>
      </span>
    </button>
  );
}

function CoworkContextCategorySection({
  categoryKey,
  groups,
  onOpenContextResource,
  selectedPath,
}: {
  categoryKey: CoworkResourceCategory;
  groups: CoworkContextGroup[];
  onOpenContextResource: (group: CoworkContextResourceOpenTarget) => void;
  selectedPath?: string;
}) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-1.5 w-full py-2 font-small text-text-500"><span>{contextCategoryLabels[categoryKey]}</span></div>
      <div className="relative">
        {groups.map((group) => (
          <CoworkContextResourceRow
            group={group}
            isSelected={group.filePath === selectedPath}
            key={group.groupKey}
            onOpenContextResource={onOpenContextResource}
          />
        ))}
      </div>
    </div>
  );
}

function CoworkContextResourceRow({
  group,
  isSelected,
  onOpenContextResource,
}: {
  group: CoworkContextGroup;
  isSelected: boolean;
  onOpenContextResource: (group: CoworkContextResourceOpenTarget) => void;
}) {
  const operation = group.operationHistory[0]?.operation;
  const isBrowserSwitching = useCoworkBrowserSwitching();
  // Official HZt: commands are not clickable; files open via SELECT_FILE; mcp/web/browser/skill via Re.
  const isCommand = Boolean(group.isCommandInvocation);
  const canOpenNonFile =
    Boolean(group.isWebSearch) ||
    Boolean(group.isBrowserExtension) ||
    Boolean(group.isMcpServer) ||
    Boolean(group.isSkillInvocation);
  const canOpenFile = canOpenCoworkContextFile(group);
  const canOpen = !isCommand && (canOpenFile || canOpenNonFile);
  const canShowInFolder = canOpenFile && Boolean(desktopBridge.FileSystem.showInFolder);
  const openResource = () => {
    if (isCommand || !canOpen) return;
    // Official Re (~249116): all openable context groups share one handler (SELECT_* or SELECT_FILE).
    onOpenContextResource({
      filePath: group.filePath,
      fileName: group.fileName,
      isBrowserExtension: group.isBrowserExtension,
      isMcpServer: group.isMcpServer,
      isSkillInvocation: group.isSkillInvocation,
      isWebSearch: group.isWebSearch,
      latestId: group.latestId,
      pluginName: group.pluginName,
      mcpServer: group.mcpServer,
      mcpServerUuid: group.mcpServerUuid,
    });
  };
  const showInFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void desktopBridge.FileSystem.showInFolder?.(group.filePath);
  };
  return (
    <div className="relative" data-cowork-context-resource={group.filePath} onClick={openResource}>
      <div className={`flex items-center gap-2.5 py-1.5 px-1 rounded -mx-1 ${canOpen ? "group cursor-pointer hover:bg-bg-200" : ""} ${isSelected ? "bg-bg-300 rounded-md" : ""}`}>
        {group.isBrowserExtension && group.latestScreenshotSrc ? (
          <div className="flex-shrink-0 w-9 h-7 overflow-hidden rounded border border-border-300">
            <img alt="" className="h-full w-full object-cover" src={group.latestScreenshotSrc} />
          </div>
        ) : (
          <CoworkResourceIcon name={contextIconForGroup(group)} />
        )}
        <span className={`flex-1 min-w-0 truncate text-sm ${group.isBrowserExtension && isBrowserSwitching ? "text-text-400" : "text-text-200"} ${canOpen ? "group-hover:text-text-100 transition-colors" : ""}`}>
          {group.isBrowserExtension && isBrowserSwitching ? "Open Chrome and click Connect" : group.displayName}
        </span>
        {operation ? <span className="text-xs text-text-500 flex-shrink-0">{coworkResourceOperationLabel(operation)}</span> : null}
        {canShowInFolder ? (
          <button
            aria-label="Show in Folder"
            className="inline-flex size-5 flex-shrink-0 items-center justify-center rounded-small text-text-400 opacity-0 transition-opacity hover:bg-bg-200 hover:text-text-200 group-hover:opacity-100 focus-visible:opacity-100"
            onClick={showInFolder}
            type="button"
          >
            <Icon name="Folder" size="xs" />
          </button>
        ) : null}
        {group.isBrowserExtension ? <CoworkBrowserPickerButton tooltipSide="top" /> : null}
      </div>
    </div>
  );
}

type CoworkContextOperation = {
  id: string;
  operation: CoworkResourceOperation;
  searchQuery?: string;
  timestamp: number;
  toolName?: string;
};

type CoworkContextGroup = {
  categoryKey: CoworkResourceCategory;
  displayName: string;
  fileName: string;
  filePath: string;
  groupKey: string;
  isCommandInvocation?: boolean;
  isConnectorInvocation?: boolean;
  isBrowserExtension?: boolean;
  isMcpServer?: boolean;
  isSkillInvocation?: boolean;
  isWebSearch?: boolean;
  latestScreenshotSrc?: string;
  latestId: string;
  mcpServer?: {
    iconSrc?: string;
    iconType?: string;
    name?: string;
    uuid?: string;
  };
  mcpServerUuid?: string;
  operationHistory: CoworkContextOperation[];
  pluginName?: string;
};

const contextCategoryOrder: CoworkResourceCategory[] = ["outputs", "uploads", "connectors", "working", "memory", "skills", "commands"];
const contextCategoryLabels: Record<CoworkResourceCategory, string> = {
  commands: "Commands",
  connectors: "Connectors",
  internal: "",
  memory: "Memory",
  outputs: "Outputs",
  skills: "Skills",
  uploads: "Uploads",
  working: "Working files",
};

function buildCoworkContextGroups(resources: CoworkResourceActivity[], userSelectedFolders: string[]) {
  const groupsByKey = new Map<string, CoworkContextGroup>();
  for (const resource of resources) {
    const key = coworkContextGroupKey(resource);
    const operation = {
      id: resource.latestId,
      operation: resource.operation,
      searchQuery: resource.searchQuery,
      timestamp: resource.timestamp,
      toolName: resource.mcpToolName ?? resource.cliName ?? resource.toolName,
    };
    const current = groupsByKey.get(key);
    if (current) {
      current.operationHistory.push(operation);
      if (resource.timestamp > (current.operationHistory[0]?.timestamp ?? 0)) current.latestId = resource.latestId;
      continue;
    }
    // Official grouping (~247579–247688): mcp keeps mcpServer; skill keeps pluginName.
    const isMcpServer = resource.operation === "mcp_tool" && key !== "browser_extension://all";
    const mcpServerUuid = isMcpServer
      ? resource.mcpServerUuid ?? resource.mcpServer?.uuid ?? parseMcpServerFromPath(key)
      : undefined;
    const mcpServer = isMcpServer
      ? {
          ...resource.mcpServer,
          uuid: mcpServerUuid,
          name: resource.mcpServer?.name ?? resource.displayName,
          iconSrc: resource.mcpServer?.iconSrc,
          iconType: resource.mcpServer?.iconType,
        }
      : undefined;
    groupsByKey.set(key, {
      categoryKey: coworkContextGroupCategory(resource),
      displayName: coworkContextGroupDisplayName(resource, userSelectedFolders),
      fileName: resource.fileName,
      filePath:
        key === "browser_extension://all" || key === "web_search://all" || key.startsWith("mcp://")
          ? key
          : resource.filePath,
      groupKey: key,
      isCommandInvocation: resource.operation === "command_invoked",
      isConnectorInvocation: resource.operation === "cli_tool",
      isBrowserExtension: key === "browser_extension://all",
      isMcpServer,
      isSkillInvocation: resource.operation === "skill_invoked",
      isWebSearch: resource.operation === "web_search",
      latestId: resource.latestId,
      mcpServer,
      mcpServerUuid,
      operationHistory: [operation],
      pluginName: resource.pluginName,
    });
  }

  const groups = Array.from(groupsByKey.values());
  for (const group of groups) {
    group.operationHistory.sort((left, right) => right.timestamp - left.timestamp);
    group.latestId = group.operationHistory[0]?.id ?? group.latestId;
  }
  return groups.sort((left, right) => (right.operationHistory[0]?.timestamp ?? 0) - (left.operationHistory[0]?.timestamp ?? 0));
}

function coworkContextGroupKey(resource: CoworkResourceActivity) {
  if (resource.operation === "web_search") return "web_search://all";
  if (resource.operation === "mcp_tool" && coworkResourceIsChromeMcpServer(resource)) return "browser_extension://all";
  if (resource.operation === "mcp_tool") return `mcp://${resource.mcpServerUuid ?? parseMcpServerFromPath(resource.filePath) ?? resource.filePath}`;
  if (resource.operation === "memory") return `memory:${resource.fileName}`;
  return resource.filePath;
}

function coworkContextGroupCategory(resource: CoworkResourceActivity): CoworkResourceCategory {
  if (resource.operation === "mcp_tool" || resource.operation === "web_search" || resource.operation === "cli_tool") return "connectors";
  return resource.categoryKey;
}

function coworkContextGroupDisplayName(resource: CoworkResourceActivity, userSelectedFolders: string[]) {
  if (resource.operation === "web_search") return "Web search";
  if (resource.operation === "mcp_tool" && coworkResourceIsChromeMcpServer(resource)) return resource.mcpServer?.name ?? "Claude in Chrome";
  if (resource.operation === "mcp_tool") return resource.mcpServer?.name ?? resource.mcpServerUuid ?? parseMcpServerFromPath(resource.filePath) ?? resource.displayName;
  if (resource.operation === "memory") return memoryDisplayName(resource);
  if (resource.fileName === "CLAUDE.md" && userSelectedFolders.some((folder) => normalizeCoworkPath(resource.filePath).startsWith(`${normalizeCoworkPath(folder).replace(/\/+$/, "")}/`))) return "Folder instructions";
  return resource.displayName;
}

function contextIconForGroup(group: CoworkContextGroup) {
  if (group.isBrowserExtension) return "Globe";
  if (group.isWebSearch) return "Globe";
  if (group.isMcpServer) return "Mcp";
  if (group.isCommandInvocation) return "SlashShortcutCommand";
  if (group.isSkillInvocation) return "Plugin";
  if (group.categoryKey === "memory") return "Memory";
  return "Document";
}

function canOpenCoworkContextFile(group: CoworkContextGroup) {
  return !group.isWebSearch && !group.isBrowserExtension && !group.isMcpServer && !group.isConnectorInvocation && !group.isCommandInvocation && !group.isSkillInvocation;
}

function parseMcpServerFromPath(filePath: string) {
  const match = /^mcp:\/\/([^/]+)/.exec(filePath);
  return match?.[1];
}

function coworkResourceIsChromeMcpServer(resource: CoworkResourceActivity) {
  return isCoworkChromeMcpServer({ uuid: resource.mcpServerUuid, name: resource.mcpServer?.name });
}

function memoryDisplayName(resource: CoworkResourceActivity) {
  return resource.displayName || resource.fileName.replace(/\.[^/.]+$/, "").split(/[_\s-]+/).filter(Boolean).map((part, index) => {
    if (index === 0) return part.charAt(0).toUpperCase() + part.slice(1);
    return /^[A-Z][a-z']*$/.test(part) ? part.toLowerCase() : part;
  }).join(" ");
}

function scheduledTaskDisplayName(taskId: string) {
  return taskId.replace(/-/g, " ").replace(/^./, (first) => first.toUpperCase());
}

function CoworkEmptyArtifactsState() {
  return (
    <div className="flex flex-col items-start gap-3">
      <img alt="" className="dark:hidden" draggable={false} height={43} src="/images/illustrations/session-artifacts.svg" width={63} />
      <img alt="" className="hidden dark:block" draggable={false} height={43} src="/images/illustrations/session-artifacts-dark.svg" width={63} />
      <p className="text-text-500 font-small">View and open files created during this task.</p>
    </div>
  );
}
