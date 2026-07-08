import { useEffect, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass, secondaryButtonClass } from "../../shared/buttonClasses";

type OfficialTrustModalProps = {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  sources: string[];
  workspace: string;
};

const overlayClassName = "fixed z-modal inset-0 grid items-center justify-items-center bg-always-black overflow-y-auto md:p-10 p-4 [background-color:hsl(var(--always-black)/var(--modal-overlay-opacity,0.5))] backdrop-blur-[2px] data-[state=\"open\"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:fade_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] draggable-none";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl align-middle data-[state=\"open\"]:[animation:zoom_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:zoom_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] min-w-0 w-full max-w-md bg-bg-100 !p-6";
const modalVars = {
  "--modal-animation-duration": "250ms",
  "--modal-close-duration": "125ms",
  "--modal-overlay-opacity": 0.5,
} as CSSProperties;

export function OfficialTrustModal({ isOpen, onAccept, onDecline, sources, workspace }: OfficialTrustModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onDecline();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onDecline]);

  if (!isOpen) return null;

  return createPortal(
    <div className="epitaxy-root">
      <div className={overlayClassName} data-state="open" onMouseDown={onDecline} role="presentation" style={modalVars}>
        <section
          aria-labelledby="workspace-trust-title"
          aria-modal="true"
          className={contentClassName}
          data-state="open"
          onMouseDown={(event) => event.stopPropagation()}
          role="dialog"
          style={modalVars}
        >
          <div>
            <h2 className="text-lg font-semibold text-text-000 mb-3" id="workspace-trust-title">
              Trust this workspace?
            </h2>
            <div className="mb-4 break-all font-mono text-text-000">{workspace}</div>
            <p className="text-sm text-text-200 mb-4">
              Claude Code may read, write, or execute files in this directory. Only proceed if you trust this workspace.
            </p>
            <p className="text-sm text-text-300 mb-4">
              Read our{" "}
              <a className="underline underline-offset-2" href="https://code.claude.com/docs/en/security" rel="noreferrer" target="_blank">
                security guide
              </a>{" "}
              for more information.
            </p>
            {sources.length > 0 ? (
              <div className="mb-4">
                <div className="text-xs text-text-500 mb-2">Execution allowed by:</div>
                <div className="bg-bg-100 rounded-lg border border-border-200 p-3 max-h-32 overflow-y-auto">
                  <ul className="text-xs text-text-300 space-y-1">
                    {sources.map((source) => <li className="font-mono break-all" key={source}>{source}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button className={secondaryButtonClass} onClick={onDecline} type="button">Cancel</button>
              <button className={primaryButtonClass} onClick={onAccept} type="button">Trust Workspace</button>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}
