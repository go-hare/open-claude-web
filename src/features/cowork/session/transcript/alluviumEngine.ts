/**
 * Official Alluvium incremental markdown engine residual
 * (ion-dist c93fb40ec-C-L_NkHO.js `class ae` + `function ne` + line `ge`).
 * Pure parse — no React. Snapshot shape: { committed, frontier, held }.
 */

export type AlluviumInlineNode =
  | { kind: "text"; value: string }
  | { kind: "code"; value: string; open?: boolean }
  | { kind: "strong" | "em" | "del"; children: AlluviumInlineNode[]; open?: boolean }
  | { kind: "link"; children: AlluviumInlineNode[]; url: string | null; open?: boolean }
  | { kind: "image"; alt: string; url: string | null; open?: boolean };

export type AlluviumBlock =
  | { kind: "paragraph"; lines: AlluviumInlineNode[][] }
  | { kind: "heading"; level: number; children: AlluviumInlineNode[] }
  | { kind: "list"; ordered: boolean; start: number; items: AlluviumInlineNode[][] }
  | { kind: "blockquote"; lines: AlluviumInlineNode[][] }
  | { kind: "fence"; lang: string; code: string; langSettled?: boolean }
  | { kind: "hr" };

export type AlluviumSnapshot = {
  committed: AlluviumBlock[];
  frontier: AlluviumBlock[];
  held: string | null;
};

