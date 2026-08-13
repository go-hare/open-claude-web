/**
 * Official transcriptMode helpers (c11959232 / epitaxy store pr+xc; ca0135 fr as ld).
 * Kept pure so residual locks can unit-test without mounting OfficialTranscript.
 */
import type { OfficialTranscriptMode } from "../OfficialEpitaxyComponents";

export type { OfficialTranscriptMode };

/** Official ca0135 `fr` / c119 `ld` ladder. */
export const OFFICIAL_TRANSCRIPT_MODES = [
  "normal",
  "thinking",
  "verbose",
  "summary",
] as const satisfies readonly OfficialTranscriptMode[];

/** Official pr/xc: thinking visible in thinking|verbose modes only. */
export function officialTranscriptModeShowsThinking(mode: OfficialTranscriptMode) {
  return mode === "thinking" || mode === "verbose";
}

/** Official verbose expands tool details; separate from thinking visibility. */
export function officialTranscriptModeExpandsDetails(mode: OfficialTranscriptMode) {
  return mode === "verbose";
}

/**
 * Official onCycleTranscriptMode (c11959232):
 *   const ladder = hideSummary ? ld.filter(m => m !== "summary") : ld
 *   next = ladder[(indexOf(current) + 1) % length]
 * When current is missing from the ladder (e.g. summary while hideSummary),
 * indexOf is -1 → ( -1 + 1 ) % n === 0 → first mode (normal).
 */
export function cycleOfficialTranscriptMode(
  current: OfficialTranscriptMode,
  options?: { hideSummary?: boolean },
): OfficialTranscriptMode {
  const ladder: OfficialTranscriptMode[] = options?.hideSummary
    ? OFFICIAL_TRANSCRIPT_MODES.filter((mode) => mode !== "summary")
    : [...OFFICIAL_TRANSCRIPT_MODES];
  const index = ladder.indexOf(current);
  return ladder[(index + 1) % ladder.length]!;
}
