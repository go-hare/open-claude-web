import type { MessageDescriptors } from "../../i18n/footerMenuMessages";

/** Official YR residual (c11959232) — Views menu + open pane titles. */
export const VIEWS_MENU_MESSAGES = {
  views: { defaultMessage: "Views", id: "akF0LyBDxT" },
  preview: { defaultMessage: "Preview", id: "TJo5E6JuIN" },
  diff: { defaultMessage: "Changes", id: "dgqhUM6BxJ" },
  terminal: { defaultMessage: "Terminal", id: "GE7Vqpsyct" },
  files: { defaultMessage: "Files", id: "m4vqJl0/FT" },
  tasks: { defaultMessage: "Tasks", id: "yhU1etXT1A" },
  plan: { defaultMessage: "Plan", id: "fz0z4cb6fQ" },
  runs: { defaultMessage: "Runs", id: "W1Qs5OAf+0" },
  screen: { defaultMessage: "Screen", id: "kzaYlDwmLT" },
  file: { defaultMessage: "File", id: "gyrIElu9qY" },
  agent: { defaultMessage: "Agent", id: "QGVI63s1dJ" },
  /** Official p4 overflow — Background tasks (not always-on yhU1etXT1A Tasks). */
  backgroundTasks: { defaultMessage: "Background tasks", id: "PO+0DdDIId" },
  /** Official cf74 `ZT` / ce4f `ke` — session keep-awake (c593 `kp`). */
  keepComputerAwake: { defaultMessage: "Keep computer awake", id: "CapHOIPauL" },
  onlyForThisSession: { defaultMessage: "Only for this session", id: "SWSZIzLoC3" },
} satisfies MessageDescriptors;

/** Official cb61 `ze` Changes empty / fail (nM04gPHngB / Hvf2wzumza / ZSmll0R5ni). */
export const DIFF_PANE_MESSAGES = {
  noChangesToShow: { defaultMessage: "No changes to show", id: "nM04gPHngB" },
  couldntLoadTheChanges: { defaultMessage: "Couldn’t load the changes", id: "Hvf2wzumza" },
  changesNeedAGitRepository: { defaultMessage: "Changes need a Git repository", id: "ZSmll0R5ni" },
} satisfies MessageDescriptors;

/** Official c119 tC env pill copy — Local W4SaxYXWRk, tooltip ge+adwsPfE. */
export const COMPOSER_ORIGIN_MESSAGES = {
  local: { defaultMessage: "本地", id: "W4SaxYXWRk" },
  ssh: { defaultMessage: "SSH", id: "waUHa40VD6" },
  desktopOnly: { defaultMessage: "Desktop only", id: "hG0uP4177X" },
  whereClaudeRuns: { defaultMessage: "Where Claude runs", id: "ge+adwsPfE" },
  envSettingsRightArrow: { defaultMessage: ", environment settings, right arrow", id: "LspWKNOWte" },
} satisfies MessageDescriptors;

/** Official cc432 git / extra-folder pills (c11959232). */
export const COMPOSER_GIT_MESSAGES = {
  addAnotherFolder: { defaultMessage: "Add another folder", id: "WD5ZeePJtf" },
  addFolderToSession: { defaultMessage: "Add folder to session", id: "f/RPdup9RQ" },
  selectFolderForLocalSession: { defaultMessage: "Select folder for local session", id: "X+EIjDhedR" },
  addSshHost: { defaultMessage: "Add SSH host…", id: "Or2vJpOmcq" },
  searchBranches: { defaultMessage: "Search branches…", id: "NNBHaPuMiG" },
  noBranchesMatch: { defaultMessage: "No branches match.", id: "ldzIirO24u" },
  branchToStartFrom: { defaultMessage: "Branch to start from", id: "tMkmSMInmR" },
  removeName: { defaultMessage: "Remove {name}", id: "T0e6Lh8loG" },
  workInIsolatedCopy: { defaultMessage: "Work in an isolated copy of the repo", id: "2rWkXAFOKo" },
  worktree: { defaultMessage: "worktree", id: "D2W6fLXiNK" },
  workingDirectory: { defaultMessage: "Working directory", id: "KfDUBH9lwR" },
  selectFolderEllipsis: { defaultMessage: "Select folder…", id: "lkUuGjfbaq" },
  recent: { defaultMessage: "Recent", id: "iXpep1vGVo" },
  browseRemoteFolder: { defaultMessage: "Browse remote folder…", id: "ao+JnWIzyR" },
  openFolderEllipsis: { defaultMessage: "Open folder…", id: "YzhKoa+aW/" },
} satisfies MessageDescriptors;

/** Official WN plan comment popover (c11959232). */
export const PLAN_COMMENT_MESSAGES = {
  commentOnSelection: { defaultMessage: "Comment on selection", id: "FOrqFcMnhI" },
  planComment: { defaultMessage: "Plan comment", id: "jSxzRTbh1Z" },
  leaveACommentForClaude: { defaultMessage: "Leave a comment for Claude…", id: "C9CzAnCf9L" },
  selectAnyText: { defaultMessage: "Select any text to leave a comment for Claude", id: "XiB54yyk0q" },
} satisfies MessageDescriptors;

/** Official Tne Effort chip (c360 / c119 Pm). */
export const EFFORT_CONTROL_MESSAGES = {
  effort: { defaultMessage: "Effort", id: "VKZ/U8vAsk" },
  /** Official shared-100 `effortSelectorTrigger`. */
  effortSelectorTrigger: { defaultMessage: "Effort: {name}", id: "JtSAKJndrf" },
} satisfies MessageDescriptors;

/** Official Pk / bR effort ladder + Ultracode (c593 `hd` `ufa5QA7ilZ`). */
export const EFFORT_LEVEL_MESSAGES = {
  low: { defaultMessage: "Low", id: "477I0ggSYe" },
  medium: { defaultMessage: "Medium", id: "ovJ26CKo4Q" },
  high: { defaultMessage: "High", id: "AxMhQrcUDC" },
  extraHigh: { defaultMessage: "Extra high", id: "kDEj60CmLq" },
  max: { defaultMessage: "Max", id: "kkjl2vQekD" },
  ultracode: { defaultMessage: "Ultracode", id: "ufa5QA7ilZ" },
} satisfies MessageDescriptors;

/**
 * Official shared-8 `_j` Code Mode labels (envType local/ssh/wsl/bridge).
 * default → Manual `bEP1fZ8uSe` (not invent 询问权限).
 * bypass → `q29dVy10XD` (cowork/hub uses other ids).
 */
export const PERMISSION_MODE_MESSAGES = {
  manual: { defaultMessage: "Manual", id: "bEP1fZ8uSe" },
  acceptEdits: { defaultMessage: "Accept edits", id: "Vqv6GUqbKO" },
  plan: { defaultMessage: "Plan", id: "5L+Qiq71mH" },
  auto: { defaultMessage: "Auto", id: "09snYUm2u1" },
  bypassPermissions: { defaultMessage: "Bypass permissions", id: "q29dVy10XD" },
  /** Official composer Mode dropdown header. */
  mode: { defaultMessage: "Mode", id: "mrOnjMzgC4" },
} satisfies MessageDescriptors;

/** Official composer Models dropdown header (not invent 模型选择). */
export const COMPOSER_MODELS_HEADER_MESSAGES = {
  models: { defaultMessage: "Models", id: "blWvagsLt7" },
} satisfies MessageDescriptors;

/** Official cd5a Gv trailing running-tasks (TnXpPR7Rl5 / qQ8tlkeZbZ). */
export const RUNNING_TASKS_STATUS_MESSAGES = {
  runningTasks: { defaultMessage: "{count, plural, one {# running task} other {# running tasks}}", id: "TnXpPR7Rl5" },
  tasksFinished: { defaultMessage: "{count, plural, one {# task finished} other {# tasks finished}}", id: "qQ8tlkeZbZ" },
} satisfies MessageDescriptors;

/** Official cd5a `_Le` PR split menuLabel. */
export const PR_ROW_MESSAGES = {
  morePrOptions: { defaultMessage: "More PR options", id: "tRloa3+Odj" },
} satisfies MessageDescriptors;

/**
 * Official ca80 `dR` memory group + shared-125 bash/task coalesced.
 * Do not invent `Recalled {count} memories`.
 */
