import type {
  ChatMessage,
  CodeStats,
  CoworkSpaceSummary,
  ConnectedBrowser,
  ConnectedOfficeFile,
  ContextUsage,
  CoworkMountedProject,
  CoworkMessageEnvelope,
  CoworkSessionSnapshot,
  CoworkSessionsBridge,
  CreateScheduledTaskInput,
  DesktopBridge,
  DesktopPreferences,
  GitCommandResult,
  GetSupportedCommandsRequest,
  LocalSessionsBridge,
  LocalFileEntry,
  LocalFileReadResult,
  ScheduledTaskSummary,
  ShellPtyEvent,
  ShellPtyStartResult,
  SessionSummary,
  SlashCommand,
  StartSessionInput,
  WorkspaceTrustResult,
  WorkspaceContext,
} from "./types";
import { buildOfficialCoworkSendMessageArgs } from "./coworkSendMessageContract";
import { createMessageUuid } from "./messageUuid";

type RemoveListener = () => void;
type RawEventSubscription = (listener: (event: unknown) => void) => RemoveListener;

type RawLocalSessionsBridge = {
  getAll?: (...args: unknown[]) => Promise<unknown[]>;
  addFolderToSession?: (id: string, folder: string) => Promise<unknown>;
  addTrustedFolder?: (folder: string) => Promise<unknown>;
  clearSession?: (id: string) => Promise<unknown>;
  getCodeStats?: () => Promise<unknown>;
  getContextUsage?: (id: string) => Promise<unknown>;
  getDefaultEffort?: () => Promise<unknown>;
  getDefaultPermissionMode?: (cwd?: string) => Promise<unknown>;
  getDetectedProjects?: () => Promise<unknown[]>;
  getDiffFileContent?: (idOrCwd: string, refOrFilePath: string, filePath?: string, previousFilePath?: string) => Promise<unknown>;
  getEffort?: (id: string) => Promise<unknown>;
  getSession?: (id: string, options?: Record<string, unknown>) => Promise<unknown | null>;
  getSessionsForScheduledTask?: (taskId: string) => Promise<unknown[]>;
  getTranscript?: (id: string) => Promise<unknown[]>;
  getGitInfo?: (idOrCwd: string) => Promise<unknown>;
  getGitDiff?: (idOrCwd: string, base?: string) => Promise<unknown>;
  getGitDiffStats?: (idOrCwd: string, base?: string) => Promise<unknown>;
  getLocalBranches?: (idOrCwd: string) => Promise<unknown>;
  isFolderTrusted?: (folder: string) => Promise<unknown>;
  mcpCallTool?: (serverName: string, toolName: string, input?: Record<string, unknown>) => Promise<unknown>;
  checkRemoteTrust?: (sshConfig: unknown, folder: string) => Promise<unknown>;
  checkTrust?: (folder: string) => Promise<unknown>;
  saveTrust?: (folder: string) => Promise<unknown>;
  openInEditor?: (target: string, editor?: unknown, line?: number, column?: number) => Promise<unknown>;
  getPermissionMode?: (id: string) => Promise<unknown>;
  getSupportedCommands?: (request?: GetSupportedCommandsRequest) => Promise<unknown>;
  getWorkingTreeStatus?: (idOrCwd: string) => Promise<unknown>;
  launchUltrareview?: (idOrCwd: string, options?: unknown) => Promise<unknown>;
  readFileAtCwd?: (idOrCwd: string, filePath: string) => Promise<unknown>;
  readSessionFile?: (id: string, filePath: string) => Promise<unknown>;
  readSessionImageAsDataUrl?: (id: string, filePath: string) => Promise<unknown>;
  pickSessionFile?: (id: string) => Promise<unknown>;
  pickFileAtCwd?: (idOrCwd: string) => Promise<unknown>;
  respondToToolPermission?: (requestId: string, decision: "always" | "deny" | "once", updatedInput?: unknown) => Promise<unknown>;
  setEffort?: (id: string, effort: string) => Promise<unknown>;
  setMcpServers?: (id: string, mcpServers: unknown) => Promise<unknown>;
  setModel?: (id: string, model: string) => Promise<unknown>;
  setPermissionMode?: (id: string, mode: string) => Promise<unknown>;
  updateSession?: (id: string, patch: Record<string, unknown>) => Promise<unknown>;
  startShellPty?: (sessionId: string, cols?: number, rows?: number) => Promise<unknown>;
  stop?: (id: string) => Promise<unknown>;
  stopShellPty?: (sessionId: string) => Promise<unknown>;
  stopTask?: (sessionId: string, taskId: string) => Promise<unknown>;
  writeShellPty?: (sessionId: string, data: string) => Promise<unknown>;
  resizeShellPty?: (sessionId: string, cols: number, rows: number) => Promise<unknown>;
  getShellPtyBuffer?: (sessionId: string) => Promise<unknown>;
  getTranscriptFeedback?: (id: string) => Promise<unknown>;
  start?: (input?: Record<string, unknown>) => Promise<unknown>;
  sendMessage?: (...args: unknown[]) => Promise<unknown>;
  forkSession?: (id: string, messageId?: string) => Promise<unknown>;
  rewind?: (id: string, messageId?: string) => Promise<unknown>;
  setFocusedSession?: (id: string | null) => Promise<unknown>;
  submitFeedback?: (input?: unknown) => Promise<unknown>;
  submitTranscriptFeedback?: (sessionIdOrInput: unknown, input?: unknown) => Promise<unknown>;
  archive?: (id: string) => Promise<unknown>;
  delete?: (id: string) => Promise<unknown>;
  searchSessions?: (query: string, options?: Record<string, unknown>) => Promise<unknown[]>;
  onEvent?: RawEventSubscription;
  onOnEvent?: RawEventSubscription;
  onToolPermissionRequest?: RawEventSubscription;
  onOnToolPermissionRequest?: RawEventSubscription;
};

type CoworkQueryBridge = Pick<CoworkSessionsBridge,
  | "list" | "getSessionsForScheduledTask" | "getCodeStats" | "getContextUsage"
  | "getDefaultEffort" | "getDefaultPermissionMode" | "getDetectedProjects"
  | "getDiffFileContent" | "getEffort" | "getGitInfo" | "getGitDiff"
  | "getGitDiffStats" | "getLocalBranches" | "checkRemoteTrust" | "checkTrust"
  | "isFolderTrusted" | "saveTrust" | "addTrustedFolder" | "openInEditor" | "getPermissionMode" | "getSupportedCommands"
  | "getWorkingTreeStatus"
>;
type CoworkFileBridge = Pick<CoworkSessionsBridge,
  | "clearSession" | "launchUltrareview" | "readFileAtCwd" | "readSessionFile"
  | "readSessionImageAsDataUrl" | "pickSessionFile" | "pickFileAtCwd"
>;
type CoworkMutationBridge = Pick<CoworkSessionsBridge,
  | "addFolderToSession" | "respondToToolPermission" | "setEffort" | "setMcpServers"
  | "setModel" | "setPermissionMode" | "updateSession" | "startShellPty" | "stop"
  | "stopShellPty" | "stopTask" | "writeShellPty" | "resizeShellPty" | "getShellPtyBuffer"
>;
type CoworkLifecycleBridge = Pick<CoworkSessionsBridge,
  | "getTranscriptFeedback" | "onShellPtyEvent" | "start" | "sendMessage" | "forkSession"
  | "rewind" | "create" | "archive" | "delete" | "setFocusedSession" | "submitFeedback"
  | "submitTranscriptFeedback" | "onEvent"
>;

type RawScheduledTasksBridge = {
  getAllScheduledTasks?: () => Promise<unknown[]>;
  getScheduledTaskFileContent?: (id: string) => Promise<unknown>;
  updateScheduledTaskStatus?: (id: string, status: string) => Promise<unknown>;
  createScheduledTask?: (input: CreateScheduledTaskInput) => Promise<unknown>;
  onScheduledTaskEvent?: RawEventSubscription;
  onOnScheduledTaskEvent?: RawEventSubscription;
};

type RawCoworkSpacesBridge = {
  getAllSpaces?: () => Promise<unknown[]>;
  onOnSpaceEvent?: RawEventSubscription;
  onSpaceEvent?: RawEventSubscription;
};

type RawLocalSessionEnvironmentBridge = {
  get?: () => Promise<unknown>;
  save?: (env: Record<string, string>) => Promise<unknown>;
};

type RawCoworkFilePreviewBridge = {
  hide?: () => Promise<unknown>;
  isEnabled?: () => Promise<unknown>;
  isVmReady?: () => Promise<unknown>;
  parkAndCapture?: (bounds: { x: number; y: number; width: number; height: number }) => Promise<unknown>;
  show?: (sessionId: string, encodedPath: string, bounds: { x: number; y: number; width: number; height: number }) => Promise<unknown>;
};

type RawFileSystemBridge = {
  browseFiles?: (options?: unknown) => Promise<unknown>;
  listFilesInFolder?: (...args: unknown[]) => Promise<unknown>;
  openLocalFile?: (...args: unknown[]) => Promise<unknown>;
  readLocalFile?: (...args: unknown[]) => Promise<unknown>;
  showInFolder?: (...args: unknown[]) => Promise<unknown>;
  writeLocalFile?: (...args: unknown[]) => Promise<unknown>;
};

type RawOpenDocumentsBridge = {
  getOpenDocuments?: () => Promise<unknown>;
  readOpenDocumentAsBase64?: (idOrPath: string) => Promise<unknown>;
};

type RawStoreBridge<TState> = {
  getState?: () => Promise<TState>;
  getStateSync?: () => TState;
  onStateChange?: (listener: (state: TState) => void) => RemoveListener;
};

type RawOfficeAddinFilesBridge = {
  connectedFilesState_$store$_getState?: () => Promise<unknown>;
  connectedFilesState_$store$_getStateSync?: () => unknown;
  connectedFilesState_$store$_update?: RawEventSubscription;
  focusFile?: (fileIdOrPath: string) => Promise<unknown>;
  getConnectedFiles?: () => Promise<unknown>;
  isFeatureEnabled?: () => Promise<unknown>;
  onAddinNeedsContext?: RawEventSubscription;
  onConnectedFilesState_$store$_update?: RawEventSubscription;
  onFileAdded?: RawEventSubscription;
  onFileRemoved?: RawEventSubscription;
  onFileStateChanged?: RawEventSubscription;
  selectFile?: (fileIdOrPath: string) => Promise<unknown>;
  updateActiveConversationSummary?: (...args: unknown[]) => Promise<unknown>;
};

