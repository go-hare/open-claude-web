import { useEffect, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { primaryButtonClass, secondaryButtonClass } from "../../shared/buttonClasses";
import { useI18nText, type MessageDescriptors } from "../../../i18n/footerMenuMessages";

type OfficialTrustModalProps = {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
  sources: string[];
  workspace: string;
};

/**
 * Official ion-dist TrustModal (c9e2ad3c4-WQVBiCoD `T` / displayName "TrustModal"):
 * FormattedMessage ids CFLhTeXdtP / etzx+mWbIN / 5/K8NDKvVv / PUtELeH1Zb /
 * 47FYwba+bI / A8cWTYrr6E with securityLink rich text on 5/K8NDKvVv.
 */
const TRUST_MODAL_MESSAGES = {
  title: { defaultMessage: "Trust this workspace?", id: "CFLhTeXdtP" },
  body: {
    defaultMessage:
      "Claude Code may read, write, or execute files in this directory. Only proceed if you trust this workspace.",
    id: "etzx+mWbIN",
  },
  security: {
    defaultMessage: "Read our <securityLink>security guide</securityLink> for more information.",
    id: "5/K8NDKvVv",
  },
  executionAllowedBy: { defaultMessage: "Execution allowed by:", id: "PUtELeH1Zb" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  trustWorkspace: { defaultMessage: "Trust Workspace", id: "A8cWTYrr6E" },
} satisfies MessageDescriptors;

const overlayClassName = "fixed z-modal inset-0 grid items-center justify-items-center bg-always-black overflow-y-auto md:p-10 p-4 [background-color:hsl(var(--always-black)/var(--modal-overlay-opacity,0.5))] backdrop-blur-[2px] data-[state=\"open\"]:[animation:fade_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:fade_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] draggable-none";
const contentClassName = "flex flex-col focus:outline-none relative text-text-100 text-left shadow-xl border-0.5 border-border-300 rounded-2xl align-middle data-[state=\"open\"]:[animation:zoom_var(--modal-animation-duration,250ms)_ease-out_forwards] data-[state=\"closed\"]:[animation:zoom_var(--modal-close-duration,125ms)_ease-in_reverse_forwards] min-w-0 w-full max-w-md bg-bg-100 !p-6";
const modalVars = {
  "--modal-animation-duration": "250ms",
  "--modal-close-duration": "125ms",
  "--modal-overlay-opacity": 0.5,
} as CSSProperties;

export function OfficialTrustModal({ isOpen, onAccept, onDecline, sources, workspace }: OfficialTrustModalProps) {
  const text = useI18nText(TRUST_MODAL_MESSAGES);

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
              {text.title}
            </h2>
            <div className="mb-4 break-all font-mono text-text-000">{workspace}</div>
            <p className="text-sm text-text-200 mb-4">{text.body}</p>
            <p className="text-sm text-text-300 mb-4">
              <SecurityGuideMessage template={text.security} />
            </p>
            {sources.length > 0 ? (
              <div className="mb-4">
                <div className="text-xs text-text-500 mb-2">{text.executionAllowedBy}</div>
                <div className="bg-bg-100 rounded-lg border border-border-200 p-3 max-h-32 overflow-y-auto">
                  <ul className="text-xs text-text-300 space-y-1">
                    {sources.map((source) => <li className="font-mono break-all" key={source}>{source}</li>)}
                  </ul>
                </div>
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button className={secondaryButtonClass} onClick={onDecline} type="button">{text.cancel}</button>
              <button className={primaryButtonClass} onClick={onAccept} type="button">{text.trustWorkspace}</button>
            </div>
          </div>
        </section>
      </div>
    </div>,
    document.body,
  );
}

/** Official values.securityLink → <P href=security docs>{chunk}</P>. */
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
