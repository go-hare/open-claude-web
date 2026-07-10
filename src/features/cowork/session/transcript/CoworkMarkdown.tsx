import { createElement, useMemo, type ReactNode } from "react";

type MarkdownBlock =
  | { kind: "blockquote"; key: string; lines: string[] }
  | { kind: "code"; key: string; language?: string; text: string }
  | { kind: "heading"; key: string; level: 1 | 2 | 3 | 4 | 5 | 6; text: string }
  | { kind: "hr"; key: string }
  | { kind: "list"; items: string[]; key: string; ordered: boolean }
  | { kind: "paragraph"; key: string; lines: string[] }
  | { headers: string[]; kind: "table"; key: string; rows: string[][] };

export function CoworkMarkdown({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const chunks = useMemo(() => splitStreamingMarkdown(text, isStreaming), [isStreaming, text]);
  const committed = useMemo(() => parseMarkdownBlocks(chunks.committed), [chunks.committed]);
  const frontier = useMemo(() => parseMarkdownBlocks(chunks.frontier), [chunks.frontier]);
  return <>{committed.map((block) => renderMarkdownBlock(block, "committed"))}{frontier.map((block) => renderMarkdownBlock(block, "frontier"))}</>;
}

export function renderCoworkInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+?\*\*|__[^_]+?__|\*[^*\s][^*]*?\*|_[^_\s][^_]*?_|\[[^\]]+\]\(https?:\/\/[^)\s]+\))/g;
  let lastIndex = 0;
  for (const match of text.matchAll(pattern)) {
    if (match.index === undefined) continue;
    if (match.index > lastIndex) nodes.push(text.slice(lastIndex, match.index));
    nodes.push(renderInlineToken(match[0], `${keyPrefix}-${nodes.length}`));
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

function splitStreamingMarkdown(text: string, streaming: boolean) {
  if (!streaming) return { committed: text, frontier: "" };
  const normalized = text.replace(/\r\n?/g, "\n");
  const boundary = lastStableBoundary(normalized);
  if (boundary <= 0) return { committed: "", frontier: normalized };
  return { committed: normalized.slice(0, boundary).trimEnd(), frontier: normalized.slice(boundary).replace(/^\n+/, "") };
}

function lastStableBoundary(text: string) {
  let inFence = false;
  let lastBoundary = -1;
  let offset = 0;
  for (const line of text.split("\n")) {
    if (/^```/.test(line)) inFence = !inFence;
    offset += line.length + 1;
    if (!inFence && line.trim() === "") lastBoundary = offset;
  }
  return lastBoundary;
}

function parseMarkdownBlocks(source: string): MarkdownBlock[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: "paragraph", key: `p-${blocks.length}`, lines: paragraph });
    paragraph = [];
  };
  for (let index = 0; index < lines.length;) {
    const line = lines[index];
    if (!line.trim()) { flush(); index += 1; continue; }
    const fenced = line.match(/^```(.*)$/);
    if (fenced) { flush(); index = pushCodeBlock(lines, index, fenced[1], blocks); continue; }
    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) { flush(); blocks.push({ kind: "heading", key: `h-${blocks.length}`, level: heading[1].length as 1 | 2 | 3 | 4 | 5 | 6, text: heading[2].trim() }); index += 1; continue; }
    if (/^ {0,3}([-*_])(?:\s*\1){2,}\s*$/.test(line)) { flush(); blocks.push({ kind: "hr", key: `hr-${blocks.length}` }); index += 1; continue; }
    if (isTableStart(lines, index)) { flush(); index = pushTableBlock(lines, index, blocks); continue; }
    const list = parseListItem(line);
    if (list) { flush(); index = pushListBlock(lines, index, list.ordered, blocks); continue; }
    if (/^>\s?/.test(line)) { flush(); index = pushQuoteBlock(lines, index, blocks); continue; }
    paragraph.push(line);
    index += 1;
  }
  flush();
  return blocks;
}

function pushCodeBlock(lines: string[], start: number, language: string, blocks: MarkdownBlock[]) {
  const code: string[] = [];
  let index = start + 1;
  while (index < lines.length && !lines[index].startsWith("```")) code.push(lines[index++]);
  blocks.push({ kind: "code", key: `code-${blocks.length}`, language: language.trim() || undefined, text: code.join("\n") });
  return index < lines.length ? index + 1 : index;
}

