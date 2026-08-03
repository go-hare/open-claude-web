import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const recents = readFileSync(path.join(here, "RecentsSection.tsx"), "utf8");
const pinned = readFileSync(path.join(here, "PinnedSection.tsx"), "utf8");
const rowActions = readFileSync(path.join(here, "SessionRowActions.tsx"), "utf8");
const shellMessages = readFileSync(path.join(here, "../i18n/shellMessages.ts"), "utf8");

describe("sidebar selected + row menu i18n residual", () => {
  it("open session row paints selected=open bg (not invent open text color)", () => {
    // Official index-BELz: wrapper data-[selected=open]:bg-bg-200; button stays text-text-300
    // and only data-[selected=focused]:text-text-000 (keyboard). Do not invent open text util.
    expect(recents).toMatch(/data-selected=\{selected \? "open" : undefined\}/);
    expect(recents).toMatch(/data-\[selected=open\]:bg-bg-200/);
    expect(recents).toMatch(/data-\[selected=focused\]:text-text-000/);
    expect(recents).not.toMatch(/data-\[selected=open\]:text-text-000/);
    expect(pinned).toMatch(/data-\[selected=open\]:bg-bg-200/);
    expect(pinned).not.toMatch(/data-\[selected=open\]:text-text-000/);
  });

  it("row ⋯ aria-label and split item use shell i18n", () => {
    expect(rowActions).toMatch(/text\.moreOptionsFor\.replace\("\{title\}", session\.title\)/);
    expect(rowActions).not.toMatch(/More options for \$\{session\.title\}/);
    expect(shellMessages).toMatch(/moreOptionsFor:[\s\S]*zhCN: "\{title\} 的更多选项"/);
    expect(shellMessages).toMatch(/openInSplitView:[\s\S]*zhCN: "在分屏中打开"/);
    expect(shellMessages).toMatch(/ungrouped:[\s\S]*zhCN: "未分组"/);
  });
});
