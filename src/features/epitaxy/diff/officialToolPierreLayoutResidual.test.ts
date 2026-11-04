import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = readFileSync(path.join(here, "OfficialToolDiffDetails.tsx"), "utf8");

describe("tool Pierre first-expand residual (c119 rx / sx / iu)", () => {
  it("mounts File/FileDiff immediately when workerPool is set (no layout-ready pre swap)", () => {
    expect(source).not.toMatch(/usePierreLayoutMountReady/);
    expect(source).not.toMatch(/isPierreHostLayoutReady/);
    expect(source).not.toMatch(/usePierreEmptyRecovery/);
    expect(source).not.toMatch(/ToolDiffPlainPre/);
    expect(source).not.toMatch(/layoutReady/);
    expect(source).not.toMatch(/ancestorObservers/);
    expect(source).not.toMatch(/emptyBudgetMs/);
    expect(source).not.toMatch(/setFailedOpen/);
    expect(source).not.toMatch(/tryReady\(\)/);
    expect(source).not.toMatch(/showPierre/);
    expect(source).not.toMatch(/pierreEnabled/);
    // Official rx/sx: iu/hh on first expand. Pool gate is package constructor freeze only.
    expect(source).toMatch(/if \(!workerPool\)/);
    expect(source).toMatch(/return <File file=\{file\} options=\{options\} \/>/);
    expect(source).toMatch(
      /return <FileDiff fileDiff=\{diffMeta\.fileDiff\} metrics=\{TOOL_DIFF_METRICS\} options=\{options\} \/>/,
    );
    expect(source).toMatch(/workerPool \? \(\s*<File file=\{file\} options=\{options\} \/>/s);
  });
});
