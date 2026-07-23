import { useMemo } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import {
  GhostSelect,
  QUICK_ENTRY_DICTATION_PRESETS,
  QUICK_ENTRY_NATIVE_PRESETS,
  ShortcutControl,
  type QuickEntryDictationValue,
  type QuickEntryShortcutValue,
} from "../SettingsControls";
import { KeepAwakeControl } from "../../cowork/scheduled/KeepAwakeControl";
import {
  useDesktopNativeSettings,
  useDesktopPreferences,
  useDesktopSupportedFeatures,
  featureStatus,
} from "../useDesktopPreferences";
import {
  renderDesktopBrowserUseDescription,
  useDesktopSettingsText,
} from "../settingsMessages";

/**
 * Official Desktop General bs/ms (c71860c77-B8t_5Z9x):
 * General desktop settings; Run on startup; nativeQuickEntry | legacy Quick Entry;
 * quickEntryDictation Voice shortcut; Menu bar / System tray; Keep awake / Wake for work (hYt controlOnly);
 * Browser Use allowAllBrowserActions.
 *
 * Native keys (nativeQuickEntry / quickEntryDictation / customQuickEntryDictationShortcut /
 * wakeScheduler) stay unavailable until a real native API exists — never invent supported.
 * Without wakeScheduler supported: "Keep computer awake" copy (not "Wake for work").
 * Without nativeQuickEntry: legacy global shortcut row.
 * Copy uses official /i18n message ids via useDesktopSettingsText.
 */
