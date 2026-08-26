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
    expect(glyphSource).toMatch(/return "Awaiting input"/);
    expect(glyphSource).toMatch(/return "Running"/);
    expect(glyphSource).toMatch(/return "Ready"/);
    expect(glyphSource).toMatch(/return "Idle"/);
    expect(glyphSource).toMatch(/return "已归档"/);
    expect(glyphSource).toMatch(/open: "Pull request open"/);
    expect(glyphSource).toMatch(/draft: "Draft pull request"/);
  });

  it("live role is awaiting/running/ready (gje e !== idle)", () => {
    expect(glyphSource).toMatch(
      /const live = state === "awaiting" \|\| state === "running" \|\| state === "ready"/,
    );
  });
});
