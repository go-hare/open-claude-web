import { useEffect, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import type { LocalSessionsBridge, SessionSummary } from "../../../adapters/desktopBridge/types";
import { Icon } from "../../../shell/icons";
import { sessionPath } from "../../../shell/sessionPaths";

export function useCoworkScheduledRuns(bridge: LocalSessionsBridge, scheduledTaskId?: string) {
  const [runs, setRuns] = useState<SessionSummary[]>([]);

  useEffect(() => {
    if (!scheduledTaskId || !bridge.getSessionsForScheduledTask) {
      setRuns([]);
      return undefined;
    }

    let alive = true;
    const loadRuns = async () => {
      const nextRuns = await bridge.getSessionsForScheduledTask?.(scheduledTaskId).catch(() => []);
      if (alive) setRuns(sortCoworkRuns(nextRuns ?? []));
    };

    void loadRuns();
    const unsubscribe = bridge.onEvent?.(() => void loadRuns());
    return () => {
      alive = false;
      unsubscribe?.();
    };
  }, [bridge, scheduledTaskId]);

  return runs;
}

export function CoworkScheduledRunsSection({
  currentSessionId,
  isExpanded,
  onNavigate,
  onToggle,
  runs,
}: {
  currentSessionId: string;
  isExpanded: boolean;
  onNavigate: (path: string) => void;
  onToggle: () => void;
  runs: SessionSummary[];
}) {
  if (runs.length === 0) return null;
  return (
    <div className="rounded-lg bg-bg-100 border-0.5 border-border-300 shadow-sm overflow-hidden shrink-0">
      <CoworkRunsHeader isExpanded={isExpanded} onToggle={onToggle} />
      <div className="grid transition-[grid-template-rows] duration-200" inert={!isExpanded || undefined} style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}>
        <div className="overflow-hidden">
          <div className="px-3 pb-3 overflow-y-auto" style={{ maxHeight: "16rem" }}>
            <ul className="flex flex-col gap-px">
              {runs.map((run) => <CoworkScheduledRunRow currentSessionId={currentSessionId} key={run.id} onNavigate={onNavigate} run={run} />)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

function CoworkRunsHeader({ isExpanded, onToggle }: { isExpanded: boolean; onToggle: () => void }) {
  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onToggle();
  };
  return (
    <div aria-expanded={isExpanded} className="can-focus w-full flex items-center justify-between p-3 text-left select-none draggable-none cursor-pointer" onClick={onToggle} onKeyDown={onKeyDown} role="button" tabIndex={0}>
      <span className="font-medium text-sm text-text-100">Runs</span>
      <span className={`inline-flex h-5 w-5 items-center justify-center text-text-500 transition-transform duration-200 ease-[cubic-bezier(0,0,0.2,1)] ${isExpanded ? "rotate-90" : ""}`}>
        <Icon name="CaretRight" size="sm" />
      </span>
    </div>
  );
}

function CoworkScheduledRunRow({
  currentSessionId,
  onNavigate,
  run,
}: {
  currentSessionId: string;
  onNavigate: (path: string) => void;
  run: SessionSummary;
}) {
  const isCurrent = run.id === currentSessionId;
  const unread = Boolean(run.isUnread && !isCurrent && !run.isRunning);
  const className = isCurrent ? "bg-bg-200 text-text-100" : "text-text-300 hover:bg-bg-200";
  return (
    <li>
      <button className={`flex items-center justify-between py-2 px-2 -mx-2 rounded-lg transition-colors text-sm w-full text-left ${className}`} onClick={() => onNavigate(sessionPath(run))} type="button">
        <span className="min-w-0 truncate">{formatCoworkRunTime(coworkRunTimestamp(run))}</span>
        {unread ? <span aria-label="Unread completed run" className="size-2 rounded-full bg-accent-100 flex-shrink-0" /> : null}
      </button>
    </li>
  );
}

function sortCoworkRuns(runs: SessionSummary[]) {
  return [...runs].sort((left, right) => coworkRunTimestamp(right) - coworkRunTimestamp(left));
}

function coworkRunTimestamp(run: SessionSummary) {
  return run.createdAtMs ?? run.updatedAtMs ?? 0;
}

function formatCoworkRunTime(timestamp: number) {
  if (!Number.isFinite(timestamp) || timestamp <= 0) return "Run";
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  }).format(new Date(timestamp));
}
