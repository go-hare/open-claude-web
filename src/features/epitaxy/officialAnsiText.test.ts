import { describe, expect, it } from "vitest";
import { officialAnsiStyleToCss, officialParseAnsiText, officialShellOutputSegments } from "./officialAnsiText";

describe("official shell output ANSI (c966e2bd9 / c7146e7f4 F)", () => {
  it("drops CSI erase sequences and keeps the command text", () => {
    const raw = "\u001b[28X\u001b[42X./bin/server.exe\r\n'.' 不是内部或外部命令\u001b[K";
    const segments = officialShellOutputSegments(raw, "./bin/server.exe");
    const text = segments?.map((segment) => segment.text).join("") ?? "";
    expect(text).toBe("./bin/server.exe\r\n'.' 不是内部或外部命令");
    expect(text).not.toContain("[28X");
    expect(text).not.toContain("[K");
  });

  it("paints SGR color and resets", () => {
    const segments = officialParseAnsiText("\u001b[31mred\u001b[0m plain");
    expect(segments.map((segment) => segment.text)).toEqual(["red", " plain"]);
    expect(officialAnsiStyleToCss(segments[0]!.style)?.color).toBe("#c82829");
    expect(officialAnsiStyleToCss(segments[1]!.style)).toBeUndefined();
  });

  it("leaves plain text unsegmented", () => {
    expect(officialShellOutputSegments("echo hi", "echo hi")).toBeNull();
  });
});
