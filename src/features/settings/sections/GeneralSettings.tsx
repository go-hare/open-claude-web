import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import {
  AvatarControl,
  ChatFontSelect,
  GhostSelect,
  InstructionsPreferencesField,
  SegmentedControl,
  TextInputControl,
} from "../SettingsControls";
import {
  applyThemeMode,
  readChatFontSetting,
  readThemeMode,
  type ChatFontSetting,
  type ThemeMode,
  writeChatFontSetting,
  writeThemeMode,
} from "../appearanceSettings";
import { WORK_FUNCTION_OPTIONS } from "../accountSettingsApi";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import { ensureDesktopNotificationPermission } from "../desktopNotificationPermission";
import { notificationRowGatesFromBootstrap } from "../notificationRowGates";
import {
  renderInstructionsDescription,
  useGeneralSettingsText,
} from "../settingsMessages";
import { hasCmekLockFromBootstrap } from "../cmekGate";
import { useErrors } from "../errorsToast";
import { syncResponseCompletionsPrefMirror } from "../responseCompletionNotify";

/**
 * Official General (c0db37792 H): Profile X + Preferences ee + Notifications ie.
 * Appearance mode: zR Kx("userThemeMode"); Chat font: O("customStyles:chatFont") + map K + se Menu.
 * Profile: PUT /api/account (names) + PUT /api/account_profile (avatar/work_function/conversation_preferences).
 * Profile save toasts: PC addSuccess fsB/4pdUqN / addError ecSHaFmEbs.
 * CMEK: LBt taint:cmek → Instructions locked + tooltip D4CuWTj4f5.
 * Voice: official ne = C()?oe:null where C≈Iyt = voice_mode && media && !jd(); desktop jd() → omit.
 * Notifications (official ie + YBe/ZBe/KBe):
 *   Response completions — feature_preference.compass + completion enable_push (both)
 *   Code / Dispatch rows gated by aA/bas/VBe/GBe residual (notificationRowGates)
 * Code emails: Statsig keys 1tnv78j/162hnvx — residual EN defaults (not spa i18n).
 * Copy uses official /i18n message ids via useGeneralSettingsText.
 */
