/**
 * Official rewind turn list for DM picker (c11959232).
 * Residual: after first top-level assistant, vw-style user turns with non-empty text.
 * Product maps durable UUID + !isQueued as Ub gate (fork/rewind enable).
 */
import type { TranscriptEntry } from "./officialTranscriptParse";

const OFFICIAL_DURABLE_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OfficialRewindTurnSource = {
  text: string;
  uuid: string;
};

export function collectOfficialRewindTurns(
  entries: readonly TranscriptEntry[],
): OfficialRewindTurnSource[] {
  const turns: OfficialRewindTurnSource[] = [];
  // Official list builder: skip users until a top-level assistant has appeared (`s` flag).
  let sawAssistant = false;
  for (const entry of entries) {
    if (entry.author === "assistant") {
      sawAssistant = true;
      continue;
    }
    if (entry.author !== "user") continue;
    if (!sawAssistant) continue;
    if (entry.isQueued) continue;
    if (!OFFICIAL_DURABLE_UUID_RE.test(entry.id)) continue;
    const text = entry.items
      .filter((item): item is Extract<typeof item, { kind: "text" }> => item.kind === "text")
      .map((item) => item.text)
      .join("\n\n")
      .trim();
    // Official: i.trim() && t.push — empty human text not listed.
    if (!text) continue;
    turns.push({ uuid: entry.id, text });
  }
  return turns;
}
