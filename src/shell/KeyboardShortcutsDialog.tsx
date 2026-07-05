import type { CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useShellText } from "../i18n/shellMessages";
import { Icon } from "./icons";

type KeyboardShortcutsDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

const overlayClassName = "fixed inset-0 z-modal bg-always-black/50 backdrop-brightness-75 draggable-none grid items-center justify-items-center overflow-y-auto md:p-10 p-4";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl md:p-6 p-4 align-middle min-w-0 w-full max-w-md bg-bg-100";
const modalVars = { "--modal-overlay-opacity": 0.5 } as CSSProperties;

export function KeyboardShortcutsDialog({ isOpen, onClose }: KeyboardShortcutsDialogProps) {
  const text = useShellText();
  const shortcuts = [["⌘ B", text.collapseSidebar], ["⌘ K", text.search], ["⌘ 1", text.cowork], ["⌘ 2", text.code], ["⌘ Ctrl ↑/↓/←/→", text.switchPane], ["⌘ \\", text.closePane]];
  if (!isOpen) return null;
  return createPortal(
    <div className="epitaxy-root">
      <div className={overlayClassName} onMouseDown={onClose} role="presentation" style={modalVars}>
        <section aria-labelledby="keyboard-shortcuts-title" aria-modal="true" className={contentClassName} onMouseDown={(event) => event.stopPropagation()} role="dialog">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-xl-bold text-text-100 leading-6" id="keyboard-shortcuts-title">{text.keyboardShortcuts}</h2>
            <button aria-label="Close" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent !text-text-500 hover:bg-bg-200 hover:!text-text-400 -mx-2" onClick={onClose} type="button"><Icon name="X" size="sm" /></button>
          </div>
          <div className="mt-4 grid gap-2">
            {shortcuts.map(([keys, label]) => <div className="flex items-center justify-between gap-4 rounded-lg px-2 py-1.5 hover:bg-bg-200" key={keys}><span className="text-body text-text-300">{label}</span><kbd className="text-footnote text-muted">{keys}</kbd></div>)}
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
