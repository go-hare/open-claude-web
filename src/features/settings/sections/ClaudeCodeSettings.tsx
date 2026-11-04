import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { BranchInput, GhostSelect, WorktreeSelect } from "../SettingsControls";
import { ClaudeCodeAppearance } from "./ClaudeCodeAppearance";
import { AllowedSitesRow, OpenLinksInBuiltInBrowserRow } from "./coworkSettingsDevice";
import {
  renderClaudeCodeBypassDescription,
  useClaudeCodeSettingsText,
} from "../settingsMessages";
import { readBootstrapFeatureFlag } from "../notificationRowGates";
import {
  featureStatus,
  useDesktopPreferences,
  useDesktopSupportedFeatures,
} from "../useDesktopPreferences";
import { useSettingsBootstrap } from "../useSettingsBootstrap";

const ARCHIVE_INACTIVE_DAYS = [0, 1, 2, 7, 14, 30];
const NOTIFY_TYPES = ["permission", "question", "idle"] as const;
const COOKIE_VALUES = ["none", "shared", "session"] as const;

type NotifyType = (typeof NOTIFY_TYPES)[number];
type CookieValue = (typeof COOKIE_VALUES)[number];
type NotifyLevel = "off" | "badge" | "banner";

/**
 * Official ClaudeCodePage aa (c71860c77-DzP8HoeV):
 *   Xi General classify
 *   Hr Code appearance + Xn Appearance (onThisDevice)
 *   hr Sessions (HG5KdMNuqG)
 *   Ji SSH (hide without getSSHHostToolGrants)
 *   Kr Browser + Ur mobile simulators (onThisDevice)
 *   Yr Pull requests
 *
 * Sessions extra rows from Z catalog (c7357c32b): notify levels, sound,
 * keep-awake, archive inactive, prompt suggestions.
 * Browser: Open links (Launch.openExternalLinkInPreview) + Allowed sites + Keep cookies none/shared/session.
 * Hide sandbox / Remote Control / Cloud / guest-pass without IPC.
 */