const ESCAPE = /[!"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~]/;
const AUTOLINK = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^\s<>]*$/;
const HEADING = /^(#{1,6})\s+(.*)$/;
const UL = /^[-*+]\s+(.*)$/;
const OL = /^(\d{1,9})[.)]\s+(.*)$/;
const QUOTE = /^>\s?(.*)$/;
const FENCE = /^(`{3,}|~{3,})\s*(\S*)\s*$/;
const HR = /^ {0,3}([-*_])(?: *\1){2,}\s*$/;
const SETEXT = /^ {0,3}(=+|-+)\s*$/;

function isSpace(ch: string): boolean {
  return ch === " " || ch === "\t" || ch === "\n";
}

function isAlnum(ch: string): boolean {
  return /[a-zA-Z0-9]/.test(ch);
}

function findLastIndex<T>(arr: T[], pred: (item: T) => boolean): number {
  for (let i = arr.length - 1; i >= 0; i -= 1) {
    if (pred(arr[i]!)) return i;
  }
  return -1;
}

function flattenInlineText(nodes: AlluviumInlineNode[]): string {
  let out = "";
  for (const node of nodes) {
    if (node.kind === "text" || node.kind === "code") out += node.value;
    else if (node.kind === "image") out += node.alt;
    else if (
      node.kind === "strong" ||
      node.kind === "em" ||
      node.kind === "del" ||
      node.kind === "link"
    ) {
      out += flattenInlineText(node.children);
    }
  }
  return out;
}

function parseUrlTitle(raw: string): string {
  const match = raw.match(/^(\S*)\s+(["'])(.*)\2\s*$/);
  return match?.[1] ?? raw;
}

/** Official `ne(text, finalize)`. */
export function parseAlluviumInline(text: string, finalize = false): AlluviumInlineNode[] {
  const nodes: AlluviumInlineNode[] = [];
  type Open = {
    kind: "code" | "strong" | "em" | "del" | "link" | "image";
    marker: string;
    childStart: number;
  };
  const open: Open[] = [];
  let i = 0;

  const pushText = (value: string) => {
    if (!value.length) return;
    const last = nodes[nodes.length - 1];
    const blocked = open.some((item) => item.childStart === nodes.length);
    if (last && last.kind === "text" && !blocked) last.value += value;
    else nodes.push({ kind: "text", value });
  };

  const closeOpen = (item: Open, stillOpen: boolean, url: string | null = null) => {
    const children = nodes.splice(item.childStart);
    if (item.kind === "code") {
      let value = flattenInlineText(children);
      if (
        !stillOpen &&
        value.length > 1 &&
        value.startsWith(" ") &&
        value.endsWith(" ") &&
        value.trim() !== ""
      ) {
        value = value.slice(1, -1);
      }
      nodes.push({ kind: "code", value, open: stillOpen });
    } else if (item.kind === "link") {
      nodes.push({ kind: "link", children, url, open: stillOpen });
    } else if (item.kind === "image") {
      nodes.push({ kind: "image", alt: flattenInlineText(children), url, open: stillOpen });
    } else {
      nodes.push({ kind: item.kind, children, open: stillOpen });
    }
  };

  const uncloseAsText = (index: number) => {
    const item = open[index]!;
    open.splice(index, 1);
    nodes.splice(item.childStart, 0, { kind: "text", value: item.marker });
    for (let j = index; j < open.length; j += 1) open[j]!.childStart += 1;
  };

  while (i < text.length) {
    const ch = text[i]!;
    if (ch === "`") {
      const top = open[open.length - 1];
      if (top?.kind === "code") {
        let j = i;
        while (text[j] === "`") j += 1;
        const run = j - i;
        if (run === top.marker.length) {
          open.pop();
          closeOpen(top, false);
          i = j;
          continue;
        }
        if (!finalize && run < top.marker.length && j === text.length) {
          i = j;
          continue;
        }
        pushText(text.slice(i, j));
        i = j;
        continue;
      }
      let j = i;
      while (text[j] === "`") j += 1;
      open.push({ kind: "code", marker: text.slice(i, j), childStart: nodes.length });
      i = j;
      continue;
    }
    if (open[open.length - 1]?.kind === "code") {
      pushText(ch);
      i += 1;
      continue;
    }
    if (ch === "\\") {
      if (i + 1 >= text.length) {
        if (finalize) pushText("\\");
        i += 1;
        continue;
      }
      const next = text[i + 1]!;
      if (ESCAPE.test(next)) {
        pushText(next);
        i += 2;
        continue;
      }
      pushText("\\");
      i += 1;
      continue;
    }
    if (ch === "~") {
      let j = i;
      while (text[j] === "~") j += 1;
      if (!finalize && j === text.length && j - i === 1) {
        i = j;
        continue;
      }
      if (j - i !== 2) {
        pushText(text.slice(i, j));
        i = j;
        continue;
      }
      const delIdx = findLastIndex(open, (item) => item.kind === "del");
      if (delIdx >= 0) {
        while (open.length - 1 > delIdx) closeOpen(open.pop()!, true);
        closeOpen(open.pop()!, false);
      } else {
        open.push({ kind: "del", marker: "~~", childStart: nodes.length });
      }
      i = j;
      continue;
    }
    if (ch === "<") {
      const close = text.indexOf(">", i + 1);
      if (close > i) {
        const inner = text.slice(i + 1, close);
        if (AUTOLINK.test(inner)) {
          nodes.push({
            kind: "link",
            children: [{ kind: "text", value: inner }],
            url: inner,
            open: false,
          });
          i = close + 1;
          continue;
        }
      }
      pushText("<");
      i += 1;
      continue;
    }
    if (ch === "*" || ch === "_") {
      const doubled = text[i + 1] === ch;
      const marker = doubled ? ch + ch : ch;
      const kind = doubled ? "strong" : "em";
      const before = i > 0 ? text[i - 1]! : " ";
      const afterIdx = i + marker.length;
      const after = afterIdx < text.length ? text[afterIdx]! : " ";
      if (ch === "_" && isAlnum(before) && isAlnum(after)) {
        pushText(marker);
        i += marker.length;
        continue;
      }
      const canOpen = !isSpace(after);
      const canClose = !isSpace(before)
        ? findLastIndex(open, (item) => item.kind === kind && item.marker === marker)
        : -1;
      if (canClose >= 0) {
        while (open.length - 1 > canClose) closeOpen(open.pop()!, true);
        closeOpen(open.pop()!, false);
        i += marker.length;
        continue;
      }
      if (canOpen) {
        open.push({ kind, marker, childStart: nodes.length });
        i += marker.length;
        continue;
      }
      pushText(marker);
      i += marker.length;
      continue;
    }
    if (ch === "!" && text[i + 1] === "[") {
      open.push({ kind: "image", marker: "![", childStart: nodes.length });
      i += 2;
      continue;
    }
    if (ch === "!") {
      pushText("!");
      i += 1;
      continue;
    }
    if (ch === "[") {
      open.push({ kind: "link", marker: "[", childStart: nodes.length });
      i += 1;
      continue;
    }
    if (ch === "]") {
      const linkIdx = findLastIndex(
        open,
        (item) => item.kind === "link" || item.kind === "image",
      );
      if (linkIdx < 0) {
        pushText("]");
        i += 1;
        continue;
      }
      if (!finalize && i + 1 >= text.length) {
        i += 1;
        continue;
      }
      if (text[i + 1] === "(") {
        while (open.length - 1 > linkIdx) closeOpen(open.pop()!, true);
        const item = open.pop()!;
        const urlStart = i + 2;
        let cursor = urlStart;
        let depth = 0;
        while (cursor < text.length) {
          const c = text[cursor]!;
          if (c === "(") depth += 1;
          else if (c === ")") {
            if (depth === 0) break;
            depth -= 1;
          }
          cursor += 1;
        }
        if (cursor < text.length) {
          closeOpen(item, false, parseUrlTitle(text.slice(urlStart, cursor)));
          i = cursor + 1;
          continue;
        }
        closeOpen(item, true, text.slice(urlStart));
        i = text.length;
        continue;
      }
      uncloseAsText(linkIdx);
      pushText("]");
      i += 1;
      continue;
    }
    let j = i;
    while (j < text.length && !"`*_~<[]\\!".includes(text[j]!)) j += 1;
    if (j > i) {
      pushText(text.slice(i, j));
      i = j;
    } else {
      pushText(ch);
      i += 1;
    }
  }
  if (finalize) {
    while (open.length > 0) uncloseAsText(open.length - 1);
  } else {
    while (open.length > 0) closeOpen(open.pop()!, true);
  }
  return nodes;
}

