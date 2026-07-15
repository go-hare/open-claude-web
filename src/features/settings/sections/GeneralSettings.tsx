import { useEffect, useRef, useState } from "react";
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

/**
 * Official General (c0db37792 H): Profile X + Preferences _Component2 + Notifications _Component3.
 * Appearance mode: zR Kx("userThemeMode"); Chat font: O("customStyles:chatFont") + map K.
 * Profile: PUT /api/account (names) + PUT /api/account_profile (avatar/work_function/conversation_preferences).
 * Notifications: org notification preferences feature_preference (bogosort / code_requires_action / …).
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
  const [responseCompletions, setResponseCompletions] = useState(() => readLocalResponseCompletions());
  const prefsFocused = useRef(false);

  const fullName = bootstrap.account?.full_name ?? "";
  const displayName = bootstrap.account?.display_name ?? "";
  const workFunction = bootstrap.profile.work_function ?? "";
  const conversationPreferences = bootstrap.profile.conversation_preferences ?? "";
  const avatar = avatarDraft ?? bootstrap.profile.avatar ?? 0;
  const prefsValue = prefsDraft ?? conversationPreferences;

  const feature = (notifications.preferences?.feature_preference ?? {}) as Record<string, Record<string, unknown>>;
  const codeNotifications = !!feature.bogosort?.enable_push;
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

  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title="个人资料">
        <SettingsRow
          label="头像"
          control={
            <AvatarControl
              avatar={avatar}
              onRandomize={() => saveAvatar(Math.floor(72 * Math.random()) + 1)}
              onClear={() => saveAvatar(0)}
            />
          }
        />
        <SettingsRow
          label="全名"
          control={
            <TextInputControl
              ariaLabel="全名"
              value={fullName}
              onSave={(value) => {
                void updateIdentity({ full_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label="Claude 应该怎么称呼你？"
          control={
            <TextInputControl
              ariaLabel="显示名称"
              value={displayName}
              onSave={(value) => {
                void updateIdentity({ display_name: value });
              }}
            />
          }
        />
        <SettingsRow
          label="哪项最符合你的工作？"
          control={
            <GhostSelect
              align="end"
              placeholder="选择"
              value={workFunction}
              options={WORK_FUNCTION_OPTIONS}
              onChange={(value) => {
                void updateProfile({ work_function: value });
              }}
            />
          }
        />
        <div className="flex flex-col gap-sm py-md">
          <label className="text-body text-primary" htmlFor="conversation-preferences">给 Claude 的说明</label>
          <div className="text-footnote text-neutral-500">
            Claude 会在聊天和协作中参考这些内容，前提是它们符合 Anthropic 的使用准则。了解更多
          </div>
          <textarea
            id="conversation-preferences"
            className="cds-input cds-reset min-h-[5.5rem] max-h-40 w-full resize-y rounded bg-fill-field px-sm py-sm text-body text-primary shadow-field-ring outline-none transition duration-fast placeholder:text-muted focus-visible:bg-surface-popover focus-visible:shadow-focus"
            placeholder="例如：解释尽量简洁直接"
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
      <SettingsSection title="偏好设置">
        <SettingsRow
          label="外观"
          control={
            <SegmentedControl
              ariaLabel="外观"
              value={appearance}
              options={[
                { value: "auto", label: "跟随系统", icon: "Computer" },
                { value: "light", label: "浅色", icon: "Sun" },
                { value: "dark", label: "深色", icon: "Moon" },
              ]}
              onChange={(value) => setAppearance(value as ThemeMode)}
            />
          }
        />
        <SettingsRow
          label="聊天字体"
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
      <SettingsSection title="通知">
        <SettingsRow
          label="回复完成通知"
          description="当 Claude 完成回复时通知你。适合长时间运行的任务。"
          control={
            <Switch
              checked={responseCompletions}
              onCheckedChange={(checked) => {
                writeLocalResponseCompletions(checked);
                setResponseCompletions(checked);
              }}
            />
          }
        />
        <SettingsRow
          label="代码通知"
          description="Claude 可选择在 Code 会话出现重要更新时通知你。"
          control={
            <Switch
              checked={codeNotifications}
              onCheckedChange={(checked) => {
                void updateNotificationFeature("bogosort", { enable_push: checked });
              }}
            />
          }
        />
        <SettingsRow
          label="Code 权限请求"
          description="当 Claude 在 Code 会话中需要你批准运行命令时，向你发送推送通知。"
          control={
            <Switch
              checked={codePermissionRequests}
              onCheckedChange={(checked) => {
                void updateNotificationFeature("code_requires_action", { enable_push: checked });
              }}
            />
          }
        />
        <SettingsRow
          label="安全扫描邮件"
          description="Claude Code 安全扫描完成后向你发送邮件。"
          control={
            <Switch
              checked={securityScanEmails}
              onCheckedChange={(checked) => {
                void updateNotificationFeature("code_security_scan", { enable_email: checked });
              }}
            />
          }
        />
        <SettingsRow
          label="Dispatch 消息"
          description="当 Claude 在 Dispatch 中给你发消息时，向你的手机发送推送通知。"
          control={
            <Switch
              checked={dispatchMessages}
              onCheckedChange={(checked) => {
                void updateNotificationFeature("dispatch", { enable_push: checked });
              }}
            />
          }
        />
      </SettingsSection>
    </main>
  );
}

/** Official Response completions uses local notification entitlement hook, not org prefs. */
const RESPONSE_COMPLETIONS_KEY = "settings:responseCompletions";

function readLocalResponseCompletions(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(RESPONSE_COMPLETIONS_KEY) === "true";
  } catch {
    return false;
  }
}

function writeLocalResponseCompletions(checked: boolean) {
  try {
    window.localStorage.setItem(RESPONSE_COMPLETIONS_KEY, checked ? "true" : "false");
  } catch {
    // ignore
  }
  // force re-render via storage event for same-tab listeners if any
  window.dispatchEvent(new StorageEvent("storage", { key: RESPONSE_COMPLETIONS_KEY }));
}
