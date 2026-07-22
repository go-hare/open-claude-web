import { useCallback, useEffect, useState } from "react";
import { desktopBridge, type DesktopPreferences } from "../../adapters/desktopBridge";

export const defaultDesktopPreferences: DesktopPreferences = {
  allowAllBrowserActions: false,
  autoCreatePullRequests: false,
  autoUpdateExtensions: true,
  bypassPermissionsModeEnabled: false,
  ccAutoArchiveOnPrClose: false,
  ccBranchPrefix: "claude",
  chillingSlothLocation: "default",
  coworkSpaceContextEnabled: false,
  dockBounceEnabled: false,
  enabledCoworkMemory: true,
  keepAwakeEnabled: false,
  launchEnabled: false,
  launchPreviewPersistSession: false,
  menuBarEnabled: true,
  quickEntryDictationShortcut: "off",
  quickEntryShortcut: "double-tap-option",
  useBuiltInNodeForMcp: true,
};

export type SupportedFeatureStatus = "supported" | "unavailable" | "unknown";

export type DesktopSupportedFeatures = Record<string, { status?: string } | boolean | undefined>;

/** Official pe(features, key).status residual. */
export function featureStatus(
  features: DesktopSupportedFeatures | null,
  key: string,
): SupportedFeatureStatus {
  if (!features) return "unknown";
  const entry = features[key];
  if (entry === true) return "supported";
  if (entry === false) return "unavailable";
  if (entry && typeof entry === "object" && typeof entry.status === "string") {
    if (entry.status === "supported") return "supported";
    if (entry.status === "unavailable") return "unavailable";
    return entry.status as SupportedFeatureStatus;
  }
  return "unavailable";
}

/**
 * Official le.getSupportedFeatures (c71860c77 ms).
 * Without bridge → nativeQuickEntry/quickEntryDictation unavailable (never invent supported).
 */
export function useDesktopSupportedFeatures() {
  const [features, setFeatures] = useState<DesktopSupportedFeatures | null>(null);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const raw =
          (await desktopBridge.Preferences.getSupportedFeatures?.())
          ?? null;
        if (!alive) return;
        if (raw && typeof raw === "object") {
          setFeatures(normalizeSupportedFeatures(raw as Record<string, unknown>));
        } else {
          setFeatures({
            nativeQuickEntry: { status: "unavailable" },
            quickEntryDictation: { status: "unavailable" },
            customQuickEntryDictationShortcut: { status: "unavailable" },
            wakeScheduler: { status: "unavailable" },
          });
        }
      } catch {
        if (!alive) return;
        setFeatures({
          nativeQuickEntry: { status: "unavailable" },
          quickEntryDictation: { status: "unavailable" },
          customQuickEntryDictationShortcut: { status: "unavailable" },
          wakeScheduler: { status: "unavailable" },
        });
      }
    };
    void load();
    return () => {
      alive = false;
    };
  }, []);

  return features;
}

/**
 * Official YK residual: features[key] || { status: "unavailable" }.
 * Accepts official `{ status }` entries and legacy flat booleans from older shells.
 */
function normalizeSupportedFeatures(raw: Record<string, unknown>): DesktopSupportedFeatures {
  const out: DesktopSupportedFeatures = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof value === "boolean") {
      out[key] = { status: value ? "supported" : "unavailable" };
      continue;
    }
    if (value && typeof value === "object" && "status" in value) {
      const status = String((value as { status?: unknown }).status ?? "unavailable");
      out[key] = { status };
      continue;
    }
    out[key] = { status: value ? "supported" : "unavailable" };
  }
  // Official default when missing: unavailable (do not invent supported).
  for (const key of [
    "nativeQuickEntry",
    "quickEntryDictation",
    "customQuickEntryDictationShortcut",
    "wakeScheduler",
  ]) {
    if (!(key in out)) out[key] = { status: "unavailable" };
  }
  return out;
}

