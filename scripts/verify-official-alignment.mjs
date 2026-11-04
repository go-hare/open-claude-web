#!/usr/bin/env node
/**
 * Residual alignment smoke for open-claude-web vs ion-dist.
 *
 * Claude Desktop 2.31226.1 moved Code/Cowork bodies out of monolithic
 * index-BELzQL5P / c11959232-h_zsw3wI into split chunks (cd5a31703, shared-*,
 * c21f11e6d, …). Prefer new names; fall back to old when still present.
 *
 * Official-side checks whose residual DOM markers moved are soft-warned
 * (shell track). Local product checks still hard-fail.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const officialRoot = path.resolve(root, "../open-claude-desktop/resources/ion-dist/assets/v1");

function read(file) {
  return fs.readFileSync(file, "utf8");
}
function readFirstExisting(files) {
  for (const file of files) if (fs.existsSync(file)) return read(file);
  return "";
}
function readAllExisting(files) {
  return files.filter((file) => fs.existsSync(file)).map(read).join("\n");
}
function joinV1(...names) {
  return names.map((n) => path.join(officialRoot, n));
}

const official = {
  // Code transcript body: 2.31226 → cd5a31703 (+ queued strip); thin CDBo is not enough.
  codeTranscript: readFirstExisting(
    joinV1(
      "cd5a31703-B4nKQMBN.js",
      "c10f0af0c-D80FYKHo.js",
      "c11959232-CDBo_AYC.js",
      "c11959232-h_zsw3wI.js",
      "shared-24-DvPFiL5I.js",
      "shared-0-tP5vNlHv.js",
    ),
  ),
  // Cowork sidebar / session row
  sidebarCowork: readFirstExisting(
    joinV1("shared-22-DYCF-SVs.js", "shared-21-CGGmSsMS.js", "ca0135bc5-Cab670j1.js"),
  ),
  // Router / shell index + Cowork chrome split chunks
  sidebarIndex: readFirstExisting(
    joinV1(
      "index-D35w9RK9.js",
      "c62135ccf-Dn28vJ3V.js",
      "c21f11e6d-CxD82rYo.js",
      "shared-7-CJO19piq.js",
      "index-BELzQL5P.js",
    ),
  ),
  scheduledList: readFirstExisting(
    joinV1("cf400e6a4-DIoehjrK.js", "shared-2-DtKYxnkM.js", "c705e2e19-CdkFb_TH.js"),
  ),
  localRoutine: readFirstExisting(joinV1("c9e1458cd-C-OdbuDq.js", "c0243d234-BHUzHV1X.js")),
  localRoutineDetail: readFirstExisting(
    joinV1("cfc18e0f4-BHic8YEh.js", "cbd6c85c8-QTEA4fUC.js", "cfc18e0f4-BP16E1oT.js"),
  ),
  chatCss: readFirstExisting(
    joinV1("cca089f68-B_9i4gW6.js", "cca089f68-CTV9c1Kv.css", "c0d9175fe-CH-3lZ2a.css"),
  ),
};

const local = {
  tile: read(path.join(root, "src/features/epitaxy/EpitaxySessionTile.tsx")),
  components: read(path.join(root, "src/features/epitaxy/OfficialEpitaxyComponents.tsx")),
  // Code transcript body moved out of tile into session/OfficialTranscript*
  codeTranscriptLocal: readAllExisting([
    path.join(root, "src/features/epitaxy/session/OfficialTranscript.tsx"),
    path.join(root, "src/features/epitaxy/session/EpitaxyChatChrome.tsx"),
    path.join(root, "src/features/epitaxy/session/officialTranscriptMode.ts"),
    path.join(root, "src/features/epitaxy/session/OfficialSummaryTranscriptBody.tsx"),
  ]),
  coworkComposer: read(path.join(root, "src/features/cowork/composer/CoworkPromptBox.tsx")),
  coworkNewTask: read(path.join(root, "src/features/cowork/newTask/CoworkNewTaskPage.tsx")),
  coworkResponse: read(path.join(root, "src/features/cowork/session/transcript/CoworkMessagePrimitives.tsx")),
  coworkActivityShell: read(path.join(root, "src/features/cowork/session/activity/CoworkActivityPanelShell.tsx")),
  coworkActivitySection: read(path.join(root, "src/features/cowork/session/activity/CoworkActivitySection.tsx")),
  coworkProgress: read(path.join(root, "src/features/cowork/session/activity/CoworkProgressSection.tsx")),
  coworkActivityContent: read(path.join(root, "src/features/cowork/session/activity/CoworkActivityContent.tsx")),
  coworkScheduledRuns: read(path.join(root, "src/features/cowork/session/activity/CoworkScheduledRunsSection.tsx")),
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

/** Official residual markers that often rename across Desktop shells — soft if missing. */
const SOFT_OFFICIAL = true;

