/**
 * Official transcriptMode helpers (c11959232 / epitaxy store pr+xc).
 * Kept pure so residual locks can unit-test without mounting OfficialTranscript.
 */
import type { OfficialTranscriptMode } from "../OfficialEpitaxyComponents";

export type { OfficialTranscriptMode };

/** Official pr/xc: thinking visible in thinking|verbose modes only. */
export function officialTranscriptModeShowsThinking(mode: OfficialTranscriptMode) {
  return mode === "thinking" || mode === "verbose";
}

/** Official verbose expands tool details; separate from thinking visibility. */
export function officialTranscriptModeExpandsDetails(mode: OfficialTranscriptMode) {
  return mode === "verbose";
}
