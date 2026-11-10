import { Menu } from "@base-ui-components/react/menu";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator } from "../../../shell/BaseMenu";

const SKILL_ACTION_MESSAGES = {
  tryInChat: { defaultMessage: "Try in chat", id: "41t0vyqBot" },
  enableToTry: { defaultMessage: "Enable skill to try in chat", id: "ApvR3+d8YI" },
  edit: { defaultMessage: "Edit", id: "wEQDC6Wv3/" },
  replace: { defaultMessage: "Replace", id: "Hvp+/65raO" },
  showInFolder: { defaultMessage: "Show in Folder", id: "qJzHPN7NHs" },
  uninstall: { defaultMessage: "Uninstall", id: "AaJVslgu7i" },
} as const satisfies MessageDescriptors;
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
  const text = useI18nText(SKILL_ACTION_MESSAGES);
  const tryItem = (
    <BaseMenuItem disabled={!enabled} icon="Chat" onClick={onTryInChat}>
      {text.tryInChat}
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
          <OfficialTooltip tooltipContent={text.enableToTry}>
            <div>{tryItem}</div>
          </OfficialTooltip>
        )}
        <BaseMenuSeparator />
        <BaseMenuItem icon="Edit" onClick={onEdit}>
          {text.edit}
        </BaseMenuItem>
        <BaseMenuItem icon="Upload" onClick={onReplace}>
          {text.replace}
        </BaseMenuItem>
        {onShowInFolder ? (
          <>
            <BaseMenuSeparator />
            <BaseMenuItem icon="Folder" onClick={onShowInFolder}>
              {text.showInFolder}
            </BaseMenuItem>
          </>
        ) : null}
        <BaseMenuSeparator />
        <BaseMenuItem danger icon="Trash" onClick={onUninstall}>
          {text.uninstall}
        </BaseMenuItem>
      </BaseMenuPopup>
    </Menu.Root>
  );
}
