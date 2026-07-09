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

export const FOOTER_LANGUAGE_OPTIONS = [
  { locale: "zh-CN", localName: "中文（中国）" },
  { locale: "en-US", localName: "English (United States)" },
  { locale: "fr-FR", localName: "français (France)" },
  { locale: "de-DE", localName: "Deutsch (Deutschland)" },
  { locale: "hi-IN", localName: "हिन्दी (भारत)" },
  { locale: "id-ID", localName: "Indonesia (Indonesia)" },
  { locale: "it-IT", localName: "italiano (Italia)" },
  { locale: "ja-JP", localName: "日本語" },
  { locale: "ko-KR", localName: "한국어" },
  { locale: "pt-BR", localName: "português (Brasil)" },
  { locale: "es-419", localName: "español (Latinoamérica)" },
  { locale: "es-ES", localName: "español (España)" },
] as const;

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
      requestLocaleChange?: (locale: string) => void;
    };
  }
}

export function getInitialLocale() {
  if (typeof window === "undefined") return "zh-CN";
  return normalizeLocale(window.localStorage.getItem(LOCALE_STORAGE_KEY) ?? "zh-CN");
}

export function applyLocaleOverride(locale: string) {
  if (typeof window === "undefined") return;
  const normalized = normalizeLocale(locale);
  window.localStorage.setItem(LOCALE_STORAGE_KEY, normalized);
  document.documentElement.lang = normalized;
  window.electronIntl?.requestLocaleChange?.(normalized);
  window.dispatchEvent(new CustomEvent("claude:locale-change", { detail: { locale: normalized } }));
}

export function useCurrentLocale() {
  const [locale, setLocale] = useState(getInitialLocale);

  useEffect(() => {
    const onLocaleChange = (event: Event) => {
      const next = (event as CustomEvent<{ locale?: string }>).detail?.locale;
      if (next) setLocale(normalizeLocale(next));
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === LOCALE_STORAGE_KEY && event.newValue) setLocale(normalizeLocale(event.newValue));
    };
    window.addEventListener("claude:locale-change", onLocaleChange);
    window.addEventListener("storage", onStorage);
    return () => {
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

export function normalizeLocale(locale: string) {
  return SUPPORTED_LOCALES.find(item => item.toLowerCase() === locale.toLowerCase()) ?? "en-US";
}