type LineRole =
  | { role: "blank" }
  | { role: "heading"; level: number; content: string }
  | { role: "hr" }
  | { role: "fence"; marker: string; lang: string }
  | { role: "list"; ordered: boolean; start: number; content: string }
  | { role: "blockquote"; content: string }
  | { role: "paragraph"; content: string };

/** Official `ge(line)`. */
function classifyLine(line: string): LineRole {
  if (line.trim() === "") return { role: "blank" };
  let match: RegExpMatchArray | null;
  if ((match = line.match(FENCE))) {
    return { role: "fence", marker: match[1]!, lang: match[2] ?? "" };
  }
  if ((match = line.match(HEADING))) {
    const content = (match[2] ?? "").replace(/(^|\s)#+\s*$/, "").trimEnd();
    return { role: "heading", level: match[1]!.length, content };
  }
  if (HR.test(line)) return { role: "hr" };
  if ((match = line.match(UL))) {
    return { role: "list", ordered: false, start: 1, content: match[1] ?? "" };
  }
  if ((match = line.match(OL))) {
    return {
      role: "list",
      ordered: true,
      start: Number(match[1]),
      content: match[2] ?? "",
    };
  }
  if ((match = line.match(QUOTE))) {
    return { role: "blockquote", content: match[1] ?? "" };
  }
  return { role: "paragraph", content: line };
}

type OpenBlock =
  | { kind: "paragraph"; lines: string[] }
  | { kind: "list"; ordered: boolean; start: number; items: string[] }
  | { kind: "blockquote"; lines: string[] }
  | { kind: "fence"; lang: string; marker: string; lines: string[] };

function finalizeOpen(block: OpenBlock): AlluviumBlock {
  switch (block.kind) {
    case "paragraph":
      return {
        kind: "paragraph",
        lines: block.lines.map((line) => parseAlluviumInline(line, true)),
      };
    case "list":
      return {
        kind: "list",
        ordered: block.ordered,
        start: block.start,
        items: block.items.map((item) => parseAlluviumInline(item, true)),
      };
    case "blockquote":
      return {
        kind: "blockquote",
        lines: block.lines.map((line) => parseAlluviumInline(line, true)),
      };
    case "fence":
      return {
        kind: "fence",
        lang: block.lang,
        code: block.lines.join("\n"),
        langSettled: true,
      };
  }
}

function fenceClose(line: string, marker: string): boolean {
  const match = line.match(FENCE);
  if (!match) return false;
  return (
    match[1]![0] === marker[0] &&
    match[1]!.length >= marker.length &&
    (match[2] ?? "") === ""
  );
}

/**
 * Official `class ae` residual — feed/reset/snapshot incremental block parser.
 */
export class AlluviumIncrementalEngine {
  committed: AlluviumBlock[] = [];
  openBlock: OpenBlock | null = null;
  buffer = "";

  feed(chunk: string): void {
    this.buffer += chunk;
    let newline: number;
    while ((newline = this.buffer.indexOf("\n")) >= 0) {
      const line = this.buffer.slice(0, newline);
      this.buffer = this.buffer.slice(newline + 1);
      this.absorbLine(line);
    }
  }

  reset(): void {
    this.committed = [];
    this.openBlock = null;
    this.buffer = "";
  }

  snapshot(finalize = false): AlluviumSnapshot {
    const { frontier, held } = this.buildFrontier(finalize);
    return { committed: this.committed, frontier, held };
  }

  private commit(block: AlluviumBlock): void {
    this.committed = [...this.committed, block];
  }

  private commitOpenBlock(): void {
    if (!this.openBlock) return;
    this.commit(finalizeOpen(this.openBlock));
    this.openBlock = null;
  }

  private absorbLine(line: string): void {
    if (this.openBlock?.kind === "fence") {
      if (fenceClose(line, this.openBlock.marker)) {
        this.commitOpenBlock();
      } else {
        this.openBlock.lines.push(line);
      }
      return;
    }
    if (this.openBlock?.kind === "paragraph") {
      const setext = line.match(SETEXT);
      if (setext) {
        const level = setext[1]![0] === "=" ? 1 : 2;
        const content = this.openBlock.lines.join("\n");
        this.openBlock = null;
        this.commit({
          kind: "heading",
          level,
          children: parseAlluviumInline(content, true),
        });
        return;
      }
    }
    const role = classifyLine(line);
    switch (role.role) {
      case "blank":
        if (this.openBlock?.kind === "list" || this.openBlock?.kind === "blockquote") {
          return;
        }
        this.commitOpenBlock();
        return;
      case "heading":
        this.commitOpenBlock();
        this.commit({
          kind: "heading",
          level: role.level,
          children: parseAlluviumInline(role.content, true),
        });
        return;
      case "hr":
        this.commitOpenBlock();
        this.commit({ kind: "hr" });
        return;
      case "fence":
        this.commitOpenBlock();
        this.openBlock = {
          kind: "fence",
          lang: role.lang,
          marker: role.marker,
          lines: [],
        };
        return;
      case "list":
        if (
          this.openBlock?.kind === "list" &&
          this.openBlock.ordered === role.ordered
        ) {
          this.openBlock.items.push(role.content);
        } else {
          this.commitOpenBlock();
          this.openBlock = {
            kind: "list",
            ordered: role.ordered,
            start: role.start,
            items: [role.content],
          };
        }
        return;
      case "blockquote":
        if (this.openBlock?.kind === "blockquote") {
          this.openBlock.lines.push(role.content);
        } else {
          this.commitOpenBlock();
          this.openBlock = { kind: "blockquote", lines: [role.content] };
        }
        return;
      case "paragraph":
        if (this.openBlock?.kind === "paragraph") {
          this.openBlock.lines.push(role.content);
        } else {
          this.commitOpenBlock();
          this.openBlock = { kind: "paragraph", lines: [role.content] };
        }
        return;
    }
  }

  private buildFrontier(finalize: boolean): {
    frontier: AlluviumBlock[];
    held: string | null;
  } {
    const frontier: AlluviumBlock[] = [];
    if (this.openBlock?.kind === "fence") {
      const open = this.openBlock;
      const holdingCloser =
        !finalize &&
        this.buffer.length > 0 &&
        this.buffer.length <= open.marker.length &&
        open.marker.startsWith(this.buffer);
      const partial = holdingCloser ? "" : this.buffer;
      const lines = partial ? [...open.lines, partial] : open.lines;
      frontier.push({
        kind: "fence",
        lang: open.lang,
        code: lines.join("\n"),
        langSettled: true,
      });
      return { frontier, held: holdingCloser ? this.buffer : null };
    }
    if (finalize && this.openBlock?.kind === "paragraph") {
      const setext = this.buffer.match(SETEXT);
      if (setext) {
        const level = setext[1]![0] === "=" ? 1 : 2;
        frontier.push({
          kind: "heading",
          level,
          children: parseAlluviumInline(this.openBlock.lines.join("\n"), true),
        });
        return { frontier, held: null };
      }
    }

    const pending = finalize
      ? classifyPendingFinalize(this.buffer)
      : classifyPendingStreaming(this.buffer);

    const merges =
      this.openBlock &&
      canMergePending(pending, this.openBlock);

    if (merges && this.openBlock) {
      frontier.push(mergeOpenWithPending(this.openBlock, pending, finalize));
      return { frontier, held: null };
    }
    if (this.openBlock) frontier.push(finalizeOpen(this.openBlock));
    if (pending.kind === "ambiguous") return { frontier, held: pending.raw };
    if (pending.kind === "empty") return { frontier, held: null };
    const block = pendingToBlock(pending, finalize);
    if (block) frontier.push(block);
    return { frontier, held: null };
  }
}

type Pending =
  | { kind: "empty" }
  | { kind: "ambiguous"; raw: string }
  | { kind: "heading"; level: number; content: string }
  | { kind: "hr" }
  | { kind: "fence"; lang: string }
  | { kind: "list"; ordered: boolean; start: number; content: string }
  | { kind: "blockquote"; content: string }
  | { kind: "paragraph"; content: string };

function classifyPendingFinalize(buffer: string): Pending {
  if (buffer.trim() === "") return { kind: "empty" };
  const role = classifyLine(buffer);
  switch (role.role) {
    case "blank":
      return { kind: "empty" };
    case "heading":
      return { kind: "heading", level: role.level, content: role.content };
    case "hr":
      return { kind: "hr" };
    case "fence":
      return { kind: "fence", lang: role.lang };
    case "list":
      return {
        kind: "list",
        ordered: role.ordered,
        start: role.start,
        content: role.content,
      };
    case "blockquote":
      return { kind: "blockquote", content: role.content };
    case "paragraph":
      return { kind: "paragraph", content: role.content };
  }
}

function classifyPendingStreaming(buffer: string): Pending {
  if (buffer.trim() === "") return { kind: "empty" };
  if (buffer === "*" || buffer === "-" || buffer === "+") {
    return { kind: "ambiguous", raw: buffer };
  }
  if (/^[-*_]+$/.test(buffer)) return { kind: "ambiguous", raw: buffer };
  if (/^#{1,6}$/.test(buffer)) return { kind: "ambiguous", raw: buffer };
  if (/^\d{1,9}[.)]?$/.test(buffer)) return { kind: "ambiguous", raw: buffer };
  if (buffer === ">") return { kind: "ambiguous", raw: buffer };
  if (/^`+$/.test(buffer)) return { kind: "ambiguous", raw: buffer };
  let match: RegExpMatchArray | null;
  if ((match = buffer.match(HEADING))) {
    return {
      kind: "heading",
      level: match[1]!.length,
      content: match[2] ?? "",
    };
  }
  if (/^#{1,6}\S/.test(buffer)) return { kind: "paragraph", content: buffer };
  if ((match = buffer.match(UL))) {
    return { kind: "list", ordered: false, start: 1, content: match[1] ?? "" };
  }
  if ((match = buffer.match(OL))) {
    return {
      kind: "list",
      ordered: true,
      start: Number(match[1]),
      content: match[2] ?? "",
    };
  }
  if (/^[-*+]\s+$/.test(buffer)) {
    return { kind: "list", ordered: false, start: 1, content: "" };
  }
  if ((match = buffer.match(/^(\d{1,9})[.)]\s+$/))) {
    return { kind: "list", ordered: true, start: Number(match[1]), content: "" };
  }
  if ((match = buffer.match(QUOTE))) {
    return { kind: "blockquote", content: match[1] ?? "" };
  }
  if ((match = buffer.match(/^(`{3,}|~{3,})\s*(\S*)/))) {
    return { kind: "fence", lang: match[2] ?? "" };
  }
  if (/^`{1,2}[^`]/.test(buffer)) return { kind: "paragraph", content: buffer };
  return { kind: "paragraph", content: buffer };
}

