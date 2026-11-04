import { describe, expect, it } from "vitest";
import {
  officialCsvDelimiter,
  officialFileInvalidUtf8,
  officialFileIsEmpty,
  officialFileLooksBinary,
  officialYuPreviewKind,
} from "./officialFileYu";

describe("official Yu helpers (cd2ef Qc / ll / nu)", () => {
  it("Qc treats NUL and heavy U+FFFD as binary", () => {
    expect(officialFileLooksBinary("hello")).toBe(false);
    expect(officialFileLooksBinary("a\0b")).toBe(true);
    expect(officialFileLooksBinary(`${"�".repeat(30)}${"x".repeat(70)}`)).toBe(true);
  });

  it("ll is replacement-char plus byte-length over fileSize", () => {
    expect(officialFileInvalidUtf8("ok")).toBe(false);
    expect(officialFileInvalidUtf8("bad�")).toBe(true);
    expect(officialFileInvalidUtf8("bad�", 100)).toBe(false);
  });

  it("nu maps csv/md, null when binary", () => {
    expect(officialYuPreviewKind({ csvDelimiter: ",", isMarkdown: false, looksBinary: false })).toBe("csv");
    expect(officialYuPreviewKind({ csvDelimiter: null, isMarkdown: true, looksBinary: false })).toBe("markdown");
    expect(officialYuPreviewKind({ csvDelimiter: ",", isMarkdown: false, looksBinary: true })).toBe(null);
    expect(officialFileIsEmpty("")).toBe(true);
    expect(officialCsvDelimiter("notes.tsv")).toBe("\t");
  });
});