export type RawClaudeOfficeAddinBridge = {
  OfficeAddinFiles?: RawOfficeAddinFilesBridge;
};

export type RawBrowserNavigationState = {
  url?: string;
  canGoBack?: boolean;
  canGoForward?: boolean;
};

export type RawClaudeWebBridge = {
  Account?: {
    setAccountDetails?: (details: RawAccountDetails) => Promise<unknown>;
  };
  LocalSessions?: RawLocalSessionsBridge;
  LocalAgentModeSessions?: RawLocalSessionsBridge;
  LocalSessionEnvironment?: RawLocalSessionEnvironmentBridge;
  CCDScheduledTasks?: RawScheduledTasksBridge;
  CoworkScheduledTasks?: RawScheduledTasksBridge;
  CoworkSpaces?: RawCoworkSpacesBridge;
  CoworkFilePreview?: RawCoworkFilePreviewBridge;
  FileSystem?: RawFileSystemBridge;
  OpenDocuments?: RawOpenDocumentsBridge;
  WindowControl?: {
    close?: () => Promise<unknown>;
  };
  BrowserNavigation?: {
    goBack?: () => Promise<unknown>;
    goForward?: () => Promise<unknown>;
    reportNavigationState?: () => Promise<unknown>;
    requestMainMenuPopup?: () => Promise<unknown>;
    navigationStateStore?: RawStoreBridge<RawBrowserNavigationState>;
  };
  WindowState?: {
    getFullscreen?: () => Promise<unknown>;
    getZoomFactor?: () => Promise<unknown>;
    /** Preload may expose either raw event name or on* alias (expose.ts officialEventAlias). */
    fullscreenChanged?: (listener: (...args: unknown[]) => void) => () => void;
    onFullscreenChanged?: (listener: (...args: unknown[]) => void) => () => void;
    zoomFactorChanged?: (listener: (...args: unknown[]) => void) => () => void;
    onZoomFactorChanged?: (listener: (...args: unknown[]) => void) => () => void;
  };
};

export type RawAccountDetails = {
  accountTaggedId?: string;
  accountUuid?: string;
  displayName?: string;
  emailAddress?: string;
  fullName?: string;
  hasWiggle: boolean;
  isLoggedOut: boolean;
  isRaven: boolean;
};

export type RawClaudeSettingsBridge = {
  AppPreferences?: {
    getPreferences?: () => Promise<Record<string, unknown>>;
    setPreference?: (key: string, value: unknown) => Promise<unknown>;
    preferencesChanged?: (listener: (preferences: Record<string, unknown>) => void) => RemoveListener;
    onPreferencesChanged?: (listener: (preferences: Record<string, unknown>) => void) => RemoveListener;
  };
  GlobalShortcut?: {
    getGlobalShortcut?: () => Promise<unknown>;
    setGlobalShortcut?: (accelerator: string | null) => Promise<unknown>;
    globalShortcutChange?: (listener: (accelerator: string | null) => void) => RemoveListener;
    onGlobalShortcutChange?: (listener: (accelerator: string | null) => void) => RemoveListener;
  };
  Startup?: {
    isStartupOnLoginEnabled?: () => Promise<unknown>;
    setStartupOnLoginEnabled?: (enabled: boolean) => Promise<unknown>;
    isMenuBarEnabled?: () => Promise<unknown>;
    setMenuBarEnabled?: (enabled: boolean) => Promise<unknown>;
  };
  FilePickers?: {
    getDirectoryPath?: (options?: unknown) => Promise<string[]>;
  };
};

const emptyWorkspace: WorkspaceContext = {
  mode: "local",
  projectName: "local",
  branchName: "main",
  hasWorktree: false,
};

export function createDesktopBridgeFromOfficialNamespaces(
  web: RawClaudeWebBridge,
  settings?: RawClaudeSettingsBridge,
  officeAddin?: RawClaudeOfficeAddinBridge,
): DesktopBridge {
  return {
    LocalSessions: createLocalSessionsBridge(web.LocalSessions, "code"),
    LocalAgentModeSessions: createCoworkSessionsBridge(web.LocalAgentModeSessions),
    LocalSessionEnvironment: createLocalSessionEnvironmentBridge(web.LocalSessionEnvironment),
    BrowserUse: createBrowserUseBridge(web.LocalAgentModeSessions, settings?.AppPreferences),
    CCDScheduledTasks: createScheduledTasksBridge(web.CCDScheduledTasks),
    CoworkScheduledTasks: createScheduledTasksBridge(web.CoworkScheduledTasks),
    CoworkSpaces: createCoworkSpacesBridge(web.CoworkSpaces),
    CoworkFilePreview: createCoworkFilePreviewBridge(web.CoworkFilePreview),
    FileSystem: {
      browseFiles: async (options) => normalizeStringArray(await web.FileSystem?.browseFiles?.(options).catch(() => [])),
      listFilesInFolder: async (sessionId, folderPath) => listFilesInFolder(web.FileSystem, sessionId, folderPath),
      // Official Gzt/a2e: openLocalFile(sessionId, encodeURIComponent(path), reveal?)
      openLocalFile: async (filePathOrSessionId, encodedFilePath, reveal) => {
        if (typeof encodedFilePath === "string" && encodedFilePath.length > 0) {
          return web.FileSystem?.openLocalFile?.(filePathOrSessionId, encodedFilePath, reveal);
        }
        return web.FileSystem?.openLocalFile?.(filePathOrSessionId);
      },
      // Official Gzt local_session: readLocalFile(sessionId, encodeURIComponent(path)) → {content, encoding?}
      readLocalFile: async (filePathOrSessionId, encodedFilePath, options) => {
        if (typeof encodedFilePath === "string" && encodedFilePath.length > 0) {
          return normalizeLocalFileReadResult(
            await web.FileSystem?.readLocalFile?.(filePathOrSessionId, encodedFilePath, options).catch(() => null),
          );
        }
        return normalizeLocalFileReadResult(
          await web.FileSystem?.readLocalFile?.(filePathOrSessionId, options).catch(() => null),
        );
      },
      showInFolder: async (filePathOrSessionId, encodedFilePath) => {
        if (typeof encodedFilePath === "string" && encodedFilePath.length > 0) {
          return Boolean(await web.FileSystem?.showInFolder?.(filePathOrSessionId, encodedFilePath).catch(() => false));
        }
        return Boolean(await web.FileSystem?.showInFolder?.(filePathOrSessionId).catch(() => false));
      },
      writeLocalFile: async (filePathOrSessionId, encodedFilePathOrData, dataOrOptions, options) => {
        const writeArgs = normalizeWriteLocalFileArgs(filePathOrSessionId, encodedFilePathOrData, dataOrOptions, options);
        if (writeArgs.officialSignature) {
          return web.FileSystem?.writeLocalFile?.(
            writeArgs.sessionId,
            writeArgs.encodedFilePath,
            writeArgs.data,
            writeArgs.options,
          );
        }
        return web.FileSystem?.writeLocalFile?.(writeArgs.filePath, writeArgs.data, writeArgs.options);
      },
    },
    OfficeAddinFiles: createOfficeAddinFilesBridge(officeAddin?.OfficeAddinFiles, web.OpenDocuments),
    Preferences: {
      getWorkspaceContext: () => getWorkspaceContext(web),
      getPreferences: async () => normalizePreferences(await settings?.AppPreferences?.getPreferences?.()),
      setPreference: async (key, value) => {
        await settings?.AppPreferences?.setPreference?.(key, value);
      },
      onPreferencesChanged: (listener) => {
        const subscribe = settings?.AppPreferences?.preferencesChanged ?? settings?.AppPreferences?.onPreferencesChanged;
        return subscribe?.((preferences) => listener(normalizePreferences(preferences))) ?? (() => {});
      },
      getDirectoryPath: async (multiple = false) => {
        const paths = await settings?.FilePickers?.getDirectoryPath?.(multiple);
        return paths?.length ? paths : null;
      },
      isStartupOnLoginEnabled: async () => Boolean(await settings?.Startup?.isStartupOnLoginEnabled?.().catch(() => false)),
      setStartupOnLoginEnabled: async (enabled) => Boolean(await settings?.Startup?.setStartupOnLoginEnabled?.(enabled).catch(() => false)),
      isMenuBarEnabled: async () => {
        const value = await settings?.Startup?.isMenuBarEnabled?.().catch(() => true);
        return value === undefined ? true : Boolean(value);
      },
      setMenuBarEnabled: async (enabled) => Boolean(await settings?.Startup?.setMenuBarEnabled?.(enabled).catch(() => false)),
      getGlobalShortcut: async () => {
        const value = await settings?.GlobalShortcut?.getGlobalShortcut?.().catch(() => null);
        return typeof value === "string" && value.length > 0 ? value : null;
      },
      setGlobalShortcut: async (accelerator) => Boolean(await settings?.GlobalShortcut?.setGlobalShortcut?.(accelerator).catch(() => false)),
    },
    Window: {
      close: async () => {
        await web.WindowControl?.close?.();
      },
      // Strict true-check: Boolean(object) would wrongly kill traffic-light spacer (qWt).
      getFullscreen: async () => asStrictBoolean(await web.WindowState?.getFullscreen?.()),
      getZoomFactor: async () => {
        const zoom = Number(await web.WindowState?.getZoomFactor?.());
        return Number.isFinite(zoom) && zoom > 0 ? zoom : 1;
      },
      onFullscreenChanged: (listener) => {
        const subscribe = web.WindowState?.onFullscreenChanged ?? web.WindowState?.fullscreenChanged;
        if (!subscribe) return () => undefined;
        return subscribe((value) => {
          listener(asStrictBoolean(value));
        });
      },
      onZoomFactorChanged: (listener) => {
        const subscribe = web.WindowState?.onZoomFactorChanged ?? web.WindowState?.zoomFactorChanged;
        if (!subscribe) return () => undefined;
        return subscribe((value) => {
          const zoom = Number(value);
          listener(Number.isFinite(zoom) && zoom > 0 ? zoom : 1);
        });
      },
    },
  };
}

function asStrictBoolean(value: unknown): boolean {
  return value === true;
}

function createLocalSessionEnvironmentBridge(raw: RawLocalSessionEnvironmentBridge | undefined): DesktopBridge["LocalSessionEnvironment"] {
  return {
    get: async () => normalizeEnvironmentMap(await raw?.get?.().catch(() => ({}))),
    save: async (env) => {
      await raw?.save?.(normalizeEnvironmentMap(env));
      return true;
    },
  };
}

