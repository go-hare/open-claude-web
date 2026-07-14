import type { SessionSummary } from "../adapters/desktopBridge";
import { Icon } from "./icons";

/**
 * Official sidebar status glyph (c11959232 / mje CoworkStatusGlyph parity for code recents):
 * awaiting permissions → running dots → error warning → completed check → unread → archived → idle ring.
 */
type SidebarStatusSession = Pick<
  SessionSummary,
  "error" | "hasCompleted" | "isAgentCompleted" | "isArchived" | "isRunning" | "isUnread" | "pendingToolPermissions"
>;

export function OfficialSidebarStatusGlyph({ className = "", session }: { className?: string; session: SidebarStatusSession }) {
  const hasError = Boolean(session.error);
  if ((session.pendingToolPermissions?.length ?? 0) > 0) {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="awaiting" />;
  }
  if (session.isRunning) {
    return (
      <span aria-hidden="true" className={["inline-flex size-3 items-center justify-center gap-[2px] leading-none", className].filter(Boolean).join(" ")}>
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  }
  // Official mje error: Warning + text-warning-100 dark:text-warning-000
  if (hasError) {
    return (
      <Icon
        className={["text-warning-100 dark:text-warning-000", className].filter(Boolean).join(" ")}
        name="Warning"
        size="sm"
      />
    );
  }
  if (session.isAgentCompleted || session.hasCompleted) {
    return <Icon className={["text-text-400", className].filter(Boolean).join(" ")} name="CheckCircle" size="sm" />;
  }
  if (session.isUnread) {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="ready" />;
  }
  if (session.isArchived) {
    return <Icon name="Archive" size="sm" className={["text-text-500 opacity-80", className].filter(Boolean).join(" ")} />;
  }
  return <span aria-hidden="true" className={["block size-[6px] border border-text-400 opacity-50 rounded-full", className].filter(Boolean).join(" ")} />;
}
