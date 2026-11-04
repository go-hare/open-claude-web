/**
 * Settings UI copy via official react-intl message ids (ion-dist /i18n/{locale}.json).
 *
 * Residual pages previously hardcoded English `defaultMessage` strings, so language
 * changes only affected shell/footer menus that already used useI18nText.
 * Wire labels/descriptions to the same catalogs the official Hns/G0t path loads.
 *
 * Incomplete catalog translations (some Capabilities rows still EN in zh-CN.json)
 * stay EN until catalogs fill in — do not invent unofficial Chinese here.
 */
import type { MouseEvent, ReactNode } from "react";
import { createElement } from "react";
import {
  type MessageDescriptors,
  useI18nText,
} from "../../i18n/footerMenuMessages";

/** Personal settings nav + section titles (official Zn / section headers). */
export const SETTINGS_NAV_MESSAGES = {
  general: { defaultMessage: "General", id: "1iEPTMDqmi" },
  privacy: { defaultMessage: "Privacy", id: "cXBJ7U9LBe" },
  capabilities: { defaultMessage: "Capabilities", id: "XFievosQFD" },
  connectors: { defaultMessage: "Connectors", id: "2mMJRvsAg1" },
  claudeCode: { defaultMessage: "Claude Code", id: "vKMj39KhGw" },
  cowork: { defaultMessage: "Cowork", id: "xi2NxiZh10" },
  desktopApp: { defaultMessage: "Desktop app", id: "SR19nKO/BD" },
  desktopGeneral: { defaultMessage: "General", id: "1iEPTMDqmi" },
  extensions: { defaultMessage: "Extensions", id: "nb2FlN/G2m" },
  developer: { defaultMessage: "Developer", id: "yZJxVSJosU" },
  organization: { defaultMessage: "Organization", id: "K56Dims7Up" },
  organizationSettings: { defaultMessage: "Organization settings", id: "8JjaslSBQx" },
  settings: { defaultMessage: "Settings", id: "D3idYvSLF9" },
  /** Official ZC forModal group title (jqhhMImrPt) — screenshot "Settings". */
  settingsGroup: { defaultMessage: "Settings", id: "jqhhMImrPt" },
  backToClaude: { defaultMessage: "Back to Claude", id: "e4M0bJ/pZc" },
  close: { defaultMessage: "Close", id: "rbrahOGMC3" },
  search: { defaultMessage: "Search", id: "xmcVZ0BU63" },
  searchSettings: { defaultMessage: "Search settings", id: "pyTWlkS60A" },
  noMatchingSettings: { defaultMessage: "No matching settings", id: "jilxfQjKK7" },
  usage: { defaultMessage: "Usage", id: "wbsq7OdxnV" },
  importExport: { defaultMessage: "Import & export", id: "ZbqbfcKDqr" },
  thisComputer: { defaultMessage: "This computer", id: "YY998h82la" },
  system: { defaultMessage: "System", id: "I2acb3TGcT" },
  customize: { defaultMessage: "Customize", id: "Fx/koR/KTo" },
  skills: { defaultMessage: "Skills", id: "EJSVsOA19u" },
  plugins: { defaultMessage: "Plugins", id: "QJAllUAc2k" },
} as const satisfies MessageDescriptors;

/** Capabilities page (official Fe / Te Memory · Ce General · _e Visuals · Skills). */
export const CAPABILITIES_MESSAGES = {
  memory: { defaultMessage: "Memory", id: "dVx3yznM2C" },
  general: { defaultMessage: "General", id: "1iEPTMDqmi" },
  visuals: { defaultMessage: "Visuals", id: "AjPyIpa6rp" },
  /** Official Ee Skills section title (c71860c77-CQj8rzol EJSVsOA19u). */
  skills: { defaultMessage: "Skills", id: "EJSVsOA19u" },
  searchAndReferenceChats: { defaultMessage: "Search and reference chats", id: "bSZyad19yM" },
  searchAndReferenceChatsDescription: {
    defaultMessage: "Allow Claude to search for relevant details in past chats. <a>Learn more</a>.",
    id: "g84bsjVtN2",
  },
  generateMemoryFromHistory: {
    defaultMessage: "Generate memory from chat history",
    id: "a1iHrcXtQL",
  },
  /**
   * Official Te description branch (no userSetting / no admin block):
   * - cowork U() true → IStNSe/rhY (zh-CN translated)
   * - else joJ8EbhdIf (zh-CN still EN in official catalog)
   */
  generateMemoryFromHistoryDescription: {
    defaultMessage:
      "Allow Claude to remember relevant context from your chats. Memory includes your entire chat history with Claude. <a>Learn more</a>.",
    id: "joJ8EbhdIf",
  },
  generateMemoryFromHistoryDescriptionCowork: {
    defaultMessage:
      "Allow Claude to remember relevant context from your chats and Cowork sessions. Memory includes your entire chat history with Claude. <a>Learn more</a>.",
    id: "IStNSe/rhY",
  },
  chatMemory: { defaultMessage: "Chat memory", id: "rf5VQshzdG" },
  noMemoryYet: { defaultMessage: "No memory yet", id: "ThZGZa5x4m" },
  toolAccessMode: { defaultMessage: "Tool access mode", id: "cxPCq3Lo4G" },
  toolAccessModeDescription: {
    defaultMessage: "Controls how connector tools are loaded in new conversations.",
    id: "2quuFTad/n",
  },
  loadToolsWhenNeeded: { defaultMessage: "Load tools when needed", id: "TQakOWx/s6" },
  /** Official we item subtitle (zNp8ouRi1z). */
  loadToolsWhenNeededDescription: {
    defaultMessage: "Chats compact less since tools aren't pre-loaded.",
    id: "zNp8ouRi1z",
  },
  toolsAlreadyLoaded: { defaultMessage: "Tools already loaded", id: "2L6XHrHX3B" },
  /** Official we item subtitle (hLphZYtEL1). */
  toolsAlreadyLoadedDescription: {
    defaultMessage: "Chats compact more often since tools are always there.",
    id: "hLphZYtEL1",
  },
  /** Official we onChange toast (85KZpHlmsC / qKO0VhKHu5). */
  toolAccessSetLoadWhenNeeded: {
    defaultMessage: "Tool access set to load when needed",
    id: "85KZpHlmsC",
  },
  toolAccessSetAlreadyLoaded: {
    defaultMessage: "Tool access set to already loaded",
    id: "qKO0VhKHu5",
  },
  csvChatSuggestions: { defaultMessage: "CSV chat suggestions", id: "cnTFjGjv3s" },
  csvChatSuggestionsDescription: {
    defaultMessage: "Claude will suggest responses when you upload CSVs to your conversation.",
    id: "emYI2E5JkJ",
  },
  googleDriveCataloging: { defaultMessage: "Google Drive cataloging", id: "xUTn4JOAg5" },
  googleDriveCatalogingDescription: {
    defaultMessage:
      "Allow Claude to store and catalog your Google Drive data for more accurate search results",
    id: "Pu7RZXX0GW",
  },
  artifacts: { defaultMessage: "Artifacts", id: "eW5eoWkxy3" },
  artifactsDescription: {
    defaultMessage:
      "Generate code, documents, and designs in a dedicated window alongside your conversation.",
    id: "t8UlU+rfkJ",
  },
  aiPoweredArtifacts: { defaultMessage: "AI-powered artifacts", id: "r5qYNnrGq5" },
  aiPoweredArtifactsDescription: {
    defaultMessage: "Build apps and interactive documents that use Claude inside the artifact.",
    id: "S1npAgSUMu",
  },
  inlineVisualizations: { defaultMessage: "Inline visualizations", id: "DSKUg3uu46" },
  inlineVisualizationsDescription: {
    defaultMessage:
      "Allow Claude to generate interactive visualizations, charts, and diagrams directly in the conversation.",
    id: "UlW2qXKmP+",
  },
  skillsMoved: {
    defaultMessage: "Skills have moved to <link>Customize</link>.",
    id: "aDVRC23jKg",
  },
  customize: { defaultMessage: "Customize", id: "TXpOBiuxud" },
  learnMore: { defaultMessage: "Learn more", id: "/WjAw+SZxj" },
} as const satisfies MessageDescriptors;