const chromeMcpServerName = "Claude in Chrome";

function createBrowserUseBridge(
  raw: RawLocalSessionsBridge | undefined,
  preferences: RawClaudeSettingsBridge["AppPreferences"] | undefined,
): DesktopBridge["BrowserUse"] {
  if (!raw?.mcpCallTool) return {};
  const callChromeTool = async (toolName: string, input: Record<string, unknown> = {}) => raw.mcpCallTool?.(chromeMcpServerName, toolName, input);
  return {
    // Official ion-dist basis: index-BELzQL5P.js MRt uses local tool list_connected_browsers/select_browser;
    // PZt.displayName="BrowserPickerButton" renders the same connected-browser picker surface.
    listConnectedBrowsers: async () => normalizeConnectedBrowsers(await callChromeTool("list_connected_browsers").catch(() => [])),
    selectBrowser: async (deviceId) => !mcpToolReturnedError(await callChromeTool("select_browser", { deviceId }).catch(() => ({ isError: true }))),
    switchBrowser: async () => !mcpToolReturnedError(await callChromeTool("switch_browser").catch(() => ({ isError: true }))),
    getSelectedBrowserId: async () => {
      const prefs = await preferences?.getPreferences?.().catch(() => ({}));
      const root = asRecord(prefs);
      const chromeExtension = asRecord(root.chromeExtension);
      return stringValue(chromeExtension.pairedDeviceId) ?? stringValue(root.chromeExtensionPairedDeviceId) ?? null;
    },
  };
}

function mcpToolReturnedError(value: unknown) {
  const raw = asRecord(value);
  const nested = asRecord(raw.result);
  return raw.isError === true || raw.error !== undefined || nested.isError === true || nested.error !== undefined || raw.ok === false;
}

function normalizeConnectedBrowsers(value: unknown): ConnectedBrowser[] {
  const raw = asRecord(value);
  const result = asRecord(raw.result);
  const source = Array.isArray(value)
    ? value
    : Array.isArray(raw.browsers)
      ? raw.browsers
      : Array.isArray(result.browsers)
        ? result.browsers
        : connectedBrowsersFromMcpContent(Array.isArray(raw.content) ? raw.content : result.content);
  const seen = new Set<string>();
  return source
    .map(normalizeConnectedBrowser)
    .filter((browser): browser is ConnectedBrowser => Boolean(browser))
    .filter((browser) => {
      if (seen.has(browser.deviceId)) return false;
      seen.add(browser.deviceId);
      return true;
    });
}

function connectedBrowsersFromMcpContent(content: unknown): unknown[] {
  if (!Array.isArray(content)) return [];
  const text = content.map((item) => stringValue(asRecord(item).text)).find(Boolean);
  if (!text) return [];
  try {
    const parsed = JSON.parse(text);
    return Array.isArray(parsed) ? parsed : Array.isArray(asRecord(parsed).browsers) ? asRecord(parsed).browsers as unknown[] : [];
  } catch {
    return [];
  }
}

function normalizeConnectedBrowser(value: unknown): ConnectedBrowser | null {
  const raw = asRecord(value);
  const deviceId = stringValue(raw.deviceId) ?? stringValue(raw.device_id) ?? stringValue(raw.id);
  if (!deviceId) return null;
  return {
    deviceId,
    name: stringValue(raw.name) ?? stringValue(raw.displayName) ?? stringValue(raw.display_name),
    osPlatform: stringValue(raw.osPlatform) ?? stringValue(raw.os_platform) ?? stringValue(raw.platform),
  };
}

async function listFilesInFolder(raw: RawFileSystemBridge | undefined, sessionId: string, folderPath: string): Promise<LocalFileEntry[]> {
  if (!raw?.listFilesInFolder) return [];
  const officialResult = await raw.listFilesInFolder(sessionId, folderPath).catch(() => undefined);
  if (officialResult !== undefined) return normalizeLocalFileEntries(officialResult, folderPath);
  const fallbackResult = await raw.listFilesInFolder(folderPath, { entries: true }).catch(() => []);
  return normalizeLocalFileEntries(fallbackResult, folderPath);
}

function decodeOfficialPathArg(filePathOrSessionId: string, encodedFilePath?: string) {
  if (!encodedFilePath) return filePathOrSessionId;
  try {
    return decodeURIComponent(encodedFilePath);
  } catch {
    return encodedFilePath;
  }
}

function normalizeLocalFileReadResult(value: unknown): LocalFileReadResult {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return { content: value };
  const raw = asRecord(value);
  return {
    content: stringValue(raw.content),
    encoding: stringValue(raw.encoding) as "base64" | "utf8" | undefined,
    mimeType: stringValue(raw.mimeType),
    name: stringValue(raw.name),
    path: stringValue(raw.path),
    size: numberValue(raw.size),
    tooLarge: booleanValue(raw.tooLarge),
  };
}

function normalizeWriteLocalFileArgs(
  filePathOrSessionId: string,
  encodedFilePathOrData: string,
  dataOrOptions?: string | Uint8Array | { encoding?: string },
  options?: { encoding?: string },
) {
  if (typeof dataOrOptions === "string" || dataOrOptions instanceof Uint8Array) {
    return {
      data: dataOrOptions,
      encodedFilePath: encodedFilePathOrData,
      filePath: decodeOfficialPathArg(filePathOrSessionId, encodedFilePathOrData),
      officialSignature: true as const,
      options,
      sessionId: filePathOrSessionId,
    };
  }
  return {
    data: encodedFilePathOrData,
    filePath: filePathOrSessionId,
    officialSignature: false as const,
    options: dataOrOptions,
  };
}

function createOfficeAddinFilesBridge(raw: RawOfficeAddinFilesBridge | undefined, openDocuments: RawOpenDocumentsBridge | undefined): DesktopBridge["OfficeAddinFiles"] {
  const readConnectedFiles = async () => {
    const direct = normalizeConnectedOfficeFiles(await raw?.getConnectedFiles?.().catch(() => undefined));
    if (direct.length > 0) return direct;
    const state = normalizeConnectedOfficeFiles(await raw?.connectedFilesState_$store$_getState?.().catch(() => undefined));
    if (state.length > 0) return state;
    return normalizeConnectedOfficeFiles(await openDocuments?.getOpenDocuments?.().catch(() => []));
  };

  return {
    getConnectedFiles: readConnectedFiles,
    isFeatureEnabled: async () => {
      if (raw?.isFeatureEnabled) return Boolean(await raw.isFeatureEnabled().catch(() => false));
      return Boolean(raw || openDocuments);
    },
    selectFile: async (fileIdOrPath) => {
      const selected = normalizeConnectedOfficeFile(await raw?.selectFile?.(fileIdOrPath).catch(() => null));
      if (selected) return selected;
      const files = await readConnectedFiles();
      return files.find((file) => file.id === fileIdOrPath || file.path === fileIdOrPath) ?? null;
    },
    focusFile: async (fileIdOrPath) => Boolean(await raw?.focusFile?.(fileIdOrPath).catch(() => false)),
    onConnectedFilesChange: (listener) => {
      const subscriptions = [
        raw?.connectedFilesState_$store$_update,
        raw?.onConnectedFilesState_$store$_update,
        raw?.onFileAdded,
        raw?.onFileRemoved,
        raw?.onFileStateChanged,
      ].filter((subscribe): subscribe is RawEventSubscription => Boolean(subscribe));
      if (subscriptions.length === 0) return () => {};
      const removers = subscriptions.map((subscribe) => subscribe(async (event) => {
        const filesFromEvent = normalizeConnectedOfficeFiles(event);
        listener(filesFromEvent.length > 0 ? filesFromEvent : await readConnectedFiles());
      }));
      return () => {
        for (const remove of removers) remove();
      };
    },
  };
}

