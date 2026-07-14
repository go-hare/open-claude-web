import type { CSSProperties } from "react";

import { OFFICIAL_ICON_PATHS } from "./officialIconPaths";

const ICON_CODEPOINTS = {
  Activity: 57344,
  Add: 57345,
  AddCircle: 57346,
  Agent: 57347,
  Alarm: 57348,
  Android: 57349,
  Ant: 57350,
  Apple: 57351,
  Archive: 57352,
  ArrowDown: 57353,
  ArrowDownCircle: 57354,
  ArrowInSquare: 57355,
  ArrowLeft: 57356,
  ArrowLeftCircle: 57357,
  ArrowOutSquare: 57358,
  ArrowReturn: 57359,
  ArrowRight: 57360,
  ArrowRightCircle: 57361,
  ArrowSplitRight: 57362,
  ArrowUp: 57363,
  ArrowUpCircle: 57364,
  ArrowUpRight: 57365,
  ArrowsOut: 57366,
  Artifacts: 57367,
  Atom: 57368,
  Attachment: 57369,
  Batch: 57370,
  Beaker: 57371,
  Binoculars: 57372,
  Book: 57373,
  BookClosed: 57374,
  BookText: 57375,
  Box: 57376,
  BrowseSelect: 57377,
  Bullhorn: 57378,
  Cache: 57379,
  Calendar: 57380,
  Camera: 57381,
  Capacity: 57382,
  CaretDown: 57383,
  CaretDownUp: 57384,
  CaretLeft: 57385,
  CaretRight: 57386,
  CaretUp: 57387,
  CaretUpDown: 57388,
  ChangesPlusMinus: 57389,
  ChangesPlusMinusFilled: 57390,
  Chart: 57391,
  ChartLine: 57392,
  Chat: 57393,
  ChatAdd: 57394,
  ChatAddFilled: 57395,
  ChatDelete: 57396,
  ChatDeleteFilled: 57397,
  ChatFilled: 57398,
  ChatSimple: 57399,
  ChatSimpleFilled: 57400,
  Chats: 57401,
  ChatsFilled: 57402,
  Check: 57403,
  CheckCircle: 57404,
  CheckCircleFilled: 57405,
  CheckDouble: 57406,
  Checklist: 57407,
  ChecklistFilled: 57408,
  Clipboard: 57409,
  ClipboardArrow: 57410,
  Clock: 57411,
  Cloud: 57412,
  CloudFilled: 57413,
  CloudSlash: 57414,
  CloudSlashFilled: 57415,
  Code: 57416,
  CodeBlock: 57417,
  CodeBrackets: 57418,
  CodeFilled: 57419,
  CoffeeCup: 57420,
  Collapse: 57421,
  CommandCard: 57422,
  CommandLine: 57423,
  CommandLineFilled: 57424,
  CommandLinePrompt: 57425,
  Compact: 57426,
  Computer: 57427,
  Concierge: 57428,
  Connectors: 57429,
  Copy: 57430,
  Create: 57431,
  CreditCard: 57432,
  Cursor: 57433,
  CursorFilled: 57434,
  DNA: 57435,
  Database: 57436,
  Disconnect: 57437,
  Dispatch: 57438,
  DollarSign: 57439,
  DotsCircle: 57440,
  DotsHorizontal: 57441,
  DotsVertical: 57442,
  Download: 57443,
  Edit: 57444,
  Email: 57445,
  Evals: 57446,
  Expand: 57447,
  ExtendedThinking: 57448,
  Eye: 57449,
  EyeSlash: 57450,
  Fastforward: 57451,
  File: 57452,
  FileAdd: 57453,
  FileUpload: 57454,
  Files: 57455,
  Filter: 57456,
  Flag: 57457,
  Folder: 57458,
  FolderOpen: 57459,
  FolderPlus: 57460,
  Ghost: 57461,
  GhostFilled: 57462,
  Gift: 57463,
  GitBranch: 57464,
  GitCommit: 57465,
  GitDiff: 57466,
  GitFork: 57467,
  GitMerge: 57468,
  GitMergedConflict: 57469,
  GitMergedSimple: 57470,
  GitPullRequest: 57471,
  GitPullRequestClosed: 57472,
  GitPullRequestDraft: 57473,
  Globe: 57474,
  GraduationCap: 57475,
  Grid: 57476,
  Hand: 57477,
  HandHeart: 57478,
  Haptics: 57479,
  Help: 57480,
  History: 57481,
  Home: 57482,
  ID: 57483,
  Image: 57484,
  Indent: 57485,
  InfoSimple: 57486,
  Info: 57487,
  Interactive: 57488,
  Key: 57489,
  Keyboard: 57490,
  Laptop: 57491,
  LaptopFilled: 57492,
  LaptopSlash: 57493,
  Library: 57494,
  Lightbulb: 57495,
  Lightning: 57496,
  Link: 57497,
  LinkSimple: 57498,
  ListAdd: 57499,
  ListBullet: 57500,
  ListNumbered: 57501,
  Location: 57502,
  LocationQuestionMark: 57503,
  LocationSlash: 57504,
  Lock: 57505,
  LockOpen: 57506,
  LockShield: 57507,
  Logout: 57508,
  Mailbox: 57509,
  MapPin: 57510,
  Mcp: 57511,
  Memory: 57512,
  Mention: 57513,
  Menu: 57514,
  Microphone: 57515,
  MicrophoneFilled: 57516,
  MicrophoneSlash: 57517,
  Minus: 57518,
  MobilePhone: 57519,
  Moon: 57520,
  MoonFilled: 57521,
  MoonStars: 57522,
  Note: 57523,
  Notification: 57524,
  NotificationSlash: 57525,
  Organization: 57526,
  Owl: 57527,
  Palette: 57528,
  PaletteFilled: 57529,
  PaperPlane: 57530,
  Pause: 57531,
  Phone: 57532,
  Pin: 57533,
  PinFilled: 57534,
  PinSlash: 57535,
  Placeholder: 57536,
  Play: 57537,
  PlayCircle: 57538,
  PlayCircleFilled: 57539,
  PlayFilled: 57540,
  Plugin: 57541,
  Press: 57542,
  Pro: 57543,
  Prohibit: 57544,
  Projects: 57545,
  ProjectsFilled: 57546,
  ProjectsX: 57547,
  Prompt: 57548,
  Recording: 57549,
  Reload: 57550,
  Reorder: 57551,
  Research: 57552,
  Screenshare: 57553,
  Scroll: 57554,
  Search: 57555,
  SearchCircle: 57556,
  Select: 57557,
  Settings: 57558,
  Shapes: 57559,
  Share: 57560,
  ShareAndroid: 57561,
  ShareApple: 57562,
  ShieldSearch: 57563,
  Shuffle: 57564,
  Sidebar: 57565,
  SidebarClose: 57566,
  SidebarOpen: 57567,
  Signpost: 57568,
  SlashShortcutCommand: 57569,
  Slides: 57570,
  Sort: 57571,
  Speaker: 57572,
  Spinner: 57573,
  Spreadsheet: 57574,
  Star: 57575,
  StarFilled: 57576,
  StarSlash: 57577,
  Stop: 57578,
  StopCircle: 57579,
  StopFilled: 57580,
  Styles: 57581,
  Sun: 57582,
  SunFilled: 57583,
  SunHorizon: 57584,
  Tasks: 57585,
  Team: 57586,
  Temperature: 57587,
  TemperatureSimple: 57588,
  TextAa: 57589,
  TextBold: 57590,
  TextItalics: 57591,
  TextUnderline: 57592,
  ThumbsDown: 57593,
  ThumbsDownFilled: 57594,
  ThumbsUp: 57595,
  ThumbsUpFilled: 57596,
  Timer: 57597,
  Toggles: 57598,
  Token: 57599,
  Tool: 57600,
  Trash: 57601,
  Trust: 57602,
  Upload: 57603,
  User: 57604,
  UserCircle: 57605,
  Users: 57606,
  Verified: 57607,
  Voice: 57608,
  Warning: 57609,
  WarningCircle: 57610,
  WarningShield: 57611,
  Workspace: 57612,
  Wrench: 57613,
  WrenchFilled: 57614,
  X: 57615,
  XCircle: 57616,
} as const;

