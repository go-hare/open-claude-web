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

/** Official local_agent_mode session.fsDetectedFiles entry (D1e Me / activity merge). */
export type CoworkDetectedFile = {
  fileName: string;
  hostPath: string;
  timestamp: number;
};

export type SessionSummary = {
  bufferedMessages?: ChatMessage[];
  chromePermissionMode?: string;
  cuSelectedDisplayId?: number;
  id: string;
  title: string;
  /**
   * Official residual: "auto" after dust generate_session_title;
   * "user" after manual rename. Host may omit until set.
   */
  titleSource?: "auto" | "user" | "prompt";
  createdAtMs?: number;
  updatedAt: string;
  updatedAtMs: number;
  kind: "epitaxy" | "code";
  sessionKind: SessionKind;
  cwd?: string;
  effort?: string;
  folders?: string[];
  /** Official getSession → activity Me hydrate (array of hostPath entries). */
  fsDetectedFiles?: CoworkDetectedFile[];
  userSelectedFiles?: string[];
  userSelectedFolders?: string[];
  folderExists?: boolean;
  homePath?: string;
  hostLoopMode?: boolean;
  initialMessage?: string;
  initializationStatus?: unknown;
  /** Official O.tags — e.g. ultrareview session marker. */
  tags?: string[];
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
  /**
   * Official session.prs residual (AutoArchive / getPrStateForBranch cache).
   * Sidebar CodeStatusGlyph yje consumes this before lazy branch PR lookup.
   */
  prs?: Array<{
    draft?: boolean;
    merged?: boolean;
    number?: number;
    repo?: string;
    state?: string;
    title?: string;
    url?: string;
  }>;
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

export type CoworkSpaceFolder = {
  path: string;
};

/** Residual space.links entry (ce283 Ba / addLinkToSpace). */
export type CoworkSpaceLink = {
  url: string;
  title?: string | null;
  provider?: string | null;
};

/** Residual space.projects entry (ce283 Ha / chat project uuid). */
export type CoworkSpaceProjectRef = {
  uuid: string;
  name?: string;
};

export type CoworkSpaceSummary = {
  id: string;
  name: string;
  description?: string | null;
  /** Residual space.instructions (onboarding create input). */
  instructions?: string | null;
  createdAtMs?: number;
  updatedAtMs: number;
  isStarred?: boolean;
  sessionIds?: string[];
  /** Residual space.folders[{path}]. */
  folders?: CoworkSpaceFolder[];
  /** Residual space.links. */
  links?: CoworkSpaceLink[];
  /** Residual space.projects (chat projects). */
  projects?: CoworkSpaceProjectRef[];
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
  /** Official uYt disableJitter — exact-time runs (jitterSeconds=0). */
  disableJitter?: boolean;
  /**
   * Official list enrichment getJitterSecondsForTask (seconds).
   * HNe schedule copy prefixes `~` when Math.round(jitterSeconds/60) > 0.
   */
  jitterSeconds?: number;
  useWorktree?: boolean;
  sourceBranch?: string;
  permissionMode?: "default" | "acceptEdits" | "bypassPermissions" | "plan" | "auto";
  model?: string;
  approvedPermissions?: Array<{ toolName: string }>;
  chromeAllowedDomains?: string[];
  chromePermissionMode?: string;
  userSelectedFolders?: string[];
  /** Residual Qa: linked cowork space id (absent / empty = unlinked). */
  spaceId?: string;
  missedRuns?: Array<string | { time: string; reason?: string }>;
};

export type UpdateScheduledTaskInput = {
  description?: string;
  prompt?: string;
  cronExpression?: string | null;
  /** Residual one-shot fireAt (ISO); null clears. Official create once is manual (no fireAt invent). */
  fireAt?: string | null;
  cwd?: string;
  model?: string;
  permissionMode?: ScheduledTaskSummary["permissionMode"];
  userSelectedFolders?: string[];
  /** Residual Qa link/unlink — pass "" to unlink. */
  spaceId?: string;
  enabled?: boolean;
  title?: string;
  name?: string;
  disableJitter?: boolean;
};

export type CreateScheduledTaskInput = {
  name: string;
  description: string;
  prompt: string;
  cronExpression?: string;
  /** Residual fireAt when host/edit/remote supplies one-shot time — not invented for frequency once. */
  fireAt?: string;
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
  allowAllBrowserActions?: boolean;
  autoCreatePullRequests?: boolean;
  autoUpdateExtensions?: boolean;
  bypassPermissionsModeEnabled?: boolean;
  ccAutoArchiveOnPrClose?: boolean;
  ccBranchPrefix?: string;
  /**
   * Official gi("chicagoEnabled") — Computer use feature switch.
   * Default false (HSA residual). Uge Enable → setPreference true.
   */
  chicagoEnabled?: boolean;
  chillingSlothLocation?: "default" | { customPath: string };
  coworkSpaceContextEnabled?: boolean;
  dockBounceEnabled?: boolean;
  enabledCoworkMemory?: boolean;
  keepAwakeEnabled?: boolean;
  launchEnabled?: boolean;
  launchPreviewPersistSession?: boolean;
  menuBarEnabled?: boolean;
  /** Official quickEntryDictationShortcut: "capslock" | "off" | { accelerator } */
  quickEntryDictationShortcut?: string | { accelerator?: string };
  /** Official quickEntryShortcut: "double-tap-option" | "off" | { accelerator } */
  quickEntryShortcut?: string | { accelerator?: string };
  useBuiltInNodeForMcp?: boolean;
};

export type PreferenceKey = keyof DesktopPreferences;

/**
 * Official residual shapes:
 * - mode "local" | "ssh" (env pill tC) — product also keeps "remote" for cloud/pool.
 * - sshConfig: official Hd { sshHost, sshPort?, sshIdentityFile?, remoteCwd? }
 */
export type WorkspaceSshConfig = {
  host: string;
  hostName?: string;
  user?: string;
  port?: number | string;
  identityFile?: string;
  proxyJump?: string;
  remoteCwd?: string;
  sshHost?: string;
  sshPort?: number | string;
  sshIdentityFile?: string;
  name?: string;
  id?: string;
};

export type WorkspaceContext = {
  mode: "local" | "remote" | "ssh";
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
  /** Official session.sshConfig when mode is ssh. */
  sshConfig?: WorkspaceSshConfig;
};

export type WorkspaceTrustResult = {
  remote?: boolean;
  sources: string[];
  trusted: boolean;
};

export type PermissionMode = "default" | "acceptEdits" | "auto" | "bypassPermissions" | "plan" | "bypass";

export type EffortLevel = "low" | "medium" | "high" | "xhigh" | "max";

/**
 * Official get_settings.applied (CLI 2.7.16+): runtime effort + per-model catalog
 * ladder (effortLevels) + Ultracode gate. effortLevels/ultracodeOfferable null when
 * the CLI cannot report (composer falls back to the hardcoded 5-stop ladder).
 */
export type EffortApplied = {
  effort: EffortLevel | string;
  effortLevels?: string[] | null;
  ultracodeOfferable?: boolean | null;
};

export type StartSessionInput = {
  kind: SessionSummary["kind"];
  /**
   * Ladder id, or wire "ultracode" when Ultracode flag is on
   * (official setEffort / spawn residual; not an EffortLevel ladder stop).
   */
  effort?: EffortLevel | "ultracode" | string;
  /** Official LocalAgentModeSessions.start residual: first-turn image attachments. */
  images?: CoworkImagePayload[];
  message?: string;
  messageUuid?: string;
  model?: string;
  permissionMode?: PermissionMode;
  prompt: string;
  scheduledTaskId?: string;
  sessionId?: string;
  skipRedirect?: boolean;
  /** Official space_page Ys residual — attach session to cowork space. */
  spaceId?: string;
  sourceBranch?: string;
  title?: string;
  origin?: string;
  userSelectedFiles?: string[];
  userSelectedFolders?: string[];
  mountedProjects?: CoworkMountedProject[];
  useWorktree?: boolean;
  worktreeName?: string;
  workspace: WorkspaceContext;
  /** Official Hd session.sshConfig — host-pipe SSH Code sessions. */
  sshConfig?: WorkspaceSshConfig;
  cwd?: string;
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

/**
 * Official LocalSessions.writeSessionFile result (c119 vN / UI enum):
 * `ok` | `conflict` | `denied` (lowercase string status).
 */
export type WriteSessionFileResult = {
  status: "ok" | "conflict" | "denied";
  hash?: string;
  currentHash?: string;
  absPath?: string;
};

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
  /** Official createLocalPr params.baseBranch → gh pr create --base. */
  baseBranch?: string;
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
  /** Official Os residual + bypassPermissionsModeEnabled gate. */
  getAvailablePermissionModes?: () => Promise<string[]>;
  getDetectedProjects?: () => Promise<SessionSummary[]>;
  getDiffFileContent?: (idOrCwd: string, mergeBase: string, filePath: string, previousFilePath?: string) => Promise<DiffFileContentResult>;
  getEffort?: (id: string) => Promise<EffortApplied | string>;
  /** Official get_settings applied probe for the new-session draft (per-model catalog ladder). */
  getEffortCatalogDefaults?: (model?: string) => Promise<EffortApplied | null>;
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
  /**
   * Official GitHubPrManager.ensureBranchPushed residual:
   * dirty auto-commit → push --set-upstream when ahead / no upstream.
   * Returns { success, branch?, error?, errorType? }.
   */
  ensureBranchPushed?: (idOrCwd: string) => Promise<{
    success: boolean;
    branch?: string;
    error?: string;
    errorType?: string;
  }>;
  /** Official commitAllChanges residual. */
  commitAllChanges?: (idOrCwd: string, message?: string) => Promise<{ success: boolean; error?: string }>;
  isWorkingTreeDirty?: (idOrCwd: string) => Promise<boolean>;
  /**
   * Official checkGhAvailable(cwd): gh auth status → boolean.
   * False when gh missing or not authenticated (c11959232 Qy / install modal).
   */
  checkGhAvailable?: (idOrCwd?: string) => Promise<boolean>;
  /** Official installGh residual (darwin brew / open docs). */
  installGh?: () => Promise<boolean | { success: boolean; error?: string }>;
  /**
   * Residual LocalSessions.summarizeSession(sessionId) → boolean (Df.start).
   * Summary text arrives via onEvent session_summary_result / session_summary_error.
   * Do not treat as invent title dump.
   */
  summarizeSession?: (id: string) => Promise<boolean>;
  /**
   * Residual summarizeTranscript(sessionId, transcriptText) → boolean (non-local dump path).
   */
  summarizeTranscript?: (id: string, transcript: string) => Promise<boolean>;
  /** Residual stopSessionSummary(sessionId) → true if a forked summary query was aborted. */
  stopSessionSummary?: (id: string) => Promise<boolean>;
  /**
   * Product title SoT after turn settle (was invent piggyback on summarizeSession).
   * Returns updated session or null.
   */
  refreshSessionTitle?: (id: string) => Promise<SessionSummary | null>;
  /** Residual LocalSessions event bus (session_summary_*, session_updated, …). */
  onEvent?: (listener: (event: unknown) => void) => () => void;
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
  /**
   * Official fe.listSessionDirectory(sessionId, absOrRel) → tree entries for XC Files browser.
   * Desktop returns `{ name, path, isFile, isDirectory, size?, modifiedAt? }[]`.
   */
  listSessionDirectory?: (
    id: string,
    relative?: string,
  ) => Promise<Array<{
    isDirectory?: boolean;
    isFile?: boolean;
    modifiedAt?: string;
    name: string;
    path: string;
    size?: number;
  }>>;
  /**
   * Official fe.writeSessionFile(sessionId, absPath|rel, contents, expectedHash?)
   * → `{ status: "ok"|"conflict"|"denied", hash?, currentHash? }` (c119 vN).
   */
  writeSessionFile?: (
    id: string,
    filePath: string,
    contents: string,
    expectedHash?: string,
  ) => Promise<WriteSessionFileResult | null>;
  setEffort?: (id: string, effort: EffortLevel | string) => Promise<SessionSummary | null>;
  setMcpServers?: (id: string, mcpServers: unknown) => Promise<SessionSummary | null>;
  setModel?: (id: string, model: string) => Promise<SessionSummary | null>;
  setPermissionMode?: (id: string, mode: string) => Promise<SessionSummary | null>;
  updateSession?: (
    id: string,
    patch: Partial<Pick<SessionSummary, "title" | "titleSource" | "isAgentCompleted" | "isPinned" | "spaceId">>,
  ) => Promise<SessionSummary | null>;
  submitFeedback?: (input?: unknown) => Promise<unknown>;
  checkRemoteTrust?: (sshConfig: unknown, folder: string) => Promise<WorkspaceTrustResult>;
  checkTrust?: (folder: string) => Promise<WorkspaceTrustResult>;
  isFolderTrusted?: (folder: string) => Promise<WorkspaceTrustResult>;
  /** Official getSSHConfigs — ssh_configs.json + ~/.ssh/config hosts. */
  getSSHConfigs?: () => Promise<WorkspaceSshConfig[] | unknown[]>;
  setSSHConfigs?: (configs: unknown[]) => Promise<boolean>;
  /**
   * Official listSSHDirectory(sshConfig, remotePath) → { entries, error }.
   * Entries: { name, path, isDirectory }.
   */
  listSSHDirectory?: (
    sshConfig: unknown,
    remotePath?: string,
  ) => Promise<{
    entries?: Array<{ name: string; path: string; isDirectory?: boolean }>;
    error?: string | null;
  } | unknown>;
  testSSHConnection?: (hostOrConfig: unknown) => Promise<unknown>;
  ensureSSHConnected?: (hostOrConfig: unknown) => Promise<unknown>;
  respondToToolPermission?: (requestId: string, decision: "always" | "deny" | "once", updatedInput?: unknown) => Promise<unknown>;
  saveTrust?: (folder: string) => Promise<unknown>;
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  startShellPty?: (sessionId: string, cols?: number, rows?: number) => Promise<ShellPtyStartResult>;
  /**
   * Official Wr / LocalSessions.interrupt residual — abort the current turn
   * and drain deferredSends (continue). Distinct from `stop` (stopSession teardown).
   */
  interrupt?: (id: string) => Promise<unknown>;
  stop?: (id: string) => Promise<unknown>;
  stopShellPty?: (sessionId: string) => Promise<unknown>;
  stopTask?: (
    sessionId: string,
    taskId: string,
  ) => Promise<{ ok: boolean; status: "informed" | "no_turn" | "failed"; error?: string } | unknown>;
  writeShellPty?: (sessionId: string, data: string) => Promise<unknown>;
  resizeShellPty?: (sessionId: string, cols: number, rows: number) => Promise<unknown>;
  getShellPtyBuffer?: (sessionId: string) => Promise<string>;
  getTranscriptFeedback?: (id: string) => Promise<unknown[]>;
  onShellPtyEvent?: (listener: (event: ShellPtyEvent) => void) => () => void;
  start: (input: StartSessionInput) => Promise<SessionSummary>;
  sendMessage?: (id: string, text: string, input?: SendMessageInput) => Promise<SessionSummary | null>;
  /**
   * Official cancelQueued / Yr mutation — host must return true before UI dropQueuedMessage.
   * false = too-late (already on active stdin / no deferred queue entry).
   */
  cancelQueuedMessage?: (id: string, uuid: string) => Promise<boolean>;
  forkSession?: (id: string, messageId?: string) => Promise<SessionSummary | null>;
  rewind?: (id: string, messageId?: string) => Promise<unknown>;
  create: (kind: SessionSummary["kind"]) => Promise<SessionSummary>;
  archive: (id: string) => Promise<void>;
  /** Official LocalSessions.unarchive residual — restore archived row. */
  unarchive?: (id: string) => Promise<void>;
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
  getEffort?: (id: string) => Promise<EffortApplied | string>;
  /** Official get_settings applied probe for the new-session draft (per-model catalog ladder). */
  getEffortCatalogDefaults?: (model?: string) => Promise<EffortApplied | null>;
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
  /** Official fe.writeSessionFile — see LocalSessionsBridge.writeSessionFile. */
  writeSessionFile?: (
    id: string,
    filePath: string,
    contents: string,
    expectedHash?: string,
  ) => Promise<WriteSessionFileResult | null>;
  setEffort?: (id: string, effort: EffortLevel | string) => Promise<SessionSummary | null>;
  setMcpServers?: (id: string, mcpServers: unknown) => Promise<SessionSummary | null>;
  setModel?: (id: string, model: string) => Promise<SessionSummary | null>;
  setPermissionMode?: (id: string, mode: string) => Promise<SessionSummary | null>;
  updateSession?: (
    id: string,
    patch: Partial<Pick<SessionSummary, "title" | "titleSource" | "isAgentCompleted" | "isPinned" | "spaceId">>,
  ) => Promise<SessionSummary | null>;
  submitFeedback?: (input?: unknown) => Promise<unknown>;
  checkRemoteTrust?: (sshConfig: unknown, folder: string) => Promise<WorkspaceTrustResult>;
  checkTrust?: (folder: string) => Promise<WorkspaceTrustResult>;
  isFolderTrusted?: (folder: string) => Promise<boolean>;
  respondToToolPermission?: (requestId: string, decision: "always" | "deny" | "once", updatedInput?: unknown) => Promise<unknown>;
  /**
   * Official Yxi / D1e directory reverse-RPC respond:
   * respondDirectoryServers(requestId, servers[]).
   */
  respondDirectoryServers?: (requestId: string, servers: unknown[]) => Promise<unknown>;
  /**
   * Official Jxi / D1e skills reverse-RPC respond:
   * respondSlashMenuSkills(requestId, JSON.stringify(skills[])).
   */
  respondSlashMenuSkills?: (requestId: string, skillsJson: string) => Promise<unknown>;
  /**
   * Official jxi / D1e plugins_search reverse-RPC respond:
   * respondPluginSearch(requestId, JSON.stringify({ results })).
   */
  respondPluginSearch?: (requestId: string, resultsJson: string) => Promise<unknown>;
  saveTrust?: (folder: string) => Promise<unknown>;
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  startShellPty?: (sessionId: string, cols?: number, rows?: number) => Promise<ShellPtyStartResult>;
  stop?: (id: string) => Promise<unknown>;
  stopShellPty?: (sessionId: string) => Promise<unknown>;
  stopTask?: (
    sessionId: string,
    taskId: string,
  ) => Promise<{ ok: boolean; status: "informed" | "no_turn" | "failed"; error?: string } | unknown>;
  writeShellPty?: (sessionId: string, data: string) => Promise<unknown>;
  resizeShellPty?: (sessionId: string, cols: number, rows: number) => Promise<unknown>;
  getShellPtyBuffer?: (sessionId: string) => Promise<string>;
  getTranscriptFeedback?: (id: string) => Promise<unknown[]>;
  onShellPtyEvent?: (listener: (event: ShellPtyEvent) => void) => () => void;
  start: (input: StartSessionInput) => Promise<SessionSummary>;
  sendMessage?: (id: string, text: string, input?: SendMessageInput) => Promise<SessionSummary | null>;
  /** Residual LocalAgentModeSessions.cancelQueuedMessage / Yr. */
  cancelQueuedMessage?: (id: string, uuid: string) => Promise<boolean>;
  forkSession?: (id: string, messageId?: string) => Promise<SessionSummary | null>;
  rewind?: (id: string, messageId?: string) => Promise<string | null>;
  create: (kind: SessionSummary["kind"]) => Promise<SessionSummary>;
  archive: (id: string) => Promise<void>;
  unarchive?: (id: string) => Promise<void>;
  delete: (id: string) => Promise<void>;
  setFocusedSession?: (id: string | null) => Promise<void>;
  submitTranscriptFeedback?: (sessionIdOrInput: unknown, input?: unknown) => Promise<unknown>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
  getRawSession: (id: string) => Promise<CoworkSessionSnapshot | null>;
  getRawTranscript: (id: string) => Promise<unknown[]>;
  /**
   * Residual Direct MCP (custom3p URL remotes) — ion hT / LocalAgentModeSessions:
   * getDirectMcpServerStatuses + onOnDirectMcpServerStatusesChanged → mQe;
   * authorizeDirectMcpServer(name) → hQe; disconnectDirectMcpServer(name).
   * Not Anthropic account OAuth.
   */
  getDirectMcpServerStatuses?: () => Promise<DirectMcpServerStatus[]>;
  authorizeDirectMcpServer?: (name: string) => Promise<AuthorizeDirectMcpResult>;
  disconnectDirectMcpServer?: (name: string) => Promise<boolean>;
  onDirectMcpServerStatusesChanged?: (
    listener: (statuses: DirectMcpServerStatus[]) => void,
  ) => () => void;
};

/** Residual Direct MCP status bag entry (mQe / getDirectMcpServerStatuses). */
export type DirectMcpServerStatus = {
  name: string;
  url: string;
  isConnected: boolean;
  hasAuth: boolean;
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: unknown;
    title?: string;
    annotations?: { title?: string };
    _meta?: unknown;
  }>;
  toolPolicy?: Record<string, string>;
  error?: string;
};

