export type SessionKind =
  | "chat"
  | "cowork"
  | "code"
  | "project"
  | "cowork-artifact"
  | "cowork-space"
  | "scheduled-task"
  | "dispatch";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  text: string;
  createdAt: string;
  /** Official transcript entry. Tasks/Plan panes parse raw tool/system events from this. */
  raw?: unknown;
};

export type CoworkMessageEnvelope = {
  createdAt: string;
  id: string;
  raw?: unknown;
  role: "assistant" | "system" | "user";
  text: string;
};

export type CoworkMountedProject = {
  uuid: string;
  name: string;
  hostPath: string;
};

export type ConnectedOfficeFile = {
  id: string;
  document: string;
  path?: string;
  status?: string;
  appIconBase64?: string;
  active?: boolean;
};

export type ConnectedBrowser = {
  deviceId: string;
  name?: string;
  osPlatform?: string;
};

export type SessionSummary = {
  bufferedMessages?: ChatMessage[];
  chromePermissionMode?: string;
  cuSelectedDisplayId?: number;
  id: string;
  title: string;
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs: number;
  kind: "epitaxy" | "code";
  sessionKind: SessionKind;
  cwd?: string;
  effort?: string;
  folders?: string[];
  userSelectedFiles?: string[];
  userSelectedFolders?: string[];
  folderExists?: boolean;
  homePath?: string;
  hostLoopMode?: boolean;
  initialMessage?: string;
  initializationStatus?: unknown;
  mcqAnswers?: unknown;
  mountedProjects?: CoworkMountedProject[];
  model?: string;
  permissionMode?: string;
  repo?: {
    name?: string;
    branch?: string;
  };
  scheduledTaskId?: string;
  sessionType?: string;
  spaceId?: string;
  connectionState?: string;
  nextReconnectTime?: number;
  origin?: string;
  showRetryButton?: boolean;
  statusMessage?: string;
  postTurnSummary?: {
    description?: string;
    isNoteworthy?: boolean;
    needsAction?: string;
    recentAction?: string;
    statusCategory?: string;
    statusDetail?: string;
    title?: string;
  };
  promptSuggestion?: string;
  isPinned?: boolean;
  isArchived?: boolean;
  isAgentCompleted?: boolean;
  hasCompleted?: boolean;
  error?: string;
  isRunning?: boolean;
  isUnread?: boolean;
  hasWorktree?: boolean;
  messages?: ChatMessage[];
  pendingToolPermissions?: Array<{
    alwaysAllowScope?: string;
    decisionReason?: string;
    description?: string;
    hasAlwaysAllow?: boolean;
    input?: unknown;
    requestId: string;
    sessionId: string;
    suggestions?: unknown;
    toolName: string;
    toolUseId?: string;
  }>;
};

export type CoworkSpaceSummary = {
  id: string;
  name: string;
  description?: string | null;
  createdAtMs?: number;
  updatedAtMs: number;
  isStarred?: boolean;
  sessionIds?: string[];
};

export type CreateCoworkSpaceInput = {
  name: string;
  instructions?: string;
};

export type ScheduledTaskSummary = {
  id: string;
  title: string;
  schedule: string;
  enabled: boolean;
  description?: string;
  prompt?: string;
  cronExpression?: string;
  cwd?: string;
  nextRunAt?: string;
  fireAt?: string;
  lastRunAt?: string;
  useWorktree?: boolean;
  sourceBranch?: string;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "auto";
  model?: string;
  approvedPermissions?: Array<{ toolName: string }>;
  chromeAllowedDomains?: string[];
  chromePermissionMode?: string;
  userSelectedFolders?: string[];
  missedRuns?: Array<string | { time: string; reason?: string }>;
};

