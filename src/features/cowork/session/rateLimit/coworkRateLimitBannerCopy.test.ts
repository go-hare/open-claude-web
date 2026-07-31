import { describe, expect, it } from "vitest";
import {
  buildCoworkRateLimitBannerModel,
  selectCoworkRateLimitActionType,
} from "./coworkRateLimitBannerCopy";
import type { CoworkMappedRateLimit } from "./coworkRateLimitMap";

const now = 1_700_000_000;

function exceededLimit(
  overrides?: Partial<CoworkMappedRateLimit>,
): CoworkMappedRateLimit {
  return {
    type: "exceeded_limit",
    resetsAt: now + 3600,
    windows: {
      "5h": { status: "exceeded_limit", resets_at: now + 3600 },
    },
    ...overrides,
  } as CoworkMappedRateLimit;
}

describe("selectCoworkRateLimitActionType", () => {
  it("maps exceeded + canReset to reset", () => {
    expect(
      selectCoworkRateLimitActionType("exceeded", { canResetRateLimits: true }),
    ).toBe("reset");
  });

  it("maps exceeded without reset to dismiss (not subscribe)", () => {
    expect(selectCoworkRateLimitActionType("exceeded", {})).toBe("dismiss");
  });

  it("maps config degraded to open-setup", () => {
    expect(
      selectCoworkRateLimitActionType("exceeded", { configDegraded: true }),
    ).toBe("open-setup");
    expect(
      selectCoworkRateLimitActionType("approaching", { configDegraded: true }),
    ).toBe("open-setup");
  });

  it("maps approaching default to none", () => {
    expect(selectCoworkRateLimitActionType("approaching", {})).toBe("none");
  });
});

describe("buildCoworkRateLimitBannerModel actions", () => {
  it("includes dismiss action on exceeded residual", () => {
    const model = buildCoworkRateLimitBannerModel(exceededLimit(), now, {});
    expect(model?.kind).toBe("exceeded");
    expect(model?.actionType).toBe("dismiss");
    expect(model?.body).toMatch(/session limit|usage limit|Resets/i);
  });

  it("includes reset action when canResetRateLimits", () => {
    const model = buildCoworkRateLimitBannerModel(exceededLimit(), now, {
      canResetRateLimits: true,
    });
    expect(model?.actionType).toBe("reset");
  });

  it("never invents subscribe action type", () => {
    const model = buildCoworkRateLimitBannerModel(exceededLimit(), now, {
      allowSelfUpgrade: true,
      canResetRateLimits: false,
    });
    expect(model?.actionType).not.toMatch(/subscribe|contact|overage|credit/i);
    expect(["none", "dismiss", "reset", "open-setup"]).toContain(model?.actionType);
  });
});