/** Residual authorizeDirectMcpServer / hQe result. */
export type AuthorizeDirectMcpResult =
  | {
      ok: true;
      tools?: DirectMcpServerStatus["tools"];
    }
  | {
      ok: false;
      error?: string;
      cancelled?: boolean;
    };

export type ScheduledTasksBridge = {
  list: () => Promise<ScheduledTaskSummary[]>;
  get: (id: string) => Promise<ScheduledTaskSummary | null>;
  create?: (input: CreateScheduledTaskInput) => Promise<ScheduledTaskSummary | null>;
  /** Official residual updateScheduledTask(id, patch) — also used by space Qa link/unlink. */
  update?: (id: string, input: UpdateScheduledTaskInput) => Promise<ScheduledTaskSummary | null>;
  updateStatus?: (id: string, status: "enabled" | "disabled" | "deleted") => Promise<void>;
  /**
   * Official jT.getScheduledTaskFileContent(taskId) — pYt fire path body source.
   * Host seeds from prompt on create/update; empty string when missing.
   */
  getFileContent?: (id: string) => Promise<string>;
  /**
   * Official jT.updateScheduledTaskFileContent(taskId, content) — residual file body write.
   * Product create/update already seeds via prompt; optional for editor parity.
   */
  updateFileContent?: (id: string, content: string) => Promise<boolean>;
  /** Official jT.removeApprovedPermission(taskId, toolName) — Always allowed remove. */
  removeApprovedPermission?: (id: string, toolName: string) => Promise<boolean>;
  /** Official jT.clearChromePermissions(taskId) — Always allowed browser remove. */
  clearChromePermissions?: (id: string) => Promise<boolean>;
  onEvent?: (listener: (event: unknown) => void) => () => void;
};

