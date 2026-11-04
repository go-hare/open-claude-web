import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("c21f xQt je vs !je activity panel", () => {
  it("desktop session stays headerHostedToggle; !je is aside toggle + pt-12", () => {
    const shell = readFileSync(path.join(here, "CoworkActivityPanelShell.tsx"), "utf8");
    const panel = readFileSync(path.join(here, "CoworkSessionActivityPanel.tsx"), "utf8");
    const view = readFileSync(path.join(here, "../CoworkSessionView.tsx"), "utf8");
    expect(shell).toMatch(/headerHostedToggle = true/);
    expect(shell).toMatch(/je\?h-2:h-12/);
    expect(shell).toMatch(/je\?pt-0:pt-12/);
    expect(shell).toMatch(/!je aside toggle top-3 right-2/);
    expect(panel).toMatch(/headerHostedToggle/);
    expect(view).toMatch(/CoworkActivityPanelHeaderToggle/);
    expect(view).not.toMatch(/headerHostedToggle=\{false\}/);
  });
});
