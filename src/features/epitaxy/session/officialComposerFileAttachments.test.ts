import { describe, expect, it } from "vitest";
import {
  capOfficialComposerFileAttachments,
  officialComposerFileAttachmentsFromFiles,
  officialComposerFileMentionPrefix,
  officialComposerRelativePath,
  officialFileExtensionLabel,
  officialNativeFilePath,
  splitOfficialComposerDropFiles,
} from "./officialComposerFileAttachments";

function fakeFile(name: string, type: string, path?: string): File {
  const file = new File(["x"], name, { type });
  if (path) Object.defineProperty(file, "path", { value: path });
  return file;
}

describe("officialComposerFileAttachments (c119 uy/wv/f residual)", () => {
  it("wv extension is lowercase after last dot", () => {
    expect(officialFileExtensionLabel("Book1.XLSX")).toBe("xlsx");
    expect(officialFileExtensionLabel("README")).toBe("");
  });

  it("splits Fy images from other files", () => {
    const { images, other } = splitOfficialComposerDropFiles([
      fakeFile("a.png", "image/png"),
      fakeFile("b.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
    ]);
    expect(images.map((file) => file.name)).toEqual(["a.png"]);
    expect(other.map((file) => file.name)).toEqual(["b.xlsx"]);
  });

  it("uy uses io native path as-is (not UM-relative to cwd)", () => {
    const file = fakeFile("notes.md", "text/markdown", "D:/work/repo/docs/notes.md");
    expect(officialComposerRelativePath(file, "D:/work/repo")).toBe("D:/work/repo/docs/notes.md");
  });

  it("uy keeps native absolute path outside cwd", () => {
    const file = fakeFile(
      "admin-workflow-task-list.xlsx",
      "application/octet-stream",
      "C:\\Users\\Administrator\\Downloads\\admin-workflow-task-list.xlsx",
    );
    expect(officialComposerRelativePath(file, "D:\\work\\py\\claude\\magicclaw-mofang")).toBe(
      "C:\\Users\\Administrator\\Downloads\\admin-workflow-task-list.xlsx",
    );
    expect(officialComposerFileMentionPrefix(
      officialComposerFileAttachmentsFromFiles([file], "D:\\work\\py\\claude\\magicclaw-mofang"),
    )).toBe("@C:\\Users\\Administrator\\Downloads\\admin-workflow-task-list.xlsx ");
  });

  it("uy maps files and f() prefixes @io(file)", () => {
    const files = officialComposerFileAttachmentsFromFiles(
      [fakeFile("a.xlsx", "application/octet-stream", "D:/repo/a.xlsx")],
      "D:/repo",
    );
    expect(files[0]?.relativePath).toBe("D:/repo/a.xlsx");
    expect(officialComposerFileMentionPrefix(files)).toBe("@D:/repo/a.xlsx ");
  });

  it("officialNativeFilePath prefers getPathForFile then File.path", () => {
    const withPath = fakeFile("dir", "application/x-directory", "D:\\work\\repo");
    expect(officialNativeFilePath(withPath)).toBe("D:\\work\\repo");
    expect(officialNativeFilePath(fakeFile("dir", "application/x-directory"))).toBe(null);
  });

  it("r2 prefers claudeAppSettings.filePickers.getPathForFile as-is", () => {
    const globalWithWindow = globalThis as typeof globalThis & { window?: Window };
    const previousWindow = globalWithWindow.window;
    const stub = {
      claudeAppSettings: {
        filePickers: {
          getPathForFile: () => "D:\\outside\\book.xlsx",
        },
      },
    } as Window;
    globalWithWindow.window = stub;
    try {
      const file = fakeFile("book.xlsx", "application/octet-stream", "D:/ignored/book.xlsx");
      expect(officialComposerRelativePath(file, "D:/repo")).toBe("D:\\outside\\book.xlsx");
    } finally {
      if (previousWindow) globalWithWindow.window = previousWindow;
      else delete globalWithWindow.window;
    }
  });

  it("caps at 5 unique relative paths", () => {
    const current = officialComposerFileAttachmentsFromFiles(
      [fakeFile("a.txt", "text/plain"), fakeFile("b.txt", "text/plain")],
    );
    const incoming = officialComposerFileAttachmentsFromFiles(
      [
        fakeFile("a.txt", "text/plain"),
        fakeFile("c.txt", "text/plain"),
        fakeFile("d.txt", "text/plain"),
        fakeFile("e.txt", "text/plain"),
        fakeFile("f.txt", "text/plain"),
        fakeFile("g.txt", "text/plain"),
      ],
    );
    const next = capOfficialComposerFileAttachments(current, incoming);
    expect(next.map((file) => file.fileName)).toEqual([
      "a.txt",
      "b.txt",
      "c.txt",
      "d.txt",
      "e.txt",
    ]);
  });
});
