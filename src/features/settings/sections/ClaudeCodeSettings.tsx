import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { BranchInput, WorktreeSelect } from "../SettingsControls";
import { useDesktopPreferences } from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

/**
 * Official ClaudeCodePage (cc989143e): Local sessions Ct + Pull requests _t.
 * Local: te.setPreference desktop bridge.
 * PR: account.settings ccr_auto_create_pr_on_push / ccr_auto_create_pr_as_draft via mutate J().
 */
export function ClaudeCodeSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  // Official: g = settings.ccr_auto_create_pr_on_push ?? false; h = settings.ccr_auto_create_pr_as_draft ?? true
  const autoCreatePr = settings.ccr_auto_create_pr_on_push === true
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
      <SettingsSection title="本地会话">
        <SettingsRow
          description="绕过所有权限检查，让 Claude 可以不中断地工作。这适合修复 lint 错误或生成样板代码等流程。让 Claude 运行任意命令存在风险，可能导致数据丢失、系统损坏或数据外泄（例如通过提示注入攻击）。"
          label="允许绕过权限模式"
          control={<Switch checked={!!preferences.bypassPermissionsModeEnabled} onCheckedChange={(checked) => setPreference("bypassPermissionsModeEnabled", checked)} />}
        />
        <SettingsRow
          description="当 Claude 需要你关注且应用未处于焦点状态时，弹跳 Dock 图标或闪烁任务栏。"
          label="通过通知提醒我注意"
          control={<Switch checked={!!preferences.dockBounceEnabled} onCheckedChange={(checked) => setPreference("dockBounceEnabled", checked)} />}
        />
        <SettingsRow description="用于存放隔离 coding sessions 的 git worktree 的位置" label="Worktree 位置" control={<WorktreeSelect onChange={(value) => setPreference("chillingSlothLocation", value)} value={preferences.chillingSlothLocation} />} />
        <SettingsRow description="添加到每个 worktree 分支名称开头的前缀" label="分支前缀" control={<BranchInput onChange={(value) => setPreference("ccBranchPrefix", value)} value={preferences.ccBranchPrefix ?? ""} />} />
        <SettingsRow description="Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection." label="Preview" control={<Switch checked={!!preferences.launchEnabled} onCheckedChange={(checked) => setPreference("launchEnabled", checked)} />} />
        {preferences.launchEnabled ? (
          <SettingsRow
            description="Save cookies, local storage, and login sessions for dev server previews. Data is stored per workspace and persists across app restarts. Turning this off clears all saved session data."
            label="Persist Preview sessions"
            control={<Switch checked={!!preferences.launchPreviewPersistSession} onCheckedChange={(checked) => setPreference("launchPreviewPersistSession", checked)} />}
          />
        ) : null}
      </SettingsSection>
      <SettingsSection title="拉取请求">
        <SettingsRow
          description="When Claude pushes changes to a branch, it automatically opens a pull request without asking first. Applies to remote sessions only."
          label="自动创建拉取请求"
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
            description="Open auto-created pull requests as drafts instead of ready for review."
            label="Create as draft"
            control={
              <Switch
                checked={createAsDraft}
                onCheckedChange={(checked) => setAccountFlag("ccr_auto_create_pr_as_draft", checked)}
              />
            }
          />
        ) : null}
        <SettingsRow
          description="当自动创建的 PR 关闭后，自动归档对应的本地会话。"
          label="自动归档已关闭的 PR 会话"
          control={<Switch checked={!!preferences.ccAutoArchiveOnPrClose} onCheckedChange={(checked) => setPreference("ccAutoArchiveOnPrClose", checked)} />}
        />
      </SettingsSection>
    </main>
  );
}
