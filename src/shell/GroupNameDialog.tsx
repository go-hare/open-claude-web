import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass } from "../features/shared/buttonClasses";
import { useShellText } from "../i18n/shellMessages";
import { Icon } from "./icons";

type GroupNameDialogProps = {
  initialName?: string;
  isOpen: boolean;
  placeholder?: string;
  title?: string;
  onClose: () => void;
  onSubmit: (name: string) => void;
};

const overlayClassName = "fixed inset-0 z-modal bg-always-black/50 backdrop-brightness-75 draggable-none grid items-center justify-items-center overflow-y-auto md:p-10 p-4 data-[state=\"open\"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards]";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl md:p-6 p-4 align-middle min-w-0 w-full max-w-sm bg-bg-100";
const modalVars = {
  "--modal-animation-duration": "250ms",
  "--modal-overlay-opacity": 0.5,
} as CSSProperties;

export function GroupNameDialog({ initialName = "", isOpen, onClose, onSubmit, placeholder, title }: GroupNameDialogProps) {
  const text = useShellText();
  const [name, setName] = useState(initialName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!isOpen) return;
    setName(initialName);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialName, isOpen]);
  if (!isOpen) return null;
  const dialogTitle = title ?? (initialName ? text.renameGroup : text.newGroup);
  const inputPlaceholder = placeholder ?? text.groupName;
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    onSubmit(nextName);
    onClose();
  };
  return createPortal(
    <div className="epitaxy-root">
      <div className={overlayClassName} data-state="open" onMouseDown={onClose} role="presentation" style={modalVars}>
        <section aria-labelledby="group-name-dialog-title" aria-modal="true" className={contentClassName} onMouseDown={(event) => event.stopPropagation()} role="dialog">
          <div className="flex items-center gap-4 justify-between">
            <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words" id="group-name-dialog-title">{dialogTitle}</h2>
            <button aria-label="Close" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent !text-text-500 hover:bg-bg-200 hover:!text-text-400 -mx-2" onClick={onClose} type="button"><Icon name="X" size="sm" /></button>
          </div>
          <form className="grid gap-3 pt-3" onSubmit={submit}>
            <input ref={inputRef} className="cds-input cds-reset h-control px-sm rounded bg-fill-field focus-visible:bg-surface-popover shadow-field-ring text-body text-primary outline-none placeholder:text-muted" onChange={(event) => setName(event.currentTarget.value)} placeholder={inputPlaceholder} value={name} />
            <div className="mt-2 flex justify-end gap-2">
              <button className="inline-flex h-9 items-center justify-center rounded-lg px-4 text-sm hover:bg-bg-200" onClick={onClose} type="button">{text.cancel}</button>
              <button className={primaryButtonClass} disabled={!name.trim()} type="submit">{text.save}</button>
            </div>
          </form>
        </section>
      </div>
    </div>,
    document.body,
  );
}
