import { useEffect, useMemo, useState } from "react";
import { desktopBridge, type SessionSummary } from "../../adapters/desktopBridge";

type EpitaxyActionCenterProps = {
  onNavigate: (path: string) => void;
};

const compareSessions = (left: SessionSummary, right: SessionSummary) => right.updatedAtMs - left.updatedAtMs;

/**
 * Source-faithful boundary: c11959232 `_w.displayName = "EpitaxyActionCenter"`.
 * 原组件在 allClear 且无 code stats 时返回 null；这里不自造空态 UI。
 */
export function EpitaxyActionCenter({ onNavigate }: EpitaxyActionCenterProps) {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);

  useEffect(() => {
    let mounted = true;
    void desktopBridge.LocalAgentModeSessions.list().then((items) => {
      if (mounted) setSessions(items.sort(compareSessions));
    });
    return () => {
      mounted = false;
    };
  }, []);

  const attentionSessions = useMemo(
    () => sessions.filter((session) => session.isRunning || session.isUnread).slice(0, 3),
    [sessions],
  );

  if (attentionSessions.length === 0) return null;

  return (
    <div className="min-h-full flex flex-col">
      <div className="epitaxy-chat-column epitaxy-chat-size pt-[24px] pb-[56px] flex flex-col gap-[40px]">
        <section className="flex flex-col gap-g6">
          <header className="flex items-center gap-g3">
            <h2 className="text-body text-t8">Sessions</h2>
            <span className="flex-1" />
          </header>
          <ul role="list" className="flex flex-col gap-g3 m-0 p-0 list-none">
            {attentionSessions.map((session) => (
              <li key={session.id}>
                <button
                  className="flex w-full items-center gap-g4 rounded-r6 border-0 bg-fill-contained-default px-p5 py-p4 text-left effect-contained-default hover:bg-fill-contained-hover"
                  onClick={() => onNavigate(`/epitaxy/${encodeURIComponent(session.id)}`)}
                  type="button"
                >
                  <span className="status-dot shrink-0" data-kind={session.isRunning ? "ready" : "awaiting"} />
                  <span className="flex min-w-0 flex-1 flex-col gap-g1">
                    <strong className="truncate text-body text-t9">{session.title}</strong>
                    <small className="truncate text-footnote text-t6">{session.updatedAt}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