export type CreateScheduledTaskInput = {
  name: string;
  description: string;
  prompt: string;
  cronExpression?: string;
  cwd?: string;
  permissionMode?: ScheduledTaskSummary["permissionMode"];
  model?: string;
  useWorktree?: boolean;
  sourceBranch?: string;
  userSelectedFolders?: string[];
  /** Official uYt disableJitter → "Run at exact time" */
  disableJitter?: boolean;
  chromePermissionMode?: string;
  spaceId?: string;
};


export type DesktopPreferences = {
  autoCreatePullRequests?: boolean;
  autoUpdateExtensions?: boolean;
  bypassPermissionsModeEnabled?: boolean;
  ccAutoArchiveOnPrClose?: boolean;
  ccBranchPrefix?: string;
  chillingSlothLocation?: "default" | { customPath: string };
  coworkSpaceContextEnabled?: boolean;
  dockBounceEnabled?: boolean;
  enabledCoworkMemory?: boolean;
  keepAwakeEnabled?: boolean;
  launchEnabled?: boolean;
  launchPreviewPersistSession?: boolean;
  menuBarEnabled?: boolean;
  quickEntryShortcut?: string | { accelerator?: string };
  useBuiltInNodeForMcp?: boolean;
};

export type PreferenceKey = keyof DesktopPreferences;

export type WorkspaceContext = {
  mode: "local" | "remote";
  projectName: string;
  branchName: string;
  branchPickerDisabled?: boolean;
  branches?: string[];
  defaultBranch?: string;
  hasWorktree: boolean;
  cwd?: string;
  folders?: string[];
  sourceBranch?: string;
  worktree?: boolean;
  worktreeSupported?: boolean;
};

export type WorkspaceTrustResult = {
  remote?: boolean;
  sources: string[];
  trusted: boolean;
};

export type PermissionMode = "default" | "acceptEdits" | "auto" | "bypassPermissions" | "plan" | "bypass";

export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

export type StartSessionInput = {
  kind: SessionSummary["kind"];
  effort?: EffortLevel;
  message?: string;
  messageUuid?: string;
  model?: string;
  permissionMode?: PermissionMode;
  prompt: string;
  scheduledTaskId?: string;
  sessionId?: string;
  skipRedirect?: boolean;
  sourceBranch?: string;
  title?: string;
  origin?: string;
  userSelectedFiles?: string[];
  userSelectedFolders?: string[];
  mountedProjects?: CoworkMountedProject[];
  useWorktree?: boolean;
  worktreeName?: string;
  workspace: WorkspaceContext;
};

export type CoworkImagePayload = {
  base64: string;
  filename?: string;
  mimeType: string;
};

export type CoworkToolStateContent = {
  data?: string;
  media_type?: string;
  text?: string;
  type: string;
};

export type CoworkToolState = {
  content: CoworkToolStateContent[];
  tool_name: string;
};

export type SendMessageInput = {
  images?: CoworkImagePayload[];
  messageUuid?: string;
  permissionMode?: string;
  toolStates?: CoworkToolState[];
  userSelectedFiles?: string[];
};

export type CodeStats = {
  dailyActivity: Array<{ date: string; messageCount: number; sessionCount: number; toolCallCount: number }>;
  dailyModelTokens: Array<{ date: string; tokensByModel: Record<string, number> }>;
  modelUsage: Record<string, { cacheCreationInputTokens: number; cacheReadInputTokens: number; inputTokens: number; outputTokens: number }>;
  peakActivityHour: number | null;
  streaks: { currentStreak: number; longestStreak: number };
};

export type ContextUsage = {
  agents?: Array<{ agentType: string; tokens: number }>;
  cacheCreationInputTokens: number;
  cacheReadInputTokens: number;
  categories?: Array<{ name: string; tokens: number }>;
  inputTokens: number;
  mcpTools?: Array<{ name: string; serverName: string; tokens: number }>;
  memoryFiles?: Array<{ path: string; tokens: number }>;
  messages?: number;
  outputTokens: number;
  percentage?: number;
  rawMaxTokens?: number | null;
  toolCallCount?: number;
  totalTokens: number;
};