export function ClaudeCodeSettings() {
  const text = useClaudeCodeSettingsText();
  const [preferences, setPreference] = useDesktopPreferences();
  const features = useDesktopSupportedFeatures();
  const { bootstrap, updateAccountSetting } = useSettingsBootstrap();
  const settings = bootstrap.account?.settings ?? {};
  const payload = bootstrap.bootstrapPayload;

  const autoCreatePr = settings.ccr_auto_create_pr_on_push === true;
  const createAsDraft = settings.ccr_auto_create_pr_as_draft !== false;
  const autofixOnPrCreate = settings.ccr_autofix_on_pr_create === true;
  const classifySessionStates = settings.ccr_session_state_buckets !== false;

  const bypassKeyPresent = preferences.bypassPermissionsModeEnabled !== undefined;
  const bypassFeatureAvailable =
    readBootstrapFeatureFlag(payload, "claude_code_desktop_bypass_permissions") !== false;
  const showBypassRow =
    bypassKeyPresent && bypassFeatureAvailable && !bootstrap.isRaven;

  const launchApiAvailable = useMemo(() => isDesktopLaunchAvailable(), []);
  const showBrowserSection = launchApiAvailable;
  const previewEnabled = preferences.launchEnabled !== false;
  const cookieValue = cookieValueFromPrefs(preferences.launchPreviewStorage, preferences.launchPreviewPersistSession);

  const showAutofixRow = readBootstrapFeatureFlag(payload, "ccr_autofix_ui") === true;
  const showAutoArchiveRow =
    readBootstrapFeatureFlag(payload, "ccr_velvet_broom") === true;
  const showClassifyRow =
    readBootstrapFeatureFlag(payload, "claudeai_session_state") === true;
  const showAutoCreatePrRow = false;

  const drawAttentionDescription = useMemo(() => {
    if (typeof navigator === "undefined") return text.drawAttentionDarwin;
    const platform = navigator.platform || navigator.userAgent;
    if (/Win/i.test(platform)) return text.drawAttentionWin32;
    return text.drawAttentionDarwin;
  }, [text.drawAttentionDarwin, text.drawAttentionWin32]);

  const cookieOptions = useMemo(
    () => [
      { value: "none", label: text.cookiesUntilQuit },
      { value: "shared", label: text.cookiesShared },
      { value: "session", label: text.cookiesPerSession },
    ],
    [text.cookiesUntilQuit, text.cookiesShared, text.cookiesPerSession],
  );

  const notifyLevelOptions = useMemo(
    () => [
      { value: "off", label: text.notifyOff },
      { value: "badge", label: text.notifyBadge },
      { value: "banner", label: text.notifyBanners },
    ],
    [text.notifyOff, text.notifyBadge, text.notifyBanners],
  );
  const idleNotifyOptions = useMemo(
    () => [
      { value: "off", label: text.notifyOff },
      { value: "banner", label: text.notifyBanners },
    ],
    [text.notifyOff, text.notifyBanners],
  );
  const soundOptions = useMemo(
    () => [
      { value: "system", label: text.systemSound },
      { value: "none", label: text.none },
    ],
    [text.systemSound, text.none],
  );
  const archiveOptions = useMemo(
    () =>
      ARCHIVE_INACTIVE_DAYS.map((days) => ({
        value: String(days),
        label: days === 0 ? text.never : formatArchiveDays(text.archiveInactiveDays, days),
      })),
    [text.never, text.archiveInactiveDays],
  );

  const levels = preferences.notificationLevels ?? {};
  const permissionOff = (levels.permission ?? "banner") === "off";
  const questionOff = (levels.question ?? "banner") === "off";
  const drawAttentionDisabled = permissionOff && questionOff;

  const showKeepAwake = featureStatus(features, "codeSessionKeepAwake") === "supported";
  const showIos = featureStatus(features, "iosSimulator") === "supported";
  const showAndroid = featureStatus(features, "androidEmulator") === "supported";
  const showMobile = showIos || showAndroid;
  const showAllowedSites = hasLaunchAllowedSites();

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

  const setNotifyLevel = (type: NotifyType, level: NotifyLevel) => {
    setPreference("notificationLevels", { ...levels, [type]: level });
  };

  const setCookies = (value: string) => {
    if (value !== "none" && value !== "shared" && value !== "session") return;
    setPreference("launchPreviewStorage", value);
    setPreference("launchPreviewPersistSession", value !== "none");
  };

  return (
    <main>
      {showClassifyRow ? (
        <SettingsSection id="general" title={text.general}>
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
      <ClaudeCodeAppearance />
      <SettingsSection id="local-sessions" title={text.localSessions}>
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
        <NotifyLevelRow
          description={text.permissionRequestsDescription}
          label={text.permissionRequests}
          onChange={(level) => setNotifyLevel("permission", level)}
          options={notifyLevelOptions}
          value={levels.permission ?? "banner"}
        />
        <NotifyLevelRow
          description={text.questionsDescription}
          label={text.questions}
          onChange={(level) => setNotifyLevel("question", level)}
          options={notifyLevelOptions}
          value={levels.question ?? "banner"}
        />
        <NotifyLevelRow
          description={text.taskCompleteDescription}
          label={text.taskComplete}
          onChange={(level) => setNotifyLevel("idle", level === "badge" ? "banner" : level)}
          options={idleNotifyOptions}
          value={levels.idle === "off" ? "off" : "banner"}
        />
        <SettingsRow
          label={text.notificationSound}
          description={text.notificationSoundDescription}
          control={
            <div className="w-[160px]">
              <GhostSelect
                align="end"
                fullWidth
                onChange={(value) => {
                  if (value === "system" || value === "none") {
                    setPreference("notificationSound", value);
                  }
                }}
                options={soundOptions}
                searchable={false}
                value={preferences.notificationSound === "none" ? "none" : "system"}
                variant="outline"
              />
            </div>
          }
        />
        <SettingsRow
          label={text.drawAttentionOnNotifications}
          description={drawAttentionDescription}
          control={
            <Switch
              checked={!!preferences.dockBounceEnabled && !drawAttentionDisabled}
              disabled={drawAttentionDisabled}
              onCheckedChange={(checked) => setPreference("dockBounceEnabled", checked)}
            />
          }
        />
        {showKeepAwake ? (
          <>
            <SettingsRow
              label={text.keepAwakeWhileWorking}
              description={text.keepAwakeWhileWorkingDescription}
              control={
                <Switch
                  checked={preferences.ccKeepAwakeWhileWorking !== false}
                  onCheckedChange={(checked) =>
                    setPreference("ccKeepAwakeWhileWorking", checked)
                  }
                />
              }
            />
            {preferences.ccKeepAwakeWhileWorking !== false ? (
              <SettingsRow
                indent
                label={text.keepAwakeOnBattery}
                control={
                  <Switch
                    checked={preferences.ccKeepAwakeOnBattery !== false}
                    onCheckedChange={(checked) =>
                      setPreference("ccKeepAwakeOnBattery", checked)
                    }
                  />
                }
              />
            ) : null}
          </>
        ) : null}
        <SettingsRow
          label={text.promptSuggestions}
          description={text.promptSuggestionsDescription}
          control={
            <Switch
              checked={preferences.ccPromptSuggestions !== false}
              onCheckedChange={(checked) => setPreference("ccPromptSuggestions", checked)}
            />
          }
        />
        <SettingsRow
          label={text.archiveInactiveSessions}
          description={text.archiveInactiveSessionsDescription}
          control={
            <div className="w-[160px]">
              <GhostSelect
                align="end"
                fullWidth
                onChange={(value) => {
                  const days = Number(value);
                  if (Number.isFinite(days) && days >= 0) {
                    setPreference("ccAutoArchiveInactiveDays", days);
                  }
                }}
                options={archiveOptions}
                searchable={false}
                value={String(preferences.ccAutoArchiveInactiveDays ?? 0)}
                variant="outline"
              />
            </div>
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
        <LocalSandboxRows />
      </SettingsSection>
      {showBrowserSection ? (
        <SettingsSection id="preview" title={text.browser}>
          <SettingsRow
            label={text.browserTools}
            description={text.browserToolsDesktopDescription}
            control={
              <Switch
                checked={previewEnabled}
                onCheckedChange={(checked) => setPreference("launchEnabled", checked)}
              />
            }
          />
          {previewEnabled ? <OpenLinksInBuiltInBrowserRow /> : null}
          {previewEnabled ? (
            <SettingsRow
              label={text.keepCookies}
              description={text.keepCookiesDesktopDescription}
              control={
                <div className="w-[220px]">
                  <GhostSelect
                    align="end"
                    fullWidth
                    onChange={setCookies}
                    options={cookieOptions}
                    searchable={false}
                    value={cookieValue}
                    variant="outline"
                  />
                </div>
              }
            />
          ) : null}
          {previewEnabled && showAllowedSites ? (
            <AllowedSitesRow
              description={text.allowedSitesDescription}
              label={text.allowedSites}
              manageLabel={text.manage}
            />
          ) : null}
        </SettingsSection>
      ) : null}
      {showMobile ? (
        <SettingsSection id="mobile-simulators" title={text.mobileSimulators}>
          {showIos ? (
            <SettingsRow
              label={text.iosSimulator}
              description={text.iosSimulatorDescription}
              control={
                <Switch
                  checked={preferences.claudeIosSimulatorAccessEnabled !== false}
                  onCheckedChange={(checked) =>
                    setPreference("claudeIosSimulatorAccessEnabled", checked)
                  }
                />
              }
            />
          ) : null}
          {showAndroid ? (
            <SettingsRow
              label={text.androidEmulator}
              description={text.androidEmulatorDescription}
              control={
                <Switch
                  checked={preferences.claudeAndroidEmulatorAccessEnabled !== false}
                  onCheckedChange={(checked) =>
                    setPreference("claudeAndroidEmulatorAccessEnabled", checked)
                  }
                />
              }
            />
          ) : null}
        </SettingsSection>
      ) : null}
      <SettingsSection id="pull-requests" title={text.pullRequests}>
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
        {showAutoCreatePrRow ? (
          <>
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
          </>
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

function NotifyLevelRow({
  description,
  label,
  onChange,
  options,
  value,
}: {
  description: string;
  label: string;
  onChange: (level: NotifyLevel) => void;
  options: Array<{ value: string; label: string }>;
  value: string;
}) {
  return (
    <SettingsRow
      label={label}
      description={description}
      control={
        <div className="w-[160px]">
          <GhostSelect
            align="end"
            fullWidth
            onChange={(next) => {
              if (next === "off" || next === "badge" || next === "banner") onChange(next);
            }}
            options={options}
            searchable={false}
            value={value}
            variant="outline"
          />
        </div>
      }
    />
  );
}

type LocalSandboxStatus = {
  allowUnsandboxedCommands?: boolean;
  enabled?: boolean;
  enabledSource?: "forced" | "policy" | "settings" | "off";
  unavailableReason?: string;
  windowsInstall?: { installed?: boolean; policyLocked?: boolean };
};

type ClaudeCodeSandboxBridge = {
  getLocalSandboxStatus?: () => Promise<LocalSandboxStatus | null | undefined>;
  setLocalSandboxEnabled?: (enabled: boolean) => Promise<{
    status?: string;
    message?: string;
    sandboxStatus?: LocalSandboxStatus | null;
  } | null | undefined>;
  setStrictSandboxMode?: (strict: boolean) => Promise<{
    status?: string;
    message?: string;
  } | null | undefined>;
};

function claudeCodeSandboxBridge(): ClaudeCodeSandboxBridge | undefined {
  try {
    return (window as Window & { "claude.web"?: { ClaudeCode?: ClaudeCodeSandboxBridge } })[
      "claude.web"
    ]?.ClaudeCode;
  } catch {
    return undefined;
  }
}

/** Official rr (c71860c77-DzP8HoeV): hide without setLocalSandboxEnabled. */
function LocalSandboxRows() {
  const text = useClaudeCodeSettingsText();
  const api = claudeCodeSandboxBridge();
  const [status, setStatus] = useState<LocalSandboxStatus | null>(null);
  const [pending, setPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (typeof api?.getLocalSandboxStatus !== "function") return;
    const next = await api.getLocalSandboxStatus();
    setStatus(next ?? null);
  }, [api]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (typeof api?.setLocalSandboxEnabled !== "function") return null;

  const managed = status?.enabledSource === "forced" || status?.enabledSource === "policy";
  const unavailable = Boolean(status?.unavailableReason) && status?.enabled !== true;
  const sandboxOn = status?.enabled === true;
  const strictOn = status?.allowUnsandboxedCommands === false;
  const sandboxDescription = unavailable
    ? status?.unavailableReason
      ? `${text.localSandboxDescription} ${text.sandboxUnavailable} ${status.unavailableReason}`
      : `${text.localSandboxDescription} ${text.sandboxUnavailable}`
    : errorMessage
      ? `${text.localSandboxDescription} ${errorMessage}`
      : text.localSandboxDescription;
  const strictDescription = sandboxOn
    ? text.strictSandboxModeDescription
    : `${text.strictSandboxModeDescription} ${text.sandboxAvailableWhenOn}`;

  return (
    <>
      <SettingsRow
        label={text.localSandbox}
        description={sandboxDescription}
        control={
          <Switch
            checked={sandboxOn}
            disabled={pending || managed || unavailable}
            onCheckedChange={(checked) => {
              if (pending || managed || unavailable) return;
              setPending(true);
              setErrorMessage(null);
              setStatus((current) => ({ ...(current ?? {}), enabled: checked }));
              void api.setLocalSandboxEnabled?.(checked).then((result) => {
                if (result?.status === "ok") {
                  void refresh().finally(() => setPending(false));
                  return;
                }
                if (result?.sandboxStatus) setStatus(result.sandboxStatus);
                else void refresh();
                if (result?.status === "error" || result?.status === "partial") {
                  setErrorMessage(result.message || text.sandboxUnavailable);
                }
                setPending(false);
              });
            }}
          />
        }
      />
      {typeof api.setStrictSandboxMode === "function" ? (
        <SettingsRow
          indent
          label={text.strictSandboxMode}
          description={strictDescription}
          control={
            <Switch
              checked={strictOn}
              disabled={pending || managed || !sandboxOn}
              onCheckedChange={(checked) => {
                if (pending || managed || !sandboxOn) return;
                setPending(true);
                setStatus((current) => ({
                  ...(current ?? {}),
                  allowUnsandboxedCommands: !checked,
                }));
                void api.setStrictSandboxMode?.(checked).then((result) => {
                  if (result?.status !== "ok") void refresh();
                  setPending(false);
                });
              }}
            />
          }
        />
      ) : null}
    </>
  );
}

function cookieValueFromPrefs(
  storage: string | undefined,
  persist: boolean | undefined,
): CookieValue {
  if (storage === "none" || storage === "shared" || storage === "session") return storage;
  return persist ? "shared" : "none";
}

function formatArchiveDays(template: string, count: number): string {
  return template
    .replace("{count, plural, one {# day} other {# days}}", `${count} days`)
    .replaceAll("{count}", String(count))
    .replaceAll("#", String(count));
}

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

function hasLaunchAllowedSites(): boolean {
  try {
    const launch = (window as Window & {
      "claude.web"?: { Launch?: { getPreviewAllowedOrigins?: unknown } };
    })["claude.web"]?.Launch;
    return typeof launch?.getPreviewAllowedOrigins === "function";
  } catch {
    return false;
  }
}
