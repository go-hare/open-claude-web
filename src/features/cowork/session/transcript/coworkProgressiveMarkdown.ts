/**
 * Official progressive markdown chunker (pretty chunk c93fb40ec `Le` + `Oe`).
 * Source: ion-dist/assets/v1/c93fb40ec-C-L_NkHO.js ProgressiveStandardMarkDown.
 * Line-structure aware: code/math fences, lists, tables, blockquotes.
 */

export type CoworkProgressiveMarkdownChunks = {
  completedChunks: string[];
  streamingChunk: string;
};

/** Official Le — tracks open markdown structures while streaming. */
export class CoworkMarkdownStructureTracker {
  inCodeBlock = false;
  codeBlockDelimiter = "";
  inMathBlock = false;
  inList = false;
  inTable = false;
  inBlockquote = false;
  lastLineWasEmpty = true;

  isInsideStructure() {
    return this.inCodeBlock || this.inMathBlock || this.inList || this.inTable || this.inBlockquote;
  }

  processLine(line: string) {
    const trimmed = line.trim();
    const wasInside = this.isInsideStructure();
    if ((!trimmed.startsWith("```") && !trimmed.startsWith("~~~")) || this.inMathBlock) {
      // no fence transition
    } else if (this.inCodeBlock) {
      if (trimmed.startsWith(this.codeBlockDelimiter)) {
        this.inCodeBlock = false;
        this.codeBlockDelimiter = "";
      }
    } else {
      this.inCodeBlock = true;
      this.codeBlockDelimiter = trimmed.substring(0, 3);
    }
    if (trimmed === "$$" && !this.inCodeBlock) this.inMathBlock = !this.inMathBlock;
    const fenced = this.inCodeBlock || this.inMathBlock;
    if (/^[-*+]|\d+\./.test(trimmed) && !fenced) this.inList = true;
    else if (this.inList && trimmed === "") this.inList = false;
    if (trimmed.includes("|") && !fenced) this.inTable = true;
    else if (this.inTable && trimmed === "") this.inTable = false;
    const isQuote = trimmed.startsWith(">");
    if (isQuote && !fenced) this.inBlockquote = true;
    else if (this.inBlockquote && trimmed === "" && !isQuote) this.inBlockquote = false;
    const previousLineWasEmpty = this.lastLineWasEmpty;
    this.lastLineWasEmpty = trimmed === "";
    const structureJustClosed = wasInside && !this.isInsideStructure();
    return {
      insideStructure: this.isInsideStructure(),
      previousLineWasEmpty,
      structureJustClosed,
    };
  }

  reset() {
    this.inCodeBlock = false;
    this.codeBlockDelimiter = "";
    this.inMathBlock = false;
    this.inList = false;
    this.inTable = false;
    this.inBlockquote = false;
    this.lastLineWasEmpty = true;
  }
}

/**
 * Official Oe pure body (streaming branch).
 * Non-streaming: completedChunks=[text], streamingChunk="".
 */
export function computeCoworkProgressiveMarkdownChunks(
  text: string,
  isStreaming: boolean,
): CoworkProgressiveMarkdownChunks {
  if (!isStreaming) return { completedChunks: text ? [text] : [], streamingChunk: "" };
  if (!text) return { completedChunks: [], streamingChunk: "" };
  const tracker = new CoworkMarkdownStructureTracker();
  const lines = text.split("\n");
  const completedChunks: string[] = [];
  let current: string[] = [];
  let lastCompletedLineIndex = -1;
  tracker.reset();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    const { insideStructure, structureJustClosed, previousLineWasEmpty } = tracker.processLine(line);
    current.push(line);
    if (structureJustClosed || (!insideStructure && line.trim() === "" && current.length > 1 && !previousLineWasEmpty)) {
      while (current.length > 0 && (current[current.length - 1] ?? "").trim() === "") current.pop();
      if (current.length > 0) {
        completedChunks.push(current.join("\n"));
        lastCompletedLineIndex = index;
        current = [];
      }
    }
  }
  return {
    completedChunks,
    streamingChunk: lines.slice(lastCompletedLineIndex + 1).join("\n"),
  };
}
