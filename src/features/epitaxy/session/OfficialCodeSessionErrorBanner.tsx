/**
 * Official c11959232 FM residual — composer-adjacent session error card.
 * Uses shared SAt/MAt category copy (coworkSessionErrorCopy); product has no
 * separate Code si map — same residual categories.
 *
 * github_auth → Reconnect GitHub when onReconnectGithub provided.
 * retryHelps + onRetry → Try again.
 * Details toggles raw error text (default open when unknown category).
 * Get logs ($h) residual Oh()→false — omit until enterprise residual on.
 */
import { useMemo, useState } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { coworkSessionErrorCopy } from "../../cowork/session/activity/coworkSessionErrorCopy";

export function OfficialCodeSessionErrorBanner({
  errorCategory,
  errorMessage,
  onReconnectGithub,
  onRetry,
  sessionId: _sessionId,
}: {
  errorCategory?: string | null;
  errorMessage: string;
  onReconnectGithub?: () => void;
  onRetry?: () => void;
  sessionId?: string;
}) {
  const copy = useMemo(() => coworkSessionErrorCopy(errorCategory), [errorCategory]);
  const [detailsOpen, setDetailsOpen] = useState(!copy.isKnownCategory);
  const showRetry = Boolean(onRetry) && copy.retryHelps;
  const showGithub = errorCategory === "github_auth" && Boolean(onReconnectGithub);

  return (
    <div
      className="relative isolate flex flex-col gap-g3 rounded-r7 p-p6 select-text"
      data-official-source="c11959232-h_zsw3wI.js:FM"
    >
      <div className="absolute inset-0 rounded-r7 bg-sidebar -z-10" aria-hidden="true" />
      <div className="flex items-center gap-g3">
        <Icon className="text-[var(--core-red)] shrink-0" name="XCrossCloseMedium" size="s" />
        <span className="text-body-semibold text-[var(--core-red)] min-w-0">{copy.title}</span>
      </div>
      <p className="text-body text-assistant-secondary m-0">{copy.body}</p>
      {detailsOpen ? (
        <div className="rounded-r4 bg-t1 px-p4 py-p3">
          <code className="text-code text-t7 break-all whitespace-pre-wrap">{errorMessage}</code>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-g3">
        {showGithub ? (
          <OfficialButton onClick={onReconnectGithub} size="small" variant="contained">
            Reconnect GitHub
          </OfficialButton>
        ) : null}
        {showRetry ? (
          <OfficialButton onClick={onRetry} size="small" variant="contained">
            Try again
          </OfficialButton>
        ) : null}
        <button
          aria-expanded={detailsOpen}
          className="flex items-center gap-g2 text-footnote text-assistant-secondary hover:text-t7 hide-focus-ring focus:ring-focus rounded-r3 border-0 bg-transparent cursor-pointer p-0"
          onClick={() => setDetailsOpen((value) => !value)}
          type="button"
        >
          <Icon name={detailsOpen ? "ChevronDownSmall" : "ChevronRightSmall"} size="s" />
          Details
        </button>
      </div>
    </div>
  );
}
