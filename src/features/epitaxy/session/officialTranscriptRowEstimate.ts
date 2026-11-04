/**
 * Official cd5a31703 `$it` / `aat` / `h7` / `m7` / `Sit` row estimate.
 *
 * Product Fu still uses TanStack `estimateSize` (Gb `Wb` was a coarse 400/80/48
 * on older Code). Pin 2.31226.1 Code windowing (`$it`) sizes by item kind so a
 * streaming tool row is ~Y5 (40px) per Sit-coalesced run, not 400px of empty
 * sizer that later collapses and shoves the list.
 *
 * Product rows are only assistant / user / loader (no init/pool mermaid invent).
 */
import type { EditorSize } from "../diff/officialEpitaxyEditorPrefs";
import type { TranscriptEntry, TranscriptEntryItem, TranscriptToolUse } from "./officialTranscriptParse";

/** Official B5 line px at Medium. */
export const OFFICIAL_ESTIMATE_LINE_PX = 20;
/** Official q5 blank/fence bump. */
const OFFICIAL_ESTIMATE_BLANK_PX = 10;
/** Official W5 assistant chrome. */
const OFFICIAL_ESTIMATE_ASSISTANT_CHROME_PX = 57;
/** Official G5 assistant gap. */
const OFFICIAL_ESTIMATE_ASSISTANT_GAP_PX = 8;
/** Official K5 user chrome. */
const OFFICIAL_ESTIMATE_USER_CHROME_PX = 49;
/** Official Y5 tool-run row. */
export const OFFICIAL_ESTIMATE_TOOL_ROW_PX = 40;
/** Official X5 verbose tool body. */
const OFFICIAL_ESTIMATE_VERBOSE_BODY_PX = 400;
/** Official o7 default item. */
const OFFICIAL_ESTIMATE_DEFAULT_ITEM_PX = 48;
/** Official a7 context/stats. */
const OFFICIAL_ESTIMATE_CONTEXT_PX = 220;
/** Official rit collapsed thinking. */
const OFFICIAL_ESTIMATE_COLLAPSED_THINKING_PX = 24;
/** Official mit host loader. */
const OFFICIAL_ESTIMATE_LOADER_PX = 48;
/** Official nit user-text cap. */
const OFFICIAL_ESTIMATE_USER_TEXT_CAP_PX = 256;
/** Official U5.m = 960 / 7.5. */
const OFFICIAL_ESTIMATE_CHARS_PER_LINE_M = 960 / 7.5;
const OFFICIAL_ESTIMATE_CHARS_PER_LINE: Record<EditorSize, number> = {
  s: 768 / 7.5,
  m: OFFICIAL_ESTIMATE_CHARS_PER_LINE_M,
  l: 1280 / 7.5,
};

export type OfficialTranscriptEstimateRow =
  | { entry: TranscriptEntry; kind: "assistant" | "user" }
  | { kind: "loader" };

export type OfficialTranscriptEstimateOpts = {
  chatTextSize?: EditorSize;
  showThinking?: boolean;
  verboseToolBodies?: boolean;
};

/** Official m7: wrap text at charsPerLine × linePx, cap 200 lines. */
export function officialEstimateWrapPx(
  text: string,
  charsPerLine: number,
  fenceBlanks: boolean,
  linePx = OFFICIAL_ESTIMATE_LINE_PX,
) {
  if (typeof text !== "string" || text.length === 0) return linePx;
  if (text.length >= charsPerLine * 200) return 200 * linePx;
  let height = 0;
  let inFence = false;
  for (const line of text.split("\n")) {
    if (fenceBlanks && line.startsWith("```")) {
      inFence = !inFence;
      height += OFFICIAL_ESTIMATE_BLANK_PX;
      continue;
    }
    if (fenceBlanks && !inFence && line.length === 0) {
      height += OFFICIAL_ESTIMATE_BLANK_PX;
      continue;
    }
    height += Math.max(1, Math.ceil(line.length / charsPerLine)) * linePx;
  }
  return Math.max(linePx, height);
}

/**
 * Official `w7` / `Sit`: Task/Agent split a new estimate row; consecutive
 * other tools coalesce to one Y5 row. Empty → 1.
 */
export function officialEstimateToolRunCount(tools: TranscriptToolUse[]) {
  let count = 0;
  let coalesced = false;
  for (const tool of tools) {
    if (tool.name === "Task" || tool.name === "Agent") {
      count += 1;
      coalesced = false;
    } else {
      coalesced ||= (count += 1, true);
    }
  }
  return Math.max(1, count);
}

