import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass } from "../features/shared/buttonClasses";
import { type ShellText, useShellText } from "../i18n/shellMessages";
import { Icon } from "./icons";
import type { SidebarNavItem } from "./sidebarData";

type CustomizeSidebarDialogProps = {
  isOpen: boolean;
  items: SidebarNavItem[];
  isPinned: (key: string) => boolean;
  onClose: () => void;
  onToggle: (key: string) => void;
};

// 官方 c5f4e1303 Modal Overlay/Content class：
// - Overlay: fixed z-modal inset-0 grid items-center ... backdrop-blur-[2px]
// - Content: flex flex-col focus:outline-none ... rounded-2xl md:p-6 p-4
const overlayClassName = "fixed z-modal inset-0 grid items-center justify-items-center bg-always-black overflow-y-auto md:p-10 p-4 [background-color:hsl(var(--always-black)/var(--modal-overlay-opacity,0.5))] backdrop-blur-[2px] data-[state=\"open\"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:fade_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] draggable-none";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl md:p-6 p-4 align-middle data-[state=\"open\"]:[animation:zoom_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:zoom_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] min-w-0 w-full max-w-sm bg-bg-100";
const modalVars = {
  "--modal-animation-duration": "250ms",
  "--modal-close-duration": "125ms",
  "--modal-overlay-opacity": 0.5,
} as CSSProperties;

export function CustomizeSidebarDialog({ isOpen, isPinned, items, onClose, onToggle }: CustomizeSidebarDialogProps) {
  const text = useShellText();
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;
  return createPortal(
    <div className="epitaxy-root">
      <div
        className={overlayClassName}
        data-state="open"
        onMouseDown={onClose}
        role="presentation"
        style={modalVars}
      >
        <section
          aria-labelledby="customize-sidebar-title"
          aria-modal="true"
          className={contentClassName}
          data-state="open"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          style={modalVars}
        >
          <div className="min-h-full flex flex-col">
            <div className="flex items-center gap-4 justify-between">
              <h2 className="font-xl-bold text-text-100 flex w-full min-w-0 items-center leading-6 break-words" id="customize-sidebar-title">
                <span className="[overflow-wrap:anywhere]">{text.customizeSidebar}</span>
              </h2>
              <div className="flex items-center gap-2">
                <button aria-label="Close" className="inline-flex size-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent !text-text-500 hover:bg-bg-200 hover:!text-text-400 -mx-2" onClick={onClose} type="button"><Icon name="X" size="sm" /></button>
              </div>
            </div>
            <p className="text-text-300 mb-2 text-sm">{text.customizeSidebarDescription}</p>
            <div autoFocus className="flex flex-col gap-1 py-2 outline-none" tabIndex={-1}>
              {items.map((item) => <SidebarCheckbox checked={isPinned(item.key)} item={item} key={item.key} onChange={() => onToggle(item.key)} text={text} />)}
            </div>
            <div className="mt-4 flex flex-col gap-2 sm:flex-row justify-end">
              <button className={primaryButtonClass} onClick={onClose} type="button">{text.done}</button>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

function SidebarCheckbox({ checked, item, onChange, text }: { checked: boolean; item: SidebarNavItem; onChange: () => void; text: ShellText }) {
  return (
    <label className="select-none flex flex-row gap-3 cursor-pointer text-left shrink-0 items-center w-full rounded-md px-2 py-1.5 hover:bg-bg-200">
      <input checked={checked} className="sr-only peer" onChange={onChange} type="checkbox" />
      <div className={`shrink-0 w-4 h-4 flex items-center justify-center border rounded transition-colors duration-100 ease-in-out peer-focus-visible:ring-1 ring-offset-2 ring-offset-bg-300 ring-accent-100/70 ${checked ? "bg-accent-100 border-accent-100" : "bg-bg-000 border-border-200 hover:border-border-100"}`}>
        {checked ? (
          <svg className="text-oncolor-100" fill="none" height="10" viewBox="0 0 12 12" width="10" aria-hidden="true">
            <path d="M2 6.5L4.5 9L10.5 3" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
          </svg>
        ) : null}
      </div>
      <span className="leading-none">
        <span className="flex items-center gap-2.5 text-sm text-text-200"><Icon name={item.icon} />{sidebarDialogItemLabel(item, text)}</span>
      </span>
    </label>
  );
}

function sidebarDialogItemLabel(item: SidebarNavItem, text: ShellText) {
  if (item.key === "projects") return text.projects;
  if (item.key === "scheduled") return text.scheduledTasks;
  if (item.key === "customize") return text.customize;
  return item.label;
}
