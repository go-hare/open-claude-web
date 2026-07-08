import { useCallback, useEffect, useMemo, useState } from "react";

export const SUPPORTED_LOCALES = [
  "en-US",
  "de-DE",
  "fr-FR",
  "ko-KR",
  "ja-JP",
  "es-419",
  "es-ES",
  "it-IT",
  "hi-IN",
  "pt-BR",
  "id-ID",
  "zh-CN",
] as const;

export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export type I18nMessages = Record<string, string>;
export type MessageDescriptor = { defaultMessage: string; id: string };
export type MessageDescriptors = Record<string, MessageDescriptor>;
export const LOCALE_STORAGE_KEY = "claude-rebuild-locale";

const DEFAULT_LOCALE = "en-US" satisfies SupportedLocale;
const FALLBACK_APP_LOCALE = "zh-CN" satisfies SupportedLocale;
const LANGUAGE_DISPLAY_OPTIONS = { type: "language", languageDisplay: "standard" } as const;

function buildSupportedLocaleLookup() {
  const lookup = new Map<string, SupportedLocale>();
  for (const locale of SUPPORTED_LOCALES) {
    const normalized = locale.toLowerCase();
    lookup.set(normalized, locale);
    const language = normalized.split("-")[0];
    if (language && !lookup.has(language)) lookup.set(language, locale);
  }
  return lookup;
}

const supportedLocaleLookup = buildSupportedLocaleLookup();

function getDisplayName(locale: SupportedLocale, displayLocale: string) {
  return new Intl.DisplayNames(displayLocale, LANGUAGE_DISPLAY_OPTIONS).of(locale) ?? locale;
}

// 官方 Hns：n_.map(locale => DisplayNames(en-US/local)).sort(Intl.Collator(en-US))
export const FOOTER_LANGUAGE_OPTIONS = SUPPORTED_LOCALES
  .map(locale => ({
    locale,
    name: getDisplayName(locale, DEFAULT_LOCALE),
    localName: getDisplayName(locale, locale),
  }))
  .slice()
  .sort((left, right) => new Intl.Collator(DEFAULT_LOCALE).compare(left.name, right.name));

const FOOTER_MENU_MESSAGES = {
  about: { defaultMessage: "About Anthropic", id: "Cm+OGj8nZs" },
  keyboardShortcuts: { defaultMessage: "Keyboard shortcuts", id: "vzYPVXl4by" },
  language: { defaultMessage: "Language", id: "y1Z3orIe9Z" },
  learnMore: { defaultMessage: "Learn more", id: "TdTXXf940t" },
  organizationSettings: { defaultMessage: "Organization settings", id: "8JjaslSBQx" },
  privacyChoices: { defaultMessage: "Your privacy choices", id: "9z1SUK0pfj" },
  privacyPolicy: { defaultMessage: "Privacy policy", id: "cPwv2cbzf2" },
  settings: { defaultMessage: "Settings", id: "D3idYvSLF9" },
  tutorials: { defaultMessage: "Tutorials", id: "4u7hBBtxd+" },
  courses: { defaultMessage: "Courses", id: "R85gsW8HY9" },
  usagePolicy: { defaultMessage: "Usage policy", id: "2hfc4AKs6b" },
  analytics: { defaultMessage: "Analytics", id: "GZJpDfFNLG" },
};

type FooterMenuKey = keyof typeof FOOTER_MENU_MESSAGES;
export type FooterMenuText = Record<FooterMenuKey, string>;

const APPEARANCE_MENU_MESSAGES = {
  appearance: { defaultMessage: "Appearance", id: "2GURQYNPp3" },
  theme: { defaultMessage: "Theme", id: "Pe0ogRZhIF" },
  light: { defaultMessage: "Light", id: "3cc4CtJM5h" },
  dark: { defaultMessage: "Mid", id: "sKM2ueljV6" },
  darker: { defaultMessage: "Dark", id: "tOdNiYuuag" },
  matchSystem: { defaultMessage: "Match system", id: "KNFWQ+T1/T" },
  font: { defaultMessage: "Font", id: "A3jj9z+p5h" },
  anthropicSans: { defaultMessage: "Anthropic Sans", id: "4EAtPWhM42" },
  systemFont: { defaultMessage: "Match system", id: "KNFWQ+T1/T" },
};

type AppearanceMenuKey = keyof typeof APPEARANCE_MENU_MESSAGES;
export type AppearanceMenuText = Record<AppearanceMenuKey, string>;

const resourceCache = new Map<string, I18nMessages>();

declare global {
  interface Window {
    electronIntl?: {
      getInitialLocale?: () => Promise<string | { locale?: string; messages?: I18nMessages }> | string | { locale?: string; messages?: I18nMessages };
      requestLocaleChange?: (locale: string) => Promise<unknown> | void;
      localeChanged?: (callback: (locale: string | { locale?: string }) => void) => () => void;
    };
  }
}

