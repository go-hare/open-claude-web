import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  OFFICIAL_WINDOW_KEEP_ALL_OVERSCAN_PX,
  OFFICIAL_WINDOW_KEEP_ALL_ROWS_MOUNTED,
  OFFICIAL_WINDOW_OVERSCAN_PX,
  OFFICIAL_WINDOW_ROW_STYLE,
  OFFICIAL_WINDOW_SCROLLER_CLASS,
  officialSeedWindowDocument,
  officialWindowOr,
  officialWindowOverscanPx,
  officialWindowReleaseGate,
} from "./officialWindowEngine";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official wse/cr window engine (c4a9ee384)", () => {
  it("locks Q7 600px overscan, J7 flow-root, Gat scroller class", () => {
    expect(OFFICIAL_WINDOW_OVERSCAN_PX).toBe(600);
    expect(OFFICIAL_WINDOW_KEEP_ALL_ROWS_MOUNTED).toBe(false);
    expect(OFFICIAL_WINDOW_KEEP_ALL_OVERSCAN_PX).toBe(Number.POSITIVE_INFINITY);
    expect(officialWindowOverscanPx()).toBe(600);
    expect(OFFICIAL_WINDOW_ROW_STYLE).toEqual({ display: "flow-root", position: "relative" });
    expect(OFFICIAL_WINDOW_SCROLLER_CLASS).toContain("[overflow-anchor:none]");
    expect(OFFICIAL_WINDOW_SCROLLER_CLASS).toContain("[contain:strict]");
  });

  it("or / sr / Ar gate match ion helpers", () => {
    expect(officialWindowOr(12, 0)).toBe(12);
    expect(officialWindowOr(-1, 7)).toBe(7);
    expect(officialWindowOr(undefined, 3)).toBe(3);
    const seeded = officialSeedWindowDocument({
      initialWindow: {
        bottomInset: 0,
        overscanBottom: 600,
        overscanTop: 0,
        release: { afterPresentedFrames: 2, gate: officialWindowReleaseGate },
      },
    }, 0);
    expect(seeded.mountPhase).toBe(true);
    expect(seeded.initialWindow?.overscanTop).toBe(0);
    expect(seeded.initialWindow?.overscanBottom).toBe(600);
    expect(seeded.initialWindow?.releaseFrames).toBe(2);
    expect(seeded.initialWindow?.widenOnIntent).toBe(false);
    expect(seeded.settlePending).toBe(false);
    let ran = false;
    officialWindowReleaseGate(() => {
      ran = true;
    });
    expect(ran).toBe(true);
  });

  it("does not invent holdPlace, resizeItem loop, or restoreKey", () => {
    const engine = readFileSync(path.join(here, "officialWindowEngine.ts"), "utf8");
    const fu = readFileSync(path.join(here, "officialTranscriptFu.ts"), "utf8");
    const transcript = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(engine).toContain("c4a9ee384-CDM_HJvg.js");
    expect(engine).toContain("function cr(e)");
    expect(fu).toContain("holdPlaceOnWidthChange: undefined");
    expect(fu).not.toMatch(/restoreKey:/);
    expect(transcript).not.toContain("useVirtualizer");
    expect(transcript).not.toContain("officialFuResizeMountedRows");
    expect(transcript).toContain("data-rocksteady-sizer");
    expect(transcript).toContain("data-rs-index");
    expect(fu).toContain("keepMountedRef: keepMounted.keepMountedRef");
    expect(fu).toContain("officialWindowPadding");
    expect(fu).toContain("officialClassifyKeyScroll");
    expect(fu).toContain("attachSizerHold");
    expect(fu).not.toMatch(/\.trackScroller\(/);
    expect(fu).not.toMatch(/onAnchorCompensation:/);
    expect(fu).toContain("useOfficialOlderPager");
    expect(transcript).toContain("SCYmnElliz");
    expect(transcript).toContain("aria-label={feedText.chatMessages}");
    expect(transcript).toContain("OfficialOlderStatusChrome");
    expect(transcript).toContain("transcript-end-sentinel");
    expect(transcript).toContain("useOfficialTranscriptScrollState");
    expect(transcript).not.toContain("distanceFromBottom");
    expect(transcript).not.toContain("scroll-fade-strip-top");
    expect(transcript).not.toContain("data-transcript-arm");
  });
});

