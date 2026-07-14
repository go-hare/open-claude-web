import type { SessionSummary } from "../adapters/desktopBridge";
import { Icon } from "./icons";

/**
 * Official CodeStatusGlyph (vje / u_e / pje / gje) from index-BELzQL5P:
 * awaiting → running → ready(unread) → archived → idle ring.
 * Code path does NOT use CheckCircle/Warning (those are cowork xje/mje).
 */
type SidebarStatusSession = Pick<
  SessionSummary,
  "isArchived" | "isRunning" | "isUnread" | "pendingToolPermissions"
> & {
  /** Optional PR aggregate state when repo PR data is available. */
  prState?: OfficialCodePrState;
};

export type OfficialCodePrState =
  | "none"
  | "open"
  | "approved"
  | "changesRequested"
  | "conflicting"
  | "draft"
  | "queued"
  | "merged"
  | "closed";

/** Official u_e status reducer (code kind). */
function officialCodeStatusState(session: SidebarStatusSession): "awaiting" | "running" | "ready" | "pr" | "idle" {
  const pending = session.pendingToolPermissions?.length ?? 0;
  if (pending > 0) return "awaiting";
  if (session.isRunning) return "running";
  // Official vje passes unread into u_e.hasCompleted; ready = unread activity.
  if (session.isUnread) return "ready";
  if (session.prState && session.prState !== "none") return "pr";
  return "idle";
}

/** Official $_e + V_e PR glyph map (size 14 in leading slot). */
const PR_STATE_ICON: Record<Exclude<OfficialCodePrState, "none">, { name: string; className: string }> = {
  open: { name: "GitPullRequest", className: "text-[var(--extended-green)]" },
  approved: { name: "CircleCheck", className: "text-[var(--extended-green)]" },
  changesRequested: { name: "GitPullRequestClosed", className: "text-[var(--extended-pink)]" },
  conflicting: { name: "GitMergeConflict", className: "text-[var(--extended-orange)]" },
  draft: { name: "GitDraftPullRequestPR", className: "text-text-400" },
  queued: { name: "GitMergedSimple", className: "text-[var(--extended-yellow)]" },
  merged: { name: "GitMergedSimple", className: "text-[var(--extended-purple)]" },
  closed: { name: "GitPullRequestClosed", className: "text-[var(--extended-pink)]" },
};

export function OfficialSidebarStatusGlyph({ className = "", session }: { className?: string; session: SidebarStatusSession }) {
  const state = officialCodeStatusState(session);

  if (state === "pr" && session.prState && session.prState !== "none") {
    const pr = PR_STATE_ICON[session.prState];
    return (
      <Icon
        className={[pr.className, className].filter(Boolean).join(" ")}
        name={pr.name}
        size="sm"
      />
    );
  }

  if (state === "awaiting") {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="awaiting" />;
  }

  if (state === "running") {
    return (
      <span aria-hidden="true" className={["inline-flex size-3 items-center justify-center gap-[2px] leading-none", className].filter(Boolean).join(" ")}>
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  }

  if (state === "ready") {
    return <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="ready" />;
  }

  // Official: idle && archived → Archive; idle → pje 6px hollow ring
  if (session.isArchived) {
    return <Icon name="Archive" size="sm" className={["text-text-500 opacity-80", className].filter(Boolean).join(" ")} />;
  }

  // Official pje({ square: false })
  return (
    <span
      aria-hidden="true"
      className={["block size-[6px] border border-text-400 opacity-50 rounded-full", className].filter(Boolean).join(" ")}
    />
  );
}