/** General profile / preferences / notifications (c0db37792 H/X/ee/se/ie). */
export const GENERAL_SETTINGS_MESSAGES = {
  profile: { defaultMessage: "Profile", id: "itPgxdbBzC" },
  /** Official $n title (c0db37792 nwKczbeayM) — was Preferences PCSt5TwTnx. */
  preferences: { defaultMessage: "Appearance", id: "nwKczbeayM" },
  theme: { defaultMessage: "Theme", id: "Pe0ogRZhIF" },
  notifications: { defaultMessage: "Notifications", id: "NAidKbB0vi" },
  scheduledTasks: { defaultMessage: "Scheduled tasks", id: "sy7vzf+1SO" },
  scheduledTasksDescription: {
    defaultMessage: "Get notified when scheduled tasks finish, can’t run, or need your input.",
    id: "qshVSCfplf",
  },
  avatar: { defaultMessage: "Avatar", id: "VnXp8ZIfSy" },
  fullName: { defaultMessage: "Full name", id: "yk4PT9S4sc" },
  whatShouldClaudeCallYou: {
    defaultMessage: "What should Claude call you?",
    id: "sjfw113DWS",
  },
  whatBestDescribesWork: {
    defaultMessage: "What best describes your work?",
    id: "JIAWSQbG7m",
  },
  /** Official X Y label — CoWpJWiYVJ (not the informal “know about you” string). */
  instructionsForClaude: {
    defaultMessage: "Instructions for Claude",
    id: "CoWpJWiYVJ",
  },
  /**
   * Official X description SwO3Dd2FGA.
   * en-US keeps <aupLink>/<learnMoreLink>; some locales flatten tags — render helper handles both.
   */
  instructionsDescription: {
    defaultMessage:
      "Claude will keep these in mind across chats and Cowork within <aupLink>Anthropic's guidelines</aupLink>. <learnMoreLink>Learn more</learnMoreLink>",
    id: "SwO3Dd2FGA",
  },
  instructionsPlaceholder0: {
    defaultMessage: "e.g. keep explanations brief and to the point",
    id: "6FIWH+LxIO",
  },
  instructionsPlaceholder1: {
    defaultMessage: "e.g. when learning new concepts, I find analogies particularly helpful",
    id: "GqKOYaLyWk",
  },
  instructionsPlaceholder2: {
    defaultMessage: "e.g. ask clarifying questions before giving detailed answers",
    id: "wwxeIp0xi9",
  },
  instructionsPlaceholder3: {
    defaultMessage: "e.g. I primarily code in Python (not a coding beginner)",
    id: "MtJVtxlGU4",
  },
  appearance: { defaultMessage: "Appearance", id: "2GURQYNPp3" },
  /** Official ee Appearance auto tooltip — +CwN9C/QFk (not KNFWQ+T1/T footer/menu copy). */
  matchSystem: { defaultMessage: "System", id: "+CwN9C/QFk" },
  light: { defaultMessage: "Light", id: "3cc4CtJM5h" },
  dark: { defaultMessage: "Dark", id: "tOdNiYuuag" },
  /** Official Un (c0db37792). */
  motion: { defaultMessage: "Motion", id: "uALpKq2tu/" },
  motionDescription: {
    defaultMessage: "Reduce animation in streaming responses and other interface elements.",
    id: "bEl7R5hbRq",
  },
  motionSystem: { defaultMessage: "System", id: "+CwN9C/QFk" },
  motionReduced: { defaultMessage: "Reduced", id: "/8lcaWVENH" },
  /** Official nr Chat font (c0db37792 uxlQHrX3fg). */
  chatFont: { defaultMessage: "Chat font", id: "uxlQHrX3fg" },
  /** Official qn serif (3eknETcjZF). */
  anthropicSerif: { defaultMessage: "Anthropic Serif", id: "3eknETcjZF" },
  anthropicSans: { defaultMessage: "Anthropic Sans", id: "4EAtPWhM42" },
  dyslexicFriendly: { defaultMessage: "Dyslexic friendly", id: "twBGxrOFSV" },
  select: { defaultMessage: "Select", id: "kQAf2d9u+x" },
  /**
   * Official j4t work-function labels (index-D35w9RK9) — value stays English residual
   * ("Product Management", …); display string comes from /i18n/{locale}.json
   * merged with /i18n/{locale}.overrides.json (product ZH补 for official EN residual).
   */
  workFunctionProductManagement: {
    defaultMessage: "Product management",
    id: "vln2MGiyKI",
  },
  workFunctionEngineering: {
    defaultMessage: "Engineering",
    id: "kSRFHzFBQd",
  },
  workFunctionHumanResources: {
    defaultMessage: "Human resources",
    id: "wS3zGbpw8j",
  },
  workFunctionFinance: { defaultMessage: "Finance", id: "oKM81YPrmV" },
  workFunctionMarketing: { defaultMessage: "Marketing", id: "I2d1vG35dZ" },
  workFunctionSales: { defaultMessage: "Sales", id: "voMCi6ZyXS" },
  workFunctionOperations: { defaultMessage: "Operations", id: "HqBcYorHBN" },
  workFunctionDataScience: {
    defaultMessage: "Data science",
    id: "62vTr2CsqN",
  },
  workFunctionDesign: { defaultMessage: "Design", id: "ZW+myQkZ/P" },
  workFunctionLegal: { defaultMessage: "Legal", id: "/QQeHodk3M" },
  workFunctionOther: { defaultMessage: "Other", id: "GtS7t7VHaE" },
  responseCompletions: { defaultMessage: "Response completions", id: "9rL+46Sd/5" },
  responseCompletionsDescription: {
    defaultMessage:
      "Get notified when Claude has finished a response. Useful for long-running tasks.",
    id: "ZhkFBG4biD",
  },
  codeNotifications: { defaultMessage: "Code notifications", id: "wtOt83XrGz" },
  codeNotificationsDescription: {
    defaultMessage:
      "Claude can choose to notify you about important updates from a Code session.",
    id: "HH/bLSGM/Y",
  },
  codePermissionRequests: {
    defaultMessage: "Code permission requests",
    id: "LQOsG3yWng",
  },
  codePermissionRequestsDescription: {
    defaultMessage:
      "Get a push notification when Claude needs your approval to run a command in a Code session.",
    id: "rPFZ93PZaU",
  },
  /**
   * Official ue uses Statsig copy keys 1tnv78j / 162hnvx (not spa i18n).
   * Keep residual English defaults; do not invent unofficial Chinese here.
   */
  codeEmails: { defaultMessage: "Code emails", id: "1tnv78j" },
  codeEmailsDescription: {
    defaultMessage: "Get an email about important updates from a Code session.",
    id: "162hnvx",
  },
  securityScanEmails: { defaultMessage: "Security scan emails", id: "ODoMZOvv0+" },
  securityScanEmailsDescription: {
    defaultMessage: "Get an email when a Claude Code security scan finishes.",
    id: "CP8/J+x7OC",
  },
  dispatchMessages: { defaultMessage: "Dispatch messages", id: "KOXIjuiLX0" },
  dispatchMessagesDescription: {
    defaultMessage:
      "Get a push notification on your phone when Claude messages you in Dispatch.",
    id: "g18veWcko1",
  },
  couldNotUpdateSetting: {
    defaultMessage: "Couldn’t update that setting",
    id: "SkF4qFf6sx",
  },
  /** Official Profile X save toast (PC addSuccess / addError). */
  saved: { defaultMessage: "Saved", id: "fsB/4pdUqN" },
  couldntSaveThatChange: {
    defaultMessage: "Couldn’t save that change",
    id: "ecSHaFmEbs",
  },
  /**
   * Official CMEK lock tooltip on Instructions (c0db37792 R + D4CuWTj4f5).
   * Shown when LBt: any membership org.capabilities includes "taint:cmek".
   */
  instructionsCmekLocked: {
    defaultMessage:
      "Instructions can't be changed because one of your orgs has an encryption key configured.",
    id: "D4CuWTj4f5",
  },
  /**
   * Official ue uses Statsig Dynamic Config copy keys 1tnv78j / 162hnvx (not spa i18n).
   * Keep residual English defaults; catalogs may miss these ids — do not invent ZH.
   */
} as const satisfies MessageDescriptors;

