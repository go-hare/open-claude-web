/**
 * Official SettingsModal k (cc011544b-CliL4MDd.js).
 * Desktop overlay Dialog on the current frame; hash `#settings/{section}` (not a /settings dframe).
 */
import { Dialog } from "@base-ui-components/react/dialog";
import { Tabs } from "@base-ui-components/react/tabs";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "../../shell/icons";
import { readResolvedColorMode, THEME_MODE_CHANGE_EVENT } from "./appearanceSettings";
import { CdsDialogBackdrop, CdsDialogCloseButton, CdsDialogTitle } from "./CdsDialog";
import {
  buildPersonalSettingsGroups,
  renderSettingsSection,
  shouldShowPersonalAdminLink,
} from "./PersonalSettingsContent";
import type { NavGroup, NavSection } from "./SettingsShell";
import { SettingsNavSearch } from "./SettingsNavSearch";
import { useSettingsNavText } from "./settingsMessages";
import { settingsModalStore } from "./settingsModalStore";
import {
  parseSettingsHash,
  parseSettingsPath,
  SETTINGS_HASH_PREFIX,
  settingsHashFor,
} from "./settingsPath";
import {
  useSettingsBootstrap,
  useShowPrivacyInPersonalSettings,
} from "./useSettingsBootstrap";

const PANEL_CLASS = "rounded-card bg-surface-2 shadow-panel-sm";

const popupClassName = [
  "fixed inset-0 m-auto",
  "flex h-[calc(100vh-2rem)] max-h-[45rem] w-[calc(100vw-2rem)] max-w-[960px]",
  "overflow-hidden dark:border dark:border-alpha-1",
  PANEL_CLASS,
  "cds-reset text-body text-primary outline-none",
  "transition-[opacity,transform] duration-base ease-out",
  "data-[starting-style]:opacity-0 data-[starting-style]:scale-[0.98]",
  "data-[ending-style]:opacity-0 data-[ending-style]:scale-[0.98]",
  "draggable-none z-modal",
].join(" ");

function useColorMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">(() => readResolvedColorMode());
  useEffect(() => {
    const sync = () => setMode(readResolvedColorMode());
    sync();
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    media.addEventListener("change", sync);
    window.addEventListener("storage", sync);
    window.addEventListener(THEME_MODE_CHANGE_EVENT, sync);
    return () => {
      media.removeEventListener("change", sync);
      window.removeEventListener("storage", sync);
      window.removeEventListener(THEME_MODE_CHANGE_EVENT, sync);
    };
  }, []);
  return mode;
}

