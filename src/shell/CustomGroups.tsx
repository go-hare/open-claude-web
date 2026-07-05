import { useState, type DragEvent } from "react";
import type { SessionSummary } from "../adapters/desktopBridge";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import type { FrameStore } from "../stores/frameStore";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, BaseSubmenu, Menu } from "./BaseMenu";
import { GroupNameDialog } from "./GroupNameDialog";
import { Icon } from "./icons";
import { buildRecentsGroups, type RecentsFilterState } from "./RecentsControls";
import { sessionPinKey } from "./sessionPinning";
import { SidebarSectionHeader } from "./SidebarSectionHeader";

export type RecentDisplayGroup = {
  key: string;
  label?: string;
  sessions: SessionSummary[];
  customGroupId?: string | null;
};

export function GroupSubmenu({ frame, onCreateGroup, session }: { frame: FrameStore; onCreateGroup: () => void; session: SessionSummary }) {
  const text = useShellText();
  const sessionKey = sessionPinKey(session);
  const currentGroupId = frame.customGroupAssignments[sessionKey] ?? null;
  const currentGroup = frame.customGroups.find((group) => group.id === currentGroupId);
  const assign = (groupId: string | null) => {
    frame.assignToCustomGroup(sessionKey, groupId);
    if (groupId !== null) frame.setGroupBy("code", "custom");
  };

  return (
    <BaseSubmenu icon="Folder" label={text.group} summary={currentGroup?.name ?? text.ungrouped}>
      <BaseMenuItem checked={currentGroupId === null} checkedRole="radio" onClick={() => assign(null)}>{text.ungrouped}</BaseMenuItem>
      {frame.customGroups.map((group) => <BaseMenuItem checked={group.id === currentGroupId} checkedRole="radio" key={group.id} onClick={() => assign(group.id)}>{group.name}</BaseMenuItem>)}
      <BaseMenuSeparator />
      <BaseMenuItem icon="Add" keepOpen onClick={onCreateGroup}>{text.newGroup}</BaseMenuItem>
    </BaseSubmenu>
  );
}

export function CustomGroupHeader({ frame, groupId, label }: { frame: FrameStore; groupId: string; label: string }) {
  const text = useShellText();
  const [renameOpen, setRenameOpen] = useState(false);
  return (
    <>
      <div
        draggable
        onDragStart={(event) => writeCustomGroupDrag(event, groupId)}
        onDragOver={(event) => allowCustomGroupDrop(event, groupId)}
        onDrop={(event) => dropCustomGroup(frame, event, groupId)}
      >
      <SidebarSectionHeader
        collapsed={frame.collapsedGroups.includes(`custom-${groupId}`)}
        onToggle={() => frame.toggleGroupCollapsed(`custom-${groupId}`)}
        trailing={(
          <Menu.Root>
            <Menu.Trigger aria-label={`Group options for ${label}`} className="df-chrome-btn relative -my-1 opacity-0 transition-opacity group-hover/labelrow:opacity-100 focus:opacity-100" type="button">
              <Icon name="DotsHorizontal" customSize={14} />
            </Menu.Trigger>
            <BaseMenuPopup align="end" side="right" sideOffset={4}>
              <BaseMenuItem icon="Edit" onClick={() => setRenameOpen(true)}>{text.renameGroup}</BaseMenuItem>
              <BaseMenuItem icon="Trash" onClick={() => frame.deleteCustomGroup(groupId)}>{text.deleteGroup}</BaseMenuItem>
            </BaseMenuPopup>
          </Menu.Root>
        )}
      >{label}</SidebarSectionHeader>
      </div>
      <GroupNameDialog initialName={label} isOpen={renameOpen} onClose={() => setRenameOpen(false)} onSubmit={(name) => frame.renameCustomGroup(groupId, name)} placeholder={text.groupName} title={text.renameGroup} />
    </>
  );
}

export function buildCustomGroups(sessions: SessionSummary[], filter: RecentsFilterState, frame: FrameStore, text: ShellText): RecentDisplayGroup[] {
  const visible = buildRecentsGroups(sessions, { ...filter, groupBy: "none" }, text).flatMap((group) => group.sessions);
  const byGroup = new Map<string, SessionSummary[]>();
  for (const session of visible) {
    const groupId = frame.customGroupAssignments[sessionPinKey(session)];
    const key = groupId && frame.customGroups.some((group) => group.id === groupId) ? groupId : "custom-ungrouped";
    byGroup.set(key, [...(byGroup.get(key) ?? []), session]);
  }
  const groups = frame.customGroups.map((group) => ({
    key: `custom-${group.id}`,
    label: group.name,
    sessions: orderCustomGroup(byGroup.get(group.id) ?? [], frame.customGroupOrder[group.id]),
    customGroupId: group.id,
  }));
  return [...groups, { key: "custom-ungrouped", label: text.ungrouped, sessions: byGroup.get("custom-ungrouped") ?? [], customGroupId: null }];
}

function orderCustomGroup(sessions: SessionSummary[], order: string[] = []) {
  const rank = new Map(order.map((key, index) => [key, index]));
  return [...sessions].sort((left, right) => {
    const leftRank = rank.get(sessionPinKey(left)) ?? Infinity;
    const rightRank = rank.get(sessionPinKey(right)) ?? Infinity;
    return leftRank === rightRank ? right.updatedAtMs - left.updatedAtMs : leftRank - rightRank;
  });
}

function writeCustomGroupDrag(event: DragEvent<HTMLElement>, groupId: string) {
  event.dataTransfer.setData("application/x-dframe-custom-group", groupId);
  event.dataTransfer.effectAllowed = "move";
}

function allowCustomGroupDrop(event: DragEvent<HTMLElement>, groupId: string) {
  if (event.dataTransfer.getData("application/x-dframe-custom-group") === groupId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function dropCustomGroup(frame: FrameStore, event: DragEvent<HTMLElement>, targetGroupId: string) {
  const groupId = event.dataTransfer.getData("application/x-dframe-custom-group");
  if (!groupId || groupId === targetGroupId) return;
  event.preventDefault();
  const targetIndex = frame.customGroups.findIndex((group) => group.id === targetGroupId);
  frame.moveCustomGroup(groupId, targetIndex);
}
