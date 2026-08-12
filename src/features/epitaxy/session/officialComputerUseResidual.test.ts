import { describe, expect, it } from "vitest";
import {
  buildOfficialComputerUseGrantsPayload,
  isOfficialComputerRequestAccessTool,
  isOfficialComputerTeachAccessTool,
  isOfficialComputerUseWkTool,
  officialComputerAccessAgeKind,
  officialComputerUseSentinelKind,
  officialComputerUseWkTitle,
  parseOfficialComputerUseInput,
} from "./officialComputerUseModel";

describe("official Computer Use residual (yk/wk / fo/Age / mo/Vge)", () => {
  it("matches tool names", () => {
    expect(isOfficialComputerRequestAccessTool("computer:request_access")).toBe(true);
    expect(isOfficialComputerTeachAccessTool("computer:request_teach_access")).toBe(true);
    expect(isOfficialComputerRequestAccessTool("Bash")).toBe(false);
  });

  it("yk is true only when not featureDisabled and no tccState", () => {
    expect(isOfficialComputerUseWkTool("computer:request_access", { apps: [] })).toBe(true);
    expect(isOfficialComputerUseWkTool("computer:request_access", { featureDisabled: true })).toBe(false);
    expect(isOfficialComputerUseWkTool("computer:request_access", { tccState: { accessibility: "denied" } })).toBe(false);
    expect(isOfficialComputerUseWkTool("computer:request_teach_access", {})).toBe(false);
  });

  it("Age kind mirrors featureDisabled / tcc / apps", () => {
    expect(officialComputerAccessAgeKind({ featureDisabled: true })).toBe("computer-enable");
    expect(officialComputerAccessAgeKind({ tccState: {} })).toBe("computer-tcc");
    expect(officialComputerAccessAgeKind({ apps: [] })).toBe("computer-access");
  });

  it("parses apps + flags and builds _cuGrants like wk", () => {
    const input = {
      apps: [
        {
          alreadyGranted: false,
          isSentinel: true,
          proposedTier: "click",
          requestedName: "Terminal",
          resolved: {
            bundleId: "com.apple.Terminal",
            displayName: "Terminal",
          },
        },
        {
          alreadyGranted: false,
          requestedName: "MissingApp",
        },
      ],
      requestedFlags: { clipboardRead: true, clipboardWrite: false, systemKeyCombos: true },
      reason: "need desktop control",
    };
    const parsed = parseOfficialComputerUseInput(input);
    expect(parsed.apps).toHaveLength(2);
    expect(parsed.apps[0].proposedTier).toBe("click");
    expect(parsed.requestedFlags.clipboardRead).toBe(true);
    expect(parsed.reason).toBe("need desktop control");
    expect(officialComputerUseSentinelKind("com.apple.Terminal")).toBe("shell");

    const payload = buildOfficialComputerUseGrantsPayload(input, parsed);
    const grants = payload._cuGrants as {
      denied: Array<{ bundleId: string }>;
      flags: { clipboardRead: boolean; systemKeyCombos: boolean };
      granted: Array<{ bundleId: string; tier: string }>;
    };
    expect(grants.granted).toEqual([
      expect.objectContaining({ bundleId: "com.apple.Terminal", tier: "click" }),
    ]);
    expect(grants.denied).toEqual([{ bundleId: "MissingApp", reason: "not_installed" }]);
    expect(grants.flags.clipboardRead).toBe(true);
    expect(grants.flags.systemKeyCombos).toBe(true);
  });

  it("Mk title residual", () => {
    const one = parseOfficialComputerUseInput({
      apps: [{ requestedName: "Finder", resolved: { bundleId: "com.apple.finder", displayName: "Finder" } }],
    }).apps;
    expect(officialComputerUseWkTitle(one, false)).toEqual({ kind: "single", app: "Finder" });
    expect(officialComputerUseWkTitle(one, true).kind).toBe("capabilities");
    expect(officialComputerUseWkTitle([], false).kind).toBe("computer");
  });
});
