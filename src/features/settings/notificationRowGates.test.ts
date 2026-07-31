import { describe, expect, it } from "vitest";
import {
  DEFAULT_NOTIFICATION_ROW_GATES,
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
  it("hides all gated rows when flags and code caps are absent (3P residual)", () => {
    const gates = notificationRowGatesFromBootstrap({
      account: {
        memberships: [{ organization: { capabilities: ["chat", "claude_pro"], name: "Gateway" } }],
      },
    });
    expect(gates).toEqual({
      codeSession: false,
      codePermissionRequests: false,
      securityScanEmails: false,
      dispatchMessages: false,
    });
  });

  it("matches DEFAULT_NOTIFICATION_ROW_GATES for empty bootstrap", () => {
    expect(notificationRowGatesFromBootstrap(null)).toEqual(DEFAULT_NOTIFICATION_ROW_GATES);
    expect(notificationRowGatesFromBootstrap({})).toEqual(DEFAULT_NOTIFICATION_ROW_GATES);
  });

  it("hides code session rows when bad_moon_rising is explicitly false", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: {
        bad_moon_rising: false,
        claude_code: true,
        ccr_code_requires_action_category_enabled: true,
      },
    });
    expect(gates.codeSession).toBe(false);
    expect(gates.codePermissionRequests).toBe(false);
  });

  it("shows code session + permission only when aA and GBe are true", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: {
        bad_moon_rising: true,
        claude_code: true,
        ccr_code_requires_action_category_enabled: true,
      },
    });
    expect(gates.codeSession).toBe(true);
    expect(gates.codePermissionRequests).toBe(true);
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

  it("hides permission when GBe is missing even if aA is true", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: {
        bad_moon_rising: true,
        claude_code: true,
      },
    });
    expect(gates.codeSession).toBe(true);
    expect(gates.codePermissionRequests).toBe(false);
  });

  it("hides security when claude_code_security flag is false or missing", () => {
    expect(
      notificationRowGatesFromBootstrap({
        feature_flags: { claude_code_security: false },
      }).securityScanEmails,
    ).toBe(false);
    expect(notificationRowGatesFromBootstrap({}).securityScanEmails).toBe(false);
  });

  it("shows security when capability includes claude_code_security", () => {
    const gates = notificationRowGatesFromBootstrap(null, {
      capabilities: ["claude_code_security"],
    });
    expect(gates.securityScanEmails).toBe(true);
  });

  it("hides dispatch when ccr_client_presence_enabled is false or missing", () => {
    expect(
      notificationRowGatesFromBootstrap({
        feature_flags: { ccr_client_presence_enabled: false },
      }).dispatchMessages,
    ).toBe(false);
    expect(notificationRowGatesFromBootstrap({}).dispatchMessages).toBe(false);
  });

  it("shows dispatch only when ccr_client_presence_enabled is true", () => {
    const gates = notificationRowGatesFromBootstrap({
      feature_flags: { ccr_client_presence_enabled: true },
    });
    expect(gates.dispatchMessages).toBe(true);
  });

  it("shows code session when capability includes claude_code_desktop and bad_moon is on", () => {
    const gates = notificationRowGatesFromBootstrap(
      { feature_flags: { bad_moon_rising: true } },
      { capabilities: ["chat", "claude_code_desktop"] },
    );
    expect(gates.codeSession).toBe(true);
  });

  it("hides code session when capability has code but bad_moon is missing", () => {
    const gates = notificationRowGatesFromBootstrap(null, {
      capabilities: ["claude_code_desktop"],
    });
    expect(gates.codeSession).toBe(false);
  });
});
