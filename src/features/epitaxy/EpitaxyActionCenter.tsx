/**
 * Official c11959232 `_w.displayName = "EpitaxyActionCenter"`.
 *
 * allClear → null here (home shows CodeStats via $x branch).
 * else Sessions list (+ optional Show more); PR section only when activePrEntries non-empty
 * (product PR list empty until gh residual — no invent).
 * Mark all read only when hasClearableUnreads (product false without clear store).
 *
 * Prefer shared Pw state from parent (`state` prop) so home Tw + _w share one list fetch.
 */
import { useMemo, useState } from "react";
import { Icon } from "../../shell/icons";
import { sessionPath } from "../../shell/sessionPaths";
import { OfficialButton } from "./OfficialEpitaxyComponents";
import {
  formatActionCenterRelativeTime,
  sessionTimestampMs,
  useActionCenterVisibleCap,
  useEpitaxyActionCenterState,
  type ActionCenterSessionKind,
  type ActionCenterSessionRow,
  type EpitaxyActionCenterState,
} from "./epitaxyActionCenterState";

type EpitaxyActionCenterProps = {
  onNavigate: (path: string) => void;
  /** Official Pw snapshot from parent; omit to fetch locally. */
  state?: EpitaxyActionCenterState;
};

const KIND_STYLES: Record<ActionCenterSessionKind, { dot: string; text: string; label: string }> = {
  // Official Aw / Dw
  blocked: { dot: "bg-extended-yellow", text: "text-extended-yellow", label: "Needs input" },
  review: { dot: "bg-[var(--dot-ready)]", text: "text-[var(--dot-ready)]", label: "Ready for review" },
  unread: { dot: "bg-[var(--dot-ready)]", text: "text-[var(--dot-ready)]", label: "Unread" },
  routine: { dot: "bg-[var(--dot-ready)]", text: "text-[var(--dot-ready)]", label: "Unread" },
};

export function EpitaxyActionCenter({ onNavigate, state: stateProp }: EpitaxyActionCenterProps) {
  // Always call hook (Rules of Hooks). Disable fetch when parent owns shared Pw.
  const localState = useEpitaxyActionCenterState({ enabled: !stateProp });
  const {
    attentionSessions,
    allClear,
    hasClearableUnreads,
    isSessionsLoading,
  } = stateProp ?? localState;
  const visibleCap = useActionCenterVisibleCap();
  const [showAllSessions, setShowAllSessions] = useState(false);

  const visibleSessions = useMemo(
    () => (showAllSessions ? attentionSessions : attentionSessions.slice(0, visibleCap)),
    [attentionSessions, showAllSessions, visibleCap],
  );
  const hiddenSessionCount = Math.max(0, attentionSessions.length - visibleSessions.length);

  // Official: loading → null; allClear → stats on parent (not this component).
  // When parent passes state, home already branches; still guard for standalone use.
  if (isSessionsLoading || allClear) return null;

  return (
    <div
      className="min-h-full flex flex-col"
      data-official-source="c11959232-h_zsw3wI.js:EpitaxyActionCenter"
    >
      <div className="epitaxy-chat-column epitaxy-chat-size pt-[24px] pb-[56px] flex flex-col gap-[40px]">
        {attentionSessions.length > 0 ? (
          <section className="flex flex-col gap-g6">
            <header className="flex items-center gap-g3">
              <h2 className="text-body text-t8">Sessions</h2>
              <span className="flex-1" />
              {hasClearableUnreads ? (
                <OfficialButton
                  onClick={() => {
                    // Official xn clearAll — product has no unread-clear store yet.
                  }}
                  size="small"
                  variant="muted"
                >
                  Mark all read
                </OfficialButton>
              ) : null}
              {attentionSessions.length > visibleCap ? (
                <OfficialButton
                  ariaLabel={showAllSessions ? "Show less" : `Show ${hiddenSessionCount} more`}
                  onClick={() => setShowAllSessions((value) => !value)}
                  size="small"
                  variant="muted"
                >
                  {showAllSessions ? "Show less" : `Show ${hiddenSessionCount} more`}
                </OfficialButton>
              ) : null}
            </header>
            <ul role="list" className="flex flex-col gap-g3 m-0 p-0 list-none">
              {visibleSessions.map((row) => (
                <ActionCenterSessionRowButton
                  key={row.session.id}
                  onOpen={() => onNavigate(sessionPath(row.session))}
                  row={row}
                />
              ))}
            </ul>
          </section>
        ) : null}
        {/* Official Pull requests section only when activePrEntries.length > 0 — product empty. */}
      </div>
    </div>
  );
}

function ActionCenterSessionRowButton({
  onOpen,
  row,
}: {
  onOpen: () => void;
  row: ActionCenterSessionRow;
}) {
  const { kind, session } = row;
  const style = KIND_STYLES[kind];
  const title = session.title?.trim() || "Untitled session";
  const repo = session.repo?.name;
  const summary =
    session.postTurnSummary?.statusDetail
    || session.postTurnSummary?.recentAction
    || undefined;
  const relative = formatActionCenterRelativeTime(sessionTimestampMs(session));

  return (
    <li className="group flex items-center gap-g6 px-p4 py-p6 rounded-r6 bg-t1 hover:bg-t2 focus-within:bg-t2 list-none">
      <button
        aria-label={`Open session ${title}`}
        className="flex flex-1 min-w-0 items-center justify-between gap-g6 text-left outline-none hide-focus-ring ring-focus rounded-r3 border-0 bg-transparent cursor-default p-0"
        onClick={onOpen}
        type="button"
      >
        <span className="flex min-w-0 flex-1 items-center gap-g6">
          <span className="flex shrink-0 items-center">
            <span className="inline-flex w-[16px] items-center justify-center">
              <span className={`size-[5px] rounded-full ${style.dot}`} />
            </span>
            <span className={`text-footnote ${style.text}`}>{style.label}</span>
          </span>
          <span className="flex min-w-0 flex-1 items-baseline gap-g4">
            {kind === "routine" ? (
              <Icon className="shrink-0 self-center text-t6" name="ClockTimeslot" size="m" />
            ) : null}
            <span className="min-w-0 text-body text-t9 truncate">{title}</span>
            {summary ? (
              <span className="min-w-0 shrink-[9999] text-body text-t6 truncate">{summary}</span>
            ) : null}
          </span>
        </span>
        <span className="flex shrink-0 items-center gap-g5">
          {repo ? (
            <span className="max-w-[180px] truncate text-footnote text-t6">{repo}</span>
          ) : null}
          <span className="-mr-[4px] min-w-[20px] text-center text-footnote text-t6 tabular-nums">
            {relative}
          </span>
          <Icon className="text-t6 group-hover:text-t7" name="ChevronRightSmall" size="l" />
        </span>
      </button>
    </li>
  );
}
