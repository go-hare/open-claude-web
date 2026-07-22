import {
  providerDisplayName,
  useSettingsBootstrap,
} from "../useSettingsBootstrap";

/**
 * Official Privacy personal page (cc989143e cn/rn / _Component16):
 * - Gate dn() = !raven (nav already); body gateway provider card when org uses external inference.
 * - Official English copy (tgkg69DKCl / ULnTQCHxiV / MYYAX2WEkL).
 * Anthropic-hosted privacy toggles need GrowthBook arms — do not invent them here.
 */
export function PrivacySettings() {
  const { bootstrap } = useSettingsBootstrap();
  const providerName = providerDisplayName(bootstrap, "your provider");

  return (
    <main className="flex flex-col pb-10">
      <div className="pb-xl">
        <div className="flex flex-col rounded-card bg-surface-1 p-lg shadow-card-ring">
          <p className="pb-md text-footnote">
            You’re running Claude through your organization’s own inference provider ({providerName}).
            Your conversations are sent there, not to Anthropic, and are governed by your organization’s
            agreement with that provider.
          </p>
          <div className="border-t border-alpha-1 pt-sm">
            <div className="flex flex-col gap-md pt-xs">
              <div>
                <p className="text-body text-primary">What Anthropic doesn’t see</p>
                <ul className="list-disc space-y-1 pl-6 pt-1">
                  <li>
                    <p className="text-body text-primary">
                      Your prompts, Claude’s responses, or any conversation content
                    </p>
                  </li>
                  <li>
                    <p className="text-body text-primary">Your files, code, or workspace contents</p>
                  </li>
                  <li>
                    <p className="text-body text-primary">Your identity or account details</p>
                  </li>
                </ul>
              </div>
              <div>
                <p className="text-body text-primary">
                  What Anthropic may receive (configured by your organization)
                </p>
                <ul className="list-disc space-y-1 pl-6 pt-1">
                  <li>
                    <p className="text-body text-primary">
                      Crash reports and error diagnostics, so we can fix bugs
                    </p>
                  </li>
                  <li>
                    <p className="text-body text-primary">
                      Anonymous usage metrics including usage counts (not conversation content)
                    </p>
                  </li>
                  <li>
                    <p className="text-body text-primary">
                      Update-check requests, so the app can stay current
                    </p>
                  </li>
                  <li>
                    <p className="text-body text-primary">
                      A diagnostic report, only if you explicitly choose “Send to Anthropic”
                    </p>
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
