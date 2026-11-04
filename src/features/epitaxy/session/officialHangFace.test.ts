import { describe, expect, it } from "vitest";
import {
  OFFICIAL_HANG_BUSY_BODY_MIN_MS,
  OFFICIAL_HANG_DEFAULT_MIN_MS,
  officialHangBusyLine,
  officialHangFaceKey,
} from "./officialHangFace";

describe("c734 ye / shared-frame Qk hang keys", () => {
  it("ZO key is state|label; busy line joins sorted keys", () => {
    expect(officialHangFaceKey("busy", "Reading")).toBe("busy|Reading");
    expect(officialHangFaceKey("done", null)).toBe("done|");
    expect(officialHangBusyLine(["b", "a"])).toBe("a\0b");
    expect(officialHangBusyLine([])).toBeUndefined();
    expect(OFFICIAL_HANG_DEFAULT_MIN_MS).toBe(650);
    expect(OFFICIAL_HANG_BUSY_BODY_MIN_MS).toBe(2000);
  });
});
