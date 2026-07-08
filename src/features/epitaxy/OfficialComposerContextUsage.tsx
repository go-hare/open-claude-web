import { useMemo, useState } from "react";
import type { ContextUsage } from "../../adapters/desktopBridge";

const composerUsageCircleSize = 12;
export const composerUsageCircumference = 2 * Math.PI * 5;

export function OfficialContextWindowSummary({
  contextPct,
  contextUsage,
  expanded,
  isFetching,
  onToggle,
  summary,
}: {
  contextPct: number | null;
  contextUsage: ContextUsage | null;
  expanded: boolean;
  isFetching: boolean;
  onToggle: () => void;
  summary: string;
}) {
  const canToggle = contextUsage !== null || isFetching;
  return (
    <div className="flex flex-col gap-g2">
      <button
        aria-expanded={canToggle ? expanded : undefined}
        className="group flex items-center gap-g6 px-p8 py-p2 min-h-[20px] text-left outline-none hide-focus-ring ring-focus rounded-r3"
        disabled={!canToggle}
        onClick={canToggle ? onToggle : undefined}
        type="button"
      >
        <span className="text-footnote text-t6">Context window</span>
        <span className="text-footnote text-t6 tabular-nums ml-auto">{summary}</span>
        {canToggle ? <span className="text-t6 group-hover:text-t8 shrink-0">{expanded ? "⌄" : "›"}</span> : null}
      </button>
      <div className="px-p8 pb-p2">
        {contextUsage ? <OfficialContextWindowUsage usage={contextUsage} defaultExpanded={expanded} compact className="" /> : <OfficialContextProgressBar contextPct={contextPct} />}
      </div>
      {canToggle && expanded && !contextUsage ? (
        <div className="px-p8 pb-p2 flex items-center gap-g4 text-footnote text-t7 min-h-[var(--h4)]">
          <OfficialInlineSpinner />
          <span>Loading context breakdown…</span>
        </div>
      ) : null}
    </div>
  );
}

export function OfficialContextProgressBar({ contextPct }: { contextPct: number | null }) {
  return (
    <div className="h-[4px] rounded-r2 overflow-hidden bg-t2" role="progressbar" aria-valuenow={contextPct ?? undefined} aria-valuemin={0} aria-valuemax={100}>
      {contextPct !== null ? <div className={`h-full ${officialContextUsageColorClass(contextPct)} transition-[width]`} style={{ width: `${contextPct}%` }} /> : null}
    </div>
  );
}

type OfficialContextCategory = { color: string; name: string; tokens: number };
type OfficialContextUsageModel = {
  agents: Array<{ agentType: string; tokens: number }>;
  categories: OfficialContextCategory[];
  mcpTools: Array<{ name: string; serverName: string; tokens: number }>;
  memoryFiles: Array<{ path: string; tokens: number }>;
  percentage: number;
  rawMaxTokens: number;
  totalTokens: number;
};

