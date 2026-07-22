/**
 * Official claude.settings residual bridges used by personal Desktop settings:
 * MCP (cadc35a07 Developer) + Extensions (c71860c77-CrCPjj7D).
 * Reads window["claude.settings"] — same preload surface as official ut / EW hooks.
 */

export type McpServerStatusEntry = {
  config?: unknown;
  error?: string;
  status?: string;
  [key: string]: unknown;
};

export type McpSettingsBridge = {
  getMcpServersConfig?: () => Promise<Record<string, unknown>>;
  getMcpServersConfigWithStatus?: () => Promise<Record<string, McpServerStatusEntry>>;
  isLocalDevMcpEnabled?: () => Promise<boolean>;
  revealConfig?: () => Promise<boolean | void>;
  revealLogs?: () => Promise<boolean | void>;
  setMcpServerConfigs?: (config: Record<string, unknown>) => Promise<unknown>;
  onMcpConfigChange?: (listener: (config: Record<string, unknown>) => void) => () => void;
  onMcpStatusChanged?: (listener: (...args: unknown[]) => void) => () => void;
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

type ClaudeSettingsRoot = {
  Extensions?: ExtensionsSettingsBridge;
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

/** Electron File may expose absolute path for drop/install residual. */
export function fileSystemPath(file: File): string | null {
  const path = (file as File & { path?: unknown }).path;
  return typeof path === "string" && path.length > 0 ? path : null;
}
