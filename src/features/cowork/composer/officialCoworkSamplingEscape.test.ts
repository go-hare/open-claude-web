import { describe, expect, it } from "vitest";
import { shouldOfficialCoworkSamplingEscapeStop } from "./officialCoworkSamplingEscape";

describe("official Oyt sampling Escape", () => {
  it("stops on Escape while sampling", () => {
    expect(shouldOfficialCoworkSamplingEscapeStop("Escape", false)).toBe(true);
  });

  it("does not stop while stopping (official isLoading)", () => {
    expect(shouldOfficialCoworkSamplingEscapeStop("Escape", true)).toBe(false);
  });

  it("ignores other keys", () => {
    expect(shouldOfficialCoworkSamplingEscapeStop("Enter", false)).toBe(false);
    expect(shouldOfficialCoworkSamplingEscapeStop("Escape", false)).toBe(true);
  });
});
