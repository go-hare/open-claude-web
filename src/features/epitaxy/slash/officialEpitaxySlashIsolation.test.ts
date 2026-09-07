import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Official aRe (index-BELzQL5P): Cowork slash = getSupportedCommands filter scope==="cowork".
 * Code LocalSessions slash must not inject RT skills (schedule / setup-cowork).
 */
const dir = dirname(fileURLToPath(import.meta.url));

describe("Code slash skill isolation (aRe)", () => {
  it("does not inject Cowork schedule into Code local slash extras", () => {
    const src = readFileSync(join(dir, "OfficialEpitaxySlashCommandMenu.tsx"), "utf8");
    expect(src).toContain('command.scope !== "cowork"');
    expect(src).not.toMatch(/isLocalSession && !names\.has\("schedule"\)/);
    expect(src).not.toContain('name: "setup-cowork"');
  });
});
