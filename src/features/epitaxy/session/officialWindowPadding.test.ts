import { describe, expect, it } from "vitest";
import { officialWindowPadding } from "./officialWindowPadding";

describe("official w9 padding (cd5a31703)", () => {
  it("local Code empty inputs are 48/48", () => {
    expect(officialWindowPadding()).toEqual({ paddingBottom: 48, paddingTop: 48 });
  });

  it("compact / lead / hasOlder / overlay / extraRoom match w9", () => {
    expect(officialWindowPadding({ compact: true })).toEqual({ paddingBottom: 16, paddingTop: 8 });
    expect(officialWindowPadding({ firstRowKind: "lead" })).toEqual({ paddingBottom: 48, paddingTop: 31 });
    expect(officialWindowPadding({ hasOlder: true })).toEqual({ paddingBottom: 48, paddingTop: 88 });
    expect(officialWindowPadding({
      extraRoomPx: 12,
      footReservePx: 4,
      overlayPx: 20,
    })).toEqual({ paddingBottom: 84, paddingTop: 48 });
  });
});
