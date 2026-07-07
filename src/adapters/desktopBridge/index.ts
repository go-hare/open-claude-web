import { fakeDesktopBridge } from "./fakeDesktopBridge";
import { createDesktopBridgeFromOfficialNamespaces, type RawClaudeSettingsBridge, type RawClaudeWebBridge } from "./officialBridgeAdapter";
import type { DesktopBridge } from "./types";

declare global {
  interface Window {
    claudeDesktopBridge?: DesktopBridge;
    "claude.web"?: RawClaudeWebBridge;
    "claude.settings"?: RawClaudeSettingsBridge;
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
  ?? (officialWebBridge ? createDesktopBridgeFromOfficialNamespaces(officialWebBridge, window["claude.settings"]) : fakeDesktopBridge);

export type {
  CodeStats,
  ContextUsage,
  DesktopBridge,
  DesktopPreferences,
  CreateScheduledTaskInput,
  EffortLevel,
  PermissionMode,
  ScheduledTaskSummary,
  SessionSummary,
  WorkspaceContext,
} from "./types";
