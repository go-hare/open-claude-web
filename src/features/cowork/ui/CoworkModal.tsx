import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { CoworkButton } from "./CoworkButton";

type CoworkModalProps = {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  title: ReactNode;
  width?: string;
};

export function CoworkModal({ children, isOpen, onClose, title, width = "w-[640px]" }: CoworkModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);
  if (!isOpen) return null;
  return createPortal(
    <div className="epitaxy-root">
      <button aria-label="Close modal" className="fixed inset-0 z-50 bg-always-black/50 backdrop-blur-[2px] draggable-none border-0 cursor-default" onClick={onClose} type="button" />
      <section aria-modal="true" className={`epitaxy-root fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2 ${width} max-w-[calc(100vw-2rem)] max-h-[calc(100vh-4rem)] draggable-none outline-none`} role="dialog">
        <div className="relative isolate rounded-r6 flex flex-col max-h-[inherit]">
          <span aria-hidden="true" className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-popover effect-hud" />
          <div className="flex items-center justify-between gap-g4 px-[24px] pt-[24px]"><h2 className="text-heading-semibold text-t9">{title}</h2><CoworkButton ariaLabel="Close" icon="XCrossCloseMedium" onClick={onClose} size="small" /></div>
          <div className="flex-1 min-h-0 overflow-y-auto px-[24px] pb-[24px] pt-[16px]">{children}</div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
