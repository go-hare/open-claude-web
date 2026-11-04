import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { officialNavHasCodeRoutinesByOrgFromPersist } from "../stores/frameStoreHelpers";
import {
  defaultPinnedNavKeys,
  effectivePinnedNavKeys,
  officialHasCodeRoutines,
  officialHasEnabledCloudTriggers,
  officialIsSessionBoundOneShotTrigger,
  officialPersistedHasCodeRoutines,
  officialW2HasCodeRoutines,
  officialW2LiveHasCodeRoutines,
  primaryNavItemsForMode,
} from "./sidebarData";

const here = path.dirname(fileURLToPath(import.meta.url));

describe("official D2 / nJ Code Routines overflow", () => {
  it("Code default pins customize only; leftover scheduled pin overflows as Routines", () => {
    const data = readFileSync(path.join(here, "sidebarData.ts"), "utf8");
    const nav = readFileSync(path.join(here, "SidebarNav.tsx"), "utf8");
    const more = readFileSync(path.join(here, "SidebarMoreFlyout.tsx"), "utf8");
    const frame = readFileSync(path.join(here, "FrameSidebar.tsx"), "utf8");
    expect(defaultPinnedNavKeys("code")).toEqual(["customize"]);
    expect(defaultPinnedNavKeys("code", false)).not.toContain("scheduled");
    expect(defaultPinnedNavKeys("code", true)).toEqual(["customize", "scheduled"]);
    expect(officialHasCodeRoutines([])).toBe(false);
    expect(officialHasCodeRoutines([{ enabled: false }])).toBe(false);
    expect(officialHasCodeRoutines([{ enabled: true }])).toBe(true);
    expect(officialIsSessionBoundOneShotTrigger({
      run_once_at: "2026-10-22T00:00:00Z",
      persistent_session_id: "sess-1",
    })).toBe(true);
    expect(officialIsSessionBoundOneShotTrigger({
      run_once_at: "2026-10-22T00:00:00Z",
      persistent_session_id: "sess-1",
      job_config: { ccr: { environment_id: "env-1" } },
    })).toBe(false);
    expect(officialHasEnabledCloudTriggers([{ enabled: true, run_once_at: "t", persistent_session_id: "s" }])).toBe(false);
    expect(officialHasEnabledCloudTriggers([{ enabled: true }])).toBe(true);
    expect(officialW2LiveHasCodeRoutines([], [{ enabled: true }])).toBe(true);
    expect(officialW2LiveHasCodeRoutines([{ enabled: true }], [])).toBe(true);
    expect(officialW2LiveHasCodeRoutines([], [])).toBe(false);
    expect(officialPersistedHasCodeRoutines({ "org-1": true }, "org-1")).toBe(true);
    expect(officialPersistedHasCodeRoutines({ "org-1": true }, "org-2")).toBe(false);
    expect(officialPersistedHasCodeRoutines({}, "org-1")).toBe(false);
    expect(officialW2HasCodeRoutines(true, false, false)).toBe(true);
    expect(officialW2HasCodeRoutines(false, true, false)).toBe(true);
    expect(officialW2HasCodeRoutines(false, true, true)).toBe(false);
    expect(officialW2HasCodeRoutines(false, false, false)).toBe(false);
    expect(officialNavHasCodeRoutinesByOrgFromPersist({ a: true, b: false, c: "yes" })).toEqual({ a: true });
    expect(officialNavHasCodeRoutinesByOrgFromPersist(null)).toEqual({});
    const codeKeys = primaryNavItemsForMode("code").map((item) => item.key);
    expect(codeKeys).toContain("scheduled");
    expect(effectivePinnedNavKeys("code", null, codeKeys)).toEqual(["customize"]);
    expect(effectivePinnedNavKeys("code", ["customize", "scheduled"], codeKeys)).toEqual(["customize"]);
    expect(effectivePinnedNavKeys("code", ["customize", "scheduled"], codeKeys, true)).toEqual(["customize", "scheduled"]);
    expect(effectivePinnedNavKeys("code", null, codeKeys, true)).toEqual(["customize", "scheduled"]);
    expect(effectivePinnedNavKeys("code", ["customize", "scheduled", "projects"], codeKeys)).toEqual(["customize"]);
    expect(effectivePinnedNavKeys("code", ["scheduled"], codeKeys)).toEqual(["scheduled"]);
    expect(data).toMatch(/officialHasCodeRoutines/);
    expect(data).toMatch(/effectivePinnedNavKeys/);
    expect(frame).toMatch(/useCodeHasRoutines/);
    expect(frame).toMatch(/CCDScheduledTasks/);
    expect(frame).toMatch(/setNavHasCodeRoutines/);
    expect(frame).toMatch(/officialW2HasCodeRoutines/);
    expect(frame).toMatch(/officialW2LiveHasCodeRoutines/);
    expect(frame).toMatch(/fetchOfficialCodeTriggersList/);
    expect(frame).toMatch(/OFFICIAL_COWORK_SCHEDULED_TRIGGER_TAG/);
    expect(frame).not.toMatch(/fetch\([^)]*\/v1\/code\/triggers/);
    expect(frame).toMatch(/effectivePinnedNavKeys\(mode, storedPins, configurableKeys, hasCodeRoutines\)/);
    expect(data).toMatch(/officialW2HasCodeRoutines/);
    expect(data).toMatch(/officialW2LiveHasCodeRoutines/);
    expect(data).toMatch(/officialIsSessionBoundOneShotTrigger/);
    expect(data).toMatch(/cowork-scheduled/);
    expect(data).toMatch(/officialPersistedHasCodeRoutines/);
    expect(data).not.toMatch(/listLocalSkills/);
    expect(nav).toMatch(/hiddenKeys\.has\(item\.key\)/);
    expect(more).toMatch(/item\.href\.startsWith\("\/code\/"\) \? text\.routines/);
  });
});