const ICON_ALIASES: Record<string, keyof typeof ICON_CODEPOINTS> = {
  // 本地旧命名 -> 原版 Anthropicons 命名
  sidebar: "Sidebar",
  search: "Search",
  arrowLeft: "ArrowLeft",
  plus: "Add",
  plusSmall: "Add",
  code: "Code",
  clock: "Clock",
  connectors: "Connectors",
  plugin: "Plugin",
  briefcase: "Tool",
  project: "Projects",
  pin: "Pin",
  checklist: "Checklist",
  sliders: "Toggles",
  toggles: "Toggles",
  filter: "Filter",
  settings2Sliders: "Filter",
  settings: "Settings",
  wrench: "Wrench",
  chart: "Chart",
  globe: "Globe",
  help: "Help",
  download: "Download",
  copy: "Copy",
  users: "Users",
  team: "Team",
  info: "Info",
  logout: "Logout",
  check: "Check",
  caretRight: "CaretRight",
  external: "ArrowOutSquare",
  x: "X",
  caretDown: "CaretDown",
  spark: "Star",
  AgentPlanPath: "Agent",
  Blocks: "Box",
  ChangesDiffPlusMinusBox: "ChangesPlusMinus",
  CheckList: "Checklist",
  ChevronDownSmall: "CaretDown",
  ChevronRightMedium: "CaretRight",
  ClockTimeslot: "Clock",
  Folder1: "Folder",
  NoteSquareLines: "Note",
  PlusSmall: "Add",
  ShareArrowOutOfBox: "Share",
  SidebarSimpleRightSquare: "Sidebar",
  SystemComputerLaptopMacbook: "Computer",
  TerminalOpenCommandLine: "CommandLine",
  TitleCaseFontSize: "TextAa",
  TrashCanRound: "Trash",
  XCrossCloseMedium: "X",
  // decompiled 里部分 icon 字段会被翻译成中文，兜底映射回原名
  项目: "Projects",
  代码: "Code",
  搜索: "Search",
};

