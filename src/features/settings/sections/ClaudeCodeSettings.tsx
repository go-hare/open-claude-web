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
 * Official ClaudeCodePage zt (cc989143e):
 *   St General (classify) · Ct Local sessions · _t Pull requests
 *   (+ web/remote arms omitted without residual entitlement)
 *
 * Local gates:
 *   Bypass: key present && feature !== false && !raven
 *   Preview: Launch.isAvailable (cadc35a07 P) — never invent true
 * Autofix: ccr_autofix_ui === true → account ccr_autofix_on_pr_create
 * Auto-archive: ccr_velvet_broom === true → prefs ccAutoArchiveOnPrClose
 * Classify: claudeai_session_state === true only → account ccr_session_state_buckets
 * (Official Qp: missing flag hides. 3p turns flags on via custom3p FEATURE_FLAGS.)
 */
export function ClaudeCodeSettings() {
  const text = useClaudeCodeSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  const payload = bootstrap.bootstrapPayload;

  // Official _t: g = settings.ccr_auto_create_pr_on_push ?? false
  const autoCreatePr = settings.ccr_auto_create_pr_on_push === true;
  // Official: h = settings.ccr_auto_create_pr_as_draft ?? true
  const createAsDraft = settings.ccr_auto_create_pr_as_draft !== false;
  // Official: p = settings.ccr_autofix_on_pr_create ?? false
  const autofixOnPrCreate = settings.ccr_autofix_on_pr_create === true;
  // Official Ta/l: ccr_session_state_buckets ?? true
  const classifySessionStates = settings.ccr_session_state_buckets !== false;

  // Official C: key present on prefs bag (SSA always defines it once bridge loads).
  const bypassKeyPresent = preferences.bypassPermissionsModeEnabled !== undefined;
  const bypassFeatureAvailable =
    readBootstrapFeatureFlag(payload, "claude_code_desktop_bypass_permissions") !== false;
  const showBypassRow =
    bypassKeyPresent && bypassFeatureAvailable && !bootstrap.isRaven;

  const launchApiAvailable = useMemo(() => isDesktopLaunchAvailable(), []);
  const showPreviewRow = launchApiAvailable;
  const previewEnabled = preferences.launchEnabled !== false;

  // Official u = c("ccr_autofix_ui"); Qp missing/false → hide (u && row).
  // 3p enables the flag via custom3p FEATURE_FLAGS — do not invent-on-missing here.
  const showAutofixRow = readBootstrapFeatureFlag(payload, "ccr_autofix_ui") === true;
  // Official M = c("ccr_velvet_broom") && y() desktop; missing/false → hide.
  const showAutoArchiveRow =
    readBootstrapFeatureFlag(payload, "ccr_velvet_broom") === true;
  // Official St: c("claudeai_session_state"); if (!t) return null — missing → hide.
  const showClassifyRow =
    readBootstrapFeatureFlag(payload, "claudeai_session_state") === true;

  const setAccountFlag = (
    key:
      | "ccr_auto_create_pr_on_push"
      | "ccr_auto_create_pr_as_draft"
      | "ccr_autofix_on_pr_create"
      | "ccr_session_state_buckets",
    next: boolean,
  ) => {
    void updateAccountSetting(key, next);
    if (key === "ccr_auto_create_pr_on_push") {
      setPreference("autoCreatePullRequests", next);
    }
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
      {showClassifyRow ? (
        <SettingsSection title={text.general}>
          <SettingsRow
            label={text.classifySessionStates}
            description={text.classifySessionStatesDescription}
            control={
              <Switch
                checked={classifySessionStates}
                onCheckedChange={(checked) =>
                  setAccountFlag("ccr_session_state_buckets", checked)
                }
              />
            }
          />
        </SettingsSection>
      ) : null}
      <SettingsSection title={text.localSessions}>
        {showBypassRow ? (
          <SettingsRow
            label={text.allowBypassPermissionsMode}
            description={renderClaudeCodeBypassDescription(
              text.allowBypassPermissionsModeDescription,
            )}
            control={
              <Switch
                checked={preferences.bypassPermissionsModeEnabled === true}
                onCheckedChange={(checked) =>
                  setPreference("bypassPermissionsModeEnabled", checked)
                }
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
                onCheckedChange={(checked) =>
                  setPreference("launchPreviewPersistSession", checked)
                }
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
              onCheckedChange={(checked) =>
                setAccountFlag("ccr_auto_create_pr_on_push", checked)
              }
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
                onCheckedChange={(checked) =>
                  setAccountFlag("ccr_auto_create_pr_as_draft", checked)
                }
              />
            }
          />
        ) : null}
        {showAutofixRow ? (
          <SettingsRow
            label={text.autofixOnPrCreate}
            description={text.autofixOnPrCreateDescription}
            control={
              <Switch
                checked={autofixOnPrCreate}
                onCheckedChange={(checked) =>
                  setAccountFlag("ccr_autofix_on_pr_create", checked)
                }
              />
            }
          />
        ) : null}
        {showAutoArchiveRow ? (
          <SettingsRow
            label={text.autoArchiveClosedPrSessions}
            description={text.autoArchiveClosedPrSessionsDescription}
            control={
              <Switch
                checked={!!preferences.ccAutoArchiveOnPrClose}
                onCheckedChange={(checked) =>
                  setPreference("ccAutoArchiveOnPrClose", checked)
                }
              />
            }
          />
        ) : null}
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
