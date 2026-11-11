/**
 * Official c966e2bd9 ANSI split + c7146e7f4 `F`/`O`/`k` shell-output paint.
 * SGR (`m`) becomes spans. Every other CSI/OSC sequence is dropped, not printed.
 */
import type { CSSProperties } from "react";

const ANSI_RE =
  /\x1b(?:\[[0-9:;<=>?]*[ -/]*[@-~]|[\]P^_Xk][^\x07\x1b]*(?:\x07|\x1b\\)?|[ -/]*[0-OQ-WYZ\\`a-jl-~])/g;

const ANSI_NORMAL: Record<number, string> = {
  0: "#4d4d4c",
  1: "#c82829",
  2: "#718c00",
  3: "#eab700",
  4: "#4271ae",
  5: "#8959a8",
  6: "#3e999f",
  7: "#d6d6d6",
};
const ANSI_BRIGHT: Record<number, string> = {
  0: "#8e908c",
  1: "#f5871f",
  2: "#a2bd40",
  3: "#f0c674",
  4: "#6ca4e0",
  5: "#b777db",
  6: "#6bc8cd",
  7: "#ffffff",
};

export type OfficialAnsiStyle = {
  bg?: string;
  bold?: boolean;
  dim?: boolean;
  fg?: string;
  inverse?: boolean;
  italic?: boolean;
  strikethrough?: boolean;
  underline?: boolean;
};

export type OfficialAnsiSegment = {
  style: OfficialAnsiStyle;
  text: string;
};

const SGR_PARAMS = /^[0-9;]*$/;
const SEGMENT_CAP = 2000;
const HUNK_RE = /@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/y;
const HUNK_SEARCH_RE = /^@@ -\d+(?:,(\d+))? \+\d+(?:,(\d+))? @@/m;
const WORD_MARK_RE = /\[-|{\+/g;

const ADDED_LINE: CSSProperties = { display: "block", background: "var(--cds-bg-git-added)" };
const REMOVED_LINE: CSSProperties = { display: "block", background: "var(--cds-bg-git-removed)" };
const WORD_MARKS: Record<string, { close: string; style: CSSProperties }> = {
  "[-": { close: "-]", style: { background: REMOVED_LINE.background } },
  "{+": { close: "+}", style: { background: ADDED_LINE.background } },
};

export type OfficialShellDiffMode = "either" | "lines" | "words";

export type OfficialPaintSegment = {
  style?: CSSProperties;
  text: string;
};

/** Official c966e2bd9 `t` — export `n`. */
export function officialAnsiTextHasSequences(text: string) {
  ANSI_RE.lastIndex = 0;
  return ANSI_RE.test(text);
}

function ansiCube(value: number) {
  if (value < 0 || value > 255) return undefined;
  if (value < 8) return ANSI_NORMAL[value];
  if (value < 16) return ANSI_BRIGHT[value - 8];
  if (value < 232) {
    const index = value - 16;
    const red = Math.floor(index / 36);
    const green = Math.floor((index % 36) / 6);
    const blue = index % 6;
    const channel = (part: number) => (part === 0 ? 0 : 55 + part * 40).toString(16).padStart(2, "0");
    return `#${channel(red)}${channel(green)}${channel(blue)}`;
  }
  const gray = (8 + (value - 232) * 10).toString(16).padStart(2, "0");
  return `#${gray}${gray}${gray}`;
}