function normalizeConnectedOfficeFiles(value: unknown): ConnectedOfficeFile[] {
  const raw = asRecord(value);
  const source = Array.isArray(value)
    ? value
    : Array.isArray(raw.files)
      ? raw.files
      : raw.activeFile
        ? [raw.activeFile]
        : [];
  const files = source.map(normalizeConnectedOfficeFile).filter((file): file is ConnectedOfficeFile => Boolean(file));
  const seen = new Set<string>();
  return files.filter((file) => {
    const key = file.path ?? file.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizeConnectedOfficeFile(value: unknown): ConnectedOfficeFile | null {
  const raw = asRecord(value);
  const path = stringValue(raw.path) ?? stringValue(raw.filePath) ?? stringValue(raw.hostPath);
  const document = stringValue(raw.document) ?? stringValue(raw.name) ?? basename(path) ?? stringValue(raw.id);
  const id = stringValue(raw.id) ?? path ?? document;
  if (!id || !document) return null;
  return {
    id,
    document,
    path,
    status: stringValue(raw.status) ?? "Connected",
    appIconBase64: stringValue(raw.appIconBase64) ?? stringValue(raw.app_icon_base64),
    active: booleanValue(raw.active),
  };
}

function createLocalSessionsBridge(raw: RawLocalSessionsBridge | undefined, targetKind: SessionSummary["kind"]): LocalSessionsBridge {
  return {
    list: async () => {
      const items = await raw?.getAll?.();
      return normalizeSessionList(items, targetKind);
    },
    getSession: async (id) => {
      const item = await raw?.getSession?.(id, { skipReplay: true });
      if (!item) return null;
      const session = await enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw);
      const transcript = await raw?.getTranscript?.(id).catch(() => undefined);
      const transcriptMessages = normalizeMessages(transcript);
      return transcriptMessages?.length ? { ...session, messages: transcriptMessages } : session;
    },
    getSessionsForScheduledTask: async (taskId) => normalizeSessionList(await raw?.getSessionsForScheduledTask?.(taskId), targetKind),
    getTranscript: async (id) => normalizeMessages(await raw?.getTranscript?.(id).catch(() => [])) ?? [],
    addFolderToSession: async (id, folder) => {
      const item = await raw?.addFolderToSession?.(id, folder);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    getCodeStats: async () => normalizeCodeStats(await raw?.getCodeStats?.().catch(() => null)),
    getContextUsage: async (id) => normalizeOfficialContextUsageResult(await raw?.getContextUsage?.(id).catch(() => null)),
    getDefaultEffort: async () => normalizeEffort(await raw?.getDefaultEffort?.().catch(() => null)),
    getDefaultPermissionMode: async (cwd) => stringValue(await raw?.getDefaultPermissionMode?.(cwd).catch(() => null)) ?? null,
    getDetectedProjects: async () => normalizeDetectedProjectList(await raw?.getDetectedProjects?.().catch(() => []), targetKind),
    getDiffFileContent: async (idOrCwd, refOrFilePath, filePath, previousFilePath) => normalizeGitCommandResult(await raw?.getDiffFileContent?.(idOrCwd, refOrFilePath, filePath, previousFilePath)),
    getEffort: async (id) => String(await raw?.getEffort?.(id).catch(() => "medium") ?? "medium"),
    getGitInfo: async (idOrCwd) => raw?.getGitInfo?.(idOrCwd),
    getGitDiff: async (idOrCwd, base = "HEAD") => normalizeGitCommandResult(await raw?.getGitDiff?.(idOrCwd, base)),
    getGitDiffStats: async (idOrCwd, base = "HEAD") => normalizeGitCommandResult(await raw?.getGitDiffStats?.(idOrCwd, base)),
    getLocalBranches: async (idOrCwd) => normalizeLocalBranches(await raw?.getLocalBranches?.(idOrCwd)),
    checkRemoteTrust: async (sshConfig, folder) => normalizeTrustResult(await raw?.checkRemoteTrust?.(sshConfig, folder)),
    checkTrust: async (folder) => normalizeTrustResult(await raw?.checkTrust?.(folder)),
    saveTrust: async (folder) => raw?.saveTrust?.(folder),
    openInEditor: async (target, editor, line, column) => raw?.openInEditor?.(target, editor, line, column),
    getPermissionMode: async (id) => String(await raw?.getPermissionMode?.(id).catch(() => "default") ?? "default"),
    getSupportedCommands: async (request) => normalizeSupportedCommands(await raw?.getSupportedCommands?.(request).catch(() => [])),
    getWorkingTreeStatus: async (idOrCwd) => normalizeGitCommandResult(await raw?.getWorkingTreeStatus?.(idOrCwd)),
    clearSession: async (id) => raw?.clearSession?.(id),
    launchUltrareview: async (idOrCwd, options) => raw?.launchUltrareview?.(idOrCwd, options),
    readFileAtCwd: async (idOrCwd, filePath) => normalizeGitCommandResult(await raw?.readFileAtCwd?.(idOrCwd, filePath)),
    readSessionFile: async (id, filePath) => (await raw?.readSessionFile?.(id, filePath) ?? null) as string | null | Record<string, unknown>,
    readSessionImageAsDataUrl: async (id, filePath) => {
      const result = await raw?.readSessionImageAsDataUrl?.(id, filePath);
      return typeof result === "string" ? result : null;
    },
    pickSessionFile: async (id) => {
      const result = await raw?.pickSessionFile?.(id);
      return typeof result === "string" ? result : null;
    },
    pickFileAtCwd: async (idOrCwd) => {
      const result = await raw?.pickFileAtCwd?.(idOrCwd);
      return typeof result === "string" ? result : null;
    },
    respondToToolPermission: async (requestId, decision, updatedInput) => raw?.respondToToolPermission?.(requestId, decision, updatedInput),
    setEffort: async (id, effort) => {
      const item = await raw?.setEffort?.(id, effort);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    setMcpServers: async (id, mcpServers) => {
      const item = await raw?.setMcpServers?.(id, mcpServers);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    setModel: async (id, model) => {
      const item = await raw?.setModel?.(id, model);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    setPermissionMode: async (id, mode) => {
      const item = await raw?.setPermissionMode?.(id, mode);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    updateSession: async (id, patch) => {
      const { isPinned, ...rest } = patch;
      const officialPatch = isPinned === undefined ? rest : { ...rest, isStarred: isPinned };
      const item = await raw?.updateSession?.(id, officialPatch);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    startShellPty: async (sessionId, cols, rows) => normalizeShellPtyStartResult(await raw?.startShellPty?.(sessionId, cols, rows), await raw?.getShellPtyBuffer?.(sessionId).catch(() => "")),
    stop: async (id) => raw?.stop?.(id),
    stopShellPty: async (sessionId) => {
      await raw?.stopShellPty?.(sessionId);
    },
    stopTask: async (sessionId, taskId) => {
      await raw?.stopTask?.(sessionId, taskId);
    },
    writeShellPty: async (sessionId, data) => {
      await raw?.writeShellPty?.(sessionId, data);
    },
    resizeShellPty: async (sessionId, cols, rows) => {
      await raw?.resizeShellPty?.(sessionId, cols, rows);
    },
    getShellPtyBuffer: async (sessionId) => String(await raw?.getShellPtyBuffer?.(sessionId).catch(() => "") ?? ""),
    getTranscriptFeedback: async (id) => {
      const feedback = await raw?.getTranscriptFeedback?.(id).catch(() => []);
      return Array.isArray(feedback) ? feedback : [];
    },
    onShellPtyEvent: (listener) => {
      const subscribe = raw?.onEvent ?? raw?.onOnEvent;
      return subscribe?.((event) => {
        const normalized = normalizeShellPtyEvent(event);
        if (normalized) listener(normalized);
      }) ?? (() => {});
    },
    start: async (input) => {
      const item = await raw?.start?.(toStartPayload(input, targetKind));
      return enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw);
    },
    sendMessage: async (id, text, input) => {
      const messageUuid = input?.messageUuid ?? createMessageUuid();
      const item = await raw?.sendMessage?.(id, text, [], input?.permissionMode, messageUuid, {
        messageUuid,
        userSelectedFiles: input?.userSelectedFiles?.length ? input.userSelectedFiles : undefined,
      });
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    forkSession: async (id, messageId) => {
      const item = await raw?.forkSession?.(id, messageId);
      return item ? enrichSessionWithGitInfo(normalizeSession(item, targetKind), raw) : null;
    },
    rewind: async (id, messageId) => raw?.rewind?.(id, messageId),
    create: async (kind) => {
      const item = await raw?.start?.({ kind, title: kind === "code" ? "General coding session" : "New session" });
      return enrichSessionWithGitInfo(normalizeSession(item, kind), raw);
    },
    archive: async (id) => {
      await raw?.archive?.(id);
    },
    delete: async (id) => {
      await raw?.delete?.(id);
    },
    setFocusedSession: async (id) => {
      await raw?.setFocusedSession?.(id);
    },
    submitFeedback: async (input) => raw?.submitFeedback?.(input),
    submitTranscriptFeedback: async (sessionIdOrInput, input) => raw?.submitTranscriptFeedback?.(sessionIdOrInput, input),
    onEvent: (listener) => {
      const subscribe = raw?.onEvent ?? raw?.onOnEvent;
      return subscribe?.(listener) ?? (() => {});
    },
    onToolPermissionRequest: (listener) => {
      const subscribe = raw?.onToolPermissionRequest ?? raw?.onOnToolPermissionRequest;
      return subscribe?.(listener) ?? (() => {});
    },
  };
}

function createCoworkSessionsBridge(raw: RawLocalSessionsBridge | undefined): CoworkSessionsBridge {
  const rawAccess = createCoworkRawAccess(raw);
  return {
    ...createCoworkQueryBridge(raw),
    ...createCoworkFileBridge(raw),
    ...createCoworkMutationBridge(raw),
    ...createCoworkLifecycleBridge(raw),
    getSession: rawAccess.getRawSession,
    ...rawAccess,
  };
}

function createCoworkRawAccess(raw: RawLocalSessionsBridge | undefined) {
  return {
    getRawSession: async (id: string) => {
      const item = await raw?.getSession?.(id, { skipReplay: true });
      return item ? normalizeCoworkSessionSnapshot(item) : null;
    },
    getTranscript: async (id: string) => normalizeCoworkMessageEnvelopes(
      await raw?.getTranscript?.(id).catch(() => []),
    ),
    getRawTranscript: async (id: string) => rawArray(await raw?.getTranscript?.(id).catch(() => [])),
  };
}

function createCoworkQueryBridge(raw: RawLocalSessionsBridge | undefined): CoworkQueryBridge {
  return {
    list: async () => normalizeSessionList(await raw?.getAll?.(), "epitaxy"),
    getSessionsForScheduledTask: async (taskId) => normalizeSessionList(await raw?.getSessionsForScheduledTask?.(taskId), "epitaxy"),
    getCodeStats: async () => normalizeCodeStats(await raw?.getCodeStats?.().catch(() => null)),
    getContextUsage: async (id) => normalizeOfficialContextUsageResult(await raw?.getContextUsage?.(id).catch(() => null)),
    getDefaultEffort: async () => normalizeEffort(await raw?.getDefaultEffort?.().catch(() => null)),
    getDefaultPermissionMode: async (cwd) => stringValue(await raw?.getDefaultPermissionMode?.(cwd).catch(() => null)) ?? null,
    getDetectedProjects: async () => normalizeDetectedProjectList(await raw?.getDetectedProjects?.().catch(() => []), "epitaxy"),
    getDiffFileContent: async (idOrCwd, refOrFilePath, filePath, previousFilePath) => normalizeGitCommandResult(await raw?.getDiffFileContent?.(idOrCwd, refOrFilePath, filePath, previousFilePath)),
    getEffort: async (id) => String(await raw?.getEffort?.(id).catch(() => "medium") ?? "medium"),
    getGitInfo: async (idOrCwd) => raw?.getGitInfo?.(idOrCwd),
    getGitDiff: async (idOrCwd, base = "HEAD") => normalizeGitCommandResult(await raw?.getGitDiff?.(idOrCwd, base)),
    getGitDiffStats: async (idOrCwd, base = "HEAD") => normalizeGitCommandResult(await raw?.getGitDiffStats?.(idOrCwd, base)),
    getLocalBranches: async (idOrCwd) => normalizeLocalBranches(await raw?.getLocalBranches?.(idOrCwd)),
    checkRemoteTrust: async (sshConfig, folder) => normalizeTrustResult(await raw?.checkRemoteTrust?.(sshConfig, folder)),
    checkTrust: async (folder) => normalizeTrustResult(await raw?.checkTrust?.(folder)),
    isFolderTrusted: async (folder) => (await raw?.isFolderTrusted?.(folder)) === true,
    saveTrust: async (folder) => raw?.saveTrust?.(folder),
    addTrustedFolder: async (folder) => raw?.addTrustedFolder?.(folder),
    openInEditor: async (target, editor, line, column) => raw?.openInEditor?.(target, editor, line, column),
    getPermissionMode: async (id) => String(await raw?.getPermissionMode?.(id).catch(() => "default") ?? "default"),
    getSupportedCommands: async (request) => normalizeSupportedCommands(await raw?.getSupportedCommands?.(request).catch(() => [])),
    getWorkingTreeStatus: async (idOrCwd) => normalizeGitCommandResult(await raw?.getWorkingTreeStatus?.(idOrCwd)),
  };
}

function createCoworkFileBridge(raw: RawLocalSessionsBridge | undefined): CoworkFileBridge {
  return {
    clearSession: async (id) => raw?.clearSession?.(id),
    launchUltrareview: async (idOrCwd, options) => raw?.launchUltrareview?.(idOrCwd, options),
    // LocalAgentModeSessions does not expose readFileAtCwd; return null so callers
    // can fall through instead of treating a missing method as {ok:false}.
    readFileAtCwd: async (idOrCwd, filePath) => {
      if (!raw?.readFileAtCwd) return null as unknown as GitCommandResult;
      return normalizeGitCommandResult(await raw.readFileAtCwd(idOrCwd, filePath));
    },
    readSessionFile: async (id, filePath) => {
      if (!raw?.readSessionFile) return null;
      return (await raw.readSessionFile(id, filePath) ?? null) as string | null | Record<string, unknown>;
    },
    readSessionImageAsDataUrl: async (id, filePath) => {
      if (!raw?.readSessionImageAsDataUrl) return null;
      const result = await raw.readSessionImageAsDataUrl(id, filePath);
      return typeof result === "string" ? result : null;
    },
    pickSessionFile: async (id) => {
      const result = await raw?.pickSessionFile?.(id);
      return typeof result === "string" ? result : null;
    },
    pickFileAtCwd: async (idOrCwd) => {
      const result = await raw?.pickFileAtCwd?.(idOrCwd);
      return typeof result === "string" ? result : null;
    },
  };
}

function createCoworkMutationBridge(raw: RawLocalSessionsBridge | undefined): CoworkMutationBridge {
  return {
    addFolderToSession: async (id, folder) => normalizeCoworkAddFolderResult(await raw?.addFolderToSession?.(id, folder)),
    respondToToolPermission: async (requestId, decision, updatedInput) => raw?.respondToToolPermission?.(requestId, decision, updatedInput),
    setEffort: async (id, effort) => normalizeCoworkResult(await raw?.setEffort?.(id, effort)),
    setMcpServers: async (id, mcpServers) => normalizeCoworkResult(await raw?.setMcpServers?.(id, mcpServers)),
    setModel: async (id, model) => normalizeCoworkResult(await raw?.setModel?.(id, model)),
    setPermissionMode: async (id, mode) => normalizeCoworkResult(await raw?.setPermissionMode?.(id, mode)),
    updateSession: async (id, patch) => {
      const { isPinned, ...rest } = patch;
      const officialPatch = isPinned === undefined ? rest : { ...rest, isStarred: isPinned };
      return normalizeCoworkResult(await raw?.updateSession?.(id, officialPatch));
    },
    startShellPty: async (sessionId, cols, rows) => normalizeShellPtyStartResult(await raw?.startShellPty?.(sessionId, cols, rows), await raw?.getShellPtyBuffer?.(sessionId).catch(() => "")),
    stop: async (id) => raw?.stop?.(id),
    stopShellPty: async (sessionId) => { await raw?.stopShellPty?.(sessionId); },
    stopTask: async (sessionId, taskId) => { await raw?.stopTask?.(sessionId, taskId); },
    writeShellPty: async (sessionId, data) => { await raw?.writeShellPty?.(sessionId, data); },
    resizeShellPty: async (sessionId, cols, rows) => { await raw?.resizeShellPty?.(sessionId, cols, rows); },
    getShellPtyBuffer: async (sessionId) => String(await raw?.getShellPtyBuffer?.(sessionId).catch(() => "") ?? ""),
  };
}

function createCoworkLifecycleBridge(raw: RawLocalSessionsBridge | undefined): CoworkLifecycleBridge {
  return {
    getTranscriptFeedback: async (id) => rawArray(await raw?.getTranscriptFeedback?.(id).catch(() => [])),
    onShellPtyEvent: (listener) => {
      const subscribe = raw?.onEvent ?? raw?.onOnEvent;
      return subscribe?.((event) => {
        const normalized = normalizeShellPtyEvent(event);
        if (normalized) listener(normalized);
      }) ?? (() => {});
    },
    start: async (input) => normalizeSession(await raw?.start?.(toStartPayload(input, "epitaxy")), "epitaxy", false),
    sendMessage: async (id, text, input) => {
      const messageUuid = input?.messageUuid ?? createMessageUuid();
      await raw?.sendMessage?.(...buildOfficialCoworkSendMessageArgs(id, text, input, messageUuid));
      return null;
    },
    forkSession: async (id, messageId) => normalizeCoworkResult(await raw?.forkSession?.(id, messageId)),
    rewind: async (id, messageId) => {
      const prompt = await raw?.rewind?.(id, messageId);
      return typeof prompt === "string" ? prompt : null;
    },
    create: async (kind) => normalizeSession(await raw?.start?.({ kind, title: "New session" }), "epitaxy", false),
    archive: async (id) => { await raw?.archive?.(id); },
    delete: async (id) => { await raw?.delete?.(id); },
    setFocusedSession: async (id) => { await raw?.setFocusedSession?.(id); },
    submitFeedback: async (input) => raw?.submitFeedback?.(input),
    submitTranscriptFeedback: async (sessionIdOrInput, input) => raw?.submitTranscriptFeedback?.(sessionIdOrInput, input),
    onEvent: (listener) => {
      const subscribe = raw?.onEvent ?? raw?.onOnEvent;
      return subscribe?.(listener) ?? (() => {});
    },
  };
}

function normalizeCoworkResult(item: unknown) {
  return item ? normalizeSession(item, "epitaxy", false) : null;
}

function normalizeCoworkAddFolderResult(value: unknown) {
  const result = asRecord(value);
  if (result.ok === true && typeof result.folderPath === "string") {
    return { folderPath: result.folderPath, ok: true } as const;
  }
  return {
    error: typeof result.error === "string" ? result.error : "Failed to add folder",
    ok: false,
  } as const;
}

function createCoworkFilePreviewBridge(raw: RawCoworkFilePreviewBridge | undefined): DesktopBridge["CoworkFilePreview"] {
  return {
    isEnabled: async () => (await raw?.isEnabled?.().catch(() => false)) === true,
    isVmReady: async () => (await raw?.isVmReady?.().catch(() => false)) === true,
    show: async (sessionId, encodedPath, bounds) => {
      const result = await raw?.show?.(sessionId, encodedPath, bounds);
      if (typeof result === "boolean") return result;
      const record = asRecord(result);
      return { ok: record.ok === true, painted: record.painted === true, declineReason: record.declineReason };
    },
    hide: async () => {
      const result = await raw?.hide?.();
      return typeof result === "boolean" ? result : undefined;
    },
    parkAndCapture: async (bounds) => {
      const result = await raw?.parkAndCapture?.(bounds).catch(() => null);
      return typeof result === "string" ? result : null;
    },
  };
}

function createScheduledTasksBridge(raw: RawScheduledTasksBridge | undefined): DesktopBridge["CCDScheduledTasks"] {
  return {
    list: async () => normalizeScheduledTasks(await raw?.getAllScheduledTasks?.()),
    get: async (id) => {
      const tasks = normalizeScheduledTasks(await raw?.getAllScheduledTasks?.());
      return tasks.find((task) => task.id === id) ?? null;
    },
    create: async (input) => {
      const task = await raw?.createScheduledTask?.(input);
      return task ? normalizeScheduledTask(task) : null;
    },
    updateStatus: async (id, status) => {
      await raw?.updateScheduledTaskStatus?.(id, status);
    },
    onEvent: (listener) => {
      const subscribe = raw?.onScheduledTaskEvent ?? raw?.onOnScheduledTaskEvent;
      return subscribe?.(listener) ?? (() => {});
    },
  };
}

function createCoworkSpacesBridge(raw: RawCoworkSpacesBridge | undefined): DesktopBridge["CoworkSpaces"] {
  return {
    list: async () => normalizeCoworkSpaces(await raw?.getAllSpaces?.()),
    onEvent: (listener) => {
      const subscribe = raw?.onSpaceEvent ?? raw?.onOnSpaceEvent;
      return subscribe?.(listener) ?? (() => {});
    },
  };
}

function normalizeSessionList(items: unknown, targetKind: SessionSummary["kind"]): SessionSummary[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeSession(item, targetKind))
    .filter((session) => !session.isArchived)
    .sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}

function normalizeDetectedProjectList(items: unknown, targetKind: SessionSummary["kind"]): SessionSummary[] {
  return (Array.isArray(items) ? items : [])
    .map((item) => normalizeDetectedProject(item, targetKind))
    .filter((session): session is SessionSummary => Boolean(session?.cwd));
}

function normalizeDetectedProject(item: unknown, targetKind: SessionSummary["kind"]): SessionSummary | null {
  const raw = asRecord(item);
  const cwd = stringValue(raw.cwd) ?? stringValue(raw.root) ?? stringValue(raw.path) ?? stringValue(raw.id);
  if (!cwd) return null;

  const updatedAtMs = timestampValue(raw.updatedAt) ?? timestampValue(raw.lastActivityAt) ?? Date.now();
  const name = stringValue(raw.name) ?? basename(cwd) ?? cwd;
  const branch = stringValue(raw.branch);
  return {
    id: stringValue(raw.id) ?? cwd,
    title: name,
    createdAtMs: updatedAtMs,
    updatedAt: relativeLabel(updatedAtMs),
    updatedAtMs,
    kind: targetKind,
    sessionKind: targetKind === "code" ? "code" : "cowork",
    cwd,
    folders: Array.isArray(raw.folders) ? raw.folders.filter((folder): folder is string => typeof folder === "string") : [cwd],
    repo: {
      name,
      branch,
    },
    isArchived: false,
    isRunning: false,
    isUnread: false,
    hasWorktree: Boolean(raw.hasWorktree || raw.useWorktree),
    messages: [],
  };
}

function normalizeSession(
  item: unknown,
  targetKind: SessionSummary["kind"],
  includeMessages = true,
): SessionSummary {
  const raw = asRecord(item);
  const original = asRecord(raw._originalSession);
  const id = stringValue(raw.id) ?? stringValue(raw.sessionId) ?? stringValue(original.sessionId) ?? `session_${Date.now()}`;
  const cwd = stringValue(raw.cwd)
    ?? stringValue(raw.originCwd)
    ?? firstString(raw.folders)
    ?? firstString(raw.userSelectedFolders)
    ?? stringValue(original.cwd)
    ?? firstString(original.folders)
    ?? firstString(original.userSelectedFolders);
  const updatedAtMs = timestampValue(raw.updatedAt)
    ?? timestampValue(raw.lastActivityAt)
    ?? timestampValue(raw.timestamp)
    ?? timestampValue(original.lastActivityAt)
    ?? timestampValue(raw.createdAt)
    ?? Date.now();
  const createdAtMs = timestampValue(raw.createdAt) ?? timestampValue(original.createdAt) ?? updatedAtMs;
  const kind = targetKind === "code" || raw.kind === "code" ? "code" : "epitaxy";
  const title = stringValue(raw.title)
    ?? stringValue(raw.worktreeName)
    ?? firstMessageText(raw.messages)
    ?? (kind === "code" ? "General coding session" : "New session");

  return {
    bufferedMessages: includeMessages ? normalizeMessages(raw.bufferedMessages ?? original.bufferedMessages) : undefined,
    chromePermissionMode: stringValue(raw.chromePermissionMode) ?? stringValue(original.chromePermissionMode),
    cuSelectedDisplayId: numberOrUndefined(raw.cuSelectedDisplayId ?? original.cuSelectedDisplayId),
    id,
    title,
    createdAtMs,
    updatedAt: relativeLabel(updatedAtMs),
    updatedAtMs,
    kind,
    sessionKind: kind === "code" ? "code" : "cowork",
    cwd,
    effort: stringValue(raw.effort) ?? stringValue(original.effort),
    folders: Array.isArray(raw.folders) ? raw.folders.filter((folder): folder is string => typeof folder === "string") : undefined,
    folderExists: booleanValue(raw.folderExists) ?? booleanValue(original.folderExists),
    homePath: stringValue(raw.homePath) ?? stringValue(original.homePath),
    hostLoopMode: booleanValue(raw.hostLoopMode) ?? booleanValue(original.hostLoopMode),
    initialMessage: stringValue(raw.initialMessage) ?? stringValue(original.initialMessage),
    initializationStatus: raw.initializationStatus ?? original.initializationStatus,
    mcqAnswers: raw.mcqAnswers ?? original.mcqAnswers,
    userSelectedFolders: normalizeStringArray(raw.userSelectedFolders ?? original.userSelectedFolders),
    mountedProjects: normalizeCoworkMountedProjects(raw.mountedProjects ?? original.mountedProjects),
    model: stringValue(raw.model) ?? stringValue(original.model),
    permissionMode: stringValue(raw.permissionMode) ?? stringValue(original.permissionMode),
    repo: repoInfo(raw, cwd),
    scheduledTaskId: stringValue(raw.scheduledTaskId) ?? stringValue(original.scheduledTaskId),
    sessionType: stringValue(raw.sessionType) ?? stringValue(original.sessionType),
    spaceId: stringValue(raw.spaceId) ?? stringValue(original.spaceId),
    connectionState: stringValue(raw.connectionState) ?? stringValue(original.connectionState),
    nextReconnectTime: timestampValue(raw.nextReconnectTime) ?? timestampValue(original.nextReconnectTime),
    origin: stringValue(raw.origin) ?? stringValue(original.origin),
    showRetryButton: booleanValue(raw.showRetryButton) ?? booleanValue(original.showRetryButton),
    statusMessage: stringValue(raw.statusMessage) ?? stringValue(raw.sessionStatusMessage) ?? stringValue(original.statusMessage) ?? stringValue(original.sessionStatusMessage),
    postTurnSummary: normalizePostTurnSummary(raw.postTurnSummary ?? raw.post_turn_summary ?? original.postTurnSummary ?? original.post_turn_summary),
    promptSuggestion: stringValue(raw.promptSuggestion) ?? stringValue(original.promptSuggestion),
    isPinned: Boolean(raw.isStarred),
    isArchived: Boolean(raw.archived ?? raw.isArchived),
    isAgentCompleted: booleanValue(raw.isAgentCompleted) ?? booleanValue(original.isAgentCompleted),
    hasCompleted: booleanValue(raw.hasCompleted) ?? booleanValue(original.hasCompleted),
    error: stringValue(raw.error) ?? stringValue(original.error),
    isRunning: isRunning(raw),
    isUnread: Boolean(raw.isUnread),
    hasWorktree: hasWorktree(raw, original),
    messages: includeMessages ? normalizeMessages(raw.messages) : undefined,
    pendingToolPermissions: normalizePendingToolPermissions(raw.pendingToolPermissions, id),
  };
}

function normalizeCoworkSessionSnapshot(item: unknown): CoworkSessionSnapshot {
  const raw = asRecord(item);
  const original = asRecord(raw._originalSession);
  const normalized = normalizeSession(item, "epitaxy", false);
  const { bufferedMessages: _bufferedMessages, messages: _messages, ...metadata } = normalized;
  return {
    ...metadata,
    bufferedMessages: normalizeCoworkMessageEnvelopes(raw.bufferedMessages ?? original.bufferedMessages),
    messages: normalizeCoworkMessageEnvelopes(raw.messages ?? original.messages),
    rawBufferedMessages: rawArray(raw.bufferedMessages ?? original.bufferedMessages),
    rawMessages: rawArray(raw.messages ?? original.messages),
    rawSession: item,
  };
}

function normalizeCoworkMessageEnvelopes(value: unknown): CoworkMessageEnvelope[] {
  if (!Array.isArray(value)) return [];
  return value.map((message, index) => {
    const raw = asRecord(message);
    const nestedMessage = asRecord(raw.message);
    const author = stringValue(raw.author);
    const rawRole = stringValue(raw.role) ?? stringValue(nestedMessage.role);
    const rawType = stringValue(raw.type);
    const role = rawRole === "assistant" || rawRole === "system"
      ? rawRole
      : author === "assistant" || rawType === "assistant" || rawType === "result"
        ? "assistant"
        : author === "system" || rawType === "system" || rawType === "error"
          ? "system"
          : "user";
    return {
      createdAt: stringValue(raw.createdAt) ?? stringValue(raw.timestamp) ?? new Date().toISOString(),
      id: stringValue(raw.id) ?? stringValue(raw.uuid) ?? stringValue(raw.message_id) ?? `cowork_msg_${index}`,
      raw: message,
      role,
      text: messageText(raw),
    };
  });
}

function normalizeCoworkSpaces(items: unknown): CoworkSpaceSummary[] {
  const spaces: CoworkSpaceSummary[] = [];
  for (const item of Array.isArray(items) ? items : []) {
    const raw = asRecord(item);
    const id = stringValue(raw.id) ?? stringValue(raw.uuid);
    if (!id) continue;
    spaces.push({
      id,
      name: stringValue(raw.name) ?? stringValue(raw.title) ?? "Untitled project",
      updatedAtMs: timestampValue(raw.updatedAt) ?? timestampValue(raw.updated_at) ?? Date.now(),
      isStarred: booleanValue(raw.isStarred) ?? booleanValue(raw.starred),
      sessionIds: normalizeStringArray(raw.sessionIds ?? raw.session_ids),
    });
  }
  return spaces.sort((left, right) => right.updatedAtMs - left.updatedAtMs);
}

function normalizePostTurnSummary(value: unknown): SessionSummary["postTurnSummary"] {
  const raw = asRecord(value);
  if (Object.keys(raw).length === 0) return undefined;
  return {
    title: stringValue(raw.title),
    description: stringValue(raw.description),
    statusCategory: stringValue(raw.statusCategory) ?? stringValue(raw.status_category),
    statusDetail: stringValue(raw.statusDetail) ?? stringValue(raw.status_detail),
    recentAction: stringValue(raw.recentAction) ?? stringValue(raw.recent_action),
    needsAction: stringValue(raw.needsAction) ?? stringValue(raw.needs_action),
    isNoteworthy: booleanValue(raw.isNoteworthy) ?? booleanValue(raw.is_noteworthy),
  };
}

function normalizeCoworkMountedProjects(value: unknown): CoworkMountedProject[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const projects = value
    .map((item) => {
      const raw = asRecord(item);
      const hostPath = stringValue(raw.hostPath) ?? stringValue(raw.host_path) ?? stringValue(raw.path);
      if (!hostPath) return null;
      return {
        uuid: stringValue(raw.uuid) ?? stringValue(raw.id) ?? hostPath,
        name: stringValue(raw.name) ?? basename(hostPath) ?? hostPath,
        hostPath,
      };
    })
    .filter((project): project is CoworkMountedProject => Boolean(project));
  return projects.length > 0 ? projects : undefined;
}

async function enrichSessionWithGitInfo(session: SessionSummary, raw?: RawLocalSessionsBridge): Promise<SessionSummary> {
  const gitInfo = await raw?.getGitInfo?.(session.id).catch(() => undefined);
  const git = asRecord(gitInfo);
  const root = stringValue(git.root);
  const cwd = stringValue(git.cwd);
  const branch = stringValue(git.branch);
  const usableCwd = looksLikePath(cwd) ? cwd : session.cwd;
  const repoName = basename(root) ?? basename(usableCwd);

  if (!usableCwd && !repoName && !branch) return session;

  return {
    ...session,
    cwd: usableCwd,
    repo: {
      ...session.repo,
      name: session.repo?.name ?? repoName,
      branch: session.repo?.branch ?? branch,
    },
  };
}

function looksLikePath(value?: string): boolean {
  return Boolean(value && (/^(\/|~\/|[A-Za-z]:[\\/])/.test(value) || value.includes("/")));
}

function titleFromStartPrompt(prompt: string, targetKind: SessionSummary["kind"]) {
  const visiblePrompt = prompt.replace(/<uploaded_files>[\s\S]*?<\/uploaded_files>\s*/g, "").trim();
  return visiblePrompt.split("\n")[0] || (targetKind === "code" ? "General coding session" : "New session");
}

function toStartPayload(input: StartSessionInput, targetKind: SessionSummary["kind"]): Record<string, unknown> {
  const cwd = input.workspace.cwd;
  const selectedFolders = input.userSelectedFolders?.length ? input.userSelectedFolders : cwd ? [cwd] : [];
  const permissionMode = input.permissionMode === "bypass" ? "bypassPermissions" : input.permissionMode ?? "default";
  const message = input.message ?? input.prompt;
  return {
    kind: targetKind,
    message,
    prompt: input.prompt,
    sessionId: input.sessionId,
    cwd,
    effort: input.effort,
    folders: selectedFolders,
    messageUuid: input.messageUuid,
    model: input.model,
    scheduledTaskId: input.scheduledTaskId,
    skipRedirect: input.skipRedirect,
    origin: input.origin,
    userSelectedFiles: input.userSelectedFiles?.length ? input.userSelectedFiles : undefined,
    userSelectedFolders: selectedFolders.length ? selectedFolders : undefined,
    mountedProjects: input.mountedProjects?.length ? input.mountedProjects : undefined,
    permissionMode,
    sourceBranch: input.sourceBranch,
    title: input.title ?? titleFromStartPrompt(message, targetKind),
    useWorktree: input.useWorktree,
    worktreeName: input.worktreeName,
  };
}

function normalizeTrustResult(value: unknown): WorkspaceTrustResult {
  const raw = asRecord(value);
  return {
    remote: booleanValue(raw.remote),
    sources: Array.isArray(raw.sources) ? raw.sources.filter((item): item is string => typeof item === "string") : [],
    trusted: booleanValue(raw.trusted) ?? true,
  };
}

function normalizeLocalBranches(value: unknown): GitCommandResult | string[] {
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === "string");
  return normalizeGitCommandResult(value);
}

function normalizeEnvironmentMap(value: unknown): Record<string, string> {
  const raw = asRecord(value);
  const env = asRecord(raw.env ?? value);
  return Object.fromEntries(
    Object.entries(env).filter((entry): entry is [string, string] => (
      typeof entry[0] === "string" && typeof entry[1] === "string"
    )),
  );
}

function normalizeMessages(value: unknown): ChatMessage[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((message, index) => {
    const raw = asRecord(message);
    const author = stringValue(raw.author);
    const nestedMessage = asRecord(raw.message);
    const rawRole = stringValue(raw.role) ?? stringValue(nestedMessage.role);
    const rawType = stringValue(raw.type);
    const role = rawRole === "assistant" || rawRole === "system"
      ? rawRole
      : author === "assistant"
        ? "assistant"
        : author === "system"
          ? "system"
          : rawType === "assistant" || rawType === "result"
            ? "assistant"
            : rawType === "system" || rawType === "error"
              ? "system"
          : "user";
    const createdAt = stringValue(raw.createdAt) ?? stringValue(raw.timestamp) ?? new Date().toISOString();
    return {
      id: stringValue(raw.id) ?? stringValue(raw.uuid) ?? stringValue(raw.message_id) ?? `msg_${index}`,
      role,
      text: messageText(raw),
      createdAt,
      raw: message,
    };
  });
}

function normalizePendingToolPermissions(value: unknown, fallbackSessionId: string): SessionSummary["pendingToolPermissions"] {
  if (!Array.isArray(value)) return undefined;
  type PendingToolPermission = NonNullable<SessionSummary["pendingToolPermissions"]>[number];
  return value
    .map<PendingToolPermission | null>((item) => {
      const raw = asRecord(item);
      const requestId = stringValue(raw.requestId) ?? stringValue(raw.request_id) ?? stringValue(raw.toolUseId) ?? stringValue(raw.tool_use_id);
      if (!requestId) return null;
      return {
        alwaysAllowScope: stringValue(raw.alwaysAllowScope) ?? stringValue(raw.always_allow_scope) ?? stringValue(raw.permissionScope) ?? stringValue(raw.permission_scope),
        decisionReason: stringValue(raw.decisionReason) ?? stringValue(raw.decision_reason),
        description: stringValue(raw.description),
        hasAlwaysAllow: booleanValue(raw.hasAlwaysAllow) ?? booleanValue(raw.has_always_allow),
        input: raw.input,
        requestId,
        sessionId: stringValue(raw.sessionId) ?? stringValue(raw.session_id) ?? fallbackSessionId,
        suggestions: raw.suggestions,
        toolName: stringValue(raw.toolName) ?? stringValue(raw.tool_name) ?? "Tool",
        toolUseId: stringValue(raw.toolUseId) ?? stringValue(raw.tool_use_id) ?? requestId,
      };
    })
    .filter((request): request is PendingToolPermission => Boolean(request));
}

function messageText(raw: Record<string, unknown>): string {
  const direct = stringValue(raw.text) ?? stringValue(raw.content) ?? stringValue(raw.result) ?? stringValue(raw.error);
  if (direct) return direct;
  const nestedMessage = asRecord(raw.message);
  const nestedDirect = stringValue(nestedMessage.text) ?? stringValue(nestedMessage.content);
  if (nestedDirect) return nestedDirect;
  const nestedItems = Array.isArray(nestedMessage.content) ? nestedMessage.content : [];
  const nestedText = transcriptItemsText(nestedItems);
  if (nestedText) return nestedText;
  const items = Array.isArray(raw.items) ? raw.items : Array.isArray(raw.content) ? raw.content : [];
  return transcriptItemsText(items);
}

function transcriptItemsText(items: unknown[]): string {
  return items
    .map((item) => {
      const record = asRecord(item);
      const kind = stringValue(record.kind) ?? stringValue(record.type);
      if (kind === "text" || kind === "error") {
        return stringValue(record.text) ?? stringValue(record.content);
      }
      if (kind === "bash") {
        const command = stringValue(record.command);
        const output = stringValue(record.output);
        return [command ? `$ ${command}` : undefined, output].filter(Boolean).join("\n");
      }
      if (kind === "event") return stringValue(record.content);
      return undefined;
    })
    .filter((text): text is string => Boolean(text))
    .join("\n\n");
}


function normalizeGitCommandResult(value: unknown): GitCommandResult {
  if (typeof value === "string") return { ok: true, success: true, stdout: value, stderr: "" };
  const raw = asRecord(value);
  return {
    ok: raw.ok === true || raw.success === true,
    success: raw.success === true || raw.ok === true,
    stdout: stringValue(raw.stdout) ?? "",
    stderr: stringValue(raw.stderr) ?? "",
    error: stringValue(raw.error),
    code: raw.code,
  };
}

function normalizeSupportedCommands(value: unknown): SlashCommand[] {
  if (!Array.isArray(value)) return [];
  const commands: SlashCommand[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    const raw = asRecord(item);
    const name = typeof item === "string" ? item : stringValue(raw.name) ?? stringValue(raw.command) ?? stringValue(raw.label);
    const normalizedName = name?.replace(/^\/+/, "").trim();
    if (!normalizedName || seen.has(normalizedName)) continue;
    seen.add(normalizedName);
    const aliases = Array.isArray(raw.aliases) ? raw.aliases.filter((alias): alias is string => typeof alias === "string" && alias.length > 0) : undefined;
    commands.push({
      aliases,
      argumentHint: stringValue(raw.argumentHint) ?? stringValue(raw.argument_hint),
      description: stringValue(raw.description) ?? stringValue(raw.skillDescription) ?? stringValue(raw.skill_description),
      name: normalizedName,
      scope: stringValue(raw.scope),
    });
  }
  return commands;
}

function normalizeCodeStats(value: unknown): CodeStats | null {
  if (!value) return null;
  const raw = asRecord(value);
  const dailyActivity = Array.isArray(raw.dailyActivity)
    ? raw.dailyActivity.map((item) => {
      const entry = asRecord(item);
      return {
        date: stringValue(entry.date) ?? new Date().toISOString().slice(0, 10),
        messageCount: numberValue(entry.messageCount),
        sessionCount: numberValue(entry.sessionCount),
        toolCallCount: numberValue(entry.toolCallCount),
      };
    })
    : [];
  const dailyModelTokens = Array.isArray(raw.dailyModelTokens)
    ? raw.dailyModelTokens.map((item) => {
      const entry = asRecord(item);
      return {
        date: stringValue(entry.date) ?? new Date().toISOString().slice(0, 10),
        tokensByModel: numberRecord(entry.tokensByModel),
      };
    })
    : [];
  const rawModelUsage = asRecord(raw.modelUsage);
  const modelUsage: CodeStats["modelUsage"] = {};
  for (const [model, usage] of Object.entries(rawModelUsage)) {
    const item = asRecord(usage);
    modelUsage[model] = {
      cacheCreationInputTokens: numberValue(item.cacheCreationInputTokens),
      cacheReadInputTokens: numberValue(item.cacheReadInputTokens),
      inputTokens: numberValue(item.inputTokens),
      outputTokens: numberValue(item.outputTokens),
    };
  }
  const streaks = asRecord(raw.streaks);
  return {
    dailyActivity,
    dailyModelTokens,
    modelUsage,
    peakActivityHour: raw.peakActivityHour === null ? null : numberValue(raw.peakActivityHour),
    streaks: {
      currentStreak: numberValue(streaks.currentStreak),
      longestStreak: numberValue(streaks.longestStreak),
    },
  };
}

function normalizeOfficialContextUsageResult(value: unknown): ContextUsage | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  if (!("rawMaxTokens" in raw) && !("raw_max_tokens" in raw)) return null;
  return normalizeContextUsage(raw);
}

function normalizeContextUsage(value: unknown): ContextUsage | null {
  if (!value) return null;
  const raw = asRecord(value);
  const totalTokens = numberValue(raw.totalTokens ?? raw.total_tokens);
  return {
    agents: normalizeContextAgentRows(raw.agents),
    cacheCreationInputTokens: numberValue(raw.cacheCreationInputTokens ?? raw.cache_creation_input_tokens),
    cacheReadInputTokens: numberValue(raw.cacheReadInputTokens ?? raw.cache_read_input_tokens),
    categories: normalizeContextCategories(raw.categories),
    inputTokens: numberValue(raw.inputTokens ?? raw.input_tokens),
    mcpTools: normalizeContextMcpToolRows(raw.mcpTools ?? raw.mcp_tools),
    memoryFiles: normalizeContextMemoryRows(raw.memoryFiles ?? raw.memory_files),
    messages: numberValue(raw.messages),
    outputTokens: numberValue(raw.outputTokens ?? raw.output_tokens),
    percentage: raw.percentage === null ? undefined : numberValue(raw.percentage),
    rawMaxTokens: raw.rawMaxTokens === null || raw.raw_max_tokens === null ? null : numberValue(raw.rawMaxTokens ?? raw.raw_max_tokens) || null,
    toolCallCount: numberValue(raw.toolCallCount ?? raw.tool_call_count),
    totalTokens,
  };
}

function normalizeContextCategories(value: unknown): ContextUsage["categories"] {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const raw = asRecord(item);
    return {
      name: stringValue(raw.name) ?? "Input",
      tokens: numberValue(raw.tokens),
    };
  }).filter((item) => item.tokens > 0);
}

function normalizeContextMcpToolRows(value: unknown): ContextUsage["mcpTools"] {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const raw = asRecord(item);
    return {
      name: stringValue(raw.name) ?? "",
      serverName: stringValue(raw.serverName ?? raw.server_name) ?? "",
      tokens: numberValue(raw.tokens),
    };
  }).filter((item) => item.name || item.serverName || item.tokens > 0);
}

function normalizeContextMemoryRows(value: unknown): ContextUsage["memoryFiles"] {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const raw = asRecord(item);
    return {
      path: stringValue(raw.path) ?? "",
      tokens: numberValue(raw.tokens),
    };
  }).filter((item) => item.path || item.tokens > 0);
}