function OfficialContextWindowUsage({ className = "p-[12px] rounded-r6 bg-t1 max-w-[520px]", compact = false, defaultExpanded = false, usage }: { className?: string; compact?: boolean; defaultExpanded?: boolean; usage: ContextUsage }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const actualExpanded = compact ? defaultExpanded : expanded;
  const model = useMemo(() => normalizeOfficialContextUsageModel(usage), [usage]);
  const categoryTotal = model.categories.reduce((total, category) => total + category.tokens, 0) || 1;
  return (
    <div className={`flex flex-col gap-g4 ${className}`}>
      {!compact ? (
        <button type="button" className="flex items-center gap-g4 min-w-0 text-left outline-none hide-focus-ring ring-focus rounded-r3" onClick={() => setExpanded((value) => !value)} aria-expanded={actualExpanded}>
          <span className="text-body text-t9 shrink-0">Context window</span>
          <span className="text-footnote text-t6 truncate flex-1 text-right">{`${formatUsageTokenCount(model.totalTokens)} / ${formatUsageTokenCount(model.rawMaxTokens)} (${model.percentage}%)`}</span>
          <span className="text-t6 shrink-0">{actualExpanded ? "⌄" : "›"}</span>
        </button>
      ) : null}
      <div className={`flex shrink-0 rounded-r2 overflow-hidden bg-t2 ${compact ? "h-[4px]" : "h-[8px]"}`} role="img" aria-label={`${model.percentage}% of context window used`}>
        {model.categories.map((category) => {
          const visibleWidth = category.tokens / categoryTotal * 100;
          const rawPercent = category.tokens / model.rawMaxTokens * 100;
          if (visibleWidth < 0.5) return null;
          return (
            <div key={category.name} aria-label={`${category.name} — ${formatUsageTokenCount(category.tokens)} (${rawPercent.toFixed(1)}%)`} style={{ width: `${visibleWidth}%`, backgroundColor: category.color }} />
          );
        })}
      </div>
      {actualExpanded ? (
        <div className="flex flex-col gap-g2">
          {model.categories.map((category) => {
            const rawPercent = category.tokens / model.rawMaxTokens * 100;
            return (
              <div className="flex items-center gap-g3 text-footnote" key={category.name}>
                <span className="size-[8px] rounded-r1 shrink-0" style={{ backgroundColor: category.color }} aria-hidden="true" />
                <span className="text-t8 flex-1 truncate">{category.name}</span>
                <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(category.tokens)}</span>
                <span className="text-t8 shrink-0 tabular-nums w-[44px] text-right">{`${rawPercent.toFixed(1)}%`}</span>
              </div>
            );
          })}
          {model.mcpTools.length > 0 ? <OfficialContextUsageRows label="MCP tools" rows={model.mcpTools.map((row) => ({ name: `${row.serverName} · ${row.name}`, tokens: row.tokens }))} /> : null}
          {model.memoryFiles.length > 0 ? <OfficialContextUsageRows label="Memory files" rows={model.memoryFiles.map((row) => ({ name: row.path, tokens: row.tokens }))} /> : null}
          {model.agents.length > 0 ? <OfficialContextUsageRows label="Custom agents" rows={model.agents.map((row) => ({ name: row.agentType, tokens: row.tokens }))} /> : null}
        </div>
      ) : null}
    </div>
  );
}

