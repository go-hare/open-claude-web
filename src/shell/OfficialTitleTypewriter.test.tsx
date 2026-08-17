import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const so = readFileSync(path.join(here, "OfficialTitleTypewriter.tsx"), "utf8");
const title = readFileSync(path.join(here, "OfficialSidebarTitle.tsx"), "utf8");
const recents = readFileSync(path.join(here, "RecentsSection.tsx"), "utf8");
const pinned = readFileSync(path.join(here, "PinnedSection.tsx"), "utf8");

describe("OfficialTitleTypewriter residual So", () => {
  it("ports residual So gates: skipInitialReveal, grapheme, 30ms, blur/opacity", () => {
    expect(so).toMatch(/skipInitialReveal/);
    expect(so).toMatch(/Intl\.Segmenter/);
    expect(so).toMatch(/granularity:\s*"grapheme"/);
    expect(so).toMatch(/stepMs\s*=\s*30|useTypewriterProgress\([^,]+,\s*30/);
    expect(so).toMatch(/blur\(\$\{6 \* \(1 - eased\)\}px\)/);
    expect(so).toMatch(/opacity:\s*eased/);
    expect(so).toMatch(/className="sr-only"/);
    expect(so).toMatch(/aria-hidden="true"/);
    expect(so).toMatch(/setTimeout\(\(\)\s*=>\s*\{[\s\S]*?},\s*200\)/);
    expect(so).toMatch(/\bconst vo\b/);
    expect(so).toMatch(/\bconst bo\b/);
    expect(so).toMatch(/export function segmentTitleGraphemes/);
  });

  it("skipInitialReveal returns plain text until first change", () => {
    expect(so).toMatch(/if \(skipInitialReveal && !hasChanged\)/);
    expect(so).toMatch(/return <>\s*\{text\}\s*<\/>/);
  });
});

describe("OfficialSidebarTitle residual Ja sticky gate", () => {
  it("holds So for 1500ms after pending clears", () => {
    expect(title).toMatch(/TITLE_REVEAL_HOLD_MS/);
    expect(title).toMatch(/isOfficialSidebarTitlePending/);
    expect(title).toMatch(/OfficialTitleTypewriter/);
    expect(title).toMatch(/skipInitialReveal/);
    expect(title).toMatch(/setReveal\(true\)/);
    expect(title).toMatch(/setReveal\(false\)/);
    expect(title).toMatch(/title:\s*string/);
  });

  it("Recents + Pinned share OfficialSidebarTitle (no local static-only copy)", () => {
    expect(recents).toMatch(/from "\.\/OfficialSidebarTitle"/);
    expect(pinned).toMatch(/from "\.\/OfficialSidebarTitle"/);
    expect(recents).not.toMatch(/function OfficialSidebarTitle/);
    expect(pinned).not.toMatch(/function OfficialSidebarTitle/);
    expect(recents).toMatch(/<OfficialSidebarTitle title=\{session\.title\} \/>/);
    expect(pinned).toMatch(/<OfficialSidebarTitle title=\{session\.title\} \/>/);
  });

  it("keeps residual mask fade chrome on outer title span", () => {
    expect(title).toMatch(/mask-image:linear-gradient\(to_right/);
    expect(title).toMatch(/group-hover:\[mask-image:linear-gradient/);
  });
});
