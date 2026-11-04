import { describe, expect, it } from "vitest";
import { officialKuAbsPath, officialKuBasename, officialKuRelPath } from "./officialKuFileMenuPaths";

describe("official ku path helpers (c9a _u / Au)", () => {
  it("basename strips trailing slash and last segment", () => {
    expect(officialKuBasename("/tmp/foo/bar.ts")).toBe("bar.ts");
    expect(officialKuBasename("/tmp/foo/")).toBe("foo");
    expect(officialKuBasename("bar.ts")).toBe("bar.ts");
  });

  it("absPath joins cwd for relative git paths", () => {
    expect(officialKuAbsPath("/repo", "src/a.ts")).toBe("/repo/src/a.ts");
    expect(officialKuAbsPath("/repo/", "/abs/a.ts")).toBe("/abs/a.ts");
    expect(officialKuAbsPath(undefined, "src/a.ts")).toBe("src/a.ts");
  });

  it("relPath strips cwd prefix", () => {
    expect(officialKuRelPath("/repo", "/repo/src/a.ts")).toBe("src/a.ts");
    expect(officialKuRelPath("/repo", "/other/a.ts")).toBe("/other/a.ts");
  });
});
