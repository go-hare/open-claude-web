import { describe, expect, it } from "vitest";
import type { CoworkSpaceSummary, ScheduledTaskSummary, SessionSummary } from "../../../adapters/desktopBridge";
import { buildCoworkSidebarModel, OFFICIAL_COWORK_RECENT_LIMIT } from "./coworkSidebarModel";

function session(partial: Partial<SessionSummary> & Pick<SessionSummary, "id" | "title" | "updatedAtMs">): SessionSummary {
  return {
    kind: "epitaxy",
    sessionKind: "cowork",
    updatedAt: new Date(partial.updatedAtMs).toISOString(),
    ...partial,
  };
}

function space(partial: Partial<CoworkSpaceSummary> & Pick<CoworkSpaceSummary, "id" | "name" | "updatedAtMs">): CoworkSpaceSummary {
  return partial;
}

describe("buildCoworkSidebarModel mix-then-cap", () => {
  it("mixes cowork-space into recents then slices 20 (ca0135 Cl + Il $)", () => {
    const sessions = Array.from({ length: 18 }, (_, index) => session({
      id: `s${index}`,
      title: `session ${index}`,
      updatedAtMs: 1_000 + index,
    }));
    const spaces = Array.from({ length: 5 }, (_, index) => space({
      id: `p${index}`,
      name: `space ${index}`,
      updatedAtMs: 2_000 + index,
    }));
    const model = buildCoworkSidebarModel(sessions, [], spaces, []);
    expect(model.recents).toHaveLength(OFFICIAL_COWORK_RECENT_LIMIT);
    expect(model.recents.filter((item) => item.entryKind === "space")).toHaveLength(5);
    expect(model.recents[0]).toEqual(expect.objectContaining({ entryKind: "space", space: expect.objectContaining({ id: "p4" }) }));
    expect(model.recents.some((item) => item.entryKind === "session" && item.session.id === "s0")).toBe(false);
  });

  it("does not emit a spaces section — spaces live in recents", () => {
    const model = buildCoworkSidebarModel(
      [session({ id: "s1", title: "one", updatedAtMs: 10 })],
      [],
      [space({ id: "p1", name: "proj", updatedAtMs: 20 })],
      [],
    );
    expect("spaces" in model).toBe(false);
    expect(model.recents.map((item) => item.entryKind)).toEqual(["space", "session"]);
  });

  it("keeps scheduled runs out of recents", () => {
    const task: ScheduledTaskSummary = { id: "t1", title: "nightly", schedule: "0 0 * * *", enabled: true };
    const run = session({ id: "r1", title: "run", updatedAtMs: Date.now(), scheduledTaskId: "t1" });
    const other = session({ id: "s1", title: "other", updatedAtMs: Date.now() - 1000 });
    const model = buildCoworkSidebarModel([run, other], [task], [], []);
    expect(model.scheduled).toHaveLength(1);
    expect(model.recents.map((item) => item.entryKind === "session" ? item.session.id : item.space.id)).toEqual(["s1"]);
  });
});
