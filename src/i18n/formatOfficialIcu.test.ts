import { describe, expect, it } from "vitest";
import { formatOfficialIcu } from "./formatOfficialIcu";

describe("formatOfficialIcu (Ayx9qWb2Pk / hZaDU7GBba)", () => {
  it("formats Ayx9qWb2Pk one/other", () => {
    const message = "{count, plural, one {Claude Code notice} other {# Claude Code notices}}";
    expect(formatOfficialIcu(message, { count: 1 })).toBe("Claude Code notice");
    expect(formatOfficialIcu(message, { count: 3 })).toBe("3 Claude Code notices");
  });

  it("formats nested hZaDU7GBba others plural + site", () => {
    const message =
      "You imported cookies for {site} and {others, plural, one {# other site} other {# other sites}}. Use them here too, so your sites open signed in.";
    expect(formatOfficialIcu(message, { site: "github.com", others: 1 })).toBe(
      "You imported cookies for github.com and 1 other site. Use them here too, so your sites open signed in.",
    );
    expect(formatOfficialIcu(message, { site: "github.com", others: 4 })).toBe(
      "You imported cookies for github.com and 4 other sites. Use them here too, so your sites open signed in.",
    );
  });

  it("formats {count, number} (ca80 jynzjTeqld)", () => {
    const message = "Copied {count, number} of {total, plural, one {# file} other {# files}}.";
    expect(formatOfficialIcu(message, { count: 2, total: 5 })).toBe("Copied 2 of 5 files.");
  });
});
