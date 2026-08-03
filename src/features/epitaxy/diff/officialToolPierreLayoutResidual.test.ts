import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "OfficialToolDiffDetails.tsx"), "utf8");

describe("tool Pierre layout residual (collapse height:0)", () => {
  it("defers File/FileDiff until layout ready and keeps pre fail-open", () => {
    expect(source).toMatch(/function usePierreLayoutMountReady/);
    expect(source).toMatch(/function isPierreHostLayoutReady/);
    expect(source).toMatch(/function usePierreEmptyRecovery/);
    expect(source).toMatch(/ToolDiffPlainPre/);
    // Read + pureSide + unified all use the host/recovery path.
    expect(source).toMatch(/data-pierre-host="tool-read"/);
    expect(source).toMatch(/data-pierre-host="tool-pure-side"/);
    expect(source).toMatch(/data-pierre-host="tool-unified"/);
    // Must not mount bare File when workerPool alone is truthy without layout gate.
    expect(source).toMatch(/const showPierre = pierreEnabled && !failedOpen/);
    expect(source).toMatch(/const pierreEnabled = Boolean\(workerPool\) && layoutReady/);
    // Observe overflow-hidden collapse ancestors (motion height 0→auto).
    expect(source).toMatch(/ancestorObservers/);
    // Soft stop must call tryReady only — never force setReady(true) while clipped.
    expect(source).not.toMatch(/setReady\(true\);\s*\n\s*}, 500\)/);
    expect(source).toMatch(/tryReady\(\);\s*\n\s*}, 1200\)/);
  });

  it("remounts once then fails open to plain pre", () => {
    expect(source).toMatch(/generation < 1/);
    expect(source).toMatch(/setFailedOpen\(true\)/);
    expect(source).toMatch(/key=\{`read-\$\{remountKey\}-\$\{generation\}`\}/);
    expect(source).toMatch(/emptyBudgetMs = 600/);
  });
});
