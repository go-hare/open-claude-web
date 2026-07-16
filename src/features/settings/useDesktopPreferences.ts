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
  quickEntryShortcut: "",
  useBuiltInNodeForMcp: true,
};

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
    return () => {
      alive = false;
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
    const next = accelerator.trim();
    let previous = "";
    setState((current) => {
      previous = current.globalShortcut;
      return { ...current, error: "", globalShortcut: next };
    });
    void desktopBridge.Preferences.setGlobalShortcut?.(next || null)
      .then((ok) => {
        if (ok === false) setState((current) => ({ ...current, error: "Invalid shortcut.", globalShortcut: previous }));
      })
      .catch((error) => {
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : "Invalid shortcut.",
          globalShortcut: previous,
        }));
      });
  }, []);

  return [state, { setGlobalShortcut, setMenuBarEnabled, setStartupOnLogin }] as const;
}
