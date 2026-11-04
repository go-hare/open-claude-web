import { describe, expect, it } from "vitest";
import {
  officialAnchorDrt,
  officialAnchorFrt,
  officialAnchorLrt,
  officialNextAnchorGapPx,
} from "./officialAnchorGap";

describe("official prt/drt/frt (cd5a31703)", () => {
  it("drt zeros under S5, otherwise viewport minus content", () => {
    expect(officialAnchorDrt(800, 800)).toBe(0);
    expect(officialAnchorDrt(800, 799.999)).toBe(0);
    expect(officialAnchorDrt(800, 700)).toBe(100);
    expect(officialAnchorLrt(40, 40.0004)).toBe(true);
    expect(officialAnchorLrt(40, 41)).toBe(false);
  });

  it("next gap is 0 when unanchored or already scrollable at gap 0", () => {
    expect(officialNextAnchorGapPx({
      failed: false,
      gapPx: 0,
      getScrollElement: () => null,
      hasOlder: false,
      loading: false,
      totalSizePx: 200,
      viewportHeightPx: 800,
    })).toBe(0);
    expect(officialNextAnchorGapPx({
      failed: false,
      gapPx: 0,
      getScrollElement: () => ({ clientHeight: 400, scrollHeight: 900 } as HTMLElement),
      hasOlder: true,
      loading: true,
      totalSizePx: 200,
      viewportHeightPx: 800,
    })).toBe(0);
    expect(officialAnchorFrt({ clientHeight: 400, scrollHeight: 900 } as HTMLElement)).toBe(true);
  });
});
