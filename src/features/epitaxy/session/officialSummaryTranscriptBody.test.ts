/**
 * Residual yC dump builder (cC non-local path) unit checks.
 */
import { describe, expect, it } from "vitest";
import { residualBuildSummaryTranscriptDump } from "./officialSummaryTranscriptDump";
import type { TranscriptEntry } from "./officialTranscriptParse";

describe("residualBuildSummaryTranscriptDump", () => {
  it("formats user/assistant text turns like residual cC dump", () => {
    const entries: TranscriptEntry[] = [
      {
        id: "u1",
        author: "user",
        items: [{ kind: "text", id: "t1", text: "Fix the summary body mount" }],
      },
      {
        id: "a1",
        author: "assistant",
        items: [{ kind: "text", id: "t2", text: "Wiring Vn → yC now." }],
      },
    ];
    const dump = residualBuildSummaryTranscriptDump(entries);
    expect(dump).toContain("User: Fix the summary body mount");
    expect(dump).toContain("Assistant: Wiring Vn → yC now.");
  });

  it("includes tool inputs/outputs with residual Assistant [tool …] lines", () => {
    const entries: TranscriptEntry[] = [
      {
        id: "a2",
        author: "assistant",
        items: [
          {
            kind: "tools",
            id: "tools1",
            tools: [
              {
                id: "tu1",
                name: "Read",
                input: { path: "OfficialTranscript.tsx" },
                output: "export function renderTranscriptBody",
                status: "completed",
              },
            ],
          },
        ],
      },
    ];
    const dump = residualBuildSummaryTranscriptDump(entries);
    expect(dump).toContain("Assistant [tool Read]:");
    expect(dump).toContain("OfficialTranscript.tsx");
    expect(dump).toContain("→ export function renderTranscriptBody");
  });

  it("caps very long dumps from the end (residual oC 400k)", () => {
    const long = "x".repeat(500_000);
    const entries: TranscriptEntry[] = [
      {
        id: "u1",
        author: "user",
        items: [{ kind: "text", id: "t1", text: long }],
      },
    ];
    const dump = residualBuildSummaryTranscriptDump(entries);
    expect(dump.startsWith("…[earlier transcript truncated]")).toBe(true);
    expect(dump.length).toBeLessThanOrEqual(400_000 + 80);
  });
});
