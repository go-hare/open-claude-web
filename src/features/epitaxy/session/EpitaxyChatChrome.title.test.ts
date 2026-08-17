import { describe, expect, it } from "vitest";
import { isPlaceholderCodingTitle, officialSessionHeaderTitle } from "./officialSessionTitle";

describe("officialSessionHeaderTitle", () => {
  it("passes through pure-digit host titles (no digit remapping)", () => {
    expect(
      officialSessionHeaderTitle(
        { id: "s1", kind: "code", title: "1", updatedAtMs: 1 } as never,
        "s1",
      ),
    ).toBe("1");
  });

  it("passes through normal prompt titles", () => {
    expect(
      officialSessionHeaderTitle(
        { id: "s1", kind: "code", title: "fix login bug", updatedAtMs: 1 } as never,
        "s1",
      ),
    ).toBe("fix login bug");
  });

  it("uses official empty residual Untitled when title missing", () => {
    expect(
      officialSessionHeaderTitle(
        { id: "s1", kind: "code", title: "", updatedAtMs: 1 } as never,
        "s1",
      ),
    ).toBe("Untitled");
    expect(officialSessionHeaderTitle(null, "s1")).toBe("Untitled");
  });

  it("returns Claude Code when no session id (new shell)", () => {
    expect(officialSessionHeaderTitle(null, undefined)).toBe("Claude Code");
  });
});

describe("isPlaceholderCodingTitle", () => {
  it("does not treat pure digits as placeholder", () => {
    expect(isPlaceholderCodingTitle("1")).toBe(false);
    expect(isPlaceholderCodingTitle("42")).toBe(false);
  });

  it("flags empty and known empty-state labels only", () => {
    expect(isPlaceholderCodingTitle("")).toBe(true);
    expect(isPlaceholderCodingTitle("  ")).toBe(true);
    expect(isPlaceholderCodingTitle("New session")).toBe(true);
    expect(isPlaceholderCodingTitle("Coding session")).toBe(true);
    expect(isPlaceholderCodingTitle("General coding session")).toBe(true);
    expect(isPlaceholderCodingTitle("fix login")).toBe(false);
  });
});
