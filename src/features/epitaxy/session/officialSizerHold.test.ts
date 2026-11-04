import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official w5 sizer hold (c4a9ee384 ur/dr)", () => {
  it("locks ur/dr and does not port Bat telemetry trackScroller", () => {
    const hold = readFileSync(path.join(here, "officialSizerHold.ts"), "utf8");
    const fu = readFileSync(path.join(here, "officialTranscriptFu.ts"), "utf8");
    expect(hold).toContain("heldExtentPx");
    expect(hold).toContain("minHeight");
    expect(hold).toContain("data-rocksteady-sizer");
    expect(hold).toContain("shouldHold");
    expect(fu).toContain("useOfficialTranscriptSizerHold");
    expect(fu).not.toMatch(/\.trackScroller\(/);
    expect(fu).not.toMatch(/trackBacking\(/);
  });
});
