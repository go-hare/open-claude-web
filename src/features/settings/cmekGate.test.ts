import { describe, expect, it } from "vitest";
import { hasCmekLockFromBootstrap, orgHasCmekTaint } from "./cmekGate";

describe("cmekGate (official LBt residual)", () => {
  it("orgHasCmekTaint detects taint:cmek", () => {
    expect(orgHasCmekTaint(["chat", "taint:cmek"])).toBe(true);
    expect(orgHasCmekTaint(["chat"])).toBe(false);
    expect(orgHasCmekTaint(undefined)).toBe(false);
  });

  it("hasCmekLockFromBootstrap scans memberships", () => {
    expect(
      hasCmekLockFromBootstrap({
        account: {
          memberships: [
            { organization: { capabilities: ["chat"] } },
            { organization: { capabilities: ["taint:cmek"] } },
          ],
        },
      }),
    ).toBe(true);

    expect(
      hasCmekLockFromBootstrap({
        account: {
          memberships: [{ organization: { capabilities: ["chat"] } }],
        },
      }),
    ).toBe(false);
  });

  it("falls back to current org capabilities", () => {
    expect(hasCmekLockFromBootstrap(null, ["taint:cmek"])).toBe(true);
    expect(hasCmekLockFromBootstrap({}, ["chat"])).toBe(false);
  });
});
