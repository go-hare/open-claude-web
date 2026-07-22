import { describe, expect, it } from "vitest";
import {
  notificationRowGatesFromBootstrap,
  readBootstrapFeatureFlag,
} from "./notificationRowGates";

describe("readBootstrapFeatureFlag", () => {
  it("reads feature_flags booleans", () => {
    expect(
      readBootstrapFeatureFlag({ feature_flags: { bad_moon_rising: true } }, "bad_moon_rising"),
    ).toBe(true);
    expect(
      readBootstrapFeatureFlag({ feature_flags: { bad_moon_rising: false } }, "bad_moon_rising"),
    ).toBe(false);
  });

  it("reads growthbook features defaultValue", () => {
    expect(
      readBootstrapFeatureFlag(
        { growthbook: { features: { ccr_client_presence_enabled: { defaultValue: true } } } },
        "ccr_client_presence_enabled",
      ),
    ).toBe(true);
  });

  it("returns undefined when absent", () => {
    expect(readBootstrapFeatureFlag({}, "bad_moon_rising")).toBeUndefined();
    expect(readBootstrapFeatureFlag(null, "bad_moon_rising")).toBeUndefined();
  });
});

describe("notificationRowGatesFromBootstrap", () => {
  it("shows all rows when flags and code caps are absent (3P residual)", () => {
    const gates = notificationRowGatesFromBootstrap({
      account: {
        memberships: [{ organization: { capabilities: ["chat", "claude_pro"], name: "Gateway" } }],
      },
    });
    expect(gates).toEqual({
      codeSession: true,
      codePermissionRequests: true,
      securityScanEmails: true,
      dispatchMessages: true,
    });
  });

  it("hides code session rows when bad_moon_rising is explicitly false", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: { bad_moon_rising: false },
    });
    expect(gates.codeSession).toBe(false);
    expect(gates.codePermissionRequests).toBe(false);
    expect(gates.securityScanEmails).toBe(true);
    expect(gates.dispatchMessages).toBe(true);
  });

  it("hides permission row when GBe flag is false but keeps code session", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: {
        bad_moon_rising: true,
        claude_code: true,
        ccr_code_requires_action_category_enabled: false,
      },
    });
    expect(gates.codeSession).toBe(true);
    expect(gates.codePermissionRequests).toBe(false);
  });

  it("hides security when claude_code_security flag is false", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: { claude_code_security: false },
    });
    expect(gates.securityScanEmails).toBe(false);
  });

  it("hides dispatch when ccr_client_presence_enabled is false", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: { ccr_client_presence_enabled: false },
    });
    expect(gates.dispatchMessages).toBe(false);
  });

  it("shows code session when capability includes claude_code_desktop", () => {
    const gates = notificationRowGatesFromBootstrap(null, {
      capabilities: ["chat", "claude_code_desktop"],
    });
    expect(gates.codeSession).toBe(true);
  });
});