function applySgr(params: number[], previous: OfficialAnsiStyle): OfficialAnsiStyle {
  const next: OfficialAnsiStyle = { ...previous };
  for (let index = 0; index < params.length; index += 1) {
    const code = params[index];
    switch (code) {
      case 0:
        return applySgr(params.slice(index + 1), {});
      case 1:
        next.bold = true;
        break;
      case 2:
        next.dim = true;
        break;
      case 3:
        next.italic = true;
        break;
      case 4:
        next.underline = true;
        break;
      case 7:
        next.inverse = true;
        break;
      case 9:
        next.strikethrough = true;
        break;
      case 22:
        next.bold = false;
        next.dim = false;
        break;
      case 23:
        next.italic = false;
        break;
      case 24:
        next.underline = false;
        break;
      case 27:
        next.inverse = false;
        break;
      case 29:
        next.strikethrough = false;
        break;
      case 39:
        delete next.fg;
        break;
      case 49:
        delete next.bg;
        break;
      default:
        if (code >= 30 && code <= 37) next.fg = ANSI_NORMAL[code - 30];
        else if (code >= 40 && code <= 47) next.bg = ANSI_NORMAL[code - 40];
        else if (code >= 90 && code <= 97) next.fg = ANSI_BRIGHT[code - 90];
        else if (code >= 100 && code <= 107) next.bg = ANSI_BRIGHT[code - 100];
        else if (code === 38) {
          if (params[index + 1] === 5 && index + 2 < params.length) {
            next.fg = ansiCube(params[index + 2] ?? 0);
            index += 2;
          } else if (params[index + 1] === 2 && index + 4 < params.length) {
            const red = (params[index + 2] ?? 0).toString(16).padStart(2, "0");
            const green = (params[index + 3] ?? 0).toString(16).padStart(2, "0");
            const blue = (params[index + 4] ?? 0).toString(16).padStart(2, "0");
            next.fg = `#${red}${green}${blue}`;
            index += 4;
          }
        } else if (code === 48) {
          if (params[index + 1] === 5 && index + 2 < params.length) {
            next.bg = ansiCube(params[index + 2] ?? 0);
            index += 2;
          } else if (params[index + 1] === 2 && index + 4 < params.length) {
            const red = (params[index + 2] ?? 0).toString(16).padStart(2, "0");
            const green = (params[index + 3] ?? 0).toString(16).padStart(2, "0");
            const blue = (params[index + 4] ?? 0).toString(16).padStart(2, "0");
            next.bg = `#${red}${green}${blue}`;
            index += 4;
          }
        }
    }
  }
  return next;
}

/** Official c966e2bd9 `c` — export `r`. Non-SGR sequences are consumed and not emitted. */
export function officialParseAnsiText(text: string): OfficialAnsiSegment[] {
  const segments: OfficialAnsiSegment[] = [];
  let style: OfficialAnsiStyle = {};
  let cursor = 0;
  ANSI_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ANSI_RE.exec(text)) !== null) {
    if (match.index > cursor) {
      const slice = text.slice(cursor, match.index);
      if (slice) segments.push({ text: slice, style });
    }
    cursor = match.index + match[0].length;
    const sequence = match[0];
    const params = sequence.slice(2, -1);
    if (sequence.startsWith("\u001b[") && sequence.endsWith("m") && SGR_PARAMS.test(params)) {
      style = applySgr(params === "" ? [0] : params.split(";").map((part) => parseInt(part, 10) || 0), style);
    }
  }
  if (cursor < text.length) {
    const slice = text.slice(cursor);
    if (slice) segments.push({ text: slice, style });
  }
  return segments;
}

/** Official c966e2bd9 `l` — export `t`. */
export function officialAnsiStyleToCss(style: OfficialAnsiStyle): CSSProperties | undefined {
  const css: CSSProperties = {};
  let painted = false;
  if (style.bold) {
    css.fontWeight = "bold";
    css.fontVariationSettings = "normal";
    painted = true;
  }
  if (style.dim) {
    css.opacity = 0.7;
    painted = true;
  }
  if (style.italic) {
    css.fontStyle = "italic";
    painted = true;
  }
  if (style.underline) {
    css.textDecoration = "underline";
    painted = true;
  }
  if (style.strikethrough) {
    css.textDecoration = style.underline ? "underline line-through" : "line-through";
    painted = true;
  }
  const color = style.inverse ? style.bg ?? "Canvas" : style.fg;
  const background = style.inverse ? style.fg ?? "CanvasText" : style.bg;
  if (color) {
    css.color = color;
    painted = true;
  }
  if (background) {
    css.backgroundColor = background;
    painted = true;
  }
  return painted ? css : undefined;
}

/** Official c7146e7f4 `O` — export `a`. Command selects git word-diff vs line diff. */
export function officialShellDiffMode(command: string | null | undefined): OfficialShellDiffMode {
  if (!command) return "either";
  return /--(?:word-diff|color-words)/.test(command) ? "words" : "lines";
}

