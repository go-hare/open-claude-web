/**
 * Official react-intl descriptors for customize (el / E7t / o7t) and Directory
 * (B8t / O8t / n8t) — index-BELzQL5P.js + c63a78ed4-M1yh4U9h.js.
 *
 * Residual pages previously hardcoded EN (or mixed 自定义 / Browse plugins).
 * Wire through the same catalogs Hns/G0t load. Incomplete official zh-CN.json
 * entries are filled in public/i18n/zh-CN.overrides.json — do not invent new ids.
 */
import { type MessageDescriptors, useI18nText } from "../../i18n/footerMenuMessages";

export const CUSTOMIZE_MESSAGES = {
  /** Official E7t title (TXpOBiuxud). */
  customize: { defaultMessage: "Customize", id: "TXpOBiuxud" },
  /** Official E7t back aria-label (cyR7KhiuaU). */
  back: { defaultMessage: "Back", id: "cyR7KhiuaU" },
  /** Official E7t empty folder CTA (43jDUDnevy). */
  selectFolder: { defaultMessage: "Select a folder", id: "43jDUDnevy" },
  /** Official E7t folder tooltip (B7cbq5Vnac). */
  selectFolderTooltip: {
    defaultMessage: "Select a folder to see project-scoped plugins and install plugins at the project level.",
    id: "B7cbq5Vnac",
  },
  /** Official I7t / Ee Skills (EJSVsOA19u). */
  skills: { defaultMessage: "Skills", id: "EJSVsOA19u" },
  /** Official I7t Connectors (2mMJRvsAg1). */
  connectors: { defaultMessage: "Connectors", id: "2mMJRvsAg1" },

  /** Official el h1 (t+AEDBi6ym). */
  customizeClaude: { defaultMessage: "Customize Claude", id: "t+AEDBi6ym" },
  /** Official el subtitle (NrqkFblekv). */
  customizeSubtitle: {
    defaultMessage: "Skills, connectors, and plugins shape how Claude works with you.",
    id: "NrqkFblekv",
  },
  /** Official el Connect tools card (6BWW0XwXkR). */
  connectYourApps: { defaultMessage: "Connect your apps", id: "6BWW0XwXkR" },
  connectYourAppsDescription: {
    defaultMessage: "Let Claude read and write to the tools you already use.",
    id: "lYRgblMOed",
  },
  /** Official el Create new skills (WlHVJCnlJT). */
  createNewSkills: { defaultMessage: "Create new skills", id: "WlHVJCnlJT" },
  createNewSkillsDescription: {
    defaultMessage: "Teach Claude your processes, team norms, and expertise.",
    id: "LZUNE0O8SU",
  },
  /** Official el / o7t Browse plugins (uY5OjtEg/e). */
  browsePlugins: { defaultMessage: "Browse plugins", id: "uY5OjtEg/e" },
  browsePluginsDescription: {
    defaultMessage: "Add pre-built knowledge for your field.",
    id: "6gQfSFvqvc",
  },

  /** Official o7t / c7t (DDvPN+i/t2). */
  personalPlugins: { defaultMessage: "Personal plugins", id: "DDvPN+i/t2" },
  /** Official o7t Add plugin (9knX1qH3f1). */
  addPlugin: { defaultMessage: "Add plugin", id: "9knX1qH3f1" },
  /** Official o7t Create plugin submenu (nj2f0hERT8). */
  createPlugin: { defaultMessage: "Create plugin", id: "nj2f0hERT8" },
  /** Official o7t Upload plugin (EtIpiwYn4p). */
  uploadPlugin: { defaultMessage: "Upload plugin", id: "EtIpiwYn4p" },
  /** Official o7t Create with Claude (st9QnC8LFC). */
  createWithClaude: { defaultMessage: "Create with Claude", id: "st9QnC8LFC" },
  /** Official o7t empty CTA (ycyELdOXjK). */
  pluginsAwarenessCta: {
    defaultMessage: "Give Claude role-level expertise with plugins",
    id: "ycyELdOXjK",
  },
  /** Official o7t empty copy (yiIJPIdfA8). */
  pluginsEmpty: {
    defaultMessage: "Plugins that you add or create will appear here.",
    id: "yiIJPIdfA8",
  },

  /** Official B8t Tm ariaLabel + title (RDwKyyO7Lq). */
  directory: { defaultMessage: "Directory", id: "RDwKyyO7Lq" },
  /** Official B8t nav aria-label (jr1yccMGJv). */
  directorySections: { defaultMessage: "Directory sections", id: "jr1yccMGJv" },
  /** Official B8t vIe aria-label (mf052ziCyF). */
  searchDirectory: { defaultMessage: "Search directory", id: "mf052ziCyF" },
  /** Official B8t search placeholder plugins (EgUEciyz8W). */
  searchPluginsEllipsis: { defaultMessage: "Search plugins…", id: "EgUEciyz8W" },
  /** Official B8t search placeholder skills (uOLtTPkHWk). */
  searchSkillsEllipsis: { defaultMessage: "Search skills…", id: "uOLtTPkHWk" },
  /** Official B8t search placeholder connectors (4Eyg6psDkw). */
  searchConnectorsEllipsis: { defaultMessage: "Search connectors…", id: "4Eyg6psDkw" },
  /** Official B8t I7t Plugins (QJAllUAc2k). */
  plugins: { defaultMessage: "Plugins", id: "QJAllUAc2k" },

  /** Official O8t empty (/F3BARWVEw). */
  orgPluginsEmpty: {
    defaultMessage: "Your organization hasn't provided plugins. Contact your organization administrator to add them.",
    id: "/F3BARWVEw",
  },
  /** Official O8t cannot-read (VKTH/GPm9F). */
  orgPluginsCannotRead: {
    defaultMessage: "Unable to read the plugins folder. Contact your organization administrator.",
    id: "VKTH/GPm9F",
  },
  /** Official O8t missing support (RMIzooUcTb). */
  orgPluginsMissingSupport: {
    defaultMessage:
      "Failed to load organization plugins. This desktop build is missing plugin support — try reinstalling the application.",
    id: "RMIzooUcTb",
  },
  /** Official O8t / k4t chip (DtTW4+f603). */
  yourOrganization: { defaultMessage: "Your organization", id: "DtTW4+f603" },
  /** Official O8t inner search placeholder (0BUTMvePvK). */
  searchEllipsis: { defaultMessage: "Search...", id: "0BUTMvePvK" },
  /** Official O8t inner search aria-label (Or0b5msIzp). */
  searchPlugins: { defaultMessage: "Search plugins", id: "Or0b5msIzp" },
  /** Official O8t no-match (PuWnt+KeOh). */
  noPluginsMatchSearch: { defaultMessage: "No plugins match your search.", id: "PuWnt+KeOh" },

  /** Official n8t UnifiedDirectoryCard (ubmFc8rrea / 0AzlrbMWV9 / V22724PpOf / ycCbwy44yY). */
  install: { defaultMessage: "Install", id: "ubmFc8rrea" },
  manage: { defaultMessage: "Manage", id: "0AzlrbMWV9" },
  installed: { defaultMessage: "Installed", id: "V22724PpOf" },
  installing: { defaultMessage: "Installing", id: "ycCbwy44yY" },
  /** Official l8t update-available badge (3uUZCr3t5a). */
  updateAvailable: { defaultMessage: "Update available", id: "3uUZCr3t5a" },
  /** Official Gm / J6t / S7t Cancel (47FYwba+bI). */
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },

  /** Official L8t default chip (ivWOLaGz1Q). */
  anthropicAndPartners: { defaultMessage: "Anthropic & Partners", id: "ivWOLaGz1Q" },
  /** Official L8t personal chip (NDx+B0BTac). */
  personal: { defaultMessage: "Personal", id: "NDx+B0BTac" },
  /** Official L8t / J6t / Ide plus (UYlPDbWMZe). */
  addMarketplace: { defaultMessage: "Add marketplace", id: "UYlPDbWMZe" },
  /** Official L8t empty default (eb1zni4pkW). */
  noPluginsAvailable: { defaultMessage: "No plugins available.", id: "eb1zni4pkW" },
  /** Official L8t empty NX (rEp7WUHaSf). */
  uploadPluginsAppearHere: {
    defaultMessage: "When you upload plugins, they will appear here.",
    id: "rEp7WUHaSf",
  },
  /** Official L8t empty personal marketplace (olFpIK4IG+). */
  addPluginsToMarketplaceAppearHere: {
    defaultMessage: "When you add plugins to your marketplace, they will appear here.",
    id: "olFpIK4IG+",
  },
  /** Official L8t fatalError title (jsH/6thmRR). */
  failedToLoadMarketplaces: { defaultMessage: "Failed to load marketplaces", id: "jsH/6thmRR" },
  /** Official L8t Try again (FazwRldA7z). */
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
  /** Official L8t At missing CustomPlugins (aME9ORDmiY). */
  customPluginsDesktopOnly: {
    defaultMessage: "Custom plugins are only available in the desktop app.",
    id: "aME9ORDmiY",
  },
  /** Official L8t refresh tooltip (A8rWfKl1gY). */
  refreshMarketplace: { defaultMessage: "Refresh marketplace", id: "A8rWfKl1gY" },
  /** Official L8t kebab aria (TTa1svrgng). */
  marketplaceOptions: { defaultMessage: "Marketplace options", id: "TTa1svrgng" },
  /** Official L8t kebab (YDAEYXedWv). */
  checkForUpdates: { defaultMessage: "Check for updates", id: "YDAEYXedWv" },
  /** Official L8t kebab / jm confirm (G/yZLul6P1). */
  remove: { defaultMessage: "Remove", id: "G/yZLul6P1" },
  /** Official L8t jm title (RMQ2k+uAzJ). */
  removeMarketplaceQuestion: { defaultMessage: "Remove marketplace?", id: "RMQ2k+uAzJ" },
  /** Official L8t jm body (t0Nu0XQ0sA). */
  removeMarketplaceFromList: {
    defaultMessage: "This will remove the marketplace from your list.",
    id: "t0Nu0XQ0sA",
  },
  /** Official L8t refresh success (kQOxEoL8Bw). */
  marketplaceUpdated: { defaultMessage: "Marketplace updated.", id: "kQOxEoL8Bw" },
  /** Official L8t refresh already current (jfV+ocDr6I). */
  alreadyUpToDate: { defaultMessage: "Already up to date.", id: "jfV+ocDr6I" },
  /** Official L8t refresh error (2/I2SuSV6O). */
  failedToUpdateMarketplace: { defaultMessage: "Failed to update marketplace.", id: "2/I2SuSV6O" },
  /** Official L8t remove error (R7lGMpHRnf). */
  failedToRemoveMarketplace: { defaultMessage: "Failed to remove marketplace.", id: "R7lGMpHRnf" },
  /** Official L8t remove success (u1/ZJ7INPw). */
  marketplaceRemoved: {
    defaultMessage: 'Marketplace "{marketplaceName}" removed.',
    id: "u1/ZJ7INPw",
  },
  /** Official pJ install success (xXWaJd87yv). */
  pluginInstalledReady: {
    defaultMessage: "{pluginName} is installed and ready to use.",
    id: "xXWaJd87yv",
  },
  /** Official hJ uninstall error (bj7o8tVu0J). */
  failedToUninstallPlugin: { defaultMessage: "Failed to uninstall plugin.", id: "bj7o8tVu0J" },
  /** Official hJ uninstall success (hPkxBxCj2O). */
  pluginUninstalled: { defaultMessage: "{pluginName} has been uninstalled.", id: "hPkxBxCj2O" },

  /** Official J6t Kfe (BUzRFqJGti). */
  marketplaceTrustWarning: {
    defaultMessage:
      "Make sure you trust a plugin before installing, updating, or using it. Plugins installed from marketplaces are not controlled by Anthropic, and Anthropic cannot verify that they will work as intended or that they won't change. See each plugin's homepage for more information.",
    id: "BUzRFqJGti",
  },
  /** Official J6t URL label (bWjdfaXOzU). */
  url: { defaultMessage: "URL", id: "bWjdfaXOzU" },
  /** Official J6t URL help (N/iP1eEQQT). */
  addMarketplaceUrlHelp: {
    defaultMessage: "A GitHub <code>owner/repo</code> or a git repository URL.",
    id: "N/iP1eEQQT",
  },
  /** Official J6t placeholder (DOaZZKEZ6f). */
  ownerRepoPlaceholder: { defaultMessage: "owner/repo", id: "DOaZZKEZ6f" },
  /** Official J6t Sync (dKtz/9gcqE). */
  sync: { defaultMessage: "Sync", id: "dKtz/9gcqE" },
  /** Official J6t duplicate (CbhshuK/Kh). */
  marketplaceAlreadyAdded: { defaultMessage: "This marketplace is already added.", id: "CbhshuK/Kh" },
  /** Official Z6t default (9PLxQlkykv). */
  failedToAddMarketplace: { defaultMessage: "Failed to add marketplace.", id: "9PLxQlkykv" },
  /** Official Y6t REMOTE_HOST_UNSUPPORTED (1rg/9A1u32). */
  marketplaceHostUnsupported: {
    defaultMessage:
      "This host isn't supported. Use {hosts}, or a GitHub Enterprise instance configured by your organization.",
    id: "1rg/9A1u32",
  },

  /** Official S7t local title (ALe3ynmfbq). */
  uploadLocalPlugin: { defaultMessage: "Upload local plugin", id: "ALe3ynmfbq" },
  /** Official S7t Kfe (bGWPMulXxs). */
  uploadTrustWarning: {
    defaultMessage:
      "Make sure you trust a plugin before installing or using it. Uploaded plugins are not controlled by Anthropic, and Anthropic cannot verify that they will work as intended. See each plugin's homepage for more information.",
    id: "bGWPMulXxs",
  },
  /** Official N7t empty (e/swXmKhH3). */
  dragDropOrClickToUpload: { defaultMessage: "Drag and drop or click to upload", id: "e/swXmKhH3" },
  /** Official N7t Browse files (r54z1q6Q3W). */
  browseFiles: { defaultMessage: "Browse files", id: "r54z1q6Q3W" },
  /** Official S7t Upload (p4N05Hifto). */
  upload: { defaultMessage: "Upload", id: "p4N05Hifto" },
  /** Official S7t local error (9cg9QS6Rw0). */
  uploadFailedTryAgain: { defaultMessage: "Upload failed. You can try again.", id: "9cg9QS6Rw0" },
  /** Official uX local success (oeYVLd7r8u). */
  pluginInstalledReadyGeneric: {
    defaultMessage: "Plugin is installed and ready to use.",
    id: "oeYVLd7r8u",
  },
  /** Official S7t accept (erLKAb7hWQ). */
  onlyZipAndPluginAccepted: {
    defaultMessage: "Only .zip and .plugin files are accepted.",
    id: "erLKAb7hWQ",
  },
} as const satisfies MessageDescriptors;

export type CustomizeText = Record<keyof typeof CUSTOMIZE_MESSAGES, string>;

export function useCustomizeText() {
  return useI18nText(CUSTOMIZE_MESSAGES) as CustomizeText;
}
