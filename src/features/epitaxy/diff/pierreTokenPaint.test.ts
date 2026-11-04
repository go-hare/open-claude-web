import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  installPierreFileSafety,
  isPierreLineMissingError,
  padPierreHighlightCode,
  pierreHighlightedResultFitsFile,
} from "./pierreTokenPaint";

const source = readFileSync(path.join(path.dirname(fileURLToPath(import.meta.url)), "pierreTokenPaint.ts"), "utf8");

describe("pierreHighlightedResultFitsFile", () => {
  it("rejects worker code[] shorter than splitFileContents lines", () => {
    expect(pierreHighlightedResultFitsFile({
      file: { contents: "a\nb\nc\n" },
      result: { code: [{}, {}] },
    })).toBe(false);
  });

  it("accepts worker code[] that covers the last iterated line", () => {
    expect(pierreHighlightedResultFitsFile({
      file: { contents: "a\nb\n" },
      result: { code: [{}, {}] },
    })).toBe(true);
  });

  it("skips the check when result has no code array", () => {
    expect(pierreHighlightedResultFitsFile({
      file: { contents: "a\nb\nc\n" },
      result: { tokens: [] },
    })).toBe(true);
  });

  it("pads worker code[] so processFileResult does not throw", () => {
    const result = { code: [{}] };
    expect(padPierreHighlightCode({ contents: "a\nb\nc\n" }, result)).toBe(true);
    expect(result.code).toHaveLength(3);
    expect(pierreHighlightedResultFitsFile({
      file: { contents: "a\nb\nc\n" },
      result,
    })).toBe(true);
  });

  it("pads to getLineCount when that is longer than split contents", () => {
    const result = { code: [{}] };
    expect(padPierreHighlightCode({ contents: "a\n" }, result, 5)).toBe(true);
    expect(result.code).toHaveLength(5);
  });

  it("fills sparse holes so ion null==r does not throw", () => {
    const result: { code: unknown[] } = { code: [] };
    result.code[2] = { keep: true };
    expect(padPierreHighlightCode({ contents: "a\nb\nc\n" }, result)).toBe(true);
    expect(result.code[0]).toBeTruthy();
    expect(result.code[1]).toBeTruthy();
    expect(result.code[2]).toEqual({ keep: true });
  });
});

describe("isPierreLineMissingError", () => {
  it("matches official FileRenderer throw copy", () => {
    expect(isPierreLineMissingError(new Error("FileRenderer.processFileResult: Line doesnt exist"))).toBe(true);
    expect(isPierreLineMissingError(new Error("boom"))).toBe(false);
  });
});

describe("installPierreFileSafety File.render catch", () => {
  it("locks ion c64baa838 applyErrorToDOM on Line doesnt exist (pad stays)", () => {
    expect(source).toMatch(/padPierreHighlightCode\(file, result/);
    expect(source).toMatch(/typeof this\.applyErrorToDOM === "function"/);
    expect(source).toMatch(/this\.applyErrorToDOM\(caught,/);
  });

  it("calls applyErrorToDOM when File.render still throws Line doesnt exist", () => {
    const applied: unknown[] = [];
    class Host {
      fileContainer = { tag: "host" };
      applyErrorToDOM(error: Error, container: unknown) {
        applied.push({ message: error.message, container });
      }
      render(_props: unknown) {
        throw new Error("FileRenderer.processFileResult: Line doesnt exist");
      }
    }
    installPierreFileSafety(Host);
    const instance = new Host();
    const fileContainer = { tag: "arg" };
    expect(instance.render({ fileContainer })).toBe(true);
    expect(applied).toEqual([
      {
        message: "FileRenderer.processFileResult: Line doesnt exist",
        container: fileContainer,
      },
    ]);
  });
});
