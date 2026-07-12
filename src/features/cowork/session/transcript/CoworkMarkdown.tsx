import { Fragment, createElement, useMemo, type MouseEvent, type ReactNode } from "react";
import type { Link, Parent, PhrasingContent, Root, RootContent } from "mdast";
import { remark } from "remark";

export type CoworkMarkdownCallbacks = {
  blockCitations?: readonly unknown[];
  messageUuid?: string;
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, url: string) => void;
  onOpenArtifact?: (artifact: unknown) => void;
};

export type CoworkMarkdownProfile = "assistant" | "human";

type CoworkMarkdownTreeProps = CoworkMarkdownCallbacks & {
  headingLevelOffset?: number;
  profile: CoworkMarkdownProfile;
  root: Root;
  source: string;
};

type RenderContext = CoworkMarkdownCallbacks & {
  definitions: Map<string, string>;
  headingLevelOffset: number;
  profile: CoworkMarkdownProfile;
  source: string;
};

const assistantHeadingClasses = {
  1: "text-text-100 mt-3 -mb-1 text-[1.375rem] font-bold",
  2: "text-text-100 mt-3 -mb-1 text-[1.125rem] font-bold",
  3: "text-text-100 mt-2 -mb-1 text-base font-bold",
  4: "text-text-100 mt-2 -mb-1 text-base font-bold",
  5: "text-text-100 mt-2 -mb-1 text-sm font-bold",
  6: "text-text-100 mt-2 -mb-1 text-sm font-semibold",
} as const;

export function parseCoworkMarkdown(source: string): Root {
  return remark().parse(source);
}

export function CoworkMarkdown({ isStreaming = false, text }: { isStreaming?: boolean; text: string }) {
  const root = useMemo(() => parseCoworkMarkdown(text), [text]);
  const parts = isStreaming ? partitionCoworkMarkdown(root, text) : { committed: [root], frontier: null };
  return <>{parts.committed.map((chunk, index) => <CoworkMarkdownTree key={index} profile="assistant" root={chunk} source={text} />)}{parts.frontier ? <CoworkMarkdownTree profile="assistant" root={parts.frontier} source={text} /> : null}</>;
}

export function renderCoworkInlineMarkdown(text: string, keyPrefix: string): ReactNode[] {
  return [<CoworkMarkdown key={keyPrefix} text={text} />];
}
export function CoworkMarkdownTree({ headingLevelOffset = 0, profile, root, source, ...callbacks }: CoworkMarkdownTreeProps) {
  const context: RenderContext = {
    ...callbacks,
    definitions: collectDefinitions(root),
    headingLevelOffset,
    profile,
    source,
  };
  return <>{root.children.map((node, index) => renderBlock(node, `${node.type}-${index}`, context))}</>;
}

export function partitionCoworkMarkdown(root: Root, source: string) {
  if (root.children.length === 0) return { committed: [] as Root[], frontier: null as Root | null };
  const last = root.children[root.children.length - 1];
  const endOffset = last.position?.end.offset ?? source.length;
  const trailing = source.slice(endOffset);
  const lastIsCommitted = hasBlankTerminator(trailing);
  const committedNodes = lastIsCommitted ? root.children : root.children.slice(0, -1);
  return {
    committed: committedNodes.map((node) => rootFromChildren([node])),
    frontier: lastIsCommitted ? null : rootFromChildren([last]),
  };
}

export function hasCoworkMarkdownNode(root: Root, types: ReadonlySet<string>) {
  const pending: RootContent[] = [...root.children];
  while (pending.length > 0) {
    const node = pending.pop();
    if (!node) continue;
    if (types.has(node.type)) return true;
    if ("children" in node && Array.isArray(node.children)) pending.push(...node.children as RootContent[]);
  }
  return false;
}

