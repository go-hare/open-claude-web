/**
 * Official cd5a31703 `w9` padding (Gat).
 *
 *   paddingTop  = (compact ? 8 : lead ? 31 : 48) + (hasOlder ? 40 : 0) + bottomAnchorGapPx
 *   paddingBottom = (compact ? 16 : 48) + overlayPx + footReservePx + extraRoomPx
 *
 * Local Code: compact/lead/overlay/foot/paging empty; hasOlder adds awe 40.
 * Do not map transcriptMode "verbose" to compact.
 */
export const OFFICIAL_WINDOW_PAD_DEFAULT = 48;
export const OFFICIAL_WINDOW_PAD_COMPACT_TOP = 8;
export const OFFICIAL_WINDOW_PAD_LEAD_TOP = 31;
export const OFFICIAL_WINDOW_PAD_OLDER = 40;
export const OFFICIAL_WINDOW_PAD_COMPACT_BOTTOM = 16;

export type OfficialWindowPaddingInput = {
  bottomAnchorGapPx?: number;
  compact?: boolean;
  extraRoomPx?: number;
  firstRowKind?: string;
  footReservePx?: number;
  hasOlder?: boolean;
  overlayPx?: number;
};

export function officialWindowPadding(input: OfficialWindowPaddingInput = {}) {
  const compact = input.compact === true;
  const lead = !compact && input.firstRowKind === "lead";
  const paddingTop = (compact
    ? OFFICIAL_WINDOW_PAD_COMPACT_TOP
    : lead
      ? OFFICIAL_WINDOW_PAD_LEAD_TOP
      : OFFICIAL_WINDOW_PAD_DEFAULT)
    + (input.hasOlder === true ? OFFICIAL_WINDOW_PAD_OLDER : 0)
    + (input.bottomAnchorGapPx ?? 0);
  const paddingBottom = (compact ? OFFICIAL_WINDOW_PAD_COMPACT_BOTTOM : OFFICIAL_WINDOW_PAD_DEFAULT)
    + (input.overlayPx ?? 0)
    + (input.footReservePx ?? 0)
    + (input.extraRoomPx ?? 0);
  return { paddingBottom, paddingTop };
}