export const TOOL_GROUP_SUMMARY_MESSAGES = {
  recalled: { defaultMessage: "recalled", id: "FyGldNBVoJ" },
  saved: { defaultMessage: "saved", id: "dxFzERrTJq" },
  memories: { defaultMessage: "{n, plural, one {a memory} other {# memories}}", id: "iezAjNRKVQ" },
  ranACommand: { defaultMessage: "Ran a command", id: "cv9VNYMHXY" },
  ranCountCommands: { defaultMessage: "Ran {count} commands", id: "LVG1dX6B8u" },
  ranAnAgent: { defaultMessage: "Ran an agent", id: "WSkLyhVgSu" },
  ranCountAgents: { defaultMessage: "Ran {count} agents", id: "X9Z2S33opa" },
  /** Official shared-125 `Zg` remaining kinds. */
  readAFile: { defaultMessage: "Read a file", id: "MVQTRBWYud" },
  readCountFiles: { defaultMessage: "Read {count} files", id: "cPnivFkT6E" },
  createdAFile: { defaultMessage: "Created a file", id: "tTVI3GQeyu" },
  createdCountFiles: { defaultMessage: "Created {count} files", id: "14+jcDS33B" },
  editedAFile: { defaultMessage: "Edited a file", id: "wT63jkA9qK" },
  editedCountFiles: { defaultMessage: "Edited {count} files", id: "y5DX5NCmrm" },
  deletedAFile: { defaultMessage: "Deleted a file", id: "MM7OHMBA9j" },
  deletedCountFiles: { defaultMessage: "Deleted {count} files", id: "242T21lCRb" },
  lookedForFiles: { defaultMessage: "Looked for files", id: "8XsqEcZQPV" },
  searchedFiles: { defaultMessage: "Searched files", id: "ZdOS6uyq8n" },
  searchedTheWeb: { defaultMessage: "Searched the web", id: "4+310Bnuvz" },
  loadedASkill: { defaultMessage: "Loaded a skill", id: "0AQGELjf8F" },
  loadedCountSkills: { defaultMessage: "Loaded {count} skills", id: "QE4MKdaawu" },
  updatedTasks: { defaultMessage: "Updated tasks", id: "sdr9aWC1S/" },
  /** Official c05b unknown-tool group — full sentence, no invent `used 1 tool`. */
  usedATool: { defaultMessage: "Used a tool", id: "BRG8o6gNdU" },
  usedCountTools: { defaultMessage: "Used {count} tools", id: "JtrYJ8F4gT" },
} satisfies MessageDescriptors;

/** Official ca80 composer sr-only Chat/Bash mode (keep sr-only, not a visible pill). */
export const COMPOSER_CHAT_MODE_MESSAGES = {
  chatMode: { defaultMessage: "Chat mode", id: "f2uBOQtZmC" },
  bashMode: { defaultMessage: "Bash mode. Press Escape to return to chat.", id: "5tXPeP/Nv3" },
} satisfies MessageDescriptors;

/** Official ca80 `KN` plus trigger Add (`alWu/MbgXB`). `2/2yg+qAwp` is a different Add (skills/settings). */
export const COMPOSER_PLUS_MESSAGES = {
  add: { defaultMessage: "Add", id: "alWu/MbgXB" },
} satisfies MessageDescriptors;

/** Official ca80 `GN` / `AN` plus-menu rows (attach first). No connectors/GH/Linear without `aae()`. */
export const COMPOSER_PLUS_MENU_MESSAGES = {
  slashCommands: { defaultMessage: "Slash commands", id: "3/wF0Go5Hm" },
  addFilesOrPhotos: { defaultMessage: "Add files or photos", id: "vVSGqeakjA" },
  addImage: { defaultMessage: "Add image", id: "jsBzHH0H/K" },
  addFolder: { defaultMessage: "Add folder", id: "lhYeghbH/7" },
  /** Official ca80 `jN` empty-catalog fallback — not Notion/Linear/Canva without `aae()`. */
  manageConnectors: { defaultMessage: "Manage connectors", id: "cqx+RdJnHp" },
  addPlugins: { defaultMessage: "Add plugins", id: "u8sCx7LYvW" },
} satisfies MessageDescriptors;

/** Official cc432 `CHsqi6o1Li` above mode footer when git probe false. */
export const GIT_REQUIRED_MESSAGES = {
  gitRequiredForLocalSessions: { defaultMessage: "Git is required for local sessions.", id: "CHsqi6o1Li" },
} satisfies MessageDescriptors;

/** Official ca80 bash pill title `tQ9onyWKqa`. */
export const COMPOSER_BASH_PILL_MESSAGES = {
  runAsShellCommand: { defaultMessage: "Run as a shell command", id: "tQ9onyWKqa" },
} satisfies MessageDescriptors;

/** Official c10b `Cy` / Dne `X$` dictation aria (`WBSQGo9+Wa` / `De+8liLWgX`). */
export const COMPOSER_DICTATION_MESSAGES = {
  dictate: { defaultMessage: "Dictate", id: "WBSQGo9+Wa" },
  stopDictation: { defaultMessage: "Stop dictation", id: "De+8liLWgX" },
} satisfies MessageDescriptors;

/** Official c119 Dne `A=i?tf+yHLZoYV:null` + xs Fast picker (`BUUIrK4hLN` / `xwOD1paf1j`). */
export const COMPOSER_FAST_MODE_MESSAGES = {
  fast: { defaultMessage: "Fast", id: "tf+yHLZoYV" },
  header: { defaultMessage: "Fast mode", id: "BUUIrK4hLN" },
  enable: { defaultMessage: "Enable fast mode", id: "xwOD1paf1j" },
  hint: { defaultMessage: "Faster responses, higher cost. Opus 4.6 only.", id: "/B80ewUEFD" },
  applyFailed: { defaultMessage: "Fast mode couldn't be applied. You can try again.", id: "vCyFvsFJJY" },
  disabledModel: { defaultMessage: "Fast mode is only available on Opus 4.6", id: "P2EpDddBue" },
  disabledLocalOnly: { defaultMessage: "Fast mode is only available in local sessions", id: "QMUMZ1JFWj" },
} satisfies MessageDescriptors;

/** Official cccc loop chip (`9XiW3xWqO5` / `oLE/XBJnEl`). No Active-loops header catalog. */
export const COMPOSER_LOOP_MESSAGES = {
  loop: { defaultMessage: "Loop", id: "9XiW3xWqO5" },
  recurringLoop: { defaultMessage: "Recurring loop", id: "oLE/XBJnEl" },
} satisfies MessageDescriptors;

/** Official ca80 usage ring `9Vq9GCHhLi` / `/na3E29UgN` / remote `LMGYthp0hQ`. */
export const COMPOSER_USAGE_MESSAGES = {
  usage: { defaultMessage: "Usage", id: "/na3E29UgN" },
  usageParts: { defaultMessage: "Usage: {parts}", id: "9Vq9GCHhLi" },
  context: { defaultMessage: "Context", id: "Qrvq7+mBse" },
  usageLimits: { defaultMessage: "Usage limits", id: "LMGYthp0hQ" },
} satisfies MessageDescriptors;

/** Official usage popover Context window / loading (ca80). */
export const COMPOSER_CONTEXT_WINDOW_MESSAGES = {
  contextWindow: { defaultMessage: "Context window", id: "4JvX9ZTEQB" },
  loadingBreakdown: { defaultMessage: "Loading context breakdown…", id: "HOtJEySUMV" },
} satisfies MessageDescriptors;

/** Official tile-keyboard hint `EWfxXrA85v` (sr-only). */
export const TILE_KEYBOARD_HINT_MESSAGES = {
  arrowKeys: {
    defaultMessage: "Arrow keys move the tile. Perpendicular arrows preview a split; press Enter to commit or Escape to cancel.",
    id: "EWfxXrA85v",
  },
} satisfies MessageDescriptors;

/** Official expanded tool-row verbs (Bash/Read). Description/tool names stay CLI 原文. */
export const TOOL_ROW_VERB_MESSAGES = {
  ran: { defaultMessage: "Ran", id: "+CuLVSpi4n" },
  read: { defaultMessage: "Read", id: "5zvJTSJA0C" },
  running: { defaultMessage: "Running", id: "ScRq37Oq7S" },
  reading: { defaultMessage: "Reading", id: "MOK/yKIpYX" },
} satisfies MessageDescriptors;

