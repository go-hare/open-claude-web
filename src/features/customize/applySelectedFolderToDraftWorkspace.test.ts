import { describe, expect, it } from "vitest";
import type { WorkspaceContext } from "../../adapters/desktopBridge";
import {
  applySelectedFolderToDraftWorkspace,
  officialDraftCwd,
} from "./applySelectedFolderToDraftWorkspace";

const host: WorkspaceContext = {
  mode: "local",
  projectName: "open-claude-desktop",
  branchName: "main",
  hasWorktree: true,
  cwd: "D:\\work\\py\\claude\\open-claude-desktop",
};

describe("officialDraftCwd (c119 zm `_ = P?.cwd ?? p`)", () => {
  it("session meta cwd outranks selectedFolder", () => {
    expect(officialDraftCwd("/session", "/selected")).toBe("/session");
  });

  it("home (no session meta) uses selectedFolder", () => {
    expect(officialDraftCwd(undefined, "/selected")).toBe("/selected");
  });

  it("falls through to undefined", () => {
    expect(officialDraftCwd(undefined, null)).toBeUndefined();
  });
});

describe("applySelectedFolderToDraftWorkspace", () => {
  it("keeps host when selectedFolder is null", () => {
    expect(applySelectedFolderToDraftWorkspace(host, null)).toBe(host);
  });

  it("keeps host when selectedFolder already matches cwd", () => {
    expect(applySelectedFolderToDraftWorkspace(host, host.cwd ?? null)).toBe(host);
  });

  it("overlays Windows folder onto draft (basename from last segment)", () => {
    const next = applySelectedFolderToDraftWorkspace(
      host,
      "D:\\work\\py\\claude\\magicclaw-mofang",
    );
    expect(next).toEqual({
      mode: "local",
      projectName: "magicclaw-mofang",
      branchName: "",
      hasWorktree: false,
      cwd: "D:\\work\\py\\claude\\magicclaw-mofang",
    });
  });

  it("overlays posix folder", () => {
    const next = applySelectedFolderToDraftWorkspace(host, "/Users/me/magicclaw-mofang");
    expect(next.cwd).toBe("/Users/me/magicclaw-mofang");
    expect(next.projectName).toBe("magicclaw-mofang");
    expect(next.mode).toBe("local");
  });
});
