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