function normalizeContextAgentRows(value: unknown): ContextUsage["agents"] {
  if (!Array.isArray(value)) return undefined;
  return value.map((item) => {
    const raw = asRecord(item);
    return {
      agentType: stringValue(raw.agentType ?? raw.agent_type) ?? "",
      tokens: numberValue(raw.tokens),
    };
  }).filter((item) => item.agentType || item.tokens > 0);
}

function normalizeEffort(value: unknown): "low" | "medium" | "high" | "xhigh" | "max" | null {
  return value === "low" || value === "medium" || value === "high" || value === "xhigh" || value === "max" ? value : null;
}

function normalizeShellPtyStartResult(value: unknown, bufferValue: unknown): ShellPtyStartResult {
  const raw = asRecord(value);
  if (value === true || raw.ok === true || raw.success === true) {
    return { ok: true, buffered: stringValue(raw.buffered) ?? String(bufferValue ?? "") };
  }
  return { ok: false, error: stringValue(raw.error) ?? "Failed to start shell" };
}

function normalizeShellPtyEvent(event: unknown): ShellPtyEvent | null {
  const raw = asRecord(event);
  const sessionId = stringValue(raw.sessionId);
  const type = stringValue(raw.type);
  if (!sessionId || !type) return null;
  if (type === "shell_pty_data" || type === "pty-data") {
    return { type: "shell_pty_data", sessionId, data: stringValue(raw.data) ?? "" };
  }
  if (type === "shell_pty_close" || type === "pty-exit") {
    return { type: "shell_pty_close", sessionId, code: raw.code, signal: raw.signal };
  }
  return null;
}