export function getInitialLocale() {
  if (typeof window === "undefined") return FALLBACK_APP_LOCALE;
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? navigator.language ?? FALLBACK_APP_LOCALE);
}

export function applyLocaleOverride(locale: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeLocale(locale);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  document.documentElement.lang = normalized;
  void window.electronIntl?.requestLocaleChange?.(normalized)?.catch?.(() => {});
  window.dispatchEvent(new CustomEvent("claude:locale-change", { detail: { locale: normalized } }));
}

export function useCurrentLocale() {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    let cancelled = false;
    const applyNextLocale = (next: string | { locale?: string } | undefined) => {
      const value = typeof next === "string" ? next : next?.locale;
      if (value && !cancelled) setLocale(normalizeLocale(value));
    };
    const onLocaleChange = (event: Event) => {
      applyNextLocale((event as CustomEvent<{ locale?: string }>).detail?.locale);
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && event.newValue) applyNextLocale(event.newValue);
    };

    const initialDesktopLocale = window.electronIntl?.getInitialLocale?.();
    if (!window.localStorage.getItem(LOCALE_STORAGE_KEY) && initialDesktopLocale !== undefined) {
      void Promise.resolve(initialDesktopLocale).then(applyNextLocale).catch(() => {});
    }

    const unsubscribeDesktopLocale = window.electronIntl?.localeChanged?.(applyNextLocale);
    window.addEventListener("claude:locale-change", onLocaleChange);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      unsubscribeDesktopLocale?.();
      window.removeEventListener("claude:locale-change", onLocaleChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") document.documentElement.lang = locale;
  }, [locale]);

  return locale;
}

export function useManagedLocale() {
  const locale = useCurrentLocale();
  const setLocale = useCallback((nextLocale: string) => applyLocaleOverride(nextLocale), []);
  return [locale, setLocale] as const;
}

export function useFooterMenuText(locale?: string) {
  return useI18nText(FOOTER_MENU_MESSAGES, locale) as FooterMenuText;
}

export function useAppearanceMenuText(locale?: string) {
  return useI18nText(APPEARANCE_MENU_MESSAGES, locale) as AppearanceMenuText;
}

export function useI18nText<T extends MessageDescriptors>(descriptors: T, explicitLocale?: string) {
  const currentLocale = useCurrentLocale();
  const locale = explicitLocale ?? currentLocale;
  const messages = useI18nMessages(locale);
  return useMemo(() => buildTextMap(descriptors, messages ?? undefined), [descriptors, messages]);
}

export function useI18nMessages(locale: string) {
  const normalized = normalizeLocale(locale);
  const [messages, setMessages] = useState<I18nMessages | null>(() => resourceCache.get(normalized) ?? null);
  useEffect(() => {
    let cancelled = false;
    setMessages(resourceCache.get(normalized) ?? null);
    loadI18nResource(normalized).then(next => {
      if (!cancelled) setMessages(next);
    });
    return () => { cancelled = true; };
  }, [normalized]);
  return messages;
}

export async function loadI18nResource(locale: string) {
  const normalized = normalizeLocale(locale);
  const cached = resourceCache.get(normalized);
  if (cached) return cached;
  const [base, statsig, overrides] = await Promise.all([
    fetchJson(`/i18n/${encodeURIComponent(normalized)}.json`),
    fetchOptionalJson(`/i18n/statsig/${encodeURIComponent(normalized)}.json`),
    normalized === "en-US" ? Promise.resolve({}) : fetchOptionalJson(`/i18n/${encodeURIComponent(normalized)}.overrides.json`),
  ]);
  const merged = mergeKnownOverrides({ ...base, ...statsig }, overrides);
  resourceCache.set(normalized, merged);
  return merged;
}

function buildTextMap<T extends MessageDescriptors>(descriptors: T, messages: I18nMessages = {}) {
  return Object.fromEntries(Object.entries(descriptors).map(([key, descriptor]) => [
    key,
    messages[descriptor.id] ?? descriptor.defaultMessage,
  ])) as Record<keyof T, string>;
}

async function fetchJson(path: string) {
  const response = await fetch(path);
  if (!response.ok) return {};
  return await response.json() as I18nMessages;
}

async function fetchOptionalJson(path: string) {
  const response = await fetch(path).catch(() => null);
  if (!response?.ok) return {};
  return await response.json() as I18nMessages;
}

function mergeKnownOverrides(base: I18nMessages, overrides: I18nMessages) {
  const next = { ...base };
  for (const key of Object.keys(overrides)) if (key in base) next[key] = overrides[key];
  return next;
}

export function normalizeLocale(locale: string | null | undefined): SupportedLocale {
  if (!locale) return DEFAULT_LOCALE;
  const normalized = locale.toLowerCase();
  return supportedLocaleLookup.get(normalized) ?? DEFAULT_LOCALE;
}