function cutPainter(text: string) {
  const segments: OfficialPaintSegment[] = [];
  let cursor = 0;
  let style: CSSProperties | undefined;
  const cut = (next: number, nextStyle: CSSProperties | undefined) => {
    if (next > cursor) segments.push({ text: text.slice(cursor, next), style });
    cursor = next;
    style = nextStyle;
  };
  return {
    segments,
    cut,
    colored: () => {
      cut(text.length, undefined);
      return segments.some((segment) => segment.style) ? segments : null;
    },
  };
}

function lineDiffSegments(text: string) {
  const painter = cutPainter(text);
  let removed = 0;
  let added = 0;
  let current: CSSProperties | undefined;
  let addsUp = true;
  let cursor = 0;
  while (cursor < text.length && painter.segments.length < SEGMENT_CAP) {
    const newline = text.indexOf("\n", cursor);
    const marker = newline === cursor || text.startsWith("\r\n", cursor) ? " " : text[cursor];
    let style: CSSProperties | undefined;
    if (marker === "+" && added > 0) {
      added -= 1;
      style = ADDED_LINE;
    } else if (marker === "-" && removed > 0) {
      removed -= 1;
      style = REMOVED_LINE;
    } else if (marker === " " && removed > 0 && added > 0) {
      removed -= 1;
      added -= 1;
    } else if (marker !== "\\") {
      addsUp &&= removed + added === 0;
      HUNK_RE.lastIndex = cursor;
      const hunk = HUNK_RE.exec(text);
      removed = hunk ? Number(hunk[1] ?? 1) : 0;
      added = hunk ? Number(hunk[2] ?? 1) : 0;
    }
    if (style !== current) {
      painter.cut(cursor, style);
      current = style;
    }
    cursor = newline < 0 ? text.length : newline + 1;
  }
  addsUp &&= cursor < text.length || removed + added === 0;
  painter.cut(cursor, undefined);
  return { segments: painter.colored(), addsUp };
}

function wordDiffSegments(text: string, from: number) {
  const painter = cutPainter(text);
  let cursor = from;
  while (cursor < text.length && painter.segments.length < SEGMENT_CAP) {
    const newline = text.indexOf("\n", cursor);
    const line = text.slice(cursor, newline < 0 ? undefined : newline);
    const opened = new Set<string>();
    WORD_MARK_RE.lastIndex = 0;
    let mark = WORD_MARK_RE.exec(line);
    while (mark && painter.segments.length < SEGMENT_CAP) {
      const spec = WORD_MARKS[mark[0]];
      if (!spec) break;
      const closeAt = opened.has(mark[0]) ? -1 : line.indexOf(spec.close, WORD_MARK_RE.lastIndex);
      if (closeAt === -1) {
        opened.add(mark[0]);
        mark = WORD_MARK_RE.exec(line);
        continue;
      }
      WORD_MARK_RE.lastIndex = closeAt + spec.close.length;
      painter.cut(cursor + mark.index, spec.style);
      painter.cut(cursor + WORD_MARK_RE.lastIndex, undefined);
      mark = WORD_MARK_RE.exec(line);
    }
    cursor += line.length + 1;
  }
  return painter.colored();
}

/** Official c7146e7f4 `k`. Null when the text is not a diff. */
export function officialShellDiffSegments(text: string, mode: OfficialShellDiffMode): OfficialPaintSegment[] | null {
  const hunk = HUNK_SEARCH_RE.exec(text);
  if (!hunk) return null;
  const words = mode === "lines" ? null : wordDiffSegments(text, hunk.index);
  if (mode === "words") return words;
  const lines = lineDiffSegments(text);
  return words && !(lines.segments && lines.addsUp) ? words : lines.segments;
}

/** Official c7146e7f4 `F` segment list. Null means paint the string as-is. */
export function officialShellOutputSegments(text: string, command?: string | null): OfficialPaintSegment[] | null {
  if (officialAnsiTextHasSequences(text)) {
    return officialParseAnsiText(text).map((segment) => ({
      text: segment.text,
      style: officialAnsiStyleToCss(segment.style),
    }));
  }
  return officialShellDiffSegments(text, officialShellDiffMode(command));
}