function renderBlock(node: RootContent, key: string, context: RenderContext): ReactNode {
  if (context.profile === "human" && !humanBlockAllowed(node.type)) {
    return <p key={key}>{nodeSource(node, context.source)}</p>;
  }
  if (node.type === "paragraph") {
    const special = context.profile === "assistant" ? renderSpecialParagraph(node, key, context) : null;
    return special ?? <p className={context.profile === "assistant" ? "font-claude-response-body break-words whitespace-normal leading-[1.7]" : undefined} key={key}>{renderInlineChildren(node, key, context)}</p>;
  }
  if (node.type === "heading") {
    const level = Math.min(node.depth, 6) as keyof typeof assistantHeadingClasses;
    const tag = `h${Math.min(level + context.headingLevelOffset, 6)}`;
    return createElement(tag, { className: assistantHeadingClasses[level], key }, renderInlineChildren(node, key, context));
  }
  if (node.type === "blockquote") {
    return <blockquote className={context.profile === "assistant" ? "ml-2 border-l-4 border-border-300/10 pl-4 text-text-300" : undefined} key={key}>{node.children.map((child, index) => renderBlock(child, `${key}-${index}`, context))}</blockquote>;
  }
  if (node.type === "list") {
    const tag = node.ordered ? "ol" : "ul";
    const className = context.profile === "assistant" ? classes("[li_&]:mb-0 [li_&]:mt-1 [li_&]:gap-1 [&:not(:last-child)_ul]:pb-1 [&:not(:last-child)_ol]:pb-1 flex flex-col gap-1 pl-8 mb-3", node.ordered ? "list-decimal" : "list-disc") : undefined;
    return createElement(tag, { className, key, start: node.ordered ? node.start ?? undefined : undefined }, node.children.map((item, index) => <li className={context.profile === "assistant" ? "whitespace-normal break-words pl-2" : undefined} key={index}>{item.children.map((child, childIndex) => renderListChild(child, `${key}-${index}-${childIndex}`, context))}</li>));
  }
  if (node.type === "code") {
    return <pre className={node.lang ? `language-${node.lang}` : undefined} key={key}><code>{node.value}</code></pre>;
  }
  if (node.type === "thematicBreak") return <hr className="border-border-200 border-t-0.5 my-3 mx-1.5" key={key} />;
  if (node.type === "html") return renderHtml(node.value, key, context);
  return null;
}

function renderListChild(node: RootContent, key: string, context: RenderContext) {
  if (node.type === "paragraph") return <Fragment key={key}>{renderInlineChildren(node, key, context)}</Fragment>;
  return renderBlock(node, key, context);
}

function renderInlineChildren(node: Parent, key: string, context: RenderContext) {
  return node.children.map((child, index) => renderInline(child as PhrasingContent, `${key}-${index}`, context));
}

function renderInline(node: PhrasingContent, key: string, context: RenderContext): ReactNode {
  if (node.type === "text") return renderExtendedText(node.value, key, context.profile === "assistant");
  if (node.type === "inlineCode") return <code key={key}>{renderHumanColorSwatch(node.value, context.profile)}{node.value}</code>;
  if (node.type === "strong") return context.profile === "assistant" ? <strong key={key}>{renderInlineChildren(node, key, context)}</strong> : nodeSource(node, context.source);
  if (node.type === "emphasis") return context.profile === "assistant" ? <em key={key}>{renderInlineChildren(node, key, context)}</em> : nodeSource(node, context.source);
  if (node.type === "delete") return <del key={key}>{renderInlineChildren(node, key, context)}</del>;
  if (node.type === "break") return <br key={key} />;
  if (node.type === "link") return renderLink(node, key, context);
  if (node.type === "linkReference") return renderLinkReference(node, key, context);
  if (node.type === "image") return context.profile === "assistant" ? `![${node.alt ?? ""}](${node.url})` : nodeSource(node, context.source);
  return nodeSource(node, context.source);
}

