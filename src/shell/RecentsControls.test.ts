import { describe, expect, it } from "vitest";
import type { ShellText } from "../i18n/shellMessages";
import type { SessionSummary } from "../adapters/desktopBridge/types";
import {
  buildRecentsGroups,
  defaultRecentsFilter,
  makeRecentsFilterRows,
} from "./RecentsControls";

function text(): ShellText {
  return new Proxy({} as ShellText, {
    get: (_target, key) => String(key),
  });
}

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

describe("makeRecentsFilterRows Code classic T1", () => {
  it("matches crop 7 Folder defaults: Status / Environment / Group by Folder / Sort Last activity / empty groups / PR", () => {
    const rows = makeRecentsFilterRows("code", defaultRecentsFilter, text());
    expect(rows.map((row) => {
      if (row.kind === "separator") return "separator";
      if (row.kind === "toggle") return `${row.key}:${row.checked}`;
      return `${row.key}:${row.summary}`;
    })).toEqual([
      "status:active",
      "environment:all",
      "separator",
      "groupBy:folder",
      "sortBy:lastActivity",
      "separator",
      "showEmptyGroups:false",
      "showPrStatus:true",
    ]);
    const group = rows.find((row) => row.kind === "row" && row.key === "groupBy");
    expect(group && group.kind === "row" ? group.options.map((option) => option.value) : []).toEqual([
      "date",
      "project",
      "state",
      "custom",
      "none",
    ]);
    const sort = rows.find((row) => row.kind === "row" && row.key === "sortBy");
    expect(sort && sort.kind === "row" ? sort.options.map((option) => option.value) : []).toEqual([
      "alpha",
      "created",
      "recency",
    ]);
  });

  it("hides Last activity unless groupBy is state, and hides empty-groups unless Folder/Custom", () => {
    const dateRows = makeRecentsFilterRows("code", { ...defaultRecentsFilter, groupBy: "date" }, text());
    expect(dateRows.some((row) => row.kind === "row" && row.key === "activityDays")).toBe(false);
    expect(dateRows.some((row) => row.kind === "toggle" && row.key === "showEmptyGroups")).toBe(false);
    expect(dateRows.some((row) => row.kind === "toggle" && row.key === "showPrStatus")).toBe(true);

    const stateRows = makeRecentsFilterRows("code", { ...defaultRecentsFilter, groupBy: "state" }, text());
    expect(stateRows.some((row) => row.kind === "row" && row.key === "activityDays")).toBe(true);
    const activity = stateRows.find((row) => row.kind === "row" && row.key === "activityDays");
    expect(activity && activity.kind === "row" ? activity.value : "").toBe("7");
  });
});

describe("buildRecentsGroups Folder Last activity rows", () => {
  it("keeps Name folder headers and recency order inside a folder", () => {
    const older = session({
      id: "older",
      title: "审查 289 整体对齐 有的已经提交了",
      cwd: "/claude-code-1",
      updatedAtMs: 10,
    });
    const newer = session({
      id: "newer",
      title: "审查未提交",
      cwd: "/claude-code-1",
      updatedAtMs: 30,
    });
    const other = session({
      id: "other",
      title: "看看这个项目",
      cwd: "/minimind",
      updatedAtMs: 20,
    });
    const groups = buildRecentsGroups(
      [older, newer, other],
      { ...defaultRecentsFilter, groupBy: "project", sortBy: "recency" },
    );
    expect(groups.map((group) => group.label)).toEqual(["claude-code-1", "minimind"]);
    expect(groups[0]?.sessions.map((row) => row.id)).toEqual(["newer", "older"]);
  });
});

describe("buildRecentsGroups showEmptyGroups catalog", () => {
  it("keeps Folder headers whose current filter bucket is empty", () => {
    const live = session({ id: "live", cwd: "/a", isArchived: false, updatedAtMs: 2 });
    const archived = session({ id: "arch", cwd: "/b", isArchived: true, updatedAtMs: 1 });
    const hidden = buildRecentsGroups(
      [live, archived],
      { ...defaultRecentsFilter, status: "active", groupBy: "project", showEmptyGroups: false },
    );
    expect(hidden.map((group) => group.label)).toEqual(["a"]);

    const shown = buildRecentsGroups(
      [live, archived],
      { ...defaultRecentsFilter, status: "active", groupBy: "project", showEmptyGroups: true },
    );
    expect(shown.map((group) => group.label)).toEqual(["a", "b"]);
    expect(shown.find((group) => group.label === "b")?.sessions).toEqual([]);
  });
});
