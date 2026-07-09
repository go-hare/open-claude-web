import type { SessionSummary } from "../adapters/desktopBridge";
import { Icon } from "./icons";

type SidebarStatusSession = Pick<SessionSummary, "isArchived" | "isRunning" | "isUnread" | "pendingToolPermissions">;

export function OfficialSidebarStatusGlyph({ className = "", session }: { className?: string; session: SidebarStatusSession }) {
  if ((session.pendingToolPermissions?.length ?? 0) > 0) {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="awaiting" />;
  }
  if (session.isRunning) {
    return (
      <span className={["inline-flex size-3 items-center justify-center gap-[2px] leading-none", className].filter(Boolean).join(" ")} aria-hidden="true">
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  }
  if (session.isUnread) {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="ready" />;
  }
  if (session.isArchived) {
    return <Icon name="Archive" size="sm" className={["text-text-500 opacity-80", className].filter(Boolean).join(" ")} />;
  }
  return <span aria-hidden="true" className={["block size-[6px] border border-text-400 opacity-50 rounded-full", className].filter(Boolean).join(" ")} />;
}
