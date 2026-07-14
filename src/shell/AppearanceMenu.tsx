import { useEffect, useState } from "react";
import {
  applyThemeMode,
  normalizeThemeMode,
  readThemeMode,
  THEME_MODE_CHANGE_EVENT,
  writeThemeMode,
  type ThemeMode,
} from "../features/settings/appearanceSettings";
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

const getInitialTheme = (): ThemeMode => readThemeMode();

export function AppearanceMenu({ frame }: { frame: FrameStore }) {
  const [theme, setTheme] = useState<ThemeChoice>(getInitialTheme);
  const text = useAppearanceMenuText();

  useEffect(() => {
    const sync = () => setTheme(readThemeMode());
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

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
    const apply = () => applyThemeMode(normalizeThemeMode(theme), { darkerCode, systemFont });
    writeThemeMode(normalizeThemeMode(theme));
    apply();
    if (theme !== "auto") return;
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [darkerCode, theme, systemFont]);
}
