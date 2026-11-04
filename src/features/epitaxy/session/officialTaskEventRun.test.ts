import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  officialTaskEventChipVerb,
  officialTaskEventRunLabel,
  officialTaskEventRunParts,
  officialTaskEventRunsByFirstId,
  type OfficialTaskEventItem,
} from "./officialTaskEventRun";

const here = path.dirname(fileURLToPath(import.meta.url));

function event(
  id: string,
  status: OfficialTaskEventItem["status"],
  taskType: string,
  description: string,
): OfficialTaskEventItem {
  return { description, id, kind: "task_event", status, taskId: id, taskType };
}

describe("official cd5a cR / KX / UX task-event runs", () => {
  it("one completed workflow is Background workflow completed", () => {
    const one = event("w1", "completed", "local_workflow", "Peel gold SEA");
    expect(officialTaskEventChipVerb(one)).toBe("Background workflow completed");
  });

  it("same-noun consecutive events keep that noun; mixed nouns fall back to task", () => {
    const workflows = [
      event("c", "completed", "local_workflow", "Dump remaining gold"),
      event("d", "completed", "local_workflow", "Peel gold yn"),
      event("e", "stopped", "local_workflow", "Verify KEEP-host"),
    ];
    expect(officialTaskEventRunLabel(workflows)).toBe("2 background workflows completed, 1 stopped");
    const mixed = [
      event("a", "completed", "local_agent", "Find unique gold offsets"),
      event("b", "stopped", "local_agent", "Find AssistantMessage"),
      ...workflows,
    ];
    expect(officialTaskEventRunLabel(mixed)).toBe("3 background tasks completed, 2 stopped");
  });

  it("cR groups only consecutive task_event items", () => {
    const items = [
      event("a", "completed", "local_workflow", "one"),
      event("b", "completed", "local_workflow", "two"),
      { id: "t", kind: "text" as const, text: "hi" },
      event("c", "completed", "local_workflow", "three"),
    ];
    const runs = officialTaskEventRunsByFirstId(items);
    expect([...runs.keys()]).toEqual(["a", "c"]);
    expect(runs.get("a")?.map((event) => event.id)).toEqual(["a", "b"]);
    expect(runs.get("c")?.map((event) => event.id)).toEqual(["c"]);
  });

  it("OfficialTranscript paints KX runs, not one chip per consecutive event", () => {
    const source = readFileSync(path.join(here, "OfficialTranscript.tsx"), "utf8");
    expect(source).toMatch(/officialTaskEventRunsByFirstId/);
    expect(source).toMatch(/CodeTaskEventRun/);
    expect(source).toMatch(/hEJp1hFtWd/);
    expect(source).toMatch(/m3qXDI92OE/);
    expect(source).toMatch(/shrink-0/);
    expect(source).not.toMatch(/Background \{noun\} \{statusWord\}/);
  });
});
