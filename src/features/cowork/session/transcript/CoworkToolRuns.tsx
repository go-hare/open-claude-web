import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { Icon } from "../../../../shell/icons";
import type { CoworkToolUse, CoworkTranscriptItem } from "../types";
import { CoworkToolDetails } from "./CoworkToolDetails";
import { coworkToolHasDetails, coworkToolMetaClass, coworkToolRowSummary, coworkToolSummaryPieces, type CoworkToolSummaryPiece } from "./coworkToolSummary";

const standaloneTools = new Set(["AskUserQuestion", "EnterPlanMode", "ExitPlanMode", "TodoWrite", "TaskCreate", "TaskUpdate", "TaskGet", "TaskList", "TaskStop"]);

export function CoworkToolRuns({ item }: { item: Extract<CoworkTranscriptItem, { kind: "tools" }> }) {
  const runs = groupToolRuns(item.tools);
  return (
    <div className="flex flex-col gap-[var(--chat-item-gap)] w-full">
      {runs.map((run) => run.tools.length === 1 ? <CoworkToolRow key={run.id} tool={run.tools[0]} /> : <CoworkToolGroup key={run.id} tools={run.tools} />)}
    </div>
  );
}

function CoworkToolGroup({ tools }: { tools: CoworkToolUse[] }) {
  const [expanded, setExpanded] = useState(false);
  const toolsKey = tools.map((tool) => tool.id).join("|");
  useEffect(() => setExpanded(false), [toolsKey]);
  const status = aggregateStatus(tools);
  const runningTool = status === "running" ? tools.find((tool) => tool.status === "running") : undefined;
  const displayedRunningId = useDebouncedKey(runningTool?.id ?? "settled", 650);
  const displayedRunningTool = displayedRunningId === "settled" ? undefined : tools.find((tool) => tool.id === displayedRunningId);
  const runningSummary = displayedRunningTool ? coworkToolRowSummary(displayedRunningTool) : undefined;
  return (
    <div className="flex flex-col w-full">
      <button aria-expanded={expanded} className="relative group/tool flex self-start max-w-full items-center py-0 gap-g1 text-left outline-none hide-focus-ring focus:ring-focus rounded-r3" onClick={() => setExpanded((value) => !value)} type="button">
        <CoworkAnimatedToolLabel className="inline-flex items-center gap-g3 min-w-0" mode="wait" morphKey={runningSummary ? displayedRunningId : "settled"}>
          {runningSummary ? <><span className="text-body epitaxy-text-shine shrink-0">{runningSummary.runningVerb}</span>{runningSummary.meta ? <span className="text-body text-assistant-secondary truncate">{runningSummary.meta}</span> : null}</> : <><span className="text-body truncate">{coworkToolSummaryPieces(tools).map(renderSummaryPiece)}</span>{status === "awaiting_approval" ? <span className="text-body text-extended-yellow">Needs approval</span> : null}</>}
        </CoworkAnimatedToolLabel>
        <CoworkToolChevron expanded={expanded} />
      </button>
      <CoworkCollapse expanded={expanded}><div className="flex flex-col gap-g3 bg-t1 rounded-r6 p-p7 mt-[var(--p6)]">{tools.map((tool) => <CoworkToolRow inGroup key={tool.id} tool={tool} />)}</div></CoworkCollapse>
    </div>
  );
}

function CoworkToolRow({ inGroup = false, tool }: { inGroup?: boolean; tool: CoworkToolUse }) {
  const summary = useMemo(() => coworkToolRowSummary(tool), [tool]);
  const hasDetails = coworkToolHasDetails(tool, summary);
  const [expanded, setExpanded] = useState(summary.kind === "question" && !tool.output && !tool.isError);
  const isRunning = tool.status === "running";
  const isError = tool.status === "error" || Boolean(tool.isError);
  const toggle = () => { if (hasDetails && summary.kind !== "question") setExpanded((value) => !value); };
  return (
    <div className="flex flex-col w-full">
      <div aria-expanded={hasDetails ? expanded : undefined} className="relative group/tool flex self-start max-w-full items-center py-0 gap-g2 text-left cursor-pointer outline-none hide-focus-ring focus:ring-focus rounded-r3" onClick={toggle} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); toggle(); } }} role="button" tabIndex={0}>
        <CoworkAnimatedToolLabel className={`shrink-0 ${isRunning ? "text-body epitaxy-text-shine" : isError ? "text-body text-extended-pink" : "text-body text-assistant-secondary"}`} morphKey={isRunning ? "running" : "settled"}>{isRunning ? summary.runningVerb : summary.verb}</CoworkAnimatedToolLabel>
        {tool.subagentActivity?.model ? <span className="text-body text-assistant-secondary shrink-0">{tool.subagentActivity.model}</span> : null}
        {tool.subagentActivity ? <span className="text-body text-assistant-secondary truncate">{tool.subagentActivity.model ? "· " : ""}{tool.subagentActivity.latestToolName ?? tool.name} · {tool.subagentActivity.toolCallCount ?? 0}</span> : tool.status === "awaiting_approval" ? <span className="text-body text-extended-yellow">Needs approval</span> : summary.meta ? <CoworkToolMeta metaHref={summary.metaHref} summaryClass={coworkToolMetaClass(summary)} text={summary.meta} /> : null}
        {isRunning ? <span className="sr-only">running</span> : null}{hasDetails ? <CoworkToolChevron expanded={expanded} /> : null}
      </div>
      <CoworkCollapse expanded={expanded}><CoworkToolDetails tool={tool} /></CoworkCollapse>
    </div>
  );
}

