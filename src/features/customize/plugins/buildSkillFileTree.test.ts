import { describe, expect, it } from "vitest";
import { buildSkillFileTree } from "./buildSkillFileTree";

describe("buildSkillFileTree (official ozt / rzt / izt)", () => {
  it("returns null for empty files", () => {
    expect(buildSkillFileTree([])).toBeNull();
  });

  it("strips a shared first segment and promotes SKILL.md", () => {
    const tree = buildSkillFileTree([
      { path: "greet/refs/notes.md", content: "n" },
      { path: "greet/SKILL.md", content: "s" },
      { path: "greet/refs/extra.md", content: "e" },
    ]);
    expect(tree?.name).toBe("");
    expect(tree?.children?.map((row) => row.name)).toEqual(["SKILL.md", "refs"]);
    const refs = tree?.children?.find((row) => row.name === "refs");
    expect(refs?.type).toBe("directory");
    expect(refs?.children?.map((row) => row.name)).toEqual(["extra.md", "notes.md"]);
  });

  it("keeps mixed top-level files without stripping", () => {
    const tree = buildSkillFileTree([
      { path: "SKILL.md", content: "s" },
      { path: "docs/a.md", content: "a" },
    ]);
    expect(tree?.children?.map((row) => row.name)).toEqual(["SKILL.md", "docs"]);
  });
});
