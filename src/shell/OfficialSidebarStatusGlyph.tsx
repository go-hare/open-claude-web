import type { ReactNode } from "react";
import type { SessionSummary } from "../adapters/desktopBridge";
import { OfficialTooltip } from "../features/shared/OfficialTooltip";
import { Icon } from "./icons";

/**
 * Official CodeStatusGlyph (vje / u_e / pje / gje) from index-BELzQL5P:
 * awaiting → running → ready(unread) → archived → idle ring.
 * Code path does NOT use CheckCircle/Warning (those are cowork xje/mje).
 * Wrapper is official ije: span.flex.shrink-0 + tooltip delay 500 / sideOffset 4.
 */
type SidebarStatusSession = Pick<
  SessionSummary,
  | "hasCompleted"
  | "isArchived"
  | "isRunning"
  | "isUnread"
  | "kind"
  | "pendingToolPermissions"
  | "sessionKind"
> & {
  /** Optional PR aggregate state when repo PR data is available (Code yje residual). */
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

/**
 * Official u_e (index-BELzQL5P):
 *   pendingPermissions>0 → awaiting
 *   isRunning → running
 *   hasCompleted && isUnread → ready
 *   code && prState !== "none" → pr
 *   else idle
 *
 * Code glyph residual also sets hasCompleted/isUnread from unreadIds (x=f||g&&!!c);
 * product host now persists both fields on turn settle.
 */
function officialCodeStatusState(session: SidebarStatusSession): "awaiting" | "running" | "ready" | "pr" | "idle" {
  const pending = session.pendingToolPermissions?.length ?? 0;
  if (pending > 0) return "awaiting";
  if (session.isRunning) return "running";
  if (session.hasCompleted && session.isUnread) return "ready";
  // Official u_e: kind==="code" && prState !== "none" → pr
  const isCode = session.kind === "code" || session.sessionKind === "code";
  if (isCode && session.prState && session.prState !== "none") return "pr";
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

/** Official oje catalog (index-BELzQL5P). */
const PR_STATE_LABEL: Record<Exclude<OfficialCodePrState, "none">, string> = {
  open: "Pull request open",
  approved: "Pull request approved",
  changesRequested: "Changes requested",
  conflicting: "Merge conflict",
  draft: "Draft pull request",
  queued: "Queued to merge",
  merged: "Pull request merged",
  closed: "Pull request closed",
};

/** Official lje catalog + archived 0HT+IbyW6O. */
function officialGlyphIjeLabel(session: SidebarStatusSession, state: ReturnType<typeof officialCodeStatusState>): string {
  if (state === "pr" && session.prState && session.prState !== "none") return PR_STATE_LABEL[session.prState];
  if (state === "awaiting") return "Awaiting input";
  if (state === "running") return "Running";
  if (state === "ready") return "Ready";
  if (session.isArchived) return "已归档";
  return "Idle";
}

export function OfficialSidebarStatusGlyph({ className = "", session }: { className?: string; session: SidebarStatusSession }) {
  const state = officialCodeStatusState(session);
  const label = officialGlyphIjeLabel(session, state);
  // Official ije live: awaiting/running/ready (gje live = e !== "idle"); pr + idle default false.
  const live = state === "awaiting" || state === "running" || state === "ready";

  let inner: ReactNode;
  if (state === "pr" && session.prState && session.prState !== "none") {
    const pr = PR_STATE_ICON[session.prState];
    inner = (
      <Icon
        className={[pr.className, className].filter(Boolean).join(" ")}
        name={pr.name}
        size="sm"
      />
    );
  } else if (state === "awaiting") {
    inner = <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="awaiting" />;
  } else if (state === "running") {
    inner = (
      <span aria-hidden="true" className={["inline-flex size-3 items-center justify-center gap-[2px] leading-none", className].filter(Boolean).join(" ")}>
        <span className="dframe-dot" />
        <span className="dframe-dot" />
        <span className="dframe-dot" />
      </span>
    );
  } else if (state === "ready") {
    inner = <span className={["status-dot", className].filter(Boolean).join(" ")} data-kind="ready" />;
  } else if (session.isArchived) {
    inner = <Icon name="Archive" size="sm" className={["text-text-500 opacity-80", className].filter(Boolean).join(" ")} />;
  } else {
    // Official pje({ square: false }) — index-BELzQL5P:
    // className:"block size-[6px] border border-text-400 opacity-50 "+(e?"rounded-[2px]":"rounded-full")
    inner = (
      <span
        aria-hidden="true"
        className={["block size-[6px] border border-text-400 opacity-50 rounded-full", className].filter(Boolean).join(" ")}
      />
    );
  }

  return (
    <OfficialTooltip delayDuration={500} sideOffset={4} tooltipContent={label}>
      <span className="flex shrink-0" role={live ? "status" : "img"} aria-label={label}>
        {inner}
      </span>
    </OfficialTooltip>
  );
}
