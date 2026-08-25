import { describe, expect, it } from "vitest";
import type { SessionSummary } from "../adapters/desktopBridge/types";
import { buildRecentsGroups, defaultRecentsFilter } from "./RecentsControls";
import {
  detectOfficialProjects,
  groupSessionsByOfficialProject,
  officialHomeRelativePath,
  officialPathBasename,
  officialProjectGroupKey,
  officialProjectGroupKeyFromSession,
  toOfficialCodeSessionData,
} from "./officialProjectGroup";

function session(partial: Partial<SessionSummary> & Pick<SessionSummary, "id">): SessionSummary {
  return {
    kind: "code",
    sessionKind: "code",
    title: partial.title ?? partial.id,
    updatedAt: "",
    updatedAtMs: 1,
    isArchived: false,
    isRunning: false,
    ...partial,
  };
}

const WIN_CWD = "D:\\work\\go\\magicclaw-mofang";

describe("officialPathBasename (BELz Y8)", () => {
  it("splits Windows backslash", () => {
    expect(officialPathBasename(WIN_CWD)).toBe("magicclaw-mofang");
  });

  it("splits posix and strips trailing slash", () => {
    expect(officialPathBasename("/Users/me/app/")).toBe("app");
  });
});

describe("officialHomeRelativePath (BELz ikt)", () => {
  it("passes Windows drive paths through", () => {
    expect(officialHomeRelativePath(WIN_CWD, "D:\\work")).toBe(WIN_CWD);
  });

  it("rewrites posix home to tilde", () => {
    expect(officialHomeRelativePath("/Users/me/app", "/Users/me")).toBe("~/app");
  });
});

describe("officialProjectGroupKey (BELz R9t / ca0135 fe)", () => {
  it("local without owner uses full cwd, not basename", () => {
    const data = toOfficialCodeSessionData(session({
      id: "new",
      cwd: WIN_CWD,
    }));
    expect(data.repoInfo).toEqual({ owner: "", name: "magicclaw-mofang", branch: undefined });
    expect(officialProjectGroupKey(data)).toBe(WIN_CWD);
  });

  it("git-enriched basename repo.name still keys on cwd", () => {
    expect(officialProjectGroupKeyFromSession(session({
      id: "old",
      cwd: WIN_CWD,
      repo: { name: "magicclaw-mofang", branch: "main" },
    }))).toBe(WIN_CWD);
  });

  it("splits densable owner/name into R9t owner/name key", () => {
    expect(officialProjectGroupKeyFromSession(session({
      id: "remote",
      sessionType: "remote",
      repo: { name: "acme/magicclaw-mofang" },
    }))).toBe("acme/magicclaw-mofang");
  });

  it("no repoInfo → undefined (fl __no_project__)", () => {
    expect(officialProjectGroupKeyFromSession(session({ id: "empty" }))).toBeUndefined();
  });
});

describe("groupSessionsByOfficialProject (ca0135 fl)", () => {
  it("merges Windows cwd header and basename header into one bucket", () => {
    const groups = groupSessionsByOfficialProject([
      session({ id: "new", cwd: WIN_CWD, title: "General coding session", updatedAtMs: 2 }),
      session({
        id: "old",
        cwd: WIN_CWD,
        repo: { name: "magicclaw-mofang" },
        title: "older",
        updatedAtMs: 1,
      }),
    ]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe(`project-${WIN_CWD}`);
    expect(groups[0]?.label).toBe("magicclaw-mofang");
    expect(groups[0]?.sessions.map((row) => row.id)).toEqual(["new", "old"]);
  });

  it("same basename different cwd → two buckets with parent-path disambiguation", () => {
    const groups = groupSessionsByOfficialProject([
      session({ id: "a", cwd: "D:\\work\\go\\magicclaw-mofang" }),
      session({ id: "b", cwd: "D:\\tmp\\magicclaw-mofang" }),
    ]);
    expect(groups).toHaveLength(2);
    expect(groups.map((group) => group.label).sort()).toEqual([
      "magicclaw-mofang · D:\\tmp",
      "magicclaw-mofang · D:\\work\\go",
    ]);
  });

  it("sessions without cwd/repo land in Other", () => {
    const groups = groupSessionsByOfficialProject([session({ id: "a" })]);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.key).toBe("project-__no_project__");
    expect(groups[0]?.label).toBe("Other");
    expect(groups[0]?.sessions.map((row) => row.id)).toEqual(["a"]);
  });
});

describe("detectOfficialProjects (BELz O9t)", () => {
  it("sorts by name when asked", () => {
    const projects = detectOfficialProjects([
      toOfficialCodeSessionData(session({ id: "z", cwd: "/z", updatedAtMs: 9 })),
      toOfficialCodeSessionData(session({ id: "a", cwd: "/a", updatedAtMs: 1 })),
    ], "name");
    expect(projects.map((project) => project.name)).toEqual(["a", "z"]);
  });
});

describe("buildRecentsGroups groupBy=project", () => {
  it("does not split the same Windows folder into two Recents headers", () => {
    const groups = buildRecentsGroups(
      [
        session({ id: "new", cwd: WIN_CWD, title: "General coding session", updatedAtMs: 20 }),
        session({
          id: "old",
          cwd: WIN_CWD,
          repo: { name: "magicclaw-mofang" },
          title: "older",
          updatedAtMs: 10,
        }),
        session({
          id: "other-project",
          cwd: "D:\\work\\py\\claude\\open-claude-desktop",
          repo: { name: "open-claude-desktop" },
          updatedAtMs: 5,
        }),
      ],
      { ...defaultRecentsFilter, groupBy: "project" },
    );
    expect(groups.map((group) => group.label)).toEqual([
      "magicclaw-mofang",
      "open-claude-desktop",
    ]);
    expect(groups[0]?.sessions).toHaveLength(2);
  });
});
