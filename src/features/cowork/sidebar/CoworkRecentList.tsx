import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { FrameStore } from "../../../stores/frameStore";
import { CoworkSessionRow } from "./CoworkSessionRow";
import type { CoworkRowAction } from "./CoworkSessionMenus";

type CoworkRecentListProps = {
  frame: FrameStore;
  sessions: SessionSummary[];
  onAction: (session: SessionSummary, action: CoworkRowAction) => void;
  onNavigate: (path: string) => void;
  selectedSessionId: string | null;
};

export function CoworkRecentList(props: CoworkRecentListProps) {
  return props.sessions.map((session) => <CoworkRecentRow key={session.id} {...props} session={session} />);
}

function CoworkRecentRow({ frame, onAction, onNavigate, selectedSessionId, session }: CoworkRecentListProps & { session: SessionSummary }) {
  return <CoworkSessionRow frame={frame} onAction={onAction} onNavigate={onNavigate} selected={session.id === selectedSessionId} session={session} />;
}