function OfficialContextUsageRows({ label, rows }: { label: string; rows: Array<{ name: string; tokens: number }> }) {
  const [expanded, setExpanded] = useState(false);
  const total = rows.reduce((sum, row) => sum + row.tokens, 0);
  return (
    <div className="flex flex-col gap-g1 mt-[var(--p2)]">
      <button type="button" className="flex items-center gap-g3 text-footnote text-left" onClick={() => setExpanded((value) => !value)} aria-expanded={expanded}>
        <span className="size-[8px] shrink-0 flex items-center justify-center">{expanded ? "⌄" : "›"}</span>
        <span className="text-t7 flex-1">{label}</span>
        <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(total)}</span>
        <span className="text-t6 shrink-0 tabular-nums w-[44px] text-right">{rows.length}</span>
      </button>
      {expanded ? (
        <div className={`flex flex-col gap-g1 ${rows.length > 12 ? "max-h-[168px] overflow-y-auto overscroll-contain" : ""}`}>
          {rows.map((row) => (
            <div className="flex items-center gap-g3 text-footnote" key={row.name}>
              <span className="size-[8px] shrink-0" aria-hidden="true" />
              <span className="text-t6 flex-1 truncate">{row.name}</span>
              <span className="text-t6 shrink-0 tabular-nums">{formatUsageTokenCount(row.tokens)}</span>
              <span className="w-[44px] shrink-0" aria-hidden="true" />
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const officialFreeSpaceContextCategory = "Free space";
const officialAutocompactContextCategory = "Autocompact buffer";

function normalizeOfficialContextUsageModel(usage: ContextUsage): OfficialContextUsageModel {
  const rawMaxTokens = Math.max(1, usage.rawMaxTokens ?? 1);
  const totalTokens = Math.max(0, usage.totalTokens);
  const percentage = typeof usage.percentage === "number" && Number.isFinite(usage.percentage)
    ? officialClampPercent(usage.percentage)
    : officialClampPercent(totalTokens / rawMaxTokens * 100);
  const categories = usage.categories ?? [];
  return {
    agents: usage.agents ?? [],
    categories: sortOfficialContextCategories(categories).map((category, index) => ({
      ...category,
      color: officialContextCategoryColor(category.name, index),
    })),
    mcpTools: usage.mcpTools ?? [],
    memoryFiles: usage.memoryFiles ?? [],
    percentage,
    rawMaxTokens,
    totalTokens,
  };
}

function sortOfficialContextCategories(categories: Array<{ name: string; tokens: number }>) {
  const visible = categories.filter((category) => category.name !== officialFreeSpaceContextCategory && category.name !== officialAutocompactContextCategory && !isDeferredOfficialContextCategory(category.name))
    .sort((left, right) => right.tokens - left.tokens);
  const deferred = categories.filter((category) => isDeferredOfficialContextCategory(category.name)).sort((left, right) => right.tokens - left.tokens);
  const autocompact = categories.find((category) => category.name === officialAutocompactContextCategory);
  const free = categories.find((category) => category.name === officialFreeSpaceContextCategory);
  return [...visible, ...deferred, ...(autocompact ? [autocompact] : []), ...(free ? [free] : [])].filter((category) => category.tokens > 0);
}

function isDeferredOfficialContextCategory(name: string) {
  return /\(deferred\)$/i.test(name);
}

function officialContextCategoryColor(name: string, index: number) {
  if (name === officialFreeSpaceContextCategory) return "var(--t2)";
  if (name === officialAutocompactContextCategory || isDeferredOfficialContextCategory(name)) return "var(--t4)";
  return `hsl(217 70% ${Math.min(88, 62 + 6 * index)}%)`;
}

function officialContextUsageColorClass(percent: number) {
  return percent >= 95 ? "bg-extended-pink" : percent >= 80 ? "bg-extended-yellow" : "bg-[var(--accent)]";
}

export function officialClampPercent(value: number) {
  return Math.round(100 * Math.max(0, Math.min(1, value / 100)));
}

function OfficialInlineSpinner() {
  return (
    <span className="relative inline-block shrink-0 align-middle size-4" aria-hidden="true">
      <span className="absolute inset-0 rounded-full" style={{ border: "2px solid var(--t2)" }} />
      <span className="absolute inset-0 rounded-full animate-[spin_2s_linear_infinite]" style={{ background: "conic-gradient(transparent 40%, var(--spinner-arc, var(--t6)))", mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), rgb(0, 0, 0) calc(100% - 1.5px))" }} />
    </span>
  );
}

export function OfficialUsageCircle({ strokeDashoffset, usagePercent }: { strokeDashoffset: number; usagePercent: number }) {
  return (
    <svg width={composerUsageCircleSize} height={composerUsageCircleSize} viewBox="0 0 12 12" className="-rotate-90" aria-hidden="true">
      <circle cx={6} cy={6} r={5} fill="none" strokeWidth={2} stroke="var(--t3)" />
      <circle cx={6} cy={6} r={5} fill="none" strokeWidth={2} strokeDasharray={composerUsageCircumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round" stroke={usagePercent >= 95 ? "var(--extended-pink)" : usagePercent >= 80 ? "var(--extended-yellow)" : "var(--accent)"} className="transition-[stroke-dashoffset] duration-300" />
    </svg>
  );
}

export function formatUsageTokenCount(value: number) {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}k`;
  return String(value);
}