function renderLink(node: Link, key: string, context: RenderContext) {
  const raw = nodeSource(node, context.source);
  if (context.profile === "human" && !(raw.startsWith("<") && raw.endsWith(">"))) return raw;
  return linkElement(node.url, renderInlineChildren(node, key, context), key, context);
}

function renderLinkReference(node: Extract<PhrasingContent, { type: "linkReference" }>, key: string, context: RenderContext) {
  if (context.profile === "human") return nodeSource(node, context.source);
  const target = context.definitions.get(node.identifier.toLowerCase());
  return target ? linkElement(target, renderInlineChildren(node, key, context), key, context) : nodeSource(node, context.source);
}

function linkElement(url: string, children: ReactNode, key: string, context: RenderContext) {
  const safe = safeCoworkMarkdownUrl(url);
  return <a className="underline underline-offset-2 decoration-1 decoration-current/40 hover:decoration-current focus:decoration-current" href={safe} key={key} onClick={safe && context.onLinkClick ? (event) => context.onLinkClick?.(event, safe) : undefined} rel="noopener noreferrer" target="_blank">{children}</a>;
}

function renderSpecialParagraph(node: Extract<RootContent, { type: "paragraph" }>, key: string, context: RenderContext) {
  const value = singleTextValue(node);
  if (value === undefined) return null;
  const table = parseTable(value);
  if (table) return <table key={key}><thead><tr>{table[0].map((cell, index) => <th key={index}>{renderCell(cell, `${key}-h-${index}`, context)}</th>)}</tr></thead><tbody>{table.slice(2).map((row, rowIndex) => <tr key={rowIndex}>{table[0].map((_cell, cellIndex) => <td key={cellIndex}>{renderCell(row[cellIndex] ?? "", `${key}-${rowIndex}-${cellIndex}`, context)}</td>)}</tr>)}</tbody></table>;
  if (value.startsWith("$$\n") && value.endsWith("\n$$")) return <div className="math math-display" data-math-display key={key}>{value.slice(3, -3)}</div>;
  return null;
}

function renderCell(value: string, key: string, context: RenderContext) {
  const root = parseCoworkMarkdown(value);
  const paragraph = root.children[0];
  return paragraph?.type === "paragraph" ? <Fragment key={key}>{renderInlineChildren(paragraph, key, { ...context, source: value })}</Fragment> : value;
}

function renderExtendedText(value: string, key: string, extensions: boolean) {
  const output: ReactNode[] = [];
  let cursor = 0;
  while (cursor < value.length) {
    const token = extensions ? nextExtension(value, cursor) : nextNewline(value, cursor);
    if (!token) { output.push(value.slice(cursor)); break; }
    if (token.index > cursor) output.push(value.slice(cursor, token.index));
    if (token.kind === "newline") output.push(<br key={`${key}-${output.length}`} />);
    else if (token.kind === "text") output.push(token.value);
    else if (token.kind === "delete") output.push(<del key={`${key}-${output.length}`}>{token.value}</del>);
    else output.push(<span className="math math-inline" data-math-inline key={`${key}-${output.length}`}>{token.value}</span>);
    cursor = token.end;
  }
  return output;
}

function nextExtension(value: string, start: number) {
  const newline = value.indexOf("\n", start);
  const strike = value.indexOf("~~", start);
  const math = value.indexOf("$", start);
  const index = smallestIndex(newline, strike, math);
  if (index < 0) return null;
  if (index === newline) return { end: index + 1, index, kind: "newline" as const, value: "" };
  const marker = index === strike ? "~~" : "$";
  const closing = value.indexOf(marker, index + marker.length);
  if (closing < 0) return { end: index + marker.length, index, kind: "text" as const, value: marker };
  return { end: closing + marker.length, index, kind: marker === "~~" ? "delete" as const : "math" as const, value: value.slice(index + marker.length, closing) };
}

function nextNewline(value: string, start: number) {
  const index = value.indexOf("\n", start);
  return index < 0 ? null : { end: index + 1, index, kind: "newline" as const, value: "" };
}

