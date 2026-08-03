/**
 * Official Code sidebar PR state pure residual (index-BELzQL5P Sye / L_e / G_e / W_e).
 * No desktopBridge import — unit-testable without Electron window.
 */
import type { LocalPrState } from "../adapters/desktopBridge/types";
import type { OfficialCodePrState } from "./OfficialSidebarStatusGlyph";

export type SessionPrRef = {
  draft?: boolean;
  merged?: boolean;
  number?: number;
  repo?: string;
  state?: string;
  title?: string;
  url?: string;
  /** Official reviewDecision residual (APPROVED / CHANGES_REQUESTED). */
  reviewDecision?: string;
  /** Merge conflict residual when known. */
  conflicting?: boolean;
};

/** Official W_e priority — lower wins (open beats closed/draft/merged). */
const PR_STATE_PRIORITY: Record<OfficialCodePrState, number> = {
  open: 0,
  approved: 0,
  changesRequested: 0,
  conflicting: 0,
  closed: 1,
  draft: 2,
  queued: 3,
  merged: 4,
  none: 99,
};

/** Official Sye + L_e residual from a single PR bag. */
export function officialCodePrStateFromLocal(
  pr: LocalPrState | SessionPrRef | null | undefined,
): OfficialCodePrState {
  if (!pr) return "none";
  const hasIdentity =
    pr.number != null
    || Boolean(pr.url)
    || Boolean(pr.state)
    || pr.merged === true
    || pr.draft === true;
  if (!hasIdentity) return "none";

  const rawState = typeof pr.state === "string" ? pr.state.toLowerCase() : "";
  // Official Sye
  if (pr.merged === true || rawState === "merged") return "merged";
  if (rawState === "closed") return "closed";
  if (pr.draft === true || rawState === "draft") return "draft";
  if (rawState === "queued") return "queued";

  // Official L_e(open, reviewDecision, conflicting) — remaining treated as open.
  const review =
    typeof (pr as SessionPrRef).reviewDecision === "string"
      ? (pr as SessionPrRef).reviewDecision!.toUpperCase()
      : "";
  if ((pr as SessionPrRef).conflicting === true) return "conflicting";
  if (review === "CHANGES_REQUESTED") return "changesRequested";
  if (review === "APPROVED") return "approved";
  return "open";
}

/** Official G_e residual — pick best (lowest W_e) among PR states. */
export function aggregateOfficialCodePrState(states: readonly OfficialCodePrState[]): OfficialCodePrState {
  const usable = states.filter((state) => state !== "none");
  if (usable.length === 0) return "none";
  let best = usable[0]!;
  for (const state of usable) {
    if ((PR_STATE_PRIORITY[state] ?? 99) < (PR_STATE_PRIORITY[best] ?? 99)) best = state;
  }
  return best;
}
