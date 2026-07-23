/**
 * Official appearance + chat font (c0db37792 + c5f4e1303):
 * - Theme mode: Kx("userThemeMode", "auto") → setMode; UR applies document.documentElement.dataset.mode
 * - Chat font: O("customStyles:chatFont", "default") → --font-user-message / --font-claude-response via map K
 * Desktop chrome also keeps claude-rebuild-theme-mode for AppearanceMenu / dframe-root parity.
 */

export type ThemeMode = "auto" | "light" | "dark";
export type ChatFontSetting = "default" | "sans" | "system" | "dyslexia";

/** Official Kx key in ThemeProvider zR. */
export const USER_THEME_MODE_KEY = "userThemeMode";
/** Existing desktop chrome key (AppearanceMenu); kept in sync with USER_THEME_MODE_KEY. */
export const THEME_STORAGE_KEY = "claude-rebuild-theme-mode";
/** Official customStyles:chatFont. */
export const CHAT_FONT_STORAGE_KEY = "customStyles:chatFont";

const CHAT_FONT_MAP: Record<ChatFontSetting, { user: string; claude: string }> = {
  default: { user: "--font-sans-serif", claude: "--font-serif" },
  sans: { user: "--font-ui", claude: "--font-ui" },
  system: { user: "--font-system", claude: "--font-system" },
  dyslexia: { user: "--font-dyslexia", claude: "--font-dyslexia" },
};

/**
 * Official ae + CSS var map (c0db37792 K).
 * Labels come from i18n in ChatFontSelect (kZqxEvVpFT / 4EAtPWhM42 / +CwN9C/QFk / twBGxrOFSV).
 */
export const CHAT_FONT_ORDER: ChatFontSetting[] = ["default", "sans", "system", "dyslexia"];

export const CHAT_FONT_CSS_VAR: Record<ChatFontSetting, string> = {
  default: "--font-serif",
  sans: "--font-ui",
  system: "--font-system",
  dyslexia: "--font-dyslexia",
};

/** @deprecated Prefer CHAT_FONT_ORDER + i18n labels in ChatFontSelect. */
export const CHAT_FONT_OPTIONS: Array<{ value: ChatFontSetting; label: string; fontFamily: string }> = [
  { value: "default", label: "Anthropic Serif", fontFamily: "var(--font-serif)" },
  { value: "sans", label: "Anthropic Sans", fontFamily: "var(--font-ui)" },
  { value: "system", label: "System", fontFamily: "var(--font-system)" },
  { value: "dyslexia", label: "Dyslexic friendly", fontFamily: "var(--font-dyslexia)" },
];

export function readThemeMode(): ThemeMode {
  if (typeof window === "undefined") return "auto";
  const raw = window.localStorage.getItem(USER_THEME_MODE_KEY) ?? window.localStorage.getItem(THEME_STORAGE_KEY);
  return normalizeThemeMode(raw);
}

export const THEME_MODE_CHANGE_EVENT = "claude-theme-mode-change";

export function writeThemeMode(mode: ThemeMode) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_THEME_MODE_KEY, mode);
  window.localStorage.setItem(THEME_STORAGE_KEY, mode);
  window.dispatchEvent(new CustomEvent(THEME_MODE_CHANGE_EVENT, { detail: mode }));
}

export function normalizeThemeMode(value: string | null | undefined): ThemeMode {
  if (value === "darker") return "dark";
  return value === "dark" || value === "light" || value === "auto" ? value : "auto";
}

export function resolveThemeMode(mode: ThemeMode, systemDark: boolean): "light" | "dark" {
  if (mode === "auto") return systemDark ? "dark" : "light";
  return mode;
}

/** Official UR + our dframe/cds-root parity (AppearanceMenu applyAppearance). */
export function applyThemeMode(mode: ThemeMode, options?: { darkerCode?: boolean; systemFont?: boolean }) {
  if (typeof document === "undefined") return;
  const systemDark = typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const actual = resolveThemeMode(mode, systemDark);
  document.documentElement.dataset.mode = actual;
  document.documentElement.classList.toggle("dark", actual === "dark");
  document.documentElement.style.colorScheme = actual;
  document.querySelectorAll("[data-theme='claude'], .cds-root").forEach((el) => el.setAttribute("data-mode", actual));
  document.querySelectorAll(".dframe-root").forEach((el) => {
    if (options?.systemFont !== undefined) el.toggleAttribute("data-system-font", options.systemFont);
    if (options?.darkerCode !== undefined) el.toggleAttribute("data-darker-code", options.darkerCode);
  });
  try {
    (window as Window & { electronWindowControl?: { setThemeMode?: (mode: string) => void } }).electronWindowControl?.setThemeMode?.(
      mode === "auto" ? "system" : mode,
    );
  } catch {
    /* optional native bridge */
  }
}

export function readChatFontSetting(): ChatFontSetting {
  if (typeof window === "undefined") return "default";
  return normalizeChatFont(window.localStorage.getItem(CHAT_FONT_STORAGE_KEY));
}

export function writeChatFontSetting(value: ChatFontSetting) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CHAT_FONT_STORAGE_KEY, value);
  applyChatFontSetting(value);
}

export function normalizeChatFont(value: string | null | undefined): ChatFontSetting {
  return value === "default" || value === "sans" || value === "system" || value === "dyslexia" ? value : "default";
}

/** Official chatFont effect: set --font-user-message / --font-claude-response from K. */
export function applyChatFontSetting(value: ChatFontSetting) {
  if (typeof document === "undefined") return;
  const mapped = CHAT_FONT_MAP[value] ?? CHAT_FONT_MAP.default;
  document.documentElement.style.setProperty("--font-user-message", `var(${mapped.user})`);
  document.documentElement.style.setProperty("--font-claude-response", `var(${mapped.claude})`);
}

export function bootstrapAppearanceFromStorage() {
  applyThemeMode(readThemeMode());
  applyChatFontSetting(readChatFontSetting());
}

/** Resolved light/dark for cds-root data-mode (official ThemeProvider resolvedMode). */
export function readResolvedColorMode(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return resolveThemeMode(readThemeMode(), window.matchMedia("(prefers-color-scheme: dark)").matches);
}
