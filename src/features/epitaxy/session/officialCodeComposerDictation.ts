/**
 * Official c119 `Jr` / index `obt`/`rbt` Code composer dictation gate.
 * `rbt("code")`: desktop + `desktop_dictation_voice`, else `ccr_basalt_harrier_main`.
 * Missing GrowthBook keys → false (3p bootstrap does not invent those flags).
 * Do not treat Web Speech as official `abt` DictationSession.
 */
import { useEffect, useState } from "react";
import { fetchBootstrapPayload } from "../../settings/accountSettingsApi";
import { readBootstrapFeatureFlag } from "../../settings/notificationRowGates";

export function officialIsDesktopShell(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as Window & { "claude.web"?: unknown })["claude.web"]);
}

export function officialPcmCaptureSupported(): boolean {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  return Boolean(
    (window.AudioContext || (window as Window & { webkitAudioContext?: unknown }).webkitAudioContext)
    && navigator.mediaDevices?.getUserMedia,
  );
}

/**
 * Official `rbt(e)` for Code composer (`e === "code"`).
 * Desktop: `$m() && pcm && desktop_dictation_voice`.
 * Non-desktop: `$m() && pcm && !mobile && claude_ai_voice_mode && ccr_basalt_harrier_main`.
 */
export function officialCodeComposerDictationEnabled(
  bootstrap: Record<string, unknown> | null | undefined,
  options: { desktop?: boolean; pcm?: boolean; mobile?: boolean } = {},
): boolean {
  const desktop = options.desktop ?? officialIsDesktopShell();
  const pcm = options.pcm ?? officialPcmCaptureSupported();
  const mobile = options.mobile ?? false;
  if (!pcm) return false;
  if (desktop) return readBootstrapFeatureFlag(bootstrap, "desktop_dictation_voice") === true;
  if (mobile) return false;
  return (
    readBootstrapFeatureFlag(bootstrap, "claude_ai_voice_mode") === true
    && readBootstrapFeatureFlag(bootstrap, "ccr_basalt_harrier_main") === true
  );
}

/** Official `hideDictation:!In` — hide when `rbt` is false. */
export function useOfficialCodeComposerHideDictation(): boolean {
  const [hide, setHide] = useState(true);
  useEffect(() => {
    let alive = true;
    void fetchBootstrapPayload()
      .then((payload) => {
        if (!alive) return;
        setHide(!officialCodeComposerDictationEnabled(payload));
      })
      .catch(() => {
        if (alive) setHide(true);
      });
    return () => {
      alive = false;
    };
  }, []);
  return hide;
}
