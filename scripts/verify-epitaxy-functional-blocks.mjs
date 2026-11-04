#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const workspaceRoot = path.resolve(root, "..");

/** 1.6608 BELz / 2.31226 D35w|c621|cd5a — data-official-source may lag UI retarget. */
const OFFICIAL_SRC = String.raw`(?:index-BELzQL5P\.js|index-D35w9RK9\.js|c62135ccf-[A-Za-z0-9_-]+\.js|cd5a31703-[A-Za-z0-9_-]+\.js|c21f11e6d-[A-Za-z0-9_-]+\.js|c11959232-(?:h_zsw3wI|CDBo_AYC)\.js|shared-8-4Jj8qhmU\.js|c752b32f8-[A-Za-z0-9_-]+\.js)`;
const hasOfficialSrc = (haystack, suffix) => new RegExp(`${OFFICIAL_SRC}${suffix}`).test(haystack);

const files = {
  tile: path.join(root, "src/features/epitaxy/EpitaxySessionTile.tsx"),
  components: path.join(root, "src/features/epitaxy/OfficialEpitaxyComponents.tsx"),
  bridgeIndex: path.join(root, "src/adapters/desktopBridge/index.ts"),
  bridgeTypes: path.join(root, "src/adapters/desktopBridge/types.ts"),
  bridgeAdapter: path.join(root, "src/adapters/desktopBridge/officialBridgeAdapter.ts"),
  fakeBridge: path.join(root, "src/adapters/desktopBridge/fakeDesktopBridge.ts"),
  routes: path.join(root, "src/app/routes.tsx"),
  desktopFrame: path.join(root, "src/shell/DesktopFrame.tsx"),
  coworkActivityPanel: path.join(root, "src/features/cowork/session/activity/CoworkSessionActivityPanel.tsx"),
  coworkActivityShell: path.join(root, "src/features/cowork/session/activity/CoworkActivityPanelShell.tsx"),
  coworkOfficialComponents: [
    path.join(root, "src/features/cowork/composer/CoworkSessionComposer.tsx"),
    path.join(root, "src/features/cowork/composer/CoworkSessionComposerSurface.tsx"),
    path.join(root, "src/features/cowork/composer/coworkChromeMessages.ts"),
    path.join(root, "src/features/cowork/composer/CoworkPermissionApprovals.tsx"),
    path.join(root, "src/features/cowork/composer/CoworkPermissionStandardApprovals.tsx"),
    path.join(root, "src/features/cowork/session/CoworkSessionHeader.tsx"),
    path.join(root, "src/features/cowork/session/transcript/CoworkHumanMessage.tsx"),
    path.join(root, "src/features/cowork/session/transcript/CoworkThinkingCell.tsx"),
    path.join(root, "src/features/cowork/session/transcript/coworkDirectoryTools.ts"),
  ],
  coworkAddMenu: path.join(root, "src/features/cowork/newTask/CoworkAddMenuItems.ts"),
  coworkBrowserExtensionDetail: path.join(root, "src/features/cowork/session/activity/CoworkBrowserExtensionDetailPanel.tsx"),
  coworkBrowserPicker: path.join(root, "src/features/cowork/session/activity/CoworkBrowserPickerButton.tsx"),
  coworkActivityContent: path.join(root, "src/features/cowork/session/activity/CoworkActivityContent.tsx"),
  coworkActivitySection: path.join(root, "src/features/cowork/session/activity/CoworkActivitySection.tsx"),
  coworkConnectedOfficeFiles: path.join(root, "src/features/cowork/session/activity/CoworkConnectedOfficeFilesSection.tsx"),
  coworkContextProjects: path.join(root, "src/features/cowork/session/activity/CoworkContextProjects.tsx"),
  coworkFileExplorer: path.join(root, "src/features/cowork/session/activity/CoworkFileExplorerModal.tsx"),
  coworkExplorerPreview: path.join(root, "src/features/cowork/session/CoworkExplorerFilePreview.tsx"),
  coworkSuggestedConnectors: path.join(root, "src/features/cowork/session/activity/CoworkSuggestedConnectors.tsx"),
  coworkChatResourcePanels: path.join(root, "src/features/cowork/session/chatResource/CoworkChatResourcePanels.tsx"),
  coworkInstructionEditor: path.join(root, "src/features/cowork/session/activity/CoworkInstructionEditorModal.tsx"),
  coworkProgress: path.join(root, "src/features/cowork/session/activity/CoworkProgressSection.tsx"),
  coworkResourceRows: path.join(root, "src/features/cowork/session/activity/CoworkResourceRows.tsx"),
  coworkWorkingFolderResources: path.join(root, "src/features/cowork/session/activity/CoworkWorkingFolderResources.tsx"),
  coworkResourceActivity: path.join(root, "src/features/cowork/session/activity/coworkResourceActivity.ts"),
  coworkResourceFromTool: path.join(root, "src/features/cowork/session/activity/coworkResourceFromTool.ts"),
  coworkResourceTypes: path.join(root, "src/features/cowork/session/activity/coworkResourceTypes.ts"),
  coworkHeader: path.join(root, "src/features/cowork/newTask/CoworkHeader.tsx"),
  coworkPromptBox: path.join(root, "src/features/cowork/composer/CoworkPromptBox.tsx"),
  coworkDropdown: path.join(root, "src/features/cowork/ui/CoworkDropdownButton.tsx"),
  coworkNewTask: path.join(root, "src/features/cowork/newTask/CoworkNewTaskPage.tsx"),
  coworkProjectContext: path.join(root, "src/features/cowork/newTask/CoworkProjectContext.tsx"),
  coworkUploadedFiles: path.join(root, "src/features/cowork/newTask/coworkUploadedFiles.ts"),
  coworkSessionView: path.join(root, "src/features/cowork/session/CoworkSessionView.tsx"),
  coworkFileViewer: path.join(root, "src/features/cowork/session/CoworkFileViewer.tsx"),
  existingComposer: path.join(root, "src/features/epitaxy/session/OfficialExistingSessionComposer.tsx"),
  codeTranscript: path.join(root, "src/features/epitaxy/session/OfficialTranscript.tsx"),
  codeTranscriptParse: path.join(root, "src/features/epitaxy/session/officialTranscriptParse.ts"),
  codeChromeMessages: path.join(root, "src/features/epitaxy/officialCodeChromeMessages.ts"),
  codeStreamLifecycle: path.join(root, "src/features/epitaxy/session/officialStreamLifecycleEvents.ts"),
  codeSessionStore: path.join(root, "src/features/epitaxy/session/officialCodeSessionStore.ts"),
  codeFilePane: path.join(root, "src/features/epitaxy/session/OfficialFilePane.tsx"),
  codePreviewPane: path.join(root, "src/features/epitaxy/session/OfficialPreviewPane.tsx"),
  codeSidePanes: path.join(root, "src/features/epitaxy/session/EpitaxySidePanes.tsx"),
  codePermissions: path.join(root, "src/features/epitaxy/session/OfficialToolPermissionApprovals.tsx"),
  codeSdkQuery: path.join(workspaceRoot, "open-claude-desktop/electron/main/services/localSessions/codeSdkQuerySession.ts"),
  composerFooter: path.join(root, "src/features/epitaxy/OfficialComposerFooter.tsx"),
  codeHomeComposer: path.join(root, "src/features/epitaxy/composer/OfficialCodeComposer.tsx"),
  coworkHeaderMessages: path.join(root, "src/features/cowork/newTask/coworkNewTaskMessages.ts"),
  publicAccessPages: path.join(root, "src/features/public/AccessPages.tsx"),
  scheduledPaths: path.join(root, "src/features/cowork/scheduled/scheduledPaths.ts"),
  scheduledTaskDetail: path.join(root, "src/features/cowork/scheduled/ScheduledTaskDetail.tsx"),
  scheduledTaskEditor: path.join(root, "src/features/cowork/scheduled/ScheduledTaskCreateModal.tsx"),
  scheduledTasks: path.join(root, "src/features/cowork/scheduled/ScheduledTasks.tsx"),
  codeScheduledPaths: path.join(root, "src/features/scheduled/scheduledPaths.ts"),
  codeScheduledTaskDetail: path.join(root, "src/features/scheduled/ScheduledTaskDetail.tsx"),
  codeScheduledTaskEditor: path.join(root, "src/features/scheduled/ScheduledTaskEditor.tsx"),
  codeScheduledTasks: path.join(root, "src/features/scheduled/ScheduledTasks.tsx"),
  sidebarData: path.join(root, "src/shell/sidebarData.ts"),
  desktopStore: path.join(workspaceRoot, "open-claude-desktop/electron/main/services/localSessions/localSessionStore.ts"),
  desktopRunner: path.join(workspaceRoot, "open-claude-desktop/electron/main/services/localSessions/claudeCliRunner.ts"),
  desktopHandlers: path.join(workspaceRoot, "open-claude-desktop/electron/main/ipc/localSessionsHandlers.ts"),
  desktopWebBridge: path.join(workspaceRoot, "open-claude-desktop/electron/preload/bridges/webBridge.ts"),
  desktopFileSystemHandlers: path.join(workspaceRoot, "open-claude-desktop/electron/main/ipc/fileSystemHandlers.ts"),
  desktopPermissionVerifier: path.join(workspaceRoot, "open-claude-desktop/scripts/verify-claude-permission-protocol.mjs"),
  runtimeVerifier: path.join(root, "scripts/verify-epitaxy-runtime.mjs"),
};