function normalizeScheduledTasks(items: unknown): ScheduledTaskSummary[] {
  return (Array.isArray(items) ? items : []).map(normalizeScheduledTask);
}

function normalizeScheduledTask(item: unknown): ScheduledTaskSummary {
  const raw = asRecord(item);
  const id = stringValue(raw.id) ?? stringValue(raw.name) ?? `task_${Date.now()}`;
  const enabled = raw.enabled === true || raw.status === "enabled";
  return {
    id,
    title: stringValue(raw.title) ?? stringValue(raw.name) ?? id,
    schedule: stringValue(raw.schedule) ?? stringValue(raw.cronExpression) ?? stringValue(raw.cron_expression) ?? "Manual",
    enabled,
    description: stringValue(raw.description),
    prompt: stringValue(raw.prompt),
    cronExpression: stringValue(raw.cronExpression) ?? stringValue(raw.cron_expression),
    cwd: stringValue(raw.cwd),
    nextRunAt: stringValue(raw.nextRunAt) ?? stringValue(raw.next_run_at),
    fireAt: stringValue(raw.fireAt),
    lastRunAt: stringValue(raw.lastRunAt) ?? stringValue(raw.last_run_at),
    useWorktree: Boolean(raw.useWorktree),
    sourceBranch: stringValue(raw.sourceBranch),
    permissionMode: raw.permissionMode as ScheduledTaskSummary["permissionMode"],
    model: stringValue(raw.model),
    approvedPermissions: Array.isArray(raw.approvedPermissions) ? raw.approvedPermissions as Array<{ toolName: string }> : undefined,
    chromeAllowedDomains: Array.isArray(raw.chromeAllowedDomains) ? raw.chromeAllowedDomains.filter((domain): domain is string => typeof domain === "string") : undefined,
    chromePermissionMode: stringValue(raw.chromePermissionMode),
    userSelectedFolders: Array.isArray(raw.userSelectedFolders) ? raw.userSelectedFolders.filter((path): path is string => typeof path === "string") : undefined,
    missedRuns: Array.isArray(raw.missedRuns)
      ? raw.missedRuns.filter((run): run is string | { time: string; reason?: string } => typeof run === "string" || Boolean(asRecord(run).time))
      : undefined,
  };
}

