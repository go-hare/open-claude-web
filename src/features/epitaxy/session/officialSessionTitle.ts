import type { SessionSummary } from "../../../adapters/desktopBridge";

/**
 * True only for empty / known empty-state labels — not for real host titles.
 * Official residual never treats pure-digit titles (e.g. "1") as placeholders.
 * Local code starts as "General coding session"; dust auto title or user rename
 * replaces it — do not invent prompt-as-title on the display layer.
 */
export function isPlaceholderCodingTitle(title?: string | null) {
  const text = title?.trim() ?? "";
  if (!text) return true;
  return text === "Untitled"
    || text === "Untitled session"
    || text === "Coding session"
    || text === "General coding session"
    || text === "New session";
}

/**
 * Header title SoT for local code tiles.
 * Official BELz residual: F||(t.length>0?t:Untitled) — real session.title wins.
 * Recents paints raw session.title; header must match (incl. pure digits).
 */
export function officialSessionHeaderTitle(session: SessionSummary | null, initialSessionId: string | undefined) {
  if (!initialSessionId) return "Claude Code";
  const title = session?.title?.trim();
  return title || "Untitled";
}
