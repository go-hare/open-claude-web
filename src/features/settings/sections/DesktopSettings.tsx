import { useCallback, useEffect, useMemo, useState } from "react";
import { SettingsRow, SettingsSection, Switch } from "../SettingsShell";
import { desktopInfoBridge } from "../settingsDesktopBridge";
import {
  GhostSelect,
  QUICK_ENTRY_NATIVE_PRESETS,
  ShortcutControl,
  type QuickEntryShortcutValue,
} from "../SettingsControls";
import { KeepAwakeControl } from "../../cowork/scheduled/KeepAwakeControl";
import { DesktopStorageSettings } from "./DesktopStorageSettings";
import {
  useDesktopNativeSettings,
  useDesktopPreferences,
  useDesktopSupportedFeatures,
  featureStatus,
} from "../useDesktopPreferences";
import { useDesktopSettingsText } from "../settingsMessages";

/**
 * Official Qn overlay (c71860c77-C_7Gqn1u). Screenshot 27: version, startup,
 * Quick access, Menu bar, Keep computer awake, Storage Cn (DeviceStorage.getUsage).
 * Computer Pn F.show needs shared-26 HO()/RO() chicago GrowthBook — 3p kni has
 * no chicago flag, so Pn stays omitted (do not invent).
 *
 * Feature gates come from AppFeatures.getSupportedFeatures → official pw() residual
 * (open-claude-desktop supportedFeatures.ts: Dvi/mvi/OW/Ovi/mT/…).
 *   - nativeQuickEntry supported (Dvi: darwin+macOS13+) → Quick access shortcut row
 *   - else → legacy global shortcut row (wl6vXYrxQW)
 *   - quickEntryDictation supported (mvi: darwin+macOS14+, mic not restricted) → Voice shortcut
 *   - customQuickEntryDictationShortcut is OW always supported when features resolve
 *   - wakeScheduler supported (mT(Ovi)) → "Wake for work" copy; else Keep computer awake
 * Never invent supported in the renderer — only consume main-process residual map.
 * Official ms: return null until getSupportedFeatures resolves (`c ? … : null`).
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

  const quickEntryPresetId = useMemo(() => {
    const value = preferences.quickEntryShortcut;
    return QUICK_ENTRY_NATIVE_PRESETS.find((preset) => preset.match(value))?.id ?? "off";
  }, [preferences.quickEntryShortcut]);

  const quickEntryPresetLabel = useCallback(
    (id: string) => {
      switch (id) {
        case "double-tap-option":
          return isWindows ? text.tapAltTwice : text.tapOptionTwice;
        case "option-space":
          return isWindows ? text.altSpace : text.optionSpace;
        case "custom":
          return text.customEllipsis;
        case "off":
          return text.noShortcut;
        default:
          return id;
      }
    },
    [isWindows, text],
  );

  const customQuickEntryAccelerator =
    typeof preferences.quickEntryShortcut === "object" && preferences.quickEntryShortcut
      ? preferences.quickEntryShortcut.accelerator ?? ""
      : "";
  const showCustomQuickEntry =
    nativeQuickEntry
    && typeof preferences.quickEntryShortcut === "object"
    && preferences.quickEntryShortcut
    && preferences.quickEntryShortcut.accelerator !== "Alt+Space";

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
      <SettingsSection id="general-desktop" title={text.generalDesktopSettings}>
        <DesktopAppVersionRow />
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
                  searchable={false}
                  variant="outline"
                  value={quickEntryPresetId}
                  options={QUICK_ENTRY_NATIVE_PRESETS.map((preset) => ({
                    value: preset.id,
                    label: quickEntryPresetLabel(preset.id),
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

        {/* Official Cn (c71860c77 wn/gn) — hidden until DeviceStorage.getUsage exists. */}
        <DesktopStorageSettings />

        {nativeSettings.error ? (
          <p className="py-sm text-footnote text-danger-000" role="status">
            {nativeSettings.error}
          </p>
        ) : null}
      </SettingsSection>
    </main>
  );
}

/** Official In (c71860c77-C_7Gqn1u): Desktop app version from DesktopInfo.appVersion. */
function DesktopAppVersionRow() {
  const text = useDesktopSettingsText();
  const [version, setVersion] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void desktopInfoBridge()?.getSystemInfo?.().then((info) => {
      if (!alive) return;
      const next = typeof info?.appVersion === "string" ? info.appVersion.trim() : "";
      setVersion(next || null);
    });
    return () => {
      alive = false;
    };
  }, []);
  if (!version) return null;
  return (
    <SettingsRow
      label={text.desktopAppVersion}
      control={<span className="text-body text-primary tabular-nums">{version}</span>}
    />
  );
}