async function getWorkspaceContext(web: RawClaudeWebBridge): Promise<WorkspaceContext> {
  const [codeSessionsRaw, agentSessionsRaw, codeProjectsRaw, agentProjectsRaw] = await Promise.all([
    web.LocalSessions?.getAll?.().catch(() => []),
    web.LocalAgentModeSessions?.getAll?.().catch(() => []),
    (web.LocalSessions?.getDetectedProjects?.() ?? Promise.resolve([])).catch(() => []),
    (web.LocalAgentModeSessions?.getDetectedProjects?.() ?? Promise.resolve([])).catch(() => []),
  ]);
  const sessions = [
    ...normalizeSessionList(codeSessionsRaw, "code"),
    ...normalizeSessionList(agentSessionsRaw, "epitaxy"),
  ];
  const detectedProjects = [
    ...normalizeDetectedProjectList(codeProjectsRaw, "code"),
    ...normalizeDetectedProjectList(agentProjectsRaw, "epitaxy"),
  ];
  const current = sessions.find((session) => session.cwd)
    ?? detectedProjects.find((project) => project.cwd)
    ?? sessions[0]
    ?? detectedProjects[0];
  return current ? {
    mode: "local",
    projectName: current.repo?.name ?? basename(current.cwd) ?? emptyWorkspace.projectName,
    branchName: current.repo?.branch ?? emptyWorkspace.branchName,
    hasWorktree: Boolean(current.hasWorktree),
    cwd: current.cwd,
  } : emptyWorkspace;
}