/** Desktop app general settings (official bs/ms). */
export const DESKTOP_SETTINGS_MESSAGES = {
  /** Official Qn title I2acb3TGcT (c71860c77-C_7Gqn1u) — was v7i2fnB2+A. */
  generalDesktopSettings: {
    defaultMessage: "System",
    id: "I2acb3TGcT",
  },
  /** Official In (c71860c77-C_7Gqn1u). */
  desktopAppVersion: { defaultMessage: "Desktop app version", id: "fzDl58Rwrd" },
  /** Official wn / gn Storage (DUIDEquXSb). */
  storage: { defaultMessage: "Storage", id: "DUIDEquXSb" },
  storageDescription: {
    defaultMessage: "See how much space Claude uses on this computer.",
    id: "HT0EwshToA",
  },
  storageManage: { defaultMessage: "Manage", id: "rtbNQQ2C8O" },
  storageModalDescription: {
    defaultMessage:
      "Space Claude uses on this computer. Cowork tasks that run in the cloud aren’t included.",
    id: "jBch8p3Rzj",
  },
  storageUnavailable: {
    defaultMessage: "Couldn’t calculate storage. Try again.",
    id: "Dy5j7d8zvH",
  },
  diskSpaceUsed: { defaultMessage: "Disk space used", id: "uu47TeN43k" },
  storageLowerBound: {
    defaultMessage: "Some folders couldn’t be measured, so this is a lower bound.",
    id: "AmBpsg2ljY",
  },
  storageCalculatedWhen: { defaultMessage: "Calculated {when}.", id: "EE2KwIs/V5" },
  storageByArea: { defaultMessage: "Storage by area", id: "S0xbsFUexi" },
  coworkTasks: { defaultMessage: "Cowork tasks", id: "Ps0CoiNXOT" },
  codeSessionsAndWorktrees: {
    defaultMessage: "Code sessions and worktrees",
    id: "5aPhneVnWt",
  },
  runtime: { defaultMessage: "Runtime", id: "66kGA0NpIm" },
  appCachesAndLogs: { defaultMessage: "App caches and logs", id: "jvKP7SKvKC" },
  webCacheBrowserPanesLogs: {
    defaultMessage: "Web cache, browser panes and logs.",
    id: "XK8ej7dftk",
  },
  openFolder: { defaultMessage: "Open folder", id: "W+znbCrCL6" },
  refresh: { defaultMessage: "Refresh", id: "rELDbByu8U" },
  details: { defaultMessage: "Details", id: "Lv0zJuL1jH" },
  clearCacheAndRestart: {
    defaultMessage: "Clear cache and restart…",
    id: "OOyYkBlff+",
  },
  coworkTaskDetails: { defaultMessage: "Cowork task details", id: "m/DmtCOPfJ" },
  coworkStorageByKind: { defaultMessage: "Cowork storage by kind", id: "KKwwuQ+ktn" },
  taskHistory: { defaultMessage: "Task history", id: "NGbaRxLuud" },
  attachmentsAndGeneratedFiles: {
    defaultMessage: "Attachments and generated files",
    id: "GRbQIADc+L",
  },
  perTaskPluginCopies: { defaultMessage: "Per-task plugin copies", id: "KxkGpmc1rf" },
  pluginsAndSkills: { defaultMessage: "Plugins and skills", id: "t6sxIMkk1A" },
  webCache: { defaultMessage: "Web cache", id: "BpSvPpCSnA" },
  browserPanes: { defaultMessage: "Browser panes", id: "dOEgDshfXV" },
  logs: { defaultMessage: "Logs", id: "SNuQo7IJH/" },
  other: { defaultMessage: "Other", id: "/VnDMl81rh" },
  appStorageByKind: { defaultMessage: "App storage by kind", id: "PxhYEde2lq" },
  appCacheDetails: { defaultMessage: "App cache details", id: "8S0SpZ11zE" },
  codeSessionsAndWorktreesCount: {
    defaultMessage: "{sessions, plural, one {# session} other {# sessions}} and {worktrees}",
    id: "RWux9B/cSX",
  },
  codeWorktreesCount: {
    defaultMessage: "{count, plural, one {# worktree} other {# worktrees}}",
    id: "Mk/EHfLx4Z",
  },
  codeSessionsCount: {
    defaultMessage: "{sessions, plural, one {# session} other {# sessions}}",
    id: "GeTbcnUeUm",
  },
  coworkTasksAndChats: {
    defaultMessage: "{count, plural, one {# task or chat} other {# tasks and chats}}.",
    id: "mGOKdTsQmq",
  },
  coworkTasksOnly: {
    defaultMessage: "{count, plural, one {# task} other {# tasks}}.",
    id: "xIG84NwUlL",
  },
  coworkStaleActivity: {
    defaultMessage:
      "{count, plural, one {# has} other {# have}} had no activity in the last {days} days ({size}).",
    id: "cUnWxAxEYc",
  },
  coworkAllActive: {
    defaultMessage: "All active in the last {days} days.",
    id: "WRVYAfFJ2V",
  },
  coworkMeasuringChats: {
    defaultMessage:
      "{count, plural, one {# task or chat} other {# tasks and chats}}. Measuring…",
    id: "zdj+o1a4TH",
  },
  coworkMeasuringTasks: {
    defaultMessage: "{count, plural, one {# task} other {# tasks}}. Measuring…",
    id: "n00KPnUQww",
  },
  close: { defaultMessage: "Close", id: "rbrahOGMC3" },
  runOnStartup: { defaultMessage: "Run on startup", id: "5huDSewExH" },
  runOnStartupDescription: {
    defaultMessage: "Automatically start Claude when you log in to your computer",
    id: "DI4jJcaw7g",
  },
  quickAccessShortcut: { defaultMessage: "Quick access shortcut", id: "7Orkcosvv2" },
  quickAccessShortcutDescription: {
    defaultMessage: "Message Claude from anywhere on your desktop.",
    id: "LhhO5hcqoy",
  },
  /** Official qn / Q / Xn (c71860c77-C_7Gqn1u). */
  tapOptionTwice: { defaultMessage: "Tap Option twice", id: "somfJ6iWh0" },
  tapAltTwice: { defaultMessage: "Tap Alt twice", id: "XUir8trSmd" },
  optionSpace: { defaultMessage: "Option+Space", id: "6nD7bwj4F7" },
  altSpace: { defaultMessage: "Alt+Space", id: "0QLubSrZ2p" },
  customEllipsis: { defaultMessage: "Custom…", id: "lKjjJ7PIFW" },
  noShortcut: { defaultMessage: "No shortcut", id: "TMeenHCszI" },
  capsLock: { defaultMessage: "Caps Lock", id: "5tVLXRUZrl" },
  /** Official ms legacy branch when nativeQuickEntry unsupported (wl6vXYrxQW / kpLUOdAdXq). */
  quickEntryKeyboardShortcut: {
    defaultMessage: "Quick Entry keyboard shortcut",
    id: "wl6vXYrxQW",
  },
  quickEntryKeyboardShortcutDescription: {
    defaultMessage: "Quickly open Claude from anywhere",
    id: "kpLUOdAdXq",
  },
  voiceShortcut: { defaultMessage: "Voice shortcut", id: "yQgeL20JNk" },
  voiceShortcutDescription: {
    defaultMessage: "Speak to Claude from anywhere on your desktop",
    id: "lYaZC2VGFn",
  },
  /** Official Qn _e (c7357c32b Sa5Vh4MotK). */
  dictationShortcut: { defaultMessage: "Dictation shortcut", id: "Sa5Vh4MotK" },
  dictationShortcutDescription: {
    defaultMessage: "Start or stop dictation in the chat you’re typing in.",
    id: "O3Y4fOLEDv",
  },
  commandD: { defaultMessage: "Command+D", id: "fuzyuUCXBZ" },
  ctrlD: { defaultMessage: "Ctrl+D", id: "9mRD/6SHCw" },
  computerUse: { defaultMessage: "Computer use", id: "RfG2KsHAez" },
  beta: { defaultMessage: "Beta", id: "riw/yc06Nq" },
  enableComputerUse: { defaultMessage: "Enable computer use", id: "SuJjHnT9jE" },
  enableComputerUseBackgroundDescription: {
    defaultMessage:
      "Let Claude see and act in the apps you allow, working in the background or with full control of your screen.",
    id: "Derf4fJ5+V",
  },
  enableComputerUseDescription: {
    defaultMessage:
      "Let Claude take control of your screen, mouse, and keyboard to work in the apps you allow.",
    id: "c0o/FekLJX",
  },
  unhideAppsWhenClaudeFinishes: {
    defaultMessage: "Unhide apps when Claude finishes",
    id: "Ess7TkMY61",
  },
  unhideAppsWhenClaudeFinishesDescription: {
    defaultMessage:
      "When Claude has full control of your screen, apps hidden during a task are restored when Claude stops.",
    id: "T7z5SKWO2K",
  },
  howClaudeUsesApps: {
    defaultMessage: "How Claude uses the apps you allow",
    id: "cuPGQUHxR4",
  },
  howClaudeUsesAppsDescription: {
    defaultMessage:
      "Background: Claude works inside the apps you allow while you keep using your computer, and asks your permission before taking full control of your screen. Full control: Claude takes control of your screen, mouse, and keyboard by default whenever Claude uses an app you allow, without asking again.",
    id: "hlErDsqOX5",
  },
  background: { defaultMessage: "Background", id: "XQZA8epeh8" },
  fullControl: { defaultMessage: "Full control", id: "SElXf9Ku11" },
  deniedApps: { defaultMessage: "Denied apps", id: "3cNJSty9kF" },
  deniedAppsDescription: {
    defaultMessage:
      "Any request Claude makes to access these apps is automatically rejected. Claude may still affect them indirectly through actions in allowed apps.",
    id: "GDROPb/gVs",
  },
  addApp: { defaultMessage: "Add app", id: "8w8g6qgplC" },
  noAppsDenied: {
    defaultMessage: "No apps denied. Add an app to automatically reject Claude’s requests for it.",
    id: "HIOQDyFAjX",
  },
  accessibility: { defaultMessage: "Accessibility", id: "fgCBG8/Fm+" },
  screenRecording: { defaultMessage: "Screen recording", id: "+TFOeIaaS0" },
  openSystemSettings: { defaultMessage: "Open System Settings", id: "U/a2e7uAwk" },
  granted: { defaultMessage: "Granted", id: "rKbDywsl1o" },
  denied: { defaultMessage: "Denied", id: "5kp1IeN5nQ" },
  notRequested: { defaultMessage: "Not requested", id: "HGIy99VgLZ" },
  notSupported: { defaultMessage: "Not supported", id: "+FiyOTaUCW" },
  learnMore: { defaultMessage: "Learn more", id: "TdTXXf940t" },
  keepComputerAwake: { defaultMessage: "Keep computer awake", id: "CapHOIPauL" },
  keepComputerAwakeDescription: {
    defaultMessage:
      "Prevent your computer from idle-sleeping while Claude is open so scheduled tasks can run. Your display can still turn off. Closing the laptop lid will still put it to sleep.",
    id: "NtWJTAiYRo",
  },
  menuBar: { defaultMessage: "Menu bar", id: "VCgUiTOVPi" },
  systemTray: { defaultMessage: "System tray", id: "Q3dfP+fWbN" },
  showInMenuBar: {
    defaultMessage: "Show Claude in the menu bar",
    id: "qSCLs8vEiM",
  },
  keepInSystemTray: {
    defaultMessage: "Keep Claude running in the system tray",
    id: "ESsdM64wtu",
  },
  browserUse: { defaultMessage: "Browser Use", id: "j2hlcpE79k" },
  browserUseSectionDescription: {
    defaultMessage: "Not available in cloud Code sessions, which don’t run on this computer.",
    id: "TvGEXwDFHH",
  },
  allowAllBrowserActions: {
    defaultMessage: "Allow all browser actions",
    id: "fVIi0h0uIb",
  },
  /**
   * Official 0Jh6jsTpeC — may include `<link>…</link>` for support article.
   * Render via renderDesktopBrowserUseDescription.
   */
  allowAllBrowserActionsDescription: {
    defaultMessage:
      "Claude will browse and interact with any website in Chrome without asking. Applies to new sessions. This setting can put your data at risk. <link>Learn more</link>",
    id: "0Jh6jsTpeC",
  },
} as const satisfies MessageDescriptors;

