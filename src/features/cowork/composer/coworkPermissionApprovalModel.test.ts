import { describe, expect, it } from "vitest";
import {
  coworkComputerAccessApprovalKind,
  coworkPermissionApprovalKindFromRequest,
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

  it("teach tool stays computer-teach", () => {
    expect(
      coworkPermissionApprovalKindFromRequest({
        toolName: "computer:request_teach_access",
        input: {},
      }),
    ).toBe("computer-teach");
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
