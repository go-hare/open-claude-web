/**
 * Official ON / $N / LN / zN (c11959232):
 * rehype plugin that wraps plan comment ranges in <mark data-plan-comment-id>.
 * Skips pre fences (like official Bl + Kl SKIP on pre).
 */
import { SKIP, visit } from "unist-util-visit";
import type { OfficialPlanComment } from "../session/officialPlanCommentsStore";

type HastText = {
  type: "text";
  value: string;
};

type HastElement = {
  children: Array<HastElement | HastText | { type: string }>;
  properties?: Record<string, unknown>;
  tagName: string;
  type: "element";
};

type HastRoot = {
  children: Array<HastElement | HastText | { type: string }>;
  type: "root";
};

type FlatTextEntry = {
  flatStart: number;
  index: number;
  node: HastText;
  parent: HastElement | HastRoot;
};

const TABLE_WHITESPACE_TAGS = new Set(["table", "thead", "tbody", "tfoot", "tr"]);

/** Official LN: collapse whitespace for fuzzy compare. */
const collapseWs = (value: string) => value.replace(/\s+/g, " ").trim();

/** Official zN */
function markElement(id: string, text: string): HastElement {
  return {
    type: "element",
    tagName: "mark",
    properties: { "data-plan-comment-id": id },
    children: [{ type: "text", value: text }],
  };
}

/** Official $N: nearest indexOf selectedText to preferred offset. */
function nearestIndexOf(haystack: string, needle: string, preferred: number): number {
  if (!needle) return -1;
  let best = -1;
  for (let at = haystack.indexOf(needle); at !== -1; at = haystack.indexOf(needle, at + 1)) {
    if (best === -1 || Math.abs(at - preferred) < Math.abs(best - preferred)) best = at;
  }
  return best;
}

/**
 * Official ON(comments): rehype plugin factory.
 * Injects <mark data-plan-comment-id> around flat-text ranges matching comments.
 */
export function officialPlanCommentRehype(comments: OfficialPlanComment[]) {
  return () => (tree: HastRoot) => {
    if (comments.length === 0) return;

    const entries: FlatTextEntry[] = [];
    let flat = "";

    visit(tree, (node, index, parent) => {
      if (!parent || index == null) return;
      if (node.type === "element" && (node as HastElement).tagName === "pre") return SKIP;
      if (node.type !== "text") return;
      const textNode = node as HastText;
      const parentEl = parent as HastElement | HastRoot;
      if (
        parentEl.type === "element" &&
        TABLE_WHITESPACE_TAGS.has(parentEl.tagName) &&
        /^\s*$/.test(textNode.value)
      ) {
        return;
      }
      entries.push({
        node: textNode,
        parent: parentEl,
        index,
        flatStart: flat.length,
      });
      flat += textNode.value;
    });

    if (entries.length === 0) return;

    const ranges: Array<{ end: number; id: string; start: number }> = [];
    for (const comment of comments) {
      let start = comment.startOffset;
      let end = comment.endOffset;
      const slice = flat.slice(start, end);
      if (collapseWs(slice) !== collapseWs(comment.selectedText)) {
        const found = nearestIndexOf(flat, comment.selectedText, start);
        if (found === -1) continue;
        start = found;
        end = found + comment.selectedText.length;
      }
      ranges.push({ id: comment.id, start, end });
    }
    if (ranges.length === 0) return;

    // Splice from the end so earlier indices stay valid (official walks s.length-1 → 0).
    for (let i = entries.length - 1; i >= 0; i -= 1) {
      const entry = entries[i];
      if (
        entry.parent.type === "element" &&
        entry.parent.tagName === "mark" &&
        entry.parent.properties &&
        "data-plan-comment-id" in entry.parent.properties
      ) {
        continue;
      }
      const value = entry.node.value;
      const localStart = entry.flatStart;
      const localEnd = localStart + value.length;
      const hits = ranges
        .filter((range) => range.start < localEnd && range.end > localStart)
        .sort((a, b) => a.start - b.start);
      if (hits.length === 0) continue;

      const replacement: Array<HastElement | HastText> = [];
      let cursor = 0;
      for (const hit of hits) {
        const from = Math.max(0, hit.start - localStart);
        const to = Math.min(value.length, hit.end - localStart);
        if (from < cursor || to <= from) continue;
        if (from > cursor) replacement.push({ type: "text", value: value.slice(cursor, from) });
        replacement.push(markElement(hit.id, value.slice(from, to)));
        cursor = to;
      }
      if (cursor === 0) continue;
      if (cursor < value.length) replacement.push({ type: "text", value: value.slice(cursor) });
      entry.parent.children.splice(entry.index, 1, ...replacement);
    }
  };
}
