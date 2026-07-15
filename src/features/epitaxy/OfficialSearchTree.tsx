/**
 * Official index-BELzQL5P SearchTree (`ait` / `nit` / `sit` / `Zrt` / `Krt` / `Yrt`):
 *   <search_tree>…</search_tree> → ```search_tree fence → collapsible hypothesis tree
 * Ported control flow + classNames from ion-dist only.
 */
import { memo, useMemo, useState } from "react";
import { Icon } from "../../shell/icons";

type OfficialSearchTreeNode = {
  children: OfficialSearchTreeNode[];
  label: string;
  probability: number | null;
};

const officialTreeLineRe = /^((?:│\s*)*)[├└]──\s*(.*)$/;
const officialTreeProbRe = /^\[p=([\d.]+)\]\s*(.*)$/;

/** Official Zrt(content) */
export function parseOfficialSearchTree(content: string): { question: string | null; roots: OfficialSearchTreeNode[] } {
  const lines = content.split("\n").map((line) => line.trimEnd());
  let question: string | null = null;
  let index = 0;
  while (index < lines.length && lines[index].trim() === "") index += 1;
  if (index < lines.length && !officialTreeLineRe.test(lines[index])) {
    question = lines[index].trim();
    index += 1;
  }
  const roots: OfficialSearchTreeNode[] = [];
  const stack: Array<{ depth: number; node: OfficialSearchTreeNode }> = [];
  for (; index < lines.length; index += 1) {
    const match = lines[index].match(officialTreeLineRe);
    if (!match) continue;
    const indent = match[1] ?? "";
    const rest = match[2] ?? "";
    const depth = (indent.match(/│/g) ?? []).length;
    const probMatch = rest.match(officialTreeProbRe);
    const probability = probMatch ? Number(probMatch[1]) : Number.NaN;
    const node: OfficialSearchTreeNode = {
      probability: Number.isFinite(probability) ? probability : null,
      label: probMatch ? probMatch[2].trim() : rest.trim(),
      children: [],
    };
    while (stack.length > 0 && stack[stack.length - 1].depth >= depth) stack.pop();
    if (stack.length === 0) roots.push(node);
    else stack[stack.length - 1].node.children.push(node);
    stack.push({ depth, node });
  }
  return { question, roots };
}

/** Official sit */
function OfficialSearchTreeProbability({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span
      aria-label={`probability ${Math.round(100 * clamped)}%`}
      className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[11px] text-text-300 tabular-nums"
    >
      <span className="relative h-1.5 w-8 overflow-hidden rounded-full bg-bg-200">
        <span className="absolute inset-y-0 left-0 bg-accent-100" style={{ width: `${100 * clamped}%` }} />
      </span>
      <span>{clamped.toFixed(2)}</span>
    </span>
  );
}

/** Official tit */
function OfficialSearchTreeConnector({ isLastItem }: { isLastItem: boolean }) {
  return (
    <>
      <div className={`absolute left-[-12px] top-0 w-px bg-border-300 ${isLastItem ? "h-[13px]" : "-bottom-1"}`} />
      <div className="w-[6px] h-px bg-border-300 mt-[9px] shrink-0 -ml-3" />
    </>
  );
}

/** Official nit */
function OfficialSearchTreeNodeView({
  isLastItem,
  isRoot,
  node,
}: {
  isLastItem: boolean;
  isRoot: boolean;
  node: OfficialSearchTreeNode;
}) {
  return (
    <div className={`relative flex items-start py-0.5 ${isRoot ? "" : "pl-3"}`}>
      {!isRoot ? <OfficialSearchTreeConnector isLastItem={isLastItem} /> : null}
      <div className="min-w-0 flex-1 pl-[6px]">
        <div className="flex items-center gap-2">
          {node.probability !== null ? <OfficialSearchTreeProbability value={node.probability} /> : null}
          <span className="text-sm text-text-200">{node.label}</span>
        </div>
        {node.children.map((child, index) => (
          <OfficialSearchTreeNodeView
            isLastItem={index === node.children.length - 1}
            isRoot={false}
            key={`${child.label}-${index}`}
            node={child}
          />
        ))}
      </div>
    </div>
  );
}

/** Official ait SearchTree */
export const OfficialSearchTree = memo(function OfficialSearchTree({ content }: { content: string }) {
  const { question, roots } = useMemo(() => parseOfficialSearchTree(content), [content]);
  const [expanded, setExpanded] = useState(false);
  if (roots.length === 0) {
    return (
      <pre className="mb-2 whitespace-pre-wrap rounded border border-border-300 bg-bg-100 p-3 font-mono text-xs text-text-300">
        {content}
      </pre>
    );
  }
  return (
    <div className="mb-2 rounded-md border border-border-300 bg-bg-100">
      <button
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm font-semibold text-text-100 border-0 bg-transparent cursor-default outline-none hide-focus-ring ring-focus"
        onClick={() => setExpanded((value) => !value)}
        type="button"
      >
        <span className={`shrink-0 text-text-300 transition-transform ${expanded ? "" : "-rotate-90"}`}>
          <Icon name="ChevronDownSmall" size="sm" />
        </span>
        <span className="min-w-0 flex-1 truncate">{question ?? "Hypothesis tree"}</span>
      </button>
      {expanded ? (
        <div className="px-3 pb-3">
          {roots.map((root, index) => (
            <OfficialSearchTreeNodeView
              isLastItem={index === roots.length - 1}
              isRoot
              key={`${root.label}-${index}`}
              node={root}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
});

export const officialSearchTreeLanguage = "search_tree";
