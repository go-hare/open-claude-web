/**
 * Official cdce CustomizeDetailActionsMenu `D` + Edit `O`.
 */
import { useCallback, useState } from "react";
import { Menu } from "@base-ui-components/react/menu";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { BaseMenuItem, BaseMenuPopup, BaseMenuSeparator } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { officialButtonClass } from "../../shared/buttonClasses";
import { OfficialButton } from "../../shared/OfficialButton";
import { OfficialTooltip } from "../../shared/OfficialTooltip";
import { copyOfficialMessagePlain } from "../../epitaxy/session/officialMessageClipboard";
import { SKILLS_ENABLED } from "../customizeGates";
import { useCustomizeText } from "../customizeMessages";

export function PluginSkillOverflow({
  copyContent,
  onTryInChat,
  tryInChatDisabledReason,
}: {
  copyContent?: string;
  onTryInChat?: () => void;
  tryInChatDisabledReason?: string;
}) {
  const text = useCustomizeText();
  const [open, setOpen] = useState(false);
  const [didCopy, setDidCopy] = useState(false);
  const copy = useCallback(() => {
    if (!copyContent) return;
    void copyOfficialMessagePlain(copyContent).then(() => setDidCopy(true));
  }, [copyContent]);

  const tryItem = onTryInChat ? (
    <BaseMenuItem disabled={Boolean(tryInChatDisabledReason)} icon="Chat" onClick={onTryInChat}>
      {text.tryInChat}
    </BaseMenuItem>
  ) : null;

  return (
    <Menu.Root
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setDidCopy(false);
      }}
      open={open}
    >
      <Menu.Trigger
        aria-label={text.moreOptions}
        className={officialButtonClass({ variant: "ghost", size: "icon_sm" })}
      >
        <Icon customSize={20} name="DotsVertical" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        {copyContent ? (
          <BaseMenuItem icon="Copy" onClick={copy}>
            {didCopy ? text.copied : text.copySkill}
          </BaseMenuItem>
        ) : null}
        {tryItem && tryInChatDisabledReason ? (
          <OfficialTooltip sideOffset={10} tooltipContent={tryInChatDisabledReason}>
            <div>{tryItem}</div>
          </OfficialTooltip>
        ) : (
          tryItem
        )}
      </BaseMenuPopup>
    </Menu.Root>
  );
}

export function PluginSkillEditButton({
  disabled,
  disabledTooltip,
  onCustomizeWithClaude,
  path,
}: {
  disabled?: boolean;
  disabledTooltip?: string;
  onCustomizeWithClaude?: () => void;
  path: string;
}) {
  const text = useCustomizeText();
  const reveal = useCallback(() => {
    void desktopBridge.FileSystem.showInFolder?.(path);
  }, [path]);

  if (disabled) {
    return (
      <OfficialTooltip side="bottom" tooltipContent={disabledTooltip}>
        <span>
          <OfficialButton disabled size="sm" variant="secondary">
            {text.edit}
          </OfficialButton>
        </span>
      </OfficialTooltip>
    );
  }

  const canCustomize = Boolean(onCustomizeWithClaude) && SKILLS_ENABLED;
  if (!canCustomize) {
    return (
      <OfficialButton onClick={reveal} size="sm" variant="secondary">
        {text.edit}
      </OfficialButton>
    );
  }
  return (
    <Menu.Root>
      <Menu.Trigger className={officialButtonClass({ variant: "secondary", size: "sm" })}>
        {text.edit}
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        <BaseMenuItem icon="spark" onClick={onCustomizeWithClaude}>
          {text.customizeWithClaude}
        </BaseMenuItem>
        <BaseMenuSeparator />
        <BaseMenuItem icon="Folder" onClick={reveal}>
          {text.showInFolder}
        </BaseMenuItem>
      </BaseMenuPopup>
    </Menu.Root>
  );
}
