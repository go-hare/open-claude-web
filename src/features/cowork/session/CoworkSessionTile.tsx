import type { PaneSlot } from "../../../stores/paneStore";
import { CoworkSessionView } from "./CoworkSessionView";

export function CoworkSessionTile({ onNavigate, sessionId }: { isLonePane?: boolean; onClose?: () => void; onMovePane?: (slot: PaneSlot) => void; onNavigate: (path: string) => void; paneIndex?: number; sessionId: string; slot?: PaneSlot }) {
  return <CoworkSessionView onNavigate={onNavigate} sessionId={sessionId} />;
}