const ICON_SIZES = {
  xs: { px: 12, stroke: { regular: 0.8 } },
  sm: { px: 16, stroke: { regular: 1, strong: 1.25 } },
  md: { px: 20, stroke: { regular: 1.2, strong: 1.5 } },
  lg: { px: 24, stroke: { regular: 1.4 } },
  xl: { px: 28, stroke: { regular: 1.6 } },
  xxl: { px: 32, stroke: { regular: 1.8 } },
} as const;

const ICON_SIZE_ORDER = ["xs", "sm", "md", "lg", "xl", "xxl"] as const;

const OFFICIAL_VIEW_BOX = {
  s: "0 0 12 12",
  m: "0 0 16 16",
  l: "0 0 24 24",
} as const;

const OFFICIAL_SIZE_FOR_ICON_SIZE = {
  xs: "s",
  sm: "m",
  md: "l",
  lg: "l",
  xl: "xl",
  xxl: "xl",
} as const;

const OFFICIAL_PATH_SIZE = {
  s: "s",
  m: "m",
  l: "l",
  xl: "l",
} as const;

const OFFICIAL_SIZE_STYLE = {
  xs: "var(--class-small-icon, 12px)",
  sm: "var(--class-base-icon, 16px)",
  md: "var(--class-large-icon, 20px)",
  lg: "var(--class-xl-icon, 24px)",
  xl: "var(--class-xl-icon, 28px)",
  xxl: "var(--class-xl-icon, 32px)",
} as const;

const OFFICIAL_ICON_NAMES = Array.from(
  new Set(Object.keys(OFFICIAL_ICON_PATHS).map((key) => key.split("/")[0]).filter(Boolean)),
);

const OFFICIAL_ICON_NAME_BY_LOWER = new Map(OFFICIAL_ICON_NAMES.map((name) => [name.toLowerCase(), name]));

