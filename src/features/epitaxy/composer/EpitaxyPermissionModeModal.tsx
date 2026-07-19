import { Dialog } from "@base-ui-components/react/dialog";
import type { ReactNode } from "react";
import { OfficialButton } from "../OfficialEpitaxyComponents";

/**
 * Official ion-dist `EpitaxyPermissionModeModal` (c11959232 Fk) on ConfirmationModal (c36ba223f).
 * First selection of bypassPermissions / auto requires confirm; workspace ack is handled by caller.
 */
export type EpitaxyPermissionModeModalProps = {
  mode: "bypassPermissions" | "auto" | null;
  onCancel: () => void;
  onConfirm: () => void;
  workspace?: string | null;
};

export function EpitaxyPermissionModeModal({ mode, onCancel, onConfirm, workspace }: EpitaxyPermissionModeModalProps) {
  const isBypass = mode === "bypassPermissions";
  const title = isBypass ? "Bypass all permissions?" : "Enable auto mode?";
  const message = isBypass
    ? "Claude will read, edit, and execute files without asking — including potentially destructive commands. Only use this in isolated or disposable environments."
    : "Claude will decide which actions are safe to run without asking. Longer tasks run uninterrupted, with extra safeguards against prompt injection.";
  const confirmText = isBypass ? "Bypass permissions" : "Enable auto mode";
  const footnote = workspace
    ? "You won't be asked again for this workspace. Read our security guide for details."
    : "Read our security guide for details.";

  return (
    <Dialog.Root
      open={mode !== null}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop forceRender className="fixed inset-0 z-50 bg-always-black/50 draggable-none" />
        <Dialog.Popup className="epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[28rem] max-w-[calc(100vw-2rem)] draggable-none outline-none">
          <div className="relative isolate rounded-r6 p-p8 flex flex-col gap-g6">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
            <Dialog.Title className="text-heading-semibold text-t9">{title}</Dialog.Title>
            <p className="text-body text-t7">{message}</p>
            {workspace ? <div className="text-code text-t8 break-all">{workspace}</div> : null}
            <p className="text-footnote text-t6">
              {footnote.includes("security guide") ? (
                <SecurityGuideFootnote workspace={Boolean(workspace)} />
              ) : (
                footnote
              )}
            </p>
            <div className="flex justify-end gap-g4">
              <OfficialButton onClick={onCancel} size="small" variant="contained">
                Cancel
              </OfficialButton>
              <OfficialButton onClick={onConfirm} size="small" variant="primary">
                {confirmText}
              </OfficialButton>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function SecurityGuideFootnote({ workspace }: { workspace: boolean }): ReactNode {
  const link = (
    <a
      className="underline underline-offset-2"
      href="https://code.claude.com/docs/en/security"
      rel="noreferrer"
      target="_blank"
    >
      security guide
    </a>
  );
  return workspace ? (
    <>
      You won&apos;t be asked again for this workspace. Read our {link} for details.
    </>
  ) : (
    <>Read our {link} for details.</>
  );
}
