import { Menu } from "@base-ui-components/react/menu";
import { useCallback, useRef } from "react";
import { BaseMenuItem, BaseMenuPopup, BaseSubmenu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { SKILL_CREATION_ENABLED } from "../customizeGates";

/**
 * Official c63a78ed4 Vl / AddSkillDropdown:
 * Browse skills + (if skill_creation) Create skill → Create with Claude / Write / Upload.
 */
export function AddSkillDropdown({
  onBrowseSkills,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
}: {
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
}) {
  const keepFocusRef = useRef(false);
  const wrap = useCallback((handler?: () => void) => {
    return () => {
      keepFocusRef.current = true;
      handler?.();
    };
  }, []);

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (!open && keepFocusRef.current) {
          keepFocusRef.current = false;
        }
      }}
    >
      <Menu.Trigger
        aria-label="Add skill"
        className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200 hover:text-text-100 focus-visible:shadow-focus"
      >
        <Icon name="Add" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        <BaseMenuItem icon="plugin" onClick={wrap(onBrowseSkills)}>
          Browse skills
        </BaseMenuItem>
        {SKILL_CREATION_ENABLED ? (
          <BaseSubmenu icon="plusSmall" label="Create skill" popupAlign="start" popupSide="right">
            <BaseMenuItem icon="spark" onClick={wrap(onCreateWithClaude)}>
              Create with Claude
            </BaseMenuItem>
            <BaseMenuItem icon="NoteSquareLines" onClick={wrap(onWriteInstructions)}>
              Write skill instructions
            </BaseMenuItem>
            <BaseMenuItem icon="ArrowInSquare" onClick={wrap(onUpload)}>
              Upload a skill
            </BaseMenuItem>
          </BaseSubmenu>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  );
}