export type GitCommandResult = {
  ok?: boolean;
  success?: boolean;
  stdout?: string;
  stderr?: string;
  error?: string;
  code?: unknown;
};

/**
 * Official LocalSessions.getDiffFileContent result (electron-shell H7i / aOt):
 * `{ oldText, newText }` where either side may be null, or null when both unavailable.
 */
export type DiffFileContentResult = {
  oldText: string | null;
  newText: string | null;
} | null;

/** Official H$A / a2A LocalSessions.getGitDiff comparison (not GitCommandResult). */
export type OfficialGitDiffFile = {
  filename: string;
  status: string;
  additions: number;
  deletions: number;
  changes: number;
  patch?: string;
  previous_filename?: string;
};

export type OfficialGitDiffComparison = {
  base_ref: string;
  head_ref: string;
  merge_base: string;
  files: OfficialGitDiffFile[];
  ahead_by: number;
  behind_by: number;
  total_commits: number;
};


/** Local `gh pr create` / generate content (c11959232 EpitaxyBranchRow create path). */
export type LocalPrContent = {
  body?: string;
  branch?: string;
  commits?: string;
  stat?: string;
  status?: string;
  title?: string;
};

export type LocalPrState = {
  draft?: boolean;
  merged?: boolean;
  number?: number;
  state?: string;
  title?: string;
  url?: string;
};

export type CreateLocalPrOptions = {
  body?: string;
  draft?: boolean;
  title?: string;
};

export type SlashCommand = {
  aliases?: string[];
  argumentHint?: string;
  description?: string;
  name: string;
  scope?: string;
};

export type GetSupportedCommandsRequest = {
  cwd?: string;
  sessionId?: string;
};

export type ShellPtyStartResult = {
  ok: boolean;
  error?: string;
  buffered?: string;
};

export type ShellPtyEvent =
  | { type: "shell_pty_data"; sessionId: string; data: string }
  | { type: "shell_pty_close"; sessionId: string; code?: unknown; signal?: unknown };

export type LocalSessionEnvironmentBridge = {
  get: () => Promise<Record<string, string>>;
  save: (env: Record<string, string>) => Promise<boolean>;
};

export type LocalEnvironmentVariables = Record<string, string>;

