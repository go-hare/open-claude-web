import { useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { desktopBridge } from "../../../../adapters/desktopBridge";
import type { ConnectedOfficeFile, CoworkSessionSnapshot, CoworkSessionsBridge, SessionSummary } from "../../../../adapters/desktopBridge/types";
import { Icon } from "../../../../shell/icons";
import {
  useCoworkCloseFileDrawer,
  useCoworkDrawerExpanded,
  useCoworkOpenBrowserExtension,
  useCoworkOpenMcpServer,
  useCoworkOpenSkill,
  useCoworkOpenWebSearch,
  useCoworkSelectedItem,
} from "../chatResource/CoworkChatResourceProvider";
import { CoworkActivityPanelShell } from "./CoworkActivityPanelShell";
import { CoworkActivitySection } from "./CoworkActivitySection";
import {
  CoworkContextContent,
  CoworkWorkingFolderContent,
  type CoworkContextResourceOpenTarget,
} from "./CoworkActivityContent";
import { CoworkConnectedOfficeFilesSection, useCoworkConnectedOfficeFiles } from "./CoworkConnectedOfficeFilesSection";
import { CoworkBrowseFilesButton, CoworkFileExplorerModal } from "./CoworkFileExplorerModal";
import { CoworkProgressSection } from "./CoworkProgressSection";
import { CoworkScheduledRunsSection, useCoworkScheduledRuns } from "./CoworkScheduledRunsSection";
import type { CoworkBackgroundTask, CoworkOpenFileTarget, CoworkTodoItem } from "./coworkActivityTypes";
import { coworkFolderSectionTitle, coworkSessionFolders, parseCoworkResourceActivity, splitCoworkResourceSections, type CoworkResourceSections } from "./coworkResourceActivity";
import { parseCoworkTodos } from "./coworkTodoActivity";
import type { CoworkRawMessage } from "../types";

export type { CoworkBackgroundTask } from "./coworkActivityTypes";

export function CoworkSessionActivityPanel({ bridge, messages, onNavigate, onOpenFile, session, sessionId, tasks }: {
  bridge: CoworkSessionsBridge;
  messages: CoworkRawMessage[];
  onNavigate: (path: string) => void;
  onOpenFile: (target: CoworkOpenFileTarget) => void;
  session: CoworkSessionSnapshot | null;
  sessionId: string;
  tasks: CoworkBackgroundTask[];
}) {
  const todos = useMemo(() => parseCoworkTodos(messages), [messages]);
  const resources = useMemo(() => parseCoworkResourceActivity(messages), [messages]);
  const folders = useMemo(() => coworkSessionFolders(session), [session]);
  const resourceSections = useMemo(() => splitCoworkResourceSections(resources, folders), [resources, folders]);
  const { connectedFiles: connectedOfficeFiles } = useCoworkConnectedOfficeFiles(sessionId);
  const scheduledRuns = useCoworkScheduledRuns(bridge, session?.scheduledTaskId);
  const selectedItem = useCoworkSelectedItem();
  const { isDrawerExpanded } = useCoworkDrawerExpanded();
  const closeDrawer = useCoworkCloseFileDrawer();
  const openMcpServer = useCoworkOpenMcpServer();
  const openWebSearch = useCoworkOpenWebSearch();
  const openBrowserExtension = useCoworkOpenBrowserExtension();
  const openSkill = useCoworkOpenSkill();
  const [progressOpen, setProgressOpen] = useState(true);
  const [runsOpen, setRunsOpen] = useState(true);
  const [foldersOpen, setFoldersOpen] = useState(() => hasFolderActivity(folders, resourceSections, connectedOfficeFiles));
  const [contextOpen, setContextOpen] = useState(true);
  const [officeFilesOpen, setOfficeFilesOpen] = useState(true);
  const hasActivity = hasCoworkActivity({ connectedOfficeFiles, folders, mountedProjects: session?.mountedProjects ?? [], resources, scheduledRuns, session, tasks, todos });
  const allTodosCompleted = useMemo(() => todos.length > 0 && todos.every((todo) => todo.status === "completed"), [todos]);
  const previousAllTodosCompletedRef = useRef(allTodosCompleted);

  // Official activity panel Re (~249116): open resource types via gle SELECT_* into cFt drawer.
  const openContextResource = (group: CoworkContextResourceOpenTarget) => {
    if (group.isWebSearch) {
      if (selectedItem?.type === "web_search" && isDrawerExpanded) {
        closeDrawer();
        return;
      }
      openWebSearch();
      return;
    }
    if (group.isBrowserExtension) {
      if (selectedItem?.type === "browser_extension" && isDrawerExpanded) {
        closeDrawer();
        return;
      }
      openBrowserExtension({ highlightId: group.latestId });
      return;
    }
    if (group.isMcpServer) {
      const serverUuid = group.mcpServerUuid ?? group.mcpServer?.uuid ?? group.filePath.replace(/^mcp:\/\//, "");
      if (selectedItem?.type === "mcp_server" && selectedItem.serverUuid === serverUuid && isDrawerExpanded) {
        closeDrawer();
        return;
      }
      openMcpServer({
        serverUuid,
        serverName: group.mcpServer?.name,
        iconType: group.mcpServer?.iconType,
        iconSrc: group.mcpServer?.iconSrc,
      });
      return;
    }
    if (group.isSkillInvocation) {
      const skillName = group.filePath.startsWith("skill://") ? group.filePath.slice(8) : group.fileName;
      if (selectedItem?.type === "skill" && selectedItem.skillName === skillName && isDrawerExpanded) {
        closeDrawer();
        return;
      }
      openSkill({ skillName, pluginName: group.pluginName });
      return;
    }
    // File path: toggle close if same file already open (official activity click).
    if (selectedItem?.type === "file" && selectedItem.path === group.filePath && isDrawerExpanded) {
      closeDrawer();
      return;
    }
    onOpenFile({ path: group.filePath });
  };

  useEffect(() => {
    if (hasFolderActivity(folders, resourceSections, connectedOfficeFiles)) setFoldersOpen(true);
  }, [connectedOfficeFiles, folders, resourceSections]);

  useEffect(() => {
    const previouslyAllCompleted = previousAllTodosCompletedRef.current;
    if (allTodosCompleted && !previouslyAllCompleted) setProgressOpen(false);
    else if (!allTodosCompleted && previouslyAllCompleted && todos.length > 0) setProgressOpen(true);
    previousAllTodosCompletedRef.current = allTodosCompleted;
  }, [allTodosCompleted, todos.length]);

  if (!hasActivity) return null;

  const selectedPath =
    selectedItem?.type === "file"
      ? selectedItem.path
      : selectedItem?.type === "browser_extension"
        ? "browser_extension://all"
        : selectedItem?.type === "web_search"
          ? "web_search://all"
          : selectedItem?.type === "mcp_server"
            ? `mcp://${selectedItem.serverUuid}`
            : selectedItem?.type === "skill"
              ? `skill://${selectedItem.skillName}`
              : undefined;

  return (
    <CoworkActivityPanelShell sessionId={sessionId}>
      <CoworkActivityPanelBody
        allTodosCompleted={allTodosCompleted}
        connectedOfficeFiles={connectedOfficeFiles}
        contextOpen={contextOpen}
        folders={folders}
        foldersOpen={foldersOpen}
        onContextToggle={() => setContextOpen((value) => !value)}
        onFoldersToggle={() => setFoldersOpen((value) => !value)}
        onNavigate={onNavigate}
        onOfficeFilesToggle={() => setOfficeFilesOpen((value) => !value)}
        onOpenContextResource={openContextResource}
        onOpenFile={onOpenFile}
        onProgressToggle={() => setProgressOpen((value) => !value)}
        onRunsToggle={() => setRunsOpen((value) => !value)}
        officeFilesOpen={officeFilesOpen}
        progressOpen={progressOpen}
        resourceSections={resourceSections}
        runsOpen={runsOpen}
        scheduledRuns={scheduledRuns}
        selectedPath={selectedPath}
        session={session}
        sessionId={sessionId}
        tasks={tasks}
        todos={todos}
      />
    </CoworkActivityPanelShell>
  );
}

function CoworkActivityPanelBody({ allTodosCompleted, connectedOfficeFiles, contextOpen, folders, foldersOpen, officeFilesOpen, onContextToggle, onFoldersToggle, onNavigate, onOfficeFilesToggle, onOpenContextResource, onOpenFile, onProgressToggle, onRunsToggle, progressOpen, resourceSections, runsOpen, scheduledRuns, selectedPath, session, sessionId, tasks, todos }: CoworkActivityPanelBodyProps) {
  const hasFolderRows = hasFolderActivity(folders, resourceSections, connectedOfficeFiles);
  const instructionFolder = useMemo(() => coworkInstructionFolder(session), [session]);
  const [fileExplorerOpen, setFileExplorerOpen] = useState(false);
  const folderHeaderAction = useMemo(() => {
    const canBrowseFiles = folders.length > 0 && Boolean(desktopBridge.FileSystem.listFilesInFolder);
    const canGoToFolder = folders.length === 1 && Boolean(desktopBridge.FileSystem.showInFolder || desktopBridge.FileSystem.openLocalFile);
    if (!canBrowseFiles && !canGoToFolder) return undefined;
    return (
      <span className="-my-1 flex items-center gap-1">
        {canBrowseFiles ? <CoworkBrowseFilesButton onBrowse={(event) => { event.stopPropagation(); setFileExplorerOpen(true); }} /> : null}
        {canGoToFolder ? <CoworkGoToFolderButton folder={folders[0]} /> : null}
      </span>
    );
  }, [folders]);
  return (
    <>
      {scheduledRuns.length > 0 ? <CoworkScheduledRunsSection currentSessionId={sessionId} isExpanded={runsOpen} onNavigate={onNavigate} onToggle={onRunsToggle} runs={scheduledRuns} /> : null}
      <CoworkProgressSection allTodosCompleted={allTodosCompleted} isExpanded={progressOpen} onToggle={onProgressToggle} tasks={tasks} todos={todos} />
      <CoworkActivitySection contentClassName={hasFolderRows ? undefined : "!pb-3"} headerLeftAction={folderHeaderAction} isExpanded={foldersOpen} maxContentHeight="24rem" title={coworkFolderSectionTitle(folders)} onToggle={onFoldersToggle}>
        <CoworkWorkingFolderContent folders={folders} hasConnectedOfficeFiles={connectedOfficeFiles.length > 0} instructionFolder={instructionFolder} resources={resourceSections.workingResources} scratchpadResources={resourceSections.scratchpadResources} sessionId={sessionId} onOpenFile={onOpenFile} />
        <CoworkConnectedOfficeFilesSection files={connectedOfficeFiles} isExpanded={officeFilesOpen} onToggle={onOfficeFilesToggle} />
      </CoworkActivitySection>
      <CoworkActivitySection isExpanded={contextOpen} title="上下文" onToggle={onContextToggle}>
        <CoworkContextContent
          mountedProjects={session?.mountedProjects ?? []}
          onNavigate={onNavigate}
          onOpenContextResource={onOpenContextResource}
          resources={resourceSections.contextResources}
          scheduledTaskId={session?.scheduledTaskId}
          selectedPath={selectedPath}
          userSelectedFolders={session?.userSelectedFolders?.filter(Boolean) ?? []}
        />
      </CoworkActivitySection>
      <CoworkFileExplorerModal folders={folders} isOpen={fileExplorerOpen} onClose={() => setFileExplorerOpen(false)} onOpenFile={onOpenFile} sessionId={sessionId} />
    </>
  );
}

function CoworkGoToFolderButton({ folder }: { folder?: string }) {
  if (!folder) return null;
  const openFolder = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void (desktopBridge.FileSystem.showInFolder?.(folder) ?? desktopBridge.FileSystem.openLocalFile?.(folder));
  };
  return (
    <button
      aria-label="Go to folder"
      className="inline-flex size-5 items-center justify-center rounded-small text-text-400 hover:bg-bg-200 hover:text-text-200"
      onClick={openFolder}
      type="button"
    >
      <Icon name="Folder" size="xs" />
    </button>
  );
}

type CoworkActivityPanelBodyProps = {
  allTodosCompleted: boolean;
  connectedOfficeFiles: ConnectedOfficeFile[];
  contextOpen: boolean;
  folders: string[];
  foldersOpen: boolean;
  officeFilesOpen: boolean;
  onContextToggle: () => void;
  onFoldersToggle: () => void;
  onNavigate: (path: string) => void;
  onOfficeFilesToggle: () => void;
  onOpenContextResource: (group: CoworkContextResourceOpenTarget) => void;
  onOpenFile: (target: CoworkOpenFileTarget) => void;
  onProgressToggle: () => void;
  onRunsToggle: () => void;
  progressOpen: boolean;
  resourceSections: CoworkResourceSections;
  runsOpen: boolean;
  scheduledRuns: SessionSummary[];
  selectedPath?: string;
  session: CoworkSessionSnapshot | null;
  sessionId: string;
  tasks: CoworkBackgroundTask[];
  todos: CoworkTodoItem[];
};

function hasFolderActivity(folders: string[], sections: CoworkResourceSections, connectedOfficeFiles: unknown[]) {
  return folders.length > 0 || sections.workingResources.length > 0 || sections.scratchpadResources.length > 0 || connectedOfficeFiles.length > 0;
}

function hasCoworkActivity({ connectedOfficeFiles, folders, mountedProjects, resources, scheduledRuns, session, tasks, todos }: { connectedOfficeFiles: unknown[]; folders: string[]; mountedProjects: unknown[]; resources: unknown[]; scheduledRuns: unknown[]; session: CoworkSessionSnapshot | null; tasks: unknown[]; todos: unknown[] }) {
  return todos.length > 0 || tasks.length > 0 || resources.length > 0 || folders.length > 0 || connectedOfficeFiles.length > 0 || mountedProjects.length > 0 || scheduledRuns.length > 0 || Boolean(session?.scheduledTaskId);
}

function coworkInstructionFolder(session: CoworkSessionSnapshot | null) {
  const userSelectedFolders = session?.userSelectedFolders?.filter(Boolean) ?? [];
  if (userSelectedFolders.length > 0) return userSelectedFolders[0];
  const folders = session?.folders?.filter(Boolean) ?? [];
  return folders[0];
}
