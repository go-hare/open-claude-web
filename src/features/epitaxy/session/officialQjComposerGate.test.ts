import { describe, expect, it } from "vitest";
import {
  residualGaFromMessageLimits,
  residualOs,
  residualQjDisabled,
  residualQjSubmitDisabled,
} from "./officialQjComposerGate";

describe("residualOs", () => {
  it("active when session meta exists (F)", () => {
    expect(residualOs({ hasSessionMeta: true, createPending: true, createInFlightCount: 0 })).toBe("active");
  });

  it("spawning when createPending and Ns===0", () => {
    expect(residualOs({ hasSessionMeta: false, createPending: true, createInFlightCount: 0 })).toBe("spawning");
  });

  it("draft when no meta and not createPending", () => {
    expect(residualOs({ hasSessionMeta: false, createPending: false, createInFlightCount: 0 })).toBe("draft");
  });

  it("draft when createPending but Ns>0 (mutate in flight)", () => {
    expect(residualOs({ hasSessionMeta: false, createPending: true, createInFlightCount: 1 })).toBe("draft");
  });
});

describe("residualQjDisabled", () => {
  const base = {
    os: "active" as const,
    isMetaPending: false,
    createInFlightCount: 0,
    rateLimitExceeded: false,
    isRemoteUploading: false,
  };

  it("false on clean active session", () => {
    expect(residualQjDisabled(base)).toBe(false);
  });

  it("true when spawning", () => {
    expect(residualQjDisabled({ ...base, os: "spawning" })).toBe(true);
  });

  it("true when J isMetaPending", () => {
    expect(residualQjDisabled({ ...base, isMetaPending: true })).toBe(true);
  });

  it("true when Ns>0", () => {
    expect(residualQjDisabled({ ...base, createInFlightCount: 2 })).toBe(true);
  });

  it("true when Ga rateLimitExceeded", () => {
    expect(residualQjDisabled({ ...base, rateLimitExceeded: true })).toBe(true);
  });

  it("true when xn isRemoteUploading", () => {
    expect(residualQjDisabled({ ...base, isRemoteUploading: true })).toBe(true);
  });
});

describe("residualQjSubmitDisabled", () => {
  it("true for isProcessingImages (cn)", () => {
    expect(residualQjSubmitDisabled({
      isProcessingImages: true,
      isRemoteUploading: false,
      gitRequiredBlocksSubmit: false,
    })).toBe(true);
  });

  it("true for bi gitRequiredBlocksSubmit", () => {
    expect(residualQjSubmitDisabled({
      isProcessingImages: false,
      isRemoteUploading: false,
      gitRequiredBlocksSubmit: true,
    })).toBe(true);
  });

  it("true for mn.isUploading", () => {
    expect(residualQjSubmitDisabled({
      isProcessingImages: false,
      isRemoteUploading: true,
      gitRequiredBlocksSubmit: false,
    })).toBe(true);
  });

  it("false when all clear", () => {
    expect(residualQjSubmitDisabled({
      isProcessingImages: false,
      isRemoteUploading: false,
      gitRequiredBlocksSubmit: false,
    })).toBe(false);
  });
});

describe("residualGaFromMessageLimits", () => {
  it("true when any org exceeded_limit", () => {
    expect(residualGaFromMessageLimits({
      a: { type: "within_limit" },
      b: { type: "exceeded_limit" },
    })).toBe(true);
  });

  it("false for approaching / within only", () => {
    expect(residualGaFromMessageLimits({
      a: { type: "approaching_limit" },
      b: { type: "within_limit" },
    })).toBe(false);
  });

  it("true when overageStatus exceeded (overageExceededWarning)", () => {
    expect(residualGaFromMessageLimits({
      a: { type: "approaching_limit", overageStatus: "exceeded_limit" },
    })).toBe(true);
  });
});