function normalizePreferences(value: unknown): DesktopPreferences {
  return asRecord(value) as DesktopPreferences;
}

function repoInfo(raw: Record<string, unknown>, cwd?: string): SessionSummary["repo"] {
  const repo = asRecord(raw.repoInfo) ?? asRecord(raw.repo);
  const name = stringValue(repo?.name) ?? basename(cwd);
  const owner = stringValue(asRecord(repo?.owner)?.login) ?? stringValue(repo?.owner);
  const branch = stringValue(repo?.branch) ?? stringValue(raw.branch) ?? stringValue(raw.sourceBranch);
  return {
    name: owner && name ? `${owner}/${name}` : name,
    branch,
  };
}

function isRunning(raw: Record<string, unknown>): boolean {
  if (typeof raw.isRunning === "boolean") return raw.isRunning;
  if (raw.stopped === true) return false;
  const status = stringValue(raw.sessionStatus) ?? stringValue(raw.visibility);
  return status === "running" || status === "pending" || status === "requires_action";
}

function hasWorktree(raw: Record<string, unknown>, original: Record<string, unknown>): boolean {
  if (typeof raw.hasWorktree === "boolean") return raw.hasWorktree;
  if (typeof original.hasWorktree === "boolean") return original.hasWorktree;
  if (typeof raw.useWorktree === "boolean") return raw.useWorktree;
  if (typeof original.useWorktree === "boolean") return original.useWorktree;
  return Boolean(stringValue(raw.worktreeName) ?? stringValue(original.worktreeName) ?? stringValue(raw.worktreePath) ?? stringValue(original.worktreePath));
}

function firstMessageText(value: unknown): string | undefined {
  if (!Array.isArray(value)) return undefined;
  const first = asRecord(value[0]);
  return stringValue(first?.text) ?? stringValue(first?.content);
}

function firstString(value: unknown): string | undefined {
  return Array.isArray(value) ? value.find((item): item is string => typeof item === "string" && item.length > 0) : undefined;
}

function timestampValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || value.length === 0) return undefined;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function relativeLabel(timestamp: number): string {
  const delta = Date.now() - timestamp;
  if (delta < 60_000) return "刚刚";
  if (delta < 86_400_000) return "今天";
  if (delta < 172_800_000) return "昨天";
  return new Date(timestamp).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
}

function basename(value?: string): string | undefined {
  if (!value) return undefined;
  return value.split(/[\\/]/).filter(Boolean).at(-1);
}

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function normalizeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.length > 0) : [];
}

function rawArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function normalizeLocalFileEntries(value: unknown, parentPath: string): LocalFileEntry[] {
  const entries: LocalFileEntry[] = [];
  for (const item of Array.isArray(value) ? value : []) {
    if (typeof item === "string" && item.length > 0) {
      entries.push({ name: basename(item) ?? item, path: item, isFile: true, isDirectory: false });
      continue;
    }
    const raw = asRecord(item);
    const entryPath = stringValue(raw.path) ?? joinPath(parentPath, stringValue(raw.name));
    const name = stringValue(raw.name) ?? basename(entryPath);
    if (!entryPath || !name) continue;
    const isDirectory = Boolean(raw.isDirectory ?? raw.directory ?? (raw.type === "directory" || raw.kind === "directory"));
    entries.push({
      name,
      path: entryPath,
      isDirectory,
      isFile: Boolean(raw.isFile ?? raw.file ?? !isDirectory),
      modifiedAt: stringValue(raw.modifiedAt) ?? stringValue(raw.mtime),
      size: typeof raw.size === "number" && Number.isFinite(raw.size) ? raw.size : undefined,
    });
  }
  return entries;
}

function joinPath(parentPath: string, name?: string) {
  if (!name) return undefined;
  if (/^(\/|~\/|[A-Za-z]:[\\/])/.test(name)) return name;
  const separator = parentPath.includes("\\") && !parentPath.includes("/") ? "\\" : "/";
  return `${parentPath.replace(/[\\/]+$/, "")}${separator}${name}`;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function numberRecord(value: unknown): Record<string, number> {
  const raw = asRecord(value);
  const result: Record<string, number> = {};
  for (const [key, item] of Object.entries(raw)) result[key] = numberValue(item);
  return result;
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}