export type LocalSessionsBridge = {
  list: () => Promise<SessionSummary[]>;
  getSession: (id: string) => Promise<SessionSummary | null>;
  getTranscript?: (id: string) => Promise<ChatMessage[]>;
  getSessionsForScheduledTask?: (taskId: string) => Promise<SessionSummary[]>;
  addFolderToSession?: (id: string, folder: string) => Promise<SessionSummary | null>;
  getCodeStats?: () => Promise<CodeStats | null>;
  getContextUsage?: (id: string) => Promise<ContextUsage | null>;
  getDefaultEffort?: () => Promise<EffortLevel | null>;
  getDefaultPermissionMode?: (cwd?: string) => Promise<string | null>;
  getDetectedProjects?: () => Promise<SessionSummary[]>;
  getDiffFileContent?: (idOrCwd: string, mergeBase: string, filePath: string, previousFilePath?: string) => Promise<DiffFileContentResult>;
  getEffort?: (id: string) => Promise<EffortLevel | string>;
  getGitInfo?: (idOrCwd: string) => Promise<unknown>;
  getGitDiff?: (idOrCwd: string, base?: string) => Promise<OfficialGitDiffComparison | null>;
  getGitDiffStats?: (idOrCwd: string, base?: string) => Promise<GitCommandResult>;
  /** Official nN: git merge-base HEAD <baseBranch> for file original content. */
  getMergeBase?: (idOrCwd: string, base?: string) => Promise<GitCommandResult>;
  getLocalBranches?: (idOrCwd: string) => Promise<GitCommandResult | string[]>;
  getPrStateForBranch?: (idOrCwd: string, branch?: string) => Promise<LocalPrState | null>;
  getPrChecks?: (idOrCwd: string, prNumberOrBranch?: string | number) => Promise<unknown>;
  getPrDetails?: (idOrCwd: string, prNumberOrBranch?: string | number) => Promise<unknown>;
  generateLocalPrContent?: (idOrCwd: string) => Promise<LocalPrContent | null>;
  createLocalPr?: (idOrCwd: string, options?: CreateLocalPrOptions) => Promise<GitCommandResult>;
  summarizeSession?: (id: string) => Promise<{ summary?: string; title?: string | null; session?: SessionSummary | null } | string | null>;
  openInEditor?: (target: string, editor?: unknown, line?: number, column?: number) => Promise<unknown>;
  getPermissionMode?: (id: string) => Promise<string>;
  getSupportedCommands?: (request?: GetSupportedCommandsRequest) => Promise<SlashCommand[]>;
  getWorkingTreeStatus?: (idOrCwd: string) => Promise<GitCommandResult>;
  clearSession?: (id: string) => Promise<unknown>;
  launchUltrareview?: (idOrCwd: string, options?: unknown) => Promise<unknown>;
  readFileAtCwd?: (idOrCwd: string, filePath: string) => Promise<GitCommandResult>;
  readSessionFile?: (id: string, filePath: string) => Promise<string | null | Record<string, unknown>>;
  readSessionImageAsDataUrl?: (id: string, filePath: string) => Promise<string | null>;
  pickSessionFile?: (id: string) => Promise<string | null>;
  pickFileAtCwd?: (idOrCwd: string) => Promise<string | null>;
  setEffort?: (id: string, effort: EffortLevel | string) => Promise<SessionSummary | null>;
  setMcpServers?: (id: string, mcpServers: unknown) => Promise<SessionSummary | null>;
  setModel?: (id: string, model: string) => Promise<SessionSummary | null>;
  setPermissionMode?: (id: string, mode: string) => Promise<SessionSummary | null>;
  updateSession?: (id: string, patch: Partial<Pick<SessionSummary, "title" | "isAgentCompleted" | "isPinned" | "spaceId">>) => Promise<SessionSummary | null>;
  submitFeedback?: (input?: unknown) => Promise<unknown>;
  checkRemoteTrust?: (sshConfig: unknown, folder: string) => Promise<WorkspaceTrustResult>;
  checkTrust?: (folder: string) => Promise<WorkspaceTrustResult>;
  isFolderTrusted?: (folder: string) => Promise<WorkspaceTrustResult>;
  respondToToolPermission?: (requestId: string, decision: "always" | "deny" | "once", updatedInput?: unknown) => Promise<unknown>;
  saveTrust?: (folder: string) => Promise<unknown>;
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  startShellPty?: (sessionId: string, cols?: number, rows?: number) => Promise<ShellPtyStartResult>;
  stop?: (id: string) => Promise<unknown>;
  stopShellPty?: (sessionId: string) => Promise<unknown>;
  stopTask?: (sessionId: string, taskId: string) => Promise<unknown>;
  writeShellPty?: (sessionId: string, data: string) => Promise<unknown>;
  resizeShellPty?: (sessionId: string, cols: number, rows: number) => Promise<unknown>;
  getShellPtyBuffer?: (sessionId: string) => Promise<string>;
  getTranscriptFeedback?: (id: string) => Promise<unknown[]>;
  onShellPtyEvent?: (listener: (event: ShellPtyEvent) => void) => () => void;
  start: (input: StartSessionInput) => Promise<SessionSummary>;
  sendMessage?: (id: string, text: string, input?: SendMessageInput) => Promise<SessionSummary | null>;
  forkSession?: (id: string, messageId?: string) => Promise<SessionSummary | null>;
  rewind?: (id: string, messageId?: string) => Promise<unknown>;
  create: (kind: SessionSummary["kind"]) => Promise<SessionSummary>;
  archive: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setFocusedSession?: (id: string | null) => Promise<void>;
  submitTranscriptFeedback?: (sessionIdOrInput: unknown, input?: unknown) => Promise<unknown>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
  onToolPermissionRequest?: (listener: (event: unknown) => void) => () => void;
};

