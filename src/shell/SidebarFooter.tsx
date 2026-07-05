import { type ReactNode, useState } from "react";
import { FOOTER_LANGUAGE_OPTIONS, type FooterMenuText, useFooterMenuText, useManagedLocale } from "../i18n/footerMenuMessages";
import type { FrameStore } from "../stores/frameStore";
import { AppearanceMenu } from "./AppearanceMenu";
import { BaseMenuHeader, BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, BaseSubmenu, Menu } from "./BaseMenu";
import { Icon } from "./icons";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";

type SidebarFooterProps = {
  frame: FrameStore;
  mode: FrameStore["mode"];
  onNavigate: (path: string) => void;
};

export function SidebarFooter({ frame, mode, onNavigate }: SidebarFooterProps) {
  const [locale, setLocale] = useManagedLocale();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const displayName = "Cowork 3P";
  const organizationName = "Gateway";
  const menuText = useFooterMenuText(locale);

  return (
    <div className="shrink-0 flex items-center gap-[var(--df-footer-gap)]">
      <div className="min-w-0 max-w-[75%]">
        <Menu.Root>
          <Menu.Trigger className="cds-reset flex h-6 max-w-full items-center gap-1.5 rounded-[var(--df-radius-pill)] pl-0.5 pr-1.5 outline-none transition-colors duration-fast hover:bg-[var(--df-hover)] focus-visible:shadow-focus" data-testid="user-menu-button" type="button">
            <img alt="" aria-hidden="true" className="size-4 shrink-0 claude-rebuild-logo-img" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
            <span className="flex min-w-0 items-baseline gap-1 text-xs"><span className="shrink-0 text-primary">{displayName}</span><span aria-hidden="true" className="text-muted">·</span><span className="min-w-0 truncate text-muted">{organizationName}</span></span>
            <Icon name="CaretDown" size="xs" className="shrink-0 text-muted" />
          </Menu.Trigger>
          <BaseMenuPopup align="start" className="w-[17rem]" side="top" sideOffset={6}>
            <UserMenu displayName={displayName} locale={locale} mode={mode} onLocaleChange={setLocale} onOpenShortcuts={() => setShortcutsOpen(true)} onNavigate={onNavigate} text={menuText} />
          </BaseMenuPopup>
        </Menu.Root>
      </div>
      <KeyboardShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <div className="ml-auto flex items-center">
        {mode === "code" ? <AppearanceMenu frame={frame} /> : null}
      </div>
    </div>
  );
}

const openExternal = (href: string) => {
  window.open(href, "_blank", "noopener,noreferrer");
};

function UserMenu({ displayName, locale, mode, onLocaleChange, onOpenShortcuts, onNavigate, text }: {
  displayName: string;
  locale: string;
  mode: FrameStore["mode"];
  onLocaleChange: (locale: string) => void;
  onOpenShortcuts: () => void;
  onNavigate: (path: string) => void;
  text: FooterMenuText;
}) {
  const settingsTarget = mode === "code" ? "/settings/claude-code" : "/settings/general";
  return (
    <>
      <BaseMenuHeader className="truncate"><span data-testid="user-menu-header">{displayName}</span></BaseMenuHeader>
      <BaseMenuItem icon="Settings" trailing={<FooterShortcut keys={["⌘", ","]} />} onClick={() => onNavigate(settingsTarget)}>{text.settings}</BaseMenuItem>
      <BaseMenuItem icon="Wrench" onClick={() => onNavigate("/admin-settings/organization")}>{text.organizationSettings}</BaseMenuItem>
      <BaseMenuItem icon="Chart" onClick={() => onNavigate("/analytics")}>{text.analytics}</BaseMenuItem>
      <BaseSubmenu icon="Globe" label={text.language}>
        {FOOTER_LANGUAGE_OPTIONS.map(language => <BaseMenuItem key={language.locale} checked={language.locale === locale} checkedRole="radio" lang={language.locale} onClick={() => onLocaleChange(language.locale)}><span className="capitalize">{language.localName}</span></BaseMenuItem>)}
      </BaseSubmenu>
      <BaseMenuSeparator />
      <BaseSubmenu icon="Info" label={text.learnMore} popupClassName="min-w-[208px]">
        <BaseMenuItem trailing={<Icon name="ArrowOutSquare" size="sm" />} onClick={() => onNavigate("/")}>{text.about}</BaseMenuItem>
        <BaseMenuItem trailing={<Icon name="ArrowOutSquare" size="sm" />} onClick={() => openExternal("https://claude.com/resources/tutorials?open_in_browser=1")}>{text.tutorials}</BaseMenuItem>
        <BaseMenuItem trailing={<Icon name="ArrowOutSquare" size="sm" />} onClick={() => openExternal("https://claude.com/resources/courses?open_in_browser=1")}>{text.courses}</BaseMenuItem>
        <BaseMenuSeparator />
        <BaseMenuItem trailing={<Icon name="ArrowOutSquare" size="sm" />} onClick={() => onNavigate("/legal/aup")}>{text.usagePolicy}</BaseMenuItem>
        <BaseMenuItem trailing={<Icon name="ArrowOutSquare" size="sm" />} onClick={() => onNavigate("/legal/privacy")}>{text.privacyPolicy}</BaseMenuItem>
        <BaseMenuItem onClick={() => openExternal("https://privacy.anthropic.com/policies")}>{text.privacyChoices}</BaseMenuItem>
        <BaseMenuSeparator />
        <BaseMenuItem onClick={onOpenShortcuts}>{text.keyboardShortcuts}</BaseMenuItem>
      </BaseSubmenu>
    </>
  );
}

function FooterShortcut({ keys }: { keys: string[] }) {
  return <span className="flex shrink-0 items-center gap-px text-footnote text-muted" aria-hidden="true">{keys.map(key => <kbd className="flex h-icon items-center justify-center [font-family:inherit]" key={key}>{key}</kbd>)}</span>;
}
