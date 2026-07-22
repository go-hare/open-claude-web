import { useEffect, useMemo, useRef, useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { AvatarControl, GhostSelect, SegmentedControl, TextInputControl } from "../SettingsControls";
import {
  applyThemeMode,
  CHAT_FONT_OPTIONS,
  readChatFontSetting,
  readThemeMode,
  type ChatFontSetting,
  type ThemeMode,
  writeChatFontSetting,
  writeThemeMode,
} from "../appearanceSettings";
import { WORK_FUNCTION_OPTIONS } from "../accountSettingsApi";
import { useSettingsBootstrap } from "../useSettingsBootstrap";
import {
  ensureDesktopNotificationPermission,
  readResponseCompletionsEnabled,
  writeResponseCompletionsEnabled,
} from "../desktopNotificationPermission";
import { notificationRowGatesFromBootstrap } from "../notificationRowGates";

/**
 * Official General (c0db37792 H): Profile X + Preferences _Component2 + Notifications _Component3.
 * Appearance mode: zR Kx("userThemeMode"); Chat font: O("customStyles:chatFont") + map K.
 * Profile: PUT /api/account (names) + PUT /api/account_profile (avatar/work_function/conversation_preferences).
 * Notifications: Response completions (always); Code rows + Dispatch gated by aA/bas/VBe/GBe residual
 * from bootstrap feature_flags / org capabilities (see notificationRowGates).
 */
export function GeneralSettings() {
  const {
    bootstrap,
    notifications,
    updateIdentity,
    updateNotificationFeature,
    updateProfile,
  } = useSettingsBootstrap();
  const [appearance, setAppearance] = useState<ThemeMode>(() => readThemeMode());
  const [chatFont, setChatFont] = useState<ChatFontSetting>(() => readChatFontSetting());
  const [avatarDraft, setAvatarDraft] = useState<number | undefined>(undefined);
  const [prefsDraft, setPrefsDraft] = useState<string | null>(null);
  const [responseCompletions, setResponseCompletions] = useState(() => readResponseCompletionsEnabled());
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [notifyError, setNotifyError] = useState("");
  const prefsFocused = useRef(false);

  const fullName = bootstrap.account?.full_name ?? "";
  const displayName = bootstrap.account?.display_name ?? "";
  const workFunction = bootstrap.profile.work_function ?? "";
  const conversationPreferences = bootstrap.profile.conversation_preferences ?? "";
  const avatar = avatarDraft ?? bootstrap.profile.avatar ?? 0;
  const prefsValue = prefsDraft ?? conversationPreferences;

  // Official ie(): e=aA (hL), t=bas (hM), n=VBe (hN); fe uses GBe (hV).
  const notifyGates = useMemo(
    () =>
      notificationRowGatesFromBootstrap(bootstrap.bootstrapPayload, {
        capabilities: bootstrap.org?.capabilities,
      }),
    [bootstrap.bootstrapPayload, bootstrap.org?.capabilities],
  );

  const feature = (notifications.preferences?.feature_preference ?? {}) as Record<string, Record<string, unknown>>;
  const codeNotifications = !!feature.bogosort?.enable_push;
  const codeEmails = !!feature.bogosort?.enable_email;
  const codePermissionRequests = !!feature.code_requires_action?.enable_push;
  const securityScanEmails = !!feature.code_security_scan?.enable_email;
  const dispatchMessages = !!feature.dispatch?.enable_push;

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

  useEffect(() => {
    if (!prefsFocused.current) setPrefsDraft(null);
  }, [conversationPreferences]);

  const saveAvatar = (next: number) => {
    setAvatarDraft(next);
    void updateProfile({ avatar: next }).catch(() => setAvatarDraft(undefined));
  };

  const runToggle = async (key: string, work: () => Promise<void>) => {
    if (pendingKey) return;
    setPendingKey(key);
    setNotifyError("");
    try {
      await work();
    } catch (error) {
      setNotifyError(error instanceof Error ? error.message : "Couldn't update that setting");
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title="Profile">
        <SettingsRow
          label="Avatar"
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
          label="Full name"
          control={
            <TextInputControl
              ariaLabel="Full name"
              value={fullName}
              onSave={(value) => {
                void updateIdentity({ full_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label="What should Claude call you?"
          control={
            <TextInputControl
              ariaLabel="Display name"
              value={displayName}
              onSave={(value) => {
                void updateIdentity({ display_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label="What best describes your work?"
          control={
            <GhostSelect
              align="end"
              placeholder="Select"
              value={workFunction}
              options={WORK_FUNCTION_OPTIONS}
              onChange={(value) => {
                void updateProfile({ work_function: value });
              }}
            />
          }
        />
        <div className="flex flex-col gap-sm py-md">
          <label className="text-body text-primary" htmlFor="conversation-preferences">
            What should Claude know about you?
          </label>
          <div className="text-footnote text-neutral-500">
            Claude will use these details across chats and Cowork when they align with Anthropic&apos;s usage policies.{" "}
            <a
              className="text-accent underline-offset-2 hover:underline"
              href="https://www.anthropic.com/legal/aup"
              rel="noopener noreferrer"
              target="_blank"
            >
              Learn more
            </a>
          </div>
          <textarea
            id="conversation-preferences"
            className="cds-input cds-reset min-h-[5.5rem] max-h-40 w-full resize-y rounded bg-fill-field px-sm py-sm text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
            placeholder="e.g. Keep explanations short and direct"
            rows={3}
            value={prefsValue}
            onChange={(event) => setPrefsDraft(event.currentTarget.value)}
            onFocus={() => {
              prefsFocused.current = true;
            }}
            onBlur={() => {
              prefsFocused.current = false;
              const next = prefsValue;
              if (next === conversationPreferences) {
                setPrefsDraft(null);
                return;
              }
              void updateProfile({ conversation_preferences: next }).finally(() => setPrefsDraft(null));
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape" && prefsValue !== conversationPreferences) {
                event.stopPropagation();
                setPrefsDraft(conversationPreferences);
              }
            }}
          />
        </div>
      </SettingsSection>
      <SettingsSection title="Preferences">
        <SettingsRow
          label="Appearance"
          control={
            <SegmentedControl
              ariaLabel="Appearance"
              value={appearance}
              options={[
                { value: "auto", label: "Match system", icon: "Computer" },
                { value: "light", label: "Light", icon: "Sun" },
                { value: "dark", label: "Dark", icon: "Moon" },
              ]}
              onChange={(value) => setAppearance(value as ThemeMode)}
            />
          }
        />
        <SettingsRow
          label="Chat font"
          control={
            <GhostSelect
              align="end"
              value={chatFont}
              options={CHAT_FONT_OPTIONS}
              onChange={(value) => setChatFont(value as ChatFontSetting)}
            />
          }
        />
      </SettingsSection>
      <SettingsSection title="Notifications">
        {/* Official ie order: ce, e&&de, e&&fe, e&&ue, t&&ge, n&&pe */}
        <SettingsRow
          label="Response completions"
          description="Get notified when Claude has finished a response. Useful for long-running tasks."
          control={
            <Switch
              checked={responseCompletions}
              disabled={pendingKey === "response"}
              onCheckedChange={(checked) => {
                void runToggle("response", async () => {
                  if (checked) {
                    const granted = await ensureDesktopNotificationPermission();
                    if (!granted) throw new Error("browser-permission-denied");
                  }
                  writeResponseCompletionsEnabled(checked);
                  setResponseCompletions(checked);
                });
              }}
            />
          }
        />
        {notifyGates.codeSession ? (
          <SettingsRow
            label="Code notifications"
            description="Claude can choose to notify you about important updates from a Code session."
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
            label="Code permission requests"
            description="Get a push notification when Claude needs your approval to run a command in a Code session."
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
            label="Code emails"
            description="Get an email about important updates from a Code session."
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
            label="Security scan emails"
            description="Get an email when a Claude Code security scan finishes."
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
            label="Dispatch messages"
            description="Get a push notification on your phone when Claude messages you in Dispatch."
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
