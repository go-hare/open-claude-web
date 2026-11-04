import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  extractOfficialWorkflowSurface,
  isOfficialWorkflowTool,
  officialWorkflowT1,
  officialWorkflowTitle,
  OFFICIAL_WORKFLOW_C0E_Y1,
  OFFICIAL_WORKFLOW_FOOTNOTE_ID,
  OFFICIAL_WORKFLOW_KIND,
  OFFICIAL_WORKFLOW_RAN_ID,
  OFFICIAL_WORKFLOW_RUNNING_ID,
  OFFICIAL_WORKFLOW_SOURCE_CD5A,
  OFFICIAL_WORKFLOW_STARTING_ID,
} from "./officialWorkflowSurface";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official Workflow T1 / E1 / C0e (cd5a)", () => {
  it("maps tool name Workflow to kind workflow (IBe.Workflow)", () => {
    expect(isOfficialWorkflowTool("Workflow")).toBe(true);
    expect(isOfficialWorkflowTool("Artifact")).toBe(false);
    expect(OFFICIAL_WORKFLOW_KIND).toBe("workflow");
    expect(OFFICIAL_WORKFLOW_SOURCE_CD5A).toBe("cd5a31703-B4nKQMBN.js");
  });

  it("T1 false on awaiting_approval / error", () => {
    expect(officialWorkflowT1({ name: "Workflow", status: "running" })).toBe(true);
    expect(officialWorkflowT1({ name: "Workflow", status: "completed" })).toBe(true);
    expect(officialWorkflowT1({ name: "Workflow", status: "pending" })).toBe(true);
    expect(officialWorkflowT1({ name: "Workflow", status: "awaiting_approval" })).toBe(false);
    expect(officialWorkflowT1({ name: "Workflow", status: "error" })).toBe(false);
    expect(officialWorkflowT1({ name: "Bash", status: "running" })).toBe(false);
  });

  it("Gfe title from description / name / title / script meta / scriptPath", () => {
    expect(officialWorkflowTitle({ description: "Ship the deck" })).toBe("Ship the deck");
    expect(officialWorkflowTitle({ name: "named" })).toBe("named");
    expect(officialWorkflowTitle({ title: "titled" })).toBe("titled");
    expect(officialWorkflowTitle({ script: "meta = { name: 'from-script' }\n" })).toBe("from-script");
    expect(officialWorkflowTitle({ scriptPath: "/tmp/flows/weekly.ts" })).toBe("weekly.ts");
  });

  it("compact for T1 running/preLaunch standalone; settled for error / inGroup / completed", () => {
    const running = extractOfficialWorkflowSurface({
      input: { description: "A" },
      name: "Workflow",
      status: "running",
    });
    expect(running?.compact).toBe(true);
    expect(running?.isPreLaunch).toBe(true);
    expect(
      extractOfficialWorkflowSurface({ input: { description: "A" }, name: "Workflow", status: "pending" })?.isPreLaunch,
    ).toBe(true);
    expect(
      extractOfficialWorkflowSurface({ input: { description: "A" }, name: "Workflow", status: "completed" })?.compact,
    ).toBe(false);
    expect(
      extractOfficialWorkflowSurface({ input: { description: "A" }, name: "Workflow", status: "error" })?.compact,
    ).toBe(false);
    expect(
      extractOfficialWorkflowSurface(
        { input: { description: "A" }, name: "Workflow", status: "running" },
        true,
      )?.compact,
    ).toBe(false);
    expect(extractOfficialWorkflowSurface({ input: {}, name: "Bash", status: "running" })).toBeNull();
  });
});

describe("OfficialWorkflowSurfaceCard C0e residual lock", () => {
  it("locks compact class, c52b/C0e verb ids, cd5a source, no startVmForPreview", () => {
    const card = readFileSync(path.join(here, "OfficialWorkflowSurfaceCard.tsx"), "utf8");
    const model = readFileSync(path.join(here, "officialWorkflowSurface.ts"), "utf8");
    expect(card).toContain("cd5a31703-B4nKQMBN.js");
    expect(card).toContain(":C0e");
    expect(card).toContain("group/tool my-[6px]");
    expect(OFFICIAL_WORKFLOW_C0E_Y1).toContain("group/tool my-[6px]");
    expect(OFFICIAL_WORKFLOW_C0E_Y1).toContain("pl-lg py-2.5");
    expect(model).toContain(OFFICIAL_WORKFLOW_RUNNING_ID);
    expect(model).toContain(OFFICIAL_WORKFLOW_RAN_ID);
    expect(model).toContain(OFFICIAL_WORKFLOW_STARTING_ID);
    expect(model).toContain(OFFICIAL_WORKFLOW_FOOTNOTE_ID);
    expect(card).toContain("onOpenTasks");
    expect(card).not.toContain("startVmForPreview");
    expect(card).not.toContain("iframe");
    expect(card).not.toContain("Spinner");
    expect(card).not.toContain("openTasksPaneAtTask");
    expect(OFFICIAL_WORKFLOW_SOURCE_CD5A).toBe("cd5a31703-B4nKQMBN.js");
  });
});