export type CoworkSessionSnapshot = Omit<SessionSummary, "bufferedMessages" | "messages"> & {
  bufferedMessages?: CoworkMessageEnvelope[];
  messages?: CoworkMessageEnvelope[];
  /** Unmodified LocalAgentModeSessions.getSession payload. */
  rawSession?: unknown;
  /** Unmodified message arrays carried on the raw session payload. */
  rawBufferedMessages?: unknown[];
  rawMessages?: unknown[];
};

export type CoworkAddFolderResult =
  | { folderPath: string; ok: true }
  | { error: string; ok: false };

export type CoworkSessionsBridge = {
  list: () => Promise<SessionSummary[]>;
  getSession: (id: string) => Promise<CoworkSessionSnapshot | null>;
  getTranscript?: (id: string) => Promise<CoworkMessageEnvelope[]>;
  getSessionsForScheduledTask?: (taskId: string) => Promise<SessionSummary[]>;
  addFolderToSession?: (id: string, folder: string) => Promise<CoworkAddFolderResult>;
  getCodeStats?: () => Promise<CodeStats | null>;
  getContextUsage?: (id: string) => Promise<ContextUsage | null>;
  getDefaultEffort?: () => Promise<EffortLevel | null>;
  getDefaultPermissionMode?: (cwd?: string) => Promise<string | null>;
  getDetectedProjects?: () => Promise<SessionSummary[]>;
  getDiffFileContent?: (idOrCwd: string, mergeBase: string, filePath: string, previousFilePath?: string) => Promise<DiffFileContentResult>;
  getEffort?: (id: string) => Promise<EffortLevel | string>;
  getGitInfo?: (idOrCwd: string) => Promise<unknown>;
  getGitDiff?: (idOrCwd: string, base?: string) => Promise<OfficialGitDiffComparison | null>;
  getGitDiffStats?: (idOrCwd: string, base?: string) => Promise<GitCommandResult>;
  getMergeBase?: (idOrCwd: string, base?: string) => Promise<GitCommandResult>;
  getLocalBranches?: (idOrCwd: string) => Promise<GitCommandResult | string[]>;
  openInEditor?: (target: string, editor?: unknown, line?: number, column?: number) => Promise<unknown>;
  getPermissionMode?: (id: string) => Promise<string>;
  getSupportedCommands?: (request?: GetSupportedCommandsRequest) => Promise<SlashCommand[]>;
  getWorkingTreeStatus?: (idOrCwd: string) => Promise<GitCommandResult>;
  clearSession?: (id: string) => Promise<unknown>;
  launchUltrareview?: (idOrCwd: string, options?: unknown) => Promise<unknown>;
  readFileAtCwd?: (idOrCwd: string, filePath: string) => Promise<GitCommandResult>;
  readSessionFile?: (id: string, filePath: string) => Promise<string | null | Record<string, unknown>>;
  readSessionImageAsDataUrl?: (id: string, filePath: string) => Promise<string | null>;
  pickSessionFile?: (id: string) => Promise<string | null>;
  pickFileAtCwd?: (idOrCwd: string) => Promise<string | null>;
  setEffort?: (id: string, effort: EffortLevel | string) => Promise<SessionSummary | null>;
  setMcpServers?: (id: string, mcpServers: unknown) => Promise<SessionSummary | null>;
  setModel?: (id: string, model: string) => Promise<SessionSummary | null>;
  setPermissionMode?: (id: string, mode: string) => Promise<SessionSummary | null>;
  updateSession?: (id: string, patch: Partial<Pick<SessionSummary, "title" | "isAgentCompleted" | "isPinned" | "spaceId">>) => Promise<SessionSummary | null>;
  submitFeedback?: (input?: unknown) => Promise<unknown>;
  checkRemoteTrust?: (sshConfig: unknown, folder: string) => Promise<WorkspaceTrustResult>;
  checkTrust?: (folder: string) => Promise<WorkspaceTrustResult>;
  isFolderTrusted?: (folder: string) => Promise<boolean>;
  respondToToolPermission?: (requestId: string, decision: "always" | "deny" | "once", updatedInput?: unknown) => Promise<unknown>;
  saveTrust?: (folder: string) => Promise<unknown>;
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  startShellPty?: (sessionId: string, cols?: number, rows?: number) => Promise<ShellPtyStartResult>;
  stop?: (id: string) => Promise<unknown>;
  stopShellPty?: (sessionId: string) => Promise<unknown>;
  stopTask?: (sessionId: string, taskId: string) => Promise<unknown>;
  writeShellPty?: (sessionId: string, data: string) => Promise<unknown>;
  resizeShellPty?: (sessionId: string, cols: number, rows: number) => Promise<unknown>;
  getShellPtyBuffer?: (sessionId: string) => Promise<string>;
  getTranscriptFeedback?: (id: string) => Promise<unknown[]>;
  onShellPtyEvent?: (listener: (event: ShellPtyEvent) => void) => () => void;
  start: (input: StartSessionInput) => Promise<SessionSummary>;
  sendMessage?: (id: string, text: string, input?: SendMessageInput) => Promise<SessionSummary | null>;
  forkSession?: (id: string, messageId?: string) => Promise<SessionSummary | null>;
  rewind?: (id: string, messageId?: string) => Promise<string | null>;
  create: (kind: SessionSummary["kind"]) => Promise<SessionSummary>;
  archive: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setFocusedSession?: (id: string | null) => Promise<void>;
  submitTranscriptFeedback?: (sessionIdOrInput: unknown, input?: unknown) => Promise<unknown>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
  getRawSession: (id: string) => Promise<CoworkSessionSnapshot | null>;
  getRawTranscript: (id: string) => Promise<unknown[]>;
};

