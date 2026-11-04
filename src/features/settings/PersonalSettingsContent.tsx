import { useMemo } from "react";
import type { RouteViewProps } from "../../app/routes";
import { PersonalSettingsLayout, type NavGroup } from "./SettingsShell";
import { BrowserExtensionSettings } from "./sections/BrowserExtensionSettings";
import { CapabilitiesSettings } from "./sections/CapabilitiesSettings";
import { ClaudeCodeSettings } from "./sections/ClaudeCodeSettings";
import { ConnectorsSettings } from "./sections/ConnectorsSettings";
import { CoworkSettings } from "./sections/CoworkSettings";
import { DesktopDeveloper } from "./sections/DesktopDeveloperSettings";
import { DesktopSettings } from "./sections/DesktopSettings";
import {
  ExtensionDetail,
  ExtensionNotFound,
  ExtensionsAdvanced,
  ExtensionsDirectory,
  ExtensionsOverview,
} from "./sections/ExtensionsSettings";
import { GeneralSettings } from "./sections/GeneralSettings";
import { ImportExportSettings } from "./sections/ImportExportSettings";
import { PrivacySettings } from "./sections/PrivacySettings";
import { UsageSettings } from "./sections/UsageSettings";
import { ConnectorsRoute } from "../customize/connectors/ConnectorsRoute";
import { PluginsOverlayRoute } from "../customize/plugins/PluginsOverlayRoute";
import { officialDirectoryStore } from "../customize/directory/officialDirectoryStore";
import { SkillsRoute } from "../customize/skills/SkillsRoute";
import { useSettingsNavText } from "./settingsMessages";
import {
  useSettingsBootstrap,
  useShowPrivacyInPersonalSettings,
} from "./useSettingsBootstrap";

/**
 * Official Zn nav (cf4f70727-a7CVSvFQ.js settingsComponentsByPath):
 * primary: general, data-privacy-controls?, members?, billing?, usage?, sys-prompt?,
 * capabilities, cardinal?, connectors?, claude-code?, cowork?, browser-extension?;
 * Desktop app group (when desktop): desktop, desktop/extensions, desktop/developer;
 * adminLink: only when nL() (Ys) — title = org.name | "Organization", label = "Organization settings".
 *
 * Official residual (index nL / jw as Ys):
 *   nL = Yc() && (tL() || (admin_settings_toronto_v2 && some granted))
 *   tL = Yc() && (OrganizationManage || library manage arm)
 * Without inventing GrowthBook toronto_v2=true or OrganizationManage from absence,
 * adminLink stays off unless bootstrap exposes a real manage capability.
 * "Gateway" is often just org.name used as the adminLink group title — not a separate nav item.
 *
 * Gates we can honor from custom3p bootstrap without inventing GrowthBook:
 * - Privacy: dn = !isRaven (wk("raven"))
 * - Desktop app group: always on desktop product (Da)
 * - Code / Cowork / Connectors / Capabilities: always for this desktop 3P shell
 * - browser-extension / members / billing / usage / sys-prompt / cardinal: need
 *   GrowthBook + plan arms — omitted until arms exist (do not hardcode fake rows).
 *
 * Labels come from official /i18n catalogs via useSettingsNavText (not hardcoded ZH/EN).
 */