export function useDesktopPreferences() {
  const [preferences, setPreferences] = useState<DesktopPreferences>(defaultDesktopPreferences);

  useEffect(() => {
    let alive = true;
    void desktopBridge.Preferences.getPreferences?.().then((loaded) => {
      if (alive && loaded) setPreferences({ ...defaultDesktopPreferences, ...loaded });
    });
    const unsubscribe = desktopBridge.Preferences.onPreferencesChanged?.((next) => {
      setPreferences({ ...defaultDesktopPreferences, ...next });
    });
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const setPreference = useCallback(<K extends keyof DesktopPreferences>(key: K, value: DesktopPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
    void desktopBridge.Preferences.setPreference?.(key, value);
  }, []);

  return [preferences, setPreference] as const;
}

export type DesktopNativeSettingsState = {
  error: string;
  globalShortcut: string;
  isLoading: boolean;
  menuBarEnabled: boolean;
  startupOnLogin: boolean;
};

export function useDesktopNativeSettings() {
  const [state, setState] = useState<DesktopNativeSettingsState>({
    error: "",
    globalShortcut: "",
    isLoading: true,
    menuBarEnabled: true,
    startupOnLogin: false,
  });

  useEffect(() => {
    let alive = true;
    void Promise.all([
      desktopBridge.Preferences.isStartupOnLoginEnabled?.() ?? Promise.resolve(false),
      desktopBridge.Preferences.isMenuBarEnabled?.() ?? Promise.resolve(true),
      desktopBridge.Preferences.getGlobalShortcut?.() ?? Promise.resolve(null),
    ])
      .then(([startupOnLogin, menuBarEnabled, globalShortcut]) => {
        if (!alive) return;
        setState({
          error: "",
          globalShortcut: globalShortcut ?? "",
          isLoading: false,
          menuBarEnabled,
          startupOnLogin,
        });
      })
      .catch((error) => {
        if (!alive) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to load desktop settings",
          isLoading: false,
        }));
      });

    const unsubscribe = desktopBridge.Preferences.onGlobalShortcutChanged?.((accelerator) => {
      setState((current) => ({
        ...current,
        globalShortcut: typeof accelerator === "string" ? accelerator : "",
      }));
    });

    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, []);

  const setStartupOnLogin = useCallback((enabled: boolean) => {
    setState((current) => ({ ...current, error: "", startupOnLogin: enabled }));
    void desktopBridge.Preferences.setStartupOnLoginEnabled?.(enabled)
      .then((ok) => {
        if (ok === false) setState((current) => ({ ...current, error: "Failed to update startup setting.", startupOnLogin: !enabled }));
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to update startup setting.",
          startupOnLogin: !enabled,
        }));
      });
  }, []);

  const setMenuBarEnabled = useCallback((enabled: boolean) => {
    setState((current) => ({ ...current, error: "", menuBarEnabled: enabled }));
    void desktopBridge.Preferences.setMenuBarEnabled?.(enabled)
      .then((ok) => {
        if (ok === false) setState((current) => ({ ...current, error: "Failed to update menu bar setting.", menuBarEnabled: !enabled }));
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Failed to update menu bar setting.",
          menuBarEnabled: !enabled,
        }));
      });
  }, []);

  const setGlobalShortcut = useCallback((accelerator: string) => {
    void setGlobalShortcutAsync(accelerator);
  }, []);

  const setGlobalShortcutAsync = useCallback(async (accelerator: string) => {
    const next = accelerator.trim();
    let previous = "";
    setState((current) => {
      previous = current.globalShortcut;
      return { ...current, error: "", globalShortcut: next };
    });
    try {
      const ok = await desktopBridge.Preferences.setGlobalShortcut?.(next || null);
      if (ok === false) {
        setState((current) => ({ ...current, error: "Invalid shortcut.", globalShortcut: previous }));
        return false;
      }
      return true;
    } catch (error) {
      setState((current) => ({
        ...current,
        error: error instanceof Error ? error.message : "Invalid shortcut.",
        globalShortcut: previous,
      }));
      return false;
    }
  }, []);

  return [
    state,
    { setGlobalShortcut, setGlobalShortcutAsync, setMenuBarEnabled, setStartupOnLogin },
  ] as const;
}
