import { describe, expect, it } from "vitest";
import {
  coworkImageBlocksToPayloads,
  filterCoworkImageFiles,
  imageFilesFromClipboardData,
  readyCoworkStagedImagesToBlocks,
  readyCoworkStagedImagesToPayloads,
  roomForCoworkStagedImages,
} from "./coworkComposerStagedImages";

describe("LZe residual — image blocks → sendMessage payloads", () => {
  it("maps base64 sources to {base64, mimeType}", () => {
    expect(
      coworkImageBlocksToPayloads([
        {
          type: "image",
          source: { type: "base64", media_type: "image/png", data: "abc" },
        },
        {
          type: "image",
          source: { type: "url", media_type: "image/png", data: "nope" } as never,
        },
      ]),
    ).toEqual([{ base64: "abc", mimeType: "image/png" }]);
  });

  it("returns undefined when empty or non-base64", () => {
    expect(coworkImageBlocksToPayloads([])).toBeUndefined();
    expect(
      coworkImageBlocksToPayloads([{ source: { type: "url" } }]),
    ).toBeUndefined();
  });

  it("ready staged strip → LZe payloads with filename", () => {
    expect(
      readyCoworkStagedImagesToPayloads([
        {
          id: "1",
          name: "a.png",
          previewUrl: "blob:x",
          status: "loading",
        },
        {
          id: "2",
          name: "b.png",
          previewUrl: "blob:y",
          status: "ready",
          base64: "zzz",
          mimeType: "image/png",
        },
      ]),
    ).toEqual([{ base64: "zzz", mimeType: "image/png", filename: "b.png" }]);
  });

  it("ready staged → blocks → LZe is stable", () => {
    const blocks = readyCoworkStagedImagesToBlocks([
      {
        id: "2",
        name: "b.png",
        previewUrl: "blob:y",
        status: "ready",
        base64: "zzz",
        mimeType: "image/jpeg",
      },
    ]);
    expect(coworkImageBlocksToPayloads(blocks)).toEqual([
      { base64: "zzz", mimeType: "image/jpeg" },
    ]);
  });
});

describe("j0 residual — clipboard image files", () => {
  it("collects image/* items via getAsFile", () => {
    const file = new File([new Uint8Array([1])], "paste.png", { type: "image/png" });
    const clipboardData = {
      items: [
        { type: "text/plain", getAsFile: () => null },
        { type: "image/png", getAsFile: () => file },
      ],
    } as unknown as DataTransfer;
    expect(imageFilesFromClipboardData(clipboardData)).toEqual([file]);
  });

  it("filters allowlisted mime types", () => {
    const ok = new File([], "a.png", { type: "image/png" });
    const bad = new File([], "a.bmp", { type: "image/bmp" });
    expect(filterCoworkImageFiles([ok, bad])).toEqual([ok]);
  });

  it("roomForCoworkStagedImages caps at 5", () => {
    expect(roomForCoworkStagedImages(0)).toBe(5);
    expect(roomForCoworkStagedImages(5)).toBe(0);
    expect(roomForCoworkStagedImages(3)).toBe(2);
  });
});
