import { createContext, useContext } from "react";
import type { LocalSessionsBridge } from "../../../../adapters/desktopBridge/types";

export type CoworkFileTarget = { line?: number; path: string; title?: string };

export type CoworkTranscriptActionsValue = {
  bridge: LocalSessionsBridge;
  onNavigate: (path: string) => void;
  openFile: (target: CoworkFileTarget) => void;
  reload: () => Promise<void>;
  sessionId: string;
};

export const CoworkTranscriptActions = createContext<CoworkTranscriptActionsValue | null>(null);

export function useCoworkTranscriptActions() {
  return useContext(CoworkTranscriptActions);
}
