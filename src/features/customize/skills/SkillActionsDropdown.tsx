import { Menu } from "@base-ui-components/react/menu";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { officialButtonClass } from "../../shared/buttonClasses";
import { OfficialTooltip } from "../../shared/OfficialTooltip";

/**
 * Official c4313ee9e Te / SkillActionsDropdown.
 * Personal user (`x=!p&&!k&&!isShared`): Try in chat, Edit, Replace, Uninstall.
 * Desktop FT=bb: Show in Folder → $Le revealLocalSkill. Share / Duplicate / Rename / Manage stay gated off.
 */
export function SkillActionsDropdown({
  enabled,
  onEdit,
  onReplace,
  onShowInFolder,
  onTryInChat,
  onUninstall,
  skillName,
  wiggleEnabled,
}: {
  enabled: boolean;
  onEdit: () => void;
  onReplace: () => void;
  onShowInFolder?: () => void;
  onTryInChat: () => void;
  onUninstall: () => void;
  skillName: string;
  wiggleEnabled: boolean;
}) {
  const tryItem = (
    <BaseMenuItem disabled={!enabled} icon="Chat" onClick={onTryInChat}>
      Try in chat
    </BaseMenuItem>
  );

  return (
    <Menu.Root>
      <Menu.Trigger
        aria-label={`More options for ${skillName}`}
        className={officialButtonClass({ variant: "ghost", size: "icon_sm" })}
        disabled={!wiggleEnabled}
      >
        <Icon customSize={20} name="DotsVertical" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {enabled ? (
          tryItem
        ) : (
          <OfficialTooltip tooltipContent="Enable skill to try in chat">
            <div>{tryItem}</div>
          </OfficialTooltip>
        )}
        <BaseMenuSeparator />
        <BaseMenuItem icon="Edit" onClick={onEdit}>
          Edit
        </BaseMenuItem>
        <BaseMenuItem icon="Upload" onClick={onReplace}>
          Replace
        </BaseMenuItem>
        {onShowInFolder ? (
          <>
            <BaseMenuSeparator />
            <BaseMenuItem icon="Folder" onClick={onShowInFolder}>
              Show in Folder
            </BaseMenuItem>
          </>
        ) : null}
        <BaseMenuSeparator />
        <BaseMenuItem danger icon="Trash" onClick={onUninstall}>
          Uninstall
        </BaseMenuItem>
      </BaseMenuPopup>
    </Menu.Root>
  );
}
