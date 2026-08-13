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

export type PreviewAnnotationAttach = {
  /** Official qy push residual fields. */
  name: string;
  dataUrl: string;
  contextNote?: string;
};

export type EpitaxyTranscriptActionContextValue = {
  /** Official onAttachAsContext: insert message/selection text into the session composer. */
  attachAsContext?: (text: string) => void;
  /**
   * Official qy.push residual for preview-annotation.png.
   * Stages into the session composer (ExistingSessionComposer drains → cn.images);
   * does NOT send a turn — user must hit Send (with optional contextNote on submit).
   */
  attachPreviewAnnotation?: (payload: PreviewAnnotationAttach) => void | Promise<void>;
  bridge: LocalSessionsBridge;
  /** Official yt / Yr cancelQueued — drop mid-turn queued user bubble. */
  cancelQueuedMessage?: (uuid: string) => void;
  /**
   * Official H busy gate: onRewindToMessage disabled while responding
   * (`!ue || H || xn ? void 0 : $a`).
   */
  isResponding?: boolean;
  openFile: (target: OfficialFileViewTarget) => void;
  /** Official Wk onOpenPlan → setSidePane("plan") (c11959232). */
  openPlan: () => void;
  openPreview: (target: OfficialPreviewTarget) => void;
  openSubagent: (target: OfficialSubagentTarget) => void;
  openTasks: () => void;
  onNavigate: (path: string) => void;
  reload: (options?: { silent?: boolean }) => Promise<void>;
  /**
   * Official session type gate: rewind local-only (`"local" !== e.type` → null).
   * Fork may still be available when bridge.forkSession exists.
   */
  sessionRef?: EpitaxySessionRef | null;
  sessionId?: string;
  /**
   * Official $a / xt: set composer plain text + focus after rewind (prefill prompt).
   */
  setComposerText?: (text: string) => void;
  /**
   * Official mc submitToChat residual (c119 Preview Set up / start-failed).
   * Sends a user turn immediately — not composer-only attach.
   */
  submitToChat?: (text: string) => void | Promise<void>;
};

export const EpitaxyTranscriptActionContext = createContext<EpitaxyTranscriptActionContextValue | null>(null);
