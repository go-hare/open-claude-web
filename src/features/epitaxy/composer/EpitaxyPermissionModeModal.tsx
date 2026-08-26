import type { ReactNode } from "react";
import { useI18nText, type MessageDescriptors } from "../../../i18n/footerMenuMessages";
import { ConfirmDialog } from "../../../shell/ConfirmDialog";

/**
 * Official ion-dist `EpitaxyPermissionModeModal` (c11959232 Fk) on ConfirmationModal (rp):
 * FormattedMessage ids hjpZ5o8ssT / 3E39HlgtDu / cq1JnuAYj4 / ZKHkSXjvEo /
 * PHx7oHc7eF / JcgKJo1IQe / 47FYwba+bI / ycJzstXkcZ / KX6RZT9VD4 with securityLink (Dk).
 * First selection of bypassPermissions / auto requires confirm; workspace ack is handled by caller.
 */
const PERMISSION_MODE_MODAL_MESSAGES = {
  bypassTitle: { defaultMessage: "Bypass all permissions?", id: "hjpZ5o8ssT" },
  autoTitle: { defaultMessage: "Enable auto mode?", id: "3E39HlgtDu" },
  bypassMessage: {
    defaultMessage:
      "Claude will read, edit, and execute files without asking — including potentially destructive commands. Only use this in isolated or disposable environments.",
    id: "cq1JnuAYj4",
  },
  autoMessage: {
    defaultMessage:
      "Claude will decide which actions are safe to run without asking. Longer tasks run uninterrupted, with extra safeguards against prompt injection.",
    id: "ZKHkSXjvEo",
  },
  bypassConfirm: { defaultMessage: "Bypass permissions", id: "PHx7oHc7eF" },
  autoConfirm: { defaultMessage: "Enable auto mode", id: "JcgKJo1IQe" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  workspaceFootnote: {
    defaultMessage:
      "You won't be asked again for this workspace. Read our <securityLink>security guide</securityLink> for details.",
    id: "ycJzstXkcZ",
  },
  footnote: {
    defaultMessage: "Read our <securityLink>security guide</securityLink> for details.",
    id: "KX6RZT9VD4",
  },
} satisfies MessageDescriptors;

export type EpitaxyPermissionModeModalProps = {
  mode: "bypassPermissions" | "auto" | null;
  onCancel: () => void;
  onConfirm: () => void;
  workspace?: string | null;
};

export function EpitaxyPermissionModeModal({ mode, onCancel, onConfirm, workspace }: EpitaxyPermissionModeModalProps) {
  const text = useI18nText(PERMISSION_MODE_MODAL_MESSAGES);
  const isBypass = mode === "bypassPermissions";
  const title = isBypass ? text.bypassTitle : text.autoTitle;
  const message = isBypass ? text.bypassMessage : text.autoMessage;
  const confirmText = isBypass ? text.bypassConfirm : text.autoConfirm;
  const footnoteTemplate = workspace ? text.workspaceFootnote : text.footnote;

  // Official Fk mounts ConfirmationModal `_Component83` / rp — product ConfirmDialog.
  return (
    <ConfirmDialog
      cancelText={text.cancel}
      confirmText={confirmText}
      isOpen={mode !== null}
      message={message}
      onClose={onCancel}
      onConfirm={onConfirm}
      title={title}
    >
      {workspace ? <div className="text-code text-t8 break-all">{workspace}</div> : null}
      <p className="text-footnote text-t6">
        <SecurityGuideMessage template={footnoteTemplate} />
      </p>
    </ConfirmDialog>
  );
}

/** Official residual values.securityLink → Dk anchor to code.claude.com/docs/en/security. */
function SecurityGuideMessage({ template }: { template: string }): ReactNode {
  const match = template.match(/^(.*?)<securityLink>(.*?)<\/securityLink>(.*)$/s);
  if (!match) return template;
  const [, before, label, after] = match;
  return (
    <>
      {before}
      <a
        className="underline underline-offset-2"
        href="https://code.claude.com/docs/en/security"
        rel="noreferrer"
        target="_blank"
      >
        {label}
      </a>
      {after}
    </>
  );
}
