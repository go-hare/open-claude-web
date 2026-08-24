import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { FrameStore } from "../../../stores/frameStore";
import type { CoworkRecentItem } from "./coworkSidebarModel";
import { CoworkSessionRow } from "./CoworkSessionRow";
import type { CoworkRowAction } from "./CoworkSessionMenus";
import { CoworkSpaceSessionRow } from "./CoworkSpacesSection";

type CoworkRecentListProps = {
  frame: FrameStore;
  items: CoworkRecentItem[];
  onAction: (session: SessionSummary, action: CoworkRowAction) => void;
  onNavigate: (path: string) => void;
  selectedSessionId: string | null;
  selectedSpaceId: string | null;
};

export function CoworkRecentList(props: CoworkRecentListProps) {
  return props.items.map((item) => (
    item.entryKind === "space" ? (
      <CoworkSpaceSessionRow
        key={`cowork-space:${item.space.id}`}
        onNavigate={props.onNavigate}
        selected={item.space.id === props.selectedSpaceId}
        space={item.space}
      />
    ) : (
      <CoworkRecentRow key={item.session.id} {...props} session={item.session} />
    )
  ));
}

function CoworkRecentRow({ frame, onAction, onNavigate, selectedSessionId, session }: CoworkRecentListProps & { session: SessionSummary }) {
  return <CoworkSessionRow frame={frame} onAction={onAction} onNavigate={onNavigate} selected={session.id === selectedSessionId} session={session} />;
}