function useNarrowSettings(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(max-width: 767px)").matches : false,
  );
  useEffect(() => {
    const media = window.matchMedia("(max-width: 767px)");
    const sync = () => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  return narrow;
}

function useSettingsModalGroups(): { groups: NavGroup[]; adminHref: string | null; adminTitle: string } {
  const { bootstrap } = useSettingsBootstrap();
  const showPrivacy = useShowPrivacyInPersonalSettings(bootstrap);
  const showAdminLink = shouldShowPersonalAdminLink({
    capabilities: bootstrap.org?.capabilities,
    role: bootstrap.role,
  });
  const navText = useSettingsNavText();
  return useMemo(() => {
    const groups = buildPersonalSettingsGroups({
      orgName: bootstrap.org?.name || navText.organization,
      showAdminLink: false,
      showPrivacy,
      forModal: true,
      labels: {
        general: navText.general,
        privacy: navText.privacy,
        capabilities: navText.capabilities,
        connectors: navText.connectors,
        claudeCode: navText.claudeCode,
        cowork: navText.cowork,
        desktopApp: navText.desktopApp,
        desktopGeneral: navText.desktopGeneral,
        extensions: navText.extensions,
        developer: navText.developer,
        organization: navText.organization,
        organizationSettings: navText.organizationSettings,
        usage: navText.usage,
        importExport: navText.importExport,
        thisComputer: navText.thisComputer,
        system: navText.system,
        customize: navText.customize,
        skills: navText.skills,
        plugins: navText.plugins,
        settingsGroup: navText.settingsGroup,
      },
    });
    return {
      groups,
      adminHref: showAdminLink ? "/admin-settings/organization" : null,
      adminTitle: bootstrap.org?.name || navText.organization,
    };
  }, [bootstrap.org?.name, navText, showAdminLink, showPrivacy]);
}

/** Official hash + route-leave sync from cc011544b k. */
function useSettingsModalLocationSync(section: string | null, close: () => void) {
  const subpath = settingsModalStore((s) => s.subpath);
  const openedFromRoute = settingsModalStore((s) => s.openedFromRoute);
  const originPathRef = useRef<string | null>(null);
  const pushedRef = useRef(false);
  const hashClosedRef = useRef(false);
  const routeOriginRef = useRef<string | null>(null);
  const prevSectionRef = useRef<string | null>(null);
  const pathname = window.location.pathname;

  useEffect(() => {
    if (section === null) routeOriginRef.current = null;
    else if (openedFromRoute) {
      if (pathname.startsWith("/settings")) routeOriginRef.current = null;
      else {
        routeOriginRef.current = pathname;
        settingsModalStore.setState({ openedFromRoute: false });
      }
    } else if (routeOriginRef.current === null) routeOriginRef.current = window.location.pathname;
    else if (routeOriginRef.current !== pathname) close();
  }, [section, pathname, close, openedFromRoute]);

  useEffect(() => {
    if (section === null || openedFromRoute) return;
    const { hash, pathname: path, search } = window.location;
    if (path.startsWith("/settings")) return;
    if (originPathRef.current === null) originPathRef.current = path;
    else if (originPathRef.current !== pathname) return;
    const next = settingsHashFor(section, subpath);
    if (hash !== next) {
      if (hash.startsWith(SETTINGS_HASH_PREFIX) || pushedRef.current) {
        window.history.replaceState(window.history.state, "", path + search + next);
      } else {
        window.history.pushState(window.history.state, "", path + search + next);
        pushedRef.current = true;
      }
    }
  }, [section, subpath, pathname, openedFromRoute]);

  useEffect(() => {
    const onHashChange = () => {
      if (parseSettingsHash(window.location.hash) === null && settingsModalStore.getState().section !== null) {
        hashClosedRef.current = true;
        pushedRef.current = false;
        originPathRef.current = null;
        close();
      }
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [close]);

  useEffect(() => {
    const wasOpen = prevSectionRef.current !== null;
    prevSectionRef.current = section;
    if (section !== null || !wasOpen) return;
    const pushed = pushedRef.current;
    const origin = originPathRef.current;
    pushedRef.current = false;
    originPathRef.current = null;
    if (hashClosedRef.current) {
      hashClosedRef.current = false;
      return;
    }
    if (window.location.hash.startsWith(SETTINGS_HASH_PREFIX)) {
      if (pushed && origin !== null && origin === pathname) {
        window.history.back();
      } else {
        const { pathname: path, search } = window.location;
        window.history.replaceState(window.history.state, "", path + search);
      }
    }
  }, [section, pathname]);

  useEffect(() => {
    const state = settingsModalStore.getState();
    const parsed = parseSettingsHash(window.location.hash);
    if (parsed && state.section === null) state.open(parsed.section, parsed.subpath);
  }, []);
}

function isSettingsKeydown(event: KeyboardEvent): boolean {
  // Official Gns desktop `he=jd()?"cmd+,":"shift+cmd+,"`. Palette settings is cmd+shift+,.
  if (event.key !== ",") return false;
  if (event.altKey || event.shiftKey) return false;
  return event.metaKey || event.ctrlKey;
}

export function SettingsModal() {
  const section = settingsModalStore((s) => s.section);
  const close = settingsModalStore((s) => s.close);
  const open = settingsModalStore((s) => s.open);
  const colorMode = useColorMode();
  const narrow = useNarrowSettings();
  const [lastSection, setLastSection] = useState("general");
  const [subPortalEl, setSubPortalEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    settingsModalStore.getState().setMounted(true);
    return () => {
      settingsModalStore.getState().setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (section !== null) setLastSection(section);
  }, [section]);

  useSettingsModalLocationSync(section, close);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!isSettingsKeydown(event)) return;
      event.preventDefault();
      open("general");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const onOpenChange = useCallback(
    (next: boolean) => {
      if (!next) close();
    },
    [close],
  );

  const activeSection = section ?? lastSection;
  const mode = colorMode === "dark" ? "dark" : "light";

  /**
   * Official cc011544b k: overlay DOM exists only while section is set
   * (`open:null!==n`). Base UI rc Portal keeps `[data-cds=Dialog]` mounted until
   * `getAnimations()` on the popup (includes descendants) finishes — infinite
   * spinners in settings content never resolve, so Close left dialogs:1.
   * Gate Portal on section so close unmounts immediately, matching official.
   */
  const overlayOpen = section !== null;

  return (
    <>
      <Dialog.Root open={overlayOpen} onOpenChange={onOpenChange}>
        {overlayOpen ? (
          <Dialog.Portal>
            <div className="cds-root" data-density="comfortable" data-mode={mode} data-platform="desktop">
              <CdsDialogBackdrop />
              <Dialog.Popup
                className={`${popupClassName}${narrow ? " flex-col" : ""}`}
                data-cds="Dialog"
                initialFocus={false}
              >
                {narrow ? <SettingsModalMobileNav activeSection={activeSection} /> : <SettingsModalNav activeSection={activeSection} />}
                <SettingsModalContent hideHeaderRow={narrow} section={activeSection} subPortalEl={subPortalEl} />
              </Dialog.Popup>
            </div>
          </Dialog.Portal>
        ) : null}
      </Dialog.Root>
      {overlayOpen
        ? createPortal(
            <div ref={setSubPortalEl} className="cds-root" data-density="comfortable" data-mode={mode} />,
            document.body,
          )
        : null}
    </>
  );
}

function SettingsModalNav({
  activeSection,
  onSelect,
  standalone = false,
}: {
  activeSection: string;
  onSelect?: (id: string) => void;
  standalone?: boolean;
}) {
  const navText = useSettingsNavText();
  const { groups, adminHref, adminTitle } = useSettingsModalGroups();
  const open = settingsModalStore((s) => s.open);
  const select = onSelect ?? open;
  return (
    <nav
      aria-label={navText.settings}
      className="flex w-48 shrink-0 flex-col gap-sm overflow-y-auto border-r border-alpha-2 bg-surface-1 p-md"
    >
      {standalone ? (
        <span className="sr-only">{navText.settings}</span>
      ) : (
        <CdsDialogTitle className="sr-only">{navText.settings}</CdsDialogTitle>
      )}
      <SettingsNavSearch groups={groups} onSelect={select} />
      {groups.map((group, index) => (
        <div key={group.title ?? index}>
          {group.title ? (
            <div className="px-sm pt-md text-caption font-medium text-muted">{group.title}</div>
          ) : null}
          <ul className="flex flex-col gap-px">
            {group.sections.map((item) => (
              <li data-testid={item.testId} key={item.id}>
                <SettingsNavButton
                  active={item.id === activeSection}
                  onSelect={select}
                  section={item}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
      {adminHref ? (
        <>
          <div className="px-sm pt-md text-caption font-medium text-muted">{adminTitle}</div>
          <a
            className="flex h-control !cursor-pointer items-center gap-sm rounded px-sm text-body text-primary hover:bg-fill-ghost-hover"
            href={adminHref}
            onClick={(event) => {
              event.preventDefault();
              settingsModalStore.getState().close();
              window.history.pushState({}, "", adminHref);
              window.dispatchEvent(new Event("app:navigation"));
            }}
          >
            <Icon className="shrink-0 text-secondary" name="Organization" size="md" />
            <span className="min-w-0 flex-1 truncate">{navText.organization}</span>
            <Icon className="text-muted" name="ArrowUpRight" size="md" />
          </a>
        </>
      ) : null}
    </nav>
  );
}

function SettingsNavButton({
  section,
  active,
  onSelect,
}: {
  section: NavSection;
  active: boolean;
  onSelect: (id: string) => void;
}) {
  return (
    <button
      aria-current={active ? "page" : undefined}
      className={`flex h-control w-full cursor-pointer items-center gap-sm rounded px-sm text-left text-body transition-colors ${
        active ? "bg-alpha-2 font-medium text-primary" : "text-secondary hover:bg-fill-ghost-hover hover:text-primary"
      }`}
      onClick={() => onSelect(section.id)}
      type="button"
    >
      {section.icon ? <Icon className="shrink-0 text-secondary" name={section.icon} size="md" /> : null}
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
    </button>
  );
}

function SettingsModalMobileNav({ activeSection }: { activeSection: string }) {
  const navText = useSettingsNavText();
  const { groups } = useSettingsModalGroups();
  const open = settingsModalStore((s) => s.open);
  const sections = useMemo(() => groups.flatMap((group) => group.sections), [groups]);
  return (
    <header className="flex shrink-0 flex-col gap-sm border-b border-alpha-2 bg-surface-1 px-md pt-md pb-sm">
      <div className="flex items-center justify-between gap-md">
        <CdsDialogTitle className="sr-only">{navText.settings}</CdsDialogTitle>
        <div aria-hidden="true" className="text-heading-medium text-primary">
          {navText.settings}
        </div>
        <CdsDialogCloseButton aria-label={navText.close} onClick={settingsModalStore.getState().close} />
      </div>
      <Tabs.Root onValueChange={(value) => open(String(value))} value={activeSection}>
        <Tabs.List
          aria-label={navText.settings}
          className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {sections.map((item) => (
            <Tabs.Tab data-testid={item.testId} key={item.id} value={item.id}>
              {item.label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
      </Tabs.Root>
    </header>
  );
}

function SettingsModalContent({
  section,
  hideHeaderRow = false,
}: {
  section: string;
  hideHeaderRow?: boolean;
  subPortalEl?: HTMLElement | null;
}) {
  const navText = useSettingsNavText();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    setScrolled(false);
  }, [section]);
  const subpath = settingsModalStore((s) => s.subpath);
  const fullPathname = `/settings/${section}${subpath ? `/${subpath}` : ""}`;
  /** Official overlay Ar (c5e558aae) fills the pane; vt owns header + list scroll. */
  const fillPane =
    section === "customize-skills" || section === "customize-connectors" || section === "customize-plugins";
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-surface-2">
      {hideHeaderRow ? null : (
        <div className="flex shrink-0 items-center justify-end px-md pt-md pb-sm">
          <CdsDialogCloseButton aria-label={navText.close} onClick={settingsModalStore.getState().close} />
        </div>
      )}
      <div
        className={
          fillPane
            ? "relative flex min-h-0 flex-1 flex-col overflow-hidden px-xl"
            : [
                "relative min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-xl pb-lg pt-2",
                "[&_[data-settings-section]]:gap-4 [&_[data-settings-section]]:mb-4 [&_[data-settings-section]]:pb-4",
                "[&_[data-settings-section-title]]:text-heading-medium",
                "[&_[data-settings-primary-text]]:text-body",
                "[&_[data-settings-secondary-text]]:text-footnote [&_[data-settings-secondary-text]]:text-secondary",
                "[&_[data-settings-section-subtitle]]:text-footnote [&_[data-settings-section-subtitle]]:text-secondary",
              ].join(" ")
        }
        onScroll={
          fillPane
            ? undefined
            : (event) => setScrolled(event.currentTarget.scrollTop > 0)
        }
        ref={scrollerRef}
      >
        <div
          aria-hidden="true"
          className={`pointer-events-none sticky -top-2 z-[1] -mx-xl -mt-2 -mb-4 h-6 bg-gradient-to-b from-[var(--cds-surface-2)] to-transparent transition-opacity ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        {renderSettingsSection(fullPathname, (href) => {
          const parsed = parseSettingsPath(href.split("?")[0] ?? href);
          if (parsed) {
            settingsModalStore.getState().open(parsed.section, parsed.subpath);
            return;
          }
          settingsModalStore.getState().close();
          window.history.pushState({}, "", href);
          window.dispatchEvent(new Event("app:navigation"));
        })}
      </div>
    </div>
  );
}

export { SettingsModalNav };
