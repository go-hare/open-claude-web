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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/** Official c227 `dY`: assistant content `{type:"thinking", thinking}` non-empty after trim. */
function messageHasThinkingBlock(message: { role?: string; raw?: unknown }): boolean {
  const raw = message.raw;
  if (!isRecord(raw)) return false;
  const nested = isRecord(raw.message) ? raw.message : undefined;
  const envelopeContent = raw.type === "assistant" ? (nested?.content ?? raw.content) : undefined;
  const roleContent = message.role === "assistant" ? (nested?.content ?? raw.content) : undefined;
  const content = envelopeContent ?? roleContent;
  if (!Array.isArray(content)) return false;
  return content.some((item) => {
    if (!isRecord(item) || item.type !== "thinking") return false;
    return typeof item.thinking === "string" && item.thinking.trim() !== "";
  });
}

/**
 * Official c227 `bY` (cc432 `Rb` / c593 `xm` gate):
 *   e===null || di(e) → true; else snapshot some(dY)
 * `di` is official `startsWith("local_")`. Product local Code ids are `code_*` —
 * pass `isLocalSession` from `sessionRef.type === "local"`; keep `local_` for residual.
 */
export function officialXmShowsThinking(options: {
  sessionId: string | null | undefined;
  isLocalSession: boolean;
  messages?: Array<{ role?: string; raw?: unknown }> | null;
}): boolean {
  if (options.sessionId == null || options.sessionId === "") return true;
  if (options.isLocalSession || options.sessionId.startsWith("local_")) return true;
  const messages = options.messages;
  if (!messages) return false;
  return messages.some(messageHasThinkingBlock);
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
