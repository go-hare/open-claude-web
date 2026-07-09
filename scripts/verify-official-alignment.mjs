#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const officialRoot = path.resolve(root, "../open-claude-desktop/resources/ion-dist/assets/v1");
const official = {
  codeTranscript: read(path.join(officialRoot, "c11959232-h_zsw3wI.js")),
  sidebarCowork: read(path.join(officialRoot, "ca0135bc5-Cab670j1.js")),
  sidebarIndex: read(path.join(officialRoot, "index-BELzQL5P.js")),
  scheduledList: read(path.join(officialRoot, "c705e2e19-CdkFb_TH.js")),
  localRoutine: read(path.join(officialRoot, "c0243d234-BHUzHV1X.js")),
  localRoutineDetail: read(path.join(officialRoot, "cfc18e0f4-BP16E1oT.js")),
  chatCss: readFirstExisting(["cca089f68-B_9i4gW6.js", "cca089f68-CTV9c1Kv.css", "c0d9175fe-CH-3lZ2a.css"].map((file) => path.join(officialRoot, file))),
};
const local = {
  tile: read(path.join(root, "src/features/epitaxy/EpitaxySessionTile.tsx")),
  components: read(path.join(root, "src/features/epitaxy/OfficialEpitaxyComponents.tsx")),
  coworkComposer: read(path.join(root, "src/features/epitaxy/OfficialCoworkComposer.tsx")),
  coworkNewTask: read(path.join(root, "src/features/epitaxy/cowork/CoworkNewTaskPage.tsx")),
  coworkResponse: read(path.join(root, "src/features/epitaxy/cowork/OfficialCoworkComponents.tsx")),
  coworkActivityShell: read(path.join(root, "src/features/epitaxy/cowork/CoworkActivityPanelShell.tsx")),
  coworkActivitySection: read(path.join(root, "src/features/epitaxy/cowork/CoworkActivitySection.tsx")),
  coworkProgress: read(path.join(root, "src/features/epitaxy/cowork/CoworkProgressSection.tsx")),
  coworkActivityContent: read(path.join(root, "src/features/epitaxy/cowork/CoworkActivityContent.tsx")),
  coworkScheduledRuns: read(path.join(root, "src/features/epitaxy/cowork/CoworkScheduledRunsSection.tsx")),
  recents: read(path.join(root, "src/shell/RecentsSection.tsx")),
  pinned: read(path.join(root, "src/shell/PinnedSection.tsx")),
  search: read(path.join(root, "src/shell/SearchCommandPalette.tsx")),
  statusGlyph: read(path.join(root, "src/shell/OfficialSidebarStatusGlyph.tsx")),
  scheduledTasks: read(path.join(root, "src/features/scheduled/ScheduledTasks.tsx")),
  scheduledDetail: read(path.join(root, "src/features/scheduled/ScheduledTaskDetail.tsx")),
  scheduledDetailBlocks: read(path.join(root, "src/features/scheduled/ScheduledTaskDetailBlocks.tsx")),
  scheduledForm: read(path.join(root, "src/features/scheduled/ScheduledTaskForm.tsx")),
  scheduledPrimitives: read(path.join(root, "src/features/scheduled/ScheduledPrimitives.tsx")),
};

