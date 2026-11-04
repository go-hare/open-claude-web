/**
 * Official c11959232 FM residual — composer-adjacent session error card.
 * Uses shared SAt/MAt category copy (coworkSessionErrorCopy); product has no
 * separate Code si map — same residual categories.
 *
 * github_auth → Reconnect GitHub (GT4+roXeE1) when onReconnectGithub provided.
 * retryHelps + onRetry → Try again (FazwRldA7z).
 * Details (Lv0zJuL1jH) toggles raw error text (default open when unknown category).
 * Get logs ($h) residual Oh()→false — omit until enterprise residual on.
 */
import { useMemo, useState } from "react";
import { Icon } from "../../../shell/icons";
import { OfficialButton } from "../OfficialEpitaxyComponents";
import { coworkSessionErrorCopy } from "../../cowork/session/activity/coworkSessionErrorCopy";
import { useI18nText } from "../../../i18n/footerMenuMessages";
import { SESSION_LOAD_MESSAGES } from "../officialCodeChromeMessages";

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
  const text = useI18nText(SESSION_LOAD_MESSAGES);
  const copy = useMemo(() => coworkSessionErrorCopy(errorCategory), [errorCategory]);
  const [detailsOpen, setDetailsOpen] = useState(!copy.isKnownCategory);
  const showRetry = Boolean(onRetry) && copy.retryHelps;
  const showGithub = errorCategory === "github_auth" && Boolean(onReconnectGithub);

  return (
    <div
      className="relative isolate flex flex-col gap-g3 rounded-r7 p-p6 select-text"
      data-official-source="cd5a31703-B4nKQMBN.js:FM"
    >
      <div
        aria-hidden
        className="absolute inset-0 -z-[1] rounded-[inherit] pointer-events-none bg-surface-primary-elevated effect-primary-elevated"
        data-surface="sidebar"
      />
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
            <span data-intl-id="GT4+roXeE1">{text.reconnectGithub}</span>
          </OfficialButton>
        ) : null}
        {showRetry ? (
          <OfficialButton onClick={onRetry} size="small" variant="contained">
            <span data-intl-id="FazwRldA7z">{text.tryAgain}</span>
          </OfficialButton>
        ) : null}
        <button
          aria-expanded={detailsOpen}
          className="flex items-center gap-g2 text-footnote text-assistant-secondary hover:text-t7 hide-focus-ring focus:ring-focus rounded-r3 border-0 bg-transparent cursor-pointer p-0"
          onClick={() => setDetailsOpen((value) => !value)}
          type="button"
        >
          <Icon name={detailsOpen ? "ChevronDownSmall" : "ChevronRightSmall"} size="s" />
          <span data-intl-id="Lv0zJuL1jH">{text.details}</span>
        </button>
      </div>
    </div>
  );
}