export function buildPersonalSettingsGroups(options: {
  orgName?: string | null;
  showAdminLink?: boolean;
  showPrivacy: boolean;
  labels: {
    general: string;
    privacy: string;
    capabilities: string;
    connectors: string;
    claudeCode: string;
    cowork: string;
    desktopApp: string;
    desktopGeneral: string;
    extensions: string;
    developer: string;
    organization: string;
    organizationSettings: string;
    usage?: string;
    importExport?: string;
    thisComputer?: string;
    system?: string;
    customize?: string;
    skills?: string;
    plugins?: string;
    settingsGroup?: string;
  };
  /**
   * Official ZC `forModal` (shared-19): Settings / This computer / Customize.
   * Full-page Zn keeps Desktop app + Capabilities/Connectors in primary.
   */
  forModal?: boolean;
}): NavGroup[] {
  const { labels } = options;
  const forModal = options.forModal === true;
  const primary = [
    { id: "general", href: "/settings/general", label: labels.general, icon: "Settings", testId: "general-settings" },
    ...(options.showPrivacy
      ? [{
          id: "data-privacy-controls",
          href: "/settings/data-privacy-controls",
          label: labels.privacy,
          icon: "LockShield",
          testId: "data-privacy-controls",
        }]
      : []),
    ...(forModal
      ? []
      : [{ id: "capabilities", href: "/settings/capabilities", label: labels.capabilities, icon: "Tool" }]),
    ...(forModal
      ? [{ id: "usage", href: "/settings/usage", label: labels.usage ?? "Usage", icon: "Chart", testId: "usage-settings" }]
      : []),
    ...(forModal
      ? []
      : [{ id: "connectors", href: "/settings/connectors", label: labels.connectors, icon: "Connectors" }]),
    { id: "claude-code", href: "/settings/claude-code", label: labels.claudeCode, icon: "Code", testId: "claude-code-settings" },
    { id: "cowork", href: "/settings/cowork", label: labels.cowork, icon: "Tasks" },
    ...(forModal
      ? [{
          id: "import",
          href: "/settings/import",
          label: labels.importExport ?? "Import & export",
          icon: "Download",
          testId: "settings-nav-import",
        }]
      : []),
  ];

  const groups: NavGroup[] = [
    { title: forModal ? labels.settingsGroup : undefined, sections: primary },
    {
      title: forModal ? (labels.thisComputer ?? labels.desktopApp) : labels.desktopApp,
      sections: [
        {
          id: "desktop",
          href: "/settings/desktop",
          label: forModal ? (labels.system ?? labels.desktopGeneral) : labels.desktopGeneral,
          icon: "Computer",
          exactMatch: true,
          testId: "settings-nav-system",
        },
        ...(forModal
          ? []
          : [{ id: "desktop/extensions", href: "/settings/desktop/extensions", label: labels.extensions, icon: "Plugin" }]),
        { id: "desktop/developer", href: "/settings/desktop/developer", label: labels.developer, icon: "Wrench" },
      ],
    },
  ];

  if (forModal) {
    groups.push({
      title: labels.customize,
      sections: [
        { id: "customize-skills", href: "/settings/customize-skills", label: labels.skills ?? "Skills", icon: "File", testId: "customize-skills-settings" },
        { id: "customize-connectors", href: "/settings/customize-connectors", label: labels.connectors, icon: "Connectors", testId: "customize-connectors-settings" },
        { id: "customize-plugins", href: "/settings/customize-plugins", label: labels.plugins ?? "Plugins", icon: "Plugin", testId: "customize-plugins-settings" },
      ],
    });
  }

  // Official adminLink:y?{...}:null — omit entire group when gate is false.
  if (options.showAdminLink) {
    groups.push({
      title: options.orgName || labels.organization,
      sections: [
        {
          id: "admin-organization",
          href: "/admin-settings/organization",
          label: labels.organizationSettings,
        },
      ],
    });
  }

  return groups;
}

/**
 * Official nL residual approximation from bootstrap only.
 * Do not invent GrowthBook admin_settings_toronto_v2 or OrganizationManage=true.
 * Show only when membership role is admin-class AND org capabilities include a manage arm
 * (or explicit organization manage capability string when present).
 */
export function shouldShowPersonalAdminLink(options: {
  capabilities?: string[] | null;
  role?: string | null;
}): boolean {
  const role = (options.role || "").toLowerCase();
  const caps = options.capabilities ?? [];
  const adminRole =
    role === "admin" || role === "owner" || role === "primary_owner";
  if (!adminRole) return false;

  // Official JA = Dd(Pd.OrganizationManage). Without Pd enum wiring, accept known manage-ish caps.
  const hasOrgManage = caps.some((cap) => {
    const lower = cap.toLowerCase();
    return (
      lower === "organization_manage"
      || lower === "permission_organization_manage"
      || lower.includes("organization_manage")
      || lower === "admin"
    );
  });
  return hasOrgManage;
}