const checks = [
  ["官方 code transcript virtualized DOM 存在", official.codeTranscript, ["epitaxy-virtual-transcript", "relative epitaxy-chat-column", "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0"]],
  ["本地 code transcript 使用官方 virtualized DOM", local.tile + local.components, ["data-testid=\"epitaxy-virtual-transcript\"", "relative epitaxy-chat-column", "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0"]],
  ["官方 code transcript 模式/思考字体依据存在", official.codeTranscript, ["Normal", "Thinking", "Verbose", "Summary", "text-body text-t6 italic whitespace-pre-wrap break-words"]],
  ["本地 code transcript 模式/思考字体对齐", local.tile + local.components, ["OfficialTranscriptMode", "normal\" | \"thinking\" | \"verbose\" | \"summary", "text-body text-t6 italic whitespace-pre-wrap break-words", "officialTranscriptModeShowsThinking"]],
  ["官方 code user 长文本 Show more 依据存在", official.codeTranscript, ["Show more", "mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)"]],
  ["本地 code user 长文本 Show more 对齐", local.tile, ["Show more", "Show less", "mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)"]],
  ["官方 cowork session row 使用状态 glyph 非 logo", official.sidebarCowork + official.sidebarIndex, ["CoworkSessionRow", "status-dot", "dframe-dot", "isAgentCompleted"]],
  ["本地 sidebar session row 使用官方状态 glyph", local.recents + local.pinned + local.search + local.statusGlyph, ["OfficialSidebarStatusGlyph", "status-dot", "dframe-dot", "df-leading-slot", "data-kind=\"awaiting\"", "data-kind=\"ready\""]],
  ["本地不再包含错误 logo 类", local.recents + local.pinned + local.search + local.statusGlyph, [[/claude-rebuild-logo/, false]]],
  ["官方 Cowork response body 字体依据存在", official.sidebarIndex, ["font-claude-response-body"]],
  ["本地 Cowork response body 字体对齐", local.coworkResponse, ["font-claude-response-body text-text-100 flex max-w-[72ch] flex-col gap-4"]],
  ["官方 Cowork 新任务/输入框文案依据存在", official.sidebarIndex + official.sidebarCowork, ["Write a message…", "agent_new_page", "Let's knock something off your list"]],
  ["本地 Cowork 新任务使用官方 prompt box，不再用旧猜测组件", local.coworkComposer + local.coworkNewTask, ["OfficialCoworkPromptBox", "createCoworkAddMenuItems", "CoworkSelectedFiles", "CoworkSelectedProjectIndicators", "placeholder=\"今天我可以帮助你做什么？\"", "OfficialCoworkSendButton"]],
  ["官方 Cowork 活动面板结构依据存在", official.sidebarIndex, ["const iQt=\"20rem\"", "Session activity panel", "h-full pl-2 pr-2 flex flex-col", "-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none", "flex flex-col gap-3 pt-2 pb-4 pointer-events-auto", "rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm", "can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer", "grid transition-[grid-template-rows] duration-200", "px-3 pb-3", "See task progress for longer tasks.", "View and open files created during this task.", "Track tools and referenced files used in this task.", "flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors text-sm", "size-2 rounded-full bg-accent-100 flex-shrink-0"]],
  ["本地 Cowork 活动面板按官方 class/DOM 对齐", local.coworkActivityShell + local.coworkActivitySection + local.coworkProgress + local.coworkActivityContent + local.coworkScheduledRuns, ["20rem", "Session activity panel", "h-full pl-2 pr-2 flex flex-col", "-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none", "flex flex-col gap-3 pt-2 pb-4 pointer-events-auto", "rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm overflow-hidden shrink-0", "can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer", "grid transition-[grid-template-rows] duration-200", "px-3 pb-3", "See task progress for longer tasks.", "View and open files created during this task.", "Track tools and referenced files used in this task.", "flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors text-sm", "size-2 rounded-full bg-accent-100 flex-shrink-0", "flex flex-col gap-px", "16rem", "Runs"]],
  ["官方 scheduled list/card 依据存在", official.scheduledList, ["Scheduled tasks", "No scheduled tasks yet.", "flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus", "Next run {date}", "Run once", "Paused"]],
  ["本地 scheduled list/card 对齐官方 class 和 badges", local.scheduledTasks, ["Scheduled tasks", "No scheduled tasks yet.", "flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus", "Next run", "Run once", "Paused", "ClockTimeslot", "ShieldCheck"]],
  ["官方 local routine form 依据存在", official.localRoutine, ["New local routine", "Local routines only run while your computer is awake.", "daily-code-review", "Scheduled tasks use a randomized delay of several minutes for server performance.", "epitaxy-textarea w-full min-h-[120px] !bg-transparent !shadow-none"]],
  ["本地 local routine form 对齐官方核心 class/文案", local.scheduledForm + local.scheduledPrimitives, ["New local routine", "Local routines only run while your computer is awake.", "daily-code-review", "Scheduled tasks use a randomized delay of several minutes for server performance.", "epitaxy-textarea w-full min-h-[120px] !bg-transparent !shadow-none"]],
  ["官方 local routine detail 依据存在", official.localRoutineDetail, ["EpitaxyLocalRoutineDetail", "h-full min-w-0 flex flex-col pt-[8px] pl-[8px]", "epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]", "grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8", "Run now", "In progress", "Always allowed", "Approvals you grant during a run appear here.", "Task file not found or has unexpected format.", "Scheduled tasks only run while your computer is awake.", "The previous run was still in progress.", "Other scheduled tasks were already running.", "Delete routine", "Any sessions from this task will be archived."]],
  ["本地 local routine detail 对齐官方核心 DOM/class/文案", local.scheduledDetail + local.scheduledDetailBlocks + local.scheduledPrimitives, ["h-full min-w-0 flex flex-col pt-[8px] pl-[8px]", "epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]", "grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8", "inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7", "flex flex-col gap-g3", "px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto", "group flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus", "flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1", "cds-reset relative inline-flex shrink-0 rounded-full border-0 outline-none bg-switch-track", "Run now", "In progress", "Manual only", "Active", "Paused", "Ran", "Always allowed", "Approvals you grant during a run appear here.", "Task file not found or has unexpected format.", "Scheduled tasks only run while your computer is awake.", "The previous run was still in progress.", "Other scheduled tasks were already running.", "Delete routine", "Any sessions from this task will be archived.", "TrashCanRound", "Play"]],
];

let failed = 0;
for (const [name, haystack, requirements] of checks) {
  const missing = [];
  for (const requirement of requirements) {
    if (Array.isArray(requirement)) {
      const [pattern, shouldExist] = requirement;
      const exists = new RegExp(pattern.source ?? pattern).test(haystack);
      if (exists !== shouldExist) missing.push(`${shouldExist ? "missing" : "forbidden present"}: ${pattern}`);
    } else if (requirement instanceof RegExp) {
      if (!requirement.test(haystack)) missing.push(`missing: ${requirement}`);
    } else if (!haystack.includes(requirement)) {
      missing.push(`missing: ${requirement}`);
    }
  }
  if (missing.length) {
    failed += 1;
    console.error(`[fail] ${name}`);
    for (const item of missing) console.error(`  - ${item}`);
  } else {
    console.log(`[ok] ${name}`);
  }
}
if (failed) process.exit(1);

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function readFirstExisting(files) {
  for (const file of files) if (fs.existsSync(file)) return read(file);
  return "";
}
