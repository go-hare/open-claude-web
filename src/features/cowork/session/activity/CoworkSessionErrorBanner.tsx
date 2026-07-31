import { useMemo, useState } from "react";
import { Icon } from "../../../../shell/icons";
import { CoworkComposerButton } from "../../composer/CoworkComposerPrimitives";
import { CoworkChevronDownGlyph, CoworkChevronRightSmallGlyph, CoworkRetryGlyph } from "../../ui/CoworkOfficialGlyphs";
import { coworkSessionErrorCopy } from "./coworkSessionErrorCopy";
import { canOpenCoworkAgentFeedback, openCoworkAgentFeedback } from "./openCoworkAgentFeedback";

export function CoworkSessionErrorBanner({
  errorCategory,
  errorMessage,
  hostLoopMode,
  onRewind,
  onTryAgain,
  sessionId,
}: {
  errorCategory?: string | null;
  errorMessage: string;
  /** Official LAt sessionHostLoopMode → HL / VM chip when defined. */
  hostLoopMode?: boolean | null;
  onRewind?: () => Promise<void> | void;
  onTryAgain?: () => Promise<void> | void;
  sessionId?: string | null;
}) {
  const copy = useMemo(() => coworkSessionErrorCopy(errorCategory), [errorCategory]);
  // Official MAt.retryHelps — only surface Try again when residual says retry helps.
  const showTryAgain = Boolean(onTryAgain) && copy.retryHelps;
  // Official xT?.openFeedbackWindow gate — Share feedback only when bridge present.
  const showShareFeedback = canOpenCoworkAgentFeedback();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(!copy.isKnownCategory);
  const copyError = async () => {
    try {
      await navigator.clipboard.writeText(errorMessage);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="max-w-xl ml-1 mb-1.5 rounded-lg border border-warning-200 overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-warning-900">
        <Icon className="text-warning-000 shrink-0" customSize={16} name="Warning" />
        <span className="text-sm font-medium text-warning-000">{copy.title}</span>
        {hostLoopMode !== undefined && hostLoopMode !== null ? (
          <span className="ml-auto font-mono text-[10px] tracking-wide text-warning-000/60">
            {hostLoopMode ? "HL" : "VM"}
          </span>
        ) : null}
      </div>
      <div className="bg-bg-300 px-3 py-2">
        <p className="text-xs text-text-100">{copy.body}</p>
        <div className="mt-2 flex items-start justify-between gap-2">
          <button aria-expanded={expanded} className="flex items-center gap-1 text-xs text-text-300 hover:text-text-100" onClick={() => setExpanded((value) => !value)} type="button">
            {expanded ? <CoworkChevronDownGlyph size={12} /> : <CoworkChevronRightSmallGlyph size={12} />}
            Details
          </button>
          <CoworkComposerButton ariaLabel="Copy error message" className="shrink-0" onClick={() => void copyError()} size="icon-sm" variant="ghost"><Icon customSize={16} name="Copy" /></CoworkComposerButton>
        </div>
        {expanded ? <code className="mt-1 block text-xs text-text-300 break-all whitespace-pre-wrap font-mono">{errorMessage}</code> : null}
        {copied ? <span className="text-xs text-brand-100 mt-1.5 block">Copied</span> : null}
        {onRewind ? <p className="mt-2 text-xs text-text-300">You can restart the conversation from an earlier message.</p> : null}
        {showTryAgain || onRewind ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            {onRewind ? <CoworkComposerButton className="gap-1.5" onClick={() => void onRewind()} size="sm" variant="secondary"><CoworkRetryGlyph size={14} />Go back</CoworkComposerButton> : null}
            {showTryAgain ? <CoworkComposerButton className="gap-1.5" onClick={() => void onTryAgain?.()} size="sm" variant="secondary"><CoworkRetryGlyph size={14} />Try again</CoworkComposerButton> : null}
          </div>
        ) : null}
        {/* Official residual: x && Boolean(xT?.openFeedbackWindow) → Share feedback. */}
        {showShareFeedback ? (
          <div className="mt-2 flex flex-col gap-2">
            <p className="text-xs text-text-300">Sending your logs helps us diagnose and fix this issue.</p>
            <CoworkComposerButton
              className="self-start"
              onClick={() =>
                openCoworkAgentFeedback({
                  errorMessage,
                  hostLoopMode,
                  sessionId,
                  source: "session_error_banner",
                })
              }
              size="sm"
              variant="secondary"
            >
              Share feedback
            </CoworkComposerButton>
          </div>
        ) : null}
      </div>
    </div>
  );
}