export function useSettingsNavText() {
  return useI18nText(SETTINGS_NAV_MESSAGES);
}

export function useCapabilitiesText() {
  return useI18nText(CAPABILITIES_MESSAGES);
}

export function useGeneralSettingsText() {
  return useI18nText(GENERAL_SETTINGS_MESSAGES);
}

export function useDesktopSettingsText() {
  return useI18nText(DESKTOP_SETTINGS_MESSAGES);
}

/** Official hb residual (shared-3) — unitDisplay short, bytes long. */
export function formatStorageBytes(bytes: number, locale?: string): string {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"] as const;
  const step = 1000;
  const index = bytes < step ? 0 : Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(step)));
  return new Intl.NumberFormat(locale || undefined, {
    style: "unit",
    unit: units[index],
    unitDisplay: index === 0 ? "long" : "short",
    maximumFractionDigits: index === 0 ? 0 : 1,
  }).format(bytes / step ** index);
}

/** Official ICU `{count, plural, one {# …} other {# …}}` plus simple `{name}` braces. */
export function formatStorageIcu(
  template: string,
  values: Record<string, string | number>,
): string {
  const withPlural = template.replace(
    /\{(\w+),\s*plural,\s*one\s*\{([^}]*)\}\s*other\s*\{([^}]*)\}\}/g,
    (_all, key: string, one: string, other: string) => {
      const n = Number(values[key] ?? 0);
      const body = Math.abs(n) === 1 ? one : other;
      return body.replace(/#/g, String(n));
    },
  );
  return withPlural.replace(/\{(\w+)\}/g, (_all, key: string) => {
    const value = values[key];
    return value === undefined || value === null ? `{${key}}` : String(value);
  });
}

/**
 * Official ClaudeCodePage Local sessions Ct + Pull requests _t (cf4f70727-a7CVSvFQ).
 * Auto-archive / autofix use Statsig Dynamic Config copy keys (1wdvcl/1kh0255,
 * 10wu7bs/qdsv98) — not spa i18n; keep residual EN in the section component.
 * Bypass description link → https://code.claude.com/docs/en/security.
 */
