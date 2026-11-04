import { describe, expect, it } from "vitest";
import { officialEvEmptyBody, officialEvShowsLine } from "./officialEvEmptyBody";
import type { TranscriptToolUse } from "./officialTranscriptParse";

function tool(name: string, output: string, extra: Partial<TranscriptToolUse> = {}): TranscriptToolUse {
  return {
    id: "t1",
    input: {},
    name,
    output,
    status: "completed",
    ...extra,
  };
}

describe("cb6930 ll Ev empty-body catalog", () => {
  it("hides completed Clicked. computer-use click when shortToolBodies", () => {
    expect(officialEvEmptyBody(tool("mcp__computer-use__left_click", "Clicked."), true, true)).toBe(true);
  });

  it("does not hide when verbose shortToolBodies is off", () => {
    expect(officialEvEmptyBody(tool("mcp__computer-use__left_click", "Clicked."), true, false)).toBe(false);
  });

  it("does not hide running or error tools", () => {
    expect(officialEvEmptyBody(tool("mcp__computer-use__left_click", "Clicked.", { status: "running" }), true, true)).toBe(false);
    expect(officialEvEmptyBody(tool("mcp__computer-use__left_click", "Clicked.", { isError: true }), true, true)).toBe(false);
  });

  it("does not hide when grouped with output images", () => {
    expect(
      officialEvEmptyBody(
        tool("mcp__computer-use__left_click", "Clicked.", { outputImages: [{ data: "abc" }] }),
        false,
        true,
      ),
    ).toBe(false);
  });

  it("hides empty zoom says", () => {
    expect(officialEvEmptyBody(tool("mcp__computer-use__zoom", ""), true, true)).toBe(true);
  });
});

describe("cb6930 sl Ev shows-line", () => {
  it("returns input.text for type when output matches says", () => {
    expect(
      officialEvShowsLine(
        tool("mcp__computer-use__type", "Typed 3 char(s).", { input: { text: "hi" } }),
        true,
      ),
    ).toBe("hi");
  });

  it("returns ofResult JSON text for read_clipboard", () => {
    expect(
      officialEvShowsLine(
        tool("mcp__computer-use__read_clipboard", '{"text":"clip"}'),
        true,
      ),
    ).toBe("clip");
  });

  it("returns undefined when shortToolBodies is off", () => {
    expect(
      officialEvShowsLine(
        tool("mcp__computer-use__type", "Typed 3 char(s).", { input: { text: "hi" } }),
        false,
      ),
    ).toBeUndefined();
  });
});