const OFFICIAL_ICON_ALIASES: Record<string, string> = {
  Activity: "StatusInProgressQuarterCircle",
  Add: "PlusSmall",
  Agent: "AgentPlanPath",
  Alarm: "ClockTimeslot",
  Archive: "Bookmark",
  ArrowOutSquare: "SquareArrowTopRightOpenLink",
  ArrowReturn: "ReturnArrowCornerDownLeft",
  ArrowSplitRight: "SidebarSimpleRightSquare",
  Blocks: "Blocks",
  Calendar: "CalendarTimePlanSchedule",
  CaretDown: "ChevronDownSmall",
  CaretLeft: "ChevronLeftSmall",
  CaretRight: "ChevronRightMedium",
  CaretUp: "ChevronUpSmall",
  ChangesPlusMinus: "ChangesDiffPlusMinusBox",
  ChangesPlusMinusFilled: "ChangesDiffPlusMinusBox",
  Chat: "ChatBubble",
  ChatSimple: "ChatBubble",
  Check: "CheckSelection",
  Checklist: "CheckList",
  Clock: "ClockTimeslot",
  CommandLine: "ConsoleTerminal",
  Computer: "SystemComputerLaptopMacbook",
  Connectors: "PluginBlockCustomize",
  Copy: "CopySquareBehind",
  Edit: "Pencil",
  File: "NoteSquareLines",
  FileAdd: "PaperclipAttach",
  Files: "NoteSquareLines",
  Attachment: "PaperclipAttach",
  Folder: "Folder1",
  FolderOpen: "Folder1Open",
  FolderPlus: "FolderAddRight",
  FolderAddRight: "FolderAddRight",
  PaperclipAttach: "PaperclipAttach",
  Plugin: "Plugin",
  Projects: "Projects",
  GitDiff: "ChangesDiffPlusMinusBox",
  Laptop: "SystemComputerLaptopMacbook",
  ListBullet: "NumberedList",
  Menu: "MenuLines",
  Note: "NoteSquareLines",
  PinSlash: "Unpin",
  Plus: "PlusSmall",
  ProjectsFilled: "Projects",
  Reload: "ArrowRefreshRedo",
  Settings: "GearSettings",
  Share: "ShareArrowOutOfBox",
  Sidebar: "SidebarSimpleLeftWide",
  SidebarClose: "CloseBackArrowWallLeft",
  SidebarOpen: "OpenEndForwardArrowWallRight",
  Sort: "SortFilter",
  Tasks: "TasksTodosPlans",
  Tool: "Toolbox",
  Toggles: "Settings2Sliders",
  Trash: "TrashCanRound",
  Wrench: "Toolbox",
  X: "XCrossCloseMedium",
  // 本地旧命名 / 小写别名 -> 官方 SVG icon 名
  arrowLeft: "ArrowLeft",
  caretDown: "ChevronDownSmall",
  caretRight: "ChevronRightMedium",
  check: "CheckSelection",
  checklist: "CheckList",
  code: "Code",
  connectors: "PluginBlockCustomize",
  copy: "CopySquareBehind",
  external: "SquareArrowTopRightOpenLink",
  filter: "Settings2Sliders",
  pin: "Pin",
  plugin: "Plugin",
  plus: "PlusSmall",
  plusSmall: "PlusSmall",
  project: "Projects",
  search: "Search",
  settings: "GearSettings",
  settings2Sliders: "Settings2Sliders",
  sidebar: "SidebarSimpleLeftWide",
  sliders: "Settings2Sliders",
  spark: "LightningBoltZap",
  toggles: "Settings2Sliders",
  wrench: "Toolbox",
  x: "XCrossCloseMedium",
  // 官方 decompiled 名保持直通，避免再映射到旧 font glyph
  AgentPlanPath: "AgentPlanPath",
  ChangesDiffPlusMinusBox: "ChangesDiffPlusMinusBox",
  CheckList: "CheckList",
  ChevronDownSmall: "ChevronDownSmall",
  ChevronRightMedium: "ChevronRightMedium",
  ClockTimeslot: "ClockTimeslot",
  ConsoleTerminal: "ConsoleTerminal",
  Folder1: "Folder1",
  NoteSquareLines: "NoteSquareLines",
  ShareArrowOutOfBox: "ShareArrowOutOfBox",
  SidebarSimpleRightSquare: "SidebarSimpleRightSquare",
  SystemComputerLaptopMacbook: "SystemComputerLaptopMacbook",
  TerminalOpenCommandLine: "TerminalOpenCommandLine",
  TitleCaseFontSize: "TitleCaseFontSize",
  TrashCanRound: "TrashCanRound",
  XCrossCloseMedium: "XCrossCloseMedium",
  // decompiled 里部分 icon 字段会被翻译成中文
  代码: "Code",
  搜索: "Search",
  项目: "Projects",
};

const WEIGHT_RANGES: Record<16 | 20, { lo: number; hi: number }> = {
  16: { lo: 0.8, hi: 1.25 },
  20: { lo: 1.125, hi: 1.8 },
};

type IconSize = keyof typeof ICON_SIZES;
type OfficialIconSize = keyof typeof OFFICIAL_VIEW_BOX;
type IconSizeProp = IconSize | OfficialIconSize;

const OFFICIAL_SIZE_ALIAS_TO_ICON_SIZE: Record<OfficialIconSize, IconSize> = {
  s: "xs",
  m: "sm",
  l: "md",
};

function normalizeIconSize(size: IconSizeProp): IconSize {
  return size in ICON_SIZES ? (size as IconSize) : OFFICIAL_SIZE_ALIAS_TO_ICON_SIZE[size as OfficialIconSize];
}

type IconProps = {
  name?: string;
  icon?: { name: string };
  size?: IconSizeProp;
  customSize?: number;
  bold?: boolean;
  alt?: string;
  className?: string;
  style?: CSSProperties;
};

function nearestSize(pixelSize: number): IconSize {
  let nearest: IconSize = ICON_SIZE_ORDER[0];
  let nearestDistance = Infinity;

  for (const size of ICON_SIZE_ORDER) {
    const distance = Math.abs(ICON_SIZES[size].px - pixelSize);
    if (distance <= nearestDistance) {
      nearest = size;
      nearestDistance = distance;
    }
  }

  return nearest;
}