export const CLAUDE_CODE_SETTINGS_MESSAGES = {
  /** Official H id HG5KdMNuqG (c71860c77-DzP8HoeV) — was Local sessions SKeCK+7hmh. */
  localSessions: { defaultMessage: "Sessions", id: "HG5KdMNuqG" },
  allowBypassPermissionsMode: {
    defaultMessage: "Allow bypass permissions mode",
    id: "FAZpmxbq/W",
  },
  allowBypassPermissionsModeDescription: {
    defaultMessage:
      "Bypass all permission checks and let Claude work uninterrupted. This works well for workflows like fixing lint errors or generating boilerplate code. Letting Claude run arbitrary commands is risky and can result in data loss, system corruption, or data exfiltration (e.g., via prompt injection attacks). <link>See best practices for safe usage</link>",
    id: "YlYBASRBOt",
  },
  drawAttentionOnNotifications: {
    defaultMessage: "Draw attention on notifications",
    id: "L3orNe9gpJ",
  },
  drawAttentionOnNotificationsDescription: {
    defaultMessage:
      "Bounce the dock icon or flash the taskbar when Claude needs your attention and the app is not focused.",
    id: "dWc+PWWxa4",
  },
  /** Official rr (DzP8HoeV) — Local sandbox after worktree. */
  localSandbox: { defaultMessage: "Local sandbox", id: "XZuN8Fgklz" },
  localSandboxDescription: {
    defaultMessage: "Runs commands from Claude Code in an isolated sandbox. Applies to new sessions.",
    id: "0IQeTnXtHC",
  },
  strictSandboxMode: { defaultMessage: "Strict sandbox mode", id: "moEfZ8i+n2" },
  strictSandboxModeDescription: {
    defaultMessage:
      "Blocks commands that can’t run inside the sandbox (ssh, for example) instead of running them outside it or asking you. Applies to every Claude Code session on this computer, including the terminal, unless a project’s own settings override it.",
    id: "IoqC8Soln9",
  },
  sandboxUnavailable: {
    defaultMessage: "The sandbox isn’t available on this machine yet.",
    id: "g6FYbmEqNk",
  },
  sandboxAvailableWhenOn: {
    defaultMessage: "Available when Local sandbox is on",
    id: "IjR36HJptk",
  },
  worktreeLocation: { defaultMessage: "Worktree location", id: "cU7ff1IrXY" },
  worktreeLocationDescription: {
    defaultMessage: "Where to store Git worktrees for isolated coding sessions.",
    id: "MSsFqCg6Gh",
  },
  branchPrefix: { defaultMessage: "Branch prefix", id: "88wJXbOjoo" },
  branchPrefixDescription: {
    defaultMessage: "Prefix added to branch names for both local and cloud sessions.",
    id: "Wq7kmqvTqf",
  },
  /** Official Kr (DzP8HoeV) — Browser tools, not Sessions Preview. */
  browser: { defaultMessage: "Browser", id: "E3oB+tM0Ou" },
  browserTools: { defaultMessage: "Browser tools", id: "cJT9hml5Dm" },
  browserToolsDescription: {
    defaultMessage:
      "Claude can start dev servers, open a live preview, and verify code changes with screenshots, snapshots, and DOM inspection.",
    id: "idMrSFp0DS",
  },
  keepCookies: { defaultMessage: "Keep cookies", id: "e6Cv5Y4QTL" },
  keepCookiesDescription: {
    defaultMessage:
      "Save cookies, local storage, and login sessions for Browser tabs across app restarts. Shared uses the same data for every session in a project. Per session gives each session its own copy, so sessions never see each other’s logins.",
    id: "G+CBpQ6LJs",
  },
  cookiesUntilQuit: { defaultMessage: "Until quit", id: "w2AaFT5b5b" },
  cookiesShared: { defaultMessage: "Shared", id: "kWI6zXRaHY" },
  cookiesPerSession: { defaultMessage: "Per session", id: "pFAA1bn62c" },
  browserToolsDesktopDescription: {
    defaultMessage:
      "Claude can start your dev servers, browse the web in a built-in browser, and verify changes with screenshots, snapshots, and DOM inspection.",
    id: "joA9S0q8Kg",
  },
  keepCookiesDesktopDescription: {
    defaultMessage:
      "Browser tabs keep cookies and logins across restarts in one saved browser shared by every session and Cowork. Per session gives each Code session its own copy instead, so sessions never see each other’s logins.",
    id: "MoAjWUV0jP",
  },
  /** Official Un / tt (cdc95db1a / Kr) — same ids as Cowork Y. */
  openLinksInBuiltInBrowser: {
    defaultMessage: "Open links in built-in browser",
    id: "LgkdiZ92a8",
  },
  openLinksInBuiltInBrowserDescription: {
    defaultMessage: "Links open in the built-in browser instead of your default browser.",
    id: "pgZS018Oqj",
  },
  allowedSites: { defaultMessage: "Allowed sites", id: "BxVqgx1N4R" },
  allowedSitesDescription: {
    defaultMessage: "Sites where Claude can use its Browser tools without a permission prompt.",
    id: "gFpafVw2/r",
  },
  promptSuggestions: { defaultMessage: "Prompt suggestions", id: "Fycjnepb7X" },
  promptSuggestionsDescription: {
    defaultMessage:
      "Show a suggested next prompt in the message box after Claude replies. Suggestions add a little to your usage.",
    id: "FgbOME4HwP",
  },
  permissionRequests: { defaultMessage: "Permission requests", id: "7vas0HJwrr" },
  permissionRequestsDescription: {
    defaultMessage: "Claude needs your approval to use a tool.",
    id: "6/sAAh+NIB",
  },
  questions: { defaultMessage: "Questions", id: "KV/9HvLgtb" },
  questionsDescription: {
    defaultMessage: "Claude is asking you to choose between options.",
    id: "E4l5E2QoYp",
  },
  taskComplete: { defaultMessage: "Task complete", id: "pmIAmFOt1l" },
  taskCompleteDescription: {
    defaultMessage: "Claude finished and is waiting for your input.",
    id: "aFCUCfaD+M",
  },
  notificationLevel: { defaultMessage: "{type} notification level", id: "dsoj3T5PrP" },
  notifyOff: { defaultMessage: "Off", id: "OvzONl52rs" },
  notifyBadge: { defaultMessage: "Badge only", id: "18n2DsPCUH" },
  notifyBanners: { defaultMessage: "Banners", id: "M/TDplXStW" },
  notificationSound: { defaultMessage: "Notification sound", id: "kmJEqpMcAS" },
  notificationSoundDescription: {
    defaultMessage: "Played when an OS banner is shown.",
    id: "OIHwK7PmyT",
  },
  systemSound: { defaultMessage: "System sound", id: "nWcwwjH6U2" },
  none: { defaultMessage: "None", id: "450Fty8ldn" },
  keepAwakeWhileWorking: {
    defaultMessage: "Keep computer awake while Claude works",
    id: "EcEP8qH6+A",
  },
  keepAwakeWhileWorkingDescription: {
    defaultMessage:
      "Prevent your computer from sleeping while a Code session is running, so long tasks can finish. Your display can still turn off. Closing the laptop lid will still put it to sleep.",
    id: "2YChxhwK1R",
  },
  keepAwakeOnBattery: { defaultMessage: "Keep awake on battery power", id: "sLed/DhFoo" },
  archiveInactiveSessions: { defaultMessage: "Archive inactive sessions", id: "Va2aVQRIyJ" },
  archiveInactiveSessionsDescription: {
    defaultMessage:
      "Automatically archive local sessions after a period of no activity. Sessions that are running or have background work are never archived, and a worktree with uncommitted changes is kept on disk.",
    id: "D9OqV7EIr6",
  },
  never: { defaultMessage: "Never", id: "du1laW45Py" },
  archiveInactiveDays: {
    defaultMessage: "{count, plural, one {# day} other {# days}}",
    id: "xcWsw2T0kk",
  },
  worktreeInsideProject: { defaultMessage: "Inside project", id: "eI3zYFFnpz" },
  worktreeCustom: { defaultMessage: "Custom…", id: "lKjjJ7PIFW" },
  plugins: { defaultMessage: "Plugins", id: "QJAllUAc2k" },
  pluginsDescription: {
    defaultMessage: "Manage Claude Code plugins, agents, hooks, and connectors.",
    id: "ItwZi5jzE0",
  },
  learnMore: { defaultMessage: "Learn more", id: "TdTXXf940t" },
  manage: { defaultMessage: "Manage", id: "rtbNQQ2C8O" },
  mobileSimulators: { defaultMessage: "Mobile simulators", id: "rlOV31zhNT" },
  iosSimulator: { defaultMessage: "iOS Simulator", id: "fc+oEygAS4" },
  iosSimulatorDescription: {
    defaultMessage:
      "Let Claude verify your changes in the iOS Simulator on this Mac: running your app, driving it through flows, and capturing screenshots and recordings. You will be asked before Claude uses each device. When off, Claude doesn’t get its simulator tools, and you can still use the simulator in the app yourself.",
    id: "E7SrKlwU6s",
  },
  androidEmulator: { defaultMessage: "Android Emulator", id: "yUsyxi1gKs" },
  androidEmulatorDescription: {
    defaultMessage:
      "Let Claude verify your changes in Android emulators on this computer: running your app, driving it through flows, and capturing screenshots and recordings. You will be asked before Claude uses each device. When off, Claude doesn’t get its emulator tools, and you can still use the emulator in the app yourself.",
    id: "ztHNjqJY9S",
  },
  managedByYourOrganization: {
    defaultMessage: "This configuration is managed by your organization. Contact your IT administrator to make changes.",
    id: "UAoPW0hAYR",
  },
  drawAttentionDarwin: {
    defaultMessage: "Bounce the Dock icon when Claude needs your attention and the app isn’t focused.",
    id: "HOH5mdam48",
  },
  drawAttentionWin32: {
    defaultMessage: "Flash the taskbar button when Claude needs your attention and the app isn’t focused.",
    id: "3SBJtWgrE1",
  },
  pullRequests: { defaultMessage: "Pull requests", id: "uDMSR+gnHL" },
  createPullRequestsAutomatically: {
    defaultMessage: "Create pull requests automatically",
    id: "jrgiDtsEgq",
  },
  createPullRequestsAutomaticallyDescription: {
    defaultMessage:
      "When Claude pushes changes to a branch, it automatically opens a pull request without asking first. Applies to remote sessions only.",
    id: "nBQeVvSeP7",
  },
  createAsDraft: { defaultMessage: "Create as draft", id: "bccR5hvTMm" },
  createAsDraftDescription: {
    defaultMessage: "Open auto-created pull requests as drafts instead of ready for review.",
    id: "qpCNNJoawH",
  },
  /**
   * Official St (cf4f70727-a7CVSvFQ): General · Classify session states.
   * Gate: GrowthBook claudeai_session_state; account ccr_session_state_buckets.
   */
  general: { defaultMessage: "General", id: "f0sgug52cn" },
  classifySessionStates: {
    defaultMessage: "Classify session states",
    id: "p5zpXqu2Vt",
  },
  classifySessionStatesDescription: {
    defaultMessage:
      "Allow Claude to automatically classify sessions as blocked, ready for review, or done. Classifying sessions counts towards your plan usage. Applies to new sessions.",
    id: "lIftuExuY6",
  },
  /**
   * Official _t autofix row uses Statsig dynamic copy 10wu7bs / qdsv98.
   * Catalog residual for the same control elsewhere is pOrogLHpcW; keep EN body
   * when Statsig ids are absent (same pattern as auto-archive 1wdvcl/1kh0255).
   */
  autofixOnPrCreate: {
    defaultMessage: "Auto-fix pull requests",
    id: "wUV2EbNd4F",
  },
  autofixOnPrCreateDescription: {
    defaultMessage:
      "When you create a pull request, Claude automatically monitors it for CI failures and review comments, then responds proactively. Claude may post comments on your behalf.",
    id: "EgiIOTh2tM",
  },
  autoArchiveClosedPrSessions: {
    defaultMessage: "Auto-archive after PR merge or close",
    id: "yVPKfWxps3",
  },
  autoArchiveClosedPrSessionsDescription: {
    defaultMessage:
      "Automatically archive desktop sessions when the associated pull request is merged or closed. Archiving also removes the session’s worktree and deletes its branch once the pull request is merged. Work that isn’t pushed is kept.",
    id: "JuT1yhTfY2",
  },
} as const satisfies MessageDescriptors;

export function useClaudeCodeSettingsText() {
  return useI18nText(CLAUDE_CODE_SETTINGS_MESSAGES);
}

const BYPASS_BEST_PRACTICES_HREF = "https://code.claude.com/docs/en/security";

/** Official YlYBASRBOt values.link → external security docs (with residual underline style). */
export function renderClaudeCodeBypassDescription(message: string): ReactNode {
  return renderMessageWithLink(
    message,
    BYPASS_BEST_PRACTICES_HREF,
    "inline-flex items-center gap-1 text-accent-000 hover:underline",
  );
}

/**
 * Official CoworkPage tn (cf4f70727-a7CVSvFQ): Dispatch Ht · Auto-organize $t · Global Xt · Memory Vt.
 * Several rows still EN in official zh-CN catalog — keep EN until catalogs fill in.
 */