export function GeneralSettings() {
  const {
    bootstrap,
    notifications,
    updateIdentity,
    updateNotificationFeature,
    updateProfile,
    updateResponseCompletionsPush,
  } = useSettingsBootstrap();
  const text = useGeneralSettingsText();
  const { addSuccess, addError } = useErrors();
  const [appearance, setAppearance] = useState<ThemeMode>(() => readThemeMode());
  const [chatFont, setChatFont] = useState<ChatFontSetting>(() => readChatFontSetting());
  const [avatarDraft, setAvatarDraft] = useState<number | undefined>(undefined);
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState("");

  const fullName = bootstrap.account?.full_name ?? "";
  const displayName = bootstrap.account?.display_name ?? "";
  const workFunction = bootstrap.profile.work_function ?? "";
  const conversationPreferences = bootstrap.profile.conversation_preferences ?? "";
  const avatar = avatarDraft ?? bootstrap.profile.avatar ?? 0;

  // Official LBt: any membership org.capabilities includes "taint:cmek"
  const cmekLocked = useMemo(
    () => hasCmekLockFromBootstrap(bootstrap.bootstrapPayload, bootstrap.org?.capabilities),
    [bootstrap.bootstrapPayload, bootstrap.org?.capabilities],
  );

  const onProfileSaved = useCallback(() => {
    addSuccess(text.saved);
  }, [addSuccess, text.saved]);

  const onProfileSaveError = useCallback(
    (error: unknown) => {
      addError(text.couldntSaveThatChange, {
        error,
        messageForLogging: "settings-modal profile save failed",
      });
    },
    [addError, text.couldntSaveThatChange],
  );

  // Official ie(): e=aA (hL), t=bas (hM), n=VBe (hN); fe uses GBe (hV).
  const notifyGates = useMemo(
    () =>
      notificationRowGatesFromBootstrap(bootstrap.bootstrapPayload, {
        capabilities: bootstrap.org?.capabilities,
      }),
    [bootstrap.bootstrapPayload, bootstrap.org?.capabilities],
  );

  const feature = (notifications.preferences?.feature_preference ?? {}) as Record<string, Record<string, unknown>>;
  // Official YBe: every(KBe) enable_push — KBe = ["compass","completion"]
  const responseCompletions =
    !!feature.compass?.enable_push && !!feature.completion?.enable_push;
  const codeNotifications = !!feature.bogosort?.enable_push;
  const codeEmails = !!feature.bogosort?.enable_email;
  const codePermissionRequests = !!feature.code_requires_action?.enable_push;
  const securityScanEmails = !!feature.code_security_scan?.enable_email;
  const dispatchMessages = !!feature.dispatch?.enable_push;

  const chatFontLabels = useMemo(
    () => ({
      default: text.anthropicSerif,
      sans: text.anthropicSans,
      system: text.matchSystem,
      dyslexia: text.dyslexicFriendly,
    }),
    [text.anthropicSans, text.anthropicSerif, text.dyslexicFriendly, text.matchSystem],
  );

  // Official ee Appearance XD: icon + tooltip only (no label) — tooltips from +CwN9C/QFk / 3cc4CtJM5h / tOdNiYuuag.
  const appearanceOptions = useMemo(
    () => [
      { value: "auto", icon: "Computer", tooltip: text.matchSystem },
      { value: "light", icon: "Sun", tooltip: text.light },
      { value: "dark", icon: "Moon", tooltip: text.dark },
    ],
    [text.dark, text.light, text.matchSystem],
  );

  const instructionsPlaceholders = useMemo(
    () => [
      text.instructionsPlaceholder0,
      text.instructionsPlaceholder1,
      text.instructionsPlaceholder2,
      text.instructionsPlaceholder3,
    ],
    [
      text.instructionsPlaceholder0,
      text.instructionsPlaceholder1,
      text.instructionsPlaceholder2,
      text.instructionsPlaceholder3,
    ],
  );

  useEffect(() => {
    writeThemeMode(appearance);
    applyThemeMode(appearance);
    if (appearance !== "auto") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyThemeMode("auto");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance]);

  useEffect(() => {
    writeChatFontSetting(chatFont);
  }, [chatFont]);

  useEffect(() => {
    if (avatarDraft !== undefined && bootstrap.profile.avatar === avatarDraft) setAvatarDraft(undefined);
  }, [avatarDraft, bootstrap.profile.avatar]);

  const saveAvatar = (next: number) => {
    setAvatarDraft(next);
    void updateProfile({ avatar: next })
      .then(onProfileSaved)
      .catch((error) => {
        setAvatarDraft(undefined);
        onProfileSaveError(error);
      });
  };

  const saveIdentity = (patch: { full_name?: string; display_name?: string }) => {
    void updateIdentity(patch).then(onProfileSaved).catch(onProfileSaveError);
  };

  const saveProfile = (patch: {
    work_function?: string;
    conversation_preferences?: string;
  }) => {
    void updateProfile(patch).then(onProfileSaved).catch(onProfileSaveError);
  };

  const runToggle = async (key: string, work: () => Promise<void>) => {
    if (pendingKey) return;
    setPendingKey(key);
    setNotifyError("");
    try {
      await work();
    } catch (error) {
      setNotifyError(error instanceof Error ? error.message : text.couldNotUpdateSetting);
    } finally {
      setPendingKey(null);
    }
  };

  // Keep local mirror in sync for stream-end notify (YBe residual).
  useEffect(() => {
    syncResponseCompletionsPrefMirror(responseCompletions);
  }, [responseCompletions]);

  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title={text.profile}>
        <SettingsRow
          label={text.avatar}
          control={
            <AvatarControl
              avatar={avatar}
              displayName={fullName || displayName}
              onRandomize={() => saveAvatar(Math.floor(72 * Math.random()) + 1)}
              onClear={() => saveAvatar(0)}
            />
          }
        />
        <SettingsRow
          label={text.fullName}
          control={
            <TextInputControl
              ariaLabel={text.fullName}
              value={fullName}
              onSave={(value) => {
                saveIdentity({ full_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label={text.whatShouldClaudeCallYou}
          control={
            <TextInputControl
              ariaLabel={text.whatShouldClaudeCallYou}
              value={displayName}
              onSave={(value) => {
                saveIdentity({ display_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label={text.whatBestDescribesWork}
          control={
            <GhostSelect
              align="end"
              fullWidth={false}
              placeholder={text.select}
              searchable={false}
              value={workFunction}
              options={WORK_FUNCTION_OPTIONS}
              onChange={(value) => {
                saveProfile({ work_function: value });
              }}
            />
          }
        />
        <InstructionsPreferencesField
          label={text.instructionsForClaude}
          description={renderInstructionsDescription(text.instructionsDescription)}
          placeholders={instructionsPlaceholders}
          value={conversationPreferences}
          disabled={cmekLocked}
          lockTooltip={cmekLocked ? text.instructionsCmekLocked : undefined}
          onSave={(next) => {
            if (cmekLocked) return;
            saveProfile({ conversation_preferences: next });
          }}
        />
      </SettingsSection>
      <SettingsSection title={text.preferences}>
        <SettingsRow
          label={text.appearance}
          control={
            <SegmentedControl
              ariaLabel={text.appearance}
              value={appearance}
              options={appearanceOptions}
              onChange={(value) => setAppearance(value as ThemeMode)}
            />
          }
        />
        <SettingsRow
          label={text.chatFont}
          control={
            <ChatFontSelect
              value={chatFont}
              labels={chatFontLabels}
              onChange={(value) => setChatFont(value)}
            />
          }
        />
        {/*
          Official ne Voice: C()?oe:null where C = Iyt() =
            ud("claude_ai_voice_mode") && media support && !jd().
          jd() ≈ isClaudeApp/desktop → Voice row is residual-correct OFF on desktop.
          Do not invent a Voice control until residual shows it for this product surface.
        */}
      </SettingsSection>
      <SettingsSection title={text.notifications}>
        {/* Official ie order: ce, e&&de, e&&fe, e&&ue, t&&ge, n&&pe */}
        <SettingsRow
          label={text.responseCompletions}
          description={text.responseCompletionsDescription}
          control={
            <Switch
              checked={responseCompletions}
              disabled={pendingKey === "response"}
              onCheckedChange={(checked) => {
                void runToggle("response", async () => {
                  // Official ce: request desktop auth when enabling, then ZBe both channels.
                  if (checked) {
                    const granted = await ensureDesktopNotificationPermission();
                    if (!granted) throw new Error("browser-permission-denied");
                  }
                  await updateResponseCompletionsPush(checked);
                  syncResponseCompletionsPrefMirror(checked);
                });
              }}
            />
          }
        />
        {notifyGates.codeSession ? (
          <SettingsRow
            label={text.codeNotifications}
            description={text.codeNotificationsDescription}
            control={
              <Switch
                checked={codeNotifications}
                disabled={pendingKey === "bogosort_push"}
                onCheckedChange={(checked) => {
                  void runToggle("bogosort_push", async () => {
                    if (checked) {
                      const granted = await ensureDesktopNotificationPermission();
                      if (!granted) throw new Error("browser-permission-denied");
                    }
                    await updateNotificationFeature("bogosort", { enable_push: checked });
                  });
                }}
              />
            }
          />
        ) : null}
        {notifyGates.codePermissionRequests ? (
          <SettingsRow
            label={text.codePermissionRequests}
            description={text.codePermissionRequestsDescription}
            control={
              <Switch
                checked={codePermissionRequests}
                disabled={pendingKey === "code_requires_action"}
                onCheckedChange={(checked) => {
                  void runToggle("code_requires_action", async () => {
                    await updateNotificationFeature("code_requires_action", { enable_push: checked });
                  });
                }}
              />
            }
          />
        ) : null}
        {notifyGates.codeSession ? (
          <SettingsRow
            label={text.codeEmails}
            description={text.codeEmailsDescription}
            control={
              <Switch
                checked={codeEmails}
                disabled={pendingKey === "bogosort_email"}
                onCheckedChange={(checked) => {
                  void runToggle("bogosort_email", async () => {
                    await updateNotificationFeature("bogosort", { enable_email: checked });
                  });
                }}
              />
            }
          />
        ) : null}
        {notifyGates.securityScanEmails ? (
          <SettingsRow
            label={text.securityScanEmails}
            description={text.securityScanEmailsDescription}
            control={
              <Switch
                checked={securityScanEmails}
                disabled={pendingKey === "code_security_scan"}
                onCheckedChange={(checked) => {
                  void runToggle("code_security_scan", async () => {
                    await updateNotificationFeature("code_security_scan", { enable_email: checked });
                  });
                }}
              />
            }
          />
        ) : null}
        {notifyGates.dispatchMessages ? (
          <SettingsRow
            label={text.dispatchMessages}
            description={text.dispatchMessagesDescription}
            control={
              <Switch
                checked={dispatchMessages}
                disabled={pendingKey === "dispatch"}
                onCheckedChange={(checked) => {
                  void runToggle("dispatch", async () => {
                    await updateNotificationFeature("dispatch", { enable_push: checked });
                  });
                }}
              />
            }
          />
        ) : null}
        {notifyError ? (
          <p className="py-sm text-footnote text-danger-000" role="status">
            {notifyError === "browser-permission-denied"
              ? "Notification permission was denied."
              : notifyError}
          </p>
        ) : null}
      </SettingsSection>
    </main>
  );
}
