import { describe, expect, it } from "vitest";
import {
  resolveOfficialBaseBranch,
  basename,
} from "../../epitaxy/composer/workspaceControlsHelpers";

describe("LaunchCode MTe residual helpers", () => {
  it("resolves base branch residual order", () => {
    expect(
      resolveOfficialBaseBranch({
        defaultBranch: "develop",
        branches: ["main", "develop"],
        currentBranch: "feature",
      }),
    ).toBe("develop");
    expect(
      resolveOfficialBaseBranch({
        branches: ["main", "feature"],
        currentBranch: "feature",
      }),
    ).toBe("main");
  });

  it("basename for folder labels", () => {
    expect(basename("/Users/apple/work-py/hare-code")).toBe("hare-code");
    expect(basename("C:\\\\repos\\\\app")).toBe("app");
  });
});
