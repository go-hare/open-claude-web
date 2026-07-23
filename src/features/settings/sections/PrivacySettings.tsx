import {
  providerDisplayName,
  useSettingsBootstrap,
} from "../useSettingsBootstrap";
import {
  formatPrivacyGatewayIntro,
  usePrivacySettingsText,
} from "../settingsMessages";

/**
 * Official Privacy personal page (cc989143e cn/rn / _Component16 ln):
 * - Gate dn() = !raven (nav already); body is gateway provider card for custom3p.
 * - Copy via official message ids (tgkg69DKCl / ULnTQCHxiV / MYYAX2WEkL + list ids).
 * Anthropic-hosted privacy toggles need GrowthBook arms — do not invent them here.
 *
 * Structure residual:
 *   main.flex.flex-col > .pb-xl > card.rounded-card.bg-surface-1.p-lg.shadow-card-ring
 *   intro p.pb-md.text-footnote
 *   border-t + two sections with ul.list-disc.pl-6.pt-1.space-y-1
 */
export function PrivacySettings() {
  const { bootstrap } = useSettingsBootstrap();
  const text = usePrivacySettingsText();
  const providerName = providerDisplayName(bootstrap, text.yourProvider);
  const intro = formatPrivacyGatewayIntro(text.gatewayIntro, providerName);

  return (
    <main className="flex flex-col pb-10">
      <div className="pb-xl">
        <div className="flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring">
          <p className="pb-md text-footnote">{intro}</p>
          <div className="border-t border-alpha-1 pt-sm">
            <div className="flex flex-col gap-md pt-xs">
              <div>
                <p className="text-body text-primary">{text.whatAnthropicDoesNotSee}</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li>
                    <p className="text-body text-primary">{text.promptsResponsesContent}</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">{text.filesCodeWorkspace}</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">{text.identityAccountDetails}</p>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-body text-primary">{text.whatAnthropicMayReceive}</p>
                <ul className="list-disc pl-6 pt-1 space-y-1">
                  <li>
                    <p className="text-body text-primary">{text.crashReports}</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">{text.anonymousUsageMetrics}</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">{text.updateCheckRequests}</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">{text.diagnosticReport}</p>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