function estimateToolsItemPx(
  tools: TranscriptToolUse[] | undefined,
  charsPerLine: number,
  showThinking: boolean,
  verboseToolBodies: boolean,
) {
  if (!tools?.length) return OFFICIAL_ESTIMATE_TOOL_ROW_PX;
  let thinking = 0;
  if (showThinking) {
    for (const tool of tools) {
      const preceding = tool.precedingThinking;
      if (!preceding?.length) continue;
      thinking += OFFICIAL_ESTIMATE_TOOL_ROW_PX;
      for (const block of preceding) {
        thinking += officialEstimateWrapPx(block, charsPerLine, false) + 10;
      }
    }
  }
  const runs = officialEstimateToolRunCount(tools) * OFFICIAL_ESTIMATE_TOOL_ROW_PX;
  const verbose = verboseToolBodies
    ? tools.reduce((sum, tool) => sum + (tool.output ? OFFICIAL_ESTIMATE_VERBOSE_BODY_PX : 0), 0)
    : 0;
  return runs + thinking + verbose;
}

/** Official h7 for product item kinds. */
function estimateItemPx(
  item: TranscriptEntryItem,
  isUser: boolean,
  charsPerLine: number,
  showThinking: boolean,
  verboseToolBodies: boolean,
) {
  switch (item.kind) {
    case "text":
    case "error": {
      const text = item.kind === "error" ? item.text : item.text;
      const wrap = officialEstimateWrapPx(text, charsPerLine, item.kind === "text" && !isUser);
      return (isUser ? Math.min(wrap, OFFICIAL_ESTIMATE_USER_TEXT_CAP_PX) : wrap) + 10;
    }
    case "thinking":
      return showThinking
        ? officialEstimateWrapPx(item.text, charsPerLine, false) + 10
        : OFFICIAL_ESTIMATE_COLLAPSED_THINKING_PX;
    case "tools":
      return estimateToolsItemPx(item.tools, charsPerLine, showThinking, verboseToolBodies);
    case "image":
    case "uploaded-file":
      return isUser ? 0 : OFFICIAL_ESTIMATE_DEFAULT_ITEM_PX;
    case "file":
      return isUser ? 0 : OFFICIAL_ESTIMATE_DEFAULT_ITEM_PX;
    case "context":
    case "stats":
      return OFFICIAL_ESTIMATE_CONTEXT_PX;
    default:
      return OFFICIAL_ESTIMATE_DEFAULT_ITEM_PX;
  }
}

/** Official y7 without image-grid / Q5 extras (those are 0 at default $5). */
function estimateEntryBodyPx(
  entry: TranscriptEntry,
  chromePx: number,
  isUser: boolean,
  charsPerLine: number,
  showThinking: boolean,
  verboseToolBodies: boolean,
) {
  let height = chromePx;
  for (const item of entry.items ?? []) {
    height += estimateItemPx(item, isUser, charsPerLine, showThinking, verboseToolBodies);
  }
  return Math.min(height, 4000);
}

/** Official `$it` for product TranscriptRow kinds. */
export function estimateOfficialTranscriptRowSize(
  row: OfficialTranscriptEstimateRow,
  opts: OfficialTranscriptEstimateOpts = {},
) {
  try {
    if (!row) return OFFICIAL_ESTIMATE_LOADER_PX;
    if (row.kind === "loader") return OFFICIAL_ESTIMATE_LOADER_PX;
    const charsPerLine = OFFICIAL_ESTIMATE_CHARS_PER_LINE[opts.chatTextSize ?? "m"] ?? OFFICIAL_ESTIMATE_CHARS_PER_LINE.m;
    const showThinking = opts.showThinking === true;
    const verboseToolBodies = opts.verboseToolBodies === true;
    const size = row.kind === "user"
      ? estimateEntryBodyPx(row.entry, OFFICIAL_ESTIMATE_USER_CHROME_PX, true, charsPerLine, false, false)
      : estimateEntryBodyPx(row.entry, OFFICIAL_ESTIMATE_ASSISTANT_CHROME_PX, false, charsPerLine, showThinking, verboseToolBodies) + OFFICIAL_ESTIMATE_ASSISTANT_GAP_PX;
    return Number.isFinite(size) && size > 0 ? size : OFFICIAL_ESTIMATE_LOADER_PX;
  } catch {
    return OFFICIAL_ESTIMATE_LOADER_PX;
  }
}
