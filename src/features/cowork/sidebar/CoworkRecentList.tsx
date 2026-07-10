import type { DragEvent } from "react";
import type { SessionSummary } from "../../../adapters/desktopBridge";
import type { FrameStore } from "../../../stores/frameStore";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { CoworkGroupHeader } from "./CoworkGroupHeader";
import type { CoworkRecentGroup } from "./coworkRecentGroups";
import { CoworkSessionRow } from "./CoworkSessionRow";
import type { CoworkRowAction } from "./CoworkSessionMenus";
import { readCoworkSessionDragKey } from "./coworkSessionDrag";
import { coworkSessionPinKey } from "./coworkSessionPinning";

type CoworkRecentListProps = {
  frame: FrameStore;
  groups: CoworkRecentGroup[];
  onAction: (session: SessionSummary, action: CoworkRowAction) => void;
  onNavigate: (path: string) => void;
  selectedSessionId: string | null;
};

export function CoworkRecentList(props: CoworkRecentListProps) {
  if (props.groups.length === 1 && props.groups[0]?.key === "all") {
    return props.groups[0].sessions.slice(0, 20).map((session) => <CoworkRecentRow key={session.id} {...props} session={session} />);
  }
  return props.groups.map((group) => <CoworkRecentGroupView group={group} key={group.key} {...props} />);
}

function CoworkRecentGroupView({ frame, group, onAction, onNavigate, selectedSessionId }: CoworkRecentListProps & { group: CoworkRecentGroup }) {
  const collapsed = frame.collapsedGroups.includes(group.key);
  const drop = group.customGroupId ? coworkCustomGroupDrop(frame, group) : undefined;
  return (
    <div className="group/section flex flex-col gap-px rounded-lg transition-colors" onDragOver={drop?.onDragOver} onDrop={drop?.onDropEnd}>
      {group.customGroupId ? <CoworkGroupHeader frame={frame} groupId={group.customGroupId} label={group.label ?? ""} /> : group.label ? <SidebarSectionHeader collapsed={collapsed} onToggle={() => frame.toggleGroupCollapsed(group.key)}>{group.label}</SidebarSectionHeader> : null}
      <div className={collapsed ? "hidden" : "contents"}>
        {group.sessions.map((session) => <CoworkRecentRow frame={frame} groups={[]} key={session.id} onAction={onAction} onDropBefore={drop ? (key) => drop.dropBefore(key, coworkSessionPinKey(session)) : undefined} onNavigate={onNavigate} selectedSessionId={selectedSessionId} session={session} />)}
      </div>
    </div>
  );
}

function CoworkRecentRow({ frame, onAction, onDropBefore, onNavigate, selectedSessionId, session }: CoworkRecentListProps & { onDropBefore?: (key: string) => void; session: SessionSummary }) {
  return <CoworkSessionRow frame={frame} onAction={onAction} onDropBefore={onDropBefore} onNavigate={onNavigate} selected={session.id === selectedSessionId} session={session} />;
}

function coworkCustomGroupDrop(frame: FrameStore, group: CoworkRecentGroup) {
  const keys = group.sessions.map(coworkSessionPinKey);
  const assign = (droppedKey: string, order: string[]) => frame.assignToCustomGroup(droppedKey, group.customGroupId ?? null, order);
  return {
    dropBefore: (droppedKey: string, beforeKey: string) => {
      if (droppedKey !== beforeKey) assign(droppedKey, insertCoworkBefore(keys, droppedKey, beforeKey));
    },
    onDragOver: (event: DragEvent<HTMLElement>) => { event.preventDefault(); event.dataTransfer.dropEffect = "move"; },
    onDropEnd: (event: DragEvent<HTMLElement>) => {
      const droppedKey = readCoworkSessionDragKey(event);
      if (!droppedKey) return;
      event.preventDefault();
      assign(droppedKey, [...keys.filter((key) => key !== droppedKey), droppedKey]);
    },
  };
}

function insertCoworkBefore(keys: string[], droppedKey: string, beforeKey: string) {
  const without = keys.filter((key) => key !== droppedKey);
  const index = without.indexOf(beforeKey);
  return index < 0 ? [droppedKey, ...without] : [...without.slice(0, index), droppedKey, ...without.slice(index)];
}