function CoworkToolMeta({ metaHref, summaryClass, text }: { metaHref?: string; summaryClass: string; text: string }) {
  return metaHref && /^https:\/\//i.test(metaHref)
    ? <a className="text-code text-assistant-primary truncate" href={metaHref} onClick={(event) => event.stopPropagation()} rel="noreferrer" target="_blank">{text}</a>
    : <span className={summaryClass}>{text}</span>;
}

function CoworkCollapse({ children, expanded }: { children: ReactNode; expanded: boolean }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return expanded ? <div>{children}</div> : null;
  return <AnimatePresence initial={false}>{expanded ? <motion.div animate={{ height: "auto", opacity: 1 }} className="overflow-hidden" exit={{ height: 0, opacity: 0 }} initial={{ height: 0, opacity: 0 }} transition={{ height: { type: "spring", duration: 0.35, bounce: 0 }, opacity: { duration: 0.2 } }}>{children}</motion.div> : null}</AnimatePresence>;
}

function CoworkAnimatedToolLabel({ children, className, mode = "popLayout", morphKey }: { children: ReactNode; className: string; mode?: "popLayout" | "sync" | "wait"; morphKey: string }) {
  const reducedMotion = useReducedMotion();
  if (reducedMotion) return <span className={className}>{children}</span>;
  return <AnimatePresence initial={false} mode={mode}><motion.span animate={{ opacity: 1, y: 0 }} className={className} exit={{ opacity: 0, y: -3 }} initial={{ opacity: 0, y: 3 }} key={morphKey} transition={{ duration: 0.18 }}>{children}</motion.span></AnimatePresence>;
}

function useDebouncedKey(key: string, delayMs: number) {
  const [state, setState] = useState(() => ({ displayed: key, lastSwapAt: 0 }));
  useEffect(() => {
    if (key === state.displayed) return;
    const now = performance.now();
    const remaining = delayMs - (now - state.lastSwapAt);
    if (remaining <= 0) { setState({ displayed: key, lastSwapAt: now }); return; }
    const timer = window.setTimeout(() => setState({ displayed: key, lastSwapAt: performance.now() }), remaining);
    return () => window.clearTimeout(timer);
  }, [delayMs, key, state]);
  return state.displayed;
}

function groupToolRuns(tools: CoworkToolUse[]) {
  const groups: Array<{ bucket: "default" | "standalone"; id: string; tools: CoworkToolUse[] }> = [];
  for (const tool of tools) {
    const bucket = standaloneTools.has(tool.name) ? "standalone" : "default";
    const previous = groups.at(-1);
    if (previous?.bucket === bucket && bucket !== "standalone") previous.tools.push(tool);
    else groups.push({ bucket, id: `${bucket}:${tool.id}`, tools: [tool] });
  }
  return groups;
}

const statusPriority: Record<CoworkToolUse["status"], number> = { awaiting_approval: 3, running: 2, error: 1, completed: 0 };
function aggregateStatus(tools: CoworkToolUse[]) { return tools.reduce<CoworkToolUse["status"]>((status, tool) => statusPriority[tool.status] > statusPriority[status] ? tool.status : status, "completed"); }
function CoworkToolChevron({ expanded }: { expanded: boolean }) { return <span className="shrink-0 text-assistant-secondary" style={{ "--class-base-icon": "14px" } as CSSProperties}><Icon name={expanded ? "ChevronDownSmall" : "ChevronRightSmall"} size="sm" /></span>; }
function renderSummaryPiece(piece: CoworkToolSummaryPiece, index: number) { return <span key={`${piece.verb}-${piece.meta ?? index}`}>{index ? <span className="text-assistant-secondary">, </span> : null}<span className={piece.isError ? "text-extended-pink" : "text-assistant-secondary"}>{index ? piece.verb : capitalize(piece.verb)}</span>{piece.meta ? <span className="text-assistant-secondary"> {piece.meta}</span> : null}</span>; }
function capitalize(value: string) { return value ? value[0].toUpperCase() + value.slice(1) : value; }
