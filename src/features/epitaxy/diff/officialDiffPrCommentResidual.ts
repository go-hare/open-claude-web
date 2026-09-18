/**
 * Official c9a932a07 Ec / aN / ic / nc / Dc residual.
 * - aN: map getPrReviewComments row → annotation (`pr-${id}`, url:e.url)
 * - ic: prepend staged PR comments onto composer submit text
 * - nc: snippet from Pierre fileDiff lines
 * - Cc/Sc/Dc: suggestion fences + <details> body parse
 */

export const OFFICIAL_PR_SUGGESTION_RE = /```suggestion\r?\n([\s\S]*?)^```[ \t]*$/gm;
export const OFFICIAL_PR_DETAILS_RE =
  /<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi;

export type OfficialPrReviewCommentRow = {
  author?: string;
  body?: string;
  id?: string | number;
  line?: number;
  path?: string;
  resolved?: boolean;
  url?: string;
};

export type OfficialMappedPrComment = {
  author?: string;
  body: string;
  createdAt: number;
  endLine: number;
  filePath: string;
  id: string;
  resolved: boolean;
  side: "additions";
  source: "pr";
  startLine: number;
  url?: string;
};

/** Official c119 `aN`. null when line is missing. */
export function mapOfficialPrReviewComment(
  row: OfficialPrReviewCommentRow,
): OfficialMappedPrComment | null {
  if (row.line == null) return null;
  return {
    author: row.author,
    body: row.body ?? "",
    createdAt: Date.now(),
    endLine: row.line,
    filePath: row.path ?? "",
    id: `pr-${row.id}`,
    resolved: row.resolved ?? false,
    side: "additions",
    source: "pr",
    startLine: row.line,
    url: row.url,
  };
}

export type OfficialStagedPrComment = {
  author?: string;
  body: string;
  endLine: number;
  filePath: string;
  lang?: string;
  snippet?: string;
  startLine: number;
};

/** Official c9a `ic` — prepend staged PR comments to composer text. */
export function prependOfficialStagedPrComments(
  comments: readonly OfficialStagedPrComment[],
  text: string,
): string {
  const blocks: string[] = [];
  const byFile = new Map<string, OfficialStagedPrComment[]>();
  for (const comment of comments) {
    const list = byFile.get(comment.filePath) ?? [];
    list.push(comment);
    byFile.set(comment.filePath, list);
  }
  for (const [filePath, list] of byFile) {
    const sorted = [...list].sort((a, b) => a.startLine - b.startLine);
    for (const comment of sorted) {
      const lines = [
        `In \`${filePath}\` at ${
          comment.startLine === comment.endLine
            ? `line ${comment.startLine}`
            : `lines ${comment.startLine}-${comment.endLine}`
        }${comment.author ? ` — review comment from @${comment.author}` : ""}:`,
      ];
      if (comment.snippet) {
        const longest = comment.snippet.match(/`+/g)?.reduce((max, ticks) => Math.max(max, ticks.length), 0) ?? 0;
        const fence = "`".repeat(Math.max(3, longest + 1));
        lines.push(`${fence}${comment.lang ?? ""}`, comment.snippet, fence);
      }
      lines.push(comment.body);
      blocks.push(lines.join("\n"));
    }
  }
  const trimmed = text.trim();
  if (blocks.length === 0) return trimmed;
  return trimmed ? `${blocks.join("\n\n")}\n\n\n${trimmed}` : blocks.join("\n\n");
}

export type OfficialPierreSnippetSource = {
  additionLines: string[];
  deletionLines: string[];
  hunks: Array<{
    additionCount: number;
    additionLineIndex: number;
    additionStart: number;
    deletionCount: number;
    deletionLineIndex: number;
    deletionStart: number;
  }>;
  isPartial?: boolean;
};

/** Official c9a `nc` — line-range snippet from Pierre fileDiff. */
export function extractOfficialDiffSnippet(
  fileDiff: OfficialPierreSnippetSource,
  side: "additions" | "deletions",
  startLine: number,
  endLine: number,
): string | undefined {
  const lines = side === "additions" ? fileDiff.additionLines : fileDiff.deletionLines;
  const toIndex = (line: number): number | undefined => {
    if (!fileDiff.isPartial) return line - 1;
    for (const hunk of fileDiff.hunks) {
      const start = side === "additions" ? hunk.additionStart : hunk.deletionStart;
      const count = side === "additions" ? hunk.additionCount : hunk.deletionCount;
      if (line >= start && line < start + count) {
        const index = side === "additions" ? hunk.additionLineIndex : hunk.deletionLineIndex;
        return index + (line - start);
      }
    }
    return undefined;
  };
  const startIndex = toIndex(startLine);
  const endIndex = toIndex(endLine);
  if (startIndex === undefined || endIndex === undefined) return undefined;
  if (endIndex - startIndex !== endLine - startLine) return undefined;
  return lines.slice(startIndex, endIndex + 1).join("").trimEnd();
}

/** Official c9a `Dc`. original undefined → null patch. */
export function buildOfficialSuggestionPatch(
  filePath: string,
  startLine: number,
  original: string | undefined,
  suggestion: string,
): string | null {
  if (original === undefined) return null;
  const oldLines = original.split("\n");
  const newLines = suggestion === "" ? [] : suggestion.split("\n");
  return [
    `--- a/${filePath}`,
    `+++ b/${filePath}`,
    `@@ -${startLine},${oldLines.length} +${startLine},${newLines.length} @@`,
    ...oldLines.map((line) => `-${line}`),
    ...newLines.map((line) => `+${line}`),
  ].join("\n");
}

export type OfficialPrCommentSegment =
  | { kind: "text"; text: string }
  | { kind: "details"; summary: string; body: string }
  | {
      kind: "suggestion";
      file: { cacheKey: string; contents: string; lang: string; name: string };
      patch: string | null;
    };

/** Official Ec body parser (Cc suggestion fences + Sc details). */
export function parseOfficialPrCommentBody(
  body: string,
  filePath: string,
  startLine: number,
  original: string | undefined,
  lang: string,
): OfficialPrCommentSegment[] {
  const segments: OfficialPrCommentSegment[] = [];
  const parseSuggestions = (text: string) => {
    let cursor = 0;
    const suggestionRe = new RegExp(OFFICIAL_PR_SUGGESTION_RE.source, "gm");
    for (const match of text.matchAll(suggestionRe)) {
      const before = text.slice(cursor, match.index).trim();
      if (before) segments.push({ kind: "text", text: before });
      const suggestion = match[1].replace(/\r?\n$/, "");
      segments.push({
        kind: "suggestion",
        file: {
          cacheKey: suggestion,
          contents: suggestion,
          lang,
          name: filePath,
        },
        patch: buildOfficialSuggestionPatch(filePath, startLine, original, suggestion),
      });
      cursor = (match.index ?? 0) + match[0].length;
    }
    const rest = text.slice(cursor).trim();
    if (rest) segments.push({ kind: "text", text: rest });
  };
  let cursor = 0;
  const detailsRe = new RegExp(OFFICIAL_PR_DETAILS_RE.source, "gi");
  for (const match of body.matchAll(detailsRe)) {
    parseSuggestions(body.slice(cursor, match.index));
    segments.push({
      kind: "details",
      body: match[2].trim(),
      summary: match[1].trim(),
    });
    cursor = (match.index ?? 0) + match[0].length;
  }
  parseSuggestions(body.slice(cursor));
  return segments.length > 0 ? segments : [{ kind: "text", text: body }];
}