/** Static export for tests / fallback when bootstrap not ready (matches prior fixed nav). */
export const PERSONAL_SETTINGS_GROUPS: NavGroup[] = buildPersonalSettingsGroups({
  orgName: "Organization",
  showAdminLink: false,
  showPrivacy: true,
  labels: {
    general: "General",
    privacy: "Privacy",
    capabilities: "Capabilities",
    connectors: "Connectors",
    claudeCode: "Claude Code",
    cowork: "Cowork",
    desktopApp: "Desktop app",
    desktopGeneral: "General",
    extensions: "Extensions",
    developer: "Developer",
    organization: "Organization",
    organizationSettings: "Organization settings",
  },
});

export function PersonalSettingsPage({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  const { bootstrap } = useSettingsBootstrap();
  const showPrivacy = useShowPrivacyInPersonalSettings(bootstrap);
  const showAdminLink = shouldShowPersonalAdminLink({
    capabilities: bootstrap.org?.capabilities,
    role: bootstrap.role,
  });
  const navText = useSettingsNavText();
  const groups = useMemo(
    () =>
      buildPersonalSettingsGroups({
        orgName: bootstrap.org?.name || navText.organization,
        showAdminLink,
        showPrivacy,
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
        },
      }),
    [bootstrap.org?.name, navText, showAdminLink, showPrivacy],
  );

  return (
    <PersonalSettingsLayout groups={groups} onNavigate={onNavigate} pathname={pathname}>
      {renderSettingsSection(pathname, onNavigate)}
    </PersonalSettingsLayout>
  );
}

/** Official S[t] section map used by SettingsModalContent P. */
export function renderSettingsSection(pathname: string, onNavigate: RouteViewProps["onNavigate"]) {
  if (pathname === "/settings" || pathname === "/settings/general") return <GeneralSettings />;
  // Official route is /settings/data-privacy-controls (Zn id); accept legacy /settings/privacy alias.
  if (pathname === "/settings/data-privacy-controls" || pathname === "/settings/privacy") {
    return <PrivacySettings />;
  }
  if (pathname === "/settings/capabilities") return <CapabilitiesSettings onNavigate={onNavigate} />;
  if (pathname === "/settings/connectors") return <ConnectorsSettings onNavigate={onNavigate} />;
  if (pathname === "/settings/claude-code") return <ClaudeCodeSettings />;
  if (pathname === "/settings/cowork") return <CoworkSettings />;
  if (pathname === "/settings/browser-extension") return <BrowserExtensionSettings />;
  if (pathname === "/settings/desktop") return <DesktopSettings />;
  if (pathname === "/settings/desktop/extensions") return <ExtensionsOverview onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/advanced") return <ExtensionsAdvanced onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/manage-directory") return <ExtensionsDirectory onNavigate={onNavigate} />;
  if (pathname.startsWith("/settings/desktop/extensions/")) {
    const extensionId = decodeURIComponent(
      pathname.slice("/settings/desktop/extensions/".length).split("/")[0] ?? "",
    );
    if (!extensionId || extensionId === "advanced" || extensionId === "manage-directory") {
      return <ExtensionNotFound onNavigate={onNavigate} />;
    }
    return <ExtensionDetail extensionId={extensionId} onNavigate={onNavigate} />;
  }
  if (pathname === "/settings/desktop/developer") return <DesktopDeveloper />;
  if (pathname === "/settings/usage") return <UsageSettings />;
  if (pathname === "/settings/import") return <ImportExportSettings />;
  if (pathname === "/settings/customize-skills") {
    return (
      <SkillsRoute
        layout="overlay"
        onBrowseSkills={() => officialDirectoryStore.getState().open("plugins", { pluginSeed: {} })}
        onCreateWithClaude={() => {
          onNavigate(
            "/task/new?q=" +
              encodeURIComponent(
                "Let's create a skill together using your skill-creator skill. First ask me what the skill should do.",
              ),
          );
        }}
        onTryInCowork={(skillName) => {
          onNavigate("/task/new?q=" + encodeURIComponent(`/${skillName}`));
        }}
      />
    );
  }
  if (pathname === "/settings/customize-connectors") return <ConnectorsRoute layout="overlay" />;
  if (pathname === "/settings/customize-plugins") {
    return (
      <PluginsOverlayRoute
        onCreateWithClaude={() => {
          onNavigate("/task/new?q=" + encodeURIComponent("Help me create a new Cowork plugin"));
        }}
        onNavigate={onNavigate}
      />
    );
  }
  return <p>Not Found</p>;
}
