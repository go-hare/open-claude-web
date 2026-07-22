import { useSyncExternalStore } from "react";
import { SettingsRow, SettingsSection, Switch, sectionBodyClass } from "../SettingsShell";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import { readBootstrapFeatureFlag } from "../notificationRowGates";
import {
  getConnectorItems,
  subscribeConnectorItems,
} from "../../customize/connectors/connectorsStore";

/**
 * Official Connectors personal page Zt (cc989143e):
 * - Gate qt = !c("papi_disable_mcp_ui") (nav already keeps page for desktop shell)
 * - Header + "Connectors have moved to Customize" + desktop extensions link
 * - Wt Discovery: only when GrowthBook cai_opt_in_connector_suggestions is true
 *   (missing flag → omit — official if(!t) return null; do not invent on)
 * - Bt list residual: org/remote directory + local custom connectors.
 *   Without Anthropic directory feed, show local customize store items when present;
 *   else official empty: "Your organization has not enabled any connectors".
 */
export function ConnectorsSettings() {
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const items = useSyncExternalStore(subscribeConnectorItems, getConnectorItems, getConnectorItems);

  // Official Wt: t = c("cai_opt_in_connector_suggestions"); if (!t) return null
  const discoveryFlag = readBootstrapFeatureFlag(
    bootstrap.bootstrapPayload,
    "cai_opt_in_connector_suggestions",
  );
  const showDiscovery = discoveryFlag === true;
  const discoveryEnabled = bootstrap.account?.settings?.enabled_connector_suggestions === true;

  return (
    <div className="flex flex-col gap-7 pb-10">
      <main>
        <section className="mb-xl last:mb-0 ">
          <div className={sectionBodyClass}>
            <div className="flex items-start justify-between gap-lg pb-sm">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="text-heading-semibold text-primary">Connectors</h3>
                <p className="text-footnote text-secondary">
                  Allow Claude to reference other apps and services for more context.
                </p>
                <p className="text-footnote text-secondary">
                  Connectors have moved to{" "}
                  <a
                    className="cds-reset inline cursor-pointer rounded-[2px] text-accent underline decoration-[color-mix(in_srgb,currentColor,transparent_60%)] underline-offset-[3px] outline-none transition duration-fast hover:decoration-current focus-visible:shadow-focus focus-visible:decoration-current"
                    href="/customize/connectors"
                  >
                    Customize
                  </a>
                  .
                </p>
              </div>
            </div>

            {showDiscovery ? (
              <SettingsSection>
                <SettingsRow
                  label="Discovery"
                  description="Let Claude surface connectors from the directory that may be relevant to your conversation."
                  control={
                    <Switch
                      checked={discoveryEnabled}
                      onCheckedChange={(checked) => {
                        void updateAccountSetting("enabled_connector_suggestions", checked);
                      }}
                    />
                  }
                />
              </SettingsSection>
            ) : null}

            <div className="pt-md">
              {items.length > 0 ? (
                <ul className="flex flex-col divide-y divide-alpha-1">
                  {items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between gap-4 py-md">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-body text-primary">{item.name}</p>
                        {item.description ? (
                          <p className="truncate text-footnote text-secondary">{item.description}</p>
                        ) : null}
                      </div>
                      <a
                        className="cds-reset shrink-0 text-footnote text-accent underline-offset-2 hover:underline"
                        href={`/customize/connectors?selected=${encodeURIComponent(item.id)}`}
                      >
                        Configure
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex w-full items-center justify-center gap-2 text-text-400">
                  Your organization has not enabled any connectors
                </div>
              )}
              <div className="mt-6 text-sm text-text-400">
                Looking for desktop extensions? Manage them{" "}
                <a
                  className="cds-reset inline cursor-pointer rounded-[2px] text-accent underline decoration-[color-mix(in_srgb,currentColor,transparent_60%)] underline-offset-[3px] outline-none transition duration-fast hover:decoration-current focus-visible:shadow-focus focus-visible:decoration-current"
                  href="/settings/desktop/extensions"
                >
                  here
                </a>
                .
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