/** Official yS sketch toolbar Clear (c11959232). */
export const SKETCH_TOOLBAR_MESSAGES = {
  clear: { defaultMessage: "Clear", id: "/GCoTAAjMN" },
} satisfies MessageDescriptors;

/** Official $x heatmap (c11959232). */
export const CODE_STATS_MESSAGES = {
  dailyActivityHeatmap: { defaultMessage: "Daily activity heatmap", id: "wfhrnIhl3F" },
} satisfies MessageDescriptors;

/** Official Qj residual — Send / Stop aria + placeholders. */
export const COMPOSER_SEND_STOP_MESSAGES = {
  send: { defaultMessage: "Send", id: "9WRlF4R2gm" },
  stop: { defaultMessage: "Stop", id: "q/uwLTb3Zf" },
  typeForCommands: { defaultMessage: "Type / for commands", id: "fHClqd2+bS" },
  enterAShellCommand: { defaultMessage: "Enter a shell command", id: "rROdtkzJeP" },
  prompt: { defaultMessage: "Prompt", id: "iWKE8shLIt" },
  scrollToBottom: { defaultMessage: "Scroll to bottom", id: "p4l9m92DsT" },
} satisfies MessageDescriptors;

/** Official Hj EpitaxyMentionDropdown (c11959232). */
export const COMPOSER_MENTION_MESSAGES = {
  mentionSuggestions: { defaultMessage: "Mention suggestions", id: "Y8SrHIvLZf" },
  loading: { defaultMessage: "Loading…", id: "T4VxQNSBvZ" },
} satisfies MessageDescriptors;

/** Official Ejt MentionChip context Delete (index-BELz Njt). */
export const COMPOSER_MENTION_CHIP_MESSAGES = {
  delete: { defaultMessage: "Delete", id: "K3r6DQW7h+" },
} satisfies MessageDescriptors;

/** Official Wk ExitPlanMode copy (cd5a31703). */
export const EXIT_PLAN_MODE_MESSAGES = {
  proposedAPlan: { defaultMessage: "Claude proposed a plan", id: "uwYMasx1yw" },
  openPlan: { defaultMessage: "Open plan", id: "/5O7cdFfl5" },
  planFeedback: { defaultMessage: "Plan feedback", id: "5+lBxMnx8m" },
  anythingElseToAdd: { defaultMessage: "Anything else to add?", id: "7A3gQkZ3c/" },
  whatShouldChange: { defaultMessage: "What should change? (optional)", id: "99X62wRl9v" },
  back: { defaultMessage: "Back", id: "cyR7KhiuaU" },
  revise: { defaultMessage: "Revise", id: "p4J+lV5p5N" },
  reject: { defaultMessage: "Reject", id: "VzIOKf1uNn" },
  reviseEllipsis: { defaultMessage: "Revise…", id: "PA0R7vOPMW" },
  moreAcceptOptions: { defaultMessage: "More accept options", id: "8dbgSEhrkR" },
  accept: { defaultMessage: "Accept", id: "sjzLbXqRP8" },
  acceptEdits: { defaultMessage: "Accept and allow edits", id: "Iaq0DNUS9V" },
  auto: { defaultMessage: "Accept and auto mode", id: "OeUuN2jMpD" },
  bypassPermissions: { defaultMessage: "Accept and bypass permissions", id: "8Yyc5WLmCb" },
} satisfies MessageDescriptors;

/** Official Np / Ho / li / connecting (c11959232 + c009a87a0 uc). */
export const SESSION_LOAD_MESSAGES = {
  loadingSession: { defaultMessage: "Loading session", id: "IY7S4mLrkm" },
  loadingConversation: { defaultMessage: "Loading conversation", id: "ujDQnooCch" },
  noMessagesYet: { defaultMessage: "No messages yet.", id: "xc7r0SA6rC" },
  connectingToSession: { defaultMessage: "Connecting to session…", id: "L2r8A2+O5x" },
  couldntLoadThisSession: { defaultMessage: "Couldn’t load this session.", id: "diHcJ+720f" },
  backToLandingPage: { defaultMessage: "Back to landing page", id: "KGeQPLIrlo" },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
  /** Official FM (c11959232). */
  reconnectGithub: { defaultMessage: "Reconnect GitHub", id: "GT4+roXeE1" },
  details: { defaultMessage: "Details", id: "Lv0zJuL1jH" },
  /** Official DM rewind picker (c11959232). */
  rewind: { defaultMessage: "Rewind", id: "O8rEfJhp62" },
  rewindConversation: { defaultMessage: "Rewind conversation", id: "zx89NyX5Qb" },
  restoreConversationToPrevious: {
    defaultMessage: "Restore the conversation to a previous message",
    id: "Qb9vtk6zQz",
  },
  nothingToRewindToYet: { defaultMessage: "Nothing to rewind to yet.", id: "SMUCnWmt/M" },
  close: { defaultMessage: "Close", id: "rbrahOGMC3" },
  cantRewindToThisMessage: { defaultMessage: "Can't rewind to this message.", id: "M/S7dUTfsf" },
  /** Official cd5a `Tw`. */
  couldntLoadOlderMessages: { defaultMessage: "Couldn’t load older messages.", id: "2O0qJ9zfDJ" },
  retry: { defaultMessage: "Retry", id: "62nsdyMyIO" },
  loadingEllipsis: { defaultMessage: "Loading...", id: "gjBiyjshwX" },
  /** Official c119 CC. */
  sessionCouldNotBeFound: {
    defaultMessage: "This session could not be found. It may have been deleted, or you may not have access.",
    id: "VZoQaACZaG",
  },
  sessionNotFoundCliHint: {
    defaultMessage: "If you just created this session from the Claude Code CLI, make sure you're signed in to the same Claude account here as in your terminal.",
    id: "DgpHBoCXb3",
  },
  startANewSession: { defaultMessage: "Start a new session", id: "+4zh1/luZI" },
  closePane: { defaultMessage: "Close pane", id: "Sf+ebwMYFz" },
  share: { defaultMessage: "Share", id: "OKhRC6eWRw" },
  /** Official eI agent chip (c11959232). Hidden unless `agent` is truthy — do not invent a name. */
  runningAsAgent: { defaultMessage: "Running as agent: {agent}", id: "TccJtpCMTb" },
  copyBranchName: { defaultMessage: "Copy branch name", id: "31wtg7KV1e" },
  branchNameCopiedToClipboard: { defaultMessage: "Branch name copied to clipboard.", id: "fgBg6M20SL" },
  originLocal: { defaultMessage: "Local", id: "MpsZ34EpZH" },
  /** Composer YM env pill (c119 tC) — not titlebar K1. */
  originLocalComposer: { defaultMessage: "本地", id: "W4SaxYXWRk" },
  originSshHost: { defaultMessage: "SSH · {sshHost}", id: "cuFp9tvFYL" },
  originRemote: { defaultMessage: "Remote", id: "JJBzhXu7JU" },
  originBridge: { defaultMessage: "Bridge", id: "MZCNjqWCVG" },
  originNotConnected: { defaultMessage: "Not connected", id: "PuU15uQNel" },
  originConnecting: { defaultMessage: "Connecting", id: "6q3tCnkd2h" },
  originReconnecting: { defaultMessage: "Reconnecting", id: "137J1IwIEq" },
  originConnected: { defaultMessage: "Connected", id: "IvjoDSPGEQ" },
  originDisconnected: { defaultMessage: "Disconnected", id: "FZeQlcp+xX" },
} satisfies MessageDescriptors;

/** Official platform reveal — mac `LVY6c4L1SF`, else `47h7Fdurec`, Windows `ySAk9qhogV`. */
export const SHOW_IN_FOLDER_MESSAGES = {
  showInFinder: { defaultMessage: "Show in Finder", id: "LVY6c4L1SF" },
  showInFolder: { defaultMessage: "Show in folder", id: "47h7Fdurec" },
  showInExplorer: { defaultMessage: "Show in Explorer", id: "ySAk9qhogV" },
} satisfies MessageDescriptors;

