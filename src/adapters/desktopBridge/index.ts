import { fakeDesktopBridge } from "./fakeDesktopBridge";
import { createDesktopBridgeFromOfficialNamespaces, type RawClaudeSettingsBridge, type RawClaudeWebBridge } from "./officialBridgeAdapter";
import type { DesktopBridge } from "./types";

declare global {
  interface Window {
    claudeDesktopBridge?: DesktopBridge;
    "claude.web"?: RawClaudeWebBridge;
    "claude.settings"?: RawClaudeSettingsBridge;
  }
}

const officialWebBridge = window["claude.web"];

export const desktopBridge: DesktopBridge = window.claudeDesktopBridge
  ?? (officialWebBridge ? createDesktopBridgeFromOfficialNamespaces(officialWebBridge, window["claude.settings"]) : fakeDesktopBridge);

export type {
  DesktopBridge,
  DesktopPreferences,
  CreateScheduledTaskInput,
  ScheduledTaskSummary,
  SessionSummary,
  WorkspaceContext,
} from "./types";