function iconWeight(stroke: number, masterSize: 16 | 20, pixelSize: number) {
  const scaledStroke = (stroke * masterSize) / pixelSize;
  const range = WEIGHT_RANGES[masterSize];
  const value = 400 + (700 - 400) * ((scaledStroke - range.lo) / (range.hi - range.lo));
  return Math.round(Math.max(400, Math.min(700, value)) * 10) / 10;
}

function resolveIconName(rawName: string | undefined): keyof typeof ICON_CODEPOINTS | undefined {
  if (!rawName) return undefined;
  if (rawName in ICON_CODEPOINTS) return rawName as keyof typeof ICON_CODEPOINTS;
  if (rawName in ICON_ALIASES) return ICON_ALIASES[rawName];

  const lowerRawName = rawName.toLowerCase();
  const originalName = Object.keys(ICON_CODEPOINTS).find((key) => key.toLowerCase() === lowerRawName);
  return originalName as keyof typeof ICON_CODEPOINTS | undefined;
}

function resolveOfficialIconName(rawName: string | undefined) {
  if (!rawName) return undefined;
  const alias = OFFICIAL_ICON_ALIASES[rawName];
  if (alias) return alias;
  return OFFICIAL_ICON_NAME_BY_LOWER.get(rawName.toLowerCase());
}

function resolveOfficialIconPaths(rawName: string | undefined, iconSize: IconSize, filled: boolean) {
  const officialName = resolveOfficialIconName(rawName);
  if (!officialName) return undefined;

  const officialSize = OFFICIAL_SIZE_FOR_ICON_SIZE[iconSize];
  const pathSize = OFFICIAL_PATH_SIZE[officialSize];
  const preferredFill = filled ? "filled" : "outline";

  return (
    OFFICIAL_ICON_PATHS[`${officialName}/${pathSize}/${preferredFill}`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/${pathSize}/outline`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/m/${preferredFill}`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/m/outline`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/s/${preferredFill}`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/s/outline`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/l/${preferredFill}`] ??
    OFFICIAL_ICON_PATHS[`${officialName}/l/outline`]
  );
}

export function Icon({ name, icon, size = "sm", customSize, bold = false, alt, className, style }: IconProps) {
  const rawName = name ?? icon?.name;
  const selectedSize = customSize === undefined ? normalizeIconSize(size) : nearestSize(customSize);
  const pixelSize = customSize ?? ICON_SIZES[selectedSize].px;
  const officialPaths = resolveOfficialIconPaths(rawName, selectedSize, bold);

  if (officialPaths) {
    const officialSize = OFFICIAL_SIZE_FOR_ICON_SIZE[selectedSize];
    const pathSize = OFFICIAL_PATH_SIZE[officialSize];
    const renderedSize = customSize ?? OFFICIAL_SIZE_STYLE[selectedSize];

    return (
      <svg
        viewBox={OFFICIAL_VIEW_BOX[pathSize]}
        fill="none"
        role={alt ? "img" : undefined}
        aria-hidden={!alt || undefined}
        aria-label={alt || undefined}
        className={className}
        style={{ width: renderedSize, height: renderedSize, flexShrink: 0, ...style }}
      >
        {officialPaths.map((path, index) => (
          <path d={path} fill="currentColor" key={index} />
        ))}
      </svg>
    );
  }

  const iconName = resolveIconName(rawName);
  const stroke = ICON_SIZES[selectedSize].stroke;
  const masterSize: 16 | 20 = pixelSize <= 18 ? 16 : 20;
  const regularStroke = bold && "strong" in stroke ? stroke.strong : stroke.regular;
  const codePoint = iconName ? ICON_CODEPOINTS[iconName] : undefined;

  return (
    <span
      data-cds="Icon"
      role={alt ? "img" : undefined}
      aria-hidden={!alt || undefined}
      aria-label={alt || undefined}
      className={className}
      style={
        {
          fontFamily: "var(--font-anthropicons, Anthropicons-Variable)",
          fontFeatureSettings: '"liga" 0',
          fontOpticalSizing: "auto",
          fontStyle: "normal",
          fontVariationSettings: "normal",
          fontSize: pixelSize,
          fontWeight: iconWeight(regularStroke, masterSize, pixelSize),
          lineHeight: 1,
          width: "1em",
          height: "1em",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          userSelect: "none",
          ...style,
        }
      }
    >
      {codePoint !== undefined ? String.fromCodePoint(codePoint) : null}
    </span>
  );
}
