import { useState, type DragEvent } from "react";
import type { FrameStore } from "../../../stores/frameStore";
import { BaseMenuItem, BaseMenuPopup, Menu } from "../../../shell/BaseMenu";
import { GroupNameDialog } from "../../../shell/GroupNameDialog";
import { Icon } from "../../../shell/icons";
import { SidebarSectionHeader } from "../../../shell/SidebarSectionHeader";
import { useShellText } from "../../../i18n/shellMessages";

export function CoworkGroupHeader({ frame, groupId, label }: { frame: FrameStore; groupId: string; label: string }) {
  const text = useShellText();
  const [renameOpen, setRenameOpen] = useState(false);
  return (
    <>
      <div draggable onDragStart={(event) => writeCoworkGroupDrag(event, groupId)} onDragOver={(event) => allowCoworkGroupDrop(event, groupId)} onDrop={(event) => dropCoworkGroup(frame, event, groupId)}>
        <SidebarSectionHeader collapsed={frame.collapsedGroups.includes(`custom-${groupId}`)} onToggle={() => frame.toggleGroupCollapsed(`custom-${groupId}`)} trailing={(
          <Menu.Root>
            <Menu.Trigger aria-label={`Group options for ${label}`} className="df-chrome-btn relative -my-1 opacity-0 transition-opacity group-hover/labelrow:opacity-100 focus:opacity-100" type="button"><Icon customSize={14} name="DotsHorizontal" /></Menu.Trigger>
            <BaseMenuPopup align="end" side="right" sideOffset={4}>
              <BaseMenuItem icon="Edit" onClick={() => setRenameOpen(true)}>{text.renameGroup}</BaseMenuItem>
              <BaseMenuItem icon="Trash" onClick={() => frame.deleteCustomGroup(groupId)}>{text.deleteGroup}</BaseMenuItem>
            </BaseMenuPopup>
          </Menu.Root>
        )}>{label}</SidebarSectionHeader>
      </div>
      <GroupNameDialog initialName={label} isOpen={renameOpen} onClose={() => setRenameOpen(false)} onSubmit={(name) => frame.renameCustomGroup(groupId, name)} placeholder={text.groupName} title={text.renameGroup} />
    </>
  );
}

function writeCoworkGroupDrag(event: DragEvent<HTMLElement>, groupId: string) {
  event.dataTransfer.setData("application/x-dframe-custom-group", groupId);
  event.dataTransfer.effectAllowed = "move";
}

function allowCoworkGroupDrop(event: DragEvent<HTMLElement>, groupId: string) {
  if (event.dataTransfer.getData("application/x-dframe-custom-group") === groupId) return;
  event.preventDefault();
  event.dataTransfer.dropEffect = "move";
}

function dropCoworkGroup(frame: FrameStore, event: DragEvent<HTMLElement>, targetGroupId: string) {
  const groupId = event.dataTransfer.getData("application/x-dframe-custom-group");
  if (!groupId || groupId === targetGroupId) return;
  event.preventDefault();
  frame.moveCustomGroup(groupId, frame.customGroups.findIndex((group) => group.id === targetGroupId));
}
