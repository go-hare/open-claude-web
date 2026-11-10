import { Menu } from "@base-ui-components/react/menu";
import { useCallback, useRef } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { BaseMenuItem, BaseMenuPopup, BaseSubmenu } from "../../../shell/BaseMenu";
import { Icon } from "../../../shell/icons";
import { CREATE_SKILL_WITH_CLAUDE_ENABLED, SKILL_CREATION_ENABLED } from "../customizeGates";

const ADD_SKILL_MESSAGES = {
  add: { defaultMessage: "Add", id: "alWu/MbgXB" },
  addSkill: { defaultMessage: "Add skill", id: "tnEMvwSDlT" },
  browseSkills: { defaultMessage: "Browse skills", id: "zpHwlExaSz" },
  createSkill: { defaultMessage: "Create skill", id: "8jD/lLoqJd" },
  writeSkillInstructions: { defaultMessage: "Write skill instructions", id: "CCQr8NfpEL" },
  uploadASkill: { defaultMessage: "Upload a skill", id: "KgA+vPbgQ2" },
  uploadSkill: { defaultMessage: "Upload skill", id: "JqiOyfKupb" },
  createASkill: { defaultMessage: "Create a skill", id: "oSuR6WVQY6" },
  createWithClaude: { defaultMessage: "Create with Claude", id: "PJOomHaesP" },
} as const satisfies MessageDescriptors;

/**
 * Official shared-frame sl/Yc primary TriggerButton (cd08e92dc Oe).
 * Overlay Add is CDS h-control + fill-primary paint, not OfficialButton sm (h-8 rounded-md min-w-[4rem]).
 */
const OVERLAY_ADD_TRIGGER_CLASS =
  "cds-reset group/btn relative isolate inline-flex h-control shrink-0 items-center justify-center gap-1.5 rounded border-0 px-md font-sans text-body font-medium font-control text-on-primary outline-none select-none whitespace-nowrap";

/**
 * Official c63a78ed4 Vl / AddSkillDropdown (page):
 * Browse skills + (if skill_creation) Create skill → Create with Claude / Write / Upload.
 *
 * Overlay Ar / Gn / Un (c5e558aae + cd08e92dc Oe):
 * primary TriggerButton "Add" alWu/MbgXB; menu Upload skill / Create a skill / Create with Claude.
 * Wn showBrowse = false — no Discover in overlay.
 */
export function AddSkillDropdown({
  onBrowseSkills,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
  variant = "page",
}: {
  onBrowseSkills: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
  variant?: "page" | "overlay";
}) {
  const text = useI18nText(ADD_SKILL_MESSAGES);
  const keepFocusRef = useRef(false);
  const wrap = useCallback((handler?: () => void) => {
    return () => {
      keepFocusRef.current = true;
      handler?.();
    };
  }, []);

  if (variant === "overlay") {
    return (
      <Menu.Root
        onOpenChange={(open) => {
          if (!open && keepFocusRef.current) {
            keepFocusRef.current = false;
          }
        }}
      >
        <Menu.Trigger
          aria-label={text.addSkill}
          className={OVERLAY_ADD_TRIGGER_CLASS}
          data-cds="Button"
          data-official-source="cd08e92dc:Oe TriggerButton alWu/MbgXB"
        >
          <span
            aria-hidden="true"
            className="absolute inset-0 rounded-[inherit] bg-fill-primary transition-[background-color] duration-fast group-hover/btn:bg-fill-primary-hover group-[[aria-haspopup][aria-expanded=true]]/btn:bg-fill-primary-hover"
            data-cds-part="paint"
          />
          <span className="relative inline-flex min-w-0 items-center gap-1">
            {text.add}
            <Icon className="shrink-0 opacity-60" name="CaretDown" preferFont size="sm" />
          </span>
        </Menu.Trigger>
        <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
          <BaseMenuItem icon="Upload" onClick={wrap(onUpload)}>
            {text.uploadSkill}
          </BaseMenuItem>
          {SKILL_CREATION_ENABLED ? (
            <BaseMenuItem icon="Edit" onClick={wrap(onWriteInstructions)}>
              {text.createASkill}
            </BaseMenuItem>
          ) : null}
          {SKILL_CREATION_ENABLED && CREATE_SKILL_WITH_CLAUDE_ENABLED && onCreateWithClaude ? (
            <BaseMenuItem icon="Chat" onClick={wrap(onCreateWithClaude)}>
              {text.createWithClaude}
            </BaseMenuItem>
          ) : null}
        </BaseMenuPopup>
      </Menu.Root>
    );
  }

  return (
    <Menu.Root
      onOpenChange={(open) => {
        if (!open && keepFocusRef.current) {
          keepFocusRef.current = false;
        }
      }}
    >
      <Menu.Trigger
        aria-label={text.addSkill}
        className="cds-reset inline-flex size-8 items-center justify-center rounded-lg text-text-300 hover:bg-bg-200 hover:text-text-100 focus-visible:shadow-focus"
      >
        <Icon name="Add" />
      </Menu.Trigger>
      <BaseMenuPopup align="end" side="bottom" sideOffset={4}>
        <BaseMenuItem icon="plugin" onClick={wrap(onBrowseSkills)}>
          {text.browseSkills}
        </BaseMenuItem>
        {SKILL_CREATION_ENABLED ? (
          <BaseSubmenu icon="plusSmall" label={text.createSkill} popupAlign="start" popupSide="right">
            <BaseMenuItem icon="spark" onClick={wrap(onCreateWithClaude)}>
              {text.createWithClaude}
            </BaseMenuItem>
            <BaseMenuItem icon="NoteSquareLines" onClick={wrap(onWriteInstructions)}>
              {text.writeSkillInstructions}
            </BaseMenuItem>
            <BaseMenuItem icon="ArrowInSquare" onClick={wrap(onUpload)}>
              {text.uploadASkill}
            </BaseMenuItem>
          </BaseSubmenu>
        ) : null}
      </BaseMenuPopup>
    </Menu.Root>
  );
}
