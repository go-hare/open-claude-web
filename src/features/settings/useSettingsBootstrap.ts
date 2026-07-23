import { useCallback, useEffect, useState } from "react";
import {
  fetchAccountProfile,
  fetchAccountSettings,
  fetchBootstrapPayload,
  fetchNotificationPreferences,
  patchAccountSettings,
  patchNotificationPreferences,
  putAccountIdentity,
  putAccountProfile,
  type AccountIdentity,
  type AccountProfile,
  type NotificationFeaturePreference,
  type NotificationPreferencesPayload,
} from "./accountSettingsApi";
import { syncPreviewFeatureUsesArtifactsFromSettings, writePreviewFeatureUsesArtifacts } from "./artifactsPreference";
import { syncResponseCompletionsPrefMirror } from "./responseCompletionNotify";

/**
 * Bootstrap + account slice for personal settings (official Zn gates, Privacy gateway,
 * General profile X, Claude Code account.settings ccr_* keys).
 * Source: app://localhost/api/bootstrap (+ account_profile / account/settings / notification prefs).
 */

export type SettingsBootstrapOrg = {
  capabilities: string[];
  name: string;
  uuid?: string;
};

export type SettingsAccountSlice = {
  display_name: string;
  full_name: string;
  settings: Record<string, unknown>;
  uuid?: string;
};

export type SettingsBootstrapSlice = {
  account: SettingsAccountSlice | null;
  /**
   * Raw /api/bootstrap payload for GrowthBook / feature_flags residual gates
   * (official aA/bas/VBe/GBe via notificationRowGates).
   */
  bootstrapPayload: Record<string, unknown> | null;
  /** Official m()/wk: raven accounts hide personal privacy nav (dn = !raven). */
  isRaven: boolean;
  org: SettingsBootstrapOrg | null;
  profile: AccountProfile;
  /** Official os()?.provider — custom3p often omits; fall back via org name Gateway. */
  provider: string | null;
  providerEndpoint: string | null;
  role: string | null;
};

