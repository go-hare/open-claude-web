import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { BranchInput, WorktreeSelect } from "../SettingsControls";
import {
  renderClaudeCodeBypassDescription,
  useClaudeCodeSettingsText,
} from "../settingsMessages";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official ClaudeCodePage (cc989143e): Local sessions Ct + Pull requests _t.
 * Local: te.setPreference desktop bridge.
 * PR: account.settings ccr_auto_create_pr_on_push / ccr_auto_create_pr_as_draft via mutate J().
 * Official autoCreate: settings.ccr_auto_create_pr_on_push ?? false (account only).
 * Auto-archive / autofix use Statsig copy keys — residual EN below (not spa i18n).
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

  const setAccountFlag = (key: "ccr_auto_create_pr_on_push" | "ccr_auto_create_pr_as_draft", next: boolean) => {
    void updateAccountSetting(key, next);
    if (key === "ccr_auto_create_pr_on_push") {
      // Keep desktop preference in sync for remote-session consumers that still read bridge prefs.
      setPreference("autoCreatePullRequests", next);
    }
  };

  return (
    <main>
      <SettingsSection title={text.localSessions}>
        <SettingsRow
          label={text.allowBypassPermissionsMode}
          description={renderClaudeCodeBypassDescription(text.allowBypassPermissionsModeDescription)}
          control={
            <Switch
              checked={!!preferences.bypassPermissionsModeEnabled}
              onCheckedChange={(checked) => setPreference("bypassPermissionsModeEnabled", checked)}
            />
          }
        />
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
        <SettingsRow
          label={text.preview}
          description={text.previewDescription}
          control={
            <Switch
              checked={!!preferences.launchEnabled}
              onCheckedChange={(checked) => setPreference("launchEnabled", checked)}
            />
          }
        />
        {preferences.launchEnabled ? (
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
