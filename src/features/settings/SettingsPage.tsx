import { useEffect } from "react";
import type { RouteViewProps } from "../../app/routes";
import { PageNotFound } from "../shared/PageNotFound";
import { AdminSettingsPage } from "./AdminSettingsPage";
import { PersonalSettingsPage } from "./PersonalSettingsContent";

export function SettingsPage({ onNavigate }: RouteViewProps) {
  const pathname = window.location.pathname;
  useEffect(() => {
    if (pathname === "/settings") onNavigate("/settings/general");
    if (pathname === "/admin-settings/billing" || pathname === "/admin-settings/usage") onNavigate("/settings/general");
  }, [onNavigate, pathname]);

  if (pathname === "/settings" || pathname === "/admin-settings/billing" || pathname === "/admin-settings/usage") return null;
  if (pathname.startsWith("/settings/connectors/")) return <PageNotFound />;
  if (pathname.startsWith("/admin-settings")) return <AdminSettingsPage onNavigate={onNavigate} pathname={pathname} />;

  return <PersonalSettingsPage onNavigate={onNavigate} pathname={pathname} />;
}
