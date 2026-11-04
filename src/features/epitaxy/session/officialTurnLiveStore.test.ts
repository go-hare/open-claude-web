import { describe, expect, it } from "vitest";
import { officialNmMark, type OfficialTurnLiveValue } from "./officialTurnLiveStore";

const live = (over: Partial<OfficialTurnLiveValue> = {}): OfficialTurnLiveValue => ({
  liveRunningToolIds: new Set(["t1"]),
  permissionPending: false,
  sessionId: "s1",
  turnLive: true,
  ...over,
});

describe("officialNmMark parked / showsBlocked (cd5a nM / shared-11 CO)", () => {
  it("parks a marked live tool when permission is pending", () => {
    const nm = officialNmMark(
      live({ permissionPending: true }),
      { key: "t1", toolIds: ["t1"], wireRunning: true },
      false,
    );
    expect(nm.marked).toBe(true);
    expect(nm.tailHeld).toBe(false);
    expect(nm.parked).toBe(true);
    expect(nm.showsBlocked).toBe(true);
  });

  it("does not park when no permission is pending", () => {
    const nm = officialNmMark(
      live(),
      { key: "t1", toolIds: ["t1"], wireRunning: true },
      false,
    );
    expect(nm.parked).toBe(false);
    expect(nm.showsBlocked).toBe(false);
  });

  it("does not park an unmarked completed row", () => {
    const nm = officialNmMark(
      live({ permissionPending: true, turnLive: false, liveRunningToolIds: undefined }),
      undefined,
      false,
    );
    expect(nm.marked).toBe(false);
    expect(nm.parked).toBe(false);
    expect(nm.showsBlocked).toBe(false);
  });

  it("parks a tailHeld completed last tool while the turn is live", () => {
    const nm = officialNmMark(
      live({ permissionPending: true, liveRunningToolIds: undefined }),
      undefined,
      true,
    );
    expect(nm.marked).toBe(true);
    expect(nm.tailHeld).toBe(true);
    expect(nm.parked).toBe(true);
    expect(nm.showsBlocked).toBe(true);
  });
});

