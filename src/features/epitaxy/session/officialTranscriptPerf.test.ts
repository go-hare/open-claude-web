import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  OFFICIAL_PERF_REGION_TRANSCRIPT,
  officialTranscriptPerfKind,
  officialTranscriptRowPerf,
} from "./officialTranscriptPerf";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official shared-0 ns/He + _s/be (cd5a Gat)", () => {
  it("locks region transcript and VR kinds", () => {
    expect(OFFICIAL_PERF_REGION_TRANSCRIPT).toEqual({ "data-perf-region": "transcript" });
    expect(officialTranscriptPerfKind("user")).toBe("human");
    expect(officialTranscriptPerfKind("assistant")).toBe("assistant");
    expect(officialTranscriptPerfKind("loader")).toBe("marker");
    expect(officialTranscriptRowPerf("assistant", 0, true)).toEqual({
      "data-perf-row": "assistant",
      "data-perf-row-from-tail": "0",
      "data-perf-row-streaming": "true",
    });
    expect(officialTranscriptRowPerf("user", 12, false)["data-perf-row-from-tail"]).toBe("10");
  });

  it("wires be/He onto scroller and rows; queued sr-only id", () => {
    const transcript = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(transcript).toContain("OFFICIAL_PERF_REGION_TRANSCRIPT");
    expect(transcript).toContain("officialTranscriptRowPerf");
    expect(transcript).toContain('data-intl-id="QIwl3NMza9"');
    expect(transcript).toContain("bottomAnchorGapPx");
    expect(transcript).not.toContain("data-transcript-arm");
  });
});
