import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { TranscriptEntry } from "./officialTranscriptParse";
import {
  estimateOfficialTranscriptRowSize,
  officialEstimateToolRunCount,
  officialEstimateWrapPx,
  OFFICIAL_ESTIMATE_LINE_PX,
  OFFICIAL_ESTIMATE_TOOL_ROW_PX,
} from "./officialTranscriptRowEstimate";

const here = path.dirname(fileURLToPath(import.meta.url));

function assistant(items: TranscriptEntry["items"]): TranscriptEntry {
  return { author: "assistant", id: "a", items };
}

describe("official cd5a $it / Sit / m7 row estimate", () => {
  it("Sit coalesces consecutive non-Task tools to one Y5 row", () => {
    const tool = (name: string, id: string) => ({ id, input: {}, name, status: "running" as const });
    expect(officialEstimateToolRunCount([tool("Read", "1"), tool("Bash", "2"), tool("Read", "3")])).toBe(1);
    expect(officialEstimateToolRunCount([tool("Read", "1"), tool("Task", "2"), tool("Read", "3")])).toBe(3);
  });

  it("m7 wraps at Medium charsPerLine × B5", () => {
    const chars = 960 / 7.5;
    expect(officialEstimateWrapPx("hi", chars, false)).toBe(OFFICIAL_ESTIMATE_LINE_PX);
    expect(officialEstimateWrapPx("a".repeat(Math.ceil(chars) + 1), chars, false)).toBe(2 * OFFICIAL_ESTIMATE_LINE_PX);
  });

  it("a streaming tools-only assistant is chrome+Y5, not Wb 400", () => {
    const size = estimateOfficialTranscriptRowSize({
      entry: assistant([{ id: "t", kind: "tools", tools: [{ id: "r", input: { file_path: "clientDataUrl.ts" }, name: "Read", status: "running" }] }]),
      kind: "assistant",
    });
    expect(size).toBe(57 + OFFICIAL_ESTIMATE_TOOL_ROW_PX + 8);
    expect(size).toBeLessThan(120);
    expect(size).not.toBe(400);
  });

  it("loader is mit 48", () => {
    expect(estimateOfficialTranscriptRowSize({ kind: "loader" })).toBe(48);
  });

  it("OfficialTranscript uses $it estimate, not Wb 400; pin layout does not invent resizeItem", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/estimateOfficialTranscriptRowSize/);
    expect(source).toMatch(/useOfficialTranscriptFu/);
    expect(source).toMatch(/data-rs-index/);
    expect(source).not.toMatch(/useVirtualizer/);
    expect(source).not.toMatch(/officialFuResizeMountedRows/);
    expect(source).not.toMatch(/officialFuRowOffsetHeight/);
    expect(source).not.toMatch(/function estimateTranscriptRowSize/);
    expect(source).not.toMatch(/case "assistant":\s*return 400/);
  });
});
