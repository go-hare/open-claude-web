import { useState } from "react";
/**
 * Official residual Ia SpaceSessionList (ce28369f9):
 * empty AOLw1gnWOh; otherwise Starred + 最近 session cards.
 * Product ships residual structure with session open navigation (full card chrome later).
 */
import type { SessionSummary } from "../../adapters/desktopBridge";
import { Icon } from "../../shell/icons";
import { coworkSessionPath } from "../cowork/sessionPaths";
import type { SpaceDetailText } from "./spaceDetailMessages";

const INITIAL_VISIBLE = 5;

export function SpaceDetailSessions({
  onNavigate,
  pendingPrompt,
  sessions,
  text,
}: {
  onNavigate: (path: string) => void;
  pendingPrompt?: string | null;
  sessions: SessionSummary[];
  text: SpaceDetailText;
}) {
  const [expanded, setExpanded] = useState(false);
  const starred = sessions.filter((session) => session.isPinned);
  const recent = sessions;
  const visible = expanded ? recent : recent.slice(0, INITIAL_VISIBLE);
  const hasMore = recent.length > INITIAL_VISIBLE;

  if (sessions.length === 0 && !pendingPrompt) {
    return (
      <div
        className="flex flex-col items-center justify-center py-16 text-center"
        data-official-source="ce28369f9-C9QQvDN-.js:Ia empty"
      >
        <Icon className="mb-3 text-text-500" customSize={32} name="Projects" />
        <p className="text-sm text-text-500">{text.emptySessions}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6" data-official-source="ce28369f9-C9QQvDN-.js:Ia">
      {starred.length > 0 ? (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-text-500">{text.starred}</h2>
          <div className="flex flex-col gap-2">
            {starred.map((session) => (
              <SpaceSessionRow key={`star-${session.id}`} onNavigate={onNavigate} session={session} />
            ))}
          </div>
        </section>
      ) : null}

      {(visible.length > 0 || pendingPrompt) && (
        <section className="flex flex-col gap-4">
          <h2 className="text-sm text-text-500">{text.recent}</h2>
          <div className="flex flex-col gap-2">
            {pendingPrompt ? (
              <div className="rounded-xl border border-border-300 bg-bg-000 px-4 py-3 text-sm text-text-300">
                <span className="text-text-500">{text.saving.replace("…", "")} </span>
                {pendingPrompt}
              </div>
            ) : null}
            {visible.map((session) => (
              <SpaceSessionRow key={session.id} onNavigate={onNavigate} session={session} />
            ))}
          </div>
          {hasMore ? (
            <button
              className="self-center py-2 text-sm text-text-400 transition-colors hover:text-text-200"
              onClick={() => setExpanded((value) => !value)}
              type="button"
            >
              {expanded ? text.showLess : text.showMore}
            </button>
          ) : null}
        </section>
      )}
    </div>
  );
}

function SpaceSessionRow({
  onNavigate,
  session,
}: {
  onNavigate: (path: string) => void;
  session: SessionSummary;
}) {
  return (
    <button
      className="flex w-full items-start gap-3 rounded-xl border border-border-300 bg-bg-000 px-4 py-3 text-left transition-colors hover:bg-bg-100"
      data-official-source="ce28369f9-C9QQvDN-.js:za SpaceSessionCard"
      onClick={() => onNavigate(coworkSessionPath(session))}
      type="button"
    >
      <Icon className="mt-0.5 flex-shrink-0 text-text-400" customSize={16} name="Chat" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-text-100">{session.title || session.id}</div>
        {session.cwd ? <div className="mt-0.5 truncate text-xs text-text-500">{session.cwd}</div> : null}
      </div>
    </button>
  );
}
