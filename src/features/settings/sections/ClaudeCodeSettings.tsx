import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { BranchInput, WorktreeSelect } from "../SettingsControls";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official ClaudeCodePage (cc989143e): Local sessions Ct + Pull requests _t.
 * Local: te.setPreference desktop bridge.
 * PR: account.settings ccr_auto_create_pr_on_push / ccr_auto_create_pr_as_draft via mutate J().
 * Copy from official defaultMessage strings (Allow bypass permissions mode, Bounce dock, …).
 */
export function ClaudeCodeSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  // Official: g = settings.ccr_auto_create_pr_on_push ?? false; h = settings.ccr_auto_create_pr_as_draft ?? true
  const autoCreatePr =
    settings.ccr_auto_create_pr_on_push === true
    || (settings.ccr_auto_create_pr_on_push === undefined && !!preferences.autoCreatePullRequests);
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
      <SettingsSection title="Local sessions">
        <SettingsRow
          label="Allow bypass permissions mode"
          description="Bypass all permission checks so Claude can work without interruption. This is useful for workflows like fixing lint errors or generating boilerplate. Letting Claude run arbitrary commands is risky and can lead to data loss, system damage, or data exfiltration (for example via prompt injection)."
          control={
            <Switch
              checked={!!preferences.bypassPermissionsModeEnabled}
              onCheckedChange={(checked) => setPreference("bypassPermissionsModeEnabled", checked)}
            />
          }
        />
        <SettingsRow
          label="Notify me when attention is needed"
          description="Bounce the dock icon or flash the taskbar when Claude needs your attention and the app is not focused."
          control={
            <Switch
              checked={!!preferences.dockBounceEnabled}
              onCheckedChange={(checked) => setPreference("dockBounceEnabled", checked)}
            />
          }
        />
        <SettingsRow
          label="Worktree location"
          description="Where to store git worktrees for isolated coding sessions"
          control={
            <WorktreeSelect
              onChange={(value) => setPreference("chillingSlothLocation", value)}
              value={preferences.chillingSlothLocation}
            />
          }
        />
        <SettingsRow
          label="Branch prefix"
          description="Prefix added to the beginning of every worktree branch name"
          control={
            <BranchInput
              onChange={(value) => setPreference("ccBranchPrefix", value)}
              value={preferences.ccBranchPrefix ?? ""}
            />
          }
        />
        <SettingsRow
          label="Preview"
          description="Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection."
          control={
            <Switch
              checked={!!preferences.launchEnabled}
              onCheckedChange={(checked) => setPreference("launchEnabled", checked)}
            />
          }
        />
        {preferences.launchEnabled ? (
          <SettingsRow
            label="Persist Preview sessions"
            description="Save cookies, local storage, and login sessions for dev server previews. Data is stored per workspace and persists across app restarts. Turning this off clears all saved session data."
            control={
              <Switch
                checked={!!preferences.launchPreviewPersistSession}
                onCheckedChange={(checked) => setPreference("launchPreviewPersistSession", checked)}
              />
            }
          />
        ) : null}
      </SettingsSection>
      <SettingsSection title="Pull requests">
        <SettingsRow
          label="Create pull requests automatically"
          description="When Claude pushes changes to a branch, it automatically opens a pull request without asking first. Applies to remote sessions only."
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
            label="Create as draft"
            description="Open auto-created pull requests as drafts instead of ready for review."
            control={
              <Switch
                checked={createAsDraft}
                onCheckedChange={(checked) => setAccountFlag("ccr_auto_create_pr_as_draft", checked)}
              />
            }
          />
        ) : null}
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
