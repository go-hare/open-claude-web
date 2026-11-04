/**
 * Official cb6930dae `Ds` / `ys` / `bs` inline `_v` (TIe answers).
 * Slash/code/`[text](url)` only — not assistant MarkdownContent.
 */
import { type ReactNode } from "react";

const OFFICIAL_INLINE_CODE_RE = /`([^`\n]+)`/g;
const OFFICIAL_INLINE_LINK_RE = /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
const OFFICIAL_INLINE_CODE_CLASS =
  "text-code px-p2 rounded-r2 bg-t1 [overflow-wrap:anywhere]";
const OFFICIAL_INLINE_LINK_CLASS =
  "text-accent-main-000 underline underline-offset-[3px] hover:text-accent-main-100";

/** Official `_v({text})` — TIe answer. */
export function officialInlineV(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(OFFICIAL_INLINE_CODE_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(...officialInlineLinks(text.slice(cursor, index), `l${key++}`));
    nodes.push(
      <code className={OFFICIAL_INLINE_CODE_CLASS} key={`c${key++}`}>{match[1] ?? ""}</code>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(...officialInlineLinks(text.slice(cursor), `l${key++}`));
  return nodes.length > 0 ? nodes : text;
}

function officialInlineLinks(text: string, keyPrefix: string): ReactNode[] {
  if (!text.includes("](")) return text ? [text] : [];
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let key = 0;
  for (const match of text.matchAll(OFFICIAL_INLINE_LINK_RE)) {
    const index = match.index ?? 0;
    if (index > cursor) nodes.push(text.slice(cursor, index));
    nodes.push(
      <a
        className={OFFICIAL_INLINE_LINK_CLASS}
        href={match[2]}
        key={`${keyPrefix}-a${key++}`}
        rel="noreferrer"
        target="_blank"
      >
        {match[1]}
      </a>,
    );
    cursor = index + match[0].length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}
