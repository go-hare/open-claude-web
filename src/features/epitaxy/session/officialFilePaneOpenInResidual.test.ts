import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const filePaneSource = readFileSync(path.join(here, "OfficialFilePane.tsx"), "utf8");

describe("OfficialFilePane Open in residual (c9a yu)", () => {
  it("Show in Explorer / openInEditor use host absPath, not relative tool path", () => {
    // Official yu(e,t): e = _?.absPath; T?.showInFolder?.(e); P?.openInEditor?.(e,…)
    // Product must not call showInFolder(filePath) with tool-row relative paths.
    expect(filePaneSource).toMatch(/openInPath = state\.absPath \?\? filePath/);
    expect(filePaneSource).toMatch(/showInFolder\?\.\(openInPath\)/);
    expect(filePaneSource).toMatch(/openInEditor\?\.\(openInPath/);
    expect(filePaneSource).not.toMatch(/showInFolder\?\.\(filePath\)/);
    expect(filePaneSource).not.toMatch(/openInEditor\?\.\(filePath,/);
  });
});

describe("OfficialFilePane Find / Pierre / copy residual (c119 vN)", () => {
  it("Find is always mounted (icon 搜索, ariaLabel Find in file, pressed=isOpen)", () => {
    expect(filePaneSource).toMatch(/icon="搜索"/);
    expect(filePaneSource).toMatch(/ariaLabel="Find in file"/);
    expect(filePaneSource).toMatch(/pressed=\{find\.isOpen\}/);
    expect(filePaneSource).toMatch(/if \(markdownPreview\) \{[\s\S]*setSourceMode\(true\);[\s\S]*find\.open\(\)/);
  });

  it("does not render html srcDoc iframe; html falls through to Pierre File", () => {
    expect(filePaneSource).not.toMatch(/srcDoc/);
    expect(filePaneSource).not.toMatch(/isHtmlPreviewPath/);
    expect(filePaneSource).not.toMatch(/<iframe/);
  });

  it("Pierre FileContents cacheKey is file.hash ?? contents; Z has no onPostRender", () => {
    expect(filePaneSource).toMatch(/cacheKey: state\.hash \?\? state\.text/);
    expect(filePaneSource).toMatch(/disableFileHeader: true/);
    expect(filePaneSource).toMatch(/overflow: "wrap"/);
    expect(filePaneSource).not.toMatch(/onPostRender/);
    expect(filePaneSource).not.toMatch(/pierreTokenPaintOnPostRender/);
  });

  it("copyPath addSuccess Path copied to clipboard", () => {
    expect(filePaneSource).toMatch(/errors\?\.addSuccess\("Path copied to clipboard\."\)/);
  });

  it("disabled Open-in shows for remote when no items (xN !$ && f)", () => {
    expect(filePaneSource).toMatch(/sessionRef\?\.type === "remote"/);
    expect(filePaneSource).toMatch(/tooltip="Only available in local sessions"/);
    expect(filePaneSource).toMatch(/ariaLabel="Open in…"/);
  });
});
