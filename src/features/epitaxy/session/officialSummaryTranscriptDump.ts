/**
 * Residual cC non-local transcript dump builder (c11959232).
 * Pure — no bridge / window. Used by OfficialSummaryTranscriptBody + unit tests.
 */
import type { TranscriptEntry } from "./officialTranscriptParse";

/** Residual rC / oC — bash/tool trunc and transcript cap. */
export const RESIDUAL_SUMMARY_ITEM_TRUNCATE = 2000;
export const RESIDUAL_SUMMARY_TRANSCRIPT_CAP = 400_000;

function residualTruncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n…[truncated ${text.length - max} chars]`;
}

/** Residual cC non-local transcript dump builder. */
export function residualBuildSummaryTranscriptDump(entries: readonly TranscriptEntry[]): string {
  const lines: string[] = [];
  for (const entry of entries) {
    const who = entry.author === "user" ? "User" : "Assistant";
    for (const item of entry.items) {
      switch (item.kind) {
        case "text":
          lines.push(`${who}: ${item.text}`);
          break;
        case "error":
          lines.push(`${who} [error]: ${"text" in item ? String((item as { text?: string }).text ?? "") : ""}`);
          break;
        case "bash": {
          const bash = item as { command?: string; output?: string };
          lines.push(
            `${who} [bash]: ${bash.command ?? ""}`
            + (bash.output ? `\n${residualTruncate(bash.output, RESIDUAL_SUMMARY_ITEM_TRUNCATE)}` : ""),
          );
          break;
        }
        case "event": {
          const ev = item as { eventType?: string; content?: string };
          lines.push(`[${ev.eventType ?? "event"} event]: ${ev.content ?? ""}`);
          break;
        }
        case "tools": {
          const tools = (item as { tools?: Array<{ name?: string; input?: unknown; output?: unknown }> }).tools ?? [];
          for (const tool of tools) {
            const input = residualTruncate(JSON.stringify(tool.input ?? {}), RESIDUAL_SUMMARY_ITEM_TRUNCATE);
            const output =
              tool.output !== undefined
                ? `\n  → ${residualTruncate(
                  typeof tool.output === "string" ? tool.output : JSON.stringify(tool.output),
                  RESIDUAL_SUMMARY_ITEM_TRUNCATE,
                )}`
                : "";
            lines.push(`Assistant [tool ${tool.name ?? "tool"}]: ${input}${output}`);
          }
          break;
        }
        default:
          break;
      }
    }
  }
  const joined = lines.join("\n\n");
  if (joined.length > RESIDUAL_SUMMARY_TRANSCRIPT_CAP) {
    return `…[earlier transcript truncated]\n\n${joined.slice(-RESIDUAL_SUMMARY_TRANSCRIPT_CAP)}`;
  }
  return joined;
}
