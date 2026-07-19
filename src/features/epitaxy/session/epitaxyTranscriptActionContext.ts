/**
 * Shared transcript / side-pane action context for epitaxy session detail.
 * Extracted from EpitaxySessionTile so side panes can open file/plan/tasks without circular imports.
 */
import { createContext } from "react";
import type { LocalSessionsBridge } from "../../../adapters/desktopBridge/types";
import type { OfficialFileViewTarget } from "./OfficialFilePane";
import type { OfficialPreviewTarget } from "./OfficialPreviewPane";

export type EpitaxySessionType = "local" | "remote" | "bridge";

export type EpitaxySessionRef = {
  id: string;
  type: EpitaxySessionType;
};

export type OfficialSubagentTarget = {
  description: string;
  toolUseId: string;
};

export type EpitaxyTranscriptActionContextValue = {
  /** Official onAttachAsContext: insert message/selection text into the session composer. */
  attachAsContext?: (text: string) => void;
  bridge: LocalSessionsBridge;
  /** Official yt / Yr cancelQueued — drop mid-turn queued user bubble. */
  cancelQueuedMessage?: (uuid: string) => void;
  openFile: (target: OfficialFileViewTarget) => void;
  /** Official Wk onOpenPlan → setSidePane("plan") (c11959232). */
  openPlan: () => void;
  openPreview: (target: OfficialPreviewTarget) => void;
  openSubagent: (target: OfficialSubagentTarget) => void;
  openTasks: () => void;
  onNavigate: (path: string) => void;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  sessionId?: string;
};

export const EpitaxyTranscriptActionContext = createContext<EpitaxyTranscriptActionContextValue | null>(null);
