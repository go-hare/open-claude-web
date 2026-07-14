import { useEffect, useState } from "react";
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

/**
 * Official General (c0db37792 H): Profile X + Preferences _Component2 + Notifications _Component3.
 * Appearance mode: zR Kx("userThemeMode"); Chat font: O("customStyles:chatFont") + map K.
 */
export function GeneralSettings() {
  const [avatar, setAvatar] = useState(0);
  const [appearance, setAppearance] = useState<ThemeMode>(() => readThemeMode());
  const [chatFont, setChatFont] = useState<ChatFontSetting>(() => readChatFontSetting());
  const [workFunction, setWorkFunction] = useState("");
  // Official _Component3 Notifications: Response completions first, then gated Code/Dispatch rows.
  const [responseCompletions, setResponseCompletions] = useState(false);
  const [codeNotifications, setCodeNotifications] = useState(false);
  const [codePermissionRequests, setCodePermissionRequests] = useState(false);
  const [securityScanEmails, setSecurityScanEmails] = useState(false);
  const [dispatchMessages, setDispatchMessages] = useState(false);

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

  return (
    <main className="flex flex-col pb-10">
      <SettingsSection title="个人资料">
        <SettingsRow
          label="头像"
          control={<AvatarControl avatar={avatar} onRandomize={() => setAvatar(Math.floor(72 * Math.random()) + 1)} onClear={() => setAvatar(0)} />}
        />
        <SettingsRow label="全名" control={<TextInputControl ariaLabel="全名" defaultValue="Cowork 3P" />} />
        <SettingsRow label="Claude 应该怎么称呼你？" control={<TextInputControl ariaLabel="显示名称" defaultValue="Cowork 3P" />} />
        <SettingsRow
          label="哪项最符合你的工作？"
          control={
            <GhostSelect
              align="end"
              placeholder="选择"
              value={workFunction}
              options={[
                { value: "engineering", label: "工程" },
                { value: "product", label: "产品" },
                { value: "design", label: "设计" },
                { value: "operations", label: "运营" },
                { value: "other", label: "其他" },
              ]}
              onChange={setWorkFunction}
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
          control={<Switch checked={responseCompletions} onCheckedChange={setResponseCompletions} />}
        />
        <SettingsRow
          label="代码通知"
          description="Claude can choose to notify you about important updates from a Code session."
          control={<Switch checked={codeNotifications} onCheckedChange={setCodeNotifications} />}
        />
        <SettingsRow
          label="Code permission requests"
          description="当 Claude 在 Code 会话中需要你批准运行命令时，向你发送推送通知。"
          control={<Switch checked={codePermissionRequests} onCheckedChange={setCodePermissionRequests} />}
        />
        <SettingsRow
          label="Security scan emails"
          description="Get an email when a Claude Code security scan finishes."
          control={<Switch checked={securityScanEmails} onCheckedChange={setSecurityScanEmails} />}
        />
        <SettingsRow
          label="Dispatch messages"
          description="当 Claude 在 Dispatch 中给你发消息时，向你的手机发送推送通知。"
          control={<Switch checked={dispatchMessages} onCheckedChange={setDispatchMessages} />}
        />
      </SettingsSection>
    </main>
  );
}