export const COWORK_SETTINGS_MESSAGES = {
  cowork: { defaultMessage: "Cowork", id: "xi2NxiZh10" },
  dispatch: { defaultMessage: "Dispatch", id: "g/6veLkKdx" },
  beta: { defaultMessage: "Beta", id: "riw/yc06Nq" },
  dispatchDescription: {
    defaultMessage:
      "Let Claude work on tasks from your phone using this computer. When off, your phone won't be able to dispatch work here.",
    id: "o6q9YZK6ue",
  },
  autoOrganizeSessions: {
    defaultMessage: "Auto-organize sessions into projects",
    id: "bQwn0jV5vW",
  },
  autoOrganizeSessionsDescription: {
    defaultMessage:
      "Claude groups related sessions into projects, surfaces the project's folders, and tells the session about its project on the next message.",
    id: "aNahaGE90B",
  },
  globalInstructions: { defaultMessage: "Global instructions", id: "53DiPrdI5r" },
  globalInstructionsDescription: {
    defaultMessage:
      "Instructions here apply to all Cowork sessions. Use this for preferences, conventions, or context that Claude should always know.",
    id: "Ab1WEkfTH1",
  },
  globalInstructionsPlaceholder: {
    defaultMessage: "Add instructions for Claude to follow in all Cowork sessions...",
    id: "rEz5yyruud",
  },
  edit: { defaultMessage: "Edit", id: "wEQDC6Wv3/" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  save: { defaultMessage: "Save", id: "jvo0vs3nF0" },
  saving: { defaultMessage: "Saving...", id: "TiR/HqX9fU" },
  loading: { defaultMessage: "Loading...", id: "gjBiyjshwX" },
  failedToSaveInstructions: {
    defaultMessage: "Failed to save instructions. You can try again.",
    id: "3ln+ap2418",
  },
  /** Official X title JxlSRWr2J/ (c71860c77-Cx6eI2mP). */
  memory: { defaultMessage: "Memory", id: "JxlSRWr2J/" },
  useMemoryInSessions: { defaultMessage: "Use memory in sessions", id: "psuGulikXK" },
  useMemoryInSessionsOn: {
    defaultMessage: "Claude will read and update these memories during Cowork sessions.",
    id: "j/JmDH3hhc",
  },
  useMemoryInSessionsOff: {
    defaultMessage:
      "Paused. Existing memories are kept but won’t be read or updated in new sessions.",
    id: "6WwfTjrCl+",
  },
  memoryStorageBlurb: {
    defaultMessage:
      "Claude saves what it learns about you and your work during Cowork sessions. These files are stored on this device.",
    id: "6rekgjzRXz",
  },
  noMemoriesYet: {
    defaultMessage: "No memories yet. Claude will add entries here as you work together.",
    id: "vuZo4Ort2/",
  },
  couldntDeleteMemory: {
    defaultMessage: "Couldn’t delete this memory. Please try again.",
    id: "1ANSUCIPCZ",
  },
  /** Official aQT+klR6gE — ICU `{name}`; format via formatDeleteMemoryLabel. */
  deleteMemoryNamed: { defaultMessage: "Delete memory {name}", id: "aQT+klR6gE" },
  delete: { defaultMessage: "Delete", id: "K3r6DQW7h+" },
  /** Official cfea P / cabd ht / Je / cdc95 f (Tt onThisDevice). */
  coworkFiles: { defaultMessage: "Cowork files", id: "ciLKOe5nmN" },
  coworkFilesDescription: {
    defaultMessage: "Your artifacts and scheduled tasks are stored at {path}.",
    id: "DqDjZwiEL2",
  },
  useRecommended: { defaultMessage: "Use recommended", id: "elCjxqeTRU" },
  working: { defaultMessage: "Working…", id: "hsvAwBKpgC" },
  change: { defaultMessage: "Change", id: "BY343C3tWs" },
  changeCoworkFilesLocation: {
    defaultMessage: "Change location for Cowork files?",
    id: "+PMqUNutxd",
  },
  copyFilesAndRestart: {
    defaultMessage:
      "Copy files to {location} and restart the app. Your existing files will remain in {previousLocation}.",
    id: "sQdJsccSi7",
  },
  copyAndRestart: { defaultMessage: "Copy and restart", id: "/gC5u6qZtz" },
  coworkFilesSessionsRunning: {
    defaultMessage: "Close your running Cowork sessions first, then try again.",
    id: "zft0NHq3YV",
  },
  coworkFilesTargetInvalid: {
    defaultMessage: "That folder can’t be used. Choose another.",
    id: "pyH87+HVmt",
  },
  coworkFilesTargetUnc: {
    defaultMessage:
      "Network folders (UNC paths) can’t be used for your Cowork data. Choose a folder on this device.",
    id: "IoQ1RE7jPR",
  },
  coworkFilesTargetInsideCurrent: {
    defaultMessage: "Choose a folder outside the current Claude folder.",
    id: "/9cXL0ekBt",
  },
  coworkFilesTargetNotWritable: {
    defaultMessage: "Claude can’t write to that folder. Choose another.",
    id: "tVdYWhBwbU",
  },
  coworkFilesCopyFailed: {
    defaultMessage: "Couldn’t copy your Cowork data to the new location. See logs for details.",
    id: "H2gd/n5tZS",
  },
  coworkFilesStateWriteFailed: {
    defaultMessage: "Couldn’t save the folder setting. Try again.",
    id: "J+paViqyAW",
  },
  coworkFilesFallback: {
    defaultMessage: "Something went wrong. Try again.",
    id: "3kJE8Gegin",
  },
  trustedCoworkFolders: { defaultMessage: "Trusted Cowork folders", id: "5UZ7woP+0X" },
  trustedCoworkFoldersDescription: {
    defaultMessage:
      "When you trust a folder on this device, you allow Claude to use it and the folders inside it. Trusting a folder doesn’t add it to new tasks. When you add one to a task, you may be asked to allow it again.",
    id: "3xPFv/Ldgz",
  },
  noTrustedFoldersYet: { defaultMessage: "No trusted folders yet.", id: "4txo620/Yp" },
  remembered: { defaultMessage: "Remembered", id: "ntRjjBLRrZ" },
  remove: { defaultMessage: "Remove", id: "G/yZLul6P1" },
  addFolder: { defaultMessage: "Add folder", id: "lhYeghbH/7" },
  done: { defaultMessage: "Done", id: "JXdbo8Vnlw" },
  close: { defaultMessage: "Close", id: "rbrahOGMC3" },
  manage: { defaultMessage: "Manage", id: "0AzlrbMWV9" },
  preferredBrowser: { defaultMessage: "Preferred browser", id: "cGSF0vB/eU" },
  preferredBrowserDescription: {
    defaultMessage: "Claude uses this browser by default unless you ask otherwise.",
    id: "7uDozdO5Rc",
  },
  builtInBrowser: { defaultMessage: "Built-in browser", id: "Yx/kiytXbg" },
  chromeClaudeInChrome: { defaultMessage: "Chrome (Claude in Chrome)", id: "eYSxT0crXF" },
  turnOnClaudeInChrome: {
    defaultMessage: "Turn on the Claude in Chrome connector",
    id: "1iqOtGoaOJ",
  },
  openLinksInBuiltInBrowser: {
    defaultMessage: "Open links in built-in browser",
    id: "LgkdiZ92a8",
  },
  openLinksInBuiltInBrowserDescription: {
    defaultMessage: "Links open in the built-in browser instead of your default browser.",
    id: "pgZS018Oqj",
  },
  allowedSites: { defaultMessage: "Allowed sites", id: "BxVqgx1N4R" },
  allowedSitesDescription: {
    defaultMessage: "Sites where Claude can use its Browser tools without a permission prompt.",
    id: "gFpafVw2/r",
  },
  allowedSitesManage: { defaultMessage: "Manage", id: "rtbNQQ2C8O" },
  allowedSitesModalDescription: {
    defaultMessage:
      "Claude can use its Browser tools on these sites without a permission prompt. Remove a site and Claude asks again the next time that site needs your approval.",
    id: "dudlr0lxno",
  },
  addUrl: { defaultMessage: "Add URL", id: "8aTg3D2NqS" },
  exampleCom: { defaultMessage: "example.com", id: "AgUG6bZewE" },
  add: { defaultMessage: "Add", id: "alWu/MbgXB" },
  builtin: { defaultMessage: "Built-in", id: "xKyAnbJOy3" },
  noAllowedSitesYet: { defaultMessage: "No allowed sites yet.", id: "VY4eKypwEh" },
  clearAll: { defaultMessage: "Clear all", id: "QW+Q5NHmeF" },
  enterValidWebAddress: { defaultMessage: "Enter a valid web address.", id: "y0m/msJ/H2" },
  localhostAlwaysAllowed: { defaultMessage: "Localhost is always allowed.", id: "lyTJBLZPN5" },
  siteAlreadyAllowed: { defaultMessage: "That site is already allowed.", id: "/8asYhS9Nu" },
  siteBlockedSafety: {
    defaultMessage: "This site can’t be added due to safety restrictions.",
    id: "CyrIZLjVQH",
  },
  siteBlockedOrg: {
    defaultMessage: "This site is blocked by your organization’s policy.",
    id: "cn41O1ufFd",
  },
  couldntVerifySite: { defaultMessage: "Couldn’t verify this site. Try again.", id: "Ug1sb8vGS5" },
} as const satisfies MessageDescriptors;

export function useCoworkSettingsText() {
  return useI18nText(COWORK_SETTINGS_MESSAGES);
}

/** Official aQT+klR6gE simple brace residual. */
export function formatDeleteMemoryLabel(template: string, name: string): string {
  return template.replaceAll("{name}", name);
}

/**
 * Official Connectors personal page Zt (cf4f70727-a7CVSvFQ):
 * header 2mMJRvsAg1/PLHWL6pEBQ, moved hjDnwgc2xH → /customize/connectors,
 * Discovery Wt (only when cai_opt_in_connector_suggestions), empty Mijt/sMzDz,
 * extensions footnote E/nV5I+zT2 → /settings/desktop/extensions.
 */
export const CONNECTORS_SETTINGS_MESSAGES = {
  connectors: { defaultMessage: "Connectors", id: "2mMJRvsAg1" },
  connectorsDescription: {
    defaultMessage: "Allow Claude to reference other apps and services for more context.",
    id: "PLHWL6pEBQ",
  },
  connectorsMoved: {
    defaultMessage: "Connectors have moved to <link>Customize</link>.",
    id: "hjDnwgc2xH",
  },
  discovery: { defaultMessage: "Discovery", id: "9bXFecTyCs" },
  discoveryDescription: {
    defaultMessage:
      "Let Claude surface connectors from the directory that may be relevant to your conversation.",
    id: "rpUkyT5RSr",
  },
  noConnectorsEnabled: {
    defaultMessage: "Your organization has not enabled any connectors",
    id: "Mijt/sMzDz",
  },
  lookingForDesktopExtensions: {
    defaultMessage: "Looking for desktop extensions? Manage them <link>here</link>",
    id: "E/nV5I+zT2",
  },
  configure: { defaultMessage: "Configure", id: "9t1iivhk67" },
  browseConnectors: { defaultMessage: "Browse connectors", id: "8Q+Q5LuGum" },
} as const satisfies MessageDescriptors;

export function useConnectorsSettingsText() {
  return useI18nText(CONNECTORS_SETTINGS_MESSAGES);
}

/**
 * Official Desktop Extensions residual:
 * overview G (c71860c77-CrCPjj7D) + advanced/directory (cf4f70727-B4IcTbZO).
 * Message ids only from ion-dist catalogs — do not invent unofficial copy.
 */
export const EXTENSIONS_SETTINGS_MESSAGES = {
  extensions: { defaultMessage: "Extensions", id: "nb2FlN/G2m" },
  extensionsDescription: {
    defaultMessage:
      "Allow Claude to directly interact with apps, data, and tools on your computer.",
    id: "t0eCW57c4v",
  },
  browseExtensions: { defaultMessage: "Browse extensions", id: "IOJv7Fvf16" },
  advancedSettings: { defaultMessage: "Advanced settings", id: "V72EhnbTFu" },
  dragInstallHint: {
    defaultMessage: "Drag .MCPB or .DXT files here to install",
    id: "5px1rJwipu",
  },
  loadingExtensions: { defaultMessage: "Loading extensions...", id: "6y73EozVn4" },
  errorLoadingExtensions: {
    defaultMessage: "Error loading extensions",
    id: "VqNnA6EFU2",
  },
  /** Official I3IckjCnVT — ICU `{error}`; format via formatFailedToHandleFile. */
  failedToHandleFile: {
    defaultMessage: "Failed to handle file: {error}",
    id: "I3IckjCnVT",
  },
  uninstall: { defaultMessage: "Uninstall", id: "AaJVslgu7i" },
  notAllowedInOrg: {
    defaultMessage: "Not allowed in your current organization.",
    id: "G9SAoL8gfw",
  },
  installedOnYourComputer: {
    defaultMessage: "Installed on your computer",
    id: "r8YSLkTFDi",
  },
  allExtensions: { defaultMessage: "All extensions", id: "BYTC25E9Co" },
  allExtensionsAlt: { defaultMessage: "All extensions", id: "UT4QFKtQJC" },
  extensionSettings: { defaultMessage: "Extension Settings", id: "k9Z+ZYPJTY" },
  enableAutoUpdates: {
    defaultMessage: "Enable auto-updates for extensions",
    id: "xBU5hYIiNs",
  },
  enableAutoUpdatesDescription: {
    defaultMessage:
      "Automatically update extensions when new versions are available. If disabled, you’ll need to manually update extensions.",
    id: "Jk0XoMOwZo",
  },
  useBuiltInNode: {
    defaultMessage: "Use Built-in Node.js for MCP",
    id: "TlT44L+Q3V",
  },
  useBuiltInNodeDescription: {
    defaultMessage:
      "If enabled, Claude will never use the system Node.js for extension MCP servers. This happens automatically when system’s Node.js is missing or outdated. ",
    id: "SwdskAOTqO",
  },
  detectedTools: { defaultMessage: "Detected tools", id: "klUsQACr00" },
  notFound: { defaultMessage: "Not found", id: "7Nqmtacz2G" },
  builtInVersion: { defaultMessage: "(built-in: {version})", id: "6IL37hqfNA" },
  extensionDeveloper: { defaultMessage: "Extension Developer", id: "t8oBSUhI+t" },
  developerToolsWarning: {
    defaultMessage:
      "These tools are intended for extension developers only. Using them incorrectly may cause extensions to malfunction or compromise your system security.",
    id: "IngIIhcydJ",
  },
  installExtension: { defaultMessage: "Install Extension", id: "dlRg2g+FI2" },
  installUnpackedExtension: {
    defaultMessage: "Install Unpacked Extension",
    id: "lCitlUbFyR",
  },
  openExtensionsFolder: {
    defaultMessage: "Open Extensions Folder",
    id: "JhgkMfMLy7",
  },
  openExtensionSettingsFolder: {
    defaultMessage: "Open Extension Settings Folder",
    id: "TR3b4qu5N0",
  },
  extensionNotFound: { defaultMessage: "Extension not found", id: "B1m0p6QehJ" },
  manageDirectoryTitle: {
    defaultMessage: "[ANT ONLY] Manage global extension directory",
    id: "aJgWvXSF0F",
  },
  manageDirectoryDescription: {
    defaultMessage: "Upload, update, delete, and manage extensions in the directory",
    id: "vbBWdCj1MW",
  },
  searchExtensions: { defaultMessage: "Search extensions...", id: "D66hpdtxaF" },
  uploadNewExtension: { defaultMessage: "Upload new extension", id: "tflyZUc7rl" },
  uploadNewExtensionDescription: {
    defaultMessage: "Add a new extension to the directory",
    id: "2frqH5aYaj",
  },
  noExtensionsFound: { defaultMessage: "No extensions found", id: "obHpf0GvV7" },
  noExtensionsInDirectory: {
    defaultMessage: "No extensions are available in the directory",
    id: "cDtj8ThZ98",
  },
  customBadge: { defaultMessage: "CUSTOM", id: "KWaPXIuxTm" },
  disabledBadge: { defaultMessage: "DISABLED", id: "9x1mcjFvDM" },
  configure: { defaultMessage: "Configure", id: "VyyoA+XMVN" },
  moreOptions: { defaultMessage: "More options", id: "WDBdrgEGU2" },
  details: { defaultMessage: "Details", id: "euu2s475KB" },
  /** Official z NUX (c71860c77): VP4e+7wPv7 + /WjAw+SZxj until 2025-09-01 or dismissed. */
  wantToBuildExtension: {
    defaultMessage: "Want to build and share your own desktop extension?",
    id: "VP4e+7wPv7",
  },
  learnMore: { defaultMessage: "Learn more", id: "/WjAw+SZxj" },
  /** Official Pe (c71860c77-B8t): Enabled / Disabled status next to detail toggle. */
  extensionEnabled: { defaultMessage: "Enabled", id: "cnxLJKBabd" },
  extensionDisabled: { defaultMessage: "Disabled", id: "4PQSGeQCas" },
  desktopExtensionEnabledToggle: {
    defaultMessage: "Desktop extension enabled toggle",
    id: "WJgYgSnFbD",
  },
  failedToSaveAutoUpdate: {
    defaultMessage: "Failed to save auto-update setting",
    id: "01AM3gDtkx",
  },
  failedToSaveNodeSetting: {
    defaultMessage: "Failed to save Node.js setting",
    id: "H0s1jLN18x",
  },
  failedToInstallUnpacked: {
    defaultMessage: "Failed to install unpacked extension",
    id: "NxMw3h/xRT",
  },
  failedToLoadExtensionSettings: {
    defaultMessage: "Failed to load extension settings",
    id: "S4jlqK+Ks2",
  },
} as const satisfies MessageDescriptors;

export function useExtensionsSettingsText() {
  return useI18nText(EXTENSIONS_SETTINGS_MESSAGES);
}

/**
 * Official Desktop Developer / Local MCP (cadc35a07-DqmNVATl R/D):
 * title 7+U8x5o7v9 + description h2kOgf50w3; empty TrS+kwadjI + glyph _;
 * Edit Config Vvus2ifAny (revealConfig); Developer docs J1rj3Exw6V.
 * List residual: View Logs / Delete / Command / Arguments / Error / Advanced.
 */
export const DEVELOPER_SETTINGS_MESSAGES = {
  localMcpServers: { defaultMessage: "Local MCP servers", id: "7+U8x5o7v9" },
  localMcpServersDescription: {
    defaultMessage: "Add and manage MCP servers that you’re working on. ",
    id: "h2kOgf50w3",
  },
  noServersAdded: { defaultMessage: "No servers added", id: "TrS+kwadjI" },
  editConfig: { defaultMessage: "Edit Config", id: "Vvus2ifAny" },
  developerDocs: { defaultMessage: "Developer docs", id: "J1rj3Exw6V" },
  failedToLoadConfigs: {
    defaultMessage: "Failed to load MCP server configurations",
    id: "weK5eotSU/",
  },
  viewLogs: { defaultMessage: "View Logs", id: "zvT1bjOqfj" },
  delete: { defaultMessage: "Delete", id: "L32WRR6NOL" },
  managedByExtension: {
    defaultMessage: "This server is managed by an extension",
    id: "HC0OdPtRvg",
  },
  command: { defaultMessage: "Command", id: "urCd4k/cE0" },
  arguments: { defaultMessage: "Arguments", id: "pgaCSv2/6H" },
  error: { defaultMessage: "Error", id: "zCIK9K8J4a" },
  advancedOptions: { defaultMessage: "Advanced options", id: "CZwl8X2D85" },
  environmentVariables: {
    defaultMessage: "Environment variables",
    id: "4qP7MjrQfC",
  },
  /** Official E4wAMW5Ily — ICU `{serverKey}`. */
  confirmDeleteServer: {
    defaultMessage: "Are you sure you want to remove the MCP server “{serverKey}”?",
    id: "E4wAMW5Ily",
  },
  desktopExtensionsDisabled: {
    defaultMessage:
      "Desktop extensions are disabled on this device. Please contact your IT administrator to enable desktop extensions.",
    id: "edWlt+5w83",
  },
  developerMcpDisabled: {
    defaultMessage:
      "Developer MCP servers are disabled on this device. Please contact your IT administrator to enable developer MCP servers.",
    id: "GDoDijLG+q",
  },
  bothDisabled: {
    defaultMessage:
      "Desktop extensions and developer MCP servers are disabled on this device. Please contact your IT administrator to enable these features.",
    id: "IeexSlMkuP",
  },
} as const satisfies MessageDescriptors;

export function useDeveloperSettingsText() {
  return useI18nText(DEVELOPER_SETTINGS_MESSAGES);
}

/** Official I3IckjCnVT / 6IL37hqfNA simple brace residual. */
export function formatExtensionsTemplate(
  template: string,
  values: Record<string, string>,
): string {
  let out = template;
  for (const [key, value] of Object.entries(values)) {
    out = out.replaceAll(`{${key}}`, value);
  }
  return out;
}

/**
 * Official Privacy personal page ln (cf4f70727-a7CVSvFQ gateway provider card):
 * tgkg69DKCl intro + ULnTQCHxiV / MYYAX2WEkL lists.
 * Anthropic-hosted training toggles are not in this residual arm — do not invent.
 */
export const PRIVACY_SETTINGS_MESSAGES = {
  gatewayIntro: {
    defaultMessage:
      "You’re running Claude through your organization’s own inference provider ({providerDisplayName}). Your conversations are sent there, not to Anthropic, and are governed by your organization’s agreement with that provider.",
    id: "tgkg69DKCl",
  },
  yourProvider: { defaultMessage: "your provider", id: "60YXvmzIxf" },
  whatAnthropicDoesNotSee: { defaultMessage: "What Anthropic doesn’t see", id: "ULnTQCHxiV" },
  promptsResponsesContent: {
    defaultMessage: "Your prompts, Claude’s responses, or any conversation content",
    id: "fVfPjDIwfi",
  },
  filesCodeWorkspace: {
    defaultMessage: "Your files, code, or workspace contents",
    id: "qgN98bidUV",
  },
  identityAccountDetails: {
    defaultMessage: "Your identity or account details",
    id: "CbPYtuP6+N",
  },
  whatAnthropicMayReceive: {
    defaultMessage: "What Anthropic may receive (configured by your organization)",
    id: "MYYAX2WEkL",
  },
  crashReports: {
    defaultMessage: "Crash reports and error diagnostics, so we can fix bugs",
    id: "16+ehubl/n",
  },
  anonymousUsageMetrics: {
    defaultMessage: "Anonymous usage metrics including usage counts (not conversation content)",
    id: "U5lBq+CZ7G",
  },
  updateCheckRequests: {
    defaultMessage: "Update-check requests, so the app can stay current",
    id: "0rLmv1esFb",
  },
  diagnosticReport: {
    defaultMessage: "A diagnostic report, only if you explicitly choose “Send to Anthropic”",
    id: "xyS7d891o+",
  },
} as const satisfies MessageDescriptors;

export function usePrivacySettingsText() {
  return useI18nText(PRIVACY_SETTINGS_MESSAGES);
}

/** Official tgkg69DKCl `{providerDisplayName}` ICU residual (simple brace replace). */
export function formatPrivacyGatewayIntro(template: string, providerDisplayName: string): string {
  return template.replaceAll("{providerDisplayName}", providerDisplayName);
}

/** Official ts Browser Use description residual (c71860c77 0Jh6jsTpeC). */
const BROWSER_USE_LEARN_MORE_HREF =
  "https://support.claude.com/en/articles/12902428-using-claude-in-chrome-safely";

export function renderDesktopBrowserUseDescription(message: string): ReactNode {
  return renderMessageWithLink(message, BROWSER_USE_LEARN_MORE_HREF);
}

const LEARN_MORE_HREF =
  "https://support.claude.com/en/articles/11817273-using-claude-s-chat-search-and-memory-to-build-on-previous-context";

const learnMoreLinkClass =
  "cds-reset inline cursor-pointer rounded-[2px] text-accent underline decoration-[color-mix(in_srgb,currentColor,transparent_60%)] underline-offset-[3px] outline-none transition duration-fast hover:decoration-current focus-visible:shadow-focus focus-visible:decoration-current";

/** Official FormattedMessage residual: `<a>…</a>` → external learn-more link. */
export function renderMessageWithLearnMore(
  message: string,
  href: string = LEARN_MORE_HREF,
): ReactNode {
  const match = /^(.*?)<a>(.*?)<\/a>(.*)$/s.exec(message);
  if (!match) return message;
  const [, before, label, after] = match;
  return createElement(
    "span",
    null,
    before,
    createElement(
      "a",
      {
        className: learnMoreLinkClass,
        href,
        rel: "noopener noreferrer",
        target: "_blank",
      },
      label,
    ),
    after,
  );
}

/**
 * Official Skills residual (c71860c77 Ee / ye from cf4f70727-a7CVSvFQ `Rt`):
 * `<link>…</link>` → in-app SPA link via ye("/customize/skills").
 * When `onNavigate` is provided (desktop shell history.pushState path),
 * intercept primary click so we do not full-reload the shell.
 */
export function renderMessageWithLink(
  message: string,
  href: string,
  className: string = learnMoreLinkClass,
  onNavigate?: (href: string) => void,
): ReactNode {
  const match = /^(.*?)<link>(.*?)<\/link>(.*)$/s.exec(message);
  if (!match) return message;
  const [, before, label, after] = match;
  const isInApp = href.startsWith("/") && !href.startsWith("//");
  return createElement(
    "span",
    null,
    before,
    createElement(
      "a",
      {
        className,
        href,
        ...(onNavigate && isInApp
          ? {
              onClick: (event: MouseEvent<HTMLAnchorElement>) => {
                // Official in-app Link: left-click without modifier → SPA navigate.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) {
                  return;
                }
                event.preventDefault();
                onNavigate(href);
              },
            }
          : null),
      },
      label,
    ),
    after,
  );
}