function parseTable(value: string) {
  const rows = value.split("\n").map(splitTableRow);
  if (rows.length < 2 || rows[0].length < 2 || rows[1].length !== rows[0].length) return null;
  return rows[1].every(isTableDelimiter) ? rows : null;
}

function splitTableRow(value: string) {
  const trimmed = value.trim();
  const inner = trimmed.startsWith("|") ? trimmed.slice(1) : trimmed;
  const withoutEnd = inner.endsWith("|") ? inner.slice(0, -1) : inner;
  return withoutEnd.split("|").map((cell) => cell.trim());
}

function isTableDelimiter(value: string) {
  const compact = value.split(" ").join("");
  const body = compact.startsWith(":") ? compact.slice(1) : compact;
  const core = body.endsWith(":") ? body.slice(0, -1) : body;
  return core.length >= 3 && [...core].every((character) => character === "-");
}

function renderHtml(value: string, key: string, context: RenderContext) {
  const artifact = artifactFromHtml(value);
  if (!artifact || !context.onOpenArtifact) return <Fragment key={key}>{value}</Fragment>;
  return <button className="underline" key={key} onClick={() => context.onOpenArtifact?.({ ...artifact, messageUuid: context.messageUuid })} type="button">{artifact.title ?? "Open artifact"}</button>;
}

function artifactFromHtml(value: string) {
  if (!value.startsWith("<antArtifact")) return null;
  const identifier = htmlAttribute(value, "identifier") ?? htmlAttribute(value, "id");
  return identifier ? { identifier, title: htmlAttribute(value, "title") } : null;
}

function htmlAttribute(value: string, name: string) {
  const marker = `${name}=`;
  const start = value.indexOf(marker);
  if (start < 0) return undefined;
  const quote = value[start + marker.length];
  if (quote !== '"' && quote !== "'") return undefined;
  const end = value.indexOf(quote, start + marker.length + 1);
  return end < 0 ? undefined : value.slice(start + marker.length + 1, end);
}

function collectDefinitions(root: Root) {
  const definitions = new Map<string, string>();
  for (const node of root.children) if (node.type === "definition") definitions.set(node.identifier.toLowerCase(), node.url);
  return definitions;
}

function rootFromChildren(children: RootContent[]): Root {
  return { children, type: "root" };
}

function singleTextValue(node: Extract<RootContent, { type: "paragraph" }>) {
  return node.children.length === 1 && node.children[0].type === "text" ? node.children[0].value : undefined;
}

function nodeSource(node: { position?: RootContent["position"] }, source: string) {
  const start = node.position?.start.offset;
  const end = node.position?.end.offset;
  return start === undefined || end === undefined ? "" : source.slice(start, end);
}

function humanBlockAllowed(type: string) {
  return type === "paragraph" || type === "blockquote" || type === "list" || type === "code";
}

function safeCoworkMarkdownUrl(value: string) {
  if (value.startsWith("computer://") || value.startsWith("tel:")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:" || url.protocol === "mailto:" ? value : undefined;
  } catch {
    return undefined;
  }
}

function renderHumanColorSwatch(value: string, profile: CoworkMarkdownProfile) {
  if (profile !== "human" || !isHexColor(value)) return null;
  return <span aria-hidden="true" className="mr-1 inline-block size-3 rounded-sm border border-border-300 align-middle" style={{ backgroundColor: value }} />;
}

function isHexColor(value: string) {
  if (!value.startsWith("#") || ![4, 5, 7, 9].includes(value.length)) return false;
  return [...value.slice(1)].every((character) => "0123456789abcdefABCDEF".includes(character));
}

function hasBlankTerminator(value: string) {
  let newlineCount = 0;
  for (const character of value) if (character === "\n") newlineCount += 1;
  return newlineCount >= 2;
}

function smallestIndex(...values: number[]) {
  return values.filter((value) => value >= 0).sort((left, right) => left - right)[0] ?? -1;
}

function classes(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}
