import { useCallback, useEffect, useState } from "react";
import { FOOTER_LANGUAGE_OPTIONS, type FooterMenuText, useFooterMenuText, useManagedLocale } from "../i18n/footerMenuMessages";
import type { FrameStore } from "../stores/frameStore";
import { AppearanceMenu } from "./AppearanceMenu";
import { BaseMenuHeader, BaseMenuItem, BaseMenuPopup, BaseMenuSeparator, BaseSubmenu, Menu } from "./BaseMenu";
import { Icon } from "./icons";
import { KeyboardShortcutsDialog } from "./KeyboardShortcutsDialog";
import { RelaunchInterstitialOverlay } from "./RelaunchInterstitial";

type SidebarFooterProps = {
  frame: FrameStore;
  mode: FrameStore["mode"];
  onNavigate: (path: string) => void;
};

type Custom3pSetupBridge = {
  getLoginDesktop3pStatus?: () => Promise<unknown>;
  setDeploymentMode?: (mode: string) => Promise<unknown>;
  relaunchApp?: () => Promise<unknown>;
};

function custom3pSetupBridge(): Custom3pSetupBridge | undefined {
  return (window as unknown as { "claude.settings"?: { Custom3pSetup?: Custom3pSetupBridge } })[
    "claude.settings"
  ]?.Custom3pSetup;
}

/**
 * Official Gns residual: j = !!EQt() (getLoginDesktop3pStatus truthy) → show Sign out.
 * Sign out → m2t signed-out interstitial → NQt("clear") → setDeploymentMode("clear") + relaunch.
 */
function useShowDesktopSignOut(): boolean {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let cancelled = false;
    const bridge = custom3pSetupBridge();
    if (!bridge?.getLoginDesktop3pStatus) {
      setShow(false);
      return;
    }
    void bridge
      .getLoginDesktop3pStatus()
      .then((status) => {
        if (!cancelled) setShow(Boolean(status));
      })
      .catch(() => {
        if (!cancelled) setShow(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return show;
}

export function SidebarFooter({ frame, mode, onNavigate }: SidebarFooterProps) {
  const [locale, setLocale] = useManagedLocale();
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  // Official m2t/h2t pending residual — Sign out opens signed-out interstitial first.
  const [signOutPending, setSignOutPending] = useState(false);
  const displayName = "Cowork 3P";
  const organizationName = "Gateway";
  const menuText = useFooterMenuText(locale);
  const showSignOut = useShowDesktopSignOut();

  const onSignOutDone = useCallback(() => {
    // Official h2t: onDone runs NQt("clear") without dismiss first — process relaunch
    // tears down the window. Do NOT setSignOutPending(false) here or the shell flashes
    // under the overlay for one frame before clear/relaunch.
    void signOutDesktop3pAfterInterstitial();
  }, []);

  const onSignOutCancel = useCallback(() => {
    setSignOutPending(false);
  }, []);

  return (
    <div className="shrink-0 flex items-center gap-[var(--df-footer-gap)]">
      <div className="min-w-0 max-w-[75%]">
        <Menu.Root>
          <Menu.Trigger className="cds-reset flex h-6 max-w-full items-center gap-1.5 rounded-[var(--df-radius-pill)] pl-0.5 pr-1.5 outline-none transition-colors duration-fast hover:bg-[var(--df-hover)] focus-visible:shadow-focus" data-testid="user-menu-button" type="button">
            <img alt="" aria-hidden="true" className="size-4 shrink-0 object-contain" src="/assets/v1/cd02a42d9-Vq_H3mgS.svg" />
            <span className="flex min-w-0 items-baseline gap-1 text-xs"><span className="shrink-0 text-primary">{displayName}</span><span aria-hidden="true" className="text-muted">·</span><span className="min-w-0 truncate text-muted">{organizationName}</span></span>
            <Icon name="CaretDown" size="xs" className="shrink-0 text-muted" />
          </Menu.Trigger>
          <BaseMenuPopup align="start" className="w-[17rem]" side="top" sideOffset={6}>
            <UserMenu
              displayName={displayName}
              locale={locale}
              mode={mode}
              onLocaleChange={setLocale}
              onOpenShortcuts={() => setShortcutsOpen(true)}
              onNavigate={onNavigate}
              showSignOut={showSignOut}
              text={menuText}
              onRequestSignOut={() => setSignOutPending(true)}
            />
          </BaseMenuPopup>
        </Menu.Root>
      </div>
      <KeyboardShortcutsDialog isOpen={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      {/* Official h2t: signed-out d2t overlay before NQt("clear") */}
      <RelaunchInterstitialOverlay
        open={signOutPending}
        variant="signed-out"
        onDone={onSignOutDone}
        onCancel={onSignOutCancel}
      />
      <div className="ml-auto flex items-center">
        {mode === "code" ? <AppearanceMenu frame={frame} /> : null}
      </div>
    </div>
  );
}

const openExternal = (href: string) => {
  window.open(href, "_blank", "noopener,noreferrer");
};

/**
 * Official NQt("clear") residual after m2t signed-out countdown onDone.
 * pot/got: jsA(void) + process relaunch. Product soft SPA host: write clear then
 * leave to /login immediately — do NOT wait multi-seconds and do NOT also call
 * relaunchApp (IPC never resolves; double-exit flash). Keep signed-out overlay
 * mounted until route is /login (onSignOutDone does not clear pending first).
 * LoginDesktop jn resize(600,{center}) on mount; no pre-resize during overlay.
 */
async function signOutDesktop3pAfterInterstitial(): Promise<void> {
  const bridge = custom3pSetupBridge();
  try {
    await Promise.resolve(bridge?.setDeploymentMode?.("clear"));
  } catch {
    /* fall through — bag may already be void; still force chooser */
  }
  // Soft SPA host: clear is write-only (no process kill). Force login immediately
  // after countdown — official relaunch lands on chooser; we soft-nav /login.
  // Optimistic logged_out so DesktopFrame cannot stick with account null on /task/new.
  window.dispatchEvent(new Event("app:auth-logged-out"));
  window.dispatchEvent(new Event("app:deployment-mode-changed"));
  if (window.location.pathname === "/login" || window.location.pathname.startsWith("/login/")) {
    return;
  }
  window.history.replaceState({}, "", "/login");
  window.dispatchEvent(new Event("app:navigation"));
}

function UserMenu({
  displayName,
  locale,
  mode,
  onLocaleChange,
  onOpenShortcuts,
  onNavigate,
  showSignOut,
  text,
  onRequestSignOut,
}: {
  displayName: string;
  locale: string;
  mode: FrameStore["mode"];
  onLocaleChange: (locale: string) => void;
  onOpenShortcuts: () => void;
  onNavigate: (path: string) => void;
  showSignOut: boolean;
  text: FooterMenuText;
  onRequestSignOut: () => void;
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
      {showSignOut ? (
        <>
          <BaseMenuSeparator />
          {/* Official Gns: m2t({variant:"signed-out", onDone:()=>NQt("clear")}) — not immediate clear */}
          <BaseMenuItem icon="Logout" onClick={onRequestSignOut}>{text.signOut}</BaseMenuItem>
        </>
      ) : null}
    </>
  );
}

function FooterShortcut({ keys }: { keys: string[] }) {
  return <span className="flex shrink-0 items-center gap-px text-footnote text-muted" aria-hidden="true">{keys.map(key => <kbd className="flex h-icon items-center justify-center [font-family:inherit]" key={key}>{key}</kbd>)}</span>;
}
