import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const here = path.dirname(fileURLToPath(import.meta.url));
const adapterSource = readFileSync(path.join(here, "officialBridgeAdapter.ts"), "utf8");

describe("officialBridgeAdapter mapper M residual", () => {
  it("cwd coalesces originCwd before cwd (worktree origin wins)", () => {
    // Official mapper M: `const s = t.originCwd || t.cwd`
    expect(adapterSource).toMatch(/Official mapper M: `originCwd \|\| cwd`/);
    expect(adapterSource).toMatch(
      /const cwd = stringValue\(raw\.originCwd\)\s*\?\? stringValue\(raw\.cwd\)/,
    );
    expect(adapterSource).toMatch(/stringValue\(original\.originCwd\)\s*\?\? stringValue\(original\.cwd\)/);
  });

  it("sessionType maps explicit local/remote/bridge; Code host defaults local", () => {
    expect(adapterSource).toMatch(/function mappedOfficialSessionType/);
    expect(adapterSource).toMatch(/sessionType: mappedOfficialSessionType\(raw, original, kind\)/);
    expect(adapterSource).toMatch(/if \(kind === "code"\) return "local"/);
    expect(adapterSource).toMatch(/cwd\?\.startsWith\("remote-control:"\)/);
  });
});
