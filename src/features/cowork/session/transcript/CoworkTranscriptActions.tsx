import { createContext, useContext } from "react";
import type { CoworkSessionsBridge } from "../../../../adapters/desktopBridge/types";

/**
 * Official SELECT_FILE payload + optional streaming/inline content for Gzt short-circuit.
 * messageId/fileUuid match gle SELECT_FILE fields.
 */
export type CoworkFileTarget = {
  /** Inline text when disk read is unavailable (tool file_text / streamingFile content). */
  content?: string;
  fileUuid?: string;
  line?: number;
  messageId?: string;
  path: string;
  title?: string;
  toolType?: string;
};

export type CoworkTranscriptActionsValue = {
  bridge: CoworkSessionsBridge;
  onNavigate: (path: string) => void;
  openFile: (target: CoworkFileTarget) => void;
  reload: () => Promise<void>;
  sessionId: string;
};

export const CoworkTranscriptActions = createContext<CoworkTranscriptActionsValue | null>(null);

export function useCoworkTranscriptActions() {
  return useContext(CoworkTranscriptActions);
}
