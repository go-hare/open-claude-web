import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { ShortcutControl } from "../SettingsControls";
import { useDesktopNativeSettings, useDesktopPreferences } from "../useDesktopPreferences";

/**
 * Official Desktop General bs (c71860c77-B8t_5Z9x):
 * General desktop settings; Run on startup; Quick Entry; Menu bar (mac) / System tray (win); Keep computer awake.
 * Browser Use ts: allowAllBrowserActions via AppPreferences (same preferences store).
 */
export function DesktopSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const [nativeSettings, nativeActions] = useDesktopNativeSettings();
  const isWindows = typeof navigator !== "undefined" && /Win/i.test(navigator.platform || navigator.userAgent);
  const trayLabel = isWindows ? "System tray" : "Menu bar";
  const trayDescription = isWindows ? "Keep Claude running in the system tray" : "在 Menu bar 中显示 Claude";
  return (
    <main className="flex flex-col">
      <SettingsSection title="桌面端通用设置">
        <SettingsRow description="登录电脑后自动启动 Claude" label="开机启动" control={<Switch checked={nativeSettings.startupOnLogin} disabled={nativeSettings.isLoading} onCheckedChange={nativeActions.setStartupOnLogin} />} />
        <SettingsRow description="Quickly open Claude from anywhere" label="Quick Entry 快捷键" control={<ShortcutControl onChange={nativeActions.setGlobalShortcut} value={nativeSettings.globalShortcut} />} />
        <SettingsRow description={trayDescription} label={trayLabel} control={<Switch checked={nativeSettings.menuBarEnabled} disabled={nativeSettings.isLoading} onCheckedChange={nativeActions.setMenuBarEnabled} />} />
        <SettingsRow description="当 Claude 打开时，防止电脑因空闲而休眠，以便定时任务继续运行。显示器仍可关闭，合上笔记本盖后仍会进入睡眠。" label="保持电脑唤醒" control={<Switch checked={!!preferences.keepAwakeEnabled} onCheckedChange={(checked) => setPreference("keepAwakeEnabled", checked)} />} />
        {nativeSettings.error ? <p className="py-sm text-footnote text-danger-000" role="status">{nativeSettings.error}</p> : null}
      </SettingsSection>
      <SettingsSection title="Browser Use">
        <SettingsRow
          description="Claude will browse and interact with any website in Chrome without asking. Applies to new sessions. This setting can put your data at risk."
          label="Allow all browser actions"
          control={
            <Switch
              checked={!!preferences.allowAllBrowserActions}
              onCheckedChange={(checked) => setPreference("allowAllBrowserActions", checked)}
            />
          }
        />
      </SettingsSection>
    </main>
  );
}
