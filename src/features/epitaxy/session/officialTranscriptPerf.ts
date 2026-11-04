/**
 * Official shared-0 `_s` / `ns` (cd5a `be` / `He`).
 * `be("transcript")` → `{ "data-perf-region": "transcript" }`.
 * `He(VR(row), fromTail, streaming)` → frozen data-perf-row attrs.
 * Channel renderer kinds omitted — local Code rows are user/assistant/loader.
 */
export const OFFICIAL_PERF_REGION_TRANSCRIPT = {
  "data-perf-region": "transcript",
} as const;

export type OfficialTranscriptPerfKind = "human" | "assistant" | "marker";

export function officialTranscriptPerfKind(
  kind: "user" | "assistant" | "loader" | string,
): OfficialTranscriptPerfKind {
  if (kind === "user") return "human";
  if (kind === "assistant") return "assistant";
  return "marker";
}

export function officialTranscriptRowPerf(
  kind: "user" | "assistant" | "loader" | string,
  fromTail: number,
  streaming: boolean,
) {
  const tail = Number.isFinite(fromTail) ? Math.min(10, Math.max(0, Math.trunc(fromTail))) : 10;
  return {
    "data-perf-row": officialTranscriptPerfKind(kind),
    "data-perf-row-from-tail": String(tail),
    "data-perf-row-streaming": streaming ? "true" : "false",
  };
}
