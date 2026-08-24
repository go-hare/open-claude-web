import type { SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";

type CoworkStatusSession = Pick<
  SessionSummary,
  "error" | "hasCompleted" | "isAgentCompleted" | "isRunning" | "isUnread" | "pendingToolPermissions"
>;

export type CoworkSidebarGlyphKind = "error" | "completed" | "awaiting" | "running" | "ready" | "done" | "idle";

/**
 * Official xje CoworkStatusGlyph (index-BELzQL5P ~88083) + u_e (~2734040):
 *   1. hasError → mje Warning
 *   2. sY() (markTaskComplete supported) && isAgentCompleted && !pending && !running
 *      → hje Check (Tbe) + check-spin-in
 *   3. else u_e(kind:cowork):
 *        pending → awaiting
 *        isRunning → running
 *        hasCompleted && isUnread → ready
 *        idle && isDone(hasCompleted) → pje hollow square
 *        else idle ring
 * No Archive on Cowork Recents (Archive is Code vje only).
 * Product mark-complete is supported (toggleDone menu) so sY() is treated as true.
 */
export function resolveCoworkSidebarGlyphKind(session: CoworkStatusSession): CoworkSidebarGlyphKind {
  const pending = (session.pendingToolPermissions?.length ?? 0) > 0;
  const running = Boolean(session.isRunning);
  if (session.error) return "error";
  if (session.isAgentCompleted && !pending && !running) return "completed";
  if (pending) return "awaiting";
  if (running) return "running";
  if (session.hasCompleted && session.isUnread) return "ready";
  if (session.hasCompleted) return "done";
  return "idle";
}

export function CoworkSidebarStatusGlyph({ className = "", session }: { className?: string; session: CoworkStatusSession }) {
  const kind = resolveCoworkSidebarGlyphKind(session);
  const extra = className ? ` ${className}` : "";

  if (kind === "error") {
    return <Icon className={`text-warning-100 dark:text-warning-000${extra}`} name="Warning" size="sm" />;
  }

  if (kind === "completed") {
    return (
      <span className={`check-spin-in inline-flex size-4 origin-center items-center justify-center${extra}`}>
        <Icon className="text-text-400" name="Check" size="sm" />
      </span>
    );
  }

  if (kind === "awaiting") {
    return <span className={`status-dot${extra}`} data-kind="awaiting" />;
  }

  if (kind === "running") {
    return (
      <span aria-hidden="true" className={`inline-flex size-3 items-center justify-center gap-[2px] leading-none${extra}`}>
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  }

  if (kind === "ready") {
    return <span className={`status-dot${extra}`} data-kind="ready" />;
  }

  if (kind === "done") {
    return <span aria-hidden="true" className={`block size-[6px] border border-text-400 opacity-50 rounded-[2px]${extra}`} />;
  }

  return <span aria-hidden="true" className={`block size-[6px] border border-text-400 opacity-50 rounded-full${extra}`} />;
}
