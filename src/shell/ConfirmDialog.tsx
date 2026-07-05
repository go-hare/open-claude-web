import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass } from "../features/shared/buttonClasses";
import { useShellText } from "../i18n/shellMessages";
import { Icon } from "./icons";

type ConfirmDialogProps = {
  confirmText?: string;
  isOpen: boolean;
  message: ReactNode;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  variant?: "danger" | "default";
};

const overlayClassName = "fixed inset-0 z-modal bg-always-black/50 backdrop-brightness-75 draggable-none grid items-center justify-items-center overflow-y-auto md:p-10 p-4";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl md:p-6 p-4 align-middle min-w-0 w-full max-w-sm bg-bg-100";
const modalVars = { "--modal-overlay-opacity": 0.5 } as CSSProperties;

export function ConfirmDialog({ confirmText, isOpen, message, onClose, onConfirm, title, variant = "default" }: ConfirmDialogProps) {
  const text = useShellText();
  if (!isOpen) return null;
  const confirmClassName = variant === "danger" ? `${primaryButtonClass} bg-danger-100 hover:bg-danger-200` : primaryButtonClass;
  return createPortal(
    <div className="epitaxy-root">
      <div className={overlayClassName} onMouseDown={onClose} role="presentation" style={modalVars}>
        <section aria-labelledby="confirm-dialog-title" aria-modal="true" className={contentClassName} onMouseDown={(event) => event.stopPropagation()} role="dialog">
          <div className="flex items-center gap-4 justify-between">
            <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words" id="confirm-dialog-title">{title}</h2>
            <button aria-label="Close" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent !text-text-500 hover:bg-bg-200 hover:!text-text-400 -mx-2" onClick={onClose} type="button"><Icon name="X" size="sm" /></button>
          </div>
          <div className="pt-3 text-body text-text-300">{message}</div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm hover:bg-bg-200" onClick={onClose} type="button">{text.cancel}</button>
            <button className={confirmClassName} onClick={() => { onConfirm(); onClose(); }} type="button">{confirmText ?? text.confirm}</button>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