const checks = [
  ["官方 code transcript virtualized DOM 存在", official.codeTranscript, ["epitaxy-virtual-transcript", "relative epitaxy-chat-column", "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0"], { soft: SOFT_OFFICIAL }],
  ["本地 code transcript 使用官方 virtualized DOM", local.tile + local.components + local.codeTranscriptLocal, ["data-testid=\"epitaxy-virtual-transcript\"", "relative epitaxy-chat-column", "epitaxy-chat-size pb-[var(--chat-turn-gap)] empty:pb-0"]],
  ["官方 code transcript 模式/思考字体依据存在", official.codeTranscript, ["Normal", "Thinking", "Verbose", "Summary", "text-body text-t6 italic whitespace-pre-wrap break-words"], { soft: SOFT_OFFICIAL }],
  ["本地 code transcript 模式/思考字体对齐", local.tile + local.components + local.codeTranscriptLocal, ["OfficialTranscriptMode", "normal\" | \"thinking\" | \"verbose\" | \"summary", "text-body text-t6 italic whitespace-pre-wrap break-words", "officialTranscriptModeShowsThinking"]],
  ["官方 code user 长文本 Show more 依据存在", official.codeTranscript, ["Show more", "mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)"], { soft: SOFT_OFFICIAL }],
  ["本地 code user 长文本 Show more 对齐", local.tile + local.codeTranscriptLocal, ["Show more", "Show less", "mask-image:linear-gradient(to_bottom,black_calc(100%_-_3rem),transparent)"]],
  ["官方 cowork session row 使用状态 glyph 非 logo", official.sidebarCowork + official.sidebarIndex, ["CoworkSessionRow", "status-dot", "dframe-dot", "isAgentCompleted"], { soft: SOFT_OFFICIAL }],
  ["本地 sidebar session row 使用官方状态 glyph", local.recents + local.pinned + local.search + local.statusGlyph, ["OfficialSidebarStatusGlyph", "status-dot", "dframe-dot", "df-leading-slot", "data-kind=\"awaiting\"", "data-kind=\"ready\""]],
  ["本地不再包含错误 logo 类", local.recents + local.pinned + local.search + local.statusGlyph, [[/claude-rebuild-logo/, false]]],
  ["官方 Cowork response body 字体依据存在", official.sidebarIndex, ["font-claude-response-body"], { soft: SOFT_OFFICIAL }],
  ["本地 Cowork response body 字体对齐", local.coworkResponse, ["font-claude-response-body text-text-100 flex max-w-[72ch] flex-col gap-4"]],
  ["官方 Cowork 新任务/输入框文案依据存在", official.sidebarIndex + official.sidebarCowork, ["Write a message", "agent_new_page"], { soft: SOFT_OFFICIAL }],
  ["本地 Cowork 新任务使用官方 prompt box，不再用旧猜测组件", local.coworkComposer + local.coworkNewTask, ["function CoworkPromptBox", "createCoworkAddMenuItems", "CoworkSelectedFiles", "CoworkSelectedProjectIndicators", "chromeText.startTask"]],
  ["官方 Cowork 活动面板结构依据存在", official.sidebarIndex, ["Session activity panel"], { soft: SOFT_OFFICIAL }],
  // Structure/DOM class checks stay hard; EN copy that moved to i18n is soft on shell track.
  ["本地 Cowork 活动面板按官方 class/DOM 对齐", local.coworkActivityShell + local.coworkActivitySection + local.coworkProgress + local.coworkActivityContent + local.coworkScheduledRuns, ["20rem", "Session activity panel", "h-full pl-2 pr-2 flex flex-col", "-ml-8 -mr-2 pl-8 pr-2 overflow-y-auto flex-1 pointer-events-none", "flex flex-col gap-3 pt-2 pb-4 pointer-events-auto", "rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm overflow-hidden shrink-0", "can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer", "grid transition-[grid-template-rows] duration-200", "px-3 pb-3", "flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors text-sm", "size-2 rounded-full bg-accent-100 flex-shrink-0", "flex flex-col gap-px", "16rem", "Runs"]],
  ["本地 Cowork 活动面板 EN 文案（i18n 后可能软）", local.coworkActivityShell + local.coworkActivitySection + local.coworkProgress + local.coworkActivityContent, ["Progress on longer tasks appears here.", "View and open files created during this task.", "Track tools and referenced files used in this task."], { soft: true }],
  ["官方 scheduled list/card 依据存在", official.scheduledList, ["Scheduled tasks", "No scheduled tasks yet."], { soft: SOFT_OFFICIAL }],
  ["本地 scheduled list/card 对齐官方 class", local.scheduledTasks, ["flex items-center gap-g6 px-p7 py-p6 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus", "ClockTimeslot", "ShieldCheck"]],
  ["本地 scheduled EN 文案（i18n 后可能软）", local.scheduledTasks, ["Scheduled tasks", "No scheduled tasks yet.", "Next run", "Run once", "Paused"], { soft: true }],
  ["官方 local routine form 依据存在", official.localRoutine, ["New local routine", "Local routines only run while your computer is awake."], { soft: SOFT_OFFICIAL }],
  ["本地 local routine form 对齐官方核心 class", local.scheduledForm + local.scheduledPrimitives, ["epitaxy-textarea w-full min-h-[120px] !bg-transparent !shadow-none"]],
  ["本地 local routine placeholder id（可能软）", local.scheduledForm + local.scheduledPrimitives, ["daily-code-review"], { soft: true }],
  ["本地 local routine form EN 文案（i18n 后可能软）", local.scheduledForm + local.scheduledPrimitives, ["New local routine", "Local routines only run while your computer is awake.", "Scheduled tasks use a randomized delay of several minutes for server performance."], { soft: true }],
  ["官方 local routine detail 依据存在", official.localRoutineDetail, ["EpitaxyLocalRoutineDetail", "Run now", "Delete routine"], { soft: SOFT_OFFICIAL }],
  ["本地 local routine detail 对齐官方核心 DOM/class", local.scheduledDetail + local.scheduledDetailBlocks + local.scheduledPrimitives, ["h-full min-w-0 flex flex-col pt-[8px] pl-[8px]", "epitaxy-chat-column epitaxy-chat-size flex flex-col gap-g8 pt-[48px] pb-[32px]", "grid grid-cols-1 md:grid-cols-[1fr_1.4fr] gap-g8", "inline-flex items-center gap-g2 px-p4 py-p1 rounded-r4 bg-t2 text-footnote text-t7", "flex flex-col gap-g3", "px-p6 py-p5 rounded-r6 bg-t1 text-body text-t8 whitespace-pre-wrap break-words max-h-[480px] overflow-y-auto", "group flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1 hover:bg-t2 text-left outline-none hide-focus-ring ring-focus", "flex items-center gap-g4 px-p6 py-p4 rounded-r6 bg-t1", "cds-reset relative inline-flex shrink-0 rounded-full border-0 outline-none bg-switch-track", "TrashCanRound", "Play"]],
  ["本地 local routine detail EN 文案（i18n 后可能软）", local.scheduledDetail + local.scheduledDetailBlocks + local.scheduledPrimitives, ["Run now", "In progress", "Manual only", "Active", "Paused", "Ran", "Always allowed", "Approvals you grant during a run appear here.", "Task file not found or has unexpected format.", "Scheduled tasks only run while your computer is awake.", "The previous run was still in progress.", "Other scheduled tasks were already running.", "Delete routine", "Any sessions from this task will be archived."], { soft: true }],
];

let failed = 0;
for (const entry of checks) {
  const [name, haystack, requirements, opts = {}] = entry;
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
    if (opts.soft) {
      console.warn(`[soft] ${name}`);
      for (const item of missing) console.warn(`  - ${item}`);
    } else {
      failed += 1;
      console.error(`[fail] ${name}`);
      for (const item of missing) console.error(`  - ${item}`);
    }
  } else {
    console.log(`[ok] ${name}`);
  }
}
if (failed) process.exit(1);
console.log("OK verify-official-alignment (2.31226 retarget)");