function canMergePending(pending: Pending, open: OpenBlock): boolean {
  if (pending.kind === "empty") return true;
  if (pending.kind === "ambiguous") return false;
  switch (open.kind) {
    case "paragraph":
      return pending.kind === "paragraph";
    case "list":
      return pending.kind === "list" && pending.ordered === open.ordered;
    case "blockquote":
      return pending.kind === "blockquote";
    case "fence":
      return false;
  }
}

function mergeOpenWithPending(
  open: OpenBlock,
  pending: Pending,
  finalize: boolean,
): AlluviumBlock {
  switch (open.kind) {
    case "paragraph": {
      const extra = pending.kind === "paragraph" ? pending.content : "";
      const text = extra
        ? `${open.lines.join("\n")}\n${extra}`
        : open.lines.join("\n");
      return {
        kind: "paragraph",
        lines: [parseAlluviumInline(text, finalize)],
      };
    }
    case "list": {
      const items = open.items.map((item) => parseAlluviumInline(item, true));
      if (pending.kind === "list") {
        items.push(parseAlluviumInline(pending.content, finalize));
      }
      return {
        kind: "list",
        ordered: open.ordered,
        start: open.start,
        items,
      };
    }
    case "blockquote": {
      const extra = pending.kind === "blockquote" ? pending.content : "";
      const text = extra
        ? `${open.lines.join("\n")}\n${extra}`
        : open.lines.join("\n");
      return {
        kind: "blockquote",
        lines: [parseAlluviumInline(text, finalize)],
      };
    }
    case "fence":
      return finalizeOpen(open);
  }
}

