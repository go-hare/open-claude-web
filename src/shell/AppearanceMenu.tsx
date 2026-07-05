import { useEffect, useState } from "react";
import { type AppearanceMenuText, useAppearanceMenuText } from "../i18n/footerMenuMessages";
import type { FrameStore } from "../stores/frameStore";
import { BaseMenuGroupLabel, BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, Menu } from "./BaseMenu";
import { Icon } from "./icons";

type ThemeChoice = "darker" | "dark" | "light" | "auto";

const THEME_OPTIONS: Array<{ key: ThemeChoice; label: keyof AppearanceMenuText }> = [
  { key: "darker", label: "darker" },
  { key: "dark", label: "dark" },
  { key: "light", label: "light" },
  { key: "auto", label: "matchSystem" },
];

const THEME_STORAGE_KEY = "claude-rebuild-theme-mode";
const getInitialTheme = () => {
  if (typeof window === "undefined") return "auto";
  return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY));
};

export function AppearanceMenu({ frame }: { frame: FrameStore }) {
  const [theme, setTheme] = useState<ThemeChoice>(getInitialTheme);
  const text = useAppearanceMenuText();

  useAppearanceSideEffects(theme, frame.darkerCode, frame.systemFont);
  const selectedTheme = theme === "dark" && frame.darkerCode ? "darker" : theme;

  return (
    <Menu.Root>
      <Menu.Trigger aria-label={text.appearance} className="df-chrome-btn text-text-500" data-testid="appearance-menu-button" type="button"><Icon name="Toggles" size="sm" /></Menu.Trigger>
      <BaseMenuPopup align="end" className="w-[18rem]" side="top" sideOffset={6}>
        <AppearancePopup
          systemFont={frame.systemFont}
          text={text}
          theme={selectedTheme}
          onSystemFontChange={frame.setSystemFont}
          onThemeChange={(nextTheme) => {
            setTheme(nextTheme === "darker" ? "dark" : nextTheme);
            frame.setDarkerCode(nextTheme === "darker");
          }}
        />
      </BaseMenuPopup>
    </Menu.Root>
  );
}

function AppearancePopup({ onSystemFontChange, onThemeChange, systemFont, text, theme }: { onSystemFontChange: (value: boolean) => void; onThemeChange: (theme: ThemeChoice) => void; systemFont: boolean; text: AppearanceMenuText; theme: ThemeChoice }) {
  return (
    <>
      <Menu.Group>
        <BaseMenuGroupLabel>{text.theme}</BaseMenuGroupLabel>
        {THEME_OPTIONS.map(option => <BaseMenuItem checked={theme === option.key} checkedRole="radio" key={option.key} onClick={() => onThemeChange(option.key)}>{text[option.label]}</BaseMenuItem>)}
      </Menu.Group>
      <BaseMenuSeparator />
      <Menu.Group>
        <BaseMenuGroupLabel>{text.font}</BaseMenuGroupLabel>
        <BaseMenuItem checked={!systemFont} checkedRole="radio" onClick={() => onSystemFontChange(false)}>{text.anthropicSans}</BaseMenuItem>
        <BaseMenuItem checked={systemFont} checkedRole="radio" onClick={() => onSystemFontChange(true)}>{text.systemFont}</BaseMenuItem>
      </Menu.Group>
    </>
  );
}

function useAppearanceSideEffects(theme: ThemeChoice, darkerCode: boolean, systemFont: boolean) {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => applyAppearance(theme, darkerCode, systemFont, media.matches);
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    apply();
    if (theme !== "auto") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [darkerCode, theme, systemFont]);
}

function applyAppearance(theme: ThemeChoice, darkerCode: boolean, systemFont: boolean, systemDark: boolean) {
  const actualMode = theme === "auto" ? (systemDark ? "dark" : "light") : theme === "light" ? "light" : "dark";
  document.documentElement.classList.toggle("dark", actualMode === "dark");
  document.documentElement.style.colorScheme = actualMode;
  document.querySelectorAll("[data-theme='claude'], .cds-root").forEach(el => el.setAttribute("data-mode", actualMode));
  document.querySelectorAll(".dframe-root").forEach(el => {
    el.toggleAttribute("data-system-font", systemFont);
    el.toggleAttribute("data-darker-code", darkerCode);
  });
}

function normalizeTheme(theme: string | null): ThemeChoice {
  if (theme === "darker") return "dark";
  return theme === "dark" || theme === "light" || theme === "auto" ? theme : "auto";
}