/** Official ca80 `vB` / `hB` origin-pill menu (Change folder + toasts). */
export const ORIGIN_FOLDER_PILL_MESSAGES = {
  changeWorkingDirectory: { defaultMessage: "Change working directory", id: "SoyaAWkbuR" },
  changeFolderEllipsis: { defaultMessage: "Change folder…", id: "rdbRmIQXtZ" },
  chooseFolderEllipsis: { defaultMessage: "Choose folder…", id: "g50rCG4HS7" },
  copy: { defaultMessage: "Copy", id: "4l6vz1/eZ5" },
  copyPathItem: { defaultMessage: "Path", id: "Qp1beM93yV" },
  copyBranchItem: { defaultMessage: "Branch name", id: "aXh5Ujo5jI" },
  uncRejected: {
    defaultMessage: "Network (UNC) paths can’t be used as a session working directory.",
    id: "dc92M21iVj",
  },
  couldntChangeDirectory: { defaultMessage: "Couldn’t change the session directory.", id: "u6rppWwk42" },
  alreadyInDirectory: { defaultMessage: "The session is already in this directory.", id: "4m2WM4MrbB" },
  historyMayNotSurvive: {
    defaultMessage: "The session is in the new directory, but its history may not survive an app restart.",
    id: "rXG3ZXPf3u",
  },
  directoryCouldntBeTrusted: {
    defaultMessage: "The directory couldn’t be trusted. Nothing was changed.",
    id: "tmBrqrH59S",
  },
  sessionMovedPlain: { defaultMessage: "Session moved to {directory}", id: "0ux48b2N96" },
  sessionMovedAll: {
    defaultMessage: "Session moved to {directory}. Copied {count, plural, one {# file} other {# files}}.",
    id: "whsgaNcn4Q",
  },
  sessionMovedSome: {
    defaultMessage: "Session moved to {directory}. Copied {count, number} of {total, plural, one {# file} other {# files}}. Ask Claude if you need the rest.",
    id: "jynzjTeqld",
  },
  sessionMovedTooMany: {
    defaultMessage: "Session moved to {directory}. There were too many files to copy. Ask Claude if you need them.",
    id: "xAgd+tQPE3",
  },
  sessionMovedFailed: {
    defaultMessage: "Session moved to {directory}. Couldn’t copy the session’s files. Ask Claude if you need them.",
    id: "5CVgBQVrkx",
  },
} satisfies MessageDescriptors;

/** Official c11959232 `SC` Side chat overlay. */
export const SIDE_CHAT_MESSAGES = {
  sideChat: { defaultMessage: "Side chat", id: "0MBP0bdWwx" },
  sideChatLocalOnly: {
    defaultMessage: "Side chat is local-only — not available for remote sessions.",
    id: "MBShBY3q81",
  },
  openASessionToUseSideChat: { defaultMessage: "Open a session to use side chat", id: "DndW4lKUHb" },
  followUp: { defaultMessage: "Follow up…", id: "D6oMwpWrX4" },
  askAQuickQuestion: { defaultMessage: "Ask a quick question…", id: "SUYgJ2XuFk" },
  forking: { defaultMessage: "Forking…", id: "53IDLZxVdE" },
  clearSideChat: { defaultMessage: "Clear side chat", id: "1vPf0BAKqe" },
  closeSideChat: { defaultMessage: "Close side chat", id: "fyPrl4HbZ6" },
  forkingSession: { defaultMessage: "Forking session…", id: "VT/e+bRysY" },
  thinking: { defaultMessage: "Thinking…", id: "P1QHV0AhYD" },
  emptyDescription: {
    defaultMessage: "Chat about this session without touching the main thread. Claude sees the full context, and nothing here is added to the conversation.",
    id: "WleHxnItUz",
  },
} satisfies MessageDescriptors;

/** Official c119 `prompt_url` fetch fail (`pSD/WD+/JJ`). */
export const PROMPT_URL_MESSAGES = {
  failedToLoadPromptFromUrl: {
    defaultMessage: "Failed to load prompt from URL",
    id: "pSD/WD+/JJ",
  },
} satisfies MessageDescriptors;

/** Official `Ed` split suggestion toast (c11959232-CDBo_AYC `bqh3gSHXRK` / `8IBKnZa76A`). */
export const SPLIT_SUGGESTION_MESSAGES = {
  seeMultipleSessions: {
    defaultMessage: "See multiple sessions side by side in split view.",
    id: "bqh3gSHXRK",
  },
  openInSplitView: { defaultMessage: "Open in split view", id: "8IBKnZa76A" },
} satisfies MessageDescriptors;

/** Official Vv / Uv residual (c11959232). */
export const MESSAGE_ACTION_MESSAGES = {
  messageActions: { defaultMessage: "Message actions", id: "8FU11i4S5Z" },
  copyMessage: { defaultMessage: "Copy message", id: "8Rj4WgXPcB" },
  copied: { defaultMessage: "Copied", id: "p556q3uvbn" },
  pinAsChapter: { defaultMessage: "Pin as chapter", id: "Ek0ZOtz8EI" },
  unpinChapter: { defaultMessage: "Unpin chapter", id: "HElwNPiecu" },
  rewindToHere: { defaultMessage: "Rewind to here", id: "jlXY1qCwxf" },
  forkFromHere: { defaultMessage: "Fork from here", id: "qjMB66sXZ2" },
  goodResponse: { defaultMessage: "Good response", id: "OSbNg+1qqF" },
  badResponse: { defaultMessage: "Bad response", id: "tuJiA0ZNUD" },
  copyLink: { defaultMessage: "Copy link", id: "lbr3Lq2Lnm" },
  copyAsMarkdown: { defaultMessage: "Copy as Markdown", id: "aRsvyMHQOT" },
  copyAsQuote: { defaultMessage: "Copy as quote", id: "GWEGVdQi8W" },
  thinkingActions: { defaultMessage: "Thinking actions", id: "+OiyRgcyfz" },
  thoughtProcess: { defaultMessage: "Thought process", id: "zl6fNbo7RW" },
  claudeCodeNotice: { defaultMessage: "{count, plural, one {Claude Code notice} other {# Claude Code notices}}", id: "Ayx9qWb2Pk" },
  claudeCodeNoticeOne: { defaultMessage: "Claude Code notice", id: "Ayx9qWb2Pk" },
  /** Official cd5a `Xj` — aM/iM parked blocked trailing. */
  needsYourInput: { defaultMessage: "Needs your input", id: "ydrhToQu/y" },
  /** Official catalog 4Zkm5mSVWS — Mj refusal fallback (Wo 1ouk39q path). */
  modelFallbackSafeguardOriginal: {
    defaultMessage: "This session switched to {fallback} after {original}’s safeguards flagged a message. Pick a model to switch back.",
    id: "4Zkm5mSVWS",
  },
  /** Official catalog FnKhqMbHN5 — Mj fallback without original in copy. */
  modelFallbackSafeguard: {
    defaultMessage: "This session switched to {fallback} after safeguards flagged a message. Pick a model to switch back.",
    id: "FnKhqMbHN5",
  },
  /** Official catalog k0/cAE4jdO — availability trigger fallback. */
  modelFallbackUnavailable: {
    defaultMessage: "Your message wasn’t sent because the selected model isn’t available right now. Switched to {fallbackModel}. Your message is back in the message box.",
    id: "k0/cAE4jdO",
  },
  /** Official c80ec `Le` / cd5a `Kf` — compact_boundary Nj label. */
  compactedSessionSaved: { defaultMessage: "Compacted session · saved {tokens} tokens", id: "l7c01euK+q" },
  compactedSessionFrom: { defaultMessage: "Compacted session · from {tokens} tokens", id: "HKBIcgP7KE" },
  compactedSession: { defaultMessage: "Compacted session", id: "D4ZSZJLOdx" },
  attachSelection: { defaultMessage: "Attach selection as context", id: "UcMOyoVqDG" },
  attachMessage: { defaultMessage: "Attach message as context", id: "fe2GgpDxRl" },
} as const satisfies MessageDescriptors;

