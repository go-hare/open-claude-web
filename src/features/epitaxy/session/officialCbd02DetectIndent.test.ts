import { describe, expect, it } from "vitest";
import { officialCbd02DetectIndent, officialParseGoToLine } from "./OfficialEpitaxyCodeMirrorFile";

describe("cbd02 Ft detectIndentation / so go-to-line", () => {
  it("detects two-space indent from first indented lines", () => {
    expect(officialCbd02DetectIndent("function x() {\n  return 1;\n    return 2;\n}\n")).toBe("  ");
  });

  it("detects tabs when they outnumber spaces", () => {
    expect(officialCbd02DetectIndent("fn() {\n\treturn 1;\n\treturn 2;\n}\n")).toBe("\t");
  });

  it("falls back to two spaces when nothing is indented", () => {
    expect(officialCbd02DetectIndent("a\nb\n")).toBe("  ");
  });

  it("parses so Go to line as line or line:column", () => {
    expect(officialParseGoToLine("12")).toEqual({ line: 12, column: undefined });
    expect(officialParseGoToLine("12:4")).toEqual({ line: 12, column: 4 });
    expect(officialParseGoToLine("nope")).toBeNull();
  });
});