const INSTRUCTIONS_AUP_HREF = "https://www.anthropic.com/legal/aup";
const INSTRUCTIONS_LEARN_MORE_HREF =
  "https://support.anthropic.com/en/articles/10185728-understanding-claude-s-personalization-features";

/**
 * Official X description residual (SwO3Dd2FGA values aupLink / learnMoreLink).
 * Catalogs that flatten tags still render as plain text + optional trailing learn-more.
 */
export function renderInstructionsDescription(message: string): ReactNode {
  const linkClass = "!text-inherit underline-offset-2 hover:underline";
  const parts: ReactNode[] = [];
  let rest = message;
  let key = 0;

  while (rest.length > 0) {
    const aup = /<aupLink>(.*?)<\/aupLink>/s.exec(rest);
    const learn = /<learnMoreLink>(.*?)<\/learnMoreLink>/s.exec(rest);
    const next =
      aup && learn
        ? aup.index! <= learn.index!
          ? { kind: "aup" as const, match: aup }
          : { kind: "learn" as const, match: learn }
        : aup
          ? { kind: "aup" as const, match: aup }
          : learn
            ? { kind: "learn" as const, match: learn }
            : null;

    if (!next || next.match.index == null) {
      parts.push(rest);
      break;
    }

    const index = next.match.index;
    if (index > 0) parts.push(rest.slice(0, index));
    const label = next.match[1] ?? "";
    const href = next.kind === "aup" ? INSTRUCTIONS_AUP_HREF : INSTRUCTIONS_LEARN_MORE_HREF;
    parts.push(
      createElement(
        "a",
        {
          key: `instr-link-${key++}`,
          className: linkClass,
          href,
          rel: "noopener noreferrer",
          target: "_blank",
        },
        label,
      ),
    );
    rest = rest.slice(index + next.match[0].length);
  }

  return createElement("span", null, ...parts);
}
