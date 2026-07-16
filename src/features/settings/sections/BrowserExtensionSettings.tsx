import { useCallback, useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { GhostSelect } from "../SettingsControls";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official personal Chrome settings body Or (c94fbcf3e) mounted by ft (cc989143e):
 * settings = account.settings.browser_extension_settings
 * onSave → mutate account settings { browser_extension_settings: { enabled, default_domain_policy, allowed_domains, blocked_domains } }
 * UI: Default for all sites (allow | block) + domain list (full modal later).
 * Desktop "Allow all browser actions" is separate (c71860c77-B8t_5Z9x ts → AppPreferences.allowAllBrowserActions).
 */

export type BrowserExtensionSettingsShape = {
  allowed_domains?: string[];
  blocked_domains?: string[];
  default_domain_policy?: "allow" | "block" | string | null;
  enabled?: boolean;
};

const POLICY_OPTIONS = [
  { value: "allow", label: "Allow extension" },
  { value: "block", label: "Block extension" },
];

export function BrowserExtensionSettings() {
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const raw = bootstrap.account?.settings?.browser_extension_settings;
  const settings: BrowserExtensionSettingsShape =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as BrowserExtensionSettingsShape) : {};
  const policy = settings.default_domain_policy === "block" ? "block" : settings.default_domain_policy === "allow" ? "allow" : "";
  const list = policy === "allow" ? settings.blocked_domains ?? [] : policy === "block" ? settings.allowed_domains ?? [] : [];
  const [pending, setPending] = useState(false);

  const save = useCallback(
    async (next: BrowserExtensionSettingsShape) => {
      setPending(true);
      try {
        await updateAccountSetting("browser_extension_settings", {
          enabled: next.enabled !== false,
          default_domain_policy: next.default_domain_policy ?? "allow",
          allowed_domains: next.allowed_domains ?? [],
          blocked_domains: next.blocked_domains ?? [],
        });
      } finally {
        setPending(false);
      }
    },
    [updateAccountSetting],
  );

  return (
    <main className="flex flex-col gap-7 pb-10">
      <section className="mb-xl last:mb-0">
        <div className="space-y-3">
          <div className="h-[60px] w-[60px]" aria-hidden="true" />
          <h3 className="text-heading-semibold text-primary">Claude in Chrome settings</h3>
        </div>
      </section>
      <SettingsSection>
        <SettingsRow
          label="Default for all sites"
          description="Choose whether Claude in Chrome works on all sites by default"
          control={
            <GhostSelect
              align="end"
              placeholder="Select default policy"
              value={policy}
              options={POLICY_OPTIONS}
              onChange={(value) => {
                void save({
                  ...settings,
                  enabled: true,
                  default_domain_policy: value,
                  allowed_domains: settings.allowed_domains ?? [],
                  blocked_domains: settings.blocked_domains ?? [],
                });
              }}
            />
          }
        />
        {policy ? (
          <>
            <p className="py-sm text-footnote text-secondary">
              {policy === "allow"
                ? "Claude in Chrome works everywhere except sites you block below"
                : "Claude in Chrome only works on sites you allow below"}
            </p>
            <SettingsRow
              label={policy === "allow" ? "Blocked sites" : "Allowed sites"}
              description={
                policy === "allow"
                  ? "Claude in Chrome cannot be used on these sites"
                  : "Claude in Chrome can be used on these websites."
              }
              control={
                <span className="text-footnote text-secondary">
                  {list.length === 0 ? "None" : `${list.length} site${list.length === 1 ? "" : "s"}`}
                </span>
              }
            />
            {list.length > 0 ? (
              <div className="divide-y divide-border-300 divide-[0.5px]">
                {list.map((domain) => (
                  <div key={domain} className="flex items-center justify-between py-3">
                    <span className="text-body text-primary">{domain}</span>
                    <button
                      type="button"
                      className="cds-reset text-footnote text-danger-000 outline-none focus-visible:shadow-focus"
                      disabled={pending}
                      onClick={() => {
                        if (policy === "allow") {
                          void save({
                            ...settings,
                            enabled: true,
                            blocked_domains: (settings.blocked_domains ?? []).filter((item) => item !== domain),
                          });
                        } else {
                          void save({
                            ...settings,
                            enabled: true,
                            allowed_domains: (settings.allowed_domains ?? []).filter((item) => item !== domain),
                          });
                        }
                      }}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : null}
      </SettingsSection>
    </main>
  );
}
