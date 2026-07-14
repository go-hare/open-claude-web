import type { RouteViewProps } from "../../app/routes";
import { PersonalSettingsLayout, type NavGroup } from "./SettingsShell";
import { CapabilitiesSettings } from "./sections/CapabilitiesSettings";
import { ClaudeCodeSettings } from "./sections/ClaudeCodeSettings";
import { ConnectorsSettings } from "./sections/ConnectorsSettings";
import { CoworkSettings } from "./sections/CoworkSettings";
import { DesktopDeveloper } from "./sections/DesktopDeveloperSettings";
import { DesktopSettings } from "./sections/DesktopSettings";
import {
  ExtensionNotFound,
  ExtensionsAdvanced,
  ExtensionsDirectory,
  ExtensionsOverview,
} from "./sections/ExtensionsSettings";
import { GeneralSettings } from "./sections/GeneralSettings";
import { PrivacySettings } from "./sections/PrivacySettings";

/**
 * Official Zn nav (cc989143e ~3103 / settingsComponentsByPath):
 * primary: general, data-privacy-controls?, members?, billing?, usage?, sys-prompt?,
 * capabilities, cardinal?, connectors?, claude-code?, cowork?, browser-extension?;
 * Desktop app group (when desktop): desktop, desktop/extensions, desktop/developer;
 * adminLink: title = org.name | "Organization", label = "Organization settings".
 */
export const PERSONAL_SETTINGS_GROUPS: NavGroup[] = [
  { sections: [
    { id: "general", href: "/settings/general", label: "通用" },
    { id: "data-privacy-controls", href: "/settings/data-privacy-controls", label: "隐私" },
    { id: "capabilities", href: "/settings/capabilities", label: "功能" },
    { id: "connectors", href: "/settings/connectors", label: "连接器" },
    { id: "claude-code", href: "/settings/claude-code", label: "Claude Code" },
    { id: "cowork", href: "/settings/cowork", label: "Cowork" },
  ] },
  { title: "桌面应用", sections: [
    { id: "desktop", href: "/settings/desktop", label: "通用", exactMatch: true },
    { id: "desktop/extensions", href: "/settings/desktop/extensions", label: "扩展" },
    { id: "desktop/developer", href: "/settings/desktop/developer", label: "开发者" },
  ] },
  // Official adminLink title is org name / "Organization"; link text is always "Organization settings".
  { title: "Organization", sections: [{ id: "admin-organization", href: "/admin-settings/organization", label: "Organization settings" }] },
];

export function PersonalSettingsPage({ onNavigate, pathname }: Pick<RouteViewProps, "onNavigate"> & { pathname: string }) {
  return (
    <PersonalSettingsLayout groups={PERSONAL_SETTINGS_GROUPS} onNavigate={onNavigate} pathname={pathname}>
      {renderPersonalContent(pathname, onNavigate)}
    </PersonalSettingsLayout>
  );
}

function renderPersonalContent(pathname: string, onNavigate: RouteViewProps["onNavigate"]) {
  if (pathname === "/settings" || pathname === "/settings/general") return <GeneralSettings />;
  if (pathname === "/settings/data-privacy-controls") return <PrivacySettings />;
  if (pathname === "/settings/capabilities") return <CapabilitiesSettings />;
  if (pathname === "/settings/connectors") return <ConnectorsSettings />;
  if (pathname === "/settings/claude-code") return <ClaudeCodeSettings />;
  if (pathname === "/settings/cowork") return <CoworkSettings />;
  if (pathname === "/settings/desktop") return <DesktopSettings />;
  if (pathname === "/settings/desktop/extensions") return <ExtensionsOverview onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/advanced") return <ExtensionsAdvanced onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/extensions/manage-directory") return <ExtensionsDirectory onNavigate={onNavigate} />;
  if (pathname.startsWith("/settings/desktop/extensions/")) return <ExtensionNotFound onNavigate={onNavigate} />;
  if (pathname === "/settings/desktop/developer") return <DesktopDeveloper />;
  return <p>Not Found</p>;
}