export type UpdateCoworkSpaceInput = {
  description?: string | null;
  instructions?: string | null;
  name?: string;
};

/** Official residual folder entry from gT.listFolderContents (ce283 Va/Ya → Rs). */
export type SpaceFolderEntry = {
  isDirectory?: boolean;
  name: string;
  path: string;
};

export type CoworkSpacesBridge = {
  list: () => Promise<CoworkSpaceSummary[]>;
  /** Official gT.getSpace(spaceId) */
  get?: (spaceId: string) => Promise<CoworkSpaceSummary | null>;
  /** Official gT.createSpace */
  create?: (input: CreateCoworkSpaceInput) => Promise<CoworkSpaceSummary | null>;
  /** Official gT.updateSpace(spaceId, patch) — ce283 Ka instructions save. */
  update?: (spaceId: string, input: UpdateCoworkSpaceInput) => Promise<CoworkSpaceSummary | null>;
  /** Official gT.createSpaceFolder(location, name) → folder path */
  createSpaceFolder?: (location: string, name: string) => Promise<string | null>;
  /** Official gT.addFolderToSpace(spaceId, folderPath) */
  addFolderToSpace?: (spaceId: string, folderPath: string) => Promise<void>;
  /** Official gT.removeFolderFromSpace(spaceId, folderPath) */
  removeFolderFromSpace?: (spaceId: string, folderPath: string) => Promise<void>;
  /** Official gT.addLinkToSpace(spaceId, link) — ce283 Ga/Ba. */
  addLinkToSpace?: (spaceId: string, link: CoworkSpaceLink) => Promise<void>;
  /** Official gT.removeLinkFromSpace(spaceId, link|url). */
  removeLinkFromSpace?: (spaceId: string, link: CoworkSpaceLink | string) => Promise<void>;
  /** Official gT.copyFilesToSpaceFolder(spaceId, filePaths) */
  copyFilesToSpaceFolder?: (spaceId: string, filePaths: string[]) => Promise<string[]>;
  /**
   * Official gT.getAutoMemoryDir(spaceId) — ce283 Aa residual.
   * Returns space-scoped memory dir path when supported, else null.
   */
  getAutoMemoryDir?: (spaceId: string) => Promise<string | null>;
  /**
   * Official gT.listFolderContents(spaceId, folderPath) — ce283 Va/Ya residual.
   * Host may accept (path) only; product normalizes to SpaceFolderEntry[].
   */
  listFolderContents?: (spaceId: string, folderPath: string) => Promise<SpaceFolderEntry[]>;
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
  /** Official GlobalShortcut change event residual. */
  onGlobalShortcutChanged?: (listener: (accelerator: string | null) => void) => () => void;
  /** Official AppFeatures.getSupportedFeatures residual. */
  getSupportedFeatures?: () => Promise<Record<string, unknown>>;
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
  /** Official Gzt / local_session utf8 branch may use content; epitaxy-file also accepts contents. */
  absPath?: string;
  content?: string;
  contents?: string;
  /** Official Gzt base64 branch: encoding === "base64". */
  encoding?: "base64" | "utf8";
  error?: string;
  /** sha256 hex of utf8 contents — c119 vN F (Edit) gate. */
  hash?: string;
  isDirectory?: boolean;
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

/** Official uUt / getAllArtifacts row residual (app.asar CoworkArtifacts). */
export type CoworkArtifactSummary = {
  id: string;
  name: string;
  description?: string;
  createdAt: number;
  updatedAt?: number;
  isStarred?: boolean;
  errors?: string[];
  versions?: number[];
  createdBySessionId?: string;
  lastModifiedBySessionId?: string;
  indexHtmlPath?: string;
  [key: string]: unknown;
};

/**
 * Official claude.web.CoworkArtifacts residual (oT):
 * list/metadata/thumbnail + cXe show / YD hide / IXe reload / CXe park.
 */
export type CoworkArtifactsBridge = {
  getAllArtifacts?: () => Promise<CoworkArtifactSummary[]>;
  getArtifactMetadata?: (artifactId: string) => Promise<CoworkArtifactSummary | null>;
  getArtifactIndexHtmlPath?: (artifactId: string) => Promise<string | null>;
  getArtifactThumbnail?: (artifactId: string) => Promise<string | null>;
  showArtifact?: (
    artifactId: string,
    bounds: CoworkFilePreviewBounds,
    version?: number,
  ) => Promise<number>;
  hideArtifact?: () => Promise<boolean>;
  reloadArtifactView?: () => Promise<number>;
  parkAndCaptureArtifact?: (bounds: CoworkFilePreviewBounds) => Promise<string | null>;
  deleteArtifact?: (artifactId: string, removeFiles?: boolean) => Promise<boolean>;
  /** Official yn.restoreVersion(id, version) residual. */
  restoreArtifactVersion?: (artifactId: string, version: number) => Promise<boolean>;
  setArtifactStarred?: (artifactId: string, starred: boolean) => Promise<CoworkArtifactSummary | null>;
  isSharingEnabled?: () => Promise<boolean>;
  shareArtifact?: (artifactId: string) => Promise<{ ok: boolean; url?: string; error?: string }>;
  unshareArtifact?: (artifactId: string) => Promise<boolean>;
  importArtifact?: (sharedUuid: string) => Promise<{ ok: boolean; error?: string } | CoworkArtifactSummary>;
  printArtifactToPdf?: () => Promise<boolean>;
  onArtifactsChanged?: (listener: () => void) => () => void;
};

export type FileSystemBridge = {
  browseFiles?: (options?: string | { defaultPath?: string; multiSelections?: boolean; title?: string }) => Promise<string[]>;
  /** Official residual bT.browseFolder(title, multi?) → folder path string. */
  browseFolder?: (options?: string | { defaultPath?: string; title?: string }, defaultPath?: string) => Promise<string | null>;
  /** Official residual bT.getSystemPath(zI.Documents) etc. */
  getSystemPath?: (name: string) => Promise<string | null>;
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

/** Official claude.web.Resources (Le) — mention / content search for XC Files browser. */
export type ResourcesBridge = {
  fetchMentionOptions?: (query: string, kind?: string) => Promise<Array<{
    id?: string;
    label?: string;
    metadata?: string;
  }>>;
  listProjectFiles?: (query?: string) => Promise<unknown[]>;
  searchFileContents?: (query: string, limit?: number) => Promise<Array<{
    absPath?: string;
    line?: number;
    preview?: string;
    relativePath?: string;
  }>>;
  setFocusedCwd?: (cwd: string | null) => Promise<unknown>;
};

/**
 * Official claude.web.FramebufferPreview (lr) — YR Screen / AN framebuffer pane.
 * Methods: listSources, attach, detach, requestFramePort, sendKey/Pointer/Scroll, setStreamHints.
 */
export type FramebufferPreviewBridge = {
  attach?: (cwd: string, sessionName?: string) => Promise<{
    height?: number;
    name?: string;
    sessionId?: string;
    width?: number;
  } | null>;
  detach?: (sessionId: string) => Promise<unknown>;
  listSources?: (cwd: string) => Promise<Array<{
    name: string;
    origin?: string;
    id?: string;
  }>>;
  onSessionFatal?: (listener: (sessionId: string, message: string) => void) => () => void;
  onSessionResized?: (listener: (sessionId: string, width: number, height: number) => void) => () => void;
  requestFramePort?: (sessionId: string) => Promise<unknown>;
  sendKey?: (...args: unknown[]) => Promise<unknown>;
  sendPointer?: (...args: unknown[]) => Promise<unknown>;
  sendScroll?: (...args: unknown[]) => Promise<unknown>;
  setStreamHints?: (sessionId: string, hints: { backgrounded?: boolean }) => Promise<unknown>;
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
  /** Official claude.web.CoworkArtifacts (oT). */
  CoworkArtifacts?: CoworkArtifactsBridge;
  FileSystem: FileSystemBridge;
  /** Official claude.web.FramebufferPreview (lr). */
  FramebufferPreview?: FramebufferPreviewBridge;
  OfficeAddinFiles: ConnectedOfficeFilesBridge;
  Preferences: PreferencesBridge;
  /** Official claude.web.Resources (Le). */
  Resources?: ResourcesBridge;
  Window: WindowBridge;
};
