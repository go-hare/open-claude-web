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
 */
export function DesktopSettings() {
  const [preferences, setPreference] = useDesktopPreferences();
  const [nativeSettings, nativeActions] = useDesktopNativeSettings();
  const features = useDesktopSupportedFeatures();
  const isWindows =
    typeof navigator !== "undefined" && /Win/i.test(navigator.platform || navigator.userAgent);
  const trayLabel = isWindows ? "System tray" : "Menu bar";
  const trayDescription = isWindows
    ? "Keep Claude running in the system tray"
    : "Show Claude in the menu bar";

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

  return (
    <main className="flex flex-col">
      <SettingsSection title="General desktop settings">
        <SettingsRow
          description="Automatically start Claude when you log in to your computer"
          label="Run on startup"
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
            description="Message Claude from anywhere on your desktop"
            label="Quick access shortcut"
            control={
              <div className="flex w-[220px] flex-col justify-center gap-4">
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
            description="Quickly open Claude from anywhere"
            label="Quick Entry keyboard shortcut"
            control={
              <ShortcutControl
                value={legacyGlobalShortcut}
                onChange={async (accelerator) => {
                  const ok = await nativeActions.setGlobalShortcutAsync(accelerator);
                  if (!ok) throw new Error("invalid-accelerator");
                }}
              />
            }
          />
        )}

        {dictationSupported ? (
          <SettingsRow
            description="Speak to Claude from anywhere on your desktop"
            label="Voice shortcut"
            control={
              <div className="flex w-[280px] flex-col gap-2">
                <div className="flex w-[220px] flex-col justify-center gap-4 self-end">
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
            description={
              wakeForWork
                ? "Claude wakes your Mac briefly to check for work, then lets it sleep again."
                : "Prevent your computer from idle-sleeping while Claude is open so scheduled tasks can run. Your display can still turn off. Closing the laptop lid will still put it to sleep."
            }
            label={wakeForWork ? "Wake for work" : "Keep computer awake"}
            control={<KeepAwakeControl size="md" controlOnly />}
          />
        ) : null}

        {nativeSettings.error ? (
          <p className="py-sm text-footnote text-danger-000" role="status">
            {nativeSettings.error}
          </p>
        ) : null}
      </SettingsSection>

      <SettingsSection title="Browser Use">
        <SettingsRow
          description={
            <>
              Claude will browse and interact with any website in Chrome without asking. Applies to
              new sessions. This setting can put your data at risk.{" "}
              <a
                className="text-accent underline-offset-2 hover:underline"
                href="https://support.claude.com/en/articles/12902428-using-claude-in-chrome-safely"
                rel="noopener noreferrer"
                target="_blank"
              >
                Learn more
              </a>
            </>
          }
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
