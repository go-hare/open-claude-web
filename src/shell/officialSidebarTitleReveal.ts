/**
 * Residual ca0135 CodeSessionRow (Ja):
 *   p = Ht(ot(ref))  // session still in _Me.pending
 *   g sticky true while p; after p clears hold g 1500ms then plain title
 *   children: g ? So({text, skipInitialReveal:true}) : plain
 *
 * Product maps pending → placeholder coding title (General coding session…)
 * while dust auto-title is in flight. Real host titles never typewrite on mount.
 */
import { isPlaceholderCodingTitle } from "../features/epitaxy/session/officialSessionTitle";

/** Residual Ja hold after pending clears before dropping So. */
export const TITLE_REVEAL_HOLD_MS = 1500;
/** @deprecated alias — prefer TITLE_REVEAL_HOLD_MS */
export const OFFICIAL_SIDEBAR_TITLE_REVEAL_HOLD_MS = TITLE_REVEAL_HOLD_MS;

export function isOfficialSidebarTitlePending(title?: string | null): boolean {
  return isPlaceholderCodingTitle(title);
}
