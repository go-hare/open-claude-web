import { describe, expect, it } from "vitest";
import {
  resolveCoworkGenericPermissionCtaMode,
  resolveCoworkGenericPermissionPrimaryDecision,
} from "./coworkGenericPermissionCta";

describe("resolveCoworkGenericPermissionCtaMode (nue residual)", () => {
  it("write warning → this-task path", () => {
    expect(
      resolveCoworkGenericPermissionCtaMode({
        allowAlways: true,
        coworkWriteToolWarning: true,
        isScheduledTask: false,
      }),
    ).toBe("write-this-task-split");
    expect(
      resolveCoworkGenericPermissionCtaMode({
        allowAlways: false,
        coworkWriteToolWarning: true,
        isScheduledTask: false,
      }),
    ).toBe("write-this-task-solo");
  });

  it("scheduled + always → scheduled split", () => {
    expect(
      resolveCoworkGenericPermissionCtaMode({
        allowAlways: true,
        coworkWriteToolWarning: true,
        isScheduledTask: true,
      }),
    ).toBe("scheduled-always-split");
  });

  it("default always / once", () => {
    expect(
      resolveCoworkGenericPermissionCtaMode({
        allowAlways: true,
        coworkWriteToolWarning: false,
        isScheduledTask: false,
      }),
    ).toBe("always-split");
    expect(
      resolveCoworkGenericPermissionCtaMode({
        allowAlways: false,
        coworkWriteToolWarning: false,
        isScheduledTask: false,
      }),
    ).toBe("allow-once");
  });
});

describe("resolveCoworkGenericPermissionPrimaryDecision", () => {
  it("Enter on write path is once (this task)", () => {
    expect(
      resolveCoworkGenericPermissionPrimaryDecision({
        allowAlways: true,
        coworkWriteToolWarning: true,
        isScheduledTask: false,
      }),
    ).toBe("once");
  });

  it("Enter on always path is always", () => {
    expect(
      resolveCoworkGenericPermissionPrimaryDecision({
        allowAlways: true,
        coworkWriteToolWarning: false,
        isScheduledTask: false,
      }),
    ).toBe("always");
  });
});
