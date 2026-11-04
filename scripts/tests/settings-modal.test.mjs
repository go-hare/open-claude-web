import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("settingsPath implements official F5 / hash M", () => {
  const src = read("src/features/settings/settingsPath.ts");
  assert.match(src, /SETTINGS_HASH_PREFIX = "#settings"/);
  assert.match(src, /"desktop\/extensions"/);
  assert.match(src, /"claude-code"/);
  assert.match(src, /function parseSettingsPath/);
  assert.match(src, /function parseSettingsHash/);
  assert.match(src, /#settings/);
});

test("SettingsModal is overlay Dialog from cc011544b, not SettingsDFrame", () => {
  const modal = read("src/features/settings/SettingsModal.tsx");
  const app = read("src/app/App.tsx");
  const footer = read("src/shell/SidebarFooter.tsx");
  assert.match(modal, /cc011544b-CliL4MDd\.js/);
  assert.match(modal, /data-cds="Dialog"/);
  assert.match(modal, /max-w-\[960px\]/);
  assert.match(modal, /max-h-\[45rem\]/);
  assert.match(modal, /SETTINGS_HASH_PREFIX/);
  assert.doesNotMatch(modal, /SettingsDFrame/);
  assert.match(app, /<SettingsModal \/>/);
  assert.match(app, /tryOpenSettingsModalFromPath/);
  assert.match(footer, /openSettingsModal\(settingsSection\)/);
  assert.match(footer, /data-testid="user-menu-settings"/);
  assert.doesNotMatch(footer, /onNavigate\(settingsTarget\)/);
});

test("O5 store has official open/openFromRoute/close/mounted", () => {
  const store = read("src/features/settings/settingsModalStore.ts");
  assert.match(store, /openedFromRoute/);
  assert.match(store, /openFromRoute/);
  assert.match(store, /setMounted/);
});

test("Claude Code appearance is official Hr/Xn", () => {
  const appearance = read("src/features/settings/sections/ClaudeCodeAppearance.tsx");
  const page = read("src/features/settings/sections/ClaudeCodeSettings.tsx");
  assert.match(appearance, /hIk1k4YxSV/);
  assert.match(appearance, /claude-light/);
  assert.match(appearance, /GreetDiffPreview/);
  assert.match(appearance, /Hello, \$\{name\}/);
  assert.match(appearance, /ZHco1GSUHH/);
  assert.match(appearance, /dmrRy2Xkmo/);
  assert.match(appearance, /officialEpitaxyEditorPrefsStore/);
  assert.match(appearance, /fontMono/);
  assert.match(page, /ClaudeCodeAppearance/);
});

test("Claude Code page is official aa: Appearance before Sessions, Browser not Preview, Branch in PRs", () => {
  const page = read("src/features/settings/sections/ClaudeCodeSettings.tsx");
  const messages = read("src/features/settings/settingsMessages.ts");
  const appearanceIndex = page.indexOf("<ClaudeCodeAppearance");
  const sessionsIndex = page.indexOf("text.localSessions");
  const browserIndex = page.indexOf("text.browser");
  const prIndex = page.indexOf("text.pullRequests");
  const branchIndex = page.indexOf("text.branchPrefix");
  assert.ok(appearanceIndex > 0 && appearanceIndex < sessionsIndex);
  assert.ok(sessionsIndex > 0 && sessionsIndex < browserIndex);
  assert.ok(browserIndex > 0 && browserIndex < prIndex);
  assert.ok(branchIndex > prIndex);
  assert.match(page, /E3oB\+tM0Ou|text\.browser/);
  assert.match(page, /text\.keepCookies/);
  assert.doesNotMatch(page, /text\.preview\b/);
  assert.doesNotMatch(page, /persistPreviewSessions/);
  assert.match(messages, /E3oB\+tM0Ou/);
  assert.match(messages, /e6Cv5Y4QTL/);
  assert.match(messages, /wUV2EbNd4F/);
  assert.match(messages, /yVPKfWxps3/);
});

test("Usage settings is official W page not CodeStatsCard", () => {
  const usage = read("src/features/settings/sections/UsageSettings.tsx");
  assert.match(usage, /c71860c77-29nOu6oI/);
  assert.match(usage, /custom3p-usage-summary/);
  assert.match(usage, /Custom3pUsage/);
  assert.match(usage, /sm:grid-cols-3/);
  assert.match(usage, /h-\[240px\]/);
  assert.doesNotMatch(usage, /CodeStatsCard/);
});

test("Import settings consumes HistoryImport capabilities, hides Export when sessionExport false", () => {
  const page = read("src/features/settings/sections/ImportExportSettings.tsx");
  const bridge = read("src/features/settings/settingsDesktopBridge.ts");
  assert.match(page, /c432d56b4/);
  assert.match(page, /getImportCapabilities/);
  assert.match(page, /r3JVDltSqg/);
  assert.match(page, /sessionExport/);
  assert.match(page, /id: "9XUYQtJvwF"/);
  assert.match(bridge, /HistoryImport/);
  assert.match(bridge, /historyImportBridge/);
  assert.doesNotMatch(page, /3LTMwU3z0y/);
});

test("section pages follow live Claude.app chunk titles", () => {
  const general = read("src/features/settings/sections/GeneralSettings.tsx");
  const messages = read("src/features/settings/settingsMessages.ts");
  const privacy = read("src/features/settings/sections/PrivacySettings.tsx");
  const cowork = read("src/features/settings/sections/CoworkSettings.tsx");
  const code = read("src/features/settings/sections/ClaudeCodeSettings.tsx");
  assert.match(messages, /nwKczbeayM/);
  assert.match(messages, /Pe0ogRZhIF/);
  assert.match(messages, /sy7vzf\+1SO/);
  assert.match(messages, /I2acb3TGcT/);
  assert.match(messages, /HG5KdMNuqG/);
  assert.match(messages, /JxlSRWr2J\//);
  assert.match(general, /text\.scheduledTasks/);
  assert.match(general, /text\.theme/);
  assert.match(general, /ChatFontSelect/);
  assert.match(general, /text\.motion/);
  assert.match(general, /conversation_preferences/);
  assert.doesNotMatch(general, /text\.fullName/);
  const css = read("public/assets/v1/c6a992d55-CgNGFRYw.css");
  assert.match(css, /\[data-reduce-motion=true\] \*/);
  const appSrc = read("src/app/App.tsx");
  assert.match(appSrc, /MotionConfig/);
  assert.doesNotMatch(general, /text\.whatShouldClaudeCallYou/);
  assert.match(privacy, /text-secondary/);
  assert.doesNotMatch(cowork, /globalInstructions/);
  assert.match(code, /showAutoCreatePrRow = false/);
});

test("System page is official Qn: version then startup, Storage after keep-awake", () => {
  const page = read("src/features/settings/sections/DesktopSettings.tsx");
  const messages = read("src/features/settings/settingsMessages.ts");
  assert.match(page, /DesktopAppVersionRow/);
  const versionIndex = page.indexOf("<DesktopAppVersionRow");
  const startupIndex = page.indexOf("text.runOnStartup");
  const keepIndex = page.indexOf("keepComputerAwake");
  assert.ok(versionIndex > 0 && versionIndex < startupIndex);
  assert.ok(startupIndex > 0 && startupIndex < keepIndex);
  assert.match(messages, /fzDl58Rwrd/);
  assert.match(page, /variant="outline"/);
  assert.match(page, /text\.noShortcut/);
  assert.doesNotMatch(page, /InChatDictationShortcutRow/);
  assert.doesNotMatch(page, /voiceShortcut/);
  assert.doesNotMatch(page, /<StorageRow/);
  assert.doesNotMatch(page, /<ComputerUseSettingsSection/);
  assert.doesNotMatch(page, /text\.browserUse/);
});

test("Claude Code Sessions/Browser extra rows follow official hr/Kr", () => {
  const page = read("src/features/settings/sections/ClaudeCodeSettings.tsx");
  const messages = read("src/features/settings/settingsMessages.ts");
  const appearance = read("src/features/settings/sections/ClaudeCodeAppearance.tsx");
  assert.match(page, /text\.permissionRequests/);
  assert.match(page, /text\.notificationSound/);
  assert.match(page, /text\.keepAwakeWhileWorking/);
  assert.match(page, /text\.promptSuggestions/);
  assert.match(page, /text\.archiveInactiveSessions/);
  assert.match(page, /OpenLinksInBuiltInBrowserRow/);
  assert.match(page, /AllowedSitesRow/);
  assert.match(page, /id="preview"/);
  assert.match(page, /id="local-sessions"/);
  assert.match(page, /LocalSandboxRows/);
  assert.match(messages, /XZuN8Fgklz/);
  assert.match(messages, /moEfZ8i\+n2/);
  const sessionsIndex = page.indexOf("text.localSessions");
  const browserIndex = page.indexOf("text.browser");
  const mobileIndex = page.indexOf("text.mobileSimulators");
  const prIndex = page.indexOf("text.pullRequests");
  assert.ok(sessionsIndex > 0 && sessionsIndex < browserIndex);
  assert.ok(browserIndex > 0 && browserIndex < mobileIndex);
  assert.ok(mobileIndex > 0 && mobileIndex < prIndex);
  assert.doesNotMatch(page, /openSettingsModal\("customize-plugins"\)/);
  assert.match(messages, /LgkdiZ92a8/);
  assert.match(messages, /BxVqgx1N4R/);
  assert.match(messages, /Fycjnepb7X/);
  assert.match(messages, /Va2aVQRIyJ/);
  assert.match(appearance, /bTg9qb70sr/);
  assert.match(appearance, /code_default_transcript_view/);
});

test("Cowork settings is official Tt: files/trusted/browser/open-links before Memory, hide Dispatch", () => {
  const page = read("src/features/settings/sections/CoworkSettings.tsx");
  const device = read("src/features/settings/sections/coworkSettingsDevice.tsx");
  const messages = read("src/features/settings/settingsMessages.ts");
  const filesIndex = page.indexOf("CoworkDeviceSettingsRows");
  const memoryIndex = page.indexOf("text.memory");
  assert.ok(filesIndex > 0 && filesIndex < memoryIndex);
  assert.match(device, /ciLKOe5nmN|text\.coworkFiles/);
  assert.match(device, /5UZ7woP\+0X|text\.trustedCoworkFolders/);
  assert.match(device, /cGSF0vB\/eU|text\.preferredBrowser/);
  assert.match(device, /LgkdiZ92a8|text\.openLinksInBuiltInBrowser/);
  assert.match(device, /BxVqgx1N4R|text\.allowedSites/);
  assert.doesNotMatch(page, /text\.dispatch\b/);
  assert.doesNotMatch(device, /text\.dispatch\b/);
  assert.match(messages, /ciLKOe5nmN/);
  assert.match(messages, /5UZ7woP\+0X/);
  assert.match(messages, /cGSF0vB\/eU/);
  assert.match(messages, /LgkdiZ92a8/);
});

test("modal nav is ZC forModal: Search + Settings/This computer/Customize", () => {
  const content = read("src/features/settings/PersonalSettingsContent.tsx");
  const modal = read("src/features/settings/SettingsModal.tsx");
  const search = read("src/features/settings/SettingsNavSearch.tsx");
  assert.match(content, /forModal/);
  assert.match(content, /id: "usage"/);
  assert.match(content, /id: "import"/);
  assert.match(content, /customize-skills/);
  assert.match(content, /thisComputer/);
  assert.match(modal, /forModal: true/);
  assert.match(modal, /SettingsNavSearch/);
  assert.match(search, /xmcVZ0BU63|navText.search/);
  assert.match(search, /jilxfQjKK7|noMatchingSettings/);
});

test("overlay Skills is official Ar: title+search+Add, Your skills below, first-run $e", () => {
  const sidebar = read("src/features/customize/skills/SkillsPageSidebar.tsx");
  const route = read("src/features/customize/skills/SkillsRoute.tsx");
  const add = read("src/features/customize/skills/AddSkillDropdown.tsx");
  const content = read("src/features/settings/PersonalSettingsContent.tsx");
  assert.match(content, /layout="overlay"/);
  assert.match(route, /layout="overlay"/);
  assert.match(sidebar, /Search skills and plugins/);
  assert.match(sidebar, /w-full max-w-md/);
  assert.match(sidebar, /tabbed-list-first-run/);
  assert.match(sidebar, /Add your first skills/);
  assert.match(sidebar, /Skills teach Claude how you work/);
  assert.match(sidebar, /skills-tabbed-list-tab-mine/);
  assert.match(add, /variant === "overlay"/);
  assert.match(add, /Upload skill/);
  assert.match(add, /Create a skill/);
  assert.match(add, /h-control/);
  assert.match(add, /bg-fill-primary/);
  assert.doesNotMatch(add, /officialButtonClass/);
  const header = sidebar.slice(sidebar.indexOf("<header"), sidebar.indexOf("</header>"));
  assert.match(header, /justify-center/);
  assert.match(header, /flex-1/);
  assert.match(header, /max-w-md/);
  assert.match(header, /Search skills and plugins/);
  assert.doesNotMatch(header, /ml-auto/);
  assert.doesNotMatch(header, /Tabs\.Root/);
  assert.doesNotMatch(header, /skills-tabbed-list-tab-mine/);
  const afterHeader = sidebar.slice(sidebar.indexOf("</header>"));
  assert.match(afterHeader, /skills-tabbed-list-tab-mine/);
  assert.match(afterHeader, /OVERLAY_SKILLS_TAB_CLASS/);
  assert.match(sidebar, /bg-fill-ghost-hover/);
});

test("overlay Connectors is official Go: 3-col search, no Discover on $e, table not Rt rows", () => {
  const overlay = read("src/features/customize/connectors/ConnectorsOverlayList.tsx");
  const sidebar = read("src/features/customize/connectors/ConnectorsListSidebar.tsx");
  const route = read("src/features/customize/connectors/ConnectorsRoute.tsx");
  const add = read("src/features/customize/connectors/AddConnectorMenu.tsx");
  const content = read("src/features/settings/PersonalSettingsContent.tsx");
  const modal = read("src/features/settings/SettingsModal.tsx");
  assert.match(content, /ConnectorsRoute layout="overlay"/);
  assert.match(route, /layout === "overlay"/);
  assert.match(route, /<ConnectorsOverlayList/);
  assert.match(overlay, /max-w-md shrink-0 justify-center px-md/);
  assert.doesNotMatch(overlay, /className="w-64"/);
  assert.doesNotMatch(overlay, /items-end justify-between/);
  assert.match(overlay, /Search connectors/);
  assert.match(overlay, /Add your first connectors/);
  assert.match(overlay, /Connectors let Claude work with your team/);
  assert.doesNotMatch(overlay, /Discover connectors/);
  assert.match(overlay, /data-cds="Table"/);
  assert.match(overlay, />\s*Connector\s*</);
  assert.match(overlay, />\s*Type\s*</);
  assert.match(overlay, />\s*Status\s*</);
  assert.match(overlay, /Filter by status/);
  assert.doesNotMatch(overlay, /connectors-tab-mine/);
  assert.doesNotMatch(overlay, /Your connectors/);
  assert.doesNotMatch(overlay, />Web</);
  assert.doesNotMatch(sidebar, /layout === "overlay"/);
  assert.match(add, /variant === "overlay"/);
  assert.match(add, /Add custom connector/);
  assert.match(add, /h-control/);
  assert.match(modal, /customize-connectors/);
});

test("overlay Plugins is official c6a2a31c4 W: Discover next to Add opens DirectoryModal", () => {
  const overlay = read("src/features/customize/plugins/PluginsOverlayList.tsx");
  const route = read("src/features/customize/plugins/PluginsOverlayRoute.tsx");
  const add = read("src/features/customize/plugins/AddPluginDropdown.tsx");
  const content = read("src/features/settings/PersonalSettingsContent.tsx");
  const modal = read("src/features/settings/SettingsModal.tsx");
  const app = read("src/app/App.tsx");
  assert.match(content, /<PluginsOverlayRoute/);
  assert.doesNotMatch(content, /PluginsSidebarSection/);
  assert.match(route, /<PluginsOverlayList/);
  assert.match(route, /officialDirectoryStore.getState\(\).open\("plugins"/);
  assert.match(overlay, /max-w-md shrink-0 justify-center px-md/);
  assert.match(overlay, /Search skills and plugins/);
  assert.match(overlay, /plugins-tabbed-list-tab-mine/);
  assert.doesNotMatch(overlay, /plugins-tabbed-list-tab-shared/);
  assert.doesNotMatch(overlay, /BrowsePluginsContent/);
  assert.match(overlay, /Your plugins/);
  assert.match(overlay, /Add your first plugins/);
  assert.match(overlay, /Give Claude role-level expertise with plugins/);
  assert.doesNotMatch(overlay, />Discover plugins</);
  assert.match(overlay, /onDiscover=\{onDiscover\}/);
  assert.match(add, /plugins-overlay-discover/);
  assert.match(add, />Discover</);
  assert.match(add, /Upload plugin/);
  assert.match(add, /Create with Claude/);
  assert.match(add, /h-control/);
  assert.match(route, /<UploadPluginPage/);
  assert.doesNotMatch(route, /PluginUploadModal/);
  const uploadPage = read("src/features/customize/plugins/UploadPluginPage.tsx");
  assert.match(uploadPage, /data-testid="plugin-upload"/);
  assert.match(uploadPage, /Upload a plugin/);
  assert.match(uploadPage, /c76f00e40:pn/);
  assert.doesNotMatch(uploadPage, /OfficialModal/);
  assert.match(app, /DirectoryModal/);
  assert.match(modal, /customize-plugins/);
  assert.match(content, /Help me create a new Cowork plugin/);
  const directory = read("src/features/customize/directory/DirectoryModal.tsx");
  assert.match(directory, /data-cds="Dialog"/);
  assert.match(directory, /max-w-\[1024px\]/);
  assert.match(directory, /h-\[calc\(100vh-5rem\)\]/);
  assert.match(directory, /bg-surface-3/);
  assert.match(directory, /font-ui-serif font-medium/);
  assert.doesNotMatch(directory, /<OfficialModal/);
  assert.doesNotMatch(directory, /from ["']\.\.\/\.\.\/shared\/OfficialModal["']/);
});



