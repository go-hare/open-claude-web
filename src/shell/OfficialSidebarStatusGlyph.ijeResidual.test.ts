import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const glyphSource = readFileSync(path.join(here, "OfficialSidebarStatusGlyph.tsx"), "utf8");

describe("OfficialSidebarStatusGlyph ije residual (belz ije / lje / oje)", () => {
  it("wraps glyph in OfficialTooltip delay 500 / sideOffset 4, not PreviewCard", () => {
    expect(glyphSource).toMatch(/<OfficialTooltip delayDuration=\{500\} sideOffset=\{4\} tooltipContent=\{label\}>/);
    expect(glyphSource).toMatch(/<span className="flex shrink-0" role=\{live \? "status" : "img"\} aria-label=\{label\}>/);
    expect(glyphSource).not.toMatch(/PreviewCard/);
  });

  it("lje / archived / oje labels match official catalog", () => {
    expect(glyphSource).toMatch(/id: "tM90hqjWj0"/);
    expect(glyphSource).toMatch(/id: "nDyaq\/M7Oj"/);
    expect(glyphSource).toMatch(/id: "IZFEUgrg25"/);
    expect(glyphSource).toMatch(/id: "sNY4nxDm3U"/);
    expect(glyphSource).toMatch(/id: "0HT\+IbyW6O"/);
    expect(glyphSource).toMatch(/open: "Pull request open"/);
    expect(glyphSource).toMatch(/draft: "Draft pull request"/);
  });

  it("live role is awaiting/running/ready (gje e !== idle)", () => {
    expect(glyphSource).toMatch(
      /const live = state === "awaiting" \|\| state === "running" \|\| state === "ready"/,
    );
  });

  it("Code idle is official vje pje ring, not gje uje hs", () => {
    expect(glyphSource).toContain("block size-[6px] border border-text-400 opacity-50 rounded-full");
    expect(glyphSource).not.toContain('name="hs"');
  });
});
