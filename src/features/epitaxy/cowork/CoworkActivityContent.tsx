import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { scheduledTaskDetailPath } from "../../cowork/scheduled/scheduledPaths";
import { Icon } from "../../../shell/icons";
import { CoworkInstructionEditorModal } from "./CoworkInstructionEditorModal";
import { CoworkBrowserPickerButton, useCoworkBrowserSwitching } from "./CoworkBrowserPickerButton";
import { CoworkContextProjects } from "./CoworkContextProjects";
import { CoworkResourceIcon } from "./CoworkResourceRows";
import { CoworkScratchpadSection, CoworkWorkingFolderResources } from "./CoworkWorkingFolderResources";
import { normalizeCoworkPath } from "./coworkResourcePaths";
import { coworkResourceOperationLabel, isCoworkChromeMcpServer, type CoworkResourceActivity, type CoworkResourceCategory, type CoworkResourceOperation } from "./coworkResourceActivity";
import type { CoworkOpenFileTarget } from "./coworkActivityTypes";
import type { CoworkMountedProject } from "../../../adapters/desktopBridge";

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

export function CoworkContextContent({ mountedProjects, onNavigate, onOpenBrowserExtension, onOpenFile, resources, scheduledTaskId, selectedPath, userSelectedFolders }: { mountedProjects: CoworkMountedProject[]; onNavigate: (path: string) => void; onOpenBrowserExtension?: (target: { highlightId?: string }) => void; onOpenFile: (target: CoworkOpenFileTarget) => void; resources: CoworkResourceActivity[]; scheduledTaskId?: string; selectedPath?: string; userSelectedFolders: string[] }) {
  const groups = useMemo(() => buildCoworkContextGroups(resources, userSelectedFolders), [resources, userSelectedFolders]);
  if (groups.length === 0 && mountedProjects.length === 0 && !scheduledTaskId) return <CoworkContextEmptyStateWithConnectors onNavigate={onNavigate} />;
  return (
    <div className="flex flex-col -my-1">
      <CoworkContextProjects projects={mountedProjects} />
      {scheduledTaskId ? <CoworkScheduledTaskContextRow onNavigate={onNavigate} scheduledTaskId={scheduledTaskId} /> : null}
      {contextCategoryOrder.map((category) => {
        const categoryGroups = groups.filter((group) => group.categoryKey === category);
        return categoryGroups.length > 0 ? <CoworkContextCategorySection categoryKey={category} groups={categoryGroups} key={category} onOpenBrowserExtension={onOpenBrowserExtension} onOpenFile={onOpenFile} selectedPath={selectedPath} /> : null;
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

function CoworkContextCategorySection({ categoryKey, groups, onOpenBrowserExtension, onOpenFile, selectedPath }: { categoryKey: CoworkResourceCategory; groups: CoworkContextGroup[]; onOpenBrowserExtension?: (target: { highlightId?: string }) => void; onOpenFile: (target: CoworkOpenFileTarget) => void; selectedPath?: string }) {
  return (
    <div className="mb-2 last:mb-0">
      <div className="flex items-center gap-1.5 w-full py-2 font-small text-text-500"><span>{contextCategoryLabels[categoryKey]}</span></div>
      <div className="relative">
        {groups.map((group) => <CoworkContextResourceRow group={group} isSelected={group.filePath === selectedPath} key={group.groupKey} onOpenBrowserExtension={onOpenBrowserExtension} onOpenFile={onOpenFile} />)}
      </div>
    </div>
  );
}

function CoworkContextResourceRow({ group, isSelected, onOpenBrowserExtension, onOpenFile }: { group: CoworkContextGroup; isSelected: boolean; onOpenBrowserExtension?: (target: { highlightId?: string }) => void; onOpenFile: (target: CoworkOpenFileTarget) => void }) {
  const operation = group.operationHistory[0]?.operation;
  const isBrowserSwitching = useCoworkBrowserSwitching();
  const canOpenFile = canOpenCoworkContextFile(group);
  const canOpenBrowserExtension = group.isBrowserExtension && Boolean(onOpenBrowserExtension);
  const canOpen = canOpenFile || canOpenBrowserExtension;
  const canShowInFolder = canOpenFile && Boolean(desktopBridge.FileSystem.showInFolder);
  const openFile = () => {
    if (canOpenFile) onOpenFile({ path: group.filePath });
    else if (canOpenBrowserExtension) onOpenBrowserExtension?.({ highlightId: group.latestId });
  };
  const showInFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void desktopBridge.FileSystem.showInFolder?.(group.filePath);
  };
  return (
    <div className="relative" data-cowork-context-resource={group.filePath} onClick={openFile}>
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
  operationHistory: CoworkContextOperation[];
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
    groupsByKey.set(key, {
      categoryKey: coworkContextGroupCategory(resource),
      displayName: coworkContextGroupDisplayName(resource, userSelectedFolders),
      fileName: resource.fileName,
      filePath: key === "browser_extension://all" ? key : resource.filePath,
      groupKey: key,
      isCommandInvocation: resource.operation === "command_invoked",
      isConnectorInvocation: resource.operation === "cli_tool",
      isBrowserExtension: key === "browser_extension://all",
      isMcpServer: resource.operation === "mcp_tool" && key !== "browser_extension://all",
      isSkillInvocation: resource.operation === "skill_invoked",
      isWebSearch: resource.operation === "web_search",
      latestId: resource.latestId,
      operationHistory: [operation],
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

function CoworkEmptyContextState() {
  return (
    <div className="flex flex-col gap-3">
      <img alt="" className="dark:hidden" draggable={false} height={56} src="/images/illustrations/session-context.svg" width={114} />
      <img alt="" className="hidden dark:block" draggable={false} height={56} src="/images/illustrations/session-context-dark.svg" width={114} />
      <p className="text-text-500 font-small">Track tools and referenced files used in this task.</p>
    </div>
  );
}

const suggestedConnectorsDismissedKey = "suggested_connectors_dismissed_v1";
const suggestedConnectorsClickedKey = "suggested_connectors_clicked_v1";

type CoworkSuggestedConnector = {
  description: string;
  icon: "Connectors" | "Globe" | "Plugin";
  id: string;
  name: string;
  path: string;
};

// Official ion-dist basis:
// index-BELzQL5P.js has fQt.displayName="ContextEmptyStateWithConnectors",
// nQt.displayName="SuggestedConnectorsContent", sQt.displayName="ConnectorRow",
// XZt="suggested_connectors_dismissed_v1", JZt="suggested_connectors_clicked_v1".
function CoworkContextEmptyStateWithConnectors({ onNavigate }: { onNavigate: (path: string) => void }) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const emptyStateRef = useRef<HTMLDivElement | null>(null);
  const [availableHeight, setAvailableHeight] = useState<number | undefined>();

  useLayoutEffect(() => {
    const root = rootRef.current;
    const emptyState = emptyStateRef.current;
    if (!root || !emptyState || typeof ResizeObserver === "undefined") return;
    const findOverflowContainer = () => {
      let parent = root.parentElement;
      while (parent && !parent.classList.contains("overflow-hidden")) parent = parent.parentElement;
      return parent;
    };
    const measure = () => {
      const container = findOverflowContainer();
      if (!container) return;
      const nextAvailableHeight = container.getBoundingClientRect().height - emptyState.getBoundingClientRect().height - 12;
      setAvailableHeight(nextAvailableHeight > 0 ? nextAvailableHeight : undefined);
    };
    measure();
    const container = findOverflowContainer();
    const observer = new ResizeObserver(measure);
    if (container) observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={rootRef} className="flex flex-col flex-1 min-h-0">
      <div ref={emptyStateRef}>
        <CoworkEmptyContextState />
      </div>
      <CoworkSuggestedConnectors availableHeight={availableHeight} onNavigate={onNavigate} />
    </div>
  );
}

function CoworkSuggestedConnectors({ availableHeight, onNavigate }: { availableHeight?: number; onNavigate: (path: string) => void }) {
  const connectors = useMemo<CoworkSuggestedConnector[]>(() => [
    {
      description: "Navigate, click buttons, and fill forms in your browser",
      icon: "Globe",
      id: "chrome-extension",
      name: "Claude in Chrome",
      path: "/chrome",
    },
    {
      description: "Search and update your Notion pages and databases",
      icon: "Connectors",
      id: "notion",
      name: "Notion",
      path: "/customize/connectors",
    },
    {
      description: "Create, update, and track issues in Linear",
      icon: "Connectors",
      id: "linear",
      name: "Linear",
      path: "/customize/connectors",
    },
    {
      description: "Create and edit designs in Canva",
      icon: "Plugin",
      id: "canva",
      name: "Canva",
      path: "/customize/connectors",
    },
  ], []);
  const [isReady, setIsReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [clickedConnectors, setClickedConnectors] = useState<Set<string>>(() => new Set());
  const [hasAppeared, setHasAppeared] = useState(false);
  const { maxRows, shouldHide, showDescription } = useMemo(() => suggestedConnectorLayout(availableHeight, connectors.length), [availableHeight, connectors.length]);
  const isCycling = maxRows === 1 && connectors.length > 1 && availableHeight !== undefined;
  const [cycleIndex, setCycleIndex] = useState(0);

  useEffect(() => {
    setIsDismissed(localStorage.getItem(suggestedConnectorsDismissedKey) === "true");
    const clicked = localStorage.getItem(suggestedConnectorsClickedKey);
    if (clicked) {
      try {
        const parsed = JSON.parse(clicked);
        if (Array.isArray(parsed)) setClickedConnectors(new Set(parsed.filter((item) => typeof item === "string")));
      } catch {
        setClickedConnectors(new Set());
      }
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady && !hasAppeared) {
      const frame = requestAnimationFrame(() => setHasAppeared(true));
      return () => cancelAnimationFrame(frame);
    }
  }, [hasAppeared, isReady]);

  useEffect(() => {
    if (!isCycling) {
      setCycleIndex(0);
      return;
    }
    const timer = window.setInterval(() => setCycleIndex((value) => (value + 1) % connectors.length), 3000);
    return () => window.clearInterval(timer);
  }, [connectors.length, isCycling]);

  if (!isReady || isDismissed || shouldHide || connectors.length === 0) return null;

  const visibleConnectors = isCycling ? [connectors[cycleIndex]] : connectors.slice(0, maxRows);
  const dismiss = () => {
    localStorage.setItem(suggestedConnectorsDismissedKey, "true");
    setIsDismissed(true);
  };
  const markClicked = (id: string) => {
    setClickedConnectors((previous) => {
      const next = new Set(previous);
      next.add(id);
      localStorage.setItem(suggestedConnectorsClickedKey, JSON.stringify([...next]));
      return next;
    });
  };
  const openConnector = (connector: CoworkSuggestedConnector) => {
    markClicked(connector.id);
    onNavigate(connector.path);
  };

  return (
    <div className={`-mx-3 mt-auto border-t-0.5 border-border-300 transition-opacity duration-200 ${hasAppeared ? "opacity-100" : "opacity-0"}`}>
      {isCycling ? (
        <style>
          {`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
          `}
        </style>
      ) : null}
      <div className="flex items-center justify-between px-4 pt-4 pb-0">
        <span className="font-medium text-sm text-text-100">Suggested connectors</span>
        <button
          aria-label="Dismiss suggested connectors"
          className="p-1 rounded-md transition-colors duration-150 text-text-300 hover:text-text-100 hover:bg-bg-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          onClick={dismiss}
          type="button"
        >
          <Icon name="X" customSize={14} />
        </button>
      </div>
      {showDescription ? <p className="px-4 pt-2 pb-2 text-xs text-text-500">Cowork uses connectors to browse websites, manage tasks, and more.</p> : null}
      <div className="mx-4 mt-4 mb-1 rounded-lg border-0.5 border-border-300">
        {visibleConnectors.map((connector) => (
          <div className={isCycling ? "animate-fade-in" : undefined} key={connector.id} style={isCycling ? { animation: "fadeIn 300ms ease-in-out" } : undefined}>
            <CoworkSuggestedConnectorRow connector={connector} isClicked={clickedConnectors.has(connector.id)} onOpen={openConnector} />
          </div>
        ))}
        <button
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 text-xs text-text-500 hover:text-text-300 transition-colors duration-150 hover:bg-bg-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100"
          onClick={() => onNavigate("/customize/connectors")}
          type="button"
        >
          <span>See all connectors</span>
          <Icon name="ArrowRight" customSize={16} className="text-text-500" />
        </button>
      </div>
    </div>
  );
}

function CoworkSuggestedConnectorRow({ connector, isClicked, onOpen }: { connector: CoworkSuggestedConnector; isClicked: boolean; onOpen: (connector: CoworkSuggestedConnector) => void }) {
  const rowClassName = [
    "w-full flex items-center justify-between gap-3 px-3 py-3",
    "border-b-0.5 border-border-300 first:rounded-t-lg",
    "transition-colors duration-150",
    "hover:bg-bg-200 active:bg-bg-300 cursor-pointer",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100",
  ].join(" ");
  return (
    <button className={rowClassName} onClick={() => onOpen(connector)} title={connector.description} type="button">
      <span className="flex items-center gap-3">
        {isClicked ? <CoworkSuggestedConnectorClickedIcon /> : <CoworkSuggestedConnectorIcon icon={connector.icon} />}
        <span className="text-xs text-text-200">{connector.name}</span>
      </span>
      <Icon name="Add" customSize={20} className="text-text-300 flex-shrink-0" />
    </button>
  );
}

function CoworkSuggestedConnectorIcon({ icon }: { icon: CoworkSuggestedConnector["icon"] }) {
  return (
    <span className="w-7 h-7 rounded-lg bg-bg-100 border-0.5 border-border-300 flex items-center justify-center overflow-hidden">
      <Icon name={icon} customSize={18} className="text-text-300" />
    </span>
  );
}

function CoworkSuggestedConnectorClickedIcon() {
  return (
    <span className="w-7 h-7 rounded-full bg-bg-200 flex items-center justify-center">
      <Icon name="Check" customSize={14} className="text-text-300" />
    </span>
  );
}

function suggestedConnectorLayout(availableHeight: number | undefined, connectorCount: number) {
  if (availableHeight === undefined) return { maxRows: connectorCount, shouldHide: false, showDescription: true };
  const withDescriptionRows = Math.floor((availableHeight - 172) / 44);
  if (withDescriptionRows >= 1) return { maxRows: Math.min(withDescriptionRows, connectorCount), shouldHide: false, showDescription: true };
  const compactRows = Math.floor((availableHeight - 136) / 44);
  if (compactRows >= 1) return { maxRows: Math.min(compactRows, connectorCount), shouldHide: false, showDescription: false };
  return { maxRows: 0, shouldHide: true, showDescription: false };
}