export function DesktopSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const [nativeSettings, nativeActions] = useDesktopNativeSettings();
  const features = useDesktopSupportedFeatures();
  const text = useDesktopSettingsText();
  const isWindows =
    typeof navigator !== "undefined" && /Win/i.test(navigator.platform || navigator.userAgent);
  const trayLabel = isWindows ? text.systemTray : text.menuBar;
  const trayDescription = isWindows
    ? text.keepInSystemTray
    : text.showInMenuBar;

  const nativeQuickEntry = featureStatus(features, "nativeQuickEntry") === "supported";
  const dictationSupported = featureStatus(features, "quickEntryDictation") === "supported";
  const customDictationSupported =
    featureStatus(features, "customQuickEntryDictationShortcut") === "supported";

  const quickEntryPresetId = useMemo(() => {
    const value = preferences.quickEntryShortcut;
    return QUICK_ENTRY_NATIVE_PRESETS.find((preset) => preset.match(value))?.id ?? "custom";
  }, [preferences.quickEntryShortcut]);

  const dictationPresetId = useMemo(() => {
    const value = preferences.quickEntryDictationShortcut;
    return QUICK_ENTRY_DICTATION_PRESETS.find((preset) => preset.match(value))?.id ?? "off";
  }, [preferences.quickEntryDictationShortcut]);

  const customQuickEntryAccelerator =
    typeof preferences.quickEntryShortcut === "object" && preferences.quickEntryShortcut
      ? preferences.quickEntryShortcut.accelerator ?? ""
      : "";
  const showCustomQuickEntry =
    nativeQuickEntry
    && typeof preferences.quickEntryShortcut === "object"
    && preferences.quickEntryShortcut
    && preferences.quickEntryShortcut.accelerator !== "Alt+Space";

  const customDictationAccelerator =
    typeof preferences.quickEntryDictationShortcut === "object" && preferences.quickEntryDictationShortcut
      ? preferences.quickEntryDictationShortcut.accelerator ?? ""
      : "";
  const showCustomDictation =
    dictationSupported
    && typeof preferences.quickEntryDictationShortcut === "object"
    && preferences.quickEntryDictationShortcut !== null;

  const keepAwakeDefined = preferences.keepAwakeEnabled !== undefined;
  // Official ce(): native wake support → "Wake for work" copy; else Keep computer awake.
  // Without native wake API (wakeScheduler supported false), stay on Keep computer awake.
  const wakeForWork = featureStatus(features, "wakeScheduler") === "supported";

  const legacyGlobalShortcut = nativeSettings.globalShortcut;

  // Official ms residual: return null until getSupportedFeatures resolves (`c ? … : null`).
  // Avoid flashing the legacy shortcut row before nativeQuickEntry status is known.
  if (!features) return null;

  return (
    <main className="flex flex-col">
      <SettingsSection title={text.generalDesktopSettings}>
        <SettingsRow
          description={text.runOnStartupDescription}
          label={text.runOnStartup}
          control={
            <Switch
              checked={nativeSettings.startupOnLogin}
              disabled={nativeSettings.isLoading}
              onCheckedChange={nativeActions.setStartupOnLogin}
            />
          }
        />

        {nativeQuickEntry ? (
          <SettingsRow
            description={text.quickAccessShortcutDescription}
            label={text.quickAccessShortcut}
            control={
              // Official ms: className="w-[220px] flex gap-4 flex-col justify-center"
              <div className="w-[220px] flex gap-4 flex-col justify-center">
                <GhostSelect
                  align="end"
                  value={quickEntryPresetId}
                  options={QUICK_ENTRY_NATIVE_PRESETS.map((preset) => ({
                    value: preset.id,
                    label: preset.label,
                  }))}
                  onChange={(id) => {
                    const preset = QUICK_ENTRY_NATIVE_PRESETS.find((item) => item.id === id);
                    if (!preset) return;
                    setPreference("quickEntryShortcut", preset.value as QuickEntryShortcutValue);
                  }}
                />
                {showCustomQuickEntry ? (
                  <ShortcutControl
                    value={customQuickEntryAccelerator}
                    onChange={async (accelerator) => {
                      if (!accelerator) {
                        setPreference("quickEntryShortcut", "off");
                        return;
                      }
                      setPreference("quickEntryShortcut", { accelerator });
                    }}
                  />
                ) : null}
              </div>
            }
          />
        ) : (
          <SettingsRow
            // Official ms legacy branch (nativeQuickEntry unsupported): wl6vXYrxQW / kpLUOdAdXq
            description={text.quickEntryKeyboardShortcutDescription}
            label={text.quickEntryKeyboardShortcut}
            control={
              // Official: control: div.w-[220px] > ShortcutControl
              <div className="w-[220px]">
                <ShortcutControl
                  value={legacyGlobalShortcut}
                  onChange={async (accelerator) => {
                    const ok = await nativeActions.setGlobalShortcutAsync(accelerator);
                    if (!ok) throw new Error("invalid-accelerator");
                  }}
                />
              </div>
            }
          />
        )}

        {dictationSupported ? (
          <SettingsRow
            description={text.voiceShortcutDescription}
            label={text.voiceShortcut}
            control={
              // Official: w-[280px] flex gap-2 flex-col > inner w-[220px] … self-end
              <div className="w-[280px] flex gap-2 flex-col">
                <div className="w-[220px] flex gap-4 flex-col justify-center self-end">
                  <GhostSelect
                    align="end"
                    value={dictationPresetId}
                    options={QUICK_ENTRY_DICTATION_PRESETS.filter(
                      (preset) => !preset.requiresCustomSupport || customDictationSupported,
                    ).map((preset) => ({
                      value: preset.id,
                      label: preset.label,
                    }))}
                    onChange={(id) => {
                      const preset = QUICK_ENTRY_DICTATION_PRESETS.find((item) => item.id === id);
                      if (!preset) return;
                      setPreference(
                        "quickEntryDictationShortcut",
                        preset.value as QuickEntryDictationValue,
                      );
                    }}
                  />
                  {showCustomDictation ? (
                    <ShortcutControl
                      value={customDictationAccelerator}
                      onChange={async (accelerator) => {
                        if (!accelerator) {
                          setPreference("quickEntryDictationShortcut", "off");
                          return;
                        }
                        setPreference("quickEntryDictationShortcut", { accelerator });
                      }}
                    />
                  ) : null}
                </div>
                {preferences.quickEntryDictationShortcut === "capslock" ? (
                  <p className="text-center text-footnote text-secondary">
                    Press once to start dictation, and press again when you&apos;re done speaking.
                  </p>
                ) : null}
              </div>
            }
          />
        ) : null}

        <SettingsRow
          description={trayDescription}
          label={trayLabel}
          control={
            <Switch
              checked={nativeSettings.menuBarEnabled}
              disabled={nativeSettings.isLoading}
              onCheckedChange={nativeActions.setMenuBarEnabled}
            />
          }
        />

        {keepAwakeDefined ? (
          <SettingsRow
            // Official ms: M&&K label CapHOIPauL / desc NtWJTAiYRo, control xe size md controlOnly
            // Official lge on /settings → CDS Switch (same family as Run on startup / Menu bar).
            description={
              wakeForWork
                ? "Claude wakes your Mac briefly to check for work, then lets it sleep again."
                : text.keepComputerAwakeDescription
            }
            label={wakeForWork ? "Wake for work" : text.keepComputerAwake}
            control={({ labelId, descriptionId }) => (
              <KeepAwakeControl
                size="md"
                controlOnly
                aria-labelledby={labelId}
                aria-describedby={descriptionId}
              />
            )}
          />
        ) : null}

        {nativeSettings.error ? (
          <p className="py-sm text-footnote text-danger-000" role="status">
            {nativeSettings.error}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection title={text.browserUse}>
        <SettingsRow
          // Official ts (c71860c77): 0Jh6jsTpeC + values.link → chrome safety article
          description={renderDesktopBrowserUseDescription(text.allowAllBrowserActionsDescription)}
          label={text.allowAllBrowserActions}
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
