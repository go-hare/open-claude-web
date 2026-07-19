/**
 * Official QS / DS / PS Runs pane (c11959232).
 * QS: remote → PS, local → DS.
 * Local DS: sessions sharing scheduledTaskId.
 * Remote PS: trigger_id from session origin / query; without trigger API show official empty/not-scheduled.
 * Empty: "Not a scheduled run" (WS).
 * Links use host onNavigate (app has no react-router-dom).
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { desktopBridge, type SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";
import type { OfficialSessionRef } from "../OfficialEpitaxyComponents";

function RunsSpinner({ size = "s" }: { size?: "s" | "m" | "l" }) {
  const box = size === "s" ? 12 : size === "l" ? 20 : 16;
  return (
    <span
      aria-hidden="true"
      className="inline-block shrink-0 animate-spin rounded-full border-2 border-t-transparent"
      style={{
        width: box,
        height: box,
        borderColor: "var(--accent-brand, currentColor)",
        borderTopColor: "transparent",
      }}
    />
  );
}

type RunRow = {
  createdAtMs?: number;
  id: string;
  isRunning: boolean;
  title: string;
  updatedAtMs?: number;
};

function EmptyState({ body, title }: { body: string; title: string }) {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-g3 px-p7 py-[64px] text-body text-t5 text-center">
      <Icon name="ClockTimeslot" size="lg" />
      <h2 className="text-body text-t7">{title}</h2>
      <p className="text-footnote text-t5 max-w-[36ch]">{body}</p>
    </div>
  );
}

function RunSection({
  heading,
  renderRow,
  runs,
}: {
  heading: string;
  renderRow: (run: RunRow) => ReactNode;
  runs: RunRow[];
}) {
  if (runs.length === 0) return null;
  return (
    <section className="flex flex-col gap-g3">
      <h3 className="text-footnote text-t6">{heading}</h3>
      <ul className="flex flex-col gap-g3">
        {runs.map((run) => renderRow(run))}
      </ul>
    </section>
  );
}

function RunLink({
  href,
  isCurrent,
  label,
  onNavigate,
  status,
}: {
  href: string;
  isCurrent: boolean;
  label: string;
  onNavigate?: (path: string) => void;
  status: "running" | "done";
}) {
  return (
    <li className={`group rounded-r6 ${isCurrent ? "bg-t3" : "bg-t1 hover:bg-t2 focus-within:bg-t2"}`}>
      <a
        aria-current={isCurrent ? "page" : undefined}
        className="flex items-center gap-g6 px-p7 py-p6 no-underline outline-none hide-focus-ring ring-focus"
        href={href}
        onClick={(event) => {
          if (!onNavigate) return;
          event.preventDefault();
          onNavigate(href);
        }}
      >
        <span className="shrink-0 flex items-center justify-center size-[12px]">
          {status === "running"
            ? <RunsSpinner size="s" />
            : <Icon className="text-t6" name="CheckCircle" size="sm" />}
        </span>
        <span className="flex-1 min-w-0 truncate text-body text-t8">{label}</span>
        <Icon
          className={`shrink-0 ${isCurrent ? "text-t8" : "text-t5 group-hover:text-t8"}`}
          name="ChevronRightSmall"
          size="md"
        />
      </a>
    </li>
  );
}

function formatRunLabel(run: RunRow): string {
  const ms = run.createdAtMs ?? run.updatedAtMs ?? Date.now();
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(ms));
  } catch {
    return run.title || run.id;
  }
}

function runHref(runId: string) {
  return `/code/${encodeURIComponent(runId)}?pane=runs`;
}

/**
 * Official QS: remote → PS, else DS local scheduled runs list.
 */
export function OfficialRunsPane({
  onNavigate,
  session,
  sessionRef,
}: {
  onNavigate?: (path: string) => void;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
}) {
  // Official QS({sessionRef}): remote → PS else DS.
  if (sessionRef.type === "remote") {
    return <OfficialRemoteRunsPane onNavigate={onNavigate} session={session} sessionRef={sessionRef} />;
  }
  return <OfficialLocalRunsPane onNavigate={onNavigate} session={session} sessionRef={sessionRef} />;
}

