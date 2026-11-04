import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  isOfficialSendUserFileTool,
  officialSendUserFileBasename,
  parseOfficialSendUserFileCard,
  parseOfficialSendUserFileToolUseResult,
} from "./officialSendUserFile";

const here = path.dirname(fileURLToPath(import.meta.url));
const parserSource = readFileSync(path.join(here, "officialSendUserFile.ts"), "utf8");
const cardSource = readFileSync(path.join(here, "OfficialSendUserFileCard.tsx"), "utf8");

describe("official SendUserFile card residual (cda39216a k/o + cc1aae219 tile)", () => {
  it("source mentions cda39216a / cc1aae219", () => {
    expect(parserSource).toMatch(/cda39216a/);
    expect(cardSource).toMatch(/cc1aae219/);
    expect(cardSource).toMatch(/cda39216a/);
  });

  it("matches SendUserFile tool name", () => {
    expect(isOfficialSendUserFileTool("SendUserFile")).toBe(true);
    expect(isOfficialSendUserFileTool("mcp__x__SendUserFile")).toBe(true);
    expect(isOfficialSendUserFileTool("present_files")).toBe(false);
  });

  it("parses tool_result with path + caption → card model", () => {
    const parsed = parseOfficialSendUserFileCard({
      name: "SendUserFile",
      input: { caption: "Quarterly notes" },
      output: JSON.stringify({
        attachments: [
          {
            path: "/tmp/notes/q3-report.pdf",
            size: 2048,
            isImage: false,
            file_uuid: "file-uuid-1",
          },
        ],
        caption: "Quarterly notes",
        display: "attach",
      }),
    });
    expect(parsed).not.toBeNull();
    expect(parsed?.caption).toBe("Quarterly notes");
    expect(parsed?.display).toBe("attach");
    expect(parsed?.files).toEqual([
      expect.objectContaining({
        path: "/tmp/notes/q3-report.pdf",
        caption: "Quarterly notes",
        deliveryKind: "attachment",
        fileUuid: "file-uuid-1",
        sizeBytes: 2048,
        display: "attach",
      }),
    ]);
    expect(officialSendUserFileBasename(parsed!.files[0].path)).toBe("q3-report.pdf");
  });

  it("parses k() previewUrl / deliveryKind attachment from toolUseResult", () => {
    const fromResult = parseOfficialSendUserFileToolUseResult({
      attachments: [
        {
          path: "/mnt/user-data/outputs/shot.png",
          size: 12,
          isImage: true,
          preview_url: "https://example.test/preview.png",
          thumbnail_url: "https://example.test/thumb.png",
        },
      ],
      display: "render",
    });
    expect(fromResult.attachments[0]).toEqual(expect.objectContaining({
      deliveryKind: "attachment",
      isImage: true,
      previewUrl: "https://example.test/preview.png",
      thumbnailUrl: "https://example.test/thumb.png",
      display: "render",
    }));
  });

  it("returns null without a presentable path", () => {
    expect(parseOfficialSendUserFileCard({
      name: "SendUserFile",
      input: { caption: "no file" },
    })).toBeNull();
    expect(parseOfficialSendUserFileCard({
      name: "Bash",
      input: { file_path: "/tmp/a.txt" },
    })).toBeNull();
  });

  it("component source lock: caption, path basename, no CLI '1 file delivered' invent", () => {
    expect(cardSource).toMatch(/caption/);
    expect(cardSource).toMatch(/officialSendUserFileBasename/);
    expect(cardSource).toMatch(/delivered-image-tile/);
    expect(cardSource).toMatch(/file-card-open/);
    expect(cardSource).toMatch(/MessageAttachmentsImage/);
    expect(cardSource).toMatch(/onOpenPath/);
    expect(cardSource).not.toMatch(/1 file delivered/);
    expect(parserSource).not.toMatch(/1 file delivered/);
  });
});