const empty: SettingsBootstrapSlice = {
  account: null,
  bootstrapPayload: null,
  isRaven: false,
  org: null,
  profile: {},
  provider: null,
  providerEndpoint: null,
  role: null,
};

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function string(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function parseSettingsBootstrap(payload: unknown): Omit<SettingsBootstrapSlice, "profile"> {
  const root = record(payload);
  const account = record(root.account);
  const memberships = Array.isArray(account.memberships) ? account.memberships : [];
  const membership = record(memberships[0]);
  const organization = record(membership.organization);
  const capabilities = Array.isArray(organization.capabilities)
    ? organization.capabilities.filter((item): item is string => typeof item === "string")
    : [];
  const orgName = string(organization.name);
  const provider =
    string(root.provider) ||
    string(organization.provider) ||
    (orgName?.toLowerCase() === "gateway" ? "gateway" : null);
  const endpoint =
    string(root.endpoint) ||
    string(organization.endpoint) ||
    string(record(organization.settings).endpoint) ||
    null;
  const settings = record(account.settings);
  // custom3p also mirrors account_settings into bootstrap root
  const accountSettingsRoot = record(root.account_settings);
  const mergedSettings = {
    ...Object.fromEntries(Object.entries(accountSettingsRoot).filter(([key]) => !key.startsWith("__"))),
    ...settings,
  };

  return {
    account: string(account.uuid) || string(account.full_name) || string(account.display_name) || Object.keys(mergedSettings).length
      ? {
          display_name: string(account.display_name) ?? "",
          full_name: string(account.full_name) ?? "",
          settings: mergedSettings,
          uuid: string(account.uuid),
        }
      : null,
    bootstrapPayload: root,
    isRaven: account.is_raven === true,
    org: orgName
      ? { capabilities, name: orgName, uuid: string(organization.uuid) }
      : null,
    provider,
    providerEndpoint: endpoint,
    role: string(membership.role) ?? null,
  };
}

/** Official YBe residual: compass + completion both enable_push. */
function responseCompletionsEnabledFromPrefs(preferences: Record<string, unknown> | undefined): boolean {
  const feature = record(record(preferences).feature_preference);
  return !!record(feature.compass).enable_push && !!record(feature.completion).enable_push;
}

async function loadSlice(): Promise<{
  notifications: NotificationPreferencesPayload;
  slice: SettingsBootstrapSlice;
}> {
  const bootstrap = await fetchBootstrapPayload();
  const base = bootstrap ? parseSettingsBootstrap(bootstrap) : { ...empty, profile: undefined };
  const orgUuid = base.org?.uuid ?? "00000000-0000-4000-8000-000000000001";
  const [profile, settings, notifications] = await Promise.all([
    fetchAccountProfile(),
    fetchAccountSettings(),
    fetchNotificationPreferences(orgUuid),
  ]);
  // Keep stream-end notify mirror aligned with server prefs (YBe).
  syncResponseCompletionsPrefMirror(responseCompletionsEnabledFromPrefs(notifications.preferences));
  const account = base.account
    ? { ...base.account, settings: { ...base.account.settings, ...settings } }
    : Object.keys(settings).length
      ? { display_name: "", full_name: "", settings }
      : null;
  // Artifacts residual: keep conversation showArtifacts mirror aligned with account.settings.
  syncPreviewFeatureUsesArtifactsFromSettings(account?.settings);
  return {
    notifications,
    slice: {
      account,
      bootstrapPayload: base.bootstrapPayload ?? (bootstrap ? record(bootstrap) : null),
      isRaven: base.isRaven,
      org: base.org,
      profile: {
        ...profile,
        // profile fields may also live on account.settings after custom3p mirror
        avatar: profile.avatar ?? (typeof settings.avatar === "number" ? settings.avatar : undefined),
        conversation_preferences:
          profile.conversation_preferences ??
          (typeof settings.conversation_preferences === "string" ? settings.conversation_preferences : undefined),
        work_function:
          profile.work_function ??
          (typeof settings.work_function === "string" ? settings.work_function : null),
      },
      provider: base.provider,
      providerEndpoint: base.providerEndpoint,
      role: base.role,
    },
  };
}

/** Official dn(): show Privacy in personal nav when not raven. */
export function useShowPrivacyInPersonalSettings(bootstrap: SettingsBootstrapSlice) {
  return !bootstrap.isRaven;
}

/**
 * Desktop product always surfaces Code / Cowork / Desktop app groups.
 * Official Et/sn/Da are GrowthBook + entitlement hooks; without those arms we keep
 * desktop-visible sections that match the 3P shell (not consumer-only chrome).
 */
export function useSettingsBootstrap() {
  const [slice, setSlice] = useState<SettingsBootstrapSlice>(empty);
  const [notifications, setNotifications] = useState<NotificationPreferencesPayload>({ preferences: {} });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    const next = await loadSlice();
    setSlice(next.slice);
    setNotifications(next.notifications);
    setReady(true);
    return next;
  }, []);

  useEffect(() => {
    let alive = true;
    void loadSlice().then((next) => {
      if (!alive) return;
      setSlice(next.slice);
      setNotifications(next.notifications);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  const updateIdentity = useCallback(async (patch: Partial<AccountIdentity>) => {
    const result = await putAccountIdentity(patch);
    if (!result) throw new Error("account identity save failed");
    await refresh();
  }, [refresh]);

  const updateProfile = useCallback(async (patch: Partial<AccountProfile>) => {
    const result = await putAccountProfile(patch);
    if (result === null) throw new Error("account profile save failed");
    setSlice((current) => ({
      ...current,
      profile: { ...current.profile, ...patch },
      account: current.account
        ? {
            ...current.account,
            settings: {
              ...current.account.settings,
              ...(patch.avatar !== undefined ? { avatar: patch.avatar } : {}),
              ...(patch.work_function !== undefined ? { work_function: patch.work_function } : {}),
              ...(patch.conversation_preferences !== undefined
                ? { conversation_preferences: patch.conversation_preferences }
                : {}),
            },
          }
        : current.account,
    }));
    await refresh();
  }, [refresh]);

  const updateAccountSettings = useCallback(async (patch: Record<string, unknown>) => {
    const ok = await patchAccountSettings(patch);
    if (!ok) throw new Error("account settings save failed");
    if ("preview_feature_uses_artifacts" in patch) {
      // Official Visuals `_e` writes this key; conversation path reads showArtifacts from it.
      writePreviewFeatureUsesArtifacts(patch.preview_feature_uses_artifacts !== false);
    }
    setSlice((current) => ({
      ...current,
      account: current.account
        ? { ...current.account, settings: { ...current.account.settings, ...patch } }
        : { display_name: "", full_name: "", settings: { ...patch } },
    }));
    await refresh();
  }, [refresh]);

  const updateAccountSetting = useCallback(async (key: string, value: unknown) => {
    await updateAccountSettings({ [key]: value });
  }, [updateAccountSettings]);

  const updateNotificationFeature = useCallback(
    async (featureKey: string, patch: Record<string, unknown>) => {
      const orgUuid = slice.org?.uuid ?? "00000000-0000-4000-8000-000000000001";
      const currentFeature = record(
        record(notifications.preferences).feature_preference,
      ) as NotificationFeaturePreference;
      const previous = record(currentFeature[featureKey]);
      const nextFeature: NotificationFeaturePreference = {
        ...currentFeature,
        [featureKey]: { ...previous, ...patch },
      };
      const result = await patchNotificationPreferences(orgUuid, {
        ...notifications.preferences,
        feature_preference: nextFeature,
      });
      if (!result) throw new Error("notification preferences save failed");
      setNotifications(result);
      syncResponseCompletionsPrefMirror(responseCompletionsEnabledFromPrefs(result.preferences));
      return result;
    },
    [notifications.preferences, slice.org?.uuid],
  );

  /**
   * Official ZBe residual (index-BELzQL5P): Response completions toggles
   * feature_preference.compass + completion enable_push together in one PATCH.
   */
  const updateResponseCompletionsPush = useCallback(
    async (enablePush: boolean) => {
      const orgUuid = slice.org?.uuid ?? "00000000-0000-4000-8000-000000000001";
      const currentFeature = record(
        record(notifications.preferences).feature_preference,
      ) as NotificationFeaturePreference;
      const nextFeature: NotificationFeaturePreference = {
        ...currentFeature,
        compass: { ...record(currentFeature.compass), enable_push: enablePush },
        completion: { ...record(currentFeature.completion), enable_push: enablePush },
      };
      const result = await patchNotificationPreferences(orgUuid, {
        ...notifications.preferences,
        feature_preference: nextFeature,
      });
      if (!result) throw new Error("notification preferences save failed");
      setNotifications(result);
      syncResponseCompletionsPrefMirror(enablePush);
      return result;
    },
    [notifications.preferences, slice.org?.uuid],
  );

  return {
    bootstrap: slice,
    notifications,
    ready,
    refresh,
    updateAccountSetting,
    /** Batch multiple account.settings keys in one PATCH (avoids concurrent clobber). */
    updateAccountSettings,
    updateIdentity,
    updateNotificationFeature,
    updateProfile,
    updateResponseCompletionsPush,
  };
}

/** Official _Component16 providerDisplayName: gateway host or provider label. */
export function providerDisplayName(bootstrap: SettingsBootstrapSlice, fallback = "your provider") {
  if (bootstrap.provider === "gateway" && bootstrap.providerEndpoint) {
    try {
      return new URL(bootstrap.providerEndpoint).host;
    } catch {
      return bootstrap.providerEndpoint;
    }
  }
  if (bootstrap.provider === "gateway") return bootstrap.org?.name || "Gateway";
  return bootstrap.provider || bootstrap.org?.name || fallback;
}