/** Official DS local scheduled runs list. */
function OfficialLocalRunsPane({
  onNavigate,
  session,
  sessionRef,
}: {
  onNavigate?: (path: string) => void;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
}) {
  const scheduledTaskId = session?.scheduledTaskId ?? null;
  const [runs, setRuns] = useState<RunRow[] | null>(null);
  const [loading, setLoading] = useState(Boolean(scheduledTaskId));
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!scheduledTaskId) {
      setRuns([]);
      setLoading(false);
      setError(false);
      return;
    }
    let alive = true;
    setLoading(true);
    setError(false);
    void (async () => {
      try {
        const list = await desktopBridge.LocalSessions.getSessionsForScheduledTask?.(scheduledTaskId) ?? [];
        if (!alive) return;
        const rows: RunRow[] = list.map((item) => ({
          id: item.id,
          title: item.title,
          isRunning: Boolean(item.isRunning),
          createdAtMs: item.createdAtMs,
          updatedAtMs: item.updatedAtMs,
        })).sort((a, b) => {
          const aT = a.updatedAtMs ?? a.createdAtMs ?? 0;
          const bT = b.updatedAtMs ?? b.createdAtMs ?? 0;
          return bT - aT;
        });
        setRuns(rows);
      } catch {
        if (alive) {
          setError(true);
          setRuns([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [scheduledTaskId]);

  const { running, completed } = useMemo(() => {
    const all = runs ?? [];
    return {
      running: all.filter((item) => item.isRunning),
      completed: all.filter((item) => !item.isRunning),
    };
  }, [runs]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center text-t5" role="status">
        <RunsSpinner size="l" />
        <span className="sr-only">Loading</span>
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        body="Something went wrong fetching this routine's runs. Close and reopen the panel to retry."
        title="Failed to load run history"
      />
    );
  }

  if (!scheduledTaskId) {
    return (
      <EmptyState
        body="This session wasn't started from a scheduled task. Open a session that ran on a schedule to see its run history here."
        title="Not a scheduled run"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        <header className="flex items-start justify-between gap-g4">
          <div className="min-w-0 flex-1 flex flex-col gap-g1">
            <div className="flex items-center gap-g3 min-w-0">
              <h2 className="text-body text-t9 truncate">{session?.title || scheduledTaskId}</h2>
              <span className="shrink-0 inline-flex items-center gap-g1 px-p3 py-p1 rounded-r4 bg-t2 text-caption-medium text-t7">
                <Icon name="SystemComputerLaptopMacbook" size="sm" />
                本地
              </span>
            </div>
          </div>
        </header>
        {(runs?.length ?? 0) === 0 ? (
          <p className="py-p4 text-footnote text-t5 text-center">No runs yet.</p>
        ) : (
          <>
            <RunSection
              heading="Running"
              renderRow={(run) => (
                <RunLink
                  href={runHref(run.id)}
                  isCurrent={run.id === sessionRef.id}
                  key={run.id}
                  label={formatRunLabel(run)}
                  onNavigate={onNavigate}
                  status="running"
                />
              )}
              runs={running}
            />
            <RunSection
              heading="Completed"
              renderRow={(run) => (
                <RunLink
                  href={runHref(run.id)}
                  isCurrent={run.id === sessionRef.id}
                  key={run.id}
                  label={formatRunLabel(run)}
                  onNavigate={onNavigate}
                  status="done"
                />
              )}
              runs={completed}
            />
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Official PS remote Runs path (c11959232).
 * trigger_id from session.origin / query ?trigger= / in-memory map.
 * Full trigger history needs remote Ap/Fi APIs — when absent, show official empty WS.
 */
function OfficialRemoteRunsPane({
  onNavigate,
  session,
  sessionRef,
}: {
  onNavigate?: (path: string) => void;
  session: SessionSummary | null;
  sessionRef: OfficialSessionRef;
}) {
  const triggerId = useMemo(() => {
    if (typeof window !== "undefined") {
      const fromQuery = new URLSearchParams(window.location.search).get("trigger");
      if (fromQuery) return fromQuery;
    }
    // Origin may be "scheduled" / trigger-ish id when desktop encodes it.
    const origin = session?.origin?.trim();
    if (origin && origin !== "manual" && origin !== "api" && origin !== "webhook" && origin !== "scheduled") {
      return origin;
    }
    return session?.scheduledTaskId ?? null;
  }, [session?.origin, session?.scheduledTaskId]);

  // Without remote trigger history APIs, keep official empty / not-scheduled surfaces.
  if (!triggerId) {
    return (
      <EmptyState
        body="This session wasn't started from a scheduled task. Open a session that ran on a schedule to see its run history here."
        title="Not a scheduled run"
      />
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-g6 px-p7 py-p7">
        <header className="flex items-start justify-between gap-g4">
          <div className="min-w-0 flex-1 flex flex-col gap-g1">
            <div className="flex items-center gap-g3 min-w-0">
              <h2 className="text-body text-t9 truncate">{session?.title || triggerId}</h2>
              <span className="shrink-0 inline-flex items-center gap-g1 px-p3 py-p1 rounded-r4 bg-t2 text-caption-medium text-t7">
                <Icon name="Cloud" size="sm" />
                remote
              </span>
            </div>
          </div>
        </header>
        <p className="py-p4 text-footnote text-t5 text-center">No runs yet.</p>
        {onNavigate ? (
          <p className="text-footnote text-t5 text-center">
            <a
              className="text-t7 underline-offset-2 hover:underline"
              href={`/code/${encodeURIComponent(sessionRef.id)}?pane=runs&trigger=${encodeURIComponent(triggerId)}`}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(`/code/${encodeURIComponent(sessionRef.id)}?pane=runs&trigger=${encodeURIComponent(triggerId)}`);
              }}
            >
              Current session
            </a>
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Official ES:
 * local → scheduledTaskId on session;
 * remote → trigger query / known remote schedule markers (pane 0).
 */
export function sessionHasOfficialRuns(
  session: SessionSummary | null | undefined,
  sessionRef?: OfficialSessionRef | null,
): boolean {
  if (sessionRef?.type === "remote" || session?.sessionType === "remote") {
    if (typeof window !== "undefined") {
      const trigger = new URLSearchParams(window.location.search).get("trigger");
      if (trigger) return true;
    }
    // Keep remote gate conservative: only when we have a trigger-like id.
    const origin = session?.origin?.trim();
    if (origin && origin !== "manual" && origin !== "api" && origin !== "webhook") return true;
    return Boolean(session?.scheduledTaskId);
  }
  return Boolean(session?.scheduledTaskId);
}
