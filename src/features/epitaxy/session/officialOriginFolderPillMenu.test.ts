import { describe, expect, it } from "vitest";
import { formatOfficialIcu } from "../../../i18n/formatOfficialIcu";
import {
  officialOriginFolderBasename,
  officialOriginFolderIsRejectedUnc,
  officialOriginFolderLabel,
  officialOriginFolderMovedToast,
  officialOriginFolderRewriteWslUnc,
  officialYbMenuItems,
} from "./officialOriginFolderPillMenu";

describe("official origin-pill vB / yB", () => {
  it("yB puts separatorBefore on the first item of later groups", () => {
    const items = officialYbMenuItems([
      [{ label: "Show in Finder" }],
      [{ label: "Copy path" }, { label: "Change folder…" }],
      [{ label: "Open in terminal" }],
    ]);
    expect(items.map((item) => [item.label, Boolean(item.separatorBefore)])).toEqual([
      ["Show in Finder", false],
      ["Copy path", true],
      ["Change folder…", false],
      ["Open in terminal", true],
    ]);
  });

  it("rejects UNC session cwd and rewrites wsl$ to wsl.localhost", () => {
    expect(officialOriginFolderIsRejectedUnc("\\\\server\\share")).toBe(true);
    expect(officialOriginFolderIsRejectedUnc("//server/share")).toBe(true);
    expect(officialOriginFolderIsRejectedUnc("\\\\wsl$\\Ubuntu\\home")).toBe(false);
    expect(officialOriginFolderIsRejectedUnc("/Users/apple/work")).toBe(false);
    expect(officialOriginFolderRewriteWslUnc("\\\\wsl$\\Ubuntu\\home")).toBe("\\\\wsl.localhost\\Ubuntu\\home");
  });

  it("W1 label is repo name else cwd basename", () => {
    expect(officialOriginFolderLabel({ cwd: "/Users/apple/work/claude-code-1", repo: { name: "claude-code-1" } })).toBe("claude-code-1");
    expect(officialOriginFolderLabel({ cwd: "/Users/apple/work/claude-code-1" })).toBe("claude-code-1");
    expect(officialOriginFolderBasename("/tmp/foo/")).toBe("foo");
  });

  it("mB toast picks all/some/failed", () => {
    const messages = {
      sessionMovedPlain: "Session moved to {directory}",
      sessionMovedAll: "Session moved to {directory}. Copied {count, plural, one {# file} other {# files}}.",
      sessionMovedSome: "Session moved to {directory}. Copied {count, number} of {total, plural, one {# file} other {# files}}. Ask Claude if you need the rest.",
      sessionMovedTooMany: "Session moved to {directory}. There were too many files to copy. Ask Claude if you need them.",
      sessionMovedFailed: "Session moved to {directory}. Couldn’t copy the session’s files. Ask Claude if you need them.",
    };
    expect(officialOriginFolderMovedToast(messages, "/tmp/a", undefined, formatOfficialIcu)).toBe("Session moved to /tmp/a");
    expect(officialOriginFolderMovedToast(messages, "/tmp/a", { copied: 2, alreadyThere: 0, notCopied: 0 }, formatOfficialIcu))
      .toBe("Session moved to /tmp/a. Copied 2 files.");
    expect(officialOriginFolderMovedToast(messages, "/tmp/a", { copied: 1, alreadyThere: 1, notCopied: 0 }, formatOfficialIcu))
      .toBe("Session moved to /tmp/a. Copied 1 of 2 files. Ask Claude if you need the rest.");
  });
});
