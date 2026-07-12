import { Dialog } from "@base-ui-components/react/dialog";
import type { CoworkSessionsBridge } from "../../../adapters/desktopBridge/types";
import { CoworkButton } from "../ui/CoworkButton";

export type CoworkFolderConfirmation = { path: string; wasTrusted: boolean };

export function CoworkFolderTrustDialog({ bridge, onAlwaysAllow, onCancel, onConfirm, pending }: { bridge: Pick<CoworkSessionsBridge, "addTrustedFolder">; onAlwaysAllow: (path: string) => void | Promise<void>; onCancel: () => void; onConfirm: (path: string) => void; pending: CoworkFolderConfirmation | null }) {
  const directory = basename(pending?.path) ?? pending?.path ?? "";
  const title = pending?.wasTrusted
    ? `You've allowed this folder before. Continue to add "${directory}"?`
    : `Allow Claude to change files in "${directory}"?`;
  const description = pending?.wasTrusted
    ? "You've allowed this folder before. Continue to add it to this session."
    : "This includes all files and subfolders. Claude will be able to read, edit, and permanently delete, and may share file contents with third-party tools it connects to.";
  return (
    <Dialog.Root onOpenChange={(open) => { if (!open) onCancel(); }} open={pending !== null}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none" forceRender />
        <Dialog.Popup className="epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[420px] max-w-[calc(100vw-2rem)] draggable-none outline-none">
          <div className="relative isolate rounded-r6 flex flex-col">
            <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] bg-surface-popover effect-hud" />
            <div className="px-[24px] pt-[24px]"><Dialog.Title className="text-heading-semibold text-t9">{title}</Dialog.Title></div>
            <div className="px-[24px] pb-[24px] pt-[12px]">
              <div className="text-text-300 whitespace-pre-line">{description}</div>
              {pending?.path ? <div className="bg-bg-100 text-text-200 mt-3 break-all rounded px-2 py-1 font-mono text-xs">{pending.path}</div> : null}
              <div className="flex justify-end gap-g4 pt-[12px]">
                <CoworkButton onClick={onCancel} variant="contained">Cancel</CoworkButton>
                {pending?.wasTrusted || !bridge.addTrustedFolder ? null : <CoworkButton onClick={() => pending && void onAlwaysAllow(pending.path)} variant="contained">Always allow</CoworkButton>}
                <CoworkButton onClick={() => pending && onConfirm(pending.path)} variant="primary">{pending?.wasTrusted ? "Continue" : "Allow"}</CoworkButton>
              </div>
            </div>
          </div>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function basename(value?: string) {
  return value?.split(/[\\/]/).filter(Boolean).at(-1);
}
