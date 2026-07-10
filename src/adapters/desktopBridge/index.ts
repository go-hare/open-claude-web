import { fakeDesktopBridge } from "./fakeDesktopBridge";
import { createDesktopBridgeFromOfficialNamespaces, type RawClaudeOfficeAddinBridge, type RawClaudeSettingsBridge, type RawClaudeWebBridge } from "./officialBridgeAdapter";
import type { DesktopBridge } from "./types";

declare global {
  interface Window {
    claudeDesktopBridge?: DesktopBridge;
    "claude.web"?: RawClaudeWebBridge;
    "claude.settings"?: RawClaudeSettingsBridge;
    "claude.officeAddin"?: RawClaudeOfficeAddinBridge;
    process?: {
      versions?: Record<string, string | undefined>;
    };
  }
}

const officialWebBridge = window["claude.web"];
const isElectronRenderer =
  Boolean(window.process?.versions?.electron)
  || /\bElectron\//.test(navigator.userAgent);

export const desktopBridgeMode = officialWebBridge
  ? "official"
  : window.claudeDesktopBridge
    ? "custom"
    : isElectronRenderer
      ? "missing"
      : "fake";

export const isDesktopBridgeMissingInElectron = desktopBridgeMode === "missing";

export const desktopBridge: DesktopBridge = window.claudeDesktopBridge
  ?? (officialWebBridge ? createDesktopBridgeFromOfficialNamespaces(officialWebBridge, window["claude.settings"], window["claude.officeAddin"]) : fakeDesktopBridge);

export type {
  BrowserUseBridge,
  CodeStats,
  ConnectedBrowser,
  ConnectedOfficeFile,
  ContextUsage,
  CoworkSpaceSummary,
  CoworkMountedProject,
  DesktopBridge,
  DesktopPreferences,
  CreateScheduledTaskInput,
  EffortLevel,
  FileSystemBridge,
  LocalEnvironmentVariables,
  LocalSessionEnvironmentBridge,
  PermissionMode,
  ScheduledTaskSummary,
  SendMessageInput,
  SessionSummary,
  WorkspaceTrustResult,
  WorkspaceContext,
} from "./types";
