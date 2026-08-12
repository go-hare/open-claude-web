import { describe, expect, it } from "vitest";
import {
  coworkComputerAccessApprovalKind,
  coworkComputerTeachApprovalKind,
  coworkPermissionApprovalKindFromRequest,
  coworkWriteToolWarningFromRequest,
  visibleCoworkPermissions,
} from "./coworkPermissionApprovalModel";

describe("Age residual computer access routing", () => {
  it("featureDisabled → computer-enable (Uge)", () => {
    expect(coworkComputerAccessApprovalKind({ featureDisabled: true })).toBe(
      "computer-enable",
    );
    expect(
      coworkPermissionApprovalKindFromRequest({
        toolName: "computer:request_access",
        input: { featureDisabled: true, tccState: { accessibility: "denied" } },
      }),
    ).toBe("computer-enable");
  });

  it("tccState without featureDisabled → computer-tcc (Fge)", () => {
    expect(
      coworkComputerAccessApprovalKind({
        tccState: { accessibility: "denied", screenRecording: "granted" },
      }),
    ).toBe("computer-tcc");
  });

  it("else → computer-access (Oge)", () => {
    expect(coworkComputerAccessApprovalKind({ apps: [] })).toBe(
      "computer-access",
    );
    expect(
      coworkPermissionApprovalKindFromRequest({
        toolName: "computer:request_access",
        input: { apps: [] },
      }),
    ).toBe("computer-access");
  });

  it("teach tool without tcc stays computer-teach (Wge)", () => {
    expect(coworkComputerTeachApprovalKind({})).toBe("computer-teach");
    expect(
      coworkPermissionApprovalKindFromRequest({
        toolName: "computer:request_teach_access",
        input: {},
      }),
    ).toBe("computer-teach");
  });

  it("$ge teach with tccState → computer-tcc (Fge)", () => {
    expect(
      coworkComputerTeachApprovalKind({
        tccState: { accessibility: "denied" },
      }),
    ).toBe("computer-tcc");
    expect(
      coworkPermissionApprovalKindFromRequest({
        toolName: "computer:request_teach_access",
        input: { tccState: { accessibility: "denied" } },
      }),
    ).toBe("computer-tcc");
  });
});

describe("visibleCoworkPermissions", () => {
  it("does not hide computer:request_access", () => {
    const visible = visibleCoworkPermissions([
      {
        requestId: "r1",
        sessionId: "s1",
        toolName: "computer:request_access",
        toolUseId: "u1",
        input: { featureDisabled: true },
      },
    ]);
    expect(visible).toHaveLength(1);
    expect(visible[0]?.request.toolName).toBe("computer:request_access");
  });
});

describe("coworkWriteToolWarningFromRequest (nue residual)", () => {
  it("defaults true when readOnlyHint is absent (official !0 !== undefined)", () => {
    expect(coworkWriteToolWarningFromRequest({})).toBe(true);
    expect(coworkWriteToolWarningFromRequest({ annotations: {} })).toBe(true);
  });

  it("false when annotations.readOnlyHint === true", () => {
    expect(
      coworkWriteToolWarningFromRequest({ annotations: { readOnlyHint: true } }),
    ).toBe(false);
  });

  it("false when flattened readOnlyHint === true", () => {
    expect(coworkWriteToolWarningFromRequest({ readOnlyHint: true })).toBe(false);
  });

  it("true when readOnlyHint explicitly false", () => {
    expect(
      coworkWriteToolWarningFromRequest({ annotations: { readOnlyHint: false } }),
    ).toBe(true);
    expect(coworkWriteToolWarningFromRequest({ readOnlyHint: false })).toBe(true);
  });
});
