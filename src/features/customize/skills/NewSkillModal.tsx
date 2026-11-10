/**
 * Official Ol / _l (c63a78ed4) — "New skill" creation picker.
 * Empty Skills `Jl` Add skill → re → F(true) → Ol, not Directory / S7t plugin upload.
 */
import type { ReactNode } from "react";
import { type MessageDescriptors, useI18nText } from "../../../i18n/footerMenuMessages";
import { Icon } from "../../../shell/icons";
import { OfficialModal } from "../../shared/OfficialModal";

const NEW_SKILL_MESSAGES = {
  title: { defaultMessage: "New skill", id: "CBuichAnps" },
  createWithClaude: { defaultMessage: "Create with Claude", id: "st9QnC8LFC" },
  buildComplex: { defaultMessage: "Build complex skills through conversation", id: "kvWQwWF1At" },
  writeInstructions: { defaultMessage: "Write skill instructions", id: "CCQr8NfpEL" },
  easyToDescribe: { defaultMessage: "Great for skills that are easy to describe", id: "ZGNJP3WbjE" },
  uploadSkill: { defaultMessage: "Upload a skill", id: "KgA+vPbgQ2" },
  importFile: { defaultMessage: "Import a .zip, .skill, or .md file", id: "egjYNvENXk" },
} as const satisfies MessageDescriptors;

export function NewSkillModal({
  isOpen,
  onClose,
  onCreateWithClaude,
  onWriteInstructions,
  onUpload,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreateWithClaude?: () => void;
  onWriteInstructions?: () => void;
  onUpload?: () => void;
}) {
  const text = useI18nText(NEW_SKILL_MESSAGES);
  return (
    <OfficialModal
      hasCloseButton
      isOpen={isOpen}
      modalSize="md"
      onClose={onClose}
      title={<div className="text-lg font-medium leading-7">{text.title}</div>}
    >
      <div className="flex flex-col gap-3 py-1.5 mt-3">
        <NewSkillChoice
          description={text.buildComplex}
          icon={<Icon customSize={24} name="spark" />}
          onClick={onCreateWithClaude}
          title={text.createWithClaude}
        />
        <NewSkillChoice
          description={text.easyToDescribe}
          icon={<Icon customSize={24} name="NoteSquareLines" />}
          onClick={onWriteInstructions}
          title={text.writeInstructions}
        />
        <NewSkillChoice
          description={text.importFile}
          icon={<Icon customSize={24} name="ArrowInSquare" />}
          onClick={onUpload}
          title={text.uploadSkill}
        />
      </div>
    </OfficialModal>
  );
}

/** Official _l */
function NewSkillChoice({
  description,
  icon,
  onClick,
  title,
}: {
  description: ReactNode;
  icon: ReactNode;
  onClick?: () => void;
  title: ReactNode;
}) {
  return (
    <button
      className="w-full px-5 py-3 bg-bg-200 rounded-lg border-[0.5px] border-border-300 flex items-center gap-3 hover:bg-bg-400 transition-colors text-left cursor-pointer"
      onClick={onClick}
      type="button"
    >
      <div className="w-6 h-6 flex-shrink-0 text-text-500">{icon}</div>
      <div className="flex flex-col gap-0.5">
        <div className="text-sm font-medium text-text-000">{title}</div>
        <div className="text-xs text-text-500">{description}</div>
      </div>
    </button>
  );
}