export type ScheduledTasksBridge = {
  list: () => Promise<ScheduledTaskSummary[]>;
  get: (id: string) => Promise<ScheduledTaskSummary | null>;
  create?: (input: CreateScheduledTaskInput) => Promise<ScheduledTaskSummary | null>;
  updateStatus?: (id: string, status: "enabled" | "disabled" | "deleted") => Promise<void>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
};

export type CoworkSpacesBridge = {
  list: () => Promise<CoworkSpaceSummary[]>;
  /** Official gT.createSpace */
  create?: (input: CreateCoworkSpaceInput) => Promise<CoworkSpaceSummary | null>;
  /** Official gT.createSpaceFolder(location, name) → folder path */
  createSpaceFolder?: (location: string, name: string) => Promise<string | null>;
  /** Official gT.addFolderToSpace(spaceId, folderPath) */
  addFolderToSpace?: (spaceId: string, folderPath: string) => Promise<void>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
};

export type PreferencesBridge = {
  getWorkspaceContext: () => Promise<WorkspaceContext>;
  getPreferences?: () => Promise<DesktopPreferences>;
  setPreference?: <K extends PreferenceKey>(key: K, value: DesktopPreferences[K]) => Promise<void>;
  onPreferencesChanged?: (listener: (preferences: DesktopPreferences) => void) => () => void;
  getDirectoryPath?: (multiple?: boolean) => Promise<string[] | null>;
  isStartupOnLoginEnabled?: () => Promise<boolean>;
  setStartupOnLoginEnabled?: (enabled: boolean) => Promise<boolean>;
  isMenuBarEnabled?: () => Promise<boolean>;
  setMenuBarEnabled?: (enabled: boolean) => Promise<boolean>;
  getGlobalShortcut?: () => Promise<string | null>;
  setGlobalShortcut?: (accelerator: string | null) => Promise<boolean>;
};

export type LocalFileEntry = {
  isDirectory?: boolean;
  isFile?: boolean;
  modifiedAt?: string;
  name: string;
  path: string;
  size?: number;
};

