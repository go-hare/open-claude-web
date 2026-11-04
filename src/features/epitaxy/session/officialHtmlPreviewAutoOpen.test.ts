import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  isOfficialTtHtmlPreviewPath,
  officialHtmlFilesGlobeItems,
  officialHtmlPreviewFilePath,
  officialHtmlPreviewMatchesSessionCwd,
  officialHtmlPreviewShouldAutoOpen,
  officialSelectedHtmlFilePath,
  officialTtHtmlPreviewAbsPath,
} from "./officialHtmlPreviewAutoOpen";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official Wu html-preview auto-open (c11959232)", () => {
  it("locks oE immediate open (no Vu delay) and filePath fallback", () => {
    const source = readFileSync(path.join(here, "officialHtmlPreviewAutoOpen.ts"), "utf8");
    expect(source).not.toContain("OFFICIAL_HTML_PREVIEW_AUTO_OPEN_MS");
    expect(source).toContain("seenRef.current === null");
    expect(source).toContain("status !== \"starting\"");
    expect(officialHtmlPreviewFilePath({
      cwd: "/tmp/proj",
      name: "index.html",
      serverId: "html-preview-1",
    })).toBe("/tmp/proj/index.html");
    expect(officialHtmlPreviewShouldAutoOpen({
      filePath: "/tmp/a.html",
      serverId: "html-preview-x",
    })).toBe(true);
    expect(officialHtmlPreviewShouldAutoOpen({
      externalUrl: "http://127.0.0.1:3000",
      serverId: "html-preview-x",
    })).toBe(false);
    expect(officialHtmlPreviewShouldAutoOpen({
      filePath: "/tmp/a.html",
      serverId: "srv:abc",
    })).toBe(false);
  });

  it("PI skips nested /.claude/worktrees/ and non-prefix cwd", () => {
    expect(officialHtmlPreviewMatchesSessionCwd("/tmp/proj", "/tmp/proj")).toBe(true);
    expect(officialHtmlPreviewMatchesSessionCwd("/tmp/proj/src", "/tmp/proj")).toBe(true);
    expect(officialHtmlPreviewMatchesSessionCwd("/tmp/proj/.claude/worktrees/wt", "/tmp/proj")).toBe(false);
    expect(officialHtmlPreviewMatchesSessionCwd("/tmp/other", "/tmp/proj")).toBe(false);
    expect(officialHtmlPreviewMatchesSessionCwd("/tmp/projx", "/tmp/proj")).toBe(false);
    expect(officialHtmlPreviewMatchesSessionCwd(undefined, "/tmp/proj")).toBe(false);
    expect(officialHtmlPreviewShouldAutoOpen({
      cwd: "/tmp/proj/.claude/worktrees/wt",
      filePath: "/tmp/proj/.claude/worktrees/wt/index.html",
      serverId: "html-preview-x",
    }, "/tmp/proj")).toBe(false);
    expect(officialHtmlPreviewShouldAutoOpen({
      cwd: "/tmp/proj",
      filePath: "/tmp/proj/index.html",
      serverId: "html-preview-x",
    }, "/tmp/proj")).toBe(true);
  });

  it("maps htmlFiles to Globe basename + cwd-relative hint", () => {
    expect(officialHtmlFilesGlobeItems(
      ["/tmp/proj/index.html", "/tmp/proj/docs/page.html"],
      "/tmp/proj",
      "/tmp/proj/index.html",
    )).toEqual([
      { hint: undefined, label: "index.html", path: "/tmp/proj/index.html", selected: true },
      { hint: "docs/page.html", label: "page.html", path: "/tmp/proj/docs/page.html", selected: false },
    ]);
    expect(officialSelectedHtmlFilePath("html-preview-1", ["/tmp/a.html", "/tmp/b.html"], "/tmp/a.html")).toBe(
      "/tmp/a.html",
    );
    expect(officialSelectedHtmlFilePath("srv-1", ["/tmp/a.html"], "/tmp/a.html")).toBeUndefined();
  });

  it("wires Wu into EpitaxySessionTile", () => {
    const tile = readFileSync(path.join(here, "../EpitaxySessionTile.tsx"), "utf8");
    expect(tile).toContain("useOfficialHtmlPreviewAutoOpen");
    expect(tile).toContain('setSidePane("preview")');
    expect(tile).toContain("bindPreviewServer");
    expect(tile).toContain("addHtmlFile(filePath)");
    expect(tile).toContain("sessionCwd: session?.cwd");
  });

  it("tt media/html Preview regex and abs path (c119 tt / shared-28 Ok)", () => {
    expect(isOfficialTtHtmlPreviewPath("index.html")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("note.htm")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("a.svg")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("a.pdf")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("clip.mp4")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("clip.webm")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("clip.m4v")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("clip.mov")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("clip.ogv")).toBe(true);
    expect(isOfficialTtHtmlPreviewPath("readme.md")).toBe(false);
    expect(isOfficialTtHtmlPreviewPath("session.cast")).toBe(false);
    expect(officialTtHtmlPreviewAbsPath("index.html", "/tmp/proj")).toBe("/tmp/proj/index.html");
    expect(officialTtHtmlPreviewAbsPath("/abs/a.pdf", "/tmp/proj")).toBe("/abs/a.pdf");
    const tile = readFileSync(path.join(here, "../EpitaxySessionTile.tsx"), "utf8");
    expect(tile).toContain("isOfficialTtHtmlPreviewPath");
    expect(tile).toContain("officialLoadHtmlPreview");
    expect(tile).toContain('setSidePane("preview")');
    const pane = readFileSync(path.join(here, "OfficialPreviewPane.tsx"), "utf8");
    expect(pane).toContain("isOfficialTtHtmlPreviewPath(path)");
    expect(pane).toContain("if (selectedTarget && !isOfficialTtHtmlPreviewPath(selectedTarget.path))");
    expect(pane).toContain("setSelectedTarget(null)");
    expect(pane).toContain("keep tt previewUrl");
    expect(pane).toContain("navigatePreview");
  });
});
