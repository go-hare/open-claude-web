/**
 * Official CDS Dialog (index-BELzQL5P.js rD: Root HO, Popup XO, Title JO, CloseButton eD).
 * SettingsModal (cc011544b) uses unstyled Popup + w("panel") = `rounded-card bg-surface-2 shadow-panel-sm`.
 */
import { Dialog } from "@base-ui-components/react/dialog";
import type { ReactNode } from "react";
import { Icon } from "../../shell/icons";

const backdropClassName =
  "draggable-none fixed inset-0 z-modal bg-backdrop backdrop-blur-[2px] transition-opacity duration-base ease-out data-[starting-style]:opacity-0 data-[ending-style]:opacity-0";

const closeButtonClassName =
  "inline-flex items-center justify-center relative isolate shrink-0 can-focus select-none disabled:pointer-events-none disabled:opacity-50 border-transparent transition font-base duration-300 ease-[cubic-bezier(0.165,0.85,0.45,1)] h-8 w-8 rounded-md _fill_10ocf_9 _ghost_10ocf_96 !text-text-500 hover:!text-text-400";

export const CdsDialog = {
  Root: Dialog.Root,
  Portal: Dialog.Portal,
  Backdrop: Dialog.Backdrop,
  Popup: Dialog.Popup,
  Title: Dialog.Title,
  Close: Dialog.Close,
};

export function CdsDialogBackdrop({ className }: { className?: string }) {
  return <Dialog.Backdrop className={`${backdropClassName} ${className ?? ""}`} />;
}

/** Official eD: Dialog.Close → ghost icon-only X. */
export function CdsDialogCloseButton({
  "aria-label": ariaLabel = "Close",
  className,
  onClick,
}: {
  "aria-label"?: string;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <Dialog.Close
      aria-label={ariaLabel}
      className={`${closeButtonClassName} ${className ?? ""}`}
      onClick={() => {
        // Hash-synced overlay: pushState does not fire hashchange, so store
        // close must run here in addition to Root onOpenChange(false).
        onClick?.();
      }}
      type="button"
    >
      <Icon name="X" size="sm" />
    </Dialog.Close>
  );
}

export function CdsDialogTitle({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <Dialog.Title className={className ?? "text-title font-semibold text-primary"}>
      {children}
    </Dialog.Title>
  );
}