export type LocalFileReadResult = {
  content?: string;
  /** Official Gzt base64 branch: encoding === "base64". */
  encoding?: "base64" | "utf8";
  mimeType?: string;
  name?: string;
  path?: string;
  size?: number;
  tooLarge?: boolean;
} | string | null;

export type CoworkFilePreviewBounds = { x: number; y: number; width: number; height: number };

export type CoworkFilePreviewShowResult = boolean | { ok: boolean; painted?: boolean; declineReason?: unknown };

export type CoworkFilePreviewBridge = {
  isEnabled: () => Promise<boolean>;
  isVmReady: () => Promise<boolean>;
  show: (sessionId: string, encodedPath: string, bounds: CoworkFilePreviewBounds) => Promise<CoworkFilePreviewShowResult>;
  hide: () => Promise<void | boolean>;
  parkAndCapture: (bounds: CoworkFilePreviewBounds) => Promise<string | null>;
};

export type FileSystemBridge = {
  browseFiles?: (options?: { defaultPath?: string; multiSelections?: boolean; title?: string }) => Promise<string[]>;
  listFilesInFolder?: (sessionId: string, folderPath: string) => Promise<LocalFileEntry[]>;
  openLocalFile?: (filePathOrSessionId: string, encodedFilePath?: string, reveal?: boolean) => Promise<unknown>;
  readLocalFile?: (filePathOrSessionId: string, encodedFilePath?: string, options?: { encoding?: "base64" | "utf8" }) => Promise<LocalFileReadResult>;
  showInFolder?: (filePathOrSessionId: string, encodedFilePath?: string) => Promise<boolean>;
  writeLocalFile?: (filePathOrSessionId: string, encodedFilePathOrData: string, dataOrOptions?: string | Uint8Array | { encoding?: string }, options?: { encoding?: string }) => Promise<unknown>;
};

export type ConnectedOfficeFilesBridge = {
  getConnectedFiles?: () => Promise<ConnectedOfficeFile[]>;
  isFeatureEnabled?: () => Promise<boolean>;
  selectFile?: (fileIdOrPath: string) => Promise<ConnectedOfficeFile | null>;
  focusFile?: (fileIdOrPath: string) => Promise<boolean>;
  onConnectedFilesChange?: (listener: (files: ConnectedOfficeFile[]) => void) => () => void;
};

export type BrowserUseBridge = {
  listConnectedBrowsers?: () => Promise<ConnectedBrowser[]>;
  selectBrowser?: (deviceId: string) => Promise<boolean>;
  switchBrowser?: () => Promise<boolean>;
  getSelectedBrowserId?: () => Promise<string | null>;
};

export type WindowBridge = {
  close: () => Promise<void>;
  getFullscreen: () => Promise<boolean>;
  getZoomFactor: () => Promise<number>;
  /** Official qWt / WindowState.fullscreenChanged subscription. */
  onFullscreenChanged?: (listener: (isFullscreen: boolean) => void) => () => void;
  /** Official qWt / WindowState.zoomFactorChanged subscription. */
  onZoomFactorChanged?: (listener: (zoomFactor: number) => void) => () => void;
};

export type DesktopBridge = {
  LocalSessions: LocalSessionsBridge;
  LocalAgentModeSessions: CoworkSessionsBridge;
  LocalSessionEnvironment: LocalSessionEnvironmentBridge;
  BrowserUse: BrowserUseBridge;
  CCDScheduledTasks: ScheduledTasksBridge;
  CoworkScheduledTasks: ScheduledTasksBridge;
  CoworkSpaces: CoworkSpacesBridge;
  CoworkFilePreview: CoworkFilePreviewBridge;
  FileSystem: FileSystemBridge;
  OfficeAddinFiles: ConnectedOfficeFilesBridge;
  Preferences: PreferencesBridge;
  Window: WindowBridge;
};