function pendingToBlock(pending: Pending, finalize: boolean): AlluviumBlock | null {
  switch (pending.kind) {
    case "paragraph":
      return {
        kind: "paragraph",
        lines: [parseAlluviumInline(pending.content, finalize)],
      };
    case "heading":
      return {
        kind: "heading",
        level: pending.level,
        children: parseAlluviumInline(pending.content, finalize),
      };
    case "list":
      return {
        kind: "list",
        ordered: pending.ordered,
        start: pending.start,
        items: [parseAlluviumInline(pending.content, finalize)],
      };
    case "blockquote":
      return {
        kind: "blockquote",
        lines: [parseAlluviumInline(pending.content, finalize)],
      };
    case "fence":
      return {
        kind: "fence",
        lang: pending.lang,
        code: "",
        langSettled: finalize,
      };
    case "hr":
      return { kind: "hr" };
    default:
      return null;
  }
}

/** Official `ve` pure body: incremental feed + snapshot. */
export function snapshotAlluviumText(
  engine: AlluviumIncrementalEngine,
  previousText: string,
  text: string,
  isStreaming: boolean,
): AlluviumSnapshot {
  if (text.length < previousText.length || !text.startsWith(previousText)) {
    engine.reset();
    previousText = "";
  }
  const delta = text.slice(previousText.length);
  if (delta.length > 0) engine.feed(delta);
  return engine.snapshot(!isStreaming);
}
