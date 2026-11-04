import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { officialWindowOverscanPx } from "./officialWindowEngine";
import { officialWindowPadding } from "./officialWindowPadding";

const here = path.dirname(fileURLToPath(import.meta.url));

function readSrc(name: string) {
  return readFileSync(path.join(here, name), "utf8");
}

describe("official cwe / Tw older pager (cd5a31703)", () => {
  it("locks iwe 1200, awe 40, owe/swe helpers", () => {
    const pager = readSrc("officialOlderPager.ts");
    expect(pager).toContain("OFFICIAL_OLDER_NEAR_TOP_PX = 1200");
    expect(pager).toContain("OFFICIAL_OLDER_STATUS_PX = 40");
    expect(pager).toContain("node.scrollHeight - node.clientHeight < OFFICIAL_OLDER_NEAR_TOP_PX");
    expect(pager).toContain("maxScroll > 1 && maxScroll < OFFICIAL_OLDER_NEAR_TOP_PX");
    expect(pager).toContain("loadedCount < 10");
    expect(pager).toContain("scrollTop >= OFFICIAL_OLDER_NEAR_TOP_PX");
  });

  it("w9 hasOlder adds awe 40; $7 stays default-off", () => {
    expect(officialWindowPadding({ hasOlder: true })).toEqual({ paddingBottom: 48, paddingTop: 88 });
    expect(officialWindowOverscanPx()).toBe(600);
    expect(officialWindowOverscanPx(false)).toBe(600);
    expect(officialWindowOverscanPx(true)).toBe(Number.POSITIVE_INFINITY);
  });

  it("wires cwe/Tw into Fu/Transcript without silhouette / $7 / arm / fade / telemetry / seat oce", () => {
    const pager = readSrc("officialOlderPager.ts");
    const chrome = readSrc("OfficialOlderStatusChrome.tsx");
    const fu = readSrc("officialTranscriptFu.ts");
    const transcript = readSrc("OfficialTranscript.tsx");
    const engine = readSrc("officialWindowEngine.ts");
    const store = readSrc("officialCodeSessionStore.ts");
    expect(pager).toContain('trigger === "retry"');
    expect(pager).toContain("auto-drain");
    expect(pager).toContain("fetchEarlierTranscript");
    expect(pager).toContain("prependOlderMessages");
    expect(pager).not.toMatch(/from "\.\/OfficialGapSilhouettes"/);
    expect(pager).not.toMatch(/\bLnt\(/);
    expect(pager).not.toMatch(/\bblankLoadingColumn\(/);
    expect(chrome).toContain("data-transcript-not-rows");
    expect(chrome).toContain("2O0qJ9zfDJ");
    expect(chrome).toContain("62nsdyMyIO");
    expect(chrome).toContain("gjBiyjshwX");
    expect(chrome).toContain('variant="ghost"');
    expect(chrome).toContain('size="small"');
    expect(chrome).toContain("OfficialSpinner");
    expect(chrome).toContain("IntersectionObserver");
    expect(fu).toContain("useOfficialOlderPager");
    expect(fu).toContain("officialWindowPadding({ bottomAnchorGapPx: gapPx, hasOlder })");
    expect(fu).toContain("officialWindowOverscanPx()");
    expect(fu).not.toMatch(/keepAllRowsMounted:\s*true/);
    expect(fu).not.toMatch(/overscanTop:\s*Infinity/);
    expect(fu).not.toMatch(/\.trackScroller\(/);
    expect(fu).not.toMatch(/onAnchorCompensation:/);
    expect(transcript).toContain("OfficialOlderStatusChrome");
    expect(transcript).toContain("useOfficialCodeSessionHasOlder");
    expect(transcript).toContain("transcript-end-sentinel");
    expect(transcript).not.toContain("scroll-fade-strip-top");
    expect(transcript).not.toContain("data-transcript-arm");
    expect(transcript).not.toContain("GapSilhouettes");
    expect(engine).toContain("OFFICIAL_WINDOW_KEEP_ALL_ROWS_MOUNTED = false");
    expect(engine).toContain("OFFICIAL_WINDOW_OVERSCAN_PX = 600");
    expect(store).toContain("export function useOfficialCodeSessionHasOlder");
  });
});
