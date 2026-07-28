import { useMemo } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { BranchInput, WorktreeSelect } from "../SettingsControls";
import {
  renderClaudeCodeBypassDescription,
  useClaudeCodeSettingsText,
} from "../settingsMessages";
import { readBootstrapFeatureFlag } from "../notificationRowGates";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official ClaudeCodePage Ct (cc989143e) + cadc35a07 Ea/Na/Pa:
 * Local sessions Ct + Pull requests _t.
 *
 * Local gates (official residual):
 *   n = se() — desktop/app shell gate (product page only mounts on desktop settings)
 *   Bypass row: C && i !== false && !r
 *     C = void 0 !== prefs.bypassPermissionsModeEnabled (key present after SSA merge)
 *     i = IA = gA("claude_code_desktop_bypass_permissions").isAvailable
 *     r = m() = wk("raven")
 *   Preview row: S = Ea() = launchEnabled store && Launch.isAvailable (cadc35a07 k/P)
 *   Persist Preview: S && launchEnabled
 *
 * Product residual: missing GrowthBook flag → keep bypass visible (do not invent hide);
 * explicit false → hide. Raven → hide bypass. Launch.isAvailable false/absent → hide Preview
 * (never invent Launch availability; desktop main registers isAvailable: true).
 *
 * PR: account.settings ccr_auto_create_pr_on_push / ccr_auto_create_pr_as_draft via mutate.
 * Auto-archive uses Statsig copy keys — residual EN below (not spa i18n).
 */
export function ClaudeCodeSettings() {
  const text = useClaudeCodeSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  // Official _t: g = settings.ccr_auto_create_pr_on_push ?? false (no desktop pref fallback).
  const autoCreatePr = settings.ccr_auto_create_pr_on_push === true;
  // Official: h = settings.ccr_auto_create_pr_as_draft ?? true
  const createAsDraft = settings.ccr_auto_create_pr_as_draft !== false;

  // Official C: key present on prefs bag (SSA always defines it once bridge loads).
  const bypassKeyPresent = preferences.bypassPermissionsModeEnabled !== undefined;
  // Official IA residual — missing flag stays visible on 3P desktop; explicit false hides.
  const bypassFeatureAvailable =
    readBootstrapFeatureFlag(
      bootstrap.bootstrapPayload,
      "claude_code_desktop_bypass_permissions",
    ) !== false;
  // Official r = wk("raven") — hide bypass on raven.
  const showBypassRow =
    bypassKeyPresent && bypassFeatureAvailable && !bootstrap.isRaven;

  // Official Ea / k(): Launch.isAvailable && launchEnabled preference store.
  // Product: check sync isAvailable when bridge exposes it; absent → false (no invent).
  const launchApiAvailable = useMemo(() => isDesktopLaunchAvailable(), []);
  const showPreviewRow = launchApiAvailable;
  const previewEnabled = preferences.launchEnabled !== false;

  const setAccountFlag = (key: "ccr_auto_create_pr_on_push" | "ccr_auto_create_pr_as_draft", next: boolean) => {
    void updateAccountSetting(key, next);
    if (key === "ccr_auto_create_pr_on_push") {
      // Keep desktop preference in sync for remote-session consumers that still read bridge prefs.
      setPreference("autoCreatePullRequests", next);
    }
    // Official residual: BranchRows draft default reads account.settings; mirror for
    // same-tab consumers that cannot re-fetch bootstrap immediately.
    try {
      if (key === "ccr_auto_create_pr_as_draft") {
        window.sessionStorage?.setItem(
          "claude.account.settings.ccr_auto_create_pr_as_draft",
          next ? "true" : "false",
        );
        window.localStorage?.setItem(
          "ccr_auto_create_pr_as_draft",
          JSON.stringify(next),
        );
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <main>
      <SettingsSection title={text.localSessions}>
        {showBypassRow ? (
          <SettingsRow
            label={text.allowBypassPermissionsMode}
            description={renderClaudeCodeBypassDescription(text.allowBypassPermissionsModeDescription)}
            control={
              <Switch
                checked={preferences.bypassPermissionsModeEnabled === true}
                onCheckedChange={(checked) => setPreference("bypassPermissionsModeEnabled", checked)}
              />
            }
          />
        ) : null}
        <SettingsRow
          label={text.drawAttentionOnNotifications}
          description={text.drawAttentionOnNotificationsDescription}
          control={
            <Switch
              checked={!!preferences.dockBounceEnabled}
              onCheckedChange={(checked) => setPreference("dockBounceEnabled", checked)}
            />
          }
        />
        <SettingsRow
          label={text.worktreeLocation}
          description={text.worktreeLocationDescription}
          control={
            <WorktreeSelect
              onChange={(value) => setPreference("chillingSlothLocation", value)}
              value={preferences.chillingSlothLocation}
            />
          }
        />
        <SettingsRow
          label={text.branchPrefix}
          description={text.branchPrefixDescription}
          control={
            <BranchInput
              onChange={(value) => setPreference("ccBranchPrefix", value)}
              value={preferences.ccBranchPrefix ?? ""}
            />
          }
        />
        {showPreviewRow ? (
          <SettingsRow
            label={text.preview}
            description={text.previewDescription}
            control={
              <Switch
                checked={previewEnabled}
                onCheckedChange={(checked) => setPreference("launchEnabled", checked)}
              />
            }
          />
        ) : null}
        {showPreviewRow && previewEnabled ? (
          <SettingsRow
            label={text.persistPreviewSessions}
            description={text.persistPreviewSessionsDescription}
            control={
              <Switch
                checked={!!preferences.launchPreviewPersistSession}
                onCheckedChange={(checked) => setPreference("launchPreviewPersistSession", checked)}
              />
            }
          />
        ) : null}
      </SettingsSection>
      <SettingsSection title={text.pullRequests}>
        <SettingsRow
          label={text.createPullRequestsAutomatically}
          description={text.createPullRequestsAutomaticallyDescription}
          control={
            <Switch
              checked={autoCreatePr}
              onCheckedChange={(checked) => setAccountFlag("ccr_auto_create_pr_on_push", checked)}
            />
          }
        />
        {autoCreatePr ? (
          <SettingsRow
            className="pl-6"
            label={text.createAsDraft}
            description={text.createAsDraftDescription}
            control={
              <Switch
                checked={createAsDraft}
                onCheckedChange={(checked) => setAccountFlag("ccr_auto_create_pr_as_draft", checked)}
              />
            }
          />
        ) : null}
        {/* Official _t Auto-archive: Statsig 1wdvcl / 1kh0255 (not spa i18n). Keep residual EN. */}
        <SettingsRow
          label="Auto-archive closed PR sessions"
          description="When an auto-created pull request is closed, automatically archive the matching local session."
          control={
            <Switch
              checked={!!preferences.ccAutoArchiveOnPrClose}
              onCheckedChange={(checked) => setPreference("ccAutoArchiveOnPrClose", checked)}
            />
          }
        />
      </SettingsSection>
    </main>
  );
}

/**
 * Official cadc35a07 P(): Boolean(Launch.isAvailable?.()).
 * Never invent true when bridge/method absent.
 */
function isDesktopLaunchAvailable(): boolean {
  try {
    const web = (window as Window & {
      "claude.web"?: { Launch?: { isAvailable?: () => boolean } };
    })["claude.web"];
    const isAvailable = web?.Launch?.isAvailable;
    if (typeof isAvailable !== "function") return false;
    return Boolean(isAvailable());
  } catch {
    return false;
  }
}
