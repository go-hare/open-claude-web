/**
 * Official hYt Keep awake control (index-BELzQL5P).
 * mYt size md: font-base + icon 20 + default switch; dsVariant dark via lge/Zfe.
 * Prefs: TW=claude.settings.AppPreferences keepAwakeEnabled via desktopBridge.Preferences.
 * Hover: pge/Xp side bottom — "When enabled, Claude will prevent your computer from going to sleep."
 */
import { useCallback, useEffect, useState } from "react";
import { desktopBridge } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import { OfficialSwitch } from "../../shared/OfficialSwitch";
import { OfficialTooltip } from "../../shared/OfficialTooltip";

const sizeChrome = {
  sm: { textClass: "font-small", iconSize: "sm" as const, switchSize: "sm" as const },
  md: { textClass: "font-base", iconSize: "md" as const, switchSize: "default" as const },
};

const KEEP_AWAKE_TOOLTIP = "When enabled, Claude will prevent your computer from going to sleep.";

/**
 * Official hYt (index-BELzQL5P):
 * - controlOnly: only the switch (Desktop General c71860c77 uses size=md controlOnly)
 * - otherwise: icon + "Keep awake" label + switch in bottom tooltip
 */
export function KeepAwakeControl({
  fullWidth = false,
  size = "sm",
  controlOnly = false,
  "aria-labelledby": ariaLabelledby,
  "aria-describedby": ariaDescribedby,
}: {
  fullWidth?: boolean;
  size?: "sm" | "md";
  /** Official hYt controlOnly — settings row supplies label/description. */
  controlOnly?: boolean;
  "aria-labelledby"?: string;
  "aria-describedby"?: string;
}) {
  const { textClass, iconSize, switchSize } = sizeChrome[size];
  // Official hYt: g = preferences | undefined; render when g?.keepAwakeEnabled !== undefined
  const [prefsReady, setPrefsReady] = useState(false);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void desktopBridge.Preferences.getPreferences?.()
      .then((prefs) => {
        if (!active || !prefs) return;
        // After normalizePreferences / SettingsStore defaults, key is always defined on desktop.
        if ("keepAwakeEnabled" in prefs) {
          setPrefsReady(true);
          setEnabled(prefs.keepAwakeEnabled === true);
        }
      })
      .catch(() => undefined);
    const unsubscribe = desktopBridge.Preferences.onPreferencesChanged?.((prefs) => {
      if (!prefs || !("keepAwakeEnabled" in prefs)) return;
      setPrefsReady(true);
      setEnabled(prefs.keepAwakeEnabled === true);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  // Official hYt onCheckedChange toggles then TW.setPreference("keepAwakeEnabled", next)
  const onCheckedChange = useCallback((next: boolean) => {
    setEnabled(next);
    void desktopBridge.Preferences.setPreference?.("keepAwakeEnabled", next).catch(() => {
      setEnabled(!next);
    });
  }, []);

  if (!prefsReady) return null;

  const switchEl = (
    <OfficialSwitch
      aria-label={ariaLabelledby ? undefined : "Keep awake"}
      aria-labelledby={ariaLabelledby}
      aria-describedby={ariaDescribedby}
      checked={enabled}
      dsVariant="dark"
      onCheckedChange={onCheckedChange}
      size={switchSize}
    />
  );

  // Official: controlOnly → bare switch for settings row
  if (controlOnly) {
    return (
      <span data-official-source="index-BELzQL5P.js:hYt">
        {switchEl}
      </span>
    );
  }

  // Official hYt: pge({ content, side: "bottom", children: <span className={fullWidth ? "block w-full" : undefined}>...</span> })
  return (
    <OfficialTooltip side="bottom" tooltipContent={KEEP_AWAKE_TOOLTIP}>
      <span
        className={fullWidth ? "block w-full" : undefined}
        data-official-source="index-BELzQL5P.js:hYt"
      >
        <span
          className={[
            "flex items-center gap-2 select-none text-text-300",
            fullWidth ? "w-full" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <Icon name="Sun" size={iconSize} />
          <span className={`${textClass}${fullWidth ? " flex-1" : ""}`}>Keep awake</span>
          {switchEl}
        </span>
      </span>
    </OfficialTooltip>
  );
}
