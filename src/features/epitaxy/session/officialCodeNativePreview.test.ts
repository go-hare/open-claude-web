import { describe, expect, it } from "vitest";
import { isCodeNativePreviewPath, isCodeOfficeNativePreviewPath } from "./officialCodeNativePreview";
import { officialQj, officialZjFace, officialZjFaceOf, officialZjPublish, officialZjReconcileDraw } from "./officialZjFace";

describe("c6e1 native preview + cd5a Qj/Zj", () => {
  it("matches official M / ne office + pdf/html", () => {
    expect(isCodeNativePreviewPath("a.docx")).toBe(true);
    expect(isCodeNativePreviewPath("a.xlsx")).toBe(true);
    expect(isCodeNativePreviewPath("a.pdf")).toBe(true);
    expect(isCodeNativePreviewPath("a.ts")).toBe(false);
    expect(isCodeOfficeNativePreviewPath("a.pptx")).toBe(true);
    expect(isCodeOfficeNativePreviewPath("a.pdf")).toBe(false);
  });

  it("Qj/Zj stay native without a spark face publisher", () => {
    expect(officialQj("Working…")).toBe("Working");
    expect(officialZjFace("Working")).toEqual({ kind: "native" });
    expect(officialZjFace(null)).toEqual({ kind: "native" });
    officialZjPublish("row-1", { message: null, mode: "tool-use", word: "Reading" });
    officialZjReconcileDraw();
    expect(officialZjFaceOf("row-1")).toEqual({ kind: "native" });
    officialZjPublish("row-1", null);
    officialZjReconcileDraw();
  });
});