/** Official oN / Terminal title residual (c11959232). */
export const SIDE_PANE_CHROME_MESSAGES = {
  newTerminal: { defaultMessage: "New terminal", id: "EmFCpBoR7n" },
  renameTerminal: { defaultMessage: "Rename terminal", id: "EcAvDUnycA" },
  terminalName: { defaultMessage: "Terminal name", id: "YqygSYX+GY" },
  terminals: { defaultMessage: "Terminals", id: "TcmH/mEEcz" },
  closeTerminal: { defaultMessage: "Close terminal", id: "gO6Ri0QD54" },
  /** Official ku directory extra (c9a). */
  openInTerminal: { defaultMessage: "Open in terminal", id: "M1fJAb8qse" },
  hideFiles: { defaultMessage: "Hide files", id: "ZU8NF+Epvo" },
  showFiles: { defaultMessage: "Show files", id: "vuTg/99D1y" },
  servers: { defaultMessage: "Servers", id: "QOxktDjUiT" },
  hideFileTree: { defaultMessage: "Hide file tree", id: "bljYQX0Hqq" },
  showFileTree: { defaultMessage: "Show file tree", id: "GfxVY6vEHo" },
  filterFiles: { defaultMessage: "Filter files", id: "LDxqrSbuPU" },
  /** Official XC placeholder when searchFileContents exists. */
  filterFilesWithContents: { defaultMessage: "Filter files… (?text to search contents)", id: "ITM1BLMMIH" },
  filterFilesEllipsis: { defaultMessage: "Filter files…", id: "0VxKe+CEUz" },
  couldntReadThisFolder: { defaultMessage: "Couldn't read this folder.", id: "bd692FeidK" },
  folderIsEmpty: { defaultMessage: "Folder is empty", id: "zHWyR/lP4N" },
  noMatchingFiles: { defaultMessage: "No matching files", id: "IV/+/51PZA" },
  typeAfterQuestionToSearch: { defaultMessage: "Type after ? to search file contents", id: "vzTwYo0bzB" },
  noMatchesInFileContents: { defaultMessage: "No matches in file contents", id: "9d9rQzQPVA" },
  askAboutSnippet: {
    defaultMessage: "In {path} at line {line}: `{snippet}` — explain what this does and where it's used.",
    id: "65nUUWxfDC",
  },
  searchFiles: { defaultMessage: "Search files…", id: "+r+3aH0PJK" },
  goToFileOrSearch: { defaultMessage: "Go to file or search", id: "Htfjk3on72" },
  /** Official cd2ef `so` / cbd02 Ctrl-g `Ee`. */
  goToLine: { defaultMessage: "Go to line", id: "8DbsasU3Hw" },
  goToLinePlaceholder: { defaultMessage: "Line, or line:column", id: "7G7ZsNOUPB" },
  goToLineTypeNumber: { defaultMessage: "Type a line number from 1 to {lines}", id: "Cei1pWvwCv" },
  goToLineOf: { defaultMessage: "Line {line} of {lines}", id: "eXeXTYifsF" },
  closeGoToLineBar: { defaultMessage: "Close go to line bar", id: "Z36XGUMfPv" },
  /** Official cbd02 context `eiaPxp89eC`. */
  addComment: { defaultMessage: "Add comment", id: "eiaPxp89eC" },
  /**
   * Pin 2.31226.1 has no empty-Files catalog ids.
   * Keep defaultMessage for the empty pane; do not claim a pin id.
   */
  openFilesAppearHere: { defaultMessage: "Open files appear here", id: "Open files appear here" },
  pickFileInTree: {
    defaultMessage: "Pick a file in the tree, or click a file path in the conversation.",
    id: "Pick a file in the tree, or click a file path in the conversation.",
  },
  clickFilePathInConversation: {
    defaultMessage: "Click a file path in the conversation to open it.",
    id: "Click a file path in the conversation to open it.",
  },
  copyPath: { defaultMessage: "Copy path", id: "Qask1i8TzH" },
  /** Official cccc `jC` Files ⋯. */
  wordWrap: { defaultMessage: "Word wrap", id: "xhRkpHz/G8" },
  previewTabs: { defaultMessage: "Preview tabs", id: "QU/W+eha/0" },
  autoSave: { defaultMessage: "Auto save", id: "BNj0YDCyBr" },
  tabKeyIndents: { defaultMessage: "Tab key indents", id: "+tXqi3Eb5L" },
  indentGuides: { defaultMessage: "Indent guides", id: "UrQOENubHk" },
  showWhitespace: { defaultMessage: "Show whitespace", id: "aHuKOFRyRi" },
  scrollPastEnd: { defaultMessage: "Scroll past end", id: "oSFuPbyHia" },
  tabSize: { defaultMessage: "Tab size", id: "n3QqCl2bg7" },
  /** Official ca5db `U` — ⋯ tooltip `{pane} settings` (Files settings). */
  paneSettings: { defaultMessage: "{pane} settings", id: "0v5PlsRKXz" },
  /**
   * Pin 2.31226.1 has no Close file catalog id.
   * Tabs still need a label; keep defaultMessage only — do not claim a pin id.
   */
  closeFile: { defaultMessage: "Close file", id: "Close file" },
  /** Official XC Files tree (c11959232). */
  clearFilter: { defaultMessage: "Clear filter", id: "OhgOkHumT3" },
  projectFiles: { defaultMessage: "Project files", id: "G6mEHz4Dy8" },
  noWorkingDirectory: { defaultMessage: "No working directory for this session.", id: "hAj4aiKacv" },
  /** Official SN / AN / _N Framebuffer (c11959232). */
  remoteScreen: { defaultMessage: "Remote screen", id: "6h8w5qGtdW" },
  openFolderToViewScreen: { defaultMessage: "Open a folder to view a screen.", id: "Z7rOV54sUb" },
  connectingToScreen: { defaultMessage: "Connecting to screen…", id: "VlK239o5cj" },
  couldntConnectToScreenShare: { defaultMessage: "Couldn't connect to the screen share.", id: "YG3ENc+IFC" },
  retry: { defaultMessage: "Retry", id: "62nsdyMyIO" },
  /** Official vN file toolbar (c11959232). */
  previewMarkdown: { defaultMessage: "Preview markdown", id: "wiJGoE4uBV" },
  viewSource: { defaultMessage: "View source", id: "khjKGjoVqR" },
  editFile: { defaultMessage: "Edit file", id: "S3BjwA6I5S" },
  editFileContents: { defaultMessage: "Edit file contents", id: "q3agrjpNe5" },
  openInEllipsis: { defaultMessage: "Open in…", id: "1H9r6yNPh+" },
  openIn: { defaultMessage: "Open in", id: "4nONiiddCv" },
  save: { defaultMessage: "Save", id: "jvo0vs3nF0" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  loadingFile: { defaultMessage: "Loading file", id: "BkXm6rb2UB" },
  fileCouldNotBeRead: {
    defaultMessage: "File could not be read. It may have been deleted or moved, or it lives outside the session folder.",
    id: "BgArDAf+tN",
  },
  pathCopiedToClipboard: { defaultMessage: "Path copied to clipboard.", id: "hxPm8s77hY" },
  copyFileContents: { defaultMessage: "Copy file contents", id: "u5e60goJ3j" },
  copied: { defaultMessage: "Copied", id: "p556q3uvbn" },
  /** Official ab Play / copy (c119). */
  runInTerminal: { defaultMessage: "Run in terminal", id: "kb/xewgjJn" },
  copyCode: { defaultMessage: "Copy code", id: "CNXQN5zp9z" },
  runningClickToCancel: { defaultMessage: "Running — click to cancel", id: "BFX5sgeN+B" },
  /** Official vN Cd.Popup. */
  edit: { defaultMessage: "Edit", id: "wEQDC6Wv3/" },
  attachAsContext: { defaultMessage: "Attach as context", id: "6DN2BwXOYy" },
  /** Official ku / Cu extras (c9a). */
  copyRelativePath: { defaultMessage: "Copy relative path", id: "/anA6Br7/K" },
  copyFilename: { defaultMessage: "Copy filename", id: "jZ+pOcsnKx" },
  copiedToClipboard: { defaultMessage: "Copied to clipboard.", id: "8qZ4HE/bvM" },
  fileActions: { defaultMessage: "File actions", id: "fHYa53hBDq" },
  /** Official sS overflow aria (c119). */
  matchActions: { defaultMessage: "Match actions", id: "BXrr+6MfHk" },
  fileCantBeSaved: {
    defaultMessage: "This file can't be saved — its path is outside the session folder, or this is a remote session.",
    id: "6CN8kSzt7R",
  },
  fileChangedOnDisk: { defaultMessage: "This file changed on disk since you started editing.", id: "aS2YDxiDxN" },
  discard: { defaultMessage: "Discard", id: "nmpevlUATU" },
  override: { defaultMessage: "Override", id: "pEZWL7Okfp" },
  onlyAvailableInLocalSessions: { defaultMessage: "Only available in local sessions", id: "SRfvtxpa+5" },
  /** Official uN EpitaxyFileFindBar. */
  findInFile: { defaultMessage: "Find in file", id: "UNN3FvEfk9" },
  findInFilePlaceholder: { defaultMessage: "Find in file…", id: "WcpX6H7krr" },
  currentOfTotal: { defaultMessage: "{current} of {total}", id: "stJYEYsqnV" },
  noResults: { defaultMessage: "No results", id: "jHJmjfxD4s" },
  previousMatch: { defaultMessage: "Previous match", id: "d/JZabNLwR" },
  nextMatch: { defaultMessage: "Next match", id: "kIlUNgdwsq" },
  closeFindBar: { defaultMessage: "Close find bar", id: "wo1OWw1PCR" },
  /** Official ca5db `H` / shared-18 `gx` — Files header pop-out. */
  openInNewWindow: { defaultMessage: "Open in new window", id: "b2WfwmtX9G" },
  /** Official shared-18 `yx` / `vx` — popout dock back to main (`sa1ggdIlOQ`). */
  openInMainWindow: { defaultMessage: "Open in main window", id: "sa1ggdIlOQ" },
  /** Official shared-18 `hx` / `mx` pin. */
  keepWindowOnTop: { defaultMessage: "Keep window on top", id: "5BkaTqhcyM" },
  stopKeepingWindowOnTop: { defaultMessage: "Stop keeping window on top", id: "uv0c0unMSm" },
  /** Official ca5db `R` / `V` — tile expand in Lm Xe. */
  expandPane: { defaultMessage: "Expand", id: "b5wi/TtdZW" },
  collapsePane: { defaultMessage: "Collapse", id: "W/V6+Y+Vy2" },
  /** Official c6e1 `pe` — native On decline, not UTF-8 dump. */
  previewUnavailable: { defaultMessage: "Preview unavailable", id: "Pa/ScM/gPC" },
  couldntPreviewThisFile: { defaultMessage: "Couldn’t preview this file.", id: "RXDopwcr5x" },
  sofficeFailed: { defaultMessage: "Couldn’t convert this file for preview.", id: "BCwiPnM3dV" },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
} satisfies MessageDescriptors;

/** Official cf580 `hr` / `_n` + `8i6rbwuPhl` / `iU/FXRryGJ` Preview empty (`gr`). */
export const PREVIEW_EMPTY_MESSAGES = {
  browseWithClaude: { defaultMessage: "Browse with Claude", id: "r11KJ1wrVP" },
  typeAUrl: { defaultMessage: "Type a URL or ask Claude to open a site. Claude can read, click, and type.", id: "NDWPZ78zI5" },
  previewYourAppInstead: { defaultMessage: "Preview your app instead?", id: "8i6rbwuPhl" },
  detectDevServer: { defaultMessage: "Detect dev server", id: "iU/FXRryGJ" },
  pageUrl: { defaultMessage: "Page URL", id: "03Mg3GL80C" },
  enterAUrl: { defaultMessage: "Enter a URL", id: "MHl4RB/0yg" },
  servers: { defaultMessage: "Servers", id: "QOxktDjUiT" },
  settings: { defaultMessage: "Settings", id: "jqhhMImrPt" },
  /** Official cf580 `Ir` / `pOeEMxHCXp`. */
  addServer: { defaultMessage: "Add server", id: "pOeEMxHCXp" },
  /** Official cf580 `Nr.empty`. */
  noDevServerConfigured: { defaultMessage: "No dev server configured", id: "jJOscyqP/X" },
  run: { defaultMessage: "Run", id: "Nr.run" },
  stop: { defaultMessage: "Stop", id: "Nr.stop" },
  failedToStart: { defaultMessage: "Failed to start", id: "4fGytPLZ4o" },
  /** Official c8ae `1B2oJwBn8a` generic (named browser is `1WdokkZgcZ`). */
  openInDefaultBrowser: { defaultMessage: "Open in default browser", id: "1B2oJwBn8a" },
  annotate: { defaultMessage: "Annotate", id: "+F8tiKrg+s" },
  exitSelectionMode: { defaultMessage: "Exit selection mode", id: "BKlGk+dimR" },
  settingUpPreview: { defaultMessage: "Setting up preview", id: "CVL1+tDm9Z" },
  runDevServer: { defaultMessage: "Run your dev server to inspect network requests, debug with logs, and see changes live.", id: "t2lqMIHmDm" },
  setUp: { defaultMessage: "Set up", id: "rrGMSxQd9S" },
  devServerFailed: { defaultMessage: "Dev server failed to start", id: "/jkMgZaQEi" },
  errorDetailsSent: { defaultMessage: "Error details were sent to Claude", id: "1a29Xj+qDE" },
  /** Official cf580 `jr` Globe trigger. */
  serversAndSettings: { defaultMessage: "Servers & settings", id: "35j2Q7fMHM" },
  goBack: { defaultMessage: "Go back", id: "orvpWhO3rI" },
  goForward: { defaultMessage: "Go forward", id: "nSRxtmI8pK" },
  reload: { defaultMessage: "Reload", id: "fdCS5/bISp" },
  selectElement: { defaultMessage: "Select element", id: "KumhrXhE/V" },
  /** Official c224 `B` / cf580 `Dt` Preview ⋯ (`Q`). */
  copyUrl: { defaultMessage: "Copy URL", id: "P8QaSQLfW+" },
  urlCopied: { defaultMessage: "URL copied to clipboard.", id: "PsIG0LbAxt" },
  copyUrlFailed: { defaultMessage: "Couldn’t copy the URL. Try again.", id: "kADYN+9Tu7" },
  openHtmlFile: { defaultMessage: "Open HTML file…", id: "JwfwCqUh/e" },
  /** Official TI Globe htmlFiles picker (c11959232) — extraSections `$`. */
  openFileEllipsis: { defaultMessage: "Open file…", id: "2BiPVis9sL" },
  viewport: { defaultMessage: "Viewport", id: "oV1pS7VmeK" },
  viewportUnavailable: { defaultMessage: "Open a page first.", id: "MNykvrWNZn" },
  screenshot: { defaultMessage: "Save screenshot", id: "lhgVxsFBsr" },
  showAnnotationTools: { defaultMessage: "Show annotation tools", id: "WqLEIFNVU0" },
  colorScheme: { defaultMessage: "Color scheme", id: "DxgBSXpyP2" },
  colorSchemeLight: { defaultMessage: "Light", id: "A0UsqIrpdq" },
  colorSchemeDark: { defaultMessage: "Dark", id: "BX2/DcCVek" },
  colorSchemeSystem: { defaultMessage: "System", id: "+CwN9C/QFk" },
  openExternalUnavailable: { defaultMessage: "This only works for websites.", id: "v/N4TlfEs/" },
  manageAllowedSites: { defaultMessage: "Manage allowed sites…", id: "ADY0ydM/Fq" },
  enableAutoVerify: { defaultMessage: "Enable auto verify", id: "iojWyMM0eV" },
  disableAutoVerify: { defaultMessage: "Disable auto verify", id: "QDKj3LFiKc" },
  autoVerifyChanges: { defaultMessage: "Auto-verify changes", id: "RU++ORcNys" },
  /** Official c224 `B` / cf580 `Dt` — overflow Export (`SVwJTM5AmL`). */
  export: { defaultMessage: "Export", id: "SVwJTM5AmL" },
  /** Official cf580 `_t` / `Dt` Show/Hide logs. */
  hideDevServerLogs: { defaultMessage: "Hide dev server logs", id: "y5t6bIRA3y" },
  showDevServerLogs: { defaultMessage: "Show dev server logs", id: "zora1tCQsv" },
  closeDevServerLogs: { defaultMessage: "Close dev server logs", id: "dp5JfzWZA7" },
  waitingForOutput: { defaultMessage: "Waiting for output…", id: "Ci50zYLBP8" },
  /** Official cf580 `_t` Set link destination (`dyp4qWSjux`) — gated on `openExternalLinkInPreview`. */
  setLinkDestination: { defaultMessage: "Set link destination…", id: "dyp4qWSjux" },
  openLinksInPreview: { defaultMessage: "Open links in built-in browser", id: "LgkdiZ92a8" },
  whereShouldLinksOpen: { defaultMessage: "Where should links open?", id: "SW2I2RenJ7" },
  chooseWhatHappensWhenYouClickALink: { defaultMessage: "Choose what happens when you click a link.", id: "ducm9DLEvN" },
  done: { defaultMessage: "Done", id: "JXdbo8Vnlw" },
  linkDestination: { defaultMessage: "Link destination", id: "NENRc4Q2v1" },
  openInApp: { defaultMessage: "Open in app", id: "8XhRcNMyE2" },
  opensBesideTheChat: {
    defaultMessage: "Opens beside the chat. Claude can see and act on the page.",
    id: "aDHcSu+fob",
  },
  opensOutsideTheApp: {
    defaultMessage: "Opens outside the app, in your default browser.",
    id: "hKY7t+mrIz",
  },
  modifierClickOpensDefaultBrowser: {
    defaultMessage: "{modifier}-click a link to open it in your default browser.",
    id: "oqpJZ5fC7z",
  },
  /** Official c224 `B` Keep cookies submenu (`e6Cv5Y4QTL`). */
  cookiesHeader: { defaultMessage: "Cookies", id: "460C4xh598" },
  keepCookies: { defaultMessage: "Keep cookies", id: "e6Cv5Y4QTL" },
  persistNone: { defaultMessage: "Until quit", id: "w2AaFT5b5b" },
  persistNoneHint: { defaultMessage: "Cookies are cleared when the app quits", id: "pbLgbqLVvm" },
  persistShared: { defaultMessage: "Shared", id: "kWI6zXRaHY" },
  persistSharedHint: { defaultMessage: "Cowork and all Code sessions share cookies", id: "L/5BVdXEId" },
  persistSession: { defaultMessage: "Per session", id: "pFAA1bn62c" },
  persistSessionHint: { defaultMessage: "Each session keeps its own cookies", id: "k6ZZcMDrxs" },
  clearBrowsingData: { defaultMessage: "Clear browsing data", id: "65HrbSXt9Z" },
  browsingDataCleared: { defaultMessage: "Browsing data cleared", id: "VONdmbNHM0" },
  clearBrowsingDataFailed: { defaultMessage: "Couldn’t clear browsing data.", id: "uDCaL+QwJL" },
  /** Official c224 `B` / c887 `Oe` Chrome import. */
  importCookies: { defaultMessage: "Import cookies…", id: "j/cnWEhAUx" },
  useImportedCookies: { defaultMessage: "Use cookies you already imported", id: "ObIsrYl/hv" },
  useCookiesHere: { defaultMessage: "Use cookies here", id: "pbp6J1NBUW" },
  useImportedCookiesTitle: { defaultMessage: "Use the cookies you already imported", id: "Epnzgt0uKT" },
  staySignedInToYourSites: { defaultMessage: "Stay signed in to your sites", id: "7O4ejXSumQ" },
  importedCookiesForSite: { defaultMessage: "You imported cookies for {site}. Use them here too, so it opens signed in.", id: "0iFmwypw/y" },
  importedCookiesForSiteAndOthers: {
    defaultMessage: "You imported cookies for {site} and {others, plural, one {# other site} other {# other sites}}. Use them here too, so your sites open signed in.",
    id: "hZaDU7GBba",
  },
  importCookiesSoSitesOpen: {
    defaultMessage: "Import cookies from your browser so your sites open signed in, here and across Cowork and Code.",
    id: "GgkQ9tQZNo",
  },
  importCookiesPrimary: { defaultMessage: "Import cookies", id: "7V9GMtwQZV" },
  keepsYouSignedInUntilQuit: { defaultMessage: "Keeps you signed in until you quit the app.", id: "5386pQeHsL" },
  youCanChangeKeepCookiesLater: {
    defaultMessage: "You can change this later under Keep cookies in Browser settings.",
    id: "Dkiym3tHRj",
  },
  cookiesOnlyNoPasswords: { defaultMessage: "Cookies only. Passwords aren’t imported.", id: "S9OJKvZKI1" },
  cookiesAndSiteDataOnly: { defaultMessage: "Cookies and site data only. Passwords aren’t imported.", id: "oPyYJyn0hh" },
  youChooseTheSites: { defaultMessage: "You choose the sites.", id: "dne+jbccnd" },
  nothingLeavesThisComputer: { defaultMessage: "Nothing leaves this computer.", id: "Ki5foE182E" },
  dontShowAgain: { defaultMessage: "Don’t show again", id: "MWjOMpKsd7" },
  notNow: { defaultMessage: "Not now", id: "dUCA4Khx0S" },
  importCookiesFromBrowser: { defaultMessage: "Import cookies from your browser", id: "APrpuDM+BM" },
  keepMeSignedIn: { defaultMessage: "Keep me signed in between sessions", id: "Ay1/WNQpzP" },
  setsKeepCookiesToShared: { defaultMessage: "Sets Keep cookies to Shared for Code and Cowork", id: "xio82JKxPe" },
  keepCookiesAlreadyOn: { defaultMessage: "Keep cookies is already on", id: "e1J99CIUab" },
  youllConfirmTouchId: {
    defaultMessage: "You’ll confirm with Touch ID and pick which sites to bring over. Nothing leaves this computer.",
    id: "hwgIiwPGIU",
  },
  youllConfirmThenPick: {
    defaultMessage: "You’ll confirm, then pick which sites to bring over. Nothing leaves this computer.",
    id: "sl34tiPfJV",
  },
  from: { defaultMessage: "From", id: "dM+p3/YEXT" },
  cancel: { defaultMessage: "Cancel", id: "47FYwba+bI" },
  waitingForTouchId: { defaultMessage: "Waiting for you to confirm with Touch ID.", id: "2H1axEwm2X" },
  waitingForConfirm: { defaultMessage: "Waiting for you to confirm.", id: "G2d1fk19VC" },
  /** Official c887 `Te` `te()` (shared-75 `Ea` Windows) extra sentence. */
  lookForAPopup: { defaultMessage: "Look for a pop-up. It may be behind this window.", id: "DdO9T4OTtK" },
  filterSites: { defaultMessage: "Filter sites", id: "2BXskgRW69" },
  /** Official c887 pick `S.Title`. */
  chooseSitesToBringOver: { defaultMessage: "Choose sites to bring over", id: "F6ekpMXFUR" },
  /** Official c887 `De`. */
  selectAll: { defaultMessage: "Select all", id: "94Fg25VD0N" },
  noSavedCookies: { defaultMessage: "{browser} has no saved cookies to bring over.", id: "NWL3JfYLbi" },
  noSitesMatch: { defaultMessage: "No sites match.", id: "UUvrwrQzfF" },
  cookiesStillLocked: {
    defaultMessage: "{browser}’s cookies are still locked. Click Try again, enter your Mac login password when macOS asks, and choose Allow.",
    id: "vUZUp5lSld",
  },
  selectedOfTotal: { defaultMessage: "{count} of {total} selected", id: "B3eFmxN6yB" },
  atMost: { defaultMessage: "{cap} at most", id: "QDB2u5HrBd" },
  back: { defaultMessage: "Back", id: "cyR7KhiuaU" },
  import: { defaultMessage: "Import", id: "9XUYQtJvwF" },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
  manageImportedCookies: { defaultMessage: "Manage imported cookies", id: "J1uGH+9NhY" },
  /** Official c887 `Ce` default. */
  importCookiesFailed: { defaultMessage: "Couldn’t import your {browser} cookies. Try again.", id: "8DUof/fSOX" },
  couldntFindBrowsersSavedCookies: {
    defaultMessage: "Couldn’t find {browser}’s saved cookies on this computer.",
    id: "rg0mGwWwNR",
  },
  thatTookAWhileTouchId: { defaultMessage: "That took a while. Confirm with Touch ID again.", id: "pnx+xk4H+R" },
  thatTookAWhileConfirm: { defaultMessage: "That took a while. Confirm again.", id: "5maz563zlX" },
  couldntReadBrowsersData: {
    defaultMessage: "Couldn’t read {browser}’s data. Quit {browser} and try again.",
    id: "JkejQTfBZs",
  },
  macosBlockedClaude: {
    defaultMessage:
      "macOS blocked Claude from reading {browser}’s data. In System Settings → Privacy & Security, allow Claude under Files and Folders or Full Disk Access, then reopen Claude and try again.",
    id: "P6PBJg68Ci",
  },
  couldntReadKeyring: {
    defaultMessage:
      "Couldn’t read {browser}’s key from your desktop keyring, so nothing was imported. Unlock the keyring (or KDE Wallet) and try again; on GNOME desktops without the secret-tool command, install libsecret-tools first.",
    id: "IwylkUvRFB",
  },
  openAWebsiteFirst: { defaultMessage: "Open a website in the browser first, then try again.", id: "UsjjvtJoLD" },
  couldntImportThoseSites: { defaultMessage: "Couldn’t import those sites. Try again.", id: "G10wSn0sAy" },
  browsersSavedCookiesCouldntBeRead: {
    defaultMessage: "{browser}’s saved cookies couldn’t be read. Sign in to {browser} once and try again.",
    id: "tOh8Hmi0l5",
  },
  importAlreadyInProgress: {
    defaultMessage:
      "An import is already in progress. Try again in a moment. If a confirmation pop-up is still open, answer or close it first.",
    id: "Jc0qt1BZfQ",
  },
  popupMayBeBehind: { defaultMessage: "The pop-up may be behind this window.", id: "I8oe2S1JID" },
  noConfirmationWithin2Minutes: {
    defaultMessage: "No confirmation within 2 minutes, so nothing was imported. Try again.",
    id: "yMueWC2psD",
  },
  ifPopupStillOpenCloseIt: {
    defaultMessage: "If the pop-up is still open, close it first. It may be behind this window.",
    id: "2cafrnbvPK",
  },
  sitesWithCookiesInProfile: {
    defaultMessage: "Sites with cookies in your {browser} profile “{profile}”.",
    id: "nOVsyu1Hvm",
  },
  remove: { defaultMessage: "Remove", id: "G/yZLul6P1" },
  exportHtml: { defaultMessage: "Export…", id: "gcXG4edAhu" },
  autoVerifyEnableBody: {
    defaultMessage:
      "After editing code, Claude will automatically start the preview server, verify changes, and share proof before completing its response. This setting is saved in .claude/launch.json for this project.",
    id: "Uhrxi7KQYB",
  },
  autoVerifyDisableBody: {
    defaultMessage:
      "Claude will no longer automatically verify code changes using the preview. You can still ask Claude to verify manually. This setting is saved in .claude/launch.json for this project.",
    id: "CiGjsdsUvp",
  },
  enable: { defaultMessage: "Enable", id: "TqSTI0/TZI" },
  disable: { defaultMessage: "Disable", id: "Rw7iI7vYlr" },
  responsive: { defaultMessage: "Responsive", id: "Bcu/8vmAuY" },
  mobile: { defaultMessage: "Mobile", id: "GWtmtuCmOx" },
  tablet: { defaultMessage: "Tablet", id: "/bfzrIxiJT" },
  custom: { defaultMessage: "Custom", id: "Sjo1P44FYy" },
} satisfies MessageDescriptors;

/** Official cd5a Fu `ue` — feed aria-label. */
export const TRANSCRIPT_FEED_MESSAGES = {
  chatMessages: { defaultMessage: "Chat messages", id: "SCYmnElliz" },
} satisfies MessageDescriptors;

/** Official Sv / Rg / GX (c11959232). */
export const TRANSCRIPT_SURFACE_MESSAGES = {
  attachedFiles: { defaultMessage: "Attached files", id: "mI1OFdfVgs" },
  imagePreview: { defaultMessage: "Image preview", id: "oeY6P6FEMh" },
  previousImage: { defaultMessage: "Previous image", id: "fb1a/oVcaa" },
  nextImage: { defaultMessage: "Next image", id: "F+ukuPGfqR" },
  currentOfTotal: { defaultMessage: "{current} of {total}", id: "stJYEYsqnV" },
  viewBackgroundTask: { defaultMessage: "View background task", id: "FO1qhPaZSt" },
  processingImage: { defaultMessage: "Processing image", id: "dewPQogr49" },
} satisfies MessageDescriptors;

/** Official Qw / Xw chapter TOC (c11959232). */
export const CHAPTER_TOC_MESSAGES = {
  sessionChapters: { defaultMessage: "Session chapters", id: "vS6GvwFrmg" },
  chapterTitle: { defaultMessage: "Chapter title", id: "vsi3lkj8jz" },
} satisfies MessageDescriptors;

/** Official dC Summary retry (c11959232). */
export const SUMMARY_MODE_MESSAGES = {
  retrySummary: { defaultMessage: "Retry summary", id: "Vr5FtpxhCJ" },
  couldntGenerateSummary: {
    defaultMessage: "Couldn't generate summary — click to retry",
    id: "rwS6BR8nAG",
  },
} satisfies MessageDescriptors;

/** Official Ow AskUserQuestion (c11959232). */
export const ASK_USER_QUESTION_MESSAGES = {
  other: { defaultMessage: "Other", id: "/VnDMl81rh" },
  otherOption: { defaultMessage: "Other option", id: "zKDdX/Wf1x" },
  typeYourOwnAnswer: { defaultMessage: "Type your own answer here", id: "h2ZPhZTOS+" },
  back: { defaultMessage: "Back", id: "cyR7KhiuaU" },
  skip: { defaultMessage: "Skip", id: "/4tOwTiCH6" },
  submit: { defaultMessage: "Submit", id: "wSZR47Y5kj" },
  next: { defaultMessage: "Next", id: "9+DdtuCqLw" },
} satisfies MessageDescriptors;

/** Official ZN / zR / QS empty (c11959232). */
export const SIDE_PANE_EMPTY_MESSAGES = {
  noPlanYet: { defaultMessage: "No plan yet.", id: "zVs93Lbt2D" },
  planEmptyHint: {
    defaultMessage: "Claude writes the plan here as it explores. Keep chatting.",
    id: "tRF6CXCuTR",
  },
  noTasks: { defaultMessage: "No tasks.", id: "qSE8DDhMi7" },
  noRunsYet: { defaultMessage: "No runs yet.", id: "9zutKz3pwT" },
  running: { defaultMessage: "Running", id: "nDyaq/M7Oj" },
  completed: { defaultMessage: "Completed", id: "95stPqCnfu" },
  notAScheduledRun: { defaultMessage: "Not a scheduled run", id: "wZ+WLSqfnJ" },
  notAScheduledRunBody: {
    defaultMessage: "This session wasn't started from a scheduled task. Open a session that ran on a schedule to see its run history here.",
    id: "qBNAdZAuBF",
  },
  failedToLoadRunHistory: { defaultMessage: "Failed to load run history", id: "2cnjmDT7t/" },
  failedToLoadRunHistoryBody: {
    defaultMessage: "Something went wrong fetching this routine's runs. Close and reopen the panel to retry.",
    id: "lSd9MY+/2m",
  },
  loading: { defaultMessage: "Loading", id: "iFsDVRnIHW" },
} satisfies MessageDescriptors;

/** Official nI / tI approval actions (c11959232). */
export const TOOL_APPROVAL_MESSAGES = {
  deny: { defaultMessage: "Deny", id: "htvX+Z11l+" },
  alwaysAllow: { defaultMessage: "Always allow", id: "lr3QX/nctD" },
  alwaysAllowSession: { defaultMessage: "Always allow in this session", id: "41T7Bzvobw" },
  alwaysAllowProject: { defaultMessage: "Always allow in this project", id: "fKO5o2EaJW" },
  alwaysAllowProjectLocal: { defaultMessage: "Always allow in this project (local)", id: "XpHOODVtg3" },
  alwaysAllowEverywhere: { defaultMessage: "Always allow everywhere", id: "8QTzALT8r4" },
  allowOnce: { defaultMessage: "Allow once", id: "O2tb5KUxpc" },
} satisfies MessageDescriptors;

/** Official oN / XC Ask-about / Shell residual (c11959232). */
export const TERMINAL_PANE_MESSAGES = {
  askAboutThis: { defaultMessage: "Ask about this", id: "e8cL7QKtK5" },
  restartShell: { defaultMessage: "Restart shell", id: "0UbncvFBsL" },
  shellExited: { defaultMessage: "Shell exited.", id: "u0vWz2o/ZK" },
  tryAgain: { defaultMessage: "Try again", id: "FazwRldA7z" },
} satisfies MessageDescriptors;
