/**
 * Official claude.settings residual bridges used by personal Desktop settings:
 * MCP (cadc35a07 Developer) + Extensions (c71860c77-CrCPjj7D).
 * Reads window["claude.settings"] — same preload surface as official ut / EW hooks.
 */

/**
 * Official getMcpServersConfigWithStatus residual (cadc35a07):
 * flat map key → { command, args?, env?, extensionId?, status?, error?, ... }.
 * Nested `{ config }` also accepted for older bridge shapes.
 */
export type McpServerStatusEntry = {
  args?: string[];
  command?: string;
  config?: unknown;
  env?: Record<string, string>;
  error?: string;
  extensionId?: string;
  status?: string;
  [key: string]: unknown;
};

export type McpSettingsBridge = {
  getMcpServersConfig?: () => Promise<Record<string, unknown>>;
  getMcpServersConfigWithStatus?: () => Promise<Record<string, McpServerStatusEntry>>;
  isLocalDevMcpEnabled?: () => Promise<boolean>;
  revealConfig?: () => Promise<boolean | void>;
  revealLogs?: () => Promise<boolean | void>;
  /** Official I / revealServerLog(serverName). */
  revealServerLog?: (serverName: string) => Promise<boolean | void>;
  setMcpServerConfigs?: (config: Record<string, unknown>) => Promise<unknown>;
  onMcpConfigChange?: (listener: (config: Record<string, unknown>) => void) => () => void;
  /** Official: (serverName, status, error?) => void */
  onMcpStatusChanged?: (
    listener: (serverName: string, status: string, error?: string | null) => void,
  ) => () => void;
};

export type InstalledExtensionState = {
  displayName?: string;
  id: string;
  manifest?: {
    description?: string;
    name?: string;
    version?: string;
    [key: string]: unknown;
  };
  path?: string;
  settings?: {
    isEnabled?: boolean;
    orgBlockedReason?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type ExtensionsSettingsBridge = {
  deleteExtension?: (extensionId: string) => Promise<boolean>;
  /** Official cf4f70727 advanced Detected tools residual. */
  getAvailableExtensionRuntimes?: () => Promise<
    Array<{
      builtInVersion?: string | null;
      name?: string;
      versions?: string[];
      [key: string]: unknown;
    }>
  >;
  getInstalledExtensionsWithState?: () => Promise<InstalledExtensionState[]>;
  handleDxtFile?: (dxtPath: string) => Promise<void>;
  installDxt?: (extensionId: string | null, dxtPath: string) => Promise<string | null>;
  installDxtUnpacked?: (folderPath: string) => Promise<string | null>;
  isDesktopExtensionDirectoryEnabled?: () => Promise<boolean>;
  isDirectoryEnabled?: () => Promise<boolean>;
  isExtensionsEnabled?: () => Promise<boolean>;
  openExtensionSettingsFolder?: () => Promise<boolean | void>;
  openExtensionsFolder?: () => Promise<boolean | void>;
  setExtensionSettings?: (
    extensionId: string,
    patch: Record<string, unknown>,
  ) => Promise<boolean | void>;
  showInstallDxtDialog?: () => Promise<void>;
  showExtensionInFolder?: (extensionId: string) => Promise<boolean | void>;
  onExtensionsChanged?: (listener: () => void) => () => void;
};

/** Official fA (shared-0): `claude.settings.Custom3pUsage.getSummary(windowDays)`. */
export type Custom3pUsageSurface = {
  costUSD?: number;
  inputTokens: number;
  outputTokens: number;
  webSearchRequests: number;
};

export type Custom3pUsageBar = {
  start: string;
  chat: Custom3pUsageSurface;
  cowork: Custom3pUsageSurface;
  code: Custom3pUsageSurface;
};

export type Custom3pUsageSummary = {
  bars: Custom3pUsageBar[];
  bucketDays: number;
  cap?: { cap: number; used: number; windowHours: number; windowStartMs: number } | null;
  cost?: { basis?: "list" | "managed" | "mixed"; unpricedTurns: number } | null;
  errorTurns?: number;
  generatedAtMs?: number;
  surfaces: {
    chat: Custom3pUsageSurface;
    cowork: Custom3pUsageSurface;
    code: Custom3pUsageSurface;
  };
  turns: number;
  windowDays?: number;
};

export type Custom3pUsageBridge = {
  getSummary?: (windowDays: number) => Promise<Custom3pUsageSummary | null>;
};

/** Official QI residual (shared-23 eL). */
export type HistoryImportCapabilities = {
  cliUpdateRequired: boolean;
  hasImportableSessions: boolean;
  hostLoopRequired: boolean;
  local1PSessionCount: number;
  localSessions: boolean;
  localZip: boolean;
  promptBanner: string;
  promptBannerMaxDismissals?: number;
  remotePull: boolean;
  remotePullConfigured: boolean;
  sessionExport: boolean;
  showSettingsPage?: boolean;
};

export type HistoryImportBridge = {
  getImportCapabilities?: () => Promise<HistoryImportCapabilities>;
  getImportHistory?: () => Promise<unknown[]>;
};

export type DesktopInfoBridge = {
  getSystemInfo?: () => Promise<{
    appVersion?: string;
    userData?: string;
    logs?: string;
    [key: string]: unknown;
  } | null | undefined>;
  showLogsInFileManager?: () => Promise<boolean | void>;
};

type ClaudeSettingsRoot = {
  Custom3pUsage?: Custom3pUsageBridge;
  DesktopInfo?: DesktopInfoBridge;
  Extensions?: ExtensionsSettingsBridge;
  HistoryImport?: HistoryImportBridge;
  MCP?: McpSettingsBridge;
};

function settingsRoot(): ClaudeSettingsRoot | undefined {
  if (typeof window === "undefined") return undefined;
  return (window as Window & { "claude.settings"?: ClaudeSettingsRoot })["claude.settings"];
}

export function mcpSettingsBridge(): McpSettingsBridge | undefined {
  return settingsRoot()?.MCP;
}

export function extensionsSettingsBridge(): ExtensionsSettingsBridge | undefined {
  return settingsRoot()?.Extensions;
}

export function custom3pUsageBridge(): Custom3pUsageBridge | undefined {
  return settingsRoot()?.Custom3pUsage;
}

export function desktopInfoBridge(): DesktopInfoBridge | undefined {
  return settingsRoot()?.DesktopInfo;
}

export function historyImportBridge(): HistoryImportBridge | undefined {
  return settingsRoot()?.HistoryImport;
}

/** Electron File may expose absolute path for drop/install residual. */
export function fileSystemPath(file: File): string | null {
  const path = (file as File & { path?: unknown }).path;
  return typeof path === "string" && path.length > 0 ? path : null;
}
