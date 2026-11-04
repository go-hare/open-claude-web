/**
 * Official c62135ccf `kn` / `On` Guest pass home section.
 *
 * Residual gate (kn):
 *   !cowork_referrals || te() || !m || dismissed || loading || !eligible
 *   || remaining<=0 || !referralLink → **null**
 *
 * Product: no referral/guest-pass bridge yet → always null (honest empty branch).
 * Mount point retained so home shell matches official order after suggestions.
 * Do NOT invent OAuth / fake remaining passes.
 *
 * Presentational `On` DOM (for when bridge exists) — class strings copied from
 * residual On; not rendered while gated off.
 */
import type { ReactNode } from "react";
// ReactNode used by TermsLink only when On mounts (kn gate open).

const GUEST_PASS_DISMISS_KEY = "cowork-guest-pass-home";

export type CoworkGuestPassHomeProps = {
  /**
   * When product gains a residual-honest referral feed, pass resolved props.
   * Omit / undefined → official kn empty → null.
   */
  model?: CoworkGuestPassModel | null;
};

export type CoworkGuestPassModel = {
  remainingPasses: number;
  totalPasses: number;
  formattedRewardAmount: string | null;
  referralLink: string;
  onCopyLink: (link: string) => void;
  didCopy: boolean;
  onDismiss: () => void;
};

/** Official kn — currently no product feed → null. */
export function CoworkGuestPassHome({ model = null }: CoworkGuestPassHomeProps) {
  if (!model) return null;
  if (model.remainingPasses <= 0 || !model.referralLink) return null;
  if (isCoworkGuestPassDismissed()) return null;
  return (
    <CoworkGuestPassSection
      didCopy={model.didCopy}
      formattedRewardAmount={model.formattedRewardAmount}
      onCopyLink={model.onCopyLink}
      onDismiss={() => {
        dismissCoworkGuestPass();
        model.onDismiss();
      }}
      referralLink={model.referralLink}
      remainingPasses={model.remainingPasses}
      totalPasses={model.totalPasses}
    />
  );
}

/**
 * Official On presentational — residual classNames verbatim.
 * Only mounted when kn gate opens.
 */
function CoworkGuestPassSection({
  remainingPasses,
  totalPasses,
  formattedRewardAmount,
  onDismiss,
  onCopyLink,
  didCopy,
  referralLink,
}: {
  remainingPasses: number;
  totalPasses: number;
  formattedRewardAmount: string | null;
  onDismiss: () => void;
  onCopyLink: (link: string) => void;
  didCopy: boolean;
  referralLink: string;
}) {
  return (
    <section
      className="w-full max-w-2xl mt-8 group/guest-pass"
      data-official-source="c62135ccf-Dn28vJ3V.js:On/kn Guest pass"
    >
      <div className="flex items-center justify-between mb-2 px-2">
        <span className="font-small text-muted">Guest pass</span>
        <button
          aria-label="Dismiss guest pass"
          className="relative before:absolute before:-inset-0.5 before:content-[''] text-muted hover:text-secondary transition-colors opacity-0 group-hover/guest-pass:opacity-100"
          onClick={onDismiss}
          type="button"
        >
          ×
        </button>
      </div>
      <div className="flex items-start gap-4 px-2 py-3 rounded-lg">
        <div className="flex-shrink-0">
          <div className="rounded-xl overflow-hidden bg-surface-0 p-2 w-fit border-[0.29px] border-strong">
            <div className="bg-surface-3 rounded-lg p-2 mb-1">
              <div className="flex items-center justify-center font-small text-primary">Gift</div>
            </div>
            <span className="font-small text-muted px-0.5">
              {remainingPasses}/{totalPasses} left
            </span>
          </div>
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <span className="font-base text-primary">Gift a week of Cowork</span>
          <span className="font-small text-secondary">
            {formattedRewardAmount
              ? `Send a friend a free week of Cowork. If they love it and subscribe, you’ll get ${formattedRewardAmount} in usage credits.`
              : "Send a guest pass to a friend. They’ll get a free week to try Cowork."}{" "}
            <TermsLink />
          </span>
          <div className="mt-3">
            <button
              className="cds-reset relative isolate inline-flex h-control shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded border-0 px-3 text-body font-medium outline-none transition-shadow duration-fast select-none"
              onClick={() => onCopyLink(referralLink)}
              type="button"
            >
              {didCopy ? "Copied!" : "Copy invite"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function TermsLink(): ReactNode {
  return (
    <a
      className="underline-offset-2 hover:underline"
      href="https://support.claude.com/en/articles/13456702-claude-code-guest-passes"
      rel="noopener noreferrer"
      target="_blank"
    >
      Terms apply
    </a>
  );
}

function isCoworkGuestPassDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(GUEST_PASS_DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function dismissCoworkGuestPass(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(GUEST_PASS_DISMISS_KEY, "1");
  } catch {
    /* ignore */
  }
}
