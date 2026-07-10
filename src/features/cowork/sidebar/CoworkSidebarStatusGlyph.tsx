import type { SessionSummary } from "../../../adapters/desktopBridge";
import { Icon } from "../../../shell/icons";

type CoworkStatusSession = Pick<SessionSummary, "isArchived" | "isRunning" | "isUnread" | "pendingToolPermissions">;

export function CoworkSidebarStatusGlyph({ className = "", session }: { className?: string; session: CoworkStatusSession }) {
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
  if (session.isUnread) return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="ready" />;
  if (session.isArchived) return <Icon className={["text-text-500 opacity-80", className].filter(Boolean).join(" ")} name="Archive" size="sm" />;
  return <span aria-hidden="true" className={["block size-[6px] border border-text-400 opacity-50 rounded-full", className].filter(Boolean).join(" ")} />;
}
