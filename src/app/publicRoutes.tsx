import type { AppRoute } from "./routes";
import {
  ClaudeCodeInstallPage,
  ClaudeCodeOnboardNotFoundPage,
  DesktopTutorialPage,
  NoOrganizationPage,
  OAuthDevicePage,
  RedirectPage,
  ReportedPage,
  ServiceStatusPage,
  UnauthorizedPage,
} from "../features/public/AccessPages";
import { DirectoryPage } from "../features/public/DirectoryPage";
import { ChromeInstalledPage, ChromePage, DownloadPage } from "../features/public/MarketingPages";
import { PageNotFound } from "../features/shared/PageNotFound";
import { BlankProjectPage } from "../features/workspace/WorkspacePages";

const startsWithPath = (pathname: string, prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

export const publicRoutes: AppRoute[] = [
  { id: "task-new", path: "/task/new", title: "New chat", navKey: "new-session", kind: "epitaxy", sourceChunk: "index-BELzQL5P.js Nds redirect target", Component: BlankProjectPage },
  { id: "ask-your-org", path: "/ask-your-org", title: "Ask your org", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "ce28369f9-C9QQvDN-.js:2962-3034", Component: RedirectPage, match: (pathname) => startsWithPath(pathname, "/ask-your-org") },
  { id: "security-root", path: "/security", title: "Security", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js Nls + live redirect", Component: RedirectPage },
  { id: "crawl-root", path: "/crawl", title: "Crawl", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js Els + live redirect", Component: RedirectPage },
  { id: "oauth-code-success", path: "/oauth/code/success", title: "Sign in complete", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js:1030 + live redirect", Component: RedirectPage },
  { id: "claude-code-desktop", path: "/claude-code-desktop", title: "Claude Code Desktop", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js:Mds/Sds + live redirect", Component: RedirectPage, match: (pathname) => startsWithPath(pathname, "/claude-code-desktop") },
  { id: "org-discovery", path: "/org-discovery", title: "No organization", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js OrgDiscoveryRoute + live redirect", Component: RedirectPage },
  { id: "no-organization", path: "/no-organization", title: "No organization", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js:344702-344725", Component: NoOrganizationPage },
  { id: "downloads", path: "/downloads", title: "Page not found", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "Jis DownloadsRoute + live PageNotFound", Component: PageNotFound },
  { id: "download", path: "/download", title: "Download Claude", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "cc20c35ef-B3ddEnqR.js DownloadRoute", Component: DownloadPage },
  { id: "desktop-tutorial", path: "/desktop/tutorial", title: "Quick Entry", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js:275203-275333", Component: DesktopTutorialPage },
  { id: "chrome-installed", path: "/chrome/installed", title: "Claude in Chrome", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "cc20c35ef-B3ddEnqR.js ChromeInstalledRoute", Component: ChromeInstalledPage },
  { id: "chrome", path: "/chrome", title: "Claude in Chrome", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "cc20c35ef-B3ddEnqR.js ChromeRoute", Component: ChromePage },
  { id: "claude-code-install-redirect", path: "/claude-code-install", title: "Claude Code install", navKey: "code", kind: "settings", frame: "standalone", sourceChunk: "cc20c35ef-B3ddEnqR.js ClaudeCodeInstallRedirectRoute", Component: RedirectPage },
  { id: "claude-code-install", path: "/claude-code/install", title: "Claude Code install", navKey: "code", kind: "settings", frame: "standalone", sourceChunk: "ce985dfcc-DXgu_A6d.js function M", Component: ClaudeCodeInstallPage },
  { id: "claude-code-onboard", path: "/claude-code/onboard/:shortCode", title: "Link not found", navKey: "code", kind: "settings", frame: "standalone", sourceChunk: "cc20c35ef-B3ddEnqR.js:Ys", Component: ClaudeCodeOnboardNotFoundPage, match: (pathname) => pathname.startsWith("/claude-code/onboard/") },
  { id: "directory", path: "/directory", title: "Directory", navKey: "new-session", kind: "epitaxy", sourceChunk: "index-BELzQL5P.js:320120 + 344821-344866", Component: DirectoryPage, match: (pathname) => startsWithPath(pathname, "/directory") },
  { id: "restricted-submit", path: "/restricted/submit", title: "Claude will return soon", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js:2200-2247", Component: ServiceStatusPage },
  { id: "restricted", path: "/restricted", title: "Claude will return soon", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "index-BELzQL5P.js:2200-2231", Component: ServiceStatusPage },
  { id: "maintenance", path: "/maintenance", title: "Claude will return soon", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js:3822", Component: ServiceStatusPage },
  { id: "unauthorized", path: "/unauthorized", title: "Unauthorized", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js:3830-3831", Component: UnauthorizedPage },
  { id: "reported", path: "/reported", title: "Thanks for your report", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js:3825", Component: ReportedPage },
  { id: "oauth-device", path: "/oauth/device", title: "Confirm sign-in", navKey: "new-session", kind: "settings", frame: "standalone", sourceChunk: "c632c9594-Bv5AdbQY.js:922-951", Component: OAuthDevicePage },
];