function pushListBlock(lines: string[], start: number, ordered: boolean, blocks: MarkdownBlock[]) {
  const items: string[] = [];
  let index = start;
  while (index < lines.length) {
    if (!lines[index].trim() && parseListItem(lines[index + 1] ?? "")?.ordered === ordered) { index += 1; continue; }
    const item = parseListItem(lines[index]);
    if (!item || item.ordered !== ordered) break;
    items.push(item.text);
    index += 1;
  }
  blocks.push({ kind: "list", items, key: `list-${blocks.length}`, ordered });
  return index;
}

function pushTableBlock(lines: string[], start: number, blocks: MarkdownBlock[]) {
  const headers = splitTableRow(lines[start]);
  const rows: string[][] = [];
  let index = start + 2;
  while (index < lines.length && lines[index].includes("|") && lines[index].trim()) rows.push(splitTableRow(lines[index++]));
  blocks.push({ headers, kind: "table", key: `table-${blocks.length}`, rows });
  return index;
}

function pushQuoteBlock(lines: string[], start: number, blocks: MarkdownBlock[]) {
  const quoteLines: string[] = [];
  let index = start;
  while (index < lines.length) {
    const quote = lines[index].match(/^>\s?(.*)$/);
    if (!quote) break;
    quoteLines.push(quote[1]);
    index += 1;
  }
  blocks.push({ kind: "blockquote", key: `quote-${blocks.length}`, lines: quoteLines });
  return index;
}

function renderMarkdownBlock(block: MarkdownBlock, scope: string) {
  const key = `${scope}-${block.key}`;
  if (block.kind === "heading") return createElement(`h${block.level}`, { key }, renderCoworkInlineMarkdown(block.text, key));
  if (block.kind === "code") return <pre key={key}><code className={block.language ? `language-${block.language}` : undefined}>{block.text}</code></pre>;
  if (block.kind === "list") return createElement(block.ordered ? "ol" : "ul", { key }, block.items.map((item, index) => <li key={index}>{renderCoworkInlineMarkdown(item, `${key}-${index}`)}</li>));
  if (block.kind === "blockquote") return <blockquote key={key}>{block.lines.map((line, index) => <p key={index}>{renderCoworkInlineMarkdown(line, `${key}-${index}`)}</p>)}</blockquote>;
  if (block.kind === "table") return <MarkdownTable block={block} key={key} keyPrefix={key} />;
  if (block.kind === "hr") return <hr key={key} />;
  return <p key={key}>{renderCoworkInlineMarkdown(block.lines.join("\n"), key)}</p>;
}

function MarkdownTable({ block, keyPrefix }: { block: Extract<MarkdownBlock, { kind: "table" }>; keyPrefix: string }) {
  return <table><thead><tr>{block.headers.map((cell, index) => <th key={index}>{renderCoworkInlineMarkdown(cell, `${keyPrefix}-h${index}`)}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr key={rowIndex}>{block.headers.map((_header, cellIndex) => <td key={cellIndex}>{renderCoworkInlineMarkdown(row[cellIndex] ?? "", `${keyPrefix}-${rowIndex}-${cellIndex}`)}</td>)}</tr>)}</tbody></table>;
}

function renderInlineToken(token: string, key: string) {
  if (token.startsWith("`")) return <code key={key}>{token.slice(1, -1)}</code>;
  if (token.startsWith("**") || token.startsWith("__")) return <strong key={key}>{renderCoworkInlineMarkdown(token.slice(2, -2), key)}</strong>;
  if (token.startsWith("*") || token.startsWith("_")) return <em key={key}>{renderCoworkInlineMarkdown(token.slice(1, -1), key)}</em>;
  const link = token.match(/^\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)$/);
  return link ? <a href={link[2]} key={key} rel="noreferrer" target="_blank">{link[1]}</a> : token;
}

function isTableStart(lines: string[], index: number) {
  return lines[index]?.includes("|") && /^(\s*\|)?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1] ?? "");
}

function splitTableRow(line: string) { return line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()); }
function parseListItem(line: string) {
  const bullet = line.match(/^\s*[-*+]\s+(.+)$/);
  if (bullet) return { ordered: false, text: bullet[1] };
  const ordered = line.match(/^\s*\d+[.)]\s+(.+)$/);
  return ordered ? { ordered: true, text: ordered[1] } : null;
}