function read(file) {
  const targets = Array.isArray(file) ? file : [file];
  return targets.map((target) => fs.readFileSync(target, "utf8")).join("\n");
}

const source = Object.fromEntries(Object.entries(files).map(([key, file]) => [key, read(file)]));

const checks = [
  {
    group: "小细节按钮",
    name: "assistant message forwards fork/rewind into OfficialMessageActions",
    test: () => /export function OfficialAssistantMessage\([\s\S]*onFork[\s\S]*onRewind/.test(source.components)
      && /OfficialMessageActions[\s\S]*copyText=\{copyText\}[\s\S]*onFork=\{onFork\}[\s\S]*onRewind=\{onRewind\}/.test(source.components),
  },
  {
    group: "小细节按钮",
    name: "assistant transcript entries wire fork/rewind callbacks",
    test: () => /function CodeAssistantEntryMessage[\s\S]*actions\.bridge\.forkSession[\s\S]*actions\.onNavigate/.test(source.codeTranscript)
      && /function CodeAssistantEntryMessage[\s\S]*actions\.bridge\.rewind[\s\S]*actions\.reload/.test(source.codeTranscript),
  },
  {
    group: "小细节按钮",
    name: "assistant thumbs feedback is bridged to submitTranscriptFeedback",
    test: () => /submitTranscriptFeedback[\s\S]*message_rating/.test(source.codeTranscript)
      && /submitTranscriptFeedback\?:/.test(source.bridgeTypes)
      && /raw\?\.submitTranscriptFeedback/.test(source.bridgeAdapter),
  },
  {
    group: "对话流",
    name: "code transcript supports attach-as-context into session composer",
    test: () => /attachAsContext/.test(source.codeTranscript + source.tile)
      && /Attach message as context|Attach selection as context/.test(source.codeChromeMessages + source.tile)
      && /attachRef/.test(source.existingComposer + source.tile)
      && /tiptapDocFromPlainText/.test(source.existingComposer + source.tile),
  },
  {
    group: "对话流",
    name: "code API error card can reset rate limits via org API",
    test: () => /postOrganizationResetRateLimits/.test(source.codeTranscript)
      && /Reset limits/.test(source.codeTranscript)
      && /canResetRateLimitsFromBootstrap/.test(source.codeTranscript)
      && /reset_rate_limits/.test(fs.readFileSync(path.join(root, "src/features/settings/accountSettingsApi.ts"), "utf8")),
  },
  {
    group: "对话流",
    name: "code transcript parses result turn_error and local_command context/stats",
    test: () => /kind: "turn_error"/.test(source.codeTranscriptParse)
      && /parseOfficialContextUsageMarkdown/.test(source.codeTranscriptParse)
      && /parseOfficialCodeStatsXml/.test(source.codeTranscriptParse)
      && /CodeTurnErrorBlock/.test(source.codeTranscript)
      && /CodeTaskEventChip/.test(source.codeTranscript),
  },
  {
    group: "底部输入框",
    name: "composer uses TipTap and supports send, stop, Enter submit, Shift+Enter newline, bash escape",
    test: () => /function ExistingSessionComposer/.test(source.existingComposer)
      && /useEditor\(/.test(source.existingComposer)
      && /<EditorContent/.test(source.existingComposer)
      && /const canStop = isResponding/.test(source.existingComposer)
      && /COMPOSER_SEND_STOP_MESSAGES/.test(source.existingComposer)
      && /event\.key !== "Enter"/.test(source.existingComposer)
      && /event\.key === "Escape"/.test(source.existingComposer)
      && /isBashMode/.test(source.existingComposer),
  },
  {
    group: "底部输入框",
    name: "composer exposes mode/add/workspace/model controls",
    test: () => /header="Mode"/.test(source.composerFooter)
      && /ariaLabel="Add"/.test(source.composerFooter)
      && /header="Models"/.test(source.composerFooter)
      && /OfficialComposerFooter/.test(source.existingComposer)
      && /OfficialWorkspaceControls/.test(source.codeHomeComposer),
  },
  {
    group: "协作路由",
    name: "Cowork start uses official message/sessionId payload shape",
    test: () => /message\?: string;/.test(source.bridgeTypes)
      && /sessionId\?: string;/.test(source.bridgeTypes)
      && /const message = input\.message \?\? input\.prompt/.test(source.bridgeAdapter)
      && /sessionId: input\.sessionId/.test(source.bridgeAdapter)
      && /const message = input\.message \?\? input\.prompt/.test(source.fakeBridge)
      && /id: input\.sessionId \?\?/.test(source.fakeBridge)
      && /const sessionId = createCoworkSessionId\(\)/.test(source.coworkNewTask)
      && /message,\s*\n\s*messageUuid/.test(source.coworkNewTask)
      && /sessionId,/.test(source.coworkNewTask)
      && /sessionId\?: string;/.test(source.desktopStore)
      && /const requestedId = typeof input\.sessionId === "string"/.test(source.desktopStore),
  },
  {
    group: "协作路由",
    name: "Legacy chat routes redirect to official Cowork new task instead of Code",
    test: () => /function CoworkLegacyTaskRedirect/.test(source.routes)
      && /window\.history\.replaceState\(\{\}, "", "\/task\/new"\)/.test(source.routes)
      && /id: "legacy-new-chat"/.test(source.routes)
      && /path: "\/new"/.test(source.routes)
      && /Nds t\(\\"new\\"\) beforeLoad -> \/task\/new/.test(source.routes)
      && /id: "legacy-chat"/.test(source.routes)
      && /path: "\/chat\/:uuid"/.test(source.routes)
      && /Nds t\(\\"chat\/\$uuid\\"\) beforeLoad -> \/task\/new/.test(source.routes)
      && /id: "legacy-cowork-agent"/.test(source.routes)
      && /path: "\/cowork\/agent"/.test(source.routes)
      && /Nds t\(\\"cowork\/agent\\"\) beforeLoad -> \/task\/new/.test(source.routes)
      && /pathname === "\/new"/.test(source.desktopFrame)
      && /pathname\.startsWith\("\/chat\/"\)/.test(source.desktopFrame)
      && /Legacy \/new redirects to \/task\/new instead of Code/.test(source.runtimeVerifier)
      && /Legacy \/chat\/\$uuid redirects to \/task\/new instead of Code/.test(source.runtimeVerifier)
      && /Legacy \/cowork\/agent redirects to \/task\/new instead of Code/.test(source.runtimeVerifier),
  },
  {
    group: "协作活动面板",
    name: "Cowork Progress follows official completed-todos auto-collapse behavior",
    test: () => /const allTodosCompleted = useMemo/.test(source.coworkActivityPanel)
      && /previousAllTodosCompletedRef/.test(source.coworkActivityPanel)
      && /setProgressOpen\(false\)/.test(source.coworkActivityPanel)
      && /setProgressOpen\(true\)/.test(source.coworkActivityPanel)
      && /headerLeftAction/.test(source.coworkActivitySection)
      && /\{todos\.length\} of \{todos\.length\}/.test(source.coworkProgress)
      && /title="进度"/.test(source.coworkProgress)
      && /title="上下文"/.test(source.coworkActivityPanel)
      && /return "工作文件夹"/.test(source.coworkResourceActivity)
      && /CoworkActivityPanelHeaderToggle/.test(source.coworkSessionView)
      && /id="dframe-header-actions-slot"/.test(source.coworkOfficialComponents)
      && /flex flex-col pt-0/.test(source.coworkActivityShell),
  },
  {
    group: "协作活动面板",
    name: "Cowork Working folder exposes official Go to folder action",
    test: () => /showInFolder\?:/.test(source.bridgeTypes)
      && /openLocalFile\?:/.test(source.bridgeTypes)
      && /showInFolder: async/.test(source.bridgeAdapter)
      && /openLocalFile: async/.test(source.bridgeAdapter)
      && /showInFolder: async \(\) => true/.test(source.fakeBridge)
      && /aria-label="Go to folder"/.test(source.coworkActivityPanel)
      && /desktopBridge\.FileSystem\.showInFolder/.test(source.coworkActivityPanel),
  },
  {
    group: "协作活动面板",
    name: "Cowork Working folder exposes official Browse files explorer",
    test: () => /listFilesInFolder\?:/.test(source.bridgeTypes)
      && /LocalFileEntry/.test(source.bridgeTypes)
      && /listFilesInFolder: async/.test(source.bridgeAdapter)
      && /normalizeLocalFileEntries/.test(source.bridgeAdapter)
      && /listFilesInFolder: async/.test(source.fakeBridge)
      && /aria-label="Browse files"/.test(source.coworkFileExplorer)
      && /title="Browse files"/.test(source.coworkFileExplorer)
      && /Select a file to preview it\./.test(source.coworkExplorerPreview)
      && /CoworkBrowseFilesButton/.test(source.coworkActivityPanel)
      && /listDirectoryEntries/.test(source.desktopFileSystemHandlers)
      && /officialSignature/.test(source.desktopFileSystemHandlers),
  },
  {
    group: "协作活动面板",
    name: "Cowork Working folder exposes official CLAUDE.md instructions editor",
    test: () => /readLocalFile\?:/.test(source.bridgeTypes)
      && /writeLocalFile\?:/.test(source.bridgeTypes)
      && /readLocalFile: async/.test(source.bridgeAdapter)
      && /writeLocalFile: async/.test(source.bridgeAdapter)
      && /readLocalFile: async/.test(source.fakeBridge)
      && /writeLocalFile: async/.test(source.fakeBridge)
      && /chromeText\.instructions/.test(source.coworkActivityContent)
      && /CoworkInstructionEditorModal/.test(source.coworkActivityContent)
      && /chromeText\.folderInstructions/.test(source.coworkInstructionEditor)
      && /chromeText\.folderInstructionsDescription/.test(source.coworkInstructionEditor)
      && /placeholder=\{chromeText\.folderInstructionsPlaceholder\}/.test(source.coworkInstructionEditor)
      && /writeLocalFile\?\.\(sessionId, encodeURIComponent\(memoryFilePath\), content\)/.test(source.coworkInstructionEditor)
      && /readLocalFile\?\.\(sessionId, encodeURIComponent\(memoryFilePath\)\)/.test(source.coworkInstructionEditor),
  },
  {
    group: "协作活动面板",
    name: "Cowork Working folders use official grouped content instead of duplicate folder rows",
    test: () => /CoworkWorkingFolderResources/.test(source.coworkActivityContent)
      && /folders\.length === 1/.test(source.coworkWorkingFolderResources)
      && /expandedByFolder\[folder\] \?\? index === 0/.test(source.coworkWorkingFolderResources)
      && /resources\.filter\(\(resource\) => isResourceInCoworkFolder/.test(source.coworkWorkingFolderResources)
      && /className="overflow-hidden pl-5"/.test(source.coworkWorkingFolderResources)
      && /aria-label="Go to folder"/.test(source.coworkWorkingFolderResources)
      && /group-hover:opacity-100/.test(source.coworkWorkingFolderResources)
      && /CoworkScratchpadSection/.test(source.coworkWorkingFolderResources)
      && /aria-expanded=\{isExpanded\}/.test(source.coworkWorkingFolderResources)
      && !/function CoworkFolderRows/.test(source.coworkActivityContent + source.coworkWorkingFolderResources)
      && /userSelectedFolders\.length > 0/.test(source.coworkActivityPanel),
  },
  {
    group: "协作活动面板",
    name: "Cowork Working folder renders official connected Office files section",
    test: () => /ConnectedOfficeFile/.test(source.bridgeTypes)
      && /OfficeAddinFiles: ConnectedOfficeFilesBridge/.test(source.bridgeTypes)
      && /RawClaudeOfficeAddinBridge/.test(source.bridgeAdapter)
      && /createOfficeAddinFilesBridge/.test(source.bridgeAdapter)
      && /normalizeConnectedOfficeFiles/.test(source.bridgeAdapter)
      && /window\["claude\.officeAddin"\]/.test(source.bridgeIndex)
      && /setFakeConnectedOfficeFiles/.test(source.fakeBridge)
      && /CoworkConnectedOfficeFilesSection/.test(source.coworkActivityPanel)
      && /useCoworkConnectedOfficeFiles/.test(source.coworkConnectedOfficeFiles)
      && /<span>Connected files<\/span>/.test(source.coworkConnectedOfficeFiles)
      && /desktopBridge\.OfficeAddinFiles\.selectFile/.test(source.coworkConnectedOfficeFiles)
      && /desktopBridge\.OfficeAddinFiles\.focusFile/.test(source.coworkConnectedOfficeFiles)
      && /hasConnectedOfficeFiles/.test(source.coworkActivityContent)
      && /Connected files/.test(source.runtimeVerifier)
      && /Cowork connected Office files section renders/.test(source.runtimeVerifier)
      && /Cowork connected Office file badge is clickable/.test(source.runtimeVerifier),
  },
  {
    group: "协作活动面板",
    name: "Cowork empty Context renders official Suggested connectors block",
    test: () => /CoworkContextEmptyStateWithConnectors/.test(source.coworkActivityContent)
      && /suggested_connectors_dismissed_v1/.test(source.coworkSuggestedConnectors)
      && /suggested_connectors_clicked_v1/.test(source.coworkSuggestedConnectors)
      && /chromeText\.suggestedConnectors/.test(source.coworkSuggestedConnectors)
      && /chromeText\.coworkUsesConnectors/.test(source.coworkSuggestedConnectors)
      && /chromeText\.dismissSuggestedConnectors/.test(source.coworkSuggestedConnectors)
      && /chromeText\.seeAllConnectors/.test(source.coworkSuggestedConnectors)
      && /Navigate, click buttons, and fill forms in your browser/.test(source.coworkSuggestedConnectors)
      && /Search and update your Notion pages and databases/.test(source.coworkSuggestedConnectors)
      && /Create, update, and track issues in Linear/.test(source.coworkSuggestedConnectors)
      && /Create and edit designs in Canva/.test(source.coworkSuggestedConnectors)
      && /connectorLayout\(availableHeight/.test(source.coworkSuggestedConnectors)
      && /Cowork empty Context shows official Suggested connectors/.test(source.runtimeVerifier),
  },
  {
    group: "协作活动面板",
    name: "Cowork Context uses official category-grouped resource list",
    test: () => /contextCategoryOrder: CoworkResourceCategory\[\] = \["outputs", "uploads", "connectors", "working", "memory", "skills", "commands"\]/.test(source.coworkActivityContent)
      && /contextCategoryLabels/.test(source.coworkActivityContent)
      && /buildCoworkContextGroups/.test(source.coworkActivityContent)
      && /web_search:\/\/all/.test(source.coworkActivityContent)
      && /mcp:\/\/\$\{resource\.mcpServerUuid/.test(source.coworkActivityContent)
      && /groupKey: key/.test(source.coworkActivityContent)
      && /key === "browser_extension:\/\/all" \|\| key === "web_search:\/\/all" \|\| key\.startsWith\("mcp:\/\/"\)/.test(source.coworkActivityContent)
      && /onOpenContextResource/.test(source.coworkActivityContent)
      && /aria-label="Show in Folder"/.test(source.coworkActivityContent)
      && /readLocalFile/.test(source.coworkFileViewer)
      && !/isCoworkSurface/.test(source.tile)
      && /scheduledTaskDisplayName/.test(source.coworkActivityContent)
      && /scheduledTaskDetailPath\(scheduledTaskId\)/.test(source.coworkActivityContent)
      && /scheduledTaskIndexPath = "\/scheduled-task"/.test(source.scheduledPaths)
      && /path: "\/scheduled-task\/:taskId"/.test(source.routes)
      && /path: "\/scheduled-task"/.test(source.routes)
      && /scheduledTaskDetailPath\(suffix\.slice/.test(source.publicAccessPages)
      && /coworkScheduledTaskIndexPath/.test(source.sidebarData)
      && /onNavigate\(scheduledTaskIndexPath\)/.test(source.scheduledTaskDetail)
      && /onCreated=\{\(id\) => onNavigate\(scheduledTaskDetailPath\(id\)\)\}/.test(source.scheduledTasks)
      && /onSelect=\{\(\) => onNavigate\(scheduledTaskDetailPath\(task\.id\)\)\}/.test(source.scheduledTasks)
      && /CoworkContextProjects/.test(source.coworkActivityContent)
      && /mountedProjects=\{session\?\.mountedProjects \?\? \[\]\}/.test(source.coworkActivityPanel)
      && /mountedProjects\?: CoworkMountedProject\[\]/.test(source.bridgeTypes)
      && /normalizeCoworkMountedProjects/.test(source.bridgeAdapter)
      && /mountedProjects: input\.mountedProjects/.test(source.bridgeAdapter)
      && /mountedProjects: input\.mountedProjects/.test(source.fakeBridge)
      && /mountedProjects\?: LocalMountedProject\[\]/.test(source.desktopStore)
      && /<div className="py-1 text-xs text-text-300">项目<\/div>/.test(source.coworkContextProjects)
      && /desktopBridge\.FileSystem\.showInFolder\?\.\(project\.hostPath\)/.test(source.coworkContextProjects)
      && !/buildContextRows/.test(source.coworkActivityContent)
      && !/label: "Model"/.test(source.coworkActivityContent)
      && /mcpServerUuid\?:/.test(source.coworkResourceTypes)
      && /searchQuery\?:/.test(source.coworkResourceTypes)
      && /mcpServerUuid: serverUuid/.test(source.coworkResourceFromTool)
      && /searchQuery: query/.test(source.coworkResourceFromTool),
  },
  {
    group: "协作活动面板",
    name: "Cowork Context renders official BrowserPickerButton for Claude in Chrome",
    test: () => /CoworkBrowserPickerButton/.test(source.coworkActivityContent)
      && /useCoworkBrowserSwitching/.test(source.coworkActivityContent)
      && /isCoworkChromeMcpServer/.test(source.coworkActivityContent)
      && /browser_extension:\/\/all/.test(source.coworkActivityContent)
      && /Open Chrome and click Connect/.test(source.coworkActivityContent)
      && hasOfficialSrc(source.coworkBrowserPicker, String.raw`:PZt BrowserPickerButton`)
      && /aria-label="Switch browser"/.test(source.coworkBrowserPicker)
      && /Connected browsers/.test(source.coworkBrowserPicker)
      && /Refresh browser list/.test(source.coworkBrowserPicker)
      && /No browsers connected/.test(source.coworkBrowserPicker)
      && /Browser listing requires a newer version of the desktop app\./.test(source.coworkBrowserPicker)
      && /Broadcast connection request…/.test(source.coworkBrowserPicker)
      && /!p-1 min-w-\[240px\]/.test(source.coworkBrowserPicker)
      && /list_connected_browsers/.test(source.bridgeAdapter)
      && /select_browser/.test(source.bridgeAdapter)
      && /switch_browser/.test(source.bridgeAdapter)
      && /BrowserUse: BrowserUseBridge/.test(source.bridgeTypes)
      && /ConnectedBrowser/.test(source.bridgeTypes)
      && /BrowserUse: createBrowserUseBridge/.test(source.bridgeAdapter)
      && /BrowserUse: \{/.test(source.fakeBridge)
      && /setFakeConnectedBrowsers/.test(source.fakeBridge)
      && /coworkChromeMcpServerUuid/.test(source.coworkResourceActivity)
      && /Cowork BrowserPickerButton lists connected browsers/.test(source.runtimeVerifier)
      && /Cowork BrowserPickerButton selects a connected browser/.test(source.runtimeVerifier)
      && /Cowork BrowserPickerButton broadcasts connection request/.test(source.runtimeVerifier),
  },
  {
    group: "协作活动面板",
    name: "Cowork Context opens official BrowserExtensionActivityDetailWrapper",
    test: () => /CoworkBrowserExtensionDetailPanel/.test(source.coworkChatResourcePanels)
      && /useCoworkOpenBrowserExtension/.test(source.coworkActivityPanel)
      && /openBrowserExtension/.test(source.coworkActivityPanel)
      && /onOpenContextResource/.test(source.coworkActivityContent)
      && /data-cowork-context-resource/.test(source.coworkActivityContent)
      && hasOfficialSrc(source.coworkBrowserExtensionDetail, String.raw`:RRt BrowserExtensionActivityDetailWrapper`)
      && hasOfficialSrc(source.coworkBrowserExtensionDetail, String.raw`:ERt ConnectedBrowsersSummary`)
      && /Claude in Chrome/.test(source.coworkBrowserExtensionDetail)
      && /Chrome instances signed in to your account that Claude can automate\./.test(source.coworkBrowserExtensionDetail)
      && /Close panel/.test(source.coworkBrowserExtensionDetail)
      && /No browser extension activity yet/.test(source.coworkBrowserExtensionDetail)
      && /Waiting for you to choose a browser/.test(source.coworkBrowserExtensionDetail)
      && /Connecting to browser/.test(source.coworkBrowserExtensionDetail)
      && /Checking connected browsers/.test(source.coworkBrowserExtensionDetail)
      && /Switch to the Chrome window you want Claude to use/.test(source.coworkBrowserExtensionDetail)
      && /ring-2 ring-brand-100 ring-offset-1/.test(source.coworkBrowserExtensionDetail)
      && /Cowork BrowserExtension detail panel opens/.test(source.runtimeVerifier)
      && /Cowork BrowserExtension detail shows connected browsers summary/.test(source.runtimeVerifier)
      && /Cowork BrowserExtension detail closes back to Context/.test(source.runtimeVerifier),
  },
  {
    group: "协作输入框",
    name: "Cowork new task header follows official v6t/y6t safe-use and feedback copy",
    test: () => (
      hasOfficialSrc(source.coworkHeader, String.raw`:v6t\/y6t Cowork page header`)
      || hasOfficialSrc(source.coworkHeader, String.raw`:ir\/gn Cowork page header`)
    )
      && /Let[’']s knock something off your list\.?/.test(source.coworkHeaderMessages)
      && /support\.claude\.com\/en\/articles\/13364135-use-claude-cowork-safely/.test(source.coworkHeaderMessages)
      && /Learn how to use Cowork safely/.test(source.coworkHeaderMessages)
      && /anthropic\.qualtrics\.com\/jfe\/form\/SV_a4v19ZDkO7RaVNQ/.test(source.coworkHeaderMessages)
      && /source: "agent_new_page"/.test(source.coworkHeader)
      && /give us feedback/.test(source.coworkHeaderMessages)
      && !/来把待办清掉吧|了解如何安全使用协作/.test(source.coworkHeader + source.coworkHeaderMessages)
      && /Cowork new task header follows official safe-use copy/.test(source.runtimeVerifier)
      && /Cowork feedback link invokes official AgentModeFeedback payload/.test(source.runtimeVerifier),
  },
  {
    group: "协作输入框",
    name: "Cowork Add menu follows official CS/sx grouped files-tools-modes flow",
    test: () => hasOfficialSrc(source.coworkAddMenu, String.raw`:CS\/sx\/aC c752b32f8-DLL-jMVJ.js:to`)
      && /Add files or photos/.test(source.coworkAddMenu)
      && /Add folder/.test(source.coworkAddMenu)
      && /Add to project/.test(source.coworkAddMenu)
      && /Start a new project/.test(source.coworkAddMenu)
      && /Add from Google Drive/.test(source.coworkAddMenu)
      && /Search Drive/.test(source.coworkAddMenu)
      && /Search documents\.\.\./.test(source.coworkAddMenu)
      && /No recent Drive documents/.test(source.coworkAddMenu)
      && /Add from GitHub/.test(source.coworkAddMenu)
      && /separator-tools/.test(source.coworkAddMenu)
      && /Skills/.test(source.coworkAddMenu)
      && /Add connectors/.test(source.coworkAddMenu)
      && /Plugins/.test(source.coworkAddMenu)
      && /separator-modes/.test(source.coworkAddMenu)
      && /Web search/.test(source.coworkAddMenu)
      && /Research/.test(source.coworkAddMenu)
      && /Use style/.test(source.coworkAddMenu)
      && /Menu\.SubmenuRoot/.test(source.coworkDropdown)
      && /function CoworkPromptBox/.test(source.coworkPromptBox)
      && /createCoworkAddMenuItems/.test(source.coworkPromptBox)
      && /CoworkSelectedFiles/.test(source.coworkPromptBox)
      && /CoworkSelectedProjectIndicators/.test(source.coworkPromptBox)
      && /data-official-source="/.test(source.coworkPromptBox)
      && hasOfficialSrc(source.coworkPromptBox, String.raw`:w6t\/\$4t CAt onpage`)
      && /alignOffset=\{-10\}/.test(source.coworkPromptBox)
      && /side="bottom"/.test(source.coworkPromptBox)
      && /sideOffset=\{4\}/.test(source.coworkPromptBox)
      && hasOfficialSrc(source.coworkProjectContext, String.raw`:WCt\/HCt\/gwt\/xwt`)
      && /agent_mode_project_warning_dismissed:/.test(source.coworkProjectContext)
      && /Add project context from/.test(source.coworkProjectContext)
      && /This will add project instructions and files to this task\./.test(source.coworkProjectContext)
      && /Files are saved to this computer\./.test(source.coworkProjectContext)
      && /Don't show again/.test(source.coworkProjectContext)
      && /data-testid="agent-mode-project-indicator"/.test(source.coworkProjectContext)
      && /getDetectedProjects: async/.test(source.fakeBridge)
      && /mountedProjects: selectedProjects/.test(source.coworkNewTask)
      && /Cowork new task Add menu opens official project submenu/.test(source.runtimeVerifier)
      && /Cowork Add project warning dialog follows official gwt copy/.test(source.runtimeVerifier)
      && /Cowork UI submit includes selected project context payload/.test(source.runtimeVerifier)
      && /Cowork Add menu shows official connector and mode groups/.test(source.runtimeVerifier)
      && /Cowork Add menu Google Drive submenu exposes official empty state/.test(source.runtimeVerifier)
      && /Cowork Add connectors action opens official customize route/.test(source.runtimeVerifier),
  },
  {
    group: "协作对话",
    name: "Cowork selected files use official uploaded_files file_uuid shape",
    test: () => /createCoworkUploadedFile/.test(source.coworkUploadedFiles)
      && /fileUuid: createMessageUuid\(\)/.test(source.coworkUploadedFiles)
      && /<file_uuid>\$\{uploadedFile\.fileUuid\}<\/file_uuid>/.test(source.coworkUploadedFiles)
      && /coworkUploadedFilePaths/.test(source.coworkNewTask),
  },
  {
    group: "协作对话",
    name: "Cowork session surface is backed by official component wrappers",
    test: () => /function CoworkSessionComposer/.test(source.coworkOfficialComponents)
      && /function CoworkPromptBox/.test(source.coworkPromptBox)
      && hasOfficialSrc(source.coworkPromptBox, String.raw`:w6t\/\$4t CAt onpage`)
      && /chromeText\.queue/.test(source.coworkOfficialComponents)
      && /id: "4YDNPC1W1k"/.test(source.coworkOfficialComponents)
      && /id: "9PawskFnw4"/.test(source.coworkOfficialComponents)
      && /id: "1rQBje0k5s"/.test(source.coworkOfficialComponents)
      && /id: "CI9xffp7fP"/.test(source.coworkOfficialComponents)
      && /function CoworkDirectoryApproval/.test(source.coworkOfficialComponents)
      && /(?:index-BELzQL5P|index-D35w9RK9|c21f11e6d-[A-Za-z0-9_-]+\.js):Yge/.test(source.coworkOfficialComponents)
      && /function CoworkSessionHeader/.test(source.coworkOfficialComponents)
      && /function CoworkHumanMessage/.test(source.coworkOfficialComponents)
      && /function CoworkThinkingCell/.test(source.coworkOfficialComponents)
      && /CoworkSessionComposer/.test(source.coworkSessionView)
      && /CoworkSessionHeader/.test(source.coworkSessionView)
      && /isCoworkDirectoryPermissionRequest/.test(source.coworkOfficialComponents)
      && !/OfficialCoworkComposer/.test(source.coworkSessionView)
      && !/OfficialCoworkComposer/.test(source.tile)
      && !/variant=\{isCoworkSurface/.test(source.tile)
      && !/variant\?: "code" \| "cowork"/.test(source.components),
  },
  {
    group: "文件预览",
    name: "tool file paths open file pane instead of preview pane",
    test: () => /type OfficialFileViewTarget/.test(source.tile)
      && /case "file":\n\s*return <OfficialFilePane/.test(source.codeSidePanes)
      && /actions\?\.openFile\(\{ path/.test(source.codeTranscript)
      && !/ToolPathButton[\s\S]*actions\?\.openPreview\(\{ path/.test(source.codeTranscript),
  },
  {
    group: "文件预览",
    name: "file pane supports text/image/markdown/copy/open-in-editor actions",
    test: () => /function OfficialFilePane/.test(source.codeFilePane)
      && /readSessionImageAsDataUrl/.test(source.codeFilePane)
      && /isMarkdownPreviewPath/.test(source.codeFilePane)
      && /Copy file contents/.test(source.codeFilePane)
      && /Open in/.test(source.codeFilePane + source.codePreviewPane),
  },
  {
    group: "权限审批",
    name: "approval card exposes deny, always allow, allow once and shortcuts",
    test: () => /Always allow/.test(source.codePermissions)
      && /Allow once/.test(source.codePermissions)
      && /decision: "always" \| "deny" \| "once"/.test(source.codePermissions)
      && /event\.key === "Escape"[\s\S]*decide\("deny"\)/.test(source.codePermissions)
      && /event\.shiftKey \? "always" : "once"/.test(source.codePermissions),
  },
  {
    group: "权限审批",
    name: "desktop handler no longer returns unconditional fake success",
    test: () => !/respondToToolPermission: async \(\) => true/.test(source.desktopHandlers)
      && /sessionRunner\.respondToToolPermission/.test(source.desktopHandlers)
      && /tool_permission_response_failed/.test(source.desktopHandlers),
  },
  {
    group: "权限审批",
    name: "desktop runner uses official stdio control_request/control_response protocol",
    test: () => /"--input-format",\s*"stream-json"/.test(source.desktopRunner)
      && /"--permission-prompt-tool",\s*"stdio"/.test(source.desktopRunner)
      && /control_response/.test(source.desktopRunner)
      && /control_request/.test(source.desktopRunner + source.codeSdkQuery)
      && /setPendingToolPermission/.test(source.desktopRunner)
      && /blocks denied Write/.test(source.desktopPermissionVerifier),
  },
  {
    group: "权限审批",
    name: "web keeps failed permission responses visible",
    test: () => /toolPermissionResponseFailed/.test(source.codePermissions)
      && /setResolveError/.test(source.codePermissions)
      && /respondToToolPermission\(requestId, decision, \{/.test(source.codePermissions)
      && /Permission response failed/.test(source.codePermissions),
  },
  {
    group: "权限审批",
    name: "web treats store pending as authoritative and optimistically resolves",
    test: () => /suppressedRequestIdsRef/.test(source.codePermissions)
      && /syncRequestsFromStorePending/.test(source.codePermissions)
      && /Empty incoming is authoritative clear/.test(source.codePermissions)
      && /if \(incoming\.length === 0\) return \[\];/.test(source.codePermissions)
      && /storePending === undefined/.test(source.codePermissions)
      && /optimistic/.test(source.codePermissions),
  },
  {
    group: "对话流渲染",
    name: "stream finalization does not hard reload transcript",
    test: () => /shouldClearOfficialStreamForEvent/.test(source.codeStreamLifecycle + source.codeSessionStore)
      && /shouldFlushOfficialStreamAfterMergedResult/.test(source.codeStreamLifecycle + source.codeSessionStore)
      && !/window\.location\.reload/.test(source.codeSessionStore),
  },
  {
    group: "对话流渲染",
    name: "transcript parser filters raw stream events and merges stream snapshot",
    test: () => /rawType === "stream_event"/.test(source.codeTranscriptParse)
      && /parseOfficialTranscriptEntries/.test(source.codeTranscriptParse)
      && /mergeOfficialStreamSnapshot/.test(source.codeTranscriptParse),
  },
  {
    group: "运行时验证",
    name: "headless runtime verifier covers controls, composer, file pane, approval and stream",
    test: () => /copy\/rewind\/fork\/thumb buttons exist in real DOM/.test(source.runtimeVerifier)
      && /official TipTap composer and control buttons exist in real DOM/.test(source.runtimeVerifier)
      && /Cowork new task page renders official composer/.test(source.runtimeVerifier)
      && /Cowork new task Add menu opens official project submenu/.test(source.runtimeVerifier)
      && /Cowork Add project warning dialog follows official gwt copy/.test(source.runtimeVerifier)
      && /Cowork UI submit includes selected project context payload/.test(source.runtimeVerifier)
      && /Cowork UI submit lands on \/local_sessions/.test(source.runtimeVerifier)
      && /Cowork follow-up reply stays inside \/local_sessions/.test(source.runtimeVerifier)
      && /Cowork Add menu shows official connector and mode groups/.test(source.runtimeVerifier)
      && /Cowork Add menu Google Drive submenu exposes official empty state/.test(source.runtimeVerifier)
      && /Cowork Add connectors action opens official customize route/.test(source.runtimeVerifier)
      && /Cowork attachment payload matches official uploaded_files shape/.test(source.runtimeVerifier)
      && /fake bridge creates a Cowork local_\* session/.test(source.runtimeVerifier)
      && /Cowork session renders official Cowork composer and long Add label/.test(source.runtimeVerifier)
      && /Cowork working folder exposes official Go to folder action/.test(source.runtimeVerifier)
      && /Cowork working folder exposes official Browse files action/.test(source.runtimeVerifier)
      && /Cowork Browse files modal lists local files/.test(source.runtimeVerifier)
      && /Cowork folder instructions editor opens official CLAUDE\.md modal/.test(source.runtimeVerifier)
      && /Cowork folder instructions editor saves through bridge/.test(source.runtimeVerifier)
      && /Cowork Context groups connectors, skills and memory like official/.test(source.runtimeVerifier)
      && /Cowork Context shows Claude in Chrome browser extension resource/.test(source.runtimeVerifier)
      && /Cowork BrowserPickerButton lists connected browsers/.test(source.runtimeVerifier)
      && /Cowork BrowserPickerButton selects a connected browser/.test(source.runtimeVerifier)
      && /Cowork BrowserPickerButton broadcasts connection request/.test(source.runtimeVerifier)
      && /Cowork BrowserExtension detail panel opens/.test(source.runtimeVerifier)
      && /Cowork BrowserExtension detail shows connected browsers summary/.test(source.runtimeVerifier)
      && /Cowork BrowserExtension detail closes back to Context/.test(source.runtimeVerifier)
      && /Cowork Context memory resource opens file pane/.test(source.runtimeVerifier)
      && /Cowork Context shows official scheduled task link/.test(source.runtimeVerifier)
      && /Cowork scheduled task link uses official \/scheduled-task route/.test(source.runtimeVerifier)
      && /Cowork scheduled task link opens official route/.test(source.runtimeVerifier)
      && /Cowork Context shows official mounted projects list/.test(source.runtimeVerifier)
      && /Cowork mounted project row is clickable/.test(source.runtimeVerifier)
      && /Cowork multi-folder groups default to first folder expanded/.test(source.runtimeVerifier)
      && /Cowork multi-folder group header is expandable/.test(source.runtimeVerifier)
      && /Cowork Scratchpad collapse hides working scratch resource/.test(source.runtimeVerifier)
      && /completed Cowork todos auto-collapse with official count/.test(source.runtimeVerifier)
      && /Shift\+Enter keeps newline/.test(source.runtimeVerifier)
      && /file pane opens and reads session file/.test(source.runtimeVerifier)
      && /permission request card appears from bridge event/.test(source.runtimeVerifier)
      && /Cowork directory permission card uses official copy/.test(source.runtimeVerifier)
      && /stream delta is rendered through smoother/.test(source.runtimeVerifier),
  },
  {
    group: "运行时验证",
    name: "fake bridge exposes event hooks for permission and stream runtime probes",
    test: () => /export function emitFakeLocalSessionEvent/.test(source.fakeBridge)
      && /export function emitFakeToolPermissionRequest/.test(source.fakeBridge)
      && /onEvent: \(listener\)/.test(source.fakeBridge)
      && /onToolPermissionRequest: \(listener\)/.test(source.fakeBridge),
  },
];

const warnings = [
  {
    group: "底部输入框",
    name: "composer is not backed by TipTap EditorContent",
    test: () => /<textarea/.test(source.existingComposer)
      || !/<EditorContent/.test(source.existingComposer)
      || !/useEditor\(/.test(source.existingComposer),
  },
  {
    group: "权限审批",
    name: "current CLI runner cannot truly complete permission response protocol yet",
    test: () => /permission_response_protocol_unimplemented/.test(source.desktopRunner)
      || !/"--permission-prompt-tool",\s*"stdio"/.test(source.desktopRunner),
  },
  {
    group: "依赖基线",
    name: "web React/react-intl versions still differ from official app baseline",
    test: () => {
      const pkg = JSON.parse(read(path.join(root, "package.json")));
      return pkg.dependencies?.react !== "^18.3.1" || pkg.dependencies?.["react-intl"] !== "^6.7.2";
    },
  },
];

let failures = 0;
for (const check of checks) {
  const ok = Boolean(check.test());
  if (!ok) failures += 1;
  console.log(`${ok ? "PASS" : "FAIL"} [${check.group}] ${check.name}`);
}

for (const warning of warnings) {
  if (warning.test()) console.log(`WARN [${warning.group}] ${warning.name}`);
}

if (failures > 0) {
  console.error(`\n${failures} functional block verification check(s) failed.`);
  process.exit(1);
}

console.log("\nFunctional block verification checks passed with warnings above if any.");
