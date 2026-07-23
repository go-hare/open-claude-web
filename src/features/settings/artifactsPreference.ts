/**
 * Artifacts preference residual (official index-BELzQL5P):
 * - Settings Visuals `_e`: writes `preview_feature_uses_artifacts`
 *   (`b = l?.settings.preview_feature_uses_artifacts ?? !0` — default ON).
 * - Conversation path: `showArtifacts: h?.preview_feature_uses_artifacts ?? !1`
 *   and `onOpenArtifact: showArtifacts ? openHandler : void 0`.
 *
 * Product residual: account.settings is the source of truth via PATCH.
 * Local mirror lets transcript / workspace paths read the gate without
 * re-mounting the full settings bootstrap on every message render.
 * Do not invent full Artifacts product runtime — only gate residual open handlers.
 */

export const PREVIEW_FEATURE_USES_ARTIFACTS_KEY = "settings:preview_feature_uses_artifacts";
export const ARTIFACTS_PREF_EVENT = "claude:artifacts-preference";

/** Official settings residual default: undefined → true (`?? !0`). */
export function readPreviewFeatureUsesArtifacts(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const raw = window.localStorage.getItem(PREVIEW_FEATURE_USES_ARTIFACTS_KEY);
    if (raw === null) return true;
    return raw === "true";
  } catch {
    return true;
  }
}

export function writePreviewFeatureUsesArtifacts(enabled: boolean) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PREVIEW_FEATURE_USES_ARTIFACTS_KEY, enabled ? "true" : "false");
  } catch {
    /* ignore quota */
  }
  try {
    window.dispatchEvent(new CustomEvent(ARTIFACTS_PREF_EVENT, { detail: { enabled } }));
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(
      new StorageEvent("storage", {
        key: PREVIEW_FEATURE_USES_ARTIFACTS_KEY,
        newValue: enabled ? "true" : "false",
      }),
    );
  } catch {
    /* ignore */
  }
}

/**
 * Sync mirror from account.settings bag (bootstrap load / PATCH response).
 * Official: undefined means settings-default ON; explicit false disables.
 */
export function syncPreviewFeatureUsesArtifactsFromSettings(settings: Record<string, unknown> | null | undefined) {
  if (!settings || !("preview_feature_uses_artifacts" in settings)) return;
  writePreviewFeatureUsesArtifacts(settings.preview_feature_uses_artifacts !== false);
}
